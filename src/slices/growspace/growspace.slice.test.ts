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
});
