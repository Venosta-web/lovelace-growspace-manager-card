/**
 * Plant Dashboard Tab - Presentational Component
 *
 * Composes identity, stats, and lifecycle cards into dashboard view.
 * Pure component: props in, events out.
 */

import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { PlantEntity, PlantOverviewEditedAttributes } from '../../../types';
import type { PlantStat } from '../viewmodels/plant-overview.viewmodel';
import { sharedStyles } from '../../../styles/shared.styles';
import './plant-identity-card';
import './plant-stats-card';
import './plant-lifecycle-dates-card';

@customElement('plant-dashboard-tab')
export class PlantDashboardTab extends LitElement {
  @property({ attribute: false }) plant!: PlantEntity;
  @property({ attribute: false }) editedAttributes!: PlantOverviewEditedAttributes;
  @property({ attribute: false }) plantStats!: PlantStat[];
  @property({ type: Boolean }) isEditing = false;
  @property({ type: Boolean }) showAllDates = false;

  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
      }

      .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 16px;
      }
    `,
  ];

  render(): TemplateResult {
    return html`
      <div class="dashboard-grid">
        <plant-identity-card
          .plant=${this.plant}
          .editedAttributes=${this.editedAttributes}
          .isEditing=${this.isEditing}
          @attribute-change=${this._handleAttributeChange}
        ></plant-identity-card>

        <plant-stats-card .stats=${this.plantStats}></plant-stats-card>

        <plant-lifecycle-dates-card
          .editedAttributes=${this.editedAttributes}
          .showAllDates=${this.showAllDates}
          @attribute-change=${this._handleAttributeChange}
          @toggle-dates=${this._handleToggleDates}
        ></plant-lifecycle-dates-card>
      </div>
    `;
  }

  private _handleAttributeChange(e: CustomEvent): void {
    // Bubble up to container
    this.dispatchEvent(
      new CustomEvent('attribute-change', {
        detail: e.detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleToggleDates(): void {
    // Bubble up to container
    this.dispatchEvent(
      new CustomEvent('toggle-dates', {
        bubbles: true,
        composed: true,
      })
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'plant-dashboard-tab': PlantDashboardTab;
  }
}
