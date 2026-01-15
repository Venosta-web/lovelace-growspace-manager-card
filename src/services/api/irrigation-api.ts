import { BaseAPI } from '../base-api';
import { DOMAIN, SERVICES } from '../../constants';
import { IrrigationStrategy } from '../../types';

/**
 * API service for irrigation control operations.
 * Handles irrigation settings, scheduling, and strategy configuration.
 */
export class IrrigationAPI extends BaseAPI {
    async setIrrigationSettings(params: {
        growspace_id: string;
        irrigation_pump_entity: string;
        drain_pump_entity: string;
        irrigation_duration: number;
        drain_duration: number;
    }): Promise<void> {
        console.log('[IrrigationAPI:setIrrigationSettings] Setting irrigation settings:', params);
        try {
            await this.callService(DOMAIN, SERVICES.SET_IRRIGATION_SETTINGS, params);
            console.log('[IrrigationAPI:setIrrigationSettings] Service Called');
        } catch (err) {
            console.error('[IrrigationAPI:setIrrigationSettings] Error:', err);
            throw err;
        }
    }

    async addIrrigationTime(params: {
        growspace_id: string;
        time: string;
        duration?: number;
    }): Promise<void> {
        console.log('[IrrigationAPI:addIrrigationTime] Adding irrigation time:', params);
        try {
            await this.callService(DOMAIN, SERVICES.ADD_IRRIGATION_TIME, params);
            console.log('[IrrigationAPI:addIrrigationTime] Service Called');
        } catch (err) {
            console.error('[IrrigationAPI:addIrrigationTime] Error:', err);
            throw err;
        }
    }

    async removeIrrigationTime(params: { growspace_id: string; time: string }): Promise<void> {
        console.log('[IrrigationAPI:removeIrrigationTime] Removing irrigation time:', params);
        try {
            await this.callService(DOMAIN, SERVICES.REMOVE_IRRIGATION_TIME, params);
            console.log('[IrrigationAPI:removeIrrigationTime] Service Called');
        } catch (err) {
            console.error('[IrrigationAPI:removeIrrigationTime] Error:', err);
            throw err;
        }
    }

    async addDrainTime(params: {
        growspace_id: string;
        time: string;
        duration?: number;
    }): Promise<void> {
        console.log('[IrrigationAPI:addDrainTime] Adding drain time:', params);
        try {
            await this.callService(DOMAIN, SERVICES.ADD_DRAIN_TIME, params);
            console.log('[IrrigationAPI:addDrainTime] Service Called');
        } catch (err) {
            console.error('[IrrigationAPI:addDrainTime] Error:', err);
            throw err;
        }
    }

    async removeDrainTime(params: { growspace_id: string; time: string }): Promise<void> {
        console.log('[IrrigationAPI:removeDrainTime] Removing drain time:', params);
        try {
            await this.callService(DOMAIN, SERVICES.REMOVE_DRAIN_TIME, params);
            console.log('[IrrigationAPI:removeDrainTime] Service Called');
        } catch (err) {
            console.error('[IrrigationAPI:removeDrainTime] Error:', err);
            throw err;
        }
    }

    async setIrrigationStrategy(
        growspaceId: string,
        strategy: Partial<IrrigationStrategy>
    ): Promise<void> {
        console.log('[IrrigationAPI:setIrrigationStrategy] Setting strategy:', strategy);
        try {
            await this.callService(DOMAIN, SERVICES.SET_IRRIGATION_STRATEGY, {
                growspace_id: growspaceId,
                ...strategy,
            });
            console.log('[IrrigationAPI:setIrrigationStrategy] Service Called');
        } catch (err) {
            console.error('[IrrigationAPI:setIrrigationStrategy] Error:', err);
            throw err;
        }
    }

    async waterGrowspace(
        growspaceId: string,
        amountPerPlant: number,
        nutrients?: Record<string, number>,
        presetId?: string
    ): Promise<void> {
        console.log(
            '[IrrigationAPI:waterGrowspace] Watering growspace:',
            growspaceId,
            'amount per plant:',
            amountPerPlant,
            'preset:',
            presetId
        );
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
            await this.callService(DOMAIN, SERVICES.WATER_GROWSPACE, payload);
            console.log('[IrrigationAPI:waterGrowspace] Service Called');
        } catch (err) {
            console.error('[IrrigationAPI:waterGrowspace] Error:', err);
            throw err;
        }
    }
}
