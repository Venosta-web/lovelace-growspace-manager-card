import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import { localize, localizePlural, localizeWithParams } from '../../../localize/localize';
import type { RunView } from '../../../slices/grow-run';
import {
  conflictText,
  localToday,
  previewGrowRunStart,
  refusalText,
  startGrowRun,
  type CoverageGap,
  type StartPreview,
} from '../../../slices/grow-run/start';

/**
 * Starting a Grow Run (GSM#668), now or on an earlier day (GSM#670).
 *
 * Its own lazy chunk: the header carries only the chip, and a grower opens
 * this rarely. Starting now is what it always was — a name, goals, and the
 * Plants that will take part. Naming an earlier day asks the backend what
 * that start would claim from the growspace's Unattributed Activity, and
 * shows it before anything is committed: who takes part and from when, the
 * movement and days it takes over, what nothing recorded, and whether the
 * day may be used at all. Confirming sends the same day, and the backend
 * decides again on what it holds then, so the preview can never commit
 * something the grower did not see.
 */
@customElement('growspace-run-start-dialog')
export class GrowspaceRunStartDialog extends LitElement {
  @property({ attribute: false }) view: RunView | null = null;
  /** How many Plants stand in the growspace now: the Participants a start takes. */
  @property({ type: Number }) plantCount = 0;
  @property() language = 'en';
  /** Home Assistant's timezone: what "today" means for a Run. */
  @property() timeZone?: string;

  @state() private _busy = false;
  @state() private _refusal: string | null = null;
  @state() private _startedOn = '';
  @state() private _preview: StartPreview | null = null;
  @state() private _previewError: string | null = null;
  @state() private _loadingPreview = false;

  @query('#run-label') private _labelInput?: HTMLInputElement;
  @query('#run-goals') private _goalsInput?: HTMLTextAreaElement;

  private _previewRequest = 0;

  static styles = css`
    form {
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
      padding-inline-start: 20px;
    }

    h3 {
      margin: 0 0 4px;
      font-size: 0.875rem;
      font-weight: 600;
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

    button:focus-visible,
    input:focus-visible,
    textarea:focus-visible {
      outline: 2px solid var(--primary-color, #4caf50);
      outline-offset: 2px;
    }

    .claim {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.24));
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

  private get _today(): string {
    return localToday(this.timeZone);
  }

  /** An earlier day than today: the start claims activity instead of beginning now. */
  private get _backdated(): boolean {
    return !!this._startedOn && this._startedOn < this._today;
  }

  /** A backdated start is confirmed only on a preview that allows it. */
  private get _mayConfirm(): boolean {
    if (!this._backdated) return true;
    return !!this._preview && !this._preview.conflict && !this._loadingPreview;
  }

  private _moment(iso: string): string {
    const options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };
    try {
      return new Date(iso).toLocaleString(this.language, {
        ...options,
        timeZone: this._preview?.timezone ?? this.timeZone,
      });
    } catch {
      return new Date(iso).toLocaleString(this.language, options);
    }
  }

  private _close(): void {
    this.dispatchEvent(new CustomEvent('closed', { bubbles: true, composed: true }));
  }

  private async _pickDay(event: Event): Promise<void> {
    this._startedOn = (event.target as HTMLInputElement).value;
    this._refusal = null;
    this._preview = null;
    this._previewError = null;
    const request = ++this._previewRequest;
    if (!this._backdated || !this.view) {
      this._loadingPreview = false;
      return;
    }
    this._loadingPreview = true;
    try {
      const result = await previewGrowRunStart(this.view.growspaceId, this._startedOn);
      if (request !== this._previewRequest) return;
      if (result.outcome === 'preview') this._preview = result.preview;
      else this._previewError = refusalText(result.refusal, this.language);
    } catch (error) {
      if (request !== this._previewRequest) return;
      this._previewError = this._t('refused', { message: errorMessage(error) });
    } finally {
      if (request === this._previewRequest) this._loadingPreview = false;
    }
  }

  private async _submit(event: Event): Promise<void> {
    event.preventDefault();
    const view = this.view;
    if (!view || view.runRevision === null || this._busy || !this._mayConfirm) return;
    this._busy = true;
    this._refusal = null;
    try {
      const result = await startGrowRun(view.growspaceId, view.runRevision, {
        label: this._labelInput?.value,
        goals: this._goalsInput?.value,
        ...(this._backdated ? { startedOn: this._startedOn } : {}),
      });
      if (result.outcome === 'started') {
        this._close();
      } else {
        this._refusal = refusalText(result.refusal, this.language);
      }
    } catch (error) {
      this._refusal = this._t('refused', { message: errorMessage(error) });
    } finally {
      this._busy = false;
    }
  }

  private _renderGap(gap: CoverageGap) {
    const known = gap.reason === 'before_recording' || gap.reason === 'not_observed';
    return html`<li>
      ${this._t('gap_range', { start: this._moment(gap.start), end: this._moment(gap.end) })} ·
      ${known ? this._t(`gap_${gap.reason}`) : gap.reason.replaceAll('_', ' ')}
    </li>`;
  }

  private _renderClaim() {
    if (this._loadingPreview) {
      return html`<p class="muted" role="status">${this._t('preview_loading')}</p>`;
    }
    if (this._previewError) {
      return html`<p class="refusal" role="alert">${this._previewError}</p>`;
    }
    const preview = this._preview;
    if (!preview) return nothing;
    if (preview.conflict) {
      return html`<p class="refusal" role="alert" data-testid="start-conflict">
        ${conflictText(preview.conflict, this.language)}
      </p>`;
    }
    const plants =
      preview.participant_count === 0
        ? this._t('claim_plants_zero')
        : localizePlural('grow_run.claim_plants', preview.participant_count, {}, this.language);
    return html`
      <section class="claim" data-testid="start-preview" aria-label=${this._t('preview_heading')}>
        <p data-testid="participants">${plants}</p>
        <p class="muted" data-testid="claimed-activity">
          ${this._t('claim_summary', {
            movements: localizePlural(
              'grow_run.claim_movements',
              preview.claimed_facts.length,
              {},
              this.language
            ),
            days: localizePlural(
              'grow_run.claim_days',
              preview.claimed_days.length,
              {},
              this.language
            ),
          })}
        </p>
        ${preview.claimed_safety_facts?.length
          ? html`<p class="muted" data-testid="claimed-safety">
              ${localizePlural(
                'grow_run.claim_safety_events',
                preview.claimed_safety_facts.length,
                {},
                this.language
              )}
            </p>`
          : nothing}
        ${preview.participations.length
          ? html`<ul data-testid="start-participations">
              ${preview.participations.map(
                (row) =>
                  html`<li>
                    ${row.name ?? row.plant_id} · ${this._moment(row.opened_at)} –
                    ${row.closed_at ? this._moment(row.closed_at) : this._t('present')}
                  </li>`
              )}
            </ul>`
          : nothing}
        ${preview.gaps.length
          ? html`<div data-testid="start-gaps">
              <h3>${this._t('gaps_heading')}</h3>
              <ul>
                ${preview.gaps.map((gap) => this._renderGap(gap))}
              </ul>
            </div>`
          : nothing}
      </section>
    `;
  }

  render() {
    const plants =
      this.plantCount === 0
        ? this._t('plants_now_zero')
        : localizePlural('grow_run.plants_now', this.plantCount, {}, this.language);
    const today = this._today;
    return html`
      <ha-dialog open width="medium" .headerTitle=${this._t('dialog_title')} @closed=${this._close}>
        <form @submit=${this._submit}>
          <label>
            ${this._t('field_started_on')}
            <input
              id="run-started-on"
              name="started_on"
              type="date"
              max=${today}
              .value=${this._startedOn || today}
              aria-describedby="run-started-on-hint"
              @change=${this._pickDay}
            />
          </label>
          <p id="run-started-on-hint" class="muted">${this._t('field_started_on_hint')}</p>
          ${this._backdated
            ? this._renderClaim()
            : html`
                <p>${this._t('dialog_intro')}</p>
                <p class="muted" data-testid="participants">${plants}</p>
              `}
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
            <button
              type="submit"
              class="primary"
              data-action="start"
              ?disabled=${this._busy || !this._mayConfirm}
            >
              ${this._busy
                ? this._t('starting')
                : this._backdated
                  ? this._t('confirm_backdated')
                  : this._t('confirm')}
            </button>
          </div>
        </form>
      </ha-dialog>
    `;
  }
}

function errorMessage(error: unknown): string {
  return error && typeof error === 'object' && 'message' in error
    ? String((error as { message: unknown }).message)
    : String(error);
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-run-start-dialog': GrowspaceRunStartDialog;
  }
}
