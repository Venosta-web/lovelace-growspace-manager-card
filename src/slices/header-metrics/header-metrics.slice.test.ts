/**
 * HeaderMetrics slice unit tests.
 *
 * Each `describe` block corresponds to one TDD cycle (RED → GREEN).
 * Factory helpers keep fixtures local — no shared mutable state between cycles.
 */

import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { mdiFan, mdiLightbulbOn, mdiLightbulbOff } from '@mdi/js';
import type { EnvSnapshot, SensorReadings } from '../environment';
import type { DeviceEntry, DeviceSnapshot } from '../device-state';
import type { PlantEntity } from '../../features/plants/types';
import type { IrrigationConfig, IrrigationStrategy, IrrigationTank } from '../../services/types';
import { MetricKey } from '../../features/environment/constants';
import { computeHeaderMetrics } from './index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEnvSnapshot(overrides: Partial<EnvSnapshot> = {}): EnvSnapshot {
  return {
    temperature: null,
    humidity: null,
    vpd: null,
    vpdStatus: null,
    co2: null,
    temperatureReadings: null,
    humidityReadings: null,
    vpdReadings: null,
    co2Readings: null,
    isLightsOn: null,
    hasLightSensor: false,
    dli: null,
    optimalConditions: null,
    soilMoisture: null,
    substrateTemperature: null,
    ph: null,
    feedEc: null,
    bulkEc: null,
    poreEc: null,
    runoffEc: null,
    drainVolume: null,
    irrigationFlow: null,
    power: null,
    energy: null,
    ...overrides,
  };
}

function makePlantEntity(overrides: Partial<PlantEntity['attributes']> = {}): PlantEntity {
  return {
    entity_id: 'sensor.test_plant',
    state: 'flower',
    attributes: {
      growspace_id: 'gs1',
      plant_id: 'p1',
      stage: 'flower',
      flower_start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      flower_days: 14,
      row: 1,
      col: 1,
      ...overrides,
    },
    last_changed: '',
    last_updated: '',
    context: { id: '', user_id: null, parent_id: null },
  } as PlantEntity;
}

function makeIrrigationConfig(overrides: Partial<IrrigationConfig> = {}): IrrigationConfig {
  return {
    irrigationTimes: [],
    drainTimes: [],
    ...overrides,
  };
}

function makeTank(overrides: Partial<IrrigationTank> = {}): IrrigationTank {
  return {
    sensorEntity: 'sensor.tank_1',
    name: 'Main Tank',
    warningLevel: 20,
    fillLevel: 75,
    isWarning: false,
    ...overrides,
  };
}

function makeDeviceEntry(overrides: Partial<DeviceEntry> = {}): DeviceEntry {
  return {
    entityIds: ['switch.tent_1_device'],
    value: 'On',
    icon: mdiFan,
    ...overrides,
  };
}

function makeDeviceSnapshot(overrides: Partial<DeviceSnapshot> = {}): DeviceSnapshot {
  return {
    lightSensors: null,
    exhaustFans: null,
    circulationFans: null,
    humidifiers: null,
    dehumidifiers: null,
    ...overrides,
  };
}

function makeIrrigationStrategy(overrides: Partial<IrrigationStrategy> = {}): IrrigationStrategy {
  return {
    enabled: true,
    lightsOnTime: '06:00',
    p0DurationMinutes: 5,
    p2StopBeforeLightsOffMinutes: 120,
    targetVwcPercent: 80,
    maintenanceDrybackPercent: 5,
    shotDurationSeconds: 30,
    shotIntervalMinutes: 60,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Cycle 1 — Tracer bullet: temperature chip appears in hero
// ---------------------------------------------------------------------------

describe('Cycle 1 — temperature chip in hero', () => {
  it('returns a hero chip with key "temperature" when envSnapshot has a temperature', () => {
    const env = makeEnvSnapshot({ temperature: 24.5 });

    const result = computeHeaderMetrics(env, [], null, [], 'main');

    const tempChip = result.hero.find((c) => c.key === MetricKey.TEMPERATURE);
    expect(tempChip).toBeDefined();
    expect(tempChip!.value).toContain('24.5');
  });

  it('omits the temperature chip when envSnapshot.temperature is null', () => {
    const result = computeHeaderMetrics(makeEnvSnapshot(), [], null, [], 'main');

    expect(result.hero.find((c) => c.key === MetricKey.TEMPERATURE)).toBeUndefined();
  });

  it('omits the temperature chip when envSnapshot is null', () => {
    const result = computeHeaderMetrics(null, [], null, [], 'main');

    expect(result.hero.find((c) => c.key === MetricKey.TEMPERATURE)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Cycle 2 — Hero split: temperature | humidity | vpd | co2 in hero; DLI in chips
// ---------------------------------------------------------------------------

describe('Cycle 2 — hero contains only temperature, humidity, vpd, co2', () => {
  it('puts temperature, humidity, vpd and co2 chips in hero', () => {
    const env = makeEnvSnapshot({ temperature: 24, humidity: 60, vpd: 1.1, co2: 800 });

    const { hero } = computeHeaderMetrics(env, [], null, [], 'main');

    const keys = hero.map((c) => c.key);
    expect(keys).toContain(MetricKey.TEMPERATURE);
    expect(keys).toContain(MetricKey.HUMIDITY);
    expect(keys).toContain(MetricKey.VPD);
    expect(keys).toContain(MetricKey.CO2);
  });

  it('does not put temperature, humidity, vpd, co2 in chips', () => {
    const env = makeEnvSnapshot({ temperature: 24, humidity: 60, vpd: 1.1, co2: 800 });

    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');

    const heroKeys = new Set([
      MetricKey.TEMPERATURE,
      MetricKey.HUMIDITY,
      MetricKey.VPD,
      MetricKey.CO2,
    ]);
    chips.forEach((c) => expect(heroKeys.has(c.key as MetricKey)).toBe(false));
  });

  it('formats humidity with %', () => {
    const env = makeEnvSnapshot({ humidity: 60 });

    const { hero } = computeHeaderMetrics(env, [], null, [], 'main');

    const humChip = hero.find((c) => c.key === MetricKey.HUMIDITY);
    expect(humChip!.value).toContain('60');
    expect(humChip!.value).toContain('%');
  });

  it('formats co2 with ppm', () => {
    const env = makeEnvSnapshot({ co2: 900 });

    const { hero } = computeHeaderMetrics(env, [], null, [], 'main');

    const co2Chip = hero.find((c) => c.key === MetricKey.CO2);
    expect(co2Chip!.value).toContain('900');
    expect(co2Chip!.value).toContain('ppm');
  });
});

// ---------------------------------------------------------------------------
// Cycle 3 — VPD status chip.status set from EnvSnapshot.vpdStatus
// ---------------------------------------------------------------------------

describe('Cycle 3 — VPD chip.status from vpdStatus', () => {
  it('sets chip.status to "optimal" when vpdStatus is "optimal"', () => {
    const env = makeEnvSnapshot({ vpd: 1.1, vpdStatus: 'optimal' });

    const { hero } = computeHeaderMetrics(env, [], null, [], 'main');

    const vpdChip = hero.find((c) => c.key === MetricKey.VPD);
    expect(vpdChip!.status).toBe('optimal');
  });

  it('sets chip.status to "warning" when vpdStatus is "warning"', () => {
    const env = makeEnvSnapshot({ vpd: 1.6, vpdStatus: 'warning' });

    const { hero } = computeHeaderMetrics(env, [], null, [], 'main');

    expect(hero.find((c) => c.key === MetricKey.VPD)!.status).toBe('warning');
  });

  it('sets chip.status to "danger" when vpdStatus is "danger"', () => {
    const env = makeEnvSnapshot({ vpd: 2.2, vpdStatus: 'danger' });

    const { hero } = computeHeaderMetrics(env, [], null, [], 'main');

    expect(hero.find((c) => c.key === MetricKey.VPD)!.status).toBe('danger');
  });

  it('leaves chip.status undefined when vpdStatus is null', () => {
    const env = makeEnvSnapshot({ vpd: 1.1, vpdStatus: null });

    const { hero } = computeHeaderMetrics(env, [], null, [], 'main');

    expect(hero.find((c) => c.key === MetricKey.VPD)!.status).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Cycle 4 — Dominant stage from PlantEntity[]
// ---------------------------------------------------------------------------

describe('Cycle 4 — dominant stage from plants', () => {
  it('returns dominant info when plants are in flower stage', () => {
    const plant = makePlantEntity({ stage: 'flower', flower_days: 14 });

    const { dominant } = computeHeaderMetrics(null, [plant], null, [], 'main');

    expect(dominant).toBeDefined();
    expect(dominant!.daysLabel).toContain('14');
    expect(dominant!.daysLabel).toContain('Flower');
    expect(dominant!.color).toBeDefined();
    expect(dominant!.icon).toBeDefined();
  });

  it('returns undefined dominant when there are no plants', () => {
    const { dominant } = computeHeaderMetrics(null, [], null, [], 'main');

    expect(dominant).toBeUndefined();
  });

  it('includes weeksLabel derived from days', () => {
    const plant = makePlantEntity({ stage: 'flower', flower_days: 14 });

    const { dominant } = computeHeaderMetrics(null, [plant], null, [], 'main');

    expect(dominant!.weeksLabel).toContain('2');
    expect(dominant!.weeksLabel).toContain('Week');
  });
});

// ---------------------------------------------------------------------------
// Cycle 5 — Irrigation timing chips from IrrigationConfig
// ---------------------------------------------------------------------------

describe('Cycle 5 — irrigation and drain timing chips', () => {
  it('adds an IRRIGATION chip with label "Next" when irrigationTimes is non-empty', () => {
    const config = makeIrrigationConfig({ irrigationTimes: [{ time: '23:59' }] });

    const { chips } = computeHeaderMetrics(null, [], config, [], 'main');

    const chip = chips.find((c) => c.key === MetricKey.IRRIGATION);
    expect(chip).toBeDefined();
    expect(chip!.label).toBe('Next');
    expect(chip!.value).toMatch(/^\d{2}:\d{2}$/);
  });

  it('adds a DRAIN chip with label "Next" when drainTimes is non-empty', () => {
    const config = makeIrrigationConfig({ drainTimes: [{ time: '23:59' }] });

    const { chips } = computeHeaderMetrics(null, [], config, [], 'main');

    const chip = chips.find((c) => c.key === MetricKey.DRAIN);
    expect(chip).toBeDefined();
    expect(chip!.label).toBe('Next');
    expect(chip!.value).toMatch(/^\d{2}:\d{2}$/);
  });

  it('omits the IRRIGATION chip when irrigationTimes is empty', () => {
    const config = makeIrrigationConfig({ irrigationTimes: [] });

    const { chips } = computeHeaderMetrics(null, [], config, [], 'main');

    expect(chips.find((c) => c.key === MetricKey.IRRIGATION)).toBeUndefined();
  });

  it('omits the DRAIN chip when drainTimes is empty', () => {
    const config = makeIrrigationConfig({ drainTimes: [] });

    const { chips } = computeHeaderMetrics(null, [], config, [], 'main');

    expect(chips.find((c) => c.key === MetricKey.DRAIN)).toBeUndefined();
  });

  it('omits both chips when irrigationConfig is null', () => {
    const { chips } = computeHeaderMetrics(null, [], null, [], 'main');

    expect(chips.find((c) => c.key === MetricKey.IRRIGATION)).toBeUndefined();
    expect(chips.find((c) => c.key === MetricKey.DRAIN)).toBeUndefined();
  });

  it('selects the soonest upcoming time when multiple schedule items are given out of order', () => {
    const now = DateTime.now();
    const near = now.plus({ minutes: 30 }).toFormat('HH:mm');
    const far = now.plus({ hours: 3 }).toFormat('HH:mm');
    const config = makeIrrigationConfig({ irrigationTimes: [{ time: far }, { time: near }] });

    const { chips } = computeHeaderMetrics(null, [], config, [], 'main');

    expect(chips.find((c) => c.key === MetricKey.IRRIGATION)!.value).toBe(near);
  });
});

// ---------------------------------------------------------------------------
// Cycle 6 — Tank level chips from IrrigationTank[]
// ---------------------------------------------------------------------------

describe('Cycle 6 — tank level chips', () => {
  it('adds an IRRIGATION_TANK_LEVEL chip for a single tank with fill level', () => {
    const tank = makeTank({ fillLevel: 75 });

    const { chips } = computeHeaderMetrics(null, [], null, [tank], 'main');

    const chip = chips.find((c) => c.key === MetricKey.IRRIGATION_TANK_LEVEL);
    expect(chip).toBeDefined();
    expect(chip!.value).toContain('75');
    expect(chip!.label).toBe('Tank');
  });

  it('shows average percentage for multiple tanks', () => {
    const tanks = [
      makeTank({ sensorEntity: 'sensor.tank_1', fillLevel: 80 }),
      makeTank({ sensorEntity: 'sensor.tank_2', fillLevel: 60 }),
    ];

    const { chips } = computeHeaderMetrics(null, [], null, tanks, 'main');

    const chip = chips.find((c) => c.key === MetricKey.IRRIGATION_TANK_LEVEL);
    expect(chip).toBeDefined();
    expect(chip!.value).toContain('70'); // average of 80 and 60
    expect(chip!.multiValues).toHaveLength(2);
  });

  it('sets tank status to "danger" when hoursRemaining < 12', () => {
    const tank = makeTank({ fillLevel: 10, hoursRemaining: 6, depletionStatus: 'depleting' });

    const { chips } = computeHeaderMetrics(null, [], null, [tank], 'main');

    const chip = chips.find((c) => c.key === MetricKey.IRRIGATION_TANK_LEVEL);
    expect(chip!.status).toBe('danger');
  });

  it('sets tank status to "warning" when 12 <= hoursRemaining < 24', () => {
    const tank = makeTank({ fillLevel: 40, hoursRemaining: 18, depletionStatus: 'depleting' });

    const { chips } = computeHeaderMetrics(null, [], null, [tank], 'main');

    const chip = chips.find((c) => c.key === MetricKey.IRRIGATION_TANK_LEVEL);
    expect(chip!.status).toBe('warning');
  });

  it('sets tank status to "optimal" when hoursRemaining >= 48', () => {
    const tank = makeTank({ fillLevel: 80, hoursRemaining: 72, depletionStatus: 'depleting' });

    const { chips } = computeHeaderMetrics(null, [], null, [tank], 'main');

    const chip = chips.find((c) => c.key === MetricKey.IRRIGATION_TANK_LEVEL);
    expect(chip!.status).toBe('optimal');
  });

  it('omits the tank chip when tankLevels is empty', () => {
    const { chips } = computeHeaderMetrics(null, [], null, [], 'main');

    expect(chips.find((c) => c.key === MetricKey.IRRIGATION_TANK_LEVEL)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Cycle 7 — DLI chip from EnvSnapshot.dli
// ---------------------------------------------------------------------------

describe('Cycle 7 — DLI chip in chips', () => {
  it('adds a DLI chip to chips when envSnapshot.dli is non-null', () => {
    const env = makeEnvSnapshot({ dli: 28.5 });

    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');

    const dliChip = chips.find((c) => c.key === MetricKey.DLI);
    expect(dliChip).toBeDefined();
    expect(dliChip!.value).toContain('28.5');
  });

  it('omits the DLI chip when envSnapshot.dli is null', () => {
    const env = makeEnvSnapshot({ dli: null });

    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');

    expect(chips.find((c) => c.key === MetricKey.DLI)).toBeUndefined();
  });

  it('omits the DLI chip when envSnapshot is null', () => {
    const { chips } = computeHeaderMetrics(null, [], null, [], 'main');

    expect(chips.find((c) => c.key === MetricKey.DLI)).toBeUndefined();
  });

  it('DLI chip is in chips, not in hero', () => {
    const env = makeEnvSnapshot({ dli: 28.5 });

    const { hero, chips } = computeHeaderMetrics(env, [], null, [], 'main');

    expect(hero.find((c) => c.key === MetricKey.DLI)).toBeUndefined();
    expect(chips.find((c) => c.key === MetricKey.DLI)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Cycle 8 — chip.active from activeEnvGraphs
// ---------------------------------------------------------------------------

describe('Cycle 8 — chip.active from activeEnvGraphs', () => {
  it('sets chip.active true for a hero chip when its key is in activeEnvGraphs', () => {
    const env = makeEnvSnapshot({ temperature: 24 });
    const active = new Set([MetricKey.TEMPERATURE]);

    const { hero } = computeHeaderMetrics(env, [], null, [], 'main', active);

    expect(hero.find((c) => c.key === MetricKey.TEMPERATURE)!.active).toBe(true);
  });

  it('sets chip.active false for a hero chip when its key is not in activeEnvGraphs', () => {
    const env = makeEnvSnapshot({ temperature: 24, humidity: 60 });
    const active = new Set([MetricKey.HUMIDITY]);

    const { hero } = computeHeaderMetrics(env, [], null, [], 'main', active);

    expect(hero.find((c) => c.key === MetricKey.TEMPERATURE)!.active).toBe(false);
    expect(hero.find((c) => c.key === MetricKey.HUMIDITY)!.active).toBe(true);
  });

  it('all chips have active false when activeEnvGraphs is empty', () => {
    const env = makeEnvSnapshot({ temperature: 24, dli: 30 });

    const { hero, chips } = computeHeaderMetrics(env, [], null, [], 'main', new Set());

    [...hero, ...chips].forEach((c) => expect(c.active).toBe(false));
  });

  it('sets chip.active true for a chips-level chip when its key is in activeEnvGraphs', () => {
    const env = makeEnvSnapshot({ dli: 28 });
    const active = new Set([MetricKey.DLI]);

    const { chips } = computeHeaderMetrics(env, [], null, [], 'main', active);

    expect(chips.find((c) => c.key === MetricKey.DLI)!.active).toBe(true);
  });

  it('marks chip as linked with correct groupIndex when key appears in linkedGraphGroups', () => {
    const env = makeEnvSnapshot({ temperature: 24, humidity: 60 });

    const { hero } = computeHeaderMetrics(
      env, [], null, [], 'main',
      new Set(),
      [[MetricKey.TEMPERATURE, MetricKey.HUMIDITY]],
    );

    const tempChip = hero.find((c) => c.key === MetricKey.TEMPERATURE)!;
    expect(tempChip.linked).toBe(true);
    expect(tempChip.groupIndex).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Cycle 9 — viewContext filter
// ---------------------------------------------------------------------------

describe('Cycle 9 — viewContext filter', () => {
  it('returns empty hero for "analytics" viewContext', () => {
    const env = makeEnvSnapshot({ temperature: 24, humidity: 60, vpd: 1.1, co2: 800 });

    const { hero } = computeHeaderMetrics(env, [], null, [], 'analytics');

    expect(hero).toHaveLength(0);
  });

  it('returns populated hero for "main" viewContext', () => {
    const env = makeEnvSnapshot({ temperature: 24 });

    const { hero } = computeHeaderMetrics(env, [], null, [], 'main');

    expect(hero.length).toBeGreaterThan(0);
  });

  it('returns populated hero for "subarea" viewContext', () => {
    const env = makeEnvSnapshot({ temperature: 24 });

    const { hero } = computeHeaderMetrics(env, [], null, [], 'subarea');

    expect(hero.length).toBeGreaterThan(0);
  });

  it('still returns chips for "analytics" viewContext', () => {
    const env = makeEnvSnapshot({ dli: 28 });

    const { chips } = computeHeaderMetrics(env, [], null, [], 'analytics');

    expect(chips.find((c) => c.key === MetricKey.DLI)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Cycle 10 — optimal conditions chip
// ---------------------------------------------------------------------------

describe('Cycle 10 — optimal conditions chip', () => {
  it('returns an optimal chip with status "optimal" when conditions are met', () => {
    const env = makeEnvSnapshot({ optimalConditions: { isOptimal: true, reasons: [] } });

    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');

    const chip = chips.find((c) => c.key === MetricKey.OPTIMAL);
    expect(chip).toBeDefined();
    expect(chip!.value).toBe('Optimal Conditions');
    expect(chip!.status).toBe('optimal');
  });

  it('returns an optimal chip with status "warning" and reason when conditions are not met', () => {
    const env = makeEnvSnapshot({
      optimalConditions: { isOptimal: false, reasons: ['Temperature too high'] },
    });

    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');

    const chip = chips.find((c) => c.key === MetricKey.OPTIMAL);
    expect(chip).toBeDefined();
    expect(chip!.value).toBe('Not Optimal: Temperature too high');
    expect(chip!.status).toBe('warning');
  });

  it('returns "Not Optimal" label without reason list when reasons is empty', () => {
    const env = makeEnvSnapshot({ optimalConditions: { isOptimal: false, reasons: [] } });

    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');

    const chip = chips.find((c) => c.key === MetricKey.OPTIMAL);
    expect(chip!.value).toBe('Not Optimal');
  });

  it('omits the optimal chip when optimalConditions is null', () => {
    const env = makeEnvSnapshot({ optimalConditions: null });

    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');

    expect(chips.find((c) => c.key === MetricKey.OPTIMAL)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Cycle N — substrate / medium sensor chips
// ---------------------------------------------------------------------------

describe('Cycle N — soil moisture chip', () => {
  it('omits the soil moisture chip when soilMoisture is null', () => {
    const env = makeEnvSnapshot({ soilMoisture: null });
    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');
    expect(chips.find((c) => c.key === MetricKey.SOIL_MOISTURE)).toBeUndefined();
  });

  it('omits the soil moisture chip when all sensors are unavailable', () => {
    const env = makeEnvSnapshot({
      soilMoisture: { avg: null, sum: null, perSensor: [null], entityIds: ['sensor.sm_1'] },
    });
    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');
    expect(chips.find((c) => c.key === MetricKey.SOIL_MOISTURE)).toBeUndefined();
  });

  it('emits a soil moisture chip with formatted value for a single sensor', () => {
    const env = makeEnvSnapshot({
      soilMoisture: { avg: 42.5, sum: 42.5, perSensor: [42.5], entityIds: ['sensor.sm_1'] },
    });
    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');
    const chip = chips.find((c) => c.key === MetricKey.SOIL_MOISTURE);
    expect(chip).toBeDefined();
    expect(chip!.value).toBe('42.5%');
    expect(chip!.label).toBe('Moisture');
  });

  it('emits "Multiple" with per-sensor values when more than one sensor is configured', () => {
    const env = makeEnvSnapshot({
      soilMoisture: {
        avg: 50,
        sum: 100,
        perSensor: [40, 60],
        entityIds: ['sensor.sm_1', 'sensor.sm_2'],
      },
    });
    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');
    const chip = chips.find((c) => c.key === MetricKey.SOIL_MOISTURE);
    expect(chip).toBeDefined();
    expect(chip!.value).toBe('Multiple');
    expect(chip!.multiValues).toEqual(['40.0%', '60.0%']);
    expect(chip!.entityIds).toEqual(['sensor.sm_1', 'sensor.sm_2']);
  });

  it('sets label to "VWC" for a single sensor when crop steering is enabled', () => {
    const env = makeEnvSnapshot({
      soilMoisture: { avg: 42.5, sum: 42.5, perSensor: [42.5], entityIds: ['sensor.sm_1'] },
    });
    const strategy = makeIrrigationStrategy({ enabled: true });
    const { chips } = computeHeaderMetrics(env, [], null, [], 'main', new Set(), [], strategy);
    const chip = chips.find((c) => c.key === MetricKey.SOIL_MOISTURE);
    expect(chip).toBeDefined();
    expect(chip!.label).toBe('VWC');
  });

  it('sets label to "VWC" for multiple sensors when crop steering is enabled', () => {
    const env = makeEnvSnapshot({
      soilMoisture: {
        avg: 50,
        sum: 100,
        perSensor: [40, 60],
        entityIds: ['sensor.sm_1', 'sensor.sm_2'],
      },
    });
    const strategy = makeIrrigationStrategy({ enabled: true });
    const { chips } = computeHeaderMetrics(env, [], null, [], 'main', new Set(), [], strategy);
    const chip = chips.find((c) => c.key === MetricKey.SOIL_MOISTURE);
    expect(chip).toBeDefined();
    expect(chip!.label).toBe('VWC');
  });

  it('sets label to "Moisture" when crop steering is disabled', () => {
    const env = makeEnvSnapshot({
      soilMoisture: { avg: 42.5, sum: 42.5, perSensor: [42.5], entityIds: ['sensor.sm_1'] },
    });
    const strategy = makeIrrigationStrategy({ enabled: false });
    const { chips } = computeHeaderMetrics(env, [], null, [], 'main', new Set(), [], strategy);
    const chip = chips.find((c) => c.key === MetricKey.SOIL_MOISTURE);
    expect(chip).toBeDefined();
    expect(chip!.label).toBe('Moisture');
  });
});

describe('Cycle N — substrate temperature chip', () => {
  it('omits the substrate temperature chip when substrateTemperature is null', () => {
    const env = makeEnvSnapshot({ substrateTemperature: null });
    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');
    expect(chips.find((c) => c.key === MetricKey.SUBSTRATE_TEMPERATURE)).toBeUndefined();
  });

  it('emits a substrate temperature chip with formatted value', () => {
    const env = makeEnvSnapshot({
      substrateTemperature: { avg: 20.5, sum: 20.5, perSensor: [20.5], entityIds: ['sensor.st_1'] },
    });
    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');
    const chip = chips.find((c) => c.key === MetricKey.SUBSTRATE_TEMPERATURE);
    expect(chip).toBeDefined();
    expect(chip!.value).toBe('20.5°C');
    expect(chip!.label).toBe('Sub Temp');
  });
});

// ---------------------------------------------------------------------------
// Cycle N — irrigation monitoring sensor chips
// ---------------------------------------------------------------------------

describe('Cycle N — irrigation monitoring chips', () => {
  it('omits all irrigation monitoring chips when snapshot has no sensor data', () => {
    const env = makeEnvSnapshot();
    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');
    expect(chips.find((c) => c.key === MetricKey.PH)).toBeUndefined();
    expect(chips.find((c) => c.key === MetricKey.FEED_EC)).toBeUndefined();
    expect(chips.find((c) => c.key === MetricKey.BULK_EC)).toBeUndefined();
    expect(chips.find((c) => c.key === MetricKey.PORE_EC)).toBeUndefined();
    expect(chips.find((c) => c.key === MetricKey.RUNOFF_EC)).toBeUndefined();
    expect(chips.find((c) => c.key === MetricKey.DRAIN_VOLUME)).toBeUndefined();
    expect(chips.find((c) => c.key === MetricKey.IRRIGATION_FLOW)).toBeUndefined();
    expect(chips.find((c) => c.key === MetricKey.POWER)).toBeUndefined();
    expect(chips.find((c) => c.key === MetricKey.ENERGY)).toBeUndefined();
  });

  it('emits ph chip with formatted value', () => {
    const env = makeEnvSnapshot({
      ph: { avg: 6.2, sum: 6.2, perSensor: [6.2], entityIds: ['sensor.ph_1'] },
    });
    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');
    const chip = chips.find((c) => c.key === MetricKey.PH);
    expect(chip).toBeDefined();
    expect(chip!.value).toBe('6.2');
    expect(chip!.label).toBe('pH');
  });

  it('emits feed EC chip with unit', () => {
    const env = makeEnvSnapshot({
      feedEc: { avg: 2.1, sum: 2.1, perSensor: [2.1], entityIds: ['sensor.ec_1'] },
    });
    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');
    const chip = chips.find((c) => c.key === MetricKey.FEED_EC);
    expect(chip!.value).toBe('2.1 mS/cm');
    expect(chip!.label).toBe('Feed EC');
  });

  it('emits bulk EC chip with unit and correct label', () => {
    const env = makeEnvSnapshot({
      bulkEc: { avg: 1.8, sum: 1.8, perSensor: [1.8], entityIds: ['sensor.bulk_ec_1'] },
    });
    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');
    const chip = chips.find((c) => c.key === MetricKey.BULK_EC);
    expect(chip).toBeDefined();
    expect(chip!.value).toBe('1.8 mS/cm');
    expect(chip!.label).toBe('Bulk EC');
  });

  it('emits pore EC chip with unit and correct label', () => {
    const env = makeEnvSnapshot({
      poreEc: { avg: 2.0, sum: 2.0, perSensor: [2.0], entityIds: ['sensor.pore_ec_1'] },
    });
    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');
    const chip = chips.find((c) => c.key === MetricKey.PORE_EC);
    expect(chip).toBeDefined();
    expect(chip!.value).toBe('2.0 mS/cm');
    expect(chip!.label).toBe('Pore EC');
  });

  it('orders bulk EC before pore EC, pore EC before runoff EC', () => {
    const env = makeEnvSnapshot({
      feedEc: { avg: 2.1, sum: 2.1, perSensor: [2.1], entityIds: ['sensor.feed_ec_1'] },
      bulkEc: { avg: 1.8, sum: 1.8, perSensor: [1.8], entityIds: ['sensor.bulk_ec_1'] },
      poreEc: { avg: 2.0, sum: 2.0, perSensor: [2.0], entityIds: ['sensor.pore_ec_1'] },
      runoffEc: { avg: 2.4, sum: 2.4, perSensor: [2.4], entityIds: ['sensor.runoff_ec_1'] },
    });
    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');
    const keys = chips.map((c) => c.key);
    const feedIdx = keys.indexOf(MetricKey.FEED_EC);
    const bulkIdx = keys.indexOf(MetricKey.BULK_EC);
    const poreIdx = keys.indexOf(MetricKey.PORE_EC);
    const runoffIdx = keys.indexOf(MetricKey.RUNOFF_EC);
    expect(feedIdx).toBeLessThan(bulkIdx);
    expect(bulkIdx).toBeLessThan(poreIdx);
    expect(poreIdx).toBeLessThan(runoffIdx);
  });

  it('emits power chip with W unit', () => {
    const env = makeEnvSnapshot({
      power: { avg: 450, sum: 450, perSensor: [450], entityIds: ['sensor.pwr_1'] },
    });
    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');
    const chip = chips.find((c) => c.key === MetricKey.POWER);
    expect(chip!.value).toBe('450.0 W');
  });

  it('emits summed power value (not "Multiple") when two power sensors are configured', () => {
    const env = makeEnvSnapshot({
      power: { avg: 325, sum: 650, perSensor: [300, 350], entityIds: ['sensor.pwr_1', 'sensor.pwr_2'] },
    });
    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');
    const chip = chips.find((c) => c.key === MetricKey.POWER);
    expect(chip!.value).toBe('650.0 W');
    expect(chip!.multiValues).toBeUndefined();
    expect(chip!.entityIds).toEqual(['sensor.pwr_1', 'sensor.pwr_2']);
  });

  it('emits summed energy value (not "Multiple") when two energy sensors are configured', () => {
    const env = makeEnvSnapshot({
      energy: { avg: 4.5, sum: 9.0, perSensor: [4.0, 5.0], entityIds: ['sensor.energy_1', 'sensor.energy_2'] },
    });
    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');
    const chip = chips.find((c) => c.key === MetricKey.ENERGY);
    expect(chip!.value).toBe('9.0 kWh');
    expect(chip!.multiValues).toBeUndefined();
    expect(chip!.entityIds).toEqual(['sensor.energy_1', 'sensor.energy_2']);
  });

  it('emits "Multiple" for runoff EC with two sensors', () => {
    const env = makeEnvSnapshot({
      runoffEc: {
        avg: 2.25,
        sum: 4.5,
        perSensor: [2.1, 2.4],
        entityIds: ['sensor.runoff_1', 'sensor.runoff_2'],
      },
    });
    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');
    const chip = chips.find((c) => c.key === MetricKey.RUNOFF_EC);
    expect(chip!.value).toBe('Multiple');
    expect(chip!.multiValues).toEqual(['2.1 mS/cm', '2.4 mS/cm']);
  });
});

// ---------------------------------------------------------------------------
// Cycle 11 — Crop steering phase chip
// ---------------------------------------------------------------------------

describe('Cycle 11 — crop steering phase chip', () => {
  // Strategy: lightsOnTime 06:00, p2StopBeforeLightsOffMinutes 120, targetVwcPercent 80
  // Veg photoperiod = 18h → lights-off 00:00, P3 start = 22:00
  // Flower photoperiod = 12h → lights-off 18:00, P3 start = 16:00

  it('shows P1 chip with VWC target when crop steering is enabled and phase is p1', () => {
    const config = makeIrrigationConfig({
      irrigationTimes: [{ time: '08:00' }],
      activeSteeringPhase: 'p1',
    });
    const strategy = makeIrrigationStrategy({ enabled: true, targetVwcPercent: 75 });

    const { hero, chips } = computeHeaderMetrics(
      null,
      [],
      config,
      [],
      'main',
      new Set(),
      [],
      strategy
    );

    const chip = hero.find((c) => c.key === MetricKey.STEERING_PHASE);
    expect(chip).toBeDefined();
    expect(chip!.label).toBe('Phase');
    expect(chip!.value).toBe('P1 · 75%');
    expect(chips.find((c) => c.key === MetricKey.STEERING_PHASE)).toBeUndefined();
  });

  it('shows P2 chip with P3-start time (non-flower / 18h photoperiod) when phase is p2', () => {
    const config = makeIrrigationConfig({ activeSteeringPhase: 'p2' });
    // No flower plants → isFlower = false → 18h photoperiod
    // Lights-on 06:00, 18h → lights-off 00:00 next day (1440 min), p2Stop 120 → P3 at 22:00
    const strategy = makeIrrigationStrategy({
      enabled: true,
      lightsOnTime: '06:00',
      p2StopBeforeLightsOffMinutes: 120,
    });

    const { hero } = computeHeaderMetrics(null, [], config, [], 'main', new Set(), [], strategy);

    const chip = hero.find((c) => c.key === MetricKey.STEERING_PHASE);
    expect(chip).toBeDefined();
    expect(chip!.label).toBe('Phase');
    expect(chip!.value).toBe('P2 · 22:00');
  });

  it('shows P2 chip with P3-start time (flower, 12h photoperiod) when phase is p2', () => {
    const config = makeIrrigationConfig({ activeSteeringPhase: 'p2' });
    // Lights-on 06:00, 12h photoperiod → lights-off 18:00, p2Stop 120min → P3 at 16:00
    const strategy = makeIrrigationStrategy({
      enabled: true,
      lightsOnTime: '06:00',
      p2StopBeforeLightsOffMinutes: 120,
    });
    const flowerPlant = makePlantEntity({ stage: 'flower' });

    const { hero } = computeHeaderMetrics(
      null,
      [flowerPlant],
      config,
      [],
      'main',
      new Set(),
      [],
      strategy
    );

    const chip = hero.find((c) => c.key === MetricKey.STEERING_PHASE);
    expect(chip).toBeDefined();
    expect(chip!.label).toBe('Phase');
    expect(chip!.value).toBe('P2 · 16:00');
  });

  it('shows P3 chip with lights-on time when phase is p3', () => {
    const config = makeIrrigationConfig({ activeSteeringPhase: 'p3' });
    const strategy = makeIrrigationStrategy({ enabled: true, lightsOnTime: '07:30' });

    const { hero } = computeHeaderMetrics(null, [], config, [], 'main', new Set(), [], strategy);

    const chip = hero.find((c) => c.key === MetricKey.STEERING_PHASE);
    expect(chip).toBeDefined();
    expect(chip!.label).toBe('Phase');
    expect(chip!.value).toBe('P3 · 07:30');
  });

  it('omits the STEERING_PHASE chip when crop steering is enabled but activeSteeringPhase is not set', () => {
    const config = makeIrrigationConfig({
      irrigationTimes: [{ time: '08:00' }],
      activeSteeringPhase: undefined,
    });
    const strategy = makeIrrigationStrategy({ enabled: true });

    const { hero, chips } = computeHeaderMetrics(
      null,
      [],
      config,
      [],
      'main',
      new Set(),
      [],
      strategy
    );

    expect(hero.find((c) => c.key === MetricKey.STEERING_PHASE)).toBeUndefined();
    expect(chips.find((c) => c.key === MetricKey.STEERING_PHASE)).toBeUndefined();
  });

  it('keeps the STEERING_PHASE chip in the secondary strip for the analytics view (no hero exists there)', () => {
    const config = makeIrrigationConfig({ activeSteeringPhase: 'p1' });
    const strategy = makeIrrigationStrategy({ enabled: true, targetVwcPercent: 75 });

    const { hero, chips } = computeHeaderMetrics(
      null,
      [],
      config,
      [],
      'analytics',
      new Set(),
      [],
      strategy
    );

    expect(hero.find((c) => c.key === MetricKey.STEERING_PHASE)).toBeUndefined();
    const chip = chips.find((c) => c.key === MetricKey.STEERING_PHASE);
    expect(chip).toBeDefined();
    expect(chip!.value).toBe('P1 · 75%');
  });

  it('falls back to manual schedule chip when strategy.enabled is false', () => {
    const config = makeIrrigationConfig({
      irrigationTimes: [{ time: '23:59' }],
      activeSteeringPhase: 'p2',
    });
    const strategy = makeIrrigationStrategy({ enabled: false });

    const { chips } = computeHeaderMetrics(null, [], config, [], 'main', new Set(), [], strategy);

    const chip = chips.find((c) => c.key === MetricKey.IRRIGATION);
    expect(chip).toBeDefined();
    expect(chip!.label).toBe('Next');
    expect(chip!.value).toMatch(/^\d{2}:\d{2}$/);
  });

  it('drain chip is always present regardless of irrigation mode', () => {
    const config = makeIrrigationConfig({
      drainTimes: [{ time: '23:59' }],
      activeSteeringPhase: 'p1',
    });
    const strategy = makeIrrigationStrategy({ enabled: true });

    const { chips } = computeHeaderMetrics(null, [], config, [], 'main', new Set(), [], strategy);

    const drainChip = chips.find((c) => c.key === MetricKey.DRAIN);
    expect(drainChip).toBeDefined();
    expect(drainChip!.label).toBe('Next');
  });
});

// ---------------------------------------------------------------------------
// Cycle 11 — hero chips from per-sensor readings (subarea snapshots, ADR-0018)
// ---------------------------------------------------------------------------

function makeReadings(values: (number | null)[], entityIds?: string[]): SensorReadings {
  const ids = entityIds ?? values.map((_, i) => `sensor.s${i + 1}`);
  const defined = values.filter((v): v is number => v !== null);
  const sum = defined.length > 0 ? defined.reduce((a, b) => a + b, 0) : null;
  return { avg: sum !== null ? sum / defined.length : null, sum, perSensor: values, entityIds: ids };
}

describe('Cycle 11 — hero chips from per-sensor readings', () => {
  it('renders a single-sensor reading with legacy formatting, label, and entityIds', () => {
    const env = makeEnvSnapshot({
      temperature: 23,
      temperatureReadings: makeReadings([23], ['sensor.veg_temp']),
    });

    const { hero } = computeHeaderMetrics(env, [], null, [], 'subarea');

    expect(hero).toHaveLength(1);
    expect(hero[0].key).toBe(MetricKey.TEMPERATURE);
    expect(hero[0].value).toBe('23.0 °C');
    expect(hero[0].label).toBe('Temperature');
    expect(hero[0].entityIds).toEqual(['sensor.veg_temp']);
  });

  it('prefers readings over the scalar when both are present', () => {
    const env = makeEnvSnapshot({
      humidity: 99,
      humidityReadings: makeReadings([52], ['sensor.h']),
    });

    const { hero } = computeHeaderMetrics(env, [], null, [], 'subarea');

    expect(hero[0].value).toBe('52.0 %');
  });

  it('renders "Multiple" with per-sensor formatted values for multi-sensor readings', () => {
    const env = makeEnvSnapshot({
      temperatureReadings: makeReadings([22, 24], ['sensor.t1', 'sensor.t2']),
    });

    const { hero } = computeHeaderMetrics(env, [], null, [], 'subarea');

    expect(hero[0].value).toBe('Multiple');
    expect(hero[0].multiValues).toEqual(['22.0 °C', '24.0 °C']);
    expect(hero[0].entityIds).toEqual(['sensor.t1', 'sensor.t2']);
  });

  it('marks unavailable sensors with "-" inside multiValues', () => {
    const env = makeEnvSnapshot({
      humidityReadings: makeReadings([50, null], ['sensor.h1', 'sensor.h2']),
    });

    const { hero } = computeHeaderMetrics(env, [], null, [], 'subarea');

    expect(hero[0].multiValues).toEqual(['50.0 %', '-']);
  });

  it('drops the chip when the only configured sensor is unavailable', () => {
    const env = makeEnvSnapshot({
      temperatureReadings: makeReadings([null], ['sensor.dead']),
    });

    const { hero } = computeHeaderMetrics(env, [], null, [], 'subarea');

    expect(hero).toHaveLength(0);
  });

  it('renders VPD and CO2 readings with their legacy units and no VPD status when null', () => {
    const env = makeEnvSnapshot({
      vpdReadings: makeReadings([1.2], ['sensor.vpd']),
      co2Readings: makeReadings([800], ['sensor.co2']),
    });

    const { hero } = computeHeaderMetrics(env, [], null, [], 'subarea');

    expect(hero.map((c) => c.value)).toEqual(['1.2 kPa', '800.0 ppm']);
    expect(hero[0].status).toBeUndefined();
    expect(hero.map((c) => c.label)).toEqual(['VPD', 'CO2']);
  });

  it('marks a readings-based hero chip active when its key is in activeEnvGraphs', () => {
    const env = makeEnvSnapshot({
      temperatureReadings: makeReadings([23], ['sensor.t']),
    });

    const { hero } = computeHeaderMetrics(
      env,
      [],
      null,
      [],
      'subarea',
      new Set([MetricKey.TEMPERATURE])
    );

    expect(hero[0].active).toBe(true);
  });

  it('keeps the growspace scalar hero path unchanged when readings are null', () => {
    const env = makeEnvSnapshot({ temperature: 24.5, humidity: 58 });

    const { hero } = computeHeaderMetrics(env, [], null, [], 'main');

    expect(hero.map((c) => c.value)).toEqual(['24.5°C', '58%']);
    expect(hero[0].label).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Cycle 12 — device chips from DeviceSnapshot
// (restored — these cases from #265 were lost in the #266 merge)
// ---------------------------------------------------------------------------

describe('Cycle 12 — device chips from DeviceSnapshot', () => {
  it('returns empty deviceChips when deviceSnapshot is omitted (trailing optional default)', () => {
    const result = computeHeaderMetrics(makeEnvSnapshot(), [], null, [], 'main');

    expect(result.deviceChips).toEqual([]);
  });

  it('returns empty deviceChips when deviceSnapshot is null', () => {
    const result = computeHeaderMetrics(
      makeEnvSnapshot(),
      [],
      null,
      [],
      'main',
      new Set(),
      [],
      null,
      null
    );

    expect(result.deviceChips).toEqual([]);
  });

  it('builds a chip from a single-entity category with the legacy MetricKey and label', () => {
    const snapshot = makeDeviceSnapshot({
      exhaustFans: makeDeviceEntry({ entityIds: ['switch.tent_1_exhaust'], value: 'On' }),
    });

    const { deviceChips } = computeHeaderMetrics(
      null,
      [],
      null,
      [],
      'main',
      new Set(),
      [],
      null,
      snapshot
    );

    expect(deviceChips).toHaveLength(1);
    const chip = deviceChips[0];
    expect(chip.key).toBe(MetricKey.EXHAUST);
    expect(chip.label).toBe('Exhaust');
    expect(chip.value).toBe('On');
    expect(chip.icon).toBe(mdiFan);
    expect(chip.entityIds).toEqual(['switch.tent_1_exhaust']);
    expect(chip.multiValues).toBeUndefined();
  });

  it('passes "Multiple" and multiValues through for a multi-entity category', () => {
    const snapshot = makeDeviceSnapshot({
      humidifiers: makeDeviceEntry({
        entityIds: ['switch.hum_1', 'switch.hum_2'],
        value: 'Multiple',
        multiValues: ['On', 'Off'],
      }),
    });

    const { deviceChips } = computeHeaderMetrics(
      null,
      [],
      null,
      [],
      'main',
      new Set(),
      [],
      null,
      snapshot
    );

    const chip = deviceChips.find((c) => c.key === MetricKey.HUMIDIFIER);
    expect(chip).toBeDefined();
    expect(chip!.label).toBe('Humidifier');
    expect(chip!.value).toBe('Multiple');
    expect(chip!.multiValues).toEqual(['On', 'Off']);
    expect(chip!.entityIds).toEqual(['switch.hum_1', 'switch.hum_2']);
  });

  it('omits chips for unconfigured (null) categories', () => {
    const snapshot = makeDeviceSnapshot({
      dehumidifiers: makeDeviceEntry({ value: 'Off' }),
    });

    const { deviceChips } = computeHeaderMetrics(
      null,
      [],
      null,
      [],
      'main',
      new Set(),
      [],
      null,
      snapshot
    );

    const keys = deviceChips.map((c) => c.key);
    expect(keys).toEqual([MetricKey.DEHUMIDIFIER]);
    const chip = deviceChips[0];
    expect(chip.label).toBe('Dehumidifier');
    expect(chip.value).toBe('Off');
  });

  it('passes a fan percentage value through unchanged with the "Fan" label', () => {
    const snapshot = makeDeviceSnapshot({
      circulationFans: makeDeviceEntry({ entityIds: ['fan.tent_1_circ'], value: '70%' }),
    });

    const { deviceChips } = computeHeaderMetrics(
      null,
      [],
      null,
      [],
      'main',
      new Set(),
      [],
      null,
      snapshot
    );

    const chip = deviceChips.find((c) => c.key === MetricKey.CIRCULATION_FAN);
    expect(chip).toBeDefined();
    expect(chip!.label).toBe('Fan');
    expect(chip!.value).toBe('70%');
  });

  it('keeps the chip with a "-" placeholder when a configured entity is unavailable', () => {
    const snapshot = makeDeviceSnapshot({
      exhaustFans: makeDeviceEntry({ value: undefined }),
    });

    const { deviceChips } = computeHeaderMetrics(
      null,
      [],
      null,
      [],
      'main',
      new Set(),
      [],
      null,
      snapshot
    );

    expect(deviceChips.find((c) => c.key === MetricKey.EXHAUST)!.value).toBe('-');
  });

  it('emits device chips in the legacy order: light, exhaust, circulation fan, humidifier, dehumidifier', () => {
    const snapshot = makeDeviceSnapshot({
      lightSensors: makeDeviceEntry({ entityIds: ['sensor.light'], value: '70%' }),
      exhaustFans: makeDeviceEntry(),
      circulationFans: makeDeviceEntry(),
      humidifiers: makeDeviceEntry(),
      dehumidifiers: makeDeviceEntry(),
    });

    const { deviceChips } = computeHeaderMetrics(
      null,
      [],
      null,
      [],
      'main',
      new Set(),
      [],
      null,
      snapshot
    );

    expect(deviceChips.map((c) => c.key)).toEqual([
      MetricKey.LIGHT,
      MetricKey.EXHAUST,
      MetricKey.CIRCULATION_FAN,
      MetricKey.HUMIDIFIER,
      MetricKey.DEHUMIDIFIER,
    ]);
  });

  it('sets active true for a device chip whose key is in activeEnvGraphs', () => {
    const snapshot = makeDeviceSnapshot({
      exhaustFans: makeDeviceEntry(),
      humidifiers: makeDeviceEntry(),
    });

    const { deviceChips } = computeHeaderMetrics(
      null,
      [],
      null,
      [],
      'main',
      new Set([MetricKey.EXHAUST]),
      [],
      null,
      snapshot
    );

    expect(deviceChips.find((c) => c.key === MetricKey.EXHAUST)!.active).toBe(true);
    expect(deviceChips.find((c) => c.key === MetricKey.HUMIDIFIER)!.active).toBe(false);
  });

  it('marks a device chip as linked with the correct groupIndex from linkedGraphGroups', () => {
    const snapshot = makeDeviceSnapshot({
      exhaustFans: makeDeviceEntry(),
      circulationFans: makeDeviceEntry(),
    });

    const { deviceChips } = computeHeaderMetrics(
      null,
      [],
      null,
      [],
      'main',
      new Set(),
      [[MetricKey.TEMPERATURE], [MetricKey.EXHAUST, MetricKey.HUMIDITY]],
      null,
      snapshot
    );

    const exhaust = deviceChips.find((c) => c.key === MetricKey.EXHAUST)!;
    expect(exhaust.linked).toBe(true);
    expect(exhaust.groupIndex).toBe(1);

    const circulation = deviceChips.find((c) => c.key === MetricKey.CIRCULATION_FAN)!;
    expect(circulation.linked).toBe(false);
    expect(circulation.groupIndex).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// Cycle 13 — light chip icon/value (legacy MetricsUtils display parity)
// (restored — these cases from #265 were lost in the #266 merge)
// ---------------------------------------------------------------------------

describe('Cycle 13 — light chip icon and value', () => {
  it('shows a single numeric reading with the lit bulb icon when the value is positive', () => {
    const snapshot = makeDeviceSnapshot({
      lightSensors: makeDeviceEntry({ entityIds: ['sensor.tent_1_light'], value: '70%' }),
    });

    const { deviceChips } = computeHeaderMetrics(
      null,
      [],
      null,
      [],
      'main',
      new Set(),
      [],
      null,
      snapshot
    );

    const chip = deviceChips.find((c) => c.key === MetricKey.LIGHT)!;
    expect(chip.value).toBe('70%');
    expect(chip.icon).toBe(mdiLightbulbOn);
  });

  it('shows the off bulb icon when the single numeric reading is zero', () => {
    const snapshot = makeDeviceSnapshot({
      lightSensors: makeDeviceEntry({ entityIds: ['sensor.tent_1_light'], value: '0%' }),
    });

    const { deviceChips } = computeHeaderMetrics(
      null,
      [],
      null,
      [],
      'main',
      new Set(),
      [],
      null,
      snapshot
    );

    const chip = deviceChips.find((c) => c.key === MetricKey.LIGHT)!;
    expect(chip.value).toBe('0%');
    expect(chip.icon).toBe(mdiLightbulbOff);
  });

  it('falls back to envSnapshot.isLightsOn for the value when the reading is not numeric', () => {
    const env = makeEnvSnapshot({ isLightsOn: true, hasLightSensor: true });
    const snapshot = makeDeviceSnapshot({
      lightSensors: makeDeviceEntry({ entityIds: ['binary_sensor.tent_1_light'], value: 'On' }),
    });

    const { deviceChips } = computeHeaderMetrics(
      env,
      [],
      null,
      [],
      'main',
      new Set(),
      [],
      null,
      snapshot
    );

    const chip = deviceChips.find((c) => c.key === MetricKey.LIGHT)!;
    expect(chip.value).toBe('On');
    expect(chip.icon).toBe(mdiLightbulbOn);
  });

  it('shows the light chip from isLightsOn alone when no light entities are configured', () => {
    const env = makeEnvSnapshot({ isLightsOn: false, hasLightSensor: true });

    const { deviceChips } = computeHeaderMetrics(
      env,
      [],
      null,
      [],
      'main',
      new Set(),
      [],
      null,
      makeDeviceSnapshot()
    );

    const chip = deviceChips.find((c) => c.key === MetricKey.LIGHT)!;
    expect(chip.value).toBe('Off');
    expect(chip.icon).toBe(mdiLightbulbOff);
    expect(chip.entityIds).toEqual([]);
  });

  it('omits the light chip when there is no light sensor flag and no light entities', () => {
    const { deviceChips } = computeHeaderMetrics(
      makeEnvSnapshot(),
      [],
      null,
      [],
      'main',
      new Set(),
      [],
      null,
      makeDeviceSnapshot()
    );

    expect(deviceChips.find((c) => c.key === MetricKey.LIGHT)).toBeUndefined();
  });

  it('carries multiValues for multiple light sensors with the isLightsOn fallback value', () => {
    const env = makeEnvSnapshot({ isLightsOn: true, hasLightSensor: true });
    const snapshot = makeDeviceSnapshot({
      lightSensors: makeDeviceEntry({
        entityIds: ['sensor.light_1', 'sensor.light_2'],
        value: 'Multiple',
        multiValues: ['70%', '0%'],
      }),
    });

    const { deviceChips } = computeHeaderMetrics(
      env,
      [],
      null,
      [],
      'main',
      new Set(),
      [],
      null,
      snapshot
    );

    const chip = deviceChips.find((c) => c.key === MetricKey.LIGHT)!;
    expect(chip.value).toBe('On');
    expect(chip.multiValues).toEqual(['70%', '0%']);
    expect(chip.entityIds).toEqual(['sensor.light_1', 'sensor.light_2']);
  });
});

// ---------------------------------------------------------------------------
// Cycle 14 — subarea device chips (legacy computeSubareaMetrics display parity)
// ---------------------------------------------------------------------------

describe('Cycle 14 — subarea device chips', () => {
  it('labels the light chip "Lights" and shows the entry value when isLightsOn is absent', () => {
    const snapshot = makeDeviceSnapshot({
      lightSensors: makeDeviceEntry({ entityIds: ['light.veg_light'], value: 'On' }),
    });

    const { deviceChips } = computeHeaderMetrics(
      makeEnvSnapshot(),
      [],
      null,
      [],
      'subarea',
      new Set(),
      [],
      null,
      snapshot
    );

    const chip = deviceChips.find((c) => c.key === MetricKey.LIGHT)!;
    expect(chip.label).toBe('Lights');
    expect(chip.value).toBe('On');
    expect(chip.icon).toBe(mdiLightbulbOn);
  });

  it('omits the light chip in the main context for the same snapshot (no isLightsOn flag)', () => {
    const snapshot = makeDeviceSnapshot({
      lightSensors: makeDeviceEntry({ entityIds: ['light.veg_light'], value: 'On' }),
    });

    const { deviceChips } = computeHeaderMetrics(
      makeEnvSnapshot(),
      [],
      null,
      [],
      'main',
      new Set(),
      [],
      null,
      snapshot
    );

    expect(deviceChips.find((c) => c.key === MetricKey.LIGHT)).toBeUndefined();
  });

  it('drives the bulb icon from a single numeric light reading in the subarea context', () => {
    const lit = makeDeviceSnapshot({
      lightSensors: makeDeviceEntry({ entityIds: ['sensor.light'], value: '70%' }),
    });
    const dark = makeDeviceSnapshot({
      lightSensors: makeDeviceEntry({ entityIds: ['sensor.light'], value: '0%' }),
    });

    const litChip = computeHeaderMetrics(
      makeEnvSnapshot(),
      [],
      null,
      [],
      'subarea',
      new Set(),
      [],
      null,
      lit
    ).deviceChips.find((c) => c.key === MetricKey.LIGHT)!;
    const darkChip = computeHeaderMetrics(
      makeEnvSnapshot(),
      [],
      null,
      [],
      'subarea',
      new Set(),
      [],
      null,
      dark
    ).deviceChips.find((c) => c.key === MetricKey.LIGHT)!;

    expect(litChip.value).toBe('70%');
    expect(litChip.icon).toBe(mdiLightbulbOn);
    expect(darkChip.value).toBe('0%');
    expect(darkChip.icon).toBe(mdiLightbulbOff);
  });

  it('shows "Multiple" with multiValues for multiple light sensors in the subarea context', () => {
    const snapshot = makeDeviceSnapshot({
      lightSensors: makeDeviceEntry({
        entityIds: ['sensor.light_1', 'sensor.light_2'],
        value: 'Multiple',
        multiValues: ['70%', 'On'],
      }),
    });

    const { deviceChips } = computeHeaderMetrics(
      makeEnvSnapshot(),
      [],
      null,
      [],
      'subarea',
      new Set(),
      [],
      null,
      snapshot
    );

    const chip = deviceChips.find((c) => c.key === MetricKey.LIGHT)!;
    expect(chip.value).toBe('Multiple');
    expect(chip.multiValues).toEqual(['70%', 'On']);
  });

  it('emits the non-light device chips with legacy keys, labels, and order in the subarea context', () => {
    const snapshot = makeDeviceSnapshot({
      exhaustFans: makeDeviceEntry({ entityIds: ['fan.exhaust'], value: 'Off' }),
      circulationFans: makeDeviceEntry({ entityIds: ['fan.circ'], value: '70%' }),
      humidifiers: makeDeviceEntry({ entityIds: ['switch.hum'], value: 'On' }),
      dehumidifiers: makeDeviceEntry({ entityIds: ['switch.dehum'], value: 'Off' }),
    });

    const { deviceChips } = computeHeaderMetrics(
      makeEnvSnapshot(),
      [],
      null,
      [],
      'subarea',
      new Set(),
      [],
      null,
      snapshot
    );

    expect(deviceChips.map((c) => [c.key, c.label, c.value])).toEqual([
      [MetricKey.EXHAUST, 'Exhaust', 'Off'],
      [MetricKey.CIRCULATION_FAN, 'Fan', '70%'],
      [MetricKey.HUMIDIFIER, 'Humidifier', 'On'],
      [MetricKey.DEHUMIDIFIER, 'Dehumidifier', 'Off'],
    ]);
  });

  it('marks a subarea device chip active when its key is in activeEnvGraphs', () => {
    const snapshot = makeDeviceSnapshot({
      exhaustFans: makeDeviceEntry({ entityIds: ['fan.exhaust'], value: 'On' }),
    });

    const { deviceChips } = computeHeaderMetrics(
      makeEnvSnapshot(),
      [],
      null,
      [],
      'subarea',
      new Set([MetricKey.EXHAUST]),
      [],
      null,
      snapshot
    );

    expect(deviceChips.find((c) => c.key === MetricKey.EXHAUST)!.active).toBe(true);
  });
});
