import { BaseAPI } from '../base-api';
import { DOMAIN, SERVICES } from '../../constants';

/**
 * API service for plant operations.
 * Handles plant CRUD, harvesting, cloning, and watering.
 */
export class PlantAPI extends BaseAPI {
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
    try {
      if (params.growspace_id === 'mother' || params.growspace_id === 'mother_overview') {
        params.mother_start = new Date().toISOString().split('T')[0];
      }
      if (params.growspace_id === 'clone' || params.growspace_id === 'clone_overview') {
        params.clone_start = new Date().toISOString().split('T')[0];
      }
      await this.callService(DOMAIN, SERVICES.ADD_PLANT, params);
    } catch (err: unknown) {
      console.error('[PlantAPI:addPlant] Error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to add plant';
      throw new Error(msg);
    }
  }

  async addPlants(params: {
    growspace_id: string;
    strain: string;
    amount: number;
    start_number?: number;
    phenotype?: string;
    veg_start?: string;
    flower_start?: string;
    mother_start?: string;
    clone_start?: string;
    seedling_start?: string;
    dry_start?: string;
    cure_start?: string;
  }): Promise<void> {
    try {
      await this.callService(DOMAIN, SERVICES.ADD_PLANTS, params);
    } catch (err: unknown) {
      console.error('[PlantAPI:addPlants] Error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to add plants';
      throw new Error(msg);
    }
  }

  async updatePlant(params: { plant_id: string;[key: string]: unknown }): Promise<void> {
    try {
      await this.callService(DOMAIN, SERVICES.UPDATE_PLANT, params);
    } catch (err) {
      console.error('[PlantAPI:updatePlant] Error:', err);
      throw err;
    }
  }

  async removePlant(plantId: string): Promise<void> {
    try {
      await this.callService(DOMAIN, SERVICES.REMOVE_PLANT, { plant_id: plantId });
    } catch (err) {
      console.error('[PlantAPI:removePlant] Error:', err);
      throw err;
    }
  }

  async harvestPlant(
    plantId: string,
    target: string = 'dry',
    metrics?: {
      wet_weight?: number;
      dry_weight?: number;
      trim_weight?: number;
      thc_percentage?: number;
      cbd_percentage?: number;
      terpene_profile?: string;
    }
  ): Promise<void> {
    try {
      const payload: Record<string, unknown> = {
        plant_id: plantId,
        target_growspace_id: target,
      };

      // Attach optional yield/lab metrics
      if (metrics) {
        if (metrics.wet_weight != null) payload.wet_weight = metrics.wet_weight;
        if (metrics.dry_weight != null) payload.dry_weight = metrics.dry_weight;
        if (metrics.trim_weight != null) payload.trim_weight = metrics.trim_weight;
        if (metrics.thc_percentage != null) payload.thc_percentage = metrics.thc_percentage;
        if (metrics.cbd_percentage != null) payload.cbd_percentage = metrics.cbd_percentage;
        if (metrics.terpene_profile) payload.terpene_profile = metrics.terpene_profile;
      }

      await this.callService(DOMAIN, SERVICES.HARVEST_PLANT, payload);
    } catch (err) {
      console.error('[PlantAPI:harvestPlant] Error:', err);
      throw err;
    }
  }

  async takeClone(params: {
    mother_plant_id: string;
    num_clones?: number;
    target_growspace_id?: string;
  }): Promise<void> {
    try {
      // Ensure target_growspace_id is set if not provided
      const payload: Record<string, unknown> = { ...params };
      if (!payload.target_growspace_id) delete payload.target_growspace_id;

      await this.callService(DOMAIN, SERVICES.TAKE_CLONE, payload);
    } catch (err) {
      console.error('[PlantAPI:takeClone] Error:', err);
      throw err;
    }
  }

  async moveClone(
    plantId: string,
    targetGrowspaceId: string,
    transitionDate?: string
  ): Promise<void> {
    try {
      const payload: Record<string, string> = {
        plant_id: plantId,
        target_growspace_id: targetGrowspaceId,
      };
      if (transitionDate) {
        payload.transition_date = transitionDate;
      }

      await this.callService(DOMAIN, SERVICES.MOVE_CLONE, payload);
    } catch (err) {
      console.error('[PlantAPI:moveClone] Error:', err);
      throw err;
    }
  }

  async swapPlants(plant1Id: string, plant2Id: string): Promise<void> {
    try {
      await this.callService(DOMAIN, SERVICES.SWITCH_PLANTS, {
        plant1_id: plant1Id,
        plant2_id: plant2Id,
      });
    } catch (err) {
      console.error('[PlantAPI:swapPlants] Error:', err);
      throw err;
    }
  }

  async waterPlant(
    plantId: string,
    amount: number,
    nutrients?: Record<string, number>,
    presetId?: string
  ): Promise<void> {
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
      await this.callService(DOMAIN, SERVICES.WATER_PLANT, payload);
    } catch (err) {
      console.error('[PlantAPI:waterPlant] Error:', err);
      throw err;
    }
  }

  async printLabel(params: {
    plant_id?: string;
    strain?: string;
    phenotype?: string;
    breeder?: string;
    lineage?: string;
    breeder_logo?: string;
    device_id?: string;
    preview?: boolean;
    base_url?: string;
  }): Promise<any> {
    try {
      return await this.callService(DOMAIN, SERVICES.PRINT_LABEL, params);
    } catch (err) {
      console.error('[PlantAPI:printLabel] Error:', err);
      throw err;
    }
  }

  async scorePlant(params: {
    plant_id: string;
    vigor?: number | null;
    structure?: number | null;
    aroma?: number | null;
    resin?: number | null;
    pest_resistance?: number | null;
    internodal_spacing?: number | null;
    terpene_intensity?: number | null;
    mold_resistance?: number | null;
    yield_potential?: number | null;
    keeper?: boolean | null;
    notes?: string | null;
  }): Promise<void> {
    const payload: Record<string, unknown> = { plant_id: params.plant_id };

    // Explicitly include null values to allow clearing fields on the backend
    if (params.vigor !== undefined) payload.vigor = params.vigor;
    if (params.structure !== undefined) payload.structure = params.structure;
    if (params.aroma !== undefined) payload.aroma = params.aroma;
    if (params.resin !== undefined) payload.resin = params.resin;
    if (params.pest_resistance !== undefined) payload.pest_resistance = params.pest_resistance;
    if (params.internodal_spacing !== undefined) payload.internodal_spacing = params.internodal_spacing;
    if (params.terpene_intensity !== undefined) payload.terpene_intensity = params.terpene_intensity;
    if (params.mold_resistance !== undefined) payload.mold_resistance = params.mold_resistance;
    if (params.yield_potential !== undefined) payload.yield_potential = params.yield_potential;
    if (params.keeper !== undefined) payload.keeper = params.keeper;
    if (params.notes !== undefined) payload.notes = params.notes;

    try {
      await this.callService(DOMAIN, SERVICES.SCORE_PLANT, payload);
    } catch (err) {
      console.error('[PlantAPI:scorePlant] Error:', err);
      throw err;
    }
  }

  async updateHarvestMetrics(params: {
    plant_id: string;
    wet_weight?: number | null;
    dry_weight?: number | null;
    trim_weight?: number | null;
    thc_percentage?: number | null;
    cbd_percentage?: number | null;
    terpene_profile?: string | null;
  }): Promise<void> {
    const payload: Record<string, unknown> = { plant_id: params.plant_id };

    // Explicitly include null values to allow clearing fields on the backend
    if (params.wet_weight !== undefined) payload.wet_weight = params.wet_weight;
    if (params.dry_weight !== undefined) payload.dry_weight = params.dry_weight;
    if (params.trim_weight !== undefined) payload.trim_weight = params.trim_weight;
    if (params.thc_percentage !== undefined) payload.thc_percentage = params.thc_percentage;
    if (params.cbd_percentage !== undefined) payload.cbd_percentage = params.cbd_percentage;
    if (params.terpene_profile !== undefined) payload.terpene_profile = params.terpene_profile;

    try {
      await this.callService(DOMAIN, SERVICES.UPDATE_HARVEST_METRICS, payload);
    } catch (err) {
      console.error('[PlantAPI:updateHarvestMetrics] Error:', err);
      throw err;
    }
  }

  async logDryingWeight(params: { plant_id: string; weight_grams: number; date?: string }): Promise<void> {
    const payload: Record<string, unknown> = { plant_id: params.plant_id, weight_grams: params.weight_grams };
    if (params.date) payload.date = params.date;
    try {
      await this.callService(DOMAIN, SERVICES.LOG_DRYING_WEIGHT, payload);
    } catch (err) {
      console.error('[PlantAPI:logDryingWeight] Error:', err);
      throw err;
    }
  }

  async logMoistureReading(params: { plant_id: string; moisture_percent: number; date?: string }): Promise<void> {
    const payload: Record<string, unknown> = { plant_id: params.plant_id, moisture_percent: params.moisture_percent };
    if (params.date) payload.date = params.date;
    try {
      await this.callService(DOMAIN, SERVICES.LOG_MOISTURE_READING, payload);
    } catch (err) {
      console.error('[PlantAPI:logMoistureReading] Error:', err);
      throw err;
    }
  }

  async setVisualTag(params: { plant_id: string; visual_tag: string | null }): Promise<void> {
    try {
      await this.callService(DOMAIN, SERVICES.SET_VISUAL_TAG, { plant_id: params.plant_id, visual_tag: params.visual_tag ?? null });
    } catch (err) {
      console.error('[PlantAPI:setVisualTag] Error:', err);
      throw err;
    }
  }

  async movePlant(plantId: string, targetGrowspaceId: string, transitionDate?: string): Promise<void> {
    const payload: Record<string, unknown> = {
      plant_id: plantId,
      target_growspace_id: targetGrowspaceId,
    };
    if (transitionDate) {
      payload.transition_date = transitionDate;
    }
    try {
      await this.callService(DOMAIN, SERVICES.MOVE_PLANT, payload);
    } catch (err) {
      console.error('[PlantAPI:movePlant] Error:', err);
      throw err;
    }
  }
}
