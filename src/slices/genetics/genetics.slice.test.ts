import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as hassCallModule from '../../services/hass-call';
import {
  seedBatches$,
  pollinationEvents$,
  setSeedBatches,
  setPollinationEvents,
  fetchGeneticsData,
  addSeedBatch,
  removeSeedBatch,
  updateSeedBatch,
  logPollinationEvent,
  updatePollinationEvent,
  deletePollinationEvent,
  getLineageTree,
  sowSeed,
  setPlantSex,
  unlinkSeedBatch,
  harvestSeeds,
  getStrainLineageTree,
  updateStrainLineageTree,
  importStrainLineageTree,
} from './index';
import type { SeedBatch, PollinationEvent } from '../../types';
import { LineageNodeSchema } from './schema';

vi.mock('../../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  callServiceReturning: vi.fn().mockResolvedValue(undefined),
  hassCall: vi.fn().mockResolvedValue({}),
  callFetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
  setHass: vi.fn(),
}));

beforeEach(() => {
  setSeedBatches([]);
  setPollinationEvents([]);
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Bootstrap writes
// ---------------------------------------------------------------------------

describe('setSeedBatches', () => {
  it('replaces seedBatches$ with the provided array', () => {
    const batch: SeedBatch = {
      batch_id: 'b1',
      strain_name: 'OG Kush',
      breeder: 'HSO',
      quantity: 10,
      acquisition_date: '2026-01-01',
      generation: 'F1',
      lineage: 'OG x Kush',
      notes: '',
    };
    setSeedBatches([batch]);
    expect(seedBatches$.get()).toEqual([batch]);
  });
});

describe('setPollinationEvents', () => {
  it('replaces pollinationEvents$ with the provided array', () => {
    const event: PollinationEvent = {
      event_id: 'e1',
      date: '2026-03-01',
      donor_plant_id: 'p1',
      receiver_plant_id: 'p2',
      notes: '',
      result_seed_batch_id: null,
    };
    setPollinationEvents([event]);
    expect(pollinationEvents$.get()).toEqual([event]);
  });
});

// ---------------------------------------------------------------------------
// fetchGeneticsData
// ---------------------------------------------------------------------------

describe('fetchGeneticsData', () => {
  it('calls hassCall with get_genetics_data WS command', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce({
      seed_batches: {},
      pollination_events: {},
    });

    await fetchGeneticsData();

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_genetics_data',
      {},
      expect.anything()
    );
  });

  it('populates seedBatches$ from WS response', async () => {
    const batch: SeedBatch = {
      batch_id: 'b1',
      strain_name: 'Blue Dream',
      breeder: 'HSO',
      quantity: 5,
      acquisition_date: '2026-01-01',
      generation: 'F1',
      lineage: '',
      notes: '',
    };
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce({
      seed_batches: { b1: batch },
      pollination_events: {},
    });

    await fetchGeneticsData();

    expect(seedBatches$.get()).toEqual([batch]);
  });

  it('populates pollinationEvents$ from WS response', async () => {
    const event: PollinationEvent = {
      event_id: 'e1',
      date: '2026-03-01',
      donor_plant_id: 'p1',
      receiver_plant_id: 'p2',
      notes: '',
      result_seed_batch_id: null,
    };
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce({
      seed_batches: {},
      pollination_events: { e1: event },
    });

    await fetchGeneticsData();

    expect(pollinationEvents$.get()).toEqual([event]);
  });

  it('does not update atoms when hassCall fails', async () => {
    const existing: SeedBatch = {
      batch_id: 'existing',
      strain_name: 'OG',
      breeder: 'B',
      quantity: 1,
      acquisition_date: '2026-01-01',
      generation: 'S1',
      lineage: '',
      notes: '',
    };
    setSeedBatches([existing]);
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('ws error'));

    await expect(fetchGeneticsData()).rejects.toThrow('ws error');

    expect(seedBatches$.get()).toEqual([existing]);
  });
});

// ---------------------------------------------------------------------------
// addSeedBatch
// ---------------------------------------------------------------------------

describe('addSeedBatch', () => {
  it('calls callService with add_seed_batch and the payload', async () => {
    await addSeedBatch({
      strain_name: 'Blue Dream',
      breeder: 'HSO',
      quantity: 10,
      acquisition_date: '2026-01-01',
      generation: 'F1',
    });

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'add_seed_batch',
      expect.objectContaining({ strain_name: 'Blue Dream', breeder: 'HSO', quantity: 10 })
    );
  });

  it('re-throws when callService fails', async () => {
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('svc error'));

    await expect(
      addSeedBatch({ strain_name: 'Test', breeder: 'B', quantity: 1, acquisition_date: '2026-01-01', generation: 'S1' })
    ).rejects.toThrow('svc error');
  });
});

// ---------------------------------------------------------------------------
// removeSeedBatch
// ---------------------------------------------------------------------------

describe('removeSeedBatch', () => {
  it('calls callService with delete_seed_batch and the batch_id', async () => {
    await removeSeedBatch('batch-123');

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'delete_seed_batch',
      { batch_id: 'batch-123' }
    );
  });

  it('re-throws when callService fails', async () => {
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('del error'));

    await expect(removeSeedBatch('batch-x')).rejects.toThrow('del error');
  });
});

// ---------------------------------------------------------------------------
// updateSeedBatch
// ---------------------------------------------------------------------------

describe('updateSeedBatch', () => {
  it('calls callService with update_seed_batch and the payload', async () => {
    await updateSeedBatch({ batch_id: 'b1', quantity: 5, notes: 'updated' });

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'update_seed_batch',
      expect.objectContaining({ batch_id: 'b1', quantity: 5, notes: 'updated' })
    );
  });

  it('re-throws when callService fails', async () => {
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('upd error'));

    await expect(updateSeedBatch({ batch_id: 'b1' })).rejects.toThrow('upd error');
  });
});

// ---------------------------------------------------------------------------
// logPollinationEvent
// ---------------------------------------------------------------------------

describe('logPollinationEvent', () => {
  it('calls callService with log_pollination and the payload', async () => {
    await logPollinationEvent({
      date: '2026-03-01',
      donor_plant_id: 'p1',
      receiver_plant_id: 'p2',
      notes: 'First attempt',
    });

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'log_pollination',
      expect.objectContaining({ date: '2026-03-01', donor_plant_id: 'p1', receiver_plant_id: 'p2' })
    );
  });

  it('re-throws when callService fails', async () => {
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('log error'));

    await expect(
      logPollinationEvent({ date: '2026-03-01', donor_plant_id: 'p1', receiver_plant_id: 'p2' })
    ).rejects.toThrow('log error');
  });
});

// ---------------------------------------------------------------------------
// updatePollinationEvent
// ---------------------------------------------------------------------------

describe('updatePollinationEvent', () => {
  it('calls callService with update_pollination and the payload', async () => {
    await updatePollinationEvent({ event_id: 'e1', notes: 'Updated' });

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'update_pollination',
      expect.objectContaining({ event_id: 'e1', notes: 'Updated' })
    );
  });

  it('re-throws when callService fails', async () => {
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('upd error'));

    await expect(updatePollinationEvent({ event_id: 'e1' })).rejects.toThrow('upd error');
  });
});

// ---------------------------------------------------------------------------
// deletePollinationEvent
// ---------------------------------------------------------------------------

describe('deletePollinationEvent', () => {
  it('calls callService with delete_pollination and the event_id', async () => {
    await deletePollinationEvent('e1');

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'delete_pollination',
      { event_id: 'e1' }
    );
  });

  it('re-throws when callService fails', async () => {
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('del error'));

    await expect(deletePollinationEvent('e1')).rejects.toThrow('del error');
  });
});

// ---------------------------------------------------------------------------
// getLineageTree
// ---------------------------------------------------------------------------

describe('getLineageTree', () => {
  it('calls hassCall with get_lineage_tree WS command and returns result', async () => {
    const node = { id: 'p1', name: 'OG Kush', type: 'plant' as const, parents: [] };
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce(node);

    const result = await getLineageTree('p1');

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_lineage_tree',
      { plant_id: 'p1' },
      expect.anything()
    );
    expect(result).toEqual(node);
  });

  it('returns null when hassCall fails', async () => {
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('WS fail'));

    const result = await getLineageTree('p1');

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// sowSeed
// ---------------------------------------------------------------------------

describe('sowSeed', () => {
  it('calls callService with sow_seed and batch_id + plant_id', async () => {
    await sowSeed('batch-1', 'plant-1');

    expect(hassCallModule.callService).toHaveBeenCalledWith('growspace_manager', 'sow_seed', {
      batch_id: 'batch-1',
      plant_id: 'plant-1',
    });
  });

  it('re-throws when callService fails', async () => {
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('sow error'));

    await expect(sowSeed('b1', 'p1')).rejects.toThrow('sow error');
  });
});

// ---------------------------------------------------------------------------
// setPlantSex
// ---------------------------------------------------------------------------

describe('setPlantSex', () => {
  it('calls callService with set_plant_sex', async () => {
    await setPlantSex('plant-1', 'female');

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'set_plant_sex',
      { plant_id: 'plant-1', sex: 'female' }
    );
  });

  it('re-throws when callService fails', async () => {
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('sex error'));

    await expect(setPlantSex('p1', 'male')).rejects.toThrow('sex error');
  });
});

// ---------------------------------------------------------------------------
// unlinkSeedBatch
// ---------------------------------------------------------------------------

describe('unlinkSeedBatch', () => {
  it('calls callService with unlink_seed_batch', async () => {
    await unlinkSeedBatch('plant-1');

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'unlink_seed_batch',
      { plant_id: 'plant-1' }
    );
  });

  it('re-throws when callService fails', async () => {
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('unlink error'));

    await expect(unlinkSeedBatch('p1')).rejects.toThrow('unlink error');
  });
});

// ---------------------------------------------------------------------------
// Atom defaults
// ---------------------------------------------------------------------------

describe('seedBatches$', () => {
  it('defaults to an empty array', () => {
    expect(seedBatches$.get()).toEqual([]);
  });
});

describe('pollinationEvents$', () => {
  it('defaults to an empty array', () => {
    expect(pollinationEvents$.get()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// LineageNodeSchema
// ---------------------------------------------------------------------------

describe('LineageNodeSchema', () => {
  it('validates a simple valid lineage node', () => {
    const node = {
      id: 'node-1',
      name: 'OG Kush',
      type: 'plant',
      phenotype: 'Piney',
      generation: 'F1',
    };
    const parsed = LineageNodeSchema.safeParse(node);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(node);
    }
  });

  it('validates a recursive valid lineage node with multiple levels of parents', () => {
    const recursiveNode = {
      id: 'child',
      name: 'Blue Dream Cross',
      type: 'plant',
      parents: [
        {
          id: 'parent-1',
          name: 'Blue Dream',
          type: 'strain',
          parents: [
            {
              id: 'grandparent-1',
              name: 'Super Silver Haze',
              type: 'strain',
            },
            {
              id: 'grandparent-2',
              name: 'Blueberry',
              type: 'strain',
            }
          ]
        },
        {
          id: 'parent-2',
          name: 'Unknown Male',
          type: 'seed_batch',
        }
      ]
    };
    const parsed = LineageNodeSchema.safeParse(recursiveNode);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(recursiveNode);
    }
  });

  it('rejects an invalid node missing required properties', () => {
    const invalidNode = {
      name: 'No ID or Type',
    };
    const parsed = LineageNodeSchema.safeParse(invalidNode);
    expect(parsed.success).toBe(false);
  });

  it('rejects an invalid node with incorrect type enum', () => {
    const invalidNode = {
      id: 'invalid-1',
      name: 'Wrong Type',
      type: 'flower', // invalid enum, should be plant/seed_batch/strain
    };
    const parsed = LineageNodeSchema.safeParse(invalidNode);
    expect(parsed.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// harvestSeeds
// ---------------------------------------------------------------------------

describe('harvestSeeds', () => {
  it('calls callService with harvest_seeds and the payload', async () => {
    const payload = {
      event_id: 'event-123',
      quantity: 50,
      notes: 'Beautiful seeds harvested',
    };
    await harvestSeeds(payload);

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'harvest_seeds',
      payload
    );
  });

  it('re-throws when callService fails', async () => {
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('harvest error'));

    await expect(
      harvestSeeds({ event_id: 'event-123', quantity: 10 })
    ).rejects.toThrow('harvest error');
  });
});

// ---------------------------------------------------------------------------
// getStrainLineageTree
// ---------------------------------------------------------------------------

describe('getStrainLineageTree', () => {
  it('calls hassCall with get_strain_lineage_tree WS command and returns result', async () => {
    const node = { id: 's1', name: 'Blue Dream', type: 'strain' as const, parents: [] };
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce(node);

    const result = await getStrainLineageTree('Blue Dream');

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_strain_lineage_tree',
      { strain_name: 'Blue Dream' },
      LineageNodeSchema
    );
    expect(result).toEqual(node);
  });

  it('returns null when hassCall fails', async () => {
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('WS fail'));

    const result = await getStrainLineageTree('Blue Dream');

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateStrainLineageTree
// ---------------------------------------------------------------------------

describe('updateStrainLineageTree', () => {
  it('calls hassCall with update_strain_lineage_tree WS command and returns result', async () => {
    const parents = [{ name: 'Parent Strain', source: 'library' as const }];
    const response = { lineage: 'custom lineage representation' };
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce(response);

    const result = await updateStrainLineageTree('Blue Dream', parents);

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/update_strain_lineage_tree',
      { strain_name: 'Blue Dream', parents },
      expect.anything()
    );
    expect(result).toEqual(response);
  });

  it('re-throws when hassCall fails', async () => {
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('WS fail'));

    await expect(
      updateStrainLineageTree('Blue Dream', [])
    ).rejects.toThrow('WS fail');
  });
});

// ---------------------------------------------------------------------------
// importStrainLineageTree
// ---------------------------------------------------------------------------

describe('importStrainLineageTree', () => {
  it('calls hassCall with import_strain_lineage_tree WS command', async () => {
    const tree = { name: 'Direct Strain' };
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce(undefined);

    await importStrainLineageTree('Blue Dream', tree);

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/import_strain_lineage_tree',
      { strain_name: 'Blue Dream', tree },
      expect.anything()
    );
  });

  it('re-throws when hassCall fails', async () => {
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('WS fail'));

    await expect(
      importStrainLineageTree('Blue Dream', {})
    ).rejects.toThrow('WS fail');
  });
});
