import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { storeContext } from '../../../context';
import type { GrowspaceStore } from '../../../store/core/growspace-store';
import type { PlantEntity } from '../../../types';
import { dialogStyles } from '../../../styles/dialog.styles';

@customElement('plant-drying-tab')
export class PlantDryingTab extends LitElement {
  @consume({ context: storeContext }) private store!: GrowspaceStore;

  @property({ attribute: false }) plant!: PlantEntity;

  @state() private _weightInput = '';
  @state() private _weightDate = '';
  @state() private _savingWeight = false;

  @state() private _moistureInput = '';
  @state() private _moistureDate = '';
  @state() private _savingMoisture = false;

  @state() private _visualTagInput = '';
  @state() private _savingTag = false;

  static styles = [dialogStyles];

  willUpdate(changedProps: Map<string, unknown>): void {
    if (changedProps.has('plant') && this.plant) {
      const attrs = this.plant.attributes as Record<string, unknown>;
      this._visualTagInput = (attrs.visual_tag as string) ?? '';
    }
  }

  render(): TemplateResult {
    const attrs = (this.plant?.attributes ?? {}) as Record<string, unknown>;

    const weight = (attrs.drying_weight as number | null) ?? null;
    const weightLostPct = (attrs.weight_lost_pct as number | null) ?? null;
    const daysToTarget = (attrs.days_to_target as number | null) ?? null;
    const moisture = (attrs.drying_moisture as number | null) ?? null;
    const cureReady = (attrs.drying_ready_for_cure as boolean) ?? false;
    const missingWetWeight = weight !== null && weightLostPct === null && daysToTarget === null;

    return html`
      <div style="padding: 24px; display: flex; flex-direction: column; gap: 24px;">
        <!-- Stats -->
        <div>
          <p
            style="font-size:0.85rem; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; opacity:0.6; margin:0 0 12px;"
          >
            Progress
          </p>
          <div
            style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:12px;"
          >
            ${this._renderStat('Current weight', weight !== null ? `${weight.toFixed(1)} g` : '—')}
            ${this._renderStat(
              'Weight lost',
              weightLostPct !== null ? `${weightLostPct.toFixed(1)}%` : '—'
            )}
            ${this._renderStat(
              'Est. days left',
              daysToTarget !== null ? `${Math.ceil(daysToTarget)}` : '—'
            )}
            ${this._renderStat('Moisture', moisture !== null ? `${moisture.toFixed(1)}%` : '—')}
            ${this._renderStat('Ready for cure', cureReady ? '✓ Yes' : '✗ No')}
          </div>
          ${missingWetWeight
            ? html`
                <p style="font-size:0.78rem; opacity:0.5; margin:10px 0 0;">
                  Set wet weight in the Harvest tab to enable projections.
                </p>
              `
            : ''}
        </div>

        <hr
          style="border:none; border-top:1px solid var(--divider-color, rgba(255,255,255,0.1)); margin:0;"
        />

        <!-- Visual Tag -->
        <div>
          <p
            style="font-size:0.85rem; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; opacity:0.6; margin:0 0 12px;"
          >
            Visual tag
          </p>
          <p style="font-size:0.8rem; opacity:0.5; margin:0 0 10px;">
            Physical identifier tied to the plant (e.g. "Red Velcro").
          </p>
          <div style="display:flex; gap:8px; align-items:center;">
            <input
              type="text"
              placeholder="e.g. Red Velcro"
              .value=${this._visualTagInput}
              @input=${(e: InputEvent) => {
                this._visualTagInput = (e.target as HTMLInputElement).value;
              }}
              ?disabled=${this._savingTag}
              style="flex:1; background:var(--card-background-color, rgba(255,255,255,0.06)); border:1px solid var(--divider-color, rgba(255,255,255,0.15)); border-radius:8px; color:var(--primary-text-color); font-size:0.9rem; padding:6px 10px; box-sizing:border-box;"
            />
            <button
              class="md3-button filled"
              @click=${this._saveVisualTag}
              ?disabled=${this._savingTag}
              style="white-space:nowrap;"
            >
              ${this._savingTag ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        <hr
          style="border:none; border-top:1px solid var(--divider-color, rgba(255,255,255,0.1)); margin:0;"
        />

        <!-- Log Weight -->
        <div>
          <p
            style="font-size:0.85rem; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; opacity:0.6; margin:0 0 12px;"
          >
            Log weight
          </p>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="Weight (g)"
              .value=${this._weightInput}
              @input=${(e: InputEvent) => {
                this._weightInput = (e.target as HTMLInputElement).value;
              }}
              ?disabled=${this._savingWeight}
              style="width:120px; background:var(--card-background-color, rgba(255,255,255,0.06)); border:1px solid var(--divider-color, rgba(255,255,255,0.15)); border-radius:8px; color:var(--primary-text-color); font-size:0.9rem; padding:6px 10px; box-sizing:border-box;"
            />
            <input
              type="date"
              .value=${this._weightDate}
              @input=${(e: InputEvent) => {
                this._weightDate = (e.target as HTMLInputElement).value;
              }}
              ?disabled=${this._savingWeight}
              style="background:var(--card-background-color, rgba(255,255,255,0.06)); border:1px solid var(--divider-color, rgba(255,255,255,0.15)); border-radius:8px; color:var(--primary-text-color); font-size:0.9rem; padding:6px 10px; box-sizing:border-box;"
            />
            <button
              class="md3-button filled"
              @click=${this._logWeight}
              ?disabled=${this._savingWeight || !this._weightInput}
              style="white-space:nowrap;"
            >
              ${this._savingWeight ? 'Saving…' : 'Log weight'}
            </button>
          </div>
        </div>

        <hr
          style="border:none; border-top:1px solid var(--divider-color, rgba(255,255,255,0.1)); margin:0;"
        />

        <!-- Log Moisture -->
        <div>
          <p
            style="font-size:0.85rem; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; opacity:0.6; margin:0 0 12px;"
          >
            Log moisture
          </p>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="Moisture (%)"
              .value=${this._moistureInput}
              @input=${(e: InputEvent) => {
                this._moistureInput = (e.target as HTMLInputElement).value;
              }}
              ?disabled=${this._savingMoisture}
              style="width:140px; background:var(--card-background-color, rgba(255,255,255,0.06)); border:1px solid var(--divider-color, rgba(255,255,255,0.15)); border-radius:8px; color:var(--primary-text-color); font-size:0.9rem; padding:6px 10px; box-sizing:border-box;"
            />
            <input
              type="date"
              .value=${this._moistureDate}
              @input=${(e: InputEvent) => {
                this._moistureDate = (e.target as HTMLInputElement).value;
              }}
              ?disabled=${this._savingMoisture}
              style="background:var(--card-background-color, rgba(255,255,255,0.06)); border:1px solid var(--divider-color, rgba(255,255,255,0.15)); border-radius:8px; color:var(--primary-text-color); font-size:0.9rem; padding:6px 10px; box-sizing:border-box;"
            />
            <button
              class="md3-button filled"
              @click=${this._logMoisture}
              ?disabled=${this._savingMoisture || !this._moistureInput}
              style="white-space:nowrap;"
            >
              ${this._savingMoisture ? 'Saving…' : 'Log moisture'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private _renderStat(label: string, value: string): TemplateResult {
    return html`
      <div style="display:flex; flex-direction:column; gap:4px;">
        <span style="font-size:0.75rem; opacity:0.6;">${label}</span>
        <span style="font-size:1rem; font-weight:600;">${value}</span>
      </div>
    `;
  }

  private _plantId(): string {
    return (
      (this.plant?.attributes?.plant_id as string) ||
      this.plant?.entity_id?.replace('sensor.', '') ||
      ''
    );
  }

  private async _saveVisualTag(): Promise<void> {
    this._savingTag = true;
    try {
      const tag = this._visualTagInput.trim() || null;
      await this.store.actions.plant.setVisualTag(this._plantId(), tag);
    } finally {
      this._savingTag = false;
    }
  }

  private async _logWeight(): Promise<void> {
    const grams = parseFloat(this._weightInput);
    if (isNaN(grams)) return;
    this._savingWeight = true;
    try {
      await this.store.actions.plant.logDryingWeight(
        this._plantId(),
        grams,
        this._weightDate || undefined
      );
      this._weightInput = '';
      this._weightDate = '';
    } finally {
      this._savingWeight = false;
    }
  }

  private async _logMoisture(): Promise<void> {
    const pct = parseFloat(this._moistureInput);
    if (isNaN(pct)) return;
    this._savingMoisture = true;
    try {
      await this.store.actions.plant.logMoistureReading(
        this._plantId(),
        pct,
        this._moistureDate || undefined
      );
      this._moistureInput = '';
      this._moistureDate = '';
    } finally {
      this._savingMoisture = false;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'plant-drying-tab': PlantDryingTab;
  }
}
