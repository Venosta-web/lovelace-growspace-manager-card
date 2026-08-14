/**
 * Tanks Tab ViewModel — pure factory + merge-helper tests (ADR-0019, AC5).
 *
 * Feeds input atoms and asserts the derived VM output, plus the pure
 * `mergeTankDraft` payload composer. No DOM: this is the derivation half of the
 * first *draft* tab adapter, tested in isolation from the component.
 */
import { describe, it, expect } from 'vitest';
import { atom } from 'nanostores';
import { createGrowspaceDevice } from '../../../../../src/services/types';
import type { GrowspaceDevice, IrrigationTank } from '../../../../../src/services/types';
import {
  createInitialSM,
  transition,
  type DialogSM,
  type TankDraft,
} from '../../../../../src/dialogs/irrigation-dialog-sm';
import {
  createTanksTabViewModel,
  mergeTankDraft,
} from '../../../../../src/features/irrigation/viewmodels/tanks-tab.viewmodel';

function tank(overrides: Partial<IrrigationTank> = {}): IrrigationTank {
  return {
    sensorEntity: 'sensor.tank_a',
    name: 'Tank A',
    warningLevel: 30,
    fillLevel: 73,
    isWarning: false,
    hoursRemaining: 10,
    depletionStatus: 'depleting',
    volumeLiters: 200,
    ...overrides,
  };
}

function device(): GrowspaceDevice {
  return createGrowspaceDevice({ deviceId: 'gs1', name: 'Tent 1' });
}

function build(sm: DialogSM, tanks: IrrigationTank[], entityOptions: string[] = []) {
  const $sm = atom<DialogSM>(sm);
  const $tankLevels = atom(new Map<string, IrrigationTank[]>([['gs1', tanks]]));
  const $entityOptions = atom<string[]>(entityOptions);
  const $device = atom<GrowspaceDevice | undefined>(device());
  return createTanksTabViewModel($sm, $tankLevels, $entityOptions, $device).get();
}

describe('createTanksTabViewModel', () => {
  it('maps tank levels to display rows (verbatim formatting)', () => {
    const vm = build(createInitialSM(), [tank()]);
    expect(vm.tanks).toHaveLength(1);
    const row = vm.tanks[0];
    expect(row).toMatchObject({
      index: 0,
      name: 'Tank A',
      isWarning: false,
      color: 'var(--gm-warning-color, #FF9800)', // hoursRemaining 10 < 24 → amber
      barWidthPct: 73,
      fillLabel: '73%',
      subLine: '↓ Depleting · 10h left',
    });
  });

  it('shows N/A and clamps the bar when no fill level reports', () => {
    const vm = build(createInitialSM(), [tank({ fillLevel: null, hoursRemaining: null, depletionStatus: null })]);
    expect(vm.tanks[0].fillLabel).toBe('N/A');
    expect(vm.tanks[0].barWidthPct).toBe(0);
    expect(vm.tanks[0].subLine).toBeNull();
  });

  it('colours warning tanks red and days-remaining for long horizons', () => {
    const warn = build(createInitialSM(), [tank({ isWarning: true })]);
    expect(warn.tanks[0].color).toBe('#f44336');
    const long = build(createInitialSM(), [tank({ isWarning: false, hoursRemaining: 72, depletionStatus: 'static' })]);
    expect(long.tanks[0].color).toBe('#4caf50');
    expect(long.tanks[0].subLine).toBe('— Stable · 3d left');
  });

  it('empty when the growspace has no tanks', () => {
    const vm = build(createInitialSM(), []);
    expect(vm.tanks).toEqual([]);
    expect(vm.editing).toBeNull();
  });

  it('projects the SM editing sub-state (with entity options) into the VM', () => {
    const draft: TankDraft = { sensorEntity: 'sensor.tank_a', name: 'Tank A', volumeLiters: 200, warningLevel: 30 };
    const sm = transition(createInitialSM(), { type: 'EDIT_TANK', index: 0, draft });
    const vm = build(sm, [tank()], ['sensor.tank_a', 'sensor.tank_b']);
    expect(vm.editing).toEqual({ index: 0, draft, entityOptions: ['sensor.tank_a', 'sensor.tank_b'] });
  });

  it('editing is null when idle', () => {
    expect(build(createInitialSM(), [tank()]).editing).toBeNull();
  });
});

describe('mergeTankDraft', () => {
  const draft: TankDraft = { sensorEntity: 'sensor.new', name: 'Renamed', volumeLiters: 500, warningLevel: 45 };

  it('overwrites config fields but preserves live level fields', () => {
    const tanks = [tank(), tank({ sensorEntity: 'sensor.tank_b', name: 'Tank B' })];
    const merged = mergeTankDraft(tanks, 0, draft);
    expect(merged[0]).toEqual({
      ...draft,
      // live telemetry preserved from the original tank
      fillLevel: 73,
      isWarning: false,
      hoursRemaining: 10,
      depletionStatus: 'depleting',
    });
    // other tank untouched
    expect(merged[1]).toEqual(tanks[1]);
  });

  it('returns a fresh array (no mutation of the input)', () => {
    const tanks = [tank()];
    const merged = mergeTankDraft(tanks, 0, draft);
    expect(merged).not.toBe(tanks);
    expect(tanks[0].name).toBe('Tank A');
  });

  it('is a no-op for out-of-range indices', () => {
    const tanks = [tank()];
    expect(mergeTankDraft(tanks, 5, draft)).toEqual(tanks);
    expect(mergeTankDraft(tanks, -1, draft)).toEqual(tanks);
  });
});
