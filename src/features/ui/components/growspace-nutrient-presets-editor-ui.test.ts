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

describe('GrowspaceNutrientPresetsEditorUI – save-preset returns to list', () => {
  afterEach(() => vi.restoreAllMocks());

  it('transitions back to LIST view after save-preset is dispatched', () => {
    const el = document.createElement(
      'growspace-nutrient-presets-editor-ui'
    ) as GrowspaceNutrientPresetsEditorUI;
    (el as any)._view = 'EDIT';
    (el as any)._editingPreset = { name: 'Test', nutrients: [] };

    (el as any)._handleSave();

    expect((el as any)._view).toBe('LIST');
    expect((el as any)._editingPreset).toBeNull();
  });

  it('still dispatches save-preset event when saving', () => {
    const el = document.createElement(
      'growspace-nutrient-presets-editor-ui'
    ) as GrowspaceNutrientPresetsEditorUI;
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
});
