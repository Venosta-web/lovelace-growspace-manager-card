import { LitElement, html, css, svg, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { GrowspaceDevice } from '../../../services/types';
import type { MetricDescriptor } from '../../../slices/metric-descriptors';
import type { SensorHistories } from '../types';
import type { ComboSecondary, HistoryTimeRange } from '../constants';
import { computeComboIntervalPane, type ComboIntervalPane } from '../combo-series';
import { localizeWithParams } from '../../../localize/localize';
import '../../../growspace-env-chart';

/**
 * A [[Curated Combo]]: a primary [[Env Graph]] over a subordinate bar pane, on
 * one shared X axis (ADR-0049, ADR-0051).
 *
 * The primary pane *is* an Env Graph — the same element, with its [[Guide
 * Mark]]s, dark-period shading and scrub — rather than a second drawing of one.
 * This component owns only the interval pane beneath it, which it projects into
 * that chart's card so the two read as one chart and not as two.
 *
 * Both panes are drawn against **one window**, computed here and handed down,
 * for the reason [[Env Series]] takes its window as a parameter: two now-anchored
 * windows resolved a moment apart are a silently misaligned axis.
 *
 * There is no unlink affordance and none is redispatched. A combo is the card's
 * editorial claim about which metric is primary and which is context, not a
 * grouping the grower composed, so it cannot be dismantled the way a
 * [[Metric Comparison]] can.
 */

/** How far back each range looks, matching `growspace-env-chart`'s own windows. */
const RANGE_DURATION_MS: Record<HistoryTimeRange, number> = {
  '1h': 3_600_000,
  '6h': 21_600_000,
  '24h': 86_400_000,
  '7d': 604_800_000,
};

/**
 * The most bars a range may show.
 *
 * The same targets `tank-water-chart` folds its usage buckets to: 24h reads as
 * hourly and 7d as daily, and the two short ranges stay fine-grained enough to
 * show a fan cycling.
 */
const DUTY_BAR_TARGET: Record<HistoryTimeRange, number> = {
  '1h': 12,
  '6h': 24,
  '24h': 24,
  '7d': 7,
};

/** The bar plot's drawing box. Stretched by `preserveAspectRatio="none"`. */
const DUTY_PANE = { width: 100, height: 80 } as const;

@customElement('metric-combo-chart')
export class MetricComboChart extends LitElement {
  @property({ attribute: false }) device: GrowspaceDevice | undefined;
  @property({ attribute: false }) sensorHistory: SensorHistories = {};
  @property({ attribute: false }) descriptors: Record<string, MetricDescriptor> = {};
  @property({ type: String }) range: HistoryTimeRange = '24h';
  /** The metric the combo is about, drawn as the line pane. */
  @property({ type: String }) primary = '';
  /**
   * The subordinate panes that give it context, one each, stacked beneath the
   * primary in the order given.
   */
  @property({ attribute: false }) secondaries: ComboSecondary[] = [];

  static styles = css`
    /* The inline stack's spacing sits here rather than on the Env Graph inside,
       for the reason that chart puts its own on the host: in the Env Graph Wall
       a margin inside the host would push a height:100% card past its grid row.
       The Wall zeroes this one, and the chart's own is zeroed below either way
       so the combo is spaced once, not twice. */
    :host {
      display: block;
      position: relative;
      margin-top: 12px;
    }
    /* Fills the combo's box so the card — and the panes inside it — grow into a
       stretched Wall row exactly as a standalone Env Graph does. */
    growspace-env-chart {
      display: block;
      height: 100%;
      margin-top: 0;
    }
    .duty-eyebrow {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin: 8px 0 4px;
      font-size: var(--font-size-xs);
      font-weight: 500;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-secondary);
    }
    .duty-pane {
      position: relative;
      height: 64px;
      flex: none;
      background: var(--gs-chart-surface, var(--secondary-background-color, #0d0d0d));
      border-radius: 8px;
      overflow: hidden;
    }
    /*
     * The peak cap, and the pane's only readout. It is the scale — the same
     * reasoning tank-water-chart applies to its usage pane — which is why
     * there is no value axis beside it. There is deliberately no range total
     * either: litres accumulate into a quantity a grower acts on, where summed
     * fan duty does not (ADR-0049).
     */
    .duty-readout {
      position: absolute;
      top: 7px;
      left: 8px;
      z-index: 2;
      font-size: var(--font-size-xs);
      font-weight: 600;
      line-height: 1;
      font-variant-numeric: tabular-nums;
      /* The pane's own metric colour, set on the projected element, so the cap
         and the bars it scales cannot be two different colours — and so a
         second recipe needs no new rule here. */
      color: currentColor;
      /* The tallest bar reaches the top of the pane, so the cap is read against
         its own colour. The same shadow the Env Graph's axis captions use is
         what keeps it legible there. */
      text-shadow:
        0 1px 4px rgba(0, 0, 0, 0.95),
        0 0 4px rgba(0, 0, 0, 0.8);
    }
    .duty-pane svg {
      width: 100%;
      height: 100%;
      display: block;
      overflow: hidden;
    }
    .duty-bar {
      fill: currentColor;
      opacity: 0.85;
    }
    /* Dashed so it reads as a threshold rather than as another bar's edge, and
       drawn in the pane's own metric colour like everything else in it. The
       non-scaling stroke keeps it one hairline through the pane's non-uniform
       stretch, which would otherwise squash it to nothing. */
    .duty-limit {
      stroke: currentColor;
      stroke-width: 1;
      stroke-dasharray: 3 3;
      opacity: 0.9;
      vector-effect: non-scaling-stroke;
    }
  `;

  private _localize(key: string, params: Record<string, string | number> = {}): string {
    return localizeWithParams(key, params, 'en');
  }

  /**
   * The pane's eyebrow.
   *
   * A duty pane says whose effort it is reading; a pane carrying the metric's
   * own unit is already named by the metric, and calling watts "duty" would
   * claim a full scale that does not exist.
   */
  private _paneLabel(pane: ComboIntervalPane): string {
    if (pane.baselineTitle) {
      return this._localize('metric_combo.delta_label', {
        metric: pane.title,
        baseline: pane.baselineTitle,
      });
    }
    return pane.unit === '%'
      ? this._localize('metric_combo.duty_label', { metric: pane.title })
      : pane.title;
  }

  /**
   * The peak cap, formatted.
   *
   * A percentage reads whole and closed up against its sign; a unit is a word
   * beside the number. The cap is a scale rather than a measurement, so it keeps
   * one decimal only where the number is small enough for the decimal to carry
   * information.
   */
  private _capLabel(pane: ComboIntervalPane): string {
    // A configured ceiling replaces the peak as the readout, because it is what
    // the bars are being read against — a peak beside it would name the taller
    // of the two as the scale and leave the reader to work out which.
    if (pane.limit !== undefined) {
      return this._localize('metric_combo.limit_cap', {
        value: `${pane.limit.toFixed(pane.limit >= 100 ? 0 : 1)} ${pane.unit}`,
      });
    }
    if (pane.unit === '%') return `${pane.peak.toFixed(0)}%`;
    return `${pane.peak.toFixed(pane.peak >= 100 ? 0 : 1)} ${pane.unit}`;
  }

  /**
   * What full pane height is worth.
   *
   * Normally the peak: the tallest bar spends the whole box, so holding back
   * headroom would only shrink every bar for nothing. Where a limit is
   * configured it is the scale instead — but a breach must still fit, so the
   * taller of the two wins and the rule slides down inside the box.
   */
  private _paneScale(pane: ComboIntervalPane): number {
    return Math.max(pane.peak, pane.limit ?? 0);
  }

  /** The window both panes are drawn against, anchored once per render. */
  private get _window() {
    const durationMillis = RANGE_DURATION_MS[this.range] ?? RANGE_DURATION_MS['24h'];
    return { startTimeMs: Date.now() - durationMillis, durationMillis };
  }

  render(): TemplateResult {
    const { startTimeMs, durationMillis } = this._window;
    const options = {
      startTimeMs,
      nowMs: startTimeMs + durationMillis,
      barCount: DUTY_BAR_TARGET[this.range] ?? DUTY_BAR_TARGET['24h'],
    };
    const panes = this.secondaries
      .map((secondary) =>
        computeComboIntervalPane(this.descriptors, this.sensorHistory ?? {}, secondary, {
          ...options,
          // The recipe names where a threshold comes from; the growspace holds
          // the number. Resolving it here keeps the derivation free of the
          // device and this component free of per-recipe knowledge.
          limit: this.device ? secondary.limitOf?.(this.device) : undefined,
        })
      )
      // A secondary the growspace has no sensor for drops out on its own, so a
      // combo degrades one pane at a time rather than all-or-nothing.
      .filter((pane): pane is ComboIntervalPane => pane !== undefined);

    return html`
      <growspace-env-chart
        .device=${this.device}
        .sensorHistory=${this.sensorHistory}
        .descriptors=${this.descriptors}
        .metricKey=${this.primary}
        .metrics=${[this.primary]}
        .range=${this.range}
        .chartWindow=${{ startTimeMs, durationMillis }}
      >
        ${panes.map((pane) => this._renderIntervalPane(pane, startTimeMs, durationMillis))}
      </growspace-env-chart>
    `;
  }

  /**
   * One subordinate pane.
   *
   * A combo whose secondaries have no sensors degrades to its primary alone: an
   * empty frame under a temperature trace claims a context the growspace cannot
   * report.
   */
  private _renderIntervalPane(
    pane: ComboIntervalPane,
    startTimeMs: number,
    durationMillis: number
  ) {
    const { width, height } = DUTY_PANE;
    const xAt = (time: number) => ((time - startTimeMs) / durationMillis) * width;
    const scale = this._paneScale(pane);

    return html`
      <div slot="secondary-pane" style="color:${pane.color}">
        <div class="duty-eyebrow">
          <span>${this._paneLabel(pane)}</span>
        </div>
        <div class="duty-pane">
          <span class="duty-readout">${this._capLabel(pane)}</span>
          <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
            ${pane.bars.map((bar) => {
              const barHeight = scale > 0 ? Math.max(0, (bar.value / scale) * height) : 0;
              const left = xAt(bar.startTime);
              const barWidth = Math.max(0, xAt(bar.endTime) - left);
              const gap = Math.min(0.5, barWidth * 0.2);
              return svg`<rect
                class="duty-bar"
                x="${left + gap / 2}" y="${height - barHeight}"
                width="${Math.max(0, barWidth - gap)}" height="${barHeight}" rx="1"
              ></rect>`;
            })}
            ${this._renderLimitRule(pane, scale)}
          </svg>
        </div>
      </div>
    `;
  }

  /**
   * The configured ceiling, drawn across the pane.
   *
   * It is the one mark a subordinate pane carries. A [[Guide Mark]] on the
   * primary is a value the metric is steered to; this is the threshold the
   * pane's own bars are read against, which is why it lives here and not in the
   * Env Graph above.
   */
  private _renderLimitRule(pane: ComboIntervalPane, scale: number) {
    if (pane.limit === undefined || scale <= 0) return nothing;

    const { width, height } = DUTY_PANE;
    const y = height - (pane.limit / scale) * height;
    return svg`<line
      class="duty-limit"
      x1="0" x2="${width}" y1="${y}" y2="${y}"
    ></line>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'metric-combo-chart': MetricComboChart;
  }
}
