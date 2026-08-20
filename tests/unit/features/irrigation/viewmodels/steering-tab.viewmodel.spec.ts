/**
 * Steering Tab ViewModel — pure factory test (ADR-0019 + ADR-0012 + ADR-0014 + ADR-0017).
 *
 * Feeds input atoms and asserts the derived VM output. No DOM. Covers the two
 * drafts (steering vs config), the confirm sub-state projection, the cross-tab
 * sizing-mode read from `$caps`, the per-phase shot descriptors, the light-sensor
 * gate, and the Adaptive Shot Control flag.
 */
import { describe, it, expect } from 'vitest';
import { atom } from 'nanostores';
import { createGrowspaceDevice } from '../../../../../src/services/types';
import type { GrowspaceDevice } from '../../../../../src/services/types';
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
});
