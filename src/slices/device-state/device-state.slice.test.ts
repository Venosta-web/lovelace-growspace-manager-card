/**
 * DeviceState slice unit tests.
 *
 * Covers: computeDeviceSnapshot + computeSubareaDeviceSnapshot (pure adapters
 * over the shared core), deviceSnapshots$ / subareaDeviceSnapshots$ atoms,
 * the setDeviceSnapshot / setSubareaDeviceSnapshot bootstrap writes, and
 * deviceSnapshotEntityIds.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { GrowspaceDevice } from '../../services/types';
import { createGrowspaceDevice } from '../../services/types';
import type { Subarea } from '../subarea/schema';
import {
  computeDeviceSnapshot,
  computeSubareaDeviceSnapshot,
  deviceSnapshotEntityIds,
  deviceSnapshots$,
  setDeviceSnapshot,
  setSubareaDeviceSnapshot,
  subareaDeviceSnapshots$,
} from './index';
import type { DeviceSnapshot } from './index';

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

/** Build a minimal Subarea for tests. */
function makeSubarea(
  environmentConfig: Subarea['environment_config'] = {},
  overrides: Partial<Omit<Subarea, 'environment_config'>> = {}
): Subarea {
  return { id: 'sa1', name: 'Veg Area', environment_config: environmentConfig, ...overrides };
}

// ---------------------------------------------------------------------------
// State reset
// ---------------------------------------------------------------------------

beforeEach(() => {
  deviceSnapshots$.set(new Map());
  subareaDeviceSnapshots$.set(new Map());
});

// ---------------------------------------------------------------------------
// Cycle 1 — light sensor percentage (tracer bullet)
// ---------------------------------------------------------------------------

describe('computeDeviceSnapshot — light sensor percentage', () => {
  it('returns value as rounded percentage for a single light sensor with unit %', () => {
    const device = makeDevice({
      environmentAttributes: { lightSensors: ['sensor.tent_1_light'] },
    });
    const hassStates: HassStates = {
      'sensor.tent_1_light': makeHassEntity('sensor.tent_1_light', '70.4', {
        unit_of_measurement: '%',
      }),
    };

    const snapshot = computeDeviceSnapshot(device, hassStates);

    expect(snapshot.lightSensors).not.toBeNull();
    expect(snapshot.lightSensors!.value).toBe('70%');
    expect(snapshot.lightSensors!.entityIds).toEqual(['sensor.tent_1_light']);
  });
});

// ---------------------------------------------------------------------------
// Cycle 2 — light sensor on/off (non-percentage unit or binary state)
// ---------------------------------------------------------------------------

describe('computeDeviceSnapshot — light sensor on/off', () => {
  it('returns "On" for a light sensor with state "on" and no percentage unit', () => {
    const device = makeDevice({
      environmentAttributes: { lightSensors: ['binary_sensor.tent_1_light'] },
    });
    const hassStates: HassStates = {
      'binary_sensor.tent_1_light': makeHassEntity('binary_sensor.tent_1_light', 'on', {}),
    };

    const snapshot = computeDeviceSnapshot(device, hassStates);

    expect(snapshot.lightSensors!.value).toBe('On');
  });

  it('returns "Off" for a light sensor with state "off"', () => {
    const device = makeDevice({
      environmentAttributes: { lightSensors: ['binary_sensor.tent_1_light'] },
    });
    const hassStates: HassStates = {
      'binary_sensor.tent_1_light': makeHassEntity('binary_sensor.tent_1_light', 'off', {}),
    };

    const snapshot = computeDeviceSnapshot(device, hassStates);

    expect(snapshot.lightSensors!.value).toBe('Off');
  });

  it('resolves single lightSensor (singular) field as entity list', () => {
    const device = makeDevice({
      environmentAttributes: { lightSensor: 'sensor.light_single' },
    });
    const hassStates: HassStates = {
      'sensor.light_single': makeHassEntity('sensor.light_single', '55', {
        unit_of_measurement: '%',
      }),
    };

    const snapshot = computeDeviceSnapshot(device, hassStates);

    expect(snapshot.lightSensors!.value).toBe('55%');
  });
});

// ---------------------------------------------------------------------------
// Cycle 3 — light sensor unavailable/missing → undefined value
// ---------------------------------------------------------------------------

describe('computeDeviceSnapshot — light sensor unavailable state', () => {
  it.each([['unavailable'], ['unknown']])(
    'returns undefined value when light sensor state is "%s"',
    (state) => {
      const device = makeDevice({
        environmentAttributes: { lightSensors: ['sensor.tent_1_light'] },
      });
      const hassStates: HassStates = {
        'sensor.tent_1_light': makeHassEntity('sensor.tent_1_light', state, {}),
      };

      const snapshot = computeDeviceSnapshot(device, hassStates);

      expect(snapshot.lightSensors!.value).toBeUndefined();
    }
  );

  it('returns undefined value when light sensor entity is absent from hass states', () => {
    const device = makeDevice({
      environmentAttributes: { lightSensors: ['sensor.missing'] },
    });

    const snapshot = computeDeviceSnapshot(device, {});

    expect(snapshot.lightSensors!.value).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Cycle 4 — no entities configured → null
// ---------------------------------------------------------------------------

describe('computeDeviceSnapshot — no entities configured', () => {
  it('returns null for lightSensors when no light entity IDs are configured', () => {
    const device = makeDevice({ environmentAttributes: {} });

    const snapshot = computeDeviceSnapshot(device, {});

    expect(snapshot.lightSensors).toBeNull();
  });

  it('returns null for exhaustFans when no exhaust entity IDs are configured', () => {
    const device = makeDevice({ environmentAttributes: {} });

    const snapshot = computeDeviceSnapshot(device, {});

    expect(snapshot.exhaustFans).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Cycle 5 — on/off device types (parameterized across exhaust, circulation, humidifier, dehumidifier)
// ---------------------------------------------------------------------------

type OnOffDeviceConfig = {
  deviceType: 'exhaustFans' | 'circulationFans' | 'humidifiers' | 'dehumidifiers';
  entityAttr: keyof import('../../services/types').EnvironmentAttributes;
  entityId: string;
};

const ON_OFF_DEVICES: OnOffDeviceConfig[] = [
  {
    deviceType: 'exhaustFans',
    entityAttr: 'exhaustFanEntities',
    entityId: 'switch.tent_1_exhaust',
  },
  {
    deviceType: 'circulationFans',
    entityAttr: 'circulationFanEntities',
    entityId: 'switch.tent_1_circulation',
  },
  {
    deviceType: 'humidifiers',
    entityAttr: 'humidifierEntities',
    entityId: 'switch.tent_1_humidifier',
  },
  {
    deviceType: 'dehumidifiers',
    entityAttr: 'dehumidifierEntities',
    entityId: 'switch.tent_1_dehumidifier',
  },
];

describe('computeDeviceSnapshot — on/off device types (single entity)', () => {
  it.each(ON_OFF_DEVICES)(
    '$deviceType: returns "On" when the entity state is "on"',
    ({ deviceType, entityAttr, entityId }) => {
      const device = makeDevice({
        environmentAttributes: { [entityAttr]: [entityId] },
      });
      const hassStates: HassStates = {
        [entityId]: makeHassEntity(entityId, 'on', {}),
      };

      const snapshot = computeDeviceSnapshot(device, hassStates);

      expect(snapshot[deviceType]).not.toBeNull();
      expect(snapshot[deviceType]!.value).toBe('On');
      expect(snapshot[deviceType]!.entityIds).toEqual([entityId]);
    }
  );

  it.each(ON_OFF_DEVICES)(
    '$deviceType: returns "Off" when the entity state is "off"',
    ({ deviceType, entityAttr, entityId }) => {
      const device = makeDevice({
        environmentAttributes: { [entityAttr]: [entityId] },
      });
      const hassStates: HassStates = {
        [entityId]: makeHassEntity(entityId, 'off', {}),
      };

      const snapshot = computeDeviceSnapshot(device, hassStates);

      expect(snapshot[deviceType]!.value).toBe('Off');
    }
  );

  it.each(ON_OFF_DEVICES)(
    '$deviceType: returns undefined value when the entity is unavailable',
    ({ deviceType, entityAttr, entityId }) => {
      const device = makeDevice({
        environmentAttributes: { [entityAttr]: [entityId] },
      });
      const hassStates: HassStates = {
        [entityId]: makeHassEntity(entityId, 'unavailable', {}),
      };

      const snapshot = computeDeviceSnapshot(device, hassStates);

      expect(snapshot[deviceType]!.value).toBeUndefined();
    }
  );

  it.each(ON_OFF_DEVICES)(
    '$deviceType: resolves singular entity field (e.g. exhaustEntity) as single-entity list',
    ({ deviceType, entityId }) => {
      // Use singular field names where they exist
      const singularAttrMap: Partial<
        Record<
          OnOffDeviceConfig['deviceType'],
          keyof import('../../services/types').EnvironmentAttributes
        >
      > = {
        exhaustFans: 'exhaustEntity',
        circulationFans: 'circulationFanEntity',
        humidifiers: 'humidifierEntity',
        dehumidifiers: 'dehumidifierEntity',
      };
      const singularAttr = singularAttrMap[deviceType];
      if (!singularAttr) return;

      const device = makeDevice({
        environmentAttributes: { [singularAttr]: entityId },
      });
      const hassStates: HassStates = {
        [entityId]: makeHassEntity(entityId, 'on', {}),
      };

      const snapshot = computeDeviceSnapshot(device, hassStates);

      expect(snapshot[deviceType]!.value).toBe('On');
    }
  );
});

// ---------------------------------------------------------------------------
// Cycle 6 — multiple entities → "Multiple" with multiValues
// ---------------------------------------------------------------------------

describe('computeDeviceSnapshot — multiple entities', () => {
  it('returns value "Multiple" and multiValues list for multiple light sensors', () => {
    const device = makeDevice({
      environmentAttributes: {
        lightSensors: ['sensor.light_a', 'sensor.light_b'],
      },
    });
    const hassStates: HassStates = {
      'sensor.light_a': makeHassEntity('sensor.light_a', '80', { unit_of_measurement: '%' }),
      'sensor.light_b': makeHassEntity('sensor.light_b', '60', { unit_of_measurement: '%' }),
    };

    const snapshot = computeDeviceSnapshot(device, hassStates);

    expect(snapshot.lightSensors!.value).toBe('Multiple');
    expect(snapshot.lightSensors!.multiValues).toEqual(['80%', '60%']);
    expect(snapshot.lightSensors!.entityIds).toEqual(['sensor.light_a', 'sensor.light_b']);
  });

  it.each(ON_OFF_DEVICES)(
    '$deviceType: returns "Multiple" and multiValues for multiple on/off entities',
    ({ deviceType, entityAttr }) => {
      const ids = [`switch.device_a`, `switch.device_b`];
      const device = makeDevice({
        environmentAttributes: { [entityAttr]: ids },
      });
      const hassStates: HassStates = {
        'switch.device_a': makeHassEntity('switch.device_a', 'on', {}),
        'switch.device_b': makeHassEntity('switch.device_b', 'off', {}),
      };

      const snapshot = computeDeviceSnapshot(device, hassStates);

      expect(snapshot[deviceType]!.value).toBe('Multiple');
      expect(snapshot[deviceType]!.multiValues).toEqual(['On', 'Off']);
    }
  );

  it('excludes unavailable entities from multiValues but still returns "Multiple" value', () => {
    const device = makeDevice({
      environmentAttributes: {
        exhaustFanEntities: ['switch.fan_a', 'switch.fan_b'],
      },
    });
    const hassStates: HassStates = {
      'switch.fan_a': makeHassEntity('switch.fan_a', 'on', {}),
      'switch.fan_b': makeHassEntity('switch.fan_b', 'unavailable', {}),
    };

    const snapshot = computeDeviceSnapshot(device, hassStates);

    expect(snapshot.exhaustFans!.value).toBe('Multiple');
    expect(snapshot.exhaustFans!.multiValues).toEqual(['On']);
  });
});

// ---------------------------------------------------------------------------
// Cycle 7 — icon field is a non-empty string (MDI path)
// ---------------------------------------------------------------------------

describe('computeDeviceSnapshot — icon field', () => {
  it.each<[keyof DeviceSnapshot, import('../../services/types').EnvironmentAttributes]>([
    ['lightSensors', { lightSensors: ['sensor.light'] }],
    ['exhaustFans', { exhaustFanEntities: ['switch.exhaust'] }],
    ['circulationFans', { circulationFanEntities: ['switch.circ'] }],
    ['humidifiers', { humidifierEntities: ['switch.humi'] }],
    ['dehumidifiers', { dehumidifierEntities: ['switch.dehumi'] }],
  ])('%s entry has a non-empty icon string', (deviceType, attrs) => {
    const device = makeDevice({ environmentAttributes: attrs });
    const hassStates: HassStates = {};

    const snapshot = computeDeviceSnapshot(device, hassStates);

    expect(typeof snapshot[deviceType]!.icon).toBe('string');
    expect(snapshot[deviceType]!.icon.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Cycle 11 — light sensor numeric fallback (non-% unit, non-binary state)
// ---------------------------------------------------------------------------

describe('computeDeviceSnapshot — light sensor numeric fallback', () => {
  it('returns rounded integer string for a numeric lux state without a % unit', () => {
    const device = makeDevice({
      environmentAttributes: { lightSensors: ['sensor.tent_1_lux'] },
    });
    const hassStates: HassStates = {
      'sensor.tent_1_lux': makeHassEntity('sensor.tent_1_lux', '520.7', {
        unit_of_measurement: 'lux',
      }),
    };

    const snapshot = computeDeviceSnapshot(device, hassStates);

    expect(snapshot.lightSensors!.value).toBe('521');
  });

  it('returns undefined for a light sensor with an unrecognized non-numeric state', () => {
    const device = makeDevice({
      environmentAttributes: { lightSensors: ['sensor.tent_1_light'] },
    });
    const hassStates: HassStates = {
      'sensor.tent_1_light': makeHassEntity('sensor.tent_1_light', 'measuring', {}),
    };

    const snapshot = computeDeviceSnapshot(device, hassStates);

    expect(snapshot.lightSensors!.value).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Cycle 12 — on/off device numeric fallback (humidifier / dehumidifier)
// ---------------------------------------------------------------------------

describe('computeDeviceSnapshot — on/off device numeric fallback', () => {
  it.each([
    ['humidifiers', 'humidifierEntities', 'switch.humi'],
    ['dehumidifiers', 'dehumidifierEntities', 'switch.dehumi'],
  ] as const)(
    '%s: returns "On" when entity state is numeric "1"',
    (deviceType, entityAttr, entityId) => {
      const device = makeDevice({ environmentAttributes: { [entityAttr]: [entityId] } });
      const hassStates: HassStates = {
        [entityId]: makeHassEntity(entityId, '1', {}),
      };

      const snapshot = computeDeviceSnapshot(device, hassStates);

      expect(snapshot[deviceType]!.value).toBe('On');
    }
  );

  it.each([
    ['humidifiers', 'humidifierEntities', 'switch.humi'],
    ['dehumidifiers', 'dehumidifierEntities', 'switch.dehumi'],
  ] as const)(
    '%s: returns "Off" when entity state is numeric "0"',
    (deviceType, entityAttr, entityId) => {
      const device = makeDevice({ environmentAttributes: { [entityAttr]: [entityId] } });
      const hassStates: HassStates = {
        [entityId]: makeHassEntity(entityId, '0', {}),
      };

      const snapshot = computeDeviceSnapshot(device, hassStates);

      expect(snapshot[deviceType]!.value).toBe('Off');
    }
  );

  it('returns undefined for a humidifier with an unrecognized non-numeric state', () => {
    const device = makeDevice({
      environmentAttributes: { humidifierEntities: ['switch.humi'] },
    });
    const hassStates: HassStates = {
      'switch.humi': makeHassEntity('switch.humi', 'idle', {}),
    };

    const snapshot = computeDeviceSnapshot(device, hassStates);

    expect(snapshot.humidifiers!.value).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Cycle 13 — fan device binary domain with numeric state (line 114)
// ---------------------------------------------------------------------------

describe('computeDeviceSnapshot — fan device binary domain with numeric state', () => {
  it.each([
    ['switch', '1', 'On'],
    ['switch', '0', 'Off'],
    ['input_boolean', '1', 'On'],
    ['input_boolean', '0', 'Off'],
  ] as const)(
    '%s domain with numeric state "%s" shows "%s"',
    (domain, state, expected) => {
      const entityId = `${domain}.fan`;
      const device = makeDevice({
        environmentAttributes: { exhaustFanEntities: [entityId] },
      });
      const hassStates: HassStates = {
        [entityId]: makeHassEntity(entityId, state, {}),
      };

      const snapshot = computeDeviceSnapshot(device, hassStates);

      expect(snapshot.exhaustFans!.value).toBe(expected);
    }
  );
});

// ---------------------------------------------------------------------------
// Cycle 14 — fan device total fallthrough (non-fan, non-numeric, non-on/off)
// ---------------------------------------------------------------------------

describe('computeDeviceSnapshot — fan device unrecognized state', () => {
  it('returns undefined for a non-fan entity with an unrecognized non-numeric state', () => {
    const device = makeDevice({
      environmentAttributes: { exhaustFanEntities: ['sensor.fan'] },
    });
    const hassStates: HassStates = {
      'sensor.fan': makeHassEntity('sensor.fan', 'idle', {}),
    };

    const snapshot = computeDeviceSnapshot(device, hassStates);

    expect(snapshot.exhaustFans!.value).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Cycle 9 — HA fan entity (fan.* domain) chip display
// ---------------------------------------------------------------------------

describe('computeDeviceSnapshot — HA fan entity (fan.* domain)', () => {
  it('shows percentage when an exhaust fan entity is a HA fan entity with state "on"', () => {
    const device = makeDevice({
      environmentAttributes: { exhaustFanEntities: ['fan.tent_1_exhaust'] },
    });
    const hassStates: HassStates = {
      'fan.tent_1_exhaust': makeHassEntity('fan.tent_1_exhaust', 'on', { percentage: 70 }),
    };

    const snapshot = computeDeviceSnapshot(device, hassStates);

    expect(snapshot.exhaustFans!.value).toBe('70%');
  });

  it('shows "Off" when a HA fan entity state is "off"', () => {
    const device = makeDevice({
      environmentAttributes: { circulationFanEntities: ['fan.tent_1_circ'] },
    });
    const hassStates: HassStates = {
      'fan.tent_1_circ': makeHassEntity('fan.tent_1_circ', 'off', { percentage: 0 }),
    };

    const snapshot = computeDeviceSnapshot(device, hassStates);

    expect(snapshot.circulationFans!.value).toBe('Off');
  });

  it('shows raw integer for a speed sensor (numeric state, non-fan domain)', () => {
    const device = makeDevice({
      environmentAttributes: { exhaustFanEntities: ['sensor.tent_1_fan_speed'] },
    });
    const hassStates: HassStates = {
      'sensor.tent_1_fan_speed': makeHassEntity('sensor.tent_1_fan_speed', '5', {}),
    };

    const snapshot = computeDeviceSnapshot(device, hassStates);

    expect(snapshot.exhaustFans!.value).toBe('5');
  });

  it('still shows "On"/"Off" for a binary switch fan', () => {
    const device = makeDevice({
      environmentAttributes: { exhaustFanEntities: ['switch.tent_1_exhaust'] },
    });
    const hassStates: HassStates = {
      'switch.tent_1_exhaust': makeHassEntity('switch.tent_1_exhaust', 'on', {}),
    };

    const snapshot = computeDeviceSnapshot(device, hassStates);

    expect(snapshot.exhaustFans!.value).toBe('On');
  });

  it('shows "Multiple" with percentage multiValues for multiple HA fan entities', () => {
    const device = makeDevice({
      environmentAttributes: { circulationFanEntities: ['fan.circ_a', 'fan.circ_b'] },
    });
    const hassStates: HassStates = {
      'fan.circ_a': makeHassEntity('fan.circ_a', 'on', { percentage: 70 }),
      'fan.circ_b': makeHassEntity('fan.circ_b', 'on', { percentage: 50 }),
    };

    const snapshot = computeDeviceSnapshot(device, hassStates);

    expect(snapshot.circulationFans!.value).toBe('Multiple');
    expect(snapshot.circulationFans!.multiValues).toEqual(['70%', '50%']);
  });
});

// ---------------------------------------------------------------------------
// Cycle 8 — deviceSnapshots$ atom and setDeviceSnapshot bootstrap write
// ---------------------------------------------------------------------------

describe('deviceSnapshots$ atom and setDeviceSnapshot', () => {
  it('starts as an empty map', () => {
    expect(deviceSnapshots$.get().size).toBe(0);
  });

  it('setDeviceSnapshot stores the computed snapshot for the given growspaceId', () => {
    const device = makeDevice({
      environmentAttributes: { exhaustFanEntities: ['switch.exhaust'] },
    });
    const hassStates: HassStates = {
      'switch.exhaust': makeHassEntity('switch.exhaust', 'on', {}),
    };

    setDeviceSnapshot('gs1', device, hassStates);

    const snapshot = deviceSnapshots$.get().get('gs1');
    expect(snapshot).toBeDefined();
    expect(snapshot!.exhaustFans!.value).toBe('On');
  });

  it('setDeviceSnapshot overwrites a previous snapshot for the same growspaceId', () => {
    const device = makeDevice({
      environmentAttributes: { exhaustFanEntities: ['switch.exhaust'] },
    });
    const states1: HassStates = {
      'switch.exhaust': makeHassEntity('switch.exhaust', 'on', {}),
    };
    const states2: HassStates = {
      'switch.exhaust': makeHassEntity('switch.exhaust', 'off', {}),
    };

    setDeviceSnapshot('gs1', device, states1);
    setDeviceSnapshot('gs1', device, states2);

    expect(deviceSnapshots$.get().get('gs1')!.exhaustFans!.value).toBe('Off');
  });

// ---------------------------------------------------------------------------
// Cycle 10 — Speed sensor at 0 and 1 (issue #224)
// ---------------------------------------------------------------------------

describe('computeDeviceSnapshot — speed sensor at boundary values', () => {
  it('shows "0" for a speed sensor with state "0" (not "-")', () => {
    const device = makeDevice({
      environmentAttributes: { exhaustFanEntities: ['sensor.fan_speed'] },
    });
    const hassStates: HassStates = {
      'sensor.fan_speed': makeHassEntity('sensor.fan_speed', '0', {}),
    };

    const snapshot = computeDeviceSnapshot(device, hassStates);

    expect(snapshot.exhaustFans!.value).toBe('0');
  });

  it('shows "1" for a speed sensor with state "1" (not "-")', () => {
    const device = makeDevice({
      environmentAttributes: { circulationFanEntities: ['sensor.fan_speed'] },
    });
    const hassStates: HassStates = {
      'sensor.fan_speed': makeHassEntity('sensor.fan_speed', '1', {}),
    };

    const snapshot = computeDeviceSnapshot(device, hassStates);

    expect(snapshot.circulationFans!.value).toBe('1');
  });

  it('still shows "On" for a switch domain at state "1"', () => {
    const device = makeDevice({
      environmentAttributes: { exhaustFanEntities: ['switch.fan'] },
    });
    const hassStates: HassStates = {
      'switch.fan': makeHassEntity('switch.fan', 'on', {}),
    };

    const snapshot = computeDeviceSnapshot(device, hassStates);

    expect(snapshot.exhaustFans!.value).toBe('On');
  });

  it('still shows "Off" for an input_boolean domain at state "off"', () => {
    const device = makeDevice({
      environmentAttributes: { exhaustFanEntities: ['input_boolean.fan'] },
    });
    const hassStates: HassStates = {
      'input_boolean.fan': makeHassEntity('input_boolean.fan', 'off', {}),
    };

    const snapshot = computeDeviceSnapshot(device, hassStates);

    expect(snapshot.exhaustFans!.value).toBe('Off');
  });
});

  it('setDeviceSnapshot stores independent snapshots for different growspaces', () => {
    const device1 = makeDevice({
      deviceId: 'gs1',
      name: 'Tent 1',
      environmentAttributes: { exhaustFanEntities: ['switch.fan1'] },
    });
    const device2 = makeDevice({
      deviceId: 'gs2',
      name: 'Tent 2',
      environmentAttributes: { exhaustFanEntities: ['switch.fan2'] },
    });

    setDeviceSnapshot('gs1', device1, {
      'switch.fan1': makeHassEntity('switch.fan1', 'on', {}),
    });
    setDeviceSnapshot('gs2', device2, {
      'switch.fan2': makeHassEntity('switch.fan2', 'off', {}),
    });

    expect(deviceSnapshots$.get().get('gs1')!.exhaustFans!.value).toBe('On');
    expect(deviceSnapshots$.get().get('gs2')!.exhaustFans!.value).toBe('Off');
  });
});

// ---------------------------------------------------------------------------
// Cycle 15 — subarea adapter (ADR-0018): computeSubareaDeviceSnapshot
// ---------------------------------------------------------------------------

describe('computeSubareaDeviceSnapshot — environment_config device lists', () => {
  it.each([
    ['lightSensors', 'light_sensors', 'light.veg_light'],
    ['exhaustFans', 'exhaust_fan_entities', 'switch.veg_exhaust'],
    ['circulationFans', 'circulation_fan_entities', 'switch.veg_circ'],
    ['humidifiers', 'humidifier_entities', 'switch.veg_hum'],
    ['dehumidifiers', 'dehumidifier_entities', 'switch.veg_dehum'],
  ] as const)('%s: resolves entity IDs from environment_config.%s', (category, field, entityId) => {
    const hassStates: HassStates = {
      [entityId]: makeHassEntity(entityId, 'on', {}),
    };

    const snapshot = computeSubareaDeviceSnapshot(makeSubarea({ [field]: [entityId] }), hassStates);

    expect(snapshot[category]).not.toBeNull();
    expect(snapshot[category]!.value).toBe('On');
    expect(snapshot[category]!.entityIds).toEqual([entityId]);
  });

  it('returns null for every category when environment_config has no device lists', () => {
    const snapshot = computeSubareaDeviceSnapshot(makeSubarea(), {});

    expect(snapshot.lightSensors).toBeNull();
    expect(snapshot.exhaustFans).toBeNull();
    expect(snapshot.circulationFans).toBeNull();
    expect(snapshot.humidifiers).toBeNull();
    expect(snapshot.dehumidifiers).toBeNull();
  });

  it('applies Fan Entity Mode detection (ADR-0008) to subarea fan entities', () => {
    const hassStates: HassStates = {
      'fan.veg_exhaust': makeHassEntity('fan.veg_exhaust', 'on', { percentage: 70 }),
      'sensor.veg_circ_speed': makeHassEntity('sensor.veg_circ_speed', '5', {}),
    };

    const snapshot = computeSubareaDeviceSnapshot(
      makeSubarea({
        exhaust_fan_entities: ['fan.veg_exhaust'],
        circulation_fan_entities: ['sensor.veg_circ_speed'],
      }),
      hassStates
    );

    expect(snapshot.exhaustFans!.value).toBe('70%');
    expect(snapshot.circulationFans!.value).toBe('5');
  });

  it('rounds a percentage light sensor like the growspace adapter', () => {
    const hassStates: HassStates = {
      'sensor.veg_light': makeHassEntity('sensor.veg_light', '70.4', {
        unit_of_measurement: '%',
      }),
    };

    const snapshot = computeSubareaDeviceSnapshot(
      makeSubarea({ light_sensors: ['sensor.veg_light'] }),
      hassStates
    );

    expect(snapshot.lightSensors!.value).toBe('70%');
  });

  it('returns "Multiple" with multiValues for multi-entity categories', () => {
    const hassStates: HassStates = {
      'switch.hum_a': makeHassEntity('switch.hum_a', 'on', {}),
      'switch.hum_b': makeHassEntity('switch.hum_b', 'off', {}),
    };

    const snapshot = computeSubareaDeviceSnapshot(
      makeSubarea({ humidifier_entities: ['switch.hum_a', 'switch.hum_b'] }),
      hassStates
    );

    expect(snapshot.humidifiers!.value).toBe('Multiple');
    expect(snapshot.humidifiers!.multiValues).toEqual(['On', 'Off']);
  });

  it('produces the same snapshot as the growspace adapter for equivalent entity lists (shared core)', () => {
    const hassStates: HassStates = {
      'sensor.light': makeHassEntity('sensor.light', '80', { unit_of_measurement: '%' }),
      'fan.exhaust': makeHassEntity('fan.exhaust', 'on', { percentage: 40 }),
      'switch.hum': makeHassEntity('switch.hum', 'off', {}),
    };

    const fromSubarea = computeSubareaDeviceSnapshot(
      makeSubarea({
        light_sensors: ['sensor.light'],
        exhaust_fan_entities: ['fan.exhaust'],
        humidifier_entities: ['switch.hum'],
      }),
      hassStates
    );
    const fromGrowspace = computeDeviceSnapshot(
      makeDevice({
        environmentAttributes: {
          lightSensors: ['sensor.light'],
          exhaustFanEntities: ['fan.exhaust'],
          humidifierEntities: ['switch.hum'],
        },
      }),
      hassStates
    );

    expect(fromSubarea).toEqual(fromGrowspace);
  });
});

// ---------------------------------------------------------------------------
// Cycle 16 — subareaDeviceSnapshots$ atom and setSubareaDeviceSnapshot
// ---------------------------------------------------------------------------

describe('subareaDeviceSnapshots$ atom and setSubareaDeviceSnapshot', () => {
  it('starts as an empty map', () => {
    expect(subareaDeviceSnapshots$.get().size).toBe(0);
  });

  it('stores the computed snapshot keyed by subareaId', () => {
    const hassStates: HassStates = {
      'switch.veg_exhaust': makeHassEntity('switch.veg_exhaust', 'on', {}),
    };

    setSubareaDeviceSnapshot(
      'sa1',
      makeSubarea({ exhaust_fan_entities: ['switch.veg_exhaust'] }),
      hassStates
    );

    const snapshot = subareaDeviceSnapshots$.get().get('sa1');
    expect(snapshot).toBeDefined();
    expect(snapshot!.exhaustFans!.value).toBe('On');
  });

  it('overwrites a previous snapshot for the same subareaId', () => {
    const subarea = makeSubarea({ exhaust_fan_entities: ['switch.veg_exhaust'] });

    setSubareaDeviceSnapshot('sa1', subarea, {
      'switch.veg_exhaust': makeHassEntity('switch.veg_exhaust', 'on', {}),
    });
    setSubareaDeviceSnapshot('sa1', subarea, {
      'switch.veg_exhaust': makeHassEntity('switch.veg_exhaust', 'off', {}),
    });

    expect(subareaDeviceSnapshots$.get().get('sa1')!.exhaustFans!.value).toBe('Off');
  });

  it('stores independent snapshots for different subareas without touching deviceSnapshots$', () => {
    setSubareaDeviceSnapshot(
      'sa1',
      makeSubarea({ exhaust_fan_entities: ['switch.fan1'] }, { id: 'sa1' }),
      { 'switch.fan1': makeHassEntity('switch.fan1', 'on', {}) }
    );
    setSubareaDeviceSnapshot(
      'sa2',
      makeSubarea({ exhaust_fan_entities: ['switch.fan2'] }, { id: 'sa2' }),
      { 'switch.fan2': makeHassEntity('switch.fan2', 'off', {}) }
    );

    expect(subareaDeviceSnapshots$.get().get('sa1')!.exhaustFans!.value).toBe('On');
    expect(subareaDeviceSnapshots$.get().get('sa2')!.exhaustFans!.value).toBe('Off');
    expect(deviceSnapshots$.get().size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Cycle 17 — deviceSnapshotEntityIds
// ---------------------------------------------------------------------------

describe('deviceSnapshotEntityIds', () => {
  it('collects entity IDs across all configured categories', () => {
    const snapshot = computeSubareaDeviceSnapshot(
      makeSubarea({
        light_sensors: ['sensor.light'],
        exhaust_fan_entities: ['fan.ex_a', 'fan.ex_b'],
        humidifier_entities: ['switch.hum'],
      }),
      {}
    );

    expect(deviceSnapshotEntityIds(snapshot)).toEqual([
      'sensor.light',
      'fan.ex_a',
      'fan.ex_b',
      'switch.hum',
    ]);
  });

  it('returns an empty array when no categories are configured', () => {
    const snapshot = computeSubareaDeviceSnapshot(makeSubarea(), {});

    expect(deviceSnapshotEntityIds(snapshot)).toEqual([]);
  });
});
