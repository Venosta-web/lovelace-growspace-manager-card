/**
 * Water Analytics Tab ViewModel — pure factory tests (ADR-0019).
 *
 * Feeds the SM + device input atoms and asserts the derived VM output: KPI
 * passthrough, runoff %, avg tank level + warning count, tank-derived totals,
 * the crop-steering vs plain schedule summary (via the pure crop-steering
 * helper), volume-history rows, and the stageAggregates passthrough. No DOM, no
 * clock-dependent chart bucketing (that stays in the component) — the derivation
 * half of the Water Analytics adapter, tested in isolation.
 */
import { describe, it, expect } from 'vitest';
import { atom } from 'nanostores';
import type { GrowspaceDevice, DrainECReading } from '../../../../../src/services/types';
import {
  createInitialSM,
  transition,
  type DialogSM,
} from '../../../../../src/dialogs/irrigation-dialog-sm';
import { createWaterAnalyticsTabViewModel } from '../../../../../src/features/irrigation/viewmodels/water-analytics-tab.viewmodel';

function reading(overrides: Partial<DrainECReading> = {}): DrainECReading {
  return {
    timestamp: '2026-01-01T00:00:00Z',
    feedEc: 1.5,
    drainEc: 1.8,
    feedVolumeMl: null,
    drainVolumeMl: null,
    ...overrides,
  } as DrainECReading;
}

function device(overrides: Partial<GrowspaceDevice> = {}): GrowspaceDevice {
  return overrides as unknown as GrowspaceDevice;
}

function build(sm: DialogSM, dev: GrowspaceDevice | undefined) {
  const $sm = atom<DialogSM>(sm);
  const $device = atom<GrowspaceDevice | undefined>(dev);
  return createWaterAnalyticsTabViewModel($sm, $device).get();
}

describe('createWaterAnalyticsTabViewModel', () => {
  it('passes through water usage KPIs and pump gate', () => {
    const vm = build(
      createInitialSM(),
      device({
        irrigationConfig: { irrigationPumpEntity: 'switch.pump' } as any,
        waterUsage: { litersToday: 10.5, litersPerPlantPerDay: 0.65, waterEfficiency: 0.85 } as any,
      })
    );
    expect(vm.hasPump).toBe(true);
    expect(vm.waterUsage?.litersToday).toBe(10.5);
    expect(vm.waterUsage?.waterEfficiency).toBe(0.85);
  });

  it('is not pump-gated when neither pump entity is configured', () => {
    const vm = build(createInitialSM(), device({}));
    expect(vm.hasPump).toBe(false);
  });

  it('computes avg runoff % across readings that have both volumes', () => {
    const vm = build(
      createInitialSM(),
      device({
        drainConfig: {
          enabled: true,
          readings: [
            reading({ feedVolumeMl: 1000, drainVolumeMl: 200 }),
            reading({ feedVolumeMl: 1000, drainVolumeMl: 300 }),
          ],
        } as any,
      })
    );
    // (200 + 300) / (1000 + 1000) * 100 = 25
    expect(vm.avgRunoff).toBeCloseTo(25);
    expect(vm.readingsWithVolumesCount).toBe(2);
  });

  it('returns null avg runoff when no readings carry volumes', () => {
    const vm = build(
      createInitialSM(),
      device({ drainConfig: { enabled: true, readings: [reading()] } as any })
    );
    expect(vm.avgRunoff).toBeNull();
    expect(vm.readingsWithVolumesCount).toBe(0);
  });

  it('derives avg tank level and warning count from tanks', () => {
    const vm = build(
      createInitialSM(),
      device({
        environmentAttributes: {
          irrigationTanks: [
            { name: 'A', fillLevel: 80, isWarning: false },
            { name: 'B', fillLevel: 20, isWarning: true },
            { name: 'C', fillLevel: null, isWarning: false },
          ],
        } as any,
      })
    );
    // avg over tanks with a fill level: (80 + 20) / 2 = 50
    expect(vm.avgTankLevel).toBe(50);
    expect(vm.warningTankCount).toBe(1);
    expect(vm.tanks).toHaveLength(3);
    expect(vm.tanks[2].fillLevel).toBeNull();
  });

  it('null avg tank level when no tank reports a fill level', () => {
    const vm = build(
      createInitialSM(),
      device({ environmentAttributes: { irrigationTanks: [{ name: 'A', fillLevel: null }] } as any })
    );
    expect(vm.avgTankLevel).toBeNull();
  });

  it('derives tank-derived 7d / avg-per-day totals and the history gate', () => {
    const vm = build(
      createInitialSM(),
      device({
        environmentAttributes: {
          irrigationTanks: [
            {
              name: 'A',
              sensorEntity: 'sensor.level',
              fillLevel: 50,
              volumeLiters: 100,
              waterHistory: {
                events: [{ event_type: 'consumption', timestamp: '2026-01-01T00:00:00Z', liters: 2 }],
                daily_7d: [
                  { date: '2026-01-01', consumed: 4 },
                  { date: '2026-01-02', consumed: 6 },
                ],
              },
            },
          ],
        } as any,
      })
    );
    expect(vm.hasTankSensors).toBe(true);
    expect(vm.hasTankHistory).toBe(true);
    expect(vm.tankLiters7d).toBe(10);
    // two days with consumption > 0 → avg 5/day
    expect(vm.tankAvgPerDay).toBe(5);
    expect(vm.tankEvents).toHaveLength(1);
  });

  it('builds the plain schedule summary (no crop steering) from irrigation/drain times', () => {
    const vm = build(
      createInitialSM(),
      device({
        irrigationConfig: {
          irrigationTimes: [{ time: '08:00', duration: 30 }],
          drainTimes: [{ time: '09:00', duration: 45 }],
          irrigationDuration: 30,
          drainDuration: 45,
        } as any,
      })
    );
    expect(vm.isCropSteering).toBe(false);
    expect(vm.schedule.totalIrrig).toBe(1);
    expect(vm.schedule.totalDrain).toBe(1);
    expect(vm.schedule.irrigRows[0]).toEqual({ time: '08:00', duration: 30 });
    expect(vm.schedule.drainRows[0]).toEqual({ time: '09:00', duration: 45 });
  });

  it('uses fallback duration and start_time alias when a row omits them', () => {
    const vm = build(
      createInitialSM(),
      device({
        irrigationConfig: {
          irrigationTimes: [{ start_time: '07:30' }],
          irrigationDuration: 25,
        } as any,
      })
    );
    expect(vm.schedule.irrigRows[0]).toEqual({ time: '07:30', duration: 25 });
  });

  it('computes the crop-steering shot summary from the steering draft via the pure helper', () => {
    const sm = transition(createInitialSM(), {
      type: 'UPDATE_STEERING_DRAFT',
      partial: {
        enabled: true,
        lightsOnTime: '06:00:00',
        shotIntervalMinutes: 60,
        shotDurationSeconds: 30,
        p0DurationMinutes: 60,
        p2StopBeforeLightsOffMinutes: 60,
      },
    });
    const vm = build(
      sm,
      device({
        irrigationConfig: { drainTimes: [{ time: '09:00', duration: 45 }], drainDuration: 45 } as any,
      })
    );
    expect(vm.isCropSteering).toBe(true);
    expect(vm.cropSteering.shots.length).toBeGreaterThan(0);
    expect(vm.cropSteering.totalDrain).toBe(1);
    expect(vm.cropSteering.drainRows[0]).toEqual({ time: '09:00', duration: 45 });
  });

  it('derives volume-history rows + totals gated on the schedules draft drainPumpEntity', () => {
    const sm = transition(createInitialSM(), {
      type: 'UPDATE_SCHEDULES_DRAFT',
      partial: { drainPumpEntity: 'switch.pump1' },
    });
    const vm = build(
      sm,
      device({
        drainConfig: {
          enabled: true,
          readings: [
            reading({ feedEc: 1.5, drainEc: 1.8, feedVolumeMl: 1000, drainVolumeMl: 200 }),
          ],
        } as any,
      })
    );
    expect(vm.hasDrainPumpEntity).toBe(true);
    expect(vm.volumeRows).toHaveLength(1);
    expect(vm.volumeRows[0].runoff).toBeCloseTo(20);
    expect(vm.volumeRows[0].ecDelta).toBeCloseTo(0.3);
    expect(vm.totalFeedMl).toBe(1000);
    expect(vm.totalDrainMl).toBe(200);
  });

  it('passes through stageAggregates from the SM', () => {
    const sm = transition(createInitialSM(), {
      type: 'SET_STAGE_AGGREGATES',
      data: { veg: 15, flower: 25 },
    });
    const vm = build(sm, device({}));
    expect(vm.stageAggregates).toEqual({ veg: 15, flower: 25 });
  });

  it('tolerates a fully empty device (|| fallbacks)', () => {
    const vm = build(createInitialSM(), undefined);
    expect(vm.tanks).toEqual([]);
    expect(vm.schedule.totalIrrig).toBe(0);
    expect(vm.avgRunoff).toBeNull();
    expect(vm.stageAggregates).toBeNull();
  });
});
