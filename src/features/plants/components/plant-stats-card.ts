/**
 * Plant Stats Card - Presentational Component
 *
 * Displays plant statistics in a grid layout.
 * Pure component: props in, no events out (read-only display).
 */

import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { PlantStat } from '../viewmodels/plant-overview.viewmodel';
import { sharedStyles } from '../../../styles/shared.styles';

@customElement('plant-stats-card')
export class PlantStatsCard extends LitElement {
  @property({ attribute: false }) stats!: PlantStat[];

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
      }

      .detail-card h3 {
        margin: 0 0 16px 0;
        font-size: 1rem;
        font-weight: 500;
        opacity: 0.9;
      }

      .stat-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 12px;
      }

      .stat-item {
        background: var(--card-background-color, rgba(0, 0, 0, 0.2));
        border-radius: 8px;
        padding: 12px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      .stat-value {
        font-size: 1.1rem;
        font-weight: 500;
      }

      .stat-label {
        font-size: 0.75rem;
        opacity: 0.7;
      }

      .stat-unit {
        font-size: 0.9rem;
        opacity: 0.8;
        margin-left: 2px;
      }
    `,
  ];

  render(): TemplateResult {
    if (!this.stats || this.stats.length === 0) {
      return html``;
    }

    return html`
      <div class="detail-card">
        <h3>Plant Statistics</h3>
        <div class="stat-grid">
          ${this.stats.map((stat) => this._renderStatItem(stat))}
        </div>
      </div>
    `;
  }

  private _renderStatItem(stat: PlantStat): TemplateResult {
    return html`
      <div class="stat-item">
        <span class="stat-value">
          ${stat.value}
          ${stat.unit ? html`<span class="stat-unit">${stat.unit}</span>` : ''}
        </span>
        <span class="stat-label">${stat.label}</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'plant-stats-card': PlantStatsCard;
  }
}
