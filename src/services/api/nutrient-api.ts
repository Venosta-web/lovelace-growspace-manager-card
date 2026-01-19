import { BaseAPI } from '../base-api';
import {
  DOMAIN,
  SERVICES,
  WS_TYPE_GET_NUTRIENT_PRESETS,
  WS_TYPE_GET_IPM_PRESETS,
  WS_TYPE_GET_NUTRIENT_INVENTORY,
  WS_TYPE_UPDATE_NUTRIENT_STOCK,
  WS_TYPE_REMOVE_NUTRIENT_STOCK,
} from '../../constants';
import {
  NutrientPresetsSchema,
  IPMPresetsSchema,
  NutrientInventorySchema,
  NutrientPresetsResponse,
  IPMPresetsResponse,
  NutrientInventoryResponse,
} from '../../schemas/api-schema';

/**
 * API service for nutrient and IPM operations.
 * Handles nutrient presets, inventory, IPM presets, and application.
 */
export class NutrientAPI extends BaseAPI {
  async fetchNutrientPresets(): Promise<NutrientPresetsResponse | null> {
    if (!this.hass) return null;
    try {
      const result = await this.hass.connection.sendMessagePromise<unknown>({
        type: WS_TYPE_GET_NUTRIENT_PRESETS,
      });

      const parsed = NutrientPresetsSchema.safeParse(result);
      if (!parsed.success) {
        console.error('[NutrientAPI] Nutrient Presets Validation Failed:', parsed.error.format());
        return result as NutrientPresetsResponse;
      }
      return parsed.data;
    } catch (err) {
      console.error('[NutrientAPI:fetchNutrientPresets] Error:', err);
      return null;
    }
  }

  async fetchNutrientInventory(): Promise<NutrientInventoryResponse | null> {
    if (!this.hass) return null;
    try {
      const result = await this.hass.connection.sendMessagePromise<unknown>({
        type: WS_TYPE_GET_NUTRIENT_INVENTORY,
      });

      const parsed = NutrientInventorySchema.safeParse(result);
      if (!parsed.success) {
        console.error('[NutrientAPI] Nutrient Inventory Validation Failed:', parsed.error.format());
        return result as NutrientInventoryResponse;
      }
      return parsed.data;
    } catch (err) {
      console.error('[NutrientAPI:fetchNutrientInventory] Error:', err);
      return null;
    }
  }

  async updateNutrientStock(
    nutrientId: string,
    name: string,
    currentMl: number,
    initialMl: number
  ): Promise<void> {
    if (!this.hass) return;
    try {
      await this.hass.connection.sendMessagePromise<void>({
        type: WS_TYPE_UPDATE_NUTRIENT_STOCK,
        nutrient_id: nutrientId,
        name,
        current_ml: currentMl,
        initial_ml: initialMl,
      });
      console.log(`[NutrientAPI] Updated stock: ${name}`);
    } catch (err) {
      console.error('[NutrientAPI:updateNutrientStock] Error:', err);
      throw err;
    }
  }

  async removeNutrientStock(nutrientId: string): Promise<void> {
    if (!this.hass) return;
    try {
      await this.hass.connection.sendMessagePromise<void>({
        type: WS_TYPE_REMOVE_NUTRIENT_STOCK,
        nutrient_id: nutrientId,
      });
      console.log(`[NutrientAPI] Removed stock: ${nutrientId}`);
    } catch (err) {
      console.error('[NutrientAPI:removeNutrientStock] Error:', err);
      throw err;
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
        console.error('[NutrientAPI] IPM Presets Validation Failed:', parsed.error.format());
        return result as IPMPresetsResponse;
      }
      return parsed.data;
    } catch (err) {
      console.error('[NutrientAPI:fetchIPMPresets] Error:', err);
      return null;
    }
  }

  async saveNutrientPreset(data: {
    preset_id?: string;
    name: string;
    nutrients: { name: string; dose_ml_l: number }[];
    stage?: string;
    min_days_in_stage?: number;
  }): Promise<void> {
    console.log('[NutrientAPI:saveNutrientPreset] Saving nutrient preset:', data);
    try {
      await this.callService(DOMAIN, SERVICES.SAVE_NUTRIENT_PRESET, data);
      console.log('[NutrientAPI:saveNutrientPreset] Service Called');
    } catch (err) {
      console.error('[NutrientAPI:saveNutrientPreset] Error:', err);
      throw err;
    }
  }

  async removeNutrientPreset(presetId: string): Promise<void> {
    console.log('[NutrientAPI:removeNutrientPreset] Removing nutrient preset:', presetId);
    try {
      await this.callService(DOMAIN, SERVICES.REMOVE_NUTRIENT_PRESET, { preset_id: presetId });
      console.log('[NutrientAPI:removeNutrientPreset] Service Called');
    } catch (err) {
      console.error('[NutrientAPI:removeNutrientPreset] Error:', err);
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
    console.log('[NutrientAPI:saveIPMPreset] Saving IPM preset:', data);
    try {
      await this.callService(DOMAIN, SERVICES.SAVE_IPM_PRESET, data);
      console.log('[NutrientAPI:saveIPMPreset] Service Called');
    } catch (err) {
      console.error('[NutrientAPI:saveIPMPreset] Error:', err);
      throw err;
    }
  }

  async removeIPMPreset(presetId: string): Promise<void> {
    console.log('[NutrientAPI:removeIPMPreset] Removing IPM preset:', presetId);
    try {
      await this.callService(DOMAIN, SERVICES.REMOVE_IPM_PRESET, { preset_id: presetId });
      console.log('[NutrientAPI:removeIPMPreset] Service Called');
    } catch (err) {
      console.error('[NutrientAPI:removeIPMPreset] Error:', err);
      throw err;
    }
  }

  async applyIPM(data: {
    preset_id: string;
    growspace_id?: string;
    plant_ids?: string[];
    notes?: string;
  }): Promise<void> {
    console.log('[NutrientAPI:applyIPM] Applying IPM:', data);
    try {
      await this.callService(DOMAIN, SERVICES.APPLY_IPM, data);
      console.log('[NutrientAPI:applyIPM] Service Called');
    } catch (err) {
      console.error('[NutrientAPI:applyIPM] Error:', err);
      throw err;
    }
  }
}
