import { HomeAssistant } from 'custom-card-helpers';
import { HassEntity } from 'home-assistant-js-websocket';
import { GrowspaceDevice, StrainEntry, CropMeta, IrrigationStrategy, GrowspaceAPIResponse, HistorySensorState, GrowAdviceResponse, NutrientItem, NutrientPreset, IPMPreset } from './types';
import { GrowspaceAdapter } from './adapters/growspace-adapter';
import { noChange } from 'lit';
import { DOMAIN, SERVICES, WS_TYPE_GET_DATA, WS_TYPE_GET_HISTORY_STATS, WS_TYPE_GET_NUTRIENT_PRESETS, WS_TYPE_GET_IPM_PRESETS } from './constants';
import { GrowspaceAPIResponseSchema, GrowspaceAPICollectionSchema, GrowspaceAPICollection, StrainLibrarySchema, StrainLibraryWrapperSchema, StrainLibrary, NutrientPresetsSchema, IPMPresetsSchema, NutrientPresetsResponse, IPMPresetsResponse, HistoryStatsResponseSchema } from './schemas/api-schema';

/** Shape of raw phenotype data from strain sensor */
interface RawPhenotypeData {
  description?: string;
  image_path?: string;
  image_crop_meta?: CropMeta;
  flower_days_min?: number;
  flower_days_max?: number;
}

/** Shape of raw strain data from strain sensor */
interface RawStrainData {
  meta?: {
    breeder?: string;
    type?: string;
    lineage?: string;
    sex?: string;
    sativa_percentage?: number;
    indica_percentage?: number;
  };
  phenotypes?: Record<string, RawPhenotypeData>;
}


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

  /**
   * Generic service call wrapper. Useful for batch actions and other dynamic calls.
   */
  async callService(domain: string, service: string, serviceData: Record<string, unknown>): Promise<void> {
    console.log(`[DataService:callService] ${domain}.${service}`, serviceData);
    await this.hass.callService(domain, service, serviceData);
  }



  async fetchGrowspaceData(growspaceId?: string): Promise<GrowspaceAPIResponse | GrowspaceAPICollection | null> {
    if (!this.hass) return null;
    try {
      const result = await this.hass.connection.sendMessagePromise<unknown>({
        type: WS_TYPE_GET_DATA,
        growspace_id: growspaceId,
      });

      // Runtime Validation
      if (growspaceId) {
        // Expect Single Response
        const parsed = GrowspaceAPIResponseSchema.safeParse(result);
        if (!parsed.success) {
          console.error(`[DataService] API Validation Failed for ${growspaceId}: `, parsed.error.format());
          return result as GrowspaceAPIResponse;
        }
        return parsed.data as unknown as GrowspaceAPIResponse;
      } else {
        // Expect Collection (Record<string, GrowspaceAPIResponse>)
        const parsed = GrowspaceAPICollectionSchema.safeParse(result);
        if (!parsed.success) {
          console.error('[DataService] API Validation Failed for Collection (All Data):', JSON.stringify(parsed.error.format(), null, 2));

          // Log which growspace ID failed if we can find it
          if (typeof result === 'object' && result !== null) {
            for (const [gid, gdata] of Object.entries(result)) {
              const itemParsed = GrowspaceAPIResponseSchema.safeParse(gdata);
              if (!itemParsed.success) {
                console.error(`[DataService] -> Found problematic item: ${gid}`, JSON.stringify(itemParsed.error.format(), null, 2));
              }
            }
          }

          // For resilience, return as collection.
          return result as GrowspaceAPICollection;
        }
        return parsed.data as unknown as GrowspaceAPICollection;
      }

    } catch (err) {
      console.error('[DataService:fetchGrowspaceData] Error:', err);
      return null;
    }
  }

  /**
   * Pure transformation: converts WebSocket data map to GrowspaceDevice array.
   * Stateless - no internal caching. Caller (GrowspaceStore) is responsible for caching.
   */
  getGrowspaceDevices(wsDataMap: Record<string, GrowspaceAPIResponse> = {}): GrowspaceDevice[] {
    if (!wsDataMap) return [];

    return Object.values(wsDataMap)
      .map((wsData) => GrowspaceAdapter.transformGrowspace(null, wsData))
      .filter((d): d is GrowspaceDevice => d !== null);
  }

  private getGrowspaceId(entity: HassEntity): string {
    return entity.attributes?.growspace_id || 'unknown';
  }

  getStrainLibrary(): StrainEntry[] {
    const knownIds = [
      'sensor.strain_library',
      'sensor.growspace_manager_strain_library',
    ];
    let rawStrains;

    // Direct O(1) Lookup
    for (const id of knownIds) {
      const entity = this.hass.states[id];
      if (entity?.attributes?.strains) {
        rawStrains = entity.attributes.strains;
        break;
      }
    }

    // Fallback: O(N) Scan (Legacy)
    if (!rawStrains) {
      const allStates = Object.values(this.hass.states);
      const strainSensor = allStates.find(
        (s: HassEntity) => s.attributes && 'strains' in s.attributes
      );
      rawStrains = strainSensor?.attributes?.strains;
    }

    // If no sensor data, return empty (let dialog handle service call)
    if (!rawStrains) {
      return [];
    }

    // Existing parsing logic...
    if (Array.isArray(rawStrains)) {
      return rawStrains.map((s: string) => ({
        strain: s,
        phenotype: '',
        key: `${s}|default`,
      }));
    }

    if (typeof rawStrains === 'object') {
      const results: StrainEntry[] = [];

      for (const [strainName, strainData] of Object.entries(rawStrains) as [string, RawStrainData][]) {
        const meta = strainData.meta ?? {};
        const phenotypes = strainData.phenotypes ?? {};

        Object.entries(phenotypes).forEach(([phenoName, phenoData]) => {
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
            flowering_days_max: phenoData.flower_days_max,
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
    console.log('[DataService:fetchStrainLibrary] Fetching strain library via WebSocket API');
    try {
      // Use WebSocket API to bypass the 16KB attribute limit of state machine
      const rawResponse = await this.hass.connection.sendMessagePromise<unknown>({
        type: 'growspace_manager/get_strain_library',
      });

      console.log('[DataService:fetchStrainLibrary] WS Response:', rawResponse);

      // Remove legacy or wrapper 'response' key if present to pass legacy validation
      if (rawResponse && typeof rawResponse === 'object' && 'response' in rawResponse) {
        delete (rawResponse as Record<string, unknown>)['response'];
      }

      // The WS API returns: { strains: { ... }, strain_list: [...] }
      const parsed = StrainLibraryWrapperSchema.safeParse(rawResponse);

      let rawStrains: StrainLibrary = {};

      if (parsed.success) {
        rawStrains = parsed.data.strains;
      } else {
        // Fallback for backward compatibility or if backend changes
        const legacyParsed = StrainLibrarySchema.safeParse(rawResponse);
        if (legacyParsed.success) {
          rawStrains = legacyParsed.data;
        } else {
          console.warn('[DataService:fetchStrainLibrary] API Verification warning:', parsed.error.format());
          return [];
        }
      }

      const currentStrains: StrainEntry[] = [];

      Object.entries(rawStrains).forEach(([strainName, data]) => {
        if (strainName === 'response') return; // unexpected wrapper or metadata
        const meta = data.meta || {};
        const phenotypes = data.phenotypes || {};

        Object.entries(phenotypes).forEach(([phenoName, phenoData]) => {
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
            flowering_days_max: phenoData.flower_days_max,
          });
        });
      });

      return currentStrains;
    } catch (e) {
      console.error('Failed to fetch strain library for grid:', e);
      return [];
    }
  }

  async fetchNutrientPresets(): Promise<NutrientPresetsResponse | null> {
    if (!this.hass) return null;
    try {
      const result = await this.hass.connection.sendMessagePromise<unknown>({
        type: WS_TYPE_GET_NUTRIENT_PRESETS,
      });

      const parsed = NutrientPresetsSchema.safeParse(result);
      if (!parsed.success) {
        console.error('[DataService] Nutrient Presets Validation Failed:', parsed.error.format());
        return result as NutrientPresetsResponse;
      }
      return parsed.data;
    } catch (err) {
      console.error('[DataService:fetchNutrientPresets] Error:', err);
      return null;
    }
  }

  async fetchIPMPresets(): Promise<IPMPresetsResponse | null> {
    if (!this.hass) return null;
    try {
      const result = await this.hass.connection.sendMessagePromise<unknown>({
        type: WS_TYPE_GET_IPM_PRESETS,
      });

      const parsed = IPMPresetsSchema.safeParse(result);
      if (!parsed.success) {
        console.error('[DataService] IPM Presets Validation Failed:', parsed.error.format());
        return result as IPMPresetsResponse;
      }
      return parsed.data;
    } catch (err) {
      console.error('[DataService:fetchIPMPresets] Error:', err);
      return null;
    }
  }

  async getHistory(entityId: string, startTime: Date, endTime?: Date): Promise<HistorySensorState[]> {
    if (!this.hass) return [];

    const startStr = startTime.toISOString();
    let url = `history/period/${startStr}?filter_entity_id=${entityId}`;
    if (endTime) {
      url += `&end_time=${endTime.toISOString()}`;
    }

    try {
      const res = await this.hass.callApi<HistorySensorState[][]>('GET', url);
      return res && res.length > 0 ? res[0] : [];
    } catch (err) {
      console.error('Error fetching history:', err);
      return [];
    }
  }

  async getBatchHistory(entityIds: string[], startTime: Date, endTime?: Date): Promise<Record<string, HistorySensorState[]>> {
    if (!this.hass || entityIds.length === 0) return {};

    const startStr = startTime.toISOString();
    const entityList = entityIds.join(',');

    // OPTIMIZATION: Request all entities in ONE call
    let url = `history/period/${startStr}?filter_entity_id=${entityList}&minimal_response`;

    if (endTime) {
      url += `&end_time=${endTime.toISOString()}`;
    }

    const duration = endTime ? (endTime.getTime() - startTime.getTime()) / 1000 : 'undefined';
    console.log(`[DataService.getBatchHistory] entities=${entityIds.length}, start=${startStr}, end=${endTime?.toISOString() || 'undefined'}, duration=${duration}s, url=${url}`);
    console.log(`[DataService.getBatchHistory] About to call API with URL: ${url}`);

    try {
      // HA returns an array of arrays (one array per entity)
      const res = await this.hass.callApi<HistorySensorState[][]>('GET', url);

      const resultMap: Record<string, HistorySensorState[]> = {};

      if (res) {
        res.forEach((entityHistory) => {
          if (entityHistory && entityHistory.length > 0) {
            // Map back to entity_id from the first record
            const id = entityHistory[0].entity_id;
            resultMap[id] = entityHistory;
          }
        });
      }
      return resultMap;
    } catch (err) {
      console.error('[DataService] Error fetching batch history:', err);
      return {};
    }
  }

  async getHistoryStats(
    entityIds: string[],
    startTime: Date,
    endTime?: Date,
    intervalMinutes: number = 15,
    significantChangesOnly: boolean = true
  ): Promise<Record<string, HistorySensorState[]>> {
    if (!this.hass || entityIds.length === 0) return {};

    try {
      const result = await this.hass.callWS<unknown>({
        type: WS_TYPE_GET_HISTORY_STATS,
        entity_ids: entityIds,
        start_time: startTime.toISOString(),
        end_time: endTime?.toISOString(),
        interval_minutes: intervalMinutes,
        significant_changes_only: significantChangesOnly,
      });

      const parsed = HistoryStatsResponseSchema.safeParse(result);
      if (!parsed.success) {
        console.warn('[DataService] History Stats Validation Failed:', parsed.error.format());
        // Fallback or empty? Fallback to batch history might be better if WS returns garbage.
        throw new Error('Validation Failed');
      }

      // Map compact format back to standard formats for ChartUtils compatibility
      const mappedResult: Record<string, HistorySensorState[]> = {};
      for (const [entityId, points] of Object.entries(parsed.data)) {
        mappedResult[entityId] = points.map((p) => ({
          entity_id: entityId,
          state: p.s,
          last_changed: p.lu,
          last_updated: p.lu,
          attributes: {},
        }));
      }
      return mappedResult;

    } catch (err) {
      console.warn('[DataService] getHistoryStats WS failed, falling back to REST batch. Error:', err);
      console.log(`[DataService] Fallback params: start=${startTime.toISOString()}, end=${endTime?.toISOString() || 'undefined'}`);
      return this.getBatchHistory(entityIds, startTime, endTime);
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
  }): Promise<void> {
    console.log('[DataService:addPlant] Sending payload:', params);
    try {
      if (params.growspace_id === 'mother' || params.growspace_id === 'mother_overview') {
        params.mother_start = new Date().toISOString().split('T')[0];
      }
      if (params.growspace_id === 'clone' || params.growspace_id === 'clone_overview') {
        params.clone_start = new Date().toISOString().split('T')[0];
      }
      await this.hass.callService(DOMAIN, SERVICES.ADD_PLANT, params);
      console.log('[DataService:addPlant] Service Called');
    } catch (err: unknown) {
      console.error('[DataService:addPlant] Error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to add plant';
      throw new Error(msg);
    }
  }

  async addPlants(params: {
    growspace_id: string;
    strain: string;
    amount: number;
    start_number?: number;
    veg_start?: string;
    flower_start?: string;
    mother_start?: string;
    clone_start?: string;
    seedling_start?: string;
    dry_start?: string;
    cure_start?: string;
  }): Promise<void> {
    console.log('[DataService:addPlants] Sending payload:', params);
    try {
      await this.hass.callService(DOMAIN, SERVICES.ADD_PLANTS, params);
      console.log('[DataService:addPlants] Service Called');
    } catch (err: unknown) {
      console.error('[DataService:addPlants] Error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to add plants';
      throw new Error(msg);
    }
  }

  async updatePlant(params: { plant_id: string;[key: string]: unknown }): Promise<void> {
    console.log('[DataService:updatePlant] Sending payload:', params);
    try {
      await this.hass.callService(DOMAIN, SERVICES.UPDATE_PLANT, params);
      console.log('[DataService:updatePlant] Service Called');
    } catch (err) {
      console.error('[DataService:updatePlant] Error:', err);
      throw err;
    }
  }

  async removePlant(plantId: string): Promise<void> {
    console.log('[DataService:removePlant] Removing plant_id:', plantId);
    try {
      await this.hass.callService(DOMAIN, SERVICES.REMOVE_PLANT, { plant_id: plantId });
      console.log('[DataService:removePlant] Service Called');
    } catch (err) {
      console.error('[DataService:removePlant] Error:', err);
      throw err;
    }
  }

  async harvestPlant(plantId: string, target: string = 'dry'): Promise<void> {
    console.log('[DataService:harvestPlant] Harvesting plant:', plantId, '→ target:', target);
    try {
      const payload = {
        plant_id: plantId,
        target_growspace_id: target
      };

      await this.hass.callService(DOMAIN, SERVICES.HARVEST_PLANT, payload);
      console.log('[DataService:harvestPlant] Service Called');
    } catch (err) {
      console.error('[DataService:harvestPlant] Error:', err);
      throw err;
    }
  }

  async takeClone(params: {
    mother_plant_id: string;
    num_clones?: number;
    target_growspace_id?: string;
  }): Promise<void> {
    console.log('[DataService:takeClone] Cloning plant:', params);
    try {
      // Ensure target_growspace_id is set if not provided (though backend handles 'clone' default)
      const payload: Record<string, unknown> = { ...params };
      if (!payload.target_growspace_id) delete payload.target_growspace_id;

      await this.hass.callService(DOMAIN, SERVICES.TAKE_CLONE, payload);
      console.log('[DataService:takeClone] Service Called');
    } catch (err) {
      console.error('[DataService:takeClone] Error:', err);
      throw err;
    }
  }

  async moveClone(plantId: string, targetGrowspaceId: string, transitionDate?: string): Promise<void> {
    console.log('[DataService:moveClone] Moving clone:', plantId, 'to', targetGrowspaceId);
    try {
      const payload: Record<string, string> = {
        plant_id: plantId,
        target_growspace_id: targetGrowspaceId,
      };
      if (transitionDate) {
        payload.transition_date = transitionDate;
      }

      await this.hass.callService(DOMAIN, SERVICES.MOVE_CLONE, payload);
      console.log('[DataService:moveClone] Service Called');
    } catch (err) {
      console.error('[DataService:moveClone] Error:', err);
      throw err;
    }
  }

  async swapPlants(plant1Id: string, plant2Id: string): Promise<void> {
    console.log(`[DataService:swapPlants] Swapping plants: ${plant1Id} and ${plant2Id}`);
    try {
      await this.hass.callService(DOMAIN, SERVICES.SWITCH_PLANTS, {
        plant1_id: plant1Id,
        plant2_id: plant2Id,
      });
      console.log('[DataService:swapPlants] Service Called');
    } catch (err) {
      console.error('[DataService:swapPlants] Error:', err);
      throw err;
    }
  }



  async setDehumidifierControl(growspaceId: string, enabled: boolean): Promise<void> {
    console.log(
      `[DataService:setDehumidifierControl] Setting dehumidifier control for ${growspaceId} to ${enabled}`
    );
    try {
      await this.hass.callService(DOMAIN, SERVICES.SET_DEHUMIDIFIER_CONTROL, {
        growspace_id: growspaceId,
        enabled,
      });
      console.log('[DataService:setDehumidifierControl] Service Called');
    } catch (err) {
      console.error('[DataService:setDehumidifierControl] Error:', err);
      throw err;
    }
  }

  async setIrrigationSettings(params: {
    growspace_id: string;
    irrigation_pump_entity: string;
    drain_pump_entity: string;
    irrigation_duration: number;
    drain_duration: number;
  }): Promise<void> {
    console.log('[DataService:setIrrigationSettings] Setting irrigation settings:', params);
    try {
      await this.hass.callService(DOMAIN, SERVICES.SET_IRRIGATION_SETTINGS, params);
      console.log('[DataService:setIrrigationSettings] Service Called');
    } catch (err) {
      console.error('[DataService:setIrrigationSettings] Error:', err);
      throw err;
    }
  }

  async addIrrigationTime(params: { growspace_id: string; time: string; duration?: number }): Promise<void> {
    console.log('[DataService:addIrrigationTime] Adding irrigation time:', params);
    try {
      await this.hass.callService(DOMAIN, SERVICES.ADD_IRRIGATION_TIME, params);
      console.log('[DataService:addIrrigationTime] Service Called');
    } catch (err) {
      console.error('[DataService:addIrrigationTime] Error:', err);
      throw err;
    }
  }

  async removeIrrigationTime(params: { growspace_id: string; time: string }): Promise<void> {
    console.log('[DataService:removeIrrigationTime] Removing irrigation time:', params);
    try {
      await this.hass.callService(DOMAIN, SERVICES.REMOVE_IRRIGATION_TIME, params);
      console.log('[DataService:removeIrrigationTime] Service Called');
    } catch (err) {
      console.error('[DataService:removeIrrigationTime] Error:', err);
      throw err;
    }
  }

  async setIrrigationStrategy(growspaceId: string, strategy: Partial<IrrigationStrategy>): Promise<void> {
    console.log('[DataService:setIrrigationStrategy] Setting strategy:', strategy);
    try {
      await this.hass.callService(DOMAIN, SERVICES.SET_IRRIGATION_STRATEGY, {
        growspace_id: growspaceId,
        ...strategy,
      });
      console.log('[DataService:setIrrigationStrategy] Service Called');
    } catch (err) {
      console.error('[DataService:setIrrigationStrategy] Error:', err);
      throw err;
    }
  }

  async addDrainTime(params: { growspace_id: string; time: string; duration?: number }): Promise<void> {
    console.log('[DataService:addDrainTime] Adding drain time:', params);
    try {
      await this.hass.callService(DOMAIN, SERVICES.ADD_DRAIN_TIME, params);
      console.log('[DataService:addDrainTime] Service Called');
    } catch (err) {
      console.error('[DataService:addDrainTime] Error:', err);
      throw err;
    }
  }

  async removeDrainTime(params: { growspace_id: string; time: string }): Promise<void> {
    console.log('[DataService:removeDrainTime] Removing drain time:', params);
    try {
      await this.hass.callService(DOMAIN, SERVICES.REMOVE_DRAIN_TIME, params);
      console.log('[DataService:removeDrainTime] Service Called');
    } catch (err) {
      console.error('[DataService:removeDrainTime] Error:', err);
      throw err;
    }
  }

  async exportStrainLibrary(): Promise<void> {
    console.log('[DataService:exportStrainLibrary] Exporting strain library');
    try {
      await this.hass.callService(DOMAIN, SERVICES.EXPORT_STRAIN_LIBRARY);
      console.log('[DataService:exportStrainLibrary] Service Called');
    } catch (err) {
      console.error('[DataService:exportStrainLibrary] Error:', err);
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
  }): Promise<void> {
    console.log('[DataService:addStrain] Adding strain:', data);
    try {
      const payload: Record<string, unknown> = { ...data };

      // Clean undefined keys
      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      if (data.image) {
        if (data.image.startsWith('data:')) {
          // It's a base64 string (new upload)
          payload.image_base64 = data.image;
          delete payload.image; // Backend expects image_base64
        } else {
          // It's a path (existing image)
          delete payload.image;
        }
      }

      await this.hass.callService(DOMAIN, SERVICES.ADD_STRAIN, payload);
      console.log('[DataService:addStrain] Service Called');
    } catch (err) {
      console.error('[DataService:addStrain] Error:', err);
      throw err;
    }
  }

  async removeStrain(strain: string, phenotype?: string): Promise<void> {
    console.log('[DataService:removeStrain] Removing strain:', strain, phenotype);
    try {
      await this.hass.callService(DOMAIN, SERVICES.REMOVE_STRAIN, {
        strain,
        phenotype,
      });
      console.log('[DataService:removeStrain] Service Called');
    } catch (err) {
      console.error('[DataService:removeStrain] Error:', err);
      throw err;
    }
  }

  async importStrainLibrary(file: File, replace: boolean): Promise<{ success: boolean; error?: string }> {
    console.log(
      '[DataService:importStrainLibrary] Importing strain library ZIP via HTTP. Replace:',
      replace
    );

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
      console.log('[DataService:importStrainLibrary] Response:', result);

      if (result.success) {
        return result as { success: boolean; error?: string };
      } else {
        throw new Error(result.error || 'Unknown import error');
      }
    } catch (err: unknown) {
      console.error('[DataService:importStrainLibrary] Error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to import strain library';
      throw new Error(msg);
    }
  }

  async clearStrainLibrary(): Promise<void> {
    console.log('[DataService:clearStrainLibrary] Clearing library');
    try {
      await this.hass.callService(DOMAIN, SERVICES.CLEAR_STRAIN_LIBRARY);
      console.log('[DataService:clearStrainLibrary] Service Called');
    } catch (err) {
      console.error('[DataService:clearStrainLibrary] Error:', err);
      throw err;
    }
  }

  // Configuration Services
  async addGrowspace(data: {
    name: string;
    rows: number;
    plants_per_row: number;
    notification_service?: string;
  }): Promise<void> {
    console.log('[DataService:addGrowspace] Adding growspace:', data);
    try {
      const payload = {
        name: data.name,
        rows: data.rows,
        plants_per_row: data.plants_per_row,
        notification_target: data.notification_service, // Map to backend field
      };
      await this.hass.callService(DOMAIN, SERVICES.ADD_GROWSPACE, payload);
      // this._cachedGrowspaceSensorIds = null; // Cache removed
      console.log('[DataService:addGrowspace] Service Called');
    } catch (err) {
      console.error('[DataService:addGrowspace] Error:', err);
      throw err;
    }
  }

  async updateGrowspace(data: {
    growspace_id: string;
    name?: string;
    rows?: number;
    plants_per_row?: number;
    notification_service?: string;
  }): Promise<void> {
    console.log('[DataService:updateGrowspace] Updating growspace:', data);
    try {
      const payload: Record<string, unknown> = {
        growspace_id: data.growspace_id,
      };
      if (data.name) payload.name = data.name;
      if (data.rows) payload.rows = data.rows;
      if (data.plants_per_row) payload.plants_per_row = data.plants_per_row;
      if (data.notification_service) payload.notification_target = data.notification_service;

      await this.hass.callService(DOMAIN, SERVICES.UPDATE_GROWSPACE, payload);
      console.log('[DataService:updateGrowspace] Service Called');
    } catch (err) {
      console.error('[DataService:updateGrowspace] Error:', err);
      throw err;
    }
  }

  async removeGrowspace(growspaceId: string): Promise<void> {
    console.log('[DataService:removeGrowspace] Removing growspace:', growspaceId);
    try {
      await this.hass.callService(DOMAIN, SERVICES.REMOVE_GROWSPACE, {
        growspace_id: growspaceId,
      });
      // this._cachedGrowspaceSensorIds = null; // Cache removed
      console.log('[DataService:removeGrowspace] Service Called');
    } catch (err) {
      console.error('[DataService:removeGrowspace] Error:', err);
      throw err;
    }
  }

  async configureEnvironment(data: {
    growspace_id: string;
    temperature_sensor: string;
    humidity_sensor: string;
    vpd_sensor?: string;
    co2_sensor?: string;
    circulation_fan_entity?: string;
    stress_threshold?: number;
    mold_threshold?: number;
    light_sensor?: string;
    exhaust_entity?: string;
    humidifier_entity?: string;
    dehumidifier_entity?: string;
    dehumidifier_thresholds?: Record<string, Record<string, { on: number; off: number }>>;
    soil_moisture_sensor?: string;
    control_dehumidifier?: boolean;
    veg_day_hours?: number;
    flower_early_day_hours?: number;
    flower_mid_day_hours?: number;
    flower_late_day_hours?: number;
    minimum_source_air_temperature?: number;
  }): Promise<void> {
    console.log('[DataService:configureEnvironment] Configuring sensors:', data);
    try {
      await this.hass.callService(DOMAIN, SERVICES.CONFIGURE_ENVIRONMENT, data);
      console.log('[DataService:configureEnvironment] Service Called');
    } catch (err) {
      console.error('[DataService:configureEnvironment] Error:', err);
      throw err;
    }
  }

  async askGrowAdvice(
    growspaceId: string,
    userQuery: string
  ): Promise<GrowAdviceResponse> {
    console.log('[DataService:askGrowAdvice] Asking advice for:', growspaceId, userQuery);
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
    } catch (err: unknown) {
      console.error('[DataService:askGrowAdvice] Error:', err);
      const message = err instanceof Error ? err.message : 'Failed to get advice';
      throw new Error(message);
    }
  }

  async analyzeAllGrowspaces(): Promise<GrowAdviceResponse> {
    console.log('[DataService:analyzeAllGrowspaces] Analyzing all growspaces');
    try {
      return await this.hass.connection.sendMessagePromise({
        type: 'call_service',
        domain: DOMAIN,
        service: SERVICES.ANALYZE_ALL_GROWSPACES,
        service_data: {},
        return_response: true,
      });
    } catch (err) {
      console.error('[DataService:analyzeAllGrowspaces] Error:', err);
      throw err;
    }
  }

  async getStrainRecommendation(userQuery: string): Promise<GrowAdviceResponse> {
    console.log(
      '[DataService:getStrainRecommendation] Getting strain recommendation for:',
      userQuery
    );
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
      console.error('[DataService:getStrainRecommendation] Error:', err);
      throw err;
    }
  }

  // --- Watering Services ---

  async waterPlant(
    plantId: string,
    amount: number,
    nutrients?: Record<string, number>,
    presetId?: string
  ): Promise<void> {
    console.log('[DataService:waterPlant] Watering plant:', plantId, 'amount:', amount, 'preset:', presetId);
    try {
      const payload: Record<string, unknown> = {
        plant_id: plantId,
        amount,
      };
      if (nutrients && Object.keys(nutrients).length > 0) {
        payload.nutrients = nutrients;
      }
      if (presetId) {
        payload.preset_id = presetId;
      }
      await this.hass.callService(DOMAIN, SERVICES.WATER_PLANT, payload);
      console.log('[DataService:waterPlant] Service Called');
    } catch (err) {
      console.error('[DataService:waterPlant] Error:', err);
      throw err;
    }
  }

  async saveIPMPreset(data: {
    preset_id?: string;
    name: string;
    type: string;
    items: { name: string; dose_amount: number; dose_unit: string }[];
    stage?: string;
    min_days_in_stage?: number;
  }): Promise<void> {
    console.log('[DataService:saveIPMPreset] Saving IPM preset:', data);
    try {
      await this.hass.callService(DOMAIN, SERVICES.SAVE_IPM_PRESET, data);
      console.log('[DataService:saveIPMPreset] Service Called');
    } catch (err) {
      console.error('[DataService:saveIPMPreset] Error:', err);
      throw err;
    }
  }

  async removeIPMPreset(presetId: string): Promise<void> {
    console.log('[DataService:removeIPMPreset] Removing IPM preset:', presetId);
    try {
      await this.hass.callService(DOMAIN, SERVICES.REMOVE_IPM_PRESET, { preset_id: presetId });
      console.log('[DataService:removeIPMPreset] Service Called');
    } catch (err) {
      console.error('[DataService:removeIPMPreset] Error:', err);
      throw err;
    }
  }

  async applyIPM(data: {
    preset_id: string;
    growspace_id?: string;
    plant_ids?: string[];
    notes?: string;
  }): Promise<void> {
    console.log('[DataService:applyIPM] Applying IPM:', data);
    try {
      await this.hass.callService(DOMAIN, SERVICES.APPLY_IPM, data);
      console.log('[DataService:applyIPM] Service Called');
    } catch (err) {
      console.error('[DataService:applyIPM] Error:', err);
      throw err;
    }
  }

  async waterGrowspace(
    growspaceId: string,
    amountPerPlant: number,
    nutrients?: Record<string, number>,
    presetId?: string
  ): Promise<void> {
    console.log('[DataService:waterGrowspace] Watering growspace:', growspaceId, 'amount per plant:', amountPerPlant, 'preset:', presetId);
    try {
      const payload: Record<string, unknown> = {
        growspace_id: growspaceId,
        amount_per_plant: amountPerPlant,
      };
      if (nutrients && Object.keys(nutrients).length > 0) {
        payload.nutrients = nutrients;
      }
      if (presetId) {
        payload.preset_id = presetId;
      }
      await this.hass.callService(DOMAIN, SERVICES.WATER_GROWSPACE, payload);
      console.log('[DataService:waterGrowspace] Service Called');
    } catch (err) {
      console.error('[DataService:waterGrowspace] Error:', err);
      throw err;
    }
  }

  // --- Nutrient Presets ---

  async saveNutrientPreset(params: {
    preset_id?: string;
    name: string;
    nutrients: NutrientItem[];
    stage?: string;
    min_days_in_stage?: number;
  }): Promise<void> {
    console.log('[DataService:saveNutrientPreset] Saving preset:', params);
    try {
      await this.hass.callService(DOMAIN, SERVICES.SAVE_NUTRIENT_PRESET, params);
      console.log('[DataService:saveNutrientPreset] Service Called');
    } catch (err) {
      console.error('[DataService:saveNutrientPreset] Error:', err);
      throw err;
    }
  }

  async removeNutrientPreset(presetId: string): Promise<void> {
    console.log('[DataService:removeNutrientPreset] Removing preset:', presetId);
    try {
      await this.hass.callService(DOMAIN, SERVICES.REMOVE_NUTRIENT_PRESET, {
        preset_id: presetId,
      });
      console.log('[DataService:removeNutrientPreset] Service Called');
    } catch (err) {
      console.error('[DataService:removeNutrientPreset] Error:', err);
      throw err;
    }
  }
}
