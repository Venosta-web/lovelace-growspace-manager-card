import { LitElement, html, css, PropertyValues, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { consume } from '@lit/context';
import { hassContext, storeContext } from '../context';
import { mdiWaterPlus, mdiClose, mdiPlus, mdiDelete, mdiAutoFix, mdiStar } from '@mdi/js';
import { WateringDialogState, NutrientEntry, NutrientPreset, NutrientItem } from '../types';
import { DataService } from '../data-service';
import { dialogStyles } from '../styles/dialog.styles';
import '../components/ui/md3-text-input';
import '../components/ui/md3-number-input';
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

  private _dataService?: DataService;

  static styles = [
    dialogStyles,
    css`
      :host {
        --mdc-dialog-min-width: clamp(350px, 500px, 90vw);
      }

      .dialog-body {
        padding: 24px;
        overflow-y: auto;
        max-height: 70vh;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .nutrient-row {
        display: flex;
        gap: 12px;
        align-items: flex-end;
      }

      .nutrient-row md3-text-input {
        flex: 2;
      }

      .nutrient-row md3-number-input {
        flex: 1;
      }

      .nutrient-row button {
        flex-shrink: 0;
        padding: 8px;
        min-width: auto;
      }

      .nutrients-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .calculation-preview {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 16px;
        margin-top: 8px;
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

      .mode-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: rgba(33, 150, 243, 0.1);
        border-radius: 8px;
        font-size: 0.9rem;
      }

      .mode-indicator svg {
        width: 20px;
        height: 20px;
        fill: var(--primary-color);
      }

      .add-nutrient-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px dashed rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        cursor: pointer;
        color: var(--secondary-text-color);
        transition: all 0.2s;
      }

      .add-nutrient-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: var(--primary-color);
        color: var(--primary-color);
      }

      .add-nutrient-btn svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }

      .preset-select {
          margin-bottom: 12px;
      }
      
      .preset-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          background: var(--primary-color);
          color: white;
          margin-left: 8px;
      }

      .calculation-row strong {
          color: var(--primary-color);
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

  private _handlePresetChange(e: Event) {
    const presetId = (e.target as HTMLSelectElement).value;
    this._selectedPresetId = presetId;

    if (!presetId) {
      this._nutrients = [];
      return;
    }

    const presets = this.store.data.$nutrientPresets.get();

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
        // Water individual plants
        for (const plantId of this.dialogState.plantIds) {
          await this._dataService.waterPlant(
            plantId,
            this._volume,
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
        await this._dataService.waterGrowspace(
          this.dialogState.growspaceId,
          this._volume,
          Object.keys(nutrientsRecord).length > 0 ? nutrientsRecord : undefined,
          this._selectedPresetId || undefined
        );
        this.store?.showToast('Watered all plants in growspace', 'success');
      }

      await this.store?.refreshData();
      this._close();
    } catch (e: any) {
      console.error('Failed to record watering:', e);
      this.store?.showToast(`Error: ${e.message}`, 'error');
    } finally {
      this._isSubmitting = false;
    }
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

    return html`
      <ha-dialog
        open
        @closed=${this._close}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${''}
      >
        <div class="glass-dialog-container" style="--stage-color: ${dialogColor};">
          <div class="dialog-header">
            <div class="dialog-icon">
              <svg style="width:32px;height:32px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiWaterPlus}"></path>
              </svg>
            </div>
            <div class="dialog-title-group">
              <h2 class="dialog-title">Record Watering</h2>
              <div class="dialog-subtitle">${this.growspaceName}</div>
            </div>
            <button
              class="md3-button text"
              @click=${this._close}
              style="min-width: auto; padding: 8px;"
            >
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiClose}"></path>
              </svg>
            </button>
          </div>

          <div class="dialog-body">
            <!-- Mode Indicator -->
            <div class="mode-indicator">
              <svg viewBox="0 0 24 24"><path d="${mdiWaterPlus}"></path></svg>
              <span>${modeText}</span>
            </div>

            <!-- Volume Input -->
            <div class="detail-card">
              <h3 style="margin-top: 0;">Solution Volume</h3>
              <md3-number-input
                label="Volume (Liters)"
                .value=${this._volume}
                .min=${0.1}
                .step=${0.1}
                @change=${(e: CustomEvent) => {
        this._volume = parseFloat(e.detail) || 0;
      }}
              ></md3-number-input>
            </div>

            <!-- Nutrients Section -->
            <div class="detail-card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h3 style="margin: 0;">Nutrients</h3>
                ${this._selectedPresetId ? html`<span class="preset-chip">Preset Active</span>` : nothing}
              </div>
              
              <div class="preset-select">
                <div class="md3-input-group">
                    <label class="md3-label">Use Nutrient Preset</label>
                    <select class="md3-input" .value=${this._selectedPresetId} @change=${this._handlePresetChange}>
                        <option value="">Manual / No Preset</option>
                        ${this._renderPresetOptions()}
                    </select>
                </div>
              </div>

              <p style="font-size: 0.8rem; opacity: 0.7; margin-bottom: 16px;">
                Track nutrient concentrations. Values auto-populated from presets can be overridden.
              </p>

              <div class="nutrients-section">
                ${this._nutrients.map(
        (nutrient, index) => html`
                    <div class="nutrient-row">
                      <md3-text-input
                        label="Nutrient Name"
                        .value=${nutrient.name}
                        .suggestions=${this._getNutrientSuggestions()}
                        @change=${(e: CustomEvent) => {
            const val = (e.target as HTMLInputElement).value || e.detail;
            this._updateNutrient(index, 'name', val);
          }}
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
                      <button
                        class="md3-button icon"
                        @click=${() => this._removeNutrient(index)}
                        title="Remove nutrient"
                        style="color: var(--error-color);"
                      >
                        <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
                      </button>
                    </div>
                  `
      )}

                <div class="add-nutrient-btn" @click=${() => this._addNutrient()}>
                  <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
                  <span>Add Nutrient</span>
                </div>
              </div>
            </div>

            <!-- Calculation Preview -->
            ${this._nutrients.length > 0
        ? html`
                  <div class="calculation-preview">
                    <h4 style="margin-top: 0; margin-bottom: 12px;">Calculation Preview</h4>
                    ${this._nutrients
            .filter((n) => n.name && n.concentration > 0)
            .map(
              (nutrient) => html`
                          <div class="calculation-row">
                            <span class="calculation-label">${nutrient.name}</span>
                            <span class="calculation-value">
                              ${this._volume}L × ${nutrient.concentration} ml/L =
                              <strong>${this._calculateTotalMl(nutrient.concentration).toFixed(1)} ml</strong>
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
                `
        : nothing}
          </div>

          <div class="button-group">
            <button class="md3-button tonal" @click=${this._close} ?disabled=${this._isSubmitting}>
              Cancel
            </button>
            <button
              class="md3-button primary"
              style="background: ${dialogColor};"
              @click=${this._submit}
              ?disabled=${this._isSubmitting || this._volume <= 0}
            >
              ${this._isSubmitting ? 'Recording...' : 'Record Watering'}
            </button>
          </div>
        </div>
      </ha-dialog>
    `;
  }

  private _renderPresetOptions() {
    if (!this.store || !this.store.data) return nothing;
    const presetsRecord = this.store.data.$nutrientPresets.get();
    if (!presetsRecord) return nothing;

    const presets = Object.values(presetsRecord);

    // Logic for recommendations
    let currentStage: string | undefined;
    let daysInStage = 0;

    if (this.dialogState?.mode === 'plant' && this.dialogState.plantIds?.length) {
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

    return presets.map(p => {
      let recommended = false;
      // Exact match logic from backend
      if (p.stage && p.stage === currentStage) {
        if (!p.min_days_in_stage || daysInStage >= p.min_days_in_stage) {
          recommended = true;
        }
      }

      return html`
                <option value="${p.id}" ?selected=${this._selectedPresetId === p.id}>
                    ${p.name} ${recommended ? '⭐ (Recommended)' : ''}
                </option>
            `;
    });
  }

  private _getNutrientSuggestions(): string[] {
    const nutrients = new Set<string>();
    if (!this.store || !this.store.data) return [];

    const presets = this.store.data.$nutrientPresets.get();
    Object.values(presets).forEach(preset => {
      preset.nutrients.forEach(n => {
        if (n.name) nutrients.add(n.name);
      });
    });

    return Array.from(nutrients).sort();
  }
}
