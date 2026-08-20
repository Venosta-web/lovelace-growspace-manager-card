import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Md3TextInput } from '../../../../src/features/shared/ui/md3-text-input';

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

    describe('Suggestions', () => {
        it('should not render datalist when suggestions is empty', async () => {
            element.suggestions = [];
            await element.updateComplete;

            const datalist = element.shadowRoot?.querySelector('datalist');
            expect(datalist).toBeNull();
        });

        it('should render datalist when suggestions has items', async () => {
            element.suggestions = ['apple', 'banana', 'cherry'];
            await element.updateComplete;

            const datalist = element.shadowRoot?.querySelector('datalist');
            expect(datalist).toBeTruthy();

            const options = datalist?.querySelectorAll('option');
            expect(options?.length).toBe(3);
            expect(options?.[0].value).toBe('apple');
            expect(options?.[1].value).toBe('banana');
            expect(options?.[2].value).toBe('cherry');
        });

        it('should set input list attribute to datalist id when suggestions exist', async () => {
            element.suggestions = ['option1', 'option2'];
            await element.updateComplete;

            const input = element.shadowRoot?.querySelector('input');
            const datalist = element.shadowRoot?.querySelector('datalist');

            expect(input?.getAttribute('list')).toBe(datalist?.id);
        });

        it('should use list property when suggestions is empty', async () => {
            element.suggestions = [];
            element.list = 'external-datalist';
            await element.updateComplete;

            const input = element.shadowRoot?.querySelector('input');
            expect(input?.getAttribute('list')).toBe('external-datalist');
        });

        it('should prefer internal datalist over list property when suggestions exist', async () => {
            element.suggestions = ['a', 'b'];
            element.list = 'external-datalist';
            await element.updateComplete;

            const input = element.shadowRoot?.querySelector('input');
            const datalist = element.shadowRoot?.querySelector('datalist');

            // Should use internal datalist id, not external list
            expect(input?.getAttribute('list')).toBe(datalist?.id);
            expect(input?.getAttribute('list')).not.toBe('external-datalist');
        });
    });
});
