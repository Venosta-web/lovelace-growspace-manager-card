import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SubscriptionController } from '../../src/controllers/subscription-controller';
import { ReactiveControllerHost } from 'lit';
import { GrowspaceDataStore } from '../../src/store/core/data-store';
import { HomeAssistant } from 'custom-card-helpers';

// Mock data-store class
vi.mock('../../src/store/core/data-store', () => {
    return {
        GrowspaceDataStore: class {
            $selectedDevice = { get: vi.fn(), set: vi.fn(), subscribe: vi.fn() };
            $devices = { get: vi.fn(), set: vi.fn(), subscribe: vi.fn() };
            $wsDataCache = { get: vi.fn(), set: vi.fn(), subscribe: vi.fn() };
            removePlantFromWsCache = vi.fn();
            updateWsDataCacheGrid = vi.fn((gsId: string, callback: (grid: any) => void) => {
                // Invoke the callback to cover line 82
                const mockGrid: Record<string, any> = {};
                callback(mockGrid);
            });
            constructor() {
                this.$wsDataCache.set({});
            }
        }
    };
});

describe('SubscriptionController', () => {
    let mockHost: ReactiveControllerHost;
    let controller: SubscriptionController;
    let mockHass: any;
    let mockUnsub: any;
    let mockOnUpdate: any;
    let mockDataStore: GrowspaceDataStore;

    beforeEach(() => {
        mockHost = {
            addController: vi.fn(),
            requestUpdate: vi.fn(),
        } as unknown as ReactiveControllerHost;

        mockUnsub = vi.fn();
        mockHass = {
            connection: {
                subscribeEvents: vi.fn().mockResolvedValue(mockUnsub),
            },
        };
        mockOnUpdate = vi.fn();

        // Instantiate the mocked store
        mockDataStore = new GrowspaceDataStore();

        controller = new SubscriptionController(mockHost, mockDataStore, mockOnUpdate);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should add itself to host controllers', () => {
        expect(mockHost.addController).toHaveBeenCalledWith(controller);
    });

    describe('Lifecycle', () => {
        it('should subscribe on hostConnected if hass available', async () => {
            // Create fresh instance for this test
            controller = new SubscriptionController(mockHost, mockDataStore);
            (controller as any)._hass = mockHass;

            await controller.hostConnected();

            expect(mockHass.connection.subscribeEvents).toHaveBeenCalledWith(expect.any(Function), 'growspace_manager_updated');
        });

        it('should NOT subscribe on hostConnected if hass NOT available', async () => {
            // Create fresh instance
            controller = new SubscriptionController(mockHost, mockDataStore);
            // _hass is undefined

            await controller.hostConnected();

            expect(mockHass.connection.subscribeEvents).not.toHaveBeenCalled();
        });

        it('should subscribe when updateHass is called', () => {
            // Fresh instance
            controller = new SubscriptionController(mockHost, mockDataStore);

            controller.updateHass(mockHass);

            expect(mockHass.connection.subscribeEvents).toHaveBeenCalledWith(expect.any(Function), 'growspace_manager_updated');
        });

        it('should unsubscribe on hostDisconnected', async () => {
            controller = new SubscriptionController(mockHost, mockDataStore);
            controller.updateHass(mockHass);

            // Wait for subscription promise handling? 
            // In the real code `_unsubEvents` is set asynchronously.
            // But tests often mock resolved value immediately.
            // Let's manually set _unsubEvents to simulate successful subscription
            (controller as any)._unsubEvents = mockUnsub;

            controller.hostDisconnected();
            expect(mockUnsub).toHaveBeenCalled();
            expect((controller as any)._unsubEvents).toBeUndefined();
        });
    });

    describe('Event Handling', () => {
        let eventHandler: (event: any) => void;

        beforeEach(async () => {
            controller.updateHass(mockHass);
            // Get the callback passed to subscribeEvents
            const call = (mockHass.connection.subscribeEvents as any).mock.calls[0];
            eventHandler = call[0];
        });

        it('should handle plant_added/updated events', () => {
            const plantData = {
                plant_id: 'plant123',
                growspace_id: 'gs1',
                row: 1,
                col: 2,
                attributes: {}
            };
            const event = {
                data: {
                    event_type: 'plant_updated',
                    data: { plant: plantData }
                }
            };

            eventHandler(event);

            expect(mockDataStore.removePlantFromWsCache).toHaveBeenCalledWith('plant123');
            expect(mockDataStore.updateWsDataCacheGrid).toHaveBeenCalledWith('gs1', expect.any(Function));
            expect(mockOnUpdate).toHaveBeenCalled();
        });

        it('should handle plant_removed events', () => {
            const event = {
                data: {
                    event_type: 'plant_removed',
                    data: { plant_id: 'plant123', growspace_id: 'gs1' }
                }
            };

            eventHandler(event);

            expect(mockDataStore.removePlantFromWsCache).toHaveBeenCalledWith('plant123', 'gs1');
            expect(mockOnUpdate).toHaveBeenCalled();
        });

        it('should handle plant update with growspace_id in attributes', () => {
            const plantData = {
                plant_id: 'plant456',
                row: 0,
                col: 0,
                attributes: { growspace_id: 'gs2' }
            };
            const event = {
                data: {
                    event_type: 'plant_added',
                    data: { plant: plantData }
                }
            };

            eventHandler(event);

            expect(mockDataStore.updateWsDataCacheGrid).toHaveBeenCalledWith('gs2', expect.any(Function));
        });

        it('should not update grid when growspace_id is missing', () => {
            const plantData = {
                plant_id: 'plant789',
                row: 0,
                col: 0,
                attributes: {}
            };
            const event = {
                data: {
                    event_type: 'plant_updated',
                    data: { plant: plantData }
                }
            };

            vi.clearAllMocks();
            eventHandler(event);

            expect(mockDataStore.removePlantFromWsCache).toHaveBeenCalledWith('plant789');
            expect(mockDataStore.updateWsDataCacheGrid).not.toHaveBeenCalled();
        });

        it('should handle unknown event types gracefully', () => {
            const event = {
                data: {
                    event_type: 'unknown_event',
                    data: {}
                }
            };

            expect(() => eventHandler(event)).not.toThrow();
        });
    });

    describe('Subscription Edge Cases', () => {
        it('should not subscribe if already subscribed', async () => {
            controller = new SubscriptionController(mockHost, mockDataStore);
            (controller as any)._unsubEvents = vi.fn();

            await controller.subscribe(mockHass);

            expect(mockHass.connection.subscribeEvents).not.toHaveBeenCalled();
        });

        it('should not subscribe if hass is null', async () => {
            controller = new SubscriptionController(mockHost, mockDataStore);

            await controller.subscribe(null as any);

            expect(mockHass.connection.subscribeEvents).not.toHaveBeenCalled();
        });

        it('should handle subscription error', async () => {
            const errorHass = {
                connection: {
                    subscribeEvents: vi.fn().mockRejectedValue(new Error('Connection failed'))
                }
            };

            controller = new SubscriptionController(mockHost, mockDataStore);
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            await controller.subscribe(errorHass as any);

            expect(consoleSpy).toHaveBeenCalledWith('Failed to subscribe to growspace events', expect.any(Error));
            consoleSpy.mockRestore();
        });

        it('should not call unsub in hostDisconnected if not subscribed', () => {
            controller = new SubscriptionController(mockHost, mockDataStore);
            // _unsubEvents is undefined

            expect(() => controller.hostDisconnected()).not.toThrow();
        });

        it('should not subscribe again when updateHass called with same hass', () => {
            controller = new SubscriptionController(mockHost, mockDataStore);
            (controller as any)._hass = mockHass;
            (controller as any)._unsubEvents = vi.fn(); // Already subscribed

            vi.clearAllMocks();
            controller.updateHass(mockHass);

            expect(mockHass.connection.subscribeEvents).not.toHaveBeenCalled();
        });

        it('should not resubscribe when updateHass called with different hass but already subscribed', () => {
            controller = new SubscriptionController(mockHost, mockDataStore);
            (controller as any)._hass = { connection: {} }; // Different hass
            (controller as any)._unsubEvents = vi.fn(); // Already subscribed

            vi.clearAllMocks();
            controller.updateHass(mockHass);

            // Should update _hass but NOT call subscribe because _unsubEvents exists
            expect((controller as any)._hass).toBe(mockHass);
            expect(mockHass.connection.subscribeEvents).not.toHaveBeenCalled();
        });
    });

    describe('Without onUpdate callback', () => {
        it('should not throw when onUpdate is not provided', async () => {
            const controllerWithoutCallback = new SubscriptionController(mockHost, mockDataStore);
            controllerWithoutCallback.updateHass(mockHass);

            // Get handler
            const call = (mockHass.connection.subscribeEvents as any).mock.calls[0];
            const handler = call[0];

            const event = {
                data: {
                    event_type: 'plant_updated',
                    data: { plant: { plant_id: 'x', growspace_id: 'g', row: 0, col: 0 } }
                }
            };

            expect(() => handler(event)).not.toThrow();
        });
    });
});
