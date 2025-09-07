import { mdiSprout, mdiFlower, mdiHairDryer, mdiCannabis } from "@mdi/js";
import { PlantEntity, GrowspaceDevice, PlantStage } from "./types";

export const PLANT_STAGES: PlantStage[] = [
  "seedling",
  "vegetative",
  "flower",
  "dry",
  "cure",
];

export class PlantUtils {
  private static readonly stageColors: Record<PlantStage, string> = {
    seedling: "#4CAF50",
    vegetative: "#8BC34A",
    flower: "#FF9800",
    dry: "#795548",
    cure: "#9C27B0",
  };

  private static readonly stageIcons: Record<PlantStage, string> = {
    seedling: mdiSprout,
    vegetative: mdiSprout,
    flower: mdiFlower,
    dry: mdiHairDryer,
    cure: mdiCannabis,
  };

  static getPlantStageColor(state: PlantStage | string): string {
    const key = state.toLowerCase() as PlantStage;
    return this.stageColors[key] ?? "#757575";
  }

  static getPlantStageIcon(state: PlantStage | string): string {
    const key = state.toLowerCase() as PlantStage;
    return this.stageIcons[key] ?? mdiSprout;
  }

  static createGridLayout(
    plants: PlantEntity[],
    rows: number,
    cols: number
  ): { rows: number; cols: number; grid: (PlantEntity | null)[][] } {
    const grid: (PlantEntity | null)[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => null)
    );

    plants.forEach((plant) => {
      const row = (plant.attributes?.row ?? 1) - 1;
      const col = (plant.attributes?.col ?? 1) - 1;
      if (row >= 0 && row < rows && col >= 0 && col < cols) {
        grid[row][col] = plant;
      }
    });

    return { rows, cols, grid };
  }

  static calculateEffectiveRows(device: GrowspaceDevice): number {
    const { name, plants, plants_per_row } = device;

    if (name === "dry Overview" || name === "cure Overview") {
      if (plants.length === 0) return 1;

      const maxRowUsed = Math.max(
        ...plants.map((p) => p.attributes?.row || 1)
      );
      const lastRowCount = plants.filter(
        (p) => (p.attributes?.row || 1) === maxRowUsed
      ).length;

      return lastRowCount >= plants_per_row ? maxRowUsed + 1 : maxRowUsed;
    }

    return plants_per_row;
  }

  static getCurrentDateTime(): string {
    return new Date().toISOString().slice(0, 16);
  }
}
