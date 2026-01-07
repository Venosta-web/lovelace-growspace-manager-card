import {
  AddPlantDialogState,
  PlantOverviewDialogState,
  StrainLibraryDialogState,
  ConfigDialogState,
  GrowMasterDialogState,
  StrainRecommendationDialogState,
  WateringDialogState,
  NutrientPresetsDialogState,
  TrainingDialogState,
} from './types';

// Discriminated union for central dialog management
export type ActiveDialogState =
  | { type: 'NONE' }
  | { type: 'ADD_PLANT'; payload: AddPlantDialogState }
  | { type: 'PLANT_OVERVIEW'; payload: PlantOverviewDialogState }
  | { type: 'STRAIN_LIBRARY'; payload: StrainLibraryDialogState }
  | { type: 'CONFIG'; payload: ConfigDialogState }
  | { type: 'GROW_MASTER'; payload: GrowMasterDialogState }
  | { type: 'STRAIN_RECOMMENDATION'; payload: StrainRecommendationDialogState }
  | { type: 'IRRIGATION'; payload: {} }
  | { type: 'LOGBOOK'; payload: { growspaceId: string } }
  | { type: 'WATERING'; payload: WateringDialogState }
  | { type: 'NUTRIENT_PRESETS'; payload: NutrientPresetsDialogState }
  | { type: 'TRAINING'; payload: TrainingDialogState };

