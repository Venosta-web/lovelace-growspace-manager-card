import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SubscriptionController } from '../../src/controllers/subscription-controller';
import { ReactiveControllerHost } from 'lit';
import * as dataStore from '../../src/store/data-store';
import { HomeAssistant } from 'custom-card-helpers';

describe('SubscriptionController', () => {
    let mockHost: ReactiveControllerHost;
    let controller: SubscriptionController;
    let mockHass: any;
    let mockUnsub: any;
    let mockOnUpdate: any;

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

        dataStore.$wsDataCache.set({});
        vi.spyOn(dataStore, 'updateWsDataCacheGrid');
        vi.spyOn(dataStore, 'removePlantFromWsCache');

        controller = new SubscriptionController(mockHost, mockOnUpdate);
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
            controller = new SubscriptionController(mockHost);
            (controller as any)._hass = mockHass;

            await controller.hostConnected();

            expect(mockHass.connection.subscribeEvents).toHaveBeenCalledWith(expect.any(Function), 'growspace_manager_updated');
        });

        it('should NOT subscribe on hostConnected if hass NOT available', async () => {
            // Create fresh instance
            controller = new SubscriptionController(mockHost);
            // _hass is undefined

            await controller.hostConnected();

            expect(mockHass.connection.subscribeEvents).not.toHaveBeenCalled();
        });

        it('should subscribe when updateHass is called', () => {
            // Fresh instance
            controller = new SubscriptionController(mockHost);

            controller.updateHass(mockHass);

            expect(mockHass.connection.subscribeEvents).toHaveBeenCalledWith(expect.any(Function), 'growspace_manager_updated');
        });

        it('should unsubscribe on hostDisconnected', async () => {
            controller = new SubscriptionController(mockHost);
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

            expect(dataStore.removePlantFromWsCache).toHaveBeenCalledWith('plant123');
            expect(dataStore.updateWsDataCacheGrid).toHaveBeenCalledWith('gs1', expect.any(Function));
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

            expect(dataStore.removePlantFromWsCache).toHaveBeenCalledWith('plant123', 'gs1');
            expect(mockOnUpdate).toHaveBeenCalled();
        });
    });
});
