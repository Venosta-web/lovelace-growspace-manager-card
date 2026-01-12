import { LovelaceCardConfig, HomeAssistant } from 'custom-card-helpers';
import { MetricKey, ViewMode, GridOverlayMode as GridOverlayModeEnum, GrowspaceType as GrowspaceTypeEnum } from './constants';
import { HassEntity } from 'home-assistant-js-websocket';
import { mdiSprout, mdiFlower, mdiHairDryer, mdiCannabis } from '@mdi/js';

// --- Configuration ---

export interface GrowspaceManagerCardConfig extends LovelaceCardConfig {
  type: string;
  default_growspace?: string;
  theme?: 'dark' | 'default' | 'green';
  growspaces?: string[];
  initial_view_mode?: ViewMode;
}

export type GrowspaceViewMode = ViewMode;

export { GridOverlayModeEnum };
export type GridOverlayMode = GridOverlayModeEnum;

// --- Enums ---

export enum PlantStage {
  SEEDLING = 'seedling',
  CLONE = 'clone',
  MOTHER = 'mother',
  VEG = 'veg',
  FLOWER = 'flower',
  DRY = 'dry',
  CURE = 'cure',
}

export enum DehumidifierStage {
  SEEDLING = 'seedling',
  VEG = 'veg',
  EARLY_FLOWER = 'early_flower',
  MID_FLOWER = 'mid_flower',
  LATE_FLOWER = 'late_flower',
  DRYING = 'drying',
  CURING = 'curing',
}

export { GrowspaceTypeEnum };
export type GrowspaceType = GrowspaceTypeEnum;

// --- Configuration Constants ---

export const STAGE_CONFIG: Record<PlantStage, { icon: string; title: string; colorVar?: string }> = {
  [PlantStage.SEEDLING]: { icon: mdiSprout, title: 'Seedling', colorVar: '--state-seedling-color' },
  [PlantStage.CLONE]: { icon: mdiSprout, title: 'Clone', colorVar: '--state-clone-color' },
  [PlantStage.MOTHER]: { icon: mdiSprout, title: 'Mother', colorVar: '--state-mother-color' },
  [PlantStage.VEG]: { icon: mdiSprout, title: 'Veg', colorVar: '--state-veg-color' },
  [PlantStage.FLOWER]: { icon: mdiFlower, title: 'Flower', colorVar: '--state-flower-color' },
  [PlantStage.DRY]: { icon: mdiHairDryer, title: 'Dry', colorVar: '--state-dry-color' },
  [PlantStage.CURE]: { icon: mdiCannabis, title: 'Cure', colorVar: '--state-cure-color' },
};

export type HistoryTimeRange = '1h' | '6h' | '24h' | '7d';

// --- Backend Data Models ---

export interface IrrigationScheduleItem {
  time: string; // HH:MM:SS
  duration?: number;
}

// Alias for legacy support
export type IrrigationTime = IrrigationScheduleItem;

export interface IrrigationStrategy {
  enabled: boolean;
  lights_on_time: string;
  p0_duration_minutes: number;
  p2_stop_before_lights_off_minutes: number;
  target_vwc_percent: number;
  maintenance_dryback_percent: number;
  shot_duration_seconds: number;
  shot_interval_minutes: number;
}

export interface IrrigationConfig {
  irrigation_pump_entity?: string | null;
  drain_pump_entity?: string | null;
  irrigation_duration?: number | null;
  drain_duration?: number | null;
  irrigation_times: IrrigationScheduleItem[];
  drain_times: IrrigationScheduleItem[];
  veg_day_hours?: number;
}

// --- Serialized API Response ---

export interface SerializedBiologicalMetrics {
  vpd_status: string;
  vpd_target_min: number;
  vpd_target_max: number;
  vpd_danger_min: number;
  vpd_danger_max: number;
  granular_stage: string;
  is_day: boolean;
  veg_week: number;
  flower_week: number;
  air_exchange?: string | null;
}

export interface SerializedEnvironmentAttributes {
  // Sensors
  temperature_sensor?: string;
  humidity_sensor?: string;
  vpd_sensor?: string;
  co2_sensor?: string;
  soil_moisture_sensor?: string;
  light_sensor?: string;

  // Actuators / Complex Entities
  dehumidifier_entity?: string;
  dehumidifier_control_enabled?: boolean;
  dehumidifier_thresholds?: Record<string, Record<string, { on: number; off: number }>>;
  dehumidifier_state?: string;
  humidifier_entity?: string;
  exhaust_entity?: string;
  circulation_fan_entity?: string;

  // Values calculated by serializer
  vpd?: string;
  soil_moisture_value?: string;

  // Legacy / Alias Support
  exhaust_sensor?: string;
  humidifier_sensor?: string;
}

export interface SerializedStats {
  max_veg_days: number;
  max_flower_days: number;
  veg_week: number;
  flower_week: number;
  max_stage_summary: string;
  total_plants: number;
}

export interface TimelineEventMetadata {
  temperature?: number;
  humidity?: number;
  vpd?: number;
  soil_moisture?: number;
  light_intensity?: number;
  ph?: number;
  ec?: number;
  amount_ml?: number;
  [key: string]: unknown;
}

export interface BaseTimelineEvent {
  date: string;
  images?: string[];
  tags?: string[];
  metadata?: TimelineEventMetadata;
  event_id?: string | number;
}

export type PlantTimelineEvent =
  | ({ type: 'stage_change'; from: string; to: string } & BaseTimelineEvent)
  | ({ type: 'action'; action: string; details?: string } & BaseTimelineEvent)
  | ({ type: 'alert'; severity: 'low' | 'medium' | 'high'; message: string } & BaseTimelineEvent)
  | ({ type: 'note'; text: string } & BaseTimelineEvent)
  | ({ type: 'milestone'; label: string } & BaseTimelineEvent);

export interface RawPlantData {
  plant_id: string;
  entity_id: string;
  strain: string;
  phenotype: string;
  stage: string;
  row: number;
  col: number;
  position: string;

  // Days
  seedling_days: number;
  mother_days: number;
  clone_days: number;
  veg_days: number;
  flower_days: number;
  dry_days: number;
  cure_days: number;

  // Dates
  seedling_start: string | null;
  mother_start: string | null;
  clone_start: string | null;
  veg_start: string | null;
  flower_start: string | null;
  dry_start: string | null;
  cure_start: string | null;

  // Watering tracking
  last_watered?: string | null;
  last_trained?: string | null;
  last_training_technique?: string | null;
  last_ipm?: string | null;
  last_ipm_type?: string | null;
  days_since_last_watering: number | null;
  events?: PlantTimelineEvent[];
}

// The exact structure returned by GrowspaceSerializer.serialize_growspace
export interface GrowspaceAPIResponse extends SerializedBiologicalMetrics, SerializedEnvironmentAttributes, SerializedStats {
  growspace_id: string;
  name: string;
  type: GrowspaceType;
  rows: number;
  plants_per_row: number;
  notification_target?: string | null;
  overview_entity_id?: string;

  grid: Record<string, RawPlantData | null>;
  irrigation_config: IrrigationConfig;
  irrigation_strategy?: IrrigationStrategy | null;
}

// --- Internal Frontend Models ---

export interface GrowspaceDevice {
  device_id: string;
  overview_entity_id?: string;
  name: string;
  type: GrowspaceType;

  plants: PlantEntity[];
  grid: Record<string, RawPlantData | null>;

  rows: number;
  plants_per_row: number;
  last_updated?: string;
  notification_target?: string | null;

  // Structured Groups
  biological_metrics: SerializedBiologicalMetrics;
  environment_attributes: SerializedEnvironmentAttributes;
  stats: SerializedStats;

  irrigation_config: IrrigationConfig;
  irrigation_strategy?: IrrigationStrategy;
}

export enum TrainingTechnique {
  TOPPING = 'topping',
  FIM = 'fim',
  LST = 'lst',
  SUPER_CROPPING = 'super_cropping',
  SCROG = 'scrog',
  DEFOLIATING = 'defoliating',
  LOLLIPOPPING = 'lollipopping',
}

export interface PlantAttributes extends RawPlantData {
  friendly_name?: string;
  growspace_id?: string;
  planted_date?: string;
  germination_date?: string;
  flower_start_date?: string;
  harvest_date?: string;
  location?: string;
  events?: PlantTimelineEvent[];
}

export interface PlantEntity extends HassEntity {
  attributes: PlantAttributes & HassEntity['attributes'];
}

export interface GrowspaceOverviewEntity extends HassEntity {
  attributes: {
    growspace_id: string;
    friendly_name?: string;
    type?: string;
    plants_per_row?: number;
    rows?: number;
  };
}

// --- Utils ---

export function createGrowspaceDevice(
  params: Partial<GrowspaceDevice> & { device_id: string; name: string }
): GrowspaceDevice {
  return {
    type: GrowspaceTypeEnum.NORMAL,
    rows: 3,
    plants_per_row: 3,
    plants: [],
    grid: {},
    irrigation_config: { irrigation_times: [], drain_times: [] },

    // Default Empty Objects to prevent UI crashes
    biological_metrics: {
      vpd_status: 'unknown',
      vpd_target_min: 0,
      vpd_target_max: 0,
      vpd_danger_min: 0,
      vpd_danger_max: 0,
      granular_stage: 'unknown',
      is_day: true,
      veg_week: 0,
      flower_week: 0
    },
    environment_attributes: {},
    stats: {
      max_veg_days: 0,
      max_flower_days: 0,
      veg_week: 0,
      flower_week: 0,
      max_stage_summary: '',
      total_plants: 0
    },
    ...params,
  } as GrowspaceDevice;
}


// --- Data Structures ---

export interface StrainAnalytics {
  avg_veg_days: number;
  avg_flower_days: number;
  total_harvests: number;
}

export interface CropMeta {
  x: number;
  y: number;
  scale: number;
}

export interface StrainEntry {
  strain: string;
  phenotype: string;
  key: string;
  breeder?: string;
  type?: string;
  flowering_days?: number;
  phenotype_target_days?: number;
  yield_potential?: string;
  notes?: string;
  flowering_days_min?: number;
  flowering_days_max?: number;
  lineage?: string;
  sex?: string;
  description?: string;
  image?: string;
  image_crop_meta?: CropMeta;
  analytics?: StrainAnalytics;
  strain_analytics?: StrainAnalytics;
  sativa_percentage?: number;
  indica_percentage?: number;
}

export type PlantAttributeValue = string | number | undefined | null | PlantTimelineEvent[];

export interface PlantOverviewEditedAttributes {
  [key: string]: PlantAttributeValue;
  row?: number;
  col?: number;
  veg_start?: string | null;
  flower_start?: string | null;
  dry_start?: string | null;
  cure_start?: string | null;
  mom_start?: string | null;
  clone_start?: string | null;
  seedling_start?: string | null;
  mother_start?: string | null;
}

export interface AddPlantDialogState {
  row: number;
  col: number;
}

export interface AddPlantsDialogState {
  // Batch add doesn't specific a row/col, it finds available ones
}

export interface PlantOverviewDialogState {
  plant: PlantEntity;
  editedAttributes: Partial<PlantAttributes>;
  activeTab: 'dashboard' | 'timeline' | 'genetics';
  showAllDates?: boolean;
  selectedPlantIds?: string[];
}

export interface StrainLibraryDialogState { }

export interface ConfigDialogState {
  currentTab: 'add_growspace' | 'environment' | 'dehumidifier';
  environmentData: {
    selectedGrowspaceId: string;
    temp_sensor: string;
    humidity_sensor: string;
    vpd_sensor: string;
    co2_sensor: string;
    circulation_fan: string;
    stress_threshold: number;
    mold_threshold: number;
    light_sensor: string;
    exhaust_entity: string;
    humidifier_entity: string;
    dehumidifier_entity: string;
    dehumidifier_thresholds?: Record<string, Record<string, { on: number; off: number }>>;
    soil_moisture_sensor: string;
    control_dehumidifier: boolean;
  };
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

export interface NutrientPresetsDialogState {
  presetId?: string;
}

export interface NutrientItem {
  name: string;
  dose_ml_l: number;
}

export interface NutrientPreset {
  id: string;
  name: string;
  nutrients: NutrientItem[];
  stage?: string;
  min_days_in_stage?: number;
}

export interface NutrientEntry {
  name: string;
  concentration: number; // ml/L
}

// --- Events & History (Restored) ---

export interface GrowspaceEvent {
  sensor_type: string;
  growspace_id: string;
  start_time: string;
  end_time: string;
  duration_sec: number;
  severity: number;
  category: string;
  reasons: string[];
  notes?: string;
  timestamp?: string;
  images?: string[];
  tags?: string[];
}

export type IPMType = 'foliar' | 'drench' | 'beneficials';

export interface IPMItem {
  name: string;
  dose_amount: number;
  dose_unit: string;
}

export interface IPMPreset {
  id: string;
  name: string;
  type: IPMType;
  items: IPMItem[];
  stage?: string;
  min_days_in_stage?: number;
}

export interface IPMDialogState {
  presetId?: string;
  growspaceId?: string;
  plantIds?: string[];
}

export type MetricType =
  | MetricKey.TEMPERATURE
  | MetricKey.HUMIDITY
  | MetricKey.VPD
  | MetricKey.CO2
  | MetricKey.SOIL_MOISTURE
  | MetricKey.EXHAUST
  | MetricKey.HUMIDIFIER
  | MetricKey.DEHUMIDIFIER
  | MetricKey.CIRCULATION_FAN
  | MetricKey.LIGHT
  | MetricKey.OPTIMAL;

export interface GraphDataPoint {
  time: number;
  value: number;
  meta?: unknown;
}

export interface HistorySensorState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated?: string;
}

export type SensorHistories = Record<string, HistorySensorState[]>;

export interface GraphSeries {
  id: string;
  title: string;
  color: string;
  unit: string;
  icon?: string;
  points: GraphDataPoint[];
  min: number;
  max: number;
  avg?: number;
  path: string;
  fillType: 'gradient' | 'flat' | 'none';
  vpdSegments?: Array<{ path: string; color: string }>;
}

export interface TooltipItem {
  title: string;
  value: string;
  color: string;
}

export interface TooltipData {
  id: string;
  x: number;
  time: string;
  items: TooltipItem[];
}

// --- Display Models ---

export interface StageDisplay {
  days: number;
  icon: string;
  title: string;
  stage: PlantStage;
  isCurrent: boolean;
  color: string;
}

export interface PlantDisplayData {
  stageColor: string;
  strainName: string;
  pheno: string;
  imageUrl?: string;
  imageCropMeta?: CropMeta;
  stages: StageDisplay[];
}

export interface GrowAdviceResponse {
  response: string | { response: string };
}
