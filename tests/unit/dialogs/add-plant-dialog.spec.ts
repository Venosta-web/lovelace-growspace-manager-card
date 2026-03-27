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

            const cancelBtn = element.shadowRoot?.querySelector('.button-group .tonal') as HTMLElement;
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

        it('should dispatch create-new-strain event', async () => {
            const createSpy = vi.fn();
            element.addEventListener('create-new-strain', createSpy);

            // Button with mdiDna icon
            const createBtn = element.shadowRoot?.querySelector('button[title="Add New Strain"]') as HTMLElement;
            expect(createBtn).toBeTruthy();
            createBtn.click();

            expect(createSpy).toHaveBeenCalled();
            expect(createSpy.mock.calls[0][0].detail).toMatchObject({ source: 'add-plant' });
        });

        it('should update addToLibrary state on switch change', async () => {
            // Need a strain selected for switch to be enabled
            element.setInitialState(0, 0, 'Blue Dream');
            await element.updateComplete;

            const switchEl = element.shadowRoot?.querySelector('md3-switch') as any;
            expect(switchEl).toBeTruthy();
            expect(switchEl.disabled).toBe(false);

            // Mock the event target checked property
            switchEl.checked = true;
            switchEl.dispatchEvent(new Event('change'));
            await element.updateComplete;

            expect((element as any).addToLibrary).toBe(true);

            switchEl.checked = false;
            switchEl.dispatchEvent(new Event('change'));
            await element.updateComplete;

            expect((element as any).addToLibrary).toBe(false);
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


    describe('Transplant Mode', () => {
        const mockPlants = [
            {
                entity_id: 'sensor.plant1',
                attributes: {
                    plant_id: 'p1',
                    strain: 'Strain A',
                    phenotype: 'Pheno 1',
                    col: 1,
                    row: 1,
                    clone_days: 10,
                    seedling_days: 5,
                    clone_start: '2023-01-01',
                    seedling_start: '2023-01-05',
                    growspace_id: 'gs_source'
                }
            },
            {
                entity_id: 'sensor.plant2',
                attributes: {
                    plant_id: 'p2',
                    strain: 'Strain B',
                    col: 2,
                    row: 2
                }
            },
            {
                entity_id: 'sensor.plant3',
                attributes: {
                    plant_id: 'p3',
                    // No strain
                    col: 3,
                    row: 3
                }
            }
        ] as any[];

        beforeEach(async () => {
            element.clonePlants = mockPlants;
            element.seedlingPlants = mockPlants;
            element.targetGrowspaceId = 'gs_target';
            await element.updateComplete;
        });

        it('should switch to clone tab and render clone form', async () => {
            const cloneTab = element.shadowRoot?.querySelectorAll('.tab')[1] as HTMLElement;
            cloneTab.click();
            await element.updateComplete;

            expect((element as any)._activeTab).toBe('clone');

            const select = element.shadowRoot?.querySelector('md3-select');
            expect(select).toBeTruthy();
            expect(select?.getAttribute('label')).toBe('Select Plant');

            const title = element.shadowRoot?.querySelector('.dialog-title');
            expect(title?.textContent).toBe('Transplant Clone');
        });

        it('should switch to seedling tab and render seedling form', async () => {
            const seedlingTab = element.shadowRoot?.querySelectorAll('.tab')[2] as HTMLElement;
            seedlingTab.click();
            await element.updateComplete;

            expect((element as any)._activeTab).toBe('seedling');

            const title = element.shadowRoot?.querySelector('.dialog-title');
            expect(title?.textContent).toBe('Transplant Seedling');
        });

        it('should show empty message if no plants available', async () => {
            element.clonePlants = [];
            const cloneTab = element.shadowRoot?.querySelectorAll('.tab')[1] as HTMLElement;
            cloneTab.click();
            await element.updateComplete;

            const msg = element.shadowRoot?.querySelector('p[style*="font-style: italic"]');
            expect(msg?.textContent).toContain('No clones available');
        });

        it('should select a plant and show its details', async () => {
            // Switch to clone tab
            (element as any)._activeTab = 'clone';
            await element.updateComplete;

            const select = element.shadowRoot?.querySelector('md3-select') as HTMLElement;
            select.dispatchEvent(new CustomEvent('change', { detail: 'p1' }));
            await element.updateComplete;

            expect((element as any)._selectedTransplantPlant).toEqual(mockPlants[0]);

            const infoValues = element.shadowRoot?.querySelectorAll('.info-value');
            expect(infoValues?.[0].textContent).toBe('Strain A');
            expect(infoValues?.[1].textContent).toBe('Pheno 1');
            expect(infoValues?.[4].textContent).toBe('2023-01-01'); // clone_start
        });

        it('should select a plant with minimal attributes', async () => {
            // Switch to seedling tab
            (element as any)._activeTab = 'seedling';
            await element.updateComplete;

            const select = element.shadowRoot?.querySelector('md3-select') as HTMLElement;
            select.dispatchEvent(new CustomEvent('change', { detail: 'p2' }));
            await element.updateComplete;

            expect((element as any)._selectedTransplantPlant).toEqual(mockPlants[1]);

            const infoValues = element.shadowRoot?.querySelectorAll('.info-value');
            expect(infoValues?.[1].textContent).toBe('N/A'); // Pheno
            expect(infoValues?.[4].textContent).toBe('N/A'); // seedling_start
        });

        it('should submit transplant payload', async () => {
            // Setup
            (element as any)._activeTab = 'clone';
            (element as any)._selectedTransplantPlant = mockPlants[0];
            element.row = 0; // target row 1
            element.col = 0; // target col 1
            await element.updateComplete;

            const submitSpy = vi.fn();
            element.addEventListener('transplant-plant-submit', submitSpy);

            const btn = element.shadowRoot?.querySelector('.primary') as HTMLElement;
            expect(btn.hasAttribute('disabled')).toBe(false);
            btn.click();

            expect(submitSpy).toHaveBeenCalled();
            const detail = submitSpy.mock.calls[0][0].detail;

            // Should verify payload
            expect(detail).toEqual(expect.objectContaining({
                plant_id: 'p1',
                source_growspace_id: 'gs_source',
                target_growspace_id: 'gs_target',
                new_row: 1,
                new_col: 1
                // veg_start is dynamic (today)
            }));
            expect(detail.veg_start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        it('should not submit if no plant selected', async () => {
            (element as any)._activeTab = 'clone';
            (element as any)._selectedTransplantPlant = null;
            await element.updateComplete;

            const submitSpy = vi.fn();
            element.addEventListener('transplant-plant-submit', submitSpy);

            // Button should likely be disabled, but if we force click or call confirm:
            (element as any)._confirm(); // Force call

            expect(submitSpy).not.toHaveBeenCalled();
        });

        it('should update state to null if wrong plant id selected', async () => {
            (element as any)._activeTab = 'clone';
            await element.updateComplete;

            const select = element.shadowRoot?.querySelector('md3-select') as HTMLElement;
            select.dispatchEvent(new CustomEvent('change', { detail: 'non_existent' }));
            await element.updateComplete;

            expect((element as any)._selectedTransplantPlant).toBeNull();
        });

        it('should handle Row/Col changes in transplant mode', async () => {
            (element as any)._activeTab = 'clone';
            await element.updateComplete;

            const rowInput = element.shadowRoot?.querySelectorAll('md3-number-input')[0] as HTMLElement;
            const colInput = element.shadowRoot?.querySelectorAll('md3-number-input')[1] as HTMLElement;

            rowInput.dispatchEvent(new CustomEvent('change', { detail: '5' }));
            colInput.dispatchEvent(new CustomEvent('change', { detail: '6' }));
            await element.updateComplete;

            expect(element.row).toBe(4);
            expect(element.col).toBe(5);
        });

        it('should switch back to add tab', async () => {
            (element as any)._activeTab = 'clone';
            await element.updateComplete;

            const addTab = element.shadowRoot?.querySelectorAll('.tab')[0] as HTMLElement;
            addTab.click();
            await element.updateComplete;

            expect((element as any)._activeTab).toBe('add');
            expect((element as any)._selectedTransplantPlant).toBeNull();
        });
    });
});