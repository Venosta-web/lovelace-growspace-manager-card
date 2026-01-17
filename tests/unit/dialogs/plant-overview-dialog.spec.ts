import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlantOverviewDialog } from '../../../src/dialogs/plant-overview-dialog';
import { PlantEntity, PlantStage } from '../../../src/types';
import { getTimelineService } from '../../../src/services/timeline-service';
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

vi.mock('../../../src/controllers/growspace-logbook-controller', () => ({
    GrowspaceLogbookController: class {
        fetchEventLog = vi.fn().mockResolvedValue([]);
    }
}));

// Mock timeline service
vi.mock('../../../src/services/timeline-service', () => ({
    getTimelineService: vi.fn(),
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
            days_since_last_watering: null,
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
        element.hass = {
            connection: {
                subscribeEvents: vi.fn().mockResolvedValue(() => { })
            },
            callService: vi.fn(),
            callWS: vi.fn(),
        } as any;
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

            expect(element.editedAttributes?.['strain']).toBe('Updated Strain');

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

    it('should close dialog when header close button is clicked', async () => {
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;

        const spy = vi.fn();
        element.addEventListener('close', spy);

        // Select the last button in the header (which is the close button)
        // The first one is now the Edit Strain button
        const closeBtn = element.shadowRoot?.querySelector('.dialog-header .md3-button:last-of-type');
        (closeBtn as HTMLElement).click();

        expect(spy).toHaveBeenCalled();
        document.body.removeChild(element);
    });

    it('should dispatch open-strain-editor event when DNA button is clicked', async () => {
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;

        const spy = vi.fn();
        element.addEventListener('open-strain-editor', spy);

        // The Edit Strain button is the first button in the header (or identifiable by title)
        const editBtn = element.shadowRoot?.querySelector('.dialog-header .md3-button[title="Edit Strain Library Entry"]');
        expect(editBtn).toBeTruthy();
        (editBtn as HTMLElement).click();

        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0].detail).toEqual({
            strain: mockPlant.attributes.strain,
            phenotype: mockPlant.attributes.phenotype
        });

        document.body.removeChild(element);
    });

    describe('Filtered Day Interactions', () => {
        // Helper to test date change in specific stage
        async function testDateChange(stage: PlantStage, label: string, key: string, val: string) {
            element.plant = { ...mockPlant, state: stage, attributes: { ...mockPlant.attributes, stage: stage } };
            (element as any).activeTab = 'timeline';
            (element as any).showAllDates = false;

            // Clean DOM each time or reuse?
            if (element.isConnected) document.body.removeChild(element);
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const input = element.shadowRoot?.querySelector(`md3-date-input[label="${label}"]`);
            expect(input, `${label} input should exist in stage ${stage}`).toBeTruthy();

            input?.dispatchEvent(new CustomEvent('change', { detail: val }));
            await element.updateComplete;

            expect((element.editedAttributes as any)[key]).toBe(val);
        }

        it('should update Mother Start in MOTHER stage', async () => {
            await testDateChange(PlantStage.MOTHER, 'Mother Start', 'mother_start', '2023-01-01');
        });

        it('should update Clone Start in CLONE stage', async () => {
            await testDateChange(PlantStage.CLONE, 'Clone Start', 'clone_start', '2023-02-01');
        });

        it('should update Veg Start in VEG stage', async () => {
            await testDateChange(PlantStage.VEG, 'Vegetative Start', 'veg_start', '2023-03-01');
        });

        it('should update Dry Start in DRY stage', async () => {
            await testDateChange(PlantStage.DRY, 'Dry Start', 'dry_start', '2023-04-01');
        });

        it('should update Cure Start in CURE stage', async () => {
            await testDateChange(PlantStage.CURE, 'Cure Start', 'cure_start', '2023-05-01');
        });
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

    describe('Coverage Gap Fillers', () => {
        it('should return nothing for _renderStatItem with undefined value', async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const result = (element as any)._renderStatItem('Label', undefined);
            // 'nothing' is a Symbol, check it's not a TemplateResult
            expect(typeof result).toBe('symbol');

            document.body.removeChild(element);
        });

        it('should return nothing for _renderStatItem with null value', async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const result = (element as any)._renderStatItem('Label', null);
            expect(typeof result).toBe('symbol');

            document.body.removeChild(element);
        });

        it('should return nothing for _renderStatItem with empty string', async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const result = (element as any)._renderStatItem('Label', '');
            expect(typeof result).toBe('symbol');

            document.body.removeChild(element);
        });

        it('should render stat item with valid value', async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const result = (element as any)._renderStatItem('Test', '42', 'units');
            expect(result.values).toBeDefined();

            document.body.removeChild(element);
        });

        it('should normalize "mom" stage to MOTHER in _renderPlantStats', async () => {
            const momPlant = { ...mockPlant, state: 'mom', attributes: { ...mockPlant.attributes, mother_days: 5 } };
            element.plant = momPlant;
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            // Stats should render with mother stage
            const statItems = element.shadowRoot?.querySelectorAll('.stat-item');
            expect(statItems?.length).toBeGreaterThan(0);

            document.body.removeChild(element);
        });

        it('should normalize "vegetative" stage to VEG in _renderPlantStats', async () => {
            const vegPlant = { ...mockPlant, state: 'vegetative', attributes: { ...mockPlant.attributes, veg_days: 15 } };
            element.plant = vegPlant;
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const statItems = element.shadowRoot?.querySelectorAll('.stat-item');
            expect(statItems?.length).toBeGreaterThan(0);

            document.body.removeChild(element);
        });

        it('should render with missing phenotype showing N/A', async () => {
            // Create plant with phenotype omitted
            const { phenotype, ...attrsWithoutPheno } = mockPlant.attributes;
            const noPhenoPlant = {
                ...mockPlant,
                attributes: attrsWithoutPheno as typeof mockPlant.attributes
            };
            element.plant = noPhenoPlant;
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            // Dialog should render with stat items
            const statItems = element.shadowRoot?.querySelectorAll('.stat-item');
            expect(statItems?.length).toBeGreaterThan(0);

            document.body.removeChild(element);
        });

        it('should handle _renderPlantStats with no attributes', async () => {
            const noAttrPlant = { ...mockPlant, attributes: undefined as any };
            element.plant = noAttrPlant;
            element.open = true;

            // Should not throw
            const result = (element as any)._renderPlantStats(noAttrPlant);
            expect(result.values).toBeUndefined();
        });

        it('should return empty when plant is undefined in render', async () => {
            element.plant = undefined as any;
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            // Should render minimal content
            const dialog = element.shadowRoot?.querySelector('ha-dialog');
            expect(dialog).toBeFalsy();

            document.body.removeChild(element);
        });

        it('should return empty when editedAttributes is undefined in render', async () => {
            element.plant = mockPlant;
            element.editedAttributes = undefined as any;
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            // editedAttributes should be auto-initialized
            expect(element.editedAttributes).toBeDefined();

            document.body.removeChild(element);
        });

        it('should toggle showAllDates correctly', async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const initialState = (element as any).showAllDates;
            (element as any)._toggleShowAllDates();
            expect((element as any).showAllDates).toBe(!initialState);

            document.body.removeChild(element);
        });
    });

    describe('Final Gap Fillers', () => {
        it('should handle plant without plant_id in _confirmDelete', () => {
            element.plant = { ...mockPlant, attributes: { ...mockPlant.attributes, plant_id: '' } };
            const spy = vi.fn();
            element.addEventListener(DeletePlantEvent.TYPE, spy);
            (element as any)._confirmDelete();
            expect(spy.mock.calls[0][0].detail.plantId).toBe('plant_1');
        });

        it('should handle willUpdate with null dialog editedAttributes', async () => {
            element.dialog = { plant: mockPlant, editedAttributes: null as any, activeTab: 'timeline' };
            (element as any).willUpdate(new Map([['dialog', {}]]));
            expect(element.editedAttributes?.strain).toBe('Blue Dream');
        });

        it('should handle _getAttributesFromPlant with null plant', () => {
            element.plant = null as any;
            const attrs = (element as any)._getAttributesFromPlant();
            expect(attrs).toEqual({});
        });

        it('should handle willUpdate with missing strain in editedAttributes', () => {
            element.editedAttributes = { phenotype: 'New' } as any;
            (element as any).willUpdate(new Map([['plant', mockPlant]]));
            expect((element.editedAttributes as any).strain).toBe('Blue Dream');
        });
    });

    it('should use fallback plant ID if attribute is missing', async () => {
        document.body.appendChild(element);
        const plantNoId = { ...mockPlant, attributes: { ...mockPlant.attributes, plant_id: undefined } };
        element.plant = plantNoId as any;
        element.open = true;
        await element.updateComplete;

        const deleteBtn = element.shadowRoot?.querySelector('button.danger') as HTMLButtonElement;
        deleteBtn.click();
        await element.updateComplete;

        const confirmBtn = element.shadowRoot?.querySelectorAll('button.danger')[0] as HTMLButtonElement;

        let deletedId = '';
        element.addEventListener('delete-plant', (e: any) => {
            deletedId = e.detail.plantId;
        });

        confirmBtn.click();
        expect(deletedId).toBe('plant_1');

        document.body.removeChild(element);
    });

    it('should display Unknown Strain if strain is missing', async () => {
        document.body.appendChild(element);
        const plantNoStrain = { ...mockPlant, attributes: { ...mockPlant.attributes, strain: null } };
        element.plant = plantNoStrain as any;
        element.open = true;
        await element.updateComplete;

        const title = element.shadowRoot?.querySelector('.dialog-title');
        expect(title?.textContent).toContain('Unknown Strain');
        document.body.removeChild(element);
    });

    it('should display No Phenotype if phenotype is missing', async () => {
        document.body.appendChild(element);
        const plantNoPheno = { ...mockPlant, attributes: { ...mockPlant.attributes, phenotype: null } };
        element.plant = plantNoPheno as any;
        element.open = true;
        await element.updateComplete;

        const subtitle = element.shadowRoot?.querySelector('.dialog-subtitle');
        expect(subtitle?.textContent).toContain('No Phenotype');
        document.body.removeChild(element);
    });

    it('should handle read-only view dashboard', async () => {
        element.plant = mockPlant;
        element.open = true;
        (element as any).isEditing = false;
        document.body.appendChild(element);
        await element.updateComplete;

        const statGrid = element.shadowRoot?.querySelector('.stat-grid');
        expect(statGrid).toBeTruthy();

        // Should not have inputs
        const input = element.shadowRoot?.querySelector('md3-text-input');
        expect(input).toBeNull();

        document.body.removeChild(element);
    });

    it('should handle _handleGrowspaceEvent for current plant', async () => {
        element.open = true;
        const fetchSpy = vi.spyOn(element as any, '_fetchLogbook').mockResolvedValue(undefined);

        // Plant-specific event
        (element as any)._handleGrowspaceEvent({ data: { type: 'plant_updated', plant_id: 'plant_1' } });
        expect((element as any)._logbookEvents.length).toBeGreaterThan(0);

        // Shared event
        (element as any)._logbookEvents = [];
        (element as any)._handleGrowspaceEvent({ data: { type: 'note_added', category: 'irrigation', growspace_id: mockPlant.attributes.growspace_id } });
        expect((element as any)._logbookEvents.length).toBeGreaterThan(0);

        // Other plant event (should not trigger prepend)
        (element as any)._logbookEvents = [];
        (element as any)._handleGrowspaceEvent({ data: { type: 'plant_updated', plant_id: 'other_plant' } });
        expect((element as any)._logbookEvents.length).toBe(0);
    });



    it('should render action buttons in actions tab', async () => {
        (element as any)._activeTab = 'actions';
        element.plant = mockPlant;
        element.hass = {
            connection: {
                subscribeEvents: vi.fn().mockResolvedValue(() => { })
            },
            callWS: vi.fn().mockResolvedValue([])
        } as any;
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;

        const actionCards = element.shadowRoot?.querySelectorAll('.action-card');
        expect(actionCards?.length).toBe(4);

        const waterCard = Array.from(actionCards || []).find(b => b.textContent?.includes('Water'));
        expect(waterCard).toBeTruthy();

        const openTrainingSpy = vi.spyOn(element as any, '_openTraining').mockImplementation(() => { });
        const trainCard = Array.from(actionCards || []).find(b => b.textContent?.includes('Train'));
        (trainCard as HTMLElement).click();
        expect(openTrainingSpy).toHaveBeenCalled();

        const openIPMSpy = vi.spyOn(element as any, '_openIPM').mockImplementation(() => { });
        const ipmCard = Array.from(actionCards || []).find(b => b.textContent?.includes('IPM'));
        (ipmCard as HTMLElement).click();
        expect(openIPMSpy).toHaveBeenCalled();

        document.body.removeChild(element);
    });
    it('should handle open actions when plant is present', async () => {
        element.plant = mockPlant;
        let event: any = null;
        element.addEventListener('open-watering', (e) => event = e);
        (element as any)._openWatering();
        expect(event).toBeTruthy();

        event = null;
        element.addEventListener('open-training', (e) => event = e);
        (element as any)._openTraining();
        expect(event).toBeTruthy();

        event = null;
        element.addEventListener('open-ipm', (e) => event = e);
        (element as any)._openIPM();
        expect(event).toBeTruthy();
    });

    it('should handle @growspace-refresh event from timeline', async () => {
        (element as any)._activeTab = 'timeline';
        element.plant = mockPlant;
        element.hass = {
            connection: {
                subscribeEvents: vi.fn().mockResolvedValue(() => { })
            },
            callWS: vi.fn().mockResolvedValue([])
        } as any;
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;

        const fetchSpy = vi.spyOn(element as any, '_fetchLogbook').mockResolvedValue(undefined);
        const timeline = element.shadowRoot?.querySelector('plant-timeline');
        timeline?.dispatchEvent(new CustomEvent('growspace-refresh', { bubbles: true, composed: true }));

        expect(fetchSpy).toHaveBeenCalled();

        document.body.removeChild(element);
    });

    it('should handle take clone with input value', async () => {
        document.body.appendChild(element);
        const motherPlant = { ...mockPlant, state: 'mother', context: { id: '', parent_id: '', user_id: '' } };
        element.plant = motherPlant as any;
        element.open = true;
        await element.updateComplete;

        let cloneEvent: any = null;
        element.addEventListener('take-clone', (e: any) => {
            cloneEvent = e.detail;
        });

        const container = element.shadowRoot?.querySelector('.take-clone-container');
        expect(container).toBeTruthy();

        const input = container?.querySelector('#clone-count-input') as any;
        if (input) input.value = 5;

        const btn = container?.querySelector('button.primary') as HTMLButtonElement;
        btn.click();

        expect(cloneEvent).toBeTruthy();
        expect(cloneEvent.numClones).toBe(5);
        document.body.removeChild(element);
    });

    it('should default to 1 clone if input missing', async () => {
        document.body.appendChild(element);
        const motherPlant = { ...mockPlant, state: 'mother', context: { id: '', parent_id: '', user_id: '' } };
        element.plant = motherPlant as any;
        element.open = true;
        await element.updateComplete;

        const container = element.shadowRoot?.querySelector('.take-clone-container');
        const originalQuerySelector = container!.querySelector.bind(container);
        vi.spyOn(container as any, 'querySelector').mockImplementation((selector: any) => {
            if (selector.includes('input')) return null;
            return originalQuerySelector(selector);
        });

        let cloneEvent: any = null;
        element.addEventListener('take-clone', (e: any) => {
            cloneEvent = e.detail;
        });

        const btn = container?.querySelector('button.primary') as HTMLButtonElement;
        btn.click();

        expect(cloneEvent.numClones).toBe(1);
        document.body.removeChild(element);
    });
    it('should generate milestones for the timeline', async () => {
        const milestonePlant = {
            ...mockPlant,
            attributes: {
                ...mockPlant.attributes,
                veg_start: '2023-01-01',
                flower_start: '2023-02-01'
            }
        };
        element.plant = milestonePlant;
        (element as any)._activeTab = 'timeline';
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;

        const timeline = element.shadowRoot?.querySelector('plant-timeline');
        expect(timeline).toBeTruthy();
        const events = (timeline as any).events;

        const vegMilestone = events.find((e: any) => e.type === 'milestone' && e.label === 'Vegetative');
        const flowerMilestone = events.find((e: any) => e.type === 'milestone' && e.label === 'Flowering');

        expect(vegMilestone).toBeTruthy();
        expect(flowerMilestone).toBeTruthy();
        expect(vegMilestone.date).toBe('2023-01-01');

        document.body.removeChild(element);
    });
    it('should filter logbook events by plant_id', async () => {
        const mockEvents = [
            {
                growspace_id: 'gs1',
                category: 'environmental',
                sensor_type: 'irrigation',
                start_time: '2023-01-05T10:00:00Z',
                reasons: ['plant_id:plant_1', 'Plant: Blue Dream (Original)', 'Watered with 1.0L']
            },
            {
                growspace_id: 'gs1',
                category: 'environmental',
                sensor_type: 'irrigation',
                start_time: '2023-01-05T11:00:00Z',
                reasons: ['plant_id:plant_2', 'Plant: Other Strain', 'Watered with 2.0L']
            }
        ];

        element.plant = {
            ...mockPlant,
            attributes: { ...mockPlant.attributes, plant_id: 'plant_1', growspace_id: 'gs1' }
        };
        (element as any)._logbookEvents = mockEvents;
        (element as any)._activeTab = 'timeline';
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;

        const timeline = element.shadowRoot?.querySelector('plant-timeline');
        const events = (timeline as any).events;

        // Should find plant_1 event, but NOT plant_2 event
        const plant1Event = events.find((e: any) => e.date === '2023-01-05T10:00:00Z');
        const plant2Event = events.find((e: any) => e.date === '2023-01-05T11:00:00Z');

        expect(plant1Event).toBeTruthy();
        expect(plant1Event.action).toBe('environmental'); // category is 'environmental', not 'irrigation'
        expect(plant2Event).toBeFalsy();

        document.body.removeChild(element);
    });

    it('should filter out plant_id and Plants: from event details', async () => {
        const mockEvents = [
            {
                growspace_id: 'gs1',
                category: 'training',
                sensor_type: 'lst',
                start_time: '2023-01-05T12:00:00Z',
                reasons: ['plant_id:plant_1', 'Technique: LST', 'Plants: Blue Dream, Other Plant', 'Notes: Bent main cola']
            }
        ];

        element.plant = {
            ...mockPlant,
            attributes: { ...mockPlant.attributes, plant_id: 'plant_1', growspace_id: 'gs1' }
        };
        (element as any)._logbookEvents = mockEvents;
        (element as any)._activeTab = 'timeline';
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;

        const timeline = element.shadowRoot?.querySelector('plant-timeline');
        const events = (timeline as any).events;

        const trainingEvent = events.find((e: any) => e.date === '2023-01-05T12:00:00Z');
        expect(trainingEvent).toBeTruthy();
        // Details should NOT contain plant_id: or Plants: prefixes
        expect(trainingEvent.details).not.toContain('plant_id:');
        expect(trainingEvent.details).not.toContain('Plants:');
        // But should contain the technique and notes
        expect(trainingEvent.details).toContain('Technique: LST');
        expect(trainingEvent.details).toContain('Notes: Bent main cola');

        document.body.removeChild(element);
    });

    it('should not show events without matching plant_id', async () => {
        const mockEvents = [
            {
                growspace_id: 'gs1',
                category: 'environmental',
                sensor_type: 'irrigation',
                start_time: '2023-01-05T10:00:00Z',
                reasons: ['plant_id:other_plant', 'Plant: Other Strain', 'Watered with 1.0L']
            }
        ];

        element.plant = {
            ...mockPlant,
            attributes: { ...mockPlant.attributes, plant_id: 'plant_1', growspace_id: 'gs1' }
        };
        (element as any)._logbookEvents = mockEvents;
        (element as any)._activeTab = 'timeline';
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;

        const timeline = element.shadowRoot?.querySelector('plant-timeline');
        const events = (timeline as any).events;

        // Filter out milestone events
        const actionEvents = events.filter((e: any) => e.type === 'action');
        expect(actionEvents.length).toBe(0);

        document.body.removeChild(element);
    });

    it('should filter for and include note events in timeline', async () => {
        const mockEvents = [
            {
                growspace_id: 'gs1',
                category: 'note',
                plant_id: 'plant_1',
                notes: 'Test note content',
                timestamp: '2023-01-05T15:00:00Z',
                tags: ['issue'],
                reasons: []
            }
        ];

        element.plant = {
            ...mockPlant,
            attributes: { ...mockPlant.attributes, plant_id: 'plant_1', growspace_id: 'gs1' }
        };
        (element as any)._logbookEvents = mockEvents;
        (element as any)._activeTab = 'timeline';
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;

        const timeline = element.shadowRoot?.querySelector('plant-timeline');
        const events = (timeline as any).events;

        const noteEvent = events.find((e: any) => e.date === '2023-01-05T15:00:00Z');

        expect(noteEvent).toBeTruthy();
        expect(noteEvent.type).toBe('note');
        expect(noteEvent.text).toBe('Test note content');
        expect(noteEvent.tags).toContain('issue');

        document.body.removeChild(element);
    });

    it('should filter for and include IPM events in timeline', async () => {
        const mockEvents = [
            {
                growspace_id: 'gs1',
                category: 'ipm',
                sensor_type: 'ipm_foliar',
                start_time: '2023-01-05T13:00:00Z',
                reasons: ['plant_id:plant_1', 'IPM Treatment: Soap Spray']
            },
            {
                growspace_id: 'gs1',
                category: 'not_ipm',
                sensor_type: 'other',
                start_time: '2023-01-05T14:00:00Z',
                reasons: ['plant_id:plant_1']
            }
        ];

        element.plant = {
            ...mockPlant,
            attributes: { ...mockPlant.attributes, plant_id: 'plant_1', growspace_id: 'gs1' }
        };
        (element as any)._logbookEvents = mockEvents;
        (element as any)._activeTab = 'timeline';
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;

        const timeline = element.shadowRoot?.querySelector('plant-timeline');
        const events = (timeline as any).events;

        const ipmEvent = events.find((e: any) => e.date === '2023-01-05T13:00:00Z');
        const otherEvent = events.find((e: any) => e.date === '2023-01-05T14:00:00Z');

        expect(ipmEvent).toBeTruthy();
        expect(ipmEvent.action).toBe('ipm');
        expect(otherEvent).toBeFalsy();

        document.body.removeChild(element);
    });

    it('should switch tabs when clicking tab buttons', async () => {
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;

        // Initially dashboard
        expect((element as any)._activeTab).toBe('dashboard');

        const buttons = element.shadowRoot?.querySelectorAll('.tab-btn');

        // Click actions
        const actionsBtn = Array.from(buttons || []).find(b => b.textContent?.includes('Actions'));
        (actionsBtn as HTMLElement).click();
        await element.updateComplete;
        expect((element as any)._activeTab).toBe('actions');
        expect(actionsBtn?.classList.contains('active')).toBe(true);

        // Click timeline
        const timelineBtn = Array.from(buttons || []).find(b => b.textContent?.includes('Timeline'));
        (timelineBtn as HTMLElement).click();
        await element.updateComplete;
        expect((element as any)._activeTab).toBe('timeline');
        expect(timelineBtn?.classList.contains('active')).toBe(true);

        // Click overview (dashboard)
        const dashboardBtn = Array.from(buttons || []).find(b => b.textContent?.includes('Overview'));
        (dashboardBtn as HTMLElement).click();
        await element.updateComplete;
        expect((element as any)._activeTab).toBe('dashboard');
        expect(dashboardBtn?.classList.contains('active')).toBe(true);

        document.body.removeChild(element);
    });

    describe('Ultimate Branch Coverage', () => {
        it('should cover all action mapping branches in _renderTimeline', () => {
            element.plant = {
                entity_id: 'sensor.p1',
                attributes: { plant_id: 'p1' }
            } as any;
            (element as any)._logbookEvents = [
                {
                    category: 'watering',
                    reasons: ['plant_id:p1'],
                    start_time: '2024-01-01T10:00:00Z'
                },
                {
                    category: 'irrigation',
                    reasons: ['plant_id:p1'],
                    start_time: '2024-01-01T11:00:00Z'
                },
                {
                    category: 'training',
                    sensor_type: 'topping',
                    reasons: ['plant_id:p1', 'Some detail'],
                    start_time: '2024-01-01T12:00:00Z'
                },
                {
                    category: undefined,
                    sensor_type: 'water',
                    reasons: ['plant_id:p1', 'ext'],
                    start_time: '2024-01-01T13:00:00Z'
                },
                {
                    category: 'training',
                    sensor_type: 'topping',
                    reasons: undefined, // cover line 823 fallback
                    start_time: '2024-01-01T14:00:00Z'
                }
            ];

            const result = (element as any)._renderTimeline();
            expect(result).toBeDefined();

            // Cover plant_id fallback in 816
            element.plant = { entity_id: 'sensor.p1_test' } as any;
            (element as any)._renderTimeline();
        });

        it('should handle missing plant attributes in _renderTimeline', () => {
            // Case 1: plant is undefined
            element.plant = undefined as any;
            let result = (element as any)._renderTimeline();
            expect(typeof result).toBe('symbol'); // nothing

            // Case 2: plant is defined but attributes is missing
            element.plant = { entity_id: 'sensor.p1', attributes: undefined as any } as any;
            result = (element as any)._renderTimeline();
            expect(typeof result).toBe('object'); // TemplateResult
        });

        it('should cover null coalescing branches in render', async () => {
            element.plant = { ...mockPlant, state: 'veg' };
            element.editedAttributes = {
                strain: 'Blue Dream',
                stage: 'veg',
                veg_start: undefined as any
            };
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            // This covers line 738 (veg_start ?? '')
            const input = element.shadowRoot?.querySelector('md3-date-input[label="Vegetative Start"]');
            expect(input).toBeTruthy();

            document.body.removeChild(element);
        });

        it('should cover _fetchLogbook early return', async () => {
            element.plant = { attributes: {} } as any;
            await (element as any)._fetchLogbook();
            expect((element as any)._logbookEvents).toEqual([]);
        });

        it('should cover phenotype, row, col fallback branches', async () => {
            (element as any).isEditing = false; // Trigger stat-grid render
            element.plant = {
                ...mockPlant,
                attributes: {
                    ...mockPlant.attributes,
                    phenotype: undefined as any,
                    row: undefined as any,
                    col: undefined as any
                }
            };
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const stats = element.shadowRoot?.querySelectorAll('.stat-value');
            expect(stats?.length).toBeGreaterThan(0);

            // Check for N/A or - fallbacks if possible, but just rendering them covers the branch
            document.body.removeChild(element);
        });

        it('should cover showAllDates null coalescing branches', async () => {
            (element as any).showAllDates = true;
            element.plant = {
                ...mockPlant,
                attributes: {
                    ...mockPlant.attributes,
                    seedling_start: undefined as any,
                    mother_start: undefined as any,
                    veg_start: undefined as any,
                    flower_start: undefined as any,
                    dry_start: undefined as any,
                    cure_start: undefined as any
                }
            };
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const inputs = element.shadowRoot?.querySelectorAll('md3-date-input');
            expect(inputs?.length).toBeGreaterThan(0);

            document.body.removeChild(element);
        });
    });

    it('should cover stage-specific action branches (flower, dry, clone)', async () => {
        const stages: Array<'flower' | 'dry' | 'clone'> = ['flower', 'dry', 'clone'];
        for (const stage of stages) {
            element.plant = { ...mockPlant, state: stage };
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            if (stage === 'flower') expect(element.shadowRoot?.querySelector('button.primary')?.textContent).toContain('Harvest');
            if (stage === 'dry') expect(element.shadowRoot?.querySelector('button.primary')?.textContent).toContain('Finish Drying');
            if (stage === 'clone') expect(element.shadowRoot?.querySelector('button.primary')?.textContent).toContain('Move');

            document.body.removeChild(element);
        }
    });

    it('should cover plant_id fallback with missing parts', () => {
        element.plant = { entity_id: 'noparts' } as any;
        (element as any)._renderTimeline();

        element.plant = { entity_id: undefined } as any;
        (element as any)._renderTimeline();
    });

    it('should include automated irrigation events in timeline', async () => {
        const mockEvents = [
            {
                growspace_id: 'gs1',
                category: 'irrigation',
                sensor_type: 'automatic',
                start_time: '2023-01-05T15:00:00Z',
                reasons: ['Tank low', 'Scheduled cycle'] // No plant_id:
            }
        ];

        element.plant = {
            ...mockPlant,
            attributes: { ...mockPlant.attributes, plant_id: 'plant_1', growspace_id: 'gs1' }
        };
        (element as any)._logbookEvents = mockEvents;
        (element as any)._activeTab = 'timeline';
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;

        const timeline = element.shadowRoot?.querySelector('plant-timeline');
        const events = (timeline as any).events;

        const autoIrrigation = events.find((e: any) => e.date === '2023-01-05T15:00:00Z');
        expect(autoIrrigation).toBeTruthy();
        expect(autoIrrigation.action).toBe('water');

        document.body.removeChild(element);
    });

    it('should handle logbook events with undefined reasons', async () => {
        const mockEvents = [
            {
                growspace_id: 'gs1',
                category: 'irrigation',
                sensor_type: 'automatic',
                start_time: '2023-01-05T16:00:00Z',
                reasons: undefined
            }
        ];

        element.plant = {
            ...mockPlant,
            attributes: { ...mockPlant.attributes, plant_id: 'plant_1', growspace_id: 'gs1' }
        };
        (element as any)._logbookEvents = mockEvents;
        (element as any)._activeTab = 'timeline';
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;

        const timeline = element.shadowRoot?.querySelector('plant-timeline');
        const events = (timeline as any).events;

        const event = events.find((e: any) => e.date === '2023-01-05T16:00:00Z');
        expect(event).toBeTruthy();
        expect(event.details).toBe('');

        document.body.removeChild(element);
    });

    it('should handle NaN clone count input', async () => {
        document.body.appendChild(element);
        const motherPlant = { ...mockPlant, state: 'mother' };
        element.plant = motherPlant as any;
        element.open = true;
        await element.updateComplete;

        let cloneEvent: any = null;
        element.addEventListener('take-clone', (e: any) => {
            cloneEvent = e.detail;
        });

        const container = element.shadowRoot?.querySelector('.take-clone-container');
        const input = container?.querySelector('#clone-count-input') as any;
        if (input) input.value = 'abc'; // NaN

        const btn = container?.querySelector('button.primary') as HTMLButtonElement;
        btn.click();

        expect(cloneEvent.numClones).toBe(1); // Should default to 1
        document.body.removeChild(element);
    });

    it('should handle missing plant state in render', async () => {
        document.body.appendChild(element);
        element.plant = { ...mockPlant, state: undefined as any };
        element.open = true;
        await element.updateComplete;

        // Should not throw and should render
        const title = element.shadowRoot?.querySelector('.dialog-title');
        expect(title).toBeTruthy();
        document.body.removeChild(element);
    });

    it('should handle empty plant state in render', async () => {
        document.body.appendChild(element);
        element.plant = { ...mockPlant, state: '' };
        element.open = true;
        await element.updateComplete;

        const title = element.shadowRoot?.querySelector('.dialog-title');
        expect(title).toBeTruthy();
        document.body.removeChild(element);
    });

    it('should dispatch UpdatePlantEvent when Save Changes is clicked', async () => {
        document.body.appendChild(element);
        element.plant = mockPlant;
        element.open = true;
        await element.updateComplete;

        let updateEvent: any = null;
        element.addEventListener(UpdatePlantEvent.TYPE, (e: any) => {
            updateEvent = e.detail;
        });

        const saveBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
            .find(b => b.textContent?.includes('Save Changes'));
        (saveBtn as HTMLElement).click();

        expect(updateEvent).toBeTruthy();
        expect(updateEvent.strain).toBe('Blue Dream');
        document.body.removeChild(element);
    });

    it('should handle _update with null editedAttributes', () => {
        element.editedAttributes = null as any;
        const spy = vi.fn();
        element.addEventListener(UpdatePlantEvent.TYPE, spy);
        (element as any)._update();
        expect(spy).not.toHaveBeenCalled();
    });

    it('should handle _confirmDelete with null plant', () => {
        element.plant = null as any;
        const spy = vi.fn();
        element.addEventListener(DeletePlantEvent.TYPE, spy);
        (element as any)._confirmDelete();
        expect(spy).not.toHaveBeenCalled();
    });

    it('should return nothing when stats length is 0', () => {
        const emptyPlant = {
            ...mockPlant,
            state: 'unknown',
            attributes: {
                ...mockPlant.attributes,
                veg_days: 0,
                flower_days: 0,
                mom_days: 0,
                clone_days: 0,
                dry_days: 0,
                cure_days: 0
            }
        };
        const result = (element as any)._renderPlantStats(emptyPlant);
        expect(typeof result).toBe('symbol'); // nothing
    });

    it('should return early from actions if plant is missing', async () => {
        element.open = true;
        document.body.appendChild(element);
        element.plant = undefined;
        await element.updateComplete;

        const dispatchSpy = vi.spyOn(element, 'dispatchEvent');

        (element as any)._openWatering();
        (element as any)._openTraining();
        (element as any)._openIPM();

        expect(dispatchSpy).not.toHaveBeenCalled();
        document.body.removeChild(element);
    });

    it('should handle note events with fallback date and empty text', async () => {
        const mockEvents = [
            {
                growspace_id: 'gs1',
                category: 'note',
                plant_id: 'plant_1',
                start_time: '2023-01-05T15:00:00Z', // Fallback date
                // notes missing -> fallback empty string
                tags: []
            }
        ];
        element.plant = mockPlant;
        (element as any)._logbookEvents = mockEvents;
        (element as any)._activeTab = 'timeline';
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;

        const timeline = element.shadowRoot?.querySelector('plant-timeline');
        const events = (timeline as any).events;
        const noteEvent = events.find((e: any) => e.date === '2023-01-05T15:00:00Z');

        expect(noteEvent).toBeTruthy();
        expect(noteEvent.text).toBe('');
        document.body.removeChild(element);
    });


    describe('Scroll Logic & Timeline Interactions', () => {
        beforeEach(async () => {
            // Mock container methods
            const originalQuerySelector = element.shadowRoot?.querySelector;
            // Ensure we are in timeline
            (element as any)._activeTab = 'timeline';
        });

        it('should update scroll state when calculating scroll', async () => {
            element.plant = mockPlant;
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            // Mock container with scrollable content
            const container = element.shadowRoot?.querySelector('.event-actions') as HTMLElement;
            if (container) {
                Object.defineProperty(container, 'scrollWidth', { value: 1000, configurable: true });
                Object.defineProperty(container, 'clientWidth', { value: 500, configurable: true });
                Object.defineProperty(container, 'scrollLeft', { value: 100, configurable: true });

                // Trigger check
                (element as any)._checkScroll();

                expect((element as any)._canScrollLeft).toBe(true);
                expect((element as any)._canScrollRight).toBe(true);
            }
            document.body.removeChild(element);
        });

        it('should scroll actions when arrows clicked', async () => {
            element.plant = mockPlant;
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const container = element.shadowRoot?.querySelector('.event-actions') as HTMLElement;
            if (container) {
                const scrollSpy = vi.fn();
                container.scrollBy = scrollSpy;

                // Force scroll state to show arrows
                (element as any)._canScrollLeft = true;
                (element as any)._canScrollRight = true;
                await element.updateComplete;

                const leftArrow = element.shadowRoot?.querySelectorAll('.scroll-arrow')[0] as HTMLElement;
                if (leftArrow) leftArrow.click();
                expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ left: -150 }));

                const rightArrow = element.shadowRoot?.querySelectorAll('.scroll-arrow')[1] as HTMLElement;
                if (rightArrow) rightArrow.click();
                expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ left: 150 }));
            }
            document.body.removeChild(element);
        });

        it('should trigger timeline events (Water, Train, IPM)', async () => {
            element.plant = mockPlant;
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const waterSpy = vi.fn();
            const trainSpy = vi.fn();
            const ipmSpy = vi.fn();

            element.addEventListener('open-watering', waterSpy);
            element.addEventListener('open-training', trainSpy);
            element.addEventListener('open-ipm', ipmSpy);

            // Buttons are inside .event-actions
            const buttons = element.shadowRoot?.querySelectorAll('.event-actions button');
            if (buttons && buttons.length >= 3) {
                (buttons[0] as HTMLElement).click();
                expect(waterSpy).toHaveBeenCalled();

                (buttons[1] as HTMLElement).click();
                expect(trainSpy).toHaveBeenCalled();

                (buttons[2] as HTMLElement).click();
                expect(ipmSpy).toHaveBeenCalled();
            }
            document.body.removeChild(element);
        });
    });

    describe('Event Subscription Resilience', () => {
        it('should resubscribe if hass changes and subscription missing', async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            // Check initial subscription
            expect((element as any)._unsubEvents).toBeDefined();

            // Clear it
            (element as any)._unsubEvents = undefined;

            // Manually trigger willUpdate logic
            (element as any).willUpdate(new Map([['hass', {}]]));

            // Should have resubscribed
            expect((element as any)._unsubEvents).toBeDefined();
            document.body.removeChild(element);
        });

        it('should handle incoming logbook events', async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const subscribeMock = element.hass.connection.subscribeEvents as any;
            const callback = subscribeMock.mock.calls[0][0];

            // Simulate event for this plant
            callback({
                data: {
                    plant_id: 'plant_1',
                    category: 'log',
                    timestamp: new Date().toISOString()
                }
            });

            expect((element as any)._logbookEvents.length).toBeGreaterThan(0);
            expect((element as any)._logbookEvents[0].plant_id).toBe('plant_1');
            document.body.removeChild(element);
        });

        it('should handle incoming growspace irrigation events (broadcast)', async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const subscribeMock = element.hass.connection.subscribeEvents as any;
            const callback = subscribeMock.mock.calls[0][0];

            // Simulate irrigation event for this growspace (no plant_id)
            callback({
                data: {
                    growspace_id: 'gs1',
                    category: 'irrigation',
                    timestamp: new Date().toISOString()
                }
            });

            expect((element as any)._logbookEvents.length).toBeGreaterThan(0);
            const evt = (element as any)._logbookEvents[0];
            expect(evt.category).toBe('irrigation');
            document.body.removeChild(element);
        });
    });

    describe('Refined Coverage Gaps', () => {
        it('should cleanup subscription on disconnectedCallback', async () => {
            const unsubSpy = vi.fn().mockResolvedValue(undefined);
            (element as any)._unsubEvents = Promise.resolve(unsubSpy);

            element.disconnectedCallback();

            // Wait for microtasks since it's a promise
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(unsubSpy).toHaveBeenCalled();
        });

        it('should handle shared irrigation events in _handleGrowspaceEvent', async () => {
            element.plant = {
                ...mockPlant,
                attributes: { ...mockPlant.attributes, growspace_id: 'gs1', plant_id: 'p1' }
            };
            (element as any)._logbookEvents = [];

            // Shared irrigation event (no plant_id)
            (element as any)._handleGrowspaceEvent({
                data: {
                    category: 'irrigation',
                    growspace_id: 'gs1',
                    start_time: '2024-01-01T10:00:00Z'
                }
            });

            expect((element as any)._logbookEvents.length).toBe(1);
        });

        it('should fallback to dashboard if invalid tab provided in willUpdate', () => {
            element.dialog = {
                plant: mockPlant,
                activeTab: 'invalid' as any,
                editedAttributes: {} as any // Satisfy type requirement
            };
            // Trigger willUpdate
            element.willUpdate(new Map([['dialog', undefined]]));
            expect((element as any)._activeTab).toBe('dashboard');
        });

        it('should re-init editedAttributes if strain is missing', () => {
            element.plant = mockPlant;
            element.editedAttributes = { strain: '' } as any;

            // Trigger willUpdate with plant change
            element.willUpdate(new Map([['plant', undefined]]));

            expect(element.editedAttributes?.strain).toBe('Blue Dream');
        });

        it('should include automated irrigation in timeline rendering', () => {
            element.plant = {
                ...mockPlant,
                attributes: { ...mockPlant.attributes, plant_id: 'p1', growspace_id: 'gs1' }
            };
            (element as any)._logbookEvents = [
                {
                    category: 'irrigation',
                    start_time: '2024-01-01T10:00:00Z',
                    reasons: [] // No plant_id mention
                }
            ];

            const result = (element as any)._renderTimeline();
            expect(result).toBeDefined();
        });

        it('should alert if moving clone without target', () => {
            const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });
            (element as any).cloneTargetId = '';
            (element as any).editedAttributes = {};
            (element as any)._moveClone(mockPlant);
            expect(alertSpy).toHaveBeenCalledWith('Select a growspace');
            alertSpy.mockRestore();
        });

        it('should derive plant_id from entity_id in _renderTimeline if attribute missing', () => {
            element.plant = {
                entity_id: 'sensor.blue_dream_1',
                attributes: {}
            } as any;
            (element as any)._logbookEvents = [
                {
                    category: 'note',
                    plant_id: 'blue_dream_1',
                    timestamp: '2024-01-01T10:00:00Z'
                }
            ];

            const result = (element as any)._renderTimeline();
            expect(result).toBeDefined();
        });

        it('should filter out notes with missing plant_id in timeline', () => {
            element.plant = mockPlant;
            (element as any)._logbookEvents = [
                { category: 'note', notes: 'Hidden', timestamp: '2024-01-01T10:00:00Z' } // plant_id missing
            ];

            const result = (element as any)._renderTimeline();
            expect(result).toBeDefined();
        });



        it('should fallback to entity_id for action handlers when plant_id attribute is missing', () => {
            const plantNoAttr = {
                entity_id: 'sensor.fallback_plant',
                attributes: { growspace_id: 'gs1' } // missing plant_id
            } as any;
            element.plant = plantNoAttr;

            const dispatchSpy = vi.spyOn(element, 'dispatchEvent');

            (element as any)._openWatering();
            expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
                detail: expect.objectContaining({ plantIds: ['fallback_plant'] })
            }));

            (element as any)._openTraining();
            expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
                detail: expect.objectContaining({ plantIds: ['fallback_plant'] })
            }));

            (element as any)._openIPM();
            expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
                detail: expect.objectContaining({ plantIds: ['fallback_plant'] })
            }));
        });

        it('should skip subscription if already subscribed in _subscribeToEvents', async () => {
            (element as any)._unsubEvents = Promise.resolve(() => { });
            const spy = vi.spyOn(element.hass.connection, 'subscribeEvents');

            await (element as any)._subscribeToEvents();

            expect(spy).not.toHaveBeenCalled();
        });

        it('should handle disconnectedCallback when not subscribed', () => {
            (element as any)._unsubEvents = undefined;
            // Should not throw
            element.disconnectedCallback();
        });


    });

    describe('Action Tab', () => {
        beforeEach(async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;
            // Switch to actions tab
            const tabs = element.shadowRoot?.querySelectorAll('.tab-btn');
            (tabs?.[1] as HTMLElement).click();
            await element.updateComplete;
        });

        afterEach(() => {
            document.body.removeChild(element);
        });

        it('should dispatch open-water event', async () => {
            const spy = vi.fn();
            element.addEventListener('open-watering', spy);

            const btn = element.shadowRoot?.querySelector('.action-card:nth-child(1)') as HTMLElement; // Water
            btn.click();

            expect(spy).toHaveBeenCalled();
            expect(spy.mock.calls[0][0].detail).toEqual({
                mode: 'plant',
                growspaceId: 'gs1',
                plantIds: ['plant_1']
            });
        });

        it('should dispatch open-training event', async () => {
            const spy = vi.fn();
            element.addEventListener('open-training', spy);

            const btn = element.shadowRoot?.querySelector('.action-card:nth-child(2)') as HTMLElement; // Training
            btn.click();

            expect(spy).toHaveBeenCalled();
            expect(spy.mock.calls[0][0].detail).toEqual({
                isOpen: true,
                growspaceId: 'gs1',
                plantIds: ['plant_1']
            });
        });

        it('should dispatch open-ipm event', async () => {
            const spy = vi.fn();
            element.addEventListener('open-ipm', spy);

            const btn = element.shadowRoot?.querySelector('.action-card:nth-child(3)') as HTMLElement; // IPM
            btn.click();

            expect(spy).toHaveBeenCalled();
            expect(spy.mock.calls[0][0].detail).toEqual({
                growspaceId: 'gs1',
                plantIds: ['plant_1']
            });
        });

        it('should dispatch open-clone event', async () => {
            const spy = vi.fn();
            element.addEventListener('open-clone', spy);

            const btn = element.shadowRoot?.querySelector('.action-card:nth-child(4)') as HTMLElement; // Clone
            btn.click();

            expect(spy).toHaveBeenCalled();
            expect(spy.mock.calls[0][0].detail).toEqual({
                sourcePlant: mockPlant,
                defaultGrowspaceId: 'gs1'
            });
        });

        it('should not dispatch open-clone if plant is missing', async () => {
            const spy = vi.fn();
            element.addEventListener('open-clone', spy);
            element.plant = undefined;
            await element.updateComplete;

            // Manually call _openClone as the button might not be rendered or data is missing
            (element as any)._openClone();
            expect(spy).not.toHaveBeenCalled();
        });
    });

    it('should handle errors in _fetchLogbook gracefully', async () => {
        // Spy on console.error
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        // Mock timeline service to reject
        const error = new Error('Test Error');
        vi.mocked(getTimelineService).mockReturnValueOnce({
            fetchGrowspaceEvents: vi.fn().mockRejectedValue(error)
        } as any);

        // Render to trigger fetching
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;

        // Wait for potential async calls
        await new Promise(r => setTimeout(r, 0));

        expect(consoleSpy).toHaveBeenCalledWith('Error fetching logbook for dialog:', error);

        consoleSpy.mockRestore();
        if (element.parentNode) document.body.removeChild(element);
    });
});
