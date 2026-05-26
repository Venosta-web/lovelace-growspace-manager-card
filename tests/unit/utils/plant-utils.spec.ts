import { describe, it, expect } from 'vitest';
import { PLANT_STAGES, PlantUtils } from '../../../src/utils/plant-utils';
import { PlantStage } from '../../../src/types';

describe('plant-utils', () => {
  describe('PLANT_STAGES', () => {
    it('exports all 7 plant stages in the correct order', () => {
      expect(PLANT_STAGES).toHaveLength(7);
      expect(PLANT_STAGES[0]).toBe(PlantStage.SEEDLING);
      expect(PLANT_STAGES[1]).toBe(PlantStage.MOTHER);
      expect(PLANT_STAGES[2]).toBe(PlantStage.CLONE);
      expect(PLANT_STAGES[3]).toBe(PlantStage.VEG);
      expect(PLANT_STAGES[4]).toBe(PlantStage.FLOWER);
      expect(PLANT_STAGES[5]).toBe(PlantStage.DRY);
      expect(PLANT_STAGES[6]).toBe(PlantStage.CURE);
    });
  });

  describe('PlantUtils.getPlantDisplayData', () => {
    const makeBasePlant = (strain: string, state = 'veg') =>
      ({
        entity_id: 'plant.test',
        state,
        attributes: { strain },
      }) as any;

    it('resolves breederLogo when strain library has a matching entry with breeder_logo', () => {
      const plant = makeBasePlant('OG Kush');
      const library = [
        {
          key: 'og|default',
          strain: 'OG Kush',
          phenotype: 'default',
          breeder: 'Seedsman',
          breeder_logo: '/logos/seedsman.webp',
          image: '',
          image_crop_meta: undefined,
        },
      ] as any[];

      const data = PlantUtils.getPlantDisplayData(plant, library);
      expect(data.breederLogo).toBe('/logos/seedsman.webp');
    });

    it('leaves breederLogo undefined when no library entry has a breeder_logo', () => {
      const plant = makeBasePlant('White Widow');
      const library = [
        {
          key: 'ww|default',
          strain: 'White Widow',
          phenotype: 'default',
          breeder: 'Royal Queen Seeds',
          breeder_logo: '',
          image: '',
        },
      ] as any[];

      const data = PlantUtils.getPlantDisplayData(plant, library);
      expect(data.breederLogo).toBeUndefined();
    });

    it('falls back to stage image when no library entry matches', () => {
      const plant = makeBasePlant('Unknown Strain', 'veg');
      const data = PlantUtils.getPlantDisplayData(plant, []);
      expect(data.imageUrl).toContain('/growspace_manager/static/stages/');
    });
  });
});
