import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { mdiHelpCircleOutline, mdiPlus, mdiSprout } from '@mdi/js';

import { localize, localizePlural, localizeWithParams } from '../../../localize/localize';
import { refusalText, startGrowRun, type RunView } from '../../../slices/grow-run';

/**
 * The Active Run chip (GSM#668, GSM#797 "UI placement").
 *
 * The main card carries no more of Grow Runs than this: the Active Run as one
 * compact chip beside the growspace name — `Run #4 · 61 days · 17 plants` —
 * or, without one, a `Start run` chip. The Active Run opens its sensor's
 * details; the Grow Run View it will open instead is GSM#675.
 *
 * Starting is one small dialog: an optional name and goals, and the number of
 * Plants that will take part. Nothing is optimistic. The chip changes when the
 * Active Run Sensor does, and a refusal — someone else started a run, this
 * user may not — is said in words while the chip catches up.
 */
@customElement('growspace-run-chip')
export class GrowspaceRunChip extends LitElement {
  @property({ attribute: false }) view: RunView | null = null;
  /** How many Plants stand in the growspace now: the Participants a start takes. */
  @property({ type: Number }) plantCount = 0;
  @property() language = 'en';

  @state() private _open = false;
  @state() private _busy = false;
  @state() private _refusal: string | null = null;

  @query('#run-label') private _labelInput?: HTMLInputElement;
  @query('#run-goals') private _goalsInput?: HTMLTextAreaElement;

  static styles = css`
    :host {
      display: inline-flex;
      min-width: 0;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      max-width: 100%;
      min-height: 32px;
      padding: 4px 12px 4px 8px;
      border-radius: 16px;
      border: 1px solid var(--chip-outline, rgba(255, 255, 255, 0.12));
      background: var(--chip-fill, rgba(255, 255, 255, 0.05));
      color: var(--primary-text-color, #fff);
      font: inherit;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
    }

    .chip.start {
      border-style: dashed;
      color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
    }

    .chip:focus-visible,
    button:focus-visible,
    input:focus-visible,
    textarea:focus-visible {
      outline: 2px solid var(--primary-color, #4caf50);
      outline-offset: 2px;
    }

    .chip span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      fill: var(--cue, currentColor);
    }

    .active {
      --cue: var(--primary-color, #4caf50);
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      color: var(--primary-text-color);
    }

    p {
      margin: 0;
    }

    .muted {
      color: var(--secondary-text-color);
    }

    label {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.875rem;
    }

    input,
    textarea {
      font: inherit;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.24));
      background: var(--card-background-color, transparent);
      color: var(--primary-text-color);
    }

    textarea {
      min-height: 72px;
      resize: vertical;
    }

    .row {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
    }

    .row button {
      min-height: 36px;
      padding: 6px 16px;
      border-radius: 18px;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.24));
      background: transparent;
      color: var(--primary-text-color);
      font: inherit;
      cursor: pointer;
    }

    .row button.primary {
      border-color: transparent;
      background: var(--primary-color, #4caf50);
      color: var(--text-primary-color, #fff);
    }

    button:disabled {
      cursor: default;
      opacity: 0.6;
    }

    .refusal {
      color: var(--error-color, #f44336);
    }
  `;

  private _t(key: string, params: Record<string, string | number> = {}): string {
    return Object.keys(params).length
      ? localizeWithParams(`grow_run.${key}`, params, this.language)
      : localize(`grow_run.${key}`, '', '', this.language);
  }

  private _openDetails(): void {
    if (!this.view) return;
    this.dispatchEvent(
      new CustomEvent('hass-more-info', {
        detail: { entityId: this.view.entityId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _close(): void {
    this._open = false;
    this._refusal = null;
  }

  private async _submit(event: Event): Promise<void> {
    event.preventDefault();
    const view = this.view;
    if (!view || view.runRevision === null || this._busy) return;
    this._busy = true;
    this._refusal = null;
    try {
      const result = await startGrowRun(view.growspaceId, view.runRevision, {
        label: this._labelInput?.value,
        goals: this._goalsInput?.value,
      });
      if (result.outcome === 'started') {
        this._close();
      } else {
        this._refusal = refusalText(result.refusal, this.language);
      }
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message: unknown }).message)
          : String(error);
      this._refusal = this._t('refused', { message });
    } finally {
      this._busy = false;
    }
  }

  private _renderDialog() {
    const plants =
      this.plantCount === 0
        ? this._t('plants_now_zero')
        : localizePlural('grow_run.plants_now', this.plantCount, {}, this.language);
    return html`
      <ha-dialog open width="medium" .headerTitle=${this._t('dialog_title')} @closed=${this._close}>
        <form @submit=${this._submit}>
          <p>${this._t('dialog_intro')}</p>
          <p class="muted" data-testid="participants">${plants}</p>
          <label>
            ${this._t('field_label')}
            <input id="run-label" name="label" maxlength="80" autocomplete="off" />
          </label>
          <label>
            ${this._t('field_goals')}
            <textarea id="run-goals" name="goals" maxlength="2000"></textarea>
          </label>
          ${this._refusal ? html`<p class="refusal" role="alert">${this._refusal}</p>` : nothing}
          <div class="row">
            <button
              type="button"
              data-action="cancel"
              ?disabled=${this._busy}
              @click=${this._close}
            >
              ${this._t('cancel')}
            </button>
            <button type="submit" class="primary" data-action="start" ?disabled=${this._busy}>
              ${this._busy ? this._t('starting') : this._t('confirm')}
            </button>
          </div>
        </form>
      </ha-dialog>
    `;
  }

  render() {
    const view = this.view;
    if (!view) return nothing;

    if (view.state === 'none') {
      return html`
        <button
          class="chip start"
          data-state="none"
          aria-haspopup="dialog"
          aria-label=${this._t('start_label')}
          @click=${() => (this._open = true)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d=${mdiPlus}></path></svg>
          <span>${view.summary}</span>
        </button>
        ${this._open ? this._renderDialog() : nothing}
      `;
    }

    const active = view.state === 'active';
    const label = active
      ? this._t('chip_label', { summary: view.summary })
      : this._t('unavailable_label');
    return html`
      <button
        class="chip ${active ? 'active' : ''}"
        data-state=${view.state}
        aria-label=${label}
        title=${active ? view.summary : this._t('unavailable_label')}
        @click=${this._openDetails}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d=${active ? mdiSprout : mdiHelpCircleOutline}></path>
        </svg>
        <span>${view.summary}</span>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-run-chip': GrowspaceRunChip;
  }
}
