import { describe, it, expect } from 'vitest';
import {
  createHumidityTabViewModel,
  DEFAULT_DEHUM_THRESHOLDS,
  type HumidityTabDeps,
  type HumidityExpandState,
} from './humidity-tab.viewmodel';
import { createInitialSM, transition } from '../../../dialogs/config-dialog-sm';
import type { ConfigDialogSM } from '../../../dialogs/config-dialog-sm';

const deps: HumidityTabDeps = { entityOptions: () => [], acInfinityConflict: () => null, acInfinityPortDevices: () => [], acInfinityPortDeviceId: () => '', acInfinityPrefillWarning: () => [] };
const collapsed: HumidityExpandState = {
  humidifierControlEnabled: false,
  dehumidifierControlEnabled: false,
  openStageId: '',
};

function sm(): ConfigDialogSM {
  return createInitialSM();
}

describe('createHumidityTabViewModel — devices', () => {
  it('projects entity selections + injected options', () => {
    const s = transition(sm(), {
      type: 'UPDATE_ENV_DRAFT',
      partial: { humidifierEntities: ['switch.h'], dehumidifierEntities: ['switch.d'] },
    });
    const d: HumidityTabDeps = { entityOptions: (domains) => (domains.includes('binary_sensor') ? ['x'] : []), acInfinityConflict: () => null, acInfinityPortDevices: () => [], acInfinityPortDeviceId: () => '', acInfinityPrefillWarning: () => [] };
    const vm = createHumidityTabViewModel(s, d, collapsed);
    expect(vm.humidifierEntities).toEqual(['switch.h']);
    expect(vm.dehumidifierEntities).toEqual(['switch.d']);
    expect(vm.humidifierOptions).toEqual(['x']); // humidifier domains include binary_sensor
  });

  it('projects the two control-enable flags from the Shell', () => {
    const vm = createHumidityTabViewModel(sm(), deps, {
      humidifierControlEnabled: true,
      dehumidifierControlEnabled: true,
      openStageId: '',
    });
    expect(vm.humidifierControlEnabled).toBe(true);
    expect(vm.dehumidifierControlEnabled).toBe(true);
  });
});

describe('createHumidityTabViewModel — stages', () => {
  it('emits all 8 stages with the open one flagged', () => {
    const vm = createHumidityTabViewModel(sm(), deps, { ...collapsed, openStageId: 'veg' });
    expect(vm.stages).toHaveLength(8);
    expect(vm.stages.find((s) => s.id === 'veg')!.open).toBe(true);
    expect(vm.stages.find((s) => s.id === 'seedling')!.open).toBe(false);
  });

  it('falls back to the default threshold when the draft has none', () => {
    const vm = createHumidityTabViewModel(sm(), deps, collapsed);
    const seedling = vm.stages.find((s) => s.id === 'seedling')!;
    expect(seedling.dehum.day.on).toBeCloseTo(DEFAULT_DEHUM_THRESHOLDS.seedling.day.on);
  });

  it('maps the display id to the enum-value Record key (early_flower → flower_early default)', () => {
    const vm = createHumidityTabViewModel(sm(), deps, collapsed);
    const early = vm.stages.find((s) => s.id === 'early_flower')!;
    // dehumKey is the enum value used to look up DEFAULT_DEHUM_THRESHOLDS.
    expect(early.dehum.day.on).toBeCloseTo(DEFAULT_DEHUM_THRESHOLDS[early.dehumKey].day.on);
    expect(DEFAULT_DEHUM_THRESHOLDS[early.dehumKey]).toBeDefined();
  });

  it('reads a draft override over the default, keyed by the enum value', () => {
    const vm0 = createHumidityTabViewModel(sm(), deps, collapsed);
    const key = vm0.stages.find((s) => s.id === 'veg')!.dehumKey;
    const s = transition(sm(), {
      type: 'UPDATE_ENV_DRAFT',
      partial: { dehumidifierThresholds: { [key]: { day: { on: 0.99, off: 0.88 }, night: { on: 0.5, off: 0.4 } } } },
    });
    const veg = createHumidityTabViewModel(s, deps, collapsed).stages.find((st) => st.id === 'veg')!;
    expect(veg.dehum.day.on).toBeCloseTo(0.99);
    expect(veg.dehum.night.off).toBeCloseTo(0.4);
  });

  it('restricts the AC Infinity pickers to the ac_infinity platform', () => {
    const calls: Array<[string[], string | null, string | undefined]> = [];
    const d: HumidityTabDeps = {
      entityOptions: (domains, deviceClass, platform) => {
        calls.push([domains, deviceClass, platform]);
        return [];
      },
      acInfinityConflict: () => null,
      acInfinityPortDevices: () => [],
      acInfinityPortDeviceId: () => '',
      acInfinityPrefillWarning: () => [],
    };
    createHumidityTabViewModel(sm(), d, collapsed);
    expect(calls).toContainEqual([['select'], null, 'ac_infinity']);
    expect(calls).toContainEqual([['number'], null, 'ac_infinity']);
  });
});
