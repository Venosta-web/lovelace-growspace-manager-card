/**
 * Irrigation Steering Tab Component (ADR-0019 + ADR-0012 + ADR-0014 + ADR-0017)
 *
 * The dumb presentational element for the Steering tab. `@property .vm` in,
 * semantic Tab Intents out, **no `@state()` of its own**. Markup transcribed
 * verbatim from the former inline `_renderSteeringTab` / `_renderSteeringMode*` /
 * `_renderPhaseShotParams` / `_renderAdaptiveShotControl` so the rendered output
 * stays byte-identical.
 *
 * The Steering tab writes TWO drafts (see the ViewModel doc); the component keeps
 * them on DISTINCT intents so the Dialog Shell routes each write path:
 *   - **Steering draft** (Shell → `UPDATE_STEERING_DRAFT`):
 *       `steering-draft-changed`   detail: { partial: Partial<IrrigationStrategy> }
 *   - **Config draft** (Shell → `UPDATE_CONFIG_DRAFT`):
 *       `steering-config-changed`  detail: { partial: Partial<ConfigDraft> }
 *
 * Confirm flows (ADR-0012) — the component renders the overlays from
 * `vm.confirmMode` / `vm.confirmPhase` and emits intents; the Shell owns the
 * side-effects (the `applySteeringMode` store action and `_saveSettings`):
 *       `steering-mode-requested`  detail: { mode: SteeringMode }   (open confirm)
 *       `steering-mode-confirmed`                                   (Apply)
 *       `steering-mode-cancelled`                                   (Cancel/close)
 *       `phase-change-requested`   detail: { phase: Phase }          (open confirm)
 *       `phase-change-confirmed`                                    (Confirm)
 *       `phase-change-cancelled`                                    (Cancel/close)
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiAlert } from '@mdi/js';
import { dialogStyles } from '../../../styles/dialog.styles';
import type { IrrigationStrategy, SteeringMode } from '../../../services/types';
import type { ConfigDraft, Phase } from '../../../dialogs/irrigation-dialog-sm';
import type { SteeringTabViewModel } from '../viewmodels/steering-tab.viewmodel';
import '../../../features/shared/ui';
import '../../../features/shared/ui/md3-number-input';
import '../../../features/shared/ui/md3-switch';
import '../../../features/shared/ui/gs-help-tooltip';
import { TIMING, DOSING, ADAPTIVE } from '../help-copy';

@customElement('irrigation-steering-tab')
export class IrrigationSteeringTab extends LitElement {
  @property({ attribute: false }) vm!: SteeringTabViewModel;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }
      /* ── Phase cards / mode selector grid (copied from irrigation-dialog) ── */
      .phase-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }
      .phase-card {
        padding: 12px 14px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: var(--border-radius-md, 12px);
        background: rgba(255, 255, 255, 0.02);
        display: flex;
        flex-direction: column;
        gap: 8px;
        cursor: pointer;
        transition:
          background 0.15s,
          border-color 0.15s;
      }
      .phase-card:hover {
        background: rgba(255, 255, 255, 0.035);
      }
      .phase-card.active {
        border-color: rgba(33, 150, 243, 0.5);
        background: rgba(33, 150, 243, 0.08);
      }
      /* ── Segmented toggle (shared with substrate_ec) ── */
      .seg-btn {
        flex: 1;
        padding: 10px 12px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.15));
        border-radius: var(--border-radius-sm, 8px);
        background: rgba(255, 255, 255, 0.04);
        color: var(--primary-text-color);
        font-size: 0.85rem;
        cursor: pointer;
      }
      .seg-btn.active {
        border-color: rgba(33, 150, 243, 0.5);
        background: rgba(33, 150, 243, 0.12);
        font-weight: 600;
      }
      .seg-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .phase-card .phase-num {
        font-size: var(--font-size-xs);
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.4);
      }
      .phase-card .phase-nm {
        font-size: 14px;
        font-weight: 500;
      }
      .phase-card .phase-desc {
        font-size: 11.5px;
        color: rgba(255, 255, 255, 0.5);
        line-height: 1.4;
      }
      .stub-row-label {
        font-size: var(--font-size-supporting);
      }
      .stub-row-desc {
        font-size: 11px;
        opacity: 0.6;
        margin-top: 2px;
      }
      /* ── Read-only lights-on (edited on Config → Growlights, ADR-0026) ── */
      .lights-on-readonly {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .lights-on-readonly .ro-label {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
      }
      .lights-on-readonly .ro-value {
        font-size: var(--font-size-sm);
        font-weight: 500;
      }
      .lights-on-hint {
        font-size: 11.5px;
        color: rgba(255, 255, 255, 0.5);
        margin: 4px 0 0;
      }
    `,
  ];

  private _emit(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  /** Steering-draft field update → `UPDATE_STEERING_DRAFT` via the Shell. */
  private _updateStrategyField(
    field: keyof IrrigationStrategy,
    value: string | number | boolean
  ): void {
    this._emit('steering-draft-changed', { partial: { [field]: value } });
  }

  /** Config-draft field update → `UPDATE_CONFIG_DRAFT` via the Shell. */
  private _updateConfigField(partial: Partial<ConfigDraft>): void {
    this._emit('steering-config-changed', { partial });
  }

  render(): TemplateResult {
    const vm = this.vm;
    if (!vm) return html`${nothing}`;

    return html`
      ${this._renderSteeringModeSelector()}

      <!-- Phase cards -->
      <div class="detail-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
          <h3 style="margin:0;">Crop Steering Phases</h3>
          <gs-help-tooltip
            content="Crop steering shapes the feeding pattern across three daily phases. P1 = saturation, P2 = maintenance, P3 = dryback."
            placement="top"
            label="Crop Steering Phases"
          ></gs-help-tooltip>
        </div>
        <div class="phase-grid">
          ${(
            [
              {
                id: 'p1',
                label: 'P1',
                name: 'Saturation',
                desc: 'Bring substrate to field capacity through frequent short shots.',
              },
              {
                id: 'p2',
                label: 'P2',
                name: 'Maintenance',
                desc: 'Maintain EC and irrigate to plant uptake — runoff target.',
              },
              {
                id: 'p3',
                label: 'P3',
                name: 'Dryback',
                desc: 'Final stretch of the photoperiod — controlled substrate dry.',
              },
            ] as const
          ).map(
            (p) => html`
              <div
                class="phase-card ${vm.activePhase === p.id ? 'active' : ''}"
                @click=${() => this._handlePhaseCardClick(p.id)}
              >
                <div class="phase-num">Phase · ${p.label}</div>
                <div class="phase-nm">${p.name}</div>
                <div class="phase-desc">${p.desc}</div>
              </div>
            `
          )}
        </div>
      </div>

      <!-- VWC strategy parameters -->
      <div class="detail-card">
        <h3 style="margin-top:0;">VWC Strategy Configuration</h3>
        <p style="font-size:var(--font-size-supporting);opacity:0.7;margin-bottom:20px;">
          Enable logic-based irrigation based on volumetric water content (VWC) targets. Overrides
          basic schedules when active.
        </p>

        <div
          style="grid-column:span 2;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.05);padding:12px;border-radius: var(--border-radius-sm, 8px);margin-bottom:12px;"
        >
          <span>Enable VWC Steering</span>
          <md3-switch
            data-field="enabled"
            .checked=${vm.draft.enabled}
            @change=${(e: Event) =>
              this._updateStrategyField('enabled', (e.target as HTMLInputElement).checked)}
          ></md3-switch>
        </div>

        ${
          vm.hasLightSensors
            ? html`
                <div
                  style="grid-column:span 2;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.05);padding:12px;border-radius: var(--border-radius-sm, 8px);margin-bottom:12px;"
                >
                  <span>Auto Track from Light Sensor</span>
                  <md3-switch
                    data-field="autoLightTracking"
                    .checked=${!!vm.draft.autoLightTracking}
                    @change=${(e: Event) =>
                      this._updateStrategyField(
                        'autoLightTracking',
                        (e.target as HTMLInputElement).checked
                      )}
                  ></md3-switch>
                </div>
              `
            : ''
        }

        <div style="display:flex;flex-direction:column;gap:16px;">
          <div class="vwc-targets-group">
            <div class="vwc-targets-group-title" style="display:flex;align-items:center;gap:6px;">
              P1 Thresholds
              <gs-help-tooltip
                content="Saturation Target: P1 ramps up until substrate VWC reaches this value, then switches to P2 maintenance."
              ></gs-help-tooltip>
            </div>
            <md3-number-input
              label="Saturation Target (%)"
              .value=${vm.draft.targetVwcPercent}
              @change=${(e: CustomEvent) =>
                this._updateStrategyField('targetVwcPercent', parseFloat(e.detail))}
            ></md3-number-input>
          </div>

          <div class="vwc-targets-group">
            <div class="vwc-targets-group-title" style="display:flex;align-items:center;gap:6px;">
              P2 Thresholds
              <gs-help-tooltip
                content="Maintenance Dryback: shots fire in P2 when VWC drops this many % below the saturation target. P2 Direct Trigger: optional — if set, bypasses the calculated threshold and fires directly when VWC drops below this value."
              ></gs-help-tooltip>
            </div>
            <md3-number-input
              label="Maintenance Dryback (%)"
              .value=${vm.draft.maintenanceDrybackPercent}
              @change=${(e: CustomEvent) =>
                this._updateStrategyField('maintenanceDrybackPercent', parseFloat(e.detail))}
            ></md3-number-input>
            <md3-number-input
              label="P2 Direct Trigger (%)"
              placeholder="Off"
              .value=${vm.soilTriggerPercent != null ? String(vm.soilTriggerPercent) : ''}
              @change=${(e: CustomEvent) => {
                const v = e.detail;
                this._updateConfigField({
                  soilTriggerPercent: v !== '' && v != null ? parseFloat(String(v)) : null,
                });
              }}
            ></md3-number-input>
          </div>
        </div>

          <div style="display:flex;align-items:center;gap:8px;margin:12px 0 4px;">
            <h4 style="margin:0;">Timing</h4>
            <gs-help-tooltip
              .content=${this._renderTimingExplainer()}
              label=${TIMING.section.label}
            ></gs-help-tooltip>
          </div>

          <div style="display:flex;align-items:center;gap:8px;" data-scroll-target="lightsOnTime">
            <div class="lights-on-readonly">
              <span class="ro-label">Lights On Time</span>
              <span class="ro-value">${vm.draft.lightsOnTime || '—'}</span>
            </div>
            <gs-help-tooltip
              content=${TIMING.lightsOnTime.content}
              label=${TIMING.lightsOnTime.label}
            ></gs-help-tooltip>
            ${
              vm.detectedLightsOnTime
                ? html` <span class="auto-lights-badge">auto: ${vm.detectedLightsOnTime}</span> `
                : ''
            }
          </div>
          <p class="lights-on-hint">Set in Config → Growlights.</p>
          <md3-number-input
            label="P0 Duration (min)"
            .help=${TIMING.p0Duration}
            .value=${vm.draft.p0DurationMinutes}
            @change=${(e: CustomEvent) =>
              this._updateStrategyField('p0DurationMinutes', parseInt(e.detail))}
          ></md3-number-input>
          <md3-number-input
            label="P2 Stop Buffer (min)"
            .help=${TIMING.p2StopBuffer}
            .value=${vm.draft.p2StopBeforeLightsOffMinutes}
            @change=${(e: CustomEvent) =>
              this._updateStrategyField('p2StopBeforeLightsOffMinutes', parseInt(e.detail))}
          ></md3-number-input>

          <div
            style="grid-column:span 2;display:flex;align-items:center;gap:8px;margin:12px 0 4px;"
          >
            <h4 style="margin:0;">Dosing</h4>
            <gs-help-tooltip
              .content=${this._renderDosingExplainer()}
              label=${DOSING.section.label}
            ></gs-help-tooltip>
          </div>

          ${this._renderPhaseShotParams()}
          ${this._renderAdaptiveShotControl()}
        </div>
      </div>

      <!-- Phase Triggers -->
      <div class="detail-card">
        <div style="margin-bottom:14px;">
          <h3 style="margin:0;">Phase Triggers</h3>
        </div>
        <div style="margin-bottom:8px;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div class="stub-row-label">Auto-advance P1 → P2</div>
              <div class="stub-row-desc">When substrate moisture reaches field capacity</div>
            </div>
            <md3-switch
              data-field="autoAdvanceP1ToP2"
              .checked=${vm.autoAdvanceP1ToP2}
              @change=${(e: Event) => {
                this._updateConfigField({
                  autoAdvanceP1ToP2: (e.target as HTMLInputElement).checked,
                });
              }}
            ></md3-switch>
          </div>
        </div>
        <div style="margin-bottom:8px;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div class="stub-row-label">Auto-advance P2 → P3</div>
              <div class="stub-row-desc">N hours before lights-off (per stage)</div>
            </div>
            <md3-switch
              data-field="autoAdvanceP2ToP3"
              .checked=${vm.autoAdvanceP2ToP3}
              @change=${(e: Event) => {
                this._updateConfigField({
                  autoAdvanceP2ToP3: (e.target as HTMLInputElement).checked,
                });
              }}
            ></md3-switch>
          </div>
        </div>
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div class="stub-row-label">Halt on Runoff EC</div>
              <div class="stub-row-desc">Suspend cycles and alert until manual resume</div>
            </div>
            <md3-switch
              data-field="haltOnRunoffEc"
              .checked=${vm.haltOnRunoffEcThreshold !== null}
              @change=${(e: Event) => {
                this._updateConfigField({
                  haltOnRunoffEcThreshold: (e.target as HTMLInputElement).checked ? 4.0 : null,
                });
              }}
            ></md3-switch>
          </div>
          ${
            vm.haltOnRunoffEcThreshold !== null
              ? html`
                  <div style="margin-top:10px;">
                    <md3-number-input
                      data-field="haltOnRunoffEcValue"
                      label="EC Threshold"
                      min="0.1"
                      step="0.1"
                      .value=${String(vm.haltOnRunoffEcThreshold)}
                      @change=${(e: CustomEvent) => {
                        const v = parseFloat(e.detail ?? (e.target as HTMLInputElement).value);
                        if (!isNaN(v)) this._updateConfigField({ haltOnRunoffEcThreshold: v });
                      }}
                    ></md3-number-input>
                  </div>
                `
              : nothing
          }
        </div>
      </div>

      ${this._renderSteeringModeConfirm()}

      <!-- Phase trigger confirmation dialog -->
      <gs-dialog
        .open=${vm.confirmPhase !== null}
        heading="Confirm Phase Transition"
        .iconPath=${mdiAlert}
        stageColor="var(--warning-color, #ff9800)"
        @close=${this._cancelPhaseChange}
      >
        <div style="padding: 20px;">
          <p style="margin: 0 0 12px 0;">
            Are you sure you want to transition from
            <strong>${vm.activePhase.toUpperCase()}</strong> to
            <strong>${(vm.confirmPhase ?? '').toUpperCase()}</strong>?
          </p>
          <p
            style="margin: 0; font-size: var(--font-size-sm); opacity: 0.8; line-height: 1.4;"
          >
            Manually shifting phases overrides the current schedule instantly. This is a severe
            change that will disrupt timing and dosing parameters.
          </p>
        </div>
        <div
          class="button-group"
          style="padding: 16px; display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid rgba(255,255,255,0.1);"
        >
          <button class="md3-button tonal" @click=${this._cancelPhaseChange}>Cancel</button>
          <button class="md3-button primary" @click=${this._confirmPhaseChange}>Confirm</button>
        </div>
      </gs-dialog>
    `;
  }

  // ─── Section explainers ───────────────────────────────────────────────────

  /**
   * The Timing section's explainer: the prose, then the photoperiod drawn as
   * one bar so the ordering of the phases is readable at a glance.
   *
   * The bar is deliberately schematic — the segment widths are illustrative,
   * not this growspace's real boundaries. Rendering the grower's actual times
   * needs the resolved photoperiod plumbed into this tab's viewmodel, which is
   * tracked separately.
   *
   * Styles are inline because this markup renders inside `gs-help-tooltip`'s
   * shadow root, where this component's own stylesheet does not reach. The
   * existing [[Phase Strip]] already owns the real, data-driven version of this
   * picture; a second styled element here would be a third rendering of one
   * concept for a static diagram (see ADR-0046).
   */
  private _renderTimingExplainer(): TemplateResult {
    const seg = (label: string, flex: number, bg: string): TemplateResult => html`
      <div
        style="flex:${flex};background:${bg};padding:5px 0;text-align:center;font-size:10px;font-weight:600;letter-spacing:0.05em;"
      >
        ${label}
      </div>
    `;

    return html`
      <p style="margin:0 0 8px;">${TIMING.section.lead}</p>
      <p style="margin:0 0 10px;">${TIMING.section.body}</p>
      <div style="display:flex;border-radius:4px;overflow:hidden;">
        ${seg('P0', 0.7, 'rgba(158,158,158,0.35)')} ${seg('P1', 1.5, 'rgba(33,150,243,0.4)')}
        ${seg('P2', 2.6, 'rgba(76,175,80,0.4)')} ${seg('P3', 1.2, 'rgba(255,152,0,0.35)')}
      </div>
      <div
        style="display:flex;justify-content:space-between;font-size:10px;opacity:0.6;margin-top:3px;"
      >
        <span>lights on</span>
        <span>lights off</span>
      </div>
      <div style="margin-top:9px;font-size:10.5px;opacity:0.75;line-height:1.5;">
        <div>P0 Duration sets how far P0 extends from lights-on.</div>
        <div>P2 Stop Buffer sets where P3 begins, measured back from lights-off.</div>
      </div>
    `;
  }

  /** The Dosing section's explainer. Prose only — there is no shape to draw. */
  private _renderDosingExplainer(): TemplateResult {
    return html`
      <p style="margin:0 0 8px;">${DOSING.section.lead}</p>
      <p style="margin:0;">${DOSING.section.body}</p>
    `;
  }

  // ─── Phase cards ──────────────────────────────────────────────────────────

  private _handlePhaseCardClick(phaseId: Phase): void {
    if (this.vm.activePhase === phaseId) return;
    this._emit('phase-change-requested', { phase: phaseId });
  }

  private _confirmPhaseChange = (): void => {
    this._emit('phase-change-confirmed');
  };

  private _cancelPhaseChange = (): void => {
    this._emit('phase-change-cancelled');
  };

  // ─── Steering Mode selector (ADR-0012) ────────────────────────────────────

  private _handleSteeringModeClick(mode: SteeringMode): void {
    this._emit('steering-mode-requested', { mode });
  }

  private _confirmSteeringMode = (): void => {
    this._emit('steering-mode-confirmed');
  };

  private _cancelSteeringMode = (): void => {
    this._emit('steering-mode-cancelled');
  };

  private _renderSteeringModeSelector(): TemplateResult {
    const vm = this.vm;
    const declared = vm.declaredMode;
    return html`
      <div class="detail-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <h3 style="margin:0;">Steering Mode</h3>
          <gs-help-tooltip
            content="Selecting a mode stamps recommended setpoints (dryback, P2-stop offset, pore-EC band, shot sizes) into the editable fields below. You can fine-tune afterwards."
          ></gs-help-tooltip>
        </div>
        <p style="font-size:var(--font-size-supporting);opacity:0.7;margin:0 0 12px;">
          ${declared
            ? html`Declared intent: <strong>${declared}</strong>`
            : 'No mode declared yet.'}
        </p>
        <div class="phase-grid">
          ${vm.modes.map(
            (m) => html`
              <div
                class="phase-card ${declared === m.id ? 'active' : ''}"
                data-steering-mode=${m.id}
                @click=${() => this._handleSteeringModeClick(m.id)}
              >
                <div class="phase-nm">${m.name}</div>
                <div class="phase-desc">${m.desc}</div>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  private _renderSteeringModeConfirm(): TemplateResult {
    const pending = this.vm.confirmMode ?? '';
    return html`
      <gs-dialog
        .open=${this.vm.confirmMode !== null}
        heading="Apply Steering Mode"
        .iconPath=${mdiAlert}
        stageColor="var(--warning-color, #ff9800)"
        @close=${this._cancelSteeringMode}
      >
        <div style="padding: 20px;">
          <p style="margin: 0 0 12px 0;">
            Apply the <strong>${pending}</strong> preset? This overwrites these fields with
            recommended values:
          </p>
          <ul
            style="margin: 0; padding-left: 20px; font-size: var(--font-size-sm); opacity: 0.85; line-height: 1.5;"
          >
            <li>Maintenance Dryback</li>
            <li>P2 Stop Buffer</li>
            <li>Pore EC Target Band</li>
            <li>Per-phase shot sizes</li>
          </ul>
        </div>
        <div
          class="button-group"
          style="padding: 16px; display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid rgba(255,255,255,0.1);"
        >
          <button class="md3-button tonal" @click=${this._cancelSteeringMode}>Cancel</button>
          <button
            class="md3-button primary"
            data-action="confirm-steering-mode"
            @click=${this._confirmSteeringMode}
          >
            Apply
          </button>
        </div>
      </gs-dialog>
    `;
  }

  // ─── Per-phase shot params (sizing-mode aware, ADR-0017) ──────────────────

  private _renderPhaseShotParams(): TemplateResult[] {
    return this.vm.phaseShots.map((p) => {
      const sizeCopy = p.id === 'p1' ? DOSING.p1Size : DOSING.p2Size;
      const intervalCopy = p.id === 'p1' ? DOSING.p1Interval : DOSING.p2Interval;
      return html`
        <md3-number-input
          data-field=${p.sizeField}
          label=${p.sizeLabel}
          .help=${p.isVolume ? sizeCopy.volume : sizeCopy.duration}
          .value=${String(p.sizeValue ?? '')}
          @change=${(e: CustomEvent) =>
            this._updateStrategyField(
              p.sizeField,
              p.isVolume ? parseFloat(e.detail) : parseInt(e.detail)
            )}
        ></md3-number-input>
        <md3-number-input
          data-field=${p.intervalField}
          label="${p.label} Shot Interval (min)"
          .help=${intervalCopy}
          .value=${String(p.intervalValue ?? '')}
          @change=${(e: CustomEvent) =>
            this._updateStrategyField(p.intervalField, parseInt(e.detail))}
        ></md3-number-input>
      `;
    });
  }

  // ─── Adaptive Shot Control (ADR-0014) ─────────────────────────────────────

  private _renderAdaptiveShotControl(): TemplateResult {
    const draft = this.vm.draft;
    const enabled = this.vm.adaptiveEnabled;
    return html`
      <div style="grid-column:span 2;margin-top:12px;">
        <div
          style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.05);padding:12px;border-radius: var(--border-radius-sm, 8px);"
        >
          <div style="display:flex;align-items:center;gap:6px;">
            <span>Adaptive Shot Control</span>
            <gs-help-tooltip
              content="When on, each shot's effect on VWC tunes the next one: overshoot shrinks the shot and lengthens the interval; undershoot recovers both toward nominal. Off freezes shots at the configured size and interval."
            ></gs-help-tooltip>
          </div>
          <md3-switch
            data-field="dynamicShotEnabled"
            .checked=${enabled}
            @change=${(e: Event) =>
              this._updateStrategyField(
                'dynamicShotEnabled',
                (e.target as HTMLInputElement).checked
              )}
          ></md3-switch>
        </div>
        ${enabled
          ? html`
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
                <md3-number-input
                  data-field="dynamicAggressiveness"
                  .help=${ADAPTIVE.aggressiveness}
                  label="Aggressiveness"
                  step="0.1"
                  .value=${String(draft.dynamicAggressiveness ?? 1.0)}
                  @change=${(e: CustomEvent) =>
                    this._updateStrategyField('dynamicAggressiveness', parseFloat(e.detail))}
                ></md3-number-input>
                <md3-number-input
                  data-field="dynamicRecovery"
                  .help=${ADAPTIVE.recovery}
                  label="Recovery"
                  step="0.05"
                  .value=${String(draft.dynamicRecovery ?? 0.1)}
                  @change=${(e: CustomEvent) =>
                    this._updateStrategyField('dynamicRecovery', parseFloat(e.detail))}
                ></md3-number-input>
                <md3-number-input
                  data-field="dynamicShotSizeFloor"
                  .help=${ADAPTIVE.sizeFloor}
                  label="Shot Size Floor (×)"
                  step="0.05"
                  .value=${String(draft.dynamicShotSizeFloor ?? 0.5)}
                  @change=${(e: CustomEvent) =>
                    this._updateStrategyField('dynamicShotSizeFloor', parseFloat(e.detail))}
                ></md3-number-input>
                <md3-number-input
                  data-field="dynamicIntervalCeiling"
                  .help=${ADAPTIVE.intervalCeiling}
                  label="Interval Ceiling (×)"
                  step="0.1"
                  .value=${String(draft.dynamicIntervalCeiling ?? 1.5)}
                  @change=${(e: CustomEvent) =>
                    this._updateStrategyField('dynamicIntervalCeiling', parseFloat(e.detail))}
                ></md3-number-input>
              </div>
            `
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'irrigation-steering-tab': IrrigationSteeringTab;
  }
}
