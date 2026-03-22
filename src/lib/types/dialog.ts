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
  visionCheckupConfig?: VisionCheckupConfig;
}

export interface VisionCheckupConfig {
  enabled: boolean;
  early_check_offset_minutes: number;
  mid_check_hours: number;
  late_check_offset_minutes: number;
}

export interface VisionCheckupResult {
  timestamp: string;
  check_type: 'early' | 'mid' | 'late' | 'manual';
  analysis: string;
  issues_detected: string[];
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  snapshot_paths: string[];
}

export interface VisionCheckupConfigEventDetail {
  growspaceId: string;
  visionCheckupConfig: VisionCheckupConfig;
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

export interface PrintLabelDialogState {
  plantId?: string;
  strainName?: string;
  phenotype?: string;
  lineage?: string;
  breeder?: string;
  breederLogo?: string;
  deviceId?: string;
}

/** State for the harvest scoring modal shown before actually harvesting a plant. */
export interface HarvestScoringDialogState {
  /** The plant being harvested. */
  plant: PlantEntity;
  /** Current score values (1–5 or undefined/null for unset). */
  vigor?: number | null;
  structure?: number | null;
  aroma?: number | null;
  resin?: number | null;
  pestResistance?: number | null;
}

export interface SnapshotsDialogState {
  growspaceId: string;
}

export interface CropSteeringDialogState {
  growspaceId: string;
}

export interface ECRampDialogState {
  growspaceId?: string;
}

export interface GrowReportDialogState {
  growspaceId: string;
}
