import { BaseAPI } from '../base-api';
import type { Subarea, EnvironmentConfig } from '../types';
import {
  WS_TYPE_GET_SUBAREAS,
  WS_TYPE_ADD_SUBAREA,
  WS_TYPE_UPDATE_SUBAREA,
  WS_TYPE_REMOVE_SUBAREA,
} from '../../lib/constants';

export class SubareaAPI extends BaseAPI {
  /**
   * Fetches all subareas for a growspace.
   */
  async getSubareas(growspaceId: string): Promise<Subarea[]> {
    if (!this.hass) return [];

    try {
      const response = await this.hass.connection.sendMessagePromise<Subarea[]>({
        type: WS_TYPE_GET_SUBAREAS,
        growspace_id: growspaceId,
      });
      return response;
    } catch (error) {
      console.error(`[SubareaAPI] Failed to get subareas for ${growspaceId}:`, error);
      throw error;
    }
  }

  /**
   * Adds a new subarea to a growspace.
   */
  async addSubarea(growspaceId: string, name: string): Promise<Subarea> {
    if (!this.hass) throw new Error('[SubareaAPI] Hass instance is missing');

    try {
      const response = await this.hass.connection.sendMessagePromise<Subarea>({
        type: WS_TYPE_ADD_SUBAREA,
        growspace_id: growspaceId,
        name,
      });
      return response;
    } catch (error) {
      console.error(`[SubareaAPI] Failed to add subarea to ${growspaceId}:`, error);
      throw error;
    }
  }

  /**
   * Updates the environment config of an existing subarea.
   */
  async updateSubarea(
    growspaceId: string,
    subareaId: string,
    environmentConfig: Partial<EnvironmentConfig>
  ): Promise<Subarea> {
    if (!this.hass) throw new Error('[SubareaAPI] Hass instance is missing');

    try {
      const response = await this.hass.connection.sendMessagePromise<Subarea>({
        type: WS_TYPE_UPDATE_SUBAREA,
        growspace_id: growspaceId,
        subarea_id: subareaId,
        environment_config: environmentConfig,
      });
      return response;
    } catch (error) {
      console.error(`[SubareaAPI] Failed to update subarea ${subareaId}:`, error);
      throw error;
    }
  }

  /**
   * Removes a subarea from a growspace.
   */
  async removeSubarea(growspaceId: string, subareaId: string): Promise<void> {
    if (!this.hass) throw new Error('[SubareaAPI] Hass instance is missing');

    try {
      await this.hass.connection.sendMessagePromise<void>({
        type: WS_TYPE_REMOVE_SUBAREA,
        growspace_id: growspaceId,
        subarea_id: subareaId,
      });
    } catch (error) {
      console.error(`[SubareaAPI] Failed to remove subarea ${subareaId}:`, error);
      throw error;
    }
  }
}
