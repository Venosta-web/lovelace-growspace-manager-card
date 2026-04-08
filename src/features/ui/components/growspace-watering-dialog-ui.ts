import { LitElement, html, css, nothing, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { mdiWaterPlus, mdiClose, mdiPlus, mdiDelete, mdiCheck, mdiInformation } from '@mdi/js';
import { NutrientEntry } from '../../../types';
import { dialogStyles } from '../../../styles/dialog.styles';
import '../../../components/ui'; // Ensure MD3 components are registered

@customElement('growspace-watering-dialog-ui')
export class GrowspaceWateringDialogUI extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ type: String }) growspaceName = '';
  @property({ type: String }) targetText = '';
  @property({ attribute: false }) presetOptions: { label: string; value: string }[] = [];
  @property({ attribute: false }) nutrientSuggestions: string[] = [];
  @property({ type: Boolean }) isSubmitting = false;
  @property({ type: Boolean }) hasPhiWarning = false;
  @property({ type: String }) phiWarningText = '';

  @state() private _volume = 1.0;
  @state() private _nutrients: NutrientEntry[] = [];
  @state() private _selectedPresetId = '';

  static styles = [
    dialogStyles,
    css`
      .product-row {
        display: flex;
        gap: 12px;
        align-items: center;
        margin-bottom: 8px;
      }
      .product-row md3-text-input {
        flex: 2;
      }
      .product-row md3-number-input {
        flex: 1;
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
      .apply-summary {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        padding: 16px;
        border-radius: 8px;
        margin-top: 16px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      }
      .apply-target {
        font-weight: 500;
        color: var(--primary-color, #4caf50);
      }
      .calculation-preview {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 16px;
      }
      .calculation-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      .calculation-row:last-child {
        border-bottom: none;
        font-weight: 600;
      }
      .calculation-label {
        color: var(--secondary-text-color);
      }
      .calculation-value {
        color: var(--primary-text-color);
      }
      .error-bar {
        background: rgba(255, 152, 0, 0.2);
        color: #ff9800;
        border: 1px solid #ff9800;
        padding: 8px 16px;
        border-radius: 4px;
        margin-bottom: 16px;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
      }
    `,
  ];

  updated(changedProps: PropertyValues) {
    if (changedProps.has('open') && this.open) {
      this._resetForm();
    }
  }

  private _resetForm() {
    this._volume = 1.0;
    this._nutrients = [];
    this._selectedPresetId = '';
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private _handlePresetChange(e: CustomEvent) {
    const presetId = e.detail;
    this._selectedPresetId = presetId;
    this.dispatchEvent(new CustomEvent('preset-changed', { detail: presetId }));
  }

  // Allow container to set nutrients when preset changes
  public setNutrients(nutrients: NutrientEntry[]) {
    this._nutrients = [...nutrients];
  }

  private _addNutrient() {
    this._nutrients = [...this._nutrients, { name: '', concentration: 0 }];
  }

  private _updateNutrient(index: number, field: keyof NutrientEntry, value: string | number) {
    const updated = [...this._nutrients];
    updated[index] = { ...updated[index], [field]: value };
    this._nutrients = updated;
  }

  private _removeNutrient(index: number) {
    this._nutrients = this._nutrients.filter((_, i) => i !== index);
  }

  private _calculateTotalMl(concentration: number): number {
    return this._volume * concentration;
  }

  private _getTotalNutrientsMl(): number {
    return this._nutrients.reduce((sum, n) => sum + this._calculateTotalMl(n.concentration), 0);
  }

  private _handleSubmit() {
    this.dispatchEvent(
      new CustomEvent('submit-watering', {
        detail: {
          volume: this._volume,
          nutrients: this._nutrients,
          presetId: this._selectedPresetId,
        },
      })
    );
  }

  render() {
    if (!this.open) return nothing;

    const dialogColor = '#2196F3';

    return html`
      <ha-dialog open @closed=${this._close} hideActions width="full">
        <div class="glass-dialog-container">
          <div class="dialog-header">
            <div class="dialog-icon">
              <ha-svg-icon .path=${mdiWaterPlus}></ha-svg-icon>
            </div>
            <div class="dialog-title-group">
              <div style="display:flex;align-items:center;gap:6px;">
                <h2 class="dialog-title">Record Watering</h2>
                <gs-help-tooltip
                  content=\"Log a watering event — record volume, EC, pH, and runoff data for one or more plants. Select one or more target plants below.\"
                  placement=\"bottom\"
                  label=\"Record Watering\"
                ></gs-help-tooltip>
              </div>
              <div class="dialog-subtitle">${this.growspaceName}</div>
            </div>
            <button class="md3-button text" @click=${this._close}>
              <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
            </button>
          </div>

          <div class="dialog-content-grid">
            ${this.hasPhiWarning
              ? html`
                  <div class=\"error-bar\">
                    <ha-svg-icon .path=${mdiInformation} style=\"margin-right: 8px;\"></ha-svg-icon>
                    ${this.phiWarningText}
                  </div>
                `
              : nothing}

            <div class="form-section">
              <h3>Watering Settings</h3>
              <md3-number-input
                label="Volume (Liters)"
                .value=${this._volume}
                .min=${0.1}
                .step=${0.1}
                @change=${(e: CustomEvent) => (this._volume = parseFloat(e.detail) || 0)}
              ></md3-number-input>

              <div style="margin-top: 12px;">
                <md3-select
                  label="Nutrient Preset"
                  .value=${this._selectedPresetId || ''}
                  .options=${this.presetOptions}
                  @change=${this._handlePresetChange}
                ></md3-select>
              </div>

              <div class="apply-summary">
                Targeting: <span class="apply-target">${this.targetText}</span>
              </div>
            </div>

            <div class="form-section">
              <div
                style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;"
              >
                <h3 style="margin: 0;">Nutrients</h3>
                <button class="md3-button text" @click=${this._addNutrient}>
                  <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
                  Add
                </button>
              </div>

              ${this._nutrients.length === 0
                ? html`
                    <div style="text-align: center; opacity: 0.6; padding: 20px;">
                      <ha-svg-icon .path=${mdiInformation}></ha-svg-icon>
                      <div>No nutrients added</div>
                    </div>
                  `
                : nothing}
              ${this._nutrients.map(
                (nutrient, index) => html`
                  <div class="product-row">
                    <md3-text-input
                      label="Nutrient Name"
                      .value=${nutrient.name}
                      .suggestions=${this.nutrientSuggestions}
                      @change=${(e: CustomEvent) =>
                        this._updateNutrient(
                          index,
                          'name',
                          (e.target as HTMLInputElement).value || e.detail
                        )}
                      placeholder="e.g. CalMag"
                    ></md3-text-input>
                    <md3-number-input
                      label="ml/L"
                      .value=${nutrient.concentration}
                      min="0"
                      step="0.1"
                      @change=${(e: CustomEvent) =>
                        this._updateNutrient(index, 'concentration', parseFloat(e.detail) || 0)}
                    ></md3-number-input>
                    <button
                      class="md3-button icon"
                      @click=${() => this._removeNutrient(index)}
                      style="color: var(--error-color);"
                    >
                      <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
                    </button>
                  </div>
                `
              )}
            </div>

            ${this._nutrients.length > 0
              ? html`
                  <div class="form-section">
                    <h3>Summary</h3>
                    <div class="calculation-preview">
                      ${this._nutrients
                        .filter((n) => n.name && n.concentration > 0)
                        .map(
                          (nutrient) => html`
                            <div class="calculation-row">
                              <span class="calculation-label">${nutrient.name}</span>
                              <span class="calculation-value">
                                ${this._volume}L × ${nutrient.concentration} ml/L =
                                <strong>
                                  ${this._calculateTotalMl(nutrient.concentration).toFixed(1)} ml
                                </strong>
                              </span>
                            </div>
                          `
                        )}
                      <div class="calculation-row">
                        <span class="calculation-label">Total Nutrients</span>
                        <span class="calculation-value">
                          <strong>${this._getTotalNutrientsMl().toFixed(1)} ml</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                `
              : nothing}
          </div>

          <div class="button-group">
            <button class="md3-button tonal" @click=${this._close} ?disabled=${this.isSubmitting}>
              Cancel
            </button>
            <button
              class="md3-button primary"
              style="background-color: ${dialogColor}; --mdc-theme-primary: ${dialogColor};"
              @click=${this._handleSubmit}
              ?disabled=${this.isSubmitting || this._volume <= 0}
            >
              <ha-svg-icon .path=${mdiCheck} style="margin-right: 8px;"></ha-svg-icon>
              ${this.isSubmitting ? 'Recording...' : 'Record Watering'}
            </button>
          </div>
        </div>
      </ha-dialog>
    `;
  }
}
