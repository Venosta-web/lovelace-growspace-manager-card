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
import { token } from '../../../../../src/styles/variables.generated';

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
    expect(vm.irrigationSection!.color).toBe(token['--metric-irrigation']);
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
    expect(vm.drainSection!.color).toBe(token['--metric-drain']);
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
      // Stage is deliberately irrelevant; the backend-resolved value below wins.
      biologicalMetrics: { flowerWeek: 1 },
      irrigationConfig: {
        irrigationPumpEntity: 'switch.pump',
        drainPumpEntity: '',
        irrigationDuration: 60,
        drainDuration: 60,
        irrigationTimes: [],
        drainTimes: [],
        resolvedDayHours: 11,
      },
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
    expect(cs.lightHours).toBe(11);
    expect(cs.lightsOnLabel).toBe('06:00');
    expect(cs.lightsOffLabel).toBe('17:00');
    // P0 (60m) ends 07:00, where the first shot lands; the P2 cutoff is 15:00
    // (17:00 − 120m); shots every 60m → 8.
    expect(cs.shotCount).toBe(8);
    expect(cs.phases.map((p) => p.id)).toEqual(['p0', 'p1', 'p2', 'p3']);
    // With no VWC history the Saturation Target crossing is unknown, so P1 owns
    // the whole shot window and every shot counts as a ramp shot.
    expect(cs.phases.find((p) => p.id === 'p1')!.shotCount).toBe(8);
    expect(cs.phases.find((p) => p.id === 'p2')!.shotCount).toBe(0);
    // No shots fire in P0 or P3, so neither carries a count at all.
    expect(cs.phases.find((p) => p.id === 'p0')!.shotCount).toBeNull();
    expect(cs.phases.find((p) => p.id === 'p3')!.shotCount).toBeNull();
  });

  it('still renders the drain section in crop-steering mode when a drain pump is set', () => {
    const dev = device({
      irrigationStrategy: {
        enabled: true,
        lightsOnTime: '06:00:00',
        shotDurationSeconds: 15,
        shotIntervalMinutes: 60,
      },
      irrigationConfig: {
        irrigationPumpEntity: 'switch.pump',
        drainPumpEntity: 'switch.drain',
        irrigationDuration: 60,
        drainDuration: 60,
        irrigationTimes: [],
        drainTimes: [{ time: '10:00:00', duration: 60 }],
      },
    } as unknown as Partial<GrowspaceDevice>);
    const vm = build(createInitialSM(dev), dev);
    expect(vm.isCropSteering).toBe(true);
    expect(vm.irrigationSection).toBeNull();
    expect(vm.drainSection).not.toBeNull();
    expect(vm.drainSection!.times).toHaveLength(1);
  });

  it('reports the empty state when no strategy is configured', () => {
    const dev = device({
      irrigationStrategy: { enabled: true, lightsOnTime: '' },
    } as unknown as Partial<GrowspaceDevice>);
    const vm = build(createInitialSM(dev), dev);
    expect(vm.cropSteering!.configured).toBe(false);
  });

  it('splits P1 from P2 at the measured Saturation Target crossing', () => {
    const dev = device({
      irrigationStrategy: {
        enabled: true,
        lightsOnTime: '06:00:00',
        p0DurationMinutes: 60,
        p2StopBeforeLightsOffMinutes: 120,
        targetVwcPercent: 65,
        maintenanceDrybackPercent: 3,
        shotDurationSeconds: 15,
        shotIntervalMinutes: 60,
      },
      irrigationConfig: {
        irrigationPumpEntity: 'switch.pump',
        drainPumpEntity: '',
        irrigationTimes: [],
        drainTimes: [],
        resolvedDayHours: 11,
      },
    } as unknown as Partial<GrowspaceDevice>);

    // Lights on 06:00, P0 ends 07:00, P3 starts 15:00. VWC reaches the 65% target
    // at 09:00, which is where P1 hands over to P2.
    const at = (hh: number) => {
      const d = new Date();
      d.setHours(hh, 0, 0, 0);
      return d;
    };
    const history = new Map<string, CropSteeringHistory>([
      [
        'gs1',
        {
          growspace_id: 'gs1',
          lights_on: at(6).toISOString(),
          soil_moisture: [
            { timestamp: at(7).toISOString(), value: 52 },
            { timestamp: at(8).toISOString(), value: 61 },
            { timestamp: at(9).toISOString(), value: 66 },
            { timestamp: at(10).toISOString(), value: 64 },
          ],
        } as unknown as CropSteeringHistory,
      ],
    ]);

    const cs = build(createInitialSM(dev), dev, history).cropSteering!;

    // Hourly shots from 07:00 to 14:00: two land in P1's ramp, six in P2.
    expect(cs.phases.find((p) => p.id === 'p1')!.shotCount).toBe(2);
    expect(cs.phases.find((p) => p.id === 'p2')!.shotCount).toBe(6);
  });

  it('previews an unsaved Skip P2 toggle against the measured crossing (growspace_manager_workspace#131)', () => {
    const dev = device({
      irrigationStrategy: {
        enabled: true,
        lightsOnTime: '06:00:00',
        p0DurationMinutes: 60,
        p2StopBeforeLightsOffMinutes: 120,
        targetVwcPercent: 65,
        maintenanceDrybackPercent: 3,
        shotDurationSeconds: 15,
        shotIntervalMinutes: 60,
      },
      irrigationConfig: {
        irrigationPumpEntity: 'switch.pump',
        drainPumpEntity: '',
        irrigationTimes: [],
        drainTimes: [],
        resolvedDayHours: 11,
      },
    } as unknown as Partial<GrowspaceDevice>);

    const at = (hh: number) => {
      const d = new Date();
      d.setHours(hh, 0, 0, 0);
      return d;
    };
    const history = new Map<string, CropSteeringHistory>([
      [
        'gs1',
        {
          growspace_id: 'gs1',
          lights_on: at(6).toISOString(),
          soil_moisture: [
            { timestamp: at(7).toISOString(), value: 52 },
            { timestamp: at(8).toISOString(), value: 61 },
            { timestamp: at(9).toISOString(), value: 66 },
            { timestamp: at(10).toISOString(), value: 64 },
          ],
        } as unknown as CropSteeringHistory,
      ],
    ]);

    const saved = build(createInitialSM(dev), dev, history).cropSteering!;
    expect(saved.shotCount).toBe(8);
    expect(saved.phases.find((p) => p.id === 'p2')!.skipped).toBe(false);

    // The grower ticks Skip P2 and saves nothing. P1 completed at 09:00, so the
    // day now ends its shots there and P3 takes the rest.
    const edited = transition(createInitialSM(dev), {
      type: 'UPDATE_STEERING_DRAFT',
      partial: { skipP2AfterP1: true },
    });
    const preview = build(edited, dev, history).cropSteering!;

    expect(dev.irrigationStrategy!.skipP2AfterP1).toBeUndefined();
    expect(preview.shotCount).toBe(2);
    expect(preview.phases.find((p) => p.id === 'p1')!.shotCount).toBe(2);
    expect(preview.phases.find((p) => p.id === 'p2')).toMatchObject({
      skipped: true,
      shotCount: 0,
      target: 'Skipped',
    });
  });

  it('exposes the steering draft so the hosted chart can preview it (growspace_manager_workspace#130)', () => {
    const dev = steeringDevice();
    const vm = build(createInitialSM(dev), dev);
    // Hydrated from the device, so an untouched dialog previews what is running.
    expect(vm.steeringDraft.p2StopBeforeLightsOffMinutes).toBe(120);
    expect(vm.steeringDraft.lightsOnTime).toBe('06:00:00');
  });

  it('recomputes the projected day from an unsaved P2 timing change (growspace_manager_workspace#130)', () => {
    // Lights 06:00–17:00, P0 ends 07:00, P2 stops 120m before lights-off (15:00),
    // shots every 120m → 07:00, 09:00, 11:00, 13:00.
    const dev = device({
      irrigationStrategy: {
        enabled: true,
        lightsOnTime: '06:00:00',
        p0DurationMinutes: 60,
        p2StopBeforeLightsOffMinutes: 120,
        shotDurationSeconds: 15,
        shotIntervalMinutes: 120,
        maintenanceDrybackPercent: 3,
      },
      irrigationConfig: {
        irrigationPumpEntity: 'switch.pump',
        drainPumpEntity: '',
        irrigationDuration: 60,
        drainDuration: 60,
        irrigationTimes: [],
        drainTimes: [],
        resolvedDayHours: 11,
      },
    } as unknown as Partial<GrowspaceDevice>);

    const saved = build(createInitialSM(dev), dev);
    expect(saved.cropSteering!.shotCount).toBe(4);

    // The grower stops P2 six hours before lights-off instead of two. Nothing is
    // saved: the device atom still carries the 120m strategy.
    const edited = transition(createInitialSM(dev), {
      type: 'UPDATE_STEERING_DRAFT',
      partial: { p2StopBeforeLightsOffMinutes: 360 },
    });
    const preview = build(edited, dev);

    expect(dev.irrigationStrategy!.p2StopBeforeLightsOffMinutes).toBe(120);
    expect(preview.cropSteering!.shotCount).toBe(2);
    // …and the same draft reaches the chart, which resolves its own strategy.
    expect(preview.steeringDraft.p2StopBeforeLightsOffMinutes).toBe(360);
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
