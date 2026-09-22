/**
 * The due/overdue worklist — what the TC view lands on.
 *
 * The first thing a grower wants from a tissue-culture bench is not the whole
 * board, it is the answer to "what has to be replated today". So the worklist
 * leads, and it defaults to showing only what is due or overdue: an upcoming
 * replate three weeks out is not work, and a list that mixed the two would make
 * the grower do the filtering the card exists to do.
 *
 * **Overdue is decided against the clock, in the container.** This element is
 * handed entries that already carry their urgency, so what it renders never
 * disagrees with what the calendar entity draws — and a test can fix the clock
 * rather than wait for one.
 *
 * Location is free text on purpose (TC CONTEXT.md), so the filter's options are
 * whatever the grower has actually typed rather than a hierarchy nobody
 * maintains.
 *
 * Dumb by contract (ADR-0019): entries in, intents out. Which filters are on is
 * the only state it owns, because nothing else needs to know.
 */

import { LitElement, html, css, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { localize, localizeWithParams } from '../../../localize/localize';
import { sharedStyles } from '../../../styles/shared.styles';
import { variables } from '../../../styles/variables';
import type { MaintenanceActionType, WorklistEntry } from '../../../slices/tc';

const OFFERED_ACTIONS: MaintenanceActionType[] = [
  'replate',
  'move_to_rooting',
  'note',
  'discard',
  'graduate',
];

@customElement('growspace-tc-worklist')
export class GrowspaceTcWorklist extends LitElement {
  @property({ attribute: false }) entries: WorklistEntry[] = [];
  /** How each line's phenotype resolved, keyed by line ID. */
  @property({ attribute: false }) names: ReadonlyMap<string, string> = new Map();
  /** The Locations in use, for the filter. */
  @property({ attribute: false }) locations: string[] = [];
  @property({ type: String }) language = 'en';

  @state() private _location = '';
  @state() private _onlyDue = true;

  static styles: CSSResultGroup = [
    variables,
    sharedStyles,
    css`
      :host {
        display: block;
        margin-bottom: 20px;
      }

      header.worklist {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }

      header.worklist h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
      }

      .filters {
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
        margin: 8px 0 12px;
        font-size: 0.8125rem;
      }

      select {
        font: inherit;
        color: inherit;
        background: var(--card-background-color, transparent);
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 8px;
        padding: 6px 8px;
        min-height: 36px;
      }

      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      li.entry {
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 12px;
        padding: 10px 12px;
      }

      li.entry.overdue {
        border-color: var(--error-color, #f44336);
      }

      li.entry.due {
        border-color: var(--warning-color, #ffa726);
      }

      .entry-head {
        display: flex;
        align-items: baseline;
        gap: 8px;
        flex-wrap: wrap;
      }

      .entry-head h4 {
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

      .chip.overdue {
        border-color: var(--error-color, #f44336);
        color: var(--error-color, #f44336);
      }

      .chip.due {
        border-color: var(--warning-color, #ffa726);
        color: var(--warning-color, #ffa726);
      }

      .facts {
        margin: 4px 0 0;
        font-size: 0.8125rem;
        opacity: 0.8;
      }

      .actions {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
        margin-top: 8px;
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

      .supporting {
        opacity: 0.7;
        font-size: 0.8125rem;
      }
    `,
  ];

  private _t(key: string): string {
    return localize(`tc.${key}`, '', '', this.language);
  }

  private _emit(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private get _shown(): WorklistEntry[] {
    return this.entries.filter(
      (entry) =>
        (!this._onlyDue || entry.urgency !== 'scheduled') &&
        (this._location === '' ||
          entry.culture.location.toLowerCase() === this._location.toLowerCase())
    );
  }

  /** How far off the due day is, said the way a grower would say it. */
  private _whenDue(entry: WorklistEntry): string {
    const { daysUntilDue } = entry;
    if (daysUntilDue === 0) return this._t('worklist_due_today');
    if (daysUntilDue === 1) return this._t('worklist_due_tomorrow');
    if (daysUntilDue === -1) return this._t('worklist_overdue_yesterday');
    return localizeWithParams(
      daysUntilDue < 0 ? 'tc.worklist_overdue_by' : 'tc.worklist_due_in',
      { days: Math.abs(daysUntilDue) },
      this.language
    );
  }

  private _nameOf(entry: WorklistEntry): string {
    // Falls back to the snapshot rather than to the opaque ID: the phenotype
    // join is the container's, and a vessel with an unresolvable reference
    // still has to be findable on the shelf it is on.
    return this.names.get(entry.line.id) ?? entry.line.phenotype.name_snapshot;
  }

  private _renderEntry(entry: WorklistEntry): TemplateResult {
    const { culture, urgency } = entry;
    return html`
      <li class="entry ${urgency}">
        <div class="entry-head">
          <h4>${this._nameOf(entry)}</h4>
          ${urgency === 'scheduled'
            ? nothing
            : html`<span class="chip ${urgency}">
                ${this._t(urgency === 'overdue' ? 'worklist_overdue_chip' : 'worklist_due_chip')}
              </span>`}
        </div>
        <p class="facts">
          ${this._whenDue(entry)} · ${this._t(`culture_stage_${culture.stage}`)} ·
          ${culture.location || this._t('culture_location_none')} ·
          ${culture.plantlet_count === null
            ? this._t('culture_plantlets_uncounted')
            : localizeWithParams(
                'tc.worklist_plantlets',
                { count: culture.plantlet_count },
                this.language
              )}
        </p>
        <div class="actions">
          ${OFFERED_ACTIONS.map(
            (action) =>
              html`<button
                @click=${() =>
                  this._emit('culture-action-requested', { cultureId: culture.id, action })}
              >
                ${this._t(`action_${action}`)}
              </button>`
          )}
        </div>
      </li>
    `;
  }

  protected render(): TemplateResult {
    const shown = this._shown;

    return html`
      <section aria-label=${this._t('worklist_title')}>
        <header class="worklist">
          <h3>${this._t('worklist_title')}</h3>
          <span class="supporting">
            ${localizeWithParams(
              'tc.worklist_counted',
              { shown: shown.length, total: this.entries.length },
              this.language
            )}
          </span>
        </header>
        <p class="supporting">${this._t('worklist_explainer')}</p>
        <div class="filters">
          <label>
            ${this._t('worklist_filter_location')}
            <select
              .value=${this._location}
              @change=${(e: Event) => (this._location = (e.target as HTMLSelectElement).value)}
            >
              <option value="">${this._t('worklist_all_locations')}</option>
              ${this.locations.map(
                (location) => html`<option value=${location}>${location}</option>`
              )}
            </select>
          </label>
          <button
            class="link"
            aria-pressed=${this._onlyDue ? 'true' : 'false'}
            @click=${() => (this._onlyDue = !this._onlyDue)}
          >
            ${this._t(this._onlyDue ? 'worklist_show_upcoming' : 'worklist_only_due')}
          </button>
        </div>
        ${shown.length
          ? html`<ul>
              ${shown.map((entry) => this._renderEntry(entry))}
            </ul>`
          : html`<p class="empty supporting">
              ${this._t(this.entries.length ? 'worklist_empty_filtered' : 'worklist_empty')}
            </p>`}
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-tc-worklist': GrowspaceTcWorklist;
  }
}
