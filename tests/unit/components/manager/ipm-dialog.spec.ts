
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Target the decorators directly to avoid ReferenceErrors during component import

// Mock styles to avoid imports failing
vi.mock('../../../../src/styles/shared.styles', () => ({ sharedStyles: { cssText: '' } }));
vi.mock('../../../../src/styles/variables', () => ({ variables: { cssText: '' } }));
vi.mock('../../../../src/styles/dialog.styles', () => ({ dialogStyles: { cssText: '' } }));

import { IPMDialog } from '../../../../src/components/manager/ipm-dialog';

describe('IPMDialog', () => {
    let element: IPMDialog;
    let mockStore: any;
    let mockDataService: any;
    let mockHass: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockDataService = {
            applyIPM: vi.fn().mockResolvedValue(undefined),
            saveIPMPreset: vi.fn().mockResolvedValue(undefined),
            removeIPMPreset: vi.fn().mockResolvedValue(undefined)
        };
        mockStore = {
            dataService: mockDataService,
            fetchIPMPresets: vi.fn(),
            data: {
                $ipmPresets: {
                    get: () => ({}),
                    subscribe: (fn: any) => { fn({}); return () => { }; }
                }
            }
        };

        mockHass = {
            callService: vi.fn(),
            states: {},
            localize: (key: string) => key,
            language: 'en'
        };

        element = new IPMDialog() as any;
        element.hass = mockHass;
        element.store = mockStore;
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (element.isConnected) document.body.removeChild(element);
    });

    it('should be defined', () => {
        expect(element).toBeDefined();
    });

    it('should handle save error', async () => {
        (element as any)._view = 'EDIT';
        (element as any)._editingPreset = { name: 'Test' };
        mockDataService.saveIPMPreset.mockRejectedValue(new Error('Save failed'));

        await (element as any)._savePreset();
        expect((element as any)._error).toBe('Save failed');
    });

    it('should handle delete with confirm', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        await (element as any)._deletePreset('p1');
        expect(mockDataService.removeIPMPreset).toHaveBeenCalledWith('p1');
    });

    it('should render apply view by default', async () => {
        expect((element as any)._view).toBe('APPLY');
        const applyTitle = element.shadowRoot?.querySelector('.header h2') || element.shadowRoot?.querySelector('h2');
        expect(applyTitle?.textContent).toContain('Integrated Pest Management');
    });

    it('should switch to list view', async () => {
        (element as any)._view = 'LIST';
        await element.updateComplete;
        const listTitle = element.shadowRoot?.querySelector('h2');
        expect(listTitle?.textContent).toContain('Manage Presets');
    });

    it('should add new product in edit mode', async () => {
        (element as any)._startNew();
        await element.updateComplete;
        expect((element as any)._editingPreset.items).toHaveLength(1);
        (element as any)._addProduct();
        expect((element as any)._editingPreset.items).toHaveLength(2);
    });

    it('should save preset', async () => {
        (element as any)._startNew();
        (element as any)._editingPreset.name = 'New Preset';
        await (element as any)._savePreset();
        expect(mockDataService.saveIPMPreset).toHaveBeenCalled();
        expect((element as any)._view).toBe('LIST');
    });

    it('should apply preset', async () => {
        element.growspaceId = 'gs1';
        (element as any)._selectedPresetId = 'p1';
        await (element as any)._apply();
        expect(mockDataService.applyIPM).toHaveBeenCalledWith(expect.objectContaining({
            preset_id: 'p1',
            growspace_id: 'gs1'
        }));
    });

    it('should NOT show error if applying without selection (early return)', async () => {
        (element as any)._selectedPresetId = null;
        await (element as any)._apply();
        expect((element as any)._error).toBeNull();
    });

    it('should return early if apply called without preset id', async () => {
        (element as any)._selectedPresetId = null;
        await (element as any)._apply();
        expect(mockDataService.applyIPM).not.toHaveBeenCalled();
    });

    it('should show error if neither growspace nor plants provided', async () => {
        (element as any)._selectedPresetId = 'p1';
        element.growspaceId = undefined;
        element.plantIds = [];
        await (element as any)._apply();
        expect((element as any)._error).toContain('no growspace or plants selected');
    });

    it('should remove product row', async () => {
        (element as any)._startNew();
        (element as any)._editingPreset.items = [{ name: 'A', dose_amount: 1, dose_unit: 'ml/L' }, { name: 'B', dose_amount: 2, dose_unit: 'ml/L' }];
        (element as any)._removeProduct(0);
        expect((element as any)._editingPreset.items).toHaveLength(1);
        expect((element as any)._editingPreset.items[0].name).toBe('B');
    });

    it('should update product row', async () => {
        (element as any)._startNew();
        (element as any)._editingPreset.items = [{ name: 'A', dose_amount: 1, dose_unit: 'ml/L' }];
        (element as any)._updateProduct(0, { name: 'Updated' });
        expect((element as any)._editingPreset.items[0].name).toBe('Updated');
    });

    it('should render list with presets', async () => {
        const presets = { 'p1': { id: 'p1', name: 'Preset 1', items: [] } };
        mockStore.data.$ipmPresets.get = () => presets;
        (element as any)._view = 'LIST';
        // Re-render
        element.requestUpdate();
        await element.updateComplete;
        const names = element.shadowRoot?.querySelectorAll('.preset-name');
        expect(names?.[0]?.textContent).toBe('Preset 1');

        // Test Edit Button
        const editBtn = element.shadowRoot?.querySelectorAll('.preset-actions button')[0] as HTMLElement;
        editBtn.click();
        await element.updateComplete;
        expect((element as any)._view).toBe('EDIT');
        expect((element as any)._editingPreset.name).toBe('Preset 1');
    });

    it('should render empty state if no presets', async () => {
        mockStore.data.$ipmPresets.get = () => ({});
        (element as any)._view = 'LIST';
        element.requestUpdate();
        await element.updateComplete;

        const emptyState = element.shadowRoot?.querySelector('.empty-state');
        expect(emptyState).toBeTruthy();
        expect(emptyState?.textContent).toContain('No IPM presets');
    });

    it('should handle apply view inputs', async () => {
        const presets = { 'p1': { id: 'p1', name: 'Preset 1', type: 'foliar' } };
        mockStore.data.$ipmPresets.get = () => presets;

        // Ensure we are in apply view
        (element as any)._view = 'APPLY';
        element.requestUpdate();
        await element.updateComplete;

        // Select preset
        const select = element.shadowRoot?.querySelector('md3-select');
        select?.dispatchEvent(new CustomEvent('change', { detail: 'p1' }));
        expect((element as any)._selectedPresetId).toBe('p1');

        // Input notes
        const textarea = element.shadowRoot?.querySelector('ha-textarea');
        // ha-textarea dispatches input event
        const inputEvent = { target: { value: 'My notes' } };
        // We simulate the event handler directly if we can't easily construct the event structure
        // Or dispatch a real event
        textarea?.dispatchEvent(new CustomEvent('input', {
            detail: {},
            bubbles: true,
            composed: true
        }));
        // Wait, the code uses @input=${(e: any) => this._notes = e.target.value}
        // So we need to set value on the target.
        if (textarea) {
            (textarea as any).value = 'My notes';
            textarea.dispatchEvent(new Event('input'));
        }
        expect((element as any)._notes).toBe('My notes');
    });

    it('should handle input changes in edit mode', async () => {
        (element as any)._startNew();
        await element.updateComplete;

        // Name
        const nameInput = element.shadowRoot?.querySelector('md3-text-input[label="Preset Name"]');
        nameInput?.dispatchEvent(new CustomEvent('change', { detail: 'New Name' }));
        expect((element as any)._editingPreset.name).toBe('New Name');

        // Type
        const typeSelect = element.shadowRoot?.querySelector('select'); // The first select is Type
        if (typeSelect) {
            typeSelect.value = 'drench';
            typeSelect.dispatchEvent(new Event('change'));
            expect((element as any)._editingPreset.type).toBe('drench');
        }

        // Stage (second select)
        const selects = element.shadowRoot?.querySelectorAll('select');
        const stageSelect = selects?.[1];
        if (stageSelect) {
            stageSelect.value = 'veg';
            stageSelect.dispatchEvent(new Event('change'));
            expect((element as any)._editingPreset.stage).toBe('veg');
        }

        // Min Days
        const daysInput = element.shadowRoot?.querySelector('md3-number-input[label="Min Days"]');
        daysInput?.dispatchEvent(new CustomEvent('change', { detail: '10' }));
        expect((element as any)._editingPreset.min_days_in_stage).toBe(10);

        // Product fields
        const productInput = element.shadowRoot?.querySelector('md3-text-input[label="Product"]');
        productInput?.dispatchEvent(new CustomEvent('change', { detail: 'Soap' }));
        expect((element as any)._editingPreset.items[0].name).toBe('Soap');

        const doseInput = element.shadowRoot?.querySelector('md3-number-input[label="Dose"]');
        doseInput?.dispatchEvent(new CustomEvent('change', { detail: '5.5' }));
        expect((element as any)._editingPreset.items[0].dose_amount).toBe(5.5);

        const unitInput = element.shadowRoot?.querySelector('md3-text-input[label="Unit"]');
        unitInput?.dispatchEvent(new CustomEvent('change', { detail: 'g/L' }));
        expect((element as any)._editingPreset.items[0].dose_unit).toBe('g/L');
    });
    it('should navigate buttons', async () => {
        // Back to Apply
        (element as any)._view = 'LIST';
        element.requestUpdate();
        await element.updateComplete;

        const backBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || []).find(b => b.textContent?.trim() === 'Back to Apply');
        expect(backBtn).toBeTruthy();
        (backBtn as HTMLElement)?.click();
        await element.updateComplete;
        expect((element as any)._view).toBe('APPLY');

        // Add Preset
        (element as any)._view = 'LIST';
        element.requestUpdate();
        await element.updateComplete;
        // The Add Preset button contains text and icon, so textContent might include whitespace
        const addBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || []).find(b => b.textContent?.includes('Add Preset'));
        expect(addBtn).toBeTruthy();
        (addBtn as HTMLElement)?.click();
        await element.updateComplete;
        expect((element as any)._view).toBe('EDIT');

        // Cancel
        const cancelBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || []).find(b => b.textContent?.trim() === 'Cancel');
        expect(cancelBtn).toBeTruthy();
        (cancelBtn as HTMLElement)?.click();
        await element.updateComplete;
        expect((element as any)._view).toBe('LIST');
    });

    it('should handle delete via UI', async () => {
        const presets = { 'p1': { id: 'p1', name: 'Preset 1', items: [], type: 'foliar' } };
        mockStore.data.$ipmPresets.get = () => presets;
        (element as any)._view = 'LIST';
        element.requestUpdate();
        await element.updateComplete;

        const deleteBtn = element.shadowRoot?.querySelector('button[title="Delete"]');
        expect(deleteBtn).toBeTruthy();
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        (deleteBtn as HTMLElement).click();
        expect(mockDataService.removeIPMPreset).toHaveBeenCalledWith('p1');
    });

    it('should remove product via UI', async () => {
        (element as any)._startNew();
        await element.updateComplete;

        // _startNew creates 1 empty item
        const removeBtn = element.shadowRoot?.querySelector('.product-row button.icon');
        expect(removeBtn).toBeTruthy();
        (removeBtn as HTMLElement)?.click();
        await element.updateComplete;
        expect((element as any)._editingPreset.items).toHaveLength(0);
    });

    it('should validate preset name on save', async () => {
        (element as any)._startNew();
        await element.updateComplete;
        (element as any)._editingPreset.name = '';

        await (element as any)._savePreset();
        expect((element as any)._error).toBe('Preset name is required');
        expect(mockDataService.saveIPMPreset).not.toHaveBeenCalled();
    });

    it('should navigate to manage presets from apply view', async () => {
        (element as any)._view = 'APPLY';
        element.requestUpdate();
        await element.updateComplete;

        const manageBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
            .find(b => b.textContent?.trim() === 'Manage Presets');

        expect(manageBtn).toBeTruthy();
        (manageBtn as HTMLElement)?.click();
        await element.updateComplete;
        expect((element as any)._view).toBe('LIST');
    });

    // --- Branch Coverage Additions ---

    it('should validate apply conditions (no selection/no target)', async () => {
        // No preset selected
        (element as any)._selectedPresetId = null;
        await (element as any)._apply();
        expect(mockDataService.applyIPM).not.toHaveBeenCalled();

        // Selected, but no growspace/plants
        (element as any)._selectedPresetId = 'p1';
        element.growspaceId = undefined;
        element.plantIds = [];
        await (element as any)._apply();
        expect((element as any)._error).toContain('no growspace or plants selected');
        expect(mockDataService.applyIPM).not.toHaveBeenCalled();

        // Reset validation state
        (element as any)._error = null;

        // Success case: Growspace only
        element.growspaceId = 'gs1';
        await (element as any)._apply();
        expect(mockDataService.applyIPM).toHaveBeenCalledWith(expect.objectContaining({ growspace_id: 'gs1' }));

        // Success case: Plants only
        element.growspaceId = undefined;
        element.plantIds = ['p1'];
        await (element as any)._apply();
        expect(mockDataService.applyIPM).toHaveBeenCalledWith(expect.objectContaining({ plant_ids: ['p1'] }));
    });

    it('should safely return if _editingPreset is null in helper methods', async () => {
        (element as any)._editingPreset = null;

        // _addProduct
        (element as any)._addProduct();
        expect((element as any)._editingPreset).toBeNull();

        // _removeProduct
        (element as any)._removeProduct(0);
        expect((element as any)._editingPreset).toBeNull();

        // _updateProduct
        (element as any)._updateProduct(0, {});
        expect((element as any)._editingPreset).toBeNull();
    });

    it('should handle undefined items in helper methods (fallback to [])', async () => {
        // Force undefined items
        (element as any)._editingPreset = { name: 'Buggy' };

        // _addProduct
        (element as any)._addProduct();
        expect((element as any)._editingPreset.items).toHaveLength(1);

        // Reset
        (element as any)._editingPreset = { name: 'Buggy' };

        // _removeProduct
        (element as any)._removeProduct(0);
        expect((element as any)._editingPreset.items).toHaveLength(0);

        // Reset
        (element as any)._editingPreset = { name: 'Buggy' };

        // _updateProduct
        // undefined items -> [] -> updates -> [{...updates}]
        (element as any)._updateProduct(0, { name: 'Fixed' });
        expect((element as any)._editingPreset.items[0].name).toBe('Fixed');
    });

    it('should handle default values in _savePreset', async () => {
        // Case: valid preset but missing optional fields
        (element as any)._editingPreset = {
            id: 'p1',
            name: 'Minimal',
            items: [{ name: 'Item', dose_amount: 1, dose_unit: 'ml' }]
            // type, stage, min_days missing
        };

        await (element as any)._savePreset();

        expect(mockDataService.saveIPMPreset).toHaveBeenCalledWith(expect.objectContaining({
            type: 'foliar',         // Default
            min_days_in_stage: 0,   // Default
            stage: undefined        // Default
        }));
    });

    it('should render correct footer buttons for APPY/LIST/EDIT views', async () => {
        // APPLY view (default)
        expect((element as any)._view).toBe('APPLY');
        let buttons = element.shadowRoot?.querySelectorAll('.button-group button');
        expect(buttons?.[0].textContent).toContain('Manage Presets');
        expect(buttons?.[1].textContent).toContain('Apply Treatment');

        // LIST view
        (element as any)._view = 'LIST';
        element.requestUpdate();
        await element.updateComplete;
        buttons = element.shadowRoot?.querySelectorAll('.button-group button');
        expect(buttons?.[0].textContent).toContain('Back to Apply');
        expect(buttons?.[1].textContent).toContain('Add Preset');

        // EDIT view
        (element as any)._view = 'EDIT';
        element.requestUpdate();
        await element.updateComplete;
        buttons = element.shadowRoot?.querySelectorAll('.button-group button');
        expect(buttons?.[0].textContent).toContain('Cancel');
        expect(buttons?.[1].textContent).toContain('Save Preset');
    });

    it('should handle apply error with fallback message', async () => {
        (element as any)._selectedPresetId = 'p1';
        element.growspaceId = 'gs1';
        mockDataService.applyIPM.mockRejectedValue({}); // No message

        await (element as any)._apply();
        expect((element as any)._error).toBe('Failed to apply treatment');
    });

    it('should handle delete preset error', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        mockDataService.removeIPMPreset.mockRejectedValue(new Error('Delete error'));

        await (element as any)._deletePreset('p1');
        expect((element as any)._error).toBe('Delete error');
    });

    it('should skip reset in updated() if _editingPreset is set', async () => {
        (element as any)._editingPreset = { name: 'Keep Me' };
        (element as any)._view = 'EDIT';

        await element.updated(new Map([['open', false]]));
        expect((element as any)._view).toBe('EDIT');
        expect((element as any)._editingPreset.name).toBe('Keep Me');
    });

    it('should handle save error in _savePreset', async () => {
        (element as any)._editingPreset = { id: 'p1', name: 'Faulty' };
        mockDataService.saveIPMPreset.mockRejectedValue(new Error('Save error'));

        await (element as any)._savePreset();
        expect((element as any)._error).toBe('Save error');
    });

    it('should cover targetText branches in _renderApply', async () => {
        element.plantIds = ['p1', 'p2'];
        element.requestUpdate();
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.apply-target')?.textContent).toBe('2 Plants');

        element.plantIds = [];
        element.growspaceId = 'gs1';
        element.requestUpdate();
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.apply-target')?.textContent).toBe('Entire Growspace');
    });
    it('should cover remaining template and fallback branches', async () => {
        // Line 250: Edit Preset title (with ID)
        (element as any)._view = 'EDIT';
        (element as any)._editingPreset = { id: 'p1', name: 'Existing' };
        element.requestUpdate();
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('h2.dialog-title')?.textContent).toBe('Edit Preset');

        // Line 375: stage display in list
        const presets = { 'p1': { id: 'p1', name: 'P1', items: [], type: 'foliar', stage: 'veg' } };
        mockStore.data.$ipmPresets.get = () => presets;
        (element as any)._view = 'LIST';
        element.requestUpdate();
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.preset-details')?.textContent).toContain('veg');

        // Line 428: stage change fallback in edit
        (element as any)._view = 'EDIT';
        (element as any)._editingPreset = { name: 'Edit', stage: 'veg' };
        element.requestUpdate();
        await element.updateComplete;
        const stageSelect = element.shadowRoot?.querySelectorAll('select')[1];
        if (stageSelect) {
            stageSelect.value = ''; // Any Stage
            stageSelect.dispatchEvent(new Event('change'));
            expect((element as any)._editingPreset.stage).toBeUndefined();
        }
    });

    it('should handle null presets in render methods', async () => {
        mockStore.data.$ipmPresets.get = () => null;

        // _renderApply (line 321)
        (element as any)._view = 'APPLY';
        element.requestUpdate();
        await element.updateComplete;
        // Should not crash

        // _renderList (line 356)
        (element as any)._view = 'LIST';
        element.requestUpdate();
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.empty-state')).toBeTruthy();
    });
    it('should handle cancel in delete preset', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        await (element as any)._deletePreset('p1');
        expect(mockDataService.removeIPMPreset).not.toHaveBeenCalled();
    });

    it('should render nothing if not open', async () => {
        element.open = false;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('ha-dialog')).toBeNull();
    });
});
