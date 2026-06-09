import { LitElement, html, css, svg, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { customElement, property, state, query } from 'lit/decorators.js';
import { ChartUtils } from '../../../utils/chart-utils';
import { GrowspaceDevice } from '../../../types';
import { HeaderChip } from '../../../utils/metrics-utils';
import { sharedStyles } from '../../../styles/shared.styles';
import { MetricKey } from '../../../features/environment/constants';
import { computePhases } from '../../../features/environment/crop-steering-model';
import type { IrrigationStrategy, IrrigationConfig } from '../../../services/types';
import type { RawHistoryDataPoint } from '../../../adapters/hass-types';
import type { HomeAssistant } from 'custom-card-helpers';

@customElement('growspace-header-hero-ui')
export class GrowspaceHeaderHeroUI extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public device!: GrowspaceDevice;
  @property({ attribute: false }) public chips: HeaderChip[] = [];
  @property({ type: Boolean }) public isMobile = false;
  @property({ type: Boolean }) public mobileLink = false;
  @property({ attribute: false }) public historyCache: any = {};
  @property() public timeRange = '24h';

  @property({ attribute: false }) public irrigationStrategy: IrrigationStrategy | null = null;
  @property({ attribute: false }) public irrigationConfig: IrrigationConfig | null = null;
  @property({ type: Boolean }) public isFlower = false;

  @state() private _deckIndex = 0;
  @state() private _phaseHoverX: number | null = null;
  @query('.deck-scroll') private _deckEl?: HTMLElement;

  private _onDeckScroll() {
    const el = this._deckEl;
    if (!el) return;
    const firstItem = el.firstElementChild as HTMLElement;
    if (!firstItem) return;
    const itemWidth = firstItem.offsetWidth + 12;
    const next = Math.round(el.scrollLeft / itemWidth);
    if (next !== this._deckIndex) this._deckIndex = next;
  }

  private _renderDeck() {
    return html`
      <div class="deck-scroll" @scroll=${this._onDeckScroll}>
        ${repeat(
      this.chips,
      (chip) => chip.key,
      (chip) => html`<div class="deck-item">${this._renderHeroCard(chip)}</div>`
    )}
      </div>
      ${this.chips.length > 1
        ? html`
            <div class="deck-dots">
              ${this.chips.map(
          (_, i) => html`
                  <span class="deck-dot ${i === this._deckIndex ? 'active' : ''}"></span>
                `
        )}
            </div>
          `
        : nothing}
    `;
  }

  private _handleChipDragStart(e: DragEvent, metric: string) {
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', metric);
    }
    this.dispatchEvent(
      new CustomEvent('chip-drag-start', {
        detail: { metric, event: e },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleChipDrop(e: DragEvent, targetMetric: string) {
    e.preventDefault();
    this.dispatchEvent(
      new CustomEvent('chip-drop', { detail: { targetMetric }, bubbles: true, composed: true })
    );
  }

  private _handleDragOver(e: DragEvent) {
    e.preventDefault();
  }

  private _toggleEnvGraph(metric: string) {
    this.dispatchEvent(
      new CustomEvent('toggle-graph', { detail: { metric }, bubbles: true, composed: true })
    );
  }

  static styles = [
    sharedStyles,
    css`
      :host {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 16px;
        width: 100%;
        min-height: 50px;
      }

      .hero-card {
        background: var(--glass-bg, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        backdrop-filter: var(--glass-blur);
        box-shadow:
          0 4px 24px -1px rgba(0, 0, 0, 0.2),
          0 0 0 1px rgba(255, 255, 255, 0.02) inset;

        border-radius: 24px;
        padding: 20px 24px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        position: relative;
        cursor: grab;
        transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
        overflow: hidden;
        min-height: 110px;
      }

      .hero-card:active {
        cursor: grabbing;
        transform: scale(0.98);
      }

      .hero-card:hover {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.08));
        border-color: var(--divider-color, rgba(255, 255, 255, 0.15));
        box-shadow:
          0 8px 32px -4px rgba(0, 0, 0, 0.3),
          0 0 0 1px rgba(255, 255, 255, 0.05) inset;
        transform: translateY(-2px);
      }

      .hero-card.linked {
        border-color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.08));
      }

      .hero-header {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
        z-index: 1;
      }

      .hero-icon {
        --mdc-icon-size: 20px;
        flex-shrink: 0;
      }

      .hero-label {
        font-size: 0.9rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .hero-value-group {
        display: flex;
        align-items: baseline;
        gap: 4px;
        position: relative;
        z-index: 1;
      }

      .hero-value {
        font-size: 2rem;
        font-weight: 400;
        color: var(--primary-text-color, #fff);
        line-height: 1;
      }

      .hero-unit {
        font-size: 1rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
        font-weight: 500;
      }

      .hero-card.active {
        background: color-mix(
          in srgb,
          var(--primary-color, #2196f3) 15%,
          var(--glass-bg, rgba(255, 255, 255, 0.05))
        );
        border-color: var(--primary-color, #2196f3);
        box-shadow:
          0 8px 32px -4px rgba(0, 0, 0, 0.3),
          0 0 0 1px var(--primary-color, #2196f3) inset;
      }

      .hero-card.active .hero-value,
      .hero-card.active .hero-label,
      .hero-card.active .hero-unit,
      .hero-card.active .hero-icon {
        color: var(--primary-text-color, #fff) !important;
        fill: var(--primary-text-color, #fff) !important;
      }

      /* Phase card keeps its own colours when active */
      .phase-hero-card.active .hero-icon {
        color: rgba(38, 198, 218, 0.85) !important;
        fill: rgba(38, 198, 218, 0.85) !important;
      }

      .phase-hero-card.active .hero-label {
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.55)) !important;
      }

      .hero-sparkline {
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 50%;
        pointer-events: none;
        z-index: 0;
        opacity: 0.7;
      }

      .hero-sparkline path {
        transition:
          d 0.5s cubic-bezier(0.4, 0, 0.2, 1),
          stroke 0.3s ease,
          fill 0.3s ease;
      }

      @media (max-width: 600px) {
        :host {
          display: block;
        }

        .deck-scroll {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
          padding: 2px 2px 4px;
        }

        .deck-scroll::-webkit-scrollbar {
          display: none;
        }

        .deck-item {
          flex: 0 0 calc(100% - 48px);
          scroll-snap-align: start;
          min-width: 0;
        }

        .deck-dots {
          display: flex;
          gap: 5px;
          justify-content: center;
          margin-top: 10px;
        }

        .deck-dot {
          height: 5px;
          width: 5px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.2);
          transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
        }

        .deck-dot.active {
          width: 14px;
          background: var(--primary-color, #4caf50);
        }

        .hero-value {
          font-size: 1.75rem;
        }
      }

      .hero-multi-values {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 1.5rem;
        color: var(--primary-text-color);
      }

      .hero-multi-divider {
        width: 1px;
        height: 24px;
        background: var(--divider-color, rgba(255, 255, 255, 0.1));
      }

      .hero-status-badge {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 0.65rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        margin-left: auto;
        flex-shrink: 0;
      }

      .hero-status-badge.status-ok {
        background: rgba(76, 175, 80, 0.15);
        color: #69f0ae;
        border: 1px solid rgba(76, 175, 80, 0.3);
      }

      .hero-status-badge.status-warning {
        background: rgba(255, 167, 38, 0.15);
        color: #ffb74d;
        border: 1px solid rgba(255, 167, 38, 0.3);
      }

      .hero-status-badge.status-error {
        background: rgba(244, 67, 54, 0.15);
        color: #ff8a80;
        border: 1px solid rgba(244, 67, 54, 0.3);
      }

      /* ── Phase hero card ─────────────────────────── */

      .phase-hero-card {
        min-height: 210px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        border-color: rgba(38, 198, 218, 0.16);
        background:
          linear-gradient(180deg, rgba(38, 198, 218, 0.045) 0%, rgba(38, 198, 218, 0.012) 100%),
          var(--glass-bg, rgba(255, 255, 255, 0.05));
        backdrop-filter: var(--glass-blur);
        box-shadow:
          0 4px 24px -1px rgba(0, 0, 0, 0.2),
          0 0 0 1px rgba(255, 255, 255, 0.02) inset;
      }

      .phase-hero-card:hover {
        background:
          linear-gradient(180deg, rgba(38, 198, 218, 0.055) 0%, rgba(38, 198, 218, 0.018) 100%),
          var(--secondary-background-color, rgba(255, 255, 255, 0.08));
        border-color: rgba(38, 198, 218, 0.28);
        box-shadow:
          0 8px 32px -4px rgba(0, 0, 0, 0.3),
          0 0 0 1px rgba(255, 255, 255, 0.05) inset;
        transform: translateY(-2px);
      }

      .phase-hero-card.active {
        background:
          linear-gradient(180deg, rgba(38, 198, 218, 0.08) 0%, rgba(38, 198, 218, 0.025) 100%),
          var(--glass-bg, rgba(255, 255, 255, 0.05));
        border-color: rgba(38, 198, 218, 0.30);
        box-shadow:
          0 8px 32px -4px rgba(0, 0, 0, 0.3),
          0 0 0 1px rgba(38, 198, 218, 0.35) inset;
      }

      .phase-hero-card .hero-header {
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.55));
      }

      .phase-hero-card .hero-icon {
        color: rgba(38, 198, 218, 0.85) !important;
        fill: rgba(38, 198, 218, 0.85) !important;
      }

      .phase-hero-card .hero-label {
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.55)) !important;
      }

      .phase-vwc-readout {
        margin-left: auto;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.55));
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        flex-shrink: 0;
      }

      .phase-badge {
        display: inline-flex;
        align-items: center;
        padding: 2px 7px;
        border-radius: 999px;
        font-size: 0.62rem;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        margin-left: 6px;
        flex-shrink: 0;
        align-self: center;
      }

      .phase-badge--dryback {
        color: #ff9800;
        background: rgba(255, 152, 0, 0.14);
        border: 1px solid rgba(255, 152, 0, 0.38);
      }

      .phase-chart-container {
        position: relative;
        flex: 1;
        min-height: 68px;
        overflow: visible;
      }

      .phase-chart-svg {
        display: block;
        width: 100%;
        height: 100%;
        cursor: crosshair;
        overflow: visible;
      }

      .phase-now-pulse {
        animation: phase-pulse 2.4s ease-out infinite;
        transform-box: fill-box;
        transform-origin: center;
      }

      @keyframes phase-pulse {
        0% { transform: scale(1); opacity: 0.4; }
        70%, 100% { transform: scale(2.6); opacity: 0; }
      }

      @media (prefers-reduced-motion: reduce) {
        .phase-now-pulse { animation: none; opacity: 0; }
      }

      .phase-tooltip {
        position: absolute;
        top: -4px;
        transform: translateX(-50%);
        padding: 3px 7px;
        border-radius: 7px;
        pointer-events: none;
        background: rgba(20, 20, 24, 0.85);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 0.67rem;
        white-space: nowrap;
        display: flex;
        gap: 5px;
        z-index: 10;
      }

      .phase-tooltip-phase {
        font-weight: 700;
      }

      .phase-tooltip-time {
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.55));
        font-variant-numeric: tabular-nums;
      }

      .phase-tooltip-vwc {
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
        font-variant-numeric: tabular-nums;
      }

      .phase-bar {
        padding: 0 2px;
        flex-shrink: 0;
      }

      .phase-bar-track {
        position: relative;
        height: 6px;
        border-radius: 3px;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.05);
      }

      .phase-bar-seg {
        position: absolute;
        top: 0;
        height: 100%;
      }

      .phase-bar-now {
        position: absolute;
        top: -2px;
        width: 2px;
        height: 10px;
        background: #fff;
        border-radius: 1px;
        transform: translateX(-50%);
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.6);
      }

      .phase-bar-labels {
        position: relative;
        height: 14px;
        margin-top: 2px;
      }

      .phase-bar-label {
        position: absolute;
        transform: translateX(-50%);
        font-size: 0.55rem;
        font-weight: 600;
        letter-spacing: 0.05em;
        opacity: 0.85;
        white-space: nowrap;
      }
    `,
  ];

  render() {
    if (this.isMobile) {
      return this._renderDeck();
    }
    return html`
      ${repeat(
      this.chips,
      (chip) => chip.key,
      (chip) => this._renderHeroCard(chip)
    )}
    `;
  }

  // ── Phase hero card helpers ────────────────────────────────────────────────

  private _buildPhaseChart(
    historyData: RawHistoryDataPoint[] | undefined,
    targetVwc: number,
    triggerVwc: number,
    chartW: number,
    chartH: number
  ): {
    linePath: string;
    areaPath: string;
    targetY: number;
    triggerY: number;
    nowX: number;
    nowY: number;
    currentVwc: number;
    hoverVwc: (t: number) => number;
    hoverTime: (t: number) => string;
    hoverMinuteOfDay: (t: number) => number;
    /** Map a unix-ms timestamp to a 0..1 chart fraction (clamped). */
    tsToFrac: (ts: number) => number;
    minTime: number;
    timeSpan: number;
  } | null {
    if (!historyData || historyData.length < 2) return null;

    const sorted = [...historyData].sort(
      (a, b) => new Date(a.last_changed).getTime() - new Date(b.last_changed).getTime()
    );
    const valid = sorted.filter((d) => {
      const v = parseFloat(d.state);
      return !isNaN(v) && d.state !== 'unavailable' && d.state !== 'unknown';
    });
    if (valid.length < 2) return null;

    let minVal = Infinity;
    let maxVal = -Infinity;
    let minTime = Infinity;
    let maxTime = -Infinity;
    for (const d of valid) {
      const v = parseFloat(d.state);
      const t = new Date(d.last_changed).getTime();
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
      if (t < minTime) minTime = t;
      if (t > maxTime) maxTime = t;
    }

    const vwcMin = Math.min(minVal, triggerVwc - 5);
    const vwcMax = Math.max(maxVal, targetVwc + 5);
    const vwcRange = vwcMax - vwcMin || 1;
    const timeSpan = maxTime - minTime || 1;

    const xOf = (t: number) => ((t - minTime) / timeSpan) * chartW;
    const yOf = (v: number) => chartH - ((v - vwcMin) / vwcRange) * chartH;

    const pts = valid.map((d) => ({
      x: xOf(new Date(d.last_changed).getTime()),
      y: yOf(parseFloat(d.state)),
      v: parseFloat(d.state),
    }));

    const linePath = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');
    const areaPath = `${linePath} L ${chartW},${chartH} L 0,${chartH} Z`;

    const currentVwc = pts[pts.length - 1].v;

    const hoverVwc = (t: number): number => {
      const x = t * chartW;
      for (let i = 1; i < pts.length; i++) {
        if (pts[i].x >= x) {
          const frac = (x - pts[i - 1].x) / (pts[i].x - pts[i - 1].x + 0.001);
          return pts[i - 1].v + frac * (pts[i].v - pts[i - 1].v);
        }
      }
      return currentVwc;
    };

    // Map hover fraction (0..1) to a wall-clock timestamp, return HH:MM string.
    const hoverTime = (t: number): string => {
      const ms = minTime + t * timeSpan;
      const d = new Date(ms);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    // Map hover fraction to minute-of-day (0..1439) for phase lookup.
    const hoverMinuteOfDay = (t: number): number => {
      const ms = minTime + t * timeSpan;
      const d = new Date(ms);
      return d.getHours() * 60 + d.getMinutes();
    };

    const tsToFrac = (ts: number) => Math.max(0, Math.min(1, (ts - minTime) / timeSpan));

    return {
      linePath,
      areaPath,
      targetY: yOf(targetVwc),
      triggerY: yOf(triggerVwc),
      nowX: pts[pts.length - 1].x,
      nowY: pts[pts.length - 1].y,
      currentVwc,
      hoverVwc,
      hoverTime,
      hoverMinuteOfDay,
      tsToFrac,
      minTime,
      timeSpan,
    };
  }

  private _renderPhaseHeroCard(chip: HeaderChip) {
    const strategy = this.irrigationStrategy!;
    const config = this.irrigationConfig;

    const CHART_W = 300;
    const CHART_H = 68;
    const CS = '#26c6da'; // crop-steering teal

    const targetVwc = strategy.targetVwcPercent;
    const triggerVwc = targetVwc - strategy.maintenanceDrybackPercent;

    const historyData = (this.historyCache as Record<string, RawHistoryDataPoint[]>)?.[
      MetricKey.SOIL_MOISTURE
    ];
    const chart = this._buildPhaseChart(historyData, targetVwc, triggerVwc, CHART_W, CHART_H);

    const phases = computePhases(strategy, this.isFlower, config);

    // Parse chip value: "P3 · 22:40"
    const valueMatch = chip.value?.match(/^(P[123])\s*·\s*(.+)$/);
    const currentPhase = valueMatch?.[1] ?? chip.value ?? '';
    const transitionTime = valueMatch?.[2] ?? '';
    const isP3 = currentPhase === 'P3';

    const hv = this._phaseHoverX;
    const hovVwc = hv != null && chart ? chart.hoverVwc(hv) : null;
    const hovTimeStr = hv != null && chart ? chart.hoverTime(hv) : null;
    const hovMinute = hv != null && chart ? chart.hoverMinuteOfDay(hv) : null;

    // Determine which crop-steering phase the hovered minute falls in.
    const hovPhase =
      hovMinute != null && phases
        ? (phases.phases.find((p) => hovMinute >= p.start && hovMinute < p.end) ?? null)
        : null;

    const vwcDisplay =
      hovVwc != null ? hovVwc.toFixed(1) : chart?.currentVwc?.toFixed(1) ?? null;

    // Phase bar: map minute-of-day → chart timestamp → chart fraction.
    // Uses the same coordinate space as the VWC sparkline so labels align with the chart.
    const pct = (f: number) => `${(f * 100).toFixed(2)}%`;
    const segBar = phases && chart
      ? (() => {
        const { lightsOnMin, lightsOffMin, phases: ph } = phases;

        const DAY_MS = 24 * 60 * 60 * 1000;

        // Get midnight of the day that contains the latest data point.
        const latest = new Date(chart.minTime + chart.timeSpan);
        const todayMidnight = new Date(
          latest.getFullYear(), latest.getMonth(), latest.getDate()
        ).getTime();

        if (this.timeRange === '7d') {
          // Enumerate every calendar day in the chart window and emit phase segments
          // for each. Only the last (rightmost) day gets labels to avoid clutter.
          const result: Array<{ key: string; leftFrac: number; widthFrac: number; c: string; label: string | null }> = [];
          const firstDayTs = new Date(chart.minTime);
          let dayRef = new Date(
            firstDayTs.getFullYear(), firstDayTs.getMonth(), firstDayTs.getDate()
          ).getTime();
          let dayIndex = 0;
          while (dayRef <= chart.minTime + chart.timeSpan) {
            const isLastDay = dayRef + DAY_MS > chart.minTime + chart.timeSpan;
            const seg7 = (key: string, startMin: number, endMin: number, c: string, label: string | null) => {
              const leftFrac = chart.tsToFrac(dayRef + startMin * 60 * 1000);
              const rightFrac = chart.tsToFrac(dayRef + endMin * 60 * 1000);
              return {
                key: `${key}-${dayIndex}`,
                leftFrac,
                widthFrac: Math.max(0, rightFrac - leftFrac),
                c,
                label: isLastDay ? label : null,
              };
            };
            result.push(
              seg7('pre', 0, lightsOnMin, 'rgba(255,255,255,0.07)', null),
              seg7('p1', ph[0].start, ph[0].end, ph[0].color, ph[0].label),
              seg7('p2', ph[1].start, ph[1].end, ph[1].color, ph[1].label),
              seg7('p3', ph[2].start, ph[2].end, ph[2].color, ph[2].label),
              seg7('post', lightsOffMin, 1440, 'rgba(255,255,255,0.07)', null),
            );
            dayRef += DAY_MS;
            dayIndex++;
          }
          return result;
        }

        // Single-day logic for 1h/6h/24h.
        // For each segment, pick a single day reference from the START minute and
        // apply it to both start and end — avoids rightFrac < leftFrac when the end
        // minute is past maxTime and the per-minute heuristic picks different days.
        const mid = chart.minTime + chart.timeSpan / 2;

        const dayRefFor = (startMin: number): number => {
          const todayTs = todayMidnight + startMin * 60 * 1000;
          const yesterdayTs = todayMidnight - DAY_MS + startMin * 60 * 1000;
          return Math.abs(todayTs - mid) <= Math.abs(yesterdayTs - mid)
            ? todayMidnight
            : todayMidnight - DAY_MS;
        };

        const seg = (key: string, startMin: number, endMin: number, c: string, label: string | null) => {
          const ref = dayRefFor(startMin);
          const leftFrac = chart.tsToFrac(ref + startMin * 60 * 1000);
          const rightFrac = chart.tsToFrac(ref + endMin * 60 * 1000);
          return { key, leftFrac, widthFrac: Math.max(0, rightFrac - leftFrac), c, label };
        };

        return [
          seg('pre', 0, lightsOnMin, 'rgba(255,255,255,0.07)', null),
          seg('p1', ph[0].start, ph[0].end, ph[0].color, ph[0].label),
          seg('p2', ph[1].start, ph[1].end, ph[1].color, ph[1].label),
          seg('p3', ph[2].start, ph[2].end, ph[2].color, ph[2].label),
          seg('post', lightsOffMin, 1440, 'rgba(255,255,255,0.07)', null),
        ];
      })()
      : [];

    return html`
      <div
        class="hero-card ${chip.active ? 'active' : ''} phase-hero-card"
        draggable="${!this.isMobile || this.mobileLink}"
        @dragstart=${(e: DragEvent) => this._handleChipDragStart(e, chip.key)}
        @drop=${(e: DragEvent) => this._handleChipDrop(e, chip.key)}
        @dragover=${(e: DragEvent) => this._handleDragOver(e)}
        @click=${() => this._toggleEnvGraph(chip.key)}
        title="${chip.tooltip || ''}"
      >
        <!-- Header: label (left) + live VWC readout (right) -->
        <div class="hero-header">
          <ha-svg-icon class="hero-icon" .path=${chip.icon}></ha-svg-icon>
          <span class="hero-label">${chip.label ?? 'Phase'}</span>
          ${vwcDisplay != null
        ? html`<span class="phase-vwc-readout">VWC&nbsp;${vwcDisplay}%</span>`
        : nothing}
        </div>

        <!-- Value: current phase + transition time + optional badge -->
        <div class="hero-value-group">
          <span class="hero-value">${currentPhase}</span>
          ${transitionTime ? html`<span class="hero-unit">&nbsp;·&nbsp;${transitionTime}</span>` : nothing}
          ${isP3
        ? html`<span class="phase-badge phase-badge--dryback">Dryback</span>`
        : nothing}
        </div>

        <!-- VWC chart -->
        ${chart
        ? html`
              <div class="phase-chart-container">
                <svg
                  class="phase-chart-svg"
                  viewBox="0 0 ${CHART_W} ${CHART_H}"
                  preserveAspectRatio="none"
                  @mousemove=${(e: MouseEvent) => {
            const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
            this._phaseHoverX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          }}
                  @mouseleave=${() => { this._phaseHoverX = null; }}
                >
                  <defs>
                    <linearGradient id="phase-area-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="${CS}" stop-opacity="0.38" />
                      <stop offset="100%" stop-color="${CS}" stop-opacity="0" />
                    </linearGradient>
                  </defs>

                  <!-- Area fill -->
                  <path d="${chart.areaPath}" fill="url(#phase-area-grad)" />

                  <!-- VWC line -->
                  <path
                    d="${chart.linePath}"
                    fill="none"
                    stroke="${CS}"
                    stroke-width="2.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />

                  <!-- Target VWC reference line -->
                  <line
                    x1="0"
                    y1="${chart.targetY.toFixed(1)}"
                    x2="${CHART_W}"
                    y2="${chart.targetY.toFixed(1)}"
                    stroke="${CS}"
                    stroke-width="1"
                    stroke-dasharray="4 4"
                    opacity="0.45"
                  />
                  <text
                    x="${CHART_W - 4}"
                    y="${Math.max(9, chart.targetY - 3).toFixed(1)}"
                    fill="${CS}"
                    font-size="6"
                    text-anchor="end"
                    font-family="var(--font-family, sans-serif)"
                    opacity="0.85"
                  >Target ${targetVwc}%</text>

                  <!-- P3 trigger reference line -->
                  <line
                    x1="0"
                    y1="${chart.triggerY.toFixed(1)}"
                    x2="${CHART_W}"
                    y2="${chart.triggerY.toFixed(1)}"
                    stroke="#FF9800"
                    stroke-width="1"
                    stroke-dasharray="4 4"
                    opacity="0.45"
                  />
                  <text
                    x="${CHART_W - 4}"
                    y="${Math.min(CHART_H - 3, chart.triggerY + 10).toFixed(1)}"
                    fill="#FF9800"
                    font-size="6"
                    text-anchor="end"
                    font-family="var(--font-family, sans-serif)"
                    opacity="0.85"
                  >P3 trigger ${triggerVwc.toFixed(0)}%</text>

                  <!-- Now dot (hidden while hovering) -->
                  ${hv == null
            ? svg`
                      <circle class="phase-now-pulse" cx="${chart.nowX.toFixed(1)}" cy="${chart.nowY.toFixed(1)}" r="4" fill="${CS}" opacity="0.35" />
                      <circle cx="${chart.nowX.toFixed(1)}" cy="${chart.nowY.toFixed(1)}" r="3.2" fill="${CS}" stroke="var(--card-background-color, #1e1e1e)" stroke-width="1.4" />
                    `
            : nothing}

                  <!-- Hover scrubber -->
                  ${hv != null && chart
            ? svg`
                      <line
                        x1="${(hv * CHART_W).toFixed(1)}"
                        y1="0"
                        x2="${(hv * CHART_W).toFixed(1)}"
                        y2="${CHART_H}"
                        stroke="rgba(255,255,255,0.45)"
                        stroke-width="1"
                      />
                      <circle
                        cx="${(hv * CHART_W).toFixed(1)}"
                        cy="${chart.targetY + (chart.triggerY - chart.targetY) * 0.5 /* approx — will update */}"
                        r="0"
                        fill="transparent"
                      />
                    `
            : nothing}
                </svg>

                <!-- Hover tooltip -->
                ${hv != null && hovVwc != null
            ? html`
                      <div
                        class="phase-tooltip"
                        style="left: ${Math.max(4, Math.min(82, hv * 100)).toFixed(0)}%"
                      >
                        ${hovPhase
                ? html`<span class="phase-tooltip-phase" style="color:${hovPhase.color};">${hovPhase.label}</span>`
                : nothing}
                        ${hovTimeStr
                ? html`<span class="phase-tooltip-time">${hovTimeStr}</span>`
                : nothing}
                        <span class="phase-tooltip-vwc">VWC ${hovVwc.toFixed(1)}%</span>
                      </div>
                    `
            : nothing}
              </div>
            `
        : nothing}

        <!-- Phase bar (absolutely-positioned segments matching cs-phase-strip approach) -->
        ${segBar.length
        ? html`
              <div class="phase-bar">
                <div class="phase-bar-track">
                  ${segBar.map(
          (s) => html`
                      <div
                        class="phase-bar-seg"
                        style="left:${pct(s.leftFrac)};width:${pct(s.widthFrac)};background:${s.c};"
                      ></div>
                    `
        )}
                  <!-- now notch aligned with the chart's now-dot -->
                  ${chart
            ? html`<div
                        class="phase-bar-now"
                        style="left:${pct(chart.nowX / CHART_W)}"
                      ></div>`
            : nothing}
                </div>
                <div class="phase-bar-labels">
                  ${segBar
            .filter((s) => s.label)
            .map(
              (s) => html`
                        <span
                          class="phase-bar-label"
                          style="left:${pct(s.leftFrac + s.widthFrac / 2)};color:${s.c};"
                        >${s.label}</span>
                      `
            )}
                </div>
              </div>
            `
        : nothing}
      </div>
    `;
  }

  private _renderHeroCard(chip: HeaderChip) {
    if (chip.key === MetricKey.STEERING_PHASE && this.irrigationStrategy?.enabled) {
      return this._renderPhaseHeroCard(chip);
    }

    const match = String(chip.value || '').match(/^([\d.,]+)\s*(.*)$/);
    const val = match ? match[1] : chip.value;
    const unit = match ? match[2] : '';

    const sparklineWidth = 140;
    const sparklineHeight = 80;

    const timeRange = this.timeRange;
    const isVpd = chip.key === 'vpd';
    let vpdSegments: Array<{ path: string; color: string }> = [];

    if (isVpd && this.device) {
      const lightHistory = (this.historyCache as any)?.light || [];

      const overviewEntity = this.device.overviewEntityId
        ? this.hass?.states[this.device.overviewEntityId]
        : null;

      const attrs = overviewEntity?.attributes || {};
      const day = {
        targetMin: attrs.day_vpd_target_min ?? attrs.vpd_target_min ?? 0.8,
        targetMax: attrs.day_vpd_target_max ?? attrs.vpd_target_max ?? 1.2,
        dangerMin: attrs.day_vpd_danger_min ?? attrs.vpd_danger_min ?? 0.4,
        dangerMax: attrs.day_vpd_danger_max ?? attrs.vpd_danger_max ?? 1.6,
      };
      const night = {
        targetMin: attrs.night_vpd_target_min ?? day.targetMin,
        targetMax: attrs.night_vpd_target_max ?? day.targetMax,
        dangerMin: attrs.night_vpd_danger_min ?? day.dangerMin,
        dangerMax: attrs.night_vpd_danger_max ?? day.dangerMax,
      };

      vpdSegments = ChartUtils.generateVpdSparklineSegments(
        this.historyCache?.vpd,
        sparklineWidth,
        sparklineHeight,
        { day, night },
        lightHistory,
        timeRange as any
      );
    }

    const useVpdSegments = isVpd && vpdSegments.length > 0;
    const sparklineColor = ChartUtils.getSparklineColor(chip.key, chip.status);
    const entityIds = chip.entityIds || [];
    const sparklinePaths: Array<{ d: string; color: string }> = [];

    if (!useVpdSegments) {
      if (entityIds.length > 1) {
        entityIds.forEach((id, idx) => {
          const path = ChartUtils.generateSparklinePath(
            (this.historyCache as any)?.[`${chip.key}:${id}`],
            sparklineWidth,
            sparklineHeight,
            timeRange as any
          );
          if (path) {
            const color =
              idx === 0
                ? sparklineColor
                : `color-mix(in srgb, ${sparklineColor}, white ${idx * 20}%)`;
            sparklinePaths.push({ d: path, color });
          }
        });
      } else {
        const path = ChartUtils.generateSparklinePath(
          (this.historyCache as any)?.[chip.key],
          sparklineWidth,
          sparklineHeight,
          timeRange as any
        );
        if (path) {
          sparklinePaths.push({ d: path, color: sparklineColor });
        }
      }
    }

    return html`
      <div
        class="hero-card ${chip.status ? `status-${chip.status}` : ''} ${chip.active
        ? 'active'
        : ''} ${chip.linked ? 'linked' : ''}"
        draggable="${!this.isMobile || this.mobileLink}"
        @dragstart=${(e: DragEvent) => this._handleChipDragStart(e, chip.key)}
        @drop=${(e: DragEvent) => this._handleChipDrop(e, chip.key)}
        @dragover=${(e: DragEvent) => this._handleDragOver(e)}
        @click=${() => this._toggleEnvGraph(chip.key)}
        title="${chip.tooltip || ''}"
      >
        ${useVpdSegments
        ? html`
              <svg
                class="hero-sparkline"
                viewBox="0 0 ${sparklineWidth} ${sparklineHeight}"
                preserveAspectRatio="none"
                style="overflow: visible;"
              >
                <rect
                  x="0"
                  y="0"
                  width="${sparklineWidth}"
                  height="${sparklineHeight}"
                  fill="transparent"
                />
                ${vpdSegments.map(
          (seg) => svg`
                      <path d="${seg.path}" fill="none" stroke="${seg.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                    `
        )}
              </svg>
            `
        : sparklinePaths.length > 0
          ? html`
                <svg
                  class="hero-sparkline"
                  viewBox="0 0 ${sparklineWidth} ${sparklineHeight}"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient
                      id="sparkline-grad-${chip.key}"
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <stop offset="0%" stop-color="${sparklineColor}" stop-opacity="0.3" />
                      <stop offset="100%" stop-color="${sparklineColor}" stop-opacity="0" />
                    </linearGradient>
                  </defs>
                  ${sparklinePaths.map(
            (p) => svg`
                    <path
                      d="${p.d}"
                      fill="none"
                      stroke="${p.color}"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      style="opacity: ${p.color === sparklineColor ? 1 : 0.6}"
                    />
                  `
          )}
                  <path
                    d="${sparklinePaths[0].d} V ${sparklineHeight} H 0 Z"
                    fill="url(#sparkline-grad-${chip.key})"
                  />
                </svg>
              `
          : ''}

        <div class="hero-header">
          <ha-svg-icon class="hero-icon" .path=${chip.icon}></ha-svg-icon>
          <span class="hero-label">${chip.label || chip.key}</span>
          ${chip.status
        ? html`<span class="hero-status-badge status-${chip.status}">${chip.status}</span>`
        : ''}
        </div>

        <div class="hero-value-group">
          ${chip.multiValues && chip.multiValues.length > 0
        ? html`
                <div class="hero-multi-values">
                  ${chip.multiValues.map(
          (v, i) => html`
                      ${i > 0 ? html`<div class="hero-multi-divider"></div>` : ''}
                      <span>${v}</span>
                    `
        )}
                </div>
              `
        : html`
                <span class="hero-value">${val}</span>
                <span class="hero-unit">${unit}</span>
              `}
        </div>
      </div>
    `;
  }
}
