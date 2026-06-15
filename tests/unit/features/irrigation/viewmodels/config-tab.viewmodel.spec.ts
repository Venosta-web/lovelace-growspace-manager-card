/**
 * Config Tab ViewModel — pure factory tests (ADR-0019).
 *
 * Feeds the SM + hasPump + pump-option input atoms and asserts the derived VM
 * output: the config-draft mirror, the pump-entity drafts read from the
 * schedules draft, the pump option pass-through, the `steeringEnabled` /
 * `hasPump` gates, and the `isRunningNow` / `isApplying` Run-Now flags. No DOM,
 * no hass — the derivation half of the Config tab adapter, tested in isolation.
 */
import { describe, it, expect } from 'vitest';
import { atom } from 'nanostores';
import {
  createInitialSM,
  transition,
  type DialogSM,
} from '../../../../../src/dialogs/irrigation-dialog-sm';
import {
  createConfigTabViewModel,
  type PumpEntityOptionVM,
} from '../../../../../src/features/irrigation/viewmodels/config-tab.viewmodel';

function build(
  sm: DialogSM,
  hasPump = false,
  pumpOptions: PumpEntityOptionVM[] = []
) {
  const $sm = atom<DialogSM>(sm);
  const $hasPump = atom<boolean>(hasPump);
  const $opts = atom<PumpEntityOptionVM[]>(pumpOptions);
  return createConfigTabViewModel($sm, $hasPump, $opts).get();
}

describe('createConfigTabViewModel', () => {
  it('mirrors the SM config draft into the VM', () => {
    const sm = transition(createInitialSM(), {
      type: 'UPDATE_CONFIG_DRAFT',
      partial: { pauseOnLowTank: false, logToLogbook: false, maxCyclesPerDay: 5 },
    });
    const vm = build(sm);
    expect(vm.draft.pauseOnLowTank).toBe(false);
    expect(vm.draft.logToLogbook).toBe(false);
    expect(vm.draft.maxCyclesPerDay).toBe(5);
  });

  it('reads the pump-entity drafts from the schedules draft', () => {
    const sm = transition(createInitialSM(), {
      type: 'UPDATE_SCHEDULES_DRAFT',
      partial: { irrigationPumpEntity: 'switch.pump1', drainPumpEntity: 'switch.drain1' },
    });
    const vm = build(sm);
    expect(vm.irrigationPumpEntity).toBe('switch.pump1');
    expect(vm.drainPumpEntity).toBe('switch.drain1');
  });

  it('passes the pump-entity options through unchanged', () => {
    const opts: PumpEntityOptionVM[] = [
      { value: 'switch.pump1', label: 'Pump 1 (switch.pump1)' },
      { value: 'input_boolean.valve', label: 'Valve A (input_boolean.valve)' },
    ];
    expect(build(createInitialSM(), false, opts).pumpEntityOptions).toEqual(opts);
  });

  it('projects the steeringEnabled gate from the steering draft', () => {
    expect(build(createInitialSM()).steeringEnabled).toBe(false);
    const enabled = transition(createInitialSM(), {
      type: 'UPDATE_STEERING_DRAFT',
      partial: { enabled: true },
    });
    expect(build(enabled).steeringEnabled).toBe(true);
  });

  it('mirrors the hasPump gate from its input atom', () => {
    expect(build(createInitialSM(), false).hasPump).toBe(false);
    expect(build(createInitialSM(), true).hasPump).toBe(true);
  });

  it('reports neither running nor applying in the idle status', () => {
    const vm = build(createInitialSM());
    expect(vm.isRunningNow).toBe(false);
    expect(vm.isApplying).toBe(false);
  });

  it('flags isRunningNow + isApplying while a run-now mutation is applying', () => {
    const sm = transition(createInitialSM(), {
      type: 'SaveRequested',
      action: 'run-now',
      params: null,
    });
    const vm = build(sm);
    expect(vm.isApplying).toBe(true);
    expect(vm.isRunningNow).toBe(true);
  });

  it('flags isApplying but NOT isRunningNow for a non-run-now mutation', () => {
    const sm = transition(createInitialSM(), {
      type: 'SaveRequested',
      action: 'save-all',
      params: null,
    });
    const vm = build(sm);
    expect(vm.isApplying).toBe(true);
    expect(vm.isRunningNow).toBe(false);
  });
});
