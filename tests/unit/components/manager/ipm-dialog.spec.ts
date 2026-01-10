
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { nothing } from 'lit';
import { IPMDialog } from '../../../../src/components/manager/ipm-dialog';
import { IPMPreset } from '../../../../src/types';

// Mock styles
vi.mock('../../../../src/styles/shared.styles', () => ({
    sharedStyles: { cssText: '' }
}));
vi.mock('../../../../src/styles/variables', () => ({
    variables: { cssText: '' }
}));
vi.mock('../../../../src/styles/dialog.styles', () => ({
    dialogStyles: { cssText: '' }
}));

describe('IPMDialog', () => {
    let element: IPMDialog;
    let mockDataService: any;
    let mockHass: any;

    const mockPresets: Record<string, IPMPreset> = {
        'p1': {
            id: 'p1',
            name: 'P1',
            type: 'foliar',
            items: [{ name: 'I1', dose_amount: 1, dose_unit: 'u' }],
            stage: 'veg',
            min_days_in_stage: 1
        }
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        if (!customElements.get('ipm-dialog')) {
            customElements.define('ipm-dialog', IPMDialog);
        }
        mockDataService = {
            applyIPM: vi.fn().mockResolvedValue(undefined),
            saveIPMPreset: vi.fn().mockResolvedValue(undefined),
            removeIPMPreset: vi.fn().mockResolvedValue(undefined)
        };
        mockHass = { states: {}, callService: vi.fn() };
        element = document.createElement('ipm-dialog') as IPMDialog;
        element.dataService = mockDataService;
        element.hass = mockHass;
        element.presets = mockPresets;
        element.open = true;
        element.plantIds = ['p'];
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (element.isConnected) document.body.removeChild(element);
    });

    it('should cover view transitions', async () => {
        // APPLY -> LIST
        (element.shadowRoot?.querySelector('button.tonal') as HTMLButtonElement).click();
        await element.updateComplete;
        expect((element as any)._view).toBe('LIST');

        // LIST -> EDIT
        (element.shadowRoot?.querySelector('button.primary') as HTMLButtonElement).click();
        await element.updateComplete;
        expect((element as any)._view).toBe('EDIT');

        // EDIT -> LIST
        (element.shadowRoot?.querySelector('button.tonal') as HTMLButtonElement).click();
        await element.updateComplete;
        expect((element as any)._view).toBe('LIST');

        // LIST -> APPLY
        (element.shadowRoot?.querySelector('button.tonal') as HTMLButtonElement).click();
        await element.updateComplete;
        expect((element as any)._view).toBe('APPLY');
    });

    it('should cover apply logic and branches', async () => {
        // Entire Growspace branch
        element.plantIds = [];
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.apply-target')?.textContent).toBe('Entire Growspace');

        const select = element.shadowRoot?.querySelector('md3-select') as any;
        select.value = 'p1';
        select.dispatchEvent(new CustomEvent('change', { detail: 'p1' }));

        await (element as any)._apply();
        expect(mockDataService.applyIPM).toHaveBeenCalled();

        // Error branches
        mockDataService.applyIPM.mockRejectedValue(new Error('Fail'));
        await (element as any)._apply();
        expect((element as any)._error).toBe('Fail');

        mockDataService.applyIPM.mockRejectedValue({});
        await (element as any)._apply();
        expect((element as any)._error).toBe('Failed to apply treatment');

        // Textarea input
        const textarea = element.shadowRoot?.querySelector('ha-textarea') as any;
        textarea.value = 'New Note';
        textarea.dispatchEvent(new Event('input'));
        expect((element as any)._notes).toBe('New Note');

        // Test _apply with plantIds
        element.plantIds = ['p1', 'p2'];
        (element as any)._selectedPresetId = 'p1';
        await element.updateComplete;
        await (element as any)._apply();
        expect(mockDataService.applyIPM).toHaveBeenCalledWith(expect.objectContaining({
            plant_ids: ['p1', 'p2'],
            growspace_id: undefined
        }));
    });

    it('should cover list view interactions', async () => {
        (element as any)._view = 'LIST';
        await element.updateComplete;

        // Edit
        (element.shadowRoot?.querySelector('.preset-actions button.icon') as HTMLButtonElement).click();
        await element.updateComplete;
        expect((element as any)._view).toBe('EDIT');

        // Delete with confirm
        (element as any)._view = 'LIST';
        await element.updateComplete;
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        (element.shadowRoot?.querySelectorAll('.preset-actions button.icon')[1] as HTMLButtonElement).click();
        await new Promise(r => setTimeout(r, 0));
        expect(mockDataService.removeIPMPreset).toHaveBeenCalled();

        // Cancel delete
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        (element.shadowRoot?.querySelectorAll('.preset-actions button.icon')[1] as HTMLButtonElement).click();
        expect(mockDataService.removeIPMPreset).toHaveBeenCalledTimes(1);

        // Delete failure
        (element as any)._view = 'LIST';
        await element.updateComplete;
        vi.mocked(window.confirm).mockReturnValue(true);
        mockDataService.removeIPMPreset.mockRejectedValue(new Error('DelFail'));
        (element.shadowRoot?.querySelectorAll('.preset-actions button.icon')[1] as HTMLButtonElement).click();
        await new Promise(r => setTimeout(r, 0));
        expect((element as any)._error).toBe('DelFail');
    });

    it('should cover ALL edit view branches', async () => {
        (element as any)._editPreset(mockPresets['p1']);
        await element.updateComplete;

        const nameInput = element.shadowRoot?.querySelector('md3-text-input[label="Preset Name"]') as any;
        nameInput.dispatchEvent(new CustomEvent('change', { detail: 'N' }));

        const typeSelect = element.shadowRoot?.querySelector('select.md3-input') as HTMLSelectElement;
        typeSelect.dispatchEvent(new Event('change'));

        const stageSelect = element.shadowRoot?.querySelectorAll('select.md3-input')[1] as HTMLSelectElement;
        stageSelect.value = 'flower';
        stageSelect.dispatchEvent(new Event('change'));
        stageSelect.value = '';
        stageSelect.dispatchEvent(new Event('change'));

        (element.shadowRoot?.querySelector('md3-number-input[label="Min Days"]') as any).dispatchEvent(new CustomEvent('change', { detail: '1' }));

        // Product rows
        (element.shadowRoot?.querySelector('.form-section button.text') as HTMLButtonElement).click();
        await element.updateComplete;
        const rows = element.shadowRoot?.querySelectorAll('.product-row');
        (rows![1].querySelector('md3-text-input[label="Product"]') as any).dispatchEvent(new CustomEvent('change', { detail: 'P2' }));
        (rows![1].querySelector('md3-number-input[label="Dose"]') as any).dispatchEvent(new CustomEvent('change', { detail: '2.2' }));
        (rows![1].querySelector('md3-text-input[label="Unit"]') as any).dispatchEvent(new CustomEvent('change', { detail: 'u2' }));

        (rows![1].querySelector('button.icon') as HTMLButtonElement).click();
        await element.updateComplete;
        expect((element as any)._editingPreset.items.length).toBe(1);

        // Save branches
        (element as any)._editingPreset.name = '';
        await (element as any)._savePreset();
        expect((element as any)._error).toBe('Preset name is required');

        (element as any)._editingPreset.name = 'V';
        mockDataService.saveIPMPreset.mockRejectedValue(new Error('SaveErr'));
        await (element as any)._savePreset();
        expect((element as any)._error).toBe('SaveErr');

        // Success save
        mockDataService.saveIPMPreset.mockResolvedValue(undefined);
        const changedSpy = vi.fn();
        element.addEventListener('data-changed', changedSpy);
        await (element as any)._savePreset();
        expect((element as any)._view).toBe('LIST');
        expect(changedSpy).toHaveBeenCalled();
    });

    it('should handle null items in _updateProduct, _removeProduct, and _savePreset', async () => {
        (element as any)._view = 'EDIT';
        (element as any)._editingPreset = { id: 'p1', name: 'N', items: undefined };
        await element.updateComplete;

        (element as any)._updateProduct(0, { name: 'X' });
        expect((element as any)._editingPreset.items.length).toBe(1);

        (element as any)._editingPreset.items = undefined;
        (element as any)._removeProduct(0);
        expect((element as any)._editingPreset.items.length).toBe(0);

        (element as any)._editingPreset.items = undefined;
        await (element as any)._savePreset();
        expect(mockDataService.saveIPMPreset).toHaveBeenCalledWith(expect.objectContaining({
            items: []
        }));
    });

    it('should cover _renderEdit guard', () => {
        (element as any)._view = 'EDIT';
        (element as any)._editingPreset = null;
        expect((element as any)._renderEdit()).toBe(nothing);
    });

    it('should cover miscellaneous branches', async () => {
        // Lifecycle updated() branch where _editingPreset is set
        (element as any)._editingPreset = { id: 'p1' };
        (element as any)._view = 'EDIT';
        element.open = false;
        await element.updateComplete;
        element.open = true;
        await element.updateComplete;
        expect((element as any)._view).toBe('EDIT'); // Should NOT reset to APPLY

        // _addProduct with existing items
        (element as any)._editingPreset = { id: 'p1', items: [{ name: 'I1' }] };
        (element as any)._addProduct();
        expect((element as any)._editingPreset.items.length).toBe(2);

        // Guards
        (element as any)._editingPreset = null;
        (element as any)._addProduct();
        (element as any)._removeProduct(0);
        (element as any)._updateProduct(0, {});

        // Empty state
        (element as any)._view = 'LIST';
        element.presets = null as any;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.empty-state')).not.toBeNull();

        // Lifecycle re-init
        element.open = false;
        await element.updateComplete;
        element.open = true;
        await element.updateComplete;
        expect((element as any)._view).toBe('APPLY');

        // Close
        const spy = vi.fn();
        element.addEventListener('close', spy);
        (element as any)._close();
        expect(spy).toHaveBeenCalled();

        // Header title branches
        (element as any)._view = 'EDIT';
        (element as any)._editingPreset = { id: 'x' };
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.dialog-title')?.textContent).toBe('Edit Preset');

        (element as any)._editingPreset = { id: undefined };
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.dialog-title')?.textContent).toBe('New Preset');

        // Cover preset.stage branches
        (element as any)._view = 'LIST';
        element.presets = {
            'px': {
                id: 'px',
                name: 'PX',
                type: 'foliar',
                items: [],
                stage: undefined // This covers the : '' branch
            }
        };
        await element.updateComplete;
        const details = element.shadowRoot?.querySelector('.preset-details')?.textContent;
        // Count bullets. Should only have one (the one between type and product count)
        const bulletCount = (details?.match(/•/g) || []).length;
        expect(bulletCount).toBe(1);

        // Cover Object.values(this.presets || {}) in _renderApply
        (element as any)._view = 'APPLY';
        element.presets = null as any;
        await element.updateComplete;
        const select = element.shadowRoot?.querySelector('md3-select') as any;
        expect(select.options).toEqual([]);
    });

    it('should handle optional fields and default values in _savePreset', async () => {
        (element as any)._view = 'EDIT';
        (element as any)._editingPreset = {
            id: 'p1',
            name: 'Min Preset',
            items: [{ name: 'Item 1' }],
            type: undefined,
            stage: undefined,
            min_days_in_stage: undefined
        };
        await element.updateComplete;

        await (element as any)._savePreset();

        expect(mockDataService.saveIPMPreset).toHaveBeenCalledWith({
            preset_id: 'p1',
            name: 'Min Preset',
            type: 'foliar', // Default
            items: [{ name: 'Item 1' }],
            stage: undefined,
            min_days_in_stage: 0 // Default
        });
    });
});
