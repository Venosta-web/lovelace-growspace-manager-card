import { HomeAssistant } from 'custom-card-helpers';
import { PlantEntity, GrowspaceDevice, GrowspaceType, createGrowspaceDevice } from './types';

export class DataService {
  constructor(private hass: HomeAssistant) {}

  getGrowspaceDevices(): GrowspaceDevice[] {
    if (!this.hass) return [];
    
    const allStates = Object.values(this.hass.states);
    const overviewSensors = allStates.filter((entity: any) => 
      entity.entity_id.endsWith('_overview')
    );

    // Initialize device groups with overview sensors (includes empty growspaces)
    const deviceGroups = new Map<string, PlantEntity[]>();
    overviewSensors.forEach((ov: any) => {
      const gid = ov.attributes?.growspace_id ?? ov.entity_id;
      deviceGroups.set(gid, []);
    });

    // Collect plants and group by growspace
    allStates.forEach((entity: any) => {
      if (entity.attributes?.row !== undefined && entity.attributes?.col !== undefined) {
        const growspaceId = this.getGrowspaceId(entity, overviewSensors);
        
        if (!deviceGroups.has(growspaceId)) {
          deviceGroups.set(growspaceId, []);
        }
        deviceGroups.get(growspaceId)!.push(entity as PlantEntity);
      }
    });

    // Build devices array
    return Array.from(deviceGroups.entries()).map(([growspaceId, plants]) => {
      const overview = overviewSensors.find(ov => 
        ov.attributes?.growspace_id === growspaceId
      );

      const name = overview?.attributes?.friendly_name || `Growspace ${growspaceId}`;

      // Infer type from attributes or name
      const type: GrowspaceType =
        (overview?.attributes?.type as GrowspaceType) ??
        (name.toLowerCase().includes("dry") ? "dry" :
         name.toLowerCase().includes("cure") ? "cure" : "normal");

      return createGrowspaceDevice({
        device_id: growspaceId,
        name,
        plants,
        rows: overview?.attributes?.rows ?? 3,
        plants_per_row: overview?.attributes?.plants_per_row ?? 3,
        type, // optional in helper, but passed explicitly here
      });
    });
  }
  
  private getGrowspaceId(entity: any, overviewSensors: any[]): string {
    return entity.attributes?.growspace_id ||
      overviewSensors.find(ov => 
        ov.entity_id.startsWith(entity.entity_id.split('_')[0])
      )?.attributes?.growspace_id ||
      'unknown';
  }

  getStrainLibrary(): string[] {
    const strainSensor = Object.values(this.hass.states).find(s => 
      s.entity_id.endsWith('_strain_library')
    );
    return strainSensor?.attributes?.strains || [];
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
    dry_start?: string;
    cure_start?: string;
  }) {
    console.log("[DataService:addPlant] Sending payload:", params);
    try {
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
      const res = await this.hass.callService("growspace_manager", "harvest_plant", {
        plant_id: plantId,
        target_growspace_name: target,
      });
      console.log("[DataService:harvestPlant] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:harvestPlant] Error:", err);
      throw err;
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