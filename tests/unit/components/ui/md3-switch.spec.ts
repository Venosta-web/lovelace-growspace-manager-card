import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Md3Switch } from '../../../../src/features/shared/ui/md3-switch';

// Ensure custom element is defined
if (!customElements.get('md3-switch')) {
    customElements.define('md3-switch', Md3Switch);
}

describe('Md3Switch', () => {
    let element: Md3Switch;

    beforeEach(async () => {
        element = document.createElement('md3-switch') as Md3Switch;
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        document.body.removeChild(element);
    });

    it('should default to unchecked', () => {
        expect(element.checked).toBe(false);
        const btn = element.shadowRoot?.querySelector('button');
        expect(btn?.getAttribute('aria-checked')).toBe('false');
    });

    it('should reflect checked property', async () => {
        element.checked = true;
        await element.updateComplete;
        const btn = element.shadowRoot?.querySelector('button');
        expect(btn?.getAttribute('aria-checked')).toBe('true');
    });

    it('should toggle on click and dispatch event', () => {
        const listener = vi.fn();
        element.addEventListener('change', listener);

        const btn = element.shadowRoot?.querySelector('button') as HTMLButtonElement;
        btn.click();

        expect(element.checked).toBe(true);
        expect(listener).toHaveBeenCalledWith(expect.objectContaining({
            detail: { checked: true }
        }));
    });

    it('should not toggle if disabled', async () => {
        element.disabled = true;
        await element.updateComplete;

        const listener = vi.fn();
        element.addEventListener('change', listener);

        const btn = element.shadowRoot?.querySelector('button') as HTMLButtonElement;

        // Directly call the method to verify the guard clause logic
        // (Native click() on disabled button doesn't fire event even if we want to test the TS logic)
        (element as any)._handleClick();

        expect(element.checked).toBe(false);
        expect(listener).not.toHaveBeenCalled();
    });
});
