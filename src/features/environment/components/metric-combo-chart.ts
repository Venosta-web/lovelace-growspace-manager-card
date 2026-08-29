import { LitElement, html, css, svg, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { GrowspaceDevice } from '../../../services/types';
import type { MetricDescriptor } from '../../../slices/metric-descriptors';
import type { SensorHistories } from '../types';
import type { HistoryTimeRange } from '../constants';
import { computeComboIntervalPane, type ComboIntervalPane } from '../combo-series';
import { computeEnvSeries } from '../env-series';
import { localizeWithParams } from '../../../localize/localize';
import '../../../growspace-env-chart';
import './chart-scrub-tooltip';
import type { ChartScrubDetail, ChartScrubRow } from './chart-scrub-tooltip';

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
  /** The [[Interval Metric]] that gives it context, drawn as bars beneath. */
  @property({ type: String }) secondary = '';
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
  `;

  private _localize(key: string, params: Record<string, string | number> = {}): string {
    return localizeWithParams(key, params, 'en');
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
      changed.has('secondary')
    ) {
      this._renderWindow = this._windowFor(this.range);
    }
  }

  render(): TemplateResult {
    const { startTimeMs, durationMillis } = this._renderWindow;
    const pane = computeComboIntervalPane(
      this.descriptors,
      this.sensorHistory ?? {},
      this.secondary,
      {
        startTimeMs,
        nowMs: startTimeMs + durationMillis,
        barCount: DUTY_BAR_TARGET[this.range] ?? DUTY_BAR_TARGET['24h'],
      }
    );

    return html`
      <growspace-env-chart
        .device=${this.device}
        .sensorHistory=${this.sensorHistory}
        .descriptors=${this.descriptors}
        .metricKey=${this.primary}
        .metrics=${[this.primary]}
        .range=${this.range}
        .chartWindow=${{ startTimeMs, durationMillis }}
        .delegateScrub=${pane != null}
        @chart-scrub=${(event: CustomEvent<ChartScrubDetail>) =>
          this._scrubPrimaryPane(event, pane, startTimeMs, durationMillis)}
        @pointerleave=${this._clearScrub}
        @pointercancel=${this._clearScrub}
      >
        ${this._renderIntervalPane(pane, startTimeMs, durationMillis)}
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
   * The subordinate pane, or nothing at all.
   *
   * A combo whose secondary has no sensor degrades to its primary alone: an
   * empty frame under a temperature trace claims a context the growspace cannot
   * report.
   */
  private _renderIntervalPane(
    pane: ComboIntervalPane | undefined,
    startTimeMs: number,
    durationMillis: number
  ) {
    if (!pane) return nothing;

    const { width, height } = DUTY_PANE;
    const xAt = (time: number) => ((time - startTimeMs) / durationMillis) * width;

    return html`
      <div slot="secondary-pane" style="color:${pane.color}">
        <div class="duty-eyebrow">
          <span>${this._localize('metric_combo.duty_label', { metric: pane.title })}</span>
        </div>
        <div
          class="duty-pane"
          @pointermove=${(event: PointerEvent) =>
            this._scrubIntervalPane(event, pane, startTimeMs, durationMillis)}
        >
          <span class="duty-readout">${pane.peak.toFixed(0)}${pane.unit}</span>
          <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
            ${pane.bars.map((bar) => {
              // The tallest bar spends the whole box: the peak cap is what says
              // what full height is worth, so holding back headroom would only
              // shrink every bar for nothing.
              const barHeight = pane.peak > 0 ? (bar.value / pane.peak) * height : 0;
              const left = xAt(bar.startTime);
              const barWidth = Math.max(0, xAt(bar.endTime) - left);
              const gap = Math.min(0.5, barWidth * 0.2);
              return svg`<rect
                class="duty-bar"
                x="${left + gap / 2}" y="${height - barHeight}"
                width="${Math.max(0, barWidth - gap)}" height="${barHeight}" rx="1"
              ></rect>`;
            })}
          </svg>
        </div>
      </div>
    `;
  }

  private _scrubIntervalPane(
    event: PointerEvent,
    pane: ComboIntervalPane,
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
    const interval =
      pane.bars.find((bar) => bar.startTime <= hoverTime && hoverTime <= bar.endTime) ??
      pane.bars.reduce((closest, bar) =>
        Math.abs(bar.startTime - hoverTime) < Math.abs(closest.startTime - hoverTime)
          ? bar
          : closest
      );

    this._scrub = {
      position,
      rows: [
        ...(primary && primaryPoint
          ? [
              {
                title: primary.title,
                time: { kind: 'moment' as const, time: hoverTime },
                value: `${primaryPoint.value.toFixed(1)} ${primary.unit}`,
                color: primary.color,
              },
            ]
          : []),
        this._intervalRow(pane, interval),
      ],
    };
  }

  private _scrubPrimaryPane(
    event: CustomEvent<ChartScrubDetail>,
    pane: ComboIntervalPane | undefined,
    startTimeMs: number,
    durationMillis: number
  ): void {
    if (!pane) return;
    const hoverTime = startTimeMs + event.detail.position * durationMillis;
    const interval =
      pane.bars.find((bar) => bar.startTime <= hoverTime && hoverTime <= bar.endTime) ??
      pane.bars.reduce((closest, bar) =>
        Math.abs(bar.startTime - hoverTime) < Math.abs(closest.startTime - hoverTime)
          ? bar
          : closest
      );
    this._scrub = {
      position: event.detail.position,
      rows: [...event.detail.rows, this._intervalRow(pane, interval)],
    };
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
      value: `${interval.value.toFixed(1)} ${pane.unit}`,
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
