/**
 * Overview Tab ViewModel — pure factory test (ADR-0019, AC3).
 *
 * Feeds input atoms and asserts the derived VM output. No DOM: this is the
 * derivation half of the decomposed tab, tested in isolation from the component.
 */
import { describe, it, expect } from 'vitest';
import { atom } from 'nanostores';
import { createGrowspaceDevice } from '../../../../../src/services/types';
import type { GrowspaceDevice, IrrigationConfig, SteeringMetrics } from '../../../../../src/services/types';
import { createDialogCapabilities } from '../../../../../src/features/irrigation/viewmodels/dialog-capabilities';
import { createOverviewTabViewModel } from '../../../../../src/features/irrigation/viewmodels/overview-tab.viewmodel';

function metrics(overrides: Partial<SteeringMetrics> = {}): SteeringMetrics {
  return {
    overnightDryback: null,
    latestOvernightEvent: null,
    incycleDrybackCount: 0,
    incycleDrybackAvg: null,
    ecTrend: null,
    ecTrendAvailable: false,
    score: 0,
    measuredClassification: 'balanced',
    intentDeviation: null,
    shotComposition: null,
    ...overrides,
  };
}

function device(overrides: Partial<GrowspaceDevice> = {}): GrowspaceDevice {
  return createGrowspaceDevice({
    deviceId: 'gs1',
    name: 'Tent 1',
    irrigationConfig: { irrigationPumpEntity: 'switch.pump', irrigationTimes: [], drainTimes: [] },
    environmentAttributes: { soilMoistureSensor: 'sensor.soil' },
    irrigationStrategy: { enabled: true, declaredSteeringMode: 'generative' } as never,
    ...overrides,
  });
}

function buildVm($device: ReturnType<typeof atom<GrowspaceDevice | undefined>>) {
  const $configs = atom<Map<string, IrrigationConfig>>(new Map());
  const $caps = createDialogCapabilities($device, $configs);
  return createOverviewTabViewModel($device, $caps);
}

describe('createOverviewTabViewModel', () => {
  it('flags unavailable when the device has no steering metrics', () => {
    const $device = atom<GrowspaceDevice | undefined>(device({ steeringMetrics: undefined }));
    const vm = buildVm($device).get();

    expect(vm.unavailable).toBe(true);
    expect(vm.scoreText).toBe('—');
  });

  it('derives a signed 2-decimal score and the declared mode', () => {
    const $device = atom<GrowspaceDevice | undefined>(
      device({ steeringMetrics: metrics({ score: 0.6, measuredClassification: 'generative' }) })
    );
    const vm = buildVm($device).get();

    expect(vm.unavailable).toBe(false);
    expect(vm.scoreText).toBe('+0.60');
    expect(vm.declared).toBe('generative');
    expect(vm.measured).toBe('generative');
  });

  it('renders a negative score without a leading plus', () => {
    const $device = atom<GrowspaceDevice | undefined>(
      device({ steeringMetrics: metrics({ score: -0.5 }) })
    );
    expect(buildVm($device).get().scoreText).toBe('-0.50');
  });

  it('maps on-target and deviation into the intent banner', () => {
    const $onTarget = atom<GrowspaceDevice | undefined>(
      device({ steeringMetrics: metrics({ intentDeviation: 'on_target' }) })
    );
    expect(buildVm($onTarget).get().intentBanner).toBe('ontarget');

    const $deviating = atom<GrowspaceDevice | undefined>(
      device({ steeringMetrics: metrics({ intentDeviation: 'more_vegetative' }) })
    );
    expect(buildVm($deviating).get().intentBanner).toBe('deviation');
  });

  it('formats overnight dryback in absolute VWC points with peak/trough context', () => {
    const $device = atom<GrowspaceDevice | undefined>(
      device({
        steeringMetrics: metrics({
          overnightDryback: 12.5,
          latestOvernightEvent: {
            peakVwc: 55.2,
            troughVwc: 42.7,
            dryback: 12.5,
            peakTimestamp: '2026-06-13T06:00:00+00:00',
            troughTimestamp: '2026-06-13T18:00:00+00:00',
          },
        }),
      })
    );
    const card = buildVm($device).get().overnightDryback;
    expect(card.value).toBe('12.5 pts');
    expect(card.sub).toBe('peak 55.2% → trough 42.7%');
  });

  it('summarises the in-cycle shot count and average', () => {
    const $device = atom<GrowspaceDevice | undefined>(
      device({ steeringMetrics: metrics({ incycleDrybackCount: 6, incycleDrybackAvg: 3.4 }) })
    );
    const card = buildVm($device).get().inCycleDryback;
    expect(card.value).toBe('3.4 pts');
    expect(card.sub).toBe('6 shots today');
  });

  it('locks the EC-trend card when no pore-EC sensor reports', () => {
    const $device = atom<GrowspaceDevice | undefined>(
      device({ steeringMetrics: metrics({ ecTrend: null, ecTrendAvailable: false }) })
    );
    expect(buildVm($device).get().ecTrend.locked).toBe(true);
  });

  it('surfaces the measured EC-trend direction when available', () => {
    const $device = atom<GrowspaceDevice | undefined>(
      device({ steeringMetrics: metrics({ ecTrend: 'rising', ecTrendAvailable: true }) })
    );
    const card = buildVm($device).get().ecTrend;
    expect(card.locked).toBe(false);
    expect(card.value).toBe('RISING');
  });

  it('breaks the last shot into base/vwc/ec/effective rows with the active phase', () => {
    const $device = atom<GrowspaceDevice | undefined>(
      device({
        irrigationConfig: {
          irrigationPumpEntity: 'switch.pump',
          irrigationTimes: [],
          drainTimes: [],
          activeSteeringPhase: 'p2',
        },
        steeringMetrics: metrics({
          shotComposition: {
            last_shot: { base_seconds: 10, vwc_factor: 1.2, ec_factor: 0.9, effective_seconds: 11 },
          },
        }),
      })
    );
    const panel = buildVm($device).get().shotComposition;
    expect(panel?.phaseLabel).toBe('P2');
    expect(panel?.rows).toEqual([
      { label: 'Base', value: '10s' },
      { label: 'VWC factor', value: '×1.2' },
      { label: 'EC factor', value: '×0.9' },
      { label: 'Effective', value: '11s' },
    ]);
  });

  it('omits the shot-composition panel when there is no composition', () => {
    const $device = atom<GrowspaceDevice | undefined>(
      device({ steeringMetrics: metrics({ shotComposition: null }) })
    );
    expect(buildVm($device).get().shotComposition).toBeNull();
  });

  it('exposes the shared capabilities atom as a peer input (not re-derived)', () => {
    const $device = atom<GrowspaceDevice | undefined>(device());
    const vm = buildVm($device).get();
    // Overview + Steering share the Crop-Steering rail-group gate (ADR-0016).
    expect(vm.caps.cropSteeringGroupVisible).toBe(true);
    expect(vm.caps.hasPump).toBe(true);
  });

  it('re-derives when the device atom changes', () => {
    const $device = atom<GrowspaceDevice | undefined>(
      device({ steeringMetrics: metrics({ score: 0.1 }) })
    );
    const $vm = buildVm($device);
    expect($vm.get().scoreText).toBe('+0.10');

    $device.set(device({ steeringMetrics: metrics({ score: 0.9 }) }));
    expect($vm.get().scoreText).toBe('+0.90');
  });
});
