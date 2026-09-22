/**
 * The phenotype picker — one list of Growspace Manager's phenotypes.
 *
 * It exists as its own element because two flows need exactly the same
 * question: the Introduction, which takes the first reference, and the re-link
 * that repairs a Missing Phenotype. Both must send the ID *and* the name they
 * were looking at, because the name is snapshotted at reference time
 * (TC ADR-0006) — a picker that emitted only the ID would leave the backend to
 * invent a snapshot it has no way to read.
 *
 * A strain library is hundreds of rows, so it filters. Filtering is view state
 * and stays here; the selection is the caller's.
 *
 * Dumb by contract (ADR-0019): options in, a chosen phenotype out.
 */

import { LitElement, html, css, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { localize, localizeWithParams } from '../../../localize/localize';
import { sharedStyles } from '../../../styles/shared.styles';
import { variables } from '../../../styles/variables';
import type { PhenotypeOption } from '../../../slices/tc';

/** How many matches are listed before the grower is asked to keep typing. */
const MAX_SHOWN = 30;

@customElement('growspace-tc-phenotype-picker')
export class GrowspaceTcPhenotypePicker extends LitElement {
  @property({ attribute: false }) phenotypes: PhenotypeOption[] = [];
  /** The chosen phenotype's ID, or '' for none. */
  @property({ type: String }) selected = '';
  @property({ type: String }) language = 'en';

  @state() private _filter = '';

  static styles: CSSResultGroup = [
    variables,
    sharedStyles,
    css`
      :host {
        display: block;
      }

      input[type='search'] {
        width: 100%;
        box-sizing: border-box;
      }

      ul {
        list-style: none;
        margin: 8px 0 0;
        padding: 0;
        max-height: 220px;
        overflow-y: auto;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 10px;
      }

      li button {
        display: block;
        width: 100%;
        text-align: left;
        font: inherit;
        color: inherit;
        background: none;
        border: none;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        padding: 8px 10px;
        min-height: 40px;
        cursor: pointer;
      }

      li:last-child button {
        border-bottom: none;
      }

      li button[aria-pressed='true'] {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
      }

      .supporting {
        opacity: 0.7;
        font-size: 0.8125rem;
        margin: 6px 0 0;
      }
    `,
  ];

  private _t(key: string): string {
    return localize(`tc.${key}`, '', '', this.language);
  }

  private get _matches(): PhenotypeOption[] {
    const needle = this._filter.trim().toLocaleLowerCase(this.language);
    if (!needle) return this.phenotypes;
    return this.phenotypes.filter((option) =>
      option.name.toLocaleLowerCase(this.language).includes(needle)
    );
  }

  private _choose(option: PhenotypeOption): void {
    this.dispatchEvent(
      new CustomEvent('phenotype-selected', {
        detail: { id: option.id, name: option.name },
        bubbles: true,
        composed: true,
      })
    );
  }

  protected render(): TemplateResult {
    // An empty library is not the same as no matches: nothing was fetched, so
    // saying "no phenotype matches" would blame the search box for it.
    if (!this.phenotypes.length) {
      return html`<p class="supporting">${this._t('picker_library_empty')}</p>`;
    }

    const matches = this._matches;
    const shown = matches.slice(0, MAX_SHOWN);

    return html`
      <div>
        <label>
          ${this._t('picker_filter')}
          <input
            type="search"
            .value=${this._filter}
            @input=${(event: Event) => (this._filter = (event.target as HTMLInputElement).value)}
          />
        </label>
        ${shown.length
          ? html`<ul role="listbox" aria-label=${this._t('picker_label')}>
              ${shown.map(
                (option) => html`
                  <li>
                    <button
                      type="button"
                      role="option"
                      aria-selected=${option.id === this.selected ? 'true' : 'false'}
                      aria-pressed=${option.id === this.selected ? 'true' : 'false'}
                      @click=${() => this._choose(option)}
                    >
                      ${option.name}
                    </button>
                  </li>
                `
              )}
            </ul>`
          : html`<p class="supporting">${this._t('picker_no_matches')}</p>`}
        ${matches.length > shown.length
          ? html`<p class="supporting">
              ${localizeWithParams(
                'tc.picker_more_matches',
                { count: matches.length - shown.length },
                this.language
              )}
            </p>`
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-tc-phenotype-picker': GrowspaceTcPhenotypePicker;
  }
}
