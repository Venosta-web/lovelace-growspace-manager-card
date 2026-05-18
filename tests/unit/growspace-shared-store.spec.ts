import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GrowspaceSharedStore } from '../../src/store/core/growspace-shared-store';

const mockSubscribeEvents = vi.fn();
const mockUpdateHass = vi.fn();
const mockInvalidateCache = vi.fn();
const mockHistoryDestroy = vi.fn();
const mockRemovePlantFromWsCache = vi.fn();
const mockUpdateWsDataCacheGrid = vi.fn();

vi.mock('../../src/data-service', () => ({
    DataService: class {
        updateHass = mockUpdateHass;
        invalidateCache = mockInvalidateCache;
    },
}));

vi.mock('../../src/store/core/data-store', () => {
    const staleCounter = { value: 0 };
    return {
        GrowspaceDataStore: class {
            $wsDataCache = { get: vi.fn(() => ({})), set: vi.fn(), subscribe: vi.fn() };
            $staleCounter = {
                get: vi.fn(() => staleCounter.value),
                set: vi.fn((v: number) => { staleCounter.value = v; }),
                subscribe: vi.fn(() => () => {}),
            };
            removePlantFromWsCache = mockRemovePlantFromWsCache;
            updateWsDataCacheGrid = mockUpdateWsDataCacheGrid;
        },
    };
});

vi.mock('../../src/store/history/history-store', () => ({
    GrowspaceHistoryStore: class {
        destroy = mockHistoryDestroy;
    },
}));

function makeHass(subscribeEvents = mockSubscribeEvents) {
    return {
        connection: { subscribeEvents },
        states: {},
        language: 'en',
    } as any;
}

describe('GrowspaceSharedStore', () => {
    let store: GrowspaceSharedStore;

    beforeEach(() => {
        vi.clearAllMocks();
        store = new GrowspaceSharedStore();
    });

    describe('constructor', () => {
        it('creates data, history and dataService', () => {
            expect(store.data).toBeDefined();
            expect(store.history).toBeDefined();
            expect(store.dataService).toBeDefined();
        });
    });

    describe('updateHass', () => {
        it('calls dataService.updateHass with the hass instance', async () => {
            const hass = makeHass();
            store.updateHass(hass);
            expect(mockUpdateHass).toHaveBeenCalledWith(hass);
        });

        it('subscribes to HA events on first call', async () => {
            const hass = makeHass();
            store.updateHass(hass);
            await Promise.resolve();
            expect(mockSubscribeEvents).toHaveBeenCalledWith(
                expect.any(Function),
                'growspace_manager_updated'
            );
        });

        it('does not re-subscribe when called with the same hass reference', async () => {
            const hass = makeHass();
            store.updateHass(hass);
            await Promise.resolve();
            store.updateHass(hass);
            await Promise.resolve();
            expect(mockSubscribeEvents).toHaveBeenCalledTimes(1);
        });

        it('does not re-subscribe if already subscribed when called with a new hass reference', async () => {
            mockSubscribeEvents.mockResolvedValue(() => {});
            const hass1 = makeHass();
            store.updateHass(hass1);
            await Promise.resolve();
            const hass2 = makeHass();
            store.updateHass(hass2);
            await Promise.resolve();
            expect(mockSubscribeEvents).toHaveBeenCalledTimes(1);
        });

        it('logs an error and continues if subscribeEvents throws', async () => {
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            mockSubscribeEvents.mockRejectedValue(new Error('conn failed'));
            const hass = makeHass();
            store.updateHass(hass);
            await Promise.resolve();
            await Promise.resolve();
            expect(errorSpy).toHaveBeenCalled();
        });
    });

    describe('destroy', () => {
        it('calls history.destroy', () => {
            store.destroy();
            expect(mockHistoryDestroy).toHaveBeenCalled();
        });

        it('calls the HA unsubscribe function if subscribed', async () => {
            const unsub = vi.fn();
            mockSubscribeEvents.mockResolvedValue(unsub);
            const hass = makeHass();
            store.updateHass(hass);
            await Promise.resolve();
            await Promise.resolve();
            store.destroy();
            expect(unsub).toHaveBeenCalled();
        });

        it('does not throw if destroy is called before subscribing', () => {
            expect(() => store.destroy()).not.toThrow();
        });
    });

    describe('_handleEvent (via subscription callback)', () => {
        async function getEventHandler(): Promise<(event: unknown) => void> {
            mockSubscribeEvents.mockImplementation((handler: (e: unknown) => void) => {
                (store as any)._capturedHandler = handler;
                return Promise.resolve(() => {});
            });
            store.updateHass(makeHass());
            await Promise.resolve();
            await Promise.resolve();
            return (store as any)._capturedHandler;
        }

        it('logs a warning and returns for malformed events', async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const handler = await getEventHandler();
            handler({ data: { event_type: 123 } });
            expect(warnSpy).toHaveBeenCalled();
        });

        it('removes and re-adds plant data in DataStore cache on plant_added', async () => {
            const handler = await getEventHandler();
            const plantData = { plant_id: 'p1', growspace_id: 'gs1', row: 1, col: 2 };
            handler({ data: { event_type: 'plant_added', data: { plant: plantData } } });
            expect(mockRemovePlantFromWsCache).toHaveBeenCalledWith('p1');
            expect(mockUpdateWsDataCacheGrid).toHaveBeenCalledWith('gs1', expect.any(Function));
        });

        it('removes and re-adds plant data in DataStore cache on plant_updated', async () => {
            const handler = await getEventHandler();
            const plantData = { plant_id: 'p2', growspace_id: 'gs1', row: 0, col: 0 };
            handler({ data: { event_type: 'plant_updated', data: { plant: plantData } } });
            expect(mockRemovePlantFromWsCache).toHaveBeenCalledWith('p2');
        });

        it('removes plant from DataStore cache on plant_removed', async () => {
            const handler = await getEventHandler();
            handler({ data: { event_type: 'plant_removed', data: { plant_id: 'p3', growspace_id: 'gs1' } } });
            expect(mockRemovePlantFromWsCache).toHaveBeenCalledWith('p3', 'gs1');
        });

        it('logs a warning if plant_added event has no plant_id', async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const handler = await getEventHandler();
            handler({ data: { event_type: 'plant_added', data: { plant: {} } } });
            expect(warnSpy).toHaveBeenCalled();
            expect(mockUpdateWsDataCacheGrid).not.toHaveBeenCalled();
        });

        it('invalidates cache and increments $staleCounter on growspace_manager_updated', async () => {
            const handler = await getEventHandler();
            const prevCounter = store.data.$staleCounter.get();
            handler({ data: { event_type: 'growspace_manager_updated', data: {} } });
            expect(mockInvalidateCache).toHaveBeenCalled();
            expect(store.data.$staleCounter.set).toHaveBeenCalledWith(prevCounter + 1);
        });
    });
});
