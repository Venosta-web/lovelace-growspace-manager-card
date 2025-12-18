
import { describe, it, expect } from 'vitest';
import { GrowspaceAPIResponseSchema } from '../../../src/schemas/api-schema';

describe('GrowspaceAPIResponseSchema', () => {
    it('should validate a valid flattened API response', () => {
        const validData = {
            growspace_id: 'test_gs',
            name: 'Test Room',
            type: 'normal',
            rows: 4,
            plants_per_row: 4,
            total_plants: 0,
            grid: {},
            irrigation_config: {},

            // Flat Environment Config
            temperature_sensor: 'sensor.temp',
            humidity_sensor: 'sensor.humidity',

            // Stats
            max_veg_days: 10,

            // Metrics
            vpd_status: 'ok'
        };

        const result = GrowspaceAPIResponseSchema.safeParse(validData);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.temperature_sensor).toBe('sensor.temp');
            expect(result.data.humidity_sensor).toBe('sensor.humidity');
            expect(result.data.irrigation_strategy).toBeNull(); // Default applied
        }
    });

    it('should allow extra fields (catchall)', () => {
        const dataWithExtras = {
            growspace_id: 'test_gs',
            name: 'Test',
            type: 'normal',
            rows: 1,
            plants_per_row: 1,
            unknown_prop: 'should_pass'
        };
        const result = GrowspaceAPIResponseSchema.safeParse(dataWithExtras);
        expect(result.success).toBe(true);
    });

    it('should fail on missing required fields', () => {
        const invalidData = {
            // missing growspace_id
            name: 'Test'
        };
        const result = GrowspaceAPIResponseSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });
});
