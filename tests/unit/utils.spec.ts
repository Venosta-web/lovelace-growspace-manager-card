import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlantUtils } from '../../src/utils';
import { PlantStage, PlantEntity } from '../../src/types';

// Mock current date for stable time-based tests
const MOCK_DATE = new Date('2023-10-15T12:00:00');

describe('PlantUtils', () => {

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(MOCK_DATE);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('createGridLayout', () => {
        it('should create an empty grid of specified size', () => {
            const { grid, rows, cols } = PlantUtils.createGridLayout([], 3, 3);
            expect(rows).toBe(3);
            expect(cols).toBe(3);
            expect(grid.length).toBe(3);
            expect(grid[0].length).toBe(3);
            expect(grid[0][0]).toBeNull();
        });

        it('should place plants in correct slots', () => {
            const mockPlant = {
                entity_id: 'sensor.plant1',
                attributes: { row: 2, col: 2, plant_id: '123' }
            } as unknown as PlantEntity;

            const { grid } = PlantUtils.createGridLayout([mockPlant], 3, 3);
            // Logic uses 1-based index from HA, converts to 0-based
            expect(grid[1][1]).toEqual(mockPlant);
            expect(grid[0][0]).toBeNull();
        });

        it('should ignore plants outside grid bounds', () => {
            const outOfBoundsPlant = {
                entity_id: 'sensor.bad',
                attributes: { row: 99, col: 99 }
            } as unknown as PlantEntity;

            const { grid } = PlantUtils.createGridLayout([outOfBoundsPlant], 3, 3);
            const flatGrid = grid.flat();
            expect(flatGrid.every(slot => slot === null)).toBe(true);
        });
    });

    describe('getPlantStage', () => {
        it('should identify FLOWER stage based on date', () => {
            const plant = {
                attributes: {
                    flower_start: '2023-10-01' // 14 days ago relative to MOCK_DATE
                }
            } as unknown as PlantEntity;

            const stage = PlantUtils.getPlantStage(plant);
            expect(stage).toBe(PlantStage.FLOWER);
        });

        it('should identify VEG stage if flower date is in future', () => {
            const plant = {
                attributes: {
                    veg_start: '2023-09-01',
                    flower_start: '2023-10-20' // Future relative to MOCK_DATE
                }
            } as unknown as PlantEntity;

            const stage = PlantUtils.getPlantStage(plant);
            expect(stage).toBe(PlantStage.VEG);
        });

        it('should default to SEEDLING if no dates provided', () => {
            const plant = { attributes: {} } as unknown as PlantEntity;
            expect(PlantUtils.getPlantStage(plant)).toBe(PlantStage.SEEDLING);
        });
    });

    describe('findFirstAvailableSlot', () => {
        it('should find the first empty slot (1,1)', () => {
            const result = PlantUtils.findFirstAvailableSlot([], 4, 4);
            expect(result).toEqual({ row: 1, col: 1 });
        });

        it('should skip occupied slots', () => {
            const plants = [
                { attributes: { row: 1, col: 1 } },
                { attributes: { row: 1, col: 2 } }
            ] as unknown as PlantEntity[];

            const result = PlantUtils.findFirstAvailableSlot(plants, 4, 4);
            expect(result).toEqual({ row: 1, col: 3 });
        });
    });

    describe('calculatePlantAge', () => {
        it('should calculate days correctly', () => {
            const plant = {
                attributes: {
                    veg_start: '2023-10-05' // 10 days ago
                }
            } as unknown as PlantEntity;

            // Force stage to VEG for calculation
            // Note: calculatePlantAge calls getPlantStage internally
            const age = PlantUtils.calculatePlantAge(plant);
            expect(age).toBe(10);
        });
    });
});
