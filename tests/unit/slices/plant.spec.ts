import { describe, it, expect, vi, beforeEach } from 'vitest';
import { atom } from 'nanostores';

// Mock mutate so unit tests don't need a real hass
vi.mock('../../../src/services/mutate', () => ({
  mutate: vi.fn().mockImplementation(async (action) => {
    action.optimistic();
    await action.apply();
  }),
  canUndo: vi.fn().mockReturnValue(false),
  undo: vi.fn(),
}));

// Mock hass-call seam
vi.mock('../../../src/services/hass-call', () => ({
  hassCall: vi.fn().mockResolvedValue(undefined),
  setHass: vi.fn(),
  callService: vi.fn().mockResolvedValue(undefined),
}));

import {
  plants$,
  selectedPlant$,
  setPlants,
  waterPlant,
  waterGrowspace,
} from '../../../src/slices/plant';
import { mutate } from '../../../src/services/mutate';
import { hassCall, callService } from '../../../src/services/hass-call';
import type { PlantEntity } from '../../../src/features/plants/types';

function makePlant(id: string): PlantEntity {
  return {
    entity_id: `sensor.${id}`,
    state: 'active',
    attributes: {
      plant_id: id,
      friendly_name: `Plant ${id}`,
    },
  } as unknown as PlantEntity;
}

describe('Plant slice', () => {
  beforeEach(() => {
    setPlants([]);
    selectedPlant$.set(null);
    vi.clearAllMocks();
  });

  describe('atoms', () => {
    it('plants$ starts empty', () => {
      expect(plants$.get()).toEqual([]);
    });

    it('selectedPlant$ starts null', () => {
      expect(selectedPlant$.get()).toBeNull();
    });

    it('setPlants updates plants$', () => {
      const p = makePlant('plant-1');
      setPlants([p]);
      expect(plants$.get()).toEqual([p]);
    });
  });

  describe('waterPlant mutator', () => {
    it('calls mutate with type waterPlant', async () => {
      await waterPlant('plant-1', 500);
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'waterPlant' }),
        expect.any(String),
      );
    });

    it('apply calls hassCall with correct payload', async () => {
      await waterPlant('plant-1', 250);

      expect(hassCall).toHaveBeenCalledWith(
        'growspace_manager/water_plant',
        expect.objectContaining({ plant_id: 'plant-1', amount: 250 }),
        expect.anything(),
      );
    });

    it('passes optional nutrients to hassCall', async () => {
      await waterPlant('plant-2', 100, { nitrogen: 5 });

      expect(hassCall).toHaveBeenCalledWith(
        'growspace_manager/water_plant',
        expect.objectContaining({ nutrients: { nitrogen: 5 } }),
        expect.anything(),
      );
    });
  });

  describe('waterGrowspace mutator', () => {
    it('calls mutate with type waterGrowspace scoped to the growspace id', async () => {
      await waterGrowspace('gs-1', 2000);
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'waterGrowspace' }),
        'gs-1',
      );
    });

    // water_growspace is a SERVICE (no WS command handler in the integration),
    // so the mutator must go through callService, not hassCall.
    it('apply calls callService with correct payload', async () => {
      await waterGrowspace('gs-1', 1500);

      expect(callService).toHaveBeenCalledWith(
        'growspace_manager',
        'water_growspace',
        expect.objectContaining({ growspace_id: 'gs-1', amount: 1500 }),
      );
    });

    it('passes optional nutrients and preset to callService', async () => {
      await waterGrowspace('gs-2', 100, { nitrogen: 5 }, 'preset-1');

      expect(callService).toHaveBeenCalledWith(
        'growspace_manager',
        'water_growspace',
        expect.objectContaining({ nutrients: { nitrogen: 5 }, preset_id: 'preset-1' }),
      );
    });
  });
});
