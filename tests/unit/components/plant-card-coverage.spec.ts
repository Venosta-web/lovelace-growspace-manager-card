
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GrowspacePlantCard } from '../../../src/components/plant-card';
import { atom } from 'nanostores';

describe('GrowspacePlantCard Branch Coverage', () => {
    let element: GrowspacePlantCard;
    let mockStore: any;

    beforeEach(async () => {
        vi.clearAllMocks();

        // Local atoms
        const $isEditMode = atom<boolean>(false);
        const $selectedPlants = atom<Set<string>>(new Set());
        const $devices = atom<any[]>([]);
        const $nutrientPresets = atom<any>({});
        const $ipmPresets = atom<any>({});
        const $selectedDevice = atom<string | null>(null);

        mockStore = {
            ui: {
                $isEditMode,
                $selectedPlants,
                closeDialog: vi.fn(),
                setActiveDialog: vi.fn()
            },
            data: {
                $devices,
                $nutrientPresets,
                $ipmPresets,
                $selectedDevice
            }
        };

        if (!customElements.get('growspace-plant-card')) {
            customElements.define('growspace-plant-card', GrowspacePlantCard);
        }

        element = document.createElement('growspace-plant-card') as GrowspacePlantCard;
        (element as any).store = mockStore;
        // Do NOT set default plant here, as we want to test undefined plant cases
    });

    afterEach(() => {
        if (element.isConnected) {
            document.body.removeChild(element);
        }
    });

    it('displayData should return null if plant is undefined', () => {
        element.plant = undefined as any;
        expect(element.displayData).toBeNull();
    });

    describe('_hasRecommendedPreset', () => {
        it('should return false if plant is undefined', () => {
            element.plant = undefined as any;
            expect(element._hasRecommendedPreset).toBe(false);
        });

        it('should return false if store is undefined', () => {
            element.plant = { attributes: { plant_id: 'p1' } } as any;
            (element as any).store = undefined;
            expect(element._hasRecommendedPreset).toBe(false);
        });

        it('should return false if device is not found', () => {
            mockStore.data.$devices.set([{ deviceId: 'd1' }]);
            element.plant = { attributes: { plant_id: 'p1', growspace_id: 'd2' } } as any;
            expect(element._hasRecommendedPreset).toBe(false);
        });

        it('should return false if no matching preset found', () => {
            mockStore.data.$devices.set([{ deviceId: 'top_grow' }]);
            mockStore.data.$nutrientPresets.set({
                'veg': { stage: 'veg', min_days_in_stage: 10 }
            });
            element.plant = {
                attributes: {
                    plant_id: 'p1',
                    growspace_id: 'top_grow',
                    stage: 'flower'
                }
            } as any;
            expect(element._hasRecommendedPreset).toBe(false);
        });

        it('should return true if matching preset found', () => {
            mockStore.data.$devices.set([{ deviceId: 'top_grow' }]);
            mockStore.data.$nutrientPresets.set({
                'veg': { stage: 'veg', min_days_in_stage: 5 }
            });
            element.plant = {
                attributes: {
                    plant_id: 'p1',
                    growspace_id: 'top_grow',
                    stage: 'veg',
                    days_in_stage: 6
                }
            } as any;
            expect(element._hasRecommendedPreset).toBe(true);
        });
    });

    describe('_isRecentlyWatered', () => {
        it('should return false if last_watered attribute is missing', () => {
            element.plant = { attributes: { plant_id: 'p1' } } as any;
            expect(element._isRecentlyWatered).toBe(false);
        });

        it('should return true if watered within 24 hours', () => {
            const recentDate = new Date();
            recentDate.setHours(recentDate.getHours() - 1);
            element.plant = {
                attributes: {
                    plant_id: 'p1',
                    last_watered: recentDate.toISOString()
                }
            } as any;
            expect(element._isRecentlyWatered).toBe(true);
        });

        it('should return false if watered more than 24 hours ago', () => {
            const oldDate = new Date();
            oldDate.setHours(oldDate.getHours() - 25);
            element.plant = {
                attributes: {
                    plant_id: 'p1',
                    last_watered: oldDate.toISOString()
                }
            } as any;
            expect(element._isRecentlyWatered).toBe(false);
        });
    });
});
