import { mdiSprout, mdiFlower, mdiHairDryer, mdiCannabis } from "@mdi/js";
import { LovelaceCardConfig } from 'custom-card-helpers';

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
}

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

export interface PlantEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    device_id?: string;
    row?: number;
    col?: number;
    strain?: string;
    phenotype?: string;
    veg_days?: number;
    flower_days?: number;
    dry_days?: number;
    cure_days?: number;
    mom_days?: number;
    clone_days?: number;
    veg_start?: string;
    flower_start?: string;
    dry_start?: string;
    cure_start?: string;
    mom_start?: string;
    clone_start?: string;
    plant_id?: string;
    stage?: PlantStage;
    growspace_id?: string;
    [key: string]: any;
  };
}
export type PlantStage = "seedling" | "mother" | "clone" | "vegetative" | "flower" | "dry" | "cure";

export type GrowspaceType = "normal" | "mother" | "clone" | "dry" | "cure";
export const stageInputs: Record<PlantStage, Array<{
  label: string;
  icon: string;
  key: keyof PlantEntity['attributes'];
}>> = {
  seedling: [],
  mother: [
    { label: "Mother Start", icon: mdiSprout, key: "mother_start" },
  ],
  clone: [
    { label: "Clone Start", icon: mdiSprout, key: "clone_start" },
  ],
  vegetative: [
    { label: "Vegetative Start", icon: mdiSprout, key: "veg_start" },
  ],
  flower: [
    { label: "Vegetative Start", icon: mdiSprout, key: "veg_start" },
    { label: "Flower Start", icon: mdiFlower, key: "flower_start" },
  ],
  dry: [
    { label: "Dry Start", icon: mdiHairDryer, key: "dry_start" },
  ],
  cure: [
    { label: "Cure Start", icon: mdiCannabis, key: "cure_start" },
  ],
};

export type PlantAttributeValue = string | number | undefined;
export interface PlantOverviewEditedAttributes {
  [key: string]: PlantAttributeValue;
  row?: number;
  col?: number;
  veg_start?: string;
  flower_start?: string;
  dry_start?: string;
  cure_start?: string;
  mom_start?: string;
  clone_start?: string;
}

export interface GrowspaceDevice {
  device_id: string;
  overview_entity_id?: string;
  name: string;
  type: GrowspaceType;
  plants: PlantEntity[];
  rows: number;
  plants_per_row: number;
}
export function createGrowspaceDevice(
  params: Omit<GrowspaceDevice, "type"> & { type?: GrowspaceType }
): GrowspaceDevice {
  return {
    ...params,
    type: params.type ?? "normal",
  };
}

export interface AddPlantDialogState {

  row: number;
  col: number;
  strain?: string;
  phenotype?: string;
  mother_id?: string;
  veg_start?: string;
  flower_start?: string;
  seedling_start?: string;
  mother_start?: string;
  clone_start?: string;
  dry_start?: string;
  cure_start?: string;
}

export interface PlantOverviewDialogState {

  plant: PlantEntity;
  editedAttributes: { [key: string]: any };
  activeTab: 'dashboard' | 'timeline' | 'genetics';
  showAllDates?: boolean;
  selectedPlantIds?: string[];
}

export interface StrainLibraryDialogState {

}

export interface ConfigDialogState {

  currentTab: 'add_growspace' | 'environment';
  addGrowspaceData: {
    name: string;
    rows: number;
    plants_per_row: number;
    notification_service: string;
  };
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
  userQuery: string;
  isLoading: boolean;
  response: string | null;
  mode: 'single' | 'all';
}

export interface StrainRecommendationDialogState {

  userQuery: string;
  isLoading: boolean;
  response: string | null;
}

export interface IrrigationTime {
  time: string;
  duration?: number;
}


