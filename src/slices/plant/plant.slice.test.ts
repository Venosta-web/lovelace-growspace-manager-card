/**
 * Plant slice — unit tests.
 *
 * Tests cover each mutator's:
 *   - apply (callService called with correct args)
 *   - optimistic (atom updated immediately where applicable)
 *   - inverse (atom rolled back on apply failure)
 *
 * `callService` is mocked; `mutate` runs real to exercise the orchestration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PlantEntity } from '../../features/plants/types';
import * as hassCall from '../../services/hass-call';
import {
  plants$,
  selectedPlant$,
  setPlants,
  addPlant,
  addPlants,
  updatePlant,
  deletePlant,
  harvestPlant,
  movePlantToGrowspace,
  swapPlants,
  takeClone,
  printLabel,
  saveHarvestMetrics,
  scorePlant,
  logDryingWeight,
  logMoistureReading,
  setVisualTag,
  waterPlant,
} from './index';

vi.mock('../../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  setHass: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlant(overrides: Partial<PlantEntity['attributes']> = {}): PlantEntity {
  return {
    entity_id: 'sensor.plant_abc',
    state: 'veg',
    attributes: {
      plant_id: 'abc',
      strain: 'AK47',
      stage: 'veg',
      row: 0,
      col: 0,
      growspace_id: 'gs1',
      ...overrides,
    } as PlantEntity['attributes'],
  } as PlantEntity;
}

beforeEach(() => {
  plants$.set([]);
  selectedPlant$.set(null);
  vi.clearAllMocks();
  vi.mocked(hassCall.callService).mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// addPlant
// ---------------------------------------------------------------------------

describe('addPlant', () => {
  it('calls add_plant service with the provided params', async () => {
    await addPlant({ growspace_id: 'gs1', row: 0, col: 0, strain: 'AK47' });

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'add_plant',
      expect.objectContaining({ growspace_id: 'gs1', row: 0, col: 0, strain: 'AK47' })
    );
  });

  it('passes optional fields to the service when provided', async () => {
    await addPlant({
      growspace_id: 'gs1',
      row: 1,
      col: 2,
      strain: 'OG Kush',
      phenotype: 'P1',
      veg_start: '2026-01-01',
    });

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'add_plant',
      expect.objectContaining({ phenotype: 'P1', veg_start: '2026-01-01' })
    );
  });

  it('rethrows when the service call fails', async () => {
    vi.mocked(hassCall.callService).mockRejectedValueOnce(new Error('network'));

    await expect(addPlant({ growspace_id: 'gs1', row: 0, col: 0, strain: 'AK47' })).rejects.toThrow(
      'network'
    );
  });
});

// ---------------------------------------------------------------------------
// addPlants
// ---------------------------------------------------------------------------

describe('addPlants', () => {
  it('calls add_plants service with the provided params', async () => {
    await addPlants({ growspace_id: 'gs1', strain: 'Blue Dream', amount: 3 });

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'add_plants',
      expect.objectContaining({ growspace_id: 'gs1', strain: 'Blue Dream', amount: 3 })
    );
  });
});

// ---------------------------------------------------------------------------
// updatePlant
// ---------------------------------------------------------------------------

describe('updatePlant', () => {
  it('calls update_plant service with plant_id and the update fields', async () => {
    await updatePlant('abc', { strain: 'White Widow' });

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'update_plant',
      expect.objectContaining({ plant_id: 'abc', strain: 'White Widow' })
    );
  });

  it('optimistically patches the plant in plants$ before the service call', async () => {
    setPlants([makePlant({ plant_id: 'abc', strain: 'AK47' })]);

    let atomDuringApply = plants$.get();

    vi.mocked(hassCall.callService).mockImplementationOnce(async () => {
      atomDuringApply = plants$.get();
    });

    await updatePlant('abc', { strain: 'OG Kush' });

    expect(atomDuringApply[0].attributes.strain).toBe('OG Kush');
  });

  it('rolls back plants$ when the service call fails', async () => {
    setPlants([makePlant({ plant_id: 'abc', strain: 'AK47' })]);

    vi.mocked(hassCall.callService).mockRejectedValueOnce(new Error('fail'));

    await expect(updatePlant('abc', { strain: 'Bad Name' })).rejects.toThrow('fail');

    expect(plants$.get()[0].attributes.strain).toBe('AK47');
  });

  it('leaves plants$ unchanged when the plant_id is not in the list', async () => {
    setPlants([makePlant({ plant_id: 'xyz' })]);

    await updatePlant('abc', { strain: 'OG Kush' });

    expect(plants$.get()[0].attributes.plant_id).toBe('xyz');
  });
});

// ---------------------------------------------------------------------------
// deletePlant
// ---------------------------------------------------------------------------

describe('deletePlant', () => {
  it('calls remove_plant service with the plant_id', async () => {
    await deletePlant('abc');

    expect(hassCall.callService).toHaveBeenCalledWith('growspace_manager', 'remove_plant', {
      plant_id: 'abc',
    });
  });

  it('optimistically removes the plant from plants$ before the service call', async () => {
    setPlants([makePlant({ plant_id: 'abc' }), makePlant({ plant_id: 'xyz' })]);

    let atomDuringApply: PlantEntity[] = [];

    vi.mocked(hassCall.callService).mockImplementationOnce(async () => {
      atomDuringApply = plants$.get();
    });

    await deletePlant('abc');

    expect(atomDuringApply.map((p) => p.attributes.plant_id)).not.toContain('abc');
    expect(atomDuringApply.map((p) => p.attributes.plant_id)).toContain('xyz');
  });

  it('restores the plant in plants$ when the service call fails', async () => {
    const plant = makePlant({ plant_id: 'abc' });
    setPlants([plant]);

    vi.mocked(hassCall.callService).mockRejectedValueOnce(new Error('fail'));

    await expect(deletePlant('abc')).rejects.toThrow('fail');

    expect(plants$.get().map((p) => p.attributes.plant_id)).toContain('abc');
  });
});

// ---------------------------------------------------------------------------
// harvestPlant
// ---------------------------------------------------------------------------

describe('harvestPlant', () => {
  it('calls harvest_plant service with plant_id and target growspace', async () => {
    await harvestPlant('abc', 'dry');

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'harvest_plant',
      expect.objectContaining({ plant_id: 'abc', target_growspace_id: 'dry' })
    );
  });

  it('includes optional yield metrics when provided', async () => {
    await harvestPlant('abc', 'dry', { wet_weight: 120 });

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'harvest_plant',
      expect.objectContaining({ wet_weight: 120 })
    );
  });
});

// ---------------------------------------------------------------------------
// movePlantToGrowspace
// ---------------------------------------------------------------------------

describe('movePlantToGrowspace', () => {
  it('calls move_plant service for non-clone stages', async () => {
    const plant = makePlant({ plant_id: 'abc', stage: 'flower' });

    await movePlantToGrowspace(plant, 'dry-room');

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'move_plant',
      expect.objectContaining({ plant_id: 'abc', target_growspace_id: 'dry-room' })
    );
  });

  it('calls move_clone service when the plant stage is clone', async () => {
    const plant = makePlant({ plant_id: 'abc', stage: 'clone' });

    await movePlantToGrowspace(plant, 'veg-room');

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'move_clone',
      expect.objectContaining({ plant_id: 'abc', target_growspace_id: 'veg-room' })
    );
  });
});

// ---------------------------------------------------------------------------
// swapPlants
// ---------------------------------------------------------------------------

describe('swapPlants', () => {
  it('calls switch_plants service with both plant IDs', async () => {
    await swapPlants('abc', 'xyz');

    expect(hassCall.callService).toHaveBeenCalledWith('growspace_manager', 'switch_plants', {
      plant1_id: 'abc',
      plant2_id: 'xyz',
    });
  });

  it('optimistically swaps row/col for both plants in plants$', async () => {
    const p1 = makePlant({ plant_id: 'abc', row: 0, col: 0 });
    const p2 = makePlant({ plant_id: 'xyz', row: 1, col: 2 });
    setPlants([p1, p2]);

    let atomDuringApply: PlantEntity[] = [];

    vi.mocked(hassCall.callService).mockImplementationOnce(async () => {
      atomDuringApply = plants$.get();
    });

    await swapPlants('abc', 'xyz');

    const pAbc = atomDuringApply.find((p) => p.attributes.plant_id === 'abc')!;
    const pXyz = atomDuringApply.find((p) => p.attributes.plant_id === 'xyz')!;
    expect(pAbc.attributes.row).toBe(1);
    expect(pAbc.attributes.col).toBe(2);
    expect(pXyz.attributes.row).toBe(0);
    expect(pXyz.attributes.col).toBe(0);
  });

  it('rolls back the swap when the service call fails', async () => {
    const p1 = makePlant({ plant_id: 'abc', row: 0, col: 0 });
    const p2 = makePlant({ plant_id: 'xyz', row: 1, col: 2 });
    setPlants([p1, p2]);

    vi.mocked(hassCall.callService).mockRejectedValueOnce(new Error('fail'));

    await expect(swapPlants('abc', 'xyz')).rejects.toThrow('fail');

    const pAbc = plants$.get().find((p) => p.attributes.plant_id === 'abc')!;
    const pXyz = plants$.get().find((p) => p.attributes.plant_id === 'xyz')!;
    expect(pAbc.attributes.row).toBe(0);
    expect(pAbc.attributes.col).toBe(0);
    expect(pXyz.attributes.row).toBe(1);
    expect(pXyz.attributes.col).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// takeClone
// ---------------------------------------------------------------------------

describe('takeClone', () => {
  it('calls take_clone service with mother plant id', async () => {
    const mother = makePlant({ plant_id: 'mom', stage: 'mother' });

    await takeClone(mother);

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'take_clone',
      expect.objectContaining({ mother_plant_id: 'mom' })
    );
  });

  it('includes num_clones when provided', async () => {
    const mother = makePlant({ plant_id: 'mom', stage: 'mother' });

    await takeClone(mother, 4, 'clone-room');

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'take_clone',
      expect.objectContaining({
        mother_plant_id: 'mom',
        num_clones: 4,
        target_growspace_id: 'clone-room',
      })
    );
  });
});

// ---------------------------------------------------------------------------
// printLabel
// ---------------------------------------------------------------------------

describe('printLabel', () => {
  it('calls print_label service with provided params', async () => {
    await printLabel({ plantId: 'abc', strain: 'AK47', phenotype: 'P1' });

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'print_label',
      expect.objectContaining({ plant_id: 'abc', strain: 'AK47', phenotype: 'P1' })
    );
  });

  it('passes preview flag when specified', async () => {
    await printLabel({ strain: 'AK47', preview: true });

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'print_label',
      expect.objectContaining({ preview: true })
    );
  });
});

// ---------------------------------------------------------------------------
// saveHarvestMetrics
// ---------------------------------------------------------------------------

describe('saveHarvestMetrics', () => {
  it('calls update_harvest_metrics service with plant_id and metrics', async () => {
    await saveHarvestMetrics('abc', { wet_weight: 200, dry_weight: 50 });

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'update_harvest_metrics',
      expect.objectContaining({ plant_id: 'abc', wet_weight: 200, dry_weight: 50 })
    );
  });

  it('is a no-op when metrics object is empty', async () => {
    await saveHarvestMetrics('abc', {});

    expect(hassCall.callService).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// scorePlant
// ---------------------------------------------------------------------------

describe('scorePlant', () => {
  it('calls score_plant service with plant_id and score fields', async () => {
    await scorePlant('abc', { vigor: 4, aroma: 5 });

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'score_plant',
      expect.objectContaining({ plant_id: 'abc', vigor: 4, aroma: 5 })
    );
  });

  it('is a no-op when all score values are null', async () => {
    await scorePlant('abc', { vigor: null, aroma: null });

    expect(hassCall.callService).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// logDryingWeight
// ---------------------------------------------------------------------------

describe('logDryingWeight', () => {
  it('calls log_drying_weight service with plant_id and weight', async () => {
    await logDryingWeight('abc', 150.5);

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'log_drying_weight',
      expect.objectContaining({ plant_id: 'abc', weight_grams: 150.5 })
    );
  });

  it('includes date when provided', async () => {
    await logDryingWeight('abc', 150.5, '2026-05-20');

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'log_drying_weight',
      expect.objectContaining({ date: '2026-05-20' })
    );
  });
});

// ---------------------------------------------------------------------------
// logMoistureReading
// ---------------------------------------------------------------------------

describe('logMoistureReading', () => {
  it('calls log_moisture_reading service with plant_id and moisture_percent', async () => {
    await logMoistureReading('abc', 65.0);

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'log_moisture_reading',
      expect.objectContaining({ plant_id: 'abc', moisture_percent: 65.0 })
    );
  });
});

// ---------------------------------------------------------------------------
// setVisualTag
// ---------------------------------------------------------------------------

describe('setVisualTag', () => {
  it('calls set_visual_tag service with plant_id and tag', async () => {
    await setVisualTag('abc', 'keeper');

    expect(hassCall.callService).toHaveBeenCalledWith('growspace_manager', 'set_visual_tag', {
      plant_id: 'abc',
      visual_tag: 'keeper',
    });
  });

  it('passes null to clear the visual tag', async () => {
    await setVisualTag('abc', null);

    expect(hassCall.callService).toHaveBeenCalledWith('growspace_manager', 'set_visual_tag', {
      plant_id: 'abc',
      visual_tag: null,
    });
  });
});

// ---------------------------------------------------------------------------
// waterPlant (pilot — regression guard)
// ---------------------------------------------------------------------------

describe('waterPlant (pilot regression)', () => {
  it('calls water_plant service with plant_id and amount', async () => {
    await waterPlant('abc', 250);

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'water_plant',
      expect.objectContaining({ plant_id: 'abc', amount: 250 })
    );
  });
});
