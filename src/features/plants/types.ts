import { HassEntity } from 'home-assistant-js-websocket';

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

export enum GrowspaceType {
  NORMAL = 'normal',
  MOTHER = 'mother',
  CLONE = 'clone',
  DRY = 'dry',
  CURE = 'cure',
  VEG = 'veg',
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

// --- Timeline Events ---

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
  | ({ type: 'milestone'; label: string } & BaseTimelineEvent)
  | ({ type: 'environmental_report'; sensor_type: string; reasons?: string[] } & BaseTimelineEvent);

// --- Plant Data ---

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
  days_in_stage?: number;

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

// --- Strain/Genetics ---

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
  breeder_logo?: string;
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
  breederLogo?: string;
  stages: StageDisplay[];
}
