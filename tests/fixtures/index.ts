import { vi } from 'vitest';
import type { PlantEntity, PlantAttributes } from '../../src/features/plants/types';
import { PlantStage, PlantSex } from '../../src/features/plants/types';
import type { EnvSnapshot } from '../../src/slices/environment/index';
import { createGrowspaceDevice } from '../../src/services/types';
import type { GrowspaceDevice, IrrigationConfig } from '../../src/services/types';
import type { ECRampPoint, ECRampCurve } from '../../src/schemas/api-schema';
import type { Recommendation, AIBriefing } from '../../src/slices/ai-insight/schema';

// ---------------------------------------------------------------------------
// aPlant
// ---------------------------------------------------------------------------

const defaultPlantAttributes: PlantAttributes = {
  plant_id: 'test-plant-uuid-1',
  entity_id: 'sensor.gorilla_glue_4',
  strain: 'Gorilla Glue',
  phenotype: '#4',
  stage: PlantStage.VEG,
  row: 1,
  col: 1,
  position: '(1,1)',
  seedling_days: 0,
  mother_days: 0,
  clone_days: 0,
  veg_days: 14,
  flower_days: 0,
  dry_days: 0,
  cure_days: 0,
  seedling_start: null,
  mother_start: null,
  clone_start: null,
  veg_start: '2026-05-01',
  flower_start: null,
  dry_start: null,
  cure_start: null,
  days_since_last_watering: 1,
  sex: PlantSex.FEMALE,
  growspace_id: 'test_tent',
  friendly_name: 'Gorilla Glue #4',
};

export function aPlant(overrides: Partial<PlantAttributes> = {}): PlantEntity {
  const attributes = { ...defaultPlantAttributes, ...overrides };
  return {
    entity_id: attributes.entity_id,
    state: attributes.stage,
    attributes,
    last_changed: '2026-05-01T00:00:00Z',
    last_updated: '2026-05-01T00:00:00Z',
    context: { id: 'test-context', user_id: null, parent_id: null },
  };
}

// ---------------------------------------------------------------------------
// aGrowspace
// ---------------------------------------------------------------------------

export interface GrowspaceSeed {
  growspaceId: string;
  name: string;
  rows: number;
  cols: number;
}

export function aGrowspace(overrides: Partial<GrowspaceSeed> = {}): GrowspaceSeed {
  return {
    growspaceId: 'test_tent',
    name: 'Test Tent',
    rows: 4,
    cols: 4,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// anEnvSnapshot
// ---------------------------------------------------------------------------

const defaultEnvSnapshot: EnvSnapshot = {
  temperature: 24.5,
  humidity: 60,
  vpd: 1.2,
  vpdStatus: 'optimal',
  co2: 800,
  isLightsOn: true,
  hasLightSensor: false,
  dli: null,
  optimalConditions: { isOptimal: true, reasons: [] },
  soilMoisture: { avg: 65, perSensor: [65], entityIds: ['sensor.test_tent_soil_moisture'] },
  substrateTemperature: { avg: 22.0, perSensor: [22.0], entityIds: ['sensor.test_tent_substrate_temp'] },
  ph: { avg: 6.2, perSensor: [6.2], entityIds: ['sensor.test_tent_ph'] },
  feedEc: { avg: 1.8, perSensor: [1.8], entityIds: ['sensor.test_tent_feed_ec'] },
  substrateEc: { avg: 2.1, perSensor: [2.1], entityIds: ['sensor.test_tent_substrate_ec'] },
  runoffEc: { avg: 1.9, perSensor: [1.9], entityIds: ['sensor.test_tent_runoff_ec'] },
  drainVolume: { avg: 0.5, perSensor: [0.5], entityIds: ['sensor.test_tent_drain_volume'] },
  irrigationFlow: { avg: 2.3, perSensor: [2.3], entityIds: ['sensor.test_tent_irrigation_flow'] },
  power: { avg: 420, perSensor: [420], entityIds: ['sensor.test_tent_power'] },
  energy: { avg: 5.6, perSensor: [5.6], entityIds: ['sensor.test_tent_energy'] },
};

export function anEnvSnapshot(overrides: Partial<EnvSnapshot> = {}): EnvSnapshot {
  return { ...defaultEnvSnapshot, ...overrides };
}

// ---------------------------------------------------------------------------
// aHass
// ---------------------------------------------------------------------------

export interface AHassOptions {
  growspaces?: GrowspaceSeed[];
}

export function aHass({ growspaces = [aGrowspace()] }: AHassOptions = {}) {
  const states: Record<string, any> = {
    'person.admin': {
      entity_id: 'person.admin',
      state: 'home',
      attributes: { friendly_name: 'Admin' },
    },
    'sensor.growspaces_list': {
      entity_id: 'sensor.growspaces_list',
      state: String(growspaces.length),
      attributes: {
        growspaces: Object.fromEntries(growspaces.map((g) => [g.growspaceId, g.name])),
      },
    },
  };

  for (const gs of growspaces) {
    Object.assign(states, buildGrowspaceStates(gs));
  }

  return {
    states,
    callService: vi.fn().mockResolvedValue(undefined),
    callWS: vi.fn().mockResolvedValue({}),
    callApi: vi.fn().mockResolvedValue(undefined),
    connection: {
      subscribeEvents: () => () => {},
      sendMessagePromise: vi.fn().mockResolvedValue({}),
    },
    localize: (key: string) => `[${key}]`,
    themes: { darkMode: true, theme: 'default' },
    language: 'en',
    resources: {
      en: {
        'state.binary_sensor.on': 'On',
        'state.binary_sensor.off': 'Off',
      },
    },
  };
}

// ---------------------------------------------------------------------------
// aGrowspaceDevice
// ---------------------------------------------------------------------------

export function aGrowspaceDevice(
  overrides: Partial<GrowspaceDevice> & { deviceId?: string; name?: string } = {}
): GrowspaceDevice {
  return createGrowspaceDevice({
    deviceId: 'test_tent',
    name: 'Test Tent',
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// anECRampPoint
// ---------------------------------------------------------------------------

export function anECRampPoint(overrides: Partial<ECRampPoint> = {}): ECRampPoint {
  return { day: 1, target_ec: 0.8, ...overrides };
}

// ---------------------------------------------------------------------------
// anECRampCurve
// ---------------------------------------------------------------------------

export function anECRampCurve(overrides: Partial<ECRampCurve> = {}): ECRampCurve {
  return {
    id: 'test-curve',
    name: 'Test Curve',
    stage: 'flower',
    points: [anECRampPoint(), anECRampPoint({ day: 14, target_ec: 1.4 })],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// anIrrigationConfig
// ---------------------------------------------------------------------------

export function anIrrigationConfig(overrides: Partial<IrrigationConfig> = {}): IrrigationConfig {
  return {
    irrigationTimes: [],
    drainTimes: [],
    soilTriggerPercent: 30,
    dailyVolumeCapLiters: 2,
    maxCyclesPerDay: 4,
    skipDuringDark: true,
    pauseOnLowTank: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// aRecommendation
// ---------------------------------------------------------------------------

export function aRecommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    title: 'Check VPD',
    description: 'VPD is slightly elevated — consider raising humidity.',
    impact: 'medium',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// anAIBriefing
// ---------------------------------------------------------------------------

export function anAIBriefing(overrides: Partial<AIBriefing> = {}): AIBriefing {
  return {
    generated_at: 1717000000,
    summary_text: 'All systems nominal. Plants are progressing well.',
    headline: 'Morning Briefing',
    confidence: 0.9,
    kpis: [],
    recommendations: [
      aRecommendation({ impact: 'high', title: 'Adjust pH', description: 'pH is outside target range.' }),
      aRecommendation({ impact: 'low', title: 'Good airflow', description: 'Air circulation is excellent.' }),
    ],
    ai_available: true,
    ...overrides,
  };
}

function buildGrowspaceStates(gs: GrowspaceSeed): Record<string, any> {
  const { growspaceId, name, rows, cols } = gs;
  const states: Record<string, any> = {};

  const grid: Record<string, any> = {};
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      grid[`position_${r}_${c}`] = null;
    }
  }

  grid['position_1_1'] = {
    plant_id: `${growspaceId}_plant_1`,
    strain: 'Gorilla Glue',
    phenotype: '#4',
    veg_days: 14,
    flower_days: 0,
    row: 1,
    col: 1,
    position: '(1,1)',
    stage: 'veg',
  };

  states[`sensor.${growspaceId}`] = {
    entity_id: `sensor.${growspaceId}`,
    state: '1',
    attributes: {
      friendly_name: name,
      growspace_id: growspaceId,
      rows,
      plants_per_row: cols,
      total_plants: 1,
      grid,
      irrigation_times: [],
      drain_times: [],
    },
  };

  states[`binary_sensor.${growspaceId}_plants_under_stress`] = {
    entity_id: `binary_sensor.${growspaceId}_plants_under_stress`,
    state: 'off',
    attributes: { friendly_name: `${name} Plants Under Stress`, reasons: [] },
  };

  states[`binary_sensor.${growspaceId}_high_mold_risk`] = {
    entity_id: `binary_sensor.${growspaceId}_high_mold_risk`,
    state: 'off',
    attributes: { friendly_name: `${name} High Mold Risk`, reasons: [] },
  };

  states[`binary_sensor.${growspaceId}_optimal_conditions`] = {
    entity_id: `binary_sensor.${growspaceId}_optimal_conditions`,
    state: 'on',
    attributes: { friendly_name: `${name} Optimal Conditions`, reasons: [] },
  };

  return states;
}
