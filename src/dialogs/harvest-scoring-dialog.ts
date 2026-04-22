import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { hassContext, storeContext } from '../context';
import { mdiClose, mdiLeaf } from '@mdi/js';
import type { GrowspaceStore } from '../store/core/growspace-store';
import type { HomeAssistant } from 'custom-card-helpers';
import type { HarvestScoringDialogState } from '../lib/types/dialog';
import { dialogStyles } from '../styles/dialog.styles';
import '../components/ui/gs-help-tooltip';

/** Score dimension descriptor */
interface ScoreDimension {
    key: 'vigor' | 'structure' | 'aroma' | 'resin' | 'pestResistance';
    label: string;
    description: string;
    emoji: string;
}

const SCORE_DIMENSIONS: ScoreDimension[] = [
    {
        key: 'vigor',
        label: 'Vigor',
        description: 'Overall plant health, growth rate, and robustness',
        emoji: '💪',
    },
    {
        key: 'structure',
        label: 'Structure',
        description: 'Branch spacing, internodal distance, and bud site density',
        emoji: '🌿',
    },
    {
        key: 'aroma',
        label: 'Aroma',
        description: 'Terpene expression — potency and complexity of smell',
        emoji: '👃',
    },
    {
        key: 'resin',
        label: 'Resin',
        description: 'Trichome coverage and density',
        emoji: '💎',
    },
    {
        key: 'pestResistance',
        label: 'Pest resistance',
        description: 'Resilience against pests and disease during the run',
        emoji: '🛡️',
    },
];

type Scores = Record<string, number | null>;

@customElement('harvest-scoring-dialog')
export class HarvestScoringDialog extends LitElement {
    @consume({ context: hassContext, subscribe: true })
    public hass!: HomeAssistant;

    @consume({ context: storeContext, subscribe: true })
    public store!: GrowspaceStore;

    @property({ type: Boolean }) public open = false;
    @property({ attribute: false }) public dialogState: HarvestScoringDialogState | undefined;

    @state() private _scores: Scores = {
        vigor: null,
        structure: null,
        aroma: null,
        resin: null,
        pestResistance: null,
    };
    @state() private _isSubmitting = false;

    // Yield metrics
    @state() private _wetWeight: string = '';
    @state() private _dryWeight: string = '';
    @state() private _trimWeight: string = '';
    // Lab results
    @state() private _thcPercentage: string = '';
    @state() private _cbdPercentage: string = '';
    @state() private _terpeneProfile: string = '';

    static styles = [
        dialogStyles,
        css`
      :host {
        --ha-dialog-width-md: 95vw;
        --ha-dialog-max-width: 98vw;
        --ha-dialog-width-full: 98vw;
        --dialog-content-padding: 0;
      }

      .score-grid {
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding: 8px 0;
      }

      .score-row {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .score-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .score-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
        font-size: 0.95rem;
      }

      .score-emoji {
        font-size: 1.2rem;
      }

      .score-value {
        font-size: 0.95rem;
        opacity: 0.7;
        min-width: 30px;
        text-align: right;
      }

      .score-description {
        font-size: 0.8rem;
        opacity: 0.5;
        margin: 0;
      }

      .star-row {
        display: flex;
        gap: 6px;
        margin-top: 4px;
      }

      .star-btn {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        font-size: 1.6rem;
        line-height: 1;
        transition: transform 0.1s, filter 0.15s;
        filter: grayscale(0.6) opacity(0.5);
      }

      .star-btn.active {
        filter: grayscale(0) opacity(1);
      }

      .star-btn:hover,
      .star-btn.preview {
        transform: scale(1.2);
        filter: grayscale(0) opacity(1);
      }

      .skip-hint {
        font-size: 0.8rem;
        opacity: 0.45;
        margin-top: 8px;
        text-align: center;
      }

      .divider {
        border: none;
        border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        margin: 0;
      }

      .header-stage {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        background: rgba(76, 175, 80, 0.25);
        color: var(--primary-color, #4caf50);
        margin-top: 4px;
      }

      .metrics-section {
        padding: 16px 24px;
      }

      .metrics-section-title {
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        opacity: 0.6;
        margin: 0 0 12px;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        gap: 12px;
      }

      .metric-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .metric-field label {
        font-size: 0.75rem;
        opacity: 0.7;
      }

      .metric-field input,
      .metric-field textarea {
        background: var(--card-background-color, rgba(255,255,255,0.06));
        border: 1px solid var(--divider-color, rgba(255,255,255,0.15));
        border-radius: 8px;
        color: var(--primary-text-color);
        font-size: 0.9rem;
        padding: 6px 10px;
        width: 100%;
        box-sizing: border-box;
        transition: border-color 0.15s;
      }

      .metric-field input:focus,
      .metric-field textarea:focus {
        outline: none;
        border-color: var(--primary-color, #4caf50);
      }

      .terpene-field {
        grid-column: 1 / -1;
      }

      .terpene-field textarea {
        resize: vertical;
        min-height: 48px;
      }
    `,
    ];

    protected willUpdate(changedProps: Map<string, unknown>): void {
        if (changedProps.has('open') && this.open) {
            this._resetScores();
        }
    }

    private _resetScores(): void {
        const ds = this.dialogState;
        this._scores = {
            vigor: ds?.vigor ?? null,
            structure: ds?.structure ?? null,
            aroma: ds?.aroma ?? null,
            resin: ds?.resin ?? null,
            pestResistance: ds?.pestResistance ?? null,
        };
        // Reset yield/lab fields
        this._wetWeight = '';
        this._dryWeight = '';
        this._trimWeight = '';
        this._thcPercentage = '';
        this._cbdPercentage = '';
        this._terpeneProfile = '';
    }

    private _setScore(key: string, value: number): void {
        // Clicking the same star a second time clears the score
        const current = this._scores[key];
        this._scores = { ...this._scores, [key]: current === value ? null : value };
    }

    /** Saves scores to the backend (optional step – harvest always proceeds). */
    private async _submitAndHarvest(): Promise<void> {
        if (!this.dialogState || this._isSubmitting) return;
        this._isSubmitting = true;

        const plant = this.dialogState.plant;
        const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');

        try {
            // 1. Save scores if any are set
            const hasAnyScore = Object.values(this._scores).some((v) => v !== null);
            if (hasAnyScore) {
                await this.store.actions.plant.scorePhenotype(plantId, {
                    vigor: this._scores.vigor as number | null,
                    structure: this._scores.structure as number | null,
                    aroma: this._scores.aroma as number | null,
                    resin: this._scores.resin as number | null,
                    pest_resistance: this._scores.pestResistance as number | null,
                });
            }

            // 2. Build yield/lab metrics (only include non-empty values)
            const metrics: {
                wet_weight?: number;
                dry_weight?: number;
                trim_weight?: number;
                thc_percentage?: number;
                cbd_percentage?: number;
                terpene_profile?: string;
            } = {};
            const parseF = (v: string) => (v.trim() !== '' ? parseFloat(v) : undefined);
            const ww = parseF(this._wetWeight);
            const dw = parseF(this._dryWeight);
            const tw = parseF(this._trimWeight);
            const thc = parseF(this._thcPercentage);
            const cbd = parseF(this._cbdPercentage);
            if (ww != null && !isNaN(ww)) metrics.wet_weight = ww;
            if (dw != null && !isNaN(dw)) metrics.dry_weight = dw;
            if (tw != null && !isNaN(tw)) metrics.trim_weight = tw;
            if (thc != null && !isNaN(thc)) metrics.thc_percentage = thc;
            if (cbd != null && !isNaN(cbd)) metrics.cbd_percentage = cbd;
            if (this._terpeneProfile.trim()) metrics.terpene_profile = this._terpeneProfile.trim();

            // 3. Harvest the plant, passing metrics directly to the service
            const hasMetrics = Object.keys(metrics).length > 0;
            await this.store.actions.plant.harvest(plant, hasMetrics ? metrics : undefined);
            
            // Note: Delay, refresh data and close are handled by the action module
            this._dispatchClose();
        } finally {
            this._isSubmitting = false;
        }
    }

    private async _skipAndHarvest(): Promise<void> {
        if (!this.dialogState || this._isSubmitting || !this.store) return;
        this._isSubmitting = true;
        try {
            // No scoring – just harvest
            await this.store.actions.plant.harvest(this.dialogState.plant);
            this._dispatchClose();
        } finally {
            this._isSubmitting = false;
        }
    }

    private _dispatchClose(): void {
        this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }

    protected render(): TemplateResult {
        if (!this.open) return html`${nothing}`;

        const plant = this.dialogState?.plant;
        const strainName = plant?.attributes?.strain || 'Unknown';
        const phenotype = plant?.attributes?.phenotype;
        const stage = plant?.attributes?.stage || 'flower';
        const subtitle = [strainName, phenotype].filter(Boolean).join(' — ');

        return html`
      <ha-dialog
        open
        @closed=${this._dispatchClose}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
        width="full"
      >
        <div class="glass-dialog-container" style="--stage-color: #4caf50;">
          <!-- HEADER -->
          <div class="dialog-header">
            <div class="dialog-icon">
              <svg style="width:32px;height:32px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiLeaf}"></path>
              </svg>
            </div>
            <div class="dialog-title-group">
              <div style="display:flex;align-items:center;gap:6px;">
                <h2 class="dialog-title">Phenotype scoring</h2>
                <gs-help-tooltip
                  content="Score your harvest for quality attributes like aroma, density, trichome coverage, and overall yield."
                  placement="bottom"
                  label="Phenotype scoring"
                ></gs-help-tooltip>
              </div>
              <div class="dialog-subtitle">${subtitle}</div>
              <div class="header-stage">${stage}</div>
            </div>
            <button
              class="md3-button text"
              @click=${this._dispatchClose}
              style="min-width: auto; padding: 8px;"
              aria-label="Close"
              ?disabled=${this._isSubmitting}
            >
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiClose}"></path>
              </svg>
            </button>
          </div>

          <hr class="divider" />

          <!-- SCORE GRID -->
          <div class="dialog-content-grid" style="display:block; padding: 24px;">
            <div class="score-grid">
              ${SCORE_DIMENSIONS.map((dim) => this._renderScoreRow(dim))}
            </div>
            <p class="skip-hint">
              All fields are optional — you can harvest without scoring.
            </p>
          </div>

          <hr class="divider" />

          <!-- YIELD METRICS -->
          <div class="metrics-section">
            <p class="metrics-section-title">Yield metrics</p>
            <div class="metrics-grid">
              <div class="metric-field">
                <label for="wet-weight">Wet weight (g)</label>
                <input
                  id="wet-weight"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="e.g. 120"
                  .value=${this._wetWeight}
                  @input=${(e: InputEvent) => { this._wetWeight = (e.target as HTMLInputElement).value; }}
                  ?disabled=${this._isSubmitting}
                />
              </div>
              <div class="metric-field">
                <label for="dry-weight">Dry weight (g)</label>
                <input
                  id="dry-weight"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="e.g. 28"
                  .value=${this._dryWeight}
                  @input=${(e: InputEvent) => { this._dryWeight = (e.target as HTMLInputElement).value; }}
                  ?disabled=${this._isSubmitting}
                />
              </div>
              <div class="metric-field">
                <label for="trim-weight">Trim weight (g)</label>
                <input
                  id="trim-weight"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="e.g. 5"
                  .value=${this._trimWeight}
                  @input=${(e: InputEvent) => { this._trimWeight = (e.target as HTMLInputElement).value; }}
                  ?disabled=${this._isSubmitting}
                />
              </div>
            </div>
          </div>

          <hr class="divider" />

          <!-- LAB RESULTS -->
          <div class="metrics-section">
            <p class="metrics-section-title">Lab results</p>
            <div class="metrics-grid">
              <div class="metric-field">
                <label for="thc-pct">THC (%)</label>
                <input
                  id="thc-pct"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g. 24.5"
                  .value=${this._thcPercentage}
                  @input=${(e: InputEvent) => { this._thcPercentage = (e.target as HTMLInputElement).value; }}
                  ?disabled=${this._isSubmitting}
                />
              </div>
              <div class="metric-field">
                <label for="cbd-pct">CBD (%)</label>
                <input
                  id="cbd-pct"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g. 0.3"
                  .value=${this._cbdPercentage}
                  @input=${(e: InputEvent) => { this._cbdPercentage = (e.target as HTMLInputElement).value; }}
                  ?disabled=${this._isSubmitting}
                />
              </div>
              <div class="metric-field terpene-field">
                <label for="terpene-profile">Terpene profile</label>
                <textarea
                  id="terpene-profile"
                  rows="2"
                  placeholder="e.g. myrcene, limonene, caryophyllene"
                  .value=${this._terpeneProfile}
                  @input=${(e: InputEvent) => { this._terpeneProfile = (e.target as HTMLTextAreaElement).value; }}
                  ?disabled=${this._isSubmitting}
                ></textarea>
              </div>
            </div>
          </div>

          <hr class="divider" />

          <!-- ACTIONS -->
          <div
            style="display:flex; justify-content:space-between; align-items:center; gap:12px; padding: 16px 24px; flex-wrap:wrap;"
          >
            <button
              class="md3-button outlined"
              @click=${this._skipAndHarvest}
              ?disabled=${this._isSubmitting}
            >
              Skip scoring & harvest
            </button>
            <button
              class="md3-button filled"
              style="background: linear-gradient(135deg, #388e3c, #4caf50);"
              @click=${this._submitAndHarvest}
              ?disabled=${this._isSubmitting}
            >
              ${this._isSubmitting ? 'Harvesting…' : '🌾 Save & harvest'}
            </button>
          </div>
        </div>
      </ha-dialog>
    `;
    }

    private _renderScoreRow(dim: ScoreDimension): TemplateResult {
        const currentScore = this._scores[dim.key] as number | null;
        return html`
      <div class="score-row">
        <div class="score-header">
          <span class="score-label">
            <span class="score-emoji">${dim.emoji}</span>
            ${dim.label}
          </span>
          <span class="score-value">
            ${currentScore !== null ? `${currentScore} / 5` : '—'}
          </span>
        </div>
        <p class="score-description">${dim.description}</p>
        <div class="star-row">
          ${[1, 2, 3, 4, 5].map(
            (star) => html`
              <button
                class="star-btn ${currentScore !== null && star <= currentScore ? 'active' : ''}"
                aria-label="Set ${dim.label} score to ${star}"
                @click=${() => this._setScore(dim.key, star)}
                ?disabled=${this._isSubmitting}
              >
                ⭐
              </button>
            `
        )}
        </div>
      </div>
    `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'harvest-scoring-dialog': HarvestScoringDialog;
    }
}
