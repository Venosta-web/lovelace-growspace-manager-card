
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NutrientInventoryDialog } from '../../../src/dialogs/nutrient-inventory-dialog';
import { NutrientInventory } from '../../../src/types';

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

const mocks = vi.hoisted(() => ({
    fetchNutrientInventory: vi.fn(),
    updateNutrientStock: vi.fn(),
    removeNutrientStock: vi.fn()
}));

vi.mock('../../../src/data-service', () => {
    return {
        DataService: class {
            constructor() {
                return mocks;
            }
        }
    };
});

// Mock ha-dialog
class HaDialogMock extends HTMLElement {
    open = false;
}
customElements.define('ha-dialog', HaDialogMock);

const waitUntil = (predicate: () => boolean, timeout = 1000) => new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const check = () => {
        if (predicate()) resolve();
        else if (Date.now() - start > timeout) reject(new Error('Timeout waiting for predicate'));
        else setTimeout(check, 10);
    };
    check();
});

describe('NutrientInventoryDialog', () => {
    let element: NutrientInventoryDialog;
    const mockInventory: NutrientInventory = {
        stocks: {
            'n1': {
                nutrient_id: 'n1',
                name: 'CalMag',
                current_ml: 500,
                initial_ml: 1000,
                last_updated: '2023-01-01T12:00:00'
            },
            'n2': {
                nutrient_id: 'n2',
                name: 'Bloom A',
                current_ml: 100,
                initial_ml: 1000,
                last_updated: '2023-01-01T12:00:00'
            }
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        element = new NutrientInventoryDialog();
        element.hass = {} as any;
        mocks.fetchNutrientInventory.mockResolvedValue(mockInventory);
    });

    afterEach(() => {
        if (element.isConnected) document.body.removeChild(element);
        vi.restoreAllMocks();
    });

    it('should fetch inventory when opened', async () => {
        document.body.appendChild(element);
        element.open = true;
        await element.updateComplete;
        await waitUntil(() => !(element as any)._isLoading);
        await element.updateComplete;

        expect(mocks.fetchNutrientInventory).toHaveBeenCalled();
        expect(element.shadowRoot?.querySelectorAll('.stock-item').length).toBe(2);
    });

    it('should display stock details correctly', async () => {
        document.body.appendChild(element);
        element.open = true;
        await element.updateComplete;
        await waitUntil(() => !(element as any)._isLoading);
        await element.updateComplete;

        const items = element.shadowRoot?.querySelectorAll('.stock-item');
        const calMagItem = Array.from(items || []).find(i => i.textContent?.includes('CalMag'));
        expect(calMagItem).toBeTruthy();

        // Use textContent to avoid Lit comments and normalize whitespace
        const text = calMagItem?.textContent?.replace(/\s+/g, ' ').trim();
        expect(text).toContain('500 / 1000 ml');
    });

    it('should start adding new nutrient', async () => {
        document.body.appendChild(element);
        element.open = true;
        await element.updateComplete;
        await waitUntil(() => !(element as any)._isLoading);
        await element.updateComplete;

        const addBtn = element.shadowRoot?.querySelector('button.add-button');
        (addBtn as HTMLElement).click();
        await element.updateComplete;

        expect(element.shadowRoot?.querySelector('.edit-form')).toBeTruthy();
        expect(element.shadowRoot?.querySelector('h3')?.textContent).toBe('Add Nutrient');
    });

    it('should save new nutrient', async () => {
        document.body.appendChild(element);
        element.open = true;
        await element.updateComplete;
        await waitUntil(() => !(element as any)._isLoading);
        await element.updateComplete;

        // Click Add
        const addBtn = element.shadowRoot?.querySelector('button.add-button');
        (addBtn as HTMLElement).click();
        await element.updateComplete;

        // Fill Form
        const inputs = element.shadowRoot?.querySelectorAll('md3-text-input, md3-number-input');
        const nameInput = inputs?.[0] as any;
        const currentInput = inputs?.[1] as any;
        const initialInput = inputs?.[2] as any;

        nameInput.value = 'Grow A'; nameInput.dispatchEvent(new CustomEvent('change', { detail: 'Grow A' }));
        currentInput.value = '900'; currentInput.dispatchEvent(new CustomEvent('change', { detail: '900' }));
        initialInput.value = '1000'; initialInput.dispatchEvent(new CustomEvent('change', { detail: '1000' }));
        await element.updateComplete;

        // Save
        const saveBtn = element.shadowRoot?.querySelector('.edit-form button.primary');
        (saveBtn as HTMLElement).click();

        await new Promise(r => setTimeout(r, 0));
        await element.updateComplete;

        // Expect positional arguments: id, name, current, initial
        // ID is auto-generated from name: grow_a
        expect(mocks.updateNutrientStock).toHaveBeenCalledWith(
            'grow_a',
            'Grow A',
            900,
            1000
        );
    });

    it('should start editing existing nutrient', async () => {
        document.body.appendChild(element);
        element.open = true;
        await element.updateComplete;
        await waitUntil(() => !(element as any)._isLoading);
        await element.updateComplete;

        const items = element.shadowRoot?.querySelectorAll('.stock-item');
        // Structure: .stock-actions -> button text (Edit) -> button text (Delete)
        const firstItem = items?.[0];
        const editBtn = firstItem?.querySelector('.stock-actions button'); // First button

        (editBtn as HTMLElement).click();
        await element.updateComplete;

        expect(element.shadowRoot?.querySelector('.edit-form')).toBeTruthy();
        expect(element.shadowRoot?.querySelector('h3')?.textContent).toBe('Edit Nutrient');

        const inputs = element.shadowRoot?.querySelectorAll('md3-text-input');
        // Name should be pre-filled
        expect((inputs?.[0] as any).value).toBe('CalMag');
    });

    it('should update existing nutrient', async () => {
        document.body.appendChild(element);
        element.open = true;
        await element.updateComplete;
        await waitUntil(() => !(element as any)._isLoading);
        await element.updateComplete;

        // Click Edit on first item (CalMag)
        const items = element.shadowRoot?.querySelectorAll('.stock-item');
        const editBtn = items?.[0].querySelector('.stock-actions button');
        (editBtn as HTMLElement).click();
        await element.updateComplete;

        // Change current amount
        const currentInput = element.shadowRoot?.querySelectorAll('md3-number-input')[0] as any;
        currentInput.value = '400';
        currentInput.dispatchEvent(new CustomEvent('change', { detail: '400' }));
        await element.updateComplete;

        // Save
        const saveBtn = element.shadowRoot?.querySelector('.edit-form button.primary');
        (saveBtn as HTMLElement).click();
        await new Promise(r => setTimeout(r, 0));
        await element.updateComplete;

        // updateNutrientStock(id, name, current, initial)
        expect(mocks.updateNutrientStock).toHaveBeenCalledWith(
            'n1',
            'CalMag',
            400,
            1000
        );
    });

    it('should delete nutrient', async () => {
        vi.spyOn(window, 'confirm').mockImplementation(() => true);
        document.body.appendChild(element);
        element.open = true;
        await element.updateComplete;
        await waitUntil(() => !(element as any)._isLoading);
        await element.updateComplete;

        // Delete button is the second icon button
        const items = element.shadowRoot?.querySelectorAll('.stock-item');
        const buttons = items?.[0].querySelectorAll('.stock-actions button');
        const deleteBtn = buttons?.[1] as HTMLElement;

        deleteBtn.click();
        await new Promise(r => setTimeout(r, 0));
        await element.updateComplete;

        expect(mocks.removeNutrientStock).toHaveBeenCalledWith('n1');
    });

    it('should handle fetch error', async () => {
        mocks.fetchNutrientInventory.mockRejectedValue(new Error('Network Error'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        document.body.appendChild(element);
        element.open = true;
        await element.updateComplete;
        await waitUntil(() => !(element as any)._isLoading);
        await element.updateComplete;

        expect(element.shadowRoot?.textContent).toContain('Network Error');
    });


    it('should validate empty name on save', async () => {
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });
        document.body.appendChild(element);
        element.open = true;
        await element.updateComplete;
        await waitUntil(() => !(element as any)._isLoading);
        await element.updateComplete;

        (element as any)._startAdd();
        await element.updateComplete;

        const saveBtn = element.shadowRoot?.querySelector('.edit-form button.primary') as HTMLElement;
        saveBtn.click();
        await element.updateComplete;

        expect(alertSpy).toHaveBeenCalledWith('Name is required');
        expect(mocks.updateNutrientStock).not.toHaveBeenCalled();
    });

    it('should handle save error', async () => {
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });
        mocks.updateNutrientStock.mockRejectedValue(new Error('Save Error'));

        document.body.appendChild(element);
        element.open = true;
        await element.updateComplete;
        await waitUntil(() => !(element as any)._isLoading);
        await element.updateComplete;

        (element as any)._startAdd();
        await element.updateComplete;

        const inputs = element.shadowRoot?.querySelectorAll('md3-text-input') as any;
        inputs[0].value = 'Test';
        inputs[0].dispatchEvent(new CustomEvent('change', { detail: 'Test' }));
        await element.updateComplete;

        const saveBtn = element.shadowRoot?.querySelector('.edit-form button.primary') as HTMLElement;
        saveBtn.click();

        await new Promise(r => setTimeout(r, 0));
        await element.updateComplete;

        expect(alertSpy).toHaveBeenCalledWith('Error saving: Save Error');
    });

    it('should cancel delete when confirmation rejected', async () => {
        vi.spyOn(window, 'confirm').mockImplementation(() => false);
        document.body.appendChild(element);
        element.open = true;
        await element.updateComplete;
        await waitUntil(() => !(element as any)._isLoading);
        await element.updateComplete;

        const items = element.shadowRoot?.querySelectorAll('.stock-item');
        const deleteBtn = items?.[0].querySelectorAll('.stock-actions button')[1] as HTMLElement;

        deleteBtn.click();
        await new Promise(r => setTimeout(r, 0));

        expect(mocks.removeNutrientStock).not.toHaveBeenCalled();
    });

    it('should handle delete error', async () => {
        vi.spyOn(window, 'confirm').mockImplementation(() => true);
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });
        mocks.removeNutrientStock.mockRejectedValue(new Error('Delete Error'));

        document.body.appendChild(element);
        element.open = true;
        await element.updateComplete;
        await waitUntil(() => !(element as any)._isLoading);
        await element.updateComplete;

        const items = element.shadowRoot?.querySelectorAll('.stock-item');
        const deleteBtn = items?.[0].querySelectorAll('.stock-actions button')[1] as HTMLElement;

        deleteBtn.click();
        await new Promise(r => setTimeout(r, 0));

        expect(alertSpy).toHaveBeenCalledWith('Error deleting: Delete Error');
    });

    it('should display empty state', async () => {
        mocks.fetchNutrientInventory.mockResolvedValue({ stocks: {} });

        document.body.appendChild(element);
        element.open = true;
        await element.updateComplete;
        await waitUntil(() => !(element as any)._isLoading);
        await element.updateComplete;

        const emptyMsg = element.shadowRoot?.querySelector('.inventory-list p');
        expect(emptyMsg?.textContent).toContain('No nutrient stock items tracked');
    });

    it('should render correct status classes based on percentage', async () => {
        const inventory: NutrientInventory = {
            stocks: {
                'low': { nutrient_id: '1', name: 'Low', current_ml: 100, initial_ml: 1000, last_updated: '' }, // 10%
                'med': { nutrient_id: '2', name: 'Med', current_ml: 300, initial_ml: 1000, last_updated: '' }, // 30%
                'high': { nutrient_id: '3', name: 'High', current_ml: 800, initial_ml: 1000, last_updated: '' } // 80%
            }
        };
        mocks.fetchNutrientInventory.mockResolvedValue(inventory);

        document.body.appendChild(element);
        element.open = true;
        await element.updateComplete;
        await waitUntil(() => !(element as any)._isLoading);
        await element.updateComplete;

        const items = element.shadowRoot?.querySelectorAll('.stock-item');

        // Low (10%) -> danger
        const lowItem = Array.from(items || []).find(i => i.textContent?.includes('Low'));
        expect(lowItem?.querySelector('.progress-fill.danger')).toBeTruthy();

        // Med (30%) -> warning
        const medItem = Array.from(items || []).find(i => i.textContent?.includes('Med'));
        expect(medItem?.querySelector('.progress-fill.warning')).toBeTruthy();

        // High (80%) -> neither
        const highItem = Array.from(items || []).find(i => i.textContent?.includes('High'));
        expect(highItem?.querySelector('.progress-fill.danger')).toBeFalsy();
        expect(highItem?.querySelector('.progress-fill.warning')).toBeFalsy();
    });

    it('should render in embedded mode', async () => {
        element.embedded = true;
        document.body.appendChild(element);
        // No need to set open=true
        await element.updateComplete;
        await waitUntil(() => !(element as any)._isLoading);
        await element.updateComplete;

        // Should render content but NOT wrapped in ha-dialog
        expect(element.shadowRoot?.querySelector('ha-dialog')).toBeFalsy();
        expect(element.shadowRoot?.querySelector('.glass-dialog-container')).toBeTruthy();

        // Header removal in embedded mode
        expect(element.shadowRoot?.querySelector('.dialog-header')).toBeFalsy();
    });


    it('should dispatch close event when header close button clicked', async () => {
        document.body.appendChild(element);
        element.open = true;
        await element.updateComplete;
        await waitUntil(() => !(element as any)._isLoading);
        await element.updateComplete;

        const closeSpy = vi.fn();
        element.addEventListener('close', closeSpy);

        const closeBtn = element.shadowRoot?.querySelector('.dialog-header button') as HTMLElement;
        closeBtn.click();

        expect(closeSpy).toHaveBeenCalled();
    });

    it('should render nothing when closed and not embedded', async () => {
        document.body.appendChild(element);
        element.open = false;
        element.embedded = false;
        await element.updateComplete;

        expect(element.shadowRoot?.textContent).toBe('');
    });

    it('should handle missing data service gracefully', async () => {
        // Ensure data service is missing
        (element as any)._dataService = undefined;
        // Suppress alert
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });
        // Mock confirm for delete
        vi.spyOn(window, 'confirm').mockImplementation(() => true);

        // Try to save
        (element as any)._editName = 'Test';
        await (element as any)._save();
        expect(mocks.updateNutrientStock).not.toHaveBeenCalled();

        // Try to delete
        await (element as any)._delete('id');
        expect(mocks.removeNutrientStock).not.toHaveBeenCalled();

        // Try to fetch
        await (element as any)._fetchInventory();
        expect(mocks.fetchNutrientInventory).not.toHaveBeenCalled();
    });
    it('should handle firstUpdated without hass', async () => {
        const el = new NutrientInventoryDialog();
        // Do not set hass
        document.body.appendChild(el);
        await el.updateComplete;

        // _dataService should be undefined
        expect((el as any)._dataService).toBeUndefined();
    });

    it('should handle null inventory result', async () => {
        mocks.fetchNutrientInventory.mockResolvedValue(null);
        document.body.appendChild(element);
        element.open = true;
        await element.updateComplete;
        await waitUntil(() => !(element as any)._isLoading);
        await element.updateComplete;

        // Should render content with empty list
        const emptyMsg = element.shadowRoot?.querySelector('.inventory-list p');
        expect(emptyMsg?.textContent).toContain('No nutrient stock items tracked');
    });

    it('should use fallback error message', async () => {
        // Reject with object without message
        mocks.fetchNutrientInventory.mockRejectedValue({});
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        document.body.appendChild(element);
        element.open = true;
        await element.updateComplete;
        await waitUntil(() => !(element as any)._isLoading);
        await element.updateComplete;

        expect(element.shadowRoot?.textContent).toContain('Failed to load inventory');
    });
});
