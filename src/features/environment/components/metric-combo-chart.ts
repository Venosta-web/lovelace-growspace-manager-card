import { LitElement, html, css, svg, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { consume } from '@lit/context';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from 'custom-card-helpers';
import type { GrowspaceDevice } from '../../../services/types';
import type { MetricDescriptor } from '../../../slices/metric-descriptors';
import { hassContext } from '../../../lib/context';
import type { SensorHistories } from '../types';
import { metricComboFor, type ComboSecondary, type HistoryTimeRange } from '../constants';
import { computeComboIntervalPane, type ComboIntervalPane } from '../combo-series';
import { computeEnvSeries } from '../env-series';
import { formatMeasurement, formatReading, formatScaleMark } from '../metric-value-format';
import { accessibleChartSummary } from '../chart-accessibility';
import { localizeWithParams } from '../../../localize/localize';
import '../../../growspace-env-chart';
import './chart-scrub-tooltip';
import type { ChartScrubDetail, ChartScrubRow } from './chart-scrub-tooltip';

/**
 * A [[Curated Combo]]: one primary [[Env Graph]] with contextual secondaries
 * whose data shape selects the geometry (ADR-0049, ADR-0051).
 *
 * The primary pane *is* an Env Graph — the same element, with its [[Guide
 * Mark]]s, dark-period shading and scrub — rather than a second drawing of one.
 * This component owns that choice: [[Interval Metric]] context becomes a bar
 * pane beneath the primary, while [[Instantaneous Metric]] context is handed to
 * the Env Graph as faint traces on labelled right-hand axes.
 *
 * Every trace and pane is drawn against **one window**, computed here and handed
 * down, for the reason [[Env Series]] takes its window as a parameter: two
 * now-anchored windows resolved a moment apart are a silently misaligned axis.
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
  @consume({ context: hassContext, subscribe: true })
  hass!: HomeAssistant;

  @property({ attribute: false }) device: GrowspaceDevice | undefined;
  @property({ attribute: false }) sensorHistory: SensorHistories = {};
  @property({ attribute: false }) descriptors: Record<string, MetricDescriptor> = {};
  @property({ type: String }) range: HistoryTimeRange = '24h';
  /** The metric the combo is about, drawn as the line pane. */
  @property({ type: String }) primary = '';
  /**
   * The subordinate contexts that give the primary meaning, in recipe order.
   * Interval contexts become stacked panes; instantaneous contexts overlay.
   */
  @property({ attribute: false }) secondaries: ComboSecondary[] = [];
  @state() private _scrub: { position: number; rows: ChartScrubRow[] } | undefined;
  private _renderWindow = this._windowFor(this.range);

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
      touch-action: pan-y;
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
    return localizeWithParams(key, params, this.hass?.locale?.language ?? 'en');
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
   * A cap is a scale mark rather than a measurement, so it resolves through the
   * same owner as the value axis and the [[Guide Mark]] labels beside it — one
   * chart cannot round the same quantity two ways (#855).
   */
  private _capLabel(pane: ComboIntervalPane): string {
    // A configured ceiling replaces the peak as the readout, because it is what
    // the bars are being read against — a peak beside it would name the taller
    // of the two as the scale and leave the reader to work out which.
    if (pane.limit !== undefined) {
      return this._localize('metric_combo.limit_cap', {
        value: formatScaleMark(pane.limit, pane.unit),
      });
    }
    return formatScaleMark(pane.peak, pane.unit);
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

  /**
   * One accessible name for the pane's SVG, using the Env Graph's summary
   * contract so its bars are exposed as one graphic rather than as anonymous
   * rectangles.
   */
  private _paneAccessibleSummary(pane: ComboIntervalPane): string {
    const paneName = this._localize('metric_combo.pane_accessible_name', {
      metric: this._paneLabel(pane),
      scale: this._capLabel(pane),
    });
    const values = pane.bars.map((bar) => bar.value);
    const latest = values[values.length - 1];

    if (latest === undefined) return accessibleChartSummary(paneName, this.range, []);

    return accessibleChartSummary(paneName, this.range, [
      {
        name: paneName,
        min: Math.min(...values),
        max: Math.max(...values),
        average: values.reduce((total, value) => total + value, 0) / values.length,
        current: formatMeasurement(latest, pane.unit),
        unit: pane.unit,
      },
    ]);
  }

  /** Anchor a window when chart inputs change, never when only the scrub moves. */
  private _windowFor(range: HistoryTimeRange) {
    const durationMillis = RANGE_DURATION_MS[range] ?? RANGE_DURATION_MS['24h'];
    return { startTimeMs: Date.now() - durationMillis, durationMillis };
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    if (
      changed.has('device') ||
      changed.has('sensorHistory') ||
      changed.has('descriptors') ||
      changed.has('range') ||
      changed.has('primary') ||
      changed.has('secondaries')
    ) {
      this._renderWindow = this._windowFor(this.range);
    }
  }

  /**
   * The subordinate panes, in recipe order.
   *
   * A secondary the growspace has no sensor for drops out on its own, so a
   * combo degrades one pane at a time rather than all-or-nothing.
   */
  private _panesFor(startTimeMs: number, durationMillis: number): ComboIntervalPane[] {
    const options = {
      startTimeMs,
      nowMs: startTimeMs + durationMillis,
      barCount: DUTY_BAR_TARGET[this.range] ?? DUTY_BAR_TARGET['24h'],
    };
    return this.secondaries
      .map((secondary) =>
        computeComboIntervalPane(this.descriptors, this.sensorHistory ?? {}, secondary, {
          ...options,
          // The recipe names where a threshold comes from; the growspace holds
          // the number. Resolving it here keeps the derivation free of the
          // device and this component free of per-recipe knowledge.
          limit: this.device ? secondary.limitOf?.(this.device) : undefined,
        })
      )
      .filter((pane): pane is ComboIntervalPane => pane !== undefined);
  }

  render(): TemplateResult {
    const { startTimeMs, durationMillis } = this._renderWindow;
    const secondaryShape = metricComboFor(this.primary)?.secondaryShape ?? 'interval';
    const panes = secondaryShape === 'interval' ? this._panesFor(startTimeMs, durationMillis) : [];
    const overlayMetrics =
      secondaryShape === 'instantaneous'
        ? this.secondaries
            .map((secondary) => secondary.metric)
            .filter((key) => (this.descriptors[key]?.sensors.length ?? 0) > 0)
        : [];

    return html`
      <growspace-env-chart
        .device=${this.device}
        .sensorHistory=${this.sensorHistory}
        .descriptors=${this.descriptors}
        .metricKey=${this.primary}
        .metrics=${[this.primary]}
        .overlayMetrics=${overlayMetrics}
        .range=${this.range}
        .chartWindow=${{ startTimeMs, durationMillis }}
        .delegateScrub=${panes.length > 0 || overlayMetrics.length > 0}
        @chart-scrub=${(event: CustomEvent<ChartScrubDetail>) =>
          this._scrubPrimaryPane(event, panes, startTimeMs, durationMillis)}
        @pointerleave=${this._clearScrub}
        @pointercancel=${this._clearScrub}
      >
        ${panes.map((pane) => this._renderIntervalPane(pane, startTimeMs, durationMillis))}
      </growspace-env-chart>
      ${this._scrub
        ? html`<chart-scrub-tooltip
            .position=${this._scrub.position}
            .rows=${this._scrub.rows}
          ></chart-scrub-tooltip>`
        : nothing}
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
        <div
          class="duty-pane"
          @pointermove=${(event: PointerEvent) =>
            this._scrubIntervalPane(event, startTimeMs, durationMillis)}
        >
          <span class="duty-readout">${this._capLabel(pane)}</span>
          <svg
            viewBox="0 0 ${width} ${height}"
            preserveAspectRatio="none"
            role="img"
            aria-label=${this._paneAccessibleSummary(pane)}
          >
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

  /**
   * The scrub, entered from a subordinate pane.
   *
   * Two panes over one X axis means one scrub owner (ADR-0049), and that holds
   * however many panes there are: the tooltip carries the primary's reading at
   * the instant plus one interval row per pane, so hovering any of them reports
   * the same moment across all of them rather than only the one under the
   * pointer.
   */
  private _scrubIntervalPane(
    event: PointerEvent,
    startTimeMs: number,
    durationMillis: number
  ): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const position =
      rect.width > 0 ? Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) : 0.5;
    const hoverTime = startTimeMs + position * durationMillis;
    const primary = computeEnvSeries(this.descriptors, this.sensorHistory ?? {}, [this.primary], {
      startTimeMs,
      nowMs: startTimeMs + durationMillis,
      isCombined: false,
    })[0];
    const primaryPoint = primary?.points.reduce((closest, point) =>
      Math.abs(point.time - hoverTime) < Math.abs(closest.time - hoverTime) ? point : closest
    );

    this._scrub = {
      position,
      rows: [
        ...(primary && primaryPoint
          ? [
              {
                title: primary.title,
                time: { kind: 'moment' as const, time: hoverTime },
                value: formatReading(primary, primaryPoint, (key) => this._localize(key)),
                color: primary.color,
              },
            ]
          : []),
        ...this._intervalRows(hoverTime, startTimeMs, durationMillis),
      ],
    };
  }

  /** The scrub, entered from the primary pane, which reports its own rows. */
  private _scrubPrimaryPane(
    event: CustomEvent<ChartScrubDetail>,
    panes: ComboIntervalPane[],
    startTimeMs: number,
    durationMillis: number
  ): void {
    if (panes.length === 0) {
      this._scrub = event.detail;
      return;
    }
    const hoverTime = startTimeMs + event.detail.position * durationMillis;
    this._scrub = {
      position: event.detail.position,
      rows: [...event.detail.rows, ...this._intervalRows(hoverTime, startTimeMs, durationMillis)],
    };
  }

  /**
   * One row per subordinate pane, for the bucket under `hoverTime`.
   *
   * Derived from the panes rather than taken as an argument so both entry points
   * read the same buckets — the panes are cheap to recompute and a second
   * derivation is a second chance for the two tooltips to disagree.
   */
  private _intervalRows(
    hoverTime: number,
    startTimeMs: number,
    durationMillis: number
  ): ChartScrubRow[] {
    return this._panesFor(startTimeMs, durationMillis).flatMap((pane) => {
      const interval = this._intervalAt(pane, hoverTime);
      return interval ? [this._intervalRow(pane, interval)] : [];
    });
  }

  /**
   * The bucket covering `hoverTime`, or the nearest one, or nothing at all when
   * the pane has no bars — a metric whose sensor reported nothing across the
   * window has no reading to name.
   */
  private _intervalAt(
    pane: ComboIntervalPane,
    hoverTime: number
  ): ComboIntervalPane['bars'][number] | undefined {
    if (pane.bars.length === 0) return undefined;
    return (
      pane.bars.find((bar) => bar.startTime <= hoverTime && hoverTime <= bar.endTime) ??
      pane.bars.reduce((closest, bar) =>
        Math.abs(bar.startTime - hoverTime) < Math.abs(closest.startTime - hoverTime)
          ? bar
          : closest
      )
    );
  }

  private _intervalRow(
    pane: ComboIntervalPane,
    interval: ComboIntervalPane['bars'][number]
  ): ChartScrubRow {
    return {
      title: pane.title,
      time: {
        kind: 'interval',
        startTime: interval.startTime,
        endTime: interval.endTime,
      },
      value: formatMeasurement(interval.value, pane.unit),
      color: pane.color,
    };
  }

  private _clearScrub = (): void => {
    this._scrub = undefined;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'metric-combo-chart': MetricComboChart;
  }
}
