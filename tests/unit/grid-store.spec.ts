import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { $activeDevices, $growspaceOptions, $gridLayout } from '../../src/store/grid-store';
import { setDevices, setSelectedDevice, addOptimisticDeletedPlantId, setOptimisticDeletedPlantIds } from '../../src/store/data-store';
import { GrowspaceDevice, PlantEntity, createGrowspaceDevice } from '../../src/types';

// Use actual nanostores atoms - no mocking needed for computed atoms
// We just need to set up the source atoms with test data

describe('grid-store', () => {
    const mockPlant1: PlantEntity = {
        entity_id: 'sensor.plant_abc',
        state: 'active',
        last_changed: '',
        last_updated: '',
        context: { id: '1', parent_id: null, user_id: null },
        attributes: {
            plant_id: 'abc',
            entity_id: 'sensor.plant_abc',
            strain: 'Test Strain',
            phenotype: '#1',
            stage: 'veg',
            row: 1,
            col: 1,
            position: '1-1',
            seedling_days: 0,
            mother_days: 0,
            clone_days: 0,
            veg_days: 10,
            flower_days: 0,
            dry_days: 0,
            cure_days: 0,
            seedling_start: null,
            mother_start: null,
            clone_start: null,
            veg_start: '2023-01-01',
            flower_start: null,
            dry_start: null,
            cure_start: null,
        },
    };

    const mockPlant2: PlantEntity = {
        entity_id: 'sensor.plant_def',
        state: 'active',
        last_changed: '',
        last_updated: '',
        context: { id: '2', parent_id: null, user_id: null },
        attributes: {
            plant_id: 'def',
            entity_id: 'sensor.plant_def',
            strain: 'Another Strain',
            phenotype: '#2',
            stage: 'veg',
            row: 1,
            col: 2,
            position: '1-2',
            seedling_days: 0,
            mother_days: 0,
            clone_days: 0,
            veg_days: 5,
            flower_days: 0,
            dry_days: 0,
            cure_days: 0,
            seedling_start: null,
            mother_start: null,
            clone_start: null,
            veg_start: '2023-01-05',
            flower_start: null,
            dry_start: null,
            cure_start: null,
        },
    };

    const mockPlant3: PlantEntity = {
        entity_id: 'sensor.plant_ghi',
        state: 'active',
        last_changed: '',
        last_updated: '',
        context: { id: '3', parent_id: null, user_id: null },
        attributes: {
            plant_id: 'ghi',
            entity_id: 'sensor.plant_ghi',
            strain: 'Third Strain',
            phenotype: '#3',
            stage: 'flower',
            row: 2,
            col: 1,
            position: '2-1',
            seedling_days: 0,
            mother_days: 0,
            clone_days: 0,
            veg_days: 14,
            flower_days: 7,
            dry_days: 0,
            cure_days: 0,
            seedling_start: null,
            mother_start: null,
            clone_start: null,
            veg_start: '2022-12-01',
            flower_start: '2023-01-01',
            dry_start: null,
            cure_start: null,
        },
    };

    const mockDevice1: GrowspaceDevice = createGrowspaceDevice({
        device_id: 'gs1',
        name: 'Growspace 1',
        type: 'normal',
        plants: [mockPlant1, mockPlant2],
        rows: 2,
        plants_per_row: 3,
    });

    const mockDevice2: GrowspaceDevice = createGrowspaceDevice({
        device_id: 'gs2',
        name: 'Growspace 2',
        type: 'veg',
        plants: [mockPlant3],
        rows: 3,
        plants_per_row: 4,
    });

    beforeEach(() => {
        // Reset atoms to clean state
        setDevices([]);
        setSelectedDevice(null);
        setOptimisticDeletedPlantIds(new Set());
    });

    afterEach(() => {
        // Clean up
        setDevices([]);
        setSelectedDevice(null);
        setOptimisticDeletedPlantIds(new Set());
    });

    describe('$activeDevices', () => {
        it('should return devices with plants filtered by optimistic deletion', () => {
            setDevices([mockDevice1, mockDevice2]);
            addOptimisticDeletedPlantId('abc');

            const result = $activeDevices.get();

            expect(result).toHaveLength(2);
            expect(result[0].plants).toHaveLength(1);
            expect(result[0].plants[0].attributes.plant_id).toBe('def');
            expect(result[1].plants).toHaveLength(1);
        });

        it('should return all plants when no optimistic deletions', () => {
            setDevices([mockDevice1]);

            const result = $activeDevices.get();

            expect(result).toHaveLength(1);
            expect(result[0].plants).toHaveLength(2);
        });

        it('should handle plants without plant_id using entity_id fallback', () => {
            const plantWithoutId: PlantEntity = {
                ...mockPlant1,
                attributes: { ...mockPlant1.attributes, plant_id: undefined as unknown as string },
            };
            const device: GrowspaceDevice = { ...mockDevice1, plants: [plantWithoutId] };

            setDevices([device]);
            // entity_id is 'sensor.plant_abc', fallback extracts 'plant_abc'
            addOptimisticDeletedPlantId('plant_abc');

            const result = $activeDevices.get();

            expect(result[0].plants).toHaveLength(0);
        });

        it('should return empty array when no devices', () => {
            setDevices([]);

            const result = $activeDevices.get();

            expect(result).toEqual([]);
        });
    });

    describe('$growspaceOptions', () => {
        it('should create options map from device_id to name', () => {
            setDevices([mockDevice1, mockDevice2]);

            const result = $growspaceOptions.get();

            expect(result).toEqual({
                gs1: 'Growspace 1',
                gs2: 'Growspace 2',
            });
        });

        it('should return empty object when no devices', () => {
            setDevices([]);

            const result = $growspaceOptions.get();

            expect(result).toEqual({});
        });
    });

    describe('$gridLayout', () => {
        it('should return empty grid when no selected device', () => {
            setDevices([mockDevice1]);
            setSelectedDevice(null);

            const result = $gridLayout.get();

            expect(result).toEqual({ effectiveRows: 0, grid: [] });
        });

        it('should return empty grid when selected device not found', () => {
            setDevices([mockDevice1]);
            setSelectedDevice('nonexistent');

            const result = $gridLayout.get();

            expect(result).toEqual({ effectiveRows: 0, grid: [] });
        });

        it('should return grid layout for selected device', () => {
            setDevices([mockDevice1, mockDevice2]);
            setSelectedDevice('gs1');

            const result = $gridLayout.get();

            expect(result.effectiveRows).toBeGreaterThanOrEqual(1);
            expect(result.grid).toBeDefined();
            expect(Array.isArray(result.grid)).toBe(true);
        });

        it('should exclude optimistically deleted plants from grid', () => {
            setDevices([mockDevice1]);
            setSelectedDevice('gs1');
            addOptimisticDeletedPlantId('abc');

            const result = $gridLayout.get();

            // Grid should only contain the non-deleted plant
            const flatPlants = result.grid.flat().filter((p) => p !== null);
            expect(flatPlants).toHaveLength(1);
            expect(flatPlants[0]?.attributes.plant_id).toBe('def');
        });
    });
});
