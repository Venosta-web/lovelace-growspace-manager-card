import { HassEntity } from 'home-assistant-js-websocket';
import { GrowspaceDevice, GrowspaceType, PlantEntity, createGrowspaceDevice, PlantStage, GrowspaceWebSocketData, RawPlantData, RawGrowspaceAttributes, IrrigationTime, IrrigationStrategy } from '../types';

export interface GrowspaceOverviewEntity extends HassEntity {
    attributes: RawGrowspaceAttributes;
}

export class GrowspaceAdapter {
    static transformGrowspace(overview: GrowspaceOverviewEntity, wsData: GrowspaceWebSocketData | null = null): GrowspaceDevice {
        const attributes = overview.attributes;
        const growspaceId = attributes.growspace_id;

        const name = attributes.friendly_name || `Growspace ${growspaceId}`;

        const type: GrowspaceType =
            (attributes.type as GrowspaceType) ??
            (name.toLowerCase().includes('dry') ? 'dry' :
                name.toLowerCase().includes('cure') ? 'cure' : 'normal');

        // Prefer WS data for grid, fallback to attributes.grid (legacy/fallback)
        const grid = wsData?.grid || attributes.grid || {};
        const plants: PlantEntity[] = [];

        Object.entries(grid).forEach(([key, slot]: [string, any]) => {
            if (slot) {
                const entityId = `sensor.${slot.strain.toLowerCase().replace(/ /g, '_')}_${slot.phenotype.replace(/#/g, '').toLowerCase()}`;

                // Extract row/col from key "position_R_C"
                let row: number | undefined;
                let col: number | undefined;
                const parts = key.split('_');
                if (parts.length === 3) {
                    row = parseInt(parts[1]);
                    col = parseInt(parts[2]);
                }

                plants.push({
                    entity_id: entityId,
                    state: (slot.stage as PlantStage) || 'unknown',
                    attributes: {
                        ...slot,
                        growspace_id: growspaceId,
                        friendly_name: `${slot.strain} ${slot.phenotype}`,
                        stage: slot.stage as PlantStage,
                        row,
                        col
                    }
                });
            }
        });

        // Extract enhanced metrics from WS data or attributes
        const bioMetrics = wsData ? {
            vpd_status: wsData.vpd_status,
            vpd_target_min: wsData.vpd_target_min,
            vpd_target_max: wsData.vpd_target_max,
            vpd_danger_min: wsData.vpd_danger_min,
            vpd_danger_max: wsData.vpd_danger_max,
            granular_stage: wsData.granular_stage,
            is_day: wsData.is_day,
            veg_week: wsData.veg_week,
            flower_week: wsData.flower_week,
        } : {
            // Fallback to attributes if WS failed or not used (though we removed them from backend)
            vpd_status: attributes.vpd_status,
            vpd_target_min: attributes.vpd_target_min,
            vpd_target_max: attributes.vpd_target_max,
            granular_stage: attributes.granular_stage,
            is_day: attributes.is_day
        };

        const rawIrrigation = wsData?.irrigation_times || attributes.irrigation_times || [];
        const irrigationTimes: IrrigationTime[] = Array.isArray(rawIrrigation)
            ? rawIrrigation.map((t: any) => typeof t === 'string' ? { time: t } : t)
            : [];

        const rawDrain = wsData?.drain_times || attributes.drain_times || [];
        const drainTimes: IrrigationTime[] = Array.isArray(rawDrain)
            ? rawDrain.map((t: any) => typeof t === 'string' ? { time: t } : t)
            : [];

        // Environment attributes
        const envAttrs = wsData ? {
            temperature_sensor: wsData.temperature_sensor,
            humidity_sensor: wsData.humidity_sensor,
            vpd_sensor: wsData.vpd_sensor,
            co2_sensor: wsData.co2_sensor,
            dehumidifier_entity: wsData.dehumidifier_entity,
            humidifier_entity: wsData.humidifier_entity,
            exhaust_entity: wsData.exhaust_entity,
            exhaust_sensor: wsData.exhaust_sensor,
            humidifier_sensor: wsData.humidifier_sensor,
            dehumidifier_control_enabled: wsData.dehumidifier_control_enabled
        } : {
            // Fallback
            temperature_sensor: attributes.temperature_sensor,
            humidity_sensor: attributes.humidity_sensor,
            vpd_sensor: attributes.vpd_sensor,
            co2_sensor: attributes.co2_sensor,
            light_sensor: attributes.light_sensor,
            exhaust_entity: attributes.exhaust_entity,
            exhaust_sensor: attributes.exhaust_sensor,
            humidifier_entity: attributes.humidifier_entity,
            humidifier_sensor: attributes.humidifier_sensor,
            dehumidifier_entity: attributes.dehumidifier_entity,
            dehumidifier_control_enabled: attributes.dehumidifier_control_enabled
        };

        const irrigationConfig = wsData ? wsData.irrigation_config : {
            irrigation_pump_entity: attributes.irrigation_pump_entity,
            drain_pump_entity: attributes.drain_pump_entity,
            irrigation_duration: attributes.irrigation_duration,
            drain_duration: attributes.drain_duration
        };
        const irrigationStrategy = wsData ? wsData.irrigation_strategy : attributes.irrigation_strategy;

        return createGrowspaceDevice({
            device_id: growspaceId,
            overview_entity_id: overview.entity_id,
            name,
            plants,
            rows: attributes.rows ?? 3,
            plants_per_row: attributes.plants_per_row ?? 3,
            type,
            last_updated: overview.last_updated,
            biological_metrics: bioMetrics,
            irrigation_times: irrigationTimes,
            drain_times: drainTimes,
            irrigation_config: irrigationConfig,
            irrigation_strategy: irrigationStrategy,
            environment_attributes: envAttrs
        });
    }

    static transformToDevices(allStates: HassEntity[]): GrowspaceDevice[] {
        // Legacy method - might be unused after refactor, but kept for safety if needed
        // Assuming no WS data available here, so grid comes from attributes (which might be empty now)
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

        return overviewSensors.map(overview => this.transformGrowspace(overview, null));
    }
}
