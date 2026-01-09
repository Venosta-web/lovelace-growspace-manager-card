import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GrowspaceDataStore } from '../../src/store/data-store';

describe('DataStore', () => {
    let store: GrowspaceDataStore;

    beforeEach(() => {
        store = new GrowspaceDataStore();
    });

    it('should set devices', () => {
        const devices = [{ device_id: 'd1' }] as any[];
        store.setDevices(devices);
        expect(store.$devices.get()).toEqual(devices);
    });

    it('should set selected device', () => {
        store.setSelectedDevice('d1');
        expect(store.$selectedDevice.get()).toBe('d1');

        store.setSelectedDevice(null);
        expect(store.$selectedDevice.get()).toBeNull();
    });

    it('should set config', () => {
        const config = { default_growspace: 'd1' } as any;
        store.setConfig(config);
        expect(store.$config.get()).toEqual(config);
    });

    it('should set strain library', () => {
        const lib = [{ strain: 'A' }] as any[];
        store.setStrainLibrary(lib);
        expect(store.$strainLibrary.get()).toEqual(lib);
    });

    it('should manage optimistic deleted plant IDs', () => {
        // Test the setOptimisticDeletedPlantIds action method
        const initial = new Set(['p1']);
        store.setOptimisticDeletedPlantIds(initial);
        expect(store.$optimisticDeletedPlantIds.get()).toEqual(initial);

        store.addOptimisticDeletedPlantId('p2');
        expect(store.$optimisticDeletedPlantIds.get().has('p1')).toBe(true);
        expect(store.$optimisticDeletedPlantIds.get().has('p2')).toBe(true);

        store.removeOptimisticDeletedPlantId('p1');
        expect(store.$optimisticDeletedPlantIds.get().has('p1')).toBe(false);
        expect(store.$optimisticDeletedPlantIds.get().has('p2')).toBe(true);

        // Remove non-existent
        store.removeOptimisticDeletedPlantId('p99');
        expect(store.$optimisticDeletedPlantIds.get().size).toBe(1);
    });

    describe('WS Data Cache', () => {
        it('should set ws data cache', () => {
            const cache = { gs1: { grid: {} } } as any;
            store.setWsDataCache(cache);
            expect(store.$wsDataCache.get()).toEqual(cache);
        });

        it('should update ws data cache grid', () => {
            const initialCache = {
                gs1: {
                    grid: {
                        '1-1': { plant_id: 'p1' }
                    }
                }
            } as any;
            store.$wsDataCache.set(initialCache);

            store.updateWsDataCacheGrid('gs1', (grid) => {
                grid['1-1'].plant_id = 'p1-updated';
                grid['1-2'] = { plant_id: 'p2' };
            });

            const updated = store.$wsDataCache.get();
            expect(updated!.gs1.grid['1-1']!.plant_id).toBe('p1-updated');
            expect(updated!.gs1.grid['1-2']!.plant_id).toBe('p2');

            // Immutability check
            expect(updated).not.toBe(initialCache);
            expect(updated.gs1).not.toBe(initialCache.gs1);
            expect(updated.gs1.grid).not.toBe(initialCache.gs1.grid);
        });

        it('should ignore update if growspace not in cache', () => {
            const initialCache = { gs1: {} } as any;
            store.$wsDataCache.set(initialCache);

            const mutator = vi.fn();
            store.updateWsDataCacheGrid('gs2', mutator);

            expect(mutator).not.toHaveBeenCalled();
            expect(store.$wsDataCache.get()).toBe(initialCache);
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
            store.$wsDataCache.set(initialCache);

            // Remove p1 from gs1 only
            store.removePlantFromWsCache('p1', 'gs1');

            const updated = store.$wsDataCache.get();
            expect(updated!.gs1.grid['1-1']).toBeNull();
            expect(updated!.gs1.grid['1-2']!.plant_id).toBe('p2');
            expect(updated!.gs2.grid['1-1']!.plant_id).toBe('p1'); // Should check only gs1
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
            store.$wsDataCache.set(initialCache);

            store.removePlantFromWsCache('p1');

            const updated = store.$wsDataCache.get();
            expect(updated!.gs1.grid['1-1']).toBeNull();
            expect(updated!.gs1.grid['1-2']!.plant_id).toBe('p2');
            expect(updated.gs2.grid['1-1']).toBeNull(); // Matched by entity_id suffix logic in store
        });

        it('should not update cache if plant not found', () => {
            const initialCache = {
                gs1: { grid: { '1-1': { plant_id: 'p2' } } }
            } as any;
            store.$wsDataCache.set(initialCache);

            store.removePlantFromWsCache('p1');

            expect(store.$wsDataCache.get()).toBe(initialCache); // strict equality check for no change
        });
    });

    describe('addPlantEvent', () => {
        it('should add event to plant by plant_id', () => {
            const initialCache = {
                gs1: {
                    grid: {
                        '1-1': { plant_id: 'p1', events: [] }
                    }
                }
            } as any;
            store.$wsDataCache.set(initialCache);

            const event = { type: 'action', action: 'water', date: '2023-01-05', label: 'Watered' };
            store.addPlantEvent('p1', event as any);

            const updated = store.$wsDataCache.get();
            expect(updated?.gs1?.grid['1-1']?.events).toHaveLength(1);
            expect(updated?.gs1?.grid['1-1']?.events?.[0]).toEqual(event);
        });

        it('should add event to plant by entity_id suffix', () => {
            const initialCache = {
                gs1: {
                    grid: {
                        '1-1': { entity_id: 'sensor.plant_p1', events: [] }
                    }
                }
            } as any;
            store.$wsDataCache.set(initialCache);

            const event = { type: 'milestone', label: 'Flowering' };
            store.addPlantEvent('p1', event as any);

            const updated = store.$wsDataCache.get();
            expect(updated!.gs1.grid['1-1']!.events).toHaveLength(1);
        });

        it('should create events array if not present', () => {
            const initialCache = {
                gs1: {
                    grid: {
                        '1-1': { plant_id: 'p1' } // No events array
                    }
                }
            } as any;
            store.$wsDataCache.set(initialCache);

            const event = { type: 'action', action: 'train' };
            store.addPlantEvent('p1', event as any);

            const updated = store.$wsDataCache.get();
            expect(updated!.gs1.grid['1-1']!.events).toHaveLength(1);
        });

        it('should not modify cache if plant not found', () => {
            const initialCache = {
                gs1: {
                    grid: {
                        '1-1': { plant_id: 'p2' }
                    }
                }
            } as any;
            store.$wsDataCache.set(initialCache);

            store.addPlantEvent('p1', { type: 'action' } as any);

            expect(store.$wsDataCache.get()).toBe(initialCache);
        });

        it('should skip growspaces with no grid', () => {
            const initialCache = {
                gs1: { grid: null },
                gs2: { grid: { '1-1': { plant_id: 'p1' } } }
            } as any;
            store.$wsDataCache.set(initialCache);

            const event = { type: 'action', action: 'water' };
            store.addPlantEvent('p1', event as any);

            const updated = store.$wsDataCache.get();
            expect(updated!.gs2.grid['1-1']!.events).toHaveLength(1);
        });

        it('should skip null plant entries in grid', () => {
            const initialCache = {
                gs1: {
                    grid: {
                        '1-1': null,
                        '1-2': { plant_id: 'p1' }
                    }
                }
            } as any;
            store.$wsDataCache.set(initialCache);

            const event = { type: 'action', action: 'water' };
            store.addPlantEvent('p1', event as any);

            const updated = store.$wsDataCache.get();
            expect(updated!.gs1.grid['1-1']).toBeNull();
            expect(updated!.gs1.grid['1-2']!.events).toHaveLength(1);
        });
    });
});
