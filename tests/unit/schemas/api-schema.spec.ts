import { describe, it, expect } from 'vitest';
import {
    GrowspaceAPIResponseSchema,
    validateGrowspaceResponse,
    validateGrowspaceCollection,
    validateStrainLibrary
} from '../../../src/schemas/api-schema';

describe('GrowspaceAPIResponseSchema', () => {
    it('should allow null values for sensor fields', () => {
        const minimalValidData = {
            growspace_id: 'test_id',
            name: 'Test Growspace',
            type: 'normal',
            rows: 1,
            plants_per_row: 1,
            // Fields that can now be null
            vpd: null,
            soil_moisture_value: null,
            dehumidifier_state: null,
            // Required empty defaults
            grid: {},
            irrigation_config: {},
        };

        const result = GrowspaceAPIResponseSchema.safeParse(minimalValidData);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.soil_moisture_value).toBeNull();
            expect(result.data.vpd).toBeNull();
            expect(result.data.dehumidifier_state).toBeNull();
        }
    });

    it('should fail on invalid types', () => {
        const invalidData = {
            growspace_id: 'test_id',
            name: 'Test Growspace',
            type: 'normal',
            rows: 1,
            plants_per_row: 1,
            soil_moisture_value: 123, // Number instead of string
            grid: {},
            irrigation_config: {},
        };

        const result = GrowspaceAPIResponseSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });
});

describe('Validation Helpers', () => {
    const validGrowspace = {
        growspace_id: 'g1',
        name: 'G1',
        type: 'normal',
        rows: 2,
        plants_per_row: 2,
        grid: {},
        irrigation_config: {}
    };

    describe('validateGrowspaceResponse', () => {
        it('should return success and data for valid input', () => {
            const result = validateGrowspaceResponse(validGrowspace);
            expect(result.success).toBe(true);
            // Zod adds defaults like grid: {}, irrigation_config: {} if not present
            expect(result.data).toEqual(expect.objectContaining({
                growspace_id: 'g1',
                name: 'G1'
            }));
        });

        it('should return errors for invalid input', () => {
            const result = validateGrowspaceResponse({ ...validGrowspace, rows: 'invalid' });
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();
        });
    });

    describe('validateGrowspaceCollection', () => {
        it('should return success and data for valid collection', () => {
            const collection = {
                'g1': validGrowspace
            };
            const result = validateGrowspaceCollection(collection);
            expect(result.success).toBe(true);
            expect(result.data?.['g1']).toEqual(expect.objectContaining({
                growspace_id: 'g1'
            }));
        });

        it('should return errors for invalid collection', () => {
            const result = validateGrowspaceCollection({ 'g1': { ...validGrowspace, rows: 'invalid' } });
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();
        });
    });

    describe('validateStrainLibrary', () => {
        it('should return success for valid library', () => {
            const library = { strains: { 'Strain 1': { meta: { type: 'Indica' } } } };
            const result = validateStrainLibrary(library);
            expect(result.success).toBe(true);
            expect(result.data?.strains?.['Strain 1'].meta?.type).toBe('Indica');
            expect(result.data?.strains?.['Strain 1'].phenotypes).toEqual({});
        });

        it('should return errors for invalid library', () => {
            const result = validateStrainLibrary({ not: 'an array' });
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();
        });
    });
});
