import { LitElement, html, css, nothing, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import {
  mdiClose,
  mdiBug,
  mdiPlus,
  mdiPencil,
  mdiDelete,
  mdiContentSave,
  mdiInformation,
  mdiCheck,
} from '@mdi/js';
import { consume } from '@lit/context';
import { hassContext, storeContext } from '../../context';
import { IPMPreset, IPMItem, IPMType } from '../../types';
import { dialogStyles } from '../../styles/dialog.styles';
import { GrowspaceStore } from '../../store/core/growspace-store';
import { StoreController } from '@nanostores/lit';
import '../../components/ui'; // Ensure MD3 components are registered

@customElement('ipm-dialog')
export class IPMDialog extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  public hass!: HomeAssistant;

  @consume({ context: storeContext, subscribe: true })
  @property({ attribute: false })
  public store!: GrowspaceStore;

  @property({ type: Boolean }) open = false;
  @property({ attribute: false }) growspaceId: string | undefined = undefined;
  @property({ attribute: false }) plantIds: string[] = [];

  @state() private _view: 'APPLY' | 'LIST' | 'EDIT' = 'APPLY';
  @state() private _selectedPresetId: string | null = null;
  @state() private _notes: string = '';

  // Edit mode state
  @state() private _editingPreset: Partial<IPMPreset> | null = null;
  @state() private _error: string | null = null;

  private _presetsController!: StoreController<Record<string, IPMPreset>>;

  private _initControllers() {
    if (this.store && !this._presetsController) {
      this._presetsController = new StoreController(this, this.store.data.$ipmPresets);
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._initControllers();
  }

  willUpdate(changedProps: PropertyValues) {
    if (changedProps.has('store')) {
      this._initControllers();
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
    `,
  ];

  updated(changedProps: PropertyValues) {
    if (changedProps.has('open') && this.open) {
      if (!this._editingPreset) {
        this._view = 'APPLY';
        this._selectedPresetId = null;
        this._notes = '';
        this._error = null;
      }
    }
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  // --- APPLY VIEW LOGIC ---

  private async _apply() {
    if (!this._selectedPresetId) return;

    // Validate: at least one of growspaceId or plantIds must be provided
    const hasPlants = this.plantIds && this.plantIds.length > 0;
    const hasGrowspace = !!this.growspaceId;

    if (!hasPlants && !hasGrowspace) {
      this._error =
        'Cannot apply IPM: no growspace or plants selected. Please close and try again.';
      console.error('[IPMDialog] Neither growspaceId nor plantIds provided');
      return;
    }

    try {
      await this.store.applyIPM({
        preset_id: this._selectedPresetId,
        growspace_id: !hasPlants ? this.growspaceId : undefined,
        plant_ids: hasPlants ? this.plantIds : undefined,
        notes: this._notes,
      });
      this.dispatchEvent(new CustomEvent('data-changed'));
      this._close();
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : undefined;
      console.error('Failed to apply IPM', e);
      this._error = error || 'Failed to apply treatment';
    }
  }

  // --- EDIT VIEW LOGIC ---

  private _startNew() {
    this._editingPreset = {
      name: '',
      type: 'foliar',
      items: [{ name: '', dose_amount: 0, dose_unit: 'ml/L', phi_days: 0 }],
      stage: undefined,
      min_days_in_stage: 0,
    };
    this._view = 'EDIT';
    this._error = null;
  }

  private _editPreset(preset: IPMPreset) {
    this._editingPreset = JSON.parse(JSON.stringify(preset));
    this._view = 'EDIT';
    this._error = null;
  }

  private async _deletePreset(presetId: string) {
    if (!confirm('Are you sure you want to delete this preset?')) return;
    try {
      await this.store.dataService.removeIPMPreset(presetId);
      await this.store.fetchIPMPresets(true);
    } catch (err: unknown) {
      this._error = err instanceof Error ? err.message : 'Unknown error';
    }
  }

  private _addProduct() {
    if (!this._editingPreset) return;
    const items = [
      ...(this._editingPreset.items || []),
      { name: '', dose_amount: 0, dose_unit: 'ml/L', phi_days: 0 },
    ];
    this._editingPreset = { ...this._editingPreset, items };
  }

  private _removeProduct(index: number) {
    if (!this._editingPreset) return;
    const items = [...(this._editingPreset.items || [])];
    items.splice(index, 1);
    this._editingPreset = { ...this._editingPreset, items };
  }

  private _updateProduct(index: number, updates: Partial<IPMItem>) {
    if (!this._editingPreset) return;
    const items = [...(this._editingPreset.items || [])];
    items[index] = { ...items[index], ...updates };
    this._editingPreset = { ...this._editingPreset, items };
  }

  private async _savePreset() {
    if (!this._editingPreset || !this._editingPreset.name) {
      this._error = 'Preset name is required';
      return;
    }

    const items = (this._editingPreset.items || []).filter((i) => i.name);

    try {
      await this.store.dataService.saveIPMPreset({
        preset_id: this._editingPreset.id,
        name: this._editingPreset.name,
        type: this._editingPreset.type || 'foliar',
        items: items as IPMItem[],
        stage: this._editingPreset.stage || undefined,
        min_days_in_stage: this._editingPreset.min_days_in_stage || 0,
      });
      await this.store.fetchIPMPresets(true);
      this._view = 'LIST';
    } catch (err: unknown) {
      this._error = err instanceof Error ? err.message : 'Unknown error';
    }
  }

  render() {
    if (!this.open) return nothing;

    let title = 'Integrated Pest Management';
    let subtitle = 'Manage pests and pathogens';
    if (this._view === 'LIST') {
      title = 'Manage Presets';
      subtitle = 'Configure IPM recipes';
    } else if (this._view === 'EDIT') {
      title = this._editingPreset?.id ? 'Edit Preset' : 'New Preset';
      subtitle = 'Define treatment details';
    }

    return html`
      <ha-dialog open @closed=${this._close} hideActions .heading=${title}>
        <div class="glass-dialog-container">
          <div class="dialog-header">
            <div class="dialog-icon" style="color: var(--warning-color, #ff9800);">
              <ha-svg-icon .path=${mdiBug}></ha-svg-icon>
            </div>
            <div class="dialog-title-group">
              <div style="display:flex;align-items:center;gap:6px;">
                <h2 class="dialog-title">${title}</h2>
                <gs-help-tooltip
                  content="Integrated Pest Management — log pest/disease treatments, track application dates and products used."
                  placement="bottom"
                  label="IPM"
                ></gs-help-tooltip>
              </div>
              <div class="dialog-subtitle">${subtitle}</div>
            </div>
            <button class="md3-button text" @click=${this._close}>
              <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
            </button>
          </div>

          <div class="dialog-content-grid">
            ${this._error ? html`<div class="error-bar">${this._error}</div>` : nothing}
            ${!this._presetsController
        ? html`<div class="loading-container" style="display:flex;justify-content:center;padding:40px;"><ha-circular-progress active></ha-circular-progress></div>`
        : this._view === 'APPLY'
          ? this._renderApply()
          : this._view === 'LIST'
            ? this._renderList()
            : this._renderEdit()}
          </div>

          <div class="button-group">${this._renderFooterButtons()}</div>
        </div>
      </ha-dialog>
    `;
  }

  private _renderFooterButtons() {
    if (this._view === 'APPLY') {
      return html`
        <button class="md3-button tonal" @click=${() => (this._view = 'LIST')}>
          Manage Presets
        </button>
        <button
          class="md3-button primary"
          ?disabled=${!this._selectedPresetId}
          @click=${this._apply}
        >
          <ha-svg-icon .path=${mdiCheck} style="margin-right: 8px;"></ha-svg-icon>
          Apply Treatment
        </button>
      `;
    } else if (this._view === 'LIST') {
      return html`
        <button class="md3-button tonal" @click=${() => (this._view = 'APPLY')}>
          Back to Apply
        </button>
        <button class="md3-button primary" @click=${this._startNew}>
          <ha-svg-icon .path=${mdiPlus} style="margin-right: 8px;"></ha-svg-icon>
          Add Preset
        </button>
      `;
    } else {
      return html`
        <button class="md3-button tonal" @click=${() => (this._view = 'LIST')}>Cancel</button>
        <button class="md3-button primary" @click=${this._savePreset}>
          <ha-svg-icon .path=${mdiContentSave} style="margin-right: 8px;"></ha-svg-icon>
          Save Preset
        </button>
      `;
    }
  }

  private _renderApply() {
    const presets = this._presetsController?.value;
    const presetList = Object.values(presets || {});
    const targetText =
      this.plantIds && this.plantIds.length > 0
        ? `${this.plantIds.length} Plants`
        : `Entire Growspace`;

    return html`
      <div class="form-section">
        <h3>Treatment Selection</h3>
        <md3-select
          label="Select Preset"
          .value=${this._selectedPresetId || ''}
          .options=${presetList.map((preset: IPMPreset) => ({
      label: `${preset.name} (${preset.type})`,
      value: preset.id,
    }))}
          @change=${(e: CustomEvent) => (this._selectedPresetId = e.detail)}
        ></md3-select>

        <div class="apply-summary">Targeting: <span class="apply-target">${targetText}</span></div>
      </div>

      <div class="form-section">
        <h3>Notes</h3>
        <ha-textarea
          label="Treatment Notes (Optional)"
          .value=${this._notes}
          @input=${(e: InputEvent) => (this._notes = (e.target as HTMLTextAreaElement).value)}
          rows="3"
          style="width: 100%;"
        ></ha-textarea>
      </div>
    `;
  }

  private _renderList() {
    const presets = this._presetsController?.value;
    const presetEntries = Object.values(presets || {});
    if (presetEntries.length === 0) {
      return html`
        <div class="empty-state">
          <ha-svg-icon
            .path=${mdiInformation}
            style="--mdc-icon-size: 48px; opacity: 0.5; margin-bottom: 16px;"
          ></ha-svg-icon>
          <p>No IPM presets defined yet.</p>
          <p style="font-size: 0.9rem;">
            Create presets for common treatments (e.g. "Weekly Foliar", "Root Drench").
          </p>
        </div>
      `;
    }

    return html`
      <div class="presets-list">
        ${presetEntries.map(
      (preset: IPMPreset) => html`
            <div class="preset-item">
              <div class="preset-info">
                <div class="preset-name">${preset.name}</div>
                <div class="preset-details">
                  ${preset.type} • ${preset.items.length} products
                  ${preset.stage ? ` • ${preset.stage}` : ''}
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
            placeholder="e.g. Neem Oil Spray"
          ></md3-text-input>

          <div style="margin-top: 12px;">
            <label class="md3-label">Type</label>
            <select
              class="md3-input"
              .value=${this._editingPreset.type || 'foliar'}
              @change=${(e: Event) =>
      (this._editingPreset = {
        ...this._editingPreset!,
        type: (e.target as HTMLSelectElement).value as IPMType,
      })}
            >
              <option value="foliar">Foliar Spray</option>
              <option value="drench">Root Drench</option>
              <option value="beneficials">Beneficials</option>
            </select>
          </div>
        </div>

        <div class="form-section">
          <h3>Usage</h3>
          <div class="row-col-grid">
            <div class="md3-input-group">
              <label class="md3-label">Recommended Stage</label>
              <select
                class="md3-input"
                .value=${this._editingPreset.stage || ''}
                @change=${(e: Event) => {
        this._editingPreset = {
          ...this._editingPreset!,
          stage: (e.target as HTMLSelectElement).value || undefined,
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
            <md3-number-input
              label="Min Days"
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
            <h3 style="margin: 0;">Products / Ingredients</h3>
            <button
              class="md3-button text"
              @click=${this._addProduct}
              style="--mdc-button-horizontal-padding: 8px;"
            >
              <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
              Add
            </button>
          </div>

          ${(this._editingPreset.items || []).map(
        (item: IPMItem, _index: number) => html`
              <div class="product-row">
                <md3-text-input
                  label="Product"
                  .value=${item.name}
                  @change=${(e: CustomEvent) => this._updateProduct(_index, { name: e.detail })}
                  placeholder="e.g. Neem Oil"
                ></md3-text-input>
                <md3-number-input
                  label="Dose"
                  .value=${item.dose_amount}
                  @change=${(e: CustomEvent) =>
            this._updateProduct(_index, { dose_amount: parseFloat(e.detail) })}
                  min="0"
                  step="0.1"
                ></md3-number-input>
                <md3-text-input
                  label="Unit"
                  .value=${item.dose_unit}
                  @change=${(e: CustomEvent) =>
            this._updateProduct(_index, { dose_unit: e.detail })}
                  style="flex: 1;"
                ></md3-text-input>
                <md3-number-input
                  label="PHI (Days)"
                  .value=${item.phi_days || 0}
                  @change=${(e: CustomEvent) =>
            this._updateProduct(_index, { phi_days: parseInt(e.detail) || 0 })}
                  min="0"
                  style="flex: 1;"
                ></md3-number-input>
                <button
                  class="md3-button icon"
                  @click=${() => this._removeProduct(_index)}
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
}
