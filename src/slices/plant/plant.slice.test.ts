/**
 * Plant slice — unit tests.
 *
 * Tests cover each mutator's:
 *   - apply (hassCall invoked with correct command and params)
 *   - optimistic (atom updated immediately where applicable)
 *   - inverse (atom rolled back on apply failure)
 *
 * `hassCall` is mocked; `mutate` runs real to exercise the orchestration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PlantEntity } from '../../features/plants/types';
import * as hassCallModule from '../../services/hass-call';
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
  moveClone,
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
  hassCall: vi.fn().mockResolvedValue(undefined),
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

/** Plant with no plant_id — exercises the entity_id fallback in all id-resolution paths. */
function makePlantNoId(entityId: string, overrides: Partial<PlantEntity['attributes']> = {}): PlantEntity {
  const { plant_id: _omit, ...base } = {
    strain: 'AK47',
    stage: 'veg' as const,
    row: 0,
    col: 0,
    growspace_id: 'gs1',
    ...overrides,
  } as Partial<PlantEntity['attributes']> & { plant_id?: string };
  return {
    entity_id: entityId,
    state: 'veg',
    attributes: base as PlantEntity['attributes'],
  } as PlantEntity;
}

beforeEach(() => {
  plants$.set([]);
  selectedPlant$.set(null);
  vi.clearAllMocks();
  vi.mocked(hassCallModule.hassCall).mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// addPlant
// ---------------------------------------------------------------------------

describe('addPlant', () => {
  it('calls add_plant WS command with the provided params', async () => {
    await addPlant({ growspace_id: 'gs1', row: 0, col: 0, strain: 'AK47' });

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/add_plant',
      expect.objectContaining({ growspace_id: 'gs1', row: 0, col: 0, strain: 'AK47' }),
      expect.anything()
    );
  });

  it('passes optional fields to the command when provided', async () => {
    await addPlant({
      growspace_id: 'gs1',
      row: 1,
      col: 2,
      strain: 'OG Kush',
      phenotype: 'P1',
      veg_start: '2026-01-01',
    });

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/add_plant',
      expect.objectContaining({ phenotype: 'P1', veg_start: '2026-01-01' }),
      expect.anything()
    );
  });

  it('rethrows when the WS command fails', async () => {
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('network'));

    await expect(addPlant({ growspace_id: 'gs1', row: 0, col: 0, strain: 'AK47' })).rejects.toThrow(
      'network'
    );
  });
});

// ---------------------------------------------------------------------------
// addPlants
// ---------------------------------------------------------------------------

describe('addPlants', () => {
  it('calls add_plants WS command with the provided params', async () => {
    await addPlants({ growspace_id: 'gs1', strain: 'Blue Dream', amount: 3 });

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/add_plants',
      expect.objectContaining({ growspace_id: 'gs1', strain: 'Blue Dream', amount: 3 }),
      expect.anything()
    );
  });
});

// ---------------------------------------------------------------------------
// updatePlant
// ---------------------------------------------------------------------------

describe('updatePlant', () => {
  it('calls update_plant WS command with plant_id and the update fields', async () => {
    await updatePlant('abc', { strain: 'White Widow' });

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/update_plant',
      expect.objectContaining({ plant_id: 'abc', strain: 'White Widow' }),
      expect.anything()
    );
  });

  it('optimistically patches the plant in plants$ before the WS command', async () => {
    setPlants([makePlant({ plant_id: 'abc', strain: 'AK47' })]);

    let atomDuringApply = plants$.get();

    vi.mocked(hassCallModule.hassCall).mockImplementationOnce(async () => {
      atomDuringApply = plants$.get();
    });

    await updatePlant('abc', { strain: 'OG Kush' });

    expect(atomDuringApply[0].attributes.strain).toBe('OG Kush');
  });

  it('rolls back plants$ when the WS command fails', async () => {
    setPlants([makePlant({ plant_id: 'abc', strain: 'AK47' })]);

    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('fail'));

    await expect(updatePlant('abc', { strain: 'Bad Name' })).rejects.toThrow('fail');

    expect(plants$.get()[0].attributes.strain).toBe('AK47');
  });

  it('leaves plants$ unchanged when the plant_id is not in the list', async () => {
    setPlants([makePlant({ plant_id: 'xyz' })]);

    await updatePlant('abc', { strain: 'OG Kush' });

    expect(plants$.get()[0].attributes.plant_id).toBe('xyz');
  });

  it('patches a plant identified by entity_id when plant_id is absent', async () => {
    setPlants([makePlantNoId('sensor.plant_noid', { strain: 'AK47' })]);

    await updatePlant('plant_noid', { strain: 'OG Kush' });

    expect(plants$.get()[0].attributes.strain).toBe('OG Kush');
  });
});

// ---------------------------------------------------------------------------
// deletePlant
// ---------------------------------------------------------------------------

describe('deletePlant', () => {
  it('calls remove_plant WS command with the plant_id', async () => {
    await deletePlant('abc');

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/remove_plant',
      { plant_id: 'abc' },
      expect.anything()
    );
  });

  it('optimistically removes the plant from plants$ before the WS command', async () => {
    setPlants([makePlant({ plant_id: 'abc' }), makePlant({ plant_id: 'xyz' })]);

    let atomDuringApply: PlantEntity[] = [];

    vi.mocked(hassCallModule.hassCall).mockImplementationOnce(async () => {
      atomDuringApply = plants$.get();
    });

    await deletePlant('abc');

    expect(atomDuringApply.map((p) => p.attributes.plant_id)).not.toContain('abc');
    expect(atomDuringApply.map((p) => p.attributes.plant_id)).toContain('xyz');
  });

  it('restores the plant in plants$ when the WS command fails', async () => {
    const plant = makePlant({ plant_id: 'abc' });
    setPlants([plant]);

    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('fail'));

    await expect(deletePlant('abc')).rejects.toThrow('fail');

    expect(plants$.get().map((p) => p.attributes.plant_id)).toContain('abc');
  });
});

// ---------------------------------------------------------------------------
// harvestPlant
// ---------------------------------------------------------------------------

describe('harvestPlant', () => {
  it('calls harvest_plant WS command with plant_id and target growspace', async () => {
    await harvestPlant('abc', 'dry');

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/harvest_plant',
      expect.objectContaining({ plant_id: 'abc', target_growspace_id: 'dry' }),
      expect.anything()
    );
  });

  it('includes optional yield metrics when provided', async () => {
    await harvestPlant('abc', 'dry', { wet_weight: 120 });

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/harvest_plant',
      expect.objectContaining({ wet_weight: 120 }),
      expect.anything()
    );
  });
});

// ---------------------------------------------------------------------------
// movePlantToGrowspace
// ---------------------------------------------------------------------------

describe('movePlantToGrowspace', () => {
  it('calls move_plant WS command for non-clone stages', async () => {
    const plant = makePlant({ plant_id: 'abc', stage: 'flower' });

    await movePlantToGrowspace(plant, 'dry-room');

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/move_plant',
      expect.objectContaining({ plant_id: 'abc', target_growspace_id: 'dry-room' }),
      expect.anything()
    );
  });

  it('calls move_clone WS command when the plant stage is clone', async () => {
    const plant = makePlant({ plant_id: 'abc', stage: 'clone' });

    await movePlantToGrowspace(plant, 'veg-room');

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/move_clone',
      expect.objectContaining({ plant_id: 'abc', target_growspace_id: 'veg-room' }),
      expect.anything()
    );
  });
});

// ---------------------------------------------------------------------------
// swapPlants
// ---------------------------------------------------------------------------

describe('swapPlants', () => {
  it('calls switch_plants WS command with both plant IDs', async () => {
    await swapPlants('abc', 'xyz');

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/switch_plants',
      { plant1_id: 'abc', plant2_id: 'xyz' },
      expect.anything()
    );
  });

  it('optimistically swaps row/col for both plants in plants$', async () => {
    const p1 = makePlant({ plant_id: 'abc', row: 0, col: 0 });
    const p2 = makePlant({ plant_id: 'xyz', row: 1, col: 2 });
    setPlants([p1, p2]);

    let atomDuringApply: PlantEntity[] = [];

    vi.mocked(hassCallModule.hassCall).mockImplementationOnce(async () => {
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

  it('rolls back the swap when the WS command fails', async () => {
    const p1 = makePlant({ plant_id: 'abc', row: 0, col: 0 });
    const p2 = makePlant({ plant_id: 'xyz', row: 1, col: 2 });
    setPlants([p1, p2]);

    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('fail'));

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
  it('calls take_clone WS command with mother plant id', async () => {
    const mother = makePlant({ plant_id: 'mom', stage: 'mother' });

    await takeClone(mother);

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/take_clone',
      expect.objectContaining({ mother_plant_id: 'mom' }),
      expect.anything()
    );
  });

  it('includes num_clones when provided', async () => {
    const mother = makePlant({ plant_id: 'mom', stage: 'mother' });

    await takeClone(mother, 4, 'clone-room');

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/take_clone',
      expect.objectContaining({
        mother_plant_id: 'mom',
        num_clones: 4,
        target_growspace_id: 'clone-room',
      }),
      expect.anything()
    );
  });
});

// ---------------------------------------------------------------------------
// printLabel
// ---------------------------------------------------------------------------

describe('printLabel', () => {
  it('calls print_label WS command with provided params', async () => {
    await printLabel({ plantId: 'abc', strain: 'AK47', phenotype: 'P1' });

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/print_label',
      expect.objectContaining({ plant_id: 'abc', strain: 'AK47', phenotype: 'P1' }),
      expect.anything()
    );
  });

  it('passes preview flag when specified', async () => {
    await printLabel({ strain: 'AK47', preview: true });

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/print_label',
      expect.objectContaining({ preview: true }),
      expect.anything()
    );
  });

  it('includes breeder, lineage, breederLogo, and deviceId when provided', async () => {
    await printLabel({
      strain: 'OG Kush',
      breeder: 'Serious Seeds',
      lineage: 'Skunk x Afghani',
      breederLogo: 'https://example.com/logo.png',
      deviceId: 'printer-1',
    });

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/print_label',
      expect.objectContaining({
        breeder: 'Serious Seeds',
        lineage: 'Skunk x Afghani',
        breeder_logo: 'https://example.com/logo.png',
        device_id: 'printer-1',
      }),
      expect.anything()
    );
  });

  it('omits strain from the payload when not provided', async () => {
    await printLabel({ plantId: 'abc' });

    const params = vi.mocked(hassCallModule.hassCall).mock.calls[0][1] as Record<string, unknown>;
    expect(params).toHaveProperty('plant_id', 'abc');
    expect(params).not.toHaveProperty('strain');
  });

  it('includes baseUrl, fields, sizeId, density, and qrTarget when provided', async () => {
    const fields = {
      name: true,
      phenotype: true,
      breeder: false,
      lineage: false,
      startDate: false,
      stageAge: false,
      plantId: true,
      logo: false,
      qr: true,
    } as import('../../lib/types/dialog').LabelFieldVisibility;

    await printLabel({
      strain: 'AK47',
      baseUrl: 'https://ha.local:8123',
      fields,
      sizeId: '62x29',
      density: '300dpi',
      qrTarget: 'plant_id',
    });

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/print_label',
      expect.objectContaining({
        base_url: 'https://ha.local:8123',
        fields,
        label_size: '62x29',
        density: '300dpi',
        qr_target: 'plant_id',
      }),
      expect.anything()
    );
  });
});

// ---------------------------------------------------------------------------
// saveHarvestMetrics
// ---------------------------------------------------------------------------

describe('saveHarvestMetrics', () => {
  it('calls update_harvest_metrics WS command with plant_id and metrics', async () => {
    await saveHarvestMetrics('abc', { wet_weight: 200, dry_weight: 50 });

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/update_harvest_metrics',
      expect.objectContaining({ plant_id: 'abc', wet_weight: 200, dry_weight: 50 }),
      expect.anything()
    );
  });

  it('is a no-op when metrics object is empty', async () => {
    await saveHarvestMetrics('abc', {});

    expect(hassCallModule.hassCall).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// scorePlant
// ---------------------------------------------------------------------------

describe('scorePlant', () => {
  it('calls score_plant WS command with plant_id and score fields', async () => {
    await scorePlant('abc', { vigor: 4, aroma: 5 });

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/score_plant',
      expect.objectContaining({ plant_id: 'abc', vigor: 4, aroma: 5 }),
      expect.anything()
    );
  });

  it('is a no-op when all score values are null', async () => {
    await scorePlant('abc', { vigor: null, aroma: null });

    expect(hassCallModule.hassCall).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// logDryingWeight
// ---------------------------------------------------------------------------

describe('logDryingWeight', () => {
  it('calls log_drying_weight WS command with plant_id and weight', async () => {
    await logDryingWeight('abc', 150.5);

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/log_drying_weight',
      expect.objectContaining({ plant_id: 'abc', weight_grams: 150.5 }),
      expect.anything()
    );
  });

  it('includes date when provided', async () => {
    await logDryingWeight('abc', 150.5, '2026-05-20');

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/log_drying_weight',
      expect.objectContaining({ date: '2026-05-20' }),
      expect.anything()
    );
  });
});

// ---------------------------------------------------------------------------
// logMoistureReading
// ---------------------------------------------------------------------------

describe('logMoistureReading', () => {
  it('calls log_moisture_reading WS command with plant_id and moisture_percent', async () => {
    await logMoistureReading('abc', 65.0);

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/log_moisture_reading',
      expect.objectContaining({ plant_id: 'abc', moisture_percent: 65.0 }),
      expect.anything()
    );
  });

  it('includes date in the payload when provided', async () => {
    await logMoistureReading('abc', 65.0, '2026-05-25');

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/log_moisture_reading',
      expect.objectContaining({ date: '2026-05-25' }),
      expect.anything()
    );
  });
});

// ---------------------------------------------------------------------------
// setVisualTag
// ---------------------------------------------------------------------------

describe('setVisualTag', () => {
  it('calls set_visual_tag WS command with plant_id and tag', async () => {
    await setVisualTag('abc', 'keeper');

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/set_visual_tag',
      { plant_id: 'abc', visual_tag: 'keeper' },
      expect.anything()
    );
  });

  it('passes null to clear the visual tag', async () => {
    await setVisualTag('abc', null);

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/set_visual_tag',
      { plant_id: 'abc', visual_tag: null },
      expect.anything()
    );
  });
});

// ---------------------------------------------------------------------------
// waterPlant (pilot — regression guard)
// ---------------------------------------------------------------------------

describe('waterPlant (pilot regression)', () => {
  it('calls water_plant WS command with plant_id and amount', async () => {
    await waterPlant('abc', 250);

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/water_plant',
      expect.objectContaining({ plant_id: 'abc', amount: 250 }),
      expect.anything()
    );
  });

  it('includes nutrients in the payload when provided and non-empty', async () => {
    await waterPlant('abc', 300, { 'cal-mag': 2.5, 'bloom-a': 1.0 });

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/water_plant',
      expect.objectContaining({ nutrients: { 'cal-mag': 2.5, 'bloom-a': 1.0 } }),
      expect.anything()
    );
  });

  it('omits nutrients from the payload when the nutrients map is empty', async () => {
    await waterPlant('abc', 300, {});

    const params = vi.mocked(hassCallModule.hassCall).mock.calls[0][1] as Record<string, unknown>;
    expect(params).not.toHaveProperty('nutrients');
  });

  it('includes preset_id in the payload when provided', async () => {
    await waterPlant('abc', 300, undefined, 'feed-week-4');

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/water_plant',
      expect.objectContaining({ preset_id: 'feed-week-4' }),
      expect.anything()
    );
  });
});

// ---------------------------------------------------------------------------
// harvestPlant — full metric set
// ---------------------------------------------------------------------------

describe('harvestPlant (all metrics)', () => {
  it('includes all supported metric fields when provided', async () => {
    await harvestPlant('abc', 'dry', {
      wet_weight: 100,
      dry_weight: 25,
      trim_weight: 5,
      thc_percentage: 22,
      cbd_percentage: 1,
      terpene_profile: 'earthy',
    });

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/harvest_plant',
      expect.objectContaining({
        wet_weight: 100,
        dry_weight: 25,
        trim_weight: 5,
        thc_percentage: 22,
        cbd_percentage: 1,
        terpene_profile: 'earthy',
      }),
      expect.anything()
    );
  });

  it('omits wet_weight from the payload when only other metrics are provided', async () => {
    await harvestPlant('abc', 'dry', { dry_weight: 25 });

    const params = vi.mocked(hassCallModule.hassCall).mock.calls[0][1] as Record<string, unknown>;
    expect(params).not.toHaveProperty('wet_weight');
    expect(params).toHaveProperty('dry_weight', 25);
  });
});

// ---------------------------------------------------------------------------
// movePlantToGrowspace — transition_date and rollback
// ---------------------------------------------------------------------------

describe('movePlantToGrowspace (extended)', () => {
  it('includes transition_date in the payload when provided', async () => {
    const plant = makePlant({ plant_id: 'abc', stage: 'veg' });

    await movePlantToGrowspace(plant, 'flower-room', '2026-06-01');

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/move_plant',
      expect.objectContaining({ transition_date: '2026-06-01' }),
      expect.anything()
    );
  });

  it('removes the optimistic delete marker when the WS command fails', async () => {
    const plant = makePlant({ plant_id: 'abc', stage: 'veg' });
    setPlants([plant]);

    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('network'));

    await expect(movePlantToGrowspace(plant, 'flower-room')).rejects.toThrow('network');
  });
});

// ---------------------------------------------------------------------------
// swapPlants — third plant stays put
// ---------------------------------------------------------------------------

describe('swapPlants (with bystander plant)', () => {
  it('leaves a third plant untouched during the swap', async () => {
    const p1 = makePlant({ plant_id: 'abc', row: 0, col: 0 });
    const p2 = makePlant({ plant_id: 'xyz', row: 1, col: 2 });
    const p3 = makePlant({ plant_id: 'bystander', row: 2, col: 2 });
    setPlants([p1, p2, p3]);

    await swapPlants('abc', 'xyz');

    const after = plants$.get().find((p) => p.attributes.plant_id === 'bystander')!;
    expect(after.attributes.row).toBe(2);
    expect(after.attributes.col).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// moveClone
// ---------------------------------------------------------------------------

describe('moveClone', () => {
  it('calls move_clone WS command without transition_date when not provided', async () => {
    await moveClone('abc', 'veg-room');

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/move_clone',
      { plant_id: 'abc', target_growspace_id: 'veg-room' },
      expect.anything()
    );
    const params = vi.mocked(hassCallModule.hassCall).mock.calls[0][1] as Record<string, unknown>;
    expect(params).not.toHaveProperty('transition_date');
  });

  it('includes transition_date in the payload when provided', async () => {
    await moveClone('abc', 'veg-room', '2026-06-01');

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/move_clone',
      { plant_id: 'abc', target_growspace_id: 'veg-room', transition_date: '2026-06-01' },
      expect.anything()
    );
  });

  it('removes the optimistic delete marker when the WS command fails', async () => {
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('network'));

    await expect(moveClone('abc', 'veg-room')).rejects.toThrow('network');
  });
});

// ---------------------------------------------------------------------------
// takeClone — optional branch coverage
// ---------------------------------------------------------------------------

describe('takeClone (optional branches)', () => {
  it('omits num_clones from payload when not provided', async () => {
    const mother = makePlant({ plant_id: 'mom', stage: 'mother' });

    await takeClone(mother);

    const params = vi.mocked(hassCallModule.hassCall).mock.calls[0][1] as Record<string, unknown>;
    expect(params).not.toHaveProperty('num_clones');
    expect(params).not.toHaveProperty('target_growspace_id');
  });

  it('omits target_growspace_id from payload when not provided', async () => {
    const mother = makePlant({ plant_id: 'mom', stage: 'mother' });

    await takeClone(mother, 3);

    const params = vi.mocked(hassCallModule.hassCall).mock.calls[0][1] as Record<string, unknown>;
    expect(params).toHaveProperty('num_clones', 3);
    expect(params).not.toHaveProperty('target_growspace_id');
  });
});

// ---------------------------------------------------------------------------
// entity_id fallback — plants without plant_id use entity_id for identification
// ---------------------------------------------------------------------------

describe('entity_id fallback (plant_id absent)', () => {
  it('deletePlant resolves plant by entity_id when plant_id is absent', async () => {
    const plant = makePlantNoId('sensor.plant_xyz');
    setPlants([plant]);

    await deletePlant('plant_xyz');

    expect(plants$.get()).toHaveLength(0);
  });

  it('movePlantToGrowspace resolves plant_id from entity_id when plant_id is absent', async () => {
    const plant = makePlantNoId('sensor.plant_xyz', { stage: 'veg' });
    setPlants([plant]);

    await movePlantToGrowspace(plant, 'flower-room');

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/move_plant',
      expect.objectContaining({ plant_id: 'plant_xyz', target_growspace_id: 'flower-room' }),
      expect.anything()
    );
  });

  it('takeClone resolves mother plant_id from entity_id when plant_id is absent', async () => {
    const mother = makePlantNoId('sensor.plant_mom', { stage: 'mother' });
    setPlants([mother]);

    await takeClone(mother);

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/take_clone',
      expect.objectContaining({ mother_plant_id: 'plant_mom' }),
      expect.anything()
    );
  });

  it('swapPlants resolves plant IDs from entity_id when plant_id is absent', async () => {
    const p1 = makePlantNoId('sensor.plant_aaa', { row: 0, col: 0 });
    const p2 = makePlantNoId('sensor.plant_bbb', { row: 1, col: 1 });
    setPlants([p1, p2]);

    await swapPlants('plant_aaa', 'plant_bbb');

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/switch_plants',
      { plant1_id: 'plant_aaa', plant2_id: 'plant_bbb' },
      expect.anything()
    );
  });
});
