/**
 * Irrigation Overview Tab Component (ADR-0019)
 *
 * The dumb presentational element for the Irrigation Dialog's read-only Overview
 * tab (crop-steering diagnostics). `@property .vm: OverviewTabViewModel` in, no
 * `@state()` of its own — all state lives in the Dialog Shell / Tab ViewModel.
 * Overview is read-only, so it emits no Tab Intents.
 *
 * Markup is transcribed verbatim from the former inline `_renderOverviewTab`
 * helpers in `irrigation-dialog.ts` so the rendered output stays byte-identical.
 * Its `cs-*` styles are copied from the dialog (the schedules tab keeps the
 * separate `cs-timeline / cs-legend` rules inline), plus `detail-card` from the
 * shared dialog styles.
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiChartTimelineVariantShimmer } from '@mdi/js';
import { dialogStyles } from '../../../styles/dialog.styles';
import {
  OVERVIEW_ICONS,
  type OverviewTabViewModel,
  type OverviewMetricCard,
  type OverviewEcTrendCard,
  type ShotCompositionPanel,
} from '../viewmodels/overview-tab.viewmodel';
import '../../shared/ui/gs-help-tooltip';

@customElement('irrigation-overview-tab')
export class IrrigationOverviewTab extends LitElement {
  @property({ attribute: false }) vm!: OverviewTabViewModel;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }
      /* ── Crop Steering Overview tab (copied from irrigation-dialog) ── */
      .cs-metric-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        margin-top: 16px;
      }
      .cs-metric-card {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border-radius: 12px;
        padding: 16px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
      .cs-metric-value {
        font-size: 24px;
        font-weight: bold;
        color: var(--primary-text-color);
        margin: 8px 0;
      }
      .cs-metric-label {
        font-size: 14px;
        color: var(--secondary-text-color);
      }
      .cs-metric-sub {
        font-size: 0.75rem;
        color: var(--secondary-text-color);
        margin-bottom: 6px;
        font-variant-numeric: tabular-nums;
      }
      .cs-metric-locked {
        opacity: 0.55;
        border-style: dashed;
      }
      .cs-shot-composition {
        margin-top: 16px;
      }
      .cs-phase-pill {
        padding: 2px 10px;
        border-radius: 12px;
        font-size: 0.7rem;
        font-weight: 600;
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.08));
        color: var(--secondary-text-color);
      }
      .cs-shot-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;
        padding: 4px 0;
        font-variant-numeric: tabular-nums;
      }
      .cs-shot-total {
        border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        margin-top: 4px;
        padding-top: 8px;
        font-weight: 600;
      }
      .cs-mode-badge {
        padding: 4px 12px;
        border-radius: 16px;
        font-size: 14px;
        font-weight: bold;
        text-transform: capitalize;
        margin-top: 8px;
        display: inline-block;
      }
      .cs-mode-vegetative {
        background: rgba(76, 175, 80, 0.2);
        color: #4caf50;
      }
      .cs-mode-generative {
        background: rgba(244, 67, 54, 0.2);
        color: #f44336;
      }
      .cs-mode-balanced {
        background: rgba(33, 150, 243, 0.2);
        color: #2196f3;
      }
      .cs-intent {
        margin-top: 12px;
        font-size: 0.85rem;
        text-transform: capitalize;
      }
      .cs-intent-ontarget {
        color: var(--success-color, #4caf50);
      }
      .cs-intent-deviation {
        color: var(--warning-color, #ff9800);
        font-weight: 500;
      }
    `,
  ];

  render(): TemplateResult {
    const vm = this.vm;
    if (!vm || vm.unavailable) {
      return this._renderUnavailable();
    }

    return html`
      ${this._renderScoreHeader(vm)}
      <div class="cs-metric-grid">
        ${this._renderOvernightDrybackCard(vm.overnightDryback)}
        ${this._renderInCycleDrybackCard(vm.inCycleDryback)}
        ${this._renderEcTrendCard(vm.ecTrend)}
      </div>
      ${this._renderShotComposition(vm.shotComposition)}
    `;
  }

  private _renderUnavailable(): TemplateResult {
    return html`
      <div style="text-align: center; padding: 40px; opacity: 0.7;">
        <ha-svg-icon
          .path=${mdiChartTimelineVariantShimmer}
          style="width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5;"
        ></ha-svg-icon>
        <p>Crop steering data is currently unavailable.</p>
        <p style="font-size: 0.85rem;">
          Ensure irrigation strategy is enabled and sensors are reporting data.
        </p>
      </div>
    `;
  }

  /** Score readout + declared-intent vs measured-classification contrast. */
  private _renderScoreHeader(vm: OverviewTabViewModel): TemplateResult {
    const { scoreText, declared, measured } = vm;
    return html`
      <div style="text-align: center; margin-bottom: 24px;">
        <div
          style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;"
        >
          <div style="font-size: 36px; font-weight: bold;">${scoreText}</div>
          <gs-help-tooltip
            content="Measured crop steering score (−1…+1): positive = generative (promoting flowering), negative = vegetative (promoting growth). This is a measurement of how the substrate is actually behaving, not a setting."
            placement="right"
            label="Crop Steering Score"
          ></gs-help-tooltip>
        </div>
        <div
          style="display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;"
        >
          ${declared
            ? html`<div class="cs-mode-badge cs-mode-${declared}">
                Declared: ${declared.toUpperCase()}
              </div>`
            : html`<div class="cs-mode-badge">No declared mode</div>`}
          ${measured
            ? html`<div class="cs-mode-badge cs-mode-${measured}">
                Measured: ${measured.toUpperCase()}
              </div>`
            : nothing}
        </div>
        ${this._renderIntentDeviation(vm)}
      </div>
    `;
  }

  private _renderIntentDeviation(vm: OverviewTabViewModel): TemplateResult | typeof nothing {
    if (vm.intentBanner === 'ontarget') {
      return html`
        <div class="cs-intent cs-intent-ontarget">
          On target — substrate reads ${vm.declared} as intended.
        </div>
      `;
    }
    if (vm.intentBanner === 'deviation') {
      return html`
        <div class="cs-intent cs-intent-deviation">
          Intended ${vm.declared} — substrate reads ${vm.measured}.
        </div>
      `;
    }
    return nothing;
  }

  /** Overnight dryback (absolute VWC points) with last-window peak/trough context. */
  private _renderOvernightDrybackCard(card: OverviewMetricCard): TemplateResult {
    return html`
      <div class="cs-metric-card" data-metric="overnight-dryback">
        <ha-svg-icon
          .path=${OVERVIEW_ICONS.overnightDryback}
          style="color: var(--primary-color); margin-bottom: 8px;"
        ></ha-svg-icon>
        <div class="cs-metric-value">${card.value}</div>
        ${card.sub ? html`<div class="cs-metric-sub">${card.sub}</div>` : nothing}
        <div
          class="cs-metric-label"
          style="display:flex;align-items:center;gap:4px;justify-content:center;"
        >
          Overnight Dryback
          <gs-help-tooltip
            content="The absolute VWC drop (peak − trough, in percentage points) across the most recent completed overnight window. Larger overnight drybacks push the substrate generative."
            placement="bottom"
            label="Overnight Dryback"
          ></gs-help-tooltip>
        </div>
      </div>
    `;
  }

  /** Today's in-cycle (P2) shot count and average P2 dryback. */
  private _renderInCycleDrybackCard(card: OverviewMetricCard): TemplateResult {
    return html`
      <div class="cs-metric-card" data-metric="incycle-dryback">
        <ha-svg-icon
          .path=${OVERVIEW_ICONS.inCycleDryback}
          style="color: var(--info-color, #03a9f4); margin-bottom: 8px;"
        ></ha-svg-icon>
        <div class="cs-metric-value">${card.value}</div>
        <div class="cs-metric-sub">${card.sub}</div>
        <div
          class="cs-metric-label"
          style="display:flex;align-items:center;gap:4px;justify-content:center;"
        >
          In-Cycle Dryback
          <gs-help-tooltip
            content="Average P2 shot-to-shot dryback (absolute VWC points) across today's in-cycle irrigations, with the day's shot count. Smaller, more frequent shots read vegetative."
            placement="bottom"
            label="In-Cycle Dryback"
          ></gs-help-tooltip>
        </div>
      </div>
    `;
  }

  /**
   * Measured pore-EC trend. Sensor-gated per the Capability Unlock Hint rule:
   * when no pore-EC sensors report (locked) the card stays visible but locked
   * with a one-line hint, never silently shows "stable".
   */
  private _renderEcTrendCard(card: OverviewEcTrendCard): TemplateResult {
    if (card.locked) {
      return html`
        <div class="cs-metric-card cs-metric-locked" data-metric="ec-trend">
          <ha-svg-icon
            .path=${card.icon}
            style="color: var(--secondary-text-color); margin-bottom: 8px;"
          ></ha-svg-icon>
          <div class="cs-metric-value">Locked</div>
          <div class="cs-metric-sub">Add a pore-EC sensor in Environment Settings</div>
          <div class="cs-metric-label">EC Trend</div>
        </div>
      `;
    }

    return html`
      <div class="cs-metric-card" data-metric="ec-trend">
        <ha-svg-icon
          .path=${card.icon}
          style="color: ${card.color}; margin-bottom: 8px;"
        ></ha-svg-icon>
        <div class="cs-metric-value">${card.value}</div>
        <div
          class="cs-metric-label"
          style="display:flex;align-items:center;gap:4px;justify-content:center;"
        >
          EC Trend
          <gs-help-tooltip
            content="Whether measured pore EC (nutrient strength in the substrate) is rising, falling, or stable over the day. Rising EC may indicate under-irrigation or salt build-up."
            placement="bottom"
            label="EC Trend"
          ></gs-help-tooltip>
        </div>
      </div>
    `;
  }

  /**
   * Phase state + shot composition diagnostics. Absent on time-based irrigation
   * (no VWC coordinator → null composition). Explains the last fired shot as
   * base × vwc_factor × ec_factor so any shot is end-to-end accountable.
   */
  private _renderShotComposition(
    panel: ShotCompositionPanel | null
  ): TemplateResult | typeof nothing {
    if (!panel) return nothing;

    return html`
      <div class="detail-card cs-shot-composition" data-metric="shot-composition">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <h3 style="margin:0;border:none;padding:0;">Shot Composition</h3>
          ${panel.phaseLabel
            ? html`<span class="cs-phase-pill">Phase ${panel.phaseLabel}</span>`
            : nothing}
        </div>
        ${panel.rows
          ? html`
              ${panel.rows.map((row, i) =>
                i === panel.rows!.length - 1
                  ? html`<div class="cs-shot-row cs-shot-total">
                      <span>${row.label}</span><span>${row.value}</span>
                    </div>`
                  : html`<div class="cs-shot-row">
                      <span>${row.label}</span><span>${row.value}</span>
                    </div>`
              )}
            `
          : html`<p style="font-size:0.8rem;opacity:0.6;margin:0;">
              No shot fired yet this session — modulation capability shown above.
            </p>`}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'irrigation-overview-tab': IrrigationOverviewTab;
  }
}
