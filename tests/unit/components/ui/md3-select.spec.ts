import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Md3Select } from '../../../../src/features/shared/ui/md3-select';

// Ensure custom element is defined
if (!customElements.get('md3-select')) {
    customElements.define('md3-select', Md3Select);
}

describe('Md3Select', () => {
    let element: Md3Select;

    beforeEach(async () => {
        element = document.createElement('md3-select') as Md3Select;
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        document.body.removeChild(element);
    });

    it('should result in empty options by default', () => {
        const select = element.shadowRoot?.querySelector('select');
        expect(select?.querySelectorAll('option').length).toBe(1); // Just the default "Select..."
    });

    it('should render string options', async () => {
        element.options = ['Option A', 'Option B'];
        await element.updateComplete;

        const options = element.shadowRoot?.querySelectorAll('option');
        expect(options?.length).toBe(3); // Default + 2
        expect(options?.[1].value).toBe('Option A');
        expect(options?.[1].textContent).toBe('Option A');
    });

    it('should render object options', async () => {
        element.options = [{ label: 'Label 1', value: 'val1' }, { label: 'Label 2', value: 'val2' }];
        await element.updateComplete;

        const options = element.shadowRoot?.querySelectorAll('option');
        expect(options?.length).toBe(3);
        expect(options?.[1].value).toBe('val1');
        expect(options?.[1].textContent).toBe('Label 1');
    });

    it('should reflect initial value', async () => {
        element.options = ['A', 'B'];
        element.value = 'B';
        await element.updateComplete;

        const select = element.shadowRoot?.querySelector('select') as HTMLSelectElement;
        expect(select.value).toBe('B');
    });

    it('should dispatch change event on selection', async () => {
        element.options = ['A', 'B'];
        await element.updateComplete;

        const select = element.shadowRoot?.querySelector('select') as HTMLSelectElement;
        const listener = vi.fn();
        element.addEventListener('change', listener);

        select.value = 'A';
        select.dispatchEvent(new Event('change'));

        expect(element.value).toBe('A');
        expect(listener).toHaveBeenCalledWith(expect.objectContaining({
            detail: 'A'
        }));
    });

    it('should render label', async () => {
        element.label = 'Test Label';
        await element.updateComplete;
        const labelInfo = element.shadowRoot?.querySelector('label');
        expect(labelInfo?.textContent).toBe('Test Label');
    });
});
