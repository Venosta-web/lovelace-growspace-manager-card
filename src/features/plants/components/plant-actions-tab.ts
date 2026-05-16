import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import {
  mdiWater,
  mdiDumbbell,
  mdiBug,
  mdiContentCopy,
  mdiPrinter,
  mdiDna,
} from '@mdi/js';
import { storeContext } from '../../../context';
import type { GrowspaceStore } from '../../../store/core/growspace-store';
import type { ActionConfig } from '../viewmodels/plant-overview.viewmodel';
import type { PlantEntity } from '../../../types';
import { sharedStyles } from '../../../styles/shared.styles';

@customElement('plant-actions-tab')
export class PlantActionsTab extends LitElement {
  @consume({ context: storeContext }) private store!: GrowspaceStore;

  @property({ attribute: false }) availableActions!: ActionConfig[];
  @property({ attribute: false }) plant!: PlantEntity;

  @state() private _showScoringForm = false;
  @state() private _savingScore = false;
  @state() private _scoresEdit: Record<string, number | null> = {};
  @state() private _starPreview: Record<string, number | null> = {};

  private static readonly SCORE_DIMENSIONS = [
    { key: 'vigor', label: 'Vigor', description: 'Overall plant health, growth rate, and robustness', emoji: '💪' },
    { key: 'structure', label: 'Structure', description: 'Branch spacing, internodal distance, and bud site density', emoji: '🌿' },
    { key: 'aroma', label: 'Aroma', description: 'Terpene expression — potency and complexity of smell', emoji: '👃' },
    { key: 'resin', label: 'Resin', description: 'Trichome coverage and density', emoji: '💎' },
    { key: 'pest_resistance', label: 'Pest resistance', description: 'Resilience against pests and disease during the run', emoji: '🛡️' },
  ];

  // Icon mapping
  private _iconMap: Record<string, string> = {
    mdiWater,
    mdiDumbbell,
    mdiBug,
    mdiContentCopy,
    mdiPrinter,
    mdiDna,
  };

  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
      }

      .detail-card {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border-radius: 12px;
        padding: 16px;
        grid-column: 1 / -1;
      }

      .detail-card h3 {
        margin: 0 0 16px 0;
        font-size: 1rem;
        font-weight: 500;
        opacity: 0.9;
      }

      .action-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 12px;
      }

      .action-card {
        background: var(--card-background-color, rgba(0, 0, 0, 0.2));
        border-radius: 12px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        transition: all 0.2s;
        border: 2px solid transparent;
      }

      .action-card:not(.disabled):hover {
        background: var(--primary-color, rgba(76, 175, 80, 0.1));
        border-color: var(--primary-color, #4caf50);
        transform: translateY(-2px);
      }

      .action-card.disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .action-card svg {
        width: 32px;
        height: 32px;
        fill: currentColor;
      }

      .action-card span {
        font-size: 0.9rem;
        text-align: center;
      }

      .score-card {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border-radius: 12px;
        padding: 16px;
        margin-top: 16px;
        grid-column: 1 / -1;
      }

      .score-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .score-card h3 {
        margin: 0;
      }

      .md3-button {
        background: transparent;
        border: 1px solid var(--divider-color, rgba(255,255,255,0.2));
        border-radius: 8px;
        color: var(--primary-text-color);
        cursor: pointer;
        font-size: 0.85rem;
        padding: 6px 14px;
      }

      .md3-button.filled {
        background: var(--primary-color, #4caf50);
        border-color: transparent;
        color: #fff;
      }
    `,
  ];

  willUpdate(changedProps: Map<string, unknown>): void {
    if (changedProps.has('plant') && this.plant) {
      const rawScores = (this.plant.attributes?.scores as Record<string, number | null>) || {};
      this._scoresEdit = {
        vigor: rawScores.vigor ?? null,
        structure: rawScores.structure ?? null,
        aroma: rawScores.aroma ?? null,
        resin: rawScores.resin ?? null,
        pest_resistance: rawScores.pest_resistance ?? null,
      };
      this._starPreview = {};
    }
  }

  render(): TemplateResult {
    return html`
      <div class="detail-card">
        <h3>Quick Actions</h3>
        <div class="action-grid">
          ${this.availableActions.map((action) => this._renderActionCard(action))}
        </div>
      </div>
      ${this._renderScorePhenotypeSection()}
    `;
  }

  private _renderActionCard(action: ActionConfig): TemplateResult {
    const iconPath = this._iconMap[action.icon];

    return html`
      <div
        class="action-card ${action.enabled ? '' : 'disabled'}"
        @click=${() => action.enabled && this._handleActionClick(action.id)}
        title="${action.tooltip || action.label}"
      >
        ${iconPath
        ? html`
              <svg viewBox="0 0 24 24">
                <path d="${iconPath}"></path>
              </svg>
            `
        : nothing}
        <span>${action.label}</span>
      </div>
    `;
  }

  private _renderScorePhenotypeSection(): TemplateResult {
    return html`
      <div class="score-card">
        <div class="score-card-header" style="margin-bottom:${this._showScoringForm ? '16px' : '0'};">
          <h3>Score Phenotype</h3>
          <button
            class="md3-button"
            @click=${() => { this._showScoringForm = !this._showScoringForm; }}
          >${this._showScoringForm ? 'Cancel' : 'Score'}</button>
        </div>
        ${this._showScoringForm ? html`
          <div style="display:flex; flex-direction:column; gap:20px; padding:8px 0;">
            ${PlantActionsTab.SCORE_DIMENSIONS.map(dim => this._renderScoreRow(dim))}
          </div>
          <div style="display:flex; justify-content:flex-end; margin-top:16px;">
            <button
              class="md3-button filled"
              @click=${() => this._savePhenotypeScore()}
              ?disabled=${this._savingScore}
            >${this._savingScore ? 'Saving…' : 'Save scores'}</button>
          </div>
        ` : html`
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:12px; pointer-events:none; opacity:0.7;">
            ${PlantActionsTab.SCORE_DIMENSIONS.map(dim => {
              const val = this._scoresEdit[dim.key];
              return html`
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="display:flex; align-items:center; gap:8px; font-size:0.95rem;">
                    <span>${dim.emoji}</span>${dim.label}
                  </span>
                  <span style="font-size:0.95rem; opacity:0.7;">${val !== null && val !== undefined ? `${val} / 5` : '—'}</span>
                </div>
              `;
            })}
          </div>
        `}
      </div>
    `;
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
              ?disabled=${this._savingScore}
            >⭐</button>
          `)}
        </div>
      </div>
    `;
  }

  private _setScore(key: string, value: number): void {
    const current = this._scoresEdit[key];
    this._scoresEdit = { ...this._scoresEdit, [key]: current === value ? null : value };
  }

  private async _savePhenotypeScore(): Promise<void> {
    if (!this.plant?.attributes?.plant_id) return;
    this._savingScore = true;
    try {
      const plantId = this.plant.attributes.plant_id as string;
      await this.store.actions.plant.scorePhenotype(plantId, this._scoresEdit);
      this._showScoringForm = false;
    } catch (e) {
      console.error('Failed to save phenotype scores', e);
    } finally {
      this._savingScore = false;
    }
  }

  private _handleActionClick(actionId: string): void {
    this.dispatchEvent(
      new CustomEvent('action-click', {
        detail: { actionId },
        bubbles: true,
        composed: true,
      })
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'plant-actions-tab': PlantActionsTab;
  }
}
