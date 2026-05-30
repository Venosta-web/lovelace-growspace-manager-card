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
