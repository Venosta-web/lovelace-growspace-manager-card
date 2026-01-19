import {
  AddPlantDialogState,
  AddPlantsDialogState,
  PlantOverviewDialogState,
  StrainLibraryDialogState,
  ConfigDialogState,
  GrowMasterDialogState,
  StrainRecommendationDialogState,
  WateringDialogState,
  NutrientPresetsDialogState,
  TrainingDialogState,
  IPMDialogState,
  CloneDialogState,
} from './types';

// Discriminated union for central dialog management
export type ActiveDialogState =
  | { type: 'NONE' }
  | { type: 'ADD_PLANT'; payload: AddPlantDialogState }
  | { type: 'ADD_PLANTS'; payload: AddPlantsDialogState }
  | { type: 'PLANT_OVERVIEW'; payload: PlantOverviewDialogState }
  | { type: 'STRAIN_LIBRARY'; payload: StrainLibraryDialogState }
  | { type: 'CONFIG'; payload: ConfigDialogState }
  | { type: 'GROW_MASTER'; payload: GrowMasterDialogState }
  | { type: 'STRAIN_RECOMMENDATION'; payload: StrainRecommendationDialogState }
  | { type: 'IRRIGATION'; payload: Record<string, never> }
  | { type: 'LOGBOOK'; payload: { growspaceId: string } }
  | { type: 'WATERING'; payload: WateringDialogState }
  | { type: 'NUTRIENT_PRESETS'; payload: NutrientPresetsDialogState }
  | { type: 'TRAINING'; payload: TrainingDialogState }
  | { type: 'IPM'; payload: IPMDialogState }
  | { type: 'TAKE_CLONE'; payload: CloneDialogState }
  | { type: 'NUTRIENT_INVENTORY'; payload: Record<string, never> }
  | { type: 'NUTRIENTS'; payload: Record<string, never> };
