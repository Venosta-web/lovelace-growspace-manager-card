
import { describe, it, expect, vi } from 'vitest';
import { NutrientPresetsSchema, IPMPresetsSchema, validateGrowspaceResponse, validateGrowspaceCollection, validateStrainLibrary, HistoryPointSchema, GrowspaceAPIResponseSchema, ECRampPointSchema, ECRampCurvesSchema } from '../../../src/schemas/api-schema';

describe('API Schemas', () => {
    describe('NutrientPresetsSchema', () => {
        it('should validate and transform nullish fields', () => {
            const input = {
                'p1': {
                    id: 'p1',
                    name: 'Test',
                    nutrients: [],
                    stage: null,
                    min_days_in_stage: null
                }
            };
            const result = NutrientPresetsSchema.parse(input);
            expect(result.p1.stage).toBeUndefined();
            expect(result.p1.min_days_in_stage).toBeUndefined();
        });

        it('should preserve valid values', () => {
            const input = {
                'p1': {
                    id: 'p1',
                    name: 'Test',
                    nutrients: [],
                    stage: 'veg',
                    min_days_in_stage: 5
                }
            };
            const result = NutrientPresetsSchema.parse(input);
            expect(result.p1.stage).toBe('veg');
            expect(result.p1.min_days_in_stage).toBe(5);
        });

        it('should handle undefined input', () => {
            const input = {
                'p1': {
                    id: 'p1',
                    name: 'Test',
                    nutrients: [],
                    // keys missing
                }
            };
            const result = NutrientPresetsSchema.parse(input);
            expect(result.p1.stage).toBeUndefined();
            expect(result.p1.min_days_in_stage).toBeUndefined();
        });
    });

    describe('IPMPresetsSchema', () => {
        it('should validate and transform nullish fields', () => {
            const input = {
                'p1': {
                    id: 'p1',
                    name: 'Test',
                    type: 'foliar',
                    items: [],
                    stage: null,
                    min_days_in_stage: null
                }
            };
            const result = IPMPresetsSchema.parse(input);
            expect(result.p1.stage).toBeUndefined();
            expect(result.p1.min_days_in_stage).toBeUndefined();
        });

        it('should preserve valid values', () => {
            const input = {
                'p1': {
                    id: 'p1',
                    name: 'Test',
                    type: 'drench',
                    items: [],
                    stage: 'flower',
                    min_days_in_stage: 10
                }
            };
            const result = IPMPresetsSchema.parse(input);
            expect(result.p1.stage).toBe('flower');
            expect(result.p1.min_days_in_stage).toBe(10);
        });
    });

    describe('Validation Helpers', () => {

        it('should validate growspace response', () => {
            const validData = {
                identity: { growspace_id: 'gs1', name: 'GS1', type: 'flower' },
                grid: { rows: 1, plants_per_row: 1, total_plants: 0, grid: {} },
                environment: {},
                sensors: { sensor_types: {}, sensor_coordinates: {}, sensor_groups: [] },
                irrigation: { irrigation_config: {} },
                metrics: { vpd_status: 'ok', granular_stage: 'unknown', is_day: false },
            };
            const result = validateGrowspaceResponse(validData);
            expect(result.success).toBe(true);
            if (result.success && result.data) {
                expect(result.data.identity.growspace_id).toBe('gs1');
            }
        });

        it('should return error for invalid growspace response', () => {
            // Suppress console.error for this test
            const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
            // identity.growspace_id must be a string, not a number
            const invalidData = { identity: { growspace_id: 123, name: 'X', type: 'normal' } };
            const result = validateGrowspaceResponse(invalidData);
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();
            spy.mockRestore();
        });

        it('should validate growspace collection', () => {
            const validData = {
                'gs1': {
                    identity: { growspace_id: 'gs1', name: 'GS1', type: 'flower' },
                    grid: { rows: 1, plants_per_row: 1, total_plants: 0, grid: {} },
                    environment: {},
                    sensors: { sensor_types: {}, sensor_coordinates: {}, sensor_groups: [] },
                    irrigation: { irrigation_config: {} },
                    metrics: { vpd_status: 'ok', granular_stage: 'unknown', is_day: false },
                },
            };
            const result = validateGrowspaceCollection(validData);
            expect(result.success).toBe(true);
        });

        it('should return error for invalid growspace collection', () => {
            const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
            // identity.growspace_id must be a string, not a number
            const invalidData = { 'gs1': { identity: { growspace_id: 123, name: 'X', type: 'normal' } } };
            const result = validateGrowspaceCollection(invalidData);
            expect(result.success).toBe(false);
            spy.mockRestore();
        });

        it('should validate strain library', () => {
            const validData = {
                strains: {},
                strain_list: []
            };
            const result = validateStrainLibrary(validData);
            expect(result.success).toBe(true);
        });

        it('should return error for invalid strain library', () => {
            const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const invalidData = { strains: "invalid" };
            const result = validateStrainLibrary(invalidData);
            expect(result.success).toBe(false);
            spy.mockRestore();
        });

        it('should handle irrigation schedule transformations', () => {
            const data = {
                identity: { growspace_id: 'gs1', name: 'GS1', type: 'flower' },
                grid: { rows: 1, plants_per_row: 1, total_plants: 0, grid: {} },
                environment: {},
                sensors: {},
                irrigation: {
                    irrigation_config: {
                        irrigation_times: [
                            '08:00', // string transform
                            { start_time: '10:00', duration_seconds: 60 }, // start_time and duration_seconds alias
                            { time: '12:00', duration: null, duration_seconds: 120 }, // null duration fallback
                        ],
                        drain_times: [
                            '18:00', // string transform
                            { time: '14:00', duration: 45 }, // explicit time and duration
                            { time: '16:00', duration: null, duration_seconds: null }, // both null -> undefined
                        ],
                    },
                },
                metrics: {},
            };
            const result = GrowspaceAPIResponseSchema.parse(data);
            const irr = result.irrigation.irrigation_config;

            // irrigation_times[0]: '08:00' -> { time: '08:00' }
            expect(irr.irrigation_times[0]).toEqual({ time: '08:00' });

            // irrigation_times[1]: { start_time: '10:00', duration_seconds: 60 } -> { time: '10:00', duration: 60 }
            expect(irr.irrigation_times[1] as any).toEqual({ time: '10:00', duration: 60 });

            // irrigation_times[2]: { time: '12:00', duration: null, duration_seconds: 120 } -> { time: '12:00', duration: 120 }
            expect(irr.irrigation_times[2] as any).toEqual({ time: '12:00', duration: 120 });

            // drain_times[0]: '18:00' -> { time: '18:00' }
            expect(irr.drain_times[0]).toEqual({ time: '18:00' });

            // drain_times[1]: { time: '14:00', duration: 45 } -> { time: '14:00', duration: 45 }
            expect(irr.drain_times[1] as any).toEqual({ time: '14:00', duration: 45 });

            // drain_times[2]: { time: '16:00', duration: null, duration_seconds: null } -> { time: '16:00', duration: undefined }
            expect(irr.drain_times[2].time).toBe('16:00');
            expect((irr.drain_times[2] as any).duration).toBeUndefined();
        });

        it('should fail if irrigation schedule time is empty', () => {
            const data = {
                identity: { growspace_id: 'gs1', name: 'GS1', type: 'flower' },
                irrigation: {
                    irrigation_config: {
                        irrigation_times: [{ duration: 60 }], // Missing time and start_time
                    },
                },
            };
            const result = GrowspaceAPIResponseSchema.safeParse(data);
            expect(result.success).toBe(false);
        });
    });

    describe('HistoryPointSchema', () => {
        it('should transform number timestamp to ISO string in lu field', () => {
            const input = {
                s: '25.5',
                lu: 1704067200 // Unix timestamp (2024-01-01 00:00:00 UTC)
            };
            const result = HistoryPointSchema.parse(input);

            expect(result.lu).toBe('2024-01-01T00:00:00.000Z');
            expect(typeof result.lu).toBe('string');
        });

        it('should pass through string value in lu field', () => {
            const input = {
                s: '25.5',
                lu: '2024-01-01T00:00:00.000Z'
            };
            const result = HistoryPointSchema.parse(input);

            expect(result.lu).toBe('2024-01-01T00:00:00.000Z');
            expect(typeof result.lu).toBe('string');
        });

        it('should transform number to string in s field', () => {
            const input = {
                s: 25.5,
                lu: '2024-01-01T00:00:00.000Z'
            };
            const result = HistoryPointSchema.parse(input);

            expect(result.s).toBe('25.5');
            expect(typeof result.s).toBe('string');
        });

        it('should pass through string in s field', () => {
            const input = {
                s: '25.5',
                lu: '2024-01-01T00:00:00.000Z'
            };
            const result = HistoryPointSchema.parse(input);

            expect(result.s).toBe('25.5');
            expect(typeof result.s).toBe('string');
        });
    });

    describe('ECRampPointSchema', () => {
        it('uses provided day and target_ec directly', () => {
            const result = ECRampPointSchema.parse({ day: 5, target_ec: 1.8 });
            expect(result.day).toBe(5);
            expect(result.target_ec).toBe(1.8);
        });

        it('derives day from week when day is missing', () => {
            // week=2 → day = (2-1)*7 + 1 = 8
            const result = ECRampPointSchema.parse({ week: 2, target_ec: 2.0 });
            expect(result.day).toBe(8);
        });

        it('defaults to day=1 when both day and week are missing', () => {
            const result = ECRampPointSchema.parse({ target_ec: 1.5 });
            expect(result.day).toBe(1);
        });

        it('uses ec_min as target_ec when target_ec is missing', () => {
            const result = ECRampPointSchema.parse({ day: 3, ec_min: 1.2 });
            expect(result.target_ec).toBe(1.2);
        });

        it('defaults target_ec to 0 when both target_ec and ec_min are missing', () => {
            const result = ECRampPointSchema.parse({ day: 3 });
            expect(result.target_ec).toBe(0);
        });
    });

    describe('ECRampCurvesSchema', () => {
        it('parses a record of curves', () => {
            const input = {
                curve1: {
                    id: 'curve1',
                    name: 'Test Curve',
                    points: [{ day: 1, target_ec: 1.0 }],
                },
            };
            const result = ECRampCurvesSchema.parse(input);
            expect(result).toHaveProperty('curve1');
        });

        it('transforms an empty array to an empty object (backend default)', () => {
            const result = ECRampCurvesSchema.parse([]);
            expect(result).toEqual({});
        });
    });
});
