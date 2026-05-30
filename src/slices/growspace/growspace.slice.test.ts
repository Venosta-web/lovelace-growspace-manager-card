import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as hassCallModule from '../../services/hass-call';
import type { GrowspaceDevice } from '../../services/types';
import {
  growspaceDevices$,
  getGrowspaceDevices,
  fetchGrowspaceData,
  addGrowspace,
  removeGrowspace,
  updateGrowspace,
  exportGrowReport,
  fetchGrowReport,
  removeEnvironment,
  resetWaterTracking,
  setDehumidifierControl,
  setHumidifierControl,
  updateSensorCoordinates,
  configureEnvironment,
} from './index';

vi.mock('../../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  hassCall: vi.fn().mockResolvedValue({}),
  setHass: vi.fn(),
}));

beforeEach(() => {
  growspaceDevices$.set(null);
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// growspaceDevices$
// ---------------------------------------------------------------------------

describe('growspaceDevices$', () => {
  it('defaults to null', () => {
    expect(growspaceDevices$.get()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getGrowspaceDevices
// ---------------------------------------------------------------------------

describe('getGrowspaceDevices', () => {
  it('returns [] when the atom is null', () => {
    growspaceDevices$.set(null);
    expect(getGrowspaceDevices()).toEqual([]);
  });

  it('returns the current devices when the atom is set', () => {
    const device = { deviceId: 'gs1', name: 'Tent A' } as GrowspaceDevice;
    growspaceDevices$.set([device]);
    expect(getGrowspaceDevices()).toEqual([device]);
  });
});

// ---------------------------------------------------------------------------
// fetchGrowspaceData
// ---------------------------------------------------------------------------

describe('fetchGrowspaceData', () => {
  it('calls hassCall with growspace_manager/get_data', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce({});

    await fetchGrowspaceData();

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_data',
      {},
      expect.anything()
    );
  });

  it('sets growspaceDevices$ with adapted GrowspaceDevice[]', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce({
      gs1: { identity: { growspace_id: 'gs1', name: 'Tent A', type: 'flower' } },
    });

    await fetchGrowspaceData();

    const devices = growspaceDevices$.get();
    expect(devices).toHaveLength(1);
    expect(devices![0].deviceId).toBe('gs1');
    expect(devices![0].name).toBe('Tent A');
  });

  it('propagates errors from hassCall', async () => {
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('ws failure'));

    await expect(fetchGrowspaceData()).rejects.toThrow('ws failure');
  });
});

// ---------------------------------------------------------------------------
// addGrowspace
// ---------------------------------------------------------------------------

describe('addGrowspace', () => {
  it('calls add_growspace service with mapped payload', async () => {
    await addGrowspace({ name: 'Tent B', rows: 2, plantsPerRow: 4 });

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'add_growspace',
      expect.objectContaining({ name: 'Tent B', rows: 2, plants_per_row: 4 })
    );
  });
});

// ---------------------------------------------------------------------------
// removeGrowspace
// ---------------------------------------------------------------------------

describe('removeGrowspace', () => {
  it('calls remove_growspace service with growspace_id', async () => {
    await removeGrowspace('gs1');

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'remove_growspace',
      { growspace_id: 'gs1' }
    );
  });
});

// ---------------------------------------------------------------------------
// updateGrowspace
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// exportGrowReport
// ---------------------------------------------------------------------------

describe('exportGrowReport', () => {
  it('calls export_grow_report service with growspace_id and json format', async () => {
    await exportGrowReport('gs1');

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'export_grow_report',
      { growspace_id: 'gs1', format: 'json' }
    );
  });

  it('calls export_grow_report service with pdf format when specified', async () => {
    await exportGrowReport('gs1', 'pdf');

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'export_grow_report',
      { growspace_id: 'gs1', format: 'pdf' }
    );
  });

  it('propagates errors from callService', async () => {
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('export failed'));

    await expect(exportGrowReport('gs1')).rejects.toThrow('export failed');
  });
});

// ---------------------------------------------------------------------------
// fetchGrowReport
// ---------------------------------------------------------------------------

describe('fetchGrowReport', () => {
  it('calls hassCall with get_grow_report and returns the result', async () => {
    const mockReport = {
      summary: { plant_count: 10, strains: ['Kush'], stages: {} },
      harvest: { total_wet_weight: 100, total_dry_weight: 80, total_trim_weight: 20, top_thc: 25 },
      environment: { temperature_avg: 24, humidity_avg: 50, vpd_avg: 1.2 },
    };
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce(mockReport);

    const result = await fetchGrowReport('gs1');

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_grow_report',
      { growspace_id: 'gs1' },
      expect.anything()
    );
    expect(result).toEqual(mockReport);
  });

  it('propagates errors from hassCall', async () => {
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('ws failure'));

    await expect(fetchGrowReport('gs1')).rejects.toThrow('ws failure');
  });
});

// ---------------------------------------------------------------------------
// updateGrowspace
// ---------------------------------------------------------------------------

describe('updateGrowspace', () => {
  it('calls update_growspace service with growspace_id and provided fields', async () => {
    await updateGrowspace({ growspaceId: 'gs1', name: 'Tent C' });

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'update_growspace',
      expect.objectContaining({ growspace_id: 'gs1', name: 'Tent C' })
    );
  });

  it('optimistically patches the device name before the service call', async () => {
    growspaceDevices$.set([{ deviceId: 'gs1', name: 'Old Name' } as GrowspaceDevice]);

    let nameAtApply = '';
    vi.mocked(hassCallModule.callService).mockImplementationOnce(async () => {
      nameAtApply = growspaceDevices$.get()![0].name;
    });

    await updateGrowspace({ growspaceId: 'gs1', name: 'New Name' });

    expect(nameAtApply).toBe('New Name');
  });

  it('rolls back growspaceDevices$ when the service call fails', async () => {
    growspaceDevices$.set([{ deviceId: 'gs1', name: 'Original' } as GrowspaceDevice]);
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('fail'));

    await expect(updateGrowspace({ growspaceId: 'gs1', name: 'Bad Name' })).rejects.toThrow(
      'fail'
    );

    expect(growspaceDevices$.get()![0].name).toBe('Original');
  });

  it('optimistically updates all fields and rolls back all of them', async () => {
    const originalDevice = {
      deviceId: 'gs1',
      name: 'Original',
      rows: 1,
      plantsPerRow: 1,
      notificationTarget: 'notify.original',
    } as GrowspaceDevice;
    growspaceDevices$.set([originalDevice]);

    await updateGrowspace({
      growspaceId: 'gs1',
      name: 'Updated Name',
      rows: 3,
      plantsPerRow: 5,
      notificationService: 'notify.updated',
    });

    const updated = growspaceDevices$.get()![0];
    expect(updated.name).toBe('Updated Name');
    expect(updated.rows).toBe(3);
    expect(updated.plantsPerRow).toBe(5);
    expect(updated.notificationTarget).toBe('notify.updated');
  });

  it('early returns in optimistic callback if previous growspaces is null', async () => {
    growspaceDevices$.set(null);
    await updateGrowspace({ growspaceId: 'gs1', name: 'New Name' });
    expect(growspaceDevices$.get()).toBeNull();
  });

  it('optimistically updates when some fields are undefined and maps correctly with multiple devices', async () => {
    const originalDevices = [
      { deviceId: 'gs1', name: 'Original 1', rows: 1 },
      { deviceId: 'gs2', name: 'Original 2', rows: 2 },
    ] as GrowspaceDevice[];
    growspaceDevices$.set(originalDevices);

    await updateGrowspace({
      growspaceId: 'gs1',
      rows: 4,
    });

    const devices = growspaceDevices$.get()!;
    expect(devices[0].name).toBe('Original 1');
    expect(devices[0].rows).toBe(4);
    expect(devices[1].name).toBe('Original 2');
    expect(devices[1].rows).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// removeEnvironment
// ---------------------------------------------------------------------------

describe('removeEnvironment', () => {
  it('calls remove_environment service with growspace_id', async () => {
    await removeEnvironment('gs1');

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'remove_environment',
      { growspace_id: 'gs1' }
    );
  });
});

// ---------------------------------------------------------------------------
// resetWaterTracking
// ---------------------------------------------------------------------------

describe('resetWaterTracking', () => {
  it('calls reset_water_tracking service with growspace_id', async () => {
    await resetWaterTracking('gs1');

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'reset_water_tracking',
      { growspace_id: 'gs1' }
    );
  });
});

// ---------------------------------------------------------------------------
// setDehumidifierControl
// ---------------------------------------------------------------------------

describe('setDehumidifierControl', () => {
  it('calls set_dehumidifier_control service with growspace_id and enabled flag', async () => {
    await setDehumidifierControl('gs1', true);

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'set_dehumidifier_control',
      { growspace_id: 'gs1', enabled: true }
    );
  });
});

// ---------------------------------------------------------------------------
// setHumidifierControl
// ---------------------------------------------------------------------------

describe('setHumidifierControl', () => {
  it('calls set_humidifier_control service with growspace_id and enabled flag', async () => {
    await setHumidifierControl('gs1', true);

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'set_humidifier_control',
      { growspace_id: 'gs1', enabled: true }
    );
  });
});

// ---------------------------------------------------------------------------
// updateSensorCoordinates
// ---------------------------------------------------------------------------

describe('updateSensorCoordinates', () => {
  it('sends update_sensor_coordinates WS command with rounded coordinates', async () => {
    await updateSensorCoordinates('gs1', 'sensor.temp', 1.6, 2.4, 3.9);

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/update_sensor_coordinates',
      { growspace_id: 'gs1', entity_id: 'sensor.temp', x: 2, y: 2, z: 4, rotation: undefined },
      expect.anything()
    );
  });

  it('includes rotation when provided', async () => {
    await updateSensorCoordinates('gs1', 'sensor.temp', 0, 0, 0, 45.7);

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/update_sensor_coordinates',
      expect.objectContaining({ rotation: 46 }),
      expect.anything()
    );
  });
});

// ---------------------------------------------------------------------------
// configureEnvironment
// ---------------------------------------------------------------------------

describe('configureEnvironment', () => {
  it('calls configure_environment service with growspace_id and mapped snake_case fields', async () => {
    await configureEnvironment({
      growspaceId: 'gs1',
      temperatureSensors: ['sensor.temp'],
      humiditySensors: ['sensor.hum'],
      vegDayHours: 18,
      controlDehumidifier: true,
    });

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'configure_environment',
      expect.objectContaining({
        growspace_id: 'gs1',
        temperature_sensors: ['sensor.temp'],
        humidity_sensors: ['sensor.hum'],
        veg_day_hours: 18,
        control_dehumidifier: true,
      })
    );
  });

  it('omits fields that are undefined or empty arrays', async () => {
    await configureEnvironment({ growspaceId: 'gs1', temperatureSensors: [] });

    const payload = vi.mocked(hassCallModule.callService).mock.calls[0][2];
    expect(payload).not.toHaveProperty('temperature_sensors');
    expect(payload).not.toHaveProperty('humidity_sensors');
  });

  it('calls configure_environment with all optional fields and mapped snake_case properties', async () => {
    await configureEnvironment({
      growspaceId: 'gs1',
      temperatureSensors: ['sensor.temp'],
      humiditySensors: ['sensor.hum'],
      vpdSensors: ['sensor.vpd'],
      co2Sensor: 'sensor.co2',
      circulationFanEntity: 'fan.circ',
      circulationFanEntities: ['fan.circ1', 'fan.circ2'],
      stressThreshold: 2.5,
      moldThreshold: 3.5,
      lightSensor: 'sensor.light',
      lightSensors: ['sensor.light1', 'sensor.light2'],
      exhaustEntity: 'fan.exhaust',
      exhaustFanEntities: ['fan.exhaust1'],
      humidifierEntity: 'humidifier.main',
      humidifierEntities: ['humidifier.sub'],
      humidifierThresholds: { room1: { day: { on: 40, off: 60 } } },
      controlHumidifier: true,
      dehumidifierEntity: 'dehumidifier.main',
      dehumidifierEntities: ['dehumidifier.sub'],
      dehumidifierThresholds: { room1: { day: { on: 50, off: 40 } } },
      soilMoistureSensor: 'sensor.soil',
      controlDehumidifier: false,
      vegDayHours: 18,
      flowerEarlyDayHours: 12,
      flowerMidDayHours: 11.5,
      flowerLateDayHours: 11,
      minimumSourceAirTemperature: 15,
      sensorGroups: [{
        id: 'group1',
        name: 'Group 1',
        x: 1,
        y: 2,
        z: 3,
        temperature_sensors: ['sensor.temp'],
        humidity_sensors: ['sensor.hum'],
        vpd_sensors: ['sensor.vpd'],
      }],
      sensorCoordinates: { 'sensor.temp': { x: 1, y: 2, z: 3, rotation: 45 } },
      irrigationTanks: [
        { sensorEntity: 'sensor.tank1', name: 'Tank 1', warningLevel: 20, volumeLiters: 100 },
        { sensorEntity: 'sensor.tank2', name: 'Tank 2', warningLevel: 10, volumeLiters: null },
      ],
      cameraEntities: ['camera.grow'],
      lungroomTempSensors: ['sensor.lung'],
      substrateTemperatureSensors: ['sensor.sub_temp'],
      phSensors: ['sensor.ph'],
      feedEcSensors: ['sensor.feed_ec'],
      substrateEcSensors: ['sensor.sub_ec'],
      runoffEcSensors: ['sensor.runoff_ec'],
      drainVolumeSensors: ['sensor.drain_vol'],
      irrigationFlowSensors: ['sensor.flow'],
      powerSensors: ['sensor.power'],
      energySensors: ['sensor.energy'],
    });

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'configure_environment',
      expect.objectContaining({
        growspace_id: 'gs1',
        temperature_sensors: ['sensor.temp'],
        humidity_sensors: ['sensor.hum'],
        vpd_sensors: ['sensor.vpd'],
        co2_sensor: 'sensor.co2',
        circulation_fan_entity: 'fan.circ',
        circulation_fan_entities: ['fan.circ1', 'fan.circ2'],
        stress_threshold: 2.5,
        mold_threshold: 3.5,
        light_sensor: 'sensor.light',
        light_sensors: ['sensor.light1', 'sensor.light2'],
        exhaust_entity: 'fan.exhaust',
        exhaust_fan_entities: ['fan.exhaust1'],
        humidifier_entity: 'humidifier.main',
        humidifier_entities: ['humidifier.sub'],
        humidifier_thresholds: { room1: { day: { on: 40, off: 60 } } },
        control_humidifier: true,
        dehumidifier_entity: 'dehumidifier.main',
        dehumidifier_entities: ['dehumidifier.sub'],
        dehumidifier_thresholds: { room1: { day: { on: 50, off: 40 } } },
        soil_moisture_sensor: 'sensor.soil',
        control_dehumidifier: false,
        veg_day_hours: 18,
        flower_early_day_hours: 12,
        flower_mid_day_hours: 11.5,
        flower_late_day_hours: 11,
        minimum_source_air_temperature: 15,
        sensor_groups: [{
          id: 'group1',
          name: 'Group 1',
          x: 1,
          y: 2,
          z: 3,
          temperature_sensors: ['sensor.temp'],
          humidity_sensors: ['sensor.hum'],
          vpd_sensors: ['sensor.vpd'],
        }],
        sensor_coordinates: { 'sensor.temp': { x: 1, y: 2, z: 3, rotation: 45 } },
        irrigation_tanks: [
          { sensor_entity: 'sensor.tank1', name: 'Tank 1', warning_level: 20, volume_liters: 100 },
          { sensor_entity: 'sensor.tank2', name: 'Tank 2', warning_level: 10 },
        ],
        camera_entities: ['camera.grow'],
        lung_room_temp_sensors: ['sensor.lung'],
        substrate_temperature_sensors: ['sensor.sub_temp'],
        ph_sensors: ['sensor.ph'],
        feed_ec_sensors: ['sensor.feed_ec'],
        substrate_ec_sensors: ['sensor.sub_ec'],
        runoff_ec_sensors: ['sensor.runoff_ec'],
        drain_volume_sensors: ['sensor.drain_vol'],
        irrigation_flow_sensors: ['sensor.flow'],
        power_sensors: ['sensor.power'],
        energy_sensors: ['sensor.energy'],
      })
    );
  });
});
