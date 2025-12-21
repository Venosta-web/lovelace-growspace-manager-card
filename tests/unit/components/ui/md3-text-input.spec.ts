import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Md3TextInput } from '../../../../src/components/ui/md3-text-input';

// Ensure custom element is defined
if (!customElements.get('md3-text-input')) {
    customElements.define('md3-text-input', Md3TextInput);
}

describe('Md3TextInput', () => {
    let element: Md3TextInput;

    beforeEach(async () => {
        element = document.createElement('md3-text-input') as Md3TextInput;
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        document.body.removeChild(element);
    });

    it('should render with default values', () => {
        const input = element.shadowRoot?.querySelector('input');
        const label = element.shadowRoot?.querySelector('label');

        expect(input).toBeTruthy();
        expect(label).toBeTruthy();
        expect(input?.value).toBe('');
        expect(input?.type).toBe('text');
        expect(label?.textContent).toBe('');
    });

    it('should reflect properties to attributes', async () => {
        element.label = 'Test Label';
        element.value = 'Test Value';
        element.placeholder = 'Type here';
        element.type = 'email';
        element.list = 'suggestions';

        await element.updateComplete;

        const input = element.shadowRoot?.querySelector('input');
        const label = element.shadowRoot?.querySelector('label');

        expect(label?.textContent).toBe('Test Label');
        expect(input?.value).toBe('Test Value');
        expect(input?.getAttribute('placeholder')).toBe('Type here');
        expect(input?.getAttribute('type')).toBe('email');
        expect(input?.getAttribute('list')).toBe('suggestions');
    });

    it('should dispatch change event on input', () => {
        const listener = vi.fn();
        element.addEventListener('change', listener);

        const input = element.shadowRoot?.querySelector('input') as HTMLInputElement;
        input.value = 'New Value';
        input.dispatchEvent(new Event('input')); // This triggers _handleInput

        expect(element.value).toBe('New Value');
        expect(listener).toHaveBeenCalledWith(expect.objectContaining({
            detail: 'New Value'
        }));
    });
});
