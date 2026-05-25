/**
 * HeaderMetrics slice unit tests.
 *
 * Each `describe` block corresponds to one TDD cycle (RED → GREEN).
 * Factory helpers keep fixtures local — no shared mutable state between cycles.
 */

import { describe, it, expect } from 'vitest';
import type { EnvSnapshot } from '../environment';
import type { PlantEntity } from '../../features/plants/types';
import type { IrrigationConfig, IrrigationTank } from '../../services/types';
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

    const heroKeys = new Set([MetricKey.TEMPERATURE, MetricKey.HUMIDITY, MetricKey.VPD, MetricKey.CO2]);
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
