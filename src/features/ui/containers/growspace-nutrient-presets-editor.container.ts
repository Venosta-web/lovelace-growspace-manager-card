import { LitElement, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { StoreController } from '@nanostores/lit';
import { hassContext, storeContext } from '../../../lib/context';
import { GrowspaceStore } from '../../../store/core/growspace-store';
import { NutrientPreset } from '../../../types';
import '../components/growspace-nutrient-presets-editor-ui';

@customElement('growspace-nutrient-presets-editor')
export class GrowspaceNutrientPresetsEditorContainer extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  public hass!: any;

  @consume({ context: storeContext, subscribe: true })
  @property({ attribute: false })
  public store!: GrowspaceStore;

  @property({ type: Boolean }) open = false;
  @property({ type: String }) growspaceId?: string;

  private _nutrientDataController!: StoreController<import('../../../store/core/data-store').NutrientDataState>;

  connectedCallback() {
    super.connectedCallback();
    if (this.store) {
      this._nutrientDataController = new StoreController(this, this.store.data.$nutrientDataState);
    }
  }

  private _handleSave(e: CustomEvent<Partial<NutrientPreset>>) {
    const preset = e.detail;
    void this.store.actions.nutrient.savePreset({
      preset_id: preset.id,
      name: preset.name || 'Unnamed Preset',
      nutrients: preset.nutrients?.map((n: import('../../../services/types').NutrientItem) => ({
        name: n.name,
        dose_ml_l: n.dose_ml_l
      })) || [],
    });
  }

  private _handleDelete(e: CustomEvent<{ presetId: string }>) {
    void this.store.actions.nutrient.removePreset(e.detail.presetId);
  }

  render() {
    if (!this.store || !this._nutrientDataController) return nothing;

    const { nutrientPresets } = this._nutrientDataController.value;

    return html`
      <growspace-nutrient-presets-editor-ui
        .open=${this.open}
        .presets=${nutrientPresets}
        .growspaceId=${this.growspaceId}
        @close=${() => this.dispatchEvent(new CustomEvent('close'))}
        @save-preset=${this._handleSave}
        @delete-preset=${this._handleDelete}
      ></growspace-nutrient-presets-editor-ui>
    `;
  }
}
