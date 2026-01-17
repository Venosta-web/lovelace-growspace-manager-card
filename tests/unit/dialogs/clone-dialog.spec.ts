
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CloneDialog } from '../../../src/dialogs/clone-dialog';
import { GrowspaceUIStore } from '../../../src/store/ui-store';
import { GrowspaceStore } from '../../../src/store/growspace-store';

describe('CloneDialog', () => {
    let element: CloneDialog;
    let mockStore: any;
    let mockUI: any;

    beforeEach(async () => {
        // Mock dependencies
        mockUI = {
            closeDialog: vi.fn()
        };
        mockStore = {
            ui: mockUI
        };

        element = new CloneDialog();
        element.store = mockStore;
        element.hass = {} as any; // Mock hass if needed
        element.open = true; // Open by default for most tests

        // Mock source plant
        element.sourcePlant = {
            entity_id: 'sensor.mother_plant',
            state: 'mother',
            attributes: {
                plant_id: 'mother_1',
                strain: 'Blue Dream',
                phenotype: 'Pheno #5',
                // Add required properties to satisfy type
                entity_id: 'sensor.mother_plant',
                stage: 'mother',
                row: 1,
                col: 1,
                growspace_id: 'gs1',
                planted_at: null,
                harvest_at: null
            },
            context: { id: 'ctx', parent_id: null, user_id: null },
            last_changed: '',
            last_updated: ''
        } as any;

        element.growspaceOptions = {
            'gs1': 'Nursery',
            'gs2': 'Veg Tent'
        };

        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (element.isConnected) {
            document.body.removeChild(element);
        }
        vi.clearAllMocks();
    });

    it('should be defined', () => {
        expect(element).toBeInstanceOf(CloneDialog);
    });

    it('should not render when closed', async () => {
        element.open = false;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('ha-dialog')).toBeNull();
    });

    it('should not render when sourcePlant is missing', async () => {
        element.sourcePlant = undefined;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('ha-dialog')).toBeNull();
    });

    it('should render correct details from source plant', async () => {
        const title = element.shadowRoot?.querySelector('.dialog-title')?.textContent;
        const subtitle = element.shadowRoot?.querySelector('.dialog-subtitle')?.textContent;
        const strain = element.shadowRoot?.querySelector('.source-info-value')?.textContent;

        expect(title).toBe('Take Clone');
        expect(subtitle).toContain('Blue Dream');
        expect(strain).toBe('Blue Dream');
    });

    it('should handle missing plant attributes gracefully', async () => {
        element.sourcePlant = {
            entity_id: 'sensor.unknown',
            state: 'mother',
            attributes: {}, // No strain/phenotype
        } as any;
        await element.updateComplete;

        const infoValues = element.shadowRoot?.querySelectorAll('.source-info-value');
        expect(infoValues?.[0]?.textContent).toBe('Unknown Strain');
        expect(infoValues?.[1]?.textContent).toBe('No Phenotype');
    });

    it('should initialize with default values', () => {
        // accessing private state via casting
        expect((element as any)._numClones).toBe(1);
    });

    it('should update target growspace when defaultGrowspace prop changes', async () => {
        element.defaultGrowspace = 'gs2';
        // Trigger willUpdate via property change
        await element.updateComplete;

        expect((element as any)._targetGrowspace).toBe('gs2');

        // Verify it doesn't overwrite user selection
        const select = element.shadowRoot?.querySelector('md3-select') as HTMLElement;
        select.dispatchEvent(new CustomEvent('change', { detail: 'gs1' }));
        await element.updateComplete;

        element.defaultGrowspace = 'gs2'; // Should be ignored as user selected something
        await element.updateComplete;
        expect((element as any)._targetGrowspace).toBe('gs1');
    });

    it('should update number of clones on input change', async () => {
        const input = element.shadowRoot?.querySelector('md3-number-input') as HTMLElement;
        expect(input).toBeDefined();

        input.dispatchEvent(new CustomEvent('change', { detail: 5 }));
        await element.updateComplete;

        expect((element as any)._numClones).toBe(5);
        expect(element.shadowRoot?.querySelector('.button-group .primary')?.textContent?.trim())
            .toBe('Take 5 Clones');
    });

    it('should handle invalid clone input', async () => {
        const input = element.shadowRoot?.querySelector('md3-number-input') as HTMLElement;
        input.dispatchEvent(new CustomEvent('change', { detail: 'nan' }));
        await element.updateComplete;

        // Should fallback to 1
        expect((element as any)._numClones).toBe(1);
    });

    it('should close dialog on cancel click', async () => {
        const cancelBtn = element.shadowRoot?.querySelector('.button-group .text') as HTMLButtonElement;
        expect(cancelBtn.textContent).toBe('Cancel');

        cancelBtn.click();

        expect(mockUI.closeDialog).toHaveBeenCalled();
    });

    it('should close dialog on header close click', async () => {
        const closeBtn = element.shadowRoot?.querySelector('.dialog-header .text') as HTMLButtonElement;
        closeBtn.click();
        expect(mockUI.closeDialog).toHaveBeenCalled();
    });

    it('should dispatch take-clone-submit event and close on save', async () => {
        const spy = vi.fn();
        element.addEventListener('take-clone-submit', spy);

        // Set values
        const numInput = element.shadowRoot?.querySelector('md3-number-input') as HTMLElement;
        numInput.dispatchEvent(new CustomEvent('change', { detail: 3 }));

        const selectInput = element.shadowRoot?.querySelector('md3-select') as HTMLElement;
        selectInput.dispatchEvent(new CustomEvent('change', { detail: 'gs2' }));

        await element.updateComplete;

        const saveBtn = element.shadowRoot?.querySelector('.button-group .primary') as HTMLButtonElement;
        saveBtn.click();

        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0].detail).toEqual({
            motherPlantId: 'mother_1',
            numClones: 3,
            targetGrowspaceId: 'gs2'
        });

        expect(mockUI.closeDialog).toHaveBeenCalled();
    });

    it('should use fallback plant id if attribute missing', async () => {
        element.sourcePlant = {
            entity_id: 'sensor.fallback_test',
            state: 'mother',
            attributes: {}
        } as any;
        await element.updateComplete;

        const spy = vi.fn();
        element.addEventListener('take-clone-submit', spy);

        const saveBtn = element.shadowRoot?.querySelector('.button-group .primary') as HTMLButtonElement;
        saveBtn.click();

        expect(spy.mock.calls[0][0].detail.motherPlantId).toBe('fallback_test');
    });

    it('should not save if numClones < 1', async () => {
        (element as any)._numClones = 0;
        const spy = vi.fn();
        element.addEventListener('take-clone-submit', spy);

        await (element as any)._save();

        expect(spy).not.toHaveBeenCalled();
    });

    it('should not save if sourcePlant is missing', async () => {
        element.sourcePlant = undefined;
        const spy = vi.fn();
        element.addEventListener('take-clone-submit', spy);

        await (element as any)._save();
        expect(spy).not.toHaveBeenCalled();
    });

    it('should handle undefined growspaceOptions', async () => {
        element.growspaceOptions = undefined as any;
        await element.updateComplete;

        const select = element.shadowRoot?.querySelector('md3-select');
        expect(select).toBeDefined();
        // verifying it doesn't crash is enough, but we can check options length
        expect((select as any).options).toEqual([]);
    });

    it('should show correct button state while submitting', async () => {
        (element as any)._submitting = true;
        await element.updateComplete;

        const btn = element.shadowRoot?.querySelector('.button-group .primary');
        expect(btn?.textContent?.trim()).toBe('Creating...');
        expect(btn?.hasAttribute('disabled')).toBe(true);
    });

    it('should show correct singular/plural text', async () => {
        // Default is 1
        let btn = element.shadowRoot?.querySelector('.button-group .primary');
        expect(btn?.textContent?.trim()).toBe('Take 1 Clone');

        // Change to 2
        (element as any)._numClones = 2;
        await element.updateComplete;
        btn = element.shadowRoot?.querySelector('.button-group .primary');
        expect(btn?.textContent?.trim()).toBe('Take 2 Clones');
    });

    it('should default to 1 clone if state is NaN during save', async () => {
        (element as any)._numClones = NaN;
        const spy = vi.fn();
        element.addEventListener('take-clone-submit', spy);

        await (element as any)._save();

        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0].detail.numClones).toBe(1);
    });

    it('should handle save error (finally block coverage)', async () => {
        // Force an error in dispatchEvent or pre-calculation
        const spy = vi.spyOn(element, 'dispatchEvent').mockImplementation(() => {
            throw new Error('Test Error');
        });

        try {
            await (element as any)._save();
        } catch (e) {
            // Ignore
        }

        expect((element as any)._submitting).toBe(false);
        spy.mockRestore();
    });
});
