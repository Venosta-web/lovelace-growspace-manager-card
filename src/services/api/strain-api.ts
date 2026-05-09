import { BaseAPI } from '../base-api';
import { StrainEntry, CropMeta } from '../../types';
import { DOMAIN, SERVICES } from '../../constants';
import {
  StrainLibraryWrapperSchema,
  StrainLibrarySchema,
  StrainLibrary,
} from '../../schemas/api-schema';
import { HassEntity } from 'home-assistant-js-websocket';

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
    breeder_logo?: string;
    type?: string;
    lineage?: string;
    sex?: string;
    sativa_percentage?: number;
    indica_percentage?: number;
  };
  phenotypes?: Record<string, RawPhenotypeData>;
}

/**
 * API service for strain library operations.
 * Handles fetching, adding, removing, importing, and exporting strains.
 */
export class StrainAPI extends BaseAPI {
  getStrainLibrary(): StrainEntry[] {
    const knownIds = ['sensor.strain_library', 'sensor.growspace_manager_strain_library'];
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

    // If no sensor data, return empty
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

      for (const [strainName, strainData] of Object.entries(rawStrains) as [
        string,
        RawStrainData,
      ][]) {
        const meta = strainData.meta ?? {};
        const phenotypes = strainData.phenotypes ?? {};

        Object.entries(phenotypes).forEach(([phenoName, phenoData]) => {
          const typedPhenoData = phenoData as RawPhenotypeData;
          results.push({
            strain: strainName,
            phenotype: phenoName,
            key: `${strainName}|${phenoName}`,
            breeder: meta.breeder,
            breeder_logo: meta.breeder_logo,
            type: meta.type,
            lineage: meta.lineage,
            sex: meta.sex,
            sativa_percentage: meta.sativa_percentage,
            indica_percentage: meta.indica_percentage,
            description: typedPhenoData.description,
            image: typedPhenoData.image_path,
            image_crop_meta: typedPhenoData.image_crop_meta,
            flowering_days_min: typedPhenoData.flower_days_min,
            flowering_days_max: typedPhenoData.flower_days_max,
          });
        });
      }

      return results.sort((a, b) => {
        const strainComp = a.strain.localeCompare(b.strain);
        if (strainComp !== 0) return strainComp;
        return a.phenotype.localeCompare(b.phenotype);
      });
    }

    return [];
  }

  async fetchStrainLibrary(): Promise<StrainEntry[]> {
    console.log('[StrainAPI:fetchStrainLibrary] Fetching strain library via WebSocket API');
    try {
      // Use WebSocket API to bypass the 16KB attribute limit of state machine
      const rawResponse = await this.hass.connection.sendMessagePromise<unknown>({
        type: 'growspace_manager/get_strain_library',
      });

      console.log('[StrainAPI:fetchStrainLibrary] WS Response:', rawResponse);

      // Remove legacy or wrapper 'response' key if present
      if (rawResponse && typeof rawResponse === 'object' && 'response' in rawResponse) {
        delete (rawResponse as Record<string, unknown>).response;
      }

      const parsed = StrainLibraryWrapperSchema.safeParse(rawResponse);

      let rawStrains: StrainLibrary = {};

      if (parsed.success) {
        rawStrains = parsed.data.strains;
      } else {
        // Fallback for backward compatibility
        const legacyParsed = StrainLibrarySchema.safeParse(rawResponse);
        if (legacyParsed.success) {
          rawStrains = legacyParsed.data;
        } else {
          console.warn(
            '[StrainAPI:fetchStrainLibrary] API Verification warning:',
            parsed.error.format()
          );
          return [];
        }
      }

      const currentStrains: StrainEntry[] = [];

      Object.entries(rawStrains).forEach(([strainName, data]) => {
        if (strainName === 'response') return;
        let meta = data.meta;
        if (!meta) {
          meta = {};
        }

        let phenotypes = data.phenotypes;
        if (!phenotypes) {
          phenotypes = {};
        }

        Object.entries(phenotypes).forEach(([phenoName, phenoData]) => {
          const typedPhenoData = phenoData as RawPhenotypeData;
          currentStrains.push({
            strain: strainName,
            phenotype: phenoName,
            key: `${strainName}|${phenoName}`,
            breeder: meta.breeder,
            breeder_logo: meta.breeder_logo,
            type: meta.type,
            lineage: meta.lineage,
            sex: meta.sex,
            sativa_percentage: meta.sativa_percentage,
            indica_percentage: meta.indica_percentage,
            description: typedPhenoData.description,
            image: typedPhenoData.image_path,
            image_crop_meta: typedPhenoData.image_crop_meta,
            flowering_days_min: typedPhenoData.flower_days_min,
            flowering_days_max: typedPhenoData.flower_days_max,
          });
        });
      });

      return currentStrains;
    } catch (e) {
      console.error('Failed to fetch strain library for grid:', e);
      return [];
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
    breeder_logo?: string;
  }): Promise<void> {
    console.log('[StrainAPI:addStrain] Adding strain:', data);
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

      await this.callService(DOMAIN, SERVICES.ADD_STRAIN, payload);
      console.log('[StrainAPI:addStrain] Service Called');
    } catch (err) {
      console.error('[StrainAPI:addStrain] Error:', err);
      throw err;
    }
  }

  async removeStrain(strain: string, phenotype?: string): Promise<void> {
    console.log('[StrainAPI:removeStrain] Removing strain:', strain, phenotype);
    try {
      await this.callService(DOMAIN, SERVICES.REMOVE_STRAIN, {
        strain,
        phenotype,
      });
      console.log('[StrainAPI:removeStrain] Service Called');
    } catch (err) {
      console.error('[StrainAPI:removeStrain] Error:', err);
      throw err;
    }
  }

  async exportStrainLibrary(): Promise<void> {
    console.log('[StrainAPI:exportStrainLibrary] Exporting strain library');
    try {
      await this.callService(DOMAIN, SERVICES.EXPORT_STRAIN_LIBRARY, {});
      console.log('[StrainAPI:exportStrainLibrary] Service Called');
    } catch (err) {
      console.error('[StrainAPI:exportStrainLibrary] Error:', err);
      throw err;
    }
  }

  async importStrainLibrary(
    file: File,
    replace: boolean
  ): Promise<{ success: boolean; error?: string }> {
    console.log(
      '[StrainAPI:importStrainLibrary] Importing strain library ZIP via HTTP. Replace:',
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
      console.log('[StrainAPI:importStrainLibrary] Response:', result);

      if (result.success) {
        return result as { success: boolean; error?: string };
      } else {
        throw new Error(result.error || 'Unknown import error');
      }
    } catch (err: unknown) {
      console.error('[StrainAPI:importStrainLibrary] Error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to import strain library';
      throw new Error(msg);
    }
  }

  async clearStrainLibrary(): Promise<void> {
    console.log('[StrainAPI:clearStrainLibrary] Clearing library');
    try {
      await this.callService(DOMAIN, SERVICES.CLEAR_STRAIN_LIBRARY, {});
      console.log('[StrainAPI:clearStrainLibrary] Service Called');
    } catch (err) {
      console.error('[StrainAPI:clearStrainLibrary] Error:', err);
      throw err;
    }
  }

  async updateBreeder(oldName: string, newName: string, logo?: string): Promise<void> {
    console.log('[StrainAPI:updateBreeder] Updating breeder:', oldName, '->', newName);
    try {
      await this.hass.connection.sendMessagePromise({
        type: 'growspace_manager/update_breeder',
        original_name: oldName,
        new_name: newName,
        logo: logo !== undefined ? logo : undefined,
      });
      console.log('[StrainAPI:updateBreeder] WebSocket call completed');
    } catch (err) {
      console.error('[StrainAPI:updateBreeder] Error:', err);
      throw err;
    }
  }

  async deleteBreeder(name: string): Promise<void> {
    console.log('[StrainAPI:deleteBreeder] Deleting breeder:', name);
    try {
      await this.hass.connection.sendMessagePromise({
        type: 'growspace_manager/delete_breeder',
        breeder_name: name,
      });
      console.log('[StrainAPI:deleteBreeder] WebSocket call completed');
    } catch (err) {
      console.error('[StrainAPI:deleteBreeder] Error:', err);
      throw err;
    }
  }

  async updateStrainMeta(data: {
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
    breeder_logo?: string;
    yield_potential?: string;
    height?: string;
    thc?: number;
    awards?: string[];
    lineage_tree?: any;
  }): Promise<void> {
    console.log('[StrainAPI:updateStrainMeta] Updating strain:', data);
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
          payload.image_base64 = data.image;
          delete payload.image;
        } else {
          delete payload.image; // Assume unchanged file path
        }
      }

      await this.callService(DOMAIN, SERVICES.UPDATE_STRAIN_META, payload);
      console.log('[StrainAPI:updateStrainMeta] Service Called');
    } catch (err) {
      console.error('[StrainAPI:updateStrainMeta] Error:', err);
      throw err;
    }
  }
}
