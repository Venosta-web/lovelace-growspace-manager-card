import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HassSubscriptionController } from '../../../src/controllers/hass-subscription-controller';
import { ReactiveControllerHost } from 'lit';
import { HomeAssistant } from 'custom-card-helpers';

describe('HassSubscriptionController', () => {
    let controller: HassSubscriptionController;
    let mockHost: ReactiveControllerHost;
    let mockHass: HomeAssistant;
    let mockUnsubscribe: any;

    beforeEach(() => {
        mockHost = {
            addController: vi.fn(),
            requestUpdate: vi.fn(),
            updateComplete: Promise.resolve(true),
        } as unknown as ReactiveControllerHost;

        mockUnsubscribe = vi.fn();

        mockHass = {
            connection: {
                subscribeEvents: vi.fn().mockResolvedValue(mockUnsubscribe)
            }
        } as unknown as HomeAssistant;

        controller = new HassSubscriptionController(mockHost);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should register itself with the host', () => {
        expect(mockHost.addController).toHaveBeenCalledWith(controller);
    });

    it('should subscribe to events and store unsubscribe function', async () => {
        const callback = vi.fn();
        await controller.subscribeEvents(mockHass, callback, 'test_event');

        expect(mockHass.connection.subscribeEvents).toHaveBeenCalledWith(callback, 'test_event');

        // Verify unsubscribe calls it
        controller.unsubscribeAll();
        expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should handle missing hass or connection gracefully', async () => {
        const callback = vi.fn();
        // @ts-ignore
        await controller.subscribeEvents(null, callback, 'test_event');
        // No crash

        // @ts-ignore
        await controller.subscribeEvents({}, callback, 'test_event');
        // No crash
    });

    it('should handle subscription errors gracefully', async () => {
        const errorHass = {
            connection: {
                subscribeEvents: vi.fn().mockRejectedValue(new Error('Sub failed'))
            }
        } as unknown as HomeAssistant;

        const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
        await controller.subscribeEvents(errorHass, vi.fn(), 'test_event');

        expect(spy).toHaveBeenCalled();
    });

    it('should generic unsubscribe function', () => {
        const genericUnsub = vi.fn();
        controller.addUnsubscribe(genericUnsub);

        controller.unsubscribeAll();
        expect(genericUnsub).toHaveBeenCalled();
    });

    it('should handle unsubscribe errors gracefully', () => {
        const badUnsub = vi.fn().mockImplementation(() => { throw new Error('Unsub failed'); });
        controller.addUnsubscribe(badUnsub);

        const spy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        // Should not throw
        expect(() => controller.unsubscribeAll()).not.toThrow();
        expect(spy).toHaveBeenCalled();
    });

    it('should unsubscribe all on hostDisconnected', () => {
        const unsub = vi.fn();
        controller.addUnsubscribe(unsub);

        controller.hostDisconnected();
        expect(unsub).toHaveBeenCalled();
    });

    it('should ignore non-function unsubscribers', () => {
        // @ts-ignore
        controller.addUnsubscribe(null);
        // @ts-ignore
        controller.addUnsubscribe('not a function');

        // Should not crash on unsubscribeAll
        expect(() => controller.unsubscribeAll()).not.toThrow();
    });
});
