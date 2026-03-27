import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Md3NumberInput } from '../../../../src/components/ui/md3-number-input';

// Ensure custom element is defined
if (!customElements.get('md3-number-input')) {
    customElements.define('md3-number-input', Md3NumberInput);
}

describe('Md3NumberInput', () => {
    let element: Md3NumberInput;

    beforeEach(async () => {
        element = document.createElement('md3-number-input') as Md3NumberInput;
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        document.body.removeChild(element);
    });

    it('should render number input with defaults', () => {
        const input = element.shadowRoot?.querySelector('input');
        expect(input?.type).toBe('number');
        expect(input?.value).toBe('0');
    });

    it('should reflect properties', async () => {
        element.label = 'My Label';
        element.value = 42;
        element.min = 10;
        element.max = 100;
        element.placeholder = 'Enter num';
        await element.updateComplete;

        const input = element.shadowRoot?.querySelector('input');
        const label = element.shadowRoot?.querySelector('label');

        expect(label?.textContent).toBe('My Label');
        expect(input?.value).toBe('42');
        expect(input?.min).toBe('10');
        expect(input?.max).toBe('100');
        expect(input?.placeholder).toBe('Enter num');
    });

    it('should render unit if provided', async () => {
        element.unit = 'kg';
        await element.updateComplete;
        const span = element.shadowRoot?.querySelector('span');
        expect(span?.textContent).toBe('kg');
        // Check styling effect on input
        const input = element.shadowRoot?.querySelector('input');
        expect(input?.getAttribute('style')).toContain('padding-bottom: 16px');
    });

    it('should dispatch change event on input', () => {
        const listener = vi.fn();
        element.addEventListener('change', listener);
        const input = element.shadowRoot?.querySelector('input') as HTMLInputElement;

        input.value = '100';
        input.dispatchEvent(new Event('input'));

        expect(element.value).toBe(100);
        expect(listener).toHaveBeenCalledWith(expect.objectContaining({ detail: '100' }));
    });
});
