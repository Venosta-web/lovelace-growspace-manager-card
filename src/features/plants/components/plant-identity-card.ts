/**
 * Plant Identity Card - Presentational Component
 *
 * Displays and allows editing of plant identity and location information.
 * Pure component: props in, events out.
 */

import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { PlantEntity, PlantOverviewEditedAttributes } from '../../../types';
import { sharedStyles } from '../../../styles/shared.styles';
import '../../../components/ui/md3-text-input';
import '../../../components/ui/md3-number-input';

@customElement('plant-identity-card')
export class PlantIdentityCard extends LitElement {
  @property({ attribute: false }) plant!: PlantEntity;
  @property({ attribute: false }) editedAttributes!: PlantOverviewEditedAttributes;
  @property({ type: Boolean }) isEditing = false;

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
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
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

      .input-row {
        display: flex;
        gap: 16px;
      }

      .input-row > * {
        flex: 1;
      }
    `,
  ];

  render(): TemplateResult {
    return html`
      <div class="detail-card">
        <h3>Identity & Location</h3>
        ${this.isEditing ? this._renderEditMode() : this._renderViewMode()}
      </div>
    `;
  }

  private _renderEditMode(): TemplateResult {
    return html`
      <md3-text-input
        label="Strain Name"
        .value=${this.editedAttributes.strain || ''}
        @change=${(e: CustomEvent) => this._emitAttributeChange('strain', e.detail)}
      ></md3-text-input>
      <md3-text-input
        label="Phenotype"
        .value=${this.editedAttributes.phenotype || ''}
        @change=${(e: CustomEvent) => this._emitAttributeChange('phenotype', e.detail)}
      ></md3-text-input>

      <div class="input-row">
        <md3-number-input
          label="Row"
          .value=${this.editedAttributes.row ?? ''}
          @change=${(e: CustomEvent) => this._emitAttributeChange('row', e.detail)}
        ></md3-number-input>
        <md3-number-input
          label="Column"
          .value=${this.editedAttributes.col ?? ''}
          @change=${(e: CustomEvent) => this._emitAttributeChange('col', e.detail)}
        ></md3-number-input>
      </div>
    `;
  }

  private _renderViewMode(): TemplateResult {
    return html`
      <div class="stat-grid">
        <div class="stat-item">
          <span class="stat-value">${this.plant.attributes?.strain || 'Unknown'}</span>
          <span class="stat-label">Strain</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${this.plant.attributes?.phenotype || 'N/A'}</span>
          <span class="stat-label">Phenotype</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${this.plant.attributes?.row ?? '-'}</span>
          <span class="stat-label">Row</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${this.plant.attributes?.col ?? '-'}</span>
          <span class="stat-label">Col</span>
        </div>
      </div>
    `;
  }

  private _emitAttributeChange(key: string, value: unknown): void {
    this.dispatchEvent(
      new CustomEvent('attribute-change', {
        detail: { key, value },
        bubbles: true,
        composed: true,
      })
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'plant-identity-card': PlantIdentityCard;
  }
}
