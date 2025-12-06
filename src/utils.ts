import { mdiSprout, mdiFlower, mdiHairDryer, mdiCannabis } from "@mdi/js";
import { PlantEntity, GrowspaceDevice, PlantStage, CropMeta } from "./types";

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

  static calculatePlantAge(plant: PlantEntity): number {
    if (!plant || !plant.attributes) return 0;
    const stage = this.getPlantStage(plant);
    const attrs = plant.attributes;
    let startStr: string | undefined;

    switch (stage) {
      case 'flower': startStr = attrs.flower_start; break;
      case 'vegetative': startStr = attrs.veg_start; break;
      case 'mother': startStr = attrs.mom_start; break;
      case 'clone': startStr = attrs.clone_start; break;
      case 'dry': startStr = attrs.dry_start; break;
      case 'cure': startStr = attrs.cure_start; break;
      case 'seedling': startStr = attrs.planted_date; break;
    }

    if (!startStr) return 0;
    const start = new Date(startStr);
    const now = new Date();
    if (isNaN(start.getTime())) return 0;

    const diff = now.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
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
    const { name, plants, plants_per_row, rows } = device;

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

    return rows;
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
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
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

  static getDominantStage(plants: PlantEntity[]): { stage: PlantStage, days: number } | null {
    if (!plants || plants.length === 0) return null;

    // Defined priority: Cure > Dry > Flower > Vegetative > Clone > Mother > Seedling
    // Lower index = higher priority
    const priority: PlantStage[] = [
      "cure",
      "dry",
      "flower",
      "vegetative",
      "clone",
      "mother",
      "seedling"
    ];

    // Find the highest priority stage present in the plants
    let bestStage: PlantStage | null = null;
    let maxDays = 0;

    // Group plants by normalized stage
    const plantsByStage: Record<string, PlantEntity[]> = {};

    for (const plant of plants) {
      // Use plant.state directly if possible, or calculate it
      // plant.state usually contains the stage string
      const stage = this.normalizeStage(plant.state || this.getPlantStage(plant));
      if (!plantsByStage[stage]) plantsByStage[stage] = [];
      plantsByStage[stage].push(plant);
    }

    // Iterate priority list to find the first matching stage
    for (const stage of priority) {
      if (plantsByStage[stage] && plantsByStage[stage].length > 0) {
        bestStage = stage;
        // Find max days for this stage
        // Map stage to attribute key
        const daysKey = `${stage === 'vegetative' ? 'veg' : stage}_days`;

        const daysValues = plantsByStage[stage].map(p => {
          const val = p.attributes[daysKey];
          return typeof val === 'number' ? val : 0;
        });

        maxDays = Math.max(...daysValues);
        break;
      }
    }

    if (!bestStage) return null;

    return { stage: bestStage, days: maxDays };
  }

  /**
   * Compresses and resizes an image file.
   * @param file The file object from input.
   * @param maxWidth Maximum width in pixels.
   * @param maxHeight Maximum height in pixels.
   * @param quality Quality between 0 and 1.
   * @returns Promise resolving to base64 string.
   */
  static compressImage(file: File, maxWidth: number = 800, maxHeight: number = 800, quality: number = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          // Get base64 string
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  }

  static preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve();
      img.onerror = () => reject();
    });
  }

  static getImgStyle(meta?: CropMeta): string {
    if (!meta) return 'width: 100%; height: 100%; object-fit: cover;';
    return `width: 100%; height: 100%; object-fit: cover; object-position: ${meta.x}% ${meta.y}%; transform: scale(${meta.scale}); transform-origin: ${meta.x}% ${meta.y}%;`;
  }
}
