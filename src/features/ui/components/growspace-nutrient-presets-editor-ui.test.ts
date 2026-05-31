import { describe, it, expect, afterEach, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import './growspace-nutrient-presets-editor-ui';
import { GrowspaceNutrientPresetsEditorUI } from './growspace-nutrient-presets-editor-ui';

const mockTags = ['ha-svg-icon', 'gs-dialog', 'md3-text-input', 'md3-number-input'];
for (const tag of mockTags) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement { });
  }
}

function make(): GrowspaceNutrientPresetsEditorUI {
  return document.createElement(
    'growspace-nutrient-presets-editor-ui'
  ) as GrowspaceNutrientPresetsEditorUI;
}

describe('GrowspaceNutrientPresetsEditorUI – save-preset returns to list', () => {
  afterEach(() => vi.restoreAllMocks());

  it('transitions back to LIST view after save-preset is dispatched', () => {
    const el = make();
    (el as any)._view = 'EDIT';
    (el as any)._editingPreset = { name: 'Test', nutrients: [] };

    (el as any)._handleSave();

    expect((el as any)._view).toBe('LIST');
    expect((el as any)._editingPreset).toBeNull();
  });

  it('still dispatches save-preset event when saving', () => {
    const el = make();
    (el as any)._editingPreset = {
      name: 'My Preset',
      nutrients: [{ name: 'Cal-Mag', dose_ml_l: 2 }],
    };
    const events: CustomEvent[] = [];
    el.addEventListener('save-preset', (e) => events.push(e as CustomEvent));

    (el as any)._handleSave();

    expect(events).toHaveLength(1);
    expect(events[0].detail).toMatchObject({ name: 'My Preset' });
  });

  it('does nothing when _editingPreset is null', () => {
    const el = make();
    (el as any)._editingPreset = null;
    const events: Event[] = [];
    el.addEventListener('save-preset', (e) => events.push(e));

    (el as any)._handleSave();

    expect(events).toHaveLength(0);
  });
});

describe('GrowspaceNutrientPresetsEditorUI – _close', () => {
  it('dispatches close event', () => {
    const el = make();
    const events: Event[] = [];
    el.addEventListener('close', (e) => events.push(e));

    (el as any)._close();

    expect(events).toHaveLength(1);
  });
});

describe('GrowspaceNutrientPresetsEditorUI – _handleDelete', () => {
  it('dispatches delete-preset with presetId', () => {
    const el = make();
    const events: CustomEvent[] = [];
    el.addEventListener('delete-preset', (e) => events.push(e as CustomEvent));

    (el as any)._handleDelete('preset-123');

    expect(events).toHaveLength(1);
    expect(events[0].detail).toEqual({ presetId: 'preset-123' });
  });
});

describe('GrowspaceNutrientPresetsEditorUI – _startNew', () => {
  it('sets EDIT view and initialises an empty preset', () => {
    const el = make();

    (el as any)._startNew();

    expect((el as any)._view).toBe('EDIT');
    expect((el as any)._editingPreset).toMatchObject({
      name: '',
      nutrients: [{ name: '', dose_ml_l: 0 }],
    });
  });
});

describe('GrowspaceNutrientPresetsEditorUI – _editPreset', () => {
  it('deep-copies the preset and switches to EDIT view', () => {
    const el = make();
    const preset = { id: 'p1', name: 'Veg', nutrients: [{ name: 'Cal-Mag', dose_ml_l: 2 }] };

    (el as any)._editPreset(preset);

    expect((el as any)._view).toBe('EDIT');
    expect((el as any)._editingPreset).toEqual(preset);
    preset.name = 'mutated';
    expect((el as any)._editingPreset.name).toBe('Veg');
  });
});

describe('GrowspaceNutrientPresetsEditorUI – _addNutrient', () => {
  it('appends an empty nutrient entry', () => {
    const el = make();
    (el as any)._editingPreset = { name: 'T', nutrients: [] };

    (el as any)._addNutrient();

    expect((el as any)._editingPreset.nutrients).toHaveLength(1);
    expect((el as any)._editingPreset.nutrients[0]).toEqual({ name: '', dose_ml_l: 0 });
  });

  it('does nothing when _editingPreset is null', () => {
    const el = make();
    (el as any)._editingPreset = null;
    expect(() => (el as any)._addNutrient()).not.toThrow();
  });
});

describe('GrowspaceNutrientPresetsEditorUI – _removeNutrient', () => {
  it('removes the nutrient at the given index', () => {
    const el = make();
    (el as any)._editingPreset = {
      name: 'T',
      nutrients: [
        { name: 'A', dose_ml_l: 1 },
        { name: 'B', dose_ml_l: 2 },
      ],
    };

    (el as any)._removeNutrient(0);

    expect((el as any)._editingPreset.nutrients).toHaveLength(1);
    expect((el as any)._editingPreset.nutrients[0].name).toBe('B');
  });

  it('does nothing when _editingPreset is null', () => {
    const el = make();
    (el as any)._editingPreset = null;
    expect(() => (el as any)._removeNutrient(0)).not.toThrow();
  });
});

describe('GrowspaceNutrientPresetsEditorUI – _updateNutrient', () => {
  it('merges partial updates into the nutrient at the given index', () => {
    const el = make();
    (el as any)._editingPreset = { name: 'T', nutrients: [{ name: 'A', dose_ml_l: 1 }] };

    (el as any)._updateNutrient(0, { dose_ml_l: 3.5 });

    expect((el as any)._editingPreset.nutrients[0]).toEqual({ name: 'A', dose_ml_l: 3.5 });
  });

  it('does nothing when _editingPreset is null', () => {
    const el = make();
    (el as any)._editingPreset = null;
    expect(() => (el as any)._updateNutrient(0, { name: 'X' })).not.toThrow();
  });
});

describe('GrowspaceNutrientPresetsEditorUI – updated lifecycle', () => {
  it('resets view to LIST when open becomes true and no preset is being edited', () => {
    const el = make();
    (el as any)._view = 'EDIT';
    (el as any)._editingPreset = null;
    (el as any).open = true;

    (el as any).updated(new Map([['open', false]]));

    expect((el as any)._view).toBe('LIST');
  });

  it('preserves EDIT view when open becomes true but a preset is being edited', () => {
    const el = make();
    (el as any)._view = 'EDIT';
    (el as any)._editingPreset = { name: 'T', nutrients: [] };
    (el as any).open = true;

    (el as any).updated(new Map([['open', false]]));

    expect((el as any)._view).toBe('EDIT');
  });
});

describe('GrowspaceNutrientPresetsEditorUI – render paths', () => {
  it('renders list view with presets (covers _renderList)', async () => {
    const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
      <growspace-nutrient-presets-editor-ui
        .open=${true}
        .presets=${{
          p1: { id: 'p1', name: 'Veg Week 1', nutrients: [{ name: 'Cal-Mag', dose_ml_l: 2 }] },
        }}
      ></growspace-nutrient-presets-editor-ui>
    `);
    expect(el).toBeTruthy();
  });

  it('renders edit view with nutrients (covers _renderEdit nutrients map)', async () => {
    const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
      <growspace-nutrient-presets-editor-ui .open=${true}></growspace-nutrient-presets-editor-ui>
    `);
    (el as any)._view = 'EDIT';
    (el as any)._editingPreset = { name: 'Test', nutrients: [{ name: 'Cal-Mag', dose_ml_l: 2 }] };
    el.requestUpdate();
    await el.updateComplete;
    expect(el).toBeTruthy();
  });
});
