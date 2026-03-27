import { mdiSprout, mdiFlower, mdiHairDryer, mdiCannabis } from '@mdi/js';
import { PlantStage } from './types';

export const STAGE_CONFIG: Record<PlantStage, { icon: string; title: string; colorVar?: string }> =
{
  [PlantStage.SEEDLING]: {
    icon: mdiSprout,
    title: 'Seedling',
    colorVar: '--state-seedling-color',
  },
  [PlantStage.CLONE]: { icon: mdiSprout, title: 'Clone', colorVar: '--state-clone-color' },
  [PlantStage.MOTHER]: { icon: mdiSprout, title: 'Mother', colorVar: '--state-mother-color' },
  [PlantStage.VEG]: { icon: mdiSprout, title: 'Veg', colorVar: '--state-veg-color' },
  [PlantStage.FLOWER]: { icon: mdiFlower, title: 'Flower', colorVar: '--state-flower-color' },
  [PlantStage.DRY]: { icon: mdiHairDryer, title: 'Dry', colorVar: '--state-dry-color' },
  [PlantStage.CURE]: { icon: mdiCannabis, title: 'Cure', colorVar: '--state-cure-color' },
};
