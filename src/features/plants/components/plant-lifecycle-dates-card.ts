/**
 * Plant Lifecycle Dates Card - Presentational Component
 *
 * Displays and allows editing of plant lifecycle milestone dates.
 * Pure component: props in, events out.
 */

import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiPencil } from '@mdi/js';
import type { PlantOverviewEditedAttributes } from '../../../types';
import { sharedStyles } from '../../../styles/shared.styles';
import '../../../components/ui/md3-date-input';

@customElement('plant-lifecycle-dates-card')
export class PlantLifecycleDatesCard extends LitElement {
  @property({ attribute: false }) editedAttributes!: PlantOverviewEditedAttributes;
  @property({ type: Boolean }) showAllDates = false;

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

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .card-header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 500;
        opacity: 0.9;
      }

      .toggle-button {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: background 0.2s;
        color: var(--primary-text-color);
      }

      .toggle-button:hover {
        background: var(--card-background-color, rgba(0, 0, 0, 0.2));
      }

      .toggle-button svg {
        width: 20px;
        height: 20px;
        fill: currentColor;
      }
    `,
  ];

  render(): TemplateResult {
    return html`
      <div class="detail-card">
        <div class="card-header">
          <h3>Lifecycle Dates</h3>
          <button
            class="toggle-button"
            @click=${this._toggleDates}
            aria-label="Toggle Dates"
            title="Toggle Dates"
          >
            <svg viewBox="0 0 24 24">
              <path d="${mdiPencil}"></path>
            </svg>
          </button>
        </div>

        ${this.showAllDates ? this._renderAllDates() : this._renderCurrentStage()}
      </div>
    `;
  }

  private _renderAllDates(): TemplateResult {
    return html`
      <md3-date-input
        label="Seedling Start"
        .value=${this.editedAttributes.seedling_start ?? ''}
        ?time=${true}
        @change=${(e: CustomEvent) => this._emitAttributeChange('seedling_start', e.detail)}
      ></md3-date-input>
      <md3-date-input
        label="Mother Start"
        .value=${this.editedAttributes.mother_start ?? ''}
        ?time=${true}
        @change=${(e: CustomEvent) => this._emitAttributeChange('mother_start', e.detail)}
      ></md3-date-input>
      <md3-date-input
        label="Clone Start"
        .value=${this.editedAttributes.clone_start ?? ''}
        ?time=${true}
        @change=${(e: CustomEvent) => this._emitAttributeChange('clone_start', e.detail)}
      ></md3-date-input>
      <md3-date-input
        label="Vegetative Start"
        .value=${this.editedAttributes.veg_start ?? ''}
        ?time=${true}
        @change=${(e: CustomEvent) => this._emitAttributeChange('veg_start', e.detail)}
      ></md3-date-input>
      <md3-date-input
        label="Flowering Start"
        .value=${this.editedAttributes.flower_start ?? ''}
        ?time=${true}
        @change=${(e: CustomEvent) => this._emitAttributeChange('flower_start', e.detail)}
      ></md3-date-input>
      <md3-date-input
        label="Dry Start"
        .value=${this.editedAttributes.dry_start ?? ''}
        ?time=${true}
        @change=${(e: CustomEvent) => this._emitAttributeChange('dry_start', e.detail)}
      ></md3-date-input>
      <md3-date-input
        label="Cure Start"
        .value=${this.editedAttributes.cure_start ?? ''}
        ?time=${true}
        @change=${(e: CustomEvent) => this._emitAttributeChange('cure_start', e.detail)}
      ></md3-date-input>
    `;
  }

  private _renderCurrentStage(): TemplateResult {
    // Show only relevant dates based on current values
    const hasVeg = !!this.editedAttributes.veg_start;
    const hasFlower = !!this.editedAttributes.flower_start;
    const hasDry = !!this.editedAttributes.dry_start;
    const hasCure = !!this.editedAttributes.cure_start;

    return html`
      ${hasVeg
        ? html`
            <md3-date-input
              label="Vegetative Start"
              .value=${this.editedAttributes.veg_start ?? ''}
              ?time=${true}
              @change=${(e: CustomEvent) => this._emitAttributeChange('veg_start', e.detail)}
            ></md3-date-input>
          `
        : ''}
      ${hasFlower
        ? html`
            <md3-date-input
              label="Flowering Start"
              .value=${this.editedAttributes.flower_start ?? ''}
              ?time=${true}
              @change=${(e: CustomEvent) => this._emitAttributeChange('flower_start', e.detail)}
            ></md3-date-input>
          `
        : ''}
      ${hasDry
        ? html`
            <md3-date-input
              label="Dry Start"
              .value=${this.editedAttributes.dry_start ?? ''}
              ?time=${true}
              @change=${(e: CustomEvent) => this._emitAttributeChange('dry_start', e.detail)}
            ></md3-date-input>
          `
        : ''}
      ${hasCure
        ? html`
            <md3-date-input
              label="Cure Start"
              .value=${this.editedAttributes.cure_start ?? ''}
              ?time=${true}
              @change=${(e: CustomEvent) => this._emitAttributeChange('cure_start', e.detail)}
            ></md3-date-input>
          `
        : ''}
      ${!hasVeg && !hasFlower && !hasDry && !hasCure
        ? html`<p style="opacity: 0.6; font-size: 0.9rem;">Click the edit button to add dates</p>`
        : ''}
    `;
  }

  private _toggleDates(): void {
    this.dispatchEvent(
      new CustomEvent('toggle-dates', {
        bubbles: true,
        composed: true,
      })
    );
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
    'plant-lifecycle-dates-card': PlantLifecycleDatesCard;
  }
}
