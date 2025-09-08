import { mdiSprout, mdiFlower, mdiHairDryer, mdiCannabis } from "@mdi/js";
import { LovelaceCardConfig } from 'custom-card-helpers';

export interface GrowspaceManagerCardConfig extends LovelaceCardConfig {
  type: string;
  title?: string;
  default_growspace?: string;
  theme?: 'dark' | 'default' | 'green';
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
    veg_start?: string;
    flower_start?: string;
    dry_start?: string;
    cure_start?: string;
    plant_id?: string;
    stage?: PlantStage;
    growspace_id?: string;
    [key: string]: any;
  };
}
export type PlantStage = "seedling" | "vegetative" | "flower" | "dry" | "cure";

export type GrowspaceType = "normal" | "dry" | "cure";
export const stageInputs: Record<PlantStage, Array<{
  label: string;
  icon: string;
  key: keyof PlantEntity['attributes'];
}>> = {
  seedling: [],
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
}

export interface GrowspaceDevice {
  device_id: string;
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
  open: boolean;
  row: number;
  col: number;
  strain?: string;
  phenotype?: string;
  veg_start?: string;
  flower_start?: string;
  dry_start?: string;
  cure_start?: string;
}

export interface PlantOverviewDialogState {
  open: boolean;
  plant: PlantEntity;
  editedAttributes: { [key: string]: any };
  onClose?: () => void;
  onUpdate?: () => Promise<void>;
  onDelete?: (plantId: string) => Promise<void>;
  onHarvest?: (plantEntity: PlantEntity) => Promise<void>;
  onFinishDrying?: (plantEntity: PlantEntity) => Promise<void>;
  onAttributeChange?: (key: string, value: any) => void;
}

export interface StrainLibraryDialogState {
  open: boolean;
  newStrain: string;
  strains: string[];
}