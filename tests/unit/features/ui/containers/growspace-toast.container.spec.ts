import { vi, describe, it, expect, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { atom } from 'nanostores';
import '../../../../../src/features/ui/containers/growspace-toast.container';
import type { GrowspaceToastContainer } from '../../../../../src/features/ui/containers/growspace-toast.container';

vi.mock('../../../../../src/features/ui/components/growspace-toast-ui', () => {
    if (!customElements.get('growspace-toast-ui')) {
        customElements.define('growspace-toast-ui', class extends HTMLElement {});
    }
    return {};
});

describe('GrowspaceToastContainer', () => {
    let element: GrowspaceToastContainer;
    let mockStore: any;
    let $notification: ReturnType<typeof atom<any>>;

    beforeEach(async () => {
        $notification = atom(null);
        mockStore = {
            ui: {
                $notification,
                clearToast: vi.fn(),
            },
        };

        element = await fixture<GrowspaceToastContainer>(html`<growspace-toast></growspace-toast>`);
        (element as any).store = mockStore;
        (element as any)._initControllers();
        element.requestUpdate();
        await element.updateComplete;
    });

    it('renders growspace-toast-ui when controller is initialized', async () => {
        expect(element.shadowRoot?.querySelector('growspace-toast-ui')).toBeTruthy();
    });

    it('renders empty when controller not initialized', async () => {
        const el = await fixture<GrowspaceToastContainer>(html`<growspace-toast></growspace-toast>`);
        expect(el.shadowRoot?.querySelector('growspace-toast-ui')).toBeNull();
    });

    it('schedules a 3000ms timeout for notification without action', async () => {
        vi.useFakeTimers();
        $notification.set({ message: 'Hello', type: 'success' });
        await element.updateComplete;

        vi.advanceTimersByTime(2999);
        expect(mockStore.ui.clearToast).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(mockStore.ui.clearToast).toHaveBeenCalledOnce();

        vi.useRealTimers();
    });

    it('schedules a 6000ms timeout for notification with action', async () => {
        vi.useFakeTimers();
        $notification.set({ message: 'Done', type: 'info', action: { label: 'Undo', callback: vi.fn() } });
        await element.updateComplete;

        vi.advanceTimersByTime(5999);
        expect(mockStore.ui.clearToast).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(mockStore.ui.clearToast).toHaveBeenCalledOnce();

        vi.useRealTimers();
    });

    it('clears previous timeout when a new notification arrives', async () => {
        vi.useFakeTimers();
        const clearSpy = vi.spyOn(window, 'clearTimeout');

        $notification.set({ message: 'First', type: 'success' });
        await element.updateComplete;

        $notification.set({ message: 'Second', type: 'error' });
        await element.updateComplete;

        // clearTimeout should have been called when the second notification triggered updated()
        expect(clearSpy).toHaveBeenCalled();

        vi.useRealTimers();
    });

    it('_handleActionClicked calls action callback and clears toast', async () => {
        const callback = vi.fn();
        $notification.set({ message: 'Undo?', type: 'info', action: { label: 'Undo', callback } });
        await element.updateComplete;

        (element as any)._handleActionClicked();

        expect(callback).toHaveBeenCalledOnce();
        expect(mockStore.ui.clearToast).toHaveBeenCalledOnce();
    });

    it('_handleActionClicked does nothing gracefully when no action on notification', async () => {
        $notification.set({ message: 'Info', type: 'info' });
        await element.updateComplete;

        expect(() => (element as any)._handleActionClicked()).not.toThrow();
        expect(mockStore.ui.clearToast).toHaveBeenCalledOnce();
    });

    it('disconnectedCallback clears any pending timeout', async () => {
        vi.useFakeTimers();
        $notification.set({ message: 'Test', type: 'success' });
        await element.updateComplete;

        const clearSpy = vi.spyOn(window, 'clearTimeout');
        element.disconnectedCallback();

        expect(clearSpy).toHaveBeenCalled();

        vi.useRealTimers();
    });
});
