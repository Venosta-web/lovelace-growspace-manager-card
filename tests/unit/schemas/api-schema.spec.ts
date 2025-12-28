
import { describe, it, expect } from 'vitest';
import { GrowspaceAPIResponseSchema } from '../../../src/schemas/api-schema';

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

    it('should allow valid string values for sensor fields', () => {
        const validData = {
            growspace_id: 'test_id',
            name: 'Test Growspace',
            type: 'normal',
            rows: 1,
            plants_per_row: 1,
            vpd: '1.2',
            soil_moisture_value: '45.5',
            dehumidifier_state: 'off',
            grid: {},
            irrigation_config: {},
        };

        const result = GrowspaceAPIResponseSchema.safeParse(validData);
        expect(result.success).toBe(true);
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
