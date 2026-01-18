import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GrowspaceDataStore } from '../../src/store/data-store';

describe('DataStore', () => {
    let store: GrowspaceDataStore;

    beforeEach(() => {
        store = new GrowspaceDataStore();
    });

    it('should set devices and rebuild plant map', () => {
        const devices = [
            {
                deviceId: 'd1',
                plants: [
                    { attributes: { plant_id: 'p1' }, entity_id: 'sensor.p1' },
                    { attributes: {}, entity_id: 'sensor.p2' } // Fallback to entity_id
                ]
            }
        ] as any[];
        store.setDevices(devices);
        expect(store.$devices.get()).toEqual(devices);

        const map = store.$plantToDeviceMap.get();
        expect(map.get('p1')).toBe('d1');
        expect(map.get('p2')).toBe('d1');
    });

    it('should set nutrient presets', () => {
        const presets = { 'p1': { id: 'p1', name: 'Preset 1' } } as any;
        store.setNutrientPresets(presets);
        expect(store.$nutrientPresets.get()).toEqual(presets);
    });

    it('should set ipm presets', () => {
        const presets = { 'p1': { id: 'p1', name: 'IPM 1' } } as any;
        store.setIPMPresets(presets);
        expect(store.$ipmPresets.get()).toEqual(presets);
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

    it('should skip devices with no plants in setDevices', () => {
        const devices = [{ deviceId: 'd1', plants: null }] as any[];
        store.setDevices(devices);
        expect(store.$devices.get()).toEqual(devices);
        expect(store.$plantToDeviceMap.get().size).toBe(0);
    });

    it('should skip growspaces with no grid in removePlantFromWsCache', () => {
        const initialCache = {
            gs1: { grid: null }
        } as any;
        store.$wsDataCache.set(initialCache);

        store.removePlantFromWsCache('p1');
        expect(store.$wsDataCache.get()).toBe(initialCache);
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

        it('should remove plant from ws cache using plant map optimization', () => {
            const initialCache = {
                gs1: {
                    grid: {
                        '1-1': { plant_id: 'p1' }
                    }
                }
            } as any;
            store.$wsDataCache.set(initialCache);

            // Manually populate the map to simulate lookup capability
            const map = new Map<string, string>();
            map.set('p1', 'gs1');
            store.$plantToDeviceMap.set(map);

            store.removePlantFromWsCache('p1');

            const updated = store.$wsDataCache.get();
            expect(updated!.gs1.grid['1-1']).toBeNull();
        });
    });



    describe('Optimization & Edge Cases', () => {
        it('should use _ts for change comparison in setWsDataCache', () => {
            const cacheA = {
                gs1: { _ts: 123, grid: { '1': { id: 'p1' } } }
            } as any;
            const cacheB = {
                gs1: { _ts: 123, grid: { '1': { id: 'p1' } } }
            } as any;

            store.$wsDataCache.set(cacheA);

            // Same timestamp -> Should NOT update, even if object ref different
            store.setWsDataCache(cacheB);
            expect(store.$wsDataCache.get()).toBe(cacheA); // Strict equality check

            // Same reference -> Should definitely return early
            store.setWsDataCache(cacheA);
            expect(store.$wsDataCache.get()).toBe(cacheA);

            // Different timestamp -> Should update
            const cacheC = {
                gs1: { _ts: 124, grid: { '1': { id: 'p1' } } }
            } as any;
            store.setWsDataCache(cacheC);
            expect(store.$wsDataCache.get()).toBe(cacheC);
        });

        it('should fallback to deep compare if _ts missing in setWsDataCache', () => {
            const cacheA = { gs1: { grid: { a: 1 } } } as any;
            const cacheB = { gs1: { grid: { a: 1 } } } as any;

            store.$wsDataCache.set(cacheA);

            // Deep equal -> Should NOT update
            store.setWsDataCache(cacheB);
            expect(store.$wsDataCache.get()).toBe(cacheA);

            // Deep different -> Should update
            const cacheC = { gs1: { grid: { a: 2 } } } as any;
            store.setWsDataCache(cacheC);
            expect(store.$wsDataCache.get()).toBe(cacheC);
        });

        it('should fallback to scan if plantToDeviceMap is inconsistent', () => {
            const initialCache = {
                gs1: { grid: { '1-1': { plant_id: 'p1' } } },
                gs2: { grid: { '1-1': { plant_id: 'p1' } } } // p1 shouldn't be here ideally, but simulating duplication/error
            } as any;
            store.$wsDataCache.set(initialCache);

            // Map says p1 is in gs3 (which doesn't exist in cache)
            const map = new Map<string, string>();
            map.set('p1', 'gs3');
            store.$plantToDeviceMap.set(map);

            // Should fallback to scanning all growspaces and remove p1 from gs1 and gs2
            store.removePlantFromWsCache('p1');

            const updated = store.$wsDataCache.get();
            expect(updated?.gs1?.grid['1-1']).toBeNull();
            expect(updated?.gs2?.grid['1-1']).toBeNull();
        });

        it('should handle plant_id from attributes case in setDevices', () => {
            const devices = [
                {
                    deviceId: 'd100',
                    plants: [
                        { variables: {}, attributes: { plant_id: 'p100' }, entity_id: 'sensor.ignore_me' }
                    ]
                }
            ] as any[];
            store.setDevices(devices);
            expect(store.$plantToDeviceMap.get().get('p100')).toBe('d100');
        });

        it('should detect changes when keys are different but count is same', () => {
            // Covers lines 116-118
            const cacheA = { gs1: { grid: {} } } as any;
            const cacheB = { gs2: { grid: {} } } as any; // Different key, same length (1)

            store.$wsDataCache.set(cacheA);
            store.setWsDataCache(cacheB);

            expect(store.$wsDataCache.get()).toBe(cacheB); // Should update
        });
    });

    describe('Lifecycle & Status', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
            vi.restoreAllMocks();
        });

        it('should track active status based on subscribers', async () => {
            const consoleSpy = vi.spyOn(console, 'debug');

            // Subscribe
            const unsubscribe = store.$devices.subscribe(() => { });
            expect(store.isActive).toBe(true);
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Mounted'));

            // Unsubscribing all should trigger clean up
            unsubscribe();

            // Fast-forward past nanostores stop delay
            vi.advanceTimersByTime(1100);

            expect(store.isActive).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unmounted'));
        });

        it('should set nutrient inventory', () => {
            const inventory = { stock: [] } as any;
            store.setNutrientInventory(inventory);
            expect(store.$nutrientInventory.get()).toEqual(inventory);
        });
    });
});
