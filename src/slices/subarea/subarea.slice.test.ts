/**
 * Subarea slice — unit tests.
 *
 * Tests cover:
 *   - atom defaults
 *   - setSubareas (bootstrap write)
 *   - getSubareas (calls hassCall, updates subareas$, error re-throw)
 *   - addSubarea (calls hassCall, appends to subareas$)
 *   - updateSubarea (optimistic patch, calls hassCall, rollback on fail)
 *   - removeSubarea (optimistic remove, calls hassCall, rollback on fail)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as hassCallModule from '../../services/hass-call';
import * as mutateModule from '../../services/mutate';
import {
  subareas$,
  setSubareas,
  getSubareas,
  addSubarea,
  updateSubarea,
  removeSubarea,
} from './index';
import type { Subarea } from './schema';

vi.mock('../../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  callServiceReturning: vi.fn().mockResolvedValue(undefined),
  hassCall: vi.fn().mockResolvedValue([]),
  setHass: vi.fn(),
}));

vi.mock('../../services/mutate', () => ({
  mutate: vi.fn().mockImplementation(async (action) => {
    action.optimistic();
    await action.apply();
  }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SUBAREA_A: Subarea = {
  id: 'sa-1',
  name: 'Veg Corner',
  environment_config: {},
};

const SUBAREA_B: Subarea = {
  id: 'sa-2',
  name: 'Flower Tent',
  environment_config: { temperature_sensor: 'sensor.temp' },
};

// ---------------------------------------------------------------------------
// Reset atoms before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  setSubareas([]);
  vi.clearAllMocks();
  // Restore default mutate behaviour: run optimistic + apply, record undo
  vi.mocked(mutateModule.mutate).mockImplementation(async (action) => {
    action.optimistic();
    await action.apply();
  });
});

// ---------------------------------------------------------------------------
// subareas$ — atom default
// ---------------------------------------------------------------------------

describe('subareas$', () => {
  it('defaults to an empty array', () => {
    expect(subareas$.get()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// setSubareas — bootstrap write
// ---------------------------------------------------------------------------

describe('setSubareas', () => {
  it('replaces subareas$ with the provided array', () => {
    setSubareas([SUBAREA_A]);
    expect(subareas$.get()).toEqual([SUBAREA_A]);
  });
});

// ---------------------------------------------------------------------------
// getSubareas
// ---------------------------------------------------------------------------

describe('getSubareas', () => {
  it('calls hassCall with the get_subareas command and growspace_id', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce([]);

    await getSubareas('gs1');

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_subareas',
      { growspace_id: 'gs1' },
      expect.anything(),
    );
  });

  it('updates subareas$ with the returned list', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce([SUBAREA_A, SUBAREA_B]);

    await getSubareas('gs1');

    expect(subareas$.get()).toEqual([SUBAREA_A, SUBAREA_B]);
  });

  it('returns the fetched subareas', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce([SUBAREA_A]);

    const result = await getSubareas('gs1');

    expect(result).toEqual([SUBAREA_A]);
  });

  it('re-throws when hassCall fails', async () => {
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('backend error'));

    await expect(getSubareas('gs1')).rejects.toThrow('backend error');
  });

  it('does not update subareas$ when hassCall fails', async () => {
    setSubareas([SUBAREA_A]);
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('fail'));

    await expect(getSubareas('gs1')).rejects.toThrow();

    expect(subareas$.get()).toEqual([SUBAREA_A]);
  });
});

// ---------------------------------------------------------------------------
// addSubarea
// ---------------------------------------------------------------------------

describe('addSubarea', () => {
  it('calls hassCall with the add_subarea command', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce(SUBAREA_A);

    await addSubarea('gs1', 'Veg Corner');

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/add_subarea',
      { growspace_id: 'gs1', name: 'Veg Corner' },
      expect.anything(),
    );
  });

  it('appends the returned subarea to subareas$', async () => {
    setSubareas([SUBAREA_B]);
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce(SUBAREA_A);

    await addSubarea('gs1', 'Veg Corner');

    expect(subareas$.get()).toEqual([SUBAREA_B, SUBAREA_A]);
  });

  it('returns the new subarea', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce(SUBAREA_A);

    const result = await addSubarea('gs1', 'Veg Corner');

    expect(result).toEqual(SUBAREA_A);
  });

  it('re-throws when hassCall fails and does not modify subareas$', async () => {
    setSubareas([SUBAREA_B]);
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('add failed'));

    await expect(addSubarea('gs1', 'Veg Corner')).rejects.toThrow('add failed');
    expect(subareas$.get()).toEqual([SUBAREA_B]);
  });
});

// ---------------------------------------------------------------------------
// updateSubarea
// ---------------------------------------------------------------------------

describe('updateSubarea', () => {
  beforeEach(() => {
    setSubareas([SUBAREA_A, SUBAREA_B]);
  });

  it('calls hassCall with the update_subarea command', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce({
      ...SUBAREA_A,
      environment_config: { temperature_sensor: 'sensor.new_temp' },
    });

    await updateSubarea('gs1', 'sa-1', { temperature_sensor: 'sensor.new_temp' });

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/update_subarea',
      {
        growspace_id: 'gs1',
        subarea_id: 'sa-1',
        environment_config: { temperature_sensor: 'sensor.new_temp' },
      },
      expect.anything(),
    );
  });

  it('patches subareas$ optimistically', async () => {
    const updated = { ...SUBAREA_A, environment_config: { temperature_sensor: 'sensor.new_temp' } };
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce(updated);

    await updateSubarea('gs1', 'sa-1', { temperature_sensor: 'sensor.new_temp' });

    const patched = subareas$.get().find((s) => s.id === 'sa-1');
    expect(patched?.environment_config.temperature_sensor).toBe('sensor.new_temp');
  });

  it('rolls back subareas$ when hassCall fails', async () => {
    vi.mocked(mutateModule.mutate).mockImplementationOnce(async (action) => {
      action.optimistic();
      try {
        await action.apply();
      } catch {
        action.inverse();
        throw new Error('apply failed');
      }
    });
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('apply failed'));

    await expect(
      updateSubarea('gs1', 'sa-1', { temperature_sensor: 'sensor.bad' }),
    ).rejects.toThrow();

    expect(subareas$.get()).toEqual([SUBAREA_A, SUBAREA_B]);
  });
});

// ---------------------------------------------------------------------------
// removeSubarea
// ---------------------------------------------------------------------------

describe('removeSubarea', () => {
  beforeEach(() => {
    setSubareas([SUBAREA_A, SUBAREA_B]);
  });

  it('calls hassCall with the remove_subarea command', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce(undefined);

    await removeSubarea('gs1', 'sa-1');

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/remove_subarea',
      { growspace_id: 'gs1', subarea_id: 'sa-1' },
      expect.anything(),
    );
  });

  it('removes the subarea from subareas$ optimistically', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce(undefined);

    await removeSubarea('gs1', 'sa-1');

    expect(subareas$.get()).toEqual([SUBAREA_B]);
    expect(subareas$.get().find((s) => s.id === 'sa-1')).toBeUndefined();
  });

  it('rolls back subareas$ when hassCall fails', async () => {
    vi.mocked(mutateModule.mutate).mockImplementationOnce(async (action) => {
      action.optimistic();
      try {
        await action.apply();
      } catch {
        action.inverse();
        throw new Error('remove failed');
      }
    });
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('remove failed'));

    await expect(removeSubarea('gs1', 'sa-1')).rejects.toThrow();

    expect(subareas$.get()).toEqual([SUBAREA_A, SUBAREA_B]);
  });
});
