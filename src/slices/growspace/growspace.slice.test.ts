import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as hassCallModule from '../../services/hass-call';
import { createGrowspaceDevice, type GrowspaceDevice } from '../../services/types';
import { devices$ } from '../grid';
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
  configureCirculationFan,
} from './index';
import type { CirculationFanConfig } from './schema';

vi.mock('../../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  hassCall: vi.fn().mockResolvedValue({}),
  setHass: vi.fn(),
}));

beforeEach(() => {
  growspaceDevices$.set(null);
  devices$.set([]);
  vi.clearAllMocks();
});

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

    await expect(updateGrowspace({ growspaceId: 'gs1', name: 'Bad Name' })).rejects.toThrow('fail');

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

  it('optimistically patches the device the config dialog reseeds from, so a reopen does not race the backend push', async () => {
    devices$.set([createGrowspaceDevice({ deviceId: 'gs1', name: 'Tent 1' })]);

    await setDehumidifierControl('gs1', true);

    expect(devices$.get()[0].environmentAttributes.dehumidifierControlEnabled).toBe(true);
  });

  it('rolls the optimistic patch back if the service call fails', async () => {
    devices$.set([createGrowspaceDevice({ deviceId: 'gs1', name: 'Tent 1' })]);
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('boom'));

    await expect(setDehumidifierControl('gs1', true)).rejects.toThrow('boom');

    expect(devices$.get()[0].environmentAttributes.dehumidifierControlEnabled).toBe(false);
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

  it('optimistically patches the device the config dialog reseeds from, so a reopen does not race the backend push', async () => {
    devices$.set([createGrowspaceDevice({ deviceId: 'gs1', name: 'Tent 1' })]);

    await setHumidifierControl('gs1', true);

    expect(devices$.get()[0].environmentAttributes.humidifierControlEnabled).toBe(true);
  });

  it('rolls the optimistic patch back if the service call fails', async () => {
    devices$.set([createGrowspaceDevice({ deviceId: 'gs1', name: 'Tent 1' })]);
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('boom'));

    await expect(setHumidifierControl('gs1', true)).rejects.toThrow('boom');

    expect(devices$.get()[0].environmentAttributes.humidifierControlEnabled).toBe(false);
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
// configureCirculationFan
// ---------------------------------------------------------------------------

const fanConfig: CirculationFanConfig = {
  enabled: true,
  regulation_mode: 'vpd',
  min_speed: 10,
  max_speed: 90,
  vpd_target: 1.1,
  vpd_tolerance: 0.2,
  humidity_target: 60,
  humidity_tolerance: 5,
  temperature_target: 25,
  temperature_tolerance: 2,
  critical_temp_low: 18,
  critical_temp_high: 32,
  critical_temp_hysteresis: 1,
  wind_enabled: true,
  wind_period_seconds: 120,
  wind_amplitude_pct: 20,
  stage_vpd_enabled: false,
  stage_vpd_overrides: {},
};

describe('configureCirculationFan', () => {
  it('calls configure_circulation_fan with growspace_id and full fan config payload', async () => {
    await configureCirculationFan({ growspaceId: 'gs-1', fanConfig });

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'configure_circulation_fan',
      {
        growspace_id: 'gs-1',
        enabled: true,
        regulation_mode: 'vpd',
        min_speed: 10,
        max_speed: 90,
        vpd_target: 1.1,
        vpd_tolerance: 0.2,
        humidity_target: 60,
        humidity_tolerance: 5,
        temperature_target: 25,
        temperature_tolerance: 2,
        critical_temp_low: 18,
        critical_temp_high: 32,
        critical_temp_hysteresis: 1,
        wind_enabled: true,
        wind_period_seconds: 120,
        wind_amplitude_pct: 20,
        stage_vpd_enabled: false,
        stage_vpd_overrides: {},
      }
    );
  });

  it('propagates errors from callService', async () => {
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('fan-err'));

    await expect(configureCirculationFan({ growspaceId: 'gs-1', fanConfig })).rejects.toThrow(
      'fan-err'
    );
  });
});

// ---------------------------------------------------------------------------
