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
const POINTER_DRAG_THRESHOLD_PX = 4;

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

/** Projects the value-space series into the chart's measured CSS-pixel coordinate space. */
function phaseChartGeometry(
  series: PhaseChartSeries,
  width: number,
  height: number
): PhaseChartGeometry {
  const { startMs, spanMs } = series.window;
  const vwcRange = series.max - series.min || 1;
  const xOf = (atMs: number) => ((atMs - startMs) / spanMs) * width;
  const yOf = (vwc: number) => height - ((vwc - series.min) / vwcRange) * height;
  const points = series.points.map((point) => ({ x: xOf(point.atMs), y: yOf(point.vwc) }));
  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(' ');
  const last = points[points.length - 1];

  return {
    linePath,
    areaPath: `${linePath} L ${width},${height} L 0,${height} Z`,
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
  @state() private _chartSize = { width: CHART_W, height: CHART_H };
  private _derived: PhaseHeroDerivation | null = null;
  private _chartObserver: ResizeObserver | undefined;
  private _observedChart: HTMLElement | undefined;
  private _activePointerId: number | null = null;
  private _pointerStartX = 0;
  private _pointerDragged = false;
  private _suppressNextClick = false;
  private _clickSuppressionTimer: number | undefined;
  private _keyboardSampleIndex: number | null = null;

  protected createRenderRoot() {
    return this;
  }

  connectedCallback(): void {
    super.connectedCallback();
    void this.updateComplete.then(() => {
      if (this.isConnected) this._observeChartContainer();
    });
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

  protected updated(): void {
    this._observeChartContainer();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._chartObserver?.disconnect();
    this._chartObserver = undefined;
    this._observedChart = undefined;
    if (this._clickSuppressionTimer != null) window.clearTimeout(this._clickSuppressionTimer);
  }

  private _observeChartContainer(): void {
    const container = this.querySelector<HTMLElement>('.phase-chart-container') ?? undefined;
    if (container === this._observedChart) return;

    this._chartObserver?.disconnect();
    this._chartObserver = undefined;
    this._observedChart = container;
    if (!container) return;

    this._chartObserver = new ResizeObserver(([entry]) => {
      if (entry) this._measureChart(entry.contentRect);
    });
    this._chartObserver.observe(container);
  }

  private _measureChart(rect: Pick<DOMRectReadOnly, 'width' | 'height'>): void {
    if (rect.width <= 0 || rect.height <= 0) return;
    if (
      Math.abs(rect.width - this._chartSize.width) < 0.1 &&
      Math.abs(rect.height - this._chartSize.height) < 0.1
    ) {
      return;
    }
    this._chartSize = { width: rect.width, height: rect.height };
  }

  /** Expensive work belongs exclusively to data-input updates, never hover updates. */
  private _derive(): PhaseHeroDerivation {
    const targetVwc = this.strategy.targetVwcPercent;
    const triggerVwc = targetVwc - this.strategy.maintenanceDrybackPercent;
    const series = computePhaseChartSeries(this.historyData, targetVwc, triggerVwc);
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

  private _setScrubPosition(event: PointerEvent): void {
    const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
    if (rect.width <= 0) return;
    this._hoverPosition = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  }

  private _handlePointerDown(event: PointerEvent): void {
    if (!event.isPrimary) return;
    this._activePointerId = event.pointerId;
    this._pointerStartX = event.clientX;
    this._pointerDragged = false;
    this._keyboardSampleIndex = null;
    this._setScrubPosition(event);
  }

  private _handlePointerMove(event: PointerEvent): void {
    if (!event.isPrimary) return;

    const isMouseHover = event.pointerType === 'mouse' && this._activePointerId == null;
    if (!isMouseHover && event.pointerId !== this._activePointerId) return;

    if (
      this._activePointerId === event.pointerId &&
      Math.abs(event.clientX - this._pointerStartX) >= POINTER_DRAG_THRESHOLD_PX
    ) {
      this._pointerDragged = true;
      if (event.cancelable) event.preventDefault();
    }

    this._keyboardSampleIndex = null;
    this._setScrubPosition(event);
  }

  private _handlePointerEnd(event: PointerEvent): void {
    if (event.pointerId !== this._activePointerId) return;

    if (this._pointerDragged) {
      this._suppressNextClick = true;
      if (this._clickSuppressionTimer != null) window.clearTimeout(this._clickSuppressionTimer);
      this._clickSuppressionTimer = window.setTimeout(() => {
        this._suppressNextClick = false;
        this._clickSuppressionTimer = undefined;
      });
    }

    this._activePointerId = null;
    this._pointerDragged = false;
  }

  private _clearScrubber(): void {
    this._hoverPosition = null;
    this._keyboardSampleIndex = null;
    this._activePointerId = null;
    this._pointerDragged = false;
  }

  private _handleKeyDown(event: KeyboardEvent): void {
    const series = this._derived?.series;
    if (!series) return;

    const lastIndex = series.points.length - 1;
    let index = this._keyboardSampleIndex ?? lastIndex;
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        index -= 1;
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        index += 1;
        break;
      case 'Home':
        index = 0;
        break;
      case 'End':
        index = lastIndex;
        break;
      default:
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    this._keyboardSampleIndex = Math.max(0, Math.min(lastIndex, index));
    const atMs = series.points[this._keyboardSampleIndex].atMs;
    this._hoverPosition = fracOfWindow(series, atMs);
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

  private _handleClick(event: MouseEvent): void {
    if (this._suppressNextClick) {
      event.preventDefault();
      event.stopPropagation();
      this._suppressNextClick = false;
      return;
    }

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

    const { series, phases, segments, targetVwc, triggerVwc } = derived;
    const chart = series
      ? phaseChartGeometry(series, this._chartSize.width, this._chartSize.height)
      : null;
    const hoverPosition = this._hoverPosition;
    const hovered =
      hoverPosition != null && series ? samplePhaseChartAt(series, hoverPosition) : null;
    const hoveredPhase =
      hovered && phases
        ? (phases.phases.find(
            (phase) => hovered.minuteOfDay >= phase.start && hovered.minuteOfDay < phase.end
          ) ?? null)
        : null;
    const accessibleDescription = hovered
      ? [
          hoveredPhase ? `Phase ${hoveredPhase.label}.` : 'Outside a phase window.',
          `Time ${fmtMinuteOfDay(hovered.minuteOfDay)}.`,
          `VWC ${hovered.vwc.toFixed(1)}%.`,
        ].join(' ')
      : derived.description;
    const currentVwcDisplay = series?.currentVwc?.toFixed(1) ?? null;
    const vwcDisplay = hovered ? hovered.vwc.toFixed(1) : currentVwcDisplay;
    const chartColor = METRIC_CONFIG[MetricKey.SOIL_MOISTURE].color;
    const percent = (fraction: number) => `${(fraction * 100).toFixed(2)}%`;
    const tooltipAnchor =
      hoverPosition == null || hoverPosition <= 0.18
        ? 'start'
        : hoverPosition >= 0.82
          ? 'end'
          : 'center';

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
        @keydown=${this._handleKeyDown}
        @blur=${this._clearScrubber}
        @click=${this._handleClick}
        title=${this.chip.tooltip || nothing}
      >
        <span
          id="steering-phase-state"
          class="visually-hidden"
          aria-live="polite"
          aria-atomic="true"
          >${accessibleDescription}</span
        >
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
                  viewBox="0 0 ${this._chartSize.width} ${this._chartSize.height}"
                  @pointerdown=${this._handlePointerDown}
                  @pointermove=${this._handlePointerMove}
                  @pointerup=${this._handlePointerEnd}
                  @pointercancel=${this._clearScrubber}
                  @pointerleave=${this._clearScrubber}
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
                    x2="${this._chartSize.width}"
                    y2="${chart.targetY.toFixed(1)}"
                    stroke="${chartColor}"
                    stroke-width="1"
                    stroke-dasharray="4 4"
                    opacity="0.45"
                  />
                  <line
                    class="phase-trigger-line"
                    x1="0"
                    y1="${chart.triggerY.toFixed(1)}"
                    x2="${this._chartSize.width}"
                    y2="${chart.triggerY.toFixed(1)}"
                    stroke="var(--phase-p2, #2196f3)"
                    stroke-width="1"
                    stroke-dasharray="4 4"
                    opacity="0.45"
                  />
                  ${hoverPosition == null
                    ? nothing
                    : svg`
                      <line
                        x1="${(hoverPosition * this._chartSize.width).toFixed(1)}"
                        y1="0"
                        x2="${(hoverPosition * this._chartSize.width).toFixed(1)}"
                        y2="${this._chartSize.height}"
                        stroke="rgba(255,255,255,0.45)"
                        stroke-width="1"
                      />
                    `}
                </svg>

                <span
                  class="phase-reference-label phase-target-label"
                  style="top:${Math.max(14, chart.targetY).toFixed(1)}px;color:${chartColor};"
                  >Target ${targetVwc}%</span
                >
                <span
                  class="phase-reference-label phase-trigger-label"
                  style="top:${Math.min(this._chartSize.height - 14, chart.triggerY).toFixed(1)}px;"
                  >P2 trigger ${triggerVwc.toFixed(0)}%</span
                >
                ${hoverPosition == null
                  ? html`
                      <span
                        class="phase-now-marker"
                        style="left:${chart.nowX.toFixed(1)}px;top:${chart.nowY.toFixed(
                          1
                        )}px;color:${chartColor};"
                      >
                        <span class="phase-now-pulse"></span>
                        <span class="phase-now-dot"></span>
                      </span>
                    `
                  : nothing}
                ${hoverPosition != null && hovered
                  ? html`
                      <div
                        class="phase-tooltip phase-tooltip--anchor-${tooltipAnchor}"
                        style="left:${percent(hoverPosition)}"
                      >
                        ${hoveredPhase
                          ? html`<span
                              class="phase-tooltip-phase"
                              style="--phase-tooltip-accent:${hoveredPhase.color};"
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
