import { describe, it, expect } from 'vitest';
import { GrowspaceAdapter } from '../../../src/adapters/growspace-adapter';
import { GrowspaceAPIResponse, PlantStage } from '../../../src/types';

describe('GrowspaceAdapter', () => {
    const mockOverview: any = {
        entity_id: 'sensor.growspace_test_overview',
        attributes: {
            growspace_id: 'test_gs',
            friendly_name: 'Test Room',
            type: 'flower',
            rows: 2,
            plants_per_row: 2
        },
        last_updated: '2023-01-01T12:00:00Z'
    };

    it('should transform dictionary grid to flat plant array', () => {
        const mockWSData: GrowspaceAPIResponse = {
            growspace_id: 'test_gs',
            name: 'Test Room',
            type: 'normal',
            rows: 2,
            plants_per_row: 2,
            total_plants: 2,
            grid: {
                'position_0_0': {
                    plant_id: 'p1',
                    entity_id: 'sensor.p1',
                    strain: 'Kush',
                    phenotype: 'OG',
                    stage: 'veg',
                    row: 0,
                    col: 0,
                    position: '0-0',
                    seedling_days: 10,
                    mother_days: 0,
                    clone_days: 0,
                    veg_days: 20,
                    flower_days: 0,
                    dry_days: 0,
                    cure_days: 0,
                    seedling_start: '2023-01-01',
                    mother_start: null,
                    clone_start: null,
                    veg_start: '2023-01-11',
                    flower_start: null,
                    dry_start: null,
                    cure_start: null
                },
                'position_0_1': null // Empty slot
            },
            irrigation_config: { irrigation_times: [], drain_times: [] },
            irrigation_strategy: null,
            max_veg_days: 20,
            max_flower_days: 0,
            veg_week: 3,
            flower_week: 0,
            max_stage_summary: 'Veg W3',
            vpd_status: 'ok',
            vpd_target_min: 0.8,
            vpd_target_max: 1.2,
            vpd_danger_min: 0.4,
            vpd_danger_max: 1.6,
            granular_stage: 'early_veg',
            is_day: true,
            air_exchange: '100',
            environment_config: {
                temperature_sensor: 'sensor.temp',
                humidity_sensor: 'sensor.hum',
                vpd_sensor: 'sensor.vpd'
            }
        };

        const result = GrowspaceAdapter.transformGrowspace(mockOverview, mockWSData);

        expect(result).not.toBeNull();
        if (!result) return;

        expect(result.device_id).toBe('test_gs');
        // Verify Grid Transformation
        expect(result.plants).toHaveLength(1);
        expect(result.plants[0].attributes.strain).toBe('Kush');
        expect(result.plants[0].attributes.row).toBe(0);
        expect(result.plants[0].attributes.col).toBe(0);
        expect(result.plants[0].attributes.stage).toBe(PlantStage.VEG);

        // Verify Config Mapping
        expect(result.environment_attributes?.temperature_sensor).toBe('sensor.temp');
        expect(result.biological_metrics?.air_exchange).toBe('100');
    });

    it('should return skeleton when wsData is null', () => {
        const result = GrowspaceAdapter.transformGrowspace(mockOverview, null);
        expect(result).not.toBeNull();
        expect(result?.last_updated).toBe('Loading...');
        expect(result?.plants).toHaveLength(0);
    });


    it('should fallback to root environment attributes if config is missing', () => {
        const mockWSData: GrowspaceAPIResponse = {
            growspace_id: 'test_gs',
            name: 'Test Room',
            type: 'normal',
            rows: 2,
            plants_per_row: 2,
            total_plants: 0,
            grid: {},
            irrigation_config: { irrigation_times: [], drain_times: [] },
            irrigation_strategy: null,
            max_veg_days: 0,
            max_flower_days: 0,
            veg_week: 0,
            flower_week: 0,
            max_stage_summary: '',
            vpd_status: 'unknown',
            vpd_target_min: 0,
            vpd_target_max: 0,
            vpd_danger_min: 0,
            vpd_danger_max: 0,
            granular_stage: 'unknown',
            is_day: false,
            environment_config: {}, // Empty nested config
            // Root properties (Legacy/Flat)
            exhaust_entity: 'fan.exhaust',
            humidifier_entity: 'humidifier.mist'
        } as any;

        const result = GrowspaceAdapter.transformGrowspace(mockOverview, mockWSData);
        expect(result).not.toBeNull();
        expect(result?.environment_attributes?.exhaust_entity).toBe('fan.exhaust');
        expect(result?.environment_attributes?.humidifier_entity).toBe('humidifier.mist');
    });

});
