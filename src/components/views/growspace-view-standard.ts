import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiChevronUp } from '@mdi/js';
import { GrowspaceDevice, GrowspaceManagerCardConfig, PlantEntity } from '../../types';
import '../growspace-header';
import '../growspace-analytics';
import '../growspace-grid';
import '../manager/edit-mode-banner';
import { growspaceCardStyles } from '../../styles/growspace-card.styles';
import { sharedStyles } from '../../styles/shared.styles';
import { uiStyles } from '../../styles/ui.styles';
import { variables } from '../../styles/variables';

@customElement('growspace-view-standard')
export class GrowspaceViewStandard extends LitElement {
  @property({ attribute: false }) device: GrowspaceDevice | undefined;
  @property({ attribute: false }) growspaceOptions: Record<string, string> = {};
  @property({ attribute: false }) grid: (PlantEntity | null)[][] = [];
  @property({ type: Number }) rows = 0;
  @property({ type: Number }) cols = 0;
  @property({ type: Boolean }) isLoading = false;
  @property({ type: Boolean }) isEditMode = false;
  @property({ type: Boolean }) isCompact = false;
  @property({ type: Number }) selectedCount = 0;
  @property({ attribute: false }) config: GrowspaceManagerCardConfig | undefined;

  public focusPlant(index: number) {
    const grid = this.shadowRoot?.querySelector('growspace-grid');
    if (grid) {
      (grid as any).focusPlant(index);
    }
  }

  static styles = [variables, sharedStyles, uiStyles, growspaceCardStyles];

  protected render(): TemplateResult {
    if (!this.device) return html``;

    return html`
      <growspace-header
        .device=${this.device}
        .growspaceOptions=${this.growspaceOptions}
        @growspace-changed=${(e: CustomEvent) => this._redispatch(e, 'growspace-changed')}
      ></growspace-header>

      <growspace-analytics .device=${this.device}></growspace-analytics>

      ${this.isEditMode
        ? html`
            <growspace-edit-mode-banner
              .selectedCount=${this.selectedCount}
              @batch-add-plants=${(e: CustomEvent) => this._redispatch(e, 'batch-add-plants')}
            ></growspace-edit-mode-banner>
          `
        : ''}

      <growspace-grid
        .plants=${this.grid}
        .rows=${this.rows}
        .cols=${this.cols}
      ></growspace-grid>

      ${this.config?.initial_view_mode === 'header'
        ? html`
            <button class="collapse-handle" @click=${this._dispatchToggle}>
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiChevronUp}"></path>
              </svg>
            </button>
          `
        : ''}
    `;
  }

  private _redispatch(e: CustomEvent, type: string) {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent(type, {
        detail: e.detail || (e.target as HTMLSelectElement).value,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _dispatchToggle() {
    this.dispatchEvent(
      new CustomEvent('toggle-expansion', { bubbles: true, composed: true })
    );
  }
}
