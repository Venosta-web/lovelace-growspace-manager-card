/**
 * Plant Actions Tab - Presentational Component
 *
 * Displays quick action cards for plant management.
 * Pure component: props in, events out.
 */

import { LitElement, html, css, type TemplateResult, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  mdiWater,
  mdiDumbbell,
  mdiBug,
  mdiContentCopy,
  mdiPrinter,
} from '@mdi/js';
import type { ActionConfig } from '../viewmodels/plant-overview.viewmodel';
import { sharedStyles } from '../../../styles/shared.styles';

@customElement('plant-actions-tab')
export class PlantActionsTab extends LitElement {
  @property({ attribute: false }) availableActions!: ActionConfig[];

  // Icon mapping
  private _iconMap: Record<string, string> = {
    mdiWater,
    mdiDumbbell,
    mdiBug,
    mdiContentCopy,
    mdiPrinter,
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
    `,
  ];

  render(): TemplateResult {
    return html`
      <div class="detail-card">
        <h3>Quick Actions</h3>
        <div class="action-grid">
          ${this.availableActions.map((action) => this._renderActionCard(action))}
        </div>
      </div>
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
