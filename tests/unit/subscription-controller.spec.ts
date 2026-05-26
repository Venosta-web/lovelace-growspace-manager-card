import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SubscriptionController } from '../../src/controllers/subscription-controller';
import { GrowspaceDataStore } from '../../src/store/core/data-store';
import { ReactiveControllerHost } from 'lit';

describe('SubscriptionController', () => {
    let host: ReactiveControllerHost;
    let dataStore: any;
    let hass: any;
    let controller: SubscriptionController;
    let onUpdate: any;
    let unsubMock: any;

    beforeEach(() => {
        vi.clearAllMocks();

        host = {
            addController: vi.fn(),
            requestUpdate: vi.fn(),
        } as unknown as ReactiveControllerHost;

        dataStore = {
            removePlantFromWsCache: vi.fn(),
            updateWsDataCacheGrid: vi.fn(),
        };

        unsubMock = vi.fn();

        hass = {
            connection: {
                subscribeEvents: vi.fn().mockResolvedValue(unsubMock)
            }
        };

        onUpdate = vi.fn();

        controller = new SubscriptionController(host, dataStore, onUpdate);
    });

    it('should register itself with host', () => {
        expect(host.addController).toHaveBeenCalledWith(controller);
    });

    describe('Lifecycle', () => {
        it('should subscribe on hostConnected if hass is present', () => {
            controller = new SubscriptionController(host, dataStore, onUpdate);
            controller['_hass'] = hass;

            controller.hostConnected();
            expect(hass.connection.subscribeEvents).toHaveBeenCalledWith(expect.any(Function), 'growspace_manager_updated');
        });

        it('should unsubscribe on hostDisconnected', async () => {
            controller.updateHass(hass);
            await new Promise(resolve => setTimeout(resolve, 0));

            controller.hostDisconnected();
            expect(unsubMock).toHaveBeenCalled();
        });

        it('should handle updateHass', async () => {
            controller.updateHass(hass);
            expect(hass.connection.subscribeEvents).toHaveBeenCalled();

            vi.clearAllMocks();
            controller.updateHass(hass);
            expect(hass.connection.subscribeEvents).not.toHaveBeenCalled();
        });
    });

    describe('Event Handling', () => {
        let callback: (event: any) => void;

        beforeEach(async () => {
            // Capture the callback
            hass.connection.subscribeEvents.mockImplementation((cb: any) => {
                callback = cb;
                return Promise.resolve(unsubMock);
            });
            await controller.subscribe(hass);
        });

        it('should handle plant_added event', () => {
            const event = {
                data: {
                    event_type: 'plant_added',
                    data: {
                        plant: {
                            plant_id: 'p1',
                            growspace_id: 'gs1',
                            row: 1,
                            col: 1
                        }
                    }
                }
            };

            callback(event);

            expect(dataStore.removePlantFromWsCache).toHaveBeenCalledWith('p1');
            expect(dataStore.updateWsDataCacheGrid).toHaveBeenCalledWith('gs1', expect.any(Function));
            expect(onUpdate).toHaveBeenCalledWith(false);
        });

        it('should handle plant_removed event', () => {
            const event = {
                data: {
                    event_type: 'plant_removed',
                    data: {
                        plant_id: 'p1',
                        growspace_id: 'gs1'
                    }
                }
            };

            callback(event);

            expect(dataStore.removePlantFromWsCache).toHaveBeenCalledWith('p1', 'gs1');
            expect(onUpdate).toHaveBeenCalledWith(false);
        });

        it('should handle growspace_manager_updated event (generic refresh)', () => {
            const event = {
                data: {
                    event_type: 'growspace_manager_updated',
                    data: {}
                }
            };

            callback(event);
            expect(onUpdate).toHaveBeenCalledWith(true);
        });

        it('should ignore malformed events', () => {
            const event = { data: null };
            callback(event);
            expect(onUpdate).not.toHaveBeenCalled();
        });

        it('should warn if plant event missing plant_id', () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => { });
            const event = {
                data: {
                    event_type: 'plant_updated',
                    data: {
                        plant: {}
                    }
                }
            };
            callback(event);
            expect(spy).toHaveBeenCalled();
            expect(dataStore.removePlantFromWsCache).not.toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        it('should handle subscribe failure gracefully', async () => {
            // Fresh controller
            const c = new SubscriptionController(host, dataStore, onUpdate);
            hass.connection.subscribeEvents.mockRejectedValue(new Error('Fail'));
            const spy = vi.spyOn(console, 'error').mockImplementation(() => { });

            await c.subscribe(hass);
            expect(spy).toHaveBeenCalled();
        });

        it('should not subscribe if hass missing in hostConnected', () => {
            controller = new SubscriptionController(host, dataStore, onUpdate);
            controller.hostConnected();
            expect(hass.connection.subscribeEvents).not.toHaveBeenCalled();
        });

        it('should not update cache if row/col missing in plant update', async () => {
            const c = new SubscriptionController(host, dataStore, onUpdate);

            hass.connection.subscribeEvents.mockImplementation((cb: any) => {
                cb({
                    data: {
                        event_type: 'plant_updated',
                        data: {
                            plant: {
                                plant_id: 'p1',
                                growspace_id: 'gs1',
                                // missing row/col
                            }
                        }
                    }
                });
                return Promise.resolve(unsubMock);
            });

            await c.subscribe(hass);

            expect(dataStore.removePlantFromWsCache).toHaveBeenCalledWith('p1');
            expect(dataStore.updateWsDataCacheGrid).not.toHaveBeenCalled();
        });

        it('should invoke the grid update callback when gsId, row and col are all present', async () => {
            let capturedCallback: ((event: unknown) => void) | undefined;
            hass.connection.subscribeEvents.mockImplementation((cb: any) => {
                capturedCallback = cb;
                return Promise.resolve(unsubMock);
            });
            await controller.subscribe(hass);

            // Make dataStore.updateWsDataCacheGrid actually invoke the callback
            const grid: Record<string, unknown> = {};
            dataStore.updateWsDataCacheGrid.mockImplementation((_gsId: string, cb: (g: Record<string, unknown>) => void) => {
                cb(grid);
            });

            const plantData = { plant_id: 'p1', growspace_id: 'gs1', row: 2, col: 3 };
            capturedCallback!({
                data: {
                    event_type: 'plant_added',
                    data: { plant: plantData },
                },
            });

            expect(dataStore.updateWsDataCacheGrid).toHaveBeenCalledWith('gs1', expect.any(Function));
            expect(grid['position_2_3']).toBe(plantData);
        });
    });
});
