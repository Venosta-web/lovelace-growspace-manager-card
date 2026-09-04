/**
 * The culture board's container: the fetch, the join, and the two ways out.
 *
 * The join is the reason this element exists. TC stores an opaque phenotype ID
 * and a display-name snapshot and never resolves either (TC ADR-0002), so the
 * card resolves them against Growspace Manager's strain library — data the card
 * already fetches for its own dialogs. That join is what turns a dangling
 * reference into a Missing Phenotype the grower can act on (TC ADR-0006), and
 * both actions on it are backend commands: re-link, or archive.
 *
 * One honesty rule runs through it. A phenotype is only reported missing once
 * the strain library has actually loaded. An empty library and a deleted
 * phenotype are indistinguishable from the join alone, so a failed fetch would
 * otherwise mark every line missing and offer to repair references that were
 * never broken.
 */

import { LitElement, html, css, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { localize, localizeWithParams } from '../../../localize/localize';
import { sharedStyles } from '../../../styles/shared.styles';
import { variables } from '../../../styles/variables';
import { fetchStrainLibrary, strainLibrary$ } from '../../../slices/strain';
import {
  cultureLines$,
  fetchCultureLines,
  introduceCultureLine,
  phenotypeNameIndex,
  phenotypeOptions,
  relinkPhenotype,
  resolvePhenotype,
  setCultureLineArchived,
  type CultureLine,
  type IntroductionDraft,
  type PhenotypeOption,
  type PhenotypeResolution,
} from '../../../slices/tc';
import type { StrainEntry } from '../../../types';
import '../components/growspace-tc-culture-board';
import '../components/growspace-tc-introduction-form';
import '../components/growspace-tc-phenotype-picker';

type Relinking = { open: false } | { open: true; line: CultureLine };

@customElement('growspace-tc-cultures')
export class GrowspaceTcCultures extends LitElement {
  @property({ type: String }) language = 'en';

  @state() private _lines: CultureLine[] = [];
  @state() private _library: StrainEntry[] = [];
  @state() private _libraryLoaded = false;
  @state() private _loading = false;
  @state() private _error = '';
  @state() private _saving = false;
  @state() private _saveError = '';
  @state() private _introducing = false;
  @state() private _relinking: Relinking = { open: false };
  @state() private _showArchived = false;

  private _unsubscribe: Array<() => void> = [];

  static styles: CSSResultGroup = [
    variables,
    sharedStyles,
    css`
      :host {
        display: block;
      }

      .error {
        color: var(--error-color, #f44336);
      }

      .supporting {
        opacity: 0.7;
      }

      .relink {
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 10px;
        padding: 12px;
        margin-bottom: 12px;
      }

      .relink h4 {
        margin: 0 0 4px;
        font-size: 0.9375rem;
      }

      .relink p {
        margin: 0 0 8px;
      }

      button {
        font: inherit;
        color: inherit;
        background: none;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 999px;
        padding: 6px 14px;
        min-height: 36px;
        cursor: pointer;
      }
    `,
  ];

  connectedCallback(): void {
    super.connectedCallback();
    this._unsubscribe = [
      cultureLines$.subscribe((lines) => {
        this._lines = [...lines];
      }),
      strainLibrary$.subscribe((library) => {
        this._library = [...library];
        // A subscription fires once on subscribe, before anything was
        // fetched. Only a non-empty library proves the fetch landed; an empty
        // one is settled by `_load` instead, which knows whether it threw.
        if (library.length) this._libraryLoaded = true;
      }),
    ];
    void this._load();
  }

  disconnectedCallback(): void {
    for (const unsubscribe of this._unsubscribe) unsubscribe();
    this._unsubscribe = [];
    super.disconnectedCallback();
  }

  private _t(key: string): string {
    return localize(`tc.${key}`, '', '', this.language);
  }

  private static _message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * Fetch the board, and the library the board is read through.
   *
   * The two are independent: a board that arrives without a library is still
   * worth rendering — from the snapshots, with nothing claimed missing — so a
   * library failure never fails the board.
   */
  private async _load(): Promise<void> {
    this._loading = true;
    this._error = '';
    const library = this._loadLibrary();
    try {
      await fetchCultureLines();
    } catch (error) {
      this._error = GrowspaceTcCultures._message(error);
    } finally {
      await library;
      this._loading = false;
    }
  }

  /**
   * Fetch the strain library, and know whether it arrived.
   *
   * Deliberately not `fetchStrainLibrary({ cache: true })`. That variant
   * swallows a failure and resolves with whatever the atom already held, which
   * for this element is indistinguishable from an empty library that really
   * loaded — and would mark every line's phenotype missing because the network
   * was down. The uncached call throws, and only a resolved one sets the flag.
   */
  private async _loadLibrary(): Promise<void> {
    try {
      await fetchStrainLibrary();
      this._libraryLoaded = true;
    } catch {
      // Swallowed here rather than surfaced: the board is still worth
      // rendering from its snapshots, and nothing is accused of being missing.
      this._libraryLoaded = false;
    }
  }

  private get _phenotypes(): PhenotypeOption[] {
    return phenotypeOptions(this._library);
  }

  /** How each line's phenotype resolved, keyed by line ID. */
  private get _resolutions(): ReadonlyMap<string, PhenotypeResolution> {
    const names = phenotypeNameIndex(this._library);
    return new Map(
      this._lines.map((line) => [
        line.id,
        resolvePhenotype(line.phenotype, names, this._libraryLoaded),
      ])
    );
  }

  private _startIntroduction(): void {
    this._saveError = '';
    this._introducing = true;
  }

  private _cancelIntroduction(): void {
    this._introducing = false;
    this._saveError = '';
  }

  private async _introduce(event: CustomEvent<{ draft: IntroductionDraft }>): Promise<void> {
    this._saving = true;
    this._saveError = '';
    try {
      await introduceCultureLine(event.detail.draft);
      this._introducing = false;
    } catch (error) {
      // The form stays open holding the draft: the backend rejected a value,
      // and throwing the grower's typing away would be the second failure.
      this._saveError = GrowspaceTcCultures._message(error);
    } finally {
      this._saving = false;
    }
  }

  private _startRelink(event: CustomEvent<{ id: string }>): void {
    const line = this._lines.find((entry) => entry.id === event.detail.id);
    if (!line) return;
    this._error = '';
    this._relinking = { open: true, line };
  }

  private async _relink(event: CustomEvent<{ id: string; name: string }>): Promise<void> {
    if (!this._relinking.open) return;
    const { line } = this._relinking;
    this._relinking = { open: false };
    try {
      await relinkPhenotype(line.id, event.detail.id, event.detail.name);
    } catch (error) {
      this._error = GrowspaceTcCultures._message(error);
    }
  }

  private async _setArchived(event: CustomEvent<{ id: string; archived: boolean }>): Promise<void> {
    try {
      await setCultureLineArchived(event.detail.id, event.detail.archived);
    } catch (error) {
      this._error = GrowspaceTcCultures._message(error);
    }
  }

  /**
   * The re-link panel: the same picker the Introduction uses, over the line
   * whose reference went missing, and never a free-text ID field.
   */
  private _renderRelink(line: CultureLine): TemplateResult {
    return html`
      <div class="relink" role="region" aria-label=${this._t('line_relink')}>
        <h4>${this._t('line_relink')}</h4>
        <p class="supporting">
          ${localizeWithParams(
            'tc.line_relink_explainer',
            { name: line.phenotype.name_snapshot },
            this.language
          )}
        </p>
        <growspace-tc-phenotype-picker
          .phenotypes=${this._phenotypes}
          .selected=${line.phenotype.id}
          .language=${this.language}
          @phenotype-selected=${this._relink}
        ></growspace-tc-phenotype-picker>
        <button @click=${() => (this._relinking = { open: false })}>
          ${this._t('medium_cancel')}
        </button>
      </div>
    `;
  }

  protected render(): TemplateResult {
    if (this._introducing) {
      return html`<growspace-tc-introduction-form
        .phenotypes=${this._phenotypes}
        .saving=${this._saving}
        .error=${this._saveError}
        .language=${this.language}
        @introduction-requested=${this._introduce}
        @introduction-cancelled=${this._cancelIntroduction}
      ></growspace-tc-introduction-form>`;
    }

    return html`
      <div>
        ${this._error ? html`<p class="error" role="alert">${this._error}</p>` : nothing}
        ${this._relinking.open ? this._renderRelink(this._relinking.line) : nothing}
        <growspace-tc-culture-board
          .lines=${this._lines}
          .resolutions=${this._resolutions}
          .showArchived=${this._showArchived}
          .language=${this.language}
          @line-introduce-requested=${this._startIntroduction}
          @line-relink-requested=${this._startRelink}
          @line-archive-requested=${this._setArchived}
          @line-show-archived-toggled=${() => (this._showArchived = !this._showArchived)}
        ></growspace-tc-culture-board>
        ${this._loading ? html`<p class="supporting">${this._t('board_loading')}</p>` : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-tc-cultures': GrowspaceTcCultures;
  }
}
