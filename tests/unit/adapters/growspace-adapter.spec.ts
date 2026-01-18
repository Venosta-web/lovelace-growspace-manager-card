import { describe, it, expect } from 'vitest';
import { GrowspaceAdapter } from '../../../src/adapters/growspace-adapter';
import { GrowspaceAPIResponse, PlantStage, GrowspaceTypeEnum } from '../../../src/types';

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
            type: GrowspaceTypeEnum.NORMAL,
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
                    cure_start: null,
                    days_since_last_watering: 0,
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
            // Flat Environment Config
            temperature_sensor: 'sensor.temp',
            humidity_sensor: 'sensor.hum',
            vpd_sensor: 'sensor.vpd'
        };

        const result = GrowspaceAdapter.transformGrowspace(mockOverview, mockWSData);

        expect(result).not.toBeNull();
        if (!result) return;

        expect(result.deviceId).toBe('test_gs');
        // Verify Grid Transformation
        expect(result.plants).toHaveLength(1);
        expect(result.plants[0].attributes.strain).toBe('Kush');
        expect(result.plants[0].attributes.row).toBe(0);
        expect(result.plants[0].attributes.col).toBe(0);
        expect(result.plants[0].attributes.stage).toBe(PlantStage.VEG);

        // Verify Config Mapping
        expect(result.environmentAttributes?.temperatureSensor).toBe('sensor.temp');
        expect(result.biologicalMetrics?.airExchange).toBe('100');
    });

    it('should return skeleton when wsData is null', () => {
        const result = GrowspaceAdapter.transformGrowspace(mockOverview, null);
        expect(result).not.toBeNull();
        expect(result?.lastUpdated).toBe('Loading...');
        expect(result?.plants).toHaveLength(0);
    });


    it('should fallback to root environment attributes if config is missing', () => {
        const mockWSData: GrowspaceAPIResponse = {
            growspace_id: 'test_gs',
            name: 'Test Room',
            type: GrowspaceTypeEnum.NORMAL,
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
            humidifier_entity: 'humidifier.mist',
            dehumidifier_control_enabled: true
        } as any;

        const result = GrowspaceAdapter.transformGrowspace(mockOverview, mockWSData);
        expect(result).not.toBeNull();
        expect(result?.environmentAttributes?.exhaustEntity).toBe('fan.exhaust');
        expect(result?.environmentAttributes?.humidifierEntity).toBe('humidifier.mist');
        expect(result?.environmentAttributes?.dehumidifierControlEnabled).toBe(true);
    });

    it('should handle store-injected plant data with partial fields', () => {
        // Simulate structure injected by GrowspaceStore._handlePlantUpdate
        const mockWSData: GrowspaceAPIResponse = {
            growspace_id: 'gs1',
            name: 'Room',
            type: 'flower',
            rows: 2,
            plants_per_row: 2,
            total_plants: 1,
            grid: {
                'position_1_2': {
                    plant_id: 'p1',
                    row: 1,
                    col: 2,
                    strain: 'Test Strain',
                    entity_id: null,
                    stage: 'flower'
                } as any
            } as any,
            is_day: true,
            vpd_status: 'ok',
            environment_config: {}
        } as any;

        const result = GrowspaceAdapter.transformGrowspace(mockOverview, mockWSData);

        expect(result).not.toBeNull();
        expect(result?.plants).toHaveLength(1);
        const plant = result?.plants[0];

        expect(plant?.attributes.plant_id).toBe('p1');
        expect(plant?.attributes.row).toBe(1);
        expect(plant?.attributes.col).toBe(2);

        // Entity ID handling
        expect(plant?.entity_id).toBeNull();
    });

    it('should handle wsData with null grid', () => {
        const ws: any = {
            growspace_id: 'g1',
            grid: null,
            plants_per_row: 2,
            rows: 2
        };
        const result = GrowspaceAdapter.transformGrowspace(null, ws);
        expect(result?.plants).toHaveLength(0);
    });

    it('should return null when both wsData and overview are null', () => {
        const result = GrowspaceAdapter.transformGrowspace(null, null);
        expect(result).toBeNull();
    });

    it('should return deprecated transformToDevices as empty array', () => {
        const result = GrowspaceAdapter.transformToDevices();
        expect(result).toEqual([]);
    });

    it('should fallback growspace_id from overview when wsData lacks it', () => {
        const wsWithoutId: GrowspaceAPIResponse = {
            growspace_id: '',
            name: 'Test Room',
            type: GrowspaceTypeEnum.NORMAL,
            rows: 2,
            plants_per_row: 2,
            total_plants: 0,
            grid: {},
            irrigation_config: { irrigation_times: [], drain_times: [] },
            vpd_status: 'ok'
        } as any;

        const result = GrowspaceAdapter.transformGrowspace(mockOverview, wsWithoutId);
        expect(result?.deviceId).toBe('test_gs');
    });

    it('should use default name when both wsData and overview lack it', () => {
        const wsWithoutName: GrowspaceAPIResponse = {
            growspace_id: 'gs_anon',
            name: '',
            type: GrowspaceTypeEnum.NORMAL,
            rows: 1,
            plants_per_row: 1,
            total_plants: 0,
            grid: {},
            irrigation_config: { irrigation_times: [], drain_times: [] },
            vpd_status: 'ok'
        } as any;

        const overviewWithoutName = {
            entity_id: 'sensor.test',
            attributes: { growspace_id: 'gs_anon' }
        };

        const result = GrowspaceAdapter.transformGrowspace(overviewWithoutName as any, wsWithoutName);
        expect(result?.name).toBe('Growspace gs_anon');
    });

    it('should handle empty grid object', () => {
        const wsEmptyGrid: GrowspaceAPIResponse = {
            growspace_id: 'test_gs',
            name: 'Empty Room',
            type: GrowspaceTypeEnum.NORMAL,
            rows: 2,
            plants_per_row: 2,
            total_plants: 0,
            grid: {},
            irrigation_config: { irrigation_times: [], drain_times: [] },
            vpd_status: 'ok'
        } as any;

        const result = GrowspaceAdapter.transformGrowspace(mockOverview, wsEmptyGrid);
        expect(result?.plants).toHaveLength(0);
    });

    it('should handle plant with unknown stage', () => {
        const wsWithUnknownStage: GrowspaceAPIResponse = {
            growspace_id: 'test_gs',
            name: 'Test Room',
            type: GrowspaceTypeEnum.NORMAL,
            rows: 1,
            plants_per_row: 1,
            total_plants: 1,
            grid: {
                'position_0_0': {
                    plant_id: 'p1',
                    entity_id: 'sensor.p1',
                    strain: 'Unknown',
                    phenotype: '#1',
                    stage: null,
                    row: 0,
                    col: 0
                } as any
            },
            irrigation_config: { irrigation_times: [], drain_times: [] },
            vpd_status: 'ok'
        } as any;

        const result = GrowspaceAdapter.transformGrowspace(mockOverview, wsWithUnknownStage);
        expect(result?.plants[0].attributes.stage).toBe('unknown');
    });

    it('should include irrigationStrategy when provided', () => {
        const wsWithStrategy: GrowspaceAPIResponse = {
            growspace_id: 'test_gs',
            name: 'Irrigated Room',
            type: GrowspaceTypeEnum.NORMAL,
            rows: 1,
            plants_per_row: 1,
            total_plants: 0,
            grid: {},
            irrigation_config: { irrigation_times: [], drain_times: [] },
            irrigation_strategy: { enabled: true, target_vwc_percent: 45 } as any,
            vpd_status: 'ok'
        } as any;

        const result = GrowspaceAdapter.transformGrowspace(mockOverview, wsWithStrategy);
        expect(result?.irrigationStrategy).toEqual(expect.objectContaining({ enabled: true, targetVwcPercent: 45 }));
    });


    describe('Coverage Gap Fillers', () => {
        it('should fallback to "unknown" when both wsData and overview lack growspace_id', () => {
            const wsWithoutId: GrowspaceAPIResponse = {
                growspace_id: '',
                name: 'No ID Room',
                type: GrowspaceTypeEnum.NORMAL,
                rows: 1,
                plantsPerRow: 1,
                totalPlants: 0,
                grid: {},
                irrigationConfig: { irrigation_times: [], drain_times: [] },
                vpdStatus: 'ok'
            } as any;

            const overviewWithoutId = {
                entity_id: 'sensor.test',
                attributes: {} // No growspace_id
            };

            const result = GrowspaceAdapter.transformGrowspace(overviewWithoutId as any, wsWithoutId);
            expect(result?.deviceId).toBe('unknown');
        });

        it('should fallback type to "normal" when wsData.type is undefined', () => {
            const wsWithoutType: GrowspaceAPIResponse = {
                growspace_id: 'test_gs',
                name: 'No Type Room',
                type: undefined as any,
                rows: 1,
                plantsPerRow: 1,
                totalPlants: 0,
                grid: {},
                irrigationConfig: { irrigation_times: [], drain_times: [] },
                vpdStatus: 'ok'
            } as any;

            const result = GrowspaceAdapter.transformGrowspace(mockOverview, wsWithoutType);
            expect(result?.type).toBe('normal');
        });

        it('should skip null slots in grid', () => {
            const wsWithNullSlots: GrowspaceAPIResponse = {
                growspace_id: 'test_gs',
                name: 'Mixed Grid Room',
                type: GrowspaceTypeEnum.NORMAL,
                rows: 2,
                plantsPerRow: 2,
                totalPlants: 1,
                grid: {
                    'position_0_0': {
                        plant_id: 'p1',
                        entity_id: 'sensor.p1',
                        strain: 'Valid',
                        phenotype: '#1',
                        stage: 'veg',
                        row: 0,
                        col: 0
                    } as any,
                    'position_0_1': null,
                    'position_1_0': undefined
                } as any,
                irrigation_config: { irrigation_times: [], drain_times: [] },
                vpdStatus: 'ok'
            } as any;

            const result = GrowspaceAdapter.transformGrowspace(mockOverview, wsWithNullSlots);
            expect(result?.plants).toHaveLength(1);
        });

        it('should handle overview with wsData having empty overview_entity_id', () => {
            const wsWithEmptyEntityId: GrowspaceAPIResponse = {
                growspace_id: 'test_gs',
                name: 'Test Room',
                type: 'normal',
                overview_entity_id: '',
                rows: 1,
                plantsPerRow: 1,
                totalPlants: 0,
                grid: {},
                irrigationConfig: { irrigation_times: [], drain_times: [] },
                vpdStatus: 'ok'
            } as any;

            const result = GrowspaceAdapter.transformGrowspace(mockOverview, wsWithEmptyEntityId);
            expect(result?.overviewEntityId).toBe('sensor.growspace_test_overview');
        });
    });
});
