
import {
    AddPlantDialogState,
    PlantOverviewDialogState,
    StrainLibraryDialogState,
    ConfigDialogState,
    GrowMasterDialogState,
    StrainRecommendationDialogState
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
    | { type: 'IRRIGATION'; payload: boolean }
    | { type: 'LOGBOOK'; payload: { growspaceId: string } };
