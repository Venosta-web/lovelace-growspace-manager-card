import { LitElement, html, svg, css, type TemplateResult, type PropertyValues, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { StoreController } from '@nanostores/lit';
import type { GrowspaceDevice } from '../../../services/types';
import type { SensorHistories } from '../types';
import { ChartUtils } from '../../../utils/chart-utils';
import { cropSteeringHistory$, fetchCropSteeringHistory } from '../../../slices/irrigation';
import type { CropSteeringHistory } from '../../../schemas/api-schema';
import { PollingController } from '../../shared/controllers/polling.controller';
import { METRIC_CONFIG, MetricKey } from '../constants';
import { metricHistoryKeys, resolveMetricEntityIds } from '../../../slices/metric-descriptors';
import { reducedMotion } from '../../../styles/reduced-motion.styles';
import { guideLabelStyles } from './guide-label';
import { formatMeasurement } from '../metric-value-format';
import { accessibleChartSummary, type AccessibleChartSeries } from '../chart-accessibility';
import {
  computeCropSteeringCycle,
  computePhases,
  fmtMinuteOfDay,
  generateSubstrateProjection,
  resolveSaturationCrossing,
  type CropSteeringPhase,
  type CropSteeringShot,
  type VwcSample,
} from '../crop-steering-model';

type TracePt = { offset: number; v: number };

type CsModelTooltip = {
  xPct: number;
  time: string;
  projected: boolean;
  items: Array<{ title: string; value: string; color: string }>;
};

/**
 * Renders the "Substrate model · live + projected" chart — Substrate VWC, Pore EC,
 * and Bulk EC traced across a single photoperiod-anchored day. Shared between the
 * Irrigation Dialog's Crop Steering Schedule panel and the promoted Steering Phase
 * Chip's inline graph slot (Custom Graph Routing).
 */
/**
 * The P2 trigger's colour. ADR 0047: the trigger is the VWC floor P2 maintains,
 * not the boundary P3 begins at, so it reads as P2 and agrees with the Phase
 * Strip below it. The fallback is carried because the chart renders inside the
 * portalled dialog host as well as inside the card (ADR 0036).
 */
const PHASE_P2 = 'var(--phase-p2, #2196f3)';

/**
 * The ground every pane in this chart is painted on, reached from SVG as well as
 * from CSS: the current-value dot halos are a ring of it, and a halo that does not
 * move with the pane is a black ring on a light theme.
 */
const PANE_GROUND = 'var(--secondary-background-color, #0d0d0d)';

@customElement('crop-steering-day-chart')
export class CropSteeringDayChart extends LitElement {
  @property({ attribute: false }) device: GrowspaceDevice | undefined;
  @property({ type: Boolean }) hideShotTrack = false;
  @property({ type: Boolean }) rollingWindow = false;
  @property({ type: String }) range: '1h' | '6h' | '24h' | '7d' = '24h';
  @property({ attribute: false }) sensorHistory: SensorHistories = {};

  @state() private _csModelTooltip: CsModelTooltip | null = null;

  private _historyController?: StoreController<Map<string, CropSteeringHistory>>;
  private _poller?: PollingController;
  private _csModelRafId: number | null = null;

  static styles = css`
    ${guideLabelStyles}

    :host {
      display: flex;
      flex-direction: column;
      /* Rules sit on a theme-owned pane, so they need a theme-owned foreground
         with non-text contrast of its own. HA's divider role is intentionally
         subtler than the 3:1 this chart's dense grid and frames require. */
      --cs-rule-color: color-mix(
        in srgb,
        var(--primary-text-color, #ffffff) 50%,
        var(--secondary-background-color, #0d0d0d)
      );
    }
    .cs-model {
      position: relative;
      height: auto;
      flex: 1 0 var(--gs-env-chart-height, 300px);
      min-height: var(--gs-env-chart-height, 300px);
      border: 1px solid var(--cs-rule-color);
      border-radius: var(--border-radius-md, 12px);
      background: var(--secondary-background-color, #0d0d0d);
      overflow: hidden;
      cursor: crosshair;
      touch-action: pan-y;
    }
    .cs-model-cursor {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 1px;
      background: var(--cs-rule-color);
      pointer-events: none;
      z-index: 5;
    }
    .cs-model-tooltip {
      position: absolute;
      top: 24px;
      z-index: 6;
      /* Unlike the chart panes, the tooltip owns this fixed-dark ground. Its
         foreground therefore uses the matching on-overlay roles (ADR 0039). */
      background: rgb(20, 20, 20);
      backdrop-filter: blur(6px);
      border: 1px solid var(--on-overlay-muted, rgba(255, 255, 255, 0.55));
      border-radius: var(--border-radius-sm, 8px);
      padding: 6px 8px;
      pointer-events: none;
      font-size: 10.5px;
      white-space: nowrap;
      box-shadow: var(--card-shadow, var(--md3-elevation-level1));
      color: var(--on-overlay-primary, #ffffff);
    }
    .cs-model-tooltip-time {
      font-weight: 600;
      margin-bottom: 4px;
      color: var(--on-overlay-primary, #ffffff);
      border-bottom: 1px solid var(--on-overlay-muted, rgba(255, 255, 255, 0.55));
      padding-bottom: 3px;
    }
    .cs-model-tooltip-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-top: 2px;
      font-family: monospace;
      color: var(--on-overlay-primary, #ffffff);
    }
    .cs-model-tooltip-row i {
      width: 6px;
      height: 6px;
      margin-right: 4px;
      border-radius: 50%;
      display: inline-block;
    }
    .cs-model svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
    }
    .cm-title {
      position: absolute;
      top: 6px;
      left: 10px;
      z-index: 2;
      font-size: var(--font-size-xs);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-primary, var(--primary-text-color, #ffffff));
    }
    .cm-readout {
      position: absolute;
      top: 5px;
      right: 10px;
      z-index: 2;
      display: flex;
      gap: 12px;
      font-size: 10.5px;
      color: var(--text-primary, var(--primary-text-color, #ffffff));
      font-variant-numeric: tabular-nums;
    }
    .cm-readout span {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .cm-readout i {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex: 0 0 auto;
      display: inline-block;
    }
    .cm-readout b {
      color: var(--text-primary, var(--primary-text-color, #ffffff));
      font-weight: 600;
    }
    .cm-axis-cap {
      position: absolute;
      bottom: 3px;
      z-index: 2;
      font-size: var(--font-size-xs);
      font-weight: 500;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-primary, var(--primary-text-color, #ffffff));
    }
    .cm-axis-cap.left {
      left: 7px;
    }
    .cm-axis-cap.right {
      right: 7px;
    }
    /* The shared placement keeps a label clear of the left tick column. This chart
       has a second value axis, so an EC label is anchored inboard of the right
       tick column instead, matching the axis cap below it. */
    .gs-guide-label.right {
      right: 52px;
      left: auto;
    }
    .gs-guide-label {
      color: var(--text-primary, var(--primary-text-color, #ffffff));
    }
    .cm-tick {
      position: absolute;
      z-index: 2;
      transform: translateY(-50%);
      font-size: var(--font-size-xs);
      font-variant-numeric: tabular-nums;
      color: var(--text-primary, var(--primary-text-color, #ffffff));
      pointer-events: none;
    }
    .cm-tick.left {
      left: 6px;
    }
    .cm-tick.right {
      right: 6px;
    }
    .placeholder {
      padding: 32px;
      text-align: center;
      color: var(--text-primary, var(--primary-text-color, #ffffff));
      font-size: var(--font-size-supporting);
    }
    .cs-phase-strip {
      position: relative;
      flex: none;
      height: 52px;
      margin-bottom: 10px;
      border: 1px solid var(--cs-rule-color);
      border-radius: var(--border-radius-md, 12px);
      background: var(--secondary-background-color, #0d0d0d);
      overflow: hidden;
    }
    .cs-phase-block {
      position: absolute;
      top: 0;
      bottom: 0;
      padding: 7px 10px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      justify-content: center;
      overflow: hidden;
    }
    /* An unlit stretch, tinted with the theme's own text colour so it reads as
       "the lights were off" on a light card as well as a dark one. */
    .cs-phase-block.dark {
      background: color-mix(in srgb, var(--primary-text-color, #ffffff) 12%, transparent);
      border-left: 1px solid var(--cs-rule-color);
    }
    .cs-phase-num {
      font-size: var(--font-size-xs);
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
      color: var(--text-primary, var(--primary-text-color, #ffffff));
    }
    .cs-phase-nm {
      font-size: 11px;
      font-weight: 500;
      text-transform: none;
      letter-spacing: 0;
      color: var(--text-primary, var(--primary-text-color, #ffffff));
    }
    .cs-phase-meta {
      font-size: var(--font-size-xs);
      color: var(--text-primary, var(--primary-text-color, #ffffff));
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cs-track {
      position: relative;
      flex: none;
      height: 108px;
      margin-bottom: 10px;
      border: 1px solid var(--cs-rule-color);
      border-radius: var(--border-radius-md, 12px);
      background: var(--secondary-background-color, #0d0d0d);
      overflow: hidden;
    }
    .grid-v {
      position: absolute;
      top: 0;
      bottom: 18px;
      width: 1px;
      background: var(--cs-rule-color);
      pointer-events: none;
    }
    .grid-v.major {
      background: var(--cs-rule-color);
    }
    .x-label {
      position: absolute;
      bottom: 4px;
      transform: translateX(-50%);
      font-size: var(--font-size-xs);
      color: var(--text-primary, var(--primary-text-color, #ffffff));
      font-variant-numeric: tabular-nums;
    }
    .cs-track .grid-v {
      top: 8px;
      bottom: 22px;
    }
    .cs-photoperiod {
      position: absolute;
      top: 0;
      height: 8px;
      /* The lit stretch of the day is the Light metric, which is what plots it
         everywhere else in the card. */
      background: linear-gradient(
        to bottom,
        color-mix(in srgb, var(--metric-light, #ffc107) 22%, transparent),
        color-mix(in srgb, var(--metric-light, #ffc107) 4%, transparent)
      );
      border-bottom: 1px solid var(--cs-rule-color);
    }
    .cs-phase-bg {
      position: absolute;
      top: 8px;
      bottom: 22px;
      overflow: hidden;
    }
    .cs-phase-bg-lbl {
      position: absolute;
      top: 5px;
      left: 7px;
      font-size: var(--font-size-xs);
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-primary, var(--primary-text-color, #ffffff));
      pointer-events: none;
    }
    .cs-event {
      position: absolute;
      top: 22px;
      height: 56px;
      border-radius: var(--border-radius-xs, 4px);
      opacity: 0.9;
      cursor: default;
      transition: transform 0.15s;
    }
    .cs-event:hover {
      transform: translateY(-2px);
    }
    .cs-event.completed {
      opacity: 0.35;
    }
    .cs-event.completed::after {
      content: '';
      position: absolute;
      inset: 0;
      /* Hatched over the event's own metric-coloured fill, which is fixed whatever
         the theme — so the hatch is a literal-valued token too (ADR 0039 §1). */
      background: repeating-linear-gradient(
        45deg,
        transparent 0 3px,
        color-mix(in srgb, var(--surface-container-lowest, #101010) 18%, transparent) 3px 5px
      );
      border-radius: inherit;
    }
    .cs-now-line {
      position: absolute;
      top: 12px;
      bottom: 22px;
      width: 1px;
      background: var(--primary-text-color, #ffffff);
      box-shadow: 0 0 8px color-mix(in srgb, var(--primary-text-color, #ffffff) 50%, transparent);
      pointer-events: none;
      z-index: 8;
    }
    .cs-now-line::before {
      content: '';
      position: absolute;
      left: -3px;
      top: -3px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--primary-text-color, #ffffff);
    }

    ${reducedMotion}
  `;

  connectedCallback(): void {
    super.connectedCallback();
    if (!this._historyController) {
      this._historyController = new StoreController(this, cropSteeringHistory$);
    }
    this._fetch();
    if (!this._poller) {
      this._poller = new PollingController(this, () => this._fetch(), {
        interval: 5 * 60 * 1000,
        immediate: false,
      });
    }
  }

  updated(changed: PropertyValues): void {
    if (changed.has('device')) {
      this._fetch();
    }
  }

  private async _fetch(): Promise<void> {
    if (!this.device?.deviceId) return;
    await fetchCropSteeringHistory(this.device.deviceId).catch(() => undefined);
  }

  private _getNowMinutes(): number {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  private _getDurationMillis(range: string): number {
    if (range === '1h') return 3600000;
    if (range === '6h') return 21600000;
    if (range === '7d') return 604800000;
    return 86400000;
  }

  /**
   * Buckets every sensor backing `key` into fixed intervals across
   * `[startMs, endMs]` and averages them per bucket — produces a single
   * `TracePt[]` per category so rolling mode keeps the dialog's
   * one-line-per-metric look instead of growspace-env-chart's per-sensor breakout.
   *
   * The sensors are asked for by name rather than discovered by scanning the map
   * for a `'key:'` prefix: since #473 a multi-sensor metric is filed under bare
   * entity ids, which carry no trace of the metric they belong to.
   */
  private _buildRollingTracePts(key: string, startMs: number, endMs: number): TracePt[] {
    const entityIds = this.device ? resolveMetricEntityIds(this.device, key) : [];
    const sources = metricHistoryKeys(key, entityIds)
      .map(({ historyKey }) => historyKey)
      .filter((historyKey) => this.sensorHistory[historyKey]);
    // A metric that resolves no entity may still have been injected under its
    // own key by a view that keyed its histories itself (the subarea card).
    if (!sources.length && this.sensorHistory[key]) sources.push(key);
    if (!sources.length) return [];

    const bucketCount = 120;
    const bucketMs = (endMs - startMs) / bucketCount;
    if (bucketMs <= 0) return [];

    const sums = new Array<number>(bucketCount).fill(0);
    const counts = new Array<number>(bucketCount).fill(0);

    for (const source of sources) {
      for (const h of this.sensorHistory[source] ?? []) {
        const t = Date.parse(h.last_changed);
        if (Number.isNaN(t) || t < startMs || t > endMs) continue;
        const val = ChartUtils.normalizeSensorValue(h, key);
        if (val === undefined) continue;
        let idx = Math.floor((t - startMs) / bucketMs);
        if (idx >= bucketCount) idx = bucketCount - 1;
        sums[idx] += val;
        counts[idx] += 1;
      }
    }

    const pts: TracePt[] = [];
    for (let i = 0; i < bucketCount; i++) {
      if (counts[i] === 0) continue;
      const bucketCenterMs = startMs + (i + 0.5) * bucketMs;
      pts.push({ offset: (bucketCenterMs - startMs) / 60000, v: sums[i] / counts[i] });
    }
    return pts;
  }

  /**
   * The measured Substrate VWC series as absolutely-timestamped samples, for the
   * P1→P2 crossing. Reads the crop-steering history in both windowing modes: it
   * is fetched either way, it is the same series the backend's phase machine
   * watched, and its timestamps are absolute, so the crossing does not depend on
   * which axis the chart happens to be drawing.
   */
  private _vwcSamples(history: CropSteeringHistory | undefined): VwcSample[] {
    const samples: VwcSample[] = [];
    for (const b of history?.soil_moisture ?? []) {
      if (b.value == null) continue;
      const atMs = Date.parse(b.timestamp);
      if (Number.isNaN(atMs)) continue;
      samples.push({ atMs, vwc: b.value });
    }
    return samples;
  }

  /**
   * Re-anchors the Phase Strip to the rolling now-24h→now axis, covering up to two
   * photoperiod cycles. The cycle containing "now" gets live phase adjustment
   * (activeSteeringPhase/phaseChangedAt and the measured P1→P2 crossing); the other
   * cycle uses the scheduled template (irrigationConfig=null, no crossing) so live
   * adjustment of the current cycle doesn't leak backward.
   */
  private _buildRollingPhaseSegments(
    strategy: Parameters<typeof computePhases>[0],
    dayHours: number,
    irrigationConfig: Parameters<typeof computePhases>[2],
    saturationReachedAt: number | null,
    lightsOnMin: number,
    lightsOffMin: number,
    viewStart: number,
    windowStart: number,
    windowEnd: number,
    nowMs: number
  ): Array<{ leftPct: number; widthPct: number; dark: boolean; phase?: CropSteeringPhase }> {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const now = new Date(nowMs);
    const todayMidnightMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayCycleStartMs = todayMidnightMs + viewStart * 60000;

    const raw: Array<{ startMs: number; endMs: number; dark: boolean; phase?: CropSteeringPhase }> =
      [];

    for (const dayOffset of [-1, 0, 1]) {
      const cycleStartMs = todayCycleStartMs + dayOffset * DAY_MS;
      const cycleEndMs = cycleStartMs + DAY_MS;
      if (cycleEndMs <= windowStart || cycleStartMs >= windowEnd) continue;

      const containsNow = nowMs >= cycleStartMs && nowMs < cycleEndMs;
      const cyclePhases = computePhases(
        strategy,
        dayHours,
        containsNow ? irrigationConfig : null,
        containsNow ? saturationReachedAt : null
      );
      if (!cyclePhases) continue;

      const atMin = (m: number) => cycleStartMs + ((m - viewStart + 1440) % 1440) * 60000;

      raw.push({ startMs: cycleStartMs, endMs: atMin(lightsOnMin), dark: true });
      for (const p of cyclePhases.phases) {
        raw.push({ startMs: atMin(p.start), endMs: atMin(p.end), dark: false, phase: p });
      }
      raw.push({ startMs: atMin(lightsOffMin), endMs: cycleEndMs, dark: true });
    }

    const windowMs = windowEnd - windowStart;
    return raw
      .map((s) => {
        const clampedStart = Math.max(s.startMs, windowStart);
        const clampedEnd = Math.min(s.endMs, windowEnd);
        return {
          leftPct: ((clampedStart - windowStart) / windowMs) * 100,
          widthPct: ((clampedEnd - clampedStart) / windowMs) * 100,
          dark: s.dark,
          phase: s.phase,
        };
      })
      .filter((s) => s.widthPct > 0);
  }

  private _onCsModelPointerLeave = () => {
    if (this._csModelRafId) cancelAnimationFrame(this._csModelRafId);
    this._csModelRafId = null;
    this._csModelTooltip = null;
  };

  private _onCsModelPointerMove(
    e: PointerEvent,
    ctx: {
      vwcPts: TracePt[];
      poreEcPts: TracePt[] | null;
      bulkEcPts: TracePt[] | null;
      projection: Array<{ offset: number; vwc: number; pore: number; bulk: number }>;
      nowOffset: number;
      day: number;
      anchorMs: number;
    }
  ) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clientX = e.clientX;
    if (this._csModelRafId) cancelAnimationFrame(this._csModelRafId);
    this._csModelRafId = requestAnimationFrame(() => {
      this._handleCsModelHover(clientX, rect, ctx);
      this._csModelRafId = null;
    });
  }

  private _handleCsModelHover(
    clientX: number,
    rect: DOMRect,
    ctx: {
      vwcPts: TracePt[];
      poreEcPts: TracePt[] | null;
      bulkEcPts: TracePt[] | null;
      projection: Array<{ offset: number; vwc: number; pore: number; bulk: number }>;
      nowOffset: number;
      day: number;
      anchorMs: number;
    }
  ) {
    const relX =
      rect.width > 0 ? Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) : 0.5;
    const offsetMinutes = ((relX * 1000 - 6) / 988) * ctx.day;
    const xPct = relX * 100;
    const projected = offsetMinutes > ctx.nowOffset;

    const ts = new Date(ctx.anchorMs + offsetMinutes * 60000);
    const time = ts.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    const closestPt = <T extends { offset: number }>(pts: T[], off: number): T | null => {
      if (!pts.length) return null;
      let lo = 0;
      let hi = pts.length - 1;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (pts[mid].offset < off) lo = mid + 1;
        else hi = mid;
      }
      if (lo > 0 && Math.abs(pts[lo - 1].offset - off) < Math.abs(pts[lo].offset - off)) lo--;
      return pts[lo];
    };

    const vwcColor = METRIC_CONFIG[MetricKey.SOIL_MOISTURE].color;
    const poreEcColor = METRIC_CONFIG[MetricKey.PORE_EC].color;
    const bulkEcColor = METRIC_CONFIG[MetricKey.BULK_EC].color;

    const items: Array<{ title: string; value: string; color: string }> = [];

    if (projected) {
      const pt = closestPt(ctx.projection, offsetMinutes);
      items.push({ title: 'VWC', value: pt ? `${pt.vwc.toFixed(1)}%` : '—', color: vwcColor });
      if (ctx.poreEcPts !== null)
        items.push({
          title: 'Pore EC',
          value: pt ? `${pt.pore.toFixed(2)} mS/cm` : '—',
          color: poreEcColor,
        });
      if (ctx.bulkEcPts !== null)
        items.push({
          title: 'Bulk EC',
          value: pt ? `${pt.bulk.toFixed(2)} mS/cm` : '—',
          color: bulkEcColor,
        });
    } else {
      const vwcPt = closestPt(ctx.vwcPts, offsetMinutes);
      items.push({ title: 'VWC', value: vwcPt ? `${vwcPt.v.toFixed(1)}%` : '—', color: vwcColor });
      if (ctx.poreEcPts !== null) {
        const porePt = closestPt(ctx.poreEcPts, offsetMinutes);
        items.push({
          title: 'Pore EC',
          value: porePt ? `${porePt.v.toFixed(2)} mS/cm` : '—',
          color: poreEcColor,
        });
      }
      if (ctx.bulkEcPts !== null) {
        const bulkPt = closestPt(ctx.bulkEcPts, offsetMinutes);
        items.push({
          title: 'Bulk EC',
          value: bulkPt ? `${bulkPt.v.toFixed(2)} mS/cm` : '—',
          color: bulkEcColor,
        });
      }
    }

    this._csModelTooltip = { xPct, time, projected, items };
  }

  private _renderCsModelTooltip() {
    if (!this._csModelTooltip) return nothing;
    const { xPct, time, projected, items } = this._csModelTooltip;
    const flip = xPct > 60;
    return html`
      <div class="cs-model-cursor" style=${styleMap({ left: `${xPct}%` })}></div>
      <div
        class="cs-model-tooltip"
        style=${styleMap({
          left: `${xPct}%`,
          transform: flip ? 'translateX(-100%) translateX(-8px)' : 'translateX(8px)',
        })}
      >
        <div class="cs-model-tooltip-time">${time}${projected ? ' · Projected' : ''}</div>
        ${items.map(
          (item) => html`
            <div class="cs-model-tooltip-row">
              <span><i style="background:${item.color};"></i>${item.title}:</span>
              <span>${item.value}</span>
            </div>
          `
        )}
      </div>
    `;
  }

  render(): TemplateResult {
    const strategy = this.device?.irrigationStrategy;
    if (!strategy?.enabled) {
      return html`<div class="placeholder">No strategy configured.</div>`;
    }

    const dayHours = this.device?.irrigationConfig?.resolvedDayHours ?? 12;
    const shots: CropSteeringShot[] = computeCropSteeringCycle(strategy, dayHours);

    const growspaceId = this.device?.deviceId ?? '';
    const history = this._historyController?.value?.get(growspaceId);

    // The P1→P2 boundary is threshold-driven, so it comes from the measured VWC
    // series rather than the strategy — read off the cycle whose lights-on the
    // history itself reports.
    const saturationReachedAt = resolveSaturationCrossing(
      strategy,
      dayHours,
      this._vwcSamples(history),
      Date.now(),
      history ? Date.parse(history.lights_on) : null
    );

    const phases = computePhases(
      strategy,
      dayHours,
      this.device?.irrigationConfig,
      saturationReachedAt
    );

    if (!phases) {
      return html`<div class="placeholder">
        No strategy configured — set Lights On Time in the Steering tab.
      </div>`;
    }

    const { lightsOnMin, lightsOffMin } = phases;
    const nowMinutes = this._getNowMinutes();
    const nowMs = Date.now();

    const durationMs = this._getDurationMillis(this.range);
    const day = this.rollingWindow ? durationMs / 60000 : 1440;
    const viewStart = (lightsOnMin - 120 + 1440) % 1440;
    const pctAt = (m: number) => ((((m % 1440) - viewStart + 1440) % 1440) / 1440) * 100;

    const target = strategy.targetVwcPercent ?? 45;
    const dryback = strategy.maintenanceDrybackPercent ?? 3;
    const p2Trigger = target - dryback;

    const vwcColor = METRIC_CONFIG[MetricKey.SOIL_MOISTURE].color;
    const poreEcColor = METRIC_CONFIG[MetricKey.PORE_EC].color;
    const bulkEcColor = METRIC_CONFIG[MetricKey.BULK_EC].color;

    const svgW = 1000;
    const svgH = 300;
    const padL = 6;
    const padR = 6;
    const padT = 28;
    const padB = 26;
    const iW = svgW - padL - padR;
    const iH = svgH - padT - padB;
    const xAt = (offset: number) => padL + (offset / day) * iW;

    const nowOffset = this.rollingWindow ? day : (nowMinutes - viewStart + 1440) % 1440;
    const nowX = xAt(nowOffset).toFixed(1);

    const buildTracePts = (
      buckets: Array<{ timestamp: string; value: number | null }> | undefined,
      anchorMs: number
    ): TracePt[] => {
      if (!buckets?.length) return [];
      const pts: TracePt[] = [];
      for (const b of buckets) {
        if (b.value == null || isNaN(b.value)) continue;
        pts.push({ offset: (Date.parse(b.timestamp) - anchorMs) / 60000, v: b.value });
      }
      return pts;
    };

    const buildPath = (pts: TracePt[], yFn: (v: number) => number): string =>
      pts
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(p.offset).toFixed(1)},${yFn(p.v).toFixed(1)}`)
        .join(' ');

    const lightsOnMs = history ? Date.parse(history.lights_on) : 0;
    const anchorMs = this.rollingWindow ? nowMs - durationMs : lightsOnMs - 2 * 60 * 60 * 1000;

    const vwcPts = this.rollingWindow
      ? this._buildRollingTracePts(MetricKey.SOIL_MOISTURE, anchorMs, nowMs)
      : buildTracePts(history?.soil_moisture, anchorMs);

    const hasRollingSensor = (key: string) =>
      Object.keys(this.sensorHistory).some((k) => k === key || k.startsWith(`${key}:`));

    const poreEcPts = this.rollingWindow
      ? hasRollingSensor(MetricKey.PORE_EC)
        ? this._buildRollingTracePts(MetricKey.PORE_EC, anchorMs, nowMs)
        : null
      : history?.pore_ec !== undefined
        ? buildTracePts(history.pore_ec, anchorMs)
        : null;
    const bulkEcPts = this.rollingWindow
      ? hasRollingSensor(MetricKey.BULK_EC)
        ? this._buildRollingTracePts(MetricKey.BULK_EC, anchorMs, nowMs)
        : null
      : history?.bulk_ec !== undefined
        ? buildTracePts(history.bulk_ec, anchorMs)
        : null;

    const ecTargetRange = (this.device?.irrigationConfig?.ecTargetRanges ?? []).find(
      (r) => r.stage === this.device?.biologicalMetrics?.granularStage
    );
    const ecTargetRaw = ecTargetRange ? (ecTargetRange.minEc + ecTargetRange.maxEc) / 2 : null;
    // A stage the user never configured still yields a range, as {min: 0, max: 0}. A 0 mS/cm
    // target is not a real setpoint, so treat it as absent rather than anchoring the axis on it.
    const ecTargetMid = ecTargetRaw !== null && ecTargetRaw > 0 ? ecTargetRaw : null;

    const lastKnown = (pts: TracePt[]): number | null =>
      pts.length ? pts[pts.length - 1].v : null;
    const seedVwc = lastKnown(vwcPts) ?? target;
    const seedPore = lastKnown(poreEcPts ?? []) ?? ecTargetMid ?? 3;
    // The projection is drawn through the same scales as the history, so it has to be known
    // before the axis domains are fixed — otherwise projected peaks clamp against the ceiling.
    const projection = generateSubstrateProjection(
      nowOffset,
      shots,
      phases,
      seedVwc,
      seedPore,
      viewStart,
      target
    );

    const vwcAxisPad = 5;
    let vwcAxisLo = Math.min(target, p2Trigger);
    let vwcAxisHi = Math.max(target, p2Trigger);
    for (const v of [...vwcPts.map((p) => p.v), ...projection.map((p) => p.vwc)]) {
      vwcAxisLo = Math.min(vwcAxisLo, v);
      vwcAxisHi = Math.max(vwcAxisHi, v);
    }
    vwcAxisLo = Math.max(0, vwcAxisLo - vwcAxisPad);
    vwcAxisHi = vwcAxisHi + vwcAxisPad;
    const yAtVwc = (v: number) =>
      padT + iH - Math.max(0, Math.min(1, (v - vwcAxisLo) / (vwcAxisHi - vwcAxisLo))) * iH;

    const ecValsForAxis: number[] = [];
    for (const pts of [poreEcPts, bulkEcPts]) {
      if (!pts) continue;
      for (const p of pts) if (p) ecValsForAxis.push(p.v);
    }
    for (const p of projection) ecValsForAxis.push(p.pore, p.bulk);
    let ecAxisLo: number;
    let ecAxisHi: number;
    if (ecValsForAxis.length > 0) {
      // Union of the data and the target band — anchoring on the target alone flattened
      // real readings against an axis edge whenever the two disagreed.
      let dataMin = Math.min(...ecValsForAxis);
      let dataMax = Math.max(...ecValsForAxis);
      if (ecTargetMid !== null) {
        dataMin = Math.min(dataMin, ecTargetMid);
        dataMax = Math.max(dataMax, ecTargetMid);
      }
      const pad = Math.max(0.3, (dataMax - dataMin) * 0.15);
      ecAxisLo = Math.max(0, dataMin - pad);
      ecAxisHi = dataMax + pad;
    } else if (ecTargetMid !== null) {
      ecAxisLo = Math.max(0, ecTargetMid - 2);
      ecAxisHi = ecTargetMid + 2;
    } else {
      ecAxisLo = 1;
      ecAxisHi = 5;
    }
    const yAtEc = (v: number) =>
      padT + iH - Math.max(0, Math.min(1, (v - ecAxisLo) / (ecAxisHi - ecAxisLo))) * iH;

    // The two scales are overlaid on one plot, so they share gridlines and each labels
    // the same fractions in its own units — VWC down the left edge, EC down the right.
    const tickFractions = [0, 0.25, 0.5, 0.75, 1];
    const ticks = tickFractions.map((f) => ({
      y: padT + iH - f * iH,
      vwc: `${(vwcAxisLo + f * (vwcAxisHi - vwcAxisLo)).toFixed(0)}%`,
      ec: (ecAxisLo + f * (ecAxisHi - ecAxisLo)).toFixed(1),
    }));

    const vwcPath = buildPath(vwcPts, yAtVwc);
    const porePath = poreEcPts ? buildPath(poreEcPts, yAtEc) : '';
    const bulkPath = bulkEcPts ? buildPath(bulkEcPts, yAtEc) : '';

    const targetY = yAtVwc(target);
    const p2TriggerY = yAtVwc(p2Trigger);
    const ecTargetY = ecTargetMid !== null ? yAtEc(ecTargetMid) : 0;

    const projVwcSeg = projection
      .map(
        (p, i) => `${i === 0 ? 'M' : 'L'}${xAt(p.offset).toFixed(1)},${yAtVwc(p.vwc).toFixed(1)}`
      )
      .join(' ');
    const projPoreSeg = projection
      .map(
        (p, i) => `${i === 0 ? 'M' : 'L'}${xAt(p.offset).toFixed(1)},${yAtEc(p.pore).toFixed(1)}`
      )
      .join(' ');
    const projBulkSeg = projection
      .map(
        (p, i) => `${i === 0 ? 'M' : 'L'}${xAt(p.offset).toFixed(1)},${yAtEc(p.bulk).toFixed(1)}`
      )
      .join(' ');

    const lastHistory = vwcPts.length ? vwcPts[vwcPts.length - 1] : null;
    const cur = lastHistory ?? { offset: nowOffset, v: seedVwc };
    const curPore = lastKnown(poreEcPts ?? []) ?? seedPore;
    const curBulk = lastKnown(bulkEcPts ?? []) ?? Math.max(0.8, curPore * (cur.v / 100) * 1.32);

    const summarizeTrace = (
      name: string,
      unit: string,
      points: TracePt[] | null,
      decimals = 1
    ): AccessibleChartSeries[] => {
      if (!points?.length) return [];
      const values = points.map((point) => point.v);
      return [
        {
          name,
          min: Math.min(...values),
          max: Math.max(...values),
          average: values.reduce((total, value) => total + value, 0) / values.length,
          current: formatMeasurement(values[values.length - 1], unit, decimals),
          unit,
          decimals,
        },
      ];
    };
    const accessibleSummary = accessibleChartSummary('Crop steering substrate model', this.range, [
      ...summarizeTrace('VWC', '%', vwcPts),
      ...summarizeTrace('Pore EC', 'mS/cm', poreEcPts, 2),
      ...summarizeTrace('Bulk EC', 'mS/cm', bulkEcPts, 2),
    ]);

    const showPhaseStrip = !this.rollingWindow || this.range === '24h';
    const rollingPhaseSegments =
      this.rollingWindow && this.range === '24h'
        ? this._buildRollingPhaseSegments(
            strategy,
            dayHours,
            this.device?.irrigationConfig,
            saturationReachedAt,
            lightsOnMin,
            lightsOffMin,
            viewStart,
            anchorMs,
            nowMs,
            nowMs
          )
        : [];

    // A phase that has not begun is a zero-width window (P2 before the Saturation
    // Target is reached). It keeps its legend chip, but drawing it would paint a
    // padding-wide sliver of label over the phase beside it.
    const drawnPhases = phases.phases.filter((p) => p.end > p.start);

    return html`
      ${showPhaseStrip
        ? html`
            <div class="cs-phase-strip">
              ${this.rollingWindow
                ? rollingPhaseSegments.map((s) =>
                    s.dark
                      ? html`
                          <div
                            class="cs-phase-block dark"
                            style="left:${s.leftPct}%;width:${s.widthPct}%;"
                          >
                            <div class="cs-phase-num">Dark</div>
                          </div>
                        `
                      : html`
                          <div
                            class="cs-phase-block"
                            style="left:${s.leftPct}%;width:${s.widthPct}%;background:${s.phase!
                              .color}22;border-left:1px solid var(--cs-rule-color);"
                          >
                            <div class="cs-phase-num">
                              ${s.phase!.label} <span class="cs-phase-nm">· ${s.phase!.name}</span>
                            </div>
                            <div class="cs-phase-meta">
                              ${fmtMinuteOfDay(s.phase!.start)}–${fmtMinuteOfDay(s.phase!.end)} ·
                              ${s.phase!.target}
                            </div>
                          </div>
                        `
                  )
                : html`
                    <div class="cs-phase-block dark" style="left:0%;width:${pctAt(lightsOnMin)}%;">
                      <div class="cs-phase-num">Dark</div>
                      <div class="cs-phase-meta">
                        ${fmtMinuteOfDay(viewStart)}–${fmtMinuteOfDay(lightsOnMin)} · no irrigation
                      </div>
                    </div>
                    ${drawnPhases.map(
                      (p) => html`
                        <div
                          class="cs-phase-block"
                          style="left:${pctAt(p.start)}%;width:${((p.end - p.start) / day) *
                          100}%;background:${p.color}22;border-left:1px solid var(--cs-rule-color);"
                        >
                          <div class="cs-phase-num">
                            ${p.label} <span class="cs-phase-nm">· ${p.name}</span>
                          </div>
                          <div class="cs-phase-meta">
                            ${fmtMinuteOfDay(p.start)}–${fmtMinuteOfDay(p.end)} · ${p.target}
                          </div>
                        </div>
                      `
                    )}
                    <div
                      class="cs-phase-block dark"
                      style="left:${pctAt(lightsOffMin)}%;width:${100 - pctAt(lightsOffMin)}%;"
                    >
                      <div class="cs-phase-num">Dark</div>
                      <div class="cs-phase-meta">
                        ${fmtMinuteOfDay(lightsOffMin)}–${fmtMinuteOfDay(viewStart)}
                      </div>
                    </div>
                  `}
            </div>
          `
        : nothing}
      ${!this.hideShotTrack
        ? html`
            <div class="cs-track">
              <div
                class="cs-photoperiod"
                style="left:${pctAt(lightsOnMin)}%;width:${((lightsOffMin - lightsOnMin) / day) *
                100}%;"
              ></div>

              ${drawnPhases.map(
                (p) => html`
                  <div
                    class="cs-phase-bg"
                    style="left:${pctAt(p.start)}%;width:${((p.end - p.start) / day) *
                    100}%;background:${p.color}1a;border-left:1px dashed var(--cs-rule-color);"
                  >
                    <span class="cs-phase-bg-lbl">${p.label}</span>
                  </div>
                `
              )}
              ${Array.from({ length: 24 }, (_, h) => h).map(
                (h) => html`
                  <div
                    class="grid-v ${h % 6 === 0 ? 'major' : ''}"
                    style="left:${pctAt(h * 60)}%;"
                  ></div>
                  ${h % 3 === 0
                    ? html`
                        <span class="x-label" style="left:${pctAt(h * 60)}%;"
                          >${h.toString().padStart(2, '0')}:00</span
                        >
                      `
                    : nothing}
                `
              )}
              ${shots.map((shot) => {
                const [shh, smm] = shot.time.split(':').map(Number);
                const startMin = shh * 60 + smm;
                const leftPct = pctAt(startMin);
                const widthPct = (shot.duration / 86400) * 100;
                const isPast = startMin < nowMinutes;
                const shotColor = METRIC_CONFIG[MetricKey.IRRIGATION].color;
                return html`
                  <div
                    class="cs-event ${isPast ? 'completed' : ''}"
                    style="left:${leftPct}%;width:max(${widthPct}%,4px);background:${shotColor};box-shadow:0 0 0 1px ${shotColor}99,0 2px 4px ${shotColor}55;"
                    title="${shot.time.substring(0, 5)} · ${shot.duration}s"
                  ></div>
                `;
              })}
              ${!this.rollingWindow
                ? html`<div class="cs-now-line" style="left:${pctAt(nowMinutes)}%;"></div>`
                : nothing}
            </div>
          `
        : nothing}

      <div
        class="cs-model"
        @pointermove=${(e: PointerEvent) =>
          this._onCsModelPointerMove(e, {
            vwcPts,
            poreEcPts,
            bulkEcPts,
            projection,
            nowOffset,
            day,
            anchorMs,
          })}
        @pointerleave=${this._onCsModelPointerLeave}
        @pointercancel=${this._onCsModelPointerLeave}
      >
        ${this._renderCsModelTooltip()}
        <span class="cm-title">Substrate model · live + projected</span>
        <div class="cm-readout">
          <span><i style="background:${vwcColor};"></i>VWC <b>${cur.v.toFixed(1)}%</b></span>
          ${poreEcPts !== null
            ? html`<span
                ><i style="background:${poreEcColor};"></i>Pore <b>${curPore.toFixed(1)}</b></span
              >`
            : nothing}
          ${bulkEcPts !== null
            ? html`<span
                ><i style="background:${bulkEcColor};"></i>Bulk <b>${curBulk.toFixed(1)}</b></span
              >`
            : nothing}
        </div>

        <svg
          viewBox="0 0 ${svgW} ${svgH}"
          preserveAspectRatio="none"
          style="width:100%;height:100%;display:block;"
          role="img"
          aria-label=${accessibleSummary}
        >
          <defs>
            <linearGradient id="vwcModelArea-${growspaceId}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${vwcColor}33" />
              <stop offset="100%" stop-color="${vwcColor}00" />
            </linearGradient>
          </defs>

          <!-- horizontal gridlines at VWC ticks -->
          ${tickFractions.map(
            (f) => svg`
              <line
                x1="${xAt(0)}" x2="${xAt(day)}"
                y1="${(padT + iH - f * iH).toFixed(1)}" y2="${(padT + iH - f * iH).toFixed(1)}"
                stroke="var(--cs-rule-color)"
              />
            `
          )}
          <!-- vertical gridlines -->
          ${(this.rollingWindow
            ? [0, 0.25, 0.5, 0.75, 1].map((f) => f * day)
            : [0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => h * 60)
          ).map(
            (offset) => svg`
              <line
                x1="${xAt(offset)}" x2="${xAt(offset)}"
                y1="${padT}" y2="${padT + iH}"
                stroke="var(--cs-rule-color)"
              />
            `
          )}

          <!-- The guide marks. The pane is a fixed viewBox stretched with
               preserveAspectRatio="none", so every dashed mark holds its stroke
               off the transform — a scaled dash reads at a different rhythm from
               the trace beside it. -->
          <!-- Saturation Target [[Setpoint]] (VWC scale) -->
          <line
            data-guide-id="saturation-target"
            data-guide-kind="setpoint"
            x1="${xAt(0)}"
            x2="${xAt(day)}"
            y1="${targetY.toFixed(1)}"
            y2="${targetY.toFixed(1)}"
            stroke="${vwcColor}"
            stroke-opacity="0.6"
            stroke-dasharray="6 4"
            vector-effect="non-scaling-stroke"
          />
          <!-- P2 trigger [[Setpoint]] (VWC scale). Both marks here are values the
               controller acts on, so under ADR 0048 they carry one kind. -->
          <line
            data-guide-id="p2-trigger"
            data-guide-kind="setpoint"
            x1="${xAt(0)}"
            x2="${xAt(day)}"
            y1="${p2TriggerY.toFixed(1)}"
            y2="${p2TriggerY.toFixed(1)}"
            stroke="${PHASE_P2}"
            stroke-opacity="0.6"
            stroke-dasharray="6 4"
            vector-effect="non-scaling-stroke"
          />
          ${ecTargetMid !== null
            ? svg`
                <line
                  data-guide-id="pore-ec-target" data-guide-kind="setpoint"
                  x1="${xAt(0)}" x2="${xAt(day)}"
                  y1="${yAtEc(ecTargetMid).toFixed(1)}" y2="${yAtEc(ecTargetMid).toFixed(1)}"
                  stroke="${poreEcColor}" stroke-opacity="0.6" stroke-dasharray="6 4"
                  vector-effect="non-scaling-stroke"
                />
              `
            : nothing}

          <!-- VWC history area -->
          ${vwcPts.length
            ? svg`
                <path
                  d="${vwcPath} L${xAt(nowOffset).toFixed(1)},${(padT + iH).toFixed(1)} L${xAt(0).toFixed(1)},${(padT + iH).toFixed(1)} Z"
                  fill="url(#vwcModelArea-${growspaceId})"
                />
              `
            : nothing}

          <!-- history (solid) -->
          ${bulkPath
            ? svg`<path d="${bulkPath}" fill="none" stroke="${bulkEcColor}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" />`
            : nothing}
          ${porePath
            ? svg`<path d="${porePath}" fill="none" stroke="${poreEcColor}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" />`
            : nothing}
          ${vwcPath
            ? svg`<path d="${vwcPath}" fill="none" stroke="${vwcColor}" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round" />`
            : nothing}

          <!-- projection (dashed, faded) -->
          ${bulkEcPts !== null
            ? svg`<path d="${projBulkSeg}" fill="none" stroke="${bulkEcColor}" stroke-width="1.4" stroke-dasharray="4 4" stroke-opacity="0.4" />`
            : nothing}
          ${poreEcPts !== null
            ? svg`<path d="${projPoreSeg}" fill="none" stroke="${poreEcColor}" stroke-width="1.4" stroke-dasharray="4 4" stroke-opacity="0.4" />`
            : nothing}
          <path
            d="${projVwcSeg}"
            fill="none"
            stroke="${vwcColor}"
            stroke-width="1.7"
            stroke-dasharray="4 4"
            stroke-opacity="0.5"
          />

          <!-- now divider -->
          ${!this.rollingWindow
            ? svg`
                <line
                  x1="${nowX}" x2="${nowX}"
                  y1="${(padT - 6).toFixed(1)}" y2="${(padT + iH).toFixed(1)}"
                  stroke="var(--primary-text-color, #ffffff)" stroke-dasharray="3 3"
                />
              `
            : nothing}

          <!-- Current-value dots. The halo is the pane's own ground, so it lifts the
               dot off the traces under it on a light theme as well as a dark one. -->
          ${bulkEcPts !== null
            ? svg`<circle class="cm-now-dot" cx="${nowX}" cy="${yAtEc(curBulk).toFixed(1)}" r="3" fill="${bulkEcColor}" stroke="${PANE_GROUND}" stroke-width="1.5" />`
            : nothing}
          ${poreEcPts !== null
            ? svg`<circle class="cm-now-dot" cx="${nowX}" cy="${yAtEc(curPore).toFixed(1)}" r="3" fill="${poreEcColor}" stroke="${PANE_GROUND}" stroke-width="1.5" />`
            : nothing}
          <circle
            class="cm-now-dot"
            cx="${nowX}"
            cy="${yAtVwc(cur.v).toFixed(1)}"
            r="3.4"
            fill="${vwcColor}"
            stroke="${PANE_GROUND}"
            stroke-width="1.5"
          />
        </svg>

        ${this.rollingWindow
          ? html`
              <span class="cm-axis-cap left" style="bottom:16px;">-${this.range}</span>
              <span class="cm-axis-cap right" style="bottom:16px;">Now</span>
            `
          : nothing}
        <span class="cm-axis-cap left">VWC %</span>
        <span class="cm-axis-cap right">mS/cm</span>

        <!-- The bottom tick would sit on top of the axis caps, so it is left unlabelled. -->
        ${ticks.slice(1).map(
          (t) => html`
            <span class="cm-tick left" style="top:${((t.y / svgH) * 100).toFixed(3)}%;"
              >${t.vwc}</span
            >
            <span class="cm-tick right" style="top:${((t.y / svgH) * 100).toFixed(3)}%;"
              >${t.ec}</span
            >
          `
        )}

        <span class="gs-guide-label" style="top:${((targetY / svgH) * 100).toFixed(3)}%;"
          >Target ${target.toFixed(0)}%</span
        >
        <span class="gs-guide-label" style="top:${((p2TriggerY / svgH) * 100).toFixed(3)}%;"
          >P2 trigger ${p2Trigger.toFixed(0)}%</span
        >
        ${ecTargetMid !== null
          ? html`<span
              class="gs-guide-label right"
              style="top:${((ecTargetY / svgH) * 100).toFixed(3)}%;"
              >Pore EC target ${ecTargetMid.toFixed(1)}</span
            >`
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'crop-steering-day-chart': CropSteeringDayChart;
  }
}
