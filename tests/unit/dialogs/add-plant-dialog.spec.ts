import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { AddPlantDialog } from '../../../src/dialogs/add-plant-dialog';
import '../../../src/dialogs/add-plant-dialog';
import { StrainEntry } from '../../../src/types';

// Mock ha-dialog if not already defined
if (!customElements.get('ha-dialog')) {
    class MockHaDialog extends HTMLElement {
        open = false;
    }
    customElements.define('ha-dialog', MockHaDialog);
}

describe('AddPlantDialog', () => {
    let element: AddPlantDialog;
    const mockStrains: StrainEntry[] = [
        { strain: 'Blue Dream', phenotype: 'Sativa Dom', key: 'bd1' },
        { strain: 'Blue Dream', phenotype: 'Indica Pheno', key: 'bd2' },
        { strain: 'OG Kush', phenotype: '', key: 'og1' }
    ];

    beforeEach(async () => {
        element = await fixture(html`<add-plant-dialog></add-plant-dialog>`);
        element.hass = {} as any;
        element.strainLibrary = mockStrains;
        element.open = true;
        await element.updateComplete;
    });

    it('should render content when open', async () => {
        const dialog = element.shadowRoot?.querySelector('ha-dialog');
        expect(dialog).toBeTruthy();
        const title = element.shadowRoot?.querySelector('.dialog-title');
        expect(title?.textContent).toBe('Add New Plant');
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

    it('should populate phenotype suggestions when strain is selected', async () => {
        const select = element.shadowRoot?.querySelector('md3-select') as any;

        // Simulate strain selection
        select.dispatchEvent(new CustomEvent('change', { detail: 'Blue Dream' }));
        await element.updateComplete;

        const phenotypeInput = element.shadowRoot?.querySelector('md3-text-input') as any;
        expect(phenotypeInput).toBeTruthy();

        // Should contain phenotypes for Blue Dream, sorted
        expect(phenotypeInput.suggestions).toEqual(['Indica Pheno', 'Sativa Dom']);

        // Change strain to OG Kush (no phenotypes)
        select.dispatchEvent(new CustomEvent('change', { detail: 'OG Kush' }));
        await element.updateComplete;

        expect(phenotypeInput.suggestions).toEqual([]);
    });

    it('should set initial state', async () => {
        element.setInitialState(2, 3);
        await element.updateComplete;

        const rowInput = element.shadowRoot?.querySelectorAll('md3-number-input')[0] as any;
        const colInput = element.shadowRoot?.querySelectorAll('md3-number-input')[1] as any;

        // Inputs display 1-based index
        expect(rowInput.value).toBe(3);
        expect(colInput.value).toBe(4);
    });

    describe('Timeline Variations', () => {
        it('should show veg/flower inputs for standard growspace', async () => {
            element.growspaceName = 'Main Tent';
            await element.updateComplete;

            const dateInputs = element.shadowRoot?.querySelectorAll('md3-date-input');
            expect(dateInputs?.length).toBe(3);
            expect(dateInputs?.[0].getAttribute('label')).toBe('Seedling Start');
        });

        it('should show mother input for mother growspace and handle change', async () => {
            element.growspaceName = 'Mother Tent';
            await element.updateComplete;

            const dateInput = element.shadowRoot?.querySelector('md3-date-input') as any;
            expect(dateInput?.getAttribute('label')).toBe('Mother Start');

            dateInput.dispatchEvent(new CustomEvent('change', { detail: '2023-01-01' }));
            await element.updateComplete;
        });

        it('should show cure input for cure growspace and handle change', async () => {
            element.growspaceName = 'Cure Area';
            await element.updateComplete;

            const dateInput = element.shadowRoot?.querySelector('md3-date-input') as any;
            expect(dateInput?.getAttribute('label')).toBe('Cure Start');

            dateInput.dispatchEvent(new CustomEvent('change', { detail: '2023-01-01' }));
            await element.updateComplete;
        });

        it('should show clone input for clone growspace and handle change', async () => {
            element.growspaceName = 'Clone Dome';
            await element.updateComplete;

            const dateInput = element.shadowRoot?.querySelector('md3-date-input') as any;
            expect(dateInput?.getAttribute('label')).toBe('Clone Start');

            dateInput.dispatchEvent(new CustomEvent('change', { detail: '2023-01-01' }));
            await element.updateComplete;
        });

        it('should show dry input for dry growspace and handle change', async () => {
            element.growspaceName = 'Dry Tent';
            await element.updateComplete;

            const dateInput = element.shadowRoot?.querySelector('md3-date-input') as any;
            expect(dateInput?.getAttribute('label')).toBe('Dry Start');

            dateInput.dispatchEvent(new CustomEvent('change', { detail: '2023-01-01' }));
            await element.updateComplete;
        });
    });

    describe('Interaction Tests', () => {
        it('should handle Row and Col changes', async () => {
            const rowInput = element.shadowRoot?.querySelectorAll('md3-number-input')[0];
            const colInput = element.shadowRoot?.querySelectorAll('md3-number-input')[1];

            // User inputs 5 (means index 4)
            rowInput?.dispatchEvent(new CustomEvent('change', { detail: '5' }));
            colInput?.dispatchEvent(new CustomEvent('change', { detail: '10' }));

            await element.updateComplete;

            expect(element.row).toBe(4);
            expect(element.col).toBe(9);
        });

        it('should dispatch close event on cancel', async () => {
            const closeSpy = vi.fn();
            element.addEventListener('close', closeSpy);

            const cancelBtn = element.shadowRoot?.querySelector('.tonal') as HTMLElement;
            cancelBtn.click();

            expect(closeSpy).toHaveBeenCalled();
        });

        it('should dispatch close event on verify close button', async () => {
            const closeSpy = vi.fn();
            element.addEventListener('close', closeSpy);

            const xBtn = element.shadowRoot?.querySelector('.dialog-header .text') as HTMLElement;
            xBtn.click();

            expect(closeSpy).toHaveBeenCalled();
        });
    });

    it('should dispatch submit event with payload', async () => {
        element.row = 0; // index 0 = row 1
        element.col = 0; // index 0 = col 1
        // Simulate filling form via events or props
        const strainSelect = element.shadowRoot?.querySelector('md3-select');
        strainSelect?.dispatchEvent(new CustomEvent('change', { detail: 'Blue Dream' }));

        const phenoInput = element.shadowRoot?.querySelector('md3-text-input');
        phenoInput?.dispatchEvent(new CustomEvent('change', { detail: 'Sativa Dom' }));

        // Simulate timeline date input (standard view)
        element.growspaceName = 'Tent';
        await element.updateComplete;
        const dateInput = element.shadowRoot?.querySelector('md3-date-input[label="Veg Start"]');
        dateInput?.dispatchEvent(new CustomEvent('change', { detail: '2023-01-01' }));

        const submitSpy = vi.fn();
        element.addEventListener('add-plant-submit', submitSpy);

        const addBtn = element.shadowRoot?.querySelector('.primary') as HTMLElement;
        addBtn.click();

        expect(submitSpy).toHaveBeenCalled();
        const detail = submitSpy.mock.calls[0][0].detail;

        expect(detail).toEqual(expect.objectContaining({
            row: 1,
            col: 1,
            strain: 'Blue Dream',
            phenotype: 'Sativa Dom',
            veg_start: '2023-01-01',
            flower_start: '',
            seedling_start: '',
            mother_start: '',
            clone_start: '',
            dry_start: '',
            cure_start: ''
        }));
    });

    it('should handle seedling and flower start date changes', async () => {
        element.growspaceName = 'Tent'; // Standard view
        await element.updateComplete;

        const seedlingInput = element.shadowRoot?.querySelector('md3-date-input[label="Seedling Start"]');
        const flowerInput = element.shadowRoot?.querySelector('md3-date-input[label="Flower Start"]');

        expect(seedlingInput).toBeTruthy();
        expect(flowerInput).toBeTruthy();

        seedlingInput?.dispatchEvent(new CustomEvent('change', { detail: '2023-01-02' }));
        flowerInput?.dispatchEvent(new CustomEvent('change', { detail: '2023-02-01' }));

        await element.updateComplete;

        // Verify private state update via submission
        const submitSpy = vi.fn();
        element.addEventListener('add-plant-submit', submitSpy);

        (element as any)._confirm(); // Trigger confirm to check payload

        const detail = submitSpy.mock.calls[0][0].detail;
        expect(detail.seedling_start).toBe('2023-01-02');
        expect(detail.flower_start).toBe('2023-02-01');
    });
});