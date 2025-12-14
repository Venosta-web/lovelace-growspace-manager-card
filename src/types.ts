import { LovelaceCardConfig, HomeAssistant } from 'custom-card-helpers';
import { HassEntity } from 'home-assistant-js-websocket';
import { mdiSprout, mdiFlower, mdiHairDryer, mdiCannabis } from '@mdi/js';
import type { GrowspaceStore } from './store/growspace-store';

export interface GrowspaceManagerCardConfig extends LovelaceCardConfig {
  type: string;
  title?: string;
  default_growspace?: string;
  theme?: 'dark' | 'default' | 'green';
  growspaces?: string[];
  grid_options?: {
    columns?: 'full' | 'auto';
    rows?: string;
  };
  initial_view_mode?: GrowspaceViewMode;
  /** @deprecated use initial_view_mode = 'grid_only' */
  compact?: boolean;
}

export type GrowspaceViewMode = 'standard' | 'grid_only' | 'header_only';

// -- Generic Entity Types --

export interface GrowspaceEntity<T = any> extends HassEntity {
  attributes: T & HassEntity['attributes'];
}

export interface GrowspaceContext {
  hass: HomeAssistant;
  store: GrowspaceStore;
}

// -- Domain Specific Attributes --

export interface PlantAttributes {
  friendly_name?: string;
  device_id?: string;
  row?: number;
  col?: number;
  strain?: string;
  phenotype?: string;

  // Calculated Days
  veg_days?: number;
  flower_days?: number;
  dry_days?: number;
  cure_days?: number;
  mom_days?: number;
  clone_days?: number;

  // Date Strings (ISO YYYY-MM-DD)
  veg_start?: string | null;
  flower_start?: string | null;
  dry_start?: string | null;
  cure_start?: string | null;
  mom_start?: string | null;
  clone_start?: string | null;
  mother_start?: string | null;
  seedling_start?: string | null;

  plant_id?: string;
  stage?: PlantStage;
  growspace_id?: string;

  // Allow other attributes from HA
  [key: string]: any;
}

export interface GrowspaceAttributes {
  growspace_id: string;
  plants_per_row: number;
  rows: number;
  // ... other specific attributes
  [key: string]: any;
}

// -- Entities --

export interface PlantEntity extends GrowspaceEntity<PlantAttributes> {
  attributes: PlantAttributes & HassEntity['attributes'];
}

// -- Enums & Constants --

export enum PlantStage {
  SEEDLING = 'seedling',
  MOTHER = 'mother',
  CLONE = 'clone',
  VEG = 'veg',
  FLOWER = 'flower',
  DRY = 'dry',
  CURE = 'cure',
}

export type GrowspaceType = 'normal' | 'mother' | 'clone' | 'dry' | 'cure';

export const stageInputs: Record<
  PlantStage,
  Array<{
    label: string;
    icon: string;
    key: keyof PlantAttributes;
  }>
> = {
  [PlantStage.SEEDLING]: [],
  [PlantStage.MOTHER]: [{ label: 'Mother Start', icon: mdiSprout, key: 'mother_start' }],
  [PlantStage.CLONE]: [{ label: 'Clone Start', icon: mdiSprout, key: 'clone_start' }],
  [PlantStage.VEG]: [{ label: 'Vegetative Start', icon: mdiSprout, key: 'veg_start' }],
  [PlantStage.FLOWER]: [
    { label: 'Vegetative Start', icon: mdiSprout, key: 'veg_start' },
    { label: 'Flower Start', icon: mdiFlower, key: 'flower_start' },
  ],
  [PlantStage.DRY]: [{ label: 'Dry Start', icon: mdiHairDryer, key: 'dry_start' }],
  [PlantStage.CURE]: [{ label: 'Cure Start', icon: mdiCannabis, key: 'cure_start' }],
};

// -- Data Structures --

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

export type PlantAttributeValue = string | number | undefined | null;

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
  mother_start?: string | null; // Alias
}

export interface IrrigationTime {
  time: string;
  duration?: number;
}

export interface IrrigationStrategy {
  enabled: boolean;
  lights_on_time: string;
  p0_duration_minutes: number;
  p2_stop_before_lights_off_minutes: number;
  target_vwc_percent: number;
  maintenance_dryback_percent: number;
  shot_duration_seconds: number;
  shot_interval_minutes: number;
  [key: string]: any;
}

export interface IrrigationConfig {
  irrigation_pump_entity?: string;
  drain_pump_entity?: string;
  irrigation_duration?: number;
  drain_duration?: number;
  irrigation_times?: IrrigationTime[];
  drain_times?: IrrigationTime[];
  [key: string]: any;
}

export interface GrowspaceEnvironmentAttributes {
  temperature_sensor?: string;
  humidity_sensor?: string;
  vpd_sensor?: string;
  co2_sensor?: string;
  soil_moisture_sensor?: string;
  light_sensor?: string;
  dehumidifier_entity?: string;
  humidifier_entity?: string;
  exhaust_entity?: string;
  [key: string]: any;
}

export interface GrowspaceDevice {
  device_id: string;
  overview_entity_id?: string;
  name: string;
  type: GrowspaceType;
  plants: PlantEntity[];
  rows: number;
  plants_per_row: number;
  last_updated?: string;

  // Biological Metrics
  biological_metrics?: {
    vpd_status?: string;
    vpd_target_min?: number;
    vpd_target_max?: number;
    vpd_danger_min?: number;
    vpd_danger_max?: number;
    granular_stage?: string;
    is_day?: boolean;
    veg_week?: number;
    flower_week?: number;
    [key: string]: any;
  };

  /** @deprecated Use irrigation_config.irrigation_times */
  irrigation_times?: IrrigationTime[];
  /** @deprecated Use irrigation_config.drain_times */
  drain_times?: IrrigationTime[];

  irrigation_config?: IrrigationConfig;
  irrigation_strategy?: IrrigationStrategy;

  environment_attributes?: GrowspaceEnvironmentAttributes;

  // Statistics
  max_veg_days?: number;
  max_flower_days?: number;
  total_plants?: number;
  max_stage_summary?: string;
}

export function createGrowspaceDevice(
  params: Omit<GrowspaceDevice, 'type'> & { type?: GrowspaceType }
): GrowspaceDevice {
  return {
    ...params,
    type: params.type ?? 'normal',
  };
}

// -- Dialog States --

export interface AddPlantDialogState {
  row: number;
  col: number;
}

export interface PlantOverviewDialogState {
  plant: PlantEntity;
  editedAttributes: Partial<PlantAttributes>; // Use the strict type
  activeTab: 'dashboard' | 'timeline' | 'genetics';
  showAllDates?: boolean;
  selectedPlantIds?: string[];
}

export interface StrainLibraryDialogState { }

export interface ConfigDialogState {
  currentTab: 'add_growspace' | 'environment';
  environmentData: {
    selectedGrowspaceId: string;
    temp_sensor: string;
    humidity_sensor: string;
    vpd_sensor: string;
    co2_sensor: string;
    circulation_fan: string;
    stress_threshold: number;
    mold_threshold: number;
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

// -- Events & History --

export interface GrowspaceEvent {
  sensor_type: string;
  growspace_id: string;
  start_time: string;
  end_time: string;
  duration_sec: number;
  severity: number;
  category: string;
  reasons: string[];
}

// -- Raw Data Interfaces (from Backend/WS) --

export interface RawPlantData {
  strain: string;
  phenotype: string;
  stage?: string;
  [key: string]: any;
}

export interface RawGrowspaceAttributes {
  growspace_id: string;
  rows: number;
  plants_per_row: number;
  friendly_name?: string;
  type?: string;
  grid?: Record<string, RawPlantData | null>;
  row?: undefined;
  col?: undefined;
  [key: string]: any;
}

export interface GrowspaceWebSocketData {
  growspace_id: string;
  name: string;
  type: GrowspaceType;
  rows: number;
  plants_per_row: number;
  total_plants: number;
  notification_target?: string;

  grid: Record<string, RawPlantData | null>;

  irrigation_config: IrrigationConfig;
  irrigation_strategy: IrrigationStrategy;

  // Statistics
  max_veg_days: number;
  max_flower_days: number;
  veg_week: number;
  flower_week: number;
  max_stage_summary: string;

  // Biological Metrics
  vpd_status: string;
  vpd_target_min: number;
  vpd_target_max: number;
  vpd_danger_min: number;
  vpd_danger_max: number;
  granular_stage: string;
  is_day: boolean;
  air_exchange?: any;
  vpd?: number | string;

  // Environment Sensors
  temperature_sensor?: string;
  humidity_sensor?: string;
  vpd_sensor?: string;
  co2_sensor?: string;
  soil_moisture_sensor?: string;
  exhaust_sensor?: string;
  humidifier_sensor?: string;

  // Environment Controls & States
  dehumidifier_entity?: string;
  humidifier_entity?: string;
  exhaust_entity?: string;
  circulation_fan_entity?: string;
  light_sensor?: string;

  dehumidifier_control_enabled?: boolean;
  dehumidifier_humidity?: number;
  dehumidifier_mode?: string;
  dehumidifier_state?: string;
  dehumidifier_current_humidity?: number;

  exhaust_state?: string;
  humidifier_state?: string;
  co2_state?: string;
  light_level?: string;
  daily_light_integral?: number;
  heater_socket?: string;
}

export type MetricType =
  | 'temperature'
  | 'humidity'
  | 'vpd'
  | 'co2'
  | 'soil_moisture'
  | 'exhaust'
  | 'humidifier'
  | 'dehumidifier'
  | 'circulation_fan'
  | 'light'
  | 'optimal';

export interface GraphDataPoint {
  time: number;
  value: number;
  meta?: any;
}

export interface HistorySensorState {
  entity_id: string;
  state: string;
  attributes: any;
  last_changed: string;
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
