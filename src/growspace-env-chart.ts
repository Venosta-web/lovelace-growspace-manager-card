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
  HistorySensorState,
  SensorHistories,
} from './types';
import { GraphDataTransformer } from './graph-data-transformer';
import { SENSOR_CHART_DEFAULTS, METRIC_CONFIG } from './constants';

import { consume } from '@lit/context';
import { hassContext } from './context';


@customElement('growspace-env-chart')
export class GrowspaceEnvChart extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  hass!: HomeAssistant;

  @property({ attribute: false }) device?: GrowspaceDevice;
  @property({ attribute: false }) sensorHistory: SensorHistories = {};

  @property({ type: String }) metricKey = '';
  @property({ type: String }) unit = '';
  @property({ type: String }) color = '#ffffff';
  @property({ type: String }) title = '';
  @property({ type: String }) icon = mdiMagnify;
  @property({ type: String }) range: '1h' | '6h' | '24h' | '7d' = '24h';
  @property({ type: String }) type: 'line' | 'step' = 'line';

  // For combined graphs
  @property({ type: Array }) metrics: string[] = [];
  @property({ type: Boolean }) isCombined = false;
  @property({ type: Object }) metricConfig: Record<
    string,
    { color: string; title: string; unit: string; icon?: string }
  > = {};

  @state() private _activeTooltip: TooltipData | null = null;
  @state() private _hoverTime: number | null = null;
  @state() private _canScrollLeft = false;
  @state() private _canScrollRight = false;
  @state() private _renderSeries: GraphSeries[] = []; // Cached series renamed for clarity

  private _chipsContainerRef: Ref<HTMLDivElement> = createRef();

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
      this._resizeObserver = new ResizeObserver(() => this._checkScroll());
      this._resizeObserver.observe(container);
      setTimeout(() => this._checkScroll(), 100);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
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

    metricKeys.forEach((key) => {
      const config = this.metricConfig[key] || {
        color: this.isCombined ? METRIC_CONFIG[key]?.color || '#ffffff' : this.color,
        title: this.isCombined ? METRIC_CONFIG[key]?.title || key : this.title,
        unit: this.isCombined ? METRIC_CONFIG[key]?.unit || '' : this.unit,
        icon: this.isCombined ? METRIC_CONFIG[key]?.icon || '' : this.icon,
      };

      const historySource = this.sensorHistory[key] || [];
      const dataPoints: GraphDataPoint[] = [];

      if (key === 'optimal' && historySource.length > 0) {
        // Optimal logic (Step Graph for Binary Sensor)
        const sortedHistory = [...historySource].sort(
          (a, b) => new Date(a.last_changed).getTime() - new Date(b.last_changed).getTime()
        );

        let initialState = sortedHistory[0];
        for (const h of sortedHistory) {
          const t = new Date(h.last_changed).getTime();
          if (t > startTime.getTime()) break;
          initialState = h;
        }

        if (initialState) {
          const val = initialState.state === 'on' ? 1 : 0;
          dataPoints.push({ time: startTime.getTime(), value: val });
        }

        sortedHistory.forEach((h) => {
          const t = new Date(h.last_changed).getTime();
          if (t <= startTime.getTime()) return;
          const val = h.state === 'on' ? 1 : 0;
          const reasons = h.attributes?.reasons;
          dataPoints.push({ time: t, value: val, meta: reasons ? { reasons } : undefined });
        });

        // Extend to NOW
        if (dataPoints.length > 0) {
          const last = dataPoints[dataPoints.length - 1];
          dataPoints.push({ time: now.getTime(), value: last.value });
        }
      } else if (historySource.length > 0) {
        // Standard Sensor Logic
        const sortedHistory = [...historySource].sort(
          (a, b) => new Date(a.last_changed).getTime() - new Date(b.last_changed).getTime()
        );

        let initialState = sortedHistory[0];
        for (const h of sortedHistory) {
          const t = new Date(h.last_changed).getTime();
          if (t > startTime.getTime()) break;
          initialState = h;
        }

        if (initialState) {
          const val = GraphDataTransformer.normalizeSensorValue(initialState, key);
          if (val !== undefined) {
            dataPoints.push({ time: startTime.getTime(), value: val });
          }
        }

        sortedHistory.forEach((h) => {
          const t = new Date(h.last_changed).getTime();
          if (t <= startTime.getTime()) return;
          const val = GraphDataTransformer.normalizeSensorValue(h, key);
          if (val !== undefined) {
            dataPoints.push({ time: t, value: val });
          }
        });

        // Synthesize live point
        const livePoint = GraphDataTransformer.synthesizeLiveDataPoint(
          key,
          this.device?.overview_entity_id ? { attributes: this.device } : null,
          now,
          dataPoints[dataPoints.length - 1]
        );
        if (livePoint) {
          dataPoints.push(livePoint);
        } else if (dataPoints.length > 0) {
          const last = dataPoints[dataPoints.length - 1];
          dataPoints.push({ time: now.getTime(), value: last.value, meta: last.meta });
        }
      }

      if (dataPoints.length > 0) {
        let min = Math.min(...dataPoints.map((d) => d.value));
        let max = Math.max(...dataPoints.map((d) => d.value));
        const sum = dataPoints.reduce((acc, curr) => acc + curr.value, 0);
        const avg = sum / dataPoints.length;

        // Enforce specific ranges
        if (key === 'exhaust' || key === 'humidifier' || key === 'circulation_fan') {
          min = 0;
          max = 10;
        } else if (key === 'dehumidifier') {
          min = 0;
          max = 1;
        } else if ((config as any).type === 'step') {
          min = 0;
          max = 1;
        } // Step graphs (optimal, irrigation, drain, light) are binary

        // Add padding for single graphs only
        if (!this.isCombined && max === min && (config as any).type !== 'step') {
          max += 1;
          min -= 1;
        }

        const paddedRange = max - min || 1;
        let pathStr = '';

        if ((config as any).type === 'step') {
          // Step Path
          const stepPoints: [number, number][] = [];
          if (dataPoints.length > 0) {
            const startX = ((dataPoints[0].time - startTime.getTime()) / durationMillis) * width;
            const startY = height - ((dataPoints[0].value - min) / paddedRange) * height;
            stepPoints.push([startX, startY]);

            for (let i = 1; i < dataPoints.length; i++) {
              const p = dataPoints[i];
              const x = ((p.time - startTime.getTime()) / durationMillis) * width;
              const y = height - ((p.value - min) / paddedRange) * height;
              // Step: H then V
              stepPoints.push([x, stepPoints[stepPoints.length - 1][1]]);
              stepPoints.push([x, y]);
            }
          }
          pathStr = `M ${stepPoints.map((p) => `${p[0]},${p[1]}`).join(' L ')}`;
        } else {
          // Line Path
          const points = dataPoints.map((p) => {
            const x = ((p.time - startTime.getTime()) / durationMillis) * width;
            const y = height - ((p.value - min) / paddedRange) * height;
            return [x, y];
          });
          pathStr = `M ${points.map((p) => `${p[0]},${p[1]}`).join(' L ')}`;
        }

        seriesList.push({
          id: key,
          title: config.title || key,
          color: config.color || '#fff',
          unit: config.unit || '',
          icon: config.icon || '',
          points: dataPoints,
          min,
          max,
          avg,
          path: pathStr,
          fillType: this.isCombined ? 'flat' : 'gradient',
        });
      }
    });

    return seriesList;
  }

  render() {
    if (!this.device) return html``;

    // Dimensions (internal SVG coords)
    const width = 800;
    const height = 200;
    const durationMillis = this._getDurationMillis(this.range);
    const now = new Date(); // Only for display math if needed, but series are cached
    const startTime = new Date(now.getTime() - durationMillis);

    // Use cached render series
    const series = this._renderSeries;

    if (series.length === 0) {
      return html`
        <div class="gs-env-graph-card">
          <div class="gs-env-graph-header">
            <div style="display:flex; align-items:center; gap:8px;">
              ${this.icon ? html`<ha-icon .icon=${this.icon}></ha-icon>` : ''}
              <span>${this.title || 'Graph'}</span>
            </div>
            <span style="color: #666; font-size: 0.9em;">No Data</span>
          </div>
          <div
            class="gs-env-chart-container"
            style="display: flex; align-items: center; justify-content: center; color: #444;"
          >
            No history data available for ${this.range}
          </div>
        </div>
      `;
    }

    return html`
      <div class="gs-env-graph-card">
        ${this.isCombined
        ? this._renderCombinedHeader(series)
        : this._renderSingleHeader(series[0])}

        <div
          class="gs-env-chart-container"
          @mousemove=${(e: MouseEvent) =>
        this._handleGraphHover(e, series, startTime, durationMillis, width)}
          @mouseleave=${() => {
        this._activeTooltip = null;
        this._hoverTime = null;
      }}
        >
          ${this._renderTooltip()}
          ${!this.isCombined
        ? this._renderYAxisHTML(series[0].min, series[0].max, series[0].unit)
        : ''}
          ${this._renderXAxisHTML(this.range)}

          <svg
            viewBox="0 0 ${width} ${height}"
            preserveAspectRatio="none"
            style="width: 100%; height: 100%; overflow: visible; display: block;"
          >
            ${this._renderGrid(width, height)}
            ${series.map((s: GraphSeries) => {
          if (s.fillType === 'gradient') {
            return svg`
                                    <defs>
                                        ${this._renderGradient(s.id, s.color)}
                                    </defs>
                                    <path d="${s.path} V ${height} H 0 Z" fill="url(#grad-${s.id})" />
                                    <path d="${s.path}" fill="none" stroke="${s.color}" stroke-width="2.5" />
                                `;
          } else {
            return svg`
                                     <path d="${s.path}" fill="none" stroke="${s.color}" stroke-width="2" />
                                     <!-- Optional: light fill for combined -->
                                     <path d="${s.path} V ${height} H ${s.points.length > 0 ? ((s.points[0].time - startTime.getTime()) / durationMillis) * width : 0} Z" fill="${s.color}" fill-opacity="0.1" stroke="none" />
                                `;
          }
        })}
          </svg>
        </div>
      </div>
    `;
  }

  private _renderSingleHeader(series: GraphSeries) {
    let valStr = '-';
    if (series.points.length > 0) {
      const lastPoint = series.points[series.points.length - 1];
      const val = lastPoint.value;
      const defaults = SENSOR_CHART_DEFAULTS[series.id];
      const isBinary =
        defaults?.binary === true ||
        (series.unit === 'state' && defaults?.max === undefined) ||
        series.id === 'optimal' ||
        series.id === 'dehumidifier';

      if (isBinary) {
        if (series.id === 'optimal') {
          valStr = val === 1 ? 'Optimal' : lastPoint.meta?.reasons || 'Not Optimal';
        } else {
          valStr = val === 1 ? 'ON' : 'OFF';
        }
      } else if ((series.id === 'exhaust' || series.id === 'humidifier') && lastPoint.meta?.state) {
        valStr = lastPoint.meta.state;
      } else {
        valStr = `${val.toFixed(1)} ${series.unit}`;
      }
    }

    return html`
      <div
        class="gs-env-graph-header"
        @click=${() => this.dispatchEvent(new CustomEvent('toggle-graph', { detail: series.id, bubbles: true, composed: true }))}
      >
        <div style="display:flex; align-items:center; gap:8px;">
          <div
            style="width: 24px; height: 24px; color: ${series.color}; display: flex; align-items: center; justify-content: center;"
          >
            <svg viewBox="0 0 24 24" style="width: 100%; height: 100%; fill: currentColor;">
              <path d="${series.icon || this.icon}"></path>
            </svg>
          </div>
          <span style="color: ${series.color}; font-weight: 500;">${series.title}</span>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 1.2em; font-weight: bold; color: ${series.color};">${valStr}</div>
        </div>
      </div>
    `;
  }

  private _renderCombinedHeader(seriesList: GraphSeries[]) {
    return html`
      <div class="gs-env-graph-header">
        <div style="display: flex; align-items: center; flex: 1; min-width: 0; gap: 4px;">
          ${this._canScrollLeft
        ? html`
                <div
                  class="scroll-nav left"
                  @click=${(e: Event) => {
            e.stopPropagation();
            this._scrollChips('left');
          }}
                >
                  <svg viewBox="0 0 24 24"><path d="${mdiChevronLeft}"></path></svg>
                </div>
              `
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
              this.dispatchEvent(new CustomEvent('unlink-graph', { detail: s.id, bubbles: true, composed: true }));
            }}
                >
                  <span
                    style="display:inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${s.color}; margin-right: 6px; flex-shrink: 0;"
                  ></span>
                  ${s.icon
              ? html`
                        <div
                          style="width: 16px; height: 16px; color: ${s.color}; margin-right: 4px; display: inline-flex;"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            style="width: 100%; height: 100%; fill: currentColor;"
                          >
                            <path d="${s.icon}"></path>
                          </svg>
                        </div>
                      `
              : ''}
                  <span style="color: ${s.color}; font-weight: 500;">${s.title}</span>
                </div>
              `
        )}
          </div>

          ${this._canScrollRight
        ? html`
                <div
                  class="scroll-nav right"
                  @click=${(e: Event) => {
            e.stopPropagation();
            this._scrollChips('right');
          }}
                >
                  <svg viewBox="0 0 24 24"><path d="${mdiChevronRight}"></path></svg>
                </div>
              `
        : ''}
        </div>

        </div>

        <div style="display:flex; gap: 8px; margin-left: 8px; flex-shrink: 0;">
          ${this.isCombined
        ? html`
                <ha-icon-button
                  .path=${mdiLink}
                  @click=${() => this.dispatchEvent(new CustomEvent('unlink-graphs', { detail: -1, bubbles: true, composed: true }))}
                  title="Unlink Graphs"
                ></ha-icon-button>
              `
        : ''}
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
          style="font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 2px;"
        >
          ${time}
        </div>
        ${items.map(
      (i) => html`
            <div
              style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 2px;"
            >
              <span style="color: ${i.color};">${i.title}:</span>
              <span style="font-family: monospace; font-weight: bold;">${i.value}</span>
            </div>
          `
    )}
      </div>
      <!-- Cursor Line -->
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

  private _renderGrid(width: number, height: number): TemplateResult {
    return svg`
            <!-- Simple Grid -->
            <line x1="0" y1="${height}" x2="${width}" y2="${height}" stroke="#333" stroke-width="1" />
            <line x1="0" y1="0" x2="0" y2="${height}" stroke="#333" stroke-width="1" />
            <line x1="0" y1="${height / 2}" x2="${width}" y2="${height / 2}" stroke="#333" stroke-width="0.5" stroke-dasharray="4 4" />
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

  private _renderXAxisHTML(range: string): TemplateResult {
    // Render X-Axis labels as HTML overlay
    // Container padding: 20px 40px 30px 50px (top right bottom left)
    // Labels usually at bottom. Bottom padding 30px is for these labels.
    // We want them effectively at bottom: 10px?

    const labelStyle =
      'position: absolute; bottom: 8px; font-size: 10px; color: #666; line-height: 1; pointer-events: none;';

    return html`
      <div style="${labelStyle} left: 50px;">-${range}</div>
      <div style="${labelStyle} right: 40px;">Now</div>
    `;
  }

  private _renderYAxisHTML(min: number, max: number, unit: string): TemplateResult {
    // Render Y-Axis labels as HTML overlay to avoid SVG scaling distortion
    // Container has padding: 20px 40px 30px 50px
    // Top label at top of graph area (20px)
    // Bottom label at bottom of graph area (20px + 100% height = approx bottom)
    // Graph area height is 180px, defined by container height (which is content-box by default?)
    // Let's assume standard box model. Height 180px is strictly the graph area?
    // No, CSS says height: 180px and padding.
    // If box-sizing is border-box (common in frameworks), height 180 includes padding. Graph area = 180 - 20 - 30 = 130px.
    // If box-sizing is content-box (default), height 180 is graph area.
    // In HA/Lit, usually we rely on user agent defaults unless reset.
    // Let's assume content-box for now as that's standard CSS.
    // Even if it's border-box, we can use percentages.

    const labelStyle =
      'position: absolute; left: 4px; width: 40px; text-align: right; font-size: 10px; color: #aaa; line-height: 1; pointer-events: none;';

    if (unit === 'state' || (max === 1 && min === 0)) {
      return html`
        <div style="${labelStyle} top: 20px;">ON</div>
        <div style="${labelStyle} bottom: 30px;">OFF</div>
      `;
    }

    return html`
      <div style="${labelStyle} top: 20px;">${max}${unit}</div>
      <div style="${labelStyle} top: 50%; transform: translateY(-5px);">
        ${((max + min) / 2).toFixed(1)}
      </div>
      <div style="${labelStyle} bottom: 30px;">${min}${unit}</div>
    `;
  }

  private _getDurationMillis(range: string): number {
    if (range === '1h') return 60 * 60 * 1000;
    if (range === '6h') return 6 * 60 * 60 * 1000;
    if (range === '7d') return 7 * 24 * 60 * 60 * 1000;
    return 24 * 60 * 60 * 1000;
  }

  private _toggleEnvGraph() {
    this.dispatchEvent(new CustomEvent('toggle-graph', { detail: this.metricKey, bubbles: true, composed: true }));
  }

  private _unlinkGraphs(groupIndex: number) {
    this.dispatchEvent(new CustomEvent('unlink-graphs', { detail: groupIndex, bubbles: true, composed: true }));
  }

  protected willUpdate(changedProperties: PropertyValues) {
    if (
      changedProperties.has('device') ||
      changedProperties.has('sensorHistory') ||
      changedProperties.has('range') ||
      changedProperties.has('metricKey') ||
      changedProperties.has('metrics') ||
      changedProperties.has('isCombined') ||
      changedProperties.has('metricConfig') ||
      changedProperties.has('type') ||
      changedProperties.has('color') ||
      changedProperties.has('unit') ||
      changedProperties.has('title') ||
      changedProperties.has('icon')
    ) {
      const durationMillis = this._getDurationMillis(this.range);
      const now = new Date();
      const startTime = new Date(now.getTime() - durationMillis);
      const width = 800;
      const height = 200;

      this._renderSeries = this._computeGraphSeries(width, height, startTime, durationMillis, now);
    }
  }

  private _handleGraphHover(
    e: MouseEvent,
    seriesList: GraphSeries[],
    startTime: Date,
    durationMillis: number,
    width: number
  ) {
    const rect = (e.currentTarget as Element).getBoundingClientRect();
    const contentWidth = rect.width - 90; // 50px left + 40px right padding
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left - 50) / contentWidth));

    const hoverTime = startTime.getTime() + relX * durationMillis;

    // Find closest points and format values
    const items = seriesList.map((s) => {
      // Binary search (nearest neighbor)
      const searchTime = hoverTime;
      let closest = s.points[0];
      let minDiff = Number.MAX_VALUE;

      let lo = 0;
      let hi = s.points.length - 1;

      if (s.points.length > 0) {
        while (lo < hi) {
          const mid = Math.floor((lo + hi) / 2);
          if (s.points[mid].time < searchTime) {
            lo = mid + 1;
          } else {
            hi = mid;
          }
        }
        const candidates = [lo, lo - 1, lo + 1].filter((i) => i >= 0 && i < s.points.length);
        candidates.forEach((i) => {
          const p = s.points[i];
          const diff = Math.abs(p.time - searchTime);
          if (diff < minDiff) {
            minDiff = diff;
            closest = p;
          }
        });
      }

      // Format Value
      const defaults = SENSOR_CHART_DEFAULTS[s.id];
      const isBinary =
        defaults?.binary === true ||
        (s.unit === 'state' && defaults?.max === undefined) ||
        s.id === 'optimal' ||
        s.id === 'dehumidifier';

      let valStr = `${closest.value.toFixed(1)} ${s.unit}`;

      if (isBinary) {
        if (s.id === 'optimal') {
          if (closest.value === 1) valStr = 'Optimal';
          else valStr = closest.meta?.reasons || 'Not Optimal';
        } else if (s.id === 'dehumidifier') {
          valStr = closest.value === 1 ? 'ON' : 'OFF';
        } else {
          valStr = closest.value === 1 ? 'ON' : 'OFF';
        }
      } else if ((s.id === 'exhaust' || s.id === 'humidifier') && closest.meta?.state) {
        valStr = closest.meta.state;
      }

      return { title: s.title, value: valStr, color: s.color };
    });

    const locale = this.hass?.locale?.language || undefined;
    const timeStr = new Date(hoverTime).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });

    this._activeTooltip = {
      id: 'hover',
      x: e.clientX - rect.left,
      time: timeStr,
      items,
    };
    this._hoverTime = hoverTime;
  }

  private _formatTime(date: Date): string {
    const locale = this.hass?.locale?.language || undefined;
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    .gs-env-graph-card {
      margin-top: 12px;
      background: #1a1a1a;
      border-radius: 12px;
      padding: 16px;
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
      height: 180px;
      background: #0d0d0d;
      border-radius: 8px;
      padding: 20px 40px 30px 50px;
      cursor: crosshair;
    }

    .gs-tooltip {
      position: absolute;
      background: rgba(30, 30, 35, 0.9);
      color: #fff;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 0.75rem;
      pointer-events: none;
      transform: translate(-50%, 0);
      z-index: 1000;
      white-space: nowrap;
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
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
      scrollbar-width: none; /* Firefox */
      -ms-overflow-style: none; /* IE/Edge */
      scroll-behavior: smooth;
      flex: 1;
      min-width: 0;
      /* Removed static mask */
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
      color: #fff;
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
  `;
}
