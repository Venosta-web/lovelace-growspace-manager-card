import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { localize, localizeWithParams } from '../../../localize/localize';
import { refusalText } from '../../../slices/grow-run/start';
import { discardGrowRun } from '../../../slices/grow-run/correction';
import { DISCARD_BLOCKERS, MAX_REASON_LENGTH } from '../../../slices/grow-run/correction-schema';

/**
 * Discarding an Active Run that recorded nothing (GSM#917).
 *
 * It is the undo of a start: the Run is removed as if it had never started,
 * its number is not used again, and the growspace goes back to keeping its
 * Unattributed Activity. A Run that recorded anything — a Plant moving, a
 * Participant joining or leaving, a harvest — cannot be discarded, and the
 * refusal lists each kind so the grower knows why and completes it instead.
 *
 * It is a lazy chunk: the run chip imports it from the Active Run's details.
 */
@customElement('growspace-run-discard-dialog')
export class GrowspaceRunDiscardDialog extends LitElement {
  @property() growspaceId = '';
  @property() runId = '';
  @property({ type: Number }) sequenceNumber = 0;
  /** The Run Revision the grower decided on. */
  @property({ type: Number }) runRevision = 0;
  @property() language = 'en';

  @state() private _reason = '';
  @state() private _busy = false;
  @state() private _refusal: string | null = null;
  @state() private _blockers: readonly string[] = [];
  @state() private _done = false;

  static styles = css`
    .body {
      display: flex;
      flex-direction: column;
      gap: 16px;
      color: var(--primary-text-color);
    }

    p,
    ul {
      margin: 0;
    }

    ul {
      padding-left: 20px;
    }

    h3 {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 600;
    }

    label {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.875rem;
    }

    textarea {
      min-height: 64px;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.24));
      background: transparent;
      color: var(--primary-text-color);
      font: inherit;
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

    .row button.danger {
      border-color: transparent;
      background: var(--error-color, #f44336);
      color: var(--text-primary-color, #fff);
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

    button:focus-visible,
    textarea:focus-visible {
      outline: 2px solid var(--primary-color, #4caf50);
      outline-offset: 2px;
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

  private _blockerText(reason: string): string {
    return (DISCARD_BLOCKERS as readonly string[]).includes(reason)
      ? this._t(`discard_blocker_${reason}`)
      : this._t('discard_blocker_other', { reason: reason.replaceAll('_', ' ') });
  }

  private async _submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this._busy) return;
    this._busy = true;
    this._refusal = null;
    this._blockers = [];
    try {
      const result = await discardGrowRun(
        this.growspaceId,
        this.runId,
        this.runRevision,
        this._reason
      );
      if (result.outcome === 'discarded') {
        this._done = true;
        return;
      }
      this._refusal = refusalText(result.refusal, this.language);
      this._blockers = result.refusal.reasons ?? [];
    } catch (error) {
      this._refusal = this._t('refused', { message: messageOf(error) });
    } finally {
      this._busy = false;
    }
  }

  private _close(): void {
    this.dispatchEvent(new CustomEvent('closed'));
  }

  private _renderForm(): TemplateResult {
    return html`
      <form class="body" @submit=${this._submit}>
        <p>${this._t('discard_intro')}</p>
        <label>
          ${this._t('discard_reason')}
          <textarea
            data-field="reason"
            maxlength=${MAX_REASON_LENGTH}
            .value=${this._reason}
            @input=${(event: Event) => (this._reason = (event.target as HTMLTextAreaElement).value)}
          ></textarea>
        </label>
        ${this._refusal
          ? html`<p class="refusal" role="alert" data-testid="discard-refusal">${this._refusal}</p>`
          : nothing}
        ${this._blockers.length
          ? html`<section>
              <h3>${this._t('discard_blocked_heading')}</h3>
              <ul data-testid="discard-blockers">
                ${this._blockers.map((reason) => html`<li>${this._blockerText(reason)}</li>`)}
              </ul>
            </section>`
          : nothing}
        <div class="row">
          <button type="button" data-action="cancel" ?disabled=${this._busy} @click=${this._close}>
            ${this._t('cancel')}
          </button>
          <button
            type="submit"
            class="danger"
            data-action="discard"
            ?disabled=${this._busy || this._blockers.length > 0}
          >
            ${this._busy ? this._t('discarding') : this._t('discard')}
          </button>
        </div>
      </form>
    `;
  }

  render() {
    return html`
      <ha-dialog
        open
        .headerTitle=${this._t('discard_title', { number: this.sequenceNumber })}
        @closed=${this._close}
      >
        ${this._done
          ? html`<div class="body" data-testid="discard-done">
              <p role="status">${this._t('discard_done', { number: this.sequenceNumber })}</p>
              <div class="row">
                <button type="button" class="primary" data-action="close" @click=${this._close}>
                  ${this._t('close')}
                </button>
              </div>
            </div>`
          : this._renderForm()}
      </ha-dialog>
    `;
  }
}

function messageOf(error: unknown): string {
  return error && typeof error === 'object' && 'message' in error
    ? String((error as { message: unknown }).message)
    : String(error);
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-run-discard-dialog': GrowspaceRunDiscardDialog;
  }
}
