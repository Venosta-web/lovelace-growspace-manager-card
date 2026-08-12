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
  sensorReading: () => null,
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
      sensorReading: () => null,
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
      partial: {
        temperatureSensors: ['sensor.t'],
        humiditySensors: ['sensor.h'],
        vpdSensors: ['sensor.vpd'],
      },
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
      sensorReading: () => null,
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
    const vm = createSensorsTabViewModel(s, {
      entityOptions: () => [],
      averageSensorValue: () => null,
      sensorReading: () => null,
    });
    expect(vm.lst!.vpdDisplay).toBe('—');
  });
});

// ─── Acceptable Moisture Band ────────────────────────────────────────────────

function withMoistureSensor(
  partial: Record<string, unknown> = {},
  reading: { value: string | null; unit: string | null } | null = null
) {
  const s = transition(sm(), {
    type: 'UPDATE_ENV_DRAFT',
    partial: { soilMoistureSensor: 'sensor.soil', ...partial },
  });
  return createSensorsTabViewModel(s, { ...noDeps, sensorReading: () => reading });
}

describe('createSensorsTabViewModel — moisture band visibility', () => {
  it('is absent until a soil-moisture sensor is configured', () => {
    expect(createSensorsTabViewModel(sm(), noDeps).moistureBand).toBeNull();
  });

  it('appears as soon as a sensor is picked', () => {
    expect(withMoistureSensor().moistureBand).not.toBeNull();
  });

  it('does not depend on pump or tank hardware', () => {
    // No irrigation tanks, no pump — the band is still offered.
    const vm = withMoistureSensor({ irrigationTanks: [] });
    expect(vm.moistureBand).not.toBeNull();
  });
});

describe('createSensorsTabViewModel — moisture band state', () => {
  it('shows the inherited defaults without marking them as a saved override', () => {
    const band = withMoistureSensor().moistureBand!;
    expect(band.min).toBe(20);
    expect(band.max).toBe(60);
    expect(band.isCustom).toBe(false);
  });

  it('shows a stored custom pair as an override', () => {
    const band = withMoistureSensor({ soilMoistureMin: 32.5, soilMoistureMax: 54 }).moistureBand!;
    expect(band).toMatchObject({ min: 32.5, max: 54, isCustom: true });
  });

  it('offers a 0.1% decimal step', () => {
    expect(withMoistureSensor().moistureBand!.step).toBe(0.1);
  });

  it('surfaces a validation error for an invalid pair and blocks saving it', () => {
    const band = withMoistureSensor({ soilMoistureMin: 70, soilMoistureMax: 30 }).moistureBand!;
    expect(band.error).not.toBeNull();
    expect(band.canSave).toBe(false);
  });
});

describe('createSensorsTabViewModel — moisture band preview', () => {
  it.each([
    ['too dry', '15.0', 'too_dry', 'Too dry'],
    ['in band', '40.0', 'in_band', 'Within healthy band'],
    ['too wet', '65.0', 'too_wet', 'Too wet'],
  ])('previews %s against the effective band', (_l, value, classification, label) => {
    const band = withMoistureSensor({}, { value, unit: '%' }).moistureBand!;
    expect(band.preview).toMatchObject({ classification, label });
  });

  it.each([
    ['exactly the minimum', '20.0'],
    ['exactly the maximum', '60.0'],
  ])('treats %s as in band (inclusive boundaries)', (_l, value) => {
    const band = withMoistureSensor({}, { value, unit: '%' }).moistureBand!;
    expect(band.preview!.classification).toBe('in_band');
  });

  it('previews against a custom band, not the defaults', () => {
    const band = withMoistureSensor(
      { soilMoistureMin: 32.5, soilMoistureMax: 54 },
      { value: '56.0', unit: '%' }
    ).moistureBand!;
    expect(band.preview!.classification).toBe('too_wet');
  });

  it.each([
    ['unavailable', 'unavailable'],
    ['unknown', 'unknown'],
    ['empty', ''],
  ])('omits the preview for an %s reading without blocking configuration', (_l, value) => {
    const band = withMoistureSensor({}, { value, unit: '%' }).moistureBand!;
    expect(band.preview).toBeNull();
    expect(band.error).toBeNull();
  });

  it('omits the preview when the sensor reports nothing at all', () => {
    expect(withMoistureSensor({}, null).moistureBand!.preview).toBeNull();
  });
});

describe('createSensorsTabViewModel — moisture band unit compatibility', () => {
  it.each([
    ['percentage', '%'],
    ['legacy sensors with no unit metadata', null],
  ])('offers the controls for %s', (_l, unit) => {
    const band = withMoistureSensor({}, { value: '42', unit }).moistureBand!;
    expect(band.incompatibleUnit).toBeNull();
    expect(band.preview).not.toBeNull();
  });

  it.each([
    ['temperature', '\u00b0C'],
    ['volumetric ratio', 'm\u00b3/m\u00b3'],
  ])('shows an incompatibility state for a %s sensor', (_l, unit) => {
    const band = withMoistureSensor({}, { value: '42', unit }).moistureBand!;
    expect(band.incompatibleUnit).toBe(unit);
    expect(band.preview).toBeNull();
  });
});
