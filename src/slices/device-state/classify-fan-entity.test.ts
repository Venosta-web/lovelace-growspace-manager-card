/**
 * Fan Entity Mode classifier unit tests (ADR-0008).
 *
 * classifyFanEntity is the single place that inspects a fan-slot entity; the chip
 * display, graph axis, and per-point graph value are pure mappers over its output.
 * This file is the test surface for all three: classify once from (entityId, state),
 * then assert the mappers against the FanReading union — no chart mount, no slice.
 */

import { describe, it, expect } from 'vitest';
import {
  classifyFanEntity,
  fanReadingToChipDisplay,
  fanReadingToAxisScale,
  fanReadingToNormalizedValue,
} from './index';
import type { FanReading } from './index';

type StateLike = { state: string; attributes?: Record<string, unknown> };

describe('classifyFanEntity — type facet (kind) is id-derived', () => {
  it.each([
    ['fan.exhaust', 'ha-fan'],
    ['switch.exhaust', 'binary'],
    ['input_boolean.exhaust', 'binary'],
    ['binary_sensor.exhaust', 'binary'],
    ['sensor.fan_speed', 'speed-sensor'],
    ['number.fan_speed', 'speed-sensor'],
  ] as const)('%s classifies as kind "%s" even when unavailable', (entityId, kind) => {
    const reading = classifyFanEntity(entityId, { state: 'unavailable' });
    expect(reading.kind).toBe(kind);
    expect(reading.available).toBe(false);
  });

  it('classifies a missing entity by id alone, marked unavailable', () => {
    expect(classifyFanEntity('fan.exhaust', undefined)).toEqual({
      kind: 'ha-fan',
      available: false,
      on: false,
      percentage: null,
    });
  });
});

describe('classifyFanEntity — reading facet (HA fan)', () => {
  it('reads percentage raw (unrounded) when on', () => {
    expect(
      classifyFanEntity('fan.exhaust', { state: 'on', attributes: { percentage: 70.4 } })
    ).toEqual({ kind: 'ha-fan', available: true, on: true, percentage: 70.4 });
  });

  it('reports percentage null when on with no percentage attribute', () => {
    expect(classifyFanEntity('fan.exhaust', { state: 'on' })).toEqual({
      kind: 'ha-fan',
      available: true,
      on: true,
      percentage: null,
    });
  });

  it('is off (percentage ignored) when state is off', () => {
    const reading = classifyFanEntity('fan.exhaust', {
      state: 'off',
      attributes: { percentage: 0 },
    });
    expect(reading).toMatchObject({ kind: 'ha-fan', available: true, on: false });
  });
});

describe('classifyFanEntity — reading facet (speed sensor & binary)', () => {
  it('rounds a numeric speed-sensor state', () => {
    expect(classifyFanEntity('sensor.fan_speed', { state: '5.6' })).toEqual({
      kind: 'speed-sensor',
      available: true,
      value: 6,
    });
  });

  it('treats a numeric binary-domain state as on/off', () => {
    expect(classifyFanEntity('switch.exhaust', { state: '1' })).toEqual({
      kind: 'binary',
      available: true,
      on: true,
    });
    expect(classifyFanEntity('input_boolean.exhaust', { state: '0' })).toEqual({
      kind: 'binary',
      available: true,
      on: false,
    });
  });

  it('treats a recognized on/off string as binary on any domain', () => {
    expect(classifyFanEntity('switch.exhaust', { state: 'on' })).toMatchObject({
      kind: 'binary',
      on: true,
    });
  });

  it('marks an unrecognized non-numeric state unavailable', () => {
    expect(classifyFanEntity('sensor.fan', { state: 'idle' })).toEqual({
      kind: 'speed-sensor',
      available: false,
      value: 0,
    });
  });
});

describe('fanReadingToChipDisplay', () => {
  it.each<[StateLike | undefined, string, string | undefined]>([
    [{ state: 'on', attributes: { percentage: 70 } }, 'fan.x', '70%'],
    [{ state: 'on', attributes: { percentage: 70.4 } }, 'fan.x', '70%'], // rounds for display
    [{ state: 'on' }, 'fan.x', 'On'],
    [{ state: 'off', attributes: { percentage: 0 } }, 'fan.x', 'Off'],
    [{ state: '5' }, 'sensor.x', '5'],
    [{ state: 'on' }, 'switch.x', 'On'],
    [{ state: '0' }, 'switch.x', 'Off'],
    [{ state: 'idle' }, 'sensor.x', undefined],
    [{ state: 'unavailable' }, 'fan.x', undefined],
    [undefined, 'fan.x', undefined],
  ])('%o on %s -> %s', (state, entityId, expected) => {
    expect(fanReadingToChipDisplay(classifyFanEntity(entityId, state))).toBe(expected);
  });
});

describe('fanReadingToAxisScale — type facet only', () => {
  it.each<[FanReading['kind'], { min: number; max: number }]>([
    ['ha-fan', { min: 0, max: 100 }],
    ['speed-sensor', { min: 0, max: 10 }],
    ['binary', { min: 0, max: 10 }],
  ])('kind %s -> %o', (kind, scale) => {
    expect(fanReadingToAxisScale(kind)).toEqual(scale);
  });
});

describe('fanReadingToNormalizedValue', () => {
  it.each<[StateLike | undefined, string, number | undefined]>([
    [{ state: 'on', attributes: { percentage: 70 } }, 'fan.x', 70],
    [{ state: 'on' }, 'fan.x', 100], // on, no percentage -> 100
    [{ state: 'off', attributes: { percentage: 0 } }, 'fan.x', 0],
    [{ state: '5' }, 'sensor.x', 5],
    [{ state: 'on' }, 'switch.x', 1],
    [{ state: '0' }, 'switch.x', 0],
    [{ state: 'idle' }, 'sensor.x', undefined],
    [undefined, 'fan.x', undefined],
  ])('%o on %s -> %s', (state, entityId, expected) => {
    expect(fanReadingToNormalizedValue(classifyFanEntity(entityId, state))).toBe(expected);
  });
});
