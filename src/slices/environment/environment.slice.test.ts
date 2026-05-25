/**
 * Environment slice unit tests.
 *
 * Covers: computeEnvSnapshot (pure), envSnapshots$ atom, and setEnvSnapshot bootstrap write.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { GrowspaceDevice } from '../../services/types';
import { createGrowspaceDevice } from '../../services/types';
import { computeEnvSnapshot, envSnapshots$, setEnvSnapshot } from './index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type HassStates = Record<string, HassEntity>;

function makeHassEntity(
  entityId: string,
  state: string,
  attributes: Record<string, unknown> = {},
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
        {},
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
        { vpd: 1.1 },
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
        { vpd: 1.6 },
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
        { vpd: 2.1 },
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
        { co2: 800 },
      ),
    };

    const snapshot = computeEnvSnapshot(device, hassStates);

    expect(snapshot.co2).toBeNull();
  });

  it('returns null co2 for a dry growspace', () => {
    const device = makeDevice({ type: 'dry' as GrowspaceDevice['type'] });
    const hassStates: HassStates = {
      'binary_sensor.dry_optimal_drying': makeHassEntity(
        'binary_sensor.dry_optimal_drying',
        'on',
        { co2: 800 },
      ),
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
        { temperature: 22 },
      ),
    };
    const states2: HassStates = {
      'binary_sensor.tent_2_optimal_conditions': makeHassEntity(
        'binary_sensor.tent_2_optimal_conditions',
        'on',
        { temperature: 27 },
      ),
    };

    setEnvSnapshot('gs1', device1, states1);
    setEnvSnapshot('gs2', device2, states2);

    expect(envSnapshots$.get().get('gs1')!.temperature).toBe(22);
    expect(envSnapshots$.get().get('gs2')!.temperature).toBe(27);
  });
});
