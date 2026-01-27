import type {
  PlantEntity,
  PlantAttributes,
  StrainEntry,
} from '../../features/plants/types';
import type { SensorGroup } from '../../features/environment/types';

export interface AddPlantDialogState {
  row: number;
  col: number;
  strain?: string;
  phenotype?: string;
  veg_start?: string;
  flower_start?: string;
  seedling_start?: string;
  mother_start?: string;
  clone_start?: string;
  dry_start?: string;
  cure_start?: string;
  addToLibrary?: boolean;
}

export interface AddPlantsDialogState {
  strain?: string;
  phenotype?: string;
  amount?: number;
  start_number?: number;
  veg_start?: string;
  flower_start?: string;
  seedling_start?: string;
  mother_start?: string;
  clone_start?: string;
  dry_start?: string;
  cure_start?: string;
  addToLibrary?: boolean;
}

export interface PlantOverviewDialogState {
  plant: PlantEntity;
  editedAttributes: Partial<PlantAttributes>;
  activeTab: 'dashboard' | 'actions' | 'timeline' | 'genetics';
  showAllDates?: boolean;
  selectedPlantIds?: string[];
}

export interface StrainLibraryDialogState {
  editingStrain?: StrainEntry;
  source?: 'add-plant' | 'add-plants' | 'plant-overview';
  returnPayload?: unknown;
}

export interface EnvironmentConfigData {
  selectedGrowspaceId: string;
  temperatureSensor: string;
  humiditySensor: string;
  vpdSensor: string;
  co2Sensor: string;

  // Fans
  circulationFanEntity: string;
  circulationFanEntities: string[];
  exhaustEntity: string;
  exhaustFanEntities: string[];

  stressThreshold: number;
  moldThreshold: number;

  // Lights
  lightSensor: string;
  lightSensors: string[];

  // Humidifier
  humidifierEntity: string;
  humidifierEntities: string[];

  // Dehumidifier
  dehumidifierEntity: string;
  dehumidifierEntities: string[];
  dehumidifierThresholds?: Record<string, Record<string, { on: number; off: number }>>;
  dehumidifierControlEnabled: boolean;

  soilMoistureSensor: string;
  sensorGroups?: SensorGroup[];
  sensorCoordinates?: Record<string, { x: number; y: number; z: number; rotation?: number }>;
  irrigationTanks?: any[];
}

export interface EnvironmentConfigEventDetail {
  selectedGrowspaceId: string;
  temperatureSensor: string;
  humiditySensor: string;
  vpdSensor?: string | null;
  co2Sensor?: string | null;
  circulationFanEntity?: string | null;
  circulationFanEntities?: string[];
  stressThreshold: number;
  moldThreshold: number;
  lightSensor?: string | null;
  lightSensors?: string[];
  exhaustEntity?: string | null;
  exhaustFanEntities?: string[];
  humidifierEntity?: string | null;
  humidifierEntities?: string[];
  dehumidifierEntity?: string | null;
  dehumidifierEntities?: string[];
  dehumidifierThresholds?: Record<string, Record<string, { on: number; off: number }>>;
  soilMoistureSensor?: string | null;
  dehumidifierControlEnabled: boolean;
  sensorGroups?: SensorGroup[];
  sensorCoordinates?: Record<string, { x: number; y: number; z: number; rotation?: number }>;
  irrigationTanks?: any[];
}

export interface ConfigDialogState {
  currentTab: 'add_growspace' | 'edit_growspace' | 'environment' | 'dehumidifier' | 'sensor_groups';
  environmentData: EnvironmentConfigData;
}

export interface GrowMasterDialogState {
  growspaceId: string;
  isLoading: boolean;
  response: string | null;
  mode: 'single' | 'all';
}

export interface StrainRecommendationDialogState {
  isLoading: boolean;
  response: string | null;
}

export interface WateringDialogState {
  plantIds?: string[];
  growspaceId?: string;
  mode: 'plant' | 'growspace';
}

export interface TrainingDialogState {
  isOpen: boolean;
  plantIds: string[];
  growspaceId?: string;
}

export interface CloneDialogState {
  sourcePlant: PlantEntity;
  defaultGrowspaceId: string;
}

export interface NutrientPresetsDialogState {
  presetId?: string;
}

export interface IPMDialogState {
  presetId?: string;
  growspaceId?: string;
  plantIds?: string[];
}
