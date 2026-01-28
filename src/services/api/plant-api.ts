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
    console.log('[PlantAPI:addPlant] Sending payload:', params);
    try {
      if (params.growspace_id === 'mother' || params.growspace_id === 'mother_overview') {
        params.mother_start = new Date().toISOString().split('T')[0];
      }
      if (params.growspace_id === 'clone' || params.growspace_id === 'clone_overview') {
        params.clone_start = new Date().toISOString().split('T')[0];
      }
      await this.callService(DOMAIN, SERVICES.ADD_PLANT, params);
      console.log('[PlantAPI:addPlant] Service Called');
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
    console.log('[PlantAPI:addPlants] Sending payload:', params);
    try {
      await this.callService(DOMAIN, SERVICES.ADD_PLANTS, params);
      console.log('[PlantAPI:addPlants] Service Called');
    } catch (err: unknown) {
      console.error('[PlantAPI:addPlants] Error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to add plants';
      throw new Error(msg);
    }
  }

  async updatePlant(params: { plant_id: string;[key: string]: unknown }): Promise<void> {
    console.log('[PlantAPI:updatePlant] Sending payload:', params);
    try {
      await this.callService(DOMAIN, SERVICES.UPDATE_PLANT, params);
      console.log('[PlantAPI:updatePlant] Service Called');
    } catch (err) {
      console.error('[PlantAPI:updatePlant] Error:', err);
      throw err;
    }
  }

  async removePlant(plantId: string): Promise<void> {
    console.log('[PlantAPI:removePlant] Removing plant_id:', plantId);
    try {
      await this.callService(DOMAIN, SERVICES.REMOVE_PLANT, { plant_id: plantId });
      console.log('[PlantAPI:removePlant] Service Called');
    } catch (err) {
      console.error('[PlantAPI:removePlant] Error:', err);
      throw err;
    }
  }

  async harvestPlant(plantId: string, target: string = 'dry'): Promise<void> {
    console.log('[PlantAPI:harvestPlant] Harvesting plant:', plantId, '→ target:', target);
    try {
      const payload = {
        plant_id: plantId,
        target_growspace_id: target,
      };

      await this.callService(DOMAIN, SERVICES.HARVEST_PLANT, payload);
      console.log('[PlantAPI:harvestPlant] Service Called');
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
    console.log('[PlantAPI:takeClone] Cloning plant:', params);
    try {
      // Ensure target_growspace_id is set if not provided
      const payload: Record<string, unknown> = { ...params };
      if (!payload.target_growspace_id) delete payload.target_growspace_id;

      await this.callService(DOMAIN, SERVICES.TAKE_CLONE, payload);
      console.log('[PlantAPI:takeClone] Service Called');
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
    console.log('[PlantAPI:moveClone] Moving clone:', plantId, 'to', targetGrowspaceId);
    try {
      const payload: Record<string, string> = {
        plant_id: plantId,
        target_growspace_id: targetGrowspaceId,
      };
      if (transitionDate) {
        payload.transition_date = transitionDate;
      }

      await this.callService(DOMAIN, SERVICES.MOVE_CLONE, payload);
      console.log('[PlantAPI:moveClone] Service Called');
    } catch (err) {
      console.error('[PlantAPI:moveClone] Error:', err);
      throw err;
    }
  }

  async swapPlants(plant1Id: string, plant2Id: string): Promise<void> {
    console.log(`[PlantAPI:swapPlants] Swapping plants: ${plant1Id} and ${plant2Id}`);
    try {
      await this.callService(DOMAIN, SERVICES.SWITCH_PLANTS, {
        plant1_id: plant1Id,
        plant2_id: plant2Id,
      });
      console.log('[PlantAPI:swapPlants] Service Called');
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
    console.log(
      '[PlantAPI:waterPlant] Watering plant:',
      plantId,
      'amount:',
      amount,
      'preset:',
      presetId
    );
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
      console.log('[PlantAPI:waterPlant] Service Called');
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
    console.log('[PlantAPI:printLabel] Printing label:', params.plant_id || params.strain);
    try {
      return await this.callService(DOMAIN, SERVICES.PRINT_LABEL, params);
    } catch (err) {
      console.error('[PlantAPI:printLabel] Error:', err);
      throw err;
    }
  }
}
