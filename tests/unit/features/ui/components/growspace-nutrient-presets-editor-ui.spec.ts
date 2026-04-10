import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspaceNutrientPresetsEditorUI } from '../../../../../src/features/ui/components/growspace-nutrient-presets-editor-ui';
import type { NutrientPreset } from '../../../../../src/types';

if (!customElements.get('growspace-nutrient-presets-editor-ui')) {
  customElements.define('growspace-nutrient-presets-editor-ui', GrowspaceNutrientPresetsEditorUI);
}

const mockPresets: Record<string, NutrientPreset> = {
  'preset-a': {
    id: 'preset-a',
    name: 'Veg Week 1',
    nutrients: [
      { name: 'Grow', dose_ml_l: 2 },
      { name: 'CalMag', dose_ml_l: 1 },
    ],
  },
  'preset-b': {
    id: 'preset-b',
    name: 'Bloom Week 4',
    nutrients: [{ name: 'Bloom', dose_ml_l: 3 }],
  },
};

describe('GrowspaceNutrientPresetsEditorUI', () => {
  it('is defined as a custom element', () => {
    expect(customElements.get('growspace-nutrient-presets-editor-ui')).toBeDefined();
  });

  it('renders nothing when closed', async () => {
    const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
      <growspace-nutrient-presets-editor-ui .open=${false} .presets=${{}}></growspace-nutrient-presets-editor-ui>
    `);
    expect(el.shadowRoot!.querySelector('ha-dialog')).toBeNull();
  });

  it('renders dialog when open', async () => {
    const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
      <growspace-nutrient-presets-editor-ui .open=${true} .presets=${{}}></growspace-nutrient-presets-editor-ui>
    `);
    expect(el.shadowRoot!.querySelector('ha-dialog')).not.toBeNull();
  });

  it('dispatches close event when close button is clicked', async () => {
    const handler = vi.fn();
    const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
      <growspace-nutrient-presets-editor-ui
        .open=${true}
        .presets=${{}}
        @close=${handler}
      ></growspace-nutrient-presets-editor-ui>
    `);
    const closeBtn = el.shadowRoot!.querySelector('.dialog-header button.md3-button') as HTMLElement;
    closeBtn?.click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('shows error bar when error prop is set', async () => {
    const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
      <growspace-nutrient-presets-editor-ui
        .open=${true}
        .presets=${{}}
        .error=${'Network error'}
      ></growspace-nutrient-presets-editor-ui>
    `);
    expect(el.shadowRoot!.querySelector('.error-bar')?.textContent).toContain('Network error');
  });

  describe('LIST view', () => {
    it('shows empty state when no presets exist', async () => {
      const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
        <growspace-nutrient-presets-editor-ui .open=${true} .presets=${{}}></growspace-nutrient-presets-editor-ui>
      `);
      expect(el.shadowRoot!.querySelector('.empty-state')).not.toBeNull();
    });

    it('renders preset items for each preset', async () => {
      const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
        <growspace-nutrient-presets-editor-ui .open=${true} .presets=${mockPresets}></growspace-nutrient-presets-editor-ui>
      `);
      expect(el.shadowRoot!.querySelectorAll('.preset-item').length).toBe(2);
    });

    it('shows preset names', async () => {
      const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
        <growspace-nutrient-presets-editor-ui .open=${true} .presets=${mockPresets}></growspace-nutrient-presets-editor-ui>
      `);
      const names = Array.from(el.shadowRoot!.querySelectorAll('.preset-name')).map((n) => n.textContent);
      expect(names).toContain('Veg Week 1');
      expect(names).toContain('Bloom Week 4');
    });

    it('dispatches close event when Close button clicked', async () => {
      const handler = vi.fn();
      const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
        <growspace-nutrient-presets-editor-ui
          .open=${true}
          .presets=${{}}
          @close=${handler}
        ></growspace-nutrient-presets-editor-ui>
      `);
      const closeBtn = el.shadowRoot!.querySelector('.button-group button.md3-button.tonal') as HTMLElement;
      closeBtn?.click();
      expect(handler).toHaveBeenCalledOnce();
    });

    it('switches to EDIT view when Add Preset clicked', async () => {
      const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
        <growspace-nutrient-presets-editor-ui .open=${true} .presets=${{}}></growspace-nutrient-presets-editor-ui>
      `);
      const addBtn = el.shadowRoot!.querySelector('.button-group button.md3-button.primary') as HTMLElement;
      addBtn?.click();
      await el.updateComplete;
      expect((el as any)._view).toBe('EDIT');
    });

    it('switches to EDIT view with preset data when edit button clicked', async () => {
      const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
        <growspace-nutrient-presets-editor-ui .open=${true} .presets=${mockPresets}></growspace-nutrient-presets-editor-ui>
      `);
      const editBtn = el.shadowRoot!.querySelector('.preset-actions button:first-child') as HTMLElement;
      editBtn?.click();
      await el.updateComplete;
      expect((el as any)._view).toBe('EDIT');
      expect((el as any)._editingPreset).not.toBeNull();
    });

    it('dispatches delete-preset event when delete button clicked', async () => {
      const handler = vi.fn();
      const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
        <growspace-nutrient-presets-editor-ui .open=${true} .presets=${mockPresets}></growspace-nutrient-presets-editor-ui>
      `);
      el.addEventListener('delete-preset', handler);
      const deleteBtn = el.shadowRoot!.querySelector('.preset-actions button:last-child') as HTMLElement;
      deleteBtn?.click();
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('EDIT view', () => {
    let el: GrowspaceNutrientPresetsEditorUI;

    beforeEach(async () => {
      el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
        <growspace-nutrient-presets-editor-ui .open=${true} .presets=${{}}></growspace-nutrient-presets-editor-ui>
      `);
      const addBtn = el.shadowRoot!.querySelector('.button-group button.md3-button.primary') as HTMLElement;
      addBtn?.click();
      await el.updateComplete;
    });

    it('renders edit form with one default nutrient row', () => {
      expect(el.shadowRoot!.querySelectorAll('.nutrient-row').length).toBe(1);
    });

    it('adds a nutrient row when Add button clicked', async () => {
      const addBtn = el.shadowRoot!.querySelector('.form-section button.md3-button.text') as HTMLElement;
      addBtn?.click();
      await el.updateComplete;
      expect(el.shadowRoot!.querySelectorAll('.nutrient-row').length).toBe(2);
    });

    it('removes a nutrient row when delete icon clicked', async () => {
      const removeBtn = el.shadowRoot!.querySelector('.nutrient-row button.md3-button.icon') as HTMLElement;
      removeBtn?.click();
      await el.updateComplete;
      expect(el.shadowRoot!.querySelectorAll('.nutrient-row').length).toBe(0);
    });

    it('dispatches save-preset event when Save Preset clicked', async () => {
      const handler = vi.fn();
      el.addEventListener('save-preset', handler);
      const saveBtn = el.shadowRoot!.querySelector('.button-group button.md3-button.primary') as HTMLElement;
      saveBtn?.click();
      expect(handler).toHaveBeenCalledOnce();
    });

    it('switches back to LIST view when Cancel clicked', async () => {
      const cancelBtn = el.shadowRoot!.querySelector('.button-group button.md3-button.tonal') as HTMLElement;
      cancelBtn?.click();
      await el.updateComplete;
      expect((el as any)._view).toBe('LIST');
    });
  });

  it('resets to LIST view when dialog is reopened', async () => {
    const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
      <growspace-nutrient-presets-editor-ui .open=${true} .presets=${{}}></growspace-nutrient-presets-editor-ui>
    `);
    (el as any)._view = 'EDIT';
    (el as any)._editingPreset = null;
    await el.updateComplete;
    el.open = false;
    await el.updateComplete;
    el.open = true;
    await el.updateComplete;
    expect((el as any)._view).toBe('LIST');
  });
});
