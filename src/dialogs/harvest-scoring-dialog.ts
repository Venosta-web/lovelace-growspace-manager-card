import { LitElement, html, css, nothing, type TemplateResult, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { hassContext, storeContext } from '../context';
import { mdiClose, mdiLeaf } from '@mdi/js';
import type { GrowspaceStore } from '../store/core/growspace-store';
import type { HomeAssistant } from 'custom-card-helpers';
import type { HarvestScoringDialogState } from '../lib/types/dialog';
import { dialogStyles } from '../styles/dialog.styles';
import '../features/shared/ui/gs-help-tooltip';
import {
  createInitialSM,
  transition,
  isScoringEmpty,
  parseMetrics,
  type SM,
  type TabId,
  type ScoringDraft,
  type MetricsDraft,
} from './harvest-scoring-dialog-sm';

/** Score dimension descriptor */
interface ScoreDimension {
  key: keyof ScoringDraft;
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
    key: 'internodal_spacing',
    label: 'Structure',
    description: 'Branch spacing, internodal distance, and bud site density',
    emoji: '🌿',
  },
  {
    key: 'terpene_intensity',
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
    key: 'mold_resistance',
    label: 'Pest resistance',
    description: 'Resilience against pests and disease during the run',
    emoji: '🛡️',
  },
];

@customElement('harvest-scoring-dialog')
export class HarvestScoringDialog extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  public hass!: HomeAssistant;

  @consume({ context: storeContext, subscribe: true })
  public store!: GrowspaceStore;

  @property({ type: Boolean }) public open = false;
  @property({ attribute: false }) public dialogState: HarvestScoringDialogState | undefined;

  @state() private _sm: SM = createInitialSM();

  static styles = [
    dialogStyles,
    css`
      .tab-bar {
        display: flex;
        gap: 4px;
        padding: 0 24px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      }

      .tab-btn {
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        color: var(--primary-text-color);
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 500;
        opacity: 0.6;
        padding: 10px 16px;
        transition: opacity 0.15s, border-color 0.15s;
      }

      .tab-btn.active {
        border-bottom-color: var(--primary-color, #4caf50);
        opacity: 1;
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
        transition:
          transform 0.1s,
          filter 0.15s;
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
        background: var(--card-background-color, rgba(255, 255, 255, 0.06));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.15));
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

      .confirm-bar {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 16px 24px;
        background: rgba(255, 152, 0, 0.08);
        border-top: 1px solid rgba(255, 152, 0, 0.2);
      }

      .confirm-text {
        font-size: 0.85rem;
        opacity: 0.8;
      }

      .error-banner {
        padding: 12px 24px;
        background: rgba(244, 67, 54, 0.12);
        border-top: 1px solid rgba(244, 67, 54, 0.3);
        font-size: 0.85rem;
        color: var(--error-color, #f44336);
      }
    `,
  ];

  protected override willUpdate(changedProps: Map<string, unknown>): void {
    if (changedProps.has('open') && this.open) {
      this._sm = createInitialSM(this.dialogState);
    }
  }

  private _transition(event: Parameters<typeof transition>[1]): void {
    this._sm = transition(this._sm, event);
  }

  private _selectTab(tab: TabId): void {
    this._transition({ type: 'TabSelected', tab });
  }

  private _setScore(key: keyof ScoringDraft, star: number): void {
    const current = this._sm.tabs.scoring.draft[key];
    this._transition({
      type: 'DraftFieldChanged',
      tab: 'scoring',
      field: key,
      value: current === star ? null : star,
    });
  }

  private _setMetricField(field: keyof MetricsDraft, value: string): void {
    this._transition({ type: 'DraftFieldChanged', tab: 'metrics', field, value });
  }

  private _handleSaveClicked(): void {
    this._transition({ type: 'SaveRequested' });
  }

  private _handleSkipClicked(): void {
    this._transition({ type: 'SkipRequested' });
  }

  private _handleHarvestCancelled(): void {
    this._transition({ type: 'HarvestCancelled' });
  }

  private async _handleHarvestConfirmed(): Promise<void> {
    if (this._sm.status.kind !== 'confirming' || !this.dialogState) return;
    const mode = this._sm.status.mode;
    this._transition({ type: 'HarvestConfirmed' });

    const plant = this.dialogState.plant;
    const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');

    try {
      if (mode === 'save') {
        if (!isScoringEmpty(this._sm)) {
          await this.store.actions.plant.scorePhenotype(plantId, this._sm.tabs.scoring.draft);
        }
        const metrics = parseMetrics(this._sm.tabs.metrics.draft);
        await this.store.actions.plant.harvest(
          plant,
          Object.keys(metrics).length > 0 ? metrics : undefined
        );
      } else {
        await this.store.actions.plant.harvest(plant);
      }
      this._transition({ type: 'SaveResolved' });
      this._dispatchClose();
    } catch (e) {
      this._transition({ type: 'SaveFailed', message: e instanceof Error ? e.message : 'Harvest failed' });
    }
  }

  private _dispatchClose(): void {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  protected override render(): TemplateResult {
    if (!this.open) return html`${nothing}`;

    const plant = this.dialogState?.plant;
    const strainName = plant?.attributes?.strain || 'Unknown';
    const phenotype = plant?.attributes?.phenotype;
    const stage = plant?.attributes?.stage || 'flower';
    const subtitle = [strainName, phenotype].filter(Boolean).join(' — ');
    const sm = this._sm;
    const isBusy = sm.status.kind === 'applying';

    return html`
      <ha-dialog
        open
        @closed=${this._dispatchClose}
        hideActions
        without-header
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
        width="large"
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
              ?disabled=${isBusy}
            >
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiClose}"></path>
              </svg>
            </button>
          </div>

          <!-- TAB BAR -->
          <div class="tab-bar">
            <button
              class="tab-btn ${sm.activeTab === 'scoring' ? 'active' : ''}"
              @click=${() => this._selectTab('scoring')}
              ?disabled=${isBusy}
            >Scoring</button>
            <button
              class="tab-btn ${sm.activeTab === 'metrics' ? 'active' : ''}"
              @click=${() => this._selectTab('metrics')}
              ?disabled=${isBusy}
            >Yield &amp; Lab</button>
          </div>

          <!-- TAB CONTENT -->
          ${sm.activeTab === 'scoring' ? this._renderScoringTab() : this._renderMetricsTab()}

          <!-- ERROR BANNER -->
          ${sm.status.kind === 'error'
            ? html`<div class="error-banner">${sm.status.message}</div>`
            : nothing}

          <!-- ACTIONS -->
          ${sm.status.kind === 'confirming'
            ? this._renderConfirmBar()
            : this._renderActionBar()}
        </div>
      </ha-dialog>
    `;
  }

  private _renderScoringTab(): TemplateResult {
    const sm = this._sm;
    const isBusy = sm.status.kind === 'applying';
    return html`
      <div class="dialog-content-grid" style="display:block; padding: 24px;">
        <div class="score-grid">
          ${SCORE_DIMENSIONS.map((dim) => this._renderScoreRow(dim, isBusy))}
        </div>
        <p class="skip-hint">All fields are optional — you can harvest without scoring.</p>
      </div>
    `;
  }

  private _renderMetricsTab(): TemplateResult {
    const { draft } = this._sm.tabs.metrics;
    const isBusy = this._sm.status.kind === 'applying';
    return html`
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
              .value=${draft.wetWeight}
              @input=${(e: InputEvent) => this._setMetricField('wetWeight', (e.target as HTMLInputElement).value)}
              ?disabled=${isBusy}
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
              .value=${draft.dryWeight}
              @input=${(e: InputEvent) => this._setMetricField('dryWeight', (e.target as HTMLInputElement).value)}
              ?disabled=${isBusy}
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
              .value=${draft.trimWeight}
              @input=${(e: InputEvent) => this._setMetricField('trimWeight', (e.target as HTMLInputElement).value)}
              ?disabled=${isBusy}
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
              .value=${draft.thcPercentage}
              @input=${(e: InputEvent) => this._setMetricField('thcPercentage', (e.target as HTMLInputElement).value)}
              ?disabled=${isBusy}
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
              .value=${draft.cbdPercentage}
              @input=${(e: InputEvent) => this._setMetricField('cbdPercentage', (e.target as HTMLInputElement).value)}
              ?disabled=${isBusy}
            />
          </div>
          <div class="metric-field terpene-field">
            <label for="terpene-profile">Terpene profile</label>
            <textarea
              id="terpene-profile"
              rows="2"
              placeholder="e.g. myrcene, limonene, caryophyllene"
              .value=${draft.terpeneProfile}
              @input=${(e: InputEvent) => this._setMetricField('terpeneProfile', (e.target as HTMLTextAreaElement).value)}
              ?disabled=${isBusy}
            ></textarea>
          </div>
        </div>
      </div>
    `;
  }

  private _renderConfirmBar(): TemplateResult {
    return html`
      <div class="confirm-bar">
        <p class="confirm-text">
          Harvest is permanent and cannot be undone. Confirm to proceed.
        </p>
        <div style="display:flex; justify-content:flex-end; gap:12px;">
          <button class="md3-button outlined" @click=${this._handleHarvestCancelled}>Cancel</button>
          <button
            class="md3-button filled"
            style="background: linear-gradient(135deg, #388e3c, #4caf50);"
            @click=${this._handleHarvestConfirmed}
          >
            Confirm harvest
          </button>
        </div>
      </div>
    `;
  }

  private _renderActionBar(): TemplateResult {
    const sm = this._sm;
    const isBusy = sm.status.kind === 'applying';
    return html`
      <div
        style="display:flex; justify-content:space-between; align-items:center; gap:12px; padding: 16px 24px; flex-wrap:wrap;"
      >
        <button
          class="md3-button outlined"
          @click=${this._handleSkipClicked}
          ?disabled=${isBusy}
        >
          Skip scoring &amp; harvest
        </button>
        <button
          class="md3-button filled"
          style="background: linear-gradient(135deg, #388e3c, #4caf50);"
          @click=${this._handleSaveClicked}
          ?disabled=${isBusy}
        >
          ${isBusy ? 'Harvesting…' : '🌾 Save & harvest'}
        </button>
      </div>
    `;
  }

  private _renderScoreRow(dim: ScoreDimension, disabled: boolean): TemplateResult {
    const currentScore = this._sm.tabs.scoring.draft[dim.key];
    return html`
      <div class="score-row">
        <div class="score-header">
          <span class="score-label">
            <span class="score-emoji">${dim.emoji}</span>
            ${dim.label}
          </span>
          <span class="score-value"> ${currentScore !== null ? `${currentScore} / 5` : '—'} </span>
        </div>
        <p class="score-description">${dim.description}</p>
        <div class="star-row">
          ${[1, 2, 3, 4, 5].map(
            (star) => html`
              <button
                class="star-btn ${currentScore !== null && star <= currentScore ? 'active' : ''}"
                aria-label="Set ${dim.label} score to ${star}"
                @click=${() => this._setScore(dim.key, star)}
                ?disabled=${disabled}
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
