
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Target the decorators directly to avoid ReferenceErrors during component import

// Shared styles used natively

// Styles used natively in browser tests


import { NutrientPresetsEditor } from '../../../../src/components/manager/nutrient-presets-editor';

describe('NutrientPresetsEditor', () => {
    let element: NutrientPresetsEditor;
    let mockStore: any;
    let mockDataService: any;
    let mockHass: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockDataService = {
            saveNutrientPreset: vi.fn().mockResolvedValue(undefined),
            removeNutrientPreset: vi.fn().mockResolvedValue(undefined)
        };
        mockStore = {
            dataService: mockDataService,
            fetchNutrientPresets: vi.fn(),
            data: {
                $nutrientPresets: {
                    get: () => ({}),
                    subscribe: (fn: any) => { fn({}); return () => { }; }
                },
                $nutrientInventory: {
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

        element = new NutrientPresetsEditor() as any;
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

    it('should get nutrient suggestions', () => {
        const mockPresets = {
            p1: { nutrients: [{ name: 'A' }, { name: 'B' }] },
            p2: { nutrients: [{ name: 'A' }, { name: 'C' }] }
        };
        vi.spyOn(mockStore.data.$nutrientPresets, 'get').mockReturnValue(mockPresets);

        const suggestions = (element as any)._getNutrientSuggestions();
        expect(suggestions).toEqual(['A', 'B', 'C']);
    });

    it('should handle save error', async () => {
        (element as any)._view = 'EDIT';
        (element as any)._editingPreset = { name: 'Test', nutrients: [{ name: 'N', dose_ml_l: 1 }] };
        mockDataService.saveNutrientPreset.mockRejectedValue(new Error('Save failed'));

        await (element as any)._savePreset();
        expect((element as any)._error).toBe('Save failed');
    });

    it('should render list view by default', async () => {
        expect((element as any)._view).toBe('LIST');
        const title = element.shadowRoot?.querySelector('h2');
        expect(title?.textContent).toContain('Nutrient Presets');
    });

    it('should switch to add new preset', async () => {
        (element as any)._startNew();
        await element.updateComplete;
        const title = element.shadowRoot?.querySelector('h2');
        expect(title?.textContent).toContain('New Preset');
    });

    it('should switch to edit preset', async () => {
        const preset = { id: 'p1', name: 'Test', nutrients: [{ name: 'N1', dose_ml_l: 1 }] };
        (element as any)._editPreset(preset);
        await element.updateComplete;
        const title = element.shadowRoot?.querySelector('h2');
        expect(title?.textContent).toContain('Edit Preset');
        expect((element as any)._editingPreset.nutrients).toHaveLength(1);
    });

    it('should save preset successfully', async () => {
        (element as any)._startNew();
        (element as any)._editingPreset.name = 'New Preset';
        (element as any)._editingPreset.nutrients = [{ name: 'N', dose_ml_l: 1 }];
        await (element as any)._savePreset();
        expect(mockDataService.saveNutrientPreset).toHaveBeenCalled();
        expect((element as any)._view).toBe('LIST');
    });

    it('should handle delete preset with confirmation', async () => {
        const presets = { 'p1': { id: 'p1', name: 'Test P1', nutrients: [] } };
        mockStore.data.$nutrientPresets.get = () => presets;
        // Re-render list
        (element as any)._view = 'LIST';
        element.requestUpdate();
        await element.updateComplete;

        vi.spyOn(window, 'confirm').mockReturnValue(true);
        await (element as any)._deletePreset('p1');
        expect(mockDataService.removeNutrientPreset).toHaveBeenCalledWith('p1');
    });

    it('should cancel delete preset if confirmation rejected', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        await (element as any)._deletePreset('p1');
        expect(mockDataService.removeNutrientPreset).not.toHaveBeenCalled();
    });

    it('should show error if delete fails', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        mockDataService.removeNutrientPreset.mockRejectedValue(new Error('Delete invalid'));
        await (element as any)._deletePreset('p1');
        expect((element as any)._error).toBe('Delete invalid');
    });

    it('should manage nutrient items (add/remove/update)', async () => {
        (element as any)._startNew();
        await element.updateComplete;

        // Initial state has 1 empty item
        expect((element as any)._editingPreset.nutrients).toHaveLength(1);

        // Add
        (element as any)._addNutrient();
        expect((element as any)._editingPreset.nutrients).toHaveLength(2);

        // Update
        (element as any)._updateNutrient(0, { name: 'CalMag', dose_ml_l: 2.5 });
        expect((element as any)._editingPreset.nutrients[0].name).toBe('CalMag');
        expect((element as any)._editingPreset.nutrients[0].dose_ml_l).toBe(2.5);

        // Remove
        (element as any)._removeNutrient(1);
        expect((element as any)._editingPreset.nutrients).toHaveLength(1);
    });

    it('should validate before save', async () => {
        (element as any)._startNew();

        // No name
        (element as any)._editingPreset.name = '';
        await (element as any)._savePreset();
        expect((element as any)._error).toContain('Preset name is required');
        expect(mockDataService.saveNutrientPreset).not.toHaveBeenCalled();

        // Valid name, no nutrients
        (element as any)._editingPreset.name = 'Valid Name';
        (element as any)._editingPreset.nutrients = [];
        await (element as any)._savePreset();
        expect((element as any)._error).toContain('At least one valid nutrient is required');
        expect(mockDataService.saveNutrientPreset).not.toHaveBeenCalled();
    });

    it('should render empty state if no presets', async () => {
        mockStore.data.$nutrientPresets.get = () => ({});
        (element as any)._view = 'LIST';
        element.requestUpdate();
        await element.updateComplete;

        const emptyState = element.shadowRoot?.querySelector('.empty-state');
        expect(emptyState).toBeTruthy();
        expect(emptyState?.textContent).toContain('No nutrient presets');
    });

    it('should update preset fields via input events', async () => {
        (element as any)._startNew();
        await element.updateComplete;

        const nameInput = element.shadowRoot?.querySelector('md3-text-input[label="Preset Name"]');
        nameInput?.dispatchEvent(new CustomEvent('change', { detail: 'Interaction Name' }));
        expect((element as any)._editingPreset.name).toBe('Interaction Name');

        const stageSelect = element.shadowRoot?.querySelector('select');
        if (stageSelect) {
            stageSelect.value = 'veg';
            stageSelect.dispatchEvent(new Event('change'));
            expect((element as any)._editingPreset.stage).toBe('veg');
        }

        const daysInput = element.shadowRoot?.querySelector('md3-number-input[label="Min Days in Stage"]');
        daysInput?.dispatchEvent(new CustomEvent('change', { detail: '14' }));
        expect((element as any)._editingPreset.min_days_in_stage).toBe(14);
    });

    it('should update nutrient items via input events', async () => {
        (element as any)._startNew();
        (element as any)._addNutrient();
        await element.updateComplete;

        const firstRowNameInput = element.shadowRoot?.querySelector('.nutrient-row md3-text-input[label="Nutrient Name"]');
        firstRowNameInput?.dispatchEvent(new CustomEvent('change', { detail: 'UI Nutrient' }));
        expect((element as any)._editingPreset.nutrients[0].name).toBe('UI Nutrient');

        const firstRowDoseInput = element.shadowRoot?.querySelector('.nutrient-row md3-number-input[label="ml/L"]');
        firstRowDoseInput?.dispatchEvent(new CustomEvent('change', { detail: '3.5' }));
        expect((element as any)._editingPreset.nutrients[0].dose_ml_l).toBe(3.5);

        const removeBtns = element.shadowRoot?.querySelectorAll('.nutrient-row button.icon');
        (removeBtns?.[0] as HTMLElement)?.click();
        await element.updateComplete;
        expect((element as any)._editingPreset.nutrients).toHaveLength(1);
    });

    it('should dispatch close event', async () => {
        const spy = vi.spyOn(element, 'dispatchEvent');
        // Only works if button is visible, which defaults to LIST view close button or dialog close
        // The dialog @closed calls _close
        (element as any)._close();
        expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: 'close' }));
    });

    it('should return to list view on cancel', async () => {
        (element as any)._startNew();
        await element.updateComplete;
        expect((element as any)._view).toBe('EDIT');

        const cancelBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || []).find(b => b.textContent?.trim() === 'Cancel');
        expect(cancelBtn).toBeTruthy();
        (cancelBtn as HTMLElement).click();
        await element.updateComplete;
        expect((element as any)._view).toBe('LIST');
    });

    it('should handle edit/delete from list', async () => {
        const preset = { id: 'p1', name: 'UI Preset', nutrients: [] };
        // Setup data
        mockStore.data.$nutrientPresets.get = () => ({ 'p1': preset });
        (element as any)._view = 'LIST';
        element.requestUpdate();
        await element.updateComplete;

        // Edit
        const editBtn = element.shadowRoot?.querySelector('button[title="Edit"]');
        expect(editBtn).toBeTruthy();
        (editBtn as HTMLElement).click();
        await element.updateComplete;
        expect((element as any)._view).toBe('EDIT');
        expect((element as any)._editingPreset.id).toBe('p1');

        // Go back to LIST for delete test
        (element as any)._view = 'LIST';
        element.requestUpdate();
        await element.updateComplete;

        // Delete
        const deleteBtn = element.shadowRoot?.querySelector('button[title="Delete"]');
        expect(deleteBtn).toBeTruthy();

        vi.spyOn(window, 'confirm').mockReturnValue(true);
        (deleteBtn as HTMLElement).click();
        await element.updateComplete;
        expect(mockDataService.removeNutrientPreset).toHaveBeenCalledWith('p1');
    });

    // --- Branch Coverage Additions ---

    it('should safely return if _editingPreset is null in helper methods', async () => {
        (element as any)._editingPreset = null;

        // _addNutrient
        (element as any)._addNutrient();
        expect((element as any)._editingPreset).toBeNull();

        // _removeNutrient
        (element as any)._removeNutrient(0);
        expect((element as any)._editingPreset).toBeNull();

        // _updateNutrient
        (element as any)._updateNutrient(0, {});
        expect((element as any)._editingPreset).toBeNull();
    });

    it('should handle default values in _editingPreset properties', async () => {
        // Force _editingPreset to have undefined nutrients array (though types say it should be there, runtime protection)
        (element as any)._editingPreset = { name: 'Buggy Preset' };

        // _addNutrient - should handle undefined nutrients
        (element as any)._addNutrient();
        expect((element as any)._editingPreset.nutrients).toHaveLength(1);

        // Reset
        (element as any)._editingPreset = { name: 'Buggy Preset' };

        // _removeNutrient - should handle undefined
        (element as any)._removeNutrient(0);
        expect((element as any)._editingPreset.nutrients).toHaveLength(0); // splice on empty array created from undefined backup

        // Reset
        (element as any)._editingPreset = { name: 'Buggy Preset' };

        // _updateNutrient
        // This effectively does: const n = [...([] || [])]; n[0] = { ...n[0], ...updates }; 
        // n[0] will be undefined before merge, so { ...undefined, ...updates } -> { ...updates }
        // Then set nutrients to [ { ...updates } ]
        (element as any)._updateNutrient(0, { name: 'Fixed' });
        expect((element as any)._editingPreset.nutrients[0].name).toBe('Fixed');
    });

    it('should handle edge cases in _savePreset', async () => {
        // Case: _editingPreset is null
        (element as any)._editingPreset = null;
        await (element as any)._savePreset();
        expect((element as any)._error).toContain('required');

        // Case: nutrients property is undefined on preset
        (element as any)._editingPreset = { id: 'p1', name: 'Valid' };
        // (undefined || []).filter(...) -> [] -> length 0
        await (element as any)._savePreset();
        expect((element as any)._error).toContain('At least one valid nutrient is required');
    });

    it('should handle undefined nutrients in _getNutrientSuggestions', () => {
        const mockPresets = {
            p1: { nutrients: undefined }, // Should be skipped
            p2: { nutrients: [{ /* no name */ }, { name: 'Good' }] }
        };
        vi.spyOn(mockStore.data.$nutrientPresets, 'get').mockReturnValue(mockPresets);

        const suggestions = (element as any)._getNutrientSuggestions();
        expect(suggestions).toEqual(['Good']);
    });

    it('should render nothing if not open', async () => {
        element.open = false;
        await element.updateComplete;
        // When open=false, Lit often renders an empty comment marker like <!--?lit$123...--> or just empty string
        // Better to check that the dialog element is NOT present
        expect(element.shadowRoot?.querySelector('ha-dialog')).toBeNull();
    });


    it('should render preset details (stage, days)', async () => {
        const fullPreset = {
            id: 'p_full',
            name: 'Full Detail',
            nutrients: [{ name: 'A', dose_ml_l: 1 }],
            stage: 'veg',
            min_days_in_stage: 14
        };
        mockStore.data.$nutrientPresets.get = () => ({ 'p_full': fullPreset });
        (element as any)._view = 'LIST';
        element.requestUpdate();
        await element.updateComplete;

        const details = element.shadowRoot?.querySelector('.preset-details')?.textContent;
        expect(details).toContain('veg');
        expect(details).toContain('Day 14+');
    });

    it('should include nutrients from inventory in suggestions', () => {
        const mockInventory = {
            stocks: {
                s1: { name: 'Grow' },
                s2: { name: 'Bloom' }
            }
        };
        vi.spyOn(mockStore.data.$nutrientInventory, 'get').mockReturnValue(mockInventory);

        const suggestions = (element as any)._getNutrientSuggestions();
        expect(suggestions).toContain('Grow');
        expect(suggestions).toContain('Bloom');
    });

    it('should handle missing inventory or stocks in suggestions', () => {
        vi.spyOn(mockStore.data.$nutrientInventory, 'get').mockReturnValue(null);
        let suggestions = (element as any)._getNutrientSuggestions();
        expect(suggestions).toEqual([]);

        vi.spyOn(mockStore.data.$nutrientInventory, 'get').mockReturnValue({});
        suggestions = (element as any)._getNutrientSuggestions();
        expect(suggestions).toEqual([]);
    });

    it('should handle missing store in connectedCallback', () => {
        const partialElement = new NutrientPresetsEditor() as any;
        partialElement.store = undefined;
        // Should not throw
        partialElement.connectedCallback();
        expect(partialElement._presetsController).toBeUndefined();
    });

    it('should handle mission controller value in _startNew', () => {
        vi.spyOn(mockStore.data.$nutrientPresets, 'get').mockReturnValue(null);
        (element as any)._startNew();
        expect((element as any)._view).toBe('EDIT');
        expect((element as any)._editingPreset.name).toBe('');
    });

    it('should cover branch in suggest inventory with missing stock name', () => {
        const mockInventory = {
            stocks: {
                s1: { name: 'Grow' },
                s2: { /* missing name */ }
            }
        };
        vi.spyOn(mockStore.data.$nutrientInventory, 'get').mockReturnValue(mockInventory);
        const suggestions = (element as any)._getNutrientSuggestions();
        expect(suggestions).toEqual(['Grow']);
    });

    it('should cover branch in _renderEdit when no preset', () => {
        (element as any)._editingPreset = null;
        const result = (element as any)._renderEdit();
        expect(result).toBeDefined(); // nothing in Lit is a symbol/value
    });

    it('should cover branch in _renderList when nutrients missing', async () => {
        const partialPreset = { id: 'p1', name: 'Partial' };
        mockStore.data.$nutrientPresets.get = () => ({ 'p1': partialPreset });
        (element as any)._view = 'LIST';
        element.requestUpdate();
        await element.updateComplete;
        const details = element.shadowRoot?.querySelector('.preset-details')?.textContent;
        expect(details).toContain('0 nutrients');
    });

    it('should cover branch in _savePreset with null dose', async () => {
        (element as any)._editingPreset = {
            name: 'Null Dose',
            nutrients: [{ name: 'N', dose_ml_l: null as any }]
        };
        // This should fail validation because parseFloat(String(null)) is NaN or something that doesn't pass > 0
        await (element as any)._savePreset();
        expect((element as any)._error).toContain('At least one valid nutrient is required');
    });

    it('should cover isNaN branch in _updateNutrient', () => {
        (element as any)._editingPreset = {
            name: 'Test',
            nutrients: [{ name: 'N', dose_ml_l: 1 }]
        };
        (element as any)._updateNutrient(0, { dose_ml_l: 'not-a-number' as any });
        expect((element as any)._editingPreset.nutrients[0].dose_ml_l).toBe(0);
    });

    it('should cover branch in render when open but other fields missing', async () => {
        element.open = true;
        (element as any)._view = 'EDIT';
        (element as any)._editingPreset = { name: 'Simple' };
        element.requestUpdate();
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.preset-form')).toBeTruthy();
    });
});
