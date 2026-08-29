import { LitElement, html, css, svg, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { mdiMagnify, mdiLink, mdiChevronLeft, mdiChevronRight } from '@mdi/js';
import { createRef, ref, Ref } from 'lit/directives/ref.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import type { GrowspaceDevice } from '../../../services/types';
import type { GraphDataPoint, GraphSeries, TooltipData, SensorHistories } from '../types';
import { ChartUtils } from '../../../utils/chart-utils';
import { computeEnvSeries } from '../env-series';
import type { MetricDescriptor } from '../../../slices/metric-descriptors';
import { localizeWithParams } from '../../../localize/localize';
import {
  METRIC_CONFIG,
  MetricKey,
  ChartType,
  StatusLevel,
  STATUS_COLORS,
  ScrollDirection,
  SENSOR_CHART_DEFAULTS,
} from '../constants';

import { consume } from '@lit/context';
import { hassContext } from '../../../lib/context';
import '../../shared/ui/error-boundary';
import { reducedMotion } from '../../../styles/reduced-motion.styles';

/**
 * The pane every trace, band and gridline is drawn into.
 *
 * `preserveAspectRatio="none"` stretches the viewBox to whatever box the chart
 * body is given, so these are drawing units rather than pixels. One definition,
 * the way `tank-water-chart` keeps one `LEVEL_PANE`.
 */
const CHART_PANE = { width: 800, height: 200 } as const;

/**
 * Horizontal gridlines, as fractions of the pane height — the flat set the
 * crop-steering model dialog draws.
 *
 * Evenly spaced and unlabelled on purpose. A dashed line at a data-derived value
 * reads exactly like a [[Guide Mark]] (ADR-0048) while encoding nothing anyone
 * configured, and it moves as the data moves.
 */
const GRIDLINE_FRACTIONS = [0, 0.25, 0.5, 0.75, 1] as const;

/** The window one render pass draws — its traces, its bands and its axis alike. */
interface ChartWindow {
  startTimeMs: number;
  durationMillis: number;
}

/**
 * Whether a metric reads as on/off rather than as a number.
 *
 * `unit === 'state'` is deliberately not part of the test: `exhaust`,
 * `humidifier` and `circulation_fan` carry that unit for a multi-level speed,
 * which they report through `meta.state`.
 */
function isBinaryMetric(id: string, unit: string): boolean {
  return (
    SENSOR_CHART_DEFAULTS[id]?.binary === true ||
    id === MetricKey.OPTIMAL ||
    id === MetricKey.DEHUMIDIFIER ||
    id === MetricKey.IRRIGATION ||
    id === MetricKey.DRAIN ||
    (id === MetricKey.LIGHT && unit !== '%')
  );
}

/**
 * The one readout for a point on a trace.
 *
 * The header value and the scrub tooltip both go through this, so they cannot
 * disagree about the same metric: deciding independently had an irrigation chart
 * showing `1.0 state` under an `On` header.
 */
function formatSeriesValue(
  series: Pick<GraphSeries, 'id' | 'unit'>,
  point: GraphDataPoint,
  localize: (key: string) => string
): string {
  const meta = point.meta as Record<string, unknown> | undefined;

  if (isBinaryMetric(series.id, series.unit)) {
    if (series.id === MetricKey.OPTIMAL) {
      return point.value === 1
        ? localize('environment_chart.optimal')
        : (meta?.reasons as string) || localize('environment_chart.not_optimal');
    }
    return localize(point.value === 1 ? 'environment_chart.on' : 'environment_chart.off');
  }

  if ((series.id === MetricKey.EXHAUST || series.id === MetricKey.HUMIDIFIER) && meta?.state) {
    return meta.state as string;
  }

  return `${point.value.toFixed(1)} ${series.unit}`;
}

@customElement('growspace-env-chart')
export class GrowspaceEnvChart extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  hass!: HomeAssistant;

  @property({ attribute: false }) device: GrowspaceDevice | undefined;
  @property({ attribute: false }) sensorHistory: SensorHistories = {};
  /**
   * The Metric Descriptor table this chart derives from, computed by the host.
   *
   * It arrives as a property rather than being computed here because building it
   * reads `hass.states`, which no component below [[EnvSnapshot]] may do
   * (ADR-0030). A metric absent from the table renders nothing.
   */
  @property({ attribute: false }) descriptors: Record<string, MetricDescriptor> = {};

  @property({ type: String }) metricKey = '';
  @property({ type: String }) title = '';
  @property({ type: String }) icon = mdiMagnify;
  @property({ type: String }) range: '1h' | '6h' | '24h' | '7d' = '24h';

  // For combined graphs
  @property({ type: Array }) metrics: string[] = [];
  @property({ type: Boolean }) isCombined = false;

  @state() private _activeTooltip: TooltipData | null = null;
  @state() private _hoverTime: number | null = null;
  @state() private _canScrollLeft = false;
  @state() private _canScrollRight = false;
  @state() private _renderSeries: GraphSeries[] = [];
  /**
   * The window `_renderSeries` was built against.
   *
   * Held rather than recomputed in `render()`: the path build runs only when one
   * of a handful of properties changes, so a re-render for any other reason
   * would otherwise draw the axis and the scrub against a `now` the paths know
   * nothing about — the silent misalignment [[EnvSeriesWindow]] warns about.
   */
  private _renderWindow: ChartWindow = this._windowFor(this.range);

  private _chipsContainerRef: Ref<HTMLDivElement> = createRef();
  private _chartContainerRef: Ref<HTMLDivElement> = createRef();
  private _scrollCheckTimeout: number | undefined;

  // Optimization: Cache bounding rect for tooltip
  private _cachedChartRect: DOMRect | null = null;
  private _tooltipRafId: number | null = null;

  private _localize(key: string, params: Record<string, string | number> = {}): string {
    return localizeWithParams(key, params, this.hass?.locale?.language ?? 'en');
  }

  private _scrollChips(direction: ScrollDirection) {
    const container = this._chipsContainerRef.value;
    if (container) {
      container.scrollBy({
        left: direction === ScrollDirection.LEFT ? -200 : 200,
        behavior: 'smooth',
      });
    }
  }

  private _checkScroll() {
    const container = this._chipsContainerRef.value;
    if (container) {
      this._canScrollLeft = container.scrollLeft > 1;
      this._canScrollRight =
        container.scrollLeft < container.scrollWidth - container.clientWidth - 1;
    }
  }

  private _resizeObserver: ResizeObserver | undefined;
  private _chartObserver: ResizeObserver | undefined;

  firstUpdated() {
    // Chips container is always present in combined view, or we need to handle it safely
    // Actually chips container is ONLY in combined view. logic in firstUpdated for it is also potentially flawed if we start single and switch to combined.
    this._setupObservers();
  }

  updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    // Re-check observers if structure changed
    if (changedProperties.has('isCombined') || changedProperties.has('_renderSeries')) {
      this._setupObservers();
    }
  }

  private _setupObservers() {
    // Chips Container
    const container = this._chipsContainerRef.value;
    if (container && !this._resizeObserver) {
      container.addEventListener('scroll', () => this._checkScroll());
      this._resizeObserver = new ResizeObserver(() => {
        this._checkScroll();
        this._invalidateRectCache();
      });
      this._resizeObserver.observe(container);
      this._scrollCheckTimeout = window.setTimeout(() => this._checkScroll(), 100);
    } else if (!container && this._resizeObserver) {
      // Disconnect if element gone
      this._resizeObserver.disconnect();
      this._resizeObserver = undefined;
    }

    // Chart Container
    const chartContainer = this._chartContainerRef.value;
    // We store the chart observer on the instance to track it
    if (chartContainer && !this._chartObserver) {
      const chartObserver = new ResizeObserver(() => {
        this._invalidateRectCache();
      });
      chartObserver.observe(chartContainer);
      this._chartObserver = chartObserver;

      window.addEventListener('scroll', this._invalidateRectCacheBound, { passive: true });
      window.addEventListener('resize', this._invalidateRectCacheBound, { passive: true });
    } else if (!chartContainer && this._chartObserver) {
      this._chartObserver.disconnect();
      this._chartObserver = undefined;
      window.removeEventListener('scroll', this._invalidateRectCacheBound);
      window.removeEventListener('resize', this._invalidateRectCacheBound);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._resizeObserver) this._resizeObserver.disconnect();
    if (this._chartObserver) this._chartObserver.disconnect();
    if (this._scrollCheckTimeout) clearTimeout(this._scrollCheckTimeout);
    if (this._tooltipRafId) cancelAnimationFrame(this._tooltipRafId);

    window.removeEventListener('scroll', this._invalidateRectCacheBound);
    window.removeEventListener('resize', this._invalidateRectCacheBound);
  }

  private _invalidateRectCacheBound = () => this._invalidateRectCache();

  private _invalidateRectCache() {
    this._cachedChartRect = null;
  }

  private _getVpdStatusColor(status: StatusLevel): string {
    return STATUS_COLORS[status] || METRIC_CONFIG.vpd.color;
  }

  /**
   * Derive the chart's metrics as Env Series (value space), then apply geometry —
   * the one step that needs the chart's pixel dimensions, and the only part of the
   * derivation this component still owns (ADR-0030).
   */
  private _buildRenderSeries({ startTimeMs, durationMillis }: ChartWindow): GraphSeries[] {
    const { width, height } = CHART_PANE;
    const metricKeys = this.isCombined ? this.metrics : [this.metricKey];

    return computeEnvSeries(this.descriptors, this.sensorHistory ?? {}, metricKeys, {
      startTimeMs,
      nowMs: startTimeMs + durationMillis,
      isCombined: this.isCombined,
    }).map((series) => ({
      id: series.id,
      title: series.title,
      color: series.color,
      unit: series.unit,
      icon: series.icon,
      points: series.points,
      min: series.min,
      max: series.max,
      avg: series.avg,
      path: ChartUtils.generatePathFromValues(series.points, width, height, {
        min: series.min,
        max: series.max,
        startTime: startTimeMs,
        endTime: startTimeMs + durationMillis,
        type: series.chartType,
        timeRange: this.range,
      }),
      // Overlaid traces — a combined chart's metrics, or one metric's several
      // sensors — take a flat fill; a lone trace keeps its gradient.
      fillType: this.isCombined || series.sensor ? ('flat' as const) : ('gradient' as const),
      vpdBands: series.vpdBands,
    }));
  }

  protected willUpdate(changedProperties: PropertyValues) {
    if (
      changedProperties.has('descriptors') ||
      changedProperties.has('sensorHistory') ||
      changedProperties.has('range') ||
      changedProperties.has('metricKey') ||
      changedProperties.has('metrics') ||
      changedProperties.has('isCombined')
    ) {
      this._renderWindow = this._windowFor(this.range);
      this._renderSeries = this._buildRenderSeries(this._renderWindow);
    }
  }

  render() {
    if (!this.device) return html``;

    const { width, height } = CHART_PANE;
    const { startTimeMs, durationMillis } = this._renderWindow;
    const series = this._renderSeries;

    if (series.length === 0) {
      return html`
        <div class="gs-env-graph-card">
          <div class="gs-env-graph-header">
            <div style="display:flex; align-items:center; gap:8px;">
              ${this.icon ? html`<ha-svg-icon .path=${this.icon}></ha-svg-icon>` : ''}
              <span>${this.title || this._localize('environment_chart.graph')}</span>
            </div>
            <span style="opacity:0.6; font-size:0.9em"
              >${this._localize('environment_chart.no_data')}</span
            >
          </div>
          <div class="gs-env-chart-container empty">
            ${this._localize('environment_chart.no_history_for_range', { range: this.range })}
          </div>
        </div>
      `;
    }

    return html`
      <error-boundary .fallbackMessage=${this._localize('environment_chart.render_failed')}>
        <div class="gs-env-graph-card">
          ${this.isCombined
            ? this._renderCombinedHeader(series)
            : this._renderSingleHeader(series[0])}

          <div
            class="gs-env-chart-container"
            ${ref(this._chartContainerRef)}
            @mousemove=${(e: MouseEvent) => this._onMouseMove(e, series, this._renderWindow)}
            @mouseleave=${this._onMouseLeave}
            @click=${() => this._onChartClick()}
          >
            ${this._renderTooltip()}
            ${!this.isCombined
              ? this._renderYAxisHTML(series[0].min, series[0].max, series[0].unit)
              : ''}
            ${this._renderXAxisHTML(this.range)}

            <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" class="chart-svg">
              ${this._renderGrid(width, height)}
              ${series.map((s) => {
                // VPD bands remain in value/time space until this render step, where
                // the component has the chart dimensions needed to create paths.
                if (s.vpdBands?.length) {
                  return svg`${s.vpdBands.map((band) => {
                    const bandPoints = s.points.filter(
                      (point) => point.time >= band.startTime && point.time <= band.endTime
                    );
                    const path = ChartUtils.generatePathFromValues(bandPoints, width, height, {
                      min: s.min,
                      max: s.max,
                      startTime: startTimeMs,
                      endTime: startTimeMs + durationMillis,
                      type: ChartType.LINE,
                      timeRange: this.range,
                    });
                    return svg`<path d="${path}" fill="none" stroke="${this._getVpdStatusColor(band.status)}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />`;
                  })}`;
                }

                // Skip rendering regular paths if no valid path data
                if (!s.path || s.path.trim() === '' || s.points.length === 0) {
                  return svg``;
                }

                return svg`
                  ${s.fillType === 'gradient' ? svg`<defs>${this._renderGradient(s.id, s.color)}</defs>` : ''}
                  ${
                    s.fillType === 'gradient'
                      ? svg`<path d="${s.path} V ${height} H 0 Z" fill="url(#grad-${s.id})" />`
                      : svg`<path d="${s.path} V ${height} H ${((s.points[0].time - startTimeMs) / durationMillis) * width} Z" fill="${s.color}" fill-opacity="0.1" stroke="none" />`
                  }
                  <path d="${s.path}" fill="none" stroke="${s.color}" stroke-width="2" vector-effect="non-scaling-stroke" />
                `;
              })}
            </svg>
          </div>
        </div>
      </error-boundary>
    `;
  }

  private _onMouseMove(e: MouseEvent, seriesList: GraphSeries[], chartWindow: ChartWindow) {
    if (this._tooltipRafId) cancelAnimationFrame(this._tooltipRafId);

    this._tooltipRafId = requestAnimationFrame(() => {
      this._handleGraphHover(e, seriesList, chartWindow);
      this._tooltipRafId = null;
    });
  }

  private _onMouseLeave = () => {
    if (this._tooltipRafId) cancelAnimationFrame(this._tooltipRafId);
    this._activeTooltip = null;
    this._hoverTime = null;
  };

  private _onChartClick() {
    if (this._hoverTime) {
      this.dispatchEvent(
        new CustomEvent('chart-clicked', {
          detail: { timestamp: this._hoverTime },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  private _handleGraphHover(e: MouseEvent, seriesList: GraphSeries[], chartWindow: ChartWindow) {
    if (!this._cachedChartRect) {
      const container = this._chartContainerRef.value;
      if (!container) return;
      this._cachedChartRect = container.getBoundingClientRect();
    }

    const rect = this._cachedChartRect!;
    const mouseX = e.clientX - rect.left;

    const relX = rect.width > 0 ? Math.max(0, Math.min(1, mouseX / rect.width)) : 0.5;
    const hoverTime = chartWindow.startTimeMs + relX * chartWindow.durationMillis;

    const items = seriesList.map((s) => {
      let closest = s.points[0];
      let minDiff = Number.MAX_VALUE;
      let lo = 0;
      let hi = s.points.length - 1;

      if (s.points.length > 0) {
        while (lo < hi) {
          const mid = Math.floor((lo + hi) / 2);
          if (s.points[mid].time < hoverTime) lo = mid + 1;
          else hi = mid;
        }
        for (let i = Math.max(0, lo - 1); i <= Math.min(s.points.length - 1, lo + 1); i++) {
          const p = s.points[i];
          const diff = Math.abs(p.time - hoverTime);
          if (diff < minDiff) {
            minDiff = diff;
            closest = p;
          }
        }
      }

      return {
        title: s.title,
        value: formatSeriesValue(s, closest, (key) => this._localize(key)),
        color: s.color,
      };
    });

    const locale = this.hass?.locale?.language || undefined;
    this._activeTooltip = {
      id: 'hover',
      x: mouseX,
      time: new Date(hoverTime).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
      items,
    };
    this._hoverTime = hoverTime;
  }

  private _renderSingleHeader(series: GraphSeries) {
    const last = series.points[series.points.length - 1];
    const valStr = last ? formatSeriesValue(series, last, (key) => this._localize(key)) : '-';

    return html`
      <div class="gs-env-graph-header" @click=${() => this._toggleEnvGraph()}>
        <div style="display:flex; align-items:center; gap:8px;">
          <div
            style="width:24px; height:24px; color:${series.color}; display:flex; align-items:center; justify-content:center;"
          >
            <svg viewBox="0 0 24 24" style="width:100%; height:100%; fill:currentColor;">
              <path d="${series.icon || this.icon}"></path>
            </svg>
          </div>
          <span style="color:${series.color}; font-weight:500;">${series.title}</span>
        </div>
        <div style="text-align:right;">
          <div style="font-size:1.2em; font-weight:bold; color:${series.color};">${valStr}</div>
        </div>
      </div>
    `;
  }

  private _renderCombinedHeader(seriesList: GraphSeries[]) {
    const unlinkGraphsLabel = this._localize('environment_chart.unlink_graphs');
    return html`
      <div class="gs-env-graph-header">
        <div style="display: flex; align-items: center; flex: 1; min-width: 0; gap: 4px;">
          ${this._canScrollLeft
            ? html`<div
                class="scroll-nav left"
                @click=${(e: Event) => {
                  e.stopPropagation();
                  this._scrollChips(ScrollDirection.LEFT);
                }}
              >
                <svg viewBox="0 0 24 24"><path d="${mdiChevronLeft}"></path></svg>
              </div>`
            : ''}

          <div
            class="chips-scroll-container"
            ${ref(this._chipsContainerRef)}
            @click=${(e: Event) => e.stopPropagation()}
          >
            ${seriesList.map(
              (s) => html`
                <div
                  class=${classMap({
                    'gs-legend-item': true,
                    'mask-left': this._canScrollLeft,
                    'mask-right': this._canScrollRight,
                  })}
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    this.dispatchEvent(
                      new CustomEvent('unlink-graph', {
                        detail: s.id,
                        bubbles: true,
                        composed: true,
                      })
                    );
                  }}
                >
                  <span
                    style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${s.color}; margin-right:6px; flex-shrink:0;"
                  ></span>
                  ${s.icon
                    ? html`<div
                        style="width:16px; height:16px; color:${s.color}; margin-right:4px; display:inline-flex;"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          style="width:100%; height:100%; fill:currentColor;"
                        >
                          <path d="${s.icon}"></path>
                        </svg>
                      </div>`
                    : ''}
                  <span style="color:${s.color}; font-weight:500;">${s.title}</span>
                </div>
              `
            )}
          </div>

          ${this._canScrollRight
            ? html`<div
                class="scroll-nav right"
                @click=${(e: Event) => {
                  e.stopPropagation();
                  this._scrollChips(ScrollDirection.RIGHT);
                }}
              >
                <svg viewBox="0 0 24 24"><path d="${mdiChevronRight}"></path></svg>
              </div>`
            : ''}
        </div>
        <div style="display:flex; gap: 8px; margin-left: 8px; flex-shrink: 0;">
          <ha-icon-button
            .path=${mdiLink}
            @click=${() =>
              this.dispatchEvent(
                new CustomEvent('unlink-graphs', { detail: -1, bubbles: true, composed: true })
              )}
            .label=${unlinkGraphsLabel}
            title=${unlinkGraphsLabel}
          ></ha-icon-button>
        </div>
      </div>
    `;
  }

  private _renderTooltip() {
    if (!this._activeTooltip) return html``;
    const { x, time, items } = this._activeTooltip;
    return html`
      <div class="gs-tooltip" style=${styleMap({ left: `${x}px`, top: '0' })}>
        <div
          style="font-weight:bold; margin-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:2px;"
        >
          ${time}
        </div>
        ${items.map(
          (i) => html`
            <div
              style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:2px;"
            >
              <span style="color:${i.color};">${i.title}:</span>
              <span style="font-family:monospace; font-weight:bold;">${i.value}</span>
            </div>
          `
        )}
      </div>
      <div
        class="gs-cursor-line"
        style=${styleMap({
          left: `${x}px`,
          height: '100%',
          top: '0',
          position: 'absolute',
          borderLeft: '1px dashed rgba(255,255,255,0.3)',
          pointerEvents: 'none',
        })}
      ></div>
    `;
  }

  private _renderGrid(width: number, height: number) {
    return svg`
        ${GRIDLINE_FRACTIONS.map(
          (fraction) =>
            svg`<line x1="0" y1="${height - fraction * height}" x2="${width}" y2="${height - fraction * height}" stroke="var(--divider-color, rgba(255, 255, 255, 0.12))" stroke-width="0.5" />`
        )}
        <line x1="0" y1="${height}" x2="${width}" y2="${height}" stroke="var(--divider-color, rgba(255, 255, 255, 0.12))" stroke-width="1" />
        <line x1="0" y1="0" x2="0" y2="${height}" stroke="var(--divider-color, rgba(255, 255, 255, 0.12))" stroke-width="1" />
    `;
  }

  private _renderGradient(key: string, color: string) {
    return svg`
        <linearGradient id="grad-${key}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.4" />
            <stop offset="100%" stop-color="${color}" stop-opacity="0" />
        </linearGradient>
    `;
  }

  private _renderXAxisHTML(range: string) {
    return html`<span class="gs-axis-cap left">-${range}</span>
      <span class="gs-axis-cap right">${this._localize('environment_chart.now')}</span>`;
  }

  private _renderYAxisHTML(min: number, max: number, unit: string) {
    if (unit === 'state' || (max === 1 && min === 0)) {
      return html`<span class="gs-axis-target" style="top: 8px;"
          >${this._localize('environment_chart.on')}</span
        >
        <span class="gs-axis-target" style="bottom: 8px;"
          >${this._localize('environment_chart.off')}</span
        >`;
    }
    return html`
      <span class="gs-axis-target" style="top: 8px;">${max.toFixed(0)}${unit}</span>
      <span class="gs-axis-target" style="bottom: 8px;">${min.toFixed(0)}${unit}</span>
    `;
  }

  /** The window a range names, anchored once at the moment it is asked for. */
  private _windowFor(range: string): ChartWindow {
    const durationMillis = this._getDurationMillis(range);
    return { startTimeMs: Date.now() - durationMillis, durationMillis };
  }

  private _getDurationMillis(range: string): number {
    if (range === '1h') return 3600000;
    if (range === '6h') return 21600000;
    if (range === '7d') return 604800000;
    return 86400000;
  }

  private _toggleEnvGraph() {
    this.dispatchEvent(
      new CustomEvent('toggle-graph', { detail: this.metricKey, bubbles: true, composed: true })
    );
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
      /* Spacing for the inline stack. It lives on the host, not on the card,
         so the Env Graph Wall can zero it — a margin inside the host would
         push a height:100% card past its grid row. */
      margin-top: 12px;
    }
    /* The card must reach the host's full height for the chart body to grow
       into a Wall row; error-boundary sits between them on the happy path. */
    error-boundary {
      display: block;
      height: 100%;
    }
    .gs-env-graph-card {
      display: flex;
      flex-direction: column;
      height: 100%;
      box-sizing: border-box;
      background: var(--card-background-color, #1a1a1a);
      border-radius: 12px;
      padding: 16px;
      contain: content;
    }
    .gs-env-graph-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      cursor: pointer;
    }
    .gs-env-chart-container {
      position: relative;
      /* The Env Graph Wall tiles these charts far larger than the inline slot
         does; the SVG stretches a fixed 800x200 viewBox with
         preserveAspectRatio="none", so height is the only knob that matters.
         It is a floor, not a fixed height: inline there is no free space and
         the basis is the whole story, while in the Wall the chart body grows
         into whatever height the stretched grid row hands it. */
      flex-grow: 1;
      flex-shrink: 0;
      flex-basis: var(--gs-env-chart-height, 180px);
      min-height: var(--gs-env-chart-height, 180px);
      background: var(--secondary-background-color, #0d0d0d);
      border-radius: 8px;
      cursor: crosshair;
      overflow: hidden;
    }
    .gs-env-chart-container.empty {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      cursor: default;
    }
    .chart-svg {
      width: 100%;
      height: 100%;
      overflow: visible;
      display: block;
    }

    .gs-axis-cap {
      position: absolute;
      bottom: 19px;
      z-index: 2;
      font-size: var(--font-size-xs);
      font-weight: 500;
      letter-spacing: 0.04em;
      color: var(--text-muted);
      opacity: 0.4;
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
      line-height: 1;
      pointer-events: none;
    }
    .gs-axis-cap.left {
      left: 7px;
    }
    .gs-axis-cap.right {
      right: 7px;
    }
    .gs-axis-target {
      position: absolute;
      left: 8px;
      z-index: 2;
      font-size: var(--font-size-xs);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.02em;
      white-space: nowrap;
      color: var(--text-muted);
      opacity: 0.5;
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
      line-height: 1;
      pointer-events: none;
    }

    svg path {
      transition:
        d 0.3s ease-out,
        stroke 0.3s ease;
      will-change: d;
    }

    .gs-tooltip {
      position: absolute;
      background: var(--card-background-color, rgba(30, 30, 35, 0.95));
      color: var(--primary-text-color, #fff);
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 0.75rem;
      pointer-events: none;
      transform: translate(-50%, 0);
      z-index: 100;
      white-space: nowrap;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      backdrop-filter: blur(4px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      line-height: 1.4;
      text-align: center;
    }
    .gs-cursor-line {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 1px;
      background: rgba(255, 255, 255, 0.3);
      pointer-events: none;
      z-index: 5;
      border-left: 1px dashed rgba(255, 255, 255, 0.5);
    }

    .gs-legend-item {
      display: flex;
      align-items: center;
      margin-right: 12px;
      font-size: 0.85rem;
      cursor: pointer;
      opacity: 0.8;
      transition: opacity 0.2s;
    }
    .gs-legend-item:hover {
      opacity: 1;
    }

    .chips-scroll-container {
      display: flex;
      align-items: center;
      gap: 16px;
      overflow-x: auto;
      white-space: nowrap;
      scrollbar-width: none;
      -ms-overflow-style: none;
      scroll-behavior: smooth;
      flex: 1;
      min-width: 0;
      padding: 0 10px;
      transition: mask-image 0.3s;
    }
    .chips-scroll-container.mask-right {
      mask-image: linear-gradient(to right, black calc(100% - 30px), transparent 100%);
      -webkit-mask-image: linear-gradient(to right, black calc(100% - 30px), transparent 100%);
    }
    .chips-scroll-container.mask-left {
      mask-image: linear-gradient(to right, transparent 0%, black 30px, black 100%);
      -webkit-mask-image: linear-gradient(to right, transparent 0%, black 30px, black 100%);
    }
    .chips-scroll-container.mask-left.mask-right {
      mask-image: linear-gradient(
        to right,
        transparent 0%,
        black 30px,
        black calc(100% - 30px),
        transparent 100%
      );
      -webkit-mask-image: linear-gradient(
        to right,
        transparent 0%,
        black 30px,
        black calc(100% - 30px),
        transparent 100%
      );
    }
    .chips-scroll-container::-webkit-scrollbar {
      display: none;
    }

    .scroll-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0.5;
      transition: opacity 0.2s;
      min-width: 24px;
      color: var(--primary-text-color, #fff);
    }
    .scroll-nav:hover {
      opacity: 1;
    }
    .scroll-nav svg {
      width: 24px;
      height: 24px;
      fill: currentColor;
    }
    @media (pointer: coarse) {
      .scroll-nav {
        display: none;
      }
    }

    ${reducedMotion}
  `;
}
