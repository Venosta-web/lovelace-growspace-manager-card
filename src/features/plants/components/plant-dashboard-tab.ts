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
  @property({ attribute: false }) growspaceOptions: Record<string, string> = {};
  @property({ type: Boolean }) isEditing = false;
  @property({ type: Boolean }) showAllDates = false;

  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
      }

      .dashboard-grid {
        display: flex;
        flex-direction: column;
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
          .growspaceOptions=${this.growspaceOptions}
          @attribute-change=${this._handleAttributeChange}
          @open-strain-editor=${this._handleOpenStrainEditor}
          @move-plant=${this._handleMovePlant}
        ></plant-identity-card>

        <plant-stats-card .stats=${this.plantStats}></plant-stats-card>

        <plant-lifecycle-dates-card
          .editedAttributes=${this.editedAttributes}
          .showAllDates=${this.showAllDates}
          @attribute-change=${this._handleAttributeChange}
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

  private _handleOpenStrainEditor(e: CustomEvent): void {
    // Bubble up to container
    this.dispatchEvent(
      new CustomEvent('open-strain-editor', {
        detail: e.detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleMovePlant(e: CustomEvent): void {
    // Bubble up to container
    this.dispatchEvent(
      new CustomEvent('move-plant', {
        detail: e.detail,
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
