import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  mdiAlertOctagon,
  mdiCheckCircleOutline,
  mdiHelpCircleOutline,
  mdiPauseCircleOutline,
  mdiPowerSleep,
  mdiStopCircle,
  mdiWaterPump,
} from '@mdi/js';

import { statusTokens } from '../../../styles/status.styles';
import { localize, localizeWithParams } from '../../../localize/localize';
import {
  acknowledgeFault,
  emergencyStop,
  formatSince,
  refusalMessage,
  resetSafety,
  setIrrigationArmed,
  type SafetyView,
  type SafetyViewState,
} from '../../../slices/safety';

const ICON: Record<SafetyViewState, string> = {
  idle: mdiPowerSleep,
  ready: mdiCheckCircleOutline,
  running: mdiWaterPump,
  inhibited: mdiPauseCircleOutline,
  fault: mdiAlertOctagon,
  emergency_stop: mdiStopCircle,
  unavailable: mdiHelpCircleOutline,
};

type SafetyAction = 'emergency_stop' | 'reset' | 'acknowledge' | 'arm' | 'disarm';

/**
 * How long a control that just appeared under the pointer ignores taps. "Stop
 * now" appears where "Emergency stop" was, and "Reset safety" where "Stop now"
 * was, so without it a double tap skips the confirmation and a triple tap
 * stops and un-stops the growspace.
 */
const SETTLE_MS = 700;

/**
 * The irrigation safety chip and its detail (card#974).
 *
 * The chip is the immediate layer: the controller state and the reason that
 * decides it, coloured by severity. Tapping it opens the detail — every
 * structured reason, how long it has held, and the operator controls. The
 * Emergency Stop is the detail's first control, so it is two taps from the
 * header on any screen, and asks once before it acts.
 *
 * This lives in the entry bundle on purpose. The lazy dialog chunks are what a
 * stale HACS install loses first (ADR 0053); an emergency stop must not be.
 */
@customElement('growspace-safety-chip')
export class GrowspaceSafetyChip extends LitElement {
  @property({ attribute: false }) view: SafetyView | null = null;
  @property({ type: Boolean }) isAdmin = false;
  @property() language = 'en';

  @state() private _open = false;
  @state() private _confirmingStop = false;
  @state() private _busy: SafetyAction | null = null;
  @state() private _refusal: string | null = null;
  /** When the controls last moved: the confirmation opened, or the state changed. */
  private _shiftedAt = 0;

  static styles = [
    statusTokens,
    css`
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

      .chip:focus-visible,
      button:focus-visible {
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

      .severity-quiet {
        --cue: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
      }
      .severity-ok {
        --cue: var(--gm-status-optimal);
      }
      .severity-active {
        --cue: var(--info-color, #2196f3);
      }
      .severity-warning {
        --cue: var(--gm-status-warning);
        --chip-fill: var(--gm-status-warning-fill);
        --chip-outline: var(--gm-status-warning-outline);
      }
      .severity-danger {
        --cue: var(--gm-status-danger);
        --chip-fill: var(--gm-status-danger-fill);
        --chip-outline: var(--gm-status-danger-outline);
      }

      .detail {
        display: flex;
        flex-direction: column;
        gap: 16px;
        color: var(--primary-text-color);
      }

      .status {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1.125rem;
        font-weight: 600;
      }

      .status svg {
        width: 24px;
        height: 24px;
      }

      .muted {
        color: var(--secondary-text-color);
        font-size: 0.875rem;
        font-weight: 400;
      }

      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      li {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 8px 12px;
        border-radius: 8px;
        background: var(--chip-fill, rgba(255, 255, 255, 0.05));
      }

      li code {
        font-size: 0.75rem;
        color: var(--secondary-text-color);
      }

      .controls {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .control {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      button.action {
        min-height: 44px;
        padding: 0 16px;
        border-radius: 12px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.06));
        color: var(--primary-text-color);
        font: inherit;
        font-weight: 600;
        cursor: pointer;
      }

      button.action[disabled] {
        opacity: 0.5;
        cursor: not-allowed;
      }

      button.stop {
        width: 100%;
        background: var(--gm-status-danger);
        border-color: var(--gm-status-danger);
        color: var(--text-primary-color, #fff);
      }

      .note {
        margin: 0;
        font-size: 0.8125rem;
        color: var(--secondary-text-color);
      }

      .refusal {
        margin: 0;
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid var(--gm-status-danger-outline);
        background: var(--gm-status-danger-fill);
        font-size: 0.875rem;
      }
    `,
  ];

  protected willUpdate(changed: PropertyValues<this>): void {
    // A refusal answers the state it was made in; once the backend moves on,
    // it no longer describes anything on screen.
    if (changed.has('view') && changed.get('view')?.state !== this.view?.state) {
      this._refusal = null;
      this._confirmingStop = false;
      this._shiftedAt = Date.now();
    }
  }

  private _settled(): boolean {
    return Date.now() - this._shiftedAt >= SETTLE_MS;
  }

  private _askToStop(): void {
    this._confirmingStop = true;
    this._shiftedAt = Date.now();
  }

  private _t(key: string, params: Record<string, string | number> = {}): string {
    return Object.keys(params).length
      ? localizeWithParams(`safety.${key}`, params, this.language)
      : localize(`safety.${key}`, '', '', this.language);
  }

  private async _run(action: SafetyAction): Promise<void> {
    const view = this.view;
    if (!view || this._busy) return;
    if (action !== 'arm' && action !== 'disarm' && !this._settled()) return;
    this._busy = action;
    this._refusal = null;
    try {
      switch (action) {
        case 'emergency_stop':
          await emergencyStop(view.growspaceId);
          break;
        case 'reset':
          await resetSafety(view.growspaceId);
          break;
        case 'acknowledge':
          await acknowledgeFault(view.growspaceId);
          break;
        case 'arm':
        case 'disarm':
          if (view.entities.irrigationArmed) {
            await setIrrigationArmed(view.entities.irrigationArmed, action === 'arm');
          }
          break;
      }
      this._confirmingStop = false;
    } catch (error) {
      this._refusal = this._t('refused', { message: refusalMessage(error) });
    } finally {
      this._busy = null;
    }
  }

  private _close(): void {
    this._open = false;
    this._confirmingStop = false;
    this._refusal = null;
  }

  private _renderReasons(view: SafetyView) {
    if (view.reasons.length === 0) {
      return html`<p class="note">${this._t(`none_${view.state}`)}</p>`;
    }
    const now = Date.now();
    return html`
      <ul aria-label=${this._t('reasons_heading')}>
        ${view.reasons.map((reason) => {
          // The status line already says since when; a reason repeats it only
          // when it began at a different moment.
          const since =
            reason.since === view.since ? null : formatSince(reason.since, now, this.language);
          return html`
            <li data-code=${reason.code}>
              <strong>${reason.label}</strong>
              <span class="muted">${reason.detail}</span>
              ${since
                ? html`<span class="muted">${this._t('since', { time: since })}</span>`
                : nothing}
              ${reason.subject ? html`<code>${reason.subject}</code>` : nothing}
            </li>
          `;
        })}
      </ul>
    `;
  }

  private _renderStop(view: SafetyView) {
    if (view.state === 'emergency_stop') return nothing;
    if (!this._confirmingStop) {
      return html`
        <div class="control">
          <button
            class="action stop"
            data-action="emergency_stop"
            ?disabled=${this._busy !== null}
            @click=${() => this._askToStop()}
          >
            ${this._t('emergency_stop')}
          </button>
          <p class="note">${this._t('emergency_stop_hint')}</p>
        </div>
      `;
    }
    return html`
      <div class="control" role="group" aria-label=${this._t('emergency_stop_confirm')}>
        <strong>${this._t('emergency_stop_confirm')}</strong>
        <div class="row">
          <button
            class="action stop"
            data-action="confirm_emergency_stop"
            ?disabled=${this._busy !== null}
            @click=${() => this._run('emergency_stop')}
          >
            ${this._t('emergency_stop_confirm_action')}
          </button>
          <button
            class="action"
            data-action="cancel_emergency_stop"
            ?disabled=${this._busy !== null}
            @click=${() => (this._confirmingStop = false)}
          >
            ${this._t('cancel')}
          </button>
        </div>
      </div>
    `;
  }

  /** An admin-only latch control, disabled with its reason in words. */
  private _renderLatchControl(action: 'reset' | 'acknowledge', blocked: string | null) {
    const why = !this.isAdmin ? this._t('admin_only') : blocked;
    return html`
      <div class="control">
        <button
          class="action"
          data-action=${action}
          ?disabled=${why !== null || this._busy !== null}
          aria-describedby=${why ? `${action}-why` : nothing}
          @click=${() => this._run(action)}
        >
          ${this._t(action)}
        </button>
        ${why ? html`<p class="note" id="${action}-why">${why}</p>` : nothing}
      </div>
    `;
  }

  private _renderArming(view: SafetyView) {
    // The switch keeps its position under a latched stop, but the stop
    // overrides it; "armed" beside an emergency stop would read as a contradiction.
    if (view.state === 'emergency_stop') return nothing;
    if (!view.entities.irrigationArmed || view.irrigationArmed === null) return nothing;
    const armed = view.irrigationArmed;
    const action = armed ? 'disarm' : 'arm';
    return html`
      <div class="control">
        <p class="note">${this._t(armed ? 'armed_on' : 'armed_off')}</p>
        <div class="row">
          <button
            class="action"
            data-action=${action}
            ?disabled=${this._busy !== null}
            @click=${() => this._run(action)}
          >
            ${this._t(action)}
          </button>
        </div>
      </div>
    `;
  }

  private _renderDetail(view: SafetyView) {
    const since = formatSince(view.since, Date.now(), this.language);
    return html`
      <ha-dialog open width="medium" .headerTitle=${this._t('dialog_title')} @closed=${this._close}>
        <div class="detail severity-${view.severity}">
          <div class="status" role="status">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d=${ICON[view.state]}></path></svg>
            <span>
              ${view.label}
              ${since
                ? html`<span class="muted">· ${this._t('since', { time: since })}</span>`
                : nothing}
            </span>
          </div>

          ${this._renderReasons(view)}

          <div class="controls">
            ${this._renderStop(view)}
            ${view.state === 'fault'
              ? this._renderLatchControl(
                  'acknowledge',
                  view.faultOutputsNotOff.length > 0
                    ? this._t('acknowledge_outputs_on', {
                        entities: view.faultOutputsNotOff.join(', '),
                      })
                    : null
                )
              : nothing}
            ${view.state === 'emergency_stop' ? this._renderLatchControl('reset', null) : nothing}
            ${this._renderArming(view)}
            ${view.automationEnabled === false
              ? html`<p class="note">${this._t('automation_off_note')}</p>`
              : nothing}
          </div>

          ${this._refusal ? html`<p class="refusal" role="alert">${this._refusal}</p>` : nothing}
        </div>
      </ha-dialog>
    `;
  }

  render() {
    const view = this.view;
    if (!view) return nothing;
    return html`
      <button
        class="chip severity-${view.severity}"
        data-state=${view.state}
        aria-haspopup="dialog"
        aria-label=${this._t('chip_label', { summary: view.summary })}
        title=${view.summary}
        @click=${() => (this._open = true)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d=${ICON[view.state]}></path></svg>
        <span>${view.summary}</span>
      </button>
      ${this._open ? this._renderDetail(view) : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-safety-chip': GrowspaceSafetyChip;
  }
}
