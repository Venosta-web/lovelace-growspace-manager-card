import { describe, it, expect } from 'vitest';
import { calculateGrowthDeviation } from '../../src/utils/analytics-utils';
import { PlantEntity, StrainEntry, PlantStage } from '../../src/types';

describe('analytics-utils', () => {
    describe('calculateGrowthDeviation', () => {
        const mockPlant = (stage: string, flowerDays: number): PlantEntity => ({
            entity_id: 'sensor.plant',
            state: stage,
            attributes: {
                entity_id: 'sensor.plant',
                stage: stage,
                flower_days: flowerDays,
                // other attributes required by type but not used
                plant_id: '123',
                strain: 'OG Kush',
                phenotype: 'Alpha',
                row: 1, col: 1, position: '1-1',
                seedling_days: 0, mother_days: 0, clone_days: 0, veg_days: 0, dry_days: 0, cure_days: 0,
                seedling_start: null, mother_start: null, clone_start: null, veg_start: null, flower_start: null, dry_start: null, cure_start: null,
                days_since_last_watering: 0
            },
            last_changed: '', last_updated: '', context: { id: '', parent_id: null, user_id: null }
        });

        const mockStrain = (targetDays: number): StrainEntry => ({
            strain: 'OG Kush',
            phenotype: 'Alpha',
            key: 'og_kush',
            phenotype_target_days: targetDays
        });

        it('returns 0 if plant is not in FLOWER stage', () => {
            const plant = mockPlant(PlantStage.VEG, 10);
            const strain = mockStrain(60);
            expect(calculateGrowthDeviation(plant, strain)).toBe(0);
        });

        it('calculates percentage progress correctly', () => {
            const plant = mockPlant(PlantStage.FLOWER, 30);
            const strain = mockStrain(60);
            // 30 / 60 = 50%
            expect(calculateGrowthDeviation(plant, strain)).toBe(50);
        });

        it('handles missing strain data by returning 0', () => {
            const plant = mockPlant(PlantStage.FLOWER, 30);
            expect(calculateGrowthDeviation(plant, undefined)).toBe(0);
        });

        it('uses default 63 days if strain data is missing target days', () => {
            const plant = mockPlant(PlantStage.FLOWER, 63);
            const strain = { ...mockStrain(0), flowering_days: undefined, phenotype_target_days: undefined };
            // 63 / 63 = 100%
            expect(calculateGrowthDeviation(plant, strain)).toBe(100);
        });

        it('returns > 100% if days exceed target', () => {
            const plant = mockPlant(PlantStage.FLOWER, 70);
            const strain = mockStrain(60);
            // 70 / 60 = 116.666...
            expect(calculateGrowthDeviation(plant, strain)).toBeGreaterThan(100);
        });

        it('handles undefined plant.state gracefully', () => {
            const plant = mockPlant(PlantStage.FLOWER, 30);
            // Force undefined state
            (plant as any).state = undefined;
            const strain = mockStrain(60);
            // Should return 0 because stage check fails
            expect(calculateGrowthDeviation(plant, strain)).toBe(0);
        });

        it('handles missing plant.attributes by returning 0', () => {
            const plant = mockPlant(PlantStage.FLOWER, 30);
            // Force undefined attributes
            (plant as any).attributes = undefined;
            const strain = mockStrain(60);
            expect(calculateGrowthDeviation(plant, strain)).toBe(0);
        });

        it('falls back to 63 days when phenotype_target_days is falsy', () => {
            const plant = mockPlant(PlantStage.FLOWER, 30);
            const strain = mockStrain(0); // 0 is falsy, so falls back to 63
            // 30 / 63 = ~47.62%
            expect(calculateGrowthDeviation(plant, strain)).toBeCloseTo(47.62, 1);
        });

        it('uses flowering_days as fallback when phenotype_target_days is undefined', () => {
            const plant = mockPlant(PlantStage.FLOWER, 30);
            const strain = { ...mockStrain(0), phenotype_target_days: undefined, flowering_days: 60 };
            // 30 / 60 = 50%
            expect(calculateGrowthDeviation(plant, strain)).toBe(50);
        });

        it('handles undefined flower_days in plant attributes', () => {
            const plant = mockPlant(PlantStage.FLOWER, 0);
            // Force undefined flower_days
            (plant as any).attributes.flower_days = undefined;
            const strain = mockStrain(60);
            // currentDays = 0, 0 / 60 = 0%
            expect(calculateGrowthDeviation(plant, strain)).toBe(0);
        });
    });
});
