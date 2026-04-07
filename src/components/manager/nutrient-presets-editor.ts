import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  mdiClose,
  mdiPlus,
  mdiDelete,
  mdiPencil,
  mdiBottleTonicPlus,
  mdiContentSave,
  mdiInformation,
} from '@mdi/js';
import { consume } from '@lit/context';
import { HomeAssistant } from 'custom-card-helpers';
import { hassContext, storeContext } from '../../context';
import { dialogStyles } from '../../styles/dialog.styles';
import { GrowspaceStore } from '../../store/core/growspace-store';
import { StoreController } from '@nanostores/lit';
import { NutrientPreset, NutrientItem } from '../../types';
import '../ui/gs-help-tooltip';

@customElement('nutrient-presets-editor')
export class NutrientPresetsEditor extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  public hass!: HomeAssistant;

  @consume({ context: storeContext, subscribe: true })
  @property({ attribute: false })
  public store!: GrowspaceStore;

  @property({ type: Boolean }) open = false;
  @property({ type: Boolean }) embedded = false;
  @property({ type: String }) growspaceId?: string;

  @state() private _view: 'LIST' | 'EDIT' = 'LIST';
  @state() private _editingPreset: Partial<NutrientPreset> | null = null;
  @state() private _error: string | null = null;

  private _presetsController!: StoreController<Record<string, NutrientPreset>>;
  private _inventoryController!: StoreController<import('../../types').NutrientInventory | null>;

  connectedCallback() {
    super.connectedCallback();
    this._initControllers();
  }

  willUpdate(changedProperties: Map<string, any>) {
    if (changedProperties.has('store') && this.store) {
      this._initControllers();
    }
  }

  private _initControllers() {
    if (!this.store || this._presetsController) return;
    this._presetsController = new StoreController(this, this.store.data.$nutrientPresets);
    this._inventoryController = new StoreController(this, this.store.data.$nutrientInventory);

    // Trigger initial fetch if empty
    const presets = this._presetsController.value;
    if (!presets || Object.keys(presets).length === 0) {
      this.store.fetchNutrientPresets();
    }
    if (!this._inventoryController.value) {
      this.store.fetchNutrientInventory();
    }
  }

  static styles = [
    dialogStyles,
    css`
      .preset-item {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border-radius: 8px;
        margin-bottom: 8px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      }
      .preset-info {
        flex: 1;
      }
      .preset-name {
        font-weight: 500;
        font-size: 1rem;
      }
      .preset-details {
        font-size: 0.8rem;
        opacity: 0.7;
      }
      .preset-actions {
        display: flex;
        gap: 8px;
      }
      .empty-state {
        text-align: center;
        padding: 40px 20px;
        opacity: 0.6;
      }
      .nutrient-row {
        display: flex;
        gap: 12px;
        align-items: center;
        margin-bottom: 8px;
      }
      .nutrient-row md3-text-input {
        flex: 2;
      }
      .nutrient-row md3-number-input {
        flex: 1;
      }
      .error-bar {
        background: var(--error-color, #ff5252);
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        margin-bottom: 16px;
        font-size: 0.9rem;
      }
      .form-section {
        margin-bottom: 24px;
      }
      .form-section h3 {
        margin-top: 0;
        font-size: 0.9rem;
        text-transform: uppercase;
        opacity: 0.6;
        letter-spacing: 1px;
        margin-bottom: 12px;
      }
      .stage-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
    `,
  ];

  private _close() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private _startNew() {
    this._editingPreset = {
      name: '',
      nutrients: [{ name: '', dose_ml_l: 0 }],
      stage: '',
      min_days_in_stage: 0,
    };
    this._view = 'EDIT';
    this._error = null;
  }

  private _editPreset(preset: NutrientPreset) {
    this._editingPreset = { ...preset, nutrients: [...preset.nutrients.map((n) => ({ ...n }))] };
    this._view = 'EDIT';
    this._error = null;
  }

  private async _deletePreset(presetId: string) {
    if (!confirm('Are you sure you want to delete this preset?')) return;
    try {
      await this.store.dataService.removeNutrientPreset(presetId);
      await this.store.fetchNutrientPresets(true);
      this.dispatchEvent(new CustomEvent('data-changed', { bubbles: true, composed: true }));
    } catch (err: unknown) {
      this._error = err instanceof Error ? err.message : 'Failed to delete preset';
    }
  }

  private _addNutrient() {
    if (!this._editingPreset) return;
    const nutrients = [...(this._editingPreset.nutrients || []), { name: '', dose_ml_l: 0 }];
    this._editingPreset = { ...this._editingPreset, nutrients };
  }

  private _removeNutrient(index: number) {
    if (!this._editingPreset) return;
    const nutrients = [...(this._editingPreset.nutrients || [])];
    nutrients.splice(index, 1);
    this._editingPreset = { ...this._editingPreset, nutrients };
  }

  private _updateNutrient(index: number, updates: Partial<NutrientItem>) {
    if (!this._editingPreset) return;
    const nutrients = [...(this._editingPreset.nutrients || [])];
    // Convert dose_ml_l to number and handle NaN
    if ('dose_ml_l' in updates) {
      const dose = parseFloat(String(updates.dose_ml_l ?? '0'));
      updates.dose_ml_l = isNaN(dose) ? 0 : dose;
    }
    nutrients[index] = { ...nutrients[index], ...updates };
    this._editingPreset = { ...this._editingPreset, nutrients };
  }

  private async _savePreset() {
    if (!this._editingPreset || !this._editingPreset.name) {
      this._error = 'Preset name is required';
      return;
    }

    const nutrients = (this._editingPreset.nutrients || []).filter((n) => {
      const dose = parseFloat(String(n.dose_ml_l ?? '0'));
      return n.name && !isNaN(dose) && dose > 0;
    });
    if (nutrients.length === 0) {
      this._error = 'At least one valid nutrient is required';
      return;
    }

    try {
      await this.store.dataService.saveNutrientPreset({
        preset_id: this._editingPreset.id,
        name: this._editingPreset.name,
        nutrients,
        stage: this._editingPreset.stage || undefined,
        min_days_in_stage: this._editingPreset.min_days_in_stage || undefined,
      });
      await this.store.fetchNutrientPresets(true);
      this._view = 'LIST';
      this.dispatchEvent(new CustomEvent('data-changed', { bubbles: true, composed: true }));
    } catch (err: unknown) {
      this._error = err instanceof Error ? err.message : 'Failed to save preset';
    }
  }

  render() {
    if (!this.open && !this.embedded) return html``;

    const content = html`
      <div
        class="glass-dialog-container"
        style="${this.embedded ? 'background: none; border: none; padding: 0;' : ''}"
      >
        ${!this.embedded
        ? html`
              <div class="dialog-header">
                <div class="dialog-icon">
                  <ha-svg-icon .path=${mdiBottleTonicPlus}></ha-svg-icon>
                </div>
                <div class="dialog-title-group">
                  <h2 class="dialog-title">
                    ${this._view === 'LIST'
            ? 'Nutrient Presets'
            : this._editingPreset?.id
              ? 'Edit Preset'
              : 'New Preset'}
                  </h2>
                  <div class="dialog-subtitle">Manage your nutrient recipes</div>
                </div>
                <button class="md3-button text" @click=${this._close}>
                  <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
                </button>
              </div>
            `
        : nothing}

        <div
          class="dialog-content-grid"
          style="display: block; ${this.embedded ? 'padding: 0;' : ''}"
        >
          ${this._error ? html`<div class="error-bar">${this._error}</div>` : nothing}
          ${this._view === 'LIST' ? this._renderList() : this._renderEdit()}
        </div>

        <div class="button-group">
          ${this._view === 'LIST'
        ? html`
                ${!this.embedded
            ? html`<button class="md3-button tonal" @click=${this._close}>Close</button>`
            : nothing}
                <button class="md3-button primary" @click=${this._startNew}>
                  <ha-svg-icon .path=${mdiPlus} style="margin-right: 8px;"></ha-svg-icon>
                  Add Preset
                </button>
              `
        : html`
                <button class="md3-button tonal" @click=${() => (this._view = 'LIST')}>
                  Cancel
                </button>
                <button class="md3-button primary" @click=${this._savePreset}>
                  <ha-svg-icon .path=${mdiContentSave} style="margin-right: 8px;"></ha-svg-icon>
                  Save Preset
                </button>
              `}
        </div>
      </div>
    `;

    if (this.embedded) {
      return content;
    }

    return html`
      <ha-dialog open @closed=${this._close} hideActions .heading=${'Nutrient Presets'}>
        ${content}
      </ha-dialog>
    `;
  }

  private _renderList() {
    if (!this._presetsController) {
      return html`
        <div class="empty-state">
          <ha-circular-progress active></ha-circular-progress>
          <p>Loading presets...</p>
        </div>
      `;
    }
    const presets = this._presetsController.value;
    const presetEntries = Object.values(presets || {});
    if (presetEntries.length === 0) {
      return html`
        <div class="empty-state">
          <ha-svg-icon
            .path=${mdiInformation}
            style="--mdc-icon-size: 48px; opacity: 0.5; margin-bottom: 16px;"
          ></ha-svg-icon>
          <p>No nutrient presets defined yet.</p>
          <p style="font-size: 0.9rem;">
            Presets allow you to quickly apply recurring nutrient recipes while watering.
          </p>
        </div>
      `;
    }

    return html`
      <div class="presets-list">
        ${presetEntries.map(
      (preset) => html`
            <div class="preset-item">
              <div class="preset-info">
                <div class="preset-name">${preset.name}</div>
                <div class="preset-details">
                  ${(preset.nutrients || []).length} nutrients
                  ${preset.stage
          ? html`• <span style="text-transform: capitalize;">${preset.stage}</span>`
          : ''}
                  ${preset.min_days_in_stage ? html`• Day ${preset.min_days_in_stage}+` : ''}
                </div>
              </div>
              <div class="preset-actions">
                <button
                  class="md3-button icon"
                  @click=${() => this._editPreset(preset)}
                  title="Edit"
                >
                  <ha-svg-icon .path=${mdiPencil}></ha-svg-icon>
                </button>
                <button
                  class="md3-button icon"
                  @click=${() => this._deletePreset(preset.id)}
                  title="Delete"
                  style="color: var(--error-color);"
                >
                  <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
                </button>
              </div>
            </div>
          `
    )}
      </div>
    `;
  }

  private _renderEdit() {
    if (!this._editingPreset) return nothing;

    return html`
      <div class="preset-form">
        <div class="form-section">
          <h3>General Info</h3>
          <md3-text-input
            label="Preset Name"
            .value=${this._editingPreset.name || ''}
            @change=${(e: CustomEvent) => {
        this._editingPreset = { ...this._editingPreset!, name: e.detail };
      }}
            placeholder="e.g. Veg Week 1"
          ></md3-text-input>
        </div>

        <div class="form-section">
          <h3>Recommend for Stage</h3>
          <div class="stage-grid">
            <div class="md3-input-group">
              <label class="md3-label">Growth Stage</label>
              <select
                class="md3-input"
                .value=${this._editingPreset.stage || ''}
                @change=${(e: Event) => {
        this._editingPreset = {
          ...this._editingPreset!,
          stage: (e.target as HTMLSelectElement).value,
        };
      }}
              >
                <option value="">Any Stage</option>
                <option value="seedling">Seedling</option>
                <option value="veg">Veg</option>
                <option value="flower">Flower</option>
                <option value="dry">Dry</option>
                <option value="cure">Cure</option>
              </select>
            </div>
            <div class="md3-input-group">
              <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;font-size:0.875rem;color:var(--secondary-text-color);">
                <span>Min Days in Stage</span>
                <gs-help-tooltip
                  content="Only suggest this preset after a plant has been in the selected growth stage for at least this many days. Use 0 to show the preset from the first day of the stage."
                  placement="right"
                  label="Min Days in Stage"
                ></gs-help-tooltip>
              </div>
            </div>
            <md3-number-input
              label="Min Days in Stage"
              .value=${this._editingPreset.min_days_in_stage || 0}
              @change=${(e: CustomEvent) => {
        this._editingPreset = {
          ...this._editingPreset!,
          min_days_in_stage: parseInt(e.detail),
        };
      }}
              min="0"
            ></md3-number-input>
          </div>
        </div>

        <div class="form-section">
          <div
            style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;"
          >
            <div style="display:flex;align-items:center;gap:4px;margin:0;">
              <h3 style="margin: 0;">Nutrient Items</h3>
              <gs-help-tooltip
                content="Add each nutrient product and the dose in ml per litre of water. The watering dialog multiplies these doses by the water volume to give you exact amounts to add."
                placement="right"
                label="Nutrient Items"
              ></gs-help-tooltip>
            </div>
            <button
              class="md3-button text"
              @click=${this._addNutrient}
              style="--mdc-button-horizontal-padding: 8px;"
            >
              <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
              Add
            </button>
          </div>

          ${this._editingPreset.nutrients?.map(
        (n, i) => html`
              <div class="nutrient-row">
                <md3-text-input
                  label="Nutrient Name"
                  .value=${n.name}
                  .suggestions=${this._getNutrientSuggestions()}
                  @change=${(e: CustomEvent) => this._updateNutrient(i, { name: e.detail })}
                  placeholder="e.g. CalMag"
                ></md3-text-input>
                <md3-number-input
                  label="ml/L"
                  .value=${n.dose_ml_l}
                  @change=${(e: CustomEvent) =>
            this._updateNutrient(i, { dose_ml_l: parseFloat(e.detail) })}
                  min="0"
                  step="0.1"
                ></md3-number-input>
                <button
                  class="md3-button icon"
                  @click=${() => this._removeNutrient(i)}
                  style="color: var(--error-color);"
                >
                  <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
                </button>
              </div>
            `
      )}
        </div>
      </div>
    `;
  }

  private _getNutrientSuggestions(): string[] {
    const nutrients = new Set<string>();

    // Add nutrients from presets
    const presets = this._presetsController?.value;
    if (presets) {
      Object.values(presets).forEach((preset) => {
        if (preset.nutrients) {
          preset.nutrients.forEach((n) => {
            if (n.name) nutrients.add(n.name);
          });
        }
      });
    }

    // Add nutrients from inventory
    const inventory = this._inventoryController?.value;
    if (inventory && inventory.stocks) {
      Object.values(inventory.stocks).forEach((stock) => {
        if (stock.name) nutrients.add(stock.name);
      });
    }

    return Array.from(nutrients).sort();
  }
}
