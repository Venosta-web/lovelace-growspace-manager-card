import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { StoreController } from '@nanostores/lit';
import {
  nutrientPresets$,
  nutrientInventory$,
  fetchNutrientPresets,
} from '../../../slices/nutrient';
import type { PresetsSub } from '../../../dialogs/feed-and-water-dialog-sm';
import '../components/growspace-nutrient-presets-editor-ui';

/**
 * Thin wiring layer that subscribes to the nutrient atoms and passes live
 * inventory + preset data to the presets editor UI for dropdown population
 * and orphan detection. Self-fetches its preset data on open (see the
 * "Dialog self-fetch on open" entry in CONTEXT.md), rendering a loading
 * state until the atom resolves.
 */
@customElement('growspace-nutrient-presets-editor')
export class GrowspaceNutrientPresetsEditorContainer extends LitElement {
  @property({ attribute: false }) selectedId: string | null = null;
  @property({ attribute: false }) sub: PresetsSub = { kind: 'idle' };

  private _presets = new StoreController(this, nutrientPresets$);
  private _inventory = new StoreController(this, nutrientInventory$);

  connectedCallback(): void {
    super.connectedCallback();
    fetchNutrientPresets().catch((err: unknown) =>
      console.error('[nutrient-presets-editor] failed to fetch presets', err)
    );
  }

  render() {
    const presets = this._presets.value;
    const inventory = this._inventory.value;

    if (presets === null) {
      return html`<div class="presets-loading" role="status">Loading presets…</div>`;
    }

    return html`
      <growspace-nutrient-presets-editor-ui
        .presets=${presets}
        .inventory=${inventory}
        .selectedId=${this.selectedId}
        .sub=${this.sub}
      ></growspace-nutrient-presets-editor-ui>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-nutrient-presets-editor': GrowspaceNutrientPresetsEditorContainer;
  }
}
