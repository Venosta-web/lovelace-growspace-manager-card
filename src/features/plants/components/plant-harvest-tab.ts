import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { storeContext } from '../../../context';
import type { GrowspaceStore } from '../../../store/core/growspace-store';
import type { PlantEntity } from '../../../types';
import { dialogStyles } from '../../../styles/dialog.styles';

@customElement('plant-harvest-tab')
export class PlantHarvestTab extends LitElement {
  @consume({ context: storeContext }) private store!: GrowspaceStore;

  @property({ attribute: false }) plant!: PlantEntity;

  @state() private _harvestMetricsEdit: Record<string, unknown> = {};
  @state() private _scoresEdit: Record<string, number | null> = {};
  @state() private _starPreview: Record<string, number | null> = {};
  @state() private _savingHarvest = false;

  static styles = [dialogStyles];

  private static readonly SCORE_DIMENSIONS = [
    { key: 'vigor', label: 'Vigor', description: 'Overall plant health, growth rate, and robustness', emoji: '💪' },
    { key: 'internodal_spacing', label: 'Structure', description: 'Branch spacing, internodal distance, and bud site density', emoji: '🌿' },
    { key: 'terpene_intensity', label: 'Aroma', description: 'Terpene expression — potency and complexity of smell', emoji: '👃' },
    { key: 'resin', label: 'Resin', description: 'Trichome coverage and density', emoji: '💎' },
    { key: 'mold_resistance', label: 'Pest resistance', description: 'Resilience against pests and disease during the run', emoji: '🛡️' },
  ];

  willUpdate(changedProps: Map<string, unknown>): void {
    if (changedProps.has('plant') && this.plant) {
      const hm = (this.plant.attributes?.harvest_metrics as Record<string, unknown>) || {};
      this._harvestMetricsEdit = { ...hm };
      const rawScores = (this.plant.attributes?.phenotype_score as Record<string, number | null>) || {};
      this._scoresEdit = {
        vigor: rawScores.vigor ?? null,
        internodal_spacing: rawScores.internodal_spacing ?? null,
        terpene_intensity: rawScores.terpene_intensity ?? null,
        resin: rawScores.resin ?? null,
        mold_resistance: rawScores.mold_resistance ?? null,
      };
      this._starPreview = {};
    }
  }

  render(): TemplateResult {
    const isSaving = this._savingHarvest;
    const hm = this._harvestMetricsEdit as Record<string, number | string | null>;
    const stage = (this.plant?.state || '').toLowerCase();
    const advanceLabel = (stage === 'dry' || stage === 'drying') ? '🌿 Skip & begin cure' : '📦 Skip & finish';

    return html`
      <div style="padding: 24px; display: flex; flex-direction: column; gap: 24px;">

        <!-- Score Grid -->
        <div style="display:flex; flex-direction:column; gap:20px; padding:8px 0;">
          ${PlantHarvestTab.SCORE_DIMENSIONS.map(dim => this._renderScoreRow(dim))}
        </div>
        <p style="font-size:0.8rem; opacity:0.45; margin:8px 0 0; text-align:center;">
          All fields are optional — you can advance without scoring.
        </p>

        <hr style="border:none; border-top:1px solid var(--divider-color, rgba(255,255,255,0.1)); margin:0;" />

        <!-- Yield Metrics -->
        <div>
          <p style="font-size:0.85rem; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; opacity:0.6; margin:0 0 12px;">Yield metrics</p>
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:12px;">
            <div style="display:flex; flex-direction:column; gap:4px;">
              <label style="font-size:0.75rem; opacity:0.7;">Wet weight (g)</label>
              <input type="number" min="0" step="0.1" placeholder="e.g. 120"
                .value=${String(hm.wet_weight ?? '')}
                @input=${(e: InputEvent) => {
                  const v = (e.target as HTMLInputElement).value;
                  this._harvestMetricsEdit = { ...this._harvestMetricsEdit, wet_weight: v === '' ? null : parseFloat(v) };
                }}
                ?disabled=${isSaving}
                style="background:var(--card-background-color, rgba(255,255,255,0.06)); border:1px solid var(--divider-color, rgba(255,255,255,0.15)); border-radius:8px; color:var(--primary-text-color); font-size:0.9rem; padding:6px 10px; width:100%; box-sizing:border-box;"
              />
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <label style="font-size:0.75rem; opacity:0.7;">Dry weight (g)</label>
              <input type="number" min="0" step="0.1" placeholder="e.g. 28"
                .value=${String(hm.dry_weight ?? '')}
                @input=${(e: InputEvent) => {
                  const v = (e.target as HTMLInputElement).value;
                  this._harvestMetricsEdit = { ...this._harvestMetricsEdit, dry_weight: v === '' ? null : parseFloat(v) };
                }}
                ?disabled=${isSaving}
                style="background:var(--card-background-color, rgba(255,255,255,0.06)); border:1px solid var(--divider-color, rgba(255,255,255,0.15)); border-radius:8px; color:var(--primary-text-color); font-size:0.9rem; padding:6px 10px; width:100%; box-sizing:border-box;"
              />
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <label style="font-size:0.75rem; opacity:0.7;">Trim weight (g)</label>
              <input type="number" min="0" step="0.1" placeholder="e.g. 5"
                .value=${String(hm.trim_weight ?? '')}
                @input=${(e: InputEvent) => {
                  const v = (e.target as HTMLInputElement).value;
                  this._harvestMetricsEdit = { ...this._harvestMetricsEdit, trim_weight: v === '' ? null : parseFloat(v) };
                }}
                ?disabled=${isSaving}
                style="background:var(--card-background-color, rgba(255,255,255,0.06)); border:1px solid var(--divider-color, rgba(255,255,255,0.15)); border-radius:8px; color:var(--primary-text-color); font-size:0.9rem; padding:6px 10px; width:100%; box-sizing:border-box;"
              />
            </div>
          </div>
        </div>

        <hr style="border:none; border-top:1px solid var(--divider-color, rgba(255,255,255,0.1)); margin:0;" />

        <!-- Lab Results -->
        <div>
          <p style="font-size:0.85rem; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; opacity:0.6; margin:0 0 12px;">Lab results</p>
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:12px;">
            <div style="display:flex; flex-direction:column; gap:4px;">
              <label style="font-size:0.75rem; opacity:0.7;">THC (%)</label>
              <input type="number" min="0" max="100" step="0.1" placeholder="e.g. 24.5"
                .value=${String(hm.thc_percentage ?? '')}
                @input=${(e: InputEvent) => {
                  const v = (e.target as HTMLInputElement).value;
                  this._harvestMetricsEdit = { ...this._harvestMetricsEdit, thc_percentage: v === '' ? null : parseFloat(v) };
                }}
                ?disabled=${isSaving}
                style="background:var(--card-background-color, rgba(255,255,255,0.06)); border:1px solid var(--divider-color, rgba(255,255,255,0.15)); border-radius:8px; color:var(--primary-text-color); font-size:0.9rem; padding:6px 10px; width:100%; box-sizing:border-box;"
              />
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <label style="font-size:0.75rem; opacity:0.7;">CBD (%)</label>
              <input type="number" min="0" max="100" step="0.1" placeholder="e.g. 0.3"
                .value=${String(hm.cbd_percentage ?? '')}
                @input=${(e: InputEvent) => {
                  const v = (e.target as HTMLInputElement).value;
                  this._harvestMetricsEdit = { ...this._harvestMetricsEdit, cbd_percentage: v === '' ? null : parseFloat(v) };
                }}
                ?disabled=${isSaving}
                style="background:var(--card-background-color, rgba(255,255,255,0.06)); border:1px solid var(--divider-color, rgba(255,255,255,0.15)); border-radius:8px; color:var(--primary-text-color); font-size:0.9rem; padding:6px 10px; width:100%; box-sizing:border-box;"
              />
            </div>
            <div style="display:flex; flex-direction:column; gap:4px; grid-column: 1 / -1;">
              <label style="font-size:0.75rem; opacity:0.7;">Terpene profile</label>
              <textarea rows="2" placeholder="e.g. myrcene, limonene, caryophyllene"
                .value=${String(hm.terpene_profile ?? '')}
                @input=${(e: InputEvent) => {
                  this._harvestMetricsEdit = { ...this._harvestMetricsEdit, terpene_profile: (e.target as HTMLTextAreaElement).value };
                }}
                ?disabled=${isSaving}
                style="background:var(--card-background-color, rgba(255,255,255,0.06)); border:1px solid var(--divider-color, rgba(255,255,255,0.15)); border-radius:8px; color:var(--primary-text-color); font-size:0.9rem; padding:6px 10px; width:100%; box-sizing:border-box; resize:vertical;"
              ></textarea>
            </div>
          </div>
        </div>

        <hr style="border:none; border-top:1px solid var(--divider-color, rgba(255,255,255,0.1)); margin:0;" />

        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
          <button
            class="md3-button outlined"
            @click=${() => this._skipAndAdvance()}
            ?disabled=${isSaving}
          >${advanceLabel}</button>
          <button
            class="md3-button filled"
            style="background: linear-gradient(135deg, #388e3c, #4caf50);"
            @click=${() => this._saveHarvestMetrics()}
            ?disabled=${isSaving}
          >${isSaving ? 'Saving…' : '🌾 Save scores & metrics'}</button>
        </div>
      </div>
    `;
  }

  private _setScore(key: string, value: number): void {
    const current = this._scoresEdit[key];
    this._scoresEdit = { ...this._scoresEdit, [key]: current === value ? null : value };
  }

  private _renderScoreRow(dim: { key: string; label: string; description: string; emoji: string }): TemplateResult {
    const current = this._scoresEdit[dim.key] as number | null;
    const preview = this._starPreview[dim.key] as number | null;
    return html`
      <div style="display:flex; flex-direction:column; gap:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="display:flex; align-items:center; gap:8px; font-weight:500; font-size:0.95rem;">
            <span style="font-size:1.2rem;">${dim.emoji}</span>
            ${dim.label}
          </span>
          <span style="font-size:0.95rem; opacity:0.7; min-width:30px; text-align:right;">
            ${current !== null && current !== undefined ? `${current} / 5` : '—'}
          </span>
        </div>
        <p style="font-size:0.8rem; opacity:0.5; margin:0;">${dim.description}</p>
        <div style="display:flex; gap:6px; margin-top:4px;">
          ${[1, 2, 3, 4, 5].map(star => html`
            <button
              style="background:none; border:none; padding:0; cursor:pointer; font-size:1.6rem; line-height:1; transition:transform 0.1s, filter 0.15s;
                filter: ${(current !== null && star <= current) || (preview !== null && star <= preview)
                  ? 'grayscale(0) opacity(1)'
                  : 'grayscale(0.6) opacity(0.5)'};"
              aria-label="Set ${dim.label} score to ${star}"
              @mouseenter=${() => { this._starPreview = { ...this._starPreview, [dim.key]: star }; }}
              @mouseleave=${() => { this._starPreview = { ...this._starPreview, [dim.key]: null }; }}
              @click=${() => this._setScore(dim.key, star)}
              ?disabled=${this._savingHarvest}
            >⭐</button>
          `)}
        </div>
      </div>
    `;
  }

  private _skipAndAdvance(): void {
    if (this._savingHarvest) return;
    const stage = (this.plant?.state || '').toLowerCase();
    const action = (stage === 'dry' || stage === 'drying') ? 'finish-drying' : 'harvest';
    this.dispatchEvent(new CustomEvent('harvest-advance', {
      detail: { action },
      bubbles: true,
      composed: true,
    }));
  }

  private async _saveHarvestMetrics(): Promise<void> {
    if (!this.plant?.attributes?.plant_id) return;
    this._savingHarvest = true;
    try {
      const plantId = this.plant.attributes.plant_id as string;
      await this.store.actions.plant.saveHarvestMetrics(plantId, this._harvestMetricsEdit);
      await this.store.actions.plant.scorePhenotype(plantId, this._scoresEdit);
      this.dispatchEvent(new CustomEvent('harvest-saved', { bubbles: true, composed: true }));
    } catch (e) {
      console.error('Failed to save harvest metrics', e);
    } finally {
      this._savingHarvest = false;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'plant-harvest-tab': PlantHarvestTab;
  }
}
