import { LitElement, html, css, PropertyValues, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { consume } from '@lit/context';
import { hassContext, storeContext } from '../context';
import { mdiWaterPlus, mdiClose, mdiPlus, mdiDelete, mdiCheck, mdiInformation } from '@mdi/js';
import { WateringDialogState, NutrientEntry, NutrientPreset, NutrientItem } from '../types';
import { DataService } from '../data-service';
import { dialogStyles } from '../styles/dialog.styles';
import { StoreController } from '@nanostores/lit';
import '../components/ui'; // Ensure MD3 components are registered
import type { GrowspaceStore } from '../store/growspace-store';

@customElement('watering-dialog')
export class WateringDialog extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  public hass!: HomeAssistant;

  @consume({ context: storeContext, subscribe: true })
  public store!: GrowspaceStore;

  @property({ type: Boolean }) public open = false;
  @property({ attribute: false }) public dialogState: WateringDialogState | undefined;
  @property({ type: String }) public growspaceName = '';

  // Form state
  @state() private _volume = 1.0; // Liters
  @state() private _nutrients: NutrientEntry[] = [];
  @state() private _selectedPresetId = '';
  @state() private _isSubmitting = false;

  private _presetsController!: StoreController<Record<string, NutrientPreset>>;
  private _inventoryController!: StoreController<import('../types').NutrientInventory | null>;

  connectedCallback() {
    super.connectedCallback();
    if (this.store) {
      this._presetsController = new StoreController(this, this.store.data.$nutrientPresets);
      this._inventoryController = new StoreController(this, this.store.data.$nutrientInventory);
    }
  }

  private _dataService?: DataService;

  static styles = [
    dialogStyles,
    css`
      :host {
        --mdc-dialog-min-width: clamp(350px, 500px, 90vw);
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
        background: var(--secondary-background-color, rgba(255,255,255,0.05));
        padding: 16px;
        border-radius: 8px;
        margin-top: 16px;
        border: 1px solid var(--divider-color, rgba(255,255,255,0.1));
      }
      .apply-target {
        font-weight: 500;
        color: var(--primary-color, #4caf50);
      }
      
      /* Specific Watering Dialog customizations */
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
    `,
  ];

  protected willUpdate(changedProps: PropertyValues): void {
    if (changedProps.has('open') && this.open) {
      this._resetForm();
    }
    if (this.hass && (changedProps.has('hass') || !this._dataService)) {
      this._dataService = new DataService(this.hass);
    }
  }

  private _resetForm() {
    this._volume = 1.0;
    this._nutrients = [];
    this._selectedPresetId = '';
    this._isSubmitting = false;
  }

  private _addNutrient(name = '', concentration = 0) {
    this._nutrients = [...this._nutrients, { name, concentration }];
  }

  private _updateNutrient(index: number, field: keyof NutrientEntry, value: string | number) {
    const updated = [...this._nutrients];
    updated[index] = { ...updated[index], [field]: value };
    this._nutrients = updated;
  }

  private _removeNutrient(index: number) {
    this._nutrients = this._nutrients.filter((_, i) => i !== index);
    // If we manually remove a nutrient, we might be diverging from the preset
    // but let's keep the presetId for the service call unless the user explicitly changes the preset selector
  }

  private _handlePresetChange(e: CustomEvent | Event) {
    const presetId = (e as CustomEvent).detail !== undefined ? (e as CustomEvent).detail : (e?.target as any)?.value || '';
    this._selectedPresetId = presetId;

    if (!presetId) {
      this._nutrients = [];
      return;
    }

    const presets = this._presetsController.value;

    if (presets && presets[presetId]) {
      const preset = presets[presetId];
      this._nutrients = preset.nutrients.map(n => ({
        name: n.name,
        concentration: n.dose_ml_l
      }));
    }
  }

  private _calculateTotalMl(concentration: number): number {
    return this._volume * concentration;
  }

  private _getTotalNutrientsMl(): number {
    return this._nutrients.reduce((sum, n) => sum + this._calculateTotalMl(n.concentration), 0);
  }

  private async _submit() {
    if (!this._dataService || !this.dialogState) return;

    this._isSubmitting = true;

    try {
      // Convert nutrients array to record
      const nutrientsRecord: Record<string, number> = {};
      for (const n of this._nutrients) {
        if (n.name && n.concentration > 0) {
          nutrientsRecord[n.name] = n.concentration;
        }
      }

      if (this.dialogState.mode === 'plant' && this.dialogState.plantIds?.length) {
        // Water individual plants - divide total volume by number of plants
        const amountPerPlant = this._volume / this.dialogState.plantIds.length;
        for (const plantId of this.dialogState.plantIds) {
          await this.store.waterPlant(
            plantId,
            amountPerPlant,
            Object.keys(nutrientsRecord).length > 0 ? nutrientsRecord : undefined,
            this._selectedPresetId || undefined
          );
        }
        this.store?.showToast(
          `Watered ${this.dialogState.plantIds.length} plant(s)`,
          'success'
        );
      } else if (this.dialogState.growspaceId) {
        // Water entire growspace
        await this.store.waterGrowspace(
          this.dialogState.growspaceId,
          this._volume,
          Object.keys(nutrientsRecord).length > 0 ? nutrientsRecord : undefined,
          this._selectedPresetId || undefined
        );
        this.store?.showToast('Watered all plants in growspace', 'success');
      }

      this.dispatchEvent(new CustomEvent('data-changed', { bubbles: true, composed: true }));
      this._close();
    } catch (e: any) {
      console.error('Failed to record watering:', e);
      this.store?.showToast(`Error: ${e.message}`, 'error');
    } finally {
      this._isSubmitting = false;
    }
  }

  private _getPresetOptions(currentStage?: string, daysInStage = 0) {
    if (!this.store) return [];

    const presetsRecord = this._presetsController?.value || {};
    return Object.values(presetsRecord).map(p => {
      let recommended = false;
      if (p.stage && p.stage === currentStage) {
        if (!p.min_days_in_stage || daysInStage >= p.min_days_in_stage) {
          recommended = true;
        }
      }
      return {
        label: `${p.name}${recommended ? ' ⭐(Recommended)' : ''}`,
        value: p.id
      };
    });
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  protected render() {
    if (!this.open) return nothing;

    const dialogColor = '#2196F3';
    const mode = this.dialogState?.mode || 'growspace';
    const plantCount = this.dialogState?.plantIds?.length || 0;

    const modeText =
      mode === 'plant' && plantCount > 0
        ? `Watering ${plantCount} selected plant${plantCount > 1 ? 's' : ''}`
        : `Watering all plants in ${this.growspaceName}`;

    // Logic for recommendations
    let currentStage: string | undefined;
    let daysInStage = 0;

    if (this.store && this.store.data && this.dialogState?.mode === 'plant' && this.dialogState.plantIds?.length) {
      const selectedDeviceId = this.store.data.$selectedDevice.get();
      const selectedDevice = this.store.data.$devices.get().find(d => d.device_id === selectedDeviceId);
      if (selectedDevice) {
        // Check if all selected plants are in the same stage
        const selectedPlants = selectedDevice.plants.filter(p =>
          this.dialogState!.plantIds!.includes(p.attributes.plant_id || p.entity_id.replace('sensor.', ''))
        );

        if (selectedPlants.length > 0) {
          // Use first plant as baseline
          const firstStage = selectedPlants[0].attributes.stage;
          const isHomogeneous = selectedPlants.every(p => p.attributes.stage === firstStage);

          if (isHomogeneous) {
            currentStage = firstStage;
            // Use minimum days in stage to be safe
            daysInStage = Math.min(...selectedPlants.map(p => (p.attributes as any).days_in_stage || 0));
          }
        }
      }
    }

    const presetList = this._getPresetOptions(currentStage, daysInStage);

    // Logic for recommendations to sort or star
    // For now simple listing as per IPM dialog style

    return html`
      <ha-dialog
        open
        @closed=${this._close}
        hideActions
        .heading=${'Record Watering'}
      >
        <div class="glass-dialog-container" style="--stage-color: ${dialogColor};">
          <div class="dialog-header">
            <div class="dialog-icon">
              <ha-svg-icon .path=${mdiWaterPlus}></ha-svg-icon>
            </div>
            <div class="dialog-title-group">
              <h2 class="dialog-title">Record Watering</h2>
              <div class="dialog-subtitle">${this.growspaceName}</div>
            </div>
            <button class="md3-button text" @click=${this._close}>
              <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
            </button>
          </div>

          <div class="dialog-content-grid">
            <!-- Settings Section -->
            <div class="form-section">
                <h3>Watering Settings</h3>
                <md3-number-input
                    label="Volume (Liters)"
                    .value=${this._volume}
                    .min=${0.1}
                    .step=${0.1}
                    @change=${(e: CustomEvent) => { this._volume = parseFloat(e.detail) || 0; }}
                    style="margin-bottom: 12px;"
                ></md3-number-input>

                <md3-select
                    label="Nutrient Preset"
                    .value=${this._selectedPresetId || ''}
                    .options=${[{ label: 'Manual / No Preset', value: '' }, ...presetList.map(p => ({ label: p.label, value: p.value }))]}
                    @change=${(e: CustomEvent) => this._handlePresetChange(e)}
                ></md3-select>

                <div class="apply-summary">
                    Targeting: <span class="apply-target">${modeText}</span>
                </div>
            </div>

            <!-- Nutrients Section -->
            <div class="form-section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h3 style="margin: 0;">Nutrients</h3>
                    <button class="md3-button text" @click=${() => this._addNutrient()} style="--mdc-button-horizontal-padding: 8px;">
                        <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
                        Add
                    </button>
                </div>
                
                ${this._nutrients.length === 0 ? html`
                    <div style="text-align: center; opacity: 0.6; padding: 20px;">
                        <ha-svg-icon .path=${mdiInformation} style="margin-bottom: 8px;"></ha-svg-icon>
                        <div>No nutrients added</div>
                    </div>
                ` : nothing}

                ${this._nutrients.map((nutrient, index) => html`
                    <div class="product-row">
                      <md3-text-input
                        label="Nutrient Name"
                        .value=${nutrient.name}
                        .suggestions=${this._getNutrientSuggestions()}
                        @change=${(e: CustomEvent) => {
        const val = (e.target as HTMLInputElement).value || e.detail;
        this._updateNutrient(index, 'name', val);
      }}
                        placeholder="e.g. CalMag"
                      ></md3-text-input>
                      <md3-number-input
                        label="ml/L"
                        .value=${nutrient.concentration}
                        .min=${0}
                        .step=${0.1}
                        @change=${(e: CustomEvent) => {
        this._updateNutrient(index, 'concentration', parseFloat(e.detail) || 0);
      }}
                      ></md3-number-input>
                      <button class="md3-button icon" @click=${() => this._removeNutrient(index)} style="color: var(--error-color);">
                        <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
                      </button>
                    </div>
                `)}
            </div>

            <!-- Calculation Preview -->
            ${this._nutrients.length > 0 ? html`
            <div class="form-section">
                <h3>Summary</h3>
                <div class="calculation-preview">
                    ${this._nutrients.filter((n) => n.name && n.concentration > 0).map((nutrient) => html`
                          <div class="calculation-row">
                            <span class="calculation-label">${nutrient.name}</span>
                            <span class="calculation-value">
                              ${this._volume}L × ${nutrient.concentration} ml/L =
                              <strong>${this._calculateTotalMl(nutrient.concentration).toFixed(1)} ml</strong>
                            </span>
                          </div>
                    `)}
                    <div class="calculation-row">
                      <span class="calculation-label">Total Nutrients</span>
                      <span class="calculation-value">
                        <strong>${this._getTotalNutrientsMl().toFixed(1)} ml</strong>
                      </span>
                    </div>
                </div>
            </div>
            ` : nothing}
          </div>

          <div class="button-group">
            <button class="md3-button tonal" @click=${this._close} ?disabled=${this._isSubmitting}>
              Cancel
            </button>
            <button
              class="md3-button primary"
              style="background-color: ${dialogColor}; --mdc-theme-primary: ${dialogColor};"
              @click=${this._submit}
              ?disabled=${this._isSubmitting || this._volume <= 0}
            >
              <ha-svg-icon .path=${mdiCheck} style="margin-right: 8px;"></ha-svg-icon>
              ${this._isSubmitting ? 'Recording...' : 'Record Watering'}
            </button>
          </div>
        </div>
      </ha-dialog>
    `;
  }



  private _getNutrientSuggestions(): string[] {
    const nutrients = new Set<string>();
    if (!this.store || !this.store.data || !this._presetsController || !this._inventoryController) return [];

    // Add nutrients from presets
    const presets = this._presetsController.value;
    if (presets) {
      Object.values(presets).forEach(preset => {
        if (preset.nutrients) {
          preset.nutrients.forEach(n => {
            if (n.name) nutrients.add(n.name);
          });
        }
      });
    }

    // Add nutrients from inventory
    const inventory = this._inventoryController.value;
    if (inventory && inventory.stocks) {
      Object.values(inventory.stocks).forEach(stock => {
        if (stock.name) nutrients.add(stock.name);
      });
    }

    return Array.from(nutrients).sort();
  }
}
