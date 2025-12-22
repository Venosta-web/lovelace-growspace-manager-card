import { LitElement, html, css, svg, TemplateResult, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { mdiMagnify, mdiLink, mdiChevronLeft, mdiChevronRight } from '@mdi/js';
import { createRef, ref, Ref } from 'lit/directives/ref.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import {
  GrowspaceDevice,
  GraphSeries,
  TooltipData,
  GraphDataPoint,
  SensorHistories,
} from './types';
import { ChartUtils } from './utils/chart-utils';
import { GraphDataTransformer } from './graph-data-transformer';
import { SENSOR_CHART_DEFAULTS, METRIC_CONFIG, DEFAULTS } from './constants';

import { consume } from '@lit/context';
import { hassContext } from './context';

@customElement('growspace-env-chart')
export class GrowspaceEnvChart extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  accessor hass!: HomeAssistant;

  @property({ attribute: false }) accessor device: GrowspaceDevice | undefined;
  @property({ attribute: false }) accessor sensorHistory: SensorHistories = {};

  @property({ type: String }) accessor metricKey = '';
  @property({ type: String }) accessor unit = '';
  @property({ type: String }) accessor color = '#ffffff';
  @property({ type: String }) accessor title = '';
  @property({ type: String }) accessor icon = mdiMagnify;
  @property({ type: String }) accessor range: '1h' | '6h' | '24h' | '7d' = '24h';
  @property({ type: String }) accessor type: 'line' | 'step' = 'line';

  // For combined graphs
  @property({ type: Array }) accessor metrics: string[] = [];
  @property({ type: Boolean }) accessor isCombined = false;
  @property({ type: Object }) accessor metricConfig: Record<
    string,
    { color: string; title: string; unit: string; icon?: string }
  > = {};

  @state() private accessor _activeTooltip: TooltipData | null = null;
  @state() private accessor _hoverTime: number | null = null;
  @state() private accessor _canScrollLeft = false;
  @state() private accessor _canScrollRight = false;
  @state() private accessor _renderSeries: GraphSeries[] = [];

  private _chipsContainerRef: Ref<HTMLDivElement> = createRef();
  private _chartContainerRef: Ref<HTMLDivElement> = createRef();
  private _scrollCheckTimeout: number | undefined;

  // Optimization: Cache bounding rect for tooltip
  private _cachedChartRect: DOMRect | null = null;
  private _tooltipRafId: number | null = null;

  private _scrollChips(direction: 'left' | 'right') {
    const container = this._chipsContainerRef.value;
    if (container) {
      container.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
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

  firstUpdated() {
    const container = this._chipsContainerRef.value;
    if (container) {
      container.addEventListener('scroll', () => this._checkScroll());
      this._resizeObserver = new ResizeObserver(() => {
        this._checkScroll();
        this._invalidateRectCache();
      });
      this._resizeObserver.observe(container);
      this._scrollCheckTimeout = window.setTimeout(() => this._checkScroll(), 100);
    }

    // Observer for chart container to update cached rect
    const chartContainer = this._chartContainerRef.value;
    if (chartContainer) {
      const chartObserver = new ResizeObserver(() => {
        this._invalidateRectCache();
      });
      chartObserver.observe(chartContainer);
      // Also invalidate on window scroll/resize globally
      window.addEventListener('scroll', this._invalidateRectCacheBound, { passive: true });
      window.addEventListener('resize', this._invalidateRectCacheBound, { passive: true });
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._resizeObserver) this._resizeObserver.disconnect();
    if (this._scrollCheckTimeout) clearTimeout(this._scrollCheckTimeout);
    if (this._tooltipRafId) cancelAnimationFrame(this._tooltipRafId);

    window.removeEventListener('scroll', this._invalidateRectCacheBound);
    window.removeEventListener('resize', this._invalidateRectCacheBound);
  }

  private _invalidateRectCacheBound = () => this._invalidateRectCache();

  private _invalidateRectCache() {
    this._cachedChartRect = null;
  }

  private _getVpdThresholds() {
    const defaultThresholds = {
      targetMin: DEFAULTS.VPD.TARGET_MIN,
      targetMax: DEFAULTS.VPD.TARGET_MAX,
      dangerMin: DEFAULTS.VPD.DANGER_MIN,
      dangerMax: DEFAULTS.VPD.DANGER_MAX,
    };

    const overviewEntity = this.device?.overview_entity_id
      ? this.hass?.states[this.device.overview_entity_id]
      : null;

    if (!overviewEntity?.attributes) return { day: defaultThresholds, night: defaultThresholds };

    const attrs = overviewEntity.attributes;

    // Day targets
    const day = {
      targetMin: attrs.day_vpd_target_min ?? attrs.vpd_target_min ?? DEFAULTS.VPD.TARGET_MIN,
      targetMax: attrs.day_vpd_target_max ?? attrs.vpd_target_max ?? DEFAULTS.VPD.TARGET_MAX,
      dangerMin: attrs.day_vpd_danger_min ?? attrs.vpd_danger_min ?? DEFAULTS.VPD.DANGER_MIN,
      dangerMax: attrs.day_vpd_danger_max ?? attrs.vpd_danger_max ?? DEFAULTS.VPD.DANGER_MAX,
    };

    // Night targets - use day values as sensible defaults if night not explicitly configured
    // This is intentional default behavior, not backward compatibility
    const night = {
      targetMin: attrs.night_vpd_target_min ?? day.targetMin,
      targetMax: attrs.night_vpd_target_max ?? day.targetMax,
      dangerMin: attrs.night_vpd_danger_min ?? day.dangerMin,
      dangerMax: attrs.night_vpd_danger_max ?? day.dangerMax,
    };

    return { day, night };
  }

  private _getVpdStatusForValue(value: number, thresholds: ReturnType<typeof this._getVpdThresholds>, isDay: boolean): string {
    const t = isDay ? thresholds.day : thresholds.night;
    if (value < t.dangerMin || value > t.dangerMax) return 'danger';
    if (value < t.targetMin || value > t.targetMax) return 'warning';
    return 'optimal';
  }

  private _getVpdStatusColor(status: string): string {
    switch (status) {
      case 'optimal': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'danger': return '#f44336';
      default: return '#9c27b0';
    }
  }

  private _generateVpdSegments(
    points: Array<{ x: number; y: number; value: number; time: number }>,
    thresholds: ReturnType<typeof this._getVpdThresholds>,
    lightHistory: GraphDataPoint[]
  ): Array<{ path: string; color: string }> {
    if (points.length < 2) return [];

    const segments: Array<{ path: string; color: string }> = [];
    let currentSegment: typeof points = [];

    // Helper to determine day/night at a specific time
    // using ChartUtils.getIsDay to ensure consistent logic with sparklines

    let isDay = ChartUtils.getIsDay(points[0].time, lightHistory);
    let currentStatus = this._getVpdStatusForValue(points[0].value, thresholds, isDay);

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const pIsDay = ChartUtils.getIsDay(p.time, lightHistory);
      const status = this._getVpdStatusForValue(p.value, thresholds, pIsDay);

      if (status === currentStatus) {
        currentSegment.push(p);
      } else {
        if (currentSegment.length >= 1) {
          currentSegment.push(p);
          const pathStr = `M ${currentSegment.map(pt => `${pt.x},${pt.y}`).join(' L ')}`;
          segments.push({ path: pathStr, color: this._getVpdStatusColor(currentStatus) });
        }
        currentSegment = [p];
        currentStatus = status;
      }
    }
    if (currentSegment.length >= 2) {
      const pathStr = `M ${currentSegment.map(pt => `${pt.x},${pt.y}`).join(' L ')}`;
      segments.push({ path: pathStr, color: this._getVpdStatusColor(currentStatus) });
    }
    return segments;
  }

  private _computeGraphSeries(
    width: number,
    height: number,
    startTime: Date,
    durationMillis: number,
    now: Date
  ): GraphSeries[] {
    const metricKeys = this.isCombined ? this.metrics : [this.metricKey];
    const seriesList: GraphSeries[] = [];
    const startTimeMs = startTime.getTime();
    const nowMs = now.getTime();

    // Prepare Light History for VPD calculation if needed
    let lightHistoryPoints: GraphDataPoint[] = [];
    if (metricKeys.includes('vpd') && this.sensorHistory['light']) {
      lightHistoryPoints = ChartUtils.normalizeHistory(
        this.sensorHistory['light'],
        'light',
        startTimeMs, // Although normalizeHistory signature might ignore these args currently, passing them is good practice
        nowMs
      );
    }

    metricKeys.forEach((key) => {
      const config = this.metricConfig[key] || {
        color: this.isCombined ? METRIC_CONFIG[key]?.color || '#ffffff' : this.color,
        title: this.isCombined ? METRIC_CONFIG[key]?.title || key : this.title,
        unit: this.isCombined ? METRIC_CONFIG[key]?.unit || '' : this.unit,
        icon: this.isCombined ? METRIC_CONFIG[key]?.icon || '' : this.icon,
      };

      const historySource = this.sensorHistory[key] || [];
      if (historySource.length === 0) return;

      const dataPoints: GraphDataPoint[] = [];
      let initialState = historySource[0];

      for (const h of historySource) {
        if (new Date(h.last_changed).getTime() > startTimeMs) break;
        initialState = h;
      }

      if (initialState) {
        const val = key === 'optimal' || initialState.state === 'on' ? (initialState.state === 'on' ? 1 : 0) : GraphDataTransformer.normalizeSensorValue(initialState, key);
        if (val !== undefined) dataPoints.push({ time: startTimeMs, value: val });
      }

      const len = historySource.length;
      for (let i = 0; i < len; i++) {
        const h = historySource[i];
        const t = new Date(h.last_changed).getTime();
        if (t <= startTimeMs) continue;

        let val: number | undefined;
        if (key === 'optimal') {
          val = h.state === 'on' ? 1 : 0;
          if (h.attributes?.reasons) dataPoints.push({ time: t, value: val, meta: { reasons: h.attributes.reasons } });
          else dataPoints.push({ time: t, value: val });
        } else {
          val = GraphDataTransformer.normalizeSensorValue(h, key);
          if (val !== undefined) dataPoints.push({ time: t, value: val });
        }
      }

      if (dataPoints.length > 0) {
        const last = dataPoints[dataPoints.length - 1];
        dataPoints.push({ time: nowMs, value: last.value, meta: last.meta });
      }

      if (dataPoints.length > 0) {
        let min = Math.min(...dataPoints.map((d) => d.value));
        let max = Math.max(...dataPoints.map((d) => d.value));
        const sum = dataPoints.reduce((acc, curr) => acc + curr.value, 0);
        const avg = sum / dataPoints.length;

        const isStep = (config as any).type === 'step' || key === 'optimal' || key === 'dehumidifier' || key === 'light' || key === 'irrigation' || key === 'drain';
        if (key === 'exhaust' || key === 'humidifier' || key === 'circulation_fan') { min = 0; max = 10; }
        else if (key === 'dehumidifier') { min = 0; max = 1; }
        else if (isStep) { min = 0; max = 1; }

        if (!this.isCombined && max === min && !isStep) { max += 1; min -= 1; }

        const paddedRange = max - min || 1;

        const pathStr = ChartUtils.generatePathFromValues(
          dataPoints,
          width,
          height,
          {
            min, max,
            startTime: startTimeMs,
            endTime: startTimeMs + durationMillis,
            type: isStep ? 'step' : 'line',
            timeRange: this.range
          }
        );

        let vpdSegments;
        let seriesColor = config.color || '#fff';

        if (key === 'vpd') {
          const thresholds = this._getVpdThresholds();
          const vpdPoints = dataPoints.map((p) => ({
            x: ((p.time - startTimeMs) / durationMillis) * width,
            y: height - ((p.value - min) / paddedRange) * height,
            value: p.value,
            time: p.time
          }));
          vpdSegments = this._generateVpdSegments(vpdPoints, thresholds, lightHistoryPoints);

          if (dataPoints.length > 0) {
            // Determine current status (last point)
            const lastPoint = dataPoints[dataPoints.length - 1];
            // Get current light state for last point color
            // Or just rely on current environment active state? 
            // Better to match the graph logic:
            let isDay = true;
            if (lightHistoryPoints.length > 0) {
              const lastLight = lightHistoryPoints[lightHistoryPoints.length - 1];
              // If last light point is recent enough... usually it covers 'now'
              isDay = lastLight.value === 1;
            }
            seriesColor = this._getVpdStatusColor(this._getVpdStatusForValue(lastPoint.value, thresholds, isDay));
          }
        }

        seriesList.push({
          id: key,
          title: config.title || key,
          color: seriesColor,
          unit: config.unit || '',
          icon: config.icon || '',
          points: dataPoints,
          min, max, avg, path: pathStr,
          fillType: this.isCombined ? 'flat' : 'gradient',
          vpdSegments,
        });
      }
    });

    return seriesList;
  }

  protected willUpdate(changedProperties: PropertyValues) {
    if (
      changedProperties.has('device') ||
      changedProperties.has('sensorHistory') ||
      changedProperties.has('range') ||
      changedProperties.has('metricKey') ||
      changedProperties.has('metrics') ||
      changedProperties.has('isCombined')
    ) {
      let needsUpdate = true;

      if (changedProperties.has('sensorHistory') && changedProperties.size === 1) {
        const metricKeys = this.isCombined ? this.metrics : [this.metricKey];
        const oldHist = changedProperties.get('sensorHistory') as SensorHistories | undefined;

        if (oldHist) {
          let allSame = true;
          for (const k of metricKeys) {
            if (this.sensorHistory[k] !== oldHist[k]) {
              allSame = false;
              break;
            }
          }
          if (allSame) needsUpdate = false;
        }
      }

      if (needsUpdate) {
        const durationMillis = this._getDurationMillis(this.range);
        const now = new Date();
        const startTime = new Date(now.getTime() - durationMillis);
        this._renderSeries = this._computeGraphSeries(800, 200, startTime, durationMillis, now);
      }
    }
  }

  render() {
    if (!this.device) return html``;

    const width = 800;
    const height = 200;
    const durationMillis = this._getDurationMillis(this.range);
    const now = new Date();
    const startTime = new Date(now.getTime() - durationMillis);
    const series = this._renderSeries;

    if (series.length === 0) {
      return html`
        <div class="gs-env-graph-card">
          <div class="gs-env-graph-header">
             <div style="display:flex; align-items:center; gap:8px;">
               ${this.icon ? html`<ha-icon .icon=${this.icon}></ha-icon>` : ''}
               <span>${this.title || 'Graph'}</span>
             </div>
             <span style="opacity:0.6; font-size:0.9em">No Data</span>
          </div>
          <div class="gs-env-chart-container empty">No history data available for ${this.range}</div>
        </div>
      `;
    }

    return html`
      <div class="gs-env-graph-card">
        ${this.isCombined ? this._renderCombinedHeader(series) : this._renderSingleHeader(series[0])}

        <div
          class="gs-env-chart-container"
          ${ref(this._chartContainerRef)}
          @mousemove=${(e: MouseEvent) => this._onMouseMove(e, series, startTime, durationMillis)}
          @mouseleave=${this._onMouseLeave}
        >
          ${this._renderTooltip()}
          ${!this.isCombined ? this._renderYAxisHTML(series[0].min, series[0].max, series[0].unit) : ''}
          ${this._renderXAxisHTML(this.range)}

          <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" class="chart-svg">
            ${this._renderGrid(width, height)}
            ${series.map((s) => {
      // Handle VPD segments separately (they have their own path validation)
      if (s.vpdSegments?.length) {
        return svg`${s.vpdSegments.map(seg => svg`<path d="${seg.path}" fill="none" stroke="${seg.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`)}`;
      }

      // Skip rendering regular paths if no valid path data
      if (!s.path || s.path.trim() === '' || s.points.length === 0) {
        return svg``;
      }

      return svg`
                 ${s.fillType === 'gradient' ? svg`<defs>${this._renderGradient(s.id, s.color)}</defs>` : ''}
                 ${s.fillType === 'gradient'
          ? svg`<path d="${s.path} V ${height} H 0 Z" fill="url(#grad-${s.id})" />`
          : svg`<path d="${s.path} V ${height} H ${((s.points[0].time - startTime.getTime()) / durationMillis) * width} Z" fill="${s.color}" fill-opacity="0.1" stroke="none" />`
        }
                 <path d="${s.path}" fill="none" stroke="${s.color}" stroke-width="2" vector-effect="non-scaling-stroke" />
              `;
    })}
          </svg>
        </div>
      </div>
    `;
  }

  private _onMouseMove(e: MouseEvent, seriesList: GraphSeries[], startTime: Date, durationMillis: number) {
    if (this._tooltipRafId) cancelAnimationFrame(this._tooltipRafId);

    this._tooltipRafId = requestAnimationFrame(() => {
      this._handleGraphHover(e, seriesList, startTime, durationMillis);
      this._tooltipRafId = null;
    });
  }

  private _onMouseLeave = () => {
    if (this._tooltipRafId) cancelAnimationFrame(this._tooltipRafId);
    this._activeTooltip = null;
    this._hoverTime = null;
  }

  private _handleGraphHover(e: MouseEvent, seriesList: GraphSeries[], startTime: Date, durationMillis: number) {
    if (!this._cachedChartRect) {
      const container = this._chartContainerRef.value;
      if (!container) return;
      this._cachedChartRect = container.getBoundingClientRect();
    }

    const rect = this._cachedChartRect!;
    const contentWidth = rect.width - 90;
    const mouseX = e.clientX - rect.left;

    const relX = Math.max(0, Math.min(1, (mouseX - 50) / contentWidth));
    const hoverTime = startTime.getTime() + relX * durationMillis;

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
          if (diff < minDiff) { minDiff = diff; closest = p; }
        }
      }

      let valStr = `${closest.value.toFixed(1)} ${s.unit}`;
      const defaults = SENSOR_CHART_DEFAULTS[s.id];
      const isBinary = defaults?.binary || s.id === 'optimal' || s.id === 'dehumidifier' || s.unit === 'state';

      if (isBinary) {
        if (s.id === 'optimal') valStr = closest.value === 1 ? 'Optimal' : (closest.meta?.reasons || 'Not Optimal');
        else valStr = closest.value === 1 ? 'ON' : 'OFF';
      } else if ((s.id === 'exhaust' || s.id === 'humidifier') && closest.meta?.state) {
        valStr = closest.meta.state;
      }

      return { title: s.title, value: valStr, color: s.color };
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
    let valStr = '-';
    if (series.points.length > 0) {
      const last = series.points[series.points.length - 1];
      const defaults = SENSOR_CHART_DEFAULTS[series.id];
      const isBinary = defaults?.binary || series.id === 'optimal' || series.id === 'dehumidifier' || series.id === 'light' || series.id === 'irrigation' || series.id === 'drain';

      if (isBinary) {
        if (series.id === 'optimal') valStr = last.value === 1 ? 'Optimal' : (last.meta?.reasons || 'Not Optimal');
        else valStr = last.value === 1 ? 'ON' : 'OFF';
      } else if ((series.id === 'exhaust' || series.id === 'humidifier') && last.meta?.state) {
        valStr = last.meta.state;
      } else {
        valStr = `${last.value.toFixed(1)} ${series.unit}`;
      }
    }

    return html`
      <div class="gs-env-graph-header" @click=${() => this._toggleEnvGraph()}>
        <div style="display:flex; align-items:center; gap:8px;">
          <div style="width:24px; height:24px; color:${series.color}; display:flex; align-items:center; justify-content:center;">
            <svg viewBox="0 0 24 24" style="width:100%; height:100%; fill:currentColor;"><path d="${series.icon || this.icon}"></path></svg>
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
    return html`
      <div class="gs-env-graph-header">
        <div style="display: flex; align-items: center; flex: 1; min-width: 0; gap: 4px;">
          ${this._canScrollLeft ? html`<div class="scroll-nav left" @click=${(e: Event) => { e.stopPropagation(); this._scrollChips('left') }}><svg viewBox="0 0 24 24"><path d="${mdiChevronLeft}"></path></svg></div>` : ''}
          
          <div class="chips-scroll-container" ${ref(this._chipsContainerRef)} @click=${(e: Event) => e.stopPropagation()}>
            ${seriesList.map(s => html`
                <div class=${classMap({ 'gs-legend-item': true, 'mask-left': this._canScrollLeft, 'mask-right': this._canScrollRight })}
                  @click=${(e: Event) => { e.stopPropagation(); this.dispatchEvent(new CustomEvent('unlink-graph', { detail: s.id, bubbles: true, composed: true })); }}>
                  <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${s.color}; margin-right:6px; flex-shrink:0;"></span>
                  ${s.icon ? html`<div style="width:16px; height:16px; color:${s.color}; margin-right:4px; display:inline-flex;"><svg viewBox="0 0 24 24" style="width:100%; height:100%; fill:currentColor;"><path d="${s.icon}"></path></svg></div>` : ''}
                  <span style="color:${s.color}; font-weight:500;">${s.title}</span>
                </div>
            `)}
          </div>

          ${this._canScrollRight ? html`<div class="scroll-nav right" @click=${(e: Event) => { e.stopPropagation(); this._scrollChips('right') }}><svg viewBox="0 0 24 24"><path d="${mdiChevronRight}"></path></svg></div>` : ''}
        </div>
        <div style="display:flex; gap: 8px; margin-left: 8px; flex-shrink: 0;">
           <ha-icon-button .path=${mdiLink} @click=${() => this.dispatchEvent(new CustomEvent('unlink-graphs', { detail: -1, bubbles: true, composed: true }))} title="Unlink Graphs"></ha-icon-button>
        </div>
      </div>
    `;
  }

  private _renderTooltip() {
    if (!this._activeTooltip) return html``;
    const { x, time, items } = this._activeTooltip;
    return html`
      <div class="gs-tooltip" style=${styleMap({ left: `${x}px`, top: '0' })}>
        <div style="font-weight:bold; margin-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:2px;">${time}</div>
        ${items.map(i => html`
            <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:2px;">
              <span style="color:${i.color};">${i.title}:</span>
              <span style="font-family:monospace; font-weight:bold;">${i.value}</span>
            </div>
        `)}
      </div>
      <div class="gs-cursor-line" style=${styleMap({ left: `${x}px`, height: '100%', top: '0', position: 'absolute', borderLeft: '1px dashed rgba(255,255,255,0.3)', pointerEvents: 'none' })}></div>
    `;
  }

  private _renderGrid(width: number, height: number) {
    return svg`
        <line x1="0" y1="${height}" x2="${width}" y2="${height}" stroke="var(--divider-color, #333)" stroke-width="1" />
        <line x1="0" y1="0" x2="0" y2="${height}" stroke="var(--divider-color, #333)" stroke-width="1" />
        <line x1="0" y1="${height / 2}" x2="${width}" y2="${height / 2}" stroke="var(--divider-color, #333)" stroke-width="0.5" stroke-dasharray="4 4" />
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
    const labelStyle = 'position: absolute; bottom: 8px; font-size: 10px; color: var(--secondary-text-color, #666); line-height: 1; pointer-events: none;';
    return html`<div style="${labelStyle} left: 50px;">-${range}</div><div style="${labelStyle} right: 40px;">Now</div>`;
  }

  private _renderYAxisHTML(min: number, max: number, unit: string) {
    const labelStyle = 'position: absolute; left: 4px; width: 40px; text-align: right; font-size: 10px; color: var(--secondary-text-color, #aaa); line-height: 1; pointer-events: none;';
    if (unit === 'state' || (max === 1 && min === 0)) {
      return html`<div style="${labelStyle} top: 20px;">ON</div><div style="${labelStyle} bottom: 30px;">OFF</div>`;
    }
    return html`
      <div style="${labelStyle} top: 20px;">${max.toFixed(0)}${unit}</div>
      <div style="${labelStyle} top: 50%; transform: translateY(-5px);">${((max + min) / 2).toFixed(1)}</div>
      <div style="${labelStyle} bottom: 30px;">${min.toFixed(0)}${unit}</div>
    `;
  }

  private _getDurationMillis(range: string): number {
    if (range === '1h') return 3600000;
    if (range === '6h') return 21600000;
    if (range === '7d') return 604800000;
    return 86400000;
  }

  private _toggleEnvGraph() { this.dispatchEvent(new CustomEvent('toggle-graph', { detail: this.metricKey, bubbles: true, composed: true })); }

  static styles = css`
    :host { display: block; position: relative; }
    .gs-env-graph-card { margin-top: 12px; background: var(--card-background-color, #1a1a1a); border-radius: 12px; padding: 16px; contain: content; }
    .gs-env-graph-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; cursor: pointer; }
    .gs-env-chart-container { position: relative; height: 180px; background: var(--secondary-background-color, #0d0d0d); border-radius: 8px; padding: 20px 40px 30px 50px; cursor: crosshair; overflow: hidden; }
    .gs-env-chart-container.empty { display: flex; align-items: center; justify-content: center; color: var(--secondary-text-color, #444); cursor: default; }
    .chart-svg { width: 100%; height: 100%; overflow: visible; display: block; }
    
    svg path { transition: d 0.3s ease-out, stroke 0.3s ease; will-change: d; }

    .gs-tooltip { position: absolute; background: var(--card-background-color, rgba(30, 30, 35, 0.95)); color: var(--primary-text-color, #fff); padding: 8px 12px; border-radius: 8px; font-size: 0.75rem; pointer-events: none; transform: translate(-50%, 0); z-index: 100; white-space: nowrap; border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1)); backdrop-filter: blur(4px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5); line-height: 1.4; text-align: center; }
    .gs-cursor-line { position: absolute; top: 0; bottom: 0; width: 1px; background: rgba(255, 255, 255, 0.3); pointer-events: none; z-index: 5; border-left: 1px dashed rgba(255, 255, 255, 0.5); }
    
    .gs-legend-item { display: flex; align-items: center; margin-right: 12px; font-size: 0.85rem; cursor: pointer; opacity: 0.8; transition: opacity 0.2s; }
    .gs-legend-item:hover { opacity: 1; }
    
    .chips-scroll-container { display: flex; align-items: center; gap: 16px; overflow-x: auto; white-space: nowrap; scrollbar-width: none; -ms-overflow-style: none; scroll-behavior: smooth; flex: 1; min-width: 0; padding: 0 10px; transition: mask-image 0.3s; }
    .chips-scroll-container.mask-right { mask-image: linear-gradient(to right, black calc(100% - 30px), transparent 100%); -webkit-mask-image: linear-gradient(to right, black calc(100% - 30px), transparent 100%); }
    .chips-scroll-container.mask-left { mask-image: linear-gradient(to right, transparent 0%, black 30px, black 100%); -webkit-mask-image: linear-gradient(to right, transparent 0%, black 30px, black 100%); }
    .chips-scroll-container.mask-left.mask-right { mask-image: linear-gradient(to right, transparent 0%, black 30px, black calc(100% - 30px), transparent 100%); -webkit-mask-image: linear-gradient(to right, transparent 0%, black 30px, black calc(100% - 30px), transparent 100%); }
    .chips-scroll-container::-webkit-scrollbar { display: none; }
    
    .scroll-nav { display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0.5; transition: opacity 0.2s; min-width: 24px; color: var(--primary-text-color, #fff); }
    .scroll-nav:hover { opacity: 1; }
    .scroll-nav svg { width: 24px; height: 24px; fill: currentColor; }
    @media (pointer: coarse) { .scroll-nav { display: none; } }
  `;
}
