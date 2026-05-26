import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResizeController } from '../../src/controllers/resize-controller';
import { ReactiveControllerHost } from 'lit';

describe('ResizeController', () => {
    let controller: ResizeController;
    let mockHost: ReactiveControllerHost & Element;
    let matchMediaMock: any;
    let resizeObserverMock: any;
    let observeMock: any;
    let disconnectMock: any;

    beforeEach(() => {
        // Mock Host
        mockHost = {
            addController: vi.fn(),
            requestUpdate: vi.fn(),
            tagName: 'MOCK-HOST'
        } as unknown as ReactiveControllerHost & Element;

        // Mock window.matchMedia
        matchMediaMock = vi.fn().mockImplementation((query) => ({
            matches: false, // Default
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }));
        window.matchMedia = matchMediaMock;

        // Mock ResizeObserver
        observeMock = vi.fn();
        disconnectMock = vi.fn();
        resizeObserverMock = vi.fn(function (callback) {
            return {
                observe: observeMock,
                disconnect: disconnectMock,
                _callback: callback
            };
        });
        vi.stubGlobal('ResizeObserver', resizeObserverMock);

        controller = new ResizeController(mockHost);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should set isMobile to true when (max-width: 768px) matches', () => {
        // Setup matchMedia to match the mobile query used in source
        matchMediaMock.mockImplementation((query: string) => ({
            matches: query === '(max-width: 768px)',
            media: query,
            addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn()
        }));

        controller.hostConnected(); // Trigger checkMobile
        expect(controller.isMobile).toBe(true);
    });

    it('should set hasTouch to true when (pointer: coarse) matches', () => {
        matchMediaMock.mockImplementation((query: string) => ({
            matches: query === '(pointer: coarse)',
            media: query,
            addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn()
        }));

        controller.hostConnected();
        expect(controller.hasTouch).toBe(true);
    });

    it('should call host.requestUpdate() when media query changes', () => {
        // 1. Setup initial state (Desktop)
        controller.hostConnected();
        expect(controller.isMobile).toBe(false);
        expect(mockHost.requestUpdate).not.toHaveBeenCalled(); // Initial check might request update depending on impl, but let's assume it only updates on change if distinct?
        // Actually constructor -> hostConnected -> _checkMobile -> if changed -> requestUpdate.
        // Initial state of controller is false. If matchMedia is false, no change.

        // 2. Simulate resize event
        // We mocked addEventListener on window in previous files, but here we can just trigger the bound function if we had access,
        // or simpler: ensure the event listener was added to window.
        // The controller adds 'resize' listener to window.

        // Let's rely on the fact that the controller listens to 'resize' on window.

        // Change mock to return true now
        matchMediaMock.mockImplementation((query: string) => ({
            matches: query === '(max-width: 768px)',
            media: query,
            addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn()
        }));

        window.dispatchEvent(new Event('resize'));

        expect(mockHost.requestUpdate).toHaveBeenCalled();
        expect(controller.isMobile).toBe(true);
    });
    it('should observe provided element', () => {
        const div = document.createElement('div');
        controller.observe(div);
        expect(observeMock).toHaveBeenCalledWith(div);
    });

    it('should disconnect previous observer when observing new element', () => {
        const div1 = document.createElement('div');
        const div2 = document.createElement('div');

        controller.observe(div1);
        expect(observeMock).toHaveBeenCalledWith(div1);

        controller.observe(div2);
        expect(disconnectMock).toHaveBeenCalled();
        expect(observeMock).toHaveBeenCalledWith(div2);
    });

    it('should trigger callback and update host when resize observed', () => {
        const callback = vi.fn();
        // re-init with callback
        controller = new ResizeController(mockHost, callback);
        const div = document.createElement('div');
        controller.observe(div);

        // Get the callback passed to ResizeObserver constructor
        // resizeObserverMock was defined in beforeEach as:
        // resizeObserverMock = vi.fn(function (callback) { ... _callback: callback ... })
        const observerInstance = resizeObserverMock.mock.results[resizeObserverMock.mock.results.length - 1].value;

        // Trigger the internal callback
        observerInstance._callback();

        expect(callback).toHaveBeenCalled();
        expect(mockHost.requestUpdate).toHaveBeenCalled();
    });

    it('should disconnect observer on hostDisconnected', () => {
        const div = document.createElement('div');
        controller.observe(div);

        controller.hostDisconnected();
        expect(disconnectMock).toHaveBeenCalled();
    });

    it('should handle hostDisconnected safely when no observer is active', () => {
        // Ensure no observer is set (default state)
        // Verify it doesn't throw and doesn't call disconnect on undefined
        expect(() => controller.hostDisconnected()).not.toThrow();
        expect(disconnectMock).not.toHaveBeenCalled();
    });
});
