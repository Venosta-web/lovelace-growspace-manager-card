import { LitElement, html, css, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { localize } from '../../../localize/localize';
import { variables } from '../../../styles/variables';
import { sharedStyles } from '../../../styles/shared.styles';
import {
  tcSurfaces,
  TC_FEATURE_MAINTENANCE,
  type TcManifest,
  type TcSurfaceId,
} from '../../../slices/tc';
import './growspace-tc-cultures.container';
import './growspace-tc-media.container';
import './growspace-tc-pairings.container';

/**
 * The tissue-culture view.
 *
 * It composes TC's four surfaces — the due/overdue worklist, the culture board,
 * the Culture Medium library and the curated pairing editor — and owns none of
 * them. The worklist leads because it is the answer to the question a grower
 * opens this view with: what has to be replated. The board is what they reach
 * for once that is done.
 *
 * Which surfaces exist is `tcSurfaces(manifest)`'s answer, not this element's:
 * every surface is gated on a manifest feature rather than on the installed
 * release, because a TC that predates the medium library answers the presence
 * probe perfectly well, and the honest response to that is a view without a
 * library rather than a library whose every call fails.
 *
 * **Two hosts mount this element**: the standalone `growspace-tc-card`, which
 * sets no `surface` and gets the stacked composition, and the Tissue Culture
 * dialog, which names one surface per tab. So it holds no state, reads no
 * `hass`, no context and no per-card store, and declares neither height nor
 * overflow — the chrome, the geometry and what a plant link means belong to the
 * host, and the seam between the two is this property interface.
 */
@customElement('growspace-tc-view')
export class GrowspaceTcView extends LitElement {
  @property({ attribute: false }) manifest?: TcManifest;
  @property({ type: String }) language = 'en';

  /**
   * Which surface to show. Omitted means all of them, stacked.
   *
   * A rendered surface stays mounted: this hides the others and never unmounts
   * them. Every surface owns its own fetch, subscriptions and drafts, so
   * unmounting one drops an in-progress Replate, a half-typed Culture Medium, a
   * Pairing edit and the clock the worklist is judged against. That is the
   * ADR-0019 exception recorded in ADR 0055, and it is the one rule the
   * implementation must not break.
   */
  @property({ type: String }) surface?: TcSurfaceId;

  static styles: CSSResultGroup = [
    variables,
    sharedStyles,
    css`
      :host {
        /* The host tunes the inset without a JS property: an ha-card wants
           the 16px, a dialog whose frame already pads its content pane may
           want none of it. */
        display: block;
        padding: var(--growspace-tc-view-padding, 16px);
      }

      .state {
        padding: 24px 16px;
        text-align: center;
      }

      h3 {
        margin: 0 0 4px;
      }

      .supporting {
        opacity: 0.7;
      }

      /* Beats the hidden surface's own :host display rule. A rule in the tree
         an element lives in outranks the :host rules inside it. */
      [hidden] {
        display: none;
      }
    `,
  ];

  private _t(key: string): string {
    return localize(`tc.${key}`, '', '', this.language);
  }

  /** Whether a surface this installation offers is not the one being shown. */
  private _hidden(...ids: TcSurfaceId[]): boolean {
    return this.surface !== undefined && !ids.includes(this.surface);
  }

  protected render(): TemplateResult {
    const surfaces = tcSurfaces(this.manifest);

    // Nothing this release can serve: an installation older than every surface
    // answers the presence probe perfectly well, and a view of broken calls
    // would be worse than one that says so.
    if (surfaces.length === 0) {
      return html`
        <div class="state" role="region" aria-label=${this._t('view_title')}>
          <h3>${this._t('empty_title')}</h3>
          <p class="supporting">${this._t('empty_body')}</p>
        </div>
      `;
    }

    return html`
      <div role="region" aria-label=${this._t('view_title')}>
        ${surfaces.includes('cultures')
          ? html`<growspace-tc-cultures
              ?hidden=${this._hidden('worklist', 'cultures')}
              .surface=${this.surface === 'worklist' || this.surface === 'cultures'
                ? this.surface
                : undefined}
              .maintenance=${this.manifest?.features.includes(TC_FEATURE_MAINTENANCE) ?? false}
              .graduationBridge=${this.manifest?.features.includes('graduation_bridge') ?? false}
              .language=${this.language}
            ></growspace-tc-cultures>`
          : nothing}
        ${surfaces.includes('media')
          ? html`<growspace-tc-media
              ?hidden=${this._hidden('media')}
              .language=${this.language}
            ></growspace-tc-media>`
          : nothing}
        ${surfaces.includes('pairings')
          ? html`<growspace-tc-pairings
              ?hidden=${this._hidden('pairings')}
              .language=${this.language}
            ></growspace-tc-pairings>`
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-tc-view': GrowspaceTcView;
  }
}
