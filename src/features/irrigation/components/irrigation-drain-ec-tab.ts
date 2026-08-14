/**
 * Irrigation Drain EC Tab Component (ADR-0019)
 *
 * The dumb presentational element for the Irrigation Dialog's Drain EC tab —
 * drain/runoff EC monitoring. `@property .vm: DrainEcTabViewModel` in, semantic
 * Tab Intents out, **no `@state()` of its own** — the monitoring/log draft and
 * the saving/logging sub-state live in the DialogStateMachine and are projected
 * into the VM (b1). Markup is transcribed verbatim from the former inline
 * `_renderDrainECTab` so the rendered output stays byte-identical; the drain_ec
 * styling was already inline so nothing moved into `static styles`.
 *
 * Locale/clock formatting (`toLocaleString` timestamps, `toFixed` digit strings)
 * stays here in `render()` — it is presentation, not state, kept out of the pure
 * ViewModel.
 *
 * Tab Intents (the Dialog Shell owns their translation to SM events):
 *   - `drain-ec-draft-changed` detail: { partial: Partial<DrainEcDraft> }
 *       — covers the monitoring toggle AND every log/config number field.
 *   - `drain-ec-log-reading`   (no detail — the "Log Reading" button)
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { dialogStyles } from '../../../styles/dialog.styles';
import '../../../features/shared/ui/md3-number-input';
import '../../../features/shared/ui/md3-switch';
import type { DrainEcDraft } from '../../../dialogs/irrigation-dialog-sm';
import type {
  DrainEcTabViewModel,
  DrainEcReadingRowVM,
} from '../viewmodels/drain-ec-tab.viewmodel';

@customElement('irrigation-drain-ec-tab')
export class IrrigationDrainEcTab extends LitElement {
  @property({ attribute: false }) vm!: DrainEcTabViewModel;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }
    `,
  ];

  private _emit(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  /** Merge a field change into the SM draft via the shell. */
  private _updateDraft(partial: Partial<DrainEcDraft>): void {
    this._emit('drain-ec-draft-changed', { partial });
  }

  render(): TemplateResult {
    const vm = this.vm;
    const draft = vm.draft;
    const status = vm.status;
    const lastReading = status.lastReading;
    const isLogging = vm.sub.kind === 'logging';

    return html`
      <div class="detail-card" style="border-left:4px solid ${status.color};padding:16px 20px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div
            style="width:14px;height:14px;border-radius:50%;background:${status.color};box-shadow:0 0 8px ${status.color};flex-shrink:0;"
          ></div>
          <div>
            <div style="font-weight:600;font-size:1rem;">${status.text}</div>
            ${lastReading
              ? html`
                  <div style="font-size:0.8rem;opacity:0.6;margin-top:2px;">
                    Last reading: Feed ${lastReading.feedEc.toFixed(2)} → Drain
                    ${lastReading.drainEc.toFixed(2)} mS/cm at
                    ${new Date(lastReading.timestamp).toLocaleString()}
                  </div>
                `
              : nothing}
          </div>
        </div>
      </div>

      <div class="detail-card">
        <div
          style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;"
        >
          <h3 style="margin:0;">Monitoring Configuration</h3>
          ${vm.sub.kind === 'saving'
            ? html`<span style="font-size:0.8rem;opacity:0.6;">Saving…</span>`
            : nothing}
        </div>
        <p style="font-size:0.82rem;opacity:0.7;margin-bottom:20px;">
          Alert when drain EC exceeds feed EC by more than the max delta.
        </p>
        <div
          style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.05);padding:12px;border-radius:8px;margin-bottom:16px;"
        >
          <span>Enable EC drain monitoring</span>
          <md3-switch
            .checked=${draft.enabled}
            @change=${(e: Event) => {
              this._updateDraft({ enabled: (e.target as HTMLInputElement).checked });
            }}
          ></md3-switch>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <md3-number-input
            label="Max EC Delta (mS/cm)"
            .value=${draft.maxEcDelta}
            step="0.1"
            min="0.1"
            ?disabled=${!draft.enabled}
            @change=${(e: CustomEvent) => {
              this._updateDraft({ maxEcDelta: parseFloat(e.detail) || 1.0 });
            }}
          ></md3-number-input>
          <md3-number-input
            label="Target Runoff (%)"
            .value=${draft.targetRunoffPercent}
            min="5"
            max="50"
            step="5"
            ?disabled=${!draft.enabled}
            @change=${(e: CustomEvent) => {
              this._updateDraft({ targetRunoffPercent: parseInt(e.detail) || 20 });
            }}
          ></md3-number-input>
        </div>
      </div>

      <div class="detail-card">
        <h3 style="margin-top:0;">Log Drain Reading</h3>
        <p style="font-size:0.82rem;opacity:0.7;margin-bottom:20px;">
          Manually log feed EC and drain EC values measured with a handheld meter. Volumes are
          optional.
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
          <md3-number-input
            label="Feed EC (mS/cm)"
            .value=${draft.logFeedEc}
            step="0.1"
            min="0"
            @change=${(e: CustomEvent) => {
              this._updateDraft({ logFeedEc: parseFloat(e.detail) || 0 });
            }}
          ></md3-number-input>
          <md3-number-input
            label="Drain EC (mS/cm)"
            .value=${draft.logDrainEc}
            step="0.1"
            min="0"
            @change=${(e: CustomEvent) => {
              this._updateDraft({ logDrainEc: parseFloat(e.detail) || 0 });
            }}
          ></md3-number-input>
          <md3-number-input
            label="Feed Volume (mL) — optional"
            .value=${draft.logFeedVolume}
            step="100"
            min="0"
            @change=${(e: CustomEvent) => {
              this._updateDraft({ logFeedVolume: parseInt(e.detail) || 0 });
            }}
          ></md3-number-input>
          <md3-number-input
            label="Drain Volume (mL) — optional"
            .value=${draft.logDrainVolume}
            step="100"
            min="0"
            @change=${(e: CustomEvent) => {
              this._updateDraft({ logDrainVolume: parseInt(e.detail) || 0 });
            }}
          ></md3-number-input>
        </div>
        ${draft.logFeedEc > 0 && draft.logDrainEc > 0
          ? html`
              <div
                style="background:rgba(255,255,255,0.05);border-radius:8px;padding:10px 16px;margin-bottom:16px;display:flex;gap:24px;align-items:center;font-size:0.9rem;"
              >
                <span
                  >EC Delta:
                  <strong
                    style="color:${draft.logDrainEc - draft.logFeedEc > draft.maxEcDelta
                      ? '#f44336'
                      : '#4caf50'}"
                  >
                    Δ${(draft.logDrainEc - draft.logFeedEc).toFixed(2)} mS/cm
                  </strong></span
                >
                ${draft.logFeedVolume > 0 && draft.logDrainVolume > 0
                  ? html`
                      <span
                        >Runoff:
                        <strong
                          >${((draft.logDrainVolume / draft.logFeedVolume) * 100).toFixed(
                            1
                          )}%</strong
                        ></span
                      >
                    `
                  : nothing}
              </div>
            `
          : nothing}
        <button
          class="md3-button primary"
          style="background:#FF9800;"
          @click=${() => this._emit('drain-ec-log-reading')}
          ?disabled=${isLogging || draft.logFeedEc <= 0 || draft.logDrainEc <= 0}
        >
          ${isLogging ? 'Logging…' : 'Log Reading'}
        </button>
      </div>

      <div class="detail-card">
        <div
          style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"
        >
          <h3 style="margin:0;">Recent Readings</h3>
          <span style="font-size:0.8rem;opacity:0.5;">${vm.totalReadings} total</span>
        </div>
        ${vm.recent.length === 0
          ? html`
              <p style="opacity:0.6;text-align:center;padding:20px 0;">No readings logged yet.</p>
            `
          : html`
              <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:0.88rem;">
                  <thead>
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.15);opacity:0.7;">
                      <th style="text-align:left;padding:6px 8px;font-weight:500;">Time</th>
                      <th style="text-align:right;padding:6px 8px;font-weight:500;">Feed EC</th>
                      <th style="text-align:right;padding:6px 8px;font-weight:500;">Drain EC</th>
                      <th style="text-align:right;padding:6px 8px;font-weight:500;">Δ EC</th>
                      <th style="text-align:right;padding:6px 8px;font-weight:500;">Runoff</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${vm.recent.map((row: DrainEcReadingRowVM) => {
                      const r = row.reading;
                      const delta = row.delta;
                      const overThreshold = row.overThreshold;
                      const runoffPct =
                        row.runoffPercent !== null ? row.runoffPercent.toFixed(1) + '%' : '—';
                      return html`
                        <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
                          <td style="padding:6px 8px;opacity:0.7;">
                            ${new Date(r.timestamp).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td style="text-align:right;padding:6px 8px;">${r.feedEc.toFixed(2)}</td>
                          <td style="text-align:right;padding:6px 8px;">${r.drainEc.toFixed(2)}</td>
                          <td
                            style="text-align:right;padding:6px 8px;color:${overThreshold
                              ? '#f44336'
                              : delta > this.vm.draft.maxEcDelta * 0.7
                                ? 'var(--gm-warning-color, #FF9800)'
                                : '#4caf50'};font-weight:500;"
                          >
                            ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}
                          </td>
                          <td style="text-align:right;padding:6px 8px;opacity:0.6;">
                            ${runoffPct}
                          </td>
                        </tr>
                      `;
                    })}
                  </tbody>
                </table>
              </div>
            `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'irrigation-drain-ec-tab': IrrigationDrainEcTab;
  }
}
