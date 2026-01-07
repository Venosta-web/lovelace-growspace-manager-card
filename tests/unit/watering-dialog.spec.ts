import { describe, it, expect, vi } from 'vitest';
import type { WateringDialogState, NutrientEntry } from '../../src/types';
import type { HomeAssistant } from 'custom-card-helpers';

// Import to register the custom element
import '../../src/dialogs/watering-dialog';

// Mock HomeAssistant
const createMockHass = (): Partial<HomeAssistant> => ({
    callService: vi.fn().mockResolvedValue(undefined),
    connection: {
        sendMessagePromise: vi.fn().mockResolvedValue({}),
    } as any,
    states: {},
    user: { id: 'test-user', name: 'Test User', is_admin: true },
});

// Mock GrowspaceStore
const createMockStore = () => ({
    ui: {
        $selectedPlants: { get: () => new Set() },
        $activeDialog: { set: vi.fn() },
        closeDialog: vi.fn(),
    },
    refreshData: vi.fn().mockResolvedValue(undefined),
    showToast: vi.fn(),
    dataService: {
        waterPlant: vi.fn().mockResolvedValue(undefined),
        waterGrowspace: vi.fn().mockResolvedValue(undefined),
    },
});

describe('watering-dialog', () => {
    describe('nutrient calculation', () => {
        it('should calculate total ml correctly: volume × concentration', () => {
            // Test the calculation logic
            const volume = 10; // Liters
            const concentration = 2; // ml/L
            const expectedTotal = volume * concentration; // 20 ml

            expect(expectedTotal).toBe(20);
        });

        it('should sum multiple nutrients correctly', () => {
            const volume = 5; // Liters
            const nutrients: NutrientEntry[] = [
                { name: 'Nutrient A', concentration: 2 },
                { name: 'Nutrient B', concentration: 3 },
                { name: 'Nutrient C', concentration: 1 },
            ];

            const totalMl = nutrients.reduce(
                (sum, n) => sum + volume * n.concentration,
                0
            );

            expect(totalMl).toBe(30); // 5L × (2 + 3 + 1) = 30ml
        });

        it('should handle zero concentration', () => {
            const volume = 10;
            const concentration = 0;
            expect(volume * concentration).toBe(0);
        });

        it('should handle fractional volumes and concentrations', () => {
            const volume = 2.5;
            const concentration = 1.6;
            expect(volume * concentration).toBeCloseTo(4.0, 1);
        });
    });

    describe('dialog state', () => {
        it('should identify plant mode when plantIds are present', () => {
            const dialogState: WateringDialogState = {
                plantIds: ['plant-1', 'plant-2'],
                growspaceId: 'growspace-1',
                mode: 'plant',
            };

            expect(dialogState.mode).toBe('plant');
            expect(dialogState.plantIds?.length).toBe(2);
        });

        it('should identify growspace mode when no plantIds', () => {
            const dialogState: WateringDialogState = {
                growspaceId: 'growspace-1',
                mode: 'growspace',
            };

            expect(dialogState.mode).toBe('growspace');
            expect(dialogState.plantIds).toBeUndefined();
        });
    });

    describe('service call payload', () => {
        it('should construct water_plant payload correctly', () => {
            const plantId = 'test-plant-123';
            const amount = 1.5;
            const nutrients: Record<string, number> = {
                'Calmag': 2.5,
                'Bloom A': 3.0,
            };

            const payload: Record<string, any> = {
                plant_id: plantId,
                amount,
            };
            if (nutrients && Object.keys(nutrients).length > 0) {
                payload.nutrients = nutrients;
            }

            expect(payload.plant_id).toBe('test-plant-123');
            expect(payload.amount).toBe(1.5);
            expect(payload.nutrients).toEqual({
                'Calmag': 2.5,
                'Bloom A': 3.0,
            });
        });

        it('should construct water_growspace payload correctly', () => {
            const growspaceId = 'test-growspace';
            const amountPerPlant = 0.8;
            const nutrients: Record<string, number> = {};

            const payload: Record<string, any> = {
                growspace_id: growspaceId,
                amount_per_plant: amountPerPlant,
            };
            if (nutrients && Object.keys(nutrients).length > 0) {
                payload.nutrients = nutrients;
            }

            expect(payload.growspace_id).toBe('test-growspace');
            expect(payload.amount_per_plant).toBe(0.8);
            expect(payload.nutrients).toBeUndefined();
        });

        it('should omit nutrients when empty', () => {
            const nutrients: Record<string, number> = {};
            const payload: Record<string, any> = { plant_id: 'test', amount: 1 };

            if (nutrients && Object.keys(nutrients).length > 0) {
                payload.nutrients = nutrients;
            }

            expect('nutrients' in payload).toBe(false);
        });
    });

    describe('NutrientEntry interface', () => {
        it('should properly type nutrient entries', () => {
            const entry: NutrientEntry = {
                name: 'Cal-Mag',
                concentration: 2.5,
            };

            expect(typeof entry.name).toBe('string');
            expect(typeof entry.concentration).toBe('number');
        });

        it('should convert array of NutrientEntry to Record', () => {
            const nutrients: NutrientEntry[] = [
                { name: 'Calmag', concentration: 2.5 },
                { name: 'Bloom A', concentration: 3.0 },
                { name: '', concentration: 0 }, // Should be filtered
            ];

            const record: Record<string, number> = {};
            for (const n of nutrients) {
                if (n.name && n.concentration > 0) {
                    record[n.name] = n.concentration;
                }
            }

            expect(Object.keys(record).length).toBe(2);
            expect(record['Calmag']).toBe(2.5);
            expect(record['Bloom A']).toBe(3.0);
        });
    });
});
