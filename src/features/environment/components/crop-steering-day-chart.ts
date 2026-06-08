import { LitElement, html, svg, css, type TemplateResult, type PropertyValues, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { StoreController } from '@nanostores/lit';
import type { GrowspaceDevice } from '../../../services/types';
import { cropSteeringHistory$, fetchCropSteeringHistory } from '../../../slices/irrigation';
import type { CropSteeringHistory } from '../../../schemas/api-schema';
import { PollingController } from '../../shared/controllers/polling.controller';
import { METRIC_CONFIG, MetricKey } from '../constants';
import {
  computeCropSteeringCycle,
  computePhases,
  fmtMinuteOfDay,
  generateSubstrateProjection,
  type CropSteeringShot,
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
@customElement('crop-steering-day-chart')
export class CropSteeringDayChart extends LitElement {
  @property({ attribute: false }) device: GrowspaceDevice | undefined;
  @property({ type: Boolean }) hideShotTrack = false;

  @state() private _csModelTooltip: CsModelTooltip | null = null;

  private _historyController?: StoreController<Map<string, CropSteeringHistory>>;
  private _poller?: PollingController;
  private _csModelRafId: number | null = null;

  static styles = css`
    :host {
      display: block;
    }
    .cs-model {
      position: relative;
      height: 200px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      background: rgba(0, 0, 0, 0.2);
      overflow: hidden;
      cursor: crosshair;
    }
    .cs-model-cursor {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 1px;
      background: rgba(255, 255, 255, 0.25);
      pointer-events: none;
      z-index: 5;
    }
    .cs-model-tooltip {
      position: absolute;
      top: 24px;
      z-index: 6;
      background: rgba(20, 20, 20, 0.9);
      backdrop-filter: blur(6px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      padding: 6px 8px;
      pointer-events: none;
      font-size: 10.5px;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }
    .cs-model-tooltip-time {
      font-weight: 600;
      margin-bottom: 4px;
      color: rgba(255, 255, 255, 0.7);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 3px;
    }
    .cs-model-tooltip-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-top: 2px;
      font-family: monospace;
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
      font-size: 9.5px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: rgba(255, 255, 255, 0.4);
    }
    .cm-readout {
      position: absolute;
      top: 5px;
      right: 10px;
      z-index: 2;
      display: flex;
      gap: 12px;
      font-size: 10.5px;
      color: rgba(255, 255, 255, 0.6);
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
      color: rgba(255, 255, 255, 0.9);
      font-weight: 600;
    }
    .cm-axis-cap {
      position: absolute;
      bottom: 3px;
      z-index: 2;
      font-size: 9px;
      font-weight: 500;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.3);
    }
    .cm-axis-cap.left {
      left: 7px;
    }
    .cm-axis-cap.right {
      right: 7px;
    }
    .cm-target {
      position: absolute;
      right: 8px;
      z-index: 2;
      transform: translateY(-50%);
      font-size: 9.5px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.02em;
      white-space: nowrap;
      opacity: 0.95;
      text-shadow:
        0 1px 4px rgba(0, 0, 0, 0.95),
        0 0 4px rgba(0, 0, 0, 0.8);
      pointer-events: none;
    }
    .cm-target.left {
      left: 8px;
      right: auto;
    }
    .placeholder {
      padding: 32px;
      text-align: center;
      color: var(--secondary-text-color, #666);
      font-size: 13px;
    }
    .cs-phase-strip {
      position: relative;
      height: 52px;
      margin-bottom: 10px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      background: rgba(0, 0, 0, 0.2);
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
    .cs-phase-block.dark {
      background: rgba(0, 0, 0, 0.35);
      border-left: 1px solid rgba(255, 255, 255, 0.06);
    }
    .cs-phase-num {
      font-size: 9.5px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .cs-phase-nm {
      font-size: 11px;
      font-weight: 500;
      text-transform: none;
      letter-spacing: 0;
      color: rgba(255, 255, 255, 0.85);
    }
    .cs-phase-meta {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.4);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cs-track {
      position: relative;
      height: 108px;
      margin-bottom: 10px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      background: rgba(0, 0, 0, 0.2);
      overflow: hidden;
    }
    .grid-v {
      position: absolute;
      top: 0;
      bottom: 18px;
      width: 1px;
      background: rgba(255, 255, 255, 0.04);
      pointer-events: none;
    }
    .grid-v.major {
      background: rgba(255, 255, 255, 0.09);
    }
    .x-label {
      position: absolute;
      bottom: 4px;
      transform: translateX(-50%);
      font-size: 10px;
      color: rgba(255, 255, 255, 0.35);
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
      background: linear-gradient(to bottom, rgba(255, 235, 59, 0.22), rgba(255, 235, 59, 0.04));
      border-bottom: 1px solid rgba(255, 235, 59, 0.4);
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
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.7;
      pointer-events: none;
    }
    .cs-event {
      position: absolute;
      top: 22px;
      height: 56px;
      border-radius: 3px;
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
      background: repeating-linear-gradient(
        45deg,
        transparent 0 3px,
        rgba(0, 0, 0, 0.18) 3px 5px
      );
      border-radius: inherit;
    }
    .cs-now-line {
      position: absolute;
      top: 12px;
      bottom: 22px;
      width: 1px;
      background: #ff9800;
      box-shadow: 0 0 8px rgba(255, 152, 0, 0.5);
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
      background: #ff9800;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    if (!this._historyController) {
      this._historyController = new StoreController(this, cropSteeringHistory$);
    }
    this._fetch();
    if (!this._poller) {
      this._poller = new PollingController(
        this,
        () => this._fetch(),
        { interval: 5 * 60 * 1000, immediate: false },
      );
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

  private _onCsModelMouseLeave = () => {
    if (this._csModelRafId) cancelAnimationFrame(this._csModelRafId);
    this._csModelRafId = null;
    this._csModelTooltip = null;
  };

  private _onCsModelMouseMove(
    e: MouseEvent,
    ctx: {
      vwcPts: TracePt[];
      poreEcPts: TracePt[] | null;
      bulkEcPts: TracePt[] | null;
      projection: Array<{ offset: number; vwc: number; pore: number; bulk: number }>;
      nowOffset: number;
      day: number;
      anchorMs: number;
    },
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
    },
  ) {
    const relX = rect.width > 0
      ? Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      : 0.5;
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
        items.push({ title: 'Pore EC', value: pt ? `${pt.pore.toFixed(2)} mS/cm` : '—', color: poreEcColor });
      if (ctx.bulkEcPts !== null)
        items.push({ title: 'Bulk EC', value: pt ? `${pt.bulk.toFixed(2)} mS/cm` : '—', color: bulkEcColor });
    } else {
      const vwcPt = closestPt(ctx.vwcPts, offsetMinutes);
      items.push({ title: 'VWC', value: vwcPt ? `${vwcPt.v.toFixed(1)}%` : '—', color: vwcColor });
      if (ctx.poreEcPts !== null) {
        const porePt = closestPt(ctx.poreEcPts, offsetMinutes);
        items.push({ title: 'Pore EC', value: porePt ? `${porePt.v.toFixed(2)} mS/cm` : '—', color: poreEcColor });
      }
      if (ctx.bulkEcPts !== null) {
        const bulkPt = closestPt(ctx.bulkEcPts, offsetMinutes);
        items.push({ title: 'Bulk EC', value: bulkPt ? `${bulkPt.v.toFixed(2)} mS/cm` : '—', color: bulkEcColor });
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
              <span style="color:${item.color};">${item.title}:</span>
              <span>${item.value}</span>
            </div>
          `,
    )}
      </div>
    `;
  }

  render(): TemplateResult {
    const strategy = this.device?.irrigationStrategy;
    if (!strategy?.enabled) {
      return html`<div class="placeholder">No strategy configured.</div>`;
    }

    const isFlower = (this.device?.biologicalMetrics?.flowerWeek ?? 0) > 0;
    const shots: CropSteeringShot[] = computeCropSteeringCycle(strategy, isFlower);
    const phases = computePhases(strategy, isFlower, this.device?.irrigationConfig);

    if (!phases) {
      return html`<div class="placeholder">No strategy configured — set Lights On Time in the Steering tab.</div>`;
    }

    const { lightsOnMin, lightsOffMin } = phases;
    const nowMinutes = this._getNowMinutes();
    const day = 1440;
    const viewStart = (lightsOnMin - 120 + 1440) % 1440;
    const pctAt = (m: number) => ((((m % 1440) - viewStart + 1440) % 1440) / day) * 100;

    const target = strategy.targetVwcPercent ?? 45;
    const dryback = strategy.maintenanceDrybackPercent ?? 3;
    const p2Trigger = target - dryback;

    const growspaceId = this.device?.deviceId ?? '';
    const history = this._historyController?.value?.get(growspaceId);
    const vwcColor = METRIC_CONFIG[MetricKey.SOIL_MOISTURE].color;
    const poreEcColor = METRIC_CONFIG[MetricKey.PORE_EC].color;
    const bulkEcColor = METRIC_CONFIG[MetricKey.BULK_EC].color;

    const svgW = 1000;
    const svgH = 200;
    const padL = 6;
    const padR = 6;
    const padT = 28;
    const padB = 20;
    const iW = svgW - padL - padR;
    const iH = svgH - padT - padB;
    const xAt = (offset: number) => padL + (offset / day) * iW;

    const nowOffset = (nowMinutes - viewStart + 1440) % 1440;
    const nowX = xAt(nowOffset).toFixed(1);

    const buildTracePts = (
      buckets: Array<{ timestamp: string; value: number | null }> | undefined,
      anchorMs: number,
    ): TracePt[] => {
      if (!buckets?.length) return [];
      const pts: TracePt[] = [];
      for (const b of buckets) {
        if (b.value === null) continue;
        pts.push({ offset: (Date.parse(b.timestamp) - anchorMs) / 60000, v: b.value });
      }
      return pts;
    };

    const buildPath = (pts: TracePt[], yFn: (v: number) => number): string =>
      pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(p.offset).toFixed(1)},${yFn(p.v).toFixed(1)}`).join(' ');

    const lightsOnMs = history ? Date.parse(history.lights_on) : 0;
    const anchorMs = lightsOnMs - 2 * 60 * 60 * 1000;

    const vwcPts = buildTracePts(history?.soil_moisture, anchorMs);

    const vwcAxisPad = 5;
    let vwcAxisLo = Math.min(target, p2Trigger);
    let vwcAxisHi = Math.max(target, p2Trigger);
    for (const p of vwcPts) {
      vwcAxisLo = Math.min(vwcAxisLo, p.v);
      vwcAxisHi = Math.max(vwcAxisHi, p.v);
    }
    vwcAxisLo = Math.max(0, vwcAxisLo - vwcAxisPad);
    vwcAxisHi = vwcAxisHi + vwcAxisPad;
    const yAtVwc = (v: number) =>
      padT + iH - Math.max(0, Math.min(1, (v - vwcAxisLo) / (vwcAxisHi - vwcAxisLo))) * iH;

    const poreEcPts = history?.pore_ec !== undefined ? buildTracePts(history.pore_ec, anchorMs) : null;
    const bulkEcPts = history?.bulk_ec !== undefined ? buildTracePts(history.bulk_ec, anchorMs) : null;

    const ecTargetRange = (this.device?.irrigationConfig?.ecTargetRanges ?? []).find(
      (r) => r.stage === this.device?.biologicalMetrics?.granularStage,
    );
    const ecTargetMid = ecTargetRange ? (ecTargetRange.minEc + ecTargetRange.maxEc) / 2 : null;

    const ecValsForAxis: number[] = [];
    for (const pts of [poreEcPts, bulkEcPts]) {
      if (!pts) continue;
      for (const p of pts) if (p) ecValsForAxis.push(p.v);
    }
    let ecAxisLo: number;
    let ecAxisHi: number;
    if (ecTargetMid !== null) {
      ecAxisLo = Math.max(0, ecTargetMid - 2);
      ecAxisHi = ecTargetMid + 2;
    } else if (ecValsForAxis.length > 0) {
      const dataMin = Math.min(...ecValsForAxis);
      const dataMax = Math.max(...ecValsForAxis);
      const pad = Math.max(0.3, (dataMax - dataMin) * 0.15);
      ecAxisLo = Math.max(0, dataMin - pad);
      ecAxisHi = dataMax + pad;
    } else {
      ecAxisLo = 1;
      ecAxisHi = 5;
    }
    const yAtEc = (v: number) =>
      padT + iH - Math.max(0, Math.min(1, (v - ecAxisLo) / (ecAxisHi - ecAxisLo))) * iH;

    const vwcPath = buildPath(vwcPts, yAtVwc);
    const porePath = poreEcPts ? buildPath(poreEcPts, yAtEc) : '';
    const bulkPath = bulkEcPts ? buildPath(bulkEcPts, yAtEc) : '';

    const targetY = yAtVwc(target);
    const p2TriggerY = yAtVwc(p2Trigger);

    const lastKnown = (pts: TracePt[]): number | null => (pts.length ? pts[pts.length - 1].v : null);
    const seedVwc = lastKnown(vwcPts) ?? target;
    const seedPore = lastKnown(poreEcPts ?? []) ?? ecTargetMid ?? 3;
    const projection = generateSubstrateProjection(
      nowOffset,
      shots,
      phases,
      seedVwc,
      seedPore,
      viewStart,
      target,
    );
    const projVwcSeg = projection
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(p.offset).toFixed(1)},${yAtVwc(p.vwc).toFixed(1)}`)
      .join(' ');
    const projPoreSeg = projection
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(p.offset).toFixed(1)},${yAtEc(p.pore).toFixed(1)}`)
      .join(' ');
    const projBulkSeg = projection
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(p.offset).toFixed(1)},${yAtEc(p.bulk).toFixed(1)}`)
      .join(' ');

    const lastHistory = vwcPts.length ? vwcPts[vwcPts.length - 1] : null;
    const cur = lastHistory ?? { offset: nowOffset, v: seedVwc };
    const curPore = lastKnown(poreEcPts ?? []) ?? seedPore;
    const curBulk = lastKnown(bulkEcPts ?? []) ?? Math.max(0.8, curPore * (cur.v / 100) * 1.32);

    return html`
      <div class="cs-phase-strip">
        <div class="cs-phase-block dark" style="left:0%;width:${pctAt(lightsOnMin)}%;">
          <div class="cs-phase-num">Dark</div>
          <div class="cs-phase-meta">
            ${fmtMinuteOfDay(viewStart)}–${fmtMinuteOfDay(lightsOnMin)} · no irrigation
          </div>
        </div>
        ${phases.phases.map(
          (p) => html`
            <div
              class="cs-phase-block"
              style="left:${pctAt(p.start)}%;width:${((p.end - p.start) / day) *
                100}%;background:${p.color}22;border-left:1px solid ${p.color}88;"
            >
              <div class="cs-phase-num" style="color:${p.color};">
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
          <div class="cs-phase-meta">${fmtMinuteOfDay(lightsOffMin)}–${fmtMinuteOfDay(viewStart)}</div>
        </div>
      </div>

      ${!this.hideShotTrack
        ? html`
            <div class="cs-track">
              <div
                class="cs-photoperiod"
                style="left:${pctAt(lightsOnMin)}%;width:${((lightsOffMin - lightsOnMin) / day) *
                  100}%;"
              ></div>

              ${phases.phases.map(
                (p) => html`
                  <div
                    class="cs-phase-bg"
                    style="left:${pctAt(p.start)}%;width:${((p.end - p.start) / day) *
                      100}%;background:${p.color}1a;border-left:1px dashed ${p.color}55;"
                  >
                    <span class="cs-phase-bg-lbl" style="color:${p.color}cc;">${p.label}</span>
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
                const shotColor = '#2196F3';
                return html`
                  <div
                    class="cs-event ${isPast ? 'completed' : ''}"
                    style="left:${leftPct}%;width:max(${widthPct}%,4px);background:${shotColor};box-shadow:0 0 0 1px ${shotColor}99,0 2px 4px ${shotColor}55;"
                    title="${shot.time.substring(0, 5)} · ${shot.duration}s"
                  ></div>
                `;
              })}

              <div class="cs-now-line" style="left:${pctAt(nowMinutes)}%;"></div>
            </div>
          `
        : nothing}

      <div
        class="cs-model"
        @mousemove=${(e: MouseEvent) =>
        this._onCsModelMouseMove(e, {
          vwcPts,
          poreEcPts,
          bulkEcPts,
          projection,
          nowOffset,
          day,
          anchorMs,
        })}
        @mouseleave=${this._onCsModelMouseLeave}
      >
        ${this._renderCsModelTooltip()}
        <span class="cm-title">Substrate model · live + projected</span>
        <div class="cm-readout">
          <span><i style="background:${vwcColor};"></i>VWC <b>${cur.v.toFixed(1)}%</b></span>
          ${poreEcPts !== null
        ? html`<span><i style="background:${poreEcColor};"></i>Pore <b>${curPore.toFixed(1)}</b></span>`
        : nothing}
          ${bulkEcPts !== null
        ? html`<span><i style="background:${bulkEcColor};"></i>Bulk <b>${curBulk.toFixed(1)}</b></span>`
        : nothing}
        </div>

        <svg
          viewBox="0 0 ${svgW} ${svgH}"
          preserveAspectRatio="none"
          style="width:100%;height:100%;display:block;"
        >
          <defs>
            <linearGradient id="vwcModelArea-${growspaceId}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${vwcColor}33" />
              <stop offset="100%" stop-color="${vwcColor}00" />
            </linearGradient>
          </defs>

          <!-- horizontal gridlines at VWC ticks -->
          ${[vwcAxisLo, (vwcAxisLo + vwcAxisHi) / 2, vwcAxisHi].map(
          (v) => svg`
              <line
                x1="${xAt(0)}" x2="${xAt(day)}"
                y1="${yAtVwc(v).toFixed(1)}" y2="${yAtVwc(v).toFixed(1)}"
                stroke="rgba(255,255,255,0.05)"
              />
            `
        )}
          <!-- vertical hour gridlines -->
          ${[0, 3, 6, 9, 12, 15, 18, 21, 24].map(
          (h) => svg`
              <line
                x1="${xAt(h * 60)}" x2="${xAt(h * 60)}"
                y1="${padT}" y2="${padT + iH}"
                stroke="rgba(255,255,255,0.05)"
              />
            `
        )}

          <!-- Saturation Target guide line (VWC scale) -->
          <line
            x1="${xAt(0)}" x2="${xAt(day)}"
            y1="${targetY.toFixed(1)}" y2="${targetY.toFixed(1)}"
            stroke="${vwcColor}" stroke-opacity="0.6" stroke-dasharray="6 4"
          />
          <!-- P3 dryback trigger guide line (VWC scale) -->
          <line
            x1="${xAt(0)}" x2="${xAt(day)}"
            y1="${p2TriggerY.toFixed(1)}" y2="${p2TriggerY.toFixed(1)}"
            stroke="var(--warning, #ffa726)" stroke-opacity="0.5" stroke-dasharray="2 3"
          />
          ${ecTargetMid !== null
        ? svg`
                <line
                  x1="${xAt(0)}" x2="${xAt(day)}"
                  y1="${yAtEc(ecTargetMid).toFixed(1)}" y2="${yAtEc(ecTargetMid).toFixed(1)}"
                  stroke="${poreEcColor}" stroke-opacity="0.5" stroke-dasharray="6 4"
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
          <path d="${projVwcSeg}" fill="none" stroke="${vwcColor}" stroke-width="1.7" stroke-dasharray="4 4" stroke-opacity="0.5" />

          <!-- now divider -->
          <line
            x1="${nowX}" x2="${nowX}"
            y1="${(padT - 6).toFixed(1)}" y2="${(padT + iH).toFixed(1)}"
            stroke="var(--warning, #ffa726)" stroke-dasharray="3 3"
          />

          <!-- current-value dots -->
          ${bulkEcPts !== null
        ? svg`<circle cx="${nowX}" cy="${yAtEc(curBulk).toFixed(1)}" r="3" fill="${bulkEcColor}" stroke="#141414" stroke-width="1.5" />`
        : nothing}
          ${poreEcPts !== null
        ? svg`<circle cx="${nowX}" cy="${yAtEc(curPore).toFixed(1)}" r="3" fill="${poreEcColor}" stroke="#141414" stroke-width="1.5" />`
        : nothing}
          <circle cx="${nowX}" cy="${yAtVwc(cur.v).toFixed(1)}" r="3.4" fill="${vwcColor}" stroke="#141414" stroke-width="1.5" />
        </svg>

        <span class="cm-axis-cap left">VWC %</span>
        <span class="cm-axis-cap right">mS/cm</span>

        <span class="cm-target" style="top:${targetY.toFixed(1)}px;color:${vwcColor};">Target ${target.toFixed(0)}%</span>
        <span class="cm-target" style="top:${p2TriggerY.toFixed(1)}px;color:var(--warning, #ffa726);">P3 trigger ${p2Trigger.toFixed(0)}%</span>
        ${ecTargetMid !== null
        ? html`<span class="cm-target left" style="top:${yAtEc(ecTargetMid).toFixed(1)}px;color:${poreEcColor};">Pore EC target ${ecTargetMid.toFixed(1)}</span>`
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
