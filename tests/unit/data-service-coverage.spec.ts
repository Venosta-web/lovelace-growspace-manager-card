import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataService } from '../../src/data-service';
import { HomeAssistant } from 'custom-card-helpers';
import { WS_TYPE_GET_DATA, WS_TYPE_GET_NUTRIENT_INVENTORY } from '../../src/constants';

describe('DataService Coverage Gap Fill', () => {
    let service: DataService;
    let mockHass: HomeAssistant;

    beforeEach(() => {
        service = new DataService();
        mockHass = {
            states: {},
            connection: {
                sendMessagePromise: vi.fn().mockResolvedValue({}),
            },
            callService: vi.fn(),
        } as any;
        service.updateHass(mockHass);
    });

    describe('fetchGrowspaceData Cache', () => {
        it('should return cached data if called twice within TTL', async () => {
            const mockData = { growspace_id: 'gs1', name: 'Cached GS' };
            // First call - should hit API
            (mockHass.connection.sendMessagePromise as any).mockResolvedValueOnce(mockData);

            const result1 = await service.fetchGrowspaceData('gs1');
            expect(result1).toEqual(mockData);
            expect(mockHass.connection.sendMessagePromise).toHaveBeenCalledTimes(1);

            // Second call - should hit Cache (no new API call)
            const result2 = await service.fetchGrowspaceData('gs1');
            expect(result2).toEqual(mockData);
            expect(mockHass.connection.sendMessagePromise).toHaveBeenCalledTimes(1); // Call count remains 1
        });
    });

    describe('getStrainLibrary Entity Lookup', () => {
        it('should find library in known entity sensor.strain_library', () => {
            service.hass = {
                states: {
                    'sensor.strain_library': {
                        attributes: {
                            strains: ['Strain A', 'Strain B']
                        }
                    }
                }
            } as any;

            const strains = service.getStrainLibrary();
            expect(strains).toHaveLength(2);
            expect(strains[0].strain).toBe('Strain A');
        });

        it('should find library in known entity sensor.growspace_manager_strain_library', () => {
            service.hass = {
                states: {
                    'sensor.growspace_manager_strain_library': {
                        attributes: {
                            strains: ['Strain C']
                        }
                    }
                }
            } as any;

            const strains = service.getStrainLibrary();
            expect(strains).toHaveLength(1);
            expect(strains[0].strain).toBe('Strain C');
        });
    });

    describe('invalidateCache', () => {
        it('should invalidate specific growspace and collection', () => {
            (service as any)._cache.set('g1', { data: {}, timestamp: Date.now() });
            (service as any)._cache.set('__all__', { data: {}, timestamp: Date.now() });
            (service as any)._cache.set('g2', { data: {}, timestamp: Date.now() });

            service.invalidateCache('g1');

            expect((service as any)._cache.has('g1')).toBe(false);
            expect((service as any)._cache.has('__all__')).toBe(false);
            expect((service as any)._cache.has('g2')).toBe(true);
        });

        it('should invalidate all if no ID provided', () => {
            (service as any)._cache.set('g1', { data: {}, timestamp: Date.now() });
            service.invalidateCache();
            expect((service as any)._cache.size).toBe(0);
        });
    });

    describe('fetchNutrientInventory', () => {
        it('should strictly return parsed data on success', async () => {
            const mockInventory = {
                nutrients: {
                    'n1': { id: 'n1', name: 'N1', type: 'Bottle', current_ml: 100, initial_ml: 1000 }
                }
            };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(mockInventory);

            const result = await service.fetchNutrientInventory();
            expect(result).toEqual(mockInventory);
            expect(mockHass.connection.sendMessagePromise).toHaveBeenCalledWith({
                type: WS_TYPE_GET_NUTRIENT_INVENTORY
            });
        });
    });
});
