import { LitElement, html, svg, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { METRIC_CONFIG, MetricKey } from '../../environment/constants';
import {
  computePhases,
  fmtMinuteOfDay,
  resolveSaturationCrossing,
  type CropSteeringPhases,
} from '../../environment/crop-steering-model';
import {
  computePhaseChartSeries,
  computePhaseWindowSegments,
  samplePhaseChartAt,
  type PhaseChartSeries,
} from '../../environment/phase-chart-series';
import type { RawHistoryDataPoint } from '../../../adapters/hass-types';
import type { HeaderChip } from '../../../slices/header-metrics';
import type { IrrigationConfig, IrrigationStrategy } from '../../../services/types';

const CHART_W = 300;
const CHART_H = 68;

interface PhaseChartGeometry {
  linePath: string;
  areaPath: string;
  targetY: number;
  triggerY: number;
  nowX: number;
  nowY: number;
}

interface PhaseBarSegment {
  key: string;
  leftFrac: number;
  widthFrac: number;
  color: string;
  label: string | null;
}

interface PhaseHeroDerivation {
  series: PhaseChartSeries | null;
  chart: PhaseChartGeometry | null;
  phases: CropSteeringPhases | null;
  segments: PhaseBarSegment[];
  targetVwc: number;
  triggerVwc: number;
  currentPhase: string;
  transitionTime: string;
  isP3: boolean;
  description: string;
}

/** Where a timestamp sits across the chart window, clamped to 0..1. */
function fracOfWindow(series: PhaseChartSeries, atMs: number): number {
  return Math.max(0, Math.min(1, (atMs - series.window.startMs) / series.window.spanMs));
}

/** Turns the value-space series into the phase card's fixed SVG geometry. */
function phaseChartGeometry(series: PhaseChartSeries): PhaseChartGeometry {
  const { startMs, spanMs } = series.window;
  const vwcRange = series.max - series.min || 1;
  const xOf = (atMs: number) => ((atMs - startMs) / spanMs) * CHART_W;
  const yOf = (vwc: number) => CHART_H - ((vwc - series.min) / vwcRange) * CHART_H;
  const points = series.points.map((point) => ({ x: xOf(point.atMs), y: yOf(point.vwc) }));
  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(' ');
  const last = points[points.length - 1];

  return {
    linePath,
    areaPath: `${linePath} L ${CHART_W},${CHART_H} L 0,${CHART_H} Z`,
    targetY: yOf(series.targetVwc),
    triggerY: yOf(series.triggerVwc),
    nowX: last.x,
    nowY: last.y,
  };
}

/**
 * The phase card is its own reactive boundary so chart scrubbing never updates
 * the hero deck (and therefore never re-renders its sibling cards or sparklines).
 * It renders into light DOM so the deck's existing card styles remain the one
 * visual source of truth.
 */
@customElement('growspace-phase-hero-card')
export class GrowspacePhaseHeroCard extends LitElement {
  @property({ attribute: false }) public chip!: HeaderChip;
  @property({ attribute: false }) public strategy!: IrrigationStrategy;
  @property({ attribute: false }) public config: IrrigationConfig | null = null;
  @property({ attribute: false }) public historyData: RawHistoryDataPoint[] | undefined;
  @property() public timeRange = '24h';

  @state() private _hoverPosition: number | null = null;
  private _derived: PhaseHeroDerivation | null = null;

  protected createRenderRoot() {
    return this;
  }

  protected willUpdate(changedProperties: Map<PropertyKey, unknown>): void {
    if (
      changedProperties.has('chip') ||
      changedProperties.has('strategy') ||
      changedProperties.has('config') ||
      changedProperties.has('historyData') ||
      changedProperties.has('timeRange')
    ) {
      this._derived = this._derive();
    }
  }

  /** Expensive work belongs exclusively to data-input updates, never hover updates. */
  private _derive(): PhaseHeroDerivation {
    const targetVwc = this.strategy.targetVwcPercent;
    const triggerVwc = targetVwc - this.strategy.maintenanceDrybackPercent;
    const series = computePhaseChartSeries(this.historyData, targetVwc, triggerVwc);
    const chart = series ? phaseChartGeometry(series) : null;
    const dayHours = this.config?.resolvedDayHours ?? 12;
    const phases = computePhases(
      this.strategy,
      dayHours,
      this.config,
      resolveSaturationCrossing(this.strategy, dayHours, series?.points ?? [], Date.now())
    );

    const valueMatch = this.chip.value?.match(/^(P[123])\s*·\s*(.+)$/);
    const currentPhase = valueMatch?.[1] ?? this.chip.value ?? '';
    const transitionTime = valueMatch?.[2] ?? '';
    const isP3 = currentPhase === 'P3';
    const currentVwcDisplay = series?.currentVwc?.toFixed(1) ?? null;
    const transitionDescription = transitionTime
      ? currentPhase === 'P1'
        ? `P1 ends at target VWC ${transitionTime}.`
        : `Next transition at ${transitionTime}.`
      : '';
    const description = [
      currentPhase ? `Active phase ${currentPhase}.` : '',
      transitionDescription,
      currentVwcDisplay ? `Current VWC ${currentVwcDisplay}%.` : '',
      `Target VWC ${targetVwc}%.`,
      `P2 trigger ${triggerVwc.toFixed(0)}%.`,
      isP3 ? 'Dryback.' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const segments =
      series && phases
        ? computePhaseWindowSegments(series, phases, this.timeRange).map((segment) => {
            const leftFrac = fracOfWindow(series, segment.startMs);
            return {
              key: segment.key,
              leftFrac,
              widthFrac: Math.max(0, fracOfWindow(series, segment.endMs) - leftFrac),
              color: segment.color,
              label: segment.label,
            };
          })
        : [];

    return {
      series,
      chart,
      phases,
      segments,
      targetVwc,
      triggerVwc,
      currentPhase,
      transitionTime,
      isP3,
      description,
    };
  }

  private _handlePointerMove(event: MouseEvent): void {
    const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
    this._hoverPosition = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  }

  private _handleDragStart(event: DragEvent): void {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', this.chip.key);
    }
    this.dispatchEvent(
      new CustomEvent('chip-drag-start', {
        detail: { metric: this.chip.key, event },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleDrop(event: DragEvent): void {
    event.preventDefault();
    this.dispatchEvent(
      new CustomEvent('chip-drop', {
        detail: { targetMetric: this.chip.key },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  private _toggleGraph(): void {
    this.dispatchEvent(
      new CustomEvent('toggle-graph', {
        detail: { metric: this.chip.key },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const derived = this._derived;
    if (!derived) return nothing;

    const { series, chart, phases, segments, targetVwc, triggerVwc } = derived;
    const hoverPosition = this._hoverPosition;
    const hovered =
      hoverPosition != null && series ? samplePhaseChartAt(series, hoverPosition) : null;
    const hoveredPhase =
      hovered && phases
        ? (phases.phases.find(
            (phase) => hovered.minuteOfDay >= phase.start && hovered.minuteOfDay < phase.end
          ) ?? null)
        : null;
    const currentVwcDisplay = series?.currentVwc?.toFixed(1) ?? null;
    const vwcDisplay = hovered ? hovered.vwc.toFixed(1) : currentVwcDisplay;
    const chartColor = METRIC_CONFIG[MetricKey.SOIL_MOISTURE].color;
    const percent = (fraction: number) => `${(fraction * 100).toFixed(2)}%`;

    return html`
      <button
        class="hero-card ${this.chip.active ? 'active' : ''} phase-hero-card"
        type="button"
        aria-label="Toggle ${this.chip.label ?? 'phase'} graph${this.chip.linked ? ', linked' : ''}"
        aria-describedby="steering-phase-state"
        aria-pressed=${this.chip.active}
        draggable="false"
        @dragstart=${this._handleDragStart}
        @drop=${this._handleDrop}
        @dragover=${this._handleDragOver}
        @click=${this._toggleGraph}
        title=${this.chip.tooltip || nothing}
      >
        <span id="steering-phase-state" class="visually-hidden">${derived.description}</span>
        <div class="hero-header">
          <ha-svg-icon class="hero-icon" .path=${this.chip.icon}></ha-svg-icon>
          <span class="hero-label">${this.chip.label ?? 'Phase'}</span>
          ${vwcDisplay != null
            ? html`<span class="phase-vwc-readout">VWC&nbsp;${vwcDisplay}%</span>`
            : nothing}
        </div>

        <div class="hero-value-group">
          <span class="hero-value">${derived.currentPhase}</span>
          ${derived.transitionTime
            ? html`<span class="hero-unit">&nbsp;·&nbsp;${derived.transitionTime}</span>`
            : nothing}
          ${derived.isP3
            ? html`<span class="phase-badge phase-badge--dryback">Dryback</span>`
            : nothing}
        </div>

        ${chart
          ? html`
              <div class="phase-chart-container">
                <svg
                  class="phase-chart-svg"
                  viewBox="0 0 ${CHART_W} ${CHART_H}"
                  preserveAspectRatio="none"
                  @mousemove=${this._handlePointerMove}
                  @mouseleave=${() => {
                    this._hoverPosition = null;
                  }}
                >
                  <defs>
                    <linearGradient id="phase-area-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="${chartColor}" stop-opacity="0.38" />
                      <stop offset="100%" stop-color="${chartColor}" stop-opacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="${chart.areaPath}" fill="url(#phase-area-grad)" />
                  <path
                    d="${chart.linePath}"
                    fill="none"
                    stroke="${chartColor}"
                    stroke-width="2.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <line
                    x1="0"
                    y1="${chart.targetY.toFixed(1)}"
                    x2="${CHART_W}"
                    y2="${chart.targetY.toFixed(1)}"
                    stroke="${chartColor}"
                    stroke-width="1"
                    stroke-dasharray="4 4"
                    opacity="0.45"
                  />
                  <text
                    x="${CHART_W - 4}"
                    y="${Math.max(9, chart.targetY - 3).toFixed(1)}"
                    fill="${chartColor}"
                    font-size="6"
                    text-anchor="end"
                    font-family="var(--font-family, sans-serif)"
                    opacity="0.85"
                  >
                    Target ${targetVwc}%
                  </text>
                  <line
                    class="phase-trigger-line"
                    x1="0"
                    y1="${chart.triggerY.toFixed(1)}"
                    x2="${CHART_W}"
                    y2="${chart.triggerY.toFixed(1)}"
                    stroke="var(--phase-p2, #2196f3)"
                    stroke-width="1"
                    stroke-dasharray="4 4"
                    opacity="0.45"
                  />
                  <text
                    class="phase-trigger-label"
                    x="${CHART_W - 4}"
                    y="${Math.min(CHART_H - 3, chart.triggerY + 10).toFixed(1)}"
                    fill="var(--phase-p2, #2196f3)"
                    font-size="6"
                    text-anchor="end"
                    font-family="var(--font-family, sans-serif)"
                    opacity="0.85"
                  >
                    P2 trigger ${triggerVwc.toFixed(0)}%
                  </text>
                  ${hoverPosition == null
                    ? svg`
                      <circle class="phase-now-pulse" cx="${chart.nowX.toFixed(1)}" cy="${chart.nowY.toFixed(1)}" r="4" fill="${chartColor}" opacity="0.35" />
                      <circle cx="${chart.nowX.toFixed(1)}" cy="${chart.nowY.toFixed(1)}" r="3.2" fill="${chartColor}" stroke="var(--card-background-color, #1e1e1e)" stroke-width="1.4" />
                    `
                    : svg`
                      <line
                        x1="${(hoverPosition * CHART_W).toFixed(1)}"
                        y1="0"
                        x2="${(hoverPosition * CHART_W).toFixed(1)}"
                        y2="${CHART_H}"
                        stroke="rgba(255,255,255,0.45)"
                        stroke-width="1"
                      />
                    `}
                </svg>

                ${hoverPosition != null && hovered
                  ? html`
                      <div
                        class="phase-tooltip"
                        style="left: ${Math.max(4, Math.min(82, hoverPosition * 100)).toFixed(0)}%"
                      >
                        ${hoveredPhase
                          ? html`<span
                              class="phase-tooltip-phase"
                              style="color:${hoveredPhase.color};"
                              >${hoveredPhase.label}</span
                            >`
                          : nothing}
                        <span class="phase-tooltip-time"
                          >${fmtMinuteOfDay(hovered.minuteOfDay)}</span
                        >
                        <span class="phase-tooltip-vwc">VWC ${hovered.vwc.toFixed(1)}%</span>
                      </div>
                    `
                  : nothing}
              </div>
            `
          : nothing}
        ${segments.length
          ? html`
              <div class="phase-bar">
                <div class="phase-bar-track">
                  ${segments.map(
                    (segment) => html`
                      <div
                        class="phase-bar-seg"
                        style="left:${percent(segment.leftFrac)};width:${percent(
                          segment.widthFrac
                        )};background:${segment.color};"
                      ></div>
                    `
                  )}
                  ${chart
                    ? html`<div
                        class="phase-bar-now"
                        style="left:${percent(chart.nowX / CHART_W)}"
                      ></div>`
                    : nothing}
                </div>
                <div class="phase-bar-labels">
                  ${segments
                    .filter((segment) => segment.label)
                    .map(
                      (segment) => html`
                        <span
                          class="phase-bar-label"
                          style="left:${percent(
                            segment.leftFrac + segment.widthFrac / 2
                          )};color:${segment.color};"
                          >${segment.label}</span
                        >
                      `
                    )}
                </div>
              </div>
            `
          : nothing}
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-phase-hero-card': GrowspacePhaseHeroCard;
  }
}
