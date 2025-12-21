
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AddPlantDialog } from '../../../src/dialogs/add-plant-dialog';
import { StrainEntry } from '../../../src/types';

// Mock dependencies
vi.mock('../../../src/components/ui/md3-text-input', () => ({
    Md3TextInput: class extends HTMLElement {
        get value() { return this.getAttribute('value') || ''; }
        set value(v) { this.setAttribute('value', v); }
    }
}));
vi.mock('../../../src/components/ui/md3-number-input', () => ({
    Md3NumberInput: class extends HTMLElement {
        get value() { return this.getAttribute('value') || ''; }
        set value(v) { this.setAttribute('value', v); }
    }
}));
vi.mock('../../../src/components/ui/md3-date-input', () => ({
    Md3DateInput: class extends HTMLElement {
        get value() { return this.getAttribute('value') || ''; }
        set value(v) { this.setAttribute('value', v); }
    }
}));
vi.mock('../../../src/components/ui/md3-select', () => ({
    Md3Select: class extends HTMLElement {
        get value() { return this.getAttribute('value') || ''; }
        set value(v) { this.setAttribute('value', v); }
        get options() { return JSON.parse(this.getAttribute('options') || '[]'); }
        set options(v) { this.setAttribute('options', JSON.stringify(v)); }
    }
}));

// Mock ha-dialog
class HaDialogMock extends HTMLElement {
    open = false;
}
customElements.define('ha-dialog', HaDialogMock);

describe('AddPlantDialog', () => {
    let element: AddPlantDialog;
    const mockStrains: StrainEntry[] = [
        { key: '1', strain: 'Blue Dream', phenotype: 'Original', type: 'Sativa', breeder: 'HSO', flowering_days_min: 60, flowering_days_max: 70 },
        { key: '2', strain: 'OG Kush', phenotype: '#18', type: 'Indica', breeder: 'Dinafem', flowering_days_min: 50, flowering_days_max: 60 }
    ];

    beforeEach(async () => {
        element = new AddPlantDialog();
        element.strainLibrary = [...mockStrains];
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (element.isConnected) document.body.removeChild(element);
    });

    it('should render content when open', () => {
        const dialog = element.shadowRoot?.querySelector('ha-dialog');
        expect(dialog).toBeTruthy();
    });

    it('should populate strain options', () => {
        const select = element.shadowRoot?.querySelector('md3-select') as any;
        expect(select).toBeTruthy();
        expect(select.options).toContain('Blue Dream');
        expect(select.options).toContain('OG Kush');
    });

    it('should set initial state', async () => {
        element.setInitialState(2, 3, 'Blue Dream', '#1');
        await element.updateComplete;

        const rowInput = element.shadowRoot?.querySelector('md3-number-input[label="Row"]') as any;
        const colInput = element.shadowRoot?.querySelector('md3-number-input[label="Col"]') as any;
        const strainSelect = element.shadowRoot?.querySelector('md3-select') as any;
        const phenoInput = element.shadowRoot?.querySelector('md3-text-input[label="Phenotype"]') as any;

        expect(String(rowInput.value)).toBe('3'); // Displayed as 1-indexed (2+1)
        expect(String(colInput.value)).toBe('4'); // Displayed as 1-indexed (3+1)
        expect(strainSelect.value).toBe('Blue Dream');
        expect(phenoInput.value).toBe('#1');
    });

    describe('Timeline Variations', () => {
        it('should show veg/flower inputs for standard growspace', async () => {
            element.growspaceName = 'Tent 1';
            await element.updateComplete;

            const labels = Array.from(element.shadowRoot?.querySelectorAll('md3-date-input') || [])
                .map(el => el.getAttribute('label'));

            expect(labels).toContain('Veg Start');
            expect(labels).toContain('Flower Start');
            expect(labels).not.toContain('Mother Start');
        });

        it('should show mother input for mother growspace', async () => {
            element.growspaceName = 'Mother Tent';
            await element.updateComplete;

            const labels = Array.from(element.shadowRoot?.querySelectorAll('md3-date-input') || [])
                .map(el => el.getAttribute('label'));

            expect(labels).toContain('Mother Start');
            expect(labels).not.toContain('Flower Start');
        });

        it('should show cure input for cure growspace', async () => {
            element.growspaceName = 'Cure Tent';
            await element.updateComplete;

            const labels = Array.from(element.shadowRoot?.querySelectorAll('md3-date-input') || [])
                .map(el => el.getAttribute('label'));

            expect(labels).toContain('Cure Start');

            // Trigger change coverage for Cure
            const cureInput = element.shadowRoot?.querySelector('md3-date-input[label="Cure Start"]') as any;
            cureInput.dispatchEvent(new CustomEvent('change', { detail: '2023-01-01', bubbles: true, composed: true }));
        });
    });

    it('should dispatch submit event with payload', async () => {
        element.setInitialState(0, 0);
        await element.updateComplete;

        // Fill Form
        const strainSelect = element.shadowRoot?.querySelector('md3-select') as any;
        strainSelect.value = 'OG Kush';
        strainSelect.dispatchEvent(new CustomEvent('change', { detail: 'OG Kush', bubbles: true, composed: true }));
        await element.updateComplete;

        const phenoInput = element.shadowRoot?.querySelector('md3-text-input[label="Phenotype"]') as any;
        phenoInput.value = '#5';
        phenoInput.dispatchEvent(new CustomEvent('change', { detail: '#5', bubbles: true, composed: true }));
        await element.updateComplete;

        // Trigger multiple inputs for coverage (standard view)
        const vegInput = element.shadowRoot?.querySelector('md3-date-input[label="Veg Start"]') as any;
        if (vegInput) {
            vegInput.value = '2023-01-01';
            vegInput.dispatchEvent(new CustomEvent('change', { detail: '2023-01-01', bubbles: true, composed: true }));
        }

        const flowerInput = element.shadowRoot?.querySelector('md3-date-input[label="Flower Start"]') as any;
        if (flowerInput) flowerInput.dispatchEvent(new CustomEvent('change', { detail: '2023-02-01', bubbles: true, composed: true }));

        const seedlingInput = element.shadowRoot?.querySelector('md3-date-input[label="Seedling Start"]') as any;
        if (seedlingInput) seedlingInput.dispatchEvent(new CustomEvent('change', { detail: '2022-12-01', bubbles: true, composed: true }));

        await element.updateComplete;

        const listener = vi.fn();
        element.addEventListener('add-plant-submit', listener);

        // Submit
        const submitBtn = element.shadowRoot?.querySelector('button.primary');
        (submitBtn as HTMLElement).click();

        expect(listener).toHaveBeenCalledWith(expect.objectContaining({
            detail: expect.objectContaining({
                strain: 'OG Kush',
                phenotype: '#5',
                veg_start: '2023-01-01',
                row: 0,
                col: 0
            })
        }));
    });
});
