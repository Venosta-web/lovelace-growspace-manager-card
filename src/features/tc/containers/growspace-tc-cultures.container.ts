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
 *
 * It also owns the second clock-dependent judgement on this surface: **overdue**.
 * The backend states a Replate Due Date and nothing more, because whether that
 * date has passed depends on when the card is looking. The worklist is built
 * here against a clock this element reads, so a board left open overnight is one
 * render away from telling the truth again.
 */

import { LitElement, html, css, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { localize, localizeWithParams } from '../../../localize/localize';
import { sharedStyles } from '../../../styles/shared.styles';
import { variables } from '../../../styles/variables';
import { fetchStrainLibrary, strainLibrary$ } from '../../../slices/strain';
import {
  cultureLines$,
  cultureMedia$,
  fetchCultureLines,
  fetchMaintenanceHistory,
  introduceCultureLine,
  locationOptions,
  phenotypeNameIndex,
  phenotypeOptions,
  recordMaintenance,
  relinkPhenotype,
  resolvePhenotype,
  setCultureLineArchived,
  worklistEntries,
  type Culture,
  type CultureLine,
  type CultureMedium,
  type IntroductionDraft,
  type MaintenanceAction,
  type MaintenanceActionType,
  type MaintenanceRequest,
  type PhenotypeOption,
  type PhenotypeResolution,
  type WorklistEntry,
} from '../../../slices/tc';
import type { StrainEntry } from '../../../types';
import '../components/growspace-tc-action-dialog';
import '../components/growspace-tc-culture-board';
import '../components/growspace-tc-introduction-form';
import '../components/growspace-tc-phenotype-picker';
import '../components/growspace-tc-worklist';

type Relinking = { open: false } | { open: true; line: CultureLine };
type Acting =
  | { open: false }
  | { open: true; action: MaintenanceActionType; culture: Culture; line: CultureLine };

@customElement('growspace-tc-cultures')
export class GrowspaceTcCultures extends LitElement {
  /**
   * Whether this installation serves Maintenance Actions.
   *
   * The worklist reads `replate_due_at` and the dialogs call the five commands,
   * so both are gated on the manifest feature rather than on TC merely being
   * installed — an older release would answer the board and none of the rest.
   */
  @property({ type: Boolean }) maintenance = false;
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
  @state() private _media: CultureMedium[] = [];
  @state() private _acting: Acting = { open: false };
  @state() private _history: MaintenanceAction[] = [];
  @state() private _historyLoading = false;
  /**
   * The clock the worklist is built against, re-read on every load and after
   * every act. A `Date` in a render would make the element re-sort itself on
   * unrelated updates and make a test wait for midnight.
   */
  @state() private _now = new Date();

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
      // Read, never fetched here: the view container owns the one call that
      // fills this atom for the medium library, and the Replate dialog needs
      // the same list to pin a Medium Version from.
      cultureMedia$.subscribe((media) => {
        this._media = [...media];
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
    this._now = new Date();
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

  /** The name to show per line — the resolution's, whichever answer it was. */
  private get _lineNames(): ReadonlyMap<string, string> {
    return new Map([...this._resolutions].map(([lineId, resolution]) => [lineId, resolution.name]));
  }

  private get _worklist(): WorklistEntry[] {
    return worklistEntries(this._lines, this._now);
  }

  /**
   * Open an action dialog over one vessel, and fetch what has been recorded
   * against it.
   *
   * The history is fetched on open rather than held in an atom: it is
   * append-only and asked about one vessel at a time, so a shared copy would
   * only ever be a snapshot of whichever dialog was opened last.
   */
  private async _startAction(
    event: CustomEvent<{ cultureId: string; action: MaintenanceActionType }>
  ): Promise<void> {
    const { cultureId, action } = event.detail;
    const line = this._lines.find((entry) =>
      entry.cultures.some((culture) => culture.id === cultureId)
    );
    const culture = line?.cultures.find((entry) => entry.id === cultureId);
    if (!line || !culture) return;

    this._saveError = '';
    this._history = [];
    this._acting = { open: true, action, culture, line };
    this._historyLoading = true;
    try {
      this._history = await fetchMaintenanceHistory({ cultureId });
    } catch {
      // Swallowed: the dialog's job is to record the next act, and a history
      // panel that failed to load is no reason to refuse to do it.
      this._history = [];
    } finally {
      this._historyLoading = false;
    }
  }

  private _cancelAction(): void {
    this._acting = { open: false };
    this._saveError = '';
  }

  private async _record(event: CustomEvent<{ request: MaintenanceRequest }>): Promise<void> {
    this._saving = true;
    this._saveError = '';
    try {
      await recordMaintenance(event.detail.request);
      this._acting = { open: false };
      // The act moved a due date, so the worklist is re-judged against the
      // clock as it reads now rather than as it read when the board loaded.
      this._now = new Date();
    } catch (error) {
      // The dialog stays open holding the draft: the backend rejected a value,
      // and throwing the grower's typing away would be the second failure.
      this._saveError = GrowspaceTcCultures._message(error);
    } finally {
      this._saving = false;
    }
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

  /** The dialog for the act being recorded, over the vessel it names. */
  private _renderActionDialog(acting: Acting & { open: true }): TemplateResult {
    return html`<growspace-tc-action-dialog
      .action=${acting.action}
      .culture=${acting.culture}
      .lineName=${this._lineNames.get(acting.line.id) ?? acting.line.phenotype.name_snapshot}
      .media=${this._media}
      .history=${this._history}
      .historyLoading=${this._historyLoading}
      .saving=${this._saving}
      .error=${this._saveError}
      .language=${this.language}
      @maintenance-requested=${this._record}
      @maintenance-cancelled=${this._cancelAction}
    ></growspace-tc-action-dialog>`;
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
        ${this._acting.open ? this._renderActionDialog(this._acting) : nothing}
        ${this._relinking.open ? this._renderRelink(this._relinking.line) : nothing}
        ${this.maintenance
          ? html`<growspace-tc-worklist
              .entries=${this._worklist}
              .names=${this._lineNames}
              .locations=${locationOptions(this._lines)}
              .language=${this.language}
              @culture-action-requested=${this._startAction}
            ></growspace-tc-worklist>`
          : nothing}
        <growspace-tc-culture-board
          .lines=${this._lines}
          .resolutions=${this._resolutions}
          .showArchived=${this._showArchived}
          .actionable=${this.maintenance}
          .language=${this.language}
          @line-introduce-requested=${this._startIntroduction}
          @line-relink-requested=${this._startRelink}
          @line-archive-requested=${this._setArchived}
          @line-show-archived-toggled=${() => (this._showArchived = !this._showArchived)}
          @culture-action-requested=${this._startAction}
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
