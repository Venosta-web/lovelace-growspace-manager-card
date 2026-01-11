import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { AddPlantsDialog } from '../../../src/dialogs/add-plants-dialog';
import '../../../src/dialogs/add-plants-dialog';
import { StrainEntry } from '../../../src/types';

// Mock ha-dialog if not already defined
if (!customElements.get('ha-dialog')) {
    class MockHaDialog extends HTMLElement {
        open = false;
    }
    customElements.define('ha-dialog', MockHaDialog);
}

describe('AddPlantsDialog', () => {
    let element: AddPlantsDialog;
    const mockStrains: StrainEntry[] = [
        { strain: 'Blue Dream', phenotype: 'Sativa Dom', key: 'bd1' },
        { strain: 'OG Kush', phenotype: '', key: 'og1' }
    ];

    beforeEach(async () => {
        element = await fixture(html`<add-plants-dialog></add-plants-dialog>`);
        element.hass = {} as any;
        element.strainLibrary = mockStrains;
        element.open = true;
        await element.updateComplete;
    });

    it('should render content when open', async () => {
        const dialog = element.shadowRoot?.querySelector('ha-dialog');
        expect(dialog).toBeTruthy();
        const title = element.shadowRoot?.querySelector('.dialog-title');
        expect(title?.textContent).toBe('Batch Add Plants');
    });

    it('should render nothing when closed', async () => {
        element.open = false;
        await element.updateComplete;
        const container = element.shadowRoot?.querySelector('.glass-dialog-container');
        expect(container).toBeNull();
    });

    it('should populate strain options', async () => {
        const select = element.shadowRoot?.querySelector('md3-select') as any;
        expect(select).toBeTruthy();
        expect(select.options).toEqual(['Blue Dream', 'OG Kush']);
    });

    it('should handle amount and start_number changes', async () => {
        const amountInput = element.shadowRoot?.querySelectorAll('md3-number-input')[0] as any;
        const startNumInput = element.shadowRoot?.querySelectorAll('md3-number-input')[1] as any;

        amountInput.dispatchEvent(new CustomEvent('change', { detail: '5' }));
        startNumInput.dispatchEvent(new CustomEvent('change', { detail: '10' }));

        await element.updateComplete;

        // @ts-ignore - access private for testing if needed or use public getter if exists
        expect(element['amount']).toBe(5);
        // @ts-ignore
        expect(element['start_number']).toBe(10);
    });

    it('should dispatch close event on cancel', async () => {
        const closeSpy = vi.fn();
        element.addEventListener('close', closeSpy);

        const cancelBtn = element.shadowRoot?.querySelector('.tonal') as HTMLElement;
        cancelBtn.click();

        expect(closeSpy).toHaveBeenCalled();
    });

    it('should dispatch submit event with batch payload', async () => {
        // Set values
        const strainSelect = element.shadowRoot?.querySelector('md3-select');
        strainSelect?.dispatchEvent(new CustomEvent('change', { detail: 'OG Kush' }));

        const amountInput = element.shadowRoot?.querySelectorAll('md3-number-input')[0];
        amountInput?.dispatchEvent(new CustomEvent('change', { detail: '3' }));

        const startNumInput = element.shadowRoot?.querySelectorAll('md3-number-input')[1];
        startNumInput?.dispatchEvent(new CustomEvent('change', { detail: '5' }));

        // Set a date
        element.growspaceName = 'Main Tent';
        await element.updateComplete;
        const dateInput = element.shadowRoot?.querySelector('md3-date-input[label="Veg Start"]');
        dateInput?.dispatchEvent(new CustomEvent('change', { detail: '2023-01-01' }));

        const submitSpy = vi.fn();
        element.addEventListener('add-plants-submit', submitSpy);

        const addBtn = element.shadowRoot?.querySelector('.primary') as HTMLElement;
        addBtn.click();

        expect(submitSpy).toHaveBeenCalled();
        const detail = submitSpy.mock.calls[0][0].detail;

        expect(detail).toEqual({
            strain: 'OG Kush',
            amount: 3,
            start_number: 5,
            veg_start: '2023-01-01',
            flower_start: '',
            seedling_start: '',
            mother_start: '',
            clone_start: '',
            dry_start: '',
            cure_start: ''
        });
    });

    describe('Timeline Variations', () => {
        it('should show mother input for mother growspace', async () => {
            element.growspaceName = 'Mother Tent';
            await element.updateComplete;

            const dateInput = element.shadowRoot?.querySelector('md3-date-input') as any;
            expect(dateInput?.getAttribute('label')).toBe('Mother Start');
        });

        it('should show dry input for dry growspace', async () => {
            element.growspaceName = 'Dry Tent';
            await element.updateComplete;

            const dateInput = element.shadowRoot?.querySelector('md3-date-input') as any;
            expect(dateInput?.getAttribute('label')).toBe('Dry Start');
        });
    });
});
