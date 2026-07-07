import { describe, it, expect } from 'vitest';
import {
  resolveAcInfinityPort,
  listAcInfinityPortDevices,
  fillAcInfinityActuatorPort,
  fillAcInfinityGrowLightPort,
  deviceIdForModeEntity,
} from './ac-infinity-port-resolver';
import type { EntityRegistrySnapshot } from './ac-infinity-port-resolver';
import type { AcInfinityDevice, AcInfinityGrowLight } from '../../../slices/growspace/schema';

/** A registry entry as the frontend exposes it on `hass.entities[eid]`. */
const entry = (platform: string, device_id: string, translation_key: string) => ({
  platform,
  device_id,
  translation_key,
});

describe('resolveAcInfinityPort', () => {
  it('resolves the mode role to the ac_infinity active_mode select of the picked device', () => {
    const registry: EntityRegistrySnapshot = {
      'select.port_1_active_mode': entry('ac_infinity', 'dev1', 'active_mode'),
    };
    expect(resolveAcInfinityPort(registry, 'dev1').mode).toBe('select.port_1_active_mode');
  });

  it('resolves all six roles by domain + translation_key on the picked device', () => {
    const registry: EntityRegistrySnapshot = {
      'select.mode': entry('ac_infinity', 'dev1', 'active_mode'),
      'number.power': entry('ac_infinity', 'dev1', 'on_power'),
      'time.on': entry('ac_infinity', 'dev1', 'schedule_mode_on_time'),
      'time.off': entry('ac_infinity', 'dev1', 'schedule_mode_off_time'),
      'switch.sunrise': entry('ac_infinity', 'dev1', 'sunrise_timer_enabled'),
      'number.sunrise_minutes': entry('ac_infinity', 'dev1', 'sunrise_timer_minutes'),
    };
    expect(resolveAcInfinityPort(registry, 'dev1')).toEqual({
      mode: 'select.mode',
      power: 'number.power',
      onTime: 'time.on',
      offTime: 'time.off',
      sunriseSwitch: 'switch.sunrise',
      sunriseDuration: 'number.sunrise_minutes',
    });
  });

  it('ignores entities of another platform, another device, or the wrong domain', () => {
    const registry: EntityRegistrySnapshot = {
      'select.other_platform': entry('other', 'dev1', 'active_mode'),
      'select.other_device': entry('ac_infinity', 'dev2', 'active_mode'),
      'sensor.wrong_domain': entry('ac_infinity', 'dev1', 'active_mode'),
    };
    expect(resolveAcInfinityPort(registry, 'dev1').mode).toBeUndefined();
  });

  it('leaves a role absent when the device exposes no entity for it', () => {
    const registry: EntityRegistrySnapshot = {
      'select.mode': entry('ac_infinity', 'dev1', 'active_mode'),
    };
    const roles = resolveAcInfinityPort(registry, 'dev1');
    expect(roles.mode).toBe('select.mode');
    expect(roles.power).toBeUndefined();
  });

  it('resolves a duplicated role deterministically to the first entity by sorted id', () => {
    // A device exposing two on_power numbers (basic + AI controller variants):
    // resolution must be stable regardless of registry key order.
    const registry: EntityRegistrySnapshot = {
      'number.z_power': entry('ac_infinity', 'dev1', 'on_power'),
      'number.a_power': entry('ac_infinity', 'dev1', 'on_power'),
    };
    expect(resolveAcInfinityPort(registry, 'dev1').power).toBe('number.a_power');
  });

  it('resolves nothing for a blank device id', () => {
    const registry: EntityRegistrySnapshot = {
      'select.mode': entry('ac_infinity', 'dev1', 'active_mode'),
    };
    expect(resolveAcInfinityPort(registry, '')).toEqual({});
  });
});

describe('listAcInfinityPortDevices', () => {
  const name = (id: string) => ({ dev1: 'Grow Tent Port 1', dev2: 'Grow Tent Port 2' })[id] ?? id;

  it('lists only devices exposing an ac_infinity active_mode select, labeled by device name', () => {
    const registry: EntityRegistrySnapshot = {
      'select.p1_mode': entry('ac_infinity', 'dev1', 'active_mode'),
      // dev2 is a port too, exposed via its own active_mode select.
      'select.p2_mode': entry('ac_infinity', 'dev2', 'active_mode'),
      // A number-only device is not a controllable port -> excluded.
      'number.no_mode': entry('ac_infinity', 'dev3', 'on_power'),
      // The controller parent exposes a select but not active_mode -> excluded.
      'select.controller': entry('ac_infinity', 'dev4', 'outside_climate_temperature'),
      // Another platform -> excluded.
      'select.foreign': entry('other', 'dev5', 'active_mode'),
    };
    expect(listAcInfinityPortDevices(registry, name)).toEqual([
      { id: 'dev1', label: 'Grow Tent Port 1' },
      { id: 'dev2', label: 'Grow Tent Port 2' },
    ]);
  });

  it('lists each port device once and sorts by label', () => {
    const registry: EntityRegistrySnapshot = {
      'select.p2_mode': entry('ac_infinity', 'dev2', 'active_mode'),
      'select.p1_mode': entry('ac_infinity', 'dev1', 'active_mode'),
      // A second active_mode select on dev1 must not duplicate the device.
      'select.p1_mode_alt': entry('ac_infinity', 'dev1', 'active_mode'),
    };
    expect(listAcInfinityPortDevices(registry, name)).toEqual([
      { id: 'dev1', label: 'Grow Tent Port 1' },
      { id: 'dev2', label: 'Grow Tent Port 2' },
    ]);
  });
});

describe('fillAcInfinityActuatorPort', () => {
  const port = (overrides: Partial<AcInfinityDevice> = {}): AcInfinityDevice => ({
    mode_entity: '',
    speed_entity: '',
    on_speed: 10,
    ...overrides,
  });

  it('fills mode and speed from resolved roles and preserves on_speed', () => {
    const { device, missing } = fillAcInfinityActuatorPort(port({ on_speed: 7 }), {
      mode: 'select.mode',
      power: 'number.power',
    });
    expect(device).toEqual({
      mode_entity: 'select.mode',
      speed_entity: 'number.power',
      on_speed: 7,
    });
    expect(missing).toEqual([]);
  });

  it('clears a role that did not resolve and names it as missing', () => {
    const { device, missing } = fillAcInfinityActuatorPort(
      port({ mode_entity: 'select.stale', speed_entity: 'number.stale' }),
      { mode: 'select.mode' }
    );
    expect(device.mode_entity).toBe('select.mode');
    expect(device.speed_entity).toBe('');
    expect(missing).toEqual(['Speed']);
  });

  it('names every unresolved role when nothing resolves', () => {
    const { device, missing } = fillAcInfinityActuatorPort(port(), {});
    expect(device).toEqual({ mode_entity: '', speed_entity: '', on_speed: 10 });
    expect(missing).toEqual(['Mode', 'Speed']);
  });
});

describe('fillAcInfinityGrowLightPort', () => {
  const blank = (): AcInfinityGrowLight => ({
    mode_entity: '',
    on_time_entity: '',
    off_time_entity: '',
    power_entity: '',
    sunrise_switch_entity: '',
    sunrise_duration_entity: '',
  });

  it('fills all six roles from one resolution pass', () => {
    const { device, missing } = fillAcInfinityGrowLightPort(blank(), {
      mode: 'select.mode',
      onTime: 'time.on',
      offTime: 'time.off',
      power: 'number.power',
      sunriseSwitch: 'switch.sunrise',
      sunriseDuration: 'number.sunrise_minutes',
    });
    expect(device).toEqual({
      mode_entity: 'select.mode',
      on_time_entity: 'time.on',
      off_time_entity: 'time.off',
      power_entity: 'number.power',
      sunrise_switch_entity: 'switch.sunrise',
      sunrise_duration_entity: 'number.sunrise_minutes',
    });
    expect(missing).toEqual([]);
  });

  it('clears unresolved sunrise roles and names them, bundle still complete', () => {
    const stale: AcInfinityGrowLight = {
      mode_entity: 'select.old',
      on_time_entity: 'time.old_on',
      off_time_entity: 'time.old_off',
      power_entity: 'number.old',
      sunrise_switch_entity: 'switch.old',
      sunrise_duration_entity: 'number.old_min',
    };
    const { device, missing } = fillAcInfinityGrowLightPort(stale, {
      mode: 'select.mode',
      onTime: 'time.on',
      offTime: 'time.off',
      power: 'number.power',
    });
    expect(device).toEqual({
      mode_entity: 'select.mode',
      on_time_entity: 'time.on',
      off_time_entity: 'time.off',
      power_entity: 'number.power',
      sunrise_switch_entity: '',
      sunrise_duration_entity: '',
    });
    expect(missing).toEqual(['Sunrise switch', 'Sunrise duration']);
  });
});

describe('deviceIdForModeEntity', () => {
  it('derives the picked device from the saved mode entity', () => {
    const registry: EntityRegistrySnapshot = {
      'select.mode': entry('ac_infinity', 'dev1', 'active_mode'),
    };
    expect(deviceIdForModeEntity(registry, 'select.mode')).toBe('dev1');
  });

  it('returns an empty id for a blank or unknown mode entity', () => {
    expect(deviceIdForModeEntity({}, '')).toBe('');
    expect(deviceIdForModeEntity({}, 'select.gone')).toBe('');
  });
});
