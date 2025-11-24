import { HomeAssistant } from 'custom-card-helpers';
import { PlantEntity, GrowspaceDevice, GrowspaceType, createGrowspaceDevice, StrainEntry, StrainAnalytics, CropMeta } from './types';
import { noChange } from 'lit';

export class DataService {
  constructor(private hass: HomeAssistant) { }

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
        device_id: growspaceId,
        overview_entity_id: overview?.entity_id,
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

  getStrainLibrary(): StrainEntry[] {
    const allStates = Object.values(this.hass.states);
    const strainSensor = allStates.find(
      (s: any) => s.attributes?.strains !== undefined && s.attributes?.strains !== null
    );

    const rawStrains = strainSensor?.attributes?.strains;

    if (!rawStrains) return [];

    if (Array.isArray(rawStrains)) {
      // Fallback for legacy array format
      return rawStrains.map((s: string) => ({
        strain: s,
        phenotype: '',
        key: `${s}|default`
      }));
    }

    if (typeof rawStrains === 'object') {
      const results: StrainEntry[] = [];

      for (const [strainName, strainData] of Object.entries(rawStrains)) {
        const data = strainData as any;
        const strainAnalytics: StrainAnalytics | undefined = data.analytics;
        const meta = data.meta || {};

        // If phenotypes dictionary exists
        if (data.phenotypes && typeof data.phenotypes === 'object') {
           const phenoEntries = Object.entries(data.phenotypes);
           if (phenoEntries.length > 0) {
             for (const [phenoName, phenoData] of phenoEntries) {
               // phenoData likely contains the stats directly, or nested in analytics
               // We support both structures defensively
               const pData = phenoData as any;
               let phenoAnalytics: StrainAnalytics | undefined;

               if (pData.analytics) {
                 phenoAnalytics = pData.analytics;
               } else if (typeof pData.avg_veg_days === 'number') {
                 // Assume flat structure
                 phenoAnalytics = {
                   avg_veg_days: pData.avg_veg_days,
                   avg_flower_days: pData.avg_flower_days,
                   total_harvests: pData.total_harvests
                 };
               }

               results.push({
                 strain: strainName,
                 phenotype: phenoName,
                 key: `${strainName}|${phenoName}`,
                 analytics: phenoAnalytics,
                 strain_analytics: strainAnalytics,
                 image_crop_meta: pData.image_crop_meta,
                 // Merge logic: Check phenotype data first, then fallback to meta
                 breeder: pData.breeder || meta.breeder,
                 type: pData.type || meta.type,
                 lineage: pData.lineage || meta.lineage,
                 sex: pData.sex || meta.sex,
                 description: pData.description || meta.description,
                 flowering_days_min: pData.flower_days_min || meta.flowering_days_min,
                 flowering_days_max: pData.flower_days_max || meta.flowering_days_max,
                 image: pData.image_path || pData.image || meta.image,
                 sativa_percentage: pData.sativa_percentage || meta.sativa_percentage,
                 indica_percentage: pData.indica_percentage || meta.indica_percentage,
               });
             }
           } else {
             // Strain exists but has empty phenotypes dict
             // We still want to show the strain
             results.push({
               strain: strainName,
               phenotype: '',
               key: `${strainName}|default`,
               strain_analytics: strainAnalytics,
               image_crop_meta: data.image_crop_meta,
               breeder: meta.breeder,
               type: meta.type,
               lineage: meta.lineage,
               sex: meta.sex,
               description: meta.description,
               flowering_days_min: meta.flowering_days_min,
               flowering_days_max: meta.flowering_days_max,
               image: meta.image,
               sativa_percentage: meta.sativa_percentage,
               indica_percentage: meta.indica_percentage,
             });
           }
        } else {
          // No phenotypes dict, just a strain entry
          results.push({
            strain: strainName,
            phenotype: '',
            key: `${strainName}|default`,
            strain_analytics: strainAnalytics,
            image_crop_meta: data.image_crop_meta,
            breeder: meta.breeder,
            type: meta.type,
            lineage: meta.lineage,
            sex: meta.sex,
            description: meta.description,
            flowering_days_min: meta.flowering_days_min,
            flowering_days_max: meta.flowering_days_max,
            image: meta.image,
            sativa_percentage: meta.sativa_percentage,
            indica_percentage: meta.indica_percentage,
           });
        }
      }

      return results.sort((a, b) => {
        const strainComp = a.strain.localeCompare(b.strain);
        if (strainComp !== 0) return strainComp;
        return (a.phenotype || '').localeCompare(b.phenotype || '');
      });
    }

    return [];
  }

  async getHistory(entityId: string, startTime: Date, endTime?: Date): Promise<any[]> {
    if (!this.hass) return [];

    const startStr = startTime.toISOString();
    let url = `history/period/${startStr}?filter_entity_id=${entityId}`;
    if (endTime) {
      url += `&end_time=${endTime.toISOString()}`;
    }

    try {
      const res = await this.hass.callApi<any[][]>('GET', url);
      return res && res.length > 0 ? res[0] : [];
    } catch (err) {
      console.error("Error fetching history:", err);
      return [];
    }
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
  async updatePlant(params: { plant_id: string;[key: string]: any }) {
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

  async swapPlants(plant1Id: string, plant2Id: string) {
    console.log(`[DataService:swapPlants] Swapping plants: ${plant1Id} and ${plant2Id}`);
    try {
      const res = await this.hass.callService("growspace_manager", "switch_plants", {
        plant1_id: plant1Id,
        plant2_id: plant2Id,
      });
      console.log("[DataService:swapPlants] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:swapPlants] Error:", err);
      throw err;
    }
  }

  async addStrain(data: {
    strain: string;
    phenotype?: string;
    breeder?: string;
    type?: string;
    flowering_days_min?: number;
    flowering_days_max?: number;
    lineage?: string;
    sex?: string;
    description?: string;
    image?: string;
    image_crop_meta?: CropMeta;
    sativa_percentage?: number;
    indica_percentage?: number;
  }) {
    console.log("[DataService:addStrain] Adding strain:", data);
    try {
      const payload: any = { ...data };

      // Clean undefined keys
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      if (data.image) {
        if (data.image.startsWith("data:")) {
           // It's a base64 string (new upload)
           payload.image_base64 = data.image;
           delete payload.image; // Backend expects image_base64
        } else {
           // It's a path (existing image)
           payload.image_path = data.image;
           delete payload.image;
        }
      }

      const res = await this.hass.callService("growspace_manager", "add_strain", payload);
      console.log("[DataService:addStrain] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:addStrain] Error:", err);
      throw err;
    }
  }

  async removeStrain(strain: string, phenotype?: string) {
    console.log("[DataService:removeStrain] Removing strain:", strain, phenotype);
    try {
      const res = await this.hass.callService("growspace_manager", "remove_strain", {
        strain,
        phenotype
      });
      console.log("[DataService:removeStrain] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:removeStrain] Error:", err);
      throw err;
    }
  }

  async importStrainLibrary(strains: string[]) {
    console.log("[DataService:importStrainLibrary] Importing strains:", strains);
    try {
      const res = await this.hass.callService("growspace_manager", "import_strain_library", {
        strains
      });
      console.log("[DataService:importStrainLibrary] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:importStrainLibrary] Error:", err);
      throw err;
    }
  }

  async clearStrainLibrary() {
    console.log("[DataService:clearStrainLibrary] Clearing library");
    try {
      const res = await this.hass.callService("growspace_manager", "clear_strain_library");
      console.log("[DataService:clearStrainLibrary] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:clearStrainLibrary] Error:", err);
      throw err;
    }
  }

  // Configuration Services
  async addGrowspace(data: {
    name: string;
    rows: number;
    plants_per_row: number;
    notification_service?: string;
  }) {
    console.log("[DataService:addGrowspace] Adding growspace:", data);
    try {
      const res = await this.hass.callService("growspace_manager", "add_growspace", data);
      console.log("[DataService:addGrowspace] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:addGrowspace] Error:", err);
      throw err;
    }
  }

  async configureGrowspaceSensors(data: {
    growspace_id: string;
    temperature_sensor: string;
    humidity_sensor: string;
    vpd_sensor: string;
    co2_sensor?: string;
    light_sensor?: string;
    fan_switch?: string;
  }) {
    console.log("[DataService:configureGrowspaceSensors] Configuring sensors:", data);
    try {
      const res = await this.hass.callService("growspace_manager", "configure_growspace", data);
      console.log("[DataService:configureGrowspaceSensors] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:configureGrowspaceSensors] Error:", err);
      throw err;
    }
  }

  async configureGlobalSettings(data: {
    weather_entity: string;
    lung_room_temp: string;
    lung_room_humidity: string;
  }) {
    console.log("[DataService:configureGlobalSettings] Configuring global settings:", data);
    try {
      const res = await this.hass.callService("growspace_manager", "configure_global", data);
      console.log("[DataService:configureGlobalSettings] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:configureGlobalSettings] Error:", err);
      throw err;
    }
  }
}
