/**
 * The Culture Medium library, with the version history of every medium.
 *
 * The history is the reason this view exists rather than a decoration on it:
 * editing a medium forks a new Medium Version and rewrites none of the old
 * ones (TC ADR-0004), so a Plating that pinned version 2 still describes what
 * was really poured. A library that showed only the current formulation would
 * hide exactly the property the data model is paying for, so every version is
 * reachable here — newest first, each stamped with the day it was taken, and
 * the current one marked as the one a new Plating would pin.
 *
 * Dumb by contract (ADR-0019): media in, intents out. Which medium's history
 * is open is the only state it owns, because that is view state and nothing
 * outside this element has an opinion about it.
 */

import { LitElement, html, css, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { localize, localizeWithParams } from '../../../localize/localize';
import { sharedStyles } from '../../../styles/shared.styles';
import { variables } from '../../../styles/variables';
import type { CultureMedium, MediumComponent, MediumVersion } from '../../../slices/tc';

@customElement('growspace-tc-medium-library')
export class GrowspaceTcMediumLibrary extends LitElement {
  @property({ attribute: false }) media: CultureMedium[] = [];
  @property({ type: String }) language = 'en';

  @state() private _openHistory = new Set<string>();

  static styles: CSSResultGroup = [
    variables,
    sharedStyles,
    css`
      :host {
        display: block;
      }

      header.library {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 12px;
      }

      header.library h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
      }

      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      li.medium {
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 12px;
        padding: 12px 14px;
      }

      .medium-head {
        display: flex;
        align-items: baseline;
        gap: 8px;
        flex-wrap: wrap;
      }

      .medium-head h4 {
        margin: 0;
        font-size: 0.9375rem;
        font-weight: 600;
      }

      .version-chip {
        font-size: 0.75rem;
        font-weight: 600;
        padding: 1px 8px;
        border-radius: 999px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
      }

      .actions {
        margin-left: auto;
        display: flex;
        gap: 4px;
      }

      dl {
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

      .history {
        margin-top: 10px;
        border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        padding-top: 8px;
      }

      .history ol {
        list-style: none;
        margin: 8px 0 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .history li {
        padding-left: 10px;
        border-left: 2px solid var(--divider-color, rgba(255, 255, 255, 0.12));
      }

      .history li.current {
        border-left-color: var(--primary-color);
      }

      .history-head {
        display: flex;
        align-items: baseline;
        gap: 8px;
        flex-wrap: wrap;
        font-size: 0.8125rem;
      }

      .history-head strong {
        font-weight: 600;
      }

      .supporting,
      .taken {
        opacity: 0.7;
      }

      .empty {
        padding: 20px 0;
        text-align: center;
      }

      button {
        font: inherit;
        color: inherit;
        background: none;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 999px;
        padding: 4px 12px;
        min-height: 32px;
        cursor: pointer;
      }

      button.link {
        border: none;
        padding: 4px 0;
        text-decoration: underline;
        min-height: 32px;
      }
    `,
  ];

  private _t(key: string): string {
    return localize(`tc.${key}`, '', '', this.language);
  }

  private _emit(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private _toggleHistory(mediumId: string): void {
    const open = new Set(this._openHistory);
    if (!open.delete(mediumId)) open.add(mediumId);
    this._openHistory = open;
  }

  /** The day a version was taken, or the raw stamp if it cannot be read. */
  private _day(iso: string): string {
    const taken = new Date(iso);
    return Number.isNaN(taken.getTime()) ? iso : taken.toLocaleDateString(this.language);
  }

  private _components(entries: MediumComponent[]): string {
    return entries.length
      ? entries.map((entry) => `${entry.name} ${entry.amount} ${entry.unit}`).join(', ')
      : this._t('medium_none');
  }

  private _renderFormulation(version: MediumVersion): TemplateResult {
    return html`
      <dl>
        <dt>${this._t('medium_base_salts')}</dt>
        <dd>${version.base_salts}</dd>
        <dt>${this._t('medium_hormones')}</dt>
        <dd>${this._components(version.hormones)}</dd>
        <dt>${this._t('medium_additives')}</dt>
        <dd>${this._components(version.additives)}</dd>
        <dt>${this._t('medium_agar')}</dt>
        <dd>${version.agar_g_per_l} g/L</dd>
        <dt>${this._t('medium_sugar')}</dt>
        <dd>${version.sugar_g_per_l} g/L</dd>
        <dt>${this._t('medium_ph')}</dt>
        <dd>${version.ph_target}</dd>
        ${version.notes
          ? html`<dt>${this._t('medium_notes')}</dt>
              <dd>${version.notes}</dd>`
          : nothing}
      </dl>
    `;
  }

  private _renderHistory(medium: CultureMedium): TemplateResult {
    // Newest first: the reader is looking for what changed, and the most recent
    // fork is the change they are most likely asking about.
    const versions = [...medium.versions].sort((a, b) => b.version - a.version);
    return html`
      <div class="history">
        <p class="supporting">${this._t('medium_history_explainer')}</p>
        <ol>
          ${versions.map(
            (version) => html`
              <li class=${version.version === medium.current_version ? 'current' : ''}>
                <div class="history-head">
                  <strong>
                    ${localizeWithParams(
                      'tc.medium_version_label',
                      { version: version.version },
                      this.language
                    )}
                  </strong>
                  <span class="taken">${this._day(version.created_at)}</span>
                  ${version.version === medium.current_version
                    ? html`<span class="version-chip">${this._t('medium_current')}</span>`
                    : nothing}
                </div>
                ${this._renderFormulation(version)}
              </li>
            `
          )}
        </ol>
      </div>
    `;
  }

  private _renderMedium(medium: CultureMedium): TemplateResult {
    const current =
      medium.versions.find((version) => version.version === medium.current_version) ??
      medium.versions[medium.versions.length - 1];
    const open = this._openHistory.has(medium.id);

    return html`
      <li class="medium">
        <div class="medium-head">
          <h4>${medium.name}</h4>
          <span class="version-chip">
            ${localizeWithParams(
              'tc.medium_version_label',
              { version: medium.current_version },
              this.language
            )}
          </span>
          <div class="actions">
            <button @click=${() => this._emit('medium-edit-requested', { id: medium.id })}>
              ${this._t('medium_edit')}
            </button>
            <button @click=${() => this._emit('medium-delete-requested', { id: medium.id })}>
              ${this._t('medium_delete')}
            </button>
          </div>
        </div>
        ${current ? this._renderFormulation(current) : nothing}
        <button
          class="link"
          aria-expanded=${open ? 'true' : 'false'}
          @click=${() => this._toggleHistory(medium.id)}
        >
          ${localizeWithParams(
            open ? 'tc.medium_hide_history' : 'tc.medium_show_history',
            { count: medium.versions.length },
            this.language
          )}
        </button>
        ${open ? this._renderHistory(medium) : nothing}
      </li>
    `;
  }

  protected render(): TemplateResult {
    return html`
      <section aria-label=${this._t('medium_library_title')}>
        <header class="library">
          <h3>${this._t('medium_library_title')}</h3>
          <button @click=${() => this._emit('medium-create-requested')}>
            ${this._t('medium_add')}
          </button>
        </header>
        ${this.media.length
          ? html`<ul>
              ${this.media.map((medium) => this._renderMedium(medium))}
            </ul>`
          : html`<p class="empty supporting">${this._t('medium_library_empty')}</p>`}
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-tc-medium-library': GrowspaceTcMediumLibrary;
  }
}
