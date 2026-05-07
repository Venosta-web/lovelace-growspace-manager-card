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
  generation?: string;
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
  focusLineage?: boolean;
  source?: 'add-plant' | 'add-plants' | 'plant-overview';
  returnPayload?: unknown;
  initialTab?: 'strains' | 'seeds';
  view?: 'strains' | 'editor';
}

export interface EnvironmentConfigDialogState {
  deviceId: string;
}

export interface EnvironmentConfigData {
  selectedGrowspaceId: string;

  // Basic sensors (multi)
  temperatureSensors: string[];
  humiditySensors: string[];
  vpdSensors: string[];
  co2Sensor: string;
  soilMoistureSensor: string;

  // Legacy singular (backward compat)
  temperatureSensor: string;
  humiditySensor: string;
  vpdSensor: string;

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
  humidifierThresholds?: Record<string, Record<string, { on: number; off: number }>>;
  humidifierControlEnabled: boolean;

  // Dehumidifier
  dehumidifierEntity: string;
  dehumidifierEntities: string[];
  dehumidifierThresholds?: Record<string, Record<string, { on: number; off: number }>>;
  dehumidifierControlEnabled: boolean;

  sensorGroups?: SensorGroup[];
  sensorCoordinates?: Record<string, { x: number; y: number; z: number; rotation?: number }>;
  irrigationTanks?: any[];
  cameraEntities?: string[];
  visionCheckupConfig?: VisionCheckupConfig;

  // Advanced / irrigation monitoring sensors
  substrateTemperatureSensors?: string[];
  phSensors?: string[];
  feedEcSensors?: string[];
  substrateEcSensors?: string[];
  runoffEcSensors?: string[];
  drainVolumeSensors?: string[];
  irrigationFlowSensors?: string[];
  powerSensors?: string[];
  energySensors?: string[];
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
  // Multi sensors
  temperatureSensors: string[];
  humiditySensors: string[];
  vpdSensors?: string[];
  co2Sensor?: string | null;
  soilMoistureSensor?: string | null;
  // Fans
  circulationFanEntity?: string | null;
  circulationFanEntities?: string[];
  exhaustEntity?: string | null;
  exhaustFanEntities?: string[];
  stressThreshold: number;
  moldThreshold: number;
  lightSensor?: string | null;
  lightSensors?: string[];
  // Humidifier
  humidifierEntity?: string | null;
  humidifierEntities?: string[];
  humidifierThresholds?: Record<string, Record<string, { on: number; off: number }>>;
  humidifierControlEnabled: boolean;
  // Dehumidifier
  dehumidifierEntity?: string | null;
  dehumidifierEntities?: string[];
  dehumidifierThresholds?: Record<string, Record<string, { on: number; off: number }>>;
  dehumidifierControlEnabled: boolean;
  sensorGroups?: SensorGroup[];
  sensorCoordinates?: Record<string, { x: number; y: number; z: number; rotation?: number }>;
  irrigationTanks?: any[];
  cameraEntities?: string[];
  // Advanced / irrigation monitoring
  substrateTemperatureSensors?: string[];
  phSensors?: string[];
  feedEcSensors?: string[];
  substrateEcSensors?: string[];
  runoffEcSensors?: string[];
  drainVolumeSensors?: string[];
  irrigationFlowSensors?: string[];
  powerSensors?: string[];
  energySensors?: string[];
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

export interface BatchPrintLabelsDialogState {
  plantIds: string[];
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

export interface BatchCloneDialogState {
  plantIds: string[];
}
