import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Md3DateInput } from '../../../../src/components/ui/md3-date-input';
import { PlantUtils } from '../../../../src/utils/plant-utils';

// Ensure custom element is defined
if (!customElements.get('md3-date-input')) {
    customElements.define('md3-date-input', Md3DateInput);
}

describe('Md3DateInput', () => {
    let element: Md3DateInput;

    beforeEach(async () => {
        element = document.createElement('md3-date-input') as Md3DateInput;
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        document.body.removeChild(element);
    });

    it('should render date input by default', () => {
        const input = element.shadowRoot?.querySelector('input');
        expect(input?.type).toBe('date');
    });

    it('should render datetime-local input when time prop is true', async () => {
        element.time = true;
        await element.updateComplete;
        const input = element.shadowRoot?.querySelector('input');
        expect(input?.type).toBe('datetime-local');
    });

    it('should format date value correctly', async () => {
        element.value = '2023-10-05T12:00:00';
        await element.updateComplete;
        const input = element.shadowRoot?.querySelector('input');
        expect(input?.value).toBe('2023-10-05');
    });

    it('should format datetime value correctly', async () => {
        element.time = true;
        element.value = '2023-10-05T12:00:00';
        // Mock PlantUtils.toDateTimeLocal if needed, or rely on implementation
        // PlantUtils.toDateTimeLocal('2023-10-05T12:00:00') -> '2023-10-05T12:00' typically
        await element.updateComplete;
        const input = element.shadowRoot?.querySelector('input');
        expect(input?.value).toContain('2023-10-05');
    });

    it('should dispatch change event on input', () => {
        const listener = vi.fn();
        element.addEventListener('change', listener);
        const input = element.shadowRoot?.querySelector('input') as HTMLInputElement;

        input.value = '2023-12-25';
        input.dispatchEvent(new Event('input'));

        expect(element.value).toBe('2023-12-25');
        expect(listener).toHaveBeenCalledWith(expect.objectContaining({ detail: '2023-12-25' }));
    });

    it('should show picker on click', () => {
        const input = element.shadowRoot?.querySelector('input') as HTMLInputElement;
        // JSDOM doesn't implement showPicker, so we might need to mock it or expect it to be called
        input.showPicker = vi.fn();

        input.click();
        expect(input.showPicker).toHaveBeenCalled();
    });
});
