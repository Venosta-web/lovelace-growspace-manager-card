/**
 * Irrigation Config Tab Component (ADR-0019)
 *
 * The dumb presentational element for the Irrigation Dialog's Configuration tab —
 * pump entity selection, optional safety caps, behaviour toggles and the manual
 * "Run Now" override. `@property .vm: ConfigTabViewModel` in, semantic Tab
 * Intents out, **no `@state()` of its own** — the config draft + the pump-entity
 * drafts live in the DialogStateMachine and are projected into the VM (b1).
 * Markup is transcribed verbatim from the former inline `_renderConfigSection`
 * so the rendered output stays byte-identical; the config-only `.action-btn` CSS
 * moved into `static styles` here (`.stub-row*` is shared with the still-inline
 * Steering tab, so it stays in the host too and is duplicated here for the
 * config rows that now live in this shadow).
 *
 * Number-string formatting (`String(value)` / `parseFloat` / `parseInt`) stays
 * here in `render()` — it is presentation, not state, kept out of the pure VM.
 *
 * Tab Intents (the Dialog Shell owns their translation to SM events):
 *   - `config-pump-changed`  detail: { which: 'irrigation' | 'drain'; value }
 *       — the two pump `<select>`s; route to `UPDATE_SCHEDULES_DRAFT`.
 *   - `config-draft-changed` detail: { partial: Partial<ConfigDraft> }
 *       — caps + behaviour toggles; route to `UPDATE_CONFIG_DRAFT`.
 *   - `config-run-now`       (no detail — the "▶ Run Now" button)
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { dialogStyles } from '../../../styles/dialog.styles';
import '../../../features/shared/ui/md3-switch';
import '../../../features/shared/ui/gs-help-tooltip';
import type { ConfigDraft } from '../../../dialogs/irrigation-dialog-sm';
import type { ConfigTabViewModel, PumpEntityOptionVM } from '../viewmodels/config-tab.viewmodel';

@customElement('irrigation-config-tab')
export class IrrigationConfigTab extends LitElement {
  @property({ attribute: false }) vm!: ConfigTabViewModel;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }

      .action-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 18px;
        border-radius: var(--border-radius-full, 9999px);
        border: 1px solid rgba(79, 195, 247, 0.4);
        background: rgba(79, 195, 247, 0.1);
        color: #4fc3f7;
        font-size: var(--font-size-supporting);
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
      }
      .action-btn:hover:not([disabled]) {
        background: rgba(79, 195, 247, 0.2);
      }
      .action-btn[disabled],
      .action-btn.saving {
        opacity: 0.5;
        cursor: default;
      }

      .section-note {
        margin: 0 0 14px;
        font-size: 12px;
        line-height: 1.4;
        opacity: 0.6;
      }

      /* ── Disable stub controls (shared shape with the still-inline Steering tab) ── */
      .stub-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: var(--border-radius-sm, 8px);
        opacity: 0.55;
      }
      .stub-row-label {
        font-size: var(--font-size-supporting);
      }
      .stub-row-desc {
        font-size: 11px;
        opacity: 0.6;
        margin-top: 2px;
      }
    `,
  ];

  private _emit(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  /** Merge a field change into the SM config draft via the shell. */
  private _updateDraft(partial: Partial<ConfigDraft>): void {
    this._emit('config-draft-changed', { partial });
  }

  private _renderEntitySelect(
    label: string,
    value: string,
    options: PumpEntityOptionVM[],
    which: 'irrigation' | 'drain'
  ): TemplateResult {
    return html`
      <div class="md3-input-group">
        <label class="md3-label">${label}</label>
        <select
          class="md3-input"
          .value=${value}
          @change=${(e: Event) =>
            this._emit('config-pump-changed', {
              which,
              value: (e.target as HTMLSelectElement).value,
            })}
        >
          <option value="">None</option>
          ${options.map(
            (o) => html`
              <option value="${o.value}" ?selected=${o.value === value}>${o.label}</option>
            `
          )}
        </select>
      </div>
    `;
  }

  render(): TemplateResult {
    const vm = this.vm;
    const draft = vm.draft;

    const isTank = vm.irrigationMethod === 'tank';

    return html`
      <div class="detail-card">
        <div class="section-header"><h3>Pump Configuration</h3></div>
        ${isTank
          ? html`<p class="section-note">
              Optional — this growspace runs tank-based (gravity or manual). Add an irrigation pump
              to enable automated schedules, manual run controls, and Crop Steering.
            </p>`
          : nothing}
        <div class="section-content">
          ${this._renderEntitySelect(
            isTank ? 'Irrigation Pump (optional)' : 'Irrigation Pump',
            vm.irrigationPumpEntity,
            vm.pumpEntityOptions,
            'irrigation'
          )}
          ${this._renderEntitySelect(
            'Drain Pump (Optional)',
            vm.drainPumpEntity,
            vm.pumpEntityOptions,
            'drain'
          )}
        </div>
      </div>

      ${vm.steeringEnabled
        ? html`
            <div class="detail-card">
              <div
                style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;"
              >
                <h3 style="margin:0;">Safety Caps</h3>
                <gs-help-tooltip
                  content="Optional hard limits on top of the steering logic. Leave blank to disable."
                ></gs-help-tooltip>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                <div class="md3-input-group">
                  <label class="md3-label">Daily Volume Cap (L)</label>
                  <input
                    class="md3-input"
                    type="number"
                    min="0"
                    step="0.1"
                    .value=${draft.dailyVolumeCapLiters != null
                      ? String(draft.dailyVolumeCapLiters)
                      : ''}
                    placeholder="Off"
                    @change=${(e: Event) => {
                      const v = (e.target as HTMLInputElement).value;
                      this._updateDraft({ dailyVolumeCapLiters: v ? parseFloat(v) : null });
                    }}
                  />
                </div>
                <div class="md3-input-group">
                  <label class="md3-label">Max Cycles / Day</label>
                  <input
                    class="md3-input"
                    type="number"
                    min="0"
                    step="1"
                    .value=${draft.maxCyclesPerDay != null ? String(draft.maxCyclesPerDay) : ''}
                    placeholder="Off"
                    @change=${(e: Event) => {
                      const v = (e.target as HTMLInputElement).value;
                      this._updateDraft({ maxCyclesPerDay: v ? parseInt(v, 10) : null });
                    }}
                  />
                </div>
              </div>
            </div>
          `
        : nothing}
      ${vm.hasPump
        ? html`
            <div class="detail-card">
              <h3 style="margin:0 0 14px;">Behaviour</h3>
              ${!vm.steeringEnabled
                ? html`
                    <div class="stub-row" style="margin-bottom:8px;">
                      <div>
                        <div class="stub-row-label">Skip During Dark Period</div>
                        <div class="stub-row-desc">No cycles between lights-off and lights-on</div>
                      </div>
                      <md3-switch
                        .checked=${draft.skipDuringDark}
                        @change=${(e: CustomEvent) => {
                          this._updateDraft({ skipDuringDark: (e.target as any).checked });
                        }}
                      ></md3-switch>
                    </div>
                  `
                : nothing}
              ${[
                {
                  label: 'Pause on Tank Low',
                  desc: 'Halt cycles when any tank is below warning level',
                  get: () => draft.pauseOnLowTank,
                  set: (v: boolean) => this._updateDraft({ pauseOnLowTank: v }),
                },
                {
                  label: 'Log to Logbook',
                  desc: 'Record start, duration, and moisture delta per cycle',
                  get: () => draft.logToLogbook,
                  set: (v: boolean) => this._updateDraft({ logToLogbook: v }),
                },
              ].map(
                (row) => html`
                  <div class="stub-row" style="margin-bottom:8px;">
                    <div>
                      <div class="stub-row-label">${row.label}</div>
                      <div class="stub-row-desc">${row.desc}</div>
                    </div>
                    <md3-switch
                      .checked=${row.get()}
                      @change=${(e: CustomEvent) => {
                        row.set((e.target as any).checked);
                      }}
                    ></md3-switch>
                  </div>
                `
              )}
            </div>

            <div class="detail-card">
              <h3 style="margin:0 0 14px;">Manual Override</h3>
              <div style="display:flex;align-items:center;gap:12px;">
                <button
                  class="action-btn${vm.isRunningNow ? ' saving' : ''}"
                  ?disabled=${vm.isApplying}
                  @click=${() => this._emit('config-run-now')}
                >
                  ${vm.isRunningNow ? 'Starting…' : '▶ Run Now'}
                </button>
                <span style="font-size:12px;opacity:0.55;">
                  Triggers one irrigation cycle immediately, bypassing the schedule.
                </span>
              </div>
            </div>
          `
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'irrigation-config-tab': IrrigationConfigTab;
  }
}
