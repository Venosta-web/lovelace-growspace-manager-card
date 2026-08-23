/**
 * Environment slice unit tests.
 *
 * Covers: computeEnvSnapshot (pure), envSnapshots$ atom, and setEnvSnapshot bootstrap write.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { GrowspaceDevice } from '../../services/types';
import { createGrowspaceDevice } from '../../services/types';
import {
  computeEnvSnapshot,
  computeSubareaEnvSnapshot,
  envSnapshotEntityIds,
  envSnapshots$,
  setEnvSnapshot,
  setSubareaEnvSnapshot,
  subareaEnvSnapshots$,
} from './index';
import { EnvSnapshotSchema } from './schema';
import type { Subarea } from '../subarea/schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type HassStates = Record<string, HassEntity>;

function makeHassEntity(
  entityId: string,
  state: string,
  attributes: Record<string, unknown> = {}
): HassEntity {
  return {
    entity_id: entityId,
    state,
    attributes,
    last_changed: '',
    last_updated: '',
    context: { id: '', user_id: null, parent_id: null },
  } as HassEntity;
}

/** Build a minimal GrowspaceDevice for tests. */
function makeDevice(overrides: Partial<GrowspaceDevice> = {}): GrowspaceDevice {
  return createGrowspaceDevice({ deviceId: 'gs1', name: 'Tent 1', ...overrides });
}

// The optimal-conditions binary sensor ID derived from device name
const ENV_ENTITY_ID = 'binary_sensor.tent_1_optimal_conditions';

// ---------------------------------------------------------------------------
// State reset
// ---------------------------------------------------------------------------

beforeEach(() => {
  envSnapshots$.set(new Map());
  subareaEnvSnapshots$.set(new Map());
});

// ---------------------------------------------------------------------------
// Cycle 1 — temperature + humidity from env entity (tracer bullet)
// ---------------------------------------------------------------------------

describe('computeEnvSnapshot — temperature and humidity', () => {
  it('returns temperature and humidity from the optimal-conditions entity attributes', () => {
    const hassStates: HassStates = {
      [ENV_ENTITY_ID]: makeHassEntity(ENV_ENTITY_ID, 'on', {
        temperature: 24.5,
        humidity: 58,
      }),
    };

    const snapshot = computeEnvSnapshot(makeDevice(), hassStates);

    expect(snapshot.temperature).toBe(24.5);
    expect(snapshot.humidity).toBe(58);
  });

  it('returns null for temperature and humidity when the env entity is absent', () => {
    const snapshot = computeEnvSnapshot(makeDevice(), {});

    expect(snapshot.temperature).toBeNull();
    expect(snapshot.humidity).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Cycle 2 — VPD from env entity
// ---------------------------------------------------------------------------

describe('computeEnvSnapshot — VPD from env entity', () => {
  it('returns vpd from the env entity attributes', () => {
    const hassStates: HassStates = {
      [ENV_ENTITY_ID]: makeHassEntity(ENV_ENTITY_ID, 'on', { vpd: 1.2 }),
    };

    const snapshot = computeEnvSnapshot(makeDevice(), hassStates);

    expect(snapshot.vpd).toBe(1.2);
  });
});

// ---------------------------------------------------------------------------
// Cycle 3 — VPD fallback to envAttrs.vpdSensor
// ---------------------------------------------------------------------------

describe('computeEnvSnapshot — VPD fallback to vpdSensor', () => {
  it('falls back to vpdSensor when vpd is missing from env entity', () => {
    const device = makeDevice({
      environmentAttributes: { vpdSensor: 'sensor.custom_vpd' },
    });
    const hassStates: HassStates = {
      [ENV_ENTITY_ID]: makeHassEntity(ENV_ENTITY_ID, 'on', {}),
      'sensor.custom_vpd': makeHassEntity('sensor.custom_vpd', '1.05', {}),
    };

    const snapshot = computeEnvSnapshot(device, hassStates);

    expect(snapshot.vpd).toBeCloseTo(1.05);
  });

  it('ignores vpdSensor when its state is unavailable', () => {
    const device = makeDevice({
      environmentAttributes: { vpdSensor: 'sensor.custom_vpd' },
    });
    const hassStates: HassStates = {
      'sensor.custom_vpd': makeHassEntity('sensor.custom_vpd', 'unavailable', {}),
    };

    const snapshot = computeEnvSnapshot(device, hassStates);

    expect(snapshot.vpd).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Cycle 4 — VPD fallback to calculated-VPD entity (name-slug then UUID)
// ---------------------------------------------------------------------------

describe('computeEnvSnapshot — VPD fallback to calculated entity', () => {
  it('falls back to name-slug calculated VPD when sensor is missing', () => {
    // "Tent 1 Calculated VPD" → sensor.tent_1_calculated_vpd
    const hassStates: HassStates = {
      'sensor.tent_1_calculated_vpd': makeHassEntity('sensor.tent_1_calculated_vpd', '0.9', {}),
    };

    const snapshot = computeEnvSnapshot(makeDevice(), hassStates);

    expect(snapshot.vpd).toBeCloseTo(0.9);
  });

  it('falls back to UUID-based calculated VPD when name-slug entity is unavailable', () => {
    const hassStates: HassStates = {
      'sensor.tent_1_calculated_vpd': makeHassEntity(
        'sensor.tent_1_calculated_vpd',
        'unavailable',
        {}
      ),
      'sensor.gs1_calculated_vpd': makeHassEntity('sensor.gs1_calculated_vpd', '0.85', {}),
    };

    const snapshot = computeEnvSnapshot(makeDevice(), hassStates);

    expect(snapshot.vpd).toBeCloseTo(0.85);
  });

  it('returns null vpd when all fallbacks are absent or unavailable', () => {
    const snapshot = computeEnvSnapshot(makeDevice(), {});

    expect(snapshot.vpd).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Cycle 5 — VPD status derivation
// ---------------------------------------------------------------------------

describe('computeEnvSnapshot — vpdStatus', () => {
  it('returns vpdStatus from the overview entity attributes', () => {
    const device = makeDevice({ overviewEntityId: 'sensor.gs1_overview' });
    const hassStates: HassStates = {
      'sensor.gs1_overview': makeHassEntity('sensor.gs1_overview', 'on', {
        vpd_status: 'optimal',
      }),
    };

    const snapshot = computeEnvSnapshot(device, hassStates);

    expect(snapshot.vpdStatus).toBe('optimal');
  });

  it('derives vpdStatus as "optimal" when vpd is within target range', () => {
    // overviewEntityId → slug "gs1" → env entity "binary_sensor.gs1_optimal_conditions"
    const device = makeDevice({ overviewEntityId: 'sensor.gs1_overview' });
    const hassStates: HassStates = {
      'binary_sensor.gs1_optimal_conditions': makeHassEntity(
        'binary_sensor.gs1_optimal_conditions',
        'on',
        { vpd: 1.1 }
      ),
      'sensor.gs1_overview': makeHassEntity('sensor.gs1_overview', 'on', {
        // no vpd_status, but targets provided
        vpd_target_min: 0.8,
        vpd_target_max: 1.4,
        vpd_danger_min: 0.4,
        vpd_danger_max: 1.8,
      }),
    };

    const snapshot = computeEnvSnapshot(device, hassStates);

    expect(snapshot.vpdStatus).toBe('optimal');
  });

  it('derives vpdStatus as "warning" when vpd is outside target but inside danger range', () => {
    const device = makeDevice({ overviewEntityId: 'sensor.gs1_overview' });
    const hassStates: HassStates = {
      'binary_sensor.gs1_optimal_conditions': makeHassEntity(
        'binary_sensor.gs1_optimal_conditions',
        'on',
        { vpd: 1.6 }
      ),
      'sensor.gs1_overview': makeHassEntity('sensor.gs1_overview', 'on', {
        vpd_target_min: 0.8,
        vpd_target_max: 1.4,
        vpd_danger_min: 0.4,
        vpd_danger_max: 1.8,
      }),
    };

    const snapshot = computeEnvSnapshot(device, hassStates);

    expect(snapshot.vpdStatus).toBe('warning');
  });

  it('derives vpdStatus as "danger" when vpd is outside danger range', () => {
    const device = makeDevice({ overviewEntityId: 'sensor.gs1_overview' });
    const hassStates: HassStates = {
      'binary_sensor.gs1_optimal_conditions': makeHassEntity(
        'binary_sensor.gs1_optimal_conditions',
        'on',
        { vpd: 2.1 }
      ),
      'sensor.gs1_overview': makeHassEntity('sensor.gs1_overview', 'on', {
        vpd_target_min: 0.8,
        vpd_target_max: 1.4,
        vpd_danger_min: 0.4,
        vpd_danger_max: 1.8,
      }),
    };

    const snapshot = computeEnvSnapshot(device, hassStates);

    expect(snapshot.vpdStatus).toBe('danger');
  });

  it('returns null vpdStatus when vpd is null', () => {
    const snapshot = computeEnvSnapshot(makeDevice(), {});

    expect(snapshot.vpdStatus).toBeNull();
  });

  it('reads vpdStatus from attributes.metrics (real backend structure)', () => {
    const device = makeDevice({ overviewEntityId: 'sensor.gs1_overview' });
    const hassStates: HassStates = {
      'sensor.gs1_overview': makeHassEntity('sensor.gs1_overview', 'on', {
        metrics: { vpd_status: 'warning' },
      }),
    };

    const snapshot = computeEnvSnapshot(device, hassStates);

    expect(snapshot.vpdStatus).toBe('warning');
  });

  it('derives vpdStatus from metrics thresholds when vpd_status is unknown', () => {
    const device = makeDevice({ overviewEntityId: 'sensor.gs1_overview' });
    const hassStates: HassStates = {
      'binary_sensor.gs1_optimal_conditions': makeHassEntity(
        'binary_sensor.gs1_optimal_conditions',
        'on',
        { vpd: 1.1 }
      ),
      'sensor.gs1_overview': makeHassEntity('sensor.gs1_overview', 'on', {
        metrics: {
          vpd_status: 'unknown',
          vpd_target_min: 0.8,
          vpd_target_max: 1.4,
          vpd_danger_min: 0.4,
          vpd_danger_max: 1.8,
        },
      }),
    };

    const snapshot = computeEnvSnapshot(device, hassStates);

    expect(snapshot.vpdStatus).toBe('optimal');
  });
});

// ---------------------------------------------------------------------------
// Cycle 6 — co2 (absent for cure/dry growspaces)
// ---------------------------------------------------------------------------

describe('computeEnvSnapshot — co2', () => {
  it('returns co2 from the env entity for a normal growspace', () => {
    const hassStates: HassStates = {
      [ENV_ENTITY_ID]: makeHassEntity(ENV_ENTITY_ID, 'on', { co2: 850 }),
    };

    const snapshot = computeEnvSnapshot(makeDevice(), hassStates);

    expect(snapshot.co2).toBe(850);
  });

  it('returns null co2 for a cure growspace', () => {
    const device = makeDevice({ type: 'cure' as GrowspaceDevice['type'] });
    const hassStates: HassStates = {
      'binary_sensor.cure_optimal_curing': makeHassEntity(
        'binary_sensor.cure_optimal_curing',
        'on',
        { co2: 800 }
      ),
    };

    const snapshot = computeEnvSnapshot(device, hassStates);

    expect(snapshot.co2).toBeNull();
  });

  it('returns null co2 for a dry growspace', () => {
    const device = makeDevice({ type: 'dry' as GrowspaceDevice['type'] });
    const hassStates: HassStates = {
      'binary_sensor.dry_optimal_drying': makeHassEntity('binary_sensor.dry_optimal_drying', 'on', {
        co2: 800,
      }),
    };

    const snapshot = computeEnvSnapshot(device, hassStates);

    expect(snapshot.co2).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Cycle 10 — temperature fallback to environmentAttributes.temperatureSensor
// ---------------------------------------------------------------------------

describe('computeEnvSnapshot — temperature sensor fallback', () => {
  it('falls back to temperatureSensor when the env entity attribute is absent', () => {
    const device = makeDevice({
      environmentAttributes: { temperatureSensor: 'sensor.tent_1_temperature' },
    });
    const hassStates: HassStates = {
      // env entity exists but has no temperature attribute
      [ENV_ENTITY_ID]: makeHassEntity(ENV_ENTITY_ID, 'on', {}),
      'sensor.tent_1_temperature': makeHassEntity('sensor.tent_1_temperature', '23.5', {}),
    };

    const snapshot = computeEnvSnapshot(device, hassStates);

    expect(snapshot.temperature).toBeCloseTo(23.5);
  });

  it('returns null for temperature when both the env entity attribute and temperatureSensor are absent', () => {
    const device = makeDevice({
      environmentAttributes: { temperatureSensor: 'sensor.tent_1_temperature' },
    });
    // temperatureSensor entity not in hass states at all
    const hassStates: HassStates = {
      [ENV_ENTITY_ID]: makeHassEntity(ENV_ENTITY_ID, 'on', {}),
    };

    const snapshot = computeEnvSnapshot(device, hassStates);

    expect(snapshot.temperature).toBeNull();
  });

  it('prefers the env entity attribute over temperatureSensor', () => {
    const device = makeDevice({
      environmentAttributes: { temperatureSensor: 'sensor.tent_1_temperature' },
    });
    const hassStates: HassStates = {
      [ENV_ENTITY_ID]: makeHassEntity(ENV_ENTITY_ID, 'on', { temperature: 24.5 }),
      'sensor.tent_1_temperature': makeHassEntity('sensor.tent_1_temperature', '20.0', {}),
    };

    const snapshot = computeEnvSnapshot(device, hassStates);

    expect(snapshot.temperature).toBe(24.5);
  });
});

// ---------------------------------------------------------------------------
// Cycle 11 — humidity fallback to environmentAttributes.humiditySensor
// ---------------------------------------------------------------------------

describe('computeEnvSnapshot — humidity sensor fallback', () => {
  it('falls back to humiditySensor when the env entity attribute is absent', () => {
    const device = makeDevice({
      environmentAttributes: { humiditySensor: 'sensor.tent_1_humidity' },
    });
    const hassStates: HassStates = {
      [ENV_ENTITY_ID]: makeHassEntity(ENV_ENTITY_ID, 'on', {}),
      'sensor.tent_1_humidity': makeHassEntity('sensor.tent_1_humidity', '62', {}),
    };

    const snapshot = computeEnvSnapshot(device, hassStates);

    expect(snapshot.humidity).toBeCloseTo(62);
  });

  it('returns null for humidity when both the env entity attribute and humiditySensor are absent', () => {
    const device = makeDevice({
      environmentAttributes: { humiditySensor: 'sensor.tent_1_humidity' },
    });
    const hassStates: HassStates = {
      [ENV_ENTITY_ID]: makeHassEntity(ENV_ENTITY_ID, 'on', {}),
    };

    const snapshot = computeEnvSnapshot(device, hassStates);

    expect(snapshot.humidity).toBeNull();
  });

  it('prefers the env entity attribute over humiditySensor', () => {
    const device = makeDevice({
      environmentAttributes: { humiditySensor: 'sensor.tent_1_humidity' },
    });
    const hassStates: HassStates = {
      [ENV_ENTITY_ID]: makeHassEntity(ENV_ENTITY_ID, 'on', { humidity: 58 }),
      'sensor.tent_1_humidity': makeHassEntity('sensor.tent_1_humidity', '70', {}),
    };

    const snapshot = computeEnvSnapshot(device, hassStates);

    expect(snapshot.humidity).toBe(58);
  });
});

// ---------------------------------------------------------------------------
// Cycle 12 — CO2 fallback to environmentAttributes.co2Sensor
// ---------------------------------------------------------------------------

describe('computeEnvSnapshot — co2 sensor fallback', () => {
  it('falls back to co2Sensor when the env entity attribute is absent', () => {
    const device = makeDevice({
      environmentAttributes: { co2Sensor: 'sensor.tent_1_co2' },
    });
    const hassStates: HassStates = {
      [ENV_ENTITY_ID]: makeHassEntity(ENV_ENTITY_ID, 'on', {}),
      'sensor.tent_1_co2': makeHassEntity('sensor.tent_1_co2', '900', {}),
    };

    const snapshot = computeEnvSnapshot(device, hassStates);

    expect(snapshot.co2).toBeCloseTo(900);
  });

  it('returns null for co2 when both the env entity attribute and co2Sensor are absent', () => {
    const device = makeDevice({
      environmentAttributes: { co2Sensor: 'sensor.tent_1_co2' },
    });
    const hassStates: HassStates = {
      [ENV_ENTITY_ID]: makeHassEntity(ENV_ENTITY_ID, 'on', {}),
    };

    const snapshot = computeEnvSnapshot(device, hassStates);

    expect(snapshot.co2).toBeNull();
  });

  it('prefers the env entity attribute over co2Sensor', () => {
    const device = makeDevice({
      environmentAttributes: { co2Sensor: 'sensor.tent_1_co2' },
    });
    const hassStates: HassStates = {
      [ENV_ENTITY_ID]: makeHassEntity(ENV_ENTITY_ID, 'on', { co2: 850 }),
      'sensor.tent_1_co2': makeHassEntity('sensor.tent_1_co2', '1000', {}),
    };

    const snapshot = computeEnvSnapshot(device, hassStates);

    expect(snapshot.co2).toBe(850);
  });

  it('co2Sensor fallback is suppressed for cure growspaces', () => {
    const device = makeDevice({
      type: 'cure' as GrowspaceDevice['type'],
      environmentAttributes: { co2Sensor: 'sensor.cure_co2' },
    });
    const hassStates: HassStates = {
      'binary_sensor.cure_optimal_curing': makeHassEntity(
        'binary_sensor.cure_optimal_curing',
        'on',
        {}
      ),
      'sensor.cure_co2': makeHassEntity('sensor.cure_co2', '800', {}),
    };

    const snapshot = computeEnvSnapshot(device, hassStates);

    expect(snapshot.co2).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Cycle 7 — isLightsOn + hasLightSensor
// ---------------------------------------------------------------------------

describe('computeEnvSnapshot — isLightsOn and hasLightSensor', () => {
  it('returns isLightsOn true and hasLightSensor true when is_lights_on is true', () => {
    const hassStates: HassStates = {
      [ENV_ENTITY_ID]: makeHassEntity(ENV_ENTITY_ID, 'on', { is_lights_on: true }),
    };

    const snapshot = computeEnvSnapshot(makeDevice(), hassStates);

    expect(snapshot.isLightsOn).toBe(true);
    expect(snapshot.hasLightSensor).toBe(true);
  });

  it('returns isLightsOn false and hasLightSensor true when is_lights_on is false', () => {
    const hassStates: HassStates = {
      [ENV_ENTITY_ID]: makeHassEntity(ENV_ENTITY_ID, 'on', { is_lights_on: false }),
    };

    const snapshot = computeEnvSnapshot(makeDevice(), hassStates);

    expect(snapshot.isLightsOn).toBe(false);
    expect(snapshot.hasLightSensor).toBe(true);
  });

  it('returns hasLightSensor false when is_lights_on is absent', () => {
    const hassStates: HassStates = {
      [ENV_ENTITY_ID]: makeHassEntity(ENV_ENTITY_ID, 'on', {}),
    };

    const snapshot = computeEnvSnapshot(makeDevice(), hassStates);

    expect(snapshot.hasLightSensor).toBe(false);
    expect(snapshot.isLightsOn).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Cycle 8 — DLI from DLI sensor entity
// ---------------------------------------------------------------------------

describe('computeEnvSnapshot — dli', () => {
  it('returns dli value from the DLI sensor entity', () => {
    // "Tent 1" → slug "tent_1" → sensor.tent_1_dli
    const hassStates: HassStates = {
      'sensor.tent_1_dli': makeHassEntity('sensor.tent_1_dli', '28.5', {}),
    };

    const snapshot = computeEnvSnapshot(makeDevice(), hassStates);

    expect(snapshot.dli).toBeCloseTo(28.5);
  });

  it('returns null dli when the DLI sensor is unavailable', () => {
    const hassStates: HassStates = {
      'sensor.tent_1_dli': makeHassEntity('sensor.tent_1_dli', 'unavailable', {}),
    };

    const snapshot = computeEnvSnapshot(makeDevice(), hassStates);

    expect(snapshot.dli).toBeNull();
  });

  it('returns null dli when the DLI sensor is absent', () => {
    const snapshot = computeEnvSnapshot(makeDevice(), {});

    expect(snapshot.dli).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Cycle 9 — envSnapshots$ atom + setEnvSnapshot bootstrap write
// ---------------------------------------------------------------------------

describe('envSnapshots$ atom and setEnvSnapshot', () => {
  it('starts as an empty map', () => {
    expect(envSnapshots$.get().size).toBe(0);
  });

  it('setEnvSnapshot stores the computed snapshot for the given growspaceId', () => {
    const hassStates: HassStates = {
      [ENV_ENTITY_ID]: makeHassEntity(ENV_ENTITY_ID, 'on', { temperature: 22, humidity: 55 }),
    };

    setEnvSnapshot('gs1', makeDevice(), hassStates);

    const snapshot = envSnapshots$.get().get('gs1');
    expect(snapshot).toBeDefined();
    expect(snapshot!.temperature).toBe(22);
    expect(snapshot!.humidity).toBe(55);
  });

  it('setEnvSnapshot overwrites a previous snapshot for the same growspaceId', () => {
    const hassStates1: HassStates = {
      [ENV_ENTITY_ID]: makeHassEntity(ENV_ENTITY_ID, 'on', { temperature: 20 }),
    };
    const hassStates2: HassStates = {
      [ENV_ENTITY_ID]: makeHassEntity(ENV_ENTITY_ID, 'on', { temperature: 25 }),
    };

    setEnvSnapshot('gs1', makeDevice(), hassStates1);
    setEnvSnapshot('gs1', makeDevice(), hassStates2);

    expect(envSnapshots$.get().get('gs1')!.temperature).toBe(25);
  });

  it('setEnvSnapshot stores independent snapshots for different growspaces', () => {
    const device1 = makeDevice({ deviceId: 'gs1', name: 'Tent 1' });
    const device2 = makeDevice({ deviceId: 'gs2', name: 'Tent 2' });
    const states1: HassStates = {
      'binary_sensor.tent_1_optimal_conditions': makeHassEntity(
        'binary_sensor.tent_1_optimal_conditions',
        'on',
        { temperature: 22 }
      ),
    };
    const states2: HassStates = {
      'binary_sensor.tent_2_optimal_conditions': makeHassEntity(
        'binary_sensor.tent_2_optimal_conditions',
        'on',
        { temperature: 27 }
      ),
    };

    setEnvSnapshot('gs1', device1, states1);
    setEnvSnapshot('gs2', device2, states2);

    expect(envSnapshots$.get().get('gs1')!.temperature).toBe(22);
    expect(envSnapshots$.get().get('gs2')!.temperature).toBe(27);
  });
});

// ---------------------------------------------------------------------------
// Additional coverage tests
// ---------------------------------------------------------------------------

describe('computeEnvSnapshot — additional branch coverage', () => {
  it('returns null for temperature when the attribute is NaN', () => {
    const hassStates: HassStates = {
      [ENV_ENTITY_ID]: makeHassEntity(ENV_ENTITY_ID, 'on', {
        temperature: 'not-a-number',
      }),
    };

    const snapshot = computeEnvSnapshot(makeDevice(), hassStates);
    expect(snapshot.temperature).toBeNull();
  });

  it('returns null for dli when the DLI sensor state is NaN', () => {
    const hassStates: HassStates = {
      'sensor.tent_1_dli': makeHassEntity('sensor.tent_1_dli', 'not-a-number', {}),
    };

    const snapshot = computeEnvSnapshot(makeDevice(), hassStates);
    expect(snapshot.dli).toBeNull();
  });

  it('falls through when vpd_status attribute is invalid', () => {
    const device = makeDevice({ overviewEntityId: 'sensor.gs1_overview' });
    const hassStates: HassStates = {
      'binary_sensor.gs1_optimal_conditions': makeHassEntity(
        'binary_sensor.gs1_optimal_conditions',
        'on',
        { vpd: 1.1 }
      ),
      'sensor.gs1_overview': makeHassEntity('sensor.gs1_overview', 'on', {
        vpd_status: 'invalid-status',
        vpd_target_min: 0.8,
        vpd_target_max: 1.4,
        vpd_danger_min: 0.4,
        vpd_danger_max: 1.8,
      }),
    };

    const snapshot = computeEnvSnapshot(device, hassStates);
    expect(snapshot.vpdStatus).toBe('optimal');
  });

  it('returns empty array for reasons when the reasons attribute is not an array', () => {
    const hassStates: HassStates = {
      [ENV_ENTITY_ID]: makeHassEntity(ENV_ENTITY_ID, 'on', {
        reasons: 'not-an-array',
      }),
    };

    const snapshot = computeEnvSnapshot(makeDevice(), hassStates);
    expect(snapshot.optimalConditions).not.toBeNull();
    expect(snapshot.optimalConditions!.reasons).toEqual([]);
  });

  it('returns optimalConditions with reasons array when reasons attribute is an array', () => {
    const hassStates: HassStates = {
      [ENV_ENTITY_ID]: makeHassEntity(ENV_ENTITY_ID, 'on', {
        reasons: ['too hot', 'too humid'],
      }),
    };

    const snapshot = computeEnvSnapshot(makeDevice(), hassStates);
    expect(snapshot.optimalConditions).toEqual({
      isOptimal: true,
      reasons: ['too hot', 'too humid'],
    });
  });
});

const NULL_SENSOR_FIELDS = {
  temperatureReadings: null,
  humidityReadings: null,
  vpdReadings: null,
  co2Readings: null,
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
};

// ---------------------------------------------------------------------------
// Cycle N — substrate / medium sensors and irrigation monitoring sensors
// ---------------------------------------------------------------------------

describe('computeEnvSnapshot — soil moisture', () => {
  it('returns null when no soil moisture sensor is configured', () => {
    const snapshot = computeEnvSnapshot(makeDevice(), {});
    expect(snapshot.soilMoisture).toBeNull();
  });

  it('returns a SensorReadings with avg and entityIds for a single sensor', () => {
    const device = makeDevice({
      environmentAttributes: { soilMoistureSensor: 'sensor.sm_1' },
    });
    const hassStates: HassStates = {
      'sensor.sm_1': makeHassEntity('sensor.sm_1', '42.5'),
    };
    const snapshot = computeEnvSnapshot(device, hassStates);
    expect(snapshot.soilMoisture).toEqual({
      avg: 42.5,
      sum: 42.5,
      perSensor: [42.5],
      entityIds: ['sensor.sm_1'],
    });
  });

  it('returns avg and perSensor array for multiple sensors', () => {
    const device = makeDevice({
      environmentAttributes: { soilMoistureSensors: ['sensor.sm_1', 'sensor.sm_2'] },
    });
    const hassStates: HassStates = {
      'sensor.sm_1': makeHassEntity('sensor.sm_1', '40'),
      'sensor.sm_2': makeHassEntity('sensor.sm_2', '60'),
    };
    const snapshot = computeEnvSnapshot(device, hassStates);
    expect(snapshot.soilMoisture!.avg).toBe(50);
    expect(snapshot.soilMoisture!.perSensor).toEqual([40, 60]);
    expect(snapshot.soilMoisture!.entityIds).toEqual(['sensor.sm_1', 'sensor.sm_2']);
  });

  it('returns avg === null when all configured sensors are unavailable', () => {
    const device = makeDevice({
      environmentAttributes: { soilMoistureSensor: 'sensor.sm_1' },
    });
    const hassStates: HassStates = {
      'sensor.sm_1': makeHassEntity('sensor.sm_1', 'unavailable'),
    };
    const snapshot = computeEnvSnapshot(device, hassStates);
    expect(snapshot.soilMoisture).not.toBeNull();
    expect(snapshot.soilMoisture!.avg).toBeNull();
  });
});

describe('computeEnvSnapshot — substrate temperature', () => {
  it('returns null when no substrate temperature sensors are configured', () => {
    const snapshot = computeEnvSnapshot(makeDevice(), {});
    expect(snapshot.substrateTemperature).toBeNull();
  });

  it('returns readings for configured substrate temperature sensors', () => {
    const device = makeDevice({
      environmentAttributes: { substrateTemperatureSensors: ['sensor.st_1'] },
    });
    const hassStates: HassStates = {
      'sensor.st_1': makeHassEntity('sensor.st_1', '20.5'),
    };
    const snapshot = computeEnvSnapshot(device, hassStates);
    expect(snapshot.substrateTemperature!.avg).toBe(20.5);
  });
});

describe('computeEnvSnapshot — irrigation monitoring sensors', () => {
  it('returns null for all irrigation monitoring sensors when none are configured', () => {
    const snapshot = computeEnvSnapshot(makeDevice(), {});
    expect(snapshot.ph).toBeNull();
    expect(snapshot.feedEc).toBeNull();
    expect(snapshot.bulkEc).toBeNull();
    expect(snapshot.poreEc).toBeNull();
    expect(snapshot.runoffEc).toBeNull();
    expect(snapshot.drainVolume).toBeNull();
    expect(snapshot.irrigationFlow).toBeNull();
    expect(snapshot.power).toBeNull();
    expect(snapshot.energy).toBeNull();
  });

  it('returns readings for each configured irrigation monitoring sensor', () => {
    const device = makeDevice({
      environmentAttributes: {
        phSensors: ['sensor.ph_1'],
        feedEcSensors: ['sensor.feed_ec_1'],
        bulkEcSensors: ['sensor.bulk_ec_1'],
        poreEcSensors: ['sensor.pore_ec_1'],
        runoffEcSensors: ['sensor.runoff_ec_1'],
        drainVolumeSensors: ['sensor.drain_1'],
        irrigationFlowSensors: ['sensor.flow_1'],
        powerSensors: ['sensor.power_1'],
        energySensors: ['sensor.energy_1'],
      },
    });
    const hassStates: HassStates = {
      'sensor.ph_1': makeHassEntity('sensor.ph_1', '6.2'),
      'sensor.feed_ec_1': makeHassEntity('sensor.feed_ec_1', '2.1'),
      'sensor.bulk_ec_1': makeHassEntity('sensor.bulk_ec_1', '1.8'),
      'sensor.pore_ec_1': makeHassEntity('sensor.pore_ec_1', '2.0'),
      'sensor.runoff_ec_1': makeHassEntity('sensor.runoff_ec_1', '2.4'),
      'sensor.drain_1': makeHassEntity('sensor.drain_1', '0.5'),
      'sensor.flow_1': makeHassEntity('sensor.flow_1', '12.0'),
      'sensor.power_1': makeHassEntity('sensor.power_1', '450'),
      'sensor.energy_1': makeHassEntity('sensor.energy_1', '3.2'),
    };
    const snapshot = computeEnvSnapshot(device, hassStates);
    expect(snapshot.ph!.avg).toBe(6.2);
    expect(snapshot.feedEc!.avg).toBe(2.1);
    expect(snapshot.bulkEc!.avg).toBe(1.8);
    expect(snapshot.poreEc!.avg).toBe(2.0);
    expect(snapshot.runoffEc!.avg).toBe(2.4);
    expect(snapshot.drainVolume!.avg).toBe(0.5);
    expect(snapshot.irrigationFlow!.avg).toBe(12.0);
    expect(snapshot.power!.avg).toBe(450);
    expect(snapshot.energy!.avg).toBe(3.2);
  });
});

describe('EnvSnapshotSchema', () => {
  it('validates a valid EnvSnapshot payload', () => {
    const validPayload = {
      temperature: 24.5,
      humidity: 58,
      vpd: 1.2,
      vpdStatus: 'optimal',
      co2: 800,
      isLightsOn: true,
      hasLightSensor: true,
      dli: 22.4,
      optimalConditions: {
        isOptimal: true,
        reasons: ['optimal temperature'],
      },
      ...NULL_SENSOR_FIELDS,
    };
    const parsed = EnvSnapshotSchema.parse(validPayload);
    expect(parsed).toEqual(validPayload);
  });

  it('allows nullable and optional fields', () => {
    const minimalPayload = {
      temperature: null,
      humidity: null,
      vpd: null,
      vpdStatus: null,
      co2: null,
      isLightsOn: null,
      hasLightSensor: false,
      dli: null,
      optimalConditions: null,
      ...NULL_SENSOR_FIELDS,
    };
    const parsed = EnvSnapshotSchema.parse(minimalPayload);
    expect(parsed).toEqual(minimalPayload);
  });

  it('validates SensorReadings fields when present', () => {
    const payload = {
      temperature: null,
      humidity: null,
      vpd: null,
      vpdStatus: null,
      co2: null,
      isLightsOn: null,
      hasLightSensor: false,
      dli: null,
      optimalConditions: null,
      ...NULL_SENSOR_FIELDS,
      soilMoisture: { avg: 42.5, sum: 42.5, perSensor: [42.5], entityIds: ['sensor.sm_1'] },
      substrateTemperature: {
        avg: null,
        sum: null,
        perSensor: [null, null],
        entityIds: ['sensor.st_1', 'sensor.st_2'],
      },
    };
    const parsed = EnvSnapshotSchema.parse(payload);
    expect(parsed.soilMoisture).toEqual({
      avg: 42.5,
      sum: 42.5,
      perSensor: [42.5],
      entityIds: ['sensor.sm_1'],
    });
    expect(parsed.substrateTemperature!.avg).toBeNull();
  });

  it('fails validation on invalid payloads', () => {
    const invalidPayload = {
      temperature: 'invalid',
      humidity: null,
      vpd: null,
      vpdStatus: 'invalid_status',
      co2: null,
      isLightsOn: null,
      hasLightSensor: false,
      dli: null,
      optimalConditions: null,
      ...NULL_SENSOR_FIELDS,
    };
    const result = EnvSnapshotSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Cycle N+1 — subarea adapter (ADR-0018): computeSubareaEnvSnapshot,
// subareaEnvSnapshots$ + setSubareaEnvSnapshot, envSnapshotEntityIds
// ---------------------------------------------------------------------------

function makeSubarea(
  environmentConfig: Subarea['environment_config'] = {},
  overrides: Partial<Omit<Subarea, 'environment_config'>> = {}
): Subarea {
  return { id: 'sa1', name: 'Veg Area', environment_config: environmentConfig, ...overrides };
}

const PARENT = { growspaceId: 'gs1', growspaceName: 'Tent 1' };

describe('computeEnvSnapshot — growspace adapter leaves hero readings null', () => {
  it('returns null for all four hero readings fields', () => {
    const hassStates: HassStates = {
      [ENV_ENTITY_ID]: makeHassEntity(ENV_ENTITY_ID, 'on', { temperature: 24.5, humidity: 58 }),
    };

    const snapshot = computeEnvSnapshot(makeDevice(), hassStates);

    expect(snapshot.temperatureReadings).toBeNull();
    expect(snapshot.humidityReadings).toBeNull();
    expect(snapshot.vpdReadings).toBeNull();
    expect(snapshot.co2Readings).toBeNull();
  });
});

describe('computeSubareaEnvSnapshot — hero readings from environment_config', () => {
  it('aggregates temperature_sensors into temperatureReadings and the scalar avg', () => {
    const hassStates: HassStates = {
      'sensor.t1': makeHassEntity('sensor.t1', '22.0'),
      'sensor.t2': makeHassEntity('sensor.t2', '24.0'),
    };

    const snapshot = computeSubareaEnvSnapshot(
      makeSubarea({ temperature_sensors: ['sensor.t1', 'sensor.t2'] }),
      PARENT,
      hassStates
    );

    expect(snapshot.temperatureReadings).toEqual({
      avg: 23,
      sum: 46,
      perSensor: [22, 24],
      entityIds: ['sensor.t1', 'sensor.t2'],
    });
    expect(snapshot.temperature).toBe(23);
  });

  it('honours the legacy single-sensor fields (temperature_sensor, humidity_sensor, co2_sensor)', () => {
    const hassStates: HassStates = {
      'sensor.t': makeHassEntity('sensor.t', '21.5'),
      'sensor.h': makeHassEntity('sensor.h', '55'),
      'sensor.c': makeHassEntity('sensor.c', '800'),
    };

    const snapshot = computeSubareaEnvSnapshot(
      makeSubarea({
        temperature_sensor: 'sensor.t',
        humidity_sensor: 'sensor.h',
        co2_sensor: 'sensor.c',
      }),
      PARENT,
      hassStates
    );

    expect(snapshot.temperatureReadings!.entityIds).toEqual(['sensor.t']);
    expect(snapshot.humidity).toBe(55);
    expect(snapshot.co2Readings!.entityIds).toEqual(['sensor.c']);
    expect(snapshot.co2).toBe(800);
  });

  it('returns null readings and scalars for unconfigured metrics, with growspace-only fields null', () => {
    const snapshot = computeSubareaEnvSnapshot(makeSubarea(), PARENT, {});

    expect(snapshot.temperatureReadings).toBeNull();
    expect(snapshot.temperature).toBeNull();
    expect(snapshot.vpdStatus).toBeNull();
    expect(snapshot.isLightsOn).toBeNull();
    expect(snapshot.hasLightSensor).toBe(false);
    expect(snapshot.dli).toBeNull();
    expect(snapshot.optimalConditions).toBeNull();
  });

  it('aggregates monitoring sensors from the snake_case environment_config lists', () => {
    const hassStates: HassStates = {
      'sensor.ph': makeHassEntity('sensor.ph', '6.2'),
      'sensor.st': makeHassEntity('sensor.st', '21.0'),
    };

    const snapshot = computeSubareaEnvSnapshot(
      makeSubarea({
        ph_sensors: ['sensor.ph'],
        substrate_temperature_sensors: ['sensor.st'],
      }),
      PARENT,
      hassStates
    );

    expect(snapshot.ph!.avg).toBeCloseTo(6.2);
    expect(snapshot.substrateTemperature!.avg).toBe(21);
    expect(snapshot.feedEc).toBeNull();
  });
});

describe('computeSubareaEnvSnapshot — calculated-VPD resolution', () => {
  it('uses an explicitly configured non-calculated VPD sensor as-is', () => {
    const hassStates: HassStates = {
      'sensor.t': makeHassEntity('sensor.t', '22'),
      'sensor.h': makeHassEntity('sensor.h', '55'),
      'sensor.real_vpd': makeHassEntity('sensor.real_vpd', '1.1'),
    };

    const snapshot = computeSubareaEnvSnapshot(
      makeSubarea({
        temperature_sensor: 'sensor.t',
        humidity_sensor: 'sensor.h',
        vpd_sensor: 'sensor.real_vpd',
      }),
      PARENT,
      hassStates
    );

    expect(snapshot.vpdReadings!.entityIds).toEqual(['sensor.real_vpd']);
    expect(snapshot.vpd).toBeCloseTo(1.1);
  });

  it('resolves the name-based calculated-VPD entity for a temp/hum pair without a VPD sensor', () => {
    const hassStates: HassStates = {
      'sensor.t': makeHassEntity('sensor.t', '22'),
      'sensor.h': makeHassEntity('sensor.h', '55'),
      'sensor.tent_1_veg_area_calculated_vpd': makeHassEntity(
        'sensor.tent_1_veg_area_calculated_vpd',
        '1.2'
      ),
    };

    const snapshot = computeSubareaEnvSnapshot(
      makeSubarea({ temperature_sensor: 'sensor.t', humidity_sensor: 'sensor.h' }),
      PARENT,
      hassStates
    );

    expect(snapshot.vpdReadings!.entityIds).toEqual(['sensor.tent_1_veg_area_calculated_vpd']);
    expect(snapshot.vpd).toBeCloseTo(1.2);
  });

  it('falls back to the UUID-based calculated-VPD entity when the name-based one is unavailable', () => {
    const hassStates: HassStates = {
      'sensor.t': makeHassEntity('sensor.t', '22'),
      'sensor.h': makeHassEntity('sensor.h', '55'),
      'sensor.growspace_manager_gs1_subarea_sa1_calculated_vpd': makeHassEntity(
        'sensor.growspace_manager_gs1_subarea_sa1_calculated_vpd',
        '1.0'
      ),
    };

    const snapshot = computeSubareaEnvSnapshot(
      makeSubarea({ temperature_sensor: 'sensor.t', humidity_sensor: 'sensor.h' }),
      PARENT,
      hassStates
    );

    expect(snapshot.vpdReadings!.entityIds).toEqual([
      'sensor.growspace_manager_gs1_subarea_sa1_calculated_vpd',
    ]);
    expect(snapshot.vpd).toBeCloseTo(1.0);
  });

  it('resolves one suffixed calculated-VPD entity per temp/hum pair', () => {
    const hassStates: HassStates = {
      'sensor.t1': makeHassEntity('sensor.t1', '22'),
      'sensor.t2': makeHassEntity('sensor.t2', '24'),
      'sensor.h1': makeHassEntity('sensor.h1', '50'),
      'sensor.h2': makeHassEntity('sensor.h2', '60'),
      'sensor.tent_1_veg_area_calculated_vpd_1': makeHassEntity(
        'sensor.tent_1_veg_area_calculated_vpd_1',
        '1.3'
      ),
      'sensor.tent_1_veg_area_calculated_vpd_2': makeHassEntity(
        'sensor.tent_1_veg_area_calculated_vpd_2',
        '1.5'
      ),
    };

    const snapshot = computeSubareaEnvSnapshot(
      makeSubarea({
        temperature_sensors: ['sensor.t1', 'sensor.t2'],
        humidity_sensors: ['sensor.h1', 'sensor.h2'],
      }),
      PARENT,
      hassStates
    );

    expect(snapshot.vpdReadings!.entityIds).toEqual([
      'sensor.tent_1_veg_area_calculated_vpd_1',
      'sensor.tent_1_veg_area_calculated_vpd_2',
    ]);
    expect(snapshot.vpdReadings!.perSensor).toEqual([1.3, 1.5]);
  });

  it('keeps the constructible UUID-based ID with a null reading when neither entity is available', () => {
    const hassStates: HassStates = {
      'sensor.t': makeHassEntity('sensor.t', '22'),
      'sensor.h': makeHassEntity('sensor.h', '55'),
    };

    const snapshot = computeSubareaEnvSnapshot(
      makeSubarea({ temperature_sensor: 'sensor.t', humidity_sensor: 'sensor.h' }),
      { growspaceId: 'gs1' },
      hassStates
    );

    expect(snapshot.vpdReadings!.entityIds).toEqual([
      'sensor.growspace_manager_gs1_subarea_sa1_calculated_vpd',
    ]);
    expect(snapshot.vpdReadings!.perSensor).toEqual([null]);
    expect(snapshot.vpd).toBeNull();
  });
});

describe('subareaEnvSnapshots$ atom and setSubareaEnvSnapshot', () => {
  it('starts as an empty map', () => {
    expect(subareaEnvSnapshots$.get().size).toBe(0);
  });

  it('stores the computed snapshot keyed by subareaId', () => {
    const hassStates: HassStates = {
      'sensor.t': makeHassEntity('sensor.t', '23.5'),
    };

    setSubareaEnvSnapshot(
      'sa1',
      makeSubarea({ temperature_sensor: 'sensor.t' }),
      PARENT,
      hassStates
    );

    expect(subareaEnvSnapshots$.get().get('sa1')!.temperature).toBe(23.5);
  });

  it('stores independent snapshots for different subareas without mutating the previous map', () => {
    const hassStates: HassStates = {
      'sensor.t1': makeHassEntity('sensor.t1', '20'),
      'sensor.t2': makeHassEntity('sensor.t2', '26'),
    };

    setSubareaEnvSnapshot(
      'sa1',
      makeSubarea({ temperature_sensor: 'sensor.t1' }),
      PARENT,
      hassStates
    );
    const firstMap = subareaEnvSnapshots$.get();
    setSubareaEnvSnapshot(
      'sa2',
      makeSubarea({ temperature_sensor: 'sensor.t2' }, { id: 'sa2', name: 'Flower Area' }),
      PARENT,
      hassStates
    );

    expect(subareaEnvSnapshots$.get()).not.toBe(firstMap);
    expect(subareaEnvSnapshots$.get().get('sa1')!.temperature).toBe(20);
    expect(subareaEnvSnapshots$.get().get('sa2')!.temperature).toBe(26);
  });
});

describe('envSnapshotEntityIds', () => {
  it('collects entity IDs across all SensorReadings fields, including resolved VPD IDs', () => {
    const hassStates: HassStates = {
      'sensor.t': makeHassEntity('sensor.t', '22'),
      'sensor.h': makeHassEntity('sensor.h', '55'),
      'sensor.ph': makeHassEntity('sensor.ph', '6.0'),
    };

    const snapshot = computeSubareaEnvSnapshot(
      makeSubarea({
        temperature_sensor: 'sensor.t',
        humidity_sensor: 'sensor.h',
        ph_sensors: ['sensor.ph'],
      }),
      PARENT,
      hassStates
    );

    const ids = envSnapshotEntityIds(snapshot);
    expect(ids).toContain('sensor.t');
    expect(ids).toContain('sensor.h');
    expect(ids).toContain('sensor.ph');
    // Neither calculated-VPD entity exists — the name-based ID wins the
    // constructible fallback (legacy `calculatedId || uuidId` priority).
    expect(ids).toContain('sensor.tent_1_veg_area_calculated_vpd');
  });

  it('returns an empty array for a snapshot without configured sensors', () => {
    expect(envSnapshotEntityIds(computeSubareaEnvSnapshot(makeSubarea(), PARENT, {}))).toEqual([]);
  });
});
