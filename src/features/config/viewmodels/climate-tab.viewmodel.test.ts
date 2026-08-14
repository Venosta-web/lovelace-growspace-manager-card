import { describe, it, expect } from 'vitest';
import {
  createClimateTabViewModel,
  type ClimateTabDeps,
  type ClimateExpandState,
} from './climate-tab.viewmodel';
import { createInitialSM, transition } from '../../../dialogs/config-dialog-sm';
import type { ConfigDialogSM } from '../../../dialogs/config-dialog-sm';

const deps: ClimateTabDeps = {
  entityOptions: () => [],
  acInfinityConflict: () => null,
  acInfinityPortDevices: () => [],
  acInfinityPortDeviceId: () => '',
  acInfinityPrefillWarning: () => [],
};
const collapsed: ClimateExpandState = {
  fanTempOverrideExpanded: false,
  exhaustCriticalTempExpanded: false,
};

function sm(): ConfigDialogSM {
  return createInitialSM();
}

function withFan(partial: Record<string, unknown>): ConfigDialogSM {
  const s = sm();
  return transition(s, {
    type: 'UPDATE_ENV_DRAFT',
    partial: { circulationFanConfig: { ...s.environmentDraft.circulationFanConfig, ...partial } },
  });
}

describe('createClimateTabViewModel — control section', () => {
  it('fills fan picker options from the injected adapter', () => {
    const d: ClimateTabDeps = {
      entityOptions: (domains) => (domains.includes('binary_sensor') ? ['x.exhaust'] : ['x.circ']),
      acInfinityConflict: () => null,
      acInfinityPortDevices: () => [],
      acInfinityPortDeviceId: () => '',
      acInfinityPrefillWarning: () => [],
    };
    const vm = createClimateTabViewModel(sm(), d, collapsed);
    expect(vm.control.exhaustFanOptions).toEqual(['x.exhaust']); // exhaust domains include binary_sensor
    expect(vm.control.circulationFanOptions).toEqual(['x.circ']);
  });
});

describe('createClimateTabViewModel — circulation fan panel', () => {
  it('marks disabled when the controller is off', () => {
    expect(
      createClimateTabViewModel(withFan({ enabled: false }), deps, collapsed).fan.disabled
    ).toBe(true);
    expect(
      createClimateTabViewModel(withFan({ enabled: true }), deps, collapsed).fan.disabled
    ).toBe(false);
  });

  it('shows Stage-Aware VPD controls only in VPD mode', () => {
    expect(
      createClimateTabViewModel(withFan({ regulation_mode: 'vpd' }), deps, collapsed).fan
        .showStageVpd
    ).toBe(true);
    expect(
      createClimateTabViewModel(withFan({ regulation_mode: 'humidity' }), deps, collapsed).fan
        .showStageVpd
    ).toBe(false);
  });

  it('relabels + dims the VPD target when stage-aware overrides drive it', () => {
    const on = createClimateTabViewModel(
      withFan({ regulation_mode: 'vpd', stage_vpd_enabled: true }),
      deps,
      collapsed
    ).fan;
    expect(on.vpdTargetLabel).toBe('Fallback VPD Target (kPa)');
    expect(on.vpdTargetDimmed).toBe(true);
    const off = createClimateTabViewModel(
      withFan({ regulation_mode: 'vpd', stage_vpd_enabled: false }),
      deps,
      collapsed
    ).fan;
    expect(off.vpdTargetLabel).toBe('VPD Target (kPa)');
    expect(off.vpdTargetDimmed).toBe(false);
  });

  it('projects the Shell expander flag and the wind toggle', () => {
    const expanded: ClimateExpandState = {
      fanTempOverrideExpanded: true,
      exhaustCriticalTempExpanded: false,
    };
    expect(
      createClimateTabViewModel(withFan({ regulation_mode: 'vpd' }), deps, expanded).fan
        .tempOverrideExpanded
    ).toBe(true);
    expect(
      createClimateTabViewModel(withFan({ wind_enabled: true }), deps, collapsed).fan.showWind
    ).toBe(true);
  });
});

describe('createClimateTabViewModel — exhaust fan panel', () => {
  it('projects the Shell critical-temp expander flag', () => {
    const expanded: ClimateExpandState = {
      fanTempOverrideExpanded: false,
      exhaustCriticalTempExpanded: true,
    };
    expect(createClimateTabViewModel(sm(), deps, expanded).exhaust.criticalTempExpanded).toBe(true);
  });
});

describe('createClimateTabViewModel — consolidated stage VPD overrides', () => {
  it('projects canonical stages with both controller values and the active growspace stage', () => {
    const base = sm();
    const state = transition(base, {
      type: 'UPDATE_ENV_DRAFT',
      partial: {
        circulationFanConfig: {
          ...base.environmentDraft.circulationFanConfig,
          stage_vpd_enabled: true,
          stage_vpd_overrides: { veg: { day: 0.91, night: 0.81 } },
        },
        exhaustFanConfig: {
          ...base.environmentDraft.exhaustFanConfig,
          stage_vpd_overrides: { veg: { day: 0.88, night: 0.78 } },
        },
      },
    });
    const vm = createClimateTabViewModel(
      state,
      { ...deps, currentStage: 'veg' },
      { ...collapsed, openStageVpdId: 'veg' }
    ).stageVpd;
    const veg = vm.stages.find((stage) => stage.id === 'veg')!;

    expect(vm.visible).toBe(true);
    expect(vm.stages).toHaveLength(9);
    expect(veg).toMatchObject({
      open: true,
      current: true,
      fan: { day: 0.91, night: 0.81 },
      exhaust: { day: 0.88, night: 0.78 },
    });
  });

  it('shows the single editor when only the exhaust controller is stage-aware', () => {
    const base = sm();
    const state = transition(base, {
      type: 'UPDATE_ENV_DRAFT',
      partial: {
        exhaustFanConfig: {
          ...base.environmentDraft.exhaustFanConfig,
          stage_vpd_enabled: true,
        },
      },
    });

    expect(createClimateTabViewModel(state, deps, collapsed).stageVpd.visible).toBe(true);
  });
});

describe('createClimateTabViewModel — AC Infinity devices', () => {
  it('projects the draft bundle lists for both fan roles', () => {
    const exhaust = [{ mode_entity: 'select.e', speed_entity: 'number.e', on_speed: 8 }];
    const circ = [{ mode_entity: 'select.c', speed_entity: 'number.c', on_speed: 5 }];
    const s = transition(sm(), {
      type: 'UPDATE_ENV_DRAFT',
      partial: { exhaustFanAcInfinityDevices: exhaust, circulationFanAcInfinityDevices: circ },
    });
    const c = createClimateTabViewModel(s, deps, collapsed).control;
    expect(c.exhaustFanAcInfinityDevices).toEqual(exhaust);
    expect(c.circulationFanAcInfinityDevices).toEqual(circ);
  });

  it('sources mode options from select.* and speed options from number.*', () => {
    const d: ClimateTabDeps = {
      entityOptions: (domains) =>
        domains.includes('select')
          ? ['select.mode']
          : domains.includes('number')
            ? ['number.speed']
            : [],
      acInfinityConflict: () => null,
      acInfinityPortDevices: () => [],
      acInfinityPortDeviceId: () => '',
      acInfinityPrefillWarning: () => [],
    };
    const c = createClimateTabViewModel(sm(), d, collapsed).control;
    expect(c.acInfinityModeOptions).toEqual(['select.mode']);
    expect(c.acInfinitySpeedOptions).toEqual(['number.speed']);
  });

  it('restricts the AC Infinity pickers to the ac_infinity platform', () => {
    const calls: Array<[string[], string | null, string | undefined]> = [];
    const d: ClimateTabDeps = {
      entityOptions: (domains, deviceClass, platform) => {
        calls.push([domains, deviceClass, platform]);
        return [];
      },
      acInfinityConflict: () => null,
      acInfinityPortDevices: () => [],
      acInfinityPortDeviceId: () => '',
      acInfinityPrefillWarning: () => [],
    };
    createClimateTabViewModel(sm(), d, collapsed);
    expect(calls).toContainEqual([['select'], null, 'ac_infinity']);
    expect(calls).toContainEqual([['number'], null, 'ac_infinity']);
    // the plain fan-entity pickers must NOT be platform-restricted
    const exhaustCall = calls.find((c) => c[0].includes('binary_sensor'))!;
    expect(exhaustCall[2]).toBeUndefined();
  });
});

describe('createClimateTabViewModel — Duplicate Port Warning', () => {
  const acDev = (mode_entity: string) => ({ mode_entity, speed_entity: '', on_speed: 10 });

  it('warns on an exhaust port whose mode entity is also a dehumidifier', () => {
    const s = transition(sm(), {
      type: 'UPDATE_ENV_DRAFT',
      partial: {
        exhaustFanAcInfinityDevices: [acDev('select.shared')],
        dehumidifierAcInfinityDevices: [acDev('select.shared')],
      },
    });
    const c = createClimateTabViewModel(s, deps, collapsed).control;
    expect(c.exhaustFanDuplicateWarnings[0]).toContain('Dehumidifier');
  });

  it('leaves ports clear when no mode entity is shared across roles', () => {
    const s = transition(sm(), {
      type: 'UPDATE_ENV_DRAFT',
      partial: {
        exhaustFanAcInfinityDevices: [acDev('select.a')],
        circulationFanAcInfinityDevices: [acDev('select.b')],
      },
    });
    const c = createClimateTabViewModel(s, deps, collapsed).control;
    expect(c.exhaustFanDuplicateWarnings).toEqual(['']);
    expect(c.circulationFanDuplicateWarnings).toEqual(['']);
  });
});
