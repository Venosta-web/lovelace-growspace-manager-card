import { describe, it, expect, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { nutrientPresets$, nutrientInventory$ } from '../../../slices/nutrient';
import type { NutrientPresetsResponse, NutrientInventoryResponse } from '../../../slices/nutrient';
import './growspace-nutrient-presets-editor.container';
import '../components/growspace-nutrient-presets-editor-ui';

if (!customElements.get('growspace-nutrient-presets-editor-ui')) {
  customElements.define('growspace-nutrient-presets-editor-ui', class extends HTMLElement {});
}

function aPresets(): NutrientPresetsResponse {
  return {
    p1: { id: 'p1', name: 'Veg Week 1', week: 1, nutrients: [] },
  };
}

function aInventory(): NutrientInventoryResponse {
  return { stocks: {} };
}

describe('GrowspaceNutrientPresetsEditorContainer', () => {
  afterEach(() => {
    nutrientPresets$.set(null);
    nutrientInventory$.set(null);
  });

  it('renders nothing when presets atom is null', async () => {
    nutrientPresets$.set(null);
    const el = await fixture(html`<growspace-nutrient-presets-editor></growspace-nutrient-presets-editor>`);
    expect(el.shadowRoot?.querySelector('growspace-nutrient-presets-editor-ui')).toBeNull();
  });

  it('renders the editor-ui when presets atom is populated', async () => {
    nutrientPresets$.set(aPresets());
    nutrientInventory$.set(aInventory());
    const el = await fixture<any>(html`<growspace-nutrient-presets-editor></growspace-nutrient-presets-editor>`);
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('growspace-nutrient-presets-editor-ui')).not.toBeNull();
  });

  it('passes selectedId and sub props through to the ui', async () => {
    nutrientPresets$.set(aPresets());
    nutrientInventory$.set(aInventory());
    const el = await fixture<any>(html`
      <growspace-nutrient-presets-editor
        .selectedId=${'p1'}
        .sub=${{ kind: 'saving' }}
      ></growspace-nutrient-presets-editor>
    `);
    await el.updateComplete;
    const ui = el.shadowRoot?.querySelector('growspace-nutrient-presets-editor-ui') as any;
    expect(ui?.selectedId).toBe('p1');
    expect(ui?.sub).toEqual({ kind: 'saving' });
  });
});
