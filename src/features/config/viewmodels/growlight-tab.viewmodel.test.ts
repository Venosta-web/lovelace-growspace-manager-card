import { describe, it, expect } from 'vitest';
import { createGrowlightTabViewModel, type GrowlightTabDeps } from './growlight-tab.viewmodel';
import { createInitialSM, transition } from '../../../dialogs/config-dialog-sm';
import type { ConfigDialogSM } from '../../../dialogs/config-dialog-sm';

const portDeps = {
  acInfinityPortDevices: () => [],
  acInfinityPortDeviceId: () => '',
  acInfinityPrefillWarning: () => [],
};
const noDeps: GrowlightTabDeps = { entityOptions: () => [], ...portDeps };

function sm(): ConfigDialogSM {
  return createInitialSM();
}

describe('createGrowlightTabViewModel', () => {
  it('projects the grow light config from the draft', () => {
    const s = transition(sm(), {
      type: 'UPDATE_ENV_DRAFT',
      partial: {
        growlightEntities: ['switch.grow'],
        growlightConfig: { enabled: true, power: 80, sunrise_enabled: true, sunrise_minutes: 15 },
      },
    });
    const vm = createGrowlightTabViewModel(s, noDeps);
    expect(vm.enabled).toBe(true);
    expect(vm.power).toBe(80);
    expect(vm.sunriseEnabled).toBe(true);
    expect(vm.sunriseMinutes).toBe(15);
    expect(vm.growlightEntities).toEqual(['switch.grow']);
    expect(vm.disabled).toBe(false);
  });

  it('greys out when disabled and requests the AC Infinity picker options', () => {
    const deps: GrowlightTabDeps = {
      entityOptions: (domains) => domains.map((dm) => `${dm}.opt`),
      ...portDeps,
    };
    const vm = createGrowlightTabViewModel(sm(), deps);
    expect(vm.disabled).toBe(true); // default enabled=false
    expect(vm.modeOptions).toContain('select.opt');
    expect(vm.timeOptions).toContain('time.opt');
    expect(vm.numberOptions).toContain('number.opt');
    expect(vm.switchOptions).toContain('switch.opt');
    // Plain grow light picker is restricted to light + switch actuators only.
    expect(vm.growlightEntityOptions).toEqual(['light.opt', 'switch.opt']);
  });

  it('surfaces the injected lights-on time from the strategy atom', () => {
    const vm = createGrowlightTabViewModel(sm(), {
      entityOptions: () => [],
      lightsOnTime: '06:00:00',
      ...portDeps,
    });
    expect(vm.lightsOnTime).toBe('06:00:00');
  });
});

describe('createGrowlightTabViewModel — Duplicate Port Warning', () => {
  const growLight = (mode_entity: string) => ({
    mode_entity,
    on_time_entity: '',
    off_time_entity: '',
    power_entity: '',
    sunrise_switch_entity: '',
    sunrise_duration_entity: '',
  });

  it('warns on a grow light port whose mode entity is also a circulation fan', () => {
    const s = transition(sm(), {
      type: 'UPDATE_ENV_DRAFT',
      partial: {
        circulationFanAcInfinityDevices: [{ mode_entity: 'select.shared', speed_entity: '', on_speed: 10 }],
        growlightAcInfinityDevices: [growLight('select.shared')],
      },
    });
    const vm = createGrowlightTabViewModel(s, noDeps);
    expect(vm.growlightDuplicateWarnings[0]).toContain('Circulation Fan');
  });
});
