/**
 * HeaderMetrics slice unit tests.
 *
 * Each `describe` block corresponds to one TDD cycle (RED → GREEN).
 * Factory helpers keep fixtures local — no shared mutable state between cycles.
 */

import { describe, it, expect } from 'vitest';
import type { EnvSnapshot } from '../environment';
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
    isLightsOn: null,
    hasLightSensor: false,
    dli: null,
    optimalConditions: null,
    soilMoisture: null,
    substrateTemperature: null,
    ph: null,
    feedEc: null,
    substrateEc: null,
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
      soilMoisture: { avg: null, perSensor: [null], entityIds: ['sensor.sm_1'] },
    });
    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');
    expect(chips.find((c) => c.key === MetricKey.SOIL_MOISTURE)).toBeUndefined();
  });

  it('emits a soil moisture chip with formatted value for a single sensor', () => {
    const env = makeEnvSnapshot({
      soilMoisture: { avg: 42.5, perSensor: [42.5], entityIds: ['sensor.sm_1'] },
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
});

describe('Cycle N — substrate temperature chip', () => {
  it('omits the substrate temperature chip when substrateTemperature is null', () => {
    const env = makeEnvSnapshot({ substrateTemperature: null });
    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');
    expect(chips.find((c) => c.key === MetricKey.SUBSTRATE_TEMPERATURE)).toBeUndefined();
  });

  it('emits a substrate temperature chip with formatted value', () => {
    const env = makeEnvSnapshot({
      substrateTemperature: { avg: 20.5, perSensor: [20.5], entityIds: ['sensor.st_1'] },
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
    expect(chips.find((c) => c.key === MetricKey.SUBSTRATE_EC)).toBeUndefined();
    expect(chips.find((c) => c.key === MetricKey.RUNOFF_EC)).toBeUndefined();
    expect(chips.find((c) => c.key === MetricKey.DRAIN_VOLUME)).toBeUndefined();
    expect(chips.find((c) => c.key === MetricKey.IRRIGATION_FLOW)).toBeUndefined();
    expect(chips.find((c) => c.key === MetricKey.POWER)).toBeUndefined();
    expect(chips.find((c) => c.key === MetricKey.ENERGY)).toBeUndefined();
  });

  it('emits ph chip with formatted value', () => {
    const env = makeEnvSnapshot({
      ph: { avg: 6.2, perSensor: [6.2], entityIds: ['sensor.ph_1'] },
    });
    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');
    const chip = chips.find((c) => c.key === MetricKey.PH);
    expect(chip).toBeDefined();
    expect(chip!.value).toBe('6.2');
    expect(chip!.label).toBe('pH');
  });

  it('emits feed EC chip with unit', () => {
    const env = makeEnvSnapshot({
      feedEc: { avg: 2.1, perSensor: [2.1], entityIds: ['sensor.ec_1'] },
    });
    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');
    const chip = chips.find((c) => c.key === MetricKey.FEED_EC);
    expect(chip!.value).toBe('2.1 mS/cm');
    expect(chip!.label).toBe('Feed EC');
  });

  it('emits power chip with W unit', () => {
    const env = makeEnvSnapshot({
      power: { avg: 450, perSensor: [450], entityIds: ['sensor.pwr_1'] },
    });
    const { chips } = computeHeaderMetrics(env, [], null, [], 'main');
    const chip = chips.find((c) => c.key === MetricKey.POWER);
    expect(chip!.value).toBe('450.0 W');
  });

  it('emits "Multiple" for runoff EC with two sensors', () => {
    const env = makeEnvSnapshot({
      runoffEc: {
        avg: 2.25,
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

    const { chips } = computeHeaderMetrics(null, [], config, [], 'main', new Set(), [], strategy);

    const chip = chips.find((c) => c.key === MetricKey.IRRIGATION);
    expect(chip).toBeDefined();
    expect(chip!.label).toBe('Phase');
    expect(chip!.value).toBe('P1 · 75%');
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

    const { chips } = computeHeaderMetrics(null, [], config, [], 'main', new Set(), [], strategy);

    const chip = chips.find((c) => c.key === MetricKey.IRRIGATION);
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

    const { chips } = computeHeaderMetrics(
      null,
      [flowerPlant],
      config,
      [],
      'main',
      new Set(),
      [],
      strategy
    );

    const chip = chips.find((c) => c.key === MetricKey.IRRIGATION);
    expect(chip).toBeDefined();
    expect(chip!.label).toBe('Phase');
    expect(chip!.value).toBe('P2 · 16:00');
  });

  it('shows P3 chip with lights-on time when phase is p3', () => {
    const config = makeIrrigationConfig({ activeSteeringPhase: 'p3' });
    const strategy = makeIrrigationStrategy({ enabled: true, lightsOnTime: '07:30' });

    const { chips } = computeHeaderMetrics(null, [], config, [], 'main', new Set(), [], strategy);

    const chip = chips.find((c) => c.key === MetricKey.IRRIGATION);
    expect(chip).toBeDefined();
    expect(chip!.label).toBe('Phase');
    expect(chip!.value).toBe('P3 · 07:30');
  });

  it('omits the IRRIGATION chip when crop steering is enabled but activeSteeringPhase is not set', () => {
    const config = makeIrrigationConfig({
      irrigationTimes: [{ time: '08:00' }],
      activeSteeringPhase: undefined,
    });
    const strategy = makeIrrigationStrategy({ enabled: true });

    const { chips } = computeHeaderMetrics(null, [], config, [], 'main', new Set(), [], strategy);

    expect(chips.find((c) => c.key === MetricKey.IRRIGATION)).toBeUndefined();
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
