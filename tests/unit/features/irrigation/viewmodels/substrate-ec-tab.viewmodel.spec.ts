/**
 * Substrate & EC Tab ViewModel — pure factory test (ADR-0019 + ADR-0017).
 *
 * Feeds input atoms and asserts the derived VM output. No DOM. Covers the
 * mixed-persistence projection: immediate-persist current values (profile,
 * sizing mode, EC modulation) read from the live strategy; buffered draft (pore
 * band, per-stage ranges) read from the SM; capability gates read from `$caps`.
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
import { createSubstrateEcTabViewModel } from '../../../../../src/features/irrigation/viewmodels/substrate-ec-tab.viewmodel';

function caps(overrides: Partial<DialogCapabilities> = {}): DialogCapabilities {
  return {
    hasPump: true,
    hasSoilMoisture: true,
    hasStrategy: true,
    cropSteeringGroupVisible: true,
    volumeModeCapable: false,
    sizingModeLabel: 'Seconds',
    device: undefined,
    ...overrides,
  };
}

function device(overrides: Partial<GrowspaceDevice> = {}): GrowspaceDevice {
  return createGrowspaceDevice({
    deviceId: 'gs1',
    name: 'Tent 1',
    irrigationStrategy: {
      enabled: true,
      shotSizingMode: 'seconds',
      ecModulationEnabled: false,
      substrateProfile: { mediaType: 'coco', litersPerPot: 5 },
    } as never,
    environmentAttributes: { poreEcSensors: ['sensor.pore_ec'] } as never,
    ...overrides,
  });
}

function build(sm: DialogSM, dev: GrowspaceDevice | undefined, c: DialogCapabilities) {
  return createSubstrateEcTabViewModel(
    atom<DialogSM>(sm),
    atom<DialogCapabilities>(c),
    atom<GrowspaceDevice | undefined>(dev)
  ).get();
}

describe('createSubstrateEcTabViewModel', () => {
  it('projects the live immediate-persist values from the strategy', () => {
    const vm = build(createInitialSM(), device(), caps());
    expect(vm.profile).toEqual({ mediaType: 'coco', litersPerPot: 5 });
    expect(vm.sizingMode).toBe('seconds');
    expect(vm.ecModulationEnabled).toBe(false);
  });

  it('falls back to a coco/0 profile when the strategy has none', () => {
    const vm = build(
      createInitialSM(),
      device({ irrigationStrategy: { enabled: true } as never }),
      caps()
    );
    expect(vm.profile).toEqual({ mediaType: 'coco', litersPerPot: 0 });
    expect(vm.sizingMode).toBe('seconds');
  });

  it('reads volumeModeCapable + sizingModeLabel from $caps (server-authoritative)', () => {
    const locked = build(createInitialSM(), device(), caps({ volumeModeCapable: false }));
    expect(locked.volumeModeCapable).toBe(false);
    const unlocked = build(
      createInitialSM(),
      device(),
      caps({ volumeModeCapable: true, sizingModeLabel: 'Volume' })
    );
    expect(unlocked.volumeModeCapable).toBe(true);
    expect(unlocked.sizingModeLabel).toBe('Volume');
  });

  it('gates EC modulation on the presence of pore-EC sensors (from the device)', () => {
    expect(build(createInitialSM(), device(), caps()).hasPoreEcSensors).toBe(true);
    const none = build(createInitialSM(), device({ environmentAttributes: {} as never }), caps());
    expect(none.hasPoreEcSensors).toBe(false);
  });

  it('names the missing Volume-Mode prerequisite via the lock hint (liters set → pump)', () => {
    const withLiters = build(createInitialSM(), device(), caps());
    expect(withLiters.volumeLockHint).toBe('Set a pump flow rate to enable Volume Mode');
    const noLiters = build(
      createInitialSM(),
      device({
        irrigationStrategy: {
          enabled: true,
          substrateProfile: { mediaType: 'coco', litersPerPot: 0 },
        } as never,
      }),
      caps()
    );
    expect(noLiters.volumeLockHint).toBe('Set liters per pot to enable Volume Mode');
  });

  it('projects the buffered pore-EC band from the SM draft and flags inversion', () => {
    let sm = transition(createInitialSM(), { type: 'UPDATE_PORE_EC_BAND', min: 2.5, max: 1.5 });
    let vm = build(sm, device(), caps());
    expect(vm.poreEcMin).toBe(2.5);
    expect(vm.poreEcMax).toBe(1.5);
    expect(vm.poreBandInverted).toBe(true);

    sm = transition(createInitialSM(), { type: 'UPDATE_PORE_EC_BAND', min: 1.0, max: 2.0 });
    vm = build(sm, device(), caps());
    expect(vm.poreBandInverted).toBe(false);
  });

  it('projects the per-stage feed-EC ranges from the SM draft', () => {
    const ranges = [
      { stage: 'seedling' as const, minEc: 0.8, maxEc: 1.2 },
      { stage: 'veg' as const, minEc: 1.5, maxEc: 2.0 },
    ];
    const sm = transition(createInitialSM(), { type: 'UPDATE_EC_TARGETS_DRAFT', ranges });
    const vm = build(sm, device(), caps());
    expect(vm.ecTargetRanges).toEqual(ranges);
  });
});
