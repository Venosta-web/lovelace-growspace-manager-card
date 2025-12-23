
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GrowspaceToast } from '../../../src/components/growspace-toast';
import { $notification, showToast } from '../../../src/store/ui-store';
import { fixture, html } from '@open-wc/testing-helpers';

describe('GrowspaceToast', () => {
    let el: GrowspaceToast;

    beforeEach(async () => {
        $notification.set(null);
        el = await fixture(html`<growspace-toast></growspace-toast>`);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        $notification.set(null);
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
        showToast('Test Message', 'success');

        await new Promise(r => setTimeout(r, 0));
        await el.updateComplete;

        const div = el.shadowRoot!.querySelector('.toast-notification');
        expect(div?.classList.contains('visible')).toBe(true);
        expect(div?.classList.contains('success')).toBe(true);
        expect(div?.textContent).toContain('Test Message');
    });

    it('should clear after timeout', async () => {
        vi.useFakeTimers();
        showToast('Auto Dismiss', 'info');

        // Use Promise.resolve for store update microtask
        await Promise.resolve();

        expect($notification.get()).not.toBeNull();

        // Fast-forward time
        vi.advanceTimersByTime(3000);

        // Timer callback updates store synchronously in test env usually?
        // Wait for microtasks from that callback
        await Promise.resolve();

        expect($notification.get()).toBeNull();

        vi.useRealTimers();

        await el.updateComplete;

        const div = el.shadowRoot!.querySelector('.toast-notification');
        expect(div?.classList.contains('visible')).toBe(false);
    });
});