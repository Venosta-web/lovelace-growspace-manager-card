import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiChevronDown } from '@mdi/js';
import { GrowspaceDevice } from '../../types';
import '../growspace-header';
import { growspaceCardStyles } from '../../styles/growspace-card.styles';
import { sharedStyles } from '../../styles/shared.styles';
import { uiStyles } from '../../styles/ui.styles';
import { variables } from '../../styles/variables';

@customElement('growspace-view-header')
export class GrowspaceViewHeader extends LitElement {
  @property({ attribute: false }) device: GrowspaceDevice | undefined;
  @property({ attribute: false }) growspaceOptions: Record<string, string> = {};

  static styles = [variables, sharedStyles, uiStyles, growspaceCardStyles];

  protected render(): TemplateResult {
    if (!this.device) return html``;

    return html`
      <div class="view-mode-container header">
        <growspace-header
          .device=${this.device}
          .growspaceOptions=${this.growspaceOptions}
          @growspace-changed=${(e: CustomEvent) => this._redispatch(e, 'growspace-changed')}
        ></growspace-header>
        <button class="expand-handle" @click=${this._dispatchToggle}>
          <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiChevronDown}"></path>
          </svg>
        </button>
      </div>
    `;
  }

  private _redispatch(e: CustomEvent, type: string) {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent(type, {
        detail: e.detail || (e.target as HTMLSelectElement).value, // Fallback if it was a raw change event
        bubbles: true,
        composed: true,
      })
    );
  }

  private _dispatchToggle() {
    this.dispatchEvent(new CustomEvent('toggle-expansion', { bubbles: true, composed: true }));
  }
}
