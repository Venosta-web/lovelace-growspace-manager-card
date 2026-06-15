/**
 * Drain EC Tab ViewModel — pure factory tests (ADR-0019).
 *
 * Feeds the SM + device input atoms and asserts the derived VM output: the
 * draft/sub mirror, the draft-driven status banner, and the per-row table
 * derivation (delta / over-threshold / runoff). No DOM, no clock, no locale —
 * the derivation half of the Drain EC tab adapter, tested in isolation.
 */
import { describe, it, expect } from 'vitest';
import { atom } from 'nanostores';
import type { GrowspaceDevice, DrainECReading } from '../../../../../src/services/types';
import {
  createInitialSM,
  transition,
  type DialogSM,
} from '../../../../../src/dialogs/irrigation-dialog-sm';
import { createDrainEcTabViewModel } from '../../../../../src/features/irrigation/viewmodels/drain-ec-tab.viewmodel';

function reading(overrides: Partial<DrainECReading> = {}): DrainECReading {
  return {
    timestamp: '2026-01-01T00:00:00Z',
    feedEc: 2.0,
    drainEc: 2.5,
    feedVolumeMl: null,
    drainVolumeMl: null,
    ...overrides,
  } as DrainECReading;
}

function device(readings: DrainECReading[] | undefined): GrowspaceDevice {
  return {
    drainConfig: readings ? { enabled: false, readings } : null,
  } as unknown as GrowspaceDevice;
}

function build(sm: DialogSM, dev: GrowspaceDevice | undefined) {
  const $sm = atom<DialogSM>(sm);
  const $device = atom<GrowspaceDevice | undefined>(dev);
  return createDrainEcTabViewModel($sm, $device).get();
}

describe('createDrainEcTabViewModel', () => {
  it('mirrors the SM draft and sub-state into the VM', () => {
    const sm = transition(createInitialSM(), {
      type: 'UPDATE_DRAIN_EC_DRAFT',
      partial: { enabled: true, maxEcDelta: 1.5, logFeedEc: 2.0 },
    });
    const vm = build(sm, device([]));
    expect(vm.draft.enabled).toBe(true);
    expect(vm.draft.maxEcDelta).toBe(1.5);
    expect(vm.draft.logFeedEc).toBe(2.0);
    expect(vm.sub).toEqual({ kind: 'idle' });
  });

  it('projects the saving/logging sub-state', () => {
    const saving = transition(createInitialSM(), { type: 'SET_DRAIN_SAVING', saving: true });
    expect(build(saving, device([])).sub).toEqual({ kind: 'saving' });
    const logging = transition(createInitialSM(), { type: 'SET_DRAIN_LOGGING', logging: true });
    expect(build(logging, device([])).sub).toEqual({ kind: 'logging' });
  });

  it('reports "Monitoring disabled" with a muted color when the draft is disabled', () => {
    const vm = build(createInitialSM(), device([reading()]));
    expect(vm.status.text).toBe('Monitoring disabled');
    expect(vm.status.color).toBe('rgba(255,255,255,0.3)');
  });

  it('reports "No readings yet" when enabled with no readings', () => {
    const sm = transition(createInitialSM(), {
      type: 'UPDATE_DRAIN_EC_DRAFT',
      partial: { enabled: true },
    });
    const vm = build(sm, device([]));
    expect(vm.status.text).toBe('No readings yet');
    expect(vm.status.lastReading).toBeNull();
  });

  it('flags a salt-buildup alert (red) when the last delta exceeds the draft max', () => {
    const sm = transition(createInitialSM(), {
      type: 'UPDATE_DRAIN_EC_DRAFT',
      partial: { enabled: true, maxEcDelta: 0.3 },
    });
    // delta = 2.5 - 2.0 = 0.5 > 0.3
    const vm = build(sm, device([reading({ feedEc: 2.0, drainEc: 2.5 })]));
    expect(vm.status.color).toBe('#f44336');
    expect(vm.status.text).toContain('Salt buildup alert');
    expect(vm.status.text).toContain('Δ0.50');
    expect(vm.status.lastReading?.drainEc).toBe(2.5);
  });

  it('reports EC OK (green) when within threshold and below the 0.7x warn band', () => {
    const sm = transition(createInitialSM(), {
      type: 'UPDATE_DRAIN_EC_DRAFT',
      partial: { enabled: true, maxEcDelta: 2.0 },
    });
    // delta 0.5 < 0.7 * 2.0 (=1.4) → green
    const vm = build(sm, device([reading({ feedEc: 2.0, drainEc: 2.5 })]));
    expect(vm.status.color).toBe('#4caf50');
    expect(vm.status.text).toBe('EC OK — Δ0.50 mS/cm');
  });

  it('reports the warn color (orange) between 0.7x and the max delta', () => {
    const sm = transition(createInitialSM(), {
      type: 'UPDATE_DRAIN_EC_DRAFT',
      partial: { enabled: true, maxEcDelta: 1.0 },
    });
    // delta 0.8 > 0.7 (=0.7*1.0) and not > 1.0 → orange
    const vm = build(sm, device([reading({ feedEc: 2.0, drainEc: 2.8 })]));
    expect(vm.status.color).toBe('#FF9800');
  });

  it('reads readings from device.drainConfig, most-recent-first, capped at 20', () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      reading({ timestamp: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`, feedEc: i })
    );
    const vm = build(createInitialSM(), device(many));
    expect(vm.totalReadings).toBe(25);
    expect(vm.recent).toHaveLength(20);
    // newest (feedEc 24) first
    expect(vm.recent[0].reading.feedEc).toBe(24);
  });

  it('derives per-row delta, over-threshold flag and runoff percent', () => {
    const sm = transition(createInitialSM(), {
      type: 'UPDATE_DRAIN_EC_DRAFT',
      partial: { enabled: true, maxEcDelta: 0.3 },
    });
    const vm = build(
      sm,
      device([reading({ feedEc: 2.0, drainEc: 2.6, feedVolumeMl: 1000, drainVolumeMl: 200 })])
    );
    const row = vm.recent[0];
    expect(row.delta).toBeCloseTo(0.6, 5);
    expect(row.overThreshold).toBe(true);
    expect(row.runoffPercent).toBeCloseTo(20, 5);
  });

  it('leaves runoff null when a volume is missing, and never flags over-threshold when disabled', () => {
    const vm = build(createInitialSM(), device([reading({ feedEc: 2.0, drainEc: 9.0 })]));
    expect(vm.recent[0].runoffPercent).toBeNull();
    // draft.enabled is false → no over-threshold even with a huge delta
    expect(vm.recent[0].overThreshold).toBe(false);
  });

  it('handles a device with no drainConfig (empty readings)', () => {
    const vm = build(createInitialSM(), undefined);
    expect(vm.recent).toEqual([]);
    expect(vm.totalReadings).toBe(0);
    expect(vm.status.lastReading).toBeNull();
  });
});
