
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as dataStore from '../../src/store/data-store';

describe('DataStore', () => {
    beforeEach(() => {
        // Reset atoms
        dataStore.$devices.set([]);
        dataStore.$strainLibrary.set([]);
        dataStore.$config.set({} as any);
        dataStore.$optimisticDeletedPlantIds.set(new Set());
        dataStore.$selectedDevice.set(null);
        dataStore.$wsDataCache.set({});
    });

    it('should set devices', () => {
        const devices = [{ device_id: 'd1' }] as any[];
        dataStore.setDevices(devices);
        expect(dataStore.$devices.get()).toEqual(devices);
    });

    it('should set selected device', () => {
        dataStore.setSelectedDevice('d1');
        expect(dataStore.$selectedDevice.get()).toBe('d1');

        dataStore.setSelectedDevice(null);
        expect(dataStore.$selectedDevice.get()).toBeNull();
    });

    it('should set config', () => {
        const config = { default_growspace: 'd1' } as any;
        dataStore.setConfig(config);
        expect(dataStore.$config.get()).toEqual(config);
    });

    it('should set strain library', () => {
        const lib = [{ strain: 'A' }] as any[];
        dataStore.setStrainLibrary(lib);
        expect(dataStore.$strainLibrary.get()).toEqual(lib);
    });

    it('should manage optimistic deleted plant IDs', () => {
        const initial = new Set(['p1']);
        dataStore.setOptimisticDeletedPlantIds(initial);
        expect(dataStore.$optimisticDeletedPlantIds.get()).toEqual(initial);

        dataStore.addOptimisticDeletedPlantId('p2');
        expect(dataStore.$optimisticDeletedPlantIds.get().has('p1')).toBe(true);
        expect(dataStore.$optimisticDeletedPlantIds.get().has('p2')).toBe(true);

        dataStore.removeOptimisticDeletedPlantId('p1');
        expect(dataStore.$optimisticDeletedPlantIds.get().has('p1')).toBe(false);
        expect(dataStore.$optimisticDeletedPlantIds.get().has('p2')).toBe(true);

        // Remove non-existent
        dataStore.removeOptimisticDeletedPlantId('p99');
        expect(dataStore.$optimisticDeletedPlantIds.get().size).toBe(1);
    });

    describe('WS Data Cache', () => {
        it('should set ws data cache', () => {
            const cache = { gs1: { grid: {} } } as any;
            dataStore.setWsDataCache(cache);
            expect(dataStore.$wsDataCache.get()).toEqual(cache);
        });

        it('should update ws data cache grid', () => {
            const initialCache = {
                gs1: {
                    grid: {
                        '1-1': { plant_id: 'p1' }
                    }
                }
            } as any;
            dataStore.$wsDataCache.set(initialCache);

            dataStore.updateWsDataCacheGrid('gs1', (grid) => {
                grid['1-1'].plant_id = 'p1-updated';
                grid['1-2'] = { plant_id: 'p2' };
            });

            const updated = dataStore.$wsDataCache.get();
            expect(updated.gs1.grid['1-1'].plant_id).toBe('p1-updated');
            expect(updated.gs1.grid['1-2'].plant_id).toBe('p2');

            // Immutability check
            expect(updated).not.toBe(initialCache);
            expect(updated.gs1).not.toBe(initialCache.gs1);
            expect(updated.gs1.grid).not.toBe(initialCache.gs1.grid);
        });

        it('should ignore update if growspace not in cache', () => {
            const initialCache = { gs1: {} } as any;
            dataStore.$wsDataCache.set(initialCache);

            const mutator = vi.fn();
            dataStore.updateWsDataCacheGrid('gs2', mutator);

            expect(mutator).not.toHaveBeenCalled();
            expect(dataStore.$wsDataCache.get()).toBe(initialCache);
        });

        it('should remove plant from ws cache (specific growspace)', () => {
            const initialCache = {
                gs1: {
                    grid: {
                        '1-1': { plant_id: 'p1' },
                        '1-2': { plant_id: 'p2' }
                    }
                },
                gs2: {
                    grid: {
                        '1-1': { plant_id: 'p1' }
                    }
                }
            } as any;
            dataStore.$wsDataCache.set(initialCache);

            // Remove p1 from gs1 only
            dataStore.removePlantFromWsCache('p1', 'gs1');

            const updated = dataStore.$wsDataCache.get();
            expect(updated.gs1.grid['1-1']).toBeNull();
            expect(updated.gs1.grid['1-2'].plant_id).toBe('p2');
            expect(updated.gs2.grid['1-1'].plant_id).toBe('p1'); // Should check only gs1
        });

        it('should remove plant from ws cache (all growspaces)', () => {
            const initialCache = {
                gs1: {
                    grid: { '1-1': { plant_id: 'p1' }, '1-2': { plant_id: 'p2' } }
                },
                gs2: {
                    grid: { '1-1': { entity_id: 'sensor.plant_p1' } } // Pattern match check
                }
            } as any;
            dataStore.$wsDataCache.set(initialCache);

            dataStore.removePlantFromWsCache('p1');

            const updated = dataStore.$wsDataCache.get();
            expect(updated.gs1.grid['1-1']).toBeNull();
            expect(updated.gs1.grid['1-2'].plant_id).toBe('p2');
            expect(updated.gs2.grid['1-1']).toBeNull(); // Matched by entity_id suffix logic in store
        });

        it('should not update cache if plant not found', () => {
            const initialCache = {
                gs1: { grid: { '1-1': { plant_id: 'p2' } } }
            } as any;
            dataStore.$wsDataCache.set(initialCache);

            dataStore.removePlantFromWsCache('p1');

            expect(dataStore.$wsDataCache.get()).toBe(initialCache); // strict equality check for no change
        });
    });
});
