import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspaceIPMDialogUI } from '../../../../../src/features/ui/components/growspace-ipm-dialog-ui';
import type { IPMPreset } from '../../../../../src/types';

if (!customElements.get('growspace-ipm-dialog-ui')) {
  customElements.define('growspace-ipm-dialog-ui', GrowspaceIPMDialogUI);
}

const mockPresets: Record<string, IPMPreset> = {
  'preset-1': {
    id: 'preset-1',
    name: 'Neem Oil Spray',
    type: 'foliar',
    items: [{ name: 'Neem Oil', dose_amount: 5, dose_unit: 'ml/L', phi_days: 7 }],
    stage: undefined,
    min_days_in_stage: 0,
  },
  'preset-2': {
    id: 'preset-2',
    name: 'Root Drench',
    type: 'drench',
    items: [
      { name: 'H2O2', dose_amount: 2, dose_unit: 'ml/L', phi_days: 3 },
      { name: 'Nematodes', dose_amount: 1, dose_unit: 'g/L', phi_days: 0 },
    ],
    stage: 'veg',
    min_days_in_stage: 7,
  },
};

describe('GrowspaceIPMDialogUI', () => {
  it('renders nothing when closed', async () => {
    const el = await fixture<GrowspaceIPMDialogUI>(html`
      <growspace-ipm-dialog-ui .open=${false} .presets=${{}}></growspace-ipm-dialog-ui>
    `);
    expect(el.shadowRoot!.querySelector('ha-dialog')).toBeNull();
  });

  it('renders dialog when open', async () => {
    const el = await fixture<GrowspaceIPMDialogUI>(html`
      <growspace-ipm-dialog-ui .open=${true} .presets=${{}}></growspace-ipm-dialog-ui>
    `);
    expect(el.shadowRoot!.querySelector('ha-dialog')).not.toBeNull();
  });

  it('is defined as a custom element', () => {
    expect(customElements.get('growspace-ipm-dialog-ui')).toBeDefined();
  });

  it('dispatches close event when close button is clicked', async () => {
    const handler = vi.fn();
    const el = await fixture<GrowspaceIPMDialogUI>(html`
      <growspace-ipm-dialog-ui
        .open=${true}
        .presets=${{}}
        @close=${handler}
      ></growspace-ipm-dialog-ui>
    `);
    const closeBtn = el.shadowRoot!.querySelector('.dialog-header button.md3-button') as HTMLElement;
    closeBtn?.click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('shows APPLY view by default with a preset selector', async () => {
    const el = await fixture<GrowspaceIPMDialogUI>(html`
      <growspace-ipm-dialog-ui .open=${true} .presets=${mockPresets}></growspace-ipm-dialog-ui>
    `);
    expect(el.shadowRoot!.querySelector('md3-select')).not.toBeNull();
  });

  it('shows error bar when error prop is set', async () => {
    const el = await fixture<GrowspaceIPMDialogUI>(html`
      <growspace-ipm-dialog-ui
        .open=${true}
        .presets=${{}}
        .error=${'Something went wrong'}
      ></growspace-ipm-dialog-ui>
    `);
    const errorBar = el.shadowRoot!.querySelector('.error-bar');
    expect(errorBar?.textContent).toContain('Something went wrong');
  });

  it('shows no error bar when error is null', async () => {
    const el = await fixture<GrowspaceIPMDialogUI>(html`
      <growspace-ipm-dialog-ui .open=${true} .presets=${{}}}></growspace-ipm-dialog-ui>
    `);
    expect(el.shadowRoot!.querySelector('.error-bar')).toBeNull();
  });

  it('shows targeting entire growspace when no plant IDs specified', async () => {
    const el = await fixture<GrowspaceIPMDialogUI>(html`
      <growspace-ipm-dialog-ui .open=${true} .presets=${mockPresets} .plantIds=${[]}></growspace-ipm-dialog-ui>
    `);
    const applyTarget = el.shadowRoot!.querySelector('.apply-target');
    expect(applyTarget?.textContent).toContain('Entire Growspace');
  });

  it('shows plant count in target when plant IDs are specified', async () => {
    const el = await fixture<GrowspaceIPMDialogUI>(html`
      <growspace-ipm-dialog-ui
        .open=${true}
        .presets=${mockPresets}
        .plantIds=${['p1', 'p2']}
      ></growspace-ipm-dialog-ui>
    `);
    const applyTarget = el.shadowRoot!.querySelector('.apply-target');
    expect(applyTarget?.textContent).toContain('2 Plants');
  });

    it('should update _selectedPresetId on select change', async () => {
      const el = await fixture<GrowspaceIPMDialogUI>(html`
        <growspace-ipm-dialog-ui .open=${true} .presets=${mockPresets}></growspace-ipm-dialog-ui>
      `);
      const select = el.shadowRoot!.querySelector('md3-select') as any;
      select.dispatchEvent(new CustomEvent('change', { detail: 'preset-2' }));
      expect((el as any)._selectedPresetId).toBe('preset-2');
    });

    it('should update _notes on textarea input', async () => {
      const el = await fixture<GrowspaceIPMDialogUI>(html`
        <growspace-ipm-dialog-ui .open=${true} .presets=${mockPresets}></growspace-ipm-dialog-ui>
      `);
      const textarea = el.shadowRoot!.querySelector('ha-textarea') as HTMLTextAreaElement;
      textarea.value = 'New treatment notes';
      textarea.dispatchEvent(new Event('input'));
      expect((el as any)._notes).toBe('New treatment notes');
    });

    it('should disable Apply button when isSubmitting is true', async () => {
      const el = await fixture<GrowspaceIPMDialogUI>(html`
        <growspace-ipm-dialog-ui
          .open=${true}
          .presets=${mockPresets}
          .isSubmitting=${true}
        ></growspace-ipm-dialog-ui>
      `);
      (el as any)._selectedPresetId = 'preset-1';
      await el.updateComplete;
      const applyBtn = el.shadowRoot!.querySelector('.button-group button.md3-button.primary') as HTMLButtonElement;
      expect(applyBtn.disabled).toBe(true);
      expect(applyBtn.textContent).toContain('Applying...');
    });

  describe('LIST view', () => {
    let el: GrowspaceIPMDialogUI;

    beforeEach(async () => {
      el = await fixture<GrowspaceIPMDialogUI>(html`
        <growspace-ipm-dialog-ui .open=${true} .presets=${mockPresets}></growspace-ipm-dialog-ui>
      `);
      (el as any)._view = 'LIST';
      await el.updateComplete;
    });

    it('shows all presets as items', () => {
      const items = el.shadowRoot!.querySelectorAll('.preset-item');
      expect(items.length).toBe(2);
    });

    it('shows preset names', () => {
      const names = Array.from(el.shadowRoot!.querySelectorAll('.preset-name')).map((n) => n.textContent);
      expect(names).toContain('Neem Oil Spray');
      expect(names).toContain('Root Drench'); 
    });

    it('shows empty state when no presets', async () => {
      el.presets = {};
      await el.updateComplete;
      expect(el.shadowRoot!.querySelector('.empty-state')).not.toBeNull();
    });

    it('switches back to APPLY view when Back to Apply clicked', async () => {
      const backBtn = el.shadowRoot!.querySelector('.button-group button.md3-button.tonal') as HTMLElement;
      backBtn?.click();
      await el.updateComplete;
      expect((el as any)._view).toBe('APPLY');
    });

    it('switches to EDIT view when Add Preset clicked', async () => {
      const addBtn = el.shadowRoot!.querySelector('.button-group button.md3-button.primary') as HTMLElement;
      addBtn?.click();
      await el.updateComplete;
      expect((el as any)._view).toBe('EDIT');
    });

    it('switches to EDIT view with preset data when edit button clicked', async () => {
      const editBtn = el.shadowRoot!.querySelector('.preset-actions button:first-child') as HTMLElement;
      editBtn?.click();
      await el.updateComplete;
      expect((el as any)._view).toBe('EDIT');
      expect((el as any)._editingPreset).not.toBeNull();
      expect((el as any)._editingPreset.name).toBe('Neem Oil Spray');
    });

    it('dispatches delete-preset event when delete button clicked', async () => {
      const handler = vi.fn();
      el.addEventListener('delete-preset', handler);
      const deleteBtn = el.shadowRoot!.querySelector('.preset-actions button:last-child') as HTMLElement;
      deleteBtn?.click();
      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].detail).toEqual({ presetId: 'preset-1' });
    });
  });

  describe('EDIT view', () => {
    let el: GrowspaceIPMDialogUI;

    beforeEach(async () => {
      el = await fixture<GrowspaceIPMDialogUI>(html`
        <growspace-ipm-dialog-ui .open=${true} .presets=${mockPresets}></growspace-ipm-dialog-ui>
      `);
      (el as any)._startNew();
      await el.updateComplete;
    });

    it('renders edit form with one default product row', () => {
      const productRows = el.shadowRoot!.querySelectorAll('.product-row');
      expect(productRows.length).toBe(1);
    });

    it('updates preset name on input change', async () => {
      const input = el.shadowRoot!.querySelector('md3-text-input[label="Preset Name"]') as any;
      input.dispatchEvent(new CustomEvent('change', { detail: 'Brand New Preset' }));
      expect((el as any)._editingPreset.name).toBe('Brand New Preset');
    });

    it('updates preset type on select change', async () => {
      const select = el.shadowRoot!.querySelector('select[class="md3-input"]') as HTMLSelectElement;
      select.value = 'beneficials';
      select.dispatchEvent(new Event('change'));
      expect((el as any)._editingPreset.type).toBe('beneficials');
    });

    it('adds a product row when Add button clicked', async () => {
      const addBtn = el.shadowRoot!.querySelector('.form-section button.md3-button.text') as HTMLElement;
      addBtn?.click();
      await el.updateComplete;
      expect(el.shadowRoot!.querySelectorAll('.product-row').length).toBe(2);
      expect((el as any)._editingPreset.items.length).toBe(2);
    });

    it('updates product details when inputs change', async () => {
      const productRow = el.shadowRoot!.querySelector('.product-row');
      const nameInput = productRow!.querySelector('md3-text-input[label="Product"]') as any;
      const doseInput = productRow!.querySelector('md3-number-input[label="Dose"]') as any;
      const unitInput = productRow!.querySelector('md3-text-input[label="Unit"]') as any;
      const phiInput = productRow!.querySelector('md3-number-input[label="PHI (Days)"]') as any;

      nameInput.dispatchEvent(new CustomEvent('change', { detail: 'New Product' }));
      doseInput.dispatchEvent(new CustomEvent('change', { detail: '10.5' }));
      unitInput.dispatchEvent(new CustomEvent('change', { detail: 'oz' }));
      phiInput.dispatchEvent(new CustomEvent('change', { detail: '14' }));

      const item = (el as any)._editingPreset.items[0];
      expect(item.name).toBe('New Product');
      expect(item.dose_amount).toBe(10.5);
      expect(item.dose_unit).toBe('oz');
      expect(item.phi_days).toBe(14);
    });

    it('removes a product row when delete icon clicked', async () => {
      // Add one first so we have 2
      (el as any)._addProduct();
      await el.updateComplete;
      expect(el.shadowRoot!.querySelectorAll('.product-row').length).toBe(2);

      const removeBtn = el.shadowRoot!.querySelectorAll('.product-row button.md3-button.icon')[0] as HTMLElement;
      removeBtn?.click();
      await el.updateComplete;
      expect(el.shadowRoot!.querySelectorAll('.product-row').length).toBe(1);
    });

    it('dispatches save-preset event when Save Preset clicked', async () => {
      const handler = vi.fn();
      el.addEventListener('save-preset', handler);
      const saveBtn = el.shadowRoot!.querySelector('.button-group button.md3-button.primary') as HTMLElement;
      saveBtn?.click();
      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].detail).toEqual((el as any)._editingPreset);
    });

    it('disables save button when isSubmitting is true', async () => {
      el.isSubmitting = true;
      await el.updateComplete;
      const saveBtn = el.shadowRoot!.querySelector('.button-group button.md3-button.primary') as HTMLButtonElement;
      expect(saveBtn.disabled).toBe(true);
      expect(saveBtn.textContent).toContain('Saving...');
    });

    it('switches back to LIST view when Cancel clicked', async () => {
      const cancelBtn = el.shadowRoot!.querySelector('.button-group button.md3-button.tonal') as HTMLElement;
      cancelBtn?.click();
      await el.updateComplete;
      expect((el as any)._view).toBe('LIST');
    });
  });

  it('resets to APPLY view when dialog is reopened', async () => {
    const el = await fixture<GrowspaceIPMDialogUI>(html`
      <growspace-ipm-dialog-ui .open=${true} .presets=${mockPresets}></growspace-ipm-dialog-ui>
    `);
    (el as any)._view = 'LIST';
    await el.updateComplete;
    el.open = false;
    await el.updateComplete;
    el.open = true;
    await el.updateComplete;
    expect((el as any)._view).toBe('APPLY');
  });
});
