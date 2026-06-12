/**
 * Environment slice unit tests.
 *
 * Covers: computeEnvSnapshot (pure), computeSubareaEnvSnapshot (pure),
 * envSnapshots$ atom, and setEnvSnapshot bootstrap write.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { EnvironmentConfig, GrowspaceDevice, Subarea } from '../../services/types';
import { createGrowspaceDevice } from '../../services/types';
import {
  computeEnvSnapshot,
  computeSubareaEnvSnapshot,
  envSnapshots$,
  setEnvSnapshot,
} from './index';
import { EnvSnapshotSchema } from './schema';

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
// computeSubareaEnvSnapshot — subarea-scoped snapshots
// ---------------------------------------------------------------------------

/** Build a minimal Subarea for tests. */
function makeSubarea(
  environment_config: EnvironmentConfig = {},
  overrides: Partial<Omit<Subarea, 'environment_config'>> = {}
): Subarea {
  return { id: 'sa1', name: 'Veg Shelf', environment_config, ...overrides };
}

// Parent growspace identity used for calculated-VPD entity ID resolution
const GROWSPACE = { id: 'gs1', name: 'Tent 1' };

// "Tent 1 Veg Shelf Calculated VPD" → sensor.tent_1_veg_shelf_calculated_vpd
const CALC_NAME_ID = 'sensor.tent_1_veg_shelf_calculated_vpd';
const CALC_UUID_ID = 'sensor.growspace_manager_gs1_subarea_sa1_calculated_vpd';

describe('computeSubareaEnvSnapshot — temperature and humidity', () => {
  it('averages the subarea temperature and humidity sensors', () => {
    const subarea = makeSubarea({
      temperature_sensors: ['sensor.sa_t1', 'sensor.sa_t2'],
      humidity_sensors: ['sensor.sa_h1', 'sensor.sa_h2'],
    });
    const hassStates: HassStates = {
      'sensor.sa_t1': makeHassEntity('sensor.sa_t1', '22'),
      'sensor.sa_t2': makeHassEntity('sensor.sa_t2', '26'),
      'sensor.sa_h1': makeHassEntity('sensor.sa_h1', '50'),
      'sensor.sa_h2': makeHassEntity('sensor.sa_h2', '70'),
    };

    const snapshot = computeSubareaEnvSnapshot(subarea, hassStates, GROWSPACE);

    expect(snapshot.temperature).toBe(24);
    expect(snapshot.humidity).toBe(60);
  });

  it('falls back to the single temperature_sensor / humidity_sensor fields', () => {
    const subarea = makeSubarea({
      temperature_sensor: 'sensor.sa_t1',
      humidity_sensor: 'sensor.sa_h1',
    });
    const hassStates: HassStates = {
      'sensor.sa_t1': makeHassEntity('sensor.sa_t1', '23.5'),
      'sensor.sa_h1': makeHassEntity('sensor.sa_h1', '55'),
    };

    const snapshot = computeSubareaEnvSnapshot(subarea, hassStates, GROWSPACE);

    expect(snapshot.temperature).toBe(23.5);
    expect(snapshot.humidity).toBe(55);
  });

  it('returns null temperature and humidity when no sensors are configured', () => {
    const snapshot = computeSubareaEnvSnapshot(makeSubarea(), {}, GROWSPACE);

    expect(snapshot.temperature).toBeNull();
    expect(snapshot.humidity).toBeNull();
  });

  it('returns null temperature when all configured sensors are unavailable', () => {
    const subarea = makeSubarea({ temperature_sensors: ['sensor.sa_t1'] });
    const hassStates: HassStates = {
      'sensor.sa_t1': makeHassEntity('sensor.sa_t1', 'unavailable'),
    };

    const snapshot = computeSubareaEnvSnapshot(subarea, hassStates, GROWSPACE);

    expect(snapshot.temperature).toBeNull();
  });
});

describe('computeSubareaEnvSnapshot — VPD', () => {
  it('uses an explicitly configured VPD sensor for a temp/hum pair', () => {
    const subarea = makeSubarea({
      temperature_sensors: ['sensor.sa_t1'],
      humidity_sensors: ['sensor.sa_h1'],
      vpd_sensors: ['sensor.sa_vpd'],
    });
    const hassStates: HassStates = {
      'sensor.sa_t1': makeHassEntity('sensor.sa_t1', '24'),
      'sensor.sa_h1': makeHassEntity('sensor.sa_h1', '60'),
      'sensor.sa_vpd': makeHassEntity('sensor.sa_vpd', '1.15'),
    };

    const snapshot = computeSubareaEnvSnapshot(subarea, hassStates, GROWSPACE);

    expect(snapshot.vpd).toBeCloseTo(1.15);
  });

  it('averages explicit VPD sensors across multiple temp/hum pairs', () => {
    const subarea = makeSubarea({
      temperature_sensors: ['sensor.sa_t1', 'sensor.sa_t2'],
      humidity_sensors: ['sensor.sa_h1', 'sensor.sa_h2'],
      vpd_sensors: ['sensor.sa_vpd1', 'sensor.sa_vpd2'],
    });
    const hassStates: HassStates = {
      'sensor.sa_t1': makeHassEntity('sensor.sa_t1', '24'),
      'sensor.sa_t2': makeHassEntity('sensor.sa_t2', '24'),
      'sensor.sa_h1': makeHassEntity('sensor.sa_h1', '60'),
      'sensor.sa_h2': makeHassEntity('sensor.sa_h2', '60'),
      'sensor.sa_vpd1': makeHassEntity('sensor.sa_vpd1', '1.0'),
      'sensor.sa_vpd2': makeHassEntity('sensor.sa_vpd2', '1.4'),
    };

    const snapshot = computeSubareaEnvSnapshot(subarea, hassStates, GROWSPACE);

    expect(snapshot.vpd).toBeCloseTo(1.2);
  });

  it('falls back to the name-slug calculated-VPD entity when no VPD sensor is configured', () => {
    const subarea = makeSubarea({
      temperature_sensors: ['sensor.sa_t1'],
      humidity_sensors: ['sensor.sa_h1'],
    });
    const hassStates: HassStates = {
      'sensor.sa_t1': makeHassEntity('sensor.sa_t1', '24'),
      'sensor.sa_h1': makeHassEntity('sensor.sa_h1', '60'),
      [CALC_NAME_ID]: makeHassEntity(CALC_NAME_ID, '0.95'),
    };

    const snapshot = computeSubareaEnvSnapshot(subarea, hassStates, GROWSPACE);

    expect(snapshot.vpd).toBeCloseTo(0.95);
  });

  it('falls back to the UUID-based calculated-VPD entity when the name-slug one is unavailable', () => {
    const subarea = makeSubarea({
      temperature_sensors: ['sensor.sa_t1'],
      humidity_sensors: ['sensor.sa_h1'],
    });
    const hassStates: HassStates = {
      'sensor.sa_t1': makeHassEntity('sensor.sa_t1', '24'),
      'sensor.sa_h1': makeHassEntity('sensor.sa_h1', '60'),
      [CALC_NAME_ID]: makeHassEntity(CALC_NAME_ID, 'unavailable'),
      [CALC_UUID_ID]: makeHassEntity(CALC_UUID_ID, '0.9'),
    };

    const snapshot = computeSubareaEnvSnapshot(subarea, hassStates, GROWSPACE);

    expect(snapshot.vpd).toBeCloseTo(0.9);
  });

  it('resolves per-pair suffixed calculated-VPD entities when there are multiple pairs', () => {
    const subarea = makeSubarea({
      temperature_sensors: ['sensor.sa_t1', 'sensor.sa_t2'],
      humidity_sensors: ['sensor.sa_h1', 'sensor.sa_h2'],
    });
    const hassStates: HassStates = {
      'sensor.sa_t1': makeHassEntity('sensor.sa_t1', '24'),
      'sensor.sa_t2': makeHassEntity('sensor.sa_t2', '24'),
      'sensor.sa_h1': makeHassEntity('sensor.sa_h1', '60'),
      'sensor.sa_h2': makeHassEntity('sensor.sa_h2', '60'),
      // "Tent 1 Veg Shelf Calculated VPD 1" / "... 2"
      [`${CALC_NAME_ID}_1`]: makeHassEntity(`${CALC_NAME_ID}_1`, '1.0'),
      [`${CALC_NAME_ID}_2`]: makeHassEntity(`${CALC_NAME_ID}_2`, '1.4'),
    };

    const snapshot = computeSubareaEnvSnapshot(subarea, hassStates, GROWSPACE);

    expect(snapshot.vpd).toBeCloseTo(1.2);
  });

  it('ignores stale calculated-VPD IDs stored in vpd_sensors and re-resolves them', () => {
    const staleId = 'sensor.growspace_manager_old_subarea_old_calculated_vpd';
    const subarea = makeSubarea({
      temperature_sensors: ['sensor.sa_t1'],
      humidity_sensors: ['sensor.sa_h1'],
      vpd_sensors: [staleId],
    });
    const hassStates: HassStates = {
      'sensor.sa_t1': makeHassEntity('sensor.sa_t1', '24'),
      'sensor.sa_h1': makeHassEntity('sensor.sa_h1', '60'),
      [staleId]: makeHassEntity(staleId, '9.9'),
      [CALC_NAME_ID]: makeHassEntity(CALC_NAME_ID, '1.05'),
    };

    const snapshot = computeSubareaEnvSnapshot(subarea, hassStates, GROWSPACE);

    expect(snapshot.vpd).toBeCloseTo(1.05);
  });

  it('returns null vpd without growspace context when only calculated entities exist', () => {
    const subarea = makeSubarea({
      temperature_sensors: ['sensor.sa_t1'],
      humidity_sensors: ['sensor.sa_h1'],
    });
    const hassStates: HassStates = {
      'sensor.sa_t1': makeHassEntity('sensor.sa_t1', '24'),
      'sensor.sa_h1': makeHassEntity('sensor.sa_h1', '60'),
      [CALC_NAME_ID]: makeHassEntity(CALC_NAME_ID, '0.95'),
      [CALC_UUID_ID]: makeHassEntity(CALC_UUID_ID, '0.9'),
    };

    const snapshot = computeSubareaEnvSnapshot(subarea, hassStates);

    expect(snapshot.vpd).toBeNull();
  });

  it('averages explicit VPD sensors when there are no temp/hum pairs', () => {
    const subarea = makeSubarea({ vpd_sensors: ['sensor.sa_vpd1', 'sensor.sa_vpd2'] });
    const hassStates: HassStates = {
      'sensor.sa_vpd1': makeHassEntity('sensor.sa_vpd1', '1.0'),
      'sensor.sa_vpd2': makeHassEntity('sensor.sa_vpd2', '1.2'),
    };

    const snapshot = computeSubareaEnvSnapshot(subarea, hassStates, GROWSPACE);

    expect(snapshot.vpd).toBeCloseTo(1.1);
  });

  it('returns null vpd when nothing is configured or resolvable', () => {
    const snapshot = computeSubareaEnvSnapshot(makeSubarea(), {}, GROWSPACE);

    expect(snapshot.vpd).toBeNull();
  });

  it('returns null vpdStatus at subarea scope even when vpd resolves', () => {
    const subarea = makeSubarea({
      temperature_sensors: ['sensor.sa_t1'],
      humidity_sensors: ['sensor.sa_h1'],
      vpd_sensors: ['sensor.sa_vpd'],
    });
    const hassStates: HassStates = {
      'sensor.sa_t1': makeHassEntity('sensor.sa_t1', '24'),
      'sensor.sa_h1': makeHassEntity('sensor.sa_h1', '60'),
      'sensor.sa_vpd': makeHassEntity('sensor.sa_vpd', '1.15'),
    };

    const snapshot = computeSubareaEnvSnapshot(subarea, hassStates, GROWSPACE);

    expect(snapshot.vpdStatus).toBeNull();
  });
});

describe('computeSubareaEnvSnapshot — co2', () => {
  it('returns co2 from the configured co2_sensor', () => {
    const subarea = makeSubarea({ co2_sensor: 'sensor.sa_co2' });
    const hassStates: HassStates = {
      'sensor.sa_co2': makeHassEntity('sensor.sa_co2', '850'),
    };

    const snapshot = computeSubareaEnvSnapshot(subarea, hassStates, GROWSPACE);

    expect(snapshot.co2).toBe(850);
  });

  it('returns null co2 when no co2_sensor is configured', () => {
    const snapshot = computeSubareaEnvSnapshot(makeSubarea(), {}, GROWSPACE);

    expect(snapshot.co2).toBeNull();
  });
});

describe('computeSubareaEnvSnapshot — secondary sensors', () => {
  it('returns readings for each configured subarea secondary sensor list', () => {
    const subarea = makeSubarea({
      substrate_temperature_sensors: ['sensor.sa_st1', 'sensor.sa_st2'],
      ph_sensors: ['sensor.sa_ph'],
      feed_ec_sensors: ['sensor.sa_feed_ec'],
      bulk_ec_sensors: ['sensor.sa_bulk_ec'],
      pore_ec_sensors: ['sensor.sa_pore_ec'],
    });
    const hassStates: HassStates = {
      'sensor.sa_st1': makeHassEntity('sensor.sa_st1', '20'),
      'sensor.sa_st2': makeHassEntity('sensor.sa_st2', '22'),
      'sensor.sa_ph': makeHassEntity('sensor.sa_ph', '6.1'),
      'sensor.sa_feed_ec': makeHassEntity('sensor.sa_feed_ec', '2.2'),
      'sensor.sa_bulk_ec': makeHassEntity('sensor.sa_bulk_ec', '1.9'),
      'sensor.sa_pore_ec': makeHassEntity('sensor.sa_pore_ec', '2.4'),
    };

    const snapshot = computeSubareaEnvSnapshot(subarea, hassStates, GROWSPACE);

    expect(snapshot.substrateTemperature).toEqual({
      avg: 21,
      sum: 42,
      perSensor: [20, 22],
      entityIds: ['sensor.sa_st1', 'sensor.sa_st2'],
    });
    expect(snapshot.ph!.avg).toBe(6.1);
    expect(snapshot.feedEc!.avg).toBe(2.2);
    expect(snapshot.bulkEc!.avg).toBe(1.9);
    expect(snapshot.poreEc!.avg).toBe(2.4);
  });

  it('returns null for secondary sensors when none are configured', () => {
    const snapshot = computeSubareaEnvSnapshot(makeSubarea(), {}, GROWSPACE);

    expect(snapshot.substrateTemperature).toBeNull();
    expect(snapshot.ph).toBeNull();
    expect(snapshot.feedEc).toBeNull();
    expect(snapshot.bulkEc).toBeNull();
    expect(snapshot.poreEc).toBeNull();
  });
});

describe('computeSubareaEnvSnapshot — fields not applicable at subarea scope', () => {
  it('resolves growspace-only fields to null/false in the shared EnvSnapshot shape', () => {
    const snapshot = computeSubareaEnvSnapshot(makeSubarea(), {}, GROWSPACE);

    expect(snapshot.isLightsOn).toBeNull();
    expect(snapshot.hasLightSensor).toBe(false);
    expect(snapshot.dli).toBeNull();
    expect(snapshot.optimalConditions).toBeNull();
    expect(snapshot.soilMoisture).toBeNull();
    expect(snapshot.runoffEc).toBeNull();
    expect(snapshot.drainVolume).toBeNull();
    expect(snapshot.irrigationFlow).toBeNull();
    expect(snapshot.power).toBeNull();
    expect(snapshot.energy).toBeNull();
  });

  it('produces a snapshot that validates against EnvSnapshotSchema', () => {
    const subarea = makeSubarea({
      temperature_sensors: ['sensor.sa_t1'],
      humidity_sensors: ['sensor.sa_h1'],
    });
    const hassStates: HassStates = {
      'sensor.sa_t1': makeHassEntity('sensor.sa_t1', '24'),
      'sensor.sa_h1': makeHassEntity('sensor.sa_h1', '60'),
    };

    const snapshot = computeSubareaEnvSnapshot(subarea, hassStates, GROWSPACE);

    expect(() => EnvSnapshotSchema.parse(snapshot)).not.toThrow();
  });
});
