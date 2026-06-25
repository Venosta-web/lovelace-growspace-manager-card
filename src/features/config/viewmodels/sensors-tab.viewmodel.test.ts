import { describe, it, expect } from 'vitest';
import { createSensorsTabViewModel, type SensorsTabDeps } from './sensors-tab.viewmodel';
import { createInitialSM, transition } from '../../../dialogs/config-dialog-sm';
import type { ConfigDialogSM } from '../../../dialogs/config-dialog-sm';

function sm(): ConfigDialogSM {
  return createInitialSM();
}

const noDeps: SensorsTabDeps = {
  entityOptions: () => [],
  averageSensorValue: () => null,
};

describe('createSensorsTabViewModel — fields', () => {
  it('projects all seven sensor pickers in display order', () => {
    const vm = createSensorsTabViewModel(sm(), noDeps);
    expect(vm.fields.map((f) => f.key)).toEqual([
      'temperatureSensors',
      'humiditySensors',
      'vpdSensors',
      'soilMoistureSensor',
      'co2Sensor',
      'lightSensors',
      'substrateTemperatureSensors',
    ]);
  });

  it('marks multi vs single pickers correctly', () => {
    const vm = createSensorsTabViewModel(sm(), noDeps);
    const byKey = Object.fromEntries(vm.fields.map((f) => [f.key, f.multi]));
    expect(byKey.temperatureSensors).toBe(true);
    expect(byKey.soilMoistureSensor).toBe(false);
    expect(byKey.co2Sensor).toBe(false);
  });

  it('projects each field value from the environment draft', () => {
    let s = sm();
    s = transition(s, { type: 'UPDATE_ENV_DRAFT', partial: { temperatureSensors: ['sensor.a'] } });
    const vm = createSensorsTabViewModel(s, noDeps);
    expect(vm.fields.find((f) => f.key === 'temperatureSensors')!.value).toEqual(['sensor.a']);
  });

  it('fills options from the injected entityOptions adapter, keyed by domain+class', () => {
    const calls: Array<[string[], string | null]> = [];
    const deps: SensorsTabDeps = {
      entityOptions: (domains, dc) => {
        calls.push([domains, dc]);
        return dc === 'moisture' ? ['sensor.soil'] : ['sensor.x'];
      },
      averageSensorValue: () => null,
    };
    const vm = createSensorsTabViewModel(sm(), deps);
    expect(vm.fields.find((f) => f.key === 'soilMoistureSensor')!.options).toEqual(['sensor.soil']);
    // temperature picker asked for the temperature device_class
    expect(calls).toContainEqual([['sensor', 'input_number'], 'temperature']);
  });
});

describe('createSensorsTabViewModel — LST section', () => {
  it('is null until both temperature and humidity sensors are chosen', () => {
    expect(createSensorsTabViewModel(sm(), noDeps).lst).toBeNull();
  });

  it('is hidden when a hardware VPD sensor is configured', () => {
    let s = sm();
    s = transition(s, {
      type: 'UPDATE_ENV_DRAFT',
      partial: { temperatureSensors: ['sensor.t'], humiditySensors: ['sensor.h'], vpdSensors: ['sensor.vpd'] },
    });
    expect(createSensorsTabViewModel(s, noDeps).lst).toBeNull();
  });

  it('derives a live VPD readout from the injected averages once gated visible', () => {
    let s = sm();
    s = transition(s, {
      type: 'UPDATE_ENV_DRAFT',
      partial: { temperatureSensors: ['sensor.t'], humiditySensors: ['sensor.h'] },
    });
    const deps: SensorsTabDeps = {
      entityOptions: () => [],
      averageSensorValue: (ids) => (ids[0] === 'sensor.t' ? 25 : 60),
    };
    const vm = createSensorsTabViewModel(s, deps);
    expect(vm.lst).not.toBeNull();
    expect(vm.lst!.vpdDisplay).toMatch(/kPa$/);
  });

  it('shows an em-dash when the selected sensors report no value', () => {
    let s = sm();
    s = transition(s, {
      type: 'UPDATE_ENV_DRAFT',
      partial: { temperatureSensors: ['sensor.t'], humiditySensors: ['sensor.h'] },
    });
    const vm = createSensorsTabViewModel(s, { entityOptions: () => [], averageSensorValue: () => null });
    expect(vm.lst!.vpdDisplay).toBe('—');
  });
});
