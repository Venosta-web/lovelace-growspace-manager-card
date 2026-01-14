
import { describe, it, expect, vi } from 'vitest';
import { NutrientPresetsSchema, IPMPresetsSchema, validateGrowspaceResponse, validateGrowspaceCollection, validateStrainLibrary, HistoryPointSchema } from '../../../src/schemas/api-schema';

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
                growspace_id: 'gs1',
                name: 'GS1',
                type: 'flower',
                rows: 1,
                plants_per_row: 1,
                grid: {},
                irrigation_config: {}
            };
            const result = validateGrowspaceResponse(validData);
            expect(result.success).toBe(true);
            if (result.success && result.data) {
                expect(result.data.growspace_id).toBe('gs1');
            }
        });

        it('should return error for invalid growspace response', () => {
            // Suppress console.error for this test
            const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const invalidData = { growspace_id: 123 }; // Invalid type
            const result = validateGrowspaceResponse(invalidData);
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();
            spy.mockRestore();
        });

        it('should validate growspace collection', () => {
            const validData = {
                'gs1': {
                    growspace_id: 'gs1',
                    name: 'GS1',
                    type: 'flower',
                    rows: 1,
                    plants_per_row: 1
                }
            };
            const result = validateGrowspaceCollection(validData);
            expect(result.success).toBe(true);
        });

        it('should return error for invalid growspace collection', () => {
            const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const invalidData = { 'gs1': { growspace_id: 123 } };
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
});
