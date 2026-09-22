import { describe, expect, it } from 'vitest';
import { createInitialSM } from '../../dialogs/config-dialog-sm';
import {
  applyEnvironmentChange,
  environmentChangeVerdict,
  type ConfigureEnvironmentActionData,
  type ConfigureExhaustFanActionData,
  type EnvironmentChangeAdapter,
  EnvironmentChangeValidationError,
  type EnvironmentDraftKey,
} from './environment-change';

function recordingAdapter(calls: string[]): EnvironmentChangeAdapter {
  return {
    async configureEnvironment(payload: ConfigureEnvironmentActionData) {
      calls.push(`configure_environment:${JSON.stringify(payload)}`);
    },
    async configureExhaustFan(_payload: ConfigureExhaustFanActionData) {
      calls.push('configure_exhaust_fan');
    },
    async refresh() {
      calls.push('refresh');
    },
  };
}

describe('Environment Change', () => {
  it('applies one dirty Shared Environment Draft field, then refreshes', async () => {
    const calls: string[] = [];
    const draft = createInitialSM().environmentDraft;
    draft.selectedGrowspaceId = 'growspace_1';
    draft.temperatureSensors = ['sensor.temperature'];
    draft.humiditySensors = ['sensor.humidity'];
    draft.feedEcSensors = ['sensor.untouched'];

    await applyEnvironmentChange(
      {
        kind: 'shared-environment-draft',
        draft,
        dirty: new Set(['temperatureSensors']),
      },
      recordingAdapter(calls)
    );

    expect(calls).toEqual([
      'configure_environment:{"growspace_id":"growspace_1","temperature_sensors":["sensor.temperature"]}',
      'refresh',
    ]);
  });

  it('applies a Tank Config Change without leaking live Tank Levels', async () => {
    const calls: string[] = [];

    await applyEnvironmentChange(
      {
        kind: 'tank-config-change',
        growspaceId: 'growspace_1',
        irrigationTanks: [
          {
            sensorEntity: 'sensor.reservoir',
            name: 'Reservoir',
            warningLevel: 20,
            volumeLiters: 80,
            fillLevel: 62,
            isWarning: false,
            hoursRemaining: 18,
          },
        ],
      },
      recordingAdapter(calls)
    );

    expect(calls).toEqual([
      'configure_environment:{"growspace_id":"growspace_1","irrigation_tanks":[{"sensor_entity":"sensor.reservoir","name":"Reservoir","warning_level":20,"volume_liters":80}]}',
      'refresh',
    ]);
  });

  it('runs the dedicated exhaust action second and refreshes last', async () => {
    const order: string[] = [];
    const draft = createInitialSM().environmentDraft;
    draft.selectedGrowspaceId = 'growspace_1';
    draft.temperatureSensors = ['sensor.temperature'];
    draft.humiditySensors = ['sensor.humidity'];
    draft.exhaustFanConfig = { ...draft.exhaustFanConfig, enabled: true };
    const adapter: EnvironmentChangeAdapter = {
      async configureEnvironment(payload) {
        expect(payload).toEqual({ growspace_id: 'growspace_1' });
        order.push('configure_environment');
      },
      async configureExhaustFan(payload) {
        expect(payload.growspace_id).toBe('growspace_1');
        expect(payload.enabled).toBe(true);
        order.push('configure_exhaust_fan');
      },
      async refresh() {
        order.push('refresh');
      },
    };

    await applyEnvironmentChange(
      {
        kind: 'shared-environment-draft',
        draft,
        dirty: new Set(['exhaustFanConfig']),
      },
      adapter
    );

    expect(order).toEqual(['configure_environment', 'configure_exhaust_fan', 'refresh']);
  });

  it('returns the reason a Shared Environment Draft cannot be saved', () => {
    const draft = createInitialSM().environmentDraft;
    draft.selectedGrowspaceId = 'growspace_1';
    draft.temperatureSensors = ['sensor.temperature'];
    draft.humiditySensors = [];

    expect(
      environmentChangeVerdict({
        kind: 'shared-environment-draft',
        draft,
        dirty: new Set(),
      })
    ).toEqual({ ok: false, reason: 'humidity' });
  });

  it('rejects a blocked Environment Change before calling Home Assistant', async () => {
    const calls: string[] = [];
    const draft = createInitialSM().environmentDraft;
    draft.selectedGrowspaceId = 'growspace_1';
    draft.temperatureSensors = ['sensor.temperature'];
    draft.humiditySensors = [];

    await expect(
      applyEnvironmentChange(
        {
          kind: 'shared-environment-draft',
          draft,
          dirty: new Set(['temperatureSensors']),
        },
        recordingAdapter(calls)
      )
    ).rejects.toEqual(new EnvironmentChangeValidationError('humidity'));
    expect(calls).toEqual([]);
  });

  it('blocks an incomplete dirty Acceptable Moisture Band', () => {
    const draft = createInitialSM().environmentDraft;
    draft.selectedGrowspaceId = 'growspace_1';
    draft.temperatureSensors = ['sensor.temperature'];
    draft.humiditySensors = ['sensor.humidity'];
    draft.soilMoistureMin = 30;
    draft.soilMoistureMax = null;

    expect(
      environmentChangeVerdict({
        kind: 'shared-environment-draft',
        draft,
        dirty: new Set(['soilMoistureMin']),
      })
    ).toEqual({ ok: false, reason: 'moisture-band' });
  });

  it('maps every buffered Shared Environment Draft field through one total interface', async () => {
    const draft = createInitialSM().environmentDraft;
    draft.selectedGrowspaceId = 'growspace_1';
    draft.temperatureSensors = ['sensor.temperature'];
    draft.humiditySensors = ['sensor.humidity'];
    draft.stressThreshold = 0;
    draft.moldThreshold = 0.75;
    const dirty = new Set(Object.keys(draft) as EnvironmentDraftKey[]);
    let environmentPayload: ConfigureEnvironmentActionData | undefined;

    await applyEnvironmentChange(
      { kind: 'shared-environment-draft', draft, dirty },
      {
        async configureEnvironment(payload) {
          environmentPayload = payload;
        },
        async configureExhaustFan() {},
        async refresh() {},
      }
    );

    expect(Object.keys(environmentPayload ?? {}).sort()).toEqual(
      [
        'bulk_ec_sensors',
        'camera_entities',
        'circulation_fan_ac_infinity_devices',
        'circulation_fan_config',
        'circulation_fan_entities',
        'co2_sensor',
        'dehumidifier_ac_infinity_devices',
        'dehumidifier_entities',
        'dehumidifier_thresholds',
        'drain_volume_sensors',
        'energy_sensors',
        'exhaust_fan_ac_infinity_devices',
        'exhaust_fan_entities',
        'feed_ec_sensors',
        'growlight_ac_infinity_devices',
        'growlight_config',
        'growlight_entities',
        'growspace_id',
        'humidifier_ac_infinity_devices',
        'humidifier_entities',
        'humidifier_thresholds',
        'humidity_sensors',
        'irrigation_flow_sensors',
        'irrigation_tanks',
        'light_sensors',
        'lst_offset',
        'lung_room_temp_sensors',
        'mold_threshold',
        'ph_sensors',
        'pore_ec_sensors',
        'power_sensors',
        'runoff_ec_sensors',
        'sensor_coordinates',
        'sensor_groups',
        'soil_moisture_max',
        'soil_moisture_min',
        'soil_moisture_sensor',
        'stress_threshold',
        'substrate_temperature_sensors',
        'temperature_sensors',
        'vpd_optimal_overrides',
        'vpd_sensors',
      ].sort()
    );
  });

  it('rejects after an exhaust failure without refreshing or mutating retry state', async () => {
    const draft = createInitialSM().environmentDraft;
    draft.selectedGrowspaceId = 'growspace_1';
    draft.temperatureSensors = ['sensor.temperature'];
    draft.humiditySensors = ['sensor.humidity'];
    draft.exhaustFanConfig = { ...draft.exhaustFanConfig, enabled: true };
    const dirty = new Set<EnvironmentDraftKey>(['exhaustFanConfig']);
    const before = JSON.stringify({ draft, dirty: [...dirty] });
    const order: string[] = [];

    await expect(
      applyEnvironmentChange(
        { kind: 'shared-environment-draft', draft, dirty },
        {
          async configureEnvironment() {
            order.push('configure_environment');
          },
          async configureExhaustFan() {
            order.push('configure_exhaust_fan');
            throw new Error('exhaust offline');
          },
          async refresh() {
            order.push('refresh');
          },
        }
      )
    ).rejects.toThrow('exhaust offline');
    expect(order).toEqual(['configure_environment', 'configure_exhaust_fan']);
    expect(JSON.stringify({ draft, dirty: [...dirty] })).toBe(before);
  });
});
