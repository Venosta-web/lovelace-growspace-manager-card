import { HomeAssistant } from 'custom-card-helpers';
import { PlantEntity, GrowspaceDevice, GrowspaceType, createGrowspaceDevice } from './types';

export class DataService {
  constructor(private hass: HomeAssistant) {}

  getGrowspaceDevices(): GrowspaceDevice[] {
    if (!this.hass) return [];
    
    const allStates = Object.values(this.hass.states);
    const overviewSensors = allStates.filter((entity: any) => 
      entity.entity_id.endsWith('_overview')
    );

    // Initialize device groups with overview sensors (includes empty growspaces)
    const deviceGroups = new Map<string, PlantEntity[]>();
    overviewSensors.forEach((ov: any) => {
      const gid = ov.attributes?.growspace_id ?? ov.entity_id;
      deviceGroups.set(gid, []);
    });

    // Collect plants and group by growspace
    allStates.forEach((entity: any) => {
      if (entity.attributes?.row !== undefined && entity.attributes?.col !== undefined) {
        const growspaceId = this.getGrowspaceId(entity, overviewSensors);
        
        if (!deviceGroups.has(growspaceId)) {
          deviceGroups.set(growspaceId, []);
        }
        deviceGroups.get(growspaceId)!.push(entity as PlantEntity);
      }
    });

    // Build devices array
    return Array.from(deviceGroups.entries()).map(([growspaceId, plants]) => {
      const overview = overviewSensors.find(ov => 
        ov.attributes?.growspace_id === growspaceId
      );

      const name = overview?.attributes?.friendly_name || `Growspace ${growspaceId}`;

      // Infer type from attributes or name
      const type: GrowspaceType =
        (overview?.attributes?.type as GrowspaceType) ??
        (name.toLowerCase().includes("dry") ? "dry" :
         name.toLowerCase().includes("cure") ? "cure" : "normal");

      return createGrowspaceDevice({
        device_id: growspaceId,
        name,
        plants,
        rows: overview?.attributes?.rows ?? 3,
        plants_per_row: overview?.attributes?.plants_per_row ?? 3,
        type, // optional in helper, but passed explicitly here
      });
    });
  }
  
  private getGrowspaceId(entity: any, overviewSensors: any[]): string {
    return entity.attributes?.growspace_id ||
      overviewSensors.find(ov => 
        ov.entity_id.startsWith(entity.entity_id.split('_')[0])
      )?.attributes?.growspace_id ||
      'unknown';
  }

  getStrainLibrary(): string[] {
    const strainSensor = Object.values(this.hass.states).find(s => 
      s.entity_id.endsWith('_strain_library')
    );
    return strainSensor?.attributes?.strains || [];
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
    dry_start?: string;
    cure_start?: string;
  }) {
    return this.hass.callService('growspace_manager', 'add_plant', params);
  }
  
  async updatePlant(params: { plant_id: string; [key: string]: any }) {
    return this.hass.callService('growspace_manager', 'update_plant', params);
  }

  async removePlant(plantId: string) {
    return this.hass.callService('growspace_manager', 'remove_plant', { plant_id: plantId });
  }
  getPlantInternalId(entity: PlantEntity): string | null {
    // The internal plant_id should be stored in attributes
     return entity.entity_id;
  }

  async harvestPlant(plantId: string, GrowspaceType: string = 'dry') {
    return this.hass.callService('growspace_manager', 'harvest_plant', {
      plant_id: plantId,
      target_growspace_name: GrowspaceType,
    });
  }

  async importStrainLibrary(strains: string[], replace: boolean = true) {
    return this.hass.callService('growspace_manager', 'import_strain_library', {
      strains,
      replace
    });
  }

  async clearStrainLibrary() {
    return this.hass.callService('growspace_manager', 'clear_strain_library', {});
  }
}