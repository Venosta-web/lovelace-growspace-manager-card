import { LitElement, html, css, type CSSResultGroup, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { localize } from '../../../localize/localize';
import { variables } from '../../../styles/variables';
import { sharedStyles } from '../../../styles/shared.styles';
import type { TcManifest } from '../../../slices/tc';

/**
 * The tissue-culture view.
 *
 * Empty by design at this point: the V1 model tickets fill it with the
 * due/overdue worklist, the culture board, the medium library and the pairing
 * editor. What it proves today is the whole load path — the presence probe
 * answered, the chunk was fetched, and the element rendered inside a card that
 * ships no TC code in its entry bundle.
 */
@customElement('growspace-tc-view')
export class GrowspaceTcView extends LitElement {
  @property({ attribute: false }) manifest?: TcManifest;
  @property({ type: String }) language = 'en';

  static styles: CSSResultGroup = [
    variables,
    sharedStyles,
    css`
      :host {
        display: block;
      }

      .state {
        padding: 24px 16px;
        text-align: center;
      }

      h3 {
        margin: 0 0 4px;
      }
    `,
  ];

  private _t(key: string): string {
    return localize(`tc.${key}`, '', '', this.language);
  }

  protected render(): TemplateResult {
    return html`
      <div class="state" role="region" aria-label=${this._t('view_title')}>
        <h3>${this._t('empty_title')}</h3>
        <p class="supporting">${this._t('empty_body')}</p>
      </div>
    `;
  }
}
