
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GrowspaceToast } from '../../../src/components/growspace-toast';
import { atom } from 'nanostores';

describe('GrowspaceToast', () => {
    let el: GrowspaceToast;
    let mockStore: any;

    // Local atom
    const $notification = atom<{ message: string; type: "success" | "error" | "info" } | null>(null);

    beforeEach(async () => {
        vi.clearAllMocks();
        $notification.set(null);

        mockStore = {
            ui: {
                $notification,
                clearToast: vi.fn()
            }
        };

        if (!customElements.get('growspace-toast')) {
            customElements.define('growspace-toast', GrowspaceToast);
        }

        // Create element manually to inject store before connection
        el = document.createElement('growspace-toast') as GrowspaceToast;
        (el as any).store = mockStore;
        document.body.appendChild(el);
        await el.updateComplete;
    });

    afterEach(() => {
        if (el.isConnected) {
            document.body.removeChild(el);
        }
    });

    it('should be defined', () => {
        expect(el).toBeInstanceOf(GrowspaceToast);
    });

    it('should be hidden initially', () => {
        const div = el.shadowRoot!.querySelector('.toast-notification');
        expect(div).not.toBeNull();
        expect(div?.classList.contains('visible')).toBe(false);
    });

    it('should show message when store updates', async () => {
        $notification.set({ message: 'Test Message', type: 'success' });


        await el.updateComplete;

        const div = el.shadowRoot!.querySelector('.toast-notification');
        expect(div?.classList.contains('visible')).toBe(true);
        expect(div?.classList.contains('success')).toBe(true);
        expect(div?.textContent).toContain('Test Message');
    });

    it('should clear after timeout', async () => {
        vi.useFakeTimers();
        $notification.set({ message: 'Auto Dismiss', type: 'info' });


        await el.updateComplete;

        const div = el.shadowRoot!.querySelector('.toast-notification');
        expect(div?.classList.contains('visible')).toBe(true);

        // Fast-forward time
        vi.advanceTimersByTime(3000);

        expect(mockStore.ui.clearToast).toHaveBeenCalled();

        vi.useRealTimers();
    });

    it('should handle missing store gracefully', async () => {
        const noStoreEl = document.createElement('growspace-toast') as GrowspaceToast;
        // Do not set store
        document.body.appendChild(noStoreEl);
        await noStoreEl.updateComplete;

        expect((noStoreEl as any)._notificationController).toBeUndefined();

        document.body.removeChild(noStoreEl);
    });

    it('should fallback to info type if notification type is missing', async () => {
        // Notification satisfies { message: string; type: ... } | null
        // But we can force it for reaching the branch
        (el as any)._notificationController = { value: { message: 'Type Missing' } };
        await el.updateComplete;

        const div = el.shadowRoot!.querySelector('.toast-notification');
        expect(div?.classList.contains('info')).toBe(true);
    });

    it('should fallback to empty string if notification message is missing', async () => {
        (el as any)._notificationController = { value: { type: 'success' } };
        await el.updateComplete;

        const div = el.shadowRoot!.querySelector('.toast-notification');
        expect(div?.textContent?.trim()).toBe('');
    });

    it('should reset timeout on disconnectedCallback', async () => {
        vi.useFakeTimers();
        $notification.set({ message: 'Disconnect Test', type: 'info' });
        await el.updateComplete;

        const clearSpy = vi.spyOn(window, 'clearTimeout');
        document.body.removeChild(el);

        expect(clearSpy).toHaveBeenCalled();
        vi.useRealTimers();
    });
});