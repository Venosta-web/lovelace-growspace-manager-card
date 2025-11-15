import { HomeAssistant } from 'custom-card-helpers';
import { PlantEntity, GrowspaceDevice, GrowspaceType, createGrowspaceDevice } from './types';
import { noChange } from 'lit';

export class DataService {
  constructor(private hass: HomeAssistant) {}

  getGrowspaceDevices(): GrowspaceDevice[] {
    if (!this.hass) return [];

    const allStates = Object.values(this.hass.states);

    // Identify overview sensors by their attributes (growspace_id + grid info),
    // and exclude plant entities (which have row/col).
    const overviewSensors = allStates.filter((entity: any) =>
      entity.entity_id.startsWith('sensor.') &&
      entity.attributes?.growspace_id !== undefined &&
      entity.attributes?.rows !== undefined &&
      entity.attributes?.plants_per_row !== undefined &&
      entity.attributes?.row === undefined &&
      entity.attributes?.col === undefined
    );

    // Initialize device groups with overview sensors (includes empty growspaces)
    const deviceGroups = new Map<string, PlantEntity[]>();
    overviewSensors.forEach((ov: any) => {
      const gid = ov.attributes.growspace_id;
      deviceGroups.set(gid, []);
    });

    // Collect plants and group by growspace
    allStates.forEach((entity: any) => {
      if (entity.attributes?.row !== undefined && entity.attributes?.col !== undefined) {
        const growspaceId = this.getGrowspaceId(entity);
        if (!deviceGroups.has(growspaceId)) deviceGroups.set(growspaceId, []);
        deviceGroups.get(growspaceId)!.push(entity as PlantEntity);
      }
    });

    // Build devices array
    return Array.from(deviceGroups.entries()).map(([growspaceId, plants]) => {
      const overview = overviewSensors.find(ov =>
        ov.attributes?.growspace_id === growspaceId
      );

      const name =
        overview?.attributes?.friendly_name ||
        `Growspace ${growspaceId}`;

      const type: GrowspaceType =
        (overview?.attributes?.type as GrowspaceType) ??
        (name.toLowerCase().includes('dry') ? 'dry' :
        name.toLowerCase().includes('cure') ? 'cure' : 'normal');

      return createGrowspaceDevice({
        id: growspaceId,
        name,
        plants,
        rows: overview?.attributes?.rows ?? 3,
        plants_per_row: overview?.attributes?.plants_per_row ?? 3,
        type,
      });
    });
  }

  private getGrowspaceId(entity: any): string {
    // Plant entities expose growspace_id directly
    return entity.attributes?.growspace_id || 'unknown';
  }

  getStrainLibrary(): string[] {
    const allStates = Object.values(this.hass.states);
    const strainSensor = allStates.find(
      (s: any) => Array.isArray(s.attributes?.strains)
    );
    return (strainSensor?.attributes?.strains as string[]) || [];
}

  // Service calls
  async addPlant(params: {
    growspace_id: string;
    row: number;
    col: number;
    strain: string;
    phenotype?: string;
    veg_start?: string;
    flower_start?: string;
    mother_start?: string;
    clone_start?: string;
    seedling_start?: string;
  }) {
    console.log("[DataService:addPlant] Sending payload:", params);
    try {
      if (params.growspace_id === "mother" || params.growspace_id === "mother_overview") {
        params.mother_start = new Date().toISOString().split('T')[0];
      }
      if (params.growspace_id === "clone" || params.growspace_id === "clone_overview") {
        params.clone_start = new Date().toISOString().split('T')[0];
      }
      const res = await this.hass.callService("growspace_manager", "add_plant", params);
      console.log("[DataService:addPlant] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:addPlant] Error:", err);
      throw err;
    }
  }
  async updatePlant(params: { plant_id: string; [key: string]: any }) {
    console.log("[DataService:updatePlant] Sending payload:", params);
    try {
      const res = await this.hass.callService("growspace_manager", "update_plant", params);
      console.log("[DataService:updatePlant] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:updatePlant] Error:", err);
      throw err;
    }
  }

  async removePlant(plantId: string) {
    console.log("[DataService:removePlant] Removing plant_id:", plantId);
    try {
      const res = await this.hass.callService("growspace_manager", "remove_plant", { plant_id: plantId });
      console.log("[DataService:removePlant] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:removePlant] Error:", err);
      throw err;
    }
  }

  async harvestPlant(plantId: string, target: string = "dry") {
    console.log("[DataService:harvestPlant] Harvesting plant:", plantId, "→ target:", target);
    try {
      const hint = (target || "").toLowerCase();
      const payload: any = { plant_id: plantId };
      // Prefer passing a concrete growspace_id when hint is clear
      if (hint.includes("dry")) {
        payload.target_growspace_id = "dry_overview";
      } else if (hint.includes("cure")) {
        payload.target_growspace_id = "cure_overview";
      } else if (hint.includes("mother")) {
        payload.target_growspace_id = "mother_overview";
      } else if (hint.includes("clone")) {
        payload.target_growspace_id = "clone_overview";
      }
      else if (hint) {
        // Fallback to name hint for any custom names
        payload.target_growspace_name = target;
      }

      const res = await this.hass.callService("growspace_manager", "harvest_plant", payload);
      console.log("[DataService:harvestPlant] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:harvestPlant] Error:", err);
      throw err;
    }
  }
  async takeClone(plantId: string, target: string = "clone") {
    console.log("[DataService:takeClone] Cloning plant:", plantId, "→ target:", target);
    try {
      const hint = (target || "").toLowerCase();
      const payload: any = { plant_id: plantId };
      // Prefer passing a concrete growspace_id when hint is clear
      if (hint.includes("dry")) {
        payload.target_growspace_id = "dry_overview";
      } else if (hint.includes("cure")) {
        payload.target_growspace_id = "cure_overview";
      } else if (hint.includes("mother")) {
        payload.target_growspace_id = "mother_overview";
      } else if (hint.includes("clone")) {
        payload.target_growspace_id = "clone_overview";
      }
      else if (hint) {
        // Fallback to name hint for any custom names
        payload.target_growspace_name = target;
      }

      const res = await this.hass.callService("growspace_manager", "takeClone", payload);
      console.log("[DataService:takeClone] Response:", res);
      return res;

    } catch (error) {
      console.error("[DataService:takeClone] Error:", error);
      throw error;
    }
  }
  async importStrainLibrary(strains: string[], replace: boolean = true) {
    console.log("[DataService:importStrainLibrary] Sending strains:", strains, "replace:", replace);
    return this.hass.callService("growspace_manager", "import_strain_library", {
      strains,
      replace,
    });
  }

  async clearStrainLibrary() {
    console.log("[DataService:clearStrainLibrary] Clearing strain library");
    return this.hass.callService("growspace_manager", "clear_strain_library", {});
}
}