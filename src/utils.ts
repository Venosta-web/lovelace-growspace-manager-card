import { mdiSprout, mdiFlower, mdiHairDryer, mdiCannabis } from "@mdi/js";
import { PlantEntity, GrowspaceDevice, PlantStage } from "./types";

export const PLANT_STAGES: PlantStage[] = [
  "seedling",
  "mother",
  "clone",
  "vegetative",
  "flower",
  "dry",
  "cure",
];

export class PlantUtils {
  private static readonly stageColors: Record<PlantStage, string> = {
    mother: "#E91E63",
    clone: "#FF5722",
    seedling: "#4CAF50",
    vegetative: "#8BC34A",
    flower: "#FF9800",
    dry: "#795548",
    cure: "#9C27B0",
  };

  private static readonly stageIcons: Record<PlantStage, string> = {
    mother: mdiSprout,
    clone: mdiSprout,
    seedling: mdiSprout,
    vegetative: mdiSprout,
    flower: mdiFlower,
    dry: mdiHairDryer,
    cure: mdiCannabis,
  };

  private static normalizeStage(state: PlantStage | string): PlantStage {
    const lower = state.toLowerCase();
    if (lower === 'veg') return 'vegetative';
    if (lower === 'mom') return 'mother';
    // Add other aliases if necessary
    return lower as PlantStage;
  }

  static getPlantStageColor(state: PlantStage | string): string {
    const key = this.normalizeStage(state);
    return this.stageColors[key] ?? "#757575";
  }

  static getPlantStageIcon(state: PlantStage | string): string {
    const key = this.normalizeStage(state);
    return this.stageIcons[key] ?? mdiSprout;
  }
  // --- helpers at the top ---
  static getPlantStage(plant: PlantEntity): PlantStage {
    const attrs = plant?.attributes ?? {};
    const now = new Date();

    if (attrs.cure_start) return "cure";
    if (attrs.dry_start) return "dry";
    if (attrs.mom_start) return "mother";
    if (attrs.clone_start) return "clone";
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

    if (name === "dry" || name === "cure" || name === "mother" || name === "clone") {
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

  /**
   * Extracts YYYY-MM-DD from a date string or datetime-local string
   */
  static formatDateForBackend(value?: string | null): string | undefined {
    if (!value) return undefined;
    try {
      // If it's already roughly ISO format, extracting the first part is safest
      // if we assume the user entered local time in the datetime-local input.
      const parts = value.split('T');
      if (parts.length > 0 && parts[0].match(/^\d{4}-\d{2}-\d{2}$/)) {
        return parts[0];
      }
      // Fallback to parsing if format is unexpected
      const dt = new Date(value);
      if (isNaN(dt.getTime())) return undefined;
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return undefined;
    }
  }

  static getCurrentDateTime(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
  }

  /**
   * Formats a date string (YYYY-MM-DD or ISO) to YYYY-MM-DDThh:mm for datetime-local inputs
   */
  static toDateTimeLocal(value?: string | null): string {
    if (!value) return "";
    try {
      const dt = new Date(value);
      if (isNaN(dt.getTime())) return "";

      const pad = (n: number) => n.toString().padStart(2, "0");
      const yyyy = dt.getFullYear();
      const mm = pad(dt.getMonth() + 1);
      const dd = pad(dt.getDate());
      const hh = pad(dt.getHours());
      const min = pad(dt.getMinutes());

      return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    } catch {
      return "";
    }
  }
}
