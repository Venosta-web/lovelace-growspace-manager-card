import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GrowspaceNutrientInventoryDialogUI } from '../../../../../src/features/ui/components/growspace-nutrient-inventory-dialog-ui';
import '../../../../../src/features/ui/components/growspace-nutrient-inventory-dialog-ui';
import { NutrientInventory, NutrientStock } from '../../../../../src/types';

if (!customElements.get('ha-dialog')) {
    class HaDialogMock extends HTMLElement {
        open = false;
        hideActions = false;
        width = '';
    }
    customElements.define('ha-dialog', HaDialogMock);
}

if (!customElements.get('ha-svg-icon')) {
    customElements.define('ha-svg-icon', class extends HTMLElement { path = ''; });
}

if (!customElements.get('ha-circular-progress')) {
    customElements.define('ha-circular-progress', class extends HTMLElement { active = false; });
}

if (!customElements.get('gs-help-tooltip')) {
    customElements.define('gs-help-tooltip', class extends HTMLElement {});
}

if (!customElements.get('md3-text-input')) {
    class Md3TextInput extends HTMLElement {
        label = '';
        value = '';
    }
    customElements.define('md3-text-input', Md3TextInput);
}

if (!customElements.get('md3-number-input')) {
    class Md3NumberInput extends HTMLElement {
        label = '';
        value = 0;
    }
    customElements.define('md3-number-input', Md3NumberInput);
}

const makeStock = (overrides: Partial<NutrientStock> = {}): NutrientStock => ({
    nutrient_id: 'n1',
    name: 'Flora Grow',
    current_ml: 750,
    initial_ml: 1000,
    ...overrides,
} as NutrientStock);

const makeInventory = (stocks: Record<string, NutrientStock> = {}): NutrientInventory => ({
    stocks,
} as NutrientInventory);

describe('GrowspaceNutrientInventoryDialogUI', () => {
    let element: GrowspaceNutrientInventoryDialogUI;

    beforeEach(async () => {
        element = document.createElement('growspace-nutrient-inventory-dialog-ui') as GrowspaceNutrientInventoryDialogUI;
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (element?.isConnected) {
            document.body.removeChild(element);
        }
        vi.restoreAllMocks();
    });

    // ── render() ──────────────────────────────────────────────────────────────

    it('renders nothing when closed and not embedded', async () => {
        element.open = false;
        element.embedded = false;
        await element.updateComplete;
        expect(element.shadowRoot?.innerHTML).toContain('<!--');
    });

    it('renders gs-dialog when open=true', async () => {
        element.open = true;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('gs-dialog')).toBeTruthy();
    });

    it('renders content directly when embedded=true (no gs-dialog)', async () => {
        element.embedded = true;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('gs-dialog')).toBeFalsy();
        expect(element.shadowRoot?.querySelector('.glass-dialog-container')).toBeTruthy();
    });

    it('hides dialog header when embedded=true', async () => {
        element.embedded = true;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.dialog-header')).toBeFalsy();
    });

    it('shows loading spinner when isLoading=true', async () => {
        element.open = true;
        element.isLoading = true;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('ha-circular-progress')).toBeTruthy();
    });

    it('shows error banner when error is set', async () => {
        element.open = true;
        element.error = 'Something went wrong';
        await element.updateComplete;
        const banner = element.shadowRoot?.querySelector('.error-banner');
        expect(banner).toBeTruthy();
        expect(banner?.textContent).toContain('Something went wrong');
    });

    it('renders content when not loading and no error', async () => {
        element.open = true;
        element.inventory = makeInventory();
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.inventory-list')).toBeTruthy();
    });

    // ── _close() ──────────────────────────────────────────────────────────────

    it('relays gs-dialog close event as a composed, bubbling close event', async () => {
        element.open = true;
        await element.updateComplete;
        const events: Event[] = [];
        element.addEventListener('close', (e) => events.push(e));
        const gsDialog = element.shadowRoot?.querySelector('gs-dialog') as HTMLElement;
        gsDialog?.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
        expect(events).toHaveLength(1);
        expect((events[0] as CustomEvent).composed).toBe(true);
        expect((events[0] as CustomEvent).bubbles).toBe(true);
    });

    it('_close() dispatches close event composed and bubbling', () => {
        const events: Event[] = [];
        element.addEventListener('close', (e) => events.push(e));
        (element as any)._close();
        expect(events).toHaveLength(1);
        expect((events[0] as CustomEvent).composed).toBe(true);
        expect((events[0] as CustomEvent).bubbles).toBe(true);
    });

    // ── _renderContent() - empty state ────────────────────────────────────────

    it('shows empty state message when inventory has no stocks', async () => {
        element.open = true;
        element.inventory = makeInventory({});
        await element.updateComplete;
        expect(element.shadowRoot?.textContent).toContain('No nutrient stock items tracked.');
    });

    it('shows empty state when inventory is null', async () => {
        element.open = true;
        element.inventory = null;
        await element.updateComplete;
        expect(element.shadowRoot?.textContent).toContain('No nutrient stock items tracked.');
    });

    it('shows add button when not in add mode', async () => {
        element.open = true;
        element.inventory = makeInventory();
        await element.updateComplete;
        const btn = element.shadowRoot?.querySelector('button.md3-button.tonal.add-button');
        expect(btn).toBeTruthy();
        expect(btn?.textContent).toContain('Add Nutrient');
    });

    // ── _startAdd() ───────────────────────────────────────────────────────────

    it('shows edit form when add button is clicked', async () => {
        element.open = true;
        await element.updateComplete;
        const addBtn = element.shadowRoot?.querySelector('button.add-button') as HTMLElement;
        addBtn?.click();
        await element.updateComplete;
        expect(element.shadowRoot?.textContent).toContain('Add Nutrient');
        expect((element as any)._isAdding).toBe(true);
        expect((element as any)._editingId).toBeNull();
        expect((element as any)._editCurrent).toBe(1000);
        expect((element as any)._editInitial).toBe(1000);
    });

    it('hides add button and shows form when _isAdding=true', async () => {
        element.open = true;
        await element.updateComplete;
        (element as any)._isAdding = true;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('button.add-button')).toBeFalsy();
        expect(element.shadowRoot?.querySelector('.edit-form')).toBeTruthy();
    });

    // ── _startEdit() ──────────────────────────────────────────────────────────

    it('_startEdit() sets editing state correctly', () => {
        const stock = makeStock();
        (element as any)._startEdit(stock);
        expect((element as any)._editingId).toBe('n1');
        expect((element as any)._editName).toBe('Flora Grow');
        expect((element as any)._editCurrent).toBe(750);
        expect((element as any)._editInitial).toBe(1000);
        expect((element as any)._isAdding).toBe(false);
    });

    it('shows edit form when Edit button is clicked on a stock item', async () => {
        element.open = true;
        element.inventory = makeInventory({ n1: makeStock() });
        await element.updateComplete;
        const editBtn = element.shadowRoot?.querySelector('.stock-actions button.md3-button.text') as HTMLElement;
        editBtn?.click();
        await element.updateComplete;
        expect((element as any)._editingId).toBe('n1');
        expect(element.shadowRoot?.querySelector('.edit-form')).toBeTruthy();
    });

    // ── _cancelEdit() ─────────────────────────────────────────────────────────

    it('_cancelEdit() resets editing state', () => {
        (element as any)._editingId = 'n1';
        (element as any)._isAdding = true;
        (element as any)._cancelEdit();
        expect((element as any)._editingId).toBeNull();
        expect((element as any)._isAdding).toBe(false);
    });

    it('cancel button in edit form calls _cancelEdit', async () => {
        element.open = true;
        (element as any)._isAdding = true;
        await element.updateComplete;
        const cancelBtn = element.shadowRoot?.querySelector('button.md3-button.text[\\@click]') as HTMLElement
            ?? Array.from(element.shadowRoot?.querySelectorAll('button.md3-button.text') ?? [])
                .find(b => b.textContent?.trim() === 'Cancel') as HTMLElement;
        cancelBtn?.click();
        await element.updateComplete;
        expect((element as any)._isAdding).toBe(false);
    });

    // ── _handleSave() ─────────────────────────────────────────────────────────

    it('_handleSave() does nothing if name is empty', () => {
        (element as any)._editName = '   ';
        const spy = vi.fn();
        element.addEventListener('update-stock', spy);
        (element as any)._handleSave();
        expect(spy).not.toHaveBeenCalled();
    });

    it('_handleSave() dispatches update-stock with new id when adding', () => {
        (element as any)._editingId = null;
        (element as any)._editName = 'Flora Micro';
        (element as any)._editCurrent = 500;
        (element as any)._editInitial = 1000;
        (element as any)._isAdding = true;

        const spy = vi.fn();
        element.addEventListener('update-stock', spy);
        (element as any)._handleSave();

        expect(spy).toHaveBeenCalled();
        const detail = spy.mock.calls[0][0].detail;
        expect(detail.id).toBe('flora_micro');
        expect(detail.name).toBe('Flora Micro');
        expect(detail.current).toBe(500);
        expect(detail.initial).toBe(1000);
    });

    it('_handleSave() dispatches update-stock with existing id when editing', () => {
        (element as any)._editingId = 'existing_id';
        (element as any)._editName = 'Updated Name';
        (element as any)._editCurrent = 200;
        (element as any)._editInitial = 800;

        const spy = vi.fn();
        element.addEventListener('update-stock', spy);
        (element as any)._handleSave();

        expect(spy).toHaveBeenCalled();
        const detail = spy.mock.calls[0][0].detail;
        expect(detail.id).toBe('existing_id');
        expect(detail.name).toBe('Updated Name');
    });

    it('_handleSave() resets edit state after dispatching', () => {
        (element as any)._editName = 'Test';
        (element as any)._isAdding = true;
        (element as any)._handleSave();
        expect((element as any)._isAdding).toBe(false);
    });

    it('save button in form dispatches update-stock', async () => {
        element.open = true;
        (element as any)._isAdding = true;
        (element as any)._editName = 'My Nutrient';
        await element.updateComplete;

        const spy = vi.fn();
        element.addEventListener('update-stock', spy);

        const saveBtn = Array.from(element.shadowRoot?.querySelectorAll('button.md3-button.primary') ?? [])
            .find(b => b.textContent?.includes('Save')) as HTMLElement;
        saveBtn?.click();

        expect(spy).toHaveBeenCalled();
    });

    it('save button is disabled when isSaving=true', async () => {
        element.open = true;
        element.isSaving = true;
        (element as any)._isAdding = true;
        await element.updateComplete;

        const saveBtn = element.shadowRoot?.querySelector('button.md3-button.primary') as HTMLButtonElement;
        expect(saveBtn?.disabled).toBe(true);
        expect(saveBtn?.textContent).toContain('Saving...');
    });

    // ── _handleDelete() ───────────────────────────────────────────────────────

    it('_handleDelete() does nothing if confirm is cancelled', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        const spy = vi.fn();
        element.addEventListener('remove-stock', spy);
        (element as any)._handleDelete('n1');
        expect(spy).not.toHaveBeenCalled();
    });

    it('_handleDelete() dispatches remove-stock when confirmed', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const spy = vi.fn();
        element.addEventListener('remove-stock', spy);
        (element as any)._handleDelete('n1');
        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0].detail).toEqual({ id: 'n1' });
    });

    it('delete button triggers _handleDelete', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        element.open = true;
        element.inventory = makeInventory({ n1: makeStock() });
        await element.updateComplete;

        const spy = vi.fn();
        element.addEventListener('remove-stock', spy);

        const deleteBtn = element.shadowRoot?.querySelector('button.md3-button.icon') as HTMLElement;
        deleteBtn?.click();
        expect(spy).toHaveBeenCalled();
    });

    // ── _renderStockItem() - progress bar states ───────────────────────────────

    it('renders stock item with danger class when percent <= 20', async () => {
        element.open = true;
        element.inventory = makeInventory({
            n1: makeStock({ current_ml: 100, initial_ml: 1000 }), // 10%
        });
        await element.updateComplete;
        const fill = element.shadowRoot?.querySelector('.progress-fill');
        expect(fill?.classList.contains('danger')).toBe(true);
    });

    it('renders stock item with warning class when percent <= 40', async () => {
        element.open = true;
        element.inventory = makeInventory({
            n1: makeStock({ current_ml: 300, initial_ml: 1000 }), // 30%
        });
        await element.updateComplete;
        const fill = element.shadowRoot?.querySelector('.progress-fill');
        expect(fill?.classList.contains('warning')).toBe(true);
    });

    it('renders stock item with no status class when percent > 40', async () => {
        element.open = true;
        element.inventory = makeInventory({
            n1: makeStock({ current_ml: 600, initial_ml: 1000 }), // 60%
        });
        await element.updateComplete;
        const fill = element.shadowRoot?.querySelector('.progress-fill');
        expect(fill?.classList.contains('danger')).toBe(false);
        expect(fill?.classList.contains('warning')).toBe(false);
    });

    it('clamps progress to 0% when current_ml is negative', async () => {
        element.open = true;
        element.inventory = makeInventory({
            n1: makeStock({ current_ml: -50, initial_ml: 1000 }),
        });
        await element.updateComplete;
        const fill = element.shadowRoot?.querySelector('.progress-fill') as HTMLElement;
        expect(fill?.style.width).toBe('0%');
    });

    it('clamps progress to 100% when current_ml > initial_ml', async () => {
        element.open = true;
        element.inventory = makeInventory({
            n1: makeStock({ current_ml: 1500, initial_ml: 1000 }),
        });
        await element.updateComplete;
        const fill = element.shadowRoot?.querySelector('.progress-fill') as HTMLElement;
        expect(fill?.style.width).toBe('100%');
    });

    it('shows stock name and ml info', async () => {
        element.open = true;
        element.inventory = makeInventory({ n1: makeStock() });
        await element.updateComplete;
        expect(element.shadowRoot?.textContent).toContain('Flora Grow');
        expect(element.shadowRoot?.textContent).toContain('750');
    });

    // ── _renderStockItem() - inline edit ──────────────────────────────────────

    it('renders edit form inline for the stock being edited', async () => {
        element.open = true;
        element.inventory = makeInventory({ n1: makeStock() });
        await element.updateComplete;

        (element as any)._editingId = 'n1';
        (element as any)._isAdding = false;
        await element.updateComplete;

        // The stock item should show the edit form instead
        expect(element.shadowRoot?.querySelector('.edit-form')).toBeTruthy();
        expect(element.shadowRoot?.textContent).toContain('Edit Nutrient');
    });

    // ── _renderEditForm() - input events ──────────────────────────────────────

    it('updates _editName on md3-text-input change event', async () => {
        element.open = true;
        (element as any)._isAdding = true;
        await element.updateComplete;

        const input = element.shadowRoot?.querySelector('md3-text-input') as HTMLElement;
        input?.dispatchEvent(new CustomEvent('change', { detail: 'New Name' }));
        expect((element as any)._editName).toBe('New Name');
    });

    it('updates _editCurrent on first md3-number-input change event', async () => {
        element.open = true;
        (element as any)._isAdding = true;
        await element.updateComplete;

        const inputs = element.shadowRoot?.querySelectorAll('md3-number-input');
        inputs?.[0]?.dispatchEvent(new CustomEvent('change', { detail: '333' }));
        expect((element as any)._editCurrent).toBe(333);
    });

    it('updates _editInitial on second md3-number-input change event', async () => {
        element.open = true;
        (element as any)._isAdding = true;
        await element.updateComplete;

        const inputs = element.shadowRoot?.querySelectorAll('md3-number-input');
        inputs?.[1]?.dispatchEvent(new CustomEvent('change', { detail: '2000' }));
        expect((element as any)._editInitial).toBe(2000);
    });

    it('shows "Add Nutrient" heading when _isAdding=true', async () => {
        element.open = true;
        (element as any)._isAdding = true;
        await element.updateComplete;
        const h3 = element.shadowRoot?.querySelector('.edit-form h3');
        expect(h3?.textContent).toContain('Add Nutrient');
    });

    it('shows "Edit Nutrient" heading when editing an existing stock', async () => {
        element.open = true;
        element.inventory = makeInventory({ n1: makeStock() });
        (element as any)._editingId = 'n1';
        (element as any)._isAdding = false;
        await element.updateComplete;
        const h3 = element.shadowRoot?.querySelector('.edit-form h3');
        expect(h3?.textContent).toContain('Edit Nutrient');
    });

    // ── multiple stocks ────────────────────────────────────────────────────────

    it('renders multiple stock items', async () => {
        element.open = true;
        element.inventory = makeInventory({
            n1: makeStock({ nutrient_id: 'n1', name: 'Grow A' }),
            n2: makeStock({ nutrient_id: 'n2', name: 'Bloom B', current_ml: 200, initial_ml: 500 }),
        });
        await element.updateComplete;

        const items = element.shadowRoot?.querySelectorAll('.stock-item');
        expect(items?.length).toBe(2);
        expect(element.shadowRoot?.textContent).toContain('Grow A');
        expect(element.shadowRoot?.textContent).toContain('Bloom B');
    });

    // ── id slug generation ────────────────────────────────────────────────────

    it('generates slug id from name with special characters when adding', () => {
        (element as any)._editingId = null;
        (element as any)._editName = 'Flora Micro 2-Part!';

        const spy = vi.fn();
        element.addEventListener('update-stock', spy);
        (element as any)._handleSave();

        const detail = spy.mock.calls[0][0].detail;
        expect(detail.id).toBe('flora_micro_2_part_');
    });
});
