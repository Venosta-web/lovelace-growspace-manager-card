import { describe, it, expect } from 'vitest';
import { createTanksTabViewModel, type TanksTabDeps } from './tanks-tab.viewmodel';
import { createInitialSM, transition } from '../../../dialogs/config-dialog-sm';
import type { ConfigDialogSM } from '../../../dialogs/config-dialog-sm';

const noDeps: TanksTabDeps = { entityOptions: () => [] };

function sm(): ConfigDialogSM {
  return createInitialSM();
}

function withTanks(tanks: unknown[]): ConfigDialogSM {
  return transition(sm(), { type: 'UPDATE_ENV_DRAFT', partial: { irrigationTanks: tanks as never } });
}

describe('createTanksTabViewModel — list', () => {
  it('shows the empty state when there are no tanks and the form is idle', () => {
    const vm = createTanksTabViewModel(sm(), noDeps);
    expect(vm.tanks).toEqual([]);
    expect(vm.showEmpty).toBe(true);
    expect(vm.editing).toBeNull();
  });

  it('formats each tank row with the Tank N name fallback and defaults', () => {
    const s = withTanks([
      { sensorEntity: 'sensor.a', name: 'Main', volumeLiters: 100, warningLevel: 20 },
      { sensorEntity: 'sensor.b', name: '', volumeLiters: null, warningLevel: undefined },
    ]);
    const vm = createTanksTabViewModel(s, noDeps);
    expect(vm.tanks[0]).toMatchObject({ index: 0, displayName: 'Main', volumeLiters: 100, warningLevel: 20 });
    expect(vm.tanks[1]).toMatchObject({ index: 1, displayName: 'Tank 2', volumeLiters: null, warningLevel: 30 });
    expect(vm.showEmpty).toBe(false);
  });

  it('fills sensor options from the injected adapter', () => {
    const deps: TanksTabDeps = { entityOptions: (domains) => (domains.includes('input_number') ? ['sensor.x'] : []) };
    expect(createTanksTabViewModel(sm(), deps).sensorOptions).toEqual(['sensor.x']);
  });
});

describe('createTanksTabViewModel — editing sub-state', () => {
  it('projects the add draft when adding', () => {
    const s = transition(sm(), { type: 'BEGIN_ADD_TANK' });
    const vm = createTanksTabViewModel(s, noDeps);
    expect(vm.editing).not.toBeNull();
    expect(vm.editing).toMatchObject({ sensorEntity: '', warningLevel: 30 });
  });

  it('projects the edit draft (seeded from the tank) when editing', () => {
    let s = withTanks([{ sensorEntity: 'sensor.a', name: 'Main', volumeLiters: 100, warningLevel: 20 }]);
    s = transition(s, {
      type: 'BEGIN_EDIT_TANK',
      index: 0,
      sensorEntity: 'sensor.a',
      name: 'Main',
      volumeLiters: 100,
      warningLevel: 20,
    });
    const vm = createTanksTabViewModel(s, noDeps);
    expect(vm.editing).toMatchObject({ sensorEntity: 'sensor.a', name: 'Main', volumeLiters: 100, warningLevel: 20 });
    // the list is still shown alongside the form
    expect(vm.tanks).toHaveLength(1);
  });

  it('reflects draft updates', () => {
    let s = transition(sm(), { type: 'BEGIN_ADD_TANK' });
    s = transition(s, { type: 'UPDATE_TANK_DRAFT', partial: { sensorEntity: 'sensor.new', name: 'T' } });
    expect(createTanksTabViewModel(s, noDeps).editing).toMatchObject({ sensorEntity: 'sensor.new', name: 'T' });
  });
});
