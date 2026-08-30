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
import { focusRingStyles } from '../../../styles/focus-ring.styles';
import { renderGuideLimitMark } from './guide-limit-mark';
import { guideLabelStyles } from './guide-label';
import { accessibleChartSummary } from '../chart-accessibility';
import type { ChartScrubDetail } from './chart-scrub-tooltip';

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

/**
 * One bound of an [[Optimal Band]], as its inline label reads it.
 *
 * A decimal is kept only where the metric's range needs one — `0.8 kPa` and
 * `2.4 mS/cm` are all signal, `30.0%` is noise — and a percent sign hugs its
 * number the way the value-axis caps above and below it do.
 */
function formatGuideBound(value: number, unit: string): string {
  const text = value.toFixed(Math.abs(value) < 10 ? 1 : 0);
  return unit === '%' ? `${text}%` : `${text} ${unit}`;
}

/** The observed domain a combined trace maps into its independently scaled pane. */
function formatObservedRange(min: number, max: number, unit: string): string {
  return `${min.toFixed(1)}–${max.toFixed(1)}${unit ? ` ${unit}` : ''}`;
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
  /** Instantaneous context drawn faintly on independently labelled right axes. */
  @property({ attribute: false }) overlayMetrics: string[] = [];
  /**
   * The window to draw, when a host owns one.
   *
   * A [[Curated Combo]] draws a bar pane beneath this chart over the same X
   * axis, and two now-anchored windows resolved a moment apart are a silently
   * misaligned axis — the same reason [[Env Series]] takes its window as a
   * parameter. Absent, the chart anchors its own from `range` as it always has.
   */
  @property({ attribute: false }) chartWindow: ChartWindow | undefined;
  /** Lets a two-pane host own the one scrub overlay spanning both panes. */
  @property({ type: Boolean }) delegateScrub = false;

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
    const metricKeys = this.isCombined ? this.metrics : [this.metricKey, ...this.overlayMetrics];

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
      observedMin: series.observedMin,
      observedMax: series.observedMax,
      avg: series.avg,
      path: ChartUtils.generatePathFromValues(series.points, width, height, {
        min: series.min,
        max: series.max,
        startTime: startTimeMs,
        endTime: startTimeMs + durationMillis,
        type: series.chartType,
        timeRange: this.range,
      }),
      // Context overlays stay lines only; combined or multi-sensor traces take
      // a flat fill, while a lone primary keeps its gradient.
      fillType: this._isOverlaySeries(series.id)
        ? ('none' as const)
        : this.isCombined || series.sensor
          ? ('flat' as const)
          : ('gradient' as const),
      vpdBands: series.vpdBands,
      guideBands: series.guideBands,
      guideLines: series.guideLines,
      guideLimits: series.guideLimits,
      darkPeriods: series.darkPeriods,
      metricColor: series.metricColor,
    }));
  }

  protected willUpdate(changedProperties: PropertyValues) {
    if (
      changedProperties.has('descriptors') ||
      changedProperties.has('sensorHistory') ||
      changedProperties.has('range') ||
      changedProperties.has('metricKey') ||
      changedProperties.has('metrics') ||
      changedProperties.has('isCombined') ||
      changedProperties.has('overlayMetrics') ||
      changedProperties.has('chartWindow')
    ) {
      this._renderWindow = this.chartWindow ?? this._windowFor(this.range);
      this._renderSeries = this._buildRenderSeries(this._renderWindow);
    }
  }

  render() {
    if (!this.device) return html``;

    const { width, height } = CHART_PANE;
    const series = this._renderSeries;

    if (series.length === 0) {
      const chartName =
        this.title ||
        this.descriptors[this.metricKey]?.title ||
        METRIC_CONFIG[this.metricKey]?.title ||
        this._localize('environment_chart.graph');
      const closeGraphLabel = this._localize('environment_chart.close_graph', {
        graph: chartName,
      });
      return html`
        <div class="gs-env-graph-card">
          <button
            class="gs-env-graph-header gs-env-graph-header-button focus-ring"
            type="button"
            aria-label=${closeGraphLabel}
            @click=${() => this._toggleEnvGraph()}
          >
            <div style="display:flex; align-items:center; gap:8px;">
              ${this.icon ? html`<ha-svg-icon .path=${this.icon}></ha-svg-icon>` : ''}
              <span>${chartName}</span>
            </div>
            <span style="opacity:0.6; font-size:0.9em"
              >${this._localize('environment_chart.no_data')}</span
            >
          </button>
          <div class="gs-env-chart-container empty">
            <svg
              class="chart-svg empty-chart-svg"
              viewBox="0 0 ${width} ${height}"
              preserveAspectRatio="none"
              role="img"
              aria-label=${accessibleChartSummary(chartName, this.range, [])}
            ></svg>
            <span class="empty-message"
              >${this._localize('environment_chart.no_history_for_range', {
                range: this.range,
              })}</span
            >
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
            @pointermove=${(e: PointerEvent) => this._onPointerMove(e, series, this._renderWindow)}
            @pointerleave=${this._onPointerLeave}
            @pointercancel=${this._onPointerLeave}
            @click=${() => this._onChartClick()}
          >
            ${this._renderTooltip()}
            ${!this.isCombined
              ? this._renderYAxisHTML(series[0].min, series[0].max, series[0].unit)
              : html`<span class="gs-axis-normalised"
                  >${this._localize('environment_chart.normalised')}</span
                >`}
            ${this.overlayMetrics.length > 0 ? this._renderValueAxisLabels(series) : ''}
            ${
              // Inline labels only on a single-metric chart: a combined chart's
              // four bands would be eight labels on a 180px pane, which is a
              // density problem rather than a collision one (ADR-0048). Band
              // edges carry their values; setpoints carry only their names.
              !this.isCombined
                ? [
                    this._renderGuideLabelsHTML(series[0]),
                    this._renderGuideLineLabelsHTML(series[0]),
                  ]
                : ''
            }
            ${this._renderXAxisHTML(this.range)}

            <svg
              viewBox="0 0 ${width} ${height}"
              preserveAspectRatio="none"
              class="chart-svg"
              role="img"
              aria-label=${this._accessibleSummary(series)}
            >
              ${
                // One backdrop for the pane, not one per trace: a combined
                // chart's metrics share a window, so they share its nights.
                this._renderDarkPeriods(series[0].darkPeriods, this._renderWindow)
              }
              ${this._renderGrid(width, height)}
              ${series
                .filter((candidate) => this._isOverlaySeries(candidate.id))
                .map((candidate) => this._renderSeriesTrace(candidate, this._renderWindow))}
              ${series
                .filter((candidate) => !this._isOverlaySeries(candidate.id))
                .map((candidate) => this._renderGuideBands(candidate, this._renderWindow))}
              ${series
                .filter((candidate) => !this._isOverlaySeries(candidate.id))
                .map((candidate) => this._renderGuideLines(candidate, this._renderWindow))}
              ${series
                .filter((candidate) => !this._isOverlaySeries(candidate.id))
                .map((candidate) => this._renderGuideLimits(candidate, this._renderWindow))}
              ${series
                .filter((candidate) => !this._isOverlaySeries(candidate.id))
                .map((candidate) => this._renderSeriesTrace(candidate, this._renderWindow))}
            </svg>
          </div>
          <!--
            A subordinate pane, when a host projects one: the bar half of a
            [[Curated Combo]]. It sits inside this card rather than beside it,
            so the two panes read as one chart over one X axis.
          -->
          <slot name="secondary-pane"></slot>
        </div>
      </error-boundary>
    `;
  }

  private _renderSeriesTrace(series: GraphSeries, { startTimeMs, durationMillis }: ChartWindow) {
    const { width, height } = CHART_PANE;

    // VPD bands remain in value/time space until this render step, where the
    // component has the chart dimensions needed to create paths.
    if (series.vpdBands?.length) {
      return svg`${series.vpdBands.map((band) => {
        const bandPoints = series.points.filter(
          (point) => point.time >= band.startTime && point.time <= band.endTime
        );
        const path = ChartUtils.generatePathFromValues(bandPoints, width, height, {
          min: series.min,
          max: series.max,
          startTime: startTimeMs,
          endTime: startTimeMs + durationMillis,
          type: ChartType.LINE,
          timeRange: this.range,
        });
        return svg`<path class="gs-vpd-status-trace" d="${path}" fill="none" stroke="${this._getVpdStatusColor(band.status)}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />`;
      })}`;
    }

    if (!series.path || series.path.trim() === '' || series.points.length === 0) {
      return svg``;
    }

    const secondary = this._isOverlaySeries(series.id);
    return svg`
      ${series.fillType === 'gradient' ? svg`<defs>${this._renderGradient(series.id, series.color)}</defs>` : ''}
      ${
        series.fillType === 'gradient'
          ? svg`<path d="${series.path} V ${height} H 0 Z" fill="url(#grad-${series.id})" />`
          : series.fillType === 'flat'
            ? svg`<path d="${series.path} V ${height} H ${((series.points[0].time - startTimeMs) / durationMillis) * width} Z" fill="${series.color}" fill-opacity="0.1" stroke="none" />`
            : ''
      }
      <path
        class=${secondary ? 'gs-secondary-trace' : 'gs-primary-trace'}
        d="${series.path}" fill="none" stroke="${series.color}"
        stroke-width=${secondary ? '1.25' : '2'}
        stroke-opacity=${secondary ? '0.38' : '1'}
        vector-effect="non-scaling-stroke"
      />
    `;
  }

  private _onPointerMove(e: PointerEvent, seriesList: GraphSeries[], chartWindow: ChartWindow) {
    if (this._tooltipRafId) cancelAnimationFrame(this._tooltipRafId);

    this._tooltipRafId = requestAnimationFrame(() => {
      this._handleGraphHover(e, seriesList, chartWindow);
      this._tooltipRafId = null;
    });
  }

  private _onPointerLeave = () => {
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

  private _handleGraphHover(e: PointerEvent, seriesList: GraphSeries[], chartWindow: ChartWindow) {
    if (!this._cachedChartRect) {
      const container = this._chartContainerRef.value;
      if (!container) return;
      this._cachedChartRect = container.getBoundingClientRect();
    }

    const rect = this._cachedChartRect!;
    const mouseX = e.clientX - rect.left;

    const relX = rect.width > 0 ? Math.max(0, Math.min(1, mouseX / rect.width)) : 0.5;
    const hoverTime = chartWindow.startTimeMs + relX * chartWindow.durationMillis;

    const items = seriesList.flatMap((s) => {
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

      const reading = {
        title: s.title,
        value: formatSeriesValue(s, closest, (key) => this._localize(key)),
        color: s.color,
      };

      const metricColor = s.metricColor ?? s.color;
      const bandItems = (s.guideBands ?? []).flatMap((band) => {
        const segment =
          band.segments.find(
            (candidate) => candidate.startTime <= hoverTime && hoverTime <= candidate.endTime
          ) ?? band.segments[band.segments.length - 1];
        if (!segment) return [];
        return [
          {
            title: `${s.title} optimal`,
            value: `${formatGuideBound(segment.min, s.unit)}–${formatGuideBound(segment.max, s.unit)}`,
            color: metricColor,
          },
        ];
      });
      const lineItems = (s.guideLines ?? []).flatMap((line) => {
        const segment =
          line.segments.find(
            (candidate) => candidate.startTime <= hoverTime && hoverTime <= candidate.endTime
          ) ?? line.segments[line.segments.length - 1];
        if (!segment) return [];
        return [
          {
            title: `${s.title} ${this._guideMarkLabel(line.id)}`,
            value: formatGuideBound(segment.value, s.unit),
            color: metricColor,
          },
        ];
      });
      const limitItems = (s.guideLimits ?? []).flatMap((limit) => {
        const segment =
          limit.segments.find(
            (candidate) => candidate.startTime <= hoverTime && hoverTime <= candidate.endTime
          ) ?? limit.segments[limit.segments.length - 1];
        if (!segment) return [];
        return [
          {
            title: `${s.title} ${limit.side === 'lower' ? 'lower' : 'upper'} limit`,
            value: formatGuideBound(segment.value, s.unit),
            color:
              limit.status === 'warning'
                ? STATUS_COLORS[StatusLevel.WARNING]
                : STATUS_COLORS[StatusLevel.DANGER],
          },
        ];
      });

      return [reading, ...bandItems, ...lineItems, ...limitItems];
    });

    const locale = this.hass?.locale?.language || undefined;
    const tooltip = {
      id: 'hover',
      x: mouseX,
      time: new Date(hoverTime).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
      items,
    };
    if (this.delegateScrub) {
      this._activeTooltip = null;
      this.dispatchEvent(
        new CustomEvent<ChartScrubDetail>('chart-scrub', {
          detail: {
            position: relX,
            rows: items.map((item) => ({
              ...item,
              time: { kind: 'moment' as const, time: hoverTime },
            })),
          },
          bubbles: true,
          composed: true,
        })
      );
    } else {
      this._activeTooltip = tooltip;
    }
    this._hoverTime = hoverTime;
  }

  private _accessibleSummary(seriesList: GraphSeries[]): string {
    const chartName = this.isCombined
      ? this.title || 'Environment metrics'
      : seriesList[0]?.title ||
        this.title ||
        METRIC_CONFIG[this.metricKey]?.title ||
        this._localize('environment_chart.graph');

    return accessibleChartSummary(
      chartName,
      this.range,
      seriesList.flatMap((series) => {
        const latest = series.points[series.points.length - 1];
        if (!latest) return [];
        const values = series.points.map((point) => point.value);
        return [
          {
            name: series.title,
            min: series.observedMin ?? Math.min(...values),
            max: series.observedMax ?? Math.max(...values),
            average:
              series.avg ?? values.reduce((total, value) => total + value, 0) / values.length,
            current: formatSeriesValue(series, latest, (key) => this._localize(key)),
            unit: series.unit === 'state' ? '' : series.unit,
          },
        ];
      })
    );
  }

  private _renderSingleHeader(series: GraphSeries) {
    const last = series.points[series.points.length - 1];
    const valStr = last ? formatSeriesValue(series, last, (key) => this._localize(key)) : '-';
    const closeGraphLabel = this._localize('environment_chart.close_graph', {
      graph: series.title,
    });

    return html`
      <button
        class="gs-env-graph-header gs-env-graph-header-button focus-ring"
        type="button"
        aria-label=${closeGraphLabel}
        @click=${() => this._toggleEnvGraph()}
      >
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
      </button>
    `;
  }

  private _renderCombinedHeader(seriesList: GraphSeries[]) {
    const unlinkGraphsLabel = this._localize('environment_chart.unlink_graphs');
    return html`
      <div class="gs-env-graph-header">
        <div style="display: flex; align-items: center; flex: 1; min-width: 0; gap: 4px;">
          ${this._canScrollLeft
            ? html`<button
                class="scroll-nav left focus-ring"
                type="button"
                aria-label=${this._localize('environment_chart.scroll_metrics_left')}
                @click=${(e: Event) => {
                  e.stopPropagation();
                  this._scrollChips(ScrollDirection.LEFT);
                }}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="${mdiChevronLeft}"></path>
                </svg>
              </button>`
            : ''}

          <div
            class="chips-scroll-container"
            ${ref(this._chipsContainerRef)}
            @click=${(e: Event) => e.stopPropagation()}
          >
            ${seriesList.map((s) => {
              const unlinkGraphLabel = this._localize('environment_chart.unlink_graph', {
                graph: s.title,
              });
              return html`
                <button
                  class=${classMap({
                    'gs-legend-item': true,
                    'focus-ring': true,
                    'mask-left': this._canScrollLeft,
                    'mask-right': this._canScrollRight,
                  })}
                  type="button"
                  aria-label=${unlinkGraphLabel}
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
                  <span class="gs-legend-title" style="color:${s.color};">${s.title}</span>
                  <span class="gs-legend-range"
                    >${formatObservedRange(s.observedMin, s.observedMax, s.unit)}</span
                  >
                </button>
              `;
            })}
          </div>

          ${this._canScrollRight
            ? html`<button
                class="scroll-nav right focus-ring"
                type="button"
                aria-label=${this._localize('environment_chart.scroll_metrics_right')}
                @click=${(e: Event) => {
                  e.stopPropagation();
                  this._scrollChips(ScrollDirection.RIGHT);
                }}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="${mdiChevronRight}"></path>
                </svg>
              </button>`
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
    if (this.delegateScrub || !this._activeTooltip) return html``;
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

  /**
   * A series' [[Optimal Band]]s: a tinted region with dashed edges in the metric
   * colour (ADR-0048).
   *
   * Every segment is drawn as its own region, so a period-indexed band steps at
   * lights-on and lights-off instead of sitting at a value that was wrong for
   * half the window. The edges take `vector-effect="non-scaling-stroke"` for the
   * same reason the traces do: on a pane stretched into a Graph Wall row, the
   * marks and the trace they guide must render at one weight.
   */
  private _renderGuideBands(series: GraphSeries, { startTimeMs, durationMillis }: ChartWindow) {
    if (!series.guideBands?.length) return svg``;

    const { width, height } = CHART_PANE;
    const span = series.max - series.min || 1;
    const xAt = (time: number) => ((time - startTimeMs) / durationMillis) * width;
    const yAt = (value: number) => height - ((value - series.min) / span) * height;
    const color = series.metricColor ?? series.color;

    return svg`${series.guideBands.map(
      (band) =>
        svg`${band.segments.map((segment) => {
          const left = xAt(segment.startTime);
          const right = xAt(segment.endTime);
          const top = yAt(segment.max);
          const bottom = yAt(segment.min);
          return svg`
          <rect
            class="gs-guide-mark"
            x="${left}" y="${top}"
            width="${Math.max(0, right - left)}" height="${Math.max(0, bottom - top)}"
            fill="${color}" fill-opacity="0.08"
          />
          <line class="gs-guide-mark" x1="${left}" x2="${right}" y1="${top}" y2="${top}"
                stroke="${color}" stroke-opacity="0.6" stroke-width="1"
                stroke-dasharray="6 4" vector-effect="non-scaling-stroke" />
          <line class="gs-guide-mark" x1="${left}" x2="${right}" y1="${bottom}" y2="${bottom}"
                stroke="${color}" stroke-opacity="0.6" stroke-width="1"
                stroke-dasharray="6 4" vector-effect="non-scaling-stroke" />
        `;
        })}`
    )}`;
  }

  /**
   * A series' [[Setpoint]]s: one dashed line in the metric colour per mark, with
   * the controller's deadband as a faint region around it (ADR-0048).
   *
   * The dash is looser than a band edge's rather than tighter, so a setpoint is
   * not read as a [[Limit]]. The deadband is drawn
   * without edges of its own for the same reason: `target ± tolerance` says how
   * far the metric may drift before the controller responds, and edges would
   * make it read as an [[Optimal Band]] — a preference the config does not hold.
   *
   * Each segment is drawn on its own, so a period-indexed pair — the humidifier
   * and dehumidifier thresholds are indexed by cycle as well as by stage — steps
   * at lights-on and lights-off instead of sitting at a value that was wrong for
   * half the window.
   */
  private _renderGuideLines(series: GraphSeries, { startTimeMs, durationMillis }: ChartWindow) {
    if (!series.guideLines?.length) return svg``;

    const { width, height } = CHART_PANE;
    const span = series.max - series.min || 1;
    const xAt = (time: number) => ((time - startTimeMs) / durationMillis) * width;
    const yAt = (value: number) => height - ((value - series.min) / span) * height;
    const color = series.metricColor ?? series.color;

    return svg`${series.guideLines.map(
      (line) =>
        svg`${line.segments.map((segment) => {
          const left = xAt(segment.startTime);
          const right = xAt(segment.endTime);
          const y = yAt(segment.value);
          const deadband = line.tolerance
            ? svg`<rect
                class="gs-guide-mark"
                x="${left}" y="${yAt(segment.value + line.tolerance)}"
                width="${Math.max(0, right - left)}"
                height="${Math.max(0, yAt(segment.value - line.tolerance) - yAt(segment.value + line.tolerance))}"
                fill="${color}" fill-opacity="0.05"
              />`
            : svg``;
          return svg`
          ${deadband}
          <line class="gs-guide-mark" x1="${left}" x2="${right}" y1="${y}" y2="${y}"
                stroke="${color}" stroke-opacity="0.85" stroke-width="1"
                stroke-dasharray="10 6" vector-effect="non-scaling-stroke" />
        `;
        })}`
    )}`;
  }

  /**
   * The setpoints, named.
   *
   * A setpoint's label is its **name**, not its value: a metric can carry
   * several from different sources — a fan's control target and both halves of
   * an appliance's hysteresis pair — and the thing a grower cannot recover from
   * the chart is which line is which. Values stay on the [[Optimal Band]] edges,
   * where ADR-0048 put them, rather than adding a second number per line to a
   * 180px pane.
   *
   * Anchored to the right so they cannot collide with the band labels on the
   * left, and read from the segment under the current time for the same reason a
   * stepped band's label does.
   */
  private _renderGuideLineLabelsHTML(series: GraphSeries) {
    if (!series.guideLines?.length) return '';

    const span = series.max - series.min || 1;
    const topPercent = (value: number) => (((series.max - value) / span) * 100).toFixed(3);
    const color = series.metricColor ?? series.color;

    return series.guideLines.map(
      (line) => html`
        <span
          class="gs-guide-label setpoint"
          style="top:${topPercent(line.current)}%;color:${color};"
          >${this._guideMarkLabel(line.id)}</span
        >
      `
    );
  }

  /** A guide mark's display name, falling back to its id rather than to a key path. */
  private _guideMarkLabel(id: string): string {
    const key = `guide_marks.${id}`;
    const label = this._localize(key);
    return label === key ? id : label;
  }

  /**
   * Status-coloured [[Limit]]s, using an edge chevron instead of widening the
   * axis when a boundary falls outside the visible data domain (ADR-0048).
   */
  private _renderGuideLimits(series: GraphSeries, { startTimeMs, durationMillis }: ChartWindow) {
    if (!series.guideLimits?.length) return svg``;

    const { width, height } = CHART_PANE;
    const xAt = (time: number) => ((time - startTimeMs) / durationMillis) * width;

    return svg`${series.guideLimits.map((limit) => {
      const color =
        limit.status === 'warning'
          ? STATUS_COLORS[StatusLevel.WARNING]
          : STATUS_COLORS[StatusLevel.DANGER];
      return limit.segments.map(
        (segment) => svg`<g class="gs-guide-mark">
          ${renderGuideLimitMark({
            id: limit.id,
            value: segment.value,
            min: series.min,
            max: series.max,
            width,
            height,
            color,
            x1: xAt(segment.startTime),
            x2: xAt(segment.endTime),
          })}
        </g>`
      );
    })}`;
  }

  /**
   * The band's bounds, labelled.
   *
   * HTML positioned by percentage rather than SVG text, because the pane is a
   * fixed viewBox stretched with `preserveAspectRatio="none"` — SVG text in it
   * would be squashed or blown up with the geometry, while these keep one type
   * size at any chart height. A stepped band labels the segment under the
   * current time; there is no single value for the whole window to name.
   */
  private _renderGuideLabelsHTML(series: GraphSeries) {
    if (!series.guideBands?.length) return '';

    const span = series.max - series.min || 1;
    const topPercent = (value: number) => (((series.max - value) / span) * 100).toFixed(3);
    const color = series.metricColor ?? series.color;

    return series.guideBands.map(
      (band) => html`
        <span class="gs-guide-label" style="top:${topPercent(band.current.max)}%;color:${color};"
          >${formatGuideBound(band.current.max, series.unit)}</span
        >
        <span class="gs-guide-label" style="top:${topPercent(band.current.min)}%;color:${color};"
          >${formatGuideBound(band.current.min, series.unit)}</span
        >
      `
    );
  }

  /**
   * The window's unlit stretches, shaded behind everything else.
   *
   * Drawn from the series' own `darkPeriods`, which is the same photoperiod list
   * its stepped marks are cut on — a step landing where the shading still says
   * daylight would read as a rendering glitch rather than as the boundary it is.
   * Every Env Graph gets this, including one with no target to step: a nightly
   * temperature dip is otherwise left for the grower to infer, and shading that
   * came and went with unrelated config changes would be worse than none.
   *
   * The contrast is deliberately low. It is a backdrop the gridlines and the
   * trace sit on top of, not a mark competing with them for attention.
   */
  private _renderDarkPeriods(
    darkPeriods: GraphSeries['darkPeriods'],
    { startTimeMs, durationMillis }: ChartWindow
  ) {
    if (!darkPeriods?.length) return svg``;

    const { width, height } = CHART_PANE;
    const xAt = (time: number) => ((time - startTimeMs) / durationMillis) * width;

    return svg`${darkPeriods.map((period) => {
      const left = xAt(period.startTime);
      const right = xAt(period.endTime);
      return svg`<rect
        class="gs-dark-period"
        x="${left}" y="0"
        width="${Math.max(0, right - left)}" height="${height}"
      />`;
    })}`;
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

  private _isOverlaySeries(id: string): boolean {
    return this.overlayMetrics.some((key) => id === key || id.startsWith(`${key}:`));
  }

  private _renderValueAxisLabels(series: GraphSeries[]) {
    const primary = series.find((candidate) => !this._isOverlaySeries(candidate.id));
    const secondaries = series.filter((candidate) => this._isOverlaySeries(candidate.id));
    if (!primary || secondaries.length === 0) return '';

    return html`
      <span class="gs-value-axis-label primary">${primary.title} · ${primary.unit}</span>
      <span class="gs-value-axis-label secondary">
        ${secondaries.map(
          (secondary) =>
            html`<span class="series-label" style="color:${secondary.color}"
              >${secondary.title} · ${secondary.unit}</span
            >`
        )}
      </span>
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
    ${focusRingStyles}
    ${guideLabelStyles}

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
      min-height: 24px;
    }
    .gs-env-graph-header-button {
      width: 100%;
      padding: 0;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: pointer;
    }
    .gs-env-graph-header-button *,
    .gs-legend-item *,
    .scroll-nav svg {
      pointer-events: none;
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
      touch-action: pan-y;
    }
    .gs-env-chart-container.empty {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      cursor: default;
    }
    .empty-chart-svg {
      position: absolute;
      inset: 0;
    }
    .empty-message {
      position: relative;
      z-index: 1;
    }
    .chart-svg {
      width: 100%;
      height: 100%;
      overflow: visible;
      display: block;
    }

    /* Low enough to read as unlit rather than as a mark. The theme's own text
       colour is used so the shading darkens a light theme and lightens a dark
       one, which is the direction that reads as "the lights were off" in both. */
    .gs-dark-period {
      fill: var(--primary-text-color, #e1e1e1);
      fill-opacity: 0.06;
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
    .gs-value-axis-label {
      position: absolute;
      top: 50%;
      z-index: 3;
      display: flex;
      gap: 8px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: var(--text-muted);
      pointer-events: none;
      writing-mode: vertical-rl;
      text-orientation: mixed;
      transform: translateY(-50%) rotate(180deg);
      padding: 4px 3px;
      border-radius: 6px;
      background: color-mix(
        in srgb,
        var(--card-background-color, var(--surface-color)) 78%,
        transparent
      );
      box-shadow: 0 0 8px color-mix(in srgb, var(--card-background-color) 60%, transparent);
      backdrop-filter: blur(3px);
    }
    .gs-value-axis-label.primary {
      left: 7px;
    }
    .gs-value-axis-label.secondary {
      right: 7px;
    }
    .gs-value-axis-label .series-label {
      white-space: nowrap;
    }

    /* A combined chart has no shared value ticks. Name its per-series geometry
       where a value axis would begin, before the eye reaches the traces. */
    .gs-axis-normalised {
      position: absolute;
      top: 8px;
      left: 8px;
      z-index: 3;
      padding: 3px 6px;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
      border-radius: 999px;
      background: var(--card-background-color, rgba(30, 30, 35, 0.9));
      color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
      font-size: var(--font-size-xs);
      font-weight: 600;
      letter-spacing: 0.04em;
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
      min-width: 24px;
      min-height: 24px;
      margin-right: 12px;
      padding: 0;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: start;
      font-size: 0.85rem;
      cursor: pointer;
      opacity: 0.8;
      transition: opacity 0.2s;
    }
    .gs-legend-title {
      font-weight: 500;
    }
    .gs-legend-range {
      margin-left: 5px;
      color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
      font-size: var(--font-size-xs);
      font-variant-numeric: tabular-nums;
    }
    .gs-legend-range::before {
      content: '·';
      margin-right: 5px;
    }
    .gs-legend-item:hover,
    .gs-legend-item:focus-visible {
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
      padding: 4px 10px;
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
      height: 24px;
      padding: 0;
      border: 0;
      background: transparent;
      font: inherit;
      color: var(--primary-text-color, #fff);
    }
    .scroll-nav:hover,
    .scroll-nav:focus-visible {
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
