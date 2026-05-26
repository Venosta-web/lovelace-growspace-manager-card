/**
 * Logbook slice — unit tests.
 *
 * Tests cover:
 *   - atom defaults
 *   - setGrowspaceEvents / setPlantEvents (bootstrap / sibling writes)
 *   - fetchGrowspaceEvents (fetches log+alerts, merges, updates atom, error re-throw)
 *   - fetchPlantEvents (same for plant scope)
 *   - addPlantNote (calls hassCall, fire-and-forget)
 *   - addGrowspaceNote (calls hassCall, fire-and-forget)
 *   - deleteEvent (optimistic remove, hassCall, rollback on fail)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as hassCallModule from '../../services/hass-call';
import * as mutateModule from '../../services/mutate';
import {
  growspaceEvents$,
  plantEvents$,
  setGrowspaceEvents,
  setPlantEvents,
  fetchGrowspaceEvents,
  fetchPlantEvents,
  addPlantNote,
  addGrowspaceNote,
  deleteEvent,
} from './index';
import type { LogbookEntry } from './schema';

vi.mock('../../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  callServiceReturning: vi.fn().mockResolvedValue(undefined),
  hassCall: vi.fn().mockResolvedValue({}),
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

const LOG_ENTRY_A: LogbookEntry = {
  sensor_type: 'watering',
  growspace_id: 'gs1',
  start_time: '2026-05-01T10:00:00Z',
  end_time: '2026-05-01T10:01:00Z',
  duration_sec: 60,
  severity: 0,
  category: 'irrigation',
  reasons: [],
  timestamp: '2026-05-01T10:00:00Z',
  event_id: 'evt-1',
};

const LOG_ENTRY_B: LogbookEntry = {
  sensor_type: 'alert',
  growspace_id: 'gs1',
  start_time: '2026-05-02T08:00:00Z',
  end_time: '2026-05-02T08:05:00Z',
  duration_sec: 300,
  severity: 2,
  category: 'environment',
  reasons: ['high_vpd'],
  timestamp: '2026-05-02T08:00:00Z',
  event_id: 'evt-2',
};

// ---------------------------------------------------------------------------
// Reset atoms before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  setGrowspaceEvents([]);
  setPlantEvents([]);
  vi.clearAllMocks();
  vi.mocked(mutateModule.mutate).mockImplementation(async (action) => {
    action.optimistic();
    await action.apply();
  });
});

// ---------------------------------------------------------------------------
// growspaceEvents$ — atom default
// ---------------------------------------------------------------------------

describe('growspaceEvents$', () => {
  it('defaults to an empty array', () => {
    expect(growspaceEvents$.get()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// plantEvents$ — atom default
// ---------------------------------------------------------------------------

describe('plantEvents$', () => {
  it('defaults to an empty array', () => {
    expect(plantEvents$.get()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// setGrowspaceEvents — bootstrap / sibling write
// ---------------------------------------------------------------------------

describe('setGrowspaceEvents', () => {
  it('replaces growspaceEvents$ with the provided array', () => {
    setGrowspaceEvents([LOG_ENTRY_A]);
    expect(growspaceEvents$.get()).toEqual([LOG_ENTRY_A]);
  });
});

// ---------------------------------------------------------------------------
// setPlantEvents — bootstrap / sibling write
// ---------------------------------------------------------------------------

describe('setPlantEvents', () => {
  it('replaces plantEvents$ with the provided array', () => {
    setPlantEvents([LOG_ENTRY_B]);
    expect(plantEvents$.get()).toEqual([LOG_ENTRY_B]);
  });
});

// ---------------------------------------------------------------------------
// fetchGrowspaceEvents
// ---------------------------------------------------------------------------

describe('fetchGrowspaceEvents', () => {
  it('calls hassCall twice (log + alerts) with the growspace_id', async () => {
    vi.mocked(hassCallModule.hassCall)
      .mockResolvedValueOnce({ gs1: [] })
      .mockResolvedValueOnce({ gs1: [] });

    await fetchGrowspaceEvents('gs1');

    expect(hassCallModule.hassCall).toHaveBeenCalledTimes(2);
    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_log',
      expect.objectContaining({ growspace_id: 'gs1' }),
      expect.anything()
    );
    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_alerts',
      expect.objectContaining({ growspace_id: 'gs1' }),
      expect.anything()
    );
  });

  it('merges log and alert entries and sorts newest-first', async () => {
    vi.mocked(hassCallModule.hassCall)
      .mockResolvedValueOnce({ gs1: [LOG_ENTRY_A] }) // get_log
      .mockResolvedValueOnce({ gs1: [LOG_ENTRY_B] }); // get_alerts

    await fetchGrowspaceEvents('gs1');

    const events = growspaceEvents$.get();
    expect(events).toHaveLength(2);
    // LOG_ENTRY_B is newer (2026-05-02), should come first
    expect(events[0].event_id).toBe('evt-2');
    expect(events[1].event_id).toBe('evt-1');
  });

  it('updates growspaceEvents$ with merged results', async () => {
    vi.mocked(hassCallModule.hassCall)
      .mockResolvedValueOnce({ gs1: [LOG_ENTRY_A] })
      .mockResolvedValueOnce({ gs1: [] });

    await fetchGrowspaceEvents('gs1');

    expect(growspaceEvents$.get()).toHaveLength(1);
    expect(growspaceEvents$.get()[0].event_id).toBe('evt-1');
  });

  it('returns the merged events array', async () => {
    vi.mocked(hassCallModule.hassCall)
      .mockResolvedValueOnce({ gs1: [LOG_ENTRY_A] })
      .mockResolvedValueOnce({ gs1: [] });

    const result = await fetchGrowspaceEvents('gs1');
    expect(result).toHaveLength(1);
  });

  it('passes limit to get_log and a higher limit to get_alerts', async () => {
    vi.mocked(hassCallModule.hassCall)
      .mockResolvedValueOnce({ gs1: [] })
      .mockResolvedValueOnce({ gs1: [] });

    await fetchGrowspaceEvents('gs1', 25);

    const logCall = vi
      .mocked(hassCallModule.hassCall)
      .mock.calls.find((c) => c[0] === 'growspace_manager/get_log');
    const alertsCall = vi
      .mocked(hassCallModule.hassCall)
      .mock.calls.find((c) => c[0] === 'growspace_manager/get_alerts');
    expect((logCall![1] as Record<string, unknown>).limit).toBe(25);
    expect((alertsCall![1] as Record<string, unknown>).limit).toBeGreaterThan(25);
  });

  it('handles missing growspaceId key in response gracefully (empty arrays)', async () => {
    vi.mocked(hassCallModule.hassCall)
      .mockResolvedValueOnce({}) // no gs1 key
      .mockResolvedValueOnce({}); // no gs1 key

    await fetchGrowspaceEvents('gs1');
    expect(growspaceEvents$.get()).toEqual([]);
  });

  it('re-throws when hassCall fails and does not update growspaceEvents$', async () => {
    setGrowspaceEvents([LOG_ENTRY_A]);
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('network error'));

    await expect(fetchGrowspaceEvents('gs1')).rejects.toThrow('network error');
    expect(growspaceEvents$.get()).toEqual([LOG_ENTRY_A]);
  });
});

// ---------------------------------------------------------------------------
// fetchPlantEvents
// ---------------------------------------------------------------------------

describe('fetchPlantEvents', () => {
  it('calls hassCall twice with plant_id and growspace_id', async () => {
    vi.mocked(hassCallModule.hassCall)
      .mockResolvedValueOnce({ p1: [] })
      .mockResolvedValueOnce({ p1: [] });

    await fetchPlantEvents('p1', 'gs1');

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_log',
      expect.objectContaining({ plant_id: 'p1', growspace_id: 'gs1' }),
      expect.anything()
    );
    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_alerts',
      expect.objectContaining({ plant_id: 'p1', growspace_id: 'gs1' }),
      expect.anything()
    );
  });

  it('updates plantEvents$ with merged results', async () => {
    vi.mocked(hassCallModule.hassCall)
      .mockResolvedValueOnce({ p1: [LOG_ENTRY_A] })
      .mockResolvedValueOnce({ p1: [] });

    await fetchPlantEvents('p1', 'gs1');

    expect(plantEvents$.get()).toHaveLength(1);
  });

  it('re-throws when hassCall fails and does not update plantEvents$', async () => {
    setPlantEvents([LOG_ENTRY_A]);
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('fail'));

    await expect(fetchPlantEvents('p1', 'gs1')).rejects.toThrow();
    expect(plantEvents$.get()).toEqual([LOG_ENTRY_A]);
  });
});

// ---------------------------------------------------------------------------
// addPlantNote
// ---------------------------------------------------------------------------

describe('addPlantNote', () => {
  it('calls hassCall with the add_timeline_note command', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce(undefined);

    await addPlantNote('p1', { notes: 'looking healthy', images: [], tags: [] });

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/add_timeline_note',
      expect.objectContaining({ plant_id: 'p1', notes: 'looking healthy' }),
      expect.anything()
    );
  });

  it('includes images and tags in the payload when provided', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce(undefined);

    await addPlantNote('p1', {
      notes: 'training day',
      images: ['img/a.jpg'],
      tags: ['lst'],
    });

    const call = vi.mocked(hassCallModule.hassCall).mock.calls[0];
    const params = call[1] as Record<string, unknown>;
    expect(params.images).toEqual(['img/a.jpg']);
    expect(params.tags).toEqual(['lst']);
  });

  it('re-throws when hassCall fails', async () => {
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('backend error'));
    await expect(addPlantNote('p1', { notes: 'note' })).rejects.toThrow('backend error');
  });
});

// ---------------------------------------------------------------------------
// addGrowspaceNote
// ---------------------------------------------------------------------------

describe('addGrowspaceNote', () => {
  it('calls hassCall with the add_growspace_note command', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce(undefined);

    await addGrowspaceNote('gs1', { notes: 'foliar spray day' });

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/add_growspace_note',
      expect.objectContaining({ growspace_id: 'gs1', notes: 'foliar spray day' }),
      expect.anything()
    );
  });

  it('re-throws when hassCall fails', async () => {
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('down'));
    await expect(addGrowspaceNote('gs1', { notes: 'x' })).rejects.toThrow('down');
  });
});

// ---------------------------------------------------------------------------
// deleteEvent
// ---------------------------------------------------------------------------

describe('deleteEvent', () => {
  beforeEach(() => {
    setGrowspaceEvents([LOG_ENTRY_A, LOG_ENTRY_B]);
    setPlantEvents([LOG_ENTRY_A]);
  });

  it('calls hassCall with the remove_timeline_event command', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce(undefined);

    await deleteEvent('evt-1');

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/remove_timeline_event',
      { event_id: 'evt-1' },
      expect.anything()
    );
  });

  it('removes the event from growspaceEvents$ optimistically', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce(undefined);

    await deleteEvent('evt-1');

    const events = growspaceEvents$.get();
    expect(events).toHaveLength(1);
    expect(events.find((e) => e.event_id === 'evt-1')).toBeUndefined();
  });

  it('removes the event from plantEvents$ optimistically', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce(undefined);

    await deleteEvent('evt-1');

    expect(plantEvents$.get().find((e) => e.event_id === 'evt-1')).toBeUndefined();
  });

  it('rolls back both atoms when hassCall fails', async () => {
    vi.mocked(mutateModule.mutate).mockImplementationOnce(async (action) => {
      action.optimistic();
      try {
        await action.apply();
      } catch {
        action.inverse();
        throw new Error('delete failed');
      }
    });
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('delete failed'));

    await expect(deleteEvent('evt-1')).rejects.toThrow();

    expect(growspaceEvents$.get()).toHaveLength(2);
    expect(plantEvents$.get()).toHaveLength(1);
  });
});
