import { describe, it, expect } from 'vitest';
import {
  createHumidityTabViewModel,
  DEFAULT_DEHUM_THRESHOLDS,
  HUMIDITY_STAGES,
  type HumidityTabDeps,
  type HumidityExpandState,
} from './humidity-tab.viewmodel';
import { createInitialSM, transition } from '../../../dialogs/config-dialog-sm';
import type { ConfigDialogSM } from '../../../dialogs/config-dialog-sm';
import { createGrowspaceDevice } from '../../../services/types';
import { composeEnvironmentConfig } from '../environment-save';
import { FAN_VPD_STAGE_COLORS, FAN_VPD_STAGE_KEYS } from '../../../features/environment/constants';

const deps: HumidityTabDeps = {
  entityOptions: () => [],
  acInfinityConflict: () => null,
  acInfinityPortDevices: () => [],
  acInfinityPortDeviceId: () => '',
  acInfinityPrefillWarning: () => [],
};
const collapsed: HumidityExpandState = {
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
    const d: HumidityTabDeps = {
      entityOptions: (domains) => (domains.includes('binary_sensor') ? ['x'] : []),
      acInfinityConflict: () => null,
      acInfinityPortDevices: () => [],
      acInfinityPortDeviceId: () => '',
      acInfinityPrefillWarning: () => [],
    };
    const vm = createHumidityTabViewModel(s, d, collapsed);
    expect(vm.humidifierEntities).toEqual(['switch.h']);
    expect(vm.dehumidifierEntities).toEqual(['switch.d']);
    expect(vm.humidifierOptions).toEqual(['x']); // humidifier domains include binary_sensor
  });

  it('projects the two control-enable flags from the draft', () => {
    const s = transition(sm(), {
      type: 'UPDATE_ENV_DRAFT',
      partial: { humidifierControlEnabled: true, dehumidifierControlEnabled: true },
    });
    const vm = createHumidityTabViewModel(s, deps, collapsed);
    expect(vm.humidifierControlEnabled).toBe(true);
    expect(vm.dehumidifierControlEnabled).toBe(true);
  });
});

describe('createHumidityTabViewModel — stages', () => {
  it('emits all canonical stages in glossary order with the shared colours', () => {
    const vm = createHumidityTabViewModel(sm(), deps, { ...collapsed, openStageId: 'veg' });
    expect(HUMIDITY_STAGES.map((stage) => stage.id)).toEqual([...FAN_VPD_STAGE_KEYS]);
    expect(vm.stages.map((stage) => stage.id)).toEqual([...FAN_VPD_STAGE_KEYS]);
    expect(vm.stages.map((stage) => stage.color)).toEqual(
      FAN_VPD_STAGE_KEYS.map((stage) => FAN_VPD_STAGE_COLORS[stage])
    );
    expect(vm.stages.find((s) => s.id === 'veg')!.open).toBe(true);
    expect(vm.stages.find((s) => s.id === 'seedling')!.open).toBe(false);
  });

  it('falls back to the default threshold when the draft has none', () => {
    const vm = createHumidityTabViewModel(sm(), deps, collapsed);
    const seedling = vm.stages.find((s) => s.id === 'seedling')!;
    expect(seedling.dehum.day.on).toBeCloseTo(DEFAULT_DEHUM_THRESHOLDS.seedling.day.on);
  });

  it('maps canonical ids to the enum-value Record keys', () => {
    const vm = createHumidityTabViewModel(sm(), deps, collapsed);
    const early = vm.stages.find((s) => s.id === 'flower_early')!;
    // dehumKey is the enum value used to look up DEFAULT_DEHUM_THRESHOLDS.
    expect(early.dehum.day.on).toBeCloseTo(DEFAULT_DEHUM_THRESHOLDS[early.dehumKey].day.on);
    expect(DEFAULT_DEHUM_THRESHOLDS[early.dehumKey]).toBeDefined();
  });

  it('round-trips a clone humidity threshold through save and reopen', () => {
    const thresholds = {
      clone: { day: { on: 0.81, off: 0.62 }, night: { on: 0.74, off: 0.58 } },
    };
    const edited = transition(sm(), {
      type: 'UPDATE_ENV_DRAFT',
      partial: { humidifierThresholds: thresholds },
    });
    const saved = composeEnvironmentConfig(edited.environmentDraft, edited.environmentDirty);
    const reopened = createInitialSM(
      createGrowspaceDevice({
        deviceId: 'gs1',
        name: 'Tent 1',
        rows: 4,
        plantsPerRow: 4,
        environmentAttributes: { humidifierThresholds: saved.humidifierThresholds },
      })
    );
    const clone = createHumidityTabViewModel(reopened, deps, collapsed).stages.find(
      (stage) => stage.id === 'clone'
    )!;
    expect(clone.hum).toEqual(thresholds.clone);
  });

  it('reads a draft override over the default, keyed by the enum value', () => {
    const vm0 = createHumidityTabViewModel(sm(), deps, collapsed);
    const key = vm0.stages.find((s) => s.id === 'veg')!.dehumKey;
    const s = transition(sm(), {
      type: 'UPDATE_ENV_DRAFT',
      partial: {
        dehumidifierThresholds: {
          [key]: { day: { on: 0.99, off: 0.88 }, night: { on: 0.5, off: 0.4 } },
        },
      },
    });
    const veg = createHumidityTabViewModel(s, deps, collapsed).stages.find(
      (st) => st.id === 'veg'
    )!;
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

describe('createHumidityTabViewModel — Duplicate Port Warning', () => {
  const acDev = (mode_entity: string) => ({ mode_entity, speed_entity: '', on_speed: 10 });

  it('warns on a dehumidifier port shared with an exhaust fan, naming Exhaust Fan', () => {
    const s = transition(sm(), {
      type: 'UPDATE_ENV_DRAFT',
      partial: {
        exhaustFanAcInfinityDevices: [acDev('select.shared')],
        dehumidifierAcInfinityDevices: [acDev('select.shared')],
      },
    });
    const vm = createHumidityTabViewModel(s, deps, collapsed);
    expect(vm.dehumidifierDuplicateWarnings[0]).toContain('Exhaust Fan');
  });
});
