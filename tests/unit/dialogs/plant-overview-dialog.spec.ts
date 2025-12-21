import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlantOverviewDialog } from '../../../src/dialogs/plant-overview-dialog';
import { PlantEntity, PlantStage } from '../../../src/types';
import {
    UpdatePlantEvent,
    DeletePlantEvent,
    HarvestPlantEvent,
    FinishDryingEvent,
    TakeCloneEvent,
    MoveCloneEvent
} from '../../../src/events';

// Mock dependencies
vi.mock('../../../src/components/ui/md3-text-input', () => ({
    Md3TextInput: class extends HTMLElement { }
}));
vi.mock('../../../src/components/ui/md3-number-input', () => ({
    Md3NumberInput: class extends HTMLElement { }
}));
vi.mock('../../../src/components/ui/md3-select', () => ({
    Md3Select: class extends HTMLElement { }
}));
vi.mock('../../../src/components/ui/md3-date-input', () => ({
    Md3DateInput: class extends HTMLElement { }
}));

// Mock ha-dialog
class HaDialogMock extends HTMLElement {
    open = false;
}
customElements.define('ha-dialog', HaDialogMock);

describe('PlantOverviewDialog', () => {
    let element: PlantOverviewDialog;
    const mockPlant: PlantEntity = {
        entity_id: 'sensor.plant_1',
        state: 'veg',
        attributes: {
            plant_id: 'plant_1',
            entity_id: 'sensor.plant_1',
            strain: 'Blue Dream',
            phenotype: 'Original',
            stage: 'veg',
            row: 1,
            col: 1,
            position: '1-1',
            veg_days: 10,
            flower_days: 0,
            seedling_days: 0,
            mother_days: 0,
            clone_days: 0,
            dry_days: 0,
            cure_days: 0,
            veg_start: '2023-01-01',
            flower_start: null,
            seedling_start: null,
            mother_start: null,
            clone_start: null,
            dry_start: null,
            cure_start: null,
            growspace_id: 'gs1'
        },
        context: { id: '1', parent_id: null, user_id: null },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        element = new PlantOverviewDialog();
        element.plant = mockPlant;
        element.hass = {} as any;
    });

    it('should be defined', () => {
        expect(customElements.get('plant-overview-dialog')).toBeDefined();
    });

    it('should render content when open', async () => {
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('ha-dialog');
        expect(dialog).toBeTruthy();

        const title = element.shadowRoot?.querySelector('.dialog-title');
        expect(title?.textContent).toBe('Blue Dream');

        document.body.removeChild(element);
    });

    it('should update edited attributes on input change', async () => {
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;

        const input = element.shadowRoot?.querySelector('md3-text-input');
        input?.dispatchEvent(new CustomEvent('change', { detail: 'New Strain' }));
        await element.updateComplete;

        expect(element.editedAttributes?.strain).toBe('New Strain');

        document.body.removeChild(element);
    });

    it('should dispatch UpdatePlantEvent on save', async () => {
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;

        const listener = vi.fn();
        element.addEventListener(UpdatePlantEvent.TYPE, listener);

        const saveBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
            .find((b: HTMLButtonElement) => b.textContent?.includes('Save'));
        (saveBtn as HTMLElement).click();

        expect(listener).toHaveBeenCalled();

        document.body.removeChild(element);
    });

    it('should show delete confirmation and dispatch DeletePlantEvent', async () => {
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;

        // Click delete
        const deleteBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
            .find((b: HTMLButtonElement) => b.textContent?.includes('Delete') && b.classList.contains('danger'));
        (deleteBtn as HTMLElement).click();
        await element.updateComplete;

        // Check overlay
        const overlay = element.shadowRoot?.querySelector('.dialog-overlay');
        expect(overlay).toBeTruthy();

        // Click confirm
        const listener = vi.fn();
        element.addEventListener(DeletePlantEvent.TYPE, listener);

        const confirmBtn = Array.from(overlay?.querySelectorAll('button') || [])
            .find((b: HTMLButtonElement) => b.textContent?.includes('Delete'));
        (confirmBtn as HTMLElement).click();

        expect(listener).toHaveBeenCalled();

        document.body.removeChild(element);
    });

    describe('Dynamic Actions', () => {
        it('should show Harvest button for Flowering plant', async () => {
            element.plant = { ...mockPlant, state: PlantStage.FLOWER };
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const harvestBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
                .find((b: HTMLButtonElement) => b.textContent?.includes('Harvest'));
            expect(harvestBtn).toBeTruthy();

            const listener = vi.fn();
            element.addEventListener(HarvestPlantEvent.TYPE, listener);
            (harvestBtn as HTMLElement).click();
            expect(listener).toHaveBeenCalled();

            document.body.removeChild(element);
        });

        it('should show Finish Drying button for Drying plant', async () => {
            element.plant = { ...mockPlant, state: PlantStage.DRY };
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const dryBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
                .find((b: HTMLButtonElement) => b.textContent?.includes('Finish Drying'));
            expect(dryBtn).toBeTruthy();

            const listener = vi.fn();
            element.addEventListener(FinishDryingEvent.TYPE, listener);
            (dryBtn as HTMLElement).click();
            expect(listener).toHaveBeenCalled();

            document.body.removeChild(element);
        });

        it('should show Take Clone button for Mother plant', async () => {
            element.plant = { ...mockPlant, state: PlantStage.MOTHER };
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const cloneBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
                .find((b: HTMLButtonElement) => b.textContent?.includes('Take Clone'));
            expect(cloneBtn).toBeTruthy();

            const listener = vi.fn();
            element.addEventListener(TakeCloneEvent.TYPE, listener);
            (cloneBtn as HTMLElement).click();
            expect(listener).toHaveBeenCalled();

            document.body.removeChild(element);
        });

        it('should show Move button for Clone plant', async () => {
            element.plant = { ...mockPlant, state: PlantStage.CLONE };
            element.growspaceOptions = { 'gs2': 'Growspace 2' };
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const moveBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
                .find((b: HTMLButtonElement) => b.textContent?.includes('Move'));
            expect(moveBtn).toBeTruthy();

            // Needs a target selected
            const select = element.shadowRoot?.querySelector('md3-select');
            select?.dispatchEvent(new CustomEvent('change', { detail: 'gs2' }));
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener(MoveCloneEvent.TYPE, listener);
            (moveBtn as HTMLElement).click();
            expect(listener).toHaveBeenCalled();

            document.body.removeChild(element);
        });
    });

    describe('Lifecycle & Reactivity', () => {
        it('should update edited attributes when plant property changes', async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const newPlant = { ...mockPlant, attributes: { ...mockPlant.attributes, strain: 'Updated Strain' } };

            // Reset editedAttributes to undefined to allow re-initialization
            element.editedAttributes = undefined;
            element.plant = newPlant;

            await element.updateComplete;

            expect(element.editedAttributes?.strain).toBe('Updated Strain');

            document.body.removeChild(element);
        });

        it('should update state from dialog property', async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const dialogState = {
                plant: { ...mockPlant, attributes: { ...mockPlant.attributes, strain: 'Dialog Strain' } },
                editedAttributes: undefined
            };
            element.dialog = dialogState as any;

            await element.updateComplete;

            expect(element.plant?.attributes?.strain).toBe('Dialog Strain');
            expect(element.editedAttributes?.strain).toBe('Dialog Strain');

            document.body.removeChild(element);
        });
    });

    describe('UI Logic', () => {
        it('should toggle showAllDates', async () => {
            (element as any).activeTab = 'timeline';
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            // Initial state: showAllDates is false
            const pencilBtn = element.shadowRoot?.querySelector('button[style*="padding: 4px"]'); // Date toggle button
            expect(pencilBtn).toBeTruthy();

            // Click to toggle
            (pencilBtn as HTMLElement).click();
            await element.updateComplete;

            // Should now show many date inputs
            let dateInputs = element.shadowRoot?.querySelectorAll('md3-date-input');
            expect(dateInputs?.length).toBeGreaterThan(2);

            // Click again to toggle off
            (pencilBtn as HTMLElement).click();
            await element.updateComplete;

            // Should show fewer inputs (filtered by stage)
            dateInputs = element.shadowRoot?.querySelectorAll('md3-date-input');
            expect(dateInputs?.length).toBeLessThan(7);

            document.body.removeChild(element);
        });

        it('should filter plant stats correctly', async () => {
            // Mock plant with mix of zero and non-zero days
            element.plant = {
                ...mockPlant,
                state: 'flower',
                attributes: {
                    ...mockPlant.attributes,
                    veg_days: 15,
                    flower_days: 0, // Should show because it's current stage
                    mom_days: 0,    // Should be hidden
                    clone_days: 0
                }
            };
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const statItems = element.shadowRoot?.querySelectorAll('.stat-grid .stat-item .stat-label');
            const labels = Array.from(statItems || []).map(el => el.textContent?.trim());

            expect(labels).toContain('Vegetative Stage');
            expect(labels).toContain('Flowering Stage');
            expect(labels).not.toContain('Mother Stage');

            document.body.removeChild(element);
        });

        it('should update date attributes on change', async () => {
            (element as any).showAllDates = true;
            (element as any).activeTab = 'timeline';
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const dateInput = element.shadowRoot?.querySelector('md3-date-input[label="Vegetative Start"]');
            expect(dateInput).toBeTruthy();

            dateInput?.dispatchEvent(new CustomEvent('change', { detail: '2023-02-01' }));
            await element.updateComplete;

            expect(element.editedAttributes?.veg_start).toBe('2023-02-01');

            document.body.removeChild(element);
        });

        it('should update date attributes in filtered view', async () => {
            // Test in FLOWER stage (filtered view)
            element.plant = { ...mockPlant, state: PlantStage.FLOWER };
            (element as any).activeTab = 'timeline';
            (element as any).showAllDates = false;
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const dateInput = element.shadowRoot?.querySelector('md3-date-input[label="Flower Start"]');
            expect(dateInput, 'Flower Start input should be visible').toBeTruthy();

            dateInput?.dispatchEvent(new CustomEvent('change', { detail: '2023-05-15' }));
            await element.updateComplete;

            expect(element.editedAttributes?.flower_start).toBe('2023-05-15');

            document.body.removeChild(element);
        });

        it('should show relevant dates for current stage', async () => {
            // Test Flower Stage (should show Veg and Flower starts)
            element.plant = { ...mockPlant, state: PlantStage.FLOWER };
            (element as any).activeTab = 'timeline';
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            let inputs = Array.from(element.shadowRoot?.querySelectorAll('md3-date-input') || []);
            let labels = inputs.map((i: Element) => i.getAttribute('label'));

            expect(labels).toContain('Vegetative Start');
            expect(labels).toContain('Flower Start');
            expect(labels).not.toContain('Dry Start');
            document.body.removeChild(element);

            // Test Dry Stage (should show Dry Start)
            element.plant = { ...mockPlant, state: PlantStage.DRY };
            element.editedAttributes = undefined;
            (element as any).activeTab = 'timeline';
            element.open = true;
            document.body.appendChild(element); // Re-append or just update? Better re-append for clean state or just rely on reactivity
            await element.updateComplete;

            inputs = Array.from(element.shadowRoot?.querySelectorAll('md3-date-input') || []);
            labels = inputs.map((i: Element) => i.getAttribute('label'));
            expect(labels).toContain('Dry Start');
            document.body.removeChild(element);
        });

        it('should handle cancel delete', async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            // Open delete overlay
            (element as any)._delete('plant_1');
            await element.updateComplete;

            let overlay = element.shadowRoot?.querySelector('.dialog-overlay');
            expect(overlay).toBeTruthy();

            // Click cancel
            const cancelBtn = Array.from(overlay?.querySelectorAll('button') || [])
                .find((b: HTMLButtonElement) => b.textContent?.includes('Cancel'));
            (cancelBtn as HTMLElement).click();
            await element.updateComplete;

            overlay = element.shadowRoot?.querySelector('.dialog-overlay');
            expect(overlay).toBeNull();

            document.body.removeChild(element);
        });
    });

    it('should update edited attributes for all input fields', async () => {
        (element as any).activeTab = 'timeline';
        (element as any).showAllDates = true;
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;

        const testCases = [
            { selector: 'md3-text-input[label="Strain Name"]', key: 'strain', val: 'New Strain' },
            { selector: 'md3-text-input[label="Phenotype"]', key: 'phenotype', val: 'New Pheno' },
            { selector: 'md3-number-input[label="Row"]', key: 'row', val: 5 },
            { selector: 'md3-number-input[label="Column"]', key: 'col', val: 5 },
            { selector: 'md3-date-input[label="Seedling Start"]', key: 'seedling_start', val: '2023-01-01' },
            { selector: 'md3-date-input[label="Mother Start"]', key: 'mother_start', val: '2023-02-01' },
            { selector: 'md3-date-input[label="Clone Start"]', key: 'clone_start', val: '2023-03-01' },
            { selector: 'md3-date-input[label="Flower Start"]', key: 'flower_start', val: '2023-05-01' },
            { selector: 'md3-date-input[label="Dry Start"]', key: 'dry_start', val: '2023-06-01' },
            { selector: 'md3-date-input[label="Cure Start"]', key: 'cure_start', val: '2023-07-01' },
        ];

        for (const test of testCases) {
            const input = element.shadowRoot?.querySelector(test.selector);
            expect(input, `Input ${test.selector} should exist`).toBeTruthy();
            input?.dispatchEvent(new CustomEvent('change', { detail: test.val }));
            await element.updateComplete;
            expect((element.editedAttributes as any)[test.key]).toBe(test.val);
        }

        document.body.removeChild(element);
    });

    describe('Action Edge Cases', () => {
        it('should use custom clone count from input', async () => {
            element.plant = { ...mockPlant, state: PlantStage.MOTHER };
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const container = element.shadowRoot?.querySelector('.take-clone-container');
            //  const input = container?.querySelector('#clone-count-input') as HTMLElement;
            const btn = container?.querySelector('button');

            // Setup mock input value
            const input = container?.querySelector('md3-number-input');
            if (input) (input as any).value = 5;

            const listener = vi.fn();
            element.addEventListener(TakeCloneEvent.TYPE, listener);

            if (btn) btn.click();

            expect(listener).toHaveBeenCalledWith(expect.objectContaining({
                detail: {
                    plant: element.plant,
                    numClones: 5
                }
            }));

            document.body.removeChild(element);
        });

        it('should warn if moving clone without target', async () => {
            element.plant = { ...mockPlant, state: PlantStage.CLONE };
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });
            const listener = vi.fn();
            element.addEventListener(MoveCloneEvent.TYPE, listener);

            // Ensure no target selected
            (element as any).cloneTargetId = '';

            const moveBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
                .find((b: HTMLButtonElement) => b.textContent?.includes('Move'));

            (moveBtn as HTMLElement).click();

            expect(alertSpy).toHaveBeenCalledWith('Select a growspace');
            expect(listener).not.toHaveBeenCalled();

            alertSpy.mockRestore();
            document.body.removeChild(element);
        });
    });
});
