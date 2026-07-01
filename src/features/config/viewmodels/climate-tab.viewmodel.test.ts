import { describe, it, expect } from 'vitest';
import {
  createClimateTabViewModel,
  type ClimateTabDeps,
  type ClimateExpandState,
} from './climate-tab.viewmodel';
import { createInitialSM, transition } from '../../../dialogs/config-dialog-sm';
import type { ConfigDialogSM } from '../../../dialogs/config-dialog-sm';

const deps: ClimateTabDeps = { entityOptions: () => [] };
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
  it('gates Remove Environment on a selected growspace', () => {
    expect(createClimateTabViewModel(sm(), deps, collapsed).control.canRemoveEnvironment).toBe(false);
    const s = transition(sm(), { type: 'UPDATE_ENV_DRAFT', partial: { selectedGrowspaceId: 'gs1' } });
    expect(createClimateTabViewModel(s, deps, collapsed).control.canRemoveEnvironment).toBe(true);
  });

  it('fills fan picker options from the injected adapter', () => {
    const d: ClimateTabDeps = { entityOptions: (domains) => (domains.includes('binary_sensor') ? ['x.exhaust'] : ['x.circ']) };
    const vm = createClimateTabViewModel(sm(), d, collapsed);
    expect(vm.control.exhaustFanOptions).toEqual(['x.exhaust']); // exhaust domains include binary_sensor
    expect(vm.control.circulationFanOptions).toEqual(['x.circ']);
  });
});

describe('createClimateTabViewModel — circulation fan panel', () => {
  it('marks disabled when the controller is off', () => {
    expect(createClimateTabViewModel(withFan({ enabled: false }), deps, collapsed).fan.disabled).toBe(true);
    expect(createClimateTabViewModel(withFan({ enabled: true }), deps, collapsed).fan.disabled).toBe(false);
  });

  it('shows Stage-Aware VPD controls only in VPD mode', () => {
    expect(createClimateTabViewModel(withFan({ regulation_mode: 'vpd' }), deps, collapsed).fan.showStageVpd).toBe(true);
    expect(createClimateTabViewModel(withFan({ regulation_mode: 'humidity' }), deps, collapsed).fan.showStageVpd).toBe(false);
  });

  it('shows the overrides table only in VPD mode with the toggle on', () => {
    expect(createClimateTabViewModel(withFan({ regulation_mode: 'vpd', stage_vpd_enabled: true }), deps, collapsed).fan.showStageVpdTable).toBe(true);
    expect(createClimateTabViewModel(withFan({ regulation_mode: 'vpd', stage_vpd_enabled: false }), deps, collapsed).fan.showStageVpdTable).toBe(false);
    expect(createClimateTabViewModel(withFan({ regulation_mode: 'humidity', stage_vpd_enabled: true }), deps, collapsed).fan.showStageVpdTable).toBe(false);
  });

  it('relabels + dims the VPD target when stage-aware overrides drive it', () => {
    const on = createClimateTabViewModel(withFan({ regulation_mode: 'vpd', stage_vpd_enabled: true }), deps, collapsed).fan;
    expect(on.vpdTargetLabel).toBe('Fallback VPD Target (kPa)');
    expect(on.vpdTargetDimmed).toBe(true);
    const off = createClimateTabViewModel(withFan({ regulation_mode: 'vpd', stage_vpd_enabled: false }), deps, collapsed).fan;
    expect(off.vpdTargetLabel).toBe('VPD Target (kPa)');
    expect(off.vpdTargetDimmed).toBe(false);
  });

  it('projects the Shell expander flag and the wind toggle', () => {
    const expanded: ClimateExpandState = { fanTempOverrideExpanded: true, exhaustCriticalTempExpanded: false };
    expect(createClimateTabViewModel(withFan({ regulation_mode: 'vpd' }), deps, expanded).fan.tempOverrideExpanded).toBe(true);
    expect(createClimateTabViewModel(withFan({ wind_enabled: true }), deps, collapsed).fan.showWind).toBe(true);
  });
});

describe('createClimateTabViewModel — exhaust fan panel', () => {
  it('shows the overrides table whenever stage-aware (no mode gate)', () => {
    const s = transition(sm(), {
      type: 'UPDATE_ENV_DRAFT',
      partial: { exhaustFanConfig: { ...sm().environmentDraft.exhaustFanConfig, stage_vpd_enabled: true } },
    });
    expect(createClimateTabViewModel(s, deps, collapsed).exhaust.showStageVpdTable).toBe(true);
  });

  it('projects the Shell critical-temp expander flag', () => {
    const expanded: ClimateExpandState = { fanTempOverrideExpanded: false, exhaustCriticalTempExpanded: true };
    expect(createClimateTabViewModel(sm(), deps, expanded).exhaust.criticalTempExpanded).toBe(true);
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
    };
    const c = createClimateTabViewModel(sm(), d, collapsed).control;
    expect(c.acInfinityModeOptions).toEqual(['select.mode']);
    expect(c.acInfinitySpeedOptions).toEqual(['number.speed']);
  });
});
