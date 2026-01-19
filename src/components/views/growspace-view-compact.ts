import { LitElement, html, css, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiFullscreenExit } from '@mdi/js';
import { PlantEntity } from '../../types';
import '../growspace-grid';
import { growspaceCardStyles } from '../../styles/growspace-card.styles';
import { sharedStyles } from '../../styles/shared.styles';
import { uiStyles } from '../../styles/ui.styles';
import { variables } from '../../styles/variables';

@customElement('growspace-view-compact')
export class GrowspaceViewCompact extends LitElement {
  @property({ attribute: false }) grid: (PlantEntity | null)[][] = [];
  @property({ type: Number }) rows = 0;
  @property({ type: Number }) cols = 0;
  @property({ type: Boolean }) isLoading = false;

  static styles = [
    growspaceCardStyles,
    sharedStyles,
    uiStyles,
    variables,
    css`
      :host {
        display: block;
        position: relative;
      }
      .view-mode-container {
        position: relative;
      }
      .compact-controls {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        width: 100%;
        margin-bottom: 8px;
        gap: 8px;
      }
      .compact-exit-fab {
        width: 40px;
        height: 40px;
        padding: 0;
        border-radius: 50%;
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.1));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--primary-text-color, #fff);
        cursor: pointer;
        transition: all 0.2s;
      }
      .compact-exit-fab:hover {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.2));
      }
      .compact-exit-fab svg {
        width: 22px;
        height: 22px;
        fill: currentColor;
      }
    `,
  ];

  public focusPlant(index: number) {
    const grid = this.shadowRoot?.querySelector('growspace-grid');
    if (grid) {
      (grid as any).focusPlant(index);
    }
  }

  protected render(): TemplateResult {
    return html`
      <div class="compact-controls">
        <button
          class="compact-exit-fab"
          @click=${() => this._dispatchModeChange('standard')}
          title="Exit Compact Mode"
        >
          <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiFullscreenExit}"></path>
          </svg>
        </button>
      </div>
      <div class="view-mode-container compact">
        <growspace-grid .plants=${this.grid} .rows=${this.rows} .cols=${this.cols}></growspace-grid>
      </div>
    `;
  }

  private _dispatchModeChange(mode: string) {
    this.dispatchEvent(
      new CustomEvent('view-mode-changed', {
        detail: { mode },
        bubbles: true,
        composed: true,
      })
    );
  }
}
