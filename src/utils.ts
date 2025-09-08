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
  // --- helpers at the top ---
  static getPlantStage(plant: PlantEntity): PlantStage {
    const attrs = plant?.attributes ?? {};
    const now = new Date();

    if (attrs.cure_start) return "cure";
    if (attrs.dry_start) return "dry";
    if (attrs.flower_start && new Date(attrs.flower_start) <= now) return "flower";
    if (attrs.veg_start && new Date(attrs.veg_start) <= now) return "vegetative";

    return "seedling";
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
  /**
   * Converts a datetime-local input string (YYYY-MM-DDTHH:mm) to ISO string
   * Returns null if input is empty or invalid
   */
  static parseDateTimeLocal(value?: string | null): string | undefined {
    if (!value) return undefined;
    try {
      // Append ":00" if only HH:MM is provided
      const isoString = value.length === 16 ? value + ":00" : value;
      const dt = new Date(isoString);

      if (isNaN(dt.getTime())) return undefined;

      // Format as YYYY-MM-DDTHH:MM:SS (no Z)
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      const hh = String(dt.getHours()).padStart(2, '0');
      const min = String(dt.getMinutes()).padStart(2, '0');
      const sec = String(dt.getSeconds()).padStart(2, '0');

      return `${yyyy}-${mm}-${dd}T${hh}:${min}:${sec}`;
    } catch {
      return undefined;
    }
  }


  static getCurrentDateTime(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
  }
}
