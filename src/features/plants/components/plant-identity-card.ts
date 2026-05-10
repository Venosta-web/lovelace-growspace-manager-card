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
import { mdiDna } from '@mdi/js';
import '../../shared/ui/md3-text-input';
import '../../shared/ui/md3-number-input';
import '../../shared/ui/md3-select';

@customElement('plant-identity-card')
export class PlantIdentityCard extends LitElement {
  @property({ attribute: false }) plant!: PlantEntity;
  @property({ attribute: false }) editedAttributes!: PlantOverviewEditedAttributes;
  @property({ attribute: false }) growspaceOptions: Record<string, string> = {};
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

      .stat-row {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
      }

      .stat-item.actionable {
        cursor: pointer;
        transition: background 0.2s;
        position: relative;
      }

      .stat-item.actionable:hover {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.1));
      }

      .edit-btn {
        background: transparent;
        border: none;
        color: var(--primary-color);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.6;
        transition: all 0.2s;
      }

      .edit-btn:hover {
        opacity: 1;
        background: rgba(var(--rgb-primary-color), 0.1);
      }

      .edit-btn svg {
        width: 16px;
        height: 16px;
        fill: currentColor;
      }

      .input-with-action {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        width: 100%;
      }

      .input-with-action md3-text-input {
        flex: 1;
      }

      .input-action-btn {
        background: var(--card-background-color, rgba(0, 0, 0, 0.2));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        border-radius: 8px;
        color: var(--primary-color);
        cursor: pointer;
        padding: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        margin-top: 4px;
      }

      .input-action-btn:hover {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.1));
        border-color: var(--primary-color);
      }

      .input-action-btn svg {
        width: 20px;
        height: 20px;
        fill: currentColor;
      }

      .location-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .location-header h4 {
        margin: 0;
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        opacity: 0.6;
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
      <div class="input-with-action">
        <md3-text-input
          label="Strain Name"
          .value=${this.editedAttributes.strain || ''}
          @change=${(e: CustomEvent) => this._emitAttributeChange('strain', e.detail)}
        ></md3-text-input>
        <button class="input-action-btn" @click=${this._handleOpenStrainEditor} title="Open Strain Library Editor">
          <svg viewBox="0 0 24 24"><path d="${mdiDna}"></path></svg>
        </button>
      </div>
      <md3-text-input
        label="Phenotype"
        .value=${this.editedAttributes.phenotype || ''}
        @change=${(e: CustomEvent) => this._emitAttributeChange('phenotype', e.detail)}
      ></md3-text-input>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--divider-color, rgba(255,255,255,0.08));">
        <div class="location-header">
          <h4>Location</h4>
        </div>

        <div style="display: flex; align-items: flex-end; gap: 12px; margin-bottom: 16px;">
          <md3-select
            label="Move to Growspace"
            .value=${this.plant.attributes?.growspace_id || ''}
            .options=${Object.entries(this.growspaceOptions).map(([id, name]) => ({ label: name, value: id }))}
            style="flex: 1;"
            @change=${this._handleMovePlant}
          ></md3-select>
        </div>

        <div class="input-row" style="display: flex; gap: 16px;">
          <md3-number-input
            style="flex: 1;"
            label="Row"
            .value=${this.editedAttributes.row ?? ''}
            @change=${(e: CustomEvent) => this._emitAttributeChange('row', e.detail)}
          ></md3-number-input>
          <md3-number-input
            style="flex: 1;"
            label="Column"
            .value=${this.editedAttributes.col ?? ''}
            @change=${(e: CustomEvent) => this._emitAttributeChange('col', e.detail)}
          ></md3-number-input>
        </div>
      </div>
    `;
  }

  private _renderViewMode(): TemplateResult {
    return html`
      <div class="stat-grid">
        <div class="stat-item actionable" @click=${this._handleOpenStrainEditor} title="Click to open Strain Library Entry">
          <div class="stat-row">
            <span class="stat-value" style="flex:1;">${this.plant.attributes?.strain || 'Unknown'}</span>
            <div class="edit-btn">
              <svg viewBox="0 0 24 24"><path d="${mdiDna}"></path></svg>
            </div>
          </div>
          <span class="stat-label">Strain</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${this.plant.attributes?.phenotype || 'N/A'}</span>
          <span class="stat-label">Phenotype</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${this.growspaceOptions[this.plant.attributes?.growspace_id || ''] || 'Unknown'}</span>
          <span class="stat-label">Growspace</span>
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

  private _handleOpenStrainEditor(): void {
    const strain = this.isEditing ? this.editedAttributes.strain : this.plant.attributes?.strain;
    const phenotype = this.isEditing ? this.editedAttributes.phenotype : this.plant.attributes?.phenotype;
    this.dispatchEvent(
      new CustomEvent('open-strain-editor', {
        detail: { strain: strain || '', phenotype: phenotype || '' },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleMovePlant(e: CustomEvent): void {
    const targetId = e.detail;
    if (targetId === this.plant.attributes?.growspace_id) return;
    
    this.dispatchEvent(
      new CustomEvent('move-plant', {
        detail: { targetId },
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
