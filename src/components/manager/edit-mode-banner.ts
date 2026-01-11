import { LitElement, html, css, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  mdiCheckboxMarked,
  mdiSelectAll,
  mdiSelectionOff,
  mdiWater,
  mdiDumbbell,
  mdiBug,
  mdiClose
} from '@mdi/js';
import { sharedStyles } from '../../styles/shared.styles';
import { uiStyles } from '../../styles/ui.styles';

@customElement('growspace-edit-mode-banner')
export class EditModeBanner extends LitElement {
  @property({ type: Number }) accessor selectedCount = 0;

  static styles = [
    sharedStyles,
    uiStyles,
    css`
      :host {
        display: block;
      }
      .edit-mode-banner {
        background: linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(76, 175, 80, 0.25));
        border: 1px solid rgba(76, 175, 80, 0.4);
        border-radius: 12px;
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        animation: slideDown 0.3s ease;
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .banner-content {
        display: flex;
        align-items: center;
        gap: 12px;
        color: var(--primary-text-color, #fff);
        font-weight: 500;
        font-size: 0.95rem;
      }

      .banner-content svg {
        width: 20px;
        height: 20px;
        fill: currentColor;
      }

      .banner-actions {
        display: flex;
        gap: 8px;
      }
    `
  ];

  protected render(): TemplateResult {
    return html`
      <div class="edit-mode-banner">
        <div class="banner-content">
          <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiCheckboxMarked}"></path>
          </svg>
          <span>${this.selectedCount} plant(s) selected</span>
        </div>
        <div class="banner-actions">
          <button class="md3-button text" @click=${() => this._dispatch('select-all')}>
            <svg style="width:18px;height:18px;fill:currentColor;margin-right:8px;" viewBox="0 0 24 24"><path d="${mdiSelectAll}"></path></svg>
            Select All
          </button>
          <button class="md3-button text" @click=${() => this._dispatch('clear-selection')}>
            <svg style="width:18px;height:18px;fill:currentColor;margin-right:8px;" viewBox="0 0 24 24"><path d="${mdiSelectionOff}"></path></svg>
            Clear
          </button>
          <button class="md3-button text" @click=${() => this._dispatch('water-selected')}>
            <svg style="width:18px;height:18px;fill:currentColor;margin-right:8px;" viewBox="0 0 24 24"><path d="${mdiWater}"></path></svg>
            Water / Nutrients
          </button>
          <button class="md3-button text" @click=${() => this._dispatch('training-selected')}>
            <svg style="width:18px;height:18px;fill:currentColor;margin-right:8px;" viewBox="0 0 24 24"><path d="${mdiDumbbell}"></path></svg>
            Log Training
          </button>
          <button class="md3-button text" @click=${() => this._dispatch('ipm-selected')}>
            <svg style="width:18px;height:18px;fill:currentColor;margin-right:8px;" viewBox="0 0 24 24"><path d="${mdiBug}"></path></svg>
            Log IPM
          </button>
          <button class="md3-button text" @click=${() => this._dispatch('exit-edit-mode')}>
            <svg style="width:18px;height:18px;fill:currentColor;margin-right:8px;" viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg>
            Exit
          </button>
        </div>
      </div>
    `;
  }

  private _dispatch(event: string) {
    this.dispatchEvent(new CustomEvent(event, { bubbles: true, composed: true }));
  }
}
