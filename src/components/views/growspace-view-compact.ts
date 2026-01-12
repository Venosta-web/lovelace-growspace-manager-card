import { LitElement, html, TemplateResult } from 'lit';
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

  public focusPlant(index: number) {
    const grid = this.shadowRoot?.querySelector('growspace-grid');
    if (grid) {
      (grid as any).focusPlant(index);
    }
  }

  static styles = [variables, sharedStyles, uiStyles, growspaceCardStyles];

  protected render(): TemplateResult {
    return html`
      <div class="view-mode-container compact">
        <growspace-grid
          .plants=${this.grid}
          .rows=${this.rows}
          .cols=${this.cols}
        ></growspace-grid>

        <button
          class="md3-button compact-exit-fab"
          @click=${() => this._dispatchModeChange('standard')}
          title="Exit Compact Mode"
        >
          <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiFullscreenExit}"></path>
          </svg>
        </button>
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
