import { LitElement, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { StoreController } from '@nanostores/lit';
import { nutrientPresets$, nutrientInventory$ } from '../../../slices/nutrient';
import type { PresetsSub } from '../../../dialogs/feed-and-water-dialog-sm';
import '../components/growspace-nutrient-presets-editor-ui';

/**
 * Thin wiring layer that subscribes to the nutrient atoms and passes live
 * inventory + preset data to the presets editor UI for dropdown population
 * and orphan detection. The shell (nutrient-dialog) owns the SM and all
 * fetch calls; this container is a pure pass-through.
 */
@customElement('growspace-nutrient-presets-editor')
export class GrowspaceNutrientPresetsEditorContainer extends LitElement {
  @property({ attribute: false }) selectedId: string | null = null;
  @property({ attribute: false }) sub: PresetsSub = { kind: 'idle' };

  private _presets = new StoreController(this, nutrientPresets$);
  private _inventory = new StoreController(this, nutrientInventory$);

  render() {
    const presets = this._presets.value;
    const inventory = this._inventory.value;

    if (presets === null) return nothing;

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
