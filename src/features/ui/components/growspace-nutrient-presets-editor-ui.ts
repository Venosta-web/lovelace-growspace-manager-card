import { LitElement, html, css, nothing, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  mdiPlus,
  mdiDelete,
  mdiPencil,
  mdiBottleTonicPlus,
  mdiContentSave,
  mdiInformation,
} from '@mdi/js';
import { NutrientPreset, NutrientItem } from '../../../types';
import { dialogStyles } from '../../../styles/dialog.styles';
import '../../shared/ui'; // Registers gs-dialog and MD3 components

@customElement('growspace-nutrient-presets-editor-ui')
export class GrowspaceNutrientPresetsEditorUI extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ attribute: false }) presets: Record<string, NutrientPreset> = {};
  @property({ attribute: false }) growspaceId?: string;
  @property({ type: Boolean }) isSubmitting = false;
  @property({ attribute: false }) error: string | null = null;

  @state() private _view: 'LIST' | 'EDIT' = 'LIST';
  @state() private _editingPreset: Partial<NutrientPreset> | null = null;

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
    `,
  ];

  updated(changedProps: PropertyValues) {
    if (changedProps.has('open') && this.open) {
      if (!this._editingPreset) {
        this._view = 'LIST';
      }
    }
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private _handleSave() {
    if (!this._editingPreset) return;
    this.dispatchEvent(
      new CustomEvent('save-preset', {
        detail: this._editingPreset,
      })
    );
  }

  private _handleDelete(presetId: string) {
    this.dispatchEvent(
      new CustomEvent('delete-preset', {
        detail: { presetId },
      })
    );
  }

  private _startNew() {
    this._editingPreset = {
      name: '',
      nutrients: [{ name: '', dose_ml_l: 0 }],
    };
    this._view = 'EDIT';
  }

  private _editPreset(preset: NutrientPreset) {
    this._editingPreset = JSON.parse(JSON.stringify(preset));
    this._view = 'EDIT';
  }

  private _addNutrient() {
    if (!this._editingPreset) return;
    const nutrients = [
      ...(this._editingPreset.nutrients || []),
      { name: '', dose_ml_l: 0 },
    ];
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
    nutrients[index] = { ...nutrients[index], ...updates };
    this._editingPreset = { ...this._editingPreset, nutrients };
  }

  render() {
    if (!this.open) return nothing;

    const title = this._view === 'LIST' ? 'Nutrient Presets' :
      (this._editingPreset?.id ? 'Edit Preset' : 'New Preset');
    const subtitle = this._view === 'LIST' ? 'Manage your nutrient recipes' : 'Configure products and dosages';

    return html`
      <gs-dialog
        .open=${true}
        .heading=${title}
        .subtitle=${subtitle}
        .iconPath=${mdiBottleTonicPlus}
        stageColor="var(--primary-color, #4caf50)"
        .submitting=${this.isSubmitting}
      >
        <div class="dialog-content-grid">
          ${this.error ? html`<div class="error-bar">${this.error}</div>` : nothing}
          ${this._view === 'LIST' ? this._renderList() : this._renderEdit()}
        </div>

        <div class="button-group">
          ${this._renderFooterButtons()}
        </div>
      </gs-dialog>
    `;
  }

  private _renderFooterButtons() {
    if (this._view === 'LIST') {
      return html`
        <button class="md3-button tonal" @click=${this._close}>Close</button>
        <button class="md3-button primary" @click=${this._startNew}>
          <ha-svg-icon .path=${mdiPlus} style="margin-right: 8px;"></ha-svg-icon>
          Add Preset
        </button>
      `;
    } else {
      return html`
        <button class="md3-button tonal" @click=${() => (this._view = 'LIST')}>Cancel</button>
        <button class="md3-button primary" @click=${this._handleSave} ?disabled=${this.isSubmitting}>
          <ha-svg-icon .path=${mdiContentSave} style="margin-right: 8px;"></ha-svg-icon>
          ${this.isSubmitting ? 'Saving...' : 'Save Preset'}
        </button>
      `;
    }
  }

  private _renderList() {
    const presetEntries = Object.values(this.presets || {});
    if (presetEntries.length === 0) {
      return html`
        <div class="empty-state">
          <ha-svg-icon .path=${mdiInformation} style="--mdc-icon-size: 48px; opacity: 0.5; margin-bottom: 16px;"></ha-svg-icon>
          <p>No nutrient presets defined yet.</p>
        </div>
      `;
    }

    return html`
      <div class="presets-list">
        ${presetEntries.map(preset => html`
          <div class="preset-item">
            <div class="preset-info">
              <div class="preset-name">${preset.name}</div>
              <div class="preset-details">${preset.nutrients.length} nutrients</div>
            </div>
            <div class="preset-actions">
              <button class="md3-button icon" @click=${() => this._editPreset(preset)} title="Edit">
                <ha-svg-icon .path=${mdiPencil}></ha-svg-icon>
              </button>
              <button class="md3-button icon" @click=${() => this._handleDelete(preset.id)} title="Delete" style="color: var(--error-color);">
                <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
              </button>
            </div>
          </div>
        `)}
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
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="margin: 0;">Nutrients</h3>
            <button class="md3-button text" @click=${this._addNutrient} style="--mdc-button-horizontal-padding: 8px;">
              <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
              Add
            </button>
          </div>

          ${(this._editingPreset.nutrients || []).map((item, index) => html`
            <div class="nutrient-row">
              <md3-text-input
                label="Product"
                .value=${item.name}
                @change=${(e: CustomEvent) => this._updateNutrient(index, { name: e.detail })}
                placeholder="Product Name"
              ></md3-text-input>
              <md3-number-input
                label="Dose (ml/L)"
                .value=${item.dose_ml_l}
                @change=${(e: CustomEvent) => this._updateNutrient(index, { dose_ml_l: parseFloat(e.detail) })}
                min="0"
                step="0.1"
              ></md3-number-input>
              <button class="md3-button icon" @click=${() => this._removeNutrient(index)} style="color: var(--error-color);">
                <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
              </button>
            </div>
          `)}
        </div>
      </div>
    `;
  }
}
