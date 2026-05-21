import { BaseAPI } from '../base-api';
import {
  DOMAIN,
  SERVICES,
  WS_TYPE_GET_NUTRIENT_PRESETS,
  WS_TYPE_GET_IPM_PRESETS,
  WS_TYPE_GET_NUTRIENT_INVENTORY,
  WS_TYPE_UPDATE_NUTRIENT_STOCK,
  WS_TYPE_REMOVE_NUTRIENT_STOCK,
  WS_TYPE_GET_EC_RAMP_CURVES,
} from '../../constants';
import {
  NutrientPresetsSchema,
  IPMPresetsSchema,
  NutrientInventorySchema,
  NutrientPresetsResponse,
  IPMPresetsResponse,
  NutrientInventoryResponse,
  ECRampCurvesResponse,
  ECRampCurvesSchema,
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
    try {
      await this.callService(DOMAIN, SERVICES.SAVE_NUTRIENT_PRESET, data);
    } catch (err) {
      console.error('[NutrientAPI:saveNutrientPreset] Error:', err);
      throw err;
    }
  }

  async removeNutrientPreset(presetId: string): Promise<void> {
    try {
      await this.callService(DOMAIN, SERVICES.REMOVE_NUTRIENT_PRESET, { preset_id: presetId });
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
    try {
      await this.callService(DOMAIN, SERVICES.SAVE_IPM_PRESET, data);
    } catch (err) {
      console.error('[NutrientAPI:saveIPMPreset] Error:', err);
      throw err;
    }
  }

  async removeIPMPreset(presetId: string): Promise<void> {
    try {
      await this.callService(DOMAIN, SERVICES.REMOVE_IPM_PRESET, { preset_id: presetId });
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
    try {
      await this.callService(DOMAIN, SERVICES.APPLY_IPM, data);
    } catch (err) {
      console.error('[NutrientAPI:applyIPM] Error:', err);
      throw err;
    }
  }

  async fetchECRampCurves(): Promise<ECRampCurvesResponse | null> {
    if (!this.hass) return null;
    try {
      const result = await this.hass.connection.sendMessagePromise<unknown>({
        type: WS_TYPE_GET_EC_RAMP_CURVES,
      });

      const parsed = ECRampCurvesSchema.safeParse(result);
      if (!parsed.success) {
        console.error('[NutrientAPI] EC Ramp Curves Validation Failed:', parsed.error.format());
        return result as ECRampCurvesResponse;
      }
      return parsed.data;
    } catch (err) {
      console.error('[NutrientAPI:fetchECRampCurves] Error:', err);
      return null;
    }
  }

  async saveECRampCurve(data: {
    curve_id?: string;
    name: string;
    stage?: string;
    points: { day: number; target_ec: number }[];
  }): Promise<void> {

    // Transform points to backend format
    const backendData = {
      curve_id: data.curve_id,
      name: data.name,
      stage: data.stage || 'flower',
      points: data.points.map(p => ({
        week: Math.floor((p.day - 1) / 7) + 1,
        ec_min: p.target_ec,
        ec_max: p.target_ec + 0.4
      }))
    };

    try {
      await this.callService(DOMAIN, 'save_ec_ramp_curve', backendData);
    } catch (err) {
      console.error('[NutrientAPI:saveECRampCurve] Error:', err);
      throw err;
    }
  }

  async removeECRampCurve(curveId: string): Promise<void> {
    try {
      await this.callService(DOMAIN, 'remove_ec_ramp_curve', { curve_id: curveId });
    } catch (err) {
      console.error('[NutrientAPI:removeECRampCurve] Error:', err);
      throw err;
    }
  }
}
