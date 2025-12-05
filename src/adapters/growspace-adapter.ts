import { HassEntity } from 'home-assistant-js-websocket';
import { GrowspaceDevice, GrowspaceType, PlantEntity, createGrowspaceDevice, PlantStage } from '../types';

export interface RawPlantData {
    strain: string;
    phenotype: string;
    stage?: string;
    [key: string]: any;
}

export interface RawGrowspaceAttributes {
    growspace_id: string;
    rows: number;
    plants_per_row: number;
    friendly_name?: string;
    type?: string;
    grid?: Record<string, RawPlantData | null>;
    row?: undefined; // Explicitly ensure these are undefined for overview sensors
    col?: undefined;
    [key: string]: any;
}

export interface GrowspaceOverviewEntity extends HassEntity {
    attributes: RawGrowspaceAttributes;
}

export class GrowspaceAdapter {
    static transformToDevices(allStates: HassEntity[]): GrowspaceDevice[] {
        // Identify overview sensors by their attributes
        const overviewSensors = allStates.filter((entity): entity is GrowspaceOverviewEntity => {
            const attrs = entity.attributes;
            return (
                entity.entity_id.startsWith('sensor.') &&
                attrs.growspace_id !== undefined &&
                attrs.rows !== undefined &&
                attrs.plants_per_row !== undefined &&
                attrs.row === undefined &&
                attrs.col === undefined
            );
        });

        // We can map directly from the identified overview sensors, as they represent the growspaces.
        // The previous logic created a map first, but since we are iterating overviewSensors to find them again,
        // we can just iterate them directly.

        return overviewSensors.map(overview => {
            const attributes = overview.attributes;
            const growspaceId = attributes.growspace_id;

            const name = attributes.friendly_name || `Growspace ${growspaceId}`;

            const type: GrowspaceType =
                (attributes.type as GrowspaceType) ??
                (name.toLowerCase().includes('dry') ? 'dry' :
                    name.toLowerCase().includes('cure') ? 'cure' : 'normal');

            // Reconstruct plant entities from grid
            const plants: PlantEntity[] = [];
            const grid = attributes.grid || {};

            Object.values(grid).forEach((slot) => {
                if (slot) {
                    // Create a synthetic entity ID since individual plant entities are gone
                    // Note: The replace regexes were moved from the original code
                    const entityId = `sensor.${slot.strain.toLowerCase().replace(/ /g, '_')}_${slot.phenotype.replace(/#/g, '').toLowerCase()}`;

                    plants.push({
                        entity_id: entityId,
                        state: (slot.stage as PlantStage) || 'unknown',
                        attributes: {
                            ...slot,
                            growspace_id: growspaceId,
                            friendly_name: `${slot.strain} ${slot.phenotype}`,
                            stage: slot.stage as PlantStage
                        }
                    });
                }
            });

            return createGrowspaceDevice({
                device_id: growspaceId,
                overview_entity_id: overview.entity_id,
                name,
                plants,
                rows: attributes.rows ?? 3,
                plants_per_row: attributes.plants_per_row ?? 3,
                type,
            });
        });
    }
}
