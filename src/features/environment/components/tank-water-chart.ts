import { LitElement, html, css, svg, nothing, type TemplateResult, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { z } from 'zod';
import type { GrowspaceDevice, IrrigationTank } from '../../../services/types';
import { ChartType, MetricKey, type HistoryTimeRange } from '../constants';
import { hassCall } from '../../../services/hass-call';
import { reducedMotion } from '../../../styles/reduced-motion.styles';
import { localize, localizeWithParams } from '../../../localize/localize';
import { mdiBarrel } from '@mdi/js';
import { metricHistoryKeys } from '../../../slices/metric-descriptors';
import { ChartUtils } from '../../../utils/chart-utils';
import type { RawHistoryDataPoint } from '../../../adapters/hass-types';
import type { SensorHistories } from '../types';

const TankWaterBucketSchema = z.object({
  timestamp: z.string(),
  liters: z.number(),
});

const TankWaterHistorySchema = z.object({
  buckets: z.array(TankWaterBucketSchema),
});

type TankWaterBucket = z.infer<typeof TankWaterBucketSchema>;

interface TankLevelTrace {
  id: string;
  title: string;
  path: string;
  points: { time: number; value: number }[];
  refills: { x: number; y: number }[];
}

interface TankLevelTooltip {
  x: number;
  time: string;
  items: { title: string; value: string }[];
}

/**
 * The level pane's geometry and its **fixed** value axis.
 *
 * The domain does not fit the data. A tank that has only drifted 84 → 82% in an
 * hour would otherwise fill the frame with what is nearly a flat line, and — the
 * reason that matters here — the warning line and the refill dots would sit at a
 * different height at every range, so switching range would look like the tank
 * had moved. 20% is below every sane warning level and 100% is a full tank.
 */
const LEVEL_PANE = { width: 800, height: 200, min: 20, max: 100 } as const;

/** How far back each range looks. Mirrors the window the backend buckets over. */
const RANGE_DURATION_MS: Record<HistoryTimeRange, number> = {
  '1h': 3_600_000,
  '6h': 21_600_000,
  '24h': 86_400_000,
  '7d': 604_800_000,
};

/**
 * The rise between consecutive samples that counts as a refill rather than as
 * sensor noise. Float sensors and ultrasonic probes wobble a point or two; a
 * tank nobody touched never gains five.
 */
const REFILL_RISE_PCT = 5;

/** Where `value` percent falls in the level pane's 200-unit box. */
function levelY(value: number): number {
  const { height, min, max } = LEVEL_PANE;
  return height - ((value - min) / (max - min)) * height;
}

/**
 * "24 × 1 h" — how wide one bar is, and how many of them there are.
 *
 * The width is derived from the range and the bar count rather than read off
 * the payload's timestamps, because a range with a single bucket has no gap to
 * measure and an empty one has no timestamps at all.
 */
function _formatBucketSummary(range: HistoryTimeRange, count: number): string {
  const widthMs = RANGE_DURATION_MS[range] / count;
  const minutes = widthMs / 60_000;

  if (minutes < 60) {
    return localizeWithParams('water_chart.bucket_minutes', { count, width: Math.round(minutes) });
  }
  const hours = minutes / 60;
  if (hours < 24) {
    return localizeWithParams('water_chart.bucket_hours', { count, width: Math.round(hours) });
  }
  return localizeWithParams('water_chart.bucket_days', { count, width: Math.round(hours / 24) });
}

/**
 * Time-to-empty, in the unit that reads best at that distance.
 *
 * Deliberately one decimal on the day form, unlike the header chip's whole-day
 * `3d`: the chip is a glance and this is the card you opened to see the trend,
 * where the difference between 3.1 and 3.9 days is the reason you opened it.
 */
function _formatTimeRemaining(hours: number): string {
  if (hours >= 48) {
    return localizeWithParams('water_chart.days_left', { days: (hours / 24).toFixed(1) });
  }
  return localizeWithParams('water_chart.hours_left', { hours: Math.round(hours) });
}

/**
 * The most usage bars a range may show.
 *
 * `get_tank_water_history` picks its bucket width from the range and not from
 * how many bars fit: 24h arrives as 96 × 15 min and 7d as 168 × 1 h, both
 * hairline at any card width. The chart folds consecutive buckets together
 * until it is under the target, which is what makes 24h read as hourly and 7d
 * as daily while leaving the two short ranges at the resolution they arrive in.
 */
const USAGE_BAR_TARGET: Record<HistoryTimeRange, number> = {
  '1h': 12,
  '6h': 24,
  '24h': 24,
  '7d': 7,
};

/**
 * Sum consecutive buckets into at most `target` bars.
 *
 * Liters are additive over time, so folding is a sum rather than an average —
 * a folded bar is the water actually drawn in its wider slot. The folded bar
 * carries the timestamp its group opens on.
 */
export function foldUsageBuckets(buckets: TankWaterBucket[], target: number): TankWaterBucket[] {
  if (buckets.length <= target) return buckets;

  const groupSize = Math.ceil(buckets.length / target);
  const folded: TankWaterBucket[] = [];
  for (let i = 0; i < buckets.length; i += groupSize) {
    const group = buckets.slice(i, i + groupSize);
    folded.push({
      timestamp: group[0].timestamp,
      liters: group.reduce((sum, bucket) => sum + bucket.liters, 0),
    });
  }
  return folded;
}

@customElement('tank-water-chart')
export class TankWaterChart extends LitElement {
  @property({ attribute: false }) device: GrowspaceDevice | undefined;
  @property({ type: String }) range: HistoryTimeRange = '24h';
  /**
   * The histories the level pane traces, as fetched by the host. Keys follow
   * `metricHistoryKeys`, so one tank files under the metric key and several file
   * under their own entity ids.
   */
  @property({ attribute: false }) sensorHistory: SensorHistories = {};
  /**
   * The metric whose chip routed here. Both tank metrics open this card, and the
   * host closes a graph by the key it opened, so the card has to say which of
   * the two it is standing in for. Defaults to the metric it has always served.
   */
  @property({ type: String }) metricKey: string = MetricKey.WATER;

  @state() private _buckets: TankWaterBucket[] = [];
  @state() private _loading = false;
  @state() private _error = false;
  @state() private _levelTooltip: TankLevelTooltip | undefined;

  private _lastRequestKey: string | undefined;
  private _requestVersion = 0;

  static styles = css`
    :host {
      display: block;
    }
    .chart-wrapper {
      display: flex;
      flex-direction: column;
      height: 100%;
      box-sizing: border-box;
      background: var(--card-background-color, #1c1c1e);
      border-radius: 12px;
      padding: 16px;
    }
    .chart-title {
      font-size: var(--font-size-supporting);
      color: var(--text-secondary);
      margin-bottom: 12px;
    }
    .tank-header {
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }
    .tank-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--metric-tank-level, var(--gm-primary-color, #2196f3));
      font-weight: 500;
    }
    .tank-title ha-svg-icon {
      --mdc-icon-size: 22px;
      width: 22px;
      height: 22px;
    }
    .range-badge {
      padding: 2px 8px;
      border-radius: var(--border-radius-full, 9999px);
      background: color-mix(in srgb, var(--metric-tank-level, #2196f3) 15%, transparent);
      border: 1px solid color-mix(in srgb, var(--metric-tank-level, #2196f3) 30%, transparent);
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: var(--metric-tank-level, #64b5f6);
    }
    .level-pane {
      position: relative;
      flex: 1;
      min-height: 120px;
      background: var(--gs-chart-surface, #0d0d0d);
      border-radius: 8px;
      overflow: hidden;
    }
    .level-axis-max,
    .level-axis-min {
      position: absolute;
      left: 8px;
      z-index: 2;
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: var(--text-secondary);
      opacity: 0.55;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .level-axis-max {
      top: 8px;
    }
    .level-axis-min {
      bottom: 8px;
    }
    .level-pane svg {
      height: 100%;
      display: block;
      overflow: visible;
      color: var(--metric-tank-level, var(--gm-primary-color, #2196f3));
    }
    .level-baseline,
    .level-midline {
      stroke: var(--divider-color, rgba(255, 255, 255, 0.12));
    }
    .level-baseline {
      stroke-width: 1;
    }
    .level-midline {
      stroke-width: 0.5;
      stroke-dasharray: 4 4;
    }
    .level-warning {
      stroke: var(--gm-status-danger, var(--error-color, #f44336));
      stroke-opacity: 0.55;
      stroke-width: 1;
      stroke-dasharray: 6 5;
    }
    .level-fill {
      fill: url(#tank-level-fill);
    }
    .refill-dot {
      fill: var(--gs-chart-surface, #0d0d0d);
      stroke: currentColor;
      stroke-width: 2;
      vector-effect: non-scaling-stroke;
    }
    .level-trace {
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      vector-effect: non-scaling-stroke;
    }
    .tank-tooltip {
      position: absolute;
      top: 8px;
      z-index: 10;
      padding: 8px 12px;
      transform: translateX(-50%);
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      border-radius: 8px;
      background: var(--card-background-color, rgba(30, 30, 35, 0.95));
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      color: var(--primary-text-color, #fff);
      font-size: var(--font-size-xs);
      line-height: 1.4;
      pointer-events: none;
      white-space: nowrap;
    }
    .tank-tooltip-time {
      padding-bottom: 2px;
      margin-bottom: 4px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      font-weight: 700;
      text-align: center;
    }
    .tank-tooltip-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 2px;
    }
    .tank-tooltip-value {
      font-family: monospace;
      font-weight: 700;
    }
    .tank-cursor-line {
      position: absolute;
      top: 0;
      bottom: 0;
      z-index: 5;
      border-left: 1px dashed rgba(255, 255, 255, 0.5);
      pointer-events: none;
    }

    .tank-readout {
      text-align: right;
    }
    .tank-level {
      font-size: 1.2em;
      font-weight: 700;
      color: var(--metric-tank-level, var(--gm-primary-color, #2196f3));
      font-variant-numeric: tabular-nums;
    }
    .tank-remaining {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
      font-variant-numeric: tabular-nums;
    }
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: var(--text-secondary);
      gap: 12px;
    }
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid var(--gm-primary-color);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    .usage-eyebrow {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      margin: 8px 0 4px;
      font-size: var(--font-size-xs);
      font-weight: 500;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-secondary);
    }
    .usage-pane {
      position: relative;
      height: 64px;
      flex: none;
      background: var(--gs-chart-surface, #0d0d0d);
      border-radius: 8px;
      overflow: hidden;
    }
    .usage-pane--message {
      height: auto;
      min-height: 64px;
      padding: 12px;
      box-sizing: border-box;
    }
    /* The generic svg rule below carries the Graph Wall's flex sizing --
       flex: 1 0 --gs-env-chart-height, and a matching min-height. The usage
       plot is the one svg here that must not grow: it fills a pane of fixed
       height, so it opts out of both. */
    .usage-pane svg {
      height: 100%;
      min-height: 0;
      flex: none;
      display: block;
      overflow: hidden;
    }
    .usage-pane .loading,
    .usage-pane .error {
      padding: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .usage-peak,
    .usage-total,
    .usage-axis-left,
    .usage-axis-right {
      position: absolute;
      z-index: 2;
      font-size: var(--font-size-xs);
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .usage-peak,
    .usage-total {
      top: 7px;
      font-weight: 600;
    }
    .usage-peak {
      left: 8px;
      color: var(--metric-water, var(--gm-primary-color, #03a9f4));
    }
    .usage-total {
      right: 8px;
      color: var(--text-secondary);
    }
    .usage-axis-left,
    .usage-axis-right {
      bottom: 6px;
      font-weight: 500;
      color: var(--text-secondary);
      opacity: 0.4;
    }
    .usage-axis-left {
      left: 7px;
    }
    .usage-axis-right {
      right: 7px;
    }
    .usage-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }
    .error {
      display: flex;
      flex: 1;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px;
      text-align: center;
      color: var(--text-muted);
      font-size: var(--font-size-supporting);
    }
    .retry-button {
      min-height: 40px;
      margin-top: 12px;
      padding-inline: 16px;
      border: 1px solid currentColor;
      border-radius: var(--border-radius-full, 9999px);
      background: transparent;
      color: var(--gm-primary-color);
      font: inherit;
      cursor: pointer;
    }
    .retry-button:hover {
      background: var(--primary-container);
    }
    .retry-button:focus-visible {
      outline: 2px solid var(--gm-primary-color);
      outline-offset: 2px;
    }
    svg {
      width: 100%;
      height: auto;
      flex: 1 0 var(--gs-env-chart-height, 80px);
      min-height: var(--gs-env-chart-height, 80px);
      overflow: visible;
    }
    .bar {
      fill: var(--metric-water, var(--gm-primary-color, #03a9f4));
      opacity: 0.85;
    }
    .bar:hover {
      opacity: 1;
    }
    .axis-label {
      font-size: var(--font-size-xs);
      fill: var(--text-muted);
    }

    ${reducedMotion}
  `;

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has('range') || changed.has('device')) {
      void this._fetch();
    }
  }

  private async _fetch(): Promise<void> {
    const deviceId = this.device?.deviceId;
    if (!deviceId) {
      this._lastRequestKey = undefined;
      this._requestVersion++;
      this._buckets = [];
      this._loading = false;
      this._error = false;
      return;
    }

    const requestKey = `${deviceId}:${this.range}`;
    if (requestKey === this._lastRequestKey) return;

    this._lastRequestKey = requestKey;
    const requestVersion = ++this._requestVersion;
    this._loading = true;
    this._error = false;
    try {
      const result = await hassCall(
        'growspace_manager/get_tank_water_history',
        { growspace_id: deviceId, range: this.range },
        TankWaterHistorySchema
      );
      if (requestVersion !== this._requestVersion) return;
      this._buckets = result.buckets;
    } catch {
      if (requestVersion !== this._requestVersion) return;
      this._buckets = [];
      this._error = true;
    } finally {
      if (requestVersion === this._requestVersion) {
        this._loading = false;
      }
    }
  }

  /** The tanks the header reads. Empty when none are configured. */
  private get _tanks(): IrrigationTank[] {
    return this.device?.environmentAttributes?.irrigationTanks ?? [];
  }

  /**
   * Mean fill across the configured tanks, or `undefined` when none of them is
   * reporting. Averaging matches the [[Tank Level]] header chip: several tanks
   * feeding one growspace are one reservoir as far as the grower is concerned.
   */
  private get _fillLevel(): number | undefined {
    const levels = this._tanks
      .map((tank) => tank.fillLevel)
      .filter((level): level is number => level != null);
    if (levels.length === 0) return undefined;
    return levels.reduce((sum, level) => sum + level, 0) / levels.length;
  }

  /**
   * Hours until the soonest-depleting tank runs dry, or `undefined` when the
   * backend has no estimate for any of them — the header drops the line rather
   * than showing a placeholder.
   */
  private get _hoursRemaining(): number | undefined {
    const hours = this._tanks
      .map((tank) => tank.hoursRemaining)
      .filter((value): value is number => value != null);
    if (hours.length === 0) return undefined;
    return Math.min(...hours);
  }

  private _renderHeader(): TemplateResult {
    const level = this._fillLevel;
    const hours = this._hoursRemaining;

    return html`
      <div class="tank-header" @click=${this._toggleGraph}>
        <div class="tank-title">
          <ha-svg-icon .path=${mdiBarrel}></ha-svg-icon>
          <span>${localize('water_chart.tank_level_title')}</span>
          <span class="range-badge">${this.range}</span>
        </div>
        <div class="tank-readout">
          <div class="tank-level">${level == null ? '—' : `${level.toFixed(1)} %`}</div>
          ${hours == null
            ? nothing
            : html`<div class="tank-remaining">${_formatTimeRemaining(hours)}</div>`}
        </div>
      </div>
    `;
  }

  /**
   * One trace per configured tank, in geometry space.
   *
   * A tank with fewer than two in-window samples is dropped rather than drawn:
   * a single point has no slope, and `generatePathFromValues` returns an empty
   * path for it anyway.
   */
  private get _levelTraces(): TankLevelTrace[] {
    const tanks = this._tanks;
    if (tanks.length === 0) return [];

    const now = Date.now();
    const startTime = now - RANGE_DURATION_MS[this.range];
    const { width, height, min, max } = LEVEL_PANE;

    return metricHistoryKeys(
      MetricKey.IRRIGATION_TANK_LEVEL,
      tanks.map((tank) => tank.sensorEntity)
    ).flatMap(({ entityId, historyKey }) => {
      const history = (this.sensorHistory[historyKey] ?? []) as RawHistoryDataPoint[];
      const points = ChartUtils.normalizeHistory(history, MetricKey.IRRIGATION_TANK_LEVEL).filter(
        (point) => point.time >= startTime
      );
      if (points.length < 2) return [];

      const path = ChartUtils.generatePathFromValues(points, width, height, {
        min,
        max,
        startTime,
        endTime: now,
        type: ChartType.LINE,
        timeRange: this.range,
      });
      if (!path) return [];

      const refills = points.flatMap((point, i) =>
        i > 0 && point.value - points[i - 1].value >= REFILL_RISE_PCT
          ? [{ x: ((point.time - startTime) / (now - startTime)) * width, y: levelY(point.value) }]
          : []
      );
      const title = tanks.find((tank) => tank.sensorEntity === entityId)?.name ?? entityId;
      return [{ id: entityId, title, path, points, refills }];
    });
  }

  /**
   * The level a tank is considered low at.
   *
   * The lowest configured `warningLevel` wins: with several tanks the growspace
   * is in trouble as soon as the first of them is, so the line marks the point
   * the earliest warning fires.
   */
  private get _warningLevel(): number | undefined {
    const levels = this._tanks
      .map((tank) => tank.warningLevel)
      .filter((level): level is number => level != null);
    return levels.length === 0 ? undefined : Math.min(...levels);
  }

  private _renderLevelPane(): TemplateResult {
    const { width, height, min, max } = LEVEL_PANE;
    const traces = this._levelTraces;
    const warning = this._warningLevel;

    return html`
      <div
        class="level-pane"
        @mousemove=${this._handleLevelHover}
        @mouseleave=${this._clearLevelTooltip}
      >
        ${this._renderLevelTooltip()}
        <span class="level-axis-max">${max}%</span>
        <span class="level-axis-min">${min}%</span>
        <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
          <defs>
            <linearGradient id="tank-level-fill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="currentColor" stop-opacity="0.4"></stop>
              <stop offset="100%" stop-color="currentColor" stop-opacity="0"></stop>
            </linearGradient>
          </defs>
          <line class="level-baseline" x1="0" y1=${height} x2=${width} y2=${height}></line>
          <line class="level-midline" x1="0" y1=${height / 2} x2=${width} y2=${height / 2}></line>
          ${warning == null
            ? nothing
            : svg`<line class="level-warning" x1="0" y1="${levelY(warning)}" x2="${width}" y2="${levelY(warning)}"></line>`}
          ${traces.map(
            (trace) => svg`
              <path class="level-fill" d="${trace.path} V ${height} H 0 Z"></path>
              <path class="level-trace" d="${trace.path}"></path>
              ${trace.refills.map(
                (refill) =>
                  svg`<circle class="refill-dot" cx="${refill.x}" cy="${refill.y}" r="4"></circle>`
              )}
            `
          )}
        </svg>
      </div>
    `;
  }

  private _handleLevelHover = (event: MouseEvent): void => {
    const traces = this._levelTraces;
    if (traces.length === 0) {
      this._clearLevelTooltip();
      return;
    }

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const now = Date.now();
    const startTime = now - RANGE_DURATION_MS[this.range];
    const hoverTime = startTime + (rect.width > 0 ? x / rect.width : 0.5) * (now - startTime);

    this._levelTooltip = {
      x,
      time: new Date(hoverTime).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      }),
      items: traces.map((trace) => {
        const closest = trace.points.reduce((candidate, point) =>
          Math.abs(point.time - hoverTime) < Math.abs(candidate.time - hoverTime)
            ? point
            : candidate
        );
        return { title: trace.title, value: `${closest.value.toFixed(1)} %` };
      }),
    };
  };

  private _clearLevelTooltip = (): void => {
    this._levelTooltip = undefined;
  };

  private _renderLevelTooltip(): TemplateResult | typeof nothing {
    const tooltip = this._levelTooltip;
    if (!tooltip) return nothing;

    return html`
      <div class="tank-tooltip" role="tooltip" style="left: ${tooltip.x}px">
        <div class="tank-tooltip-time">${tooltip.time}</div>
        ${tooltip.items.map(
          (item) => html`
            <div class="tank-tooltip-row">
              <span>${item.title}:</span>
              <span class="tank-tooltip-value">${item.value}</span>
            </div>
          `
        )}
      </div>
      <div class="tank-cursor-line" style="left: ${tooltip.x}px"></div>
    `;
  }

  render(): TemplateResult {
    const bars = this._bars;

    return html`
      <div class="chart-wrapper">
        ${this._renderHeader()} ${this._renderLevelPane()}
        <div class="usage-eyebrow">
          <span>${localize('water_chart.title')}</span>
          ${bars.length === 0
            ? nothing
            : html`<span class="usage-buckets">
                ${_formatBucketSummary(this.range, bars.length)}
              </span>`}
        </div>
        ${this._renderUsagePane(bars)}
      </div>
    `;
  }

  /**
   * The usage pane, in every state it has.
   *
   * Loading, error and empty all render *inside* the frame rather than in place
   * of it. The card is a Graph Wall tile: if the pane collapsed, pressing a
   * range button would resize the card and reflow the grid, and a failed fetch
   * would look like a broken card rather than like one pane with no data.
   */
  private _renderUsagePane(bars: TankWaterBucket[]): TemplateResult {
    if (this._loading) {
      return this._usageFrame(
        html`<div class="loading" role="status" aria-live="polite">
          <div class="spinner"></div>
          <span>${localize('water_chart.loading')}</span>
        </div>`,
        { axis: false }
      );
    }

    if (this._error) {
      return this._usageFrame(
        html`<div class="error" role="alert">
          <div>${localize('water_chart.load_failed')}</div>
          <button class="retry-button" type="button" @click=${this._retry}>
            ${localize('water_chart.retry')}
          </button>
        </div>`,
        { axis: false }
      );
    }

    // An all-zero range is as empty as no range at all: bars of height zero
    // read as a rendering fault, not as "nothing was drawn".
    if (bars.every((bar) => bar.liters <= 0)) {
      return this._usageFrame(
        html`<div class="usage-empty">${localize('water_chart.no_irrigation')}</div>`
      );
    }

    const peak = Math.max(...bars.map((bar) => bar.liters));
    // Summed over the response rather than over the bars: folding must not be
    // able to change what the range total says.
    const total = this._buckets.reduce((sum, bucket) => sum + bucket.liters, 0);

    return this._usageFrame(html`
      <span class="usage-peak">${peak.toFixed(1)} L</span>
      <span class="usage-total">${total.toFixed(1)} L</span>
      ${this._renderBars(bars)}
    `);
  }

  /** The pane's frame: one surface, and the X axis caps that never move. */
  private _usageFrame(body: unknown, { axis = true }: { axis?: boolean } = {}): TemplateResult {
    // A loading or error pane carries a message and a 40px tap target, which do
    // not fit the plot's 64px. Those two states are allowed to grow; the plot
    // and the empty pane are not, so switching range never resizes the card.
    return html`
      <div class="usage-pane ${axis ? '' : 'usage-pane--message'}">
        ${body}
        ${axis
          ? html`
              <span class="usage-axis-left">-${this.range}</span>
              <span class="usage-axis-right">${localize('environment_chart.now')}</span>
            `
          : nothing}
      </div>
    `;
  }

  /** Close this graph, the way clicking an Env Chart's header closes that one. */
  private _toggleGraph = (): void => {
    this.dispatchEvent(
      new CustomEvent('toggle-graph', {
        detail: this.metricKey,
        bubbles: true,
        composed: true,
      })
    );
  };

  private _retry(): void {
    this._lastRequestKey = undefined;
    void this._fetch();
  }

  /** The response folded to the bar count this range shows. */
  private get _bars(): TankWaterBucket[] {
    return foldUsageBuckets(this._buckets, USAGE_BAR_TARGET[this.range]);
  }

  private _renderBars(bars: TankWaterBucket[]): TemplateResult {
    const max = Math.max(...bars.map((b) => b.liters), 0.001);
    const chartH = 80;
    const barW = 100 / bars.length;
    const gap = Math.min(0.5, barW * 0.2);

    return html`
      <svg viewBox="0 0 100 ${chartH}" preserveAspectRatio="none">
        ${bars.map((bucket, i) => {
          // The tallest bar spends the whole box: the peak cap above the pane
          // is what says how many liters full height is worth, so holding back
          // headroom would only shrink every bar for nothing.
          const barH = (bucket.liters / max) * chartH;
          const x = i * barW + gap / 2;
          const y = chartH - barH;
          return svg`
            <rect class="bar" x="${x}" y="${y}" width="${barW - gap}" height="${barH}" rx="1">
              <title>
                ${new Date(bucket.timestamp).toLocaleTimeString()} — ${bucket.liters.toFixed(1)} L
              </title>
            </rect>
          `;
        })}
      </svg>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tank-water-chart': TankWaterChart;
  }
}
