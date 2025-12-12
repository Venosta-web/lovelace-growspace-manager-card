import { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceDevice, StrainEntry, CropMeta, IrrigationStrategy } from './types';
import { GrowspaceAdapter } from './adapters/growspace-adapter';
import { noChange } from 'lit';
import { DOMAIN, SERVICES, WS_TYPE_GET_DATA } from './constants';

export class DataService {
  public hass!: HomeAssistant;

  constructor(hass?: HomeAssistant) {
    if (hass) {
      this.hass = hass;
    }
  }

  updateHass(hass: HomeAssistant) {
    this.hass = hass;
  }

  async fetchGrowspaceData(growspaceId?: string): Promise<any> {
    if (!this.hass) return null;
    try {
      const result = await this.hass.connection.sendMessagePromise({
        type: WS_TYPE_GET_DATA,
        growspace_id: growspaceId,
      });
      return result;
    } catch (err) {
      console.error("[DataService:fetchGrowspaceData] Error:", err);
      // Fallback: If WS fails, we return null, and adapter will try to use attributes (which might be empty for heavy data)
      return null;
    }
  }

  getGrowspaceDevices(wsDataMap: Record<string, any> = {}): GrowspaceDevice[] {
    if (!this.hass) return [];

    const allStates = Object.values(this.hass.states);

    const overviewSensors = allStates.filter((s: any) =>
      s.entity_id.startsWith('sensor.') &&
      s.attributes.growspace_id !== undefined &&
      s.attributes.plants_per_row !== undefined &&
      s.attributes.row === undefined &&
      s.attributes.col === undefined
    );

    return overviewSensors.map((sensor: any) => {
      const growspaceId = sensor.attributes.growspace_id;
      const wsData = wsDataMap[growspaceId] || null;
      return GrowspaceAdapter.transformGrowspace(sensor, wsData);
    }).filter((device): device is GrowspaceDevice => device !== null);
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

    // If no sensor data, return empty (let dialog handle service call)
    if (!rawStrains) {
      console.warn('[DataService] No strain data in sensor attributes');
      return [];
    }

    // Existing parsing logic...
    if (Array.isArray(rawStrains)) {
      return rawStrains.map((s: string) => ({
        strain: s,
        phenotype: '',
        key: `${s}|default`
      }));
    }

    if (typeof rawStrains === 'object') {
      const results: StrainEntry[] = [];

      for (const [strainName, strainData] of Object.entries(rawStrains)) {
        const meta = (strainData as any).meta || {};
        const phenotypes = (strainData as any).phenotypes || {};

        Object.entries(phenotypes).forEach(([phenoName, phenoData]: [string, any]) => {
          results.push({
            strain: strainName,
            phenotype: phenoName,
            key: `${strainName}|${phenoName}`,
            breeder: meta.breeder,
            type: meta.type,
            lineage: meta.lineage,
            sex: meta.sex,
            sativa_percentage: meta.sativa_percentage,
            indica_percentage: meta.indica_percentage,
            description: phenoData.description,
            image: phenoData.image_path,
            image_crop_meta: phenoData.image_crop_meta,
            flowering_days_min: phenoData.flower_days_min,
            flowering_days_max: phenoData.flower_days_max
          });
        });
      }

      return results.sort((a, b) => {
        const strainComp = a.strain.localeCompare(b.strain);
        if (strainComp !== 0) return strainComp;
        return (a.phenotype || '').localeCompare(b.phenotype || '');
      });
    }

    return [];
  }

  async fetchStrainLibrary(): Promise<StrainEntry[]> {
    console.log("[DataService:fetchStrainLibrary] Fetching strain library via API");
    try {
      const serviceResponse: any = await this.hass.connection.sendMessagePromise({
        type: 'call_service',
        domain: DOMAIN,
        service: SERVICES.GET_STRAIN_LIBRARY,
        service_data: {},
        return_response: true,
      });

      const rawStrains = serviceResponse?.response || serviceResponse || {};
      const currentStrains: StrainEntry[] = [];

      console.log("[DataService:fetchStrainLibrary] Raw response:", rawStrains);

      Object.entries(rawStrains).forEach(([strainName, data]: [string, any]) => {
        if (strainName === 'response') return; // unexpected wrapper?
        const meta = data.meta || {};
        const phenotypes = data.phenotypes || {};

        Object.entries(phenotypes).forEach(([phenoName, phenoData]: [string, any]) => {
          currentStrains.push({
            strain: strainName,
            phenotype: phenoName,
            key: `${strainName}|${phenoName}`,
            breeder: meta.breeder,
            type: meta.type,
            lineage: meta.lineage,
            sex: meta.sex,
            sativa_percentage: meta.sativa_percentage,
            indica_percentage: meta.indica_percentage,
            description: phenoData.description,
            image: phenoData.image_path,
            image_crop_meta: phenoData.image_crop_meta,
            flowering_days_min: phenoData.flower_days_min,
            flowering_days_max: phenoData.flower_days_max
          });
        });
      });

      return currentStrains;
    } catch (e) {
      console.error('Failed to fetch strain library for grid:', e);
      return [];
    }
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
    dry_start?: string;
    cure_start?: string;
  }) {
    console.log("[DataService:addPlant] Sending payload:", params);
    try {
      if (params.growspace_id === "mother" || params.growspace_id === "mother_overview") {
        params.mother_start = new Date().toISOString().split('T')[0];
      }
      if (params.growspace_id === "clone" || params.growspace_id === "clone_overview") {
        params.clone_start = new Date().toISOString().split('T')[0];
      }
      const res = await this.hass.callService(DOMAIN, SERVICES.ADD_PLANT, params);
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
      const res = await this.hass.callService(DOMAIN, SERVICES.UPDATE_PLANT, params);
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
      const res = await this.hass.callService(DOMAIN, SERVICES.REMOVE_PLANT, { plant_id: plantId });
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
        payload.target_growspace_id = "dry"; // Was dry_overview
      } else if (hint.includes("cure")) {
        payload.target_growspace_id = "cure"; // Was cure_overview
      } else if (hint.includes("mother")) {
        payload.target_growspace_id = "mother"; // Was mother_overview
      } else if (hint.includes("clone")) {
        payload.target_growspace_id = "clone"; // Was clone_overview
      }
      // Note: Backend only accepts target_growspace_id. 
      // If target is a custom name, we can't send it unless we resolve it to an ID first.
      // We will assume the UI passes IDs or we map known ones.

      const res = await this.hass.callService(DOMAIN, SERVICES.HARVEST_PLANT, payload);
      console.log("[DataService:harvestPlant] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:harvestPlant] Error:", err);
      throw err;
    }
  }

  async takeClone(params: { mother_plant_id: string; num_clones?: number; target_growspace_id?: string }) {
    console.log("[DataService:takeClone] Cloning plant:", params);
    try {
      const res = await this.hass.callService(DOMAIN, SERVICES.TAKE_CLONE, params);
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
      const res = await this.hass.callService(DOMAIN, SERVICES.SWITCH_PLANTS, {
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

  async moveClone(plantId: string, targetGrowspaceId: string) {
    console.log(`[DataService:moveClone] Moving clone: ${plantId} to ${targetGrowspaceId}`);
    try {
      const res = await this.hass.callService(DOMAIN, SERVICES.MOVE_CLONE, {
        plant_id: plantId,
        target_growspace_id: targetGrowspaceId
      });
      console.log("[DataService:moveClone] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:moveClone] Error:", err);
      throw err;
    }
  }

  async setDehumidifierControl(growspaceId: string, enabled: boolean) {
    console.log(`[DataService:setDehumidifierControl] Setting dehumidifier control for ${growspaceId} to ${enabled}`);
    try {
      const res = await this.hass.callService(DOMAIN, SERVICES.SET_DEHUMIDIFIER_CONTROL, {
        growspace_id: growspaceId,
        enabled: enabled
      });
      console.log("[DataService:setDehumidifierControl] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:setDehumidifierControl] Error:", err);
      throw err;
    }
  }

  async setIrrigationSettings(params: {
    growspace_id: string;
    irrigation_pump_entity: string;
    drain_pump_entity: string;
    irrigation_duration: number;
    drain_duration: number;
  }) {
    console.log("[DataService:setIrrigationSettings] Setting irrigation settings:", params);
    try {
      const res = await this.hass.callService(DOMAIN, SERVICES.SET_IRRIGATION_SETTINGS, params);
      console.log("[DataService:setIrrigationSettings] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:setIrrigationSettings] Error:", err);
      throw err;
    }
  }

  async addIrrigationTime(params: { growspace_id: string; time: string; duration?: number }) {
    console.log("[DataService:addIrrigationTime] Adding irrigation time:", params);
    try {
      const res = await this.hass.callService(DOMAIN, SERVICES.ADD_IRRIGATION_TIME, params);
      console.log("[DataService:addIrrigationTime] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:addIrrigationTime] Error:", err);
      throw err;
    }
  }

  async removeIrrigationTime(params: { growspace_id: string; time: string }) {
    console.log("[DataService:removeIrrigationTime] Removing irrigation time:", params);
    try {
      const res = await this.hass.callService(DOMAIN, SERVICES.REMOVE_IRRIGATION_TIME, params);
      console.log("[DataService:removeIrrigationTime] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:removeIrrigationTime] Error:", err);
      throw err;
    }
  }

  async setIrrigationStrategy(growspaceId: string, strategy: Partial<IrrigationStrategy>) {
    console.log("[DataService:setIrrigationStrategy] Setting strategy:", strategy);
    try {
      const res = await this.hass.callService(DOMAIN, SERVICES.SET_IRRIGATION_STRATEGY, {
        growspace_id: growspaceId,
        ...strategy
      });
      console.log("[DataService:setIrrigationStrategy] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:setIrrigationStrategy] Error:", err);
      throw err;
    }
  }

  async addDrainTime(params: { growspace_id: string; time: string; duration?: number }) {
    console.log("[DataService:addDrainTime] Adding drain time:", params);
    try {
      const res = await this.hass.callService(DOMAIN, SERVICES.ADD_DRAIN_TIME, params);
      console.log("[DataService:addDrainTime] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:addDrainTime] Error:", err);
      throw err;
    }
  }

  async removeDrainTime(params: { growspace_id: string; time: string }) {
    console.log("[DataService:removeDrainTime] Removing drain time:", params);
    try {
      const res = await this.hass.callService(DOMAIN, SERVICES.REMOVE_DRAIN_TIME, params);
      console.log("[DataService:removeDrainTime] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:removeDrainTime] Error:", err);
      throw err;
    }
  }

  async exportStrainLibrary() {
    console.log("[DataService:exportStrainLibrary] Exporting strain library");
    try {
      const res = await this.hass.callService(DOMAIN, SERVICES.EXPORT_STRAIN_LIBRARY);
      console.log("[DataService:exportStrainLibrary] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:exportStrainLibrary] Error:", err);
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
          // It's a path (existing image) - Backend schema doesn't explicitly list image_path, 
          // but we'll try to send it if the backend supports it dynamically, 
          // or we might need to omit it if it's just for local display.
          // Checking services.yaml, only image_base64 is listed. 
          // We will assume image_path is not supported for add_strain and omit it to avoid schema errors.
          // payload.image_path = data.image; 
          delete payload.image;
        }
      }

      const res = await this.hass.callService(DOMAIN, SERVICES.ADD_STRAIN, payload);
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
      const res = await this.hass.callService(DOMAIN, SERVICES.REMOVE_STRAIN, {
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

  async importStrainLibrary(file: File, replace: boolean) {
    console.log("[DataService:importStrainLibrary] Importing strain library ZIP via HTTP. Replace:", replace);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('replace', replace.toString());

    try {
      const response = await this.hass.fetchWithAuth('/api/growspace_manager/import_strains', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
      }

      const result = await response.json();
      console.log("[DataService:importStrainLibrary] Response:", result);

      if (result.success) {
        return result;
      } else {
        throw new Error(result.error || 'Unknown import error');
      }

    } catch (err) {
      console.error("[DataService:importStrainLibrary] Error:", err);
      throw err;
    }
  }

  async clearStrainLibrary() {
    console.log("[DataService:clearStrainLibrary] Clearing library");
    try {
      const res = await this.hass.callService(DOMAIN, SERVICES.CLEAR_STRAIN_LIBRARY);
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
      const payload = {
        name: data.name,
        rows: data.rows,
        plants_per_row: data.plants_per_row,
        notification_target: data.notification_service // Map to backend field
      };
      const res = await this.hass.callService(DOMAIN, SERVICES.ADD_GROWSPACE, payload);
      console.log("[DataService:addGrowspace] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:addGrowspace] Error:", err);
      throw err;
    }
  }

  async updateGrowspace(data: {
    growspace_id: string;
    name?: string;
    rows?: number;
    plants_per_row?: number;
    notification_service?: string;
  }) {
    console.log("[DataService:updateGrowspace] Updating growspace:", data);
    try {
      const payload: any = {
        growspace_id: data.growspace_id,
      };
      if (data.name) payload.name = data.name;
      if (data.rows) payload.rows = data.rows;
      if (data.plants_per_row) payload.plants_per_row = data.plants_per_row;
      if (data.notification_service) payload.notification_target = data.notification_service;

      const res = await this.hass.callService(DOMAIN, SERVICES.UPDATE_GROWSPACE, payload);
      console.log("[DataService:updateGrowspace] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:updateGrowspace] Error:", err);
      throw err;
    }
  }

  async removeGrowspace(growspaceId: string) {
    console.log("[DataService:removeGrowspace] Removing growspace:", growspaceId);
    try {
      const res = await this.hass.callService(DOMAIN, SERVICES.REMOVE_GROWSPACE, {
        growspace_id: growspaceId
      });
      console.log("[DataService:removeGrowspace] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:removeGrowspace] Error:", err);
      throw err;
    }
  }

  async configureEnvironment(data: {
    growspace_id: string;
    temperature_sensor: string;
    humidity_sensor: string;
    vpd_sensor: string;
    co2_sensor?: string;
    circulation_fan?: string;
    stress_threshold?: number;
    mold_threshold?: number;
  }) {
    console.log("[DataService:configureEnvironment] Configuring sensors:", data);
    try {
      const res = await this.hass.callService(DOMAIN, SERVICES.CONFIGURE_ENVIRONMENT, data);
      console.log("[DataService:configureEnvironment] Response:", res);
      return res;
    } catch (err) {
      console.error("[DataService:configureEnvironment] Error:", err);
      throw err;
    }
  }

  async askGrowAdvice(growspaceId: string, userQuery: string): Promise<{ response: string | { response: string } }> {
    console.log("[DataService:askGrowAdvice] Asking advice for:", growspaceId, userQuery);
    try {
      // UPDATED: Use sendMessagePromise to send return_response=true
      return await this.hass.connection.sendMessagePromise({
        type: 'call_service',
        domain: DOMAIN,
        service: SERVICES.ASK_GROW_ADVICE,
        service_data: {
          growspace_id: growspaceId,
          user_query: userQuery,
        },
        return_response: true,
      });
    } catch (err) {
      console.error("[DataService:askGrowAdvice] Error:", err);
      throw err;
    }
  }

  async analyzeAllGrowspaces(): Promise<{ response: string | { response: string } }> {
    console.log("[DataService:analyzeAllGrowspaces] Analyzing all growspaces");
    try {
      return await this.hass.connection.sendMessagePromise({
        type: 'call_service',
        domain: DOMAIN,
        service: SERVICES.ANALYZE_ALL_GROWSPACES,
        service_data: {},
        return_response: true,
      });
    } catch (err) {
      console.error("[DataService:analyzeAllGrowspaces] Error:", err);
      throw err;
    }
  }

  async getStrainRecommendation(userQuery: string): Promise<{ response: string }> {
    console.log("[DataService:getStrainRecommendation] Getting strain recommendation for:", userQuery);
    try {
      return await this.hass.connection.sendMessagePromise({
        type: 'call_service',
        domain: DOMAIN,
        service: SERVICES.STRAIN_RECOMMENDATION,
        service_data: {
          user_query: userQuery,
        },
        return_response: true,
      });
    } catch (err) {
      console.error("[DataService:getStrainRecommendation] Error:", err);
      throw err;
    }
  }
}
