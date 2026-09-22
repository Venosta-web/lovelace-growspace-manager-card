/**
 * The culture board — every Culture Line with the vessels it is kept in.
 *
 * The board's real subject is the Phenotype Reference. TC stores an opaque
 * phenotype ID owned by Growspace Manager and a display-name snapshot taken
 * when the reference was made (TC ADR-0002, ADR-0006); the join happens in the
 * card, and this element renders whichever of the three answers it was handed.
 * A reference that no longer resolves is drawn as an explicit **Missing
 * Phenotype** — named from the snapshot, offering a re-link and an archive —
 * and never as a line that quietly disappeared or as a blank name.
 *
 * The third answer matters as much as the other two: while the strain library
 * has not loaded, a line is `unresolved` and shows its snapshot without any
 * missing-phenotype claim. An empty library and a deleted phenotype look
 * identical from the join alone, and marking every line missing because a fetch
 * failed would be a worse lie than a stale name.
 *
 * Expanding a line shows its vessels, their Replate Due Dates and the five
 * Maintenance Actions. The worklist above answers "what has to be done today";
 * the board is where a vessel that is not due yet — or one that has already
 * ended — can still be acted on, which is why the actions live in both places
 * rather than only on the urgent list.
 *
 * Dumb by contract (ADR-0019): lines and resolutions in, intents out. Which
 * line's vessels are expanded is the only state it owns.
 */

import { LitElement, html, css, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { localize, localizeWithParams } from '../../../localize/localize';
import { sharedStyles } from '../../../styles/shared.styles';
import { variables } from '../../../styles/variables';
import type {
  Culture,
  CultureLine,
  MaintenanceActionType,
  PhenotypeResolution,
} from '../../../slices/tc';

/**
 * The five Maintenance Actions, in the order a vessel meets them: the routine
 * one first, the endings last.
 */
const OFFERED_ACTIONS: MaintenanceActionType[] = [
  'replate',
  'move_to_rooting',
  'note',
  'discard',
  'graduate',
];

@customElement('growspace-tc-culture-board')
export class GrowspaceTcCultureBoard extends LitElement {
  @property({ attribute: false }) lines: CultureLine[] = [];
  /** How each line's phenotype resolved, keyed by line ID. */
  @property({ attribute: false }) resolutions: ReadonlyMap<string, PhenotypeResolution> = new Map();
  /** Whether archived lines are shown. Archived lines are never dropped. */
  @property({ type: Boolean }) showArchived = false;
  /**
   * Whether this installation serves Maintenance Actions.
   *
   * Gated on the manifest feature rather than assumed: a TC release older than
   * the acts answers the board perfectly well, and offering five buttons whose
   * every call comes back `unknown_command` would be worse than not offering
   * them.
   */
  @property({ type: Boolean }) actionable = false;
  @property({ type: String }) language = 'en';

  @state() private _openLines = new Set<string>();

  static styles: CSSResultGroup = [
    variables,
    sharedStyles,
    css`
      :host {
        display: block;
      }

      header.board {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 12px;
      }

      header.board h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
      }

      .header-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      li.line {
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 12px;
        padding: 12px 14px;
      }

      li.line.missing {
        border-color: var(--warning-color, #ffa726);
      }

      li.line.archived {
        opacity: 0.65;
      }

      .line-head {
        display: flex;
        align-items: baseline;
        gap: 8px;
        flex-wrap: wrap;
      }

      .line-head h4 {
        margin: 0;
        font-size: 0.9375rem;
        font-weight: 600;
      }

      .chip {
        font-size: 0.75rem;
        font-weight: 600;
        padding: 1px 8px;
        border-radius: 999px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
      }

      .chip.missing {
        border-color: var(--warning-color, #ffa726);
        color: var(--warning-color, #ffa726);
      }

      .actions {
        margin-left: auto;
        display: flex;
        gap: 4px;
      }

      .missing-note {
        margin: 8px 0 0;
        font-size: 0.8125rem;
        color: var(--warning-color, #ffa726);
      }

      dl.intervals {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 2px 10px;
        margin: 8px 0 0;
        font-size: 0.8125rem;
      }

      dt {
        opacity: 0.7;
      }

      dd {
        margin: 0;
      }

      table.cultures {
        width: 100%;
        margin-top: 10px;
        border-collapse: collapse;
        font-size: 0.8125rem;
      }

      table.cultures th,
      table.cultures td {
        text-align: left;
        padding: 4px 8px 4px 0;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
      }

      table.cultures th {
        opacity: 0.7;
        font-weight: 500;
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

      button.link {
        border: none;
        padding: 6px 0;
        text-decoration: underline;
        min-height: 32px;
      }

      button.small {
        font-size: 0.75rem;
        padding: 2px 10px;
        min-height: 28px;
      }

      .culture-actions {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }
    `,
  ];

  private _t(key: string): string {
    return localize(`tc.${key}`, '', '', this.language);
  }

  private _emit(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private _toggleVessels(lineId: string): void {
    const open = new Set(this._openLines);
    if (!open.delete(lineId)) open.add(lineId);
    this._openLines = open;
  }

  /** The day a stamp names, or the raw stamp if it cannot be read. */
  private _day(iso: string): string {
    const taken = new Date(iso);
    return Number.isNaN(taken.getTime()) ? iso : taken.toLocaleDateString(this.language);
  }

  private _resolutionOf(line: CultureLine): PhenotypeResolution {
    // A line the container has not resolved yet is `unresolved` rather than
    // missing, for the same reason an unloaded library is.
    return (
      this.resolutions.get(line.id) ?? {
        status: 'unresolved',
        name: line.phenotype.name_snapshot,
      }
    );
  }

  private _renderCultures(cultures: Culture[]): TemplateResult {
    return html`
      <table class="cultures">
        <thead>
          <tr>
            <th>${this._t('culture_stage')}</th>
            <th>${this._t('culture_status')}</th>
            <th>${this._t('culture_plantlets')}</th>
            <th>${this._t('culture_location')}</th>
            <th>${this._t('culture_started')}</th>
            <th>${this._t('culture_due')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${cultures.map(
            (culture) => html`
              <tr>
                <td>${this._t(`culture_stage_${culture.stage}`)}</td>
                <td>${this._t(`culture_status_${culture.status}`)}</td>
                <td>
                  ${culture.plantlet_count === null
                    ? this._t('culture_plantlets_uncounted')
                    : culture.plantlet_count}
                </td>
                <td>${culture.location || this._t('culture_location_none')}</td>
                <td>${this._day(culture.started_at)}</td>
                <td>
                  ${culture.replate_due_at === null
                    ? this._t('culture_due_none')
                    : this._day(culture.replate_due_at)}
                </td>
                <td>${this._renderActions(culture)}</td>
              </tr>
            `
          )}
        </tbody>
      </table>
    `;
  }

  /**
   * The five acts, offered only while the vessel is still being maintained.
   *
   * An ended Culture keeps its row — it is history, not clutter — but every act
   * is refused on it by the backend, so offering the buttons would be an
   * invitation to an error message.
   */
  private _renderActions(culture: Culture): TemplateResult {
    if (!this.actionable) return html`${nothing}`;
    if (culture.status !== 'active')
      return html`<button
        class="small"
        @click=${() =>
          this._emit('culture-action-requested', { cultureId: culture.id, action: 'graduate' })}
      >
        ${this._t('history_show')}
      </button>`;
    return html`
      <div class="culture-actions">
        ${OFFERED_ACTIONS.map(
          (action) =>
            html`<button
              class="small"
              @click=${() =>
                this._emit('culture-action-requested', { cultureId: culture.id, action })}
            >
              ${this._t(`action_${action}`)}
            </button>`
        )}
      </div>
    `;
  }

  /**
   * The Missing Phenotype state: the snapshot, said to be a snapshot, and the
   * two ways out. Never a silent drop and never a bare ID.
   */
  private _renderMissing(line: CultureLine): TemplateResult {
    return html`
      <p class="missing-note" role="status">
        ${localizeWithParams(
          'tc.line_missing_phenotype',
          { name: line.phenotype.name_snapshot },
          this.language
        )}
      </p>
    `;
  }

  private _renderLine(line: CultureLine): TemplateResult {
    const resolution = this._resolutionOf(line);
    const missing = resolution.status === 'missing';
    const archived = line.archived_at !== null;
    const open = this._openLines.has(line.id);

    return html`
      <li class="line ${missing ? 'missing' : ''} ${archived ? 'archived' : ''}">
        <div class="line-head">
          <h4>${resolution.name}</h4>
          ${missing
            ? html`<span class="chip missing">${this._t('line_missing_chip')}</span>`
            : nothing}
          ${archived ? html`<span class="chip">${this._t('line_archived_chip')}</span>` : nothing}
          <div class="actions">
            <button @click=${() => this._emit('line-relink-requested', { id: line.id })}>
              ${this._t('line_relink')}
            </button>
            <button
              @click=${() =>
                this._emit('line-archive-requested', { id: line.id, archived: !archived })}
            >
              ${this._t(archived ? 'line_unarchive' : 'line_archive')}
            </button>
          </div>
        </div>
        ${missing ? this._renderMissing(line) : nothing}
        <dl class="intervals">
          <dt>${this._t('line_interval_multiplication')}</dt>
          <dd>
            ${localizeWithParams(
              'tc.line_interval_days',
              { days: line.replate_interval_days.multiplication },
              this.language
            )}
          </dd>
          <dt>${this._t('line_interval_rooting')}</dt>
          <dd>
            ${localizeWithParams(
              'tc.line_interval_days',
              { days: line.replate_interval_days.rooting },
              this.language
            )}
          </dd>
        </dl>
        <button
          class="link"
          aria-expanded=${open ? 'true' : 'false'}
          @click=${() => this._toggleVessels(line.id)}
        >
          ${localizeWithParams(
            open ? 'tc.line_hide_vessels' : 'tc.line_show_vessels',
            { count: line.cultures.length },
            this.language
          )}
        </button>
        ${open ? this._renderCultures(line.cultures) : nothing}
      </li>
    `;
  }

  protected render(): TemplateResult {
    // Archived lines are filtered here rather than dropped from the payload:
    // the backend keeps listing them, so hiding one is a view decision the
    // grower can take back with the toggle beside it.
    const archivedCount = this.lines.filter((line) => line.archived_at !== null).length;
    const shown = this.showArchived
      ? this.lines
      : this.lines.filter((line) => line.archived_at === null);

    return html`
      <section aria-label=${this._t('board_title')}>
        <header class="board">
          <h3>${this._t('board_title')}</h3>
          <div class="header-actions">
            ${archivedCount || this.showArchived
              ? html`<button
                  class="link"
                  aria-pressed=${this.showArchived ? 'true' : 'false'}
                  @click=${() => this._emit('line-show-archived-toggled')}
                >
                  ${localizeWithParams(
                    this.showArchived ? 'tc.board_hide_archived' : 'tc.board_show_archived',
                    { count: archivedCount },
                    this.language
                  )}
                </button>`
              : nothing}
            <button @click=${() => this._emit('line-introduce-requested')}>
              ${this._t('line_introduce')}
            </button>
          </div>
        </header>
        ${shown.length
          ? html`<ul>
              ${shown.map((line) => this._renderLine(line))}
            </ul>`
          : html`<p class="empty supporting">${this._t('board_empty')}</p>`}
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-tc-culture-board': GrowspaceTcCultureBoard;
  }
}
