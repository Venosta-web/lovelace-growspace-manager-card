/**
 * Steering Tab ViewModel — pure factory test (ADR-0019 + ADR-0012 + ADR-0014 + ADR-0017).
 *
 * Feeds input atoms and asserts the derived VM output. No DOM. Covers the two
 * drafts (steering vs config), the confirm sub-state projection, the cross-tab
 * sizing-mode read from `$caps`, the per-phase shot descriptors, the light-sensor
 * gate, the Adaptive Shot Control flag, and the Timing explainer's derived
 * boundary times.
 */
import { describe, it, expect } from 'vitest';
import { atom } from 'nanostores';
import { createGrowspaceDevice } from '../../../../../src/services/types';
import type { GrowspaceDevice, IrrigationConfig } from '../../../../../src/services/types';
import {
  createInitialSM,
  transition,
  type DialogSM,
} from '../../../../../src/dialogs/irrigation-dialog-sm';
import type { DialogCapabilities } from '../../../../../src/features/irrigation/viewmodels/dialog-capabilities';
import { createSteeringTabViewModel } from '../../../../../src/features/irrigation/viewmodels/steering-tab.viewmodel';

function caps(overrides: Partial<DialogCapabilities> = {}): DialogCapabilities {
  return {
    hasPump: true,
    hasSoilMoisture: true,
    hasStrategy: true,
    cropSteeringGroupVisible: true,
    volumeModeCapable: false,
    sizingModeLabel: 'Seconds',
    ...overrides,
  };
}

function config(overrides: Partial<IrrigationConfig> = {}): IrrigationConfig {
  return { irrigationTimes: [], drainTimes: [], ...overrides };
}

function device(overrides: Partial<GrowspaceDevice> = {}): GrowspaceDevice {
  return createGrowspaceDevice({
    deviceId: 'gs1',
    name: 'Tent 1',
    irrigationStrategy: { enabled: true, shotSizingMode: 'seconds' } as never,
    environmentAttributes: { lightSensors: ['sensor.light'] } as never,
    ...overrides,
  });
}

function build(sm: DialogSM, dev: GrowspaceDevice | undefined, c: DialogCapabilities) {
  return createSteeringTabViewModel(
    atom<DialogSM>(sm),
    atom<DialogCapabilities>(c),
    atom<GrowspaceDevice | undefined>(dev)
  ).get();
}

describe('createSteeringTabViewModel', () => {
  it('projects the steering draft and the active phase', () => {
    const sm = transition(createInitialSM(), {
      type: 'UPDATE_STEERING_DRAFT',
      partial: { targetVwcPercent: 52, declaredSteeringMode: 'balanced' },
    });
    const vm = build(sm, device(), caps());
    expect(vm.draft.targetVwcPercent).toBe(52);
    expect(vm.declaredMode).toBe('balanced');
    // default initial phase
    expect(vm.activePhase).toBe('p2');
  });

  it('exposes the three steering modes', () => {
    const vm = build(createInitialSM(), device(), caps());
    expect(vm.modes.map((m) => m.id)).toEqual(['vegetative', 'balanced', 'generative']);
  });

  // ── Confirm sub-state (ADR-0012) ──

  it('projects confirmMode when the mode-confirm overlay is open, null otherwise', () => {
    expect(build(createInitialSM(), device(), caps()).confirmMode).toBeNull();
    const sm = transition(createInitialSM(), { type: 'REQUEST_STEERING_MODE', mode: 'generative' });
    expect(build(sm, device(), caps()).confirmMode).toBe('generative');
  });

  it('projects confirmPhase when the phase-confirm overlay is open, null otherwise', () => {
    expect(build(createInitialSM(), device(), caps()).confirmPhase).toBeNull();
    const sm = transition(createInitialSM(), { type: 'REQUEST_PHASE_CHANGE', phase: 'p1' });
    const vm = build(sm, device(), caps());
    expect(vm.confirmPhase).toBe('p1');
  });

  // ── Cross-tab sizing-mode read (ADR-0017/0019) — from $caps, not the draft ──

  it('derives duration-second shot descriptors when sizing mode is Seconds', () => {
    const sm = transition(createInitialSM(), {
      type: 'UPDATE_STEERING_DRAFT',
      partial: { p1ShotDurationSeconds: 20, p1ShotIntervalMinutes: 12 },
    });
    const vm = build(sm, device(), caps({ sizingModeLabel: 'Seconds' }));
    const p1 = vm.phaseShots[0];
    expect(p1.id).toBe('p1');
    expect(p1.isVolume).toBe(false);
    expect(p1.sizeField).toBe('p1ShotDurationSeconds');
    expect(p1.sizeLabel).toBe('P1 Shot Duration (sec)');
    expect(p1.sizeValue).toBe(20);
    expect(p1.intervalField).toBe('p1ShotIntervalMinutes');
    expect(p1.intervalValue).toBe(12);
  });

  it('derives volume-percent shot descriptors when $caps sizing mode is Volume', () => {
    const sm = transition(createInitialSM(), {
      type: 'UPDATE_STEERING_DRAFT',
      partial: { p2ShotVolumePercent: 5.5 },
    });
    const vm = build(sm, device(), caps({ sizingModeLabel: 'Volume' }));
    const p2 = vm.phaseShots[1];
    expect(p2.id).toBe('p2');
    expect(p2.isVolume).toBe(true);
    expect(p2.sizeField).toBe('p2ShotVolumePercent');
    expect(p2.sizeLabel).toBe('P2 Shot Size (%)');
    expect(p2.sizeValue).toBe(5.5);
  });

  // ── Light-sensor gate (from the device) ──

  it('gates the auto-track switch on the presence of light sensors', () => {
    expect(build(createInitialSM(), device(), caps()).hasLightSensors).toBe(true);
    const none = build(createInitialSM(), device({ environmentAttributes: {} as never }), caps());
    expect(none.hasLightSensors).toBe(false);
  });

  // ── Adaptive Shot Control (ADR-0014) — defaults true ──

  it('defaults adaptiveEnabled to true and reflects an explicit disable', () => {
    expect(build(createInitialSM(), device(), caps()).adaptiveEnabled).toBe(true);
    const sm = transition(createInitialSM(), {
      type: 'UPDATE_STEERING_DRAFT',
      partial: { dynamicShotEnabled: false },
    });
    expect(build(sm, device(), caps()).adaptiveEnabled).toBe(false);
  });

  // ── Config-draft fields surfaced in the steering UI (UPDATE_CONFIG_DRAFT) ──

  it('projects the config-draft fields (P2 direct trigger, advance toggles, halt EC)', () => {
    const sm = transition(createInitialSM(), {
      type: 'UPDATE_CONFIG_DRAFT',
      partial: {
        soilTriggerPercent: 38,
        autoAdvanceP1ToP2: true,
        autoAdvanceP2ToP3: true,
        haltOnRunoffEcThreshold: 4.5,
      },
    });
    const vm = build(sm, device(), caps());
    expect(vm.soilTriggerPercent).toBe(38);
    expect(vm.autoAdvanceP1ToP2).toBe(true);
    expect(vm.autoAdvanceP2ToP3).toBe(true);
    expect(vm.haltOnRunoffEcThreshold).toBe(4.5);
  });
  // ── Timing explainer — derived boundary times (issue #43) ──

  describe('the Timing explainer', () => {
    /** A steering draft anchored at 06:00 with the shipped P0 / stop-buffer defaults. */
    const timed = (partial: Record<string, unknown> = {}): DialogSM =>
      transition(createInitialSM(), {
        type: 'UPDATE_STEERING_DRAFT',
        partial: {
          lightsOnTime: '06:00:00',
          p0DurationMinutes: 60,
          p2StopBeforeLightsOffMinutes: 120,
          ...partial,
        } as never,
      });

    const timesById = (vm: ReturnType<typeof build>): Record<string, string> =>
      Object.fromEntries((vm.timingExplainer?.boundaries ?? []).map((b) => [b.id, b.time]));

    it('exposes the resolved photoperiod the integration serialized', () => {
      const vm = build(
        createInitialSM(),
        device({ irrigationConfig: config({ resolvedDayHours: 20 }) }),
        caps()
      );
      expect(vm.resolvedDayHours).toBe(20);
    });

    it('falls back to 12 hours when the integration sent no resolved photoperiod', () => {
      expect(build(createInitialSM(), device(), caps()).resolvedDayHours).toBe(12);
    });

    it("names the clock boundaries of the growspace's own day", () => {
      const vm = build(
        timed(),
        device({ irrigationConfig: config({ resolvedDayHours: 12 }) }),
        caps()
      );
      expect(timesById(vm)).toEqual({
        lightsOn: '06:00',
        p0End: '07:00',
        scheduledP3: '16:00',
        lightsOff: '18:00',
      });
    });

    it('moves every boundary with the resolved photoperiod, not with a stage constant', () => {
      const vm = build(
        timed(),
        device({ irrigationConfig: config({ resolvedDayHours: 20 }) }),
        caps()
      );
      // A 20 h day pushes lights-off and the Scheduled P3 Boundary out with it;
      // P0 is anchored at the other end and does not move.
      expect(timesById(vm)).toMatchObject({
        p0End: '07:00',
        scheduledP3: '00:00',
        lightsOff: '02:00',
      });
    });

    it('follows the draft, so an edited stop buffer moves the Scheduled P3 Boundary', () => {
      const vm = build(
        timed({ p2StopBeforeLightsOffMinutes: 240 }),
        device({ irrigationConfig: config({ resolvedDayHours: 12 }) }),
        caps()
      );
      expect(timesById(vm).scheduledP3).toBe('14:00');
    });

    it('prefers the detected lights-on when auto light tracking has found one', () => {
      const vm = build(
        timed({ detectedLightsOnTime: '05:30:00' }),
        device({ irrigationConfig: config({ resolvedDayHours: 12 }) }),
        caps()
      );
      expect(timesById(vm)).toMatchObject({ lightsOn: '05:30', p0End: '06:30' });
    });

    it('names the Actual P3 Boundary alongside the scheduled one once auto-advance has fired', () => {
      const vm = build(
        timed(),
        device({
          irrigationConfig: config({
            resolvedDayHours: 12,
            activeSteeringPhase: 'p3',
            phaseChangedAt: new Date(2026, 0, 1, 15, 20).toISOString(),
          }),
        }),
        caps()
      );
      expect(timesById(vm)).toMatchObject({ actualP3: '15:20', scheduledP3: '16:00' });
      // Chronological: the boundary that actually happened comes first.
      expect(vm.timingExplainer?.boundaries.map((b) => b.id)).toEqual([
        'lightsOn',
        'p0End',
        'actualP3',
        'scheduledP3',
        'lightsOff',
      ]);
    });

    it('names only the scheduled boundary while the day is still running to it', () => {
      const vm = build(
        timed(),
        device({
          irrigationConfig: config({
            resolvedDayHours: 12,
            activeSteeringPhase: 'p2',
            phaseChangedAt: new Date(2026, 0, 1, 15, 20).toISOString(),
          }),
        }),
        caps()
      );
      expect(vm.timingExplainer?.boundaries.map((b) => b.id)).not.toContain('actualP3');
    });

    it('sizes the bar from the derived windows, splitting the shot window nominally', () => {
      const vm = build(
        timed(),
        device({ irrigationConfig: config({ resolvedDayHours: 12 }) }),
        caps()
      );
      const weights = Object.fromEntries(
        (vm.timingExplainer?.segments ?? []).map((s) => [s.id, s.weight])
      );
      // 60 min P0, a 540 min shot window, 120 min P3.
      expect(weights.p0).toBe(60);
      expect(weights.p3).toBe(120);
      expect(weights.p1 + weights.p2).toBeCloseTo(540, 6);
      // The P1|P2 divider is nominal — that boundary is VWC-driven, not clock-driven.
      expect(weights.p1).toBeLessThan(weights.p2);
    });

    it('collapses rather than inverts a window the photoperiod is too short for', () => {
      const vm = build(
        timed({ p0DurationMinutes: 240, p2StopBeforeLightsOffMinutes: 240 }),
        device({ irrigationConfig: config({ resolvedDayHours: 4 }) }),
        caps()
      );
      for (const seg of vm.timingExplainer?.segments ?? []) {
        expect(seg.weight).toBeGreaterThanOrEqual(0);
      }
    });

    it('derives nothing without a lights-on anchor, so the explainer stays schematic', () => {
      const vm = build(
        transition(createInitialSM(), {
          type: 'UPDATE_STEERING_DRAFT',
          partial: { lightsOnTime: '', detectedLightsOnTime: null } as never,
        }),
        device({ irrigationConfig: config({ resolvedDayHours: 12 }) }),
        caps()
      );
      expect(vm.timingExplainer).toBeNull();
      // The photoperiod is still known — it does not depend on the anchor.
      expect(vm.resolvedDayHours).toBe(12);
    });
  });
});
