/**
 * Schedules Tab ViewModel — pure factory tests (ADR-0019).
 *
 * Feeds input atoms (SM + device + crop-steering history) and asserts the derived
 * VM output for both render modes: the manual irrigation/drain schedule sections
 * (rows read from the device's `irrigationConfig`, inline sub-state mirrored from
 * the SM) and the read-only crop-steering panel (shots/phases via the pure
 * `crop-steering-model` helpers, sensor flags from history). No DOM, no clock.
 */
import { describe, it, expect } from 'vitest';
import { atom } from 'nanostores';
import type { GrowspaceDevice } from '../../../../../src/services/types';
import type { CropSteeringHistory } from '../../../../../src/schemas/api-schema';
import {
  createInitialSM,
  transition,
  type DialogSM,
} from '../../../../../src/dialogs/irrigation-dialog-sm';
import { createSchedulesTabViewModel } from '../../../../../src/features/irrigation/viewmodels/schedules-tab.viewmodel';

function device(overrides: Partial<GrowspaceDevice> = {}): GrowspaceDevice {
  return {
    deviceId: 'gs1',
    irrigationConfig: {
      irrigationPumpEntity: 'switch.pump',
      drainPumpEntity: '',
      irrigationDuration: 60,
      drainDuration: 60,
      irrigationTimes: [{ time: '08:00:00', duration: 30 }],
      drainTimes: [],
    },
    irrigationStrategy: { enabled: false, lightsOnTime: '06:00:00' },
    biologicalMetrics: { flowerWeek: 0 },
    ...overrides,
  } as unknown as GrowspaceDevice;
}

function build(
  sm: DialogSM,
  dev: GrowspaceDevice | undefined,
  history: Map<string, CropSteeringHistory> = new Map()
) {
  const $sm = atom<DialogSM>(sm);
  const $device = atom<GrowspaceDevice | undefined>(dev);
  const $history = atom<Map<string, CropSteeringHistory>>(history);
  return createSchedulesTabViewModel($sm, $device, $history).get();
}

describe('createSchedulesTabViewModel — manual mode', () => {
  it('is in manual mode when the steering draft is not enabled', () => {
    const dev = device();
    const vm = build(createInitialSM(dev), dev);
    expect(vm.isCropSteering).toBe(false);
    expect(vm.cropSteering).toBeNull();
    expect(vm.irrigationSection).not.toBeNull();
  });

  it('derives irrigation time rows from the device irrigationConfig', () => {
    const dev = device({
      irrigationConfig: {
        irrigationPumpEntity: 'switch.pump',
        drainPumpEntity: '',
        irrigationDuration: 60,
        drainDuration: 60,
        irrigationTimes: [
          { time: '08:30:00', duration: 45 },
          { time: '20:00:00' }, // no duration → falls back to default 60
        ],
        drainTimes: [],
      },
    } as unknown as Partial<GrowspaceDevice>);
    const vm = build(createInitialSM(dev), dev);
    expect(vm.irrigationSection!.color).toBe('#2196F3');
    expect(vm.irrigationSection!.times).toEqual([
      { timeStr: '08:30:00', startMin: 510, durationSeconds: 45 },
      { timeStr: '20:00:00', startMin: 1200, durationSeconds: 60 },
    ]);
  });

  it('omits the drain section when no drain pump entity is configured', () => {
    const dev = device();
    const vm = build(createInitialSM(dev), dev);
    expect(vm.drainSection).toBeNull();
  });

  it('includes the drain section when a drain pump entity is set', () => {
    const dev = device({
      irrigationConfig: {
        irrigationPumpEntity: 'switch.pump',
        drainPumpEntity: 'switch.drain',
        irrigationDuration: 60,
        drainDuration: 90,
        irrigationTimes: [],
        drainTimes: [{ start_time: '09:00:00', duration_seconds: 120 }],
      },
    } as unknown as Partial<GrowspaceDevice>);
    const vm = build(createInitialSM(dev), dev);
    expect(vm.drainSection).not.toBeNull();
    expect(vm.drainSection!.color).toBe('#FF9800');
    expect(vm.drainSection!.defaultDuration).toBe(90);
    expect(vm.drainSection!.times).toEqual([
      { timeStr: '09:00:00', startMin: 540, durationSeconds: 120 },
    ]);
  });

  it('mirrors the inline add sub-state from the SM', () => {
    const dev = device();
    const sm = transition(createInitialSM(dev), {
      type: 'BEGIN_ADD_IRRIGATION',
      time: '12:00',
      duration: 60,
    });
    const vm = build(sm, dev);
    expect(vm.sub).toEqual({ kind: 'adding-irrigation', time: '12:00', duration: 60 });
  });

  it('mirrors the inline edit sub-state from the SM', () => {
    const dev = device();
    const sm = transition(createInitialSM(dev), {
      type: 'BEGIN_EDIT_DRAIN',
      originalTime: '09:00:00',
      originalDuration: 120,
      time: '09:00',
      duration: 120,
    });
    const vm = build(sm, dev);
    expect(vm.sub.kind).toBe('editing-drain');
  });
});

describe('createSchedulesTabViewModel — crop-steering mode', () => {
  function steeringDevice(): GrowspaceDevice {
    return device({
      irrigationStrategy: {
        enabled: true,
        lightsOnTime: '06:00:00',
        p0DurationMinutes: 60,
        p2StopBeforeLightsOffMinutes: 120,
        shotDurationSeconds: 15,
        shotIntervalMinutes: 60,
        maintenanceDrybackPercent: 3,
      },
      biologicalMetrics: { flowerWeek: 1 }, // flower → 12h photoperiod
    } as unknown as Partial<GrowspaceDevice>);
  }

  it('switches to crop-steering mode and drops the irrigation section', () => {
    const dev = steeringDevice();
    const vm = build(createInitialSM(dev), dev);
    expect(vm.isCropSteering).toBe(true);
    expect(vm.irrigationSection).toBeNull();
    expect(vm.cropSteering).not.toBeNull();
  });

  it('computes phases and shots via the pure model helpers', () => {
    const dev = steeringDevice();
    const vm = build(createInitialSM(dev), dev);
    const cs = vm.cropSteering!;
    expect(cs.configured).toBe(true);
    expect(cs.lightHours).toBe(12);
    expect(cs.lightsOnLabel).toBe('06:00');
    expect(cs.lightsOffLabel).toBe('18:00');
    // P1 (60m) ends 07:00; P2 cutoff at 16:00 (18:00 − 120m); shots every 60m → 9.
    expect(cs.shotCount).toBe(9);
    const p2 = cs.phases.find((p) => p.id === 'p2')!;
    expect(p2.shotCount).toBe(9);
    expect(cs.phases.find((p) => p.id === 'p1')!.shotCount).toBeNull();
  });

  it('reports the empty state when no strategy is configured', () => {
    const dev = device({
      irrigationStrategy: { enabled: true, lightsOnTime: '' },
    } as unknown as Partial<GrowspaceDevice>);
    const vm = build(createInitialSM(dev), dev);
    expect(vm.cropSteering!.configured).toBe(false);
  });

  it('flags missing pore/bulk EC sensors from the history atom', () => {
    const dev = steeringDevice();
    const history = new Map<string, CropSteeringHistory>([
      [
        'gs1',
        {
          growspace_id: 'gs1',
          lights_on: '06:00',
          soil_moisture: [],
          pore_ec: [],
        } as unknown as CropSteeringHistory,
      ],
    ]);
    const vm = build(createInitialSM(dev), dev, history);
    expect(vm.cropSteering!.hasPoreEc).toBe(true);
    expect(vm.cropSteering!.hasBulkEc).toBe(false);
  });
});
