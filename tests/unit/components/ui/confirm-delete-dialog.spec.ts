import { fixture, html } from '@open-wc/testing-helpers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfirmDeleteDialog } from '../../../../src/components/ui/confirm-delete-dialog';
import '../../../../src/components/ui/confirm-delete-dialog';

describe('ConfirmDeleteDialog', () => {
    let element: ConfirmDeleteDialog;

    beforeEach(async () => {
        element = await fixture(html`<confirm-delete-dialog></confirm-delete-dialog>`);
    });

    it('should not render when open is false', async () => {
        element.open = false;
        await element.updateComplete;

        const overlay = element.shadowRoot?.querySelector('.overlay');
        expect(overlay).toBeNull();
    });

    it('should render when open is true', async () => {
        element.open = true;
        await element.updateComplete;

        const overlay = element.shadowRoot?.querySelector('.overlay');
        expect(overlay).toBeTruthy();
    });

    it('should display default title and message', async () => {
        element.open = true;
        await element.updateComplete;

        const title = element.shadowRoot?.querySelector('h2');
        const message = element.shadowRoot?.querySelector('p');

        expect(title?.textContent).toBe('Confirm Deletion');
        expect(message?.textContent).toBe('Are you sure you want to delete this entry? This action cannot be undone.');
    });

    it('should display custom title and message', async () => {
        element.title = 'Delete Plant';
        element.message = 'Are you sure you want to delete this plant?';
        element.open = true;
        await element.updateComplete;

        const title = element.shadowRoot?.querySelector('h2');
        const message = element.shadowRoot?.querySelector('p');

        expect(title?.textContent).toBe('Delete Plant');
        expect(message?.textContent).toBe('Are you sure you want to delete this plant?');
    });

    it('should dispatch cancel event when cancel button is clicked', async () => {
        element.open = true;
        await element.updateComplete;

        const eventSpy = vi.fn();
        element.addEventListener('cancel', eventSpy);

        const cancelBtn = element.shadowRoot?.querySelector('.cancel-btn') as HTMLButtonElement;
        cancelBtn.click();

        expect(eventSpy).toHaveBeenCalled();
        expect(element.open).toBe(false);
    });

    it('should dispatch confirm event when delete button is clicked', async () => {
        element.open = true;
        await element.updateComplete;

        const eventSpy = vi.fn();
        element.addEventListener('confirm', eventSpy);

        const deleteBtn = element.shadowRoot?.querySelector('.delete-btn') as HTMLButtonElement;
        deleteBtn.click();

        expect(eventSpy).toHaveBeenCalled();
        expect(element.open).toBe(false);
    });

    it('should close dialog when overlay is clicked', async () => {
        element.open = true;
        await element.updateComplete;

        const eventSpy = vi.fn();
        element.addEventListener('cancel', eventSpy);

        const overlay = element.shadowRoot?.querySelector('.overlay') as HTMLElement;
        overlay.click();

        expect(eventSpy).toHaveBeenCalled();
        expect(element.open).toBe(false);
    });

    it('should not close dialog when dialog content is clicked', async () => {
        element.open = true;
        await element.updateComplete;

        const eventSpy = vi.fn();
        element.addEventListener('cancel', eventSpy);

        const dialog = element.shadowRoot?.querySelector('.dialog') as HTMLElement;
        dialog.click();

        expect(eventSpy).not.toHaveBeenCalled();
        expect(element.open).toBe(true);
    });

    it('should stop propagation on cancel button click', async () => {
        element.open = true;
        await element.updateComplete;

        const cancelBtn = element.shadowRoot?.querySelector('.cancel-btn') as HTMLButtonElement;
        const clickEvent = new MouseEvent('click', { bubbles: true });
        const stopPropSpy = vi.spyOn(clickEvent, 'stopPropagation');

        cancelBtn.dispatchEvent(clickEvent);

        expect(stopPropSpy).toHaveBeenCalled();
    });

    it('should stop propagation on confirm button click', async () => {
        element.open = true;
        await element.updateComplete;

        const deleteBtn = element.shadowRoot?.querySelector('.delete-btn') as HTMLButtonElement;
        const clickEvent = new MouseEvent('click', { bubbles: true });
        const stopPropSpy = vi.spyOn(clickEvent, 'stopPropagation');

        deleteBtn.dispatchEvent(clickEvent);

        expect(stopPropSpy).toHaveBeenCalled();
    });

    it('should render cancel button with icon', async () => {
        element.open = true;
        await element.updateComplete;

        const cancelBtn = element.shadowRoot?.querySelector('.cancel-btn');
        const svg = cancelBtn?.querySelector('svg');

        expect(svg).toBeTruthy();
        expect(cancelBtn?.textContent).toContain('Cancel');
    });

    it('should render delete button with icon', async () => {
        element.open = true;
        await element.updateComplete;

        const deleteBtn = element.shadowRoot?.querySelector('.delete-btn');
        const svg = deleteBtn?.querySelector('svg');

        expect(svg).toBeTruthy();
        expect(deleteBtn?.textContent).toContain('Delete');
    });

    it('should handle rapid open/close cycles', async () => {
        element.open = true;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.overlay')).toBeTruthy();

        element.open = false;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.overlay')).toBeNull();

        element.open = true;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.overlay')).toBeTruthy();
    });

    it('should handle overlay click with correct target detection', async () => {
        element.open = true;
        await element.updateComplete;

        const eventSpy = vi.fn();
        element.addEventListener('cancel', eventSpy);

        // Click on overlay (target === currentTarget)
        const overlay = element.shadowRoot?.querySelector('.overlay') as HTMLElement;
        const overlayEvent = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(overlayEvent, 'target', { value: overlay, configurable: true });
        Object.defineProperty(overlayEvent, 'currentTarget', { value: overlay, configurable: true });

        overlay.dispatchEvent(overlayEvent);

        expect(eventSpy).toHaveBeenCalled();
    });

    it('should not trigger cancel when clicking on nested element in overlay', async () => {
        element.open = true;
        await element.updateComplete;

        const eventSpy = vi.fn();
        element.addEventListener('cancel', eventSpy);

        // Click on dialog within overlay (target !== currentTarget)
        const overlay = element.shadowRoot?.querySelector('.overlay') as HTMLElement;
        const dialog = element.shadowRoot?.querySelector('.dialog') as HTMLElement;

        const nestedEvent = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(nestedEvent, 'target', { value: dialog, configurable: true });
        Object.defineProperty(nestedEvent, 'currentTarget', { value: overlay, configurable: true });

        overlay.dispatchEvent(nestedEvent);

        expect(eventSpy).not.toHaveBeenCalled();
    });
});
