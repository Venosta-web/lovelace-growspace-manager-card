import { LitElement, html, css, svg, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { mdiMagnify, mdiLink, mdiChevronDown } from '@mdi/js';
import { GrowspaceDevice } from './types';
import { GraphDataTransformer } from './graph-data-transformer';
import { SENSOR_CHART_DEFAULTS } from './constants';

import { consume } from '@lit/context';
import { hassContext } from './context';
import { ToggleEnvGraphEvent, UnlinkGraphsEvent, UnlinkGraphMetricEvent } from './events';

import { PropertyValues } from 'lit';

export interface GraphDataPoint {
    time: number;
    value: number;
    meta?: any;
}

export interface HistorySensorState {
    entity_id: string;
    state: string;
    attributes: any;
    last_changed: string;
}

@customElement('growspace-env-chart')
export class GrowspaceEnvChart extends LitElement {
    @consume({ context: hassContext, subscribe: true })
    hass!: HomeAssistant;
    @property({ attribute: false }) device?: GrowspaceDevice;
    @property({ type: Array }) history: HistorySensorState[] = [];
    @property({ type: Array }) dehumidifierHistory: HistorySensorState[] = [];
    @property({ type: Array }) exhaustHistory: HistorySensorState[] = [];
    @property({ type: Array }) humidifierHistory: HistorySensorState[] = [];
    @property({ type: Array }) circulationFanHistory: HistorySensorState[] = [];
    @property({ type: Array }) optimalHistory: HistorySensorState[] = [];
    @property({ type: Array }) soilMoistureHistory: HistorySensorState[] = [];
    @property({ type: Array }) temperatureHistory: HistorySensorState[] = [];
    @property({ type: Array }) humidityHistory: HistorySensorState[] = [];
    @property({ type: Array }) vpdHistory: HistorySensorState[] = [];
    @property({ type: Array }) co2History: HistorySensorState[] = [];
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
    @property({ type: Object }) metricConfig: Record<string, { color: string, title: string, unit: string }> = {};

    @state() private _tooltip: { id: string; x: number; time: string; value: string } | null = null;

    // Performance: Cache layout to avoid thrashing
    private _resizeObserver: ResizeObserver | null = null;
    private _cachedRect: DOMRect | null = null;
    private _memoizedGraphData: { path: string; dataPoints: GraphDataPoint[]; minVal: number; maxVal: number; avgValue: number } | null = null;

    connectedCallback() {
        super.connectedCallback();
        this._setupResizeObserver();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
    }

    protected firstUpdated(_changedProperties: PropertyValues) {
        super.firstUpdated(_changedProperties);
        this._setupResizeObserver();
    }

    private _setupResizeObserver() {
        // Observer is set up in firstUpdated to ensure DOM exists, 
        // fallback in connectedCallback if elements already exist (e.g. moving in DOM)
        const container = this.shadowRoot?.querySelector('.gs-chart-container');
        if (container && !this._resizeObserver) {
            this._resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    this._cachedRect = entry.contentRect as DOMRect;
                    // Note: contentRect is relative to element padding, 
                    // but usually we need getBoundingClientRect for screen coords in mouse events.
                }
            });
            this._resizeObserver.observe(container);
            // Initial measuring
            this._updateCachedRect(container);
        }
    }

    private _updateCachedRect(element: Element) {
        this._cachedRect = element.getBoundingClientRect();
    }


    static styles = css`
    :host { display: block; position: relative; }
    
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


    /* Step Graph Styles-REMOVED (Unified Template) */
    
    .gs-chart-container {
        margin-top: 8px;
        height: 150px;
        position: relative;
        width: 100%;
        cursor: crosshair;
    }
    
    .gs-chart-svg {
        width: 100%;
        height: 100%;
        filter: drop-shadow(0 0 4px rgba(255, 235, 59, 0.2));
        pointer-events: none; /* Ensure events pass to container for offsetX accuracy */
    }
    
    .chart-line {
        fill: none;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
    }
    
    .chart-gradient-fill {
        opacity: 0.2;
    }
    
    .chart-markers {
        position: absolute;
        left: 50px;
        right: 40px;
        bottom: 5px;
        display: flex;
        justify-content: space-between;
        font-size: 0.65rem;
        color: #666;
        pointer-events: none; /* Ensure events pass to container */
    }
`;


    // Helper: Normalize Sensor Value
    private _normalizeSensorValue(ent: HistorySensorState, metricKey: string, unit: string): number | undefined {
        if (!ent) return undefined;

        // Use defaults if available
        const defaults = SENSOR_CHART_DEFAULTS[metricKey];

        // Special case: 'optimal' with unit 'state'
        if (unit === 'state' && metricKey === 'optimal') {
            return ent.state === 'on' ? 1 : 0;
        }

        // Special case: 'light'
        if (metricKey === 'light') {
            const isLightsOn = ent.attributes?.is_lights_on ?? ent.attributes?.observations?.is_lights_on;
            return isLightsOn === true ? 1 : 0;
        }

        // Handle configured binary sensors
        // Only treat as binary if explicitly binary OR unit is state AND no min/max range defined (e.g. exhaust is 0-10)
        if (defaults?.binary === true || (defaults?.unit === 'state' && defaults?.max === undefined)) {
            if (ent.entity_id && ent.state) {
                const onStates = ['on', 'true', '1', 'active'];
                return onStates.includes(String(ent.state).toLowerCase()) ? 1 : 0;
            }
        }

        // Special case: 'dehumidifier' legacy check
        if (metricKey === 'dehumidifier') {
            const val = ent.attributes?.dehumidifier ?? ent.attributes?.observations?.dehumidifier;
            const onValues = [true, 'on', 1];
            if (val !== undefined && onValues.includes(val)) return 1;
        }


        // Standard numeric sensors
        const numericKeys = ['temperature', 'humidity', 'vpd', 'co2', 'exhaust', 'humidifier', 'soil_moisture', 'circulation_fan'];
        if (numericKeys.includes(metricKey)) {
            if (ent.state && !isNaN(parseFloat(ent.state))) {
                return parseFloat(ent.state);
            }
            // Handle binary-like states for these devices if they appear
            if (ent.state === 'on' || ent.state === 'active') return 1;
            if (ent.state === 'off' || ent.state === 'idle') return 0;
        }

        // Fallback to attributes
        if (ent.attributes) {
            if (ent.attributes[metricKey] !== undefined) return ent.attributes[metricKey];
            if (typeof ent.attributes.observations === 'object' && ent.attributes.observations[metricKey] !== undefined) {
                return ent.attributes.observations[metricKey];
            }
        }
        return undefined;
    }

    // Helper: Get Sensor Meta
    private _getSensorMeta(ent: HistorySensorState, metricKey: string, unit: string): any {
        if (unit === 'state' && metricKey === 'optimal') return ent.attributes?.reasons;

        const defaults = SENSOR_CHART_DEFAULTS[metricKey];
        if (defaults?.binary === true || (defaults?.unit === 'state' && defaults?.max === undefined) || metricKey === 'light') {
            // For binary sensors, we might want to return 'ON'/'OFF' as meta state
            // But actually _normalizeValue returns 0/1. The render logic handles 'ON'/'OFF' label if needed.
            // If we need specific text (like "Active"), we can return it here.

            // Replicating old logic partially for safety
            if (metricKey === 'light') {
                const isLightsOn = ent.attributes?.is_lights_on ?? ent.attributes?.observations?.is_lights_on;
                return { state: isLightsOn ? 'ON' : 'OFF' };
            }
            if (metricKey === 'exhaust' || metricKey === 'humidifier') {
                const isActive = ['on', 'active', 'true', '1'].includes(String(ent.state).toLowerCase());
                return { state: isActive ? 'ON' : 'OFF' };
            }
            if (metricKey === 'dehumidifier') {
                const isActive = ['on', 'active', 'true', '1'].includes(String(ent.state).toLowerCase());
                return { state: isActive ? 'ON' : 'OFF' };
            }
        }
        return undefined;
    }

    private _findClosestDataPoint(dataPoints: GraphDataPoint[], targetTime: number): GraphDataPoint {
        if (!dataPoints || dataPoints.length === 0) return { time: targetTime, value: 0 };
        if (dataPoints.length === 1) return dataPoints[0];

        let low = 0;
        let high = dataPoints.length - 1;

        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (dataPoints[mid].time < targetTime) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }

        if (low > 0) {
            const prev = dataPoints[low - 1];
            const curr = dataPoints[low];
            if (Math.abs(prev.time - targetTime) < Math.abs(curr.time - targetTime)) {
                return prev;
            }
        }
        return dataPoints[low];
    }

    private _rafId: number | null = null;

    private _handleGraphHover(e: MouseEvent | TouchEvent, metricKey: string, dataPoints: GraphDataPoint[], _rect: DOMRect | null, unit: string) {
        // Capture x coordinate
        let x: number;
        let width: number;

        if (window.TouchEvent && e instanceof TouchEvent) {
            // For touch, we must measure because there is no offsetX
            // Touch scrolling invalidates layout anyway, so measuring is acceptable.
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            x = e.touches[0].clientX - rect.left;
            width = rect.width;
        } else {
            // For mouse, use offsetX for maximum performance and scroll stability
            // Requires pointer-events: none on children
            x = (e as MouseEvent).offsetX;
            // Width can change on resize, but constant during scroll.
            // We can use clientWidth which triggers reflow or cached width.
            // For simplicity and scroll-safety, clientWidth is cheap enough if not writing layout.
            // Or fallback to cached rect width if available?
            width = (e.currentTarget as HTMLElement).clientWidth;
        }

        // Cancel previous pending frame
        if (this._rafId) cancelAnimationFrame(this._rafId);

        this._rafId = requestAnimationFrame(() => {
            this._rafId = null;
            this._updateTooltipState(x, width, metricKey, dataPoints, unit);
        });
    }


    // Helper: Format Time respecting locale
    private _formatTime(date: Date): string {
        const locale = this.hass?.locale?.language || undefined;
        return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    }

    private _updateTooltipState(x: number, width: number, metricKey: string, dataPoints: GraphDataPoint[], unit: string) {
        const rangeKey = this.range;
        const durationMillis = rangeKey === '1h' ? 60 * 60 * 1000 :
            rangeKey === '6h' ? 6 * 60 * 60 * 1000 :
                rangeKey === '7d' ? 7 * 24 * 60 * 60 * 1000 :
                    24 * 60 * 60 * 1000;

        const now = new Date();
        const startTime = now.getTime() - durationMillis;

        // Apply offset for line graphs which have padding INSIDE the container
        let effectiveX = x;
        let effectiveWidth = width;

        // CSS for .gs-env-chart-container has padding: 20px 40px 30px 50px
        const paddingLeft = 50;
        const paddingRight = 40;
        effectiveX = x - paddingLeft;
        effectiveWidth = width - (paddingLeft + paddingRight);

        // Clamp to ensure we don't seek outside bounds
        effectiveX = Math.max(0, Math.min(effectiveX, effectiveWidth));

        const time = startTime + (effectiveX / effectiveWidth) * durationMillis;

        const closest = this._findClosestDataPoint(dataPoints, time);
        const date = new Date(closest.time);
        const timeStr = this._formatTime(date);

        let valStr = `${closest.value} ${unit} `;

        const defaults = SENSOR_CHART_DEFAULTS[metricKey];
        const isBinary = defaults?.binary || defaults?.unit === 'state' || unit === 'state';

        if (isBinary) {
            if (metricKey === 'irrigation' || metricKey === 'drain') {
                if (closest.value === 1) {
                    valStr = `ON(${closest.meta?.duration || 'Unknown'})`;
                } else {
                    valStr = 'OFF';
                }
            } else if (metricKey === 'dehumidifier' || metricKey === 'light') {
                valStr = closest.value === 1 ? 'ON' : 'OFF';
            } else if (closest.value === 1 && metricKey === 'optimal') {
                valStr = 'Optimal Conditions';
            } else if (closest.value === 0 && metricKey === 'optimal') {
                valStr = closest.meta || 'Not Optimal';
            } else {
                valStr = closest.value === 1 ? 'ON' : 'OFF';
            }
        } else if ((metricKey === 'exhaust' || metricKey === 'humidifier') && closest.meta?.state) {
            valStr = closest.meta.state;
        }

        // Throttle tooltip updates via RequestAnimationFrame (implemented in next step, 
        // for now directly updating state to maintain functionality)
        this._tooltip = {
            id: metricKey,
            x: x,
            time: timeStr,
            value: valStr
        };
    }

    private _handleCombinedGraphHover(e: MouseEvent, startTime: Date, durationMillis: number, graphData: any[], _width: number) {
        // Assume mouse event only (touch handled elsewhere or same logic if event passed)
        // Combined graph logic mirrors single graph logic

        const x = e.offsetX;
        const totalWidth = (e.currentTarget as HTMLElement).clientWidth;

        // CSS for .gs-env-chart-container has padding: 20px 40px 30px 50px
        const paddingLeft = 50;
        const paddingRight = 40;

        let effectiveX = x - paddingLeft;
        let effectiveWidth = totalWidth - (paddingLeft + paddingRight);

        // Clamp
        effectiveX = Math.max(0, Math.min(effectiveX, effectiveWidth));

        const time = startTime.getTime() + (effectiveX / effectiveWidth) * durationMillis;
        const timeStr = this._formatTime(new Date(time));

        const values = graphData.map(g => {
            // Use binary search helper
            const closest = this._findClosestDataPoint(g.points, time);
            return { ...g, value: closest.value };
        });

        this._tooltip = {
            id: 'combined-' + this.metrics.join('-'),
            x: x, // Keep tooltip visual position relative to container
            time: timeStr,
            value: JSON.stringify(values)
        };
    }


    private _toggleEnvGraph() {
        this.dispatchEvent(new ToggleEnvGraphEvent(this.metricKey));
    }

    private _unlinkGraphs(groupIndex: number) {
        this.dispatchEvent(new UnlinkGraphsEvent(groupIndex));
    }

    render() {
        if (this.isCombined) {
            return this.renderCombinedEnvGraph();
        }
        return this.renderEnvGraph();
    }


    protected willUpdate(changedProperties: PropertyValues) {
        // Invalidate memoized data if relevant inputs change
        // We only persist cache if ONLY _tooltip changed (hover interaction)
        // If hass, history, or config changes, we recalculate.
        // Optimization: We could be more granular with hass (only if relevant entities change), 
        // but checking specific entity changes is complex. 
        // The main goal is to avoid recalc during Tooltip hover loop.

        let needsRecalc = false;
        if (changedProperties.has('_tooltip')) {
            // Tooltip change alone doesn't require recalc
            // But if other things changed too, we fall through
        }

        // Check if any property OTHER than _tooltip changed
        for (const [key] of changedProperties) {
            if (key !== '_tooltip') {
                needsRecalc = true;
                break;
            }
        }

        if (needsRecalc) {
            this._memoizedGraphData = null;
        }
    }

    private _getGraphData() {
        if (this._memoizedGraphData) return this._memoizedGraphData;

        const { metricKey, unit, type, range } = this;
        // Logic extracted from renderEnvGraph

        if (!this.device) return null;

        const overviewEntity = this.device.overview_entity_id ? this.hass.states[this.device.overview_entity_id] : undefined;

        let durationMillis = 24 * 60 * 60 * 1000;
        if (range === '1h') durationMillis = 60 * 60 * 1000;
        else if (range === '6h') durationMillis = 6 * 60 * 60 * 1000;
        else if (range === '7d') durationMillis = 7 * 24 * 60 * 60 * 1000;
        const now = new Date();
        const startTime = new Date(now.getTime() - durationMillis);

        let dataPoints: GraphDataPoint[] = [];

        if (metricKey === 'irrigation' || metricKey === 'drain') {
            const times = metricKey === 'irrigation'
                ? overviewEntity?.attributes?.irrigation_times
                : overviewEntity?.attributes?.drain_times;

            // Use Transformer
            dataPoints = GraphDataTransformer.transformEventsToTimeSeries(times, startTime.getTime(), now.getTime());

        } else {
            // Refactored to use class helper methods
            const getValue = (ent: HistorySensorState, key: string) => this._normalizeSensorValue(ent, key, unit);
            const getMeta = (ent: HistorySensorState, key: string) => this._getSensorMeta(ent, key, unit);


            let historySource = this.history;
            const sortedHistory = historySource ? [...historySource].sort((a, b) => new Date(a.last_changed).getTime() - new Date(b.last_changed).getTime()) : [];
            let initialState = sortedHistory.length > 0 ? sortedHistory[0] : null;
            for (const h of sortedHistory) {
                const t = new Date(h.last_changed).getTime();
                if (t > startTime.getTime()) break;
                initialState = h;
            }

            if (initialState) {
                const val = getValue(initialState, metricKey);
                const meta = getMeta(initialState, metricKey);
                // val is already number | undefined from _normalizeSensorValue
                if (val !== undefined && !isNaN(val)) {
                    dataPoints.push({ time: startTime.getTime(), value: val, meta });
                }
            }

            sortedHistory.forEach(h => {
                const t = new Date(h.last_changed).getTime();
                if (t <= startTime.getTime()) return;
                const val = getValue(h, metricKey);
                const meta = getMeta(h, metricKey);
                // val is already number | undefined from _normalizeSensorValue
                if (val !== undefined && !isNaN(val)) {
                    dataPoints.push({ time: t, value: val, meta });
                }
            });

            // Current point synthesized logic-reduced to essential lookups
            if (metricKey === 'dehumidifier') {
                if (overviewEntity && overviewEntity.attributes.dehumidifier_state) {
                    const state = overviewEntity.attributes.dehumidifier_state;
                    const val = (state === 'on' || state === 'true' || state === '1') ? 1 : 0;
                    dataPoints.push({ time: now.getTime(), value: val, meta: { state: val ? 'ON' : 'OFF' } });
                } else if (dataPoints.length > 0) {
                    // Carry forward last known state
                    const last = dataPoints[dataPoints.length - 1];
                    dataPoints.push({ time: now.getTime(), value: last.value, meta: last.meta });
                }
            } else if (metricKey === 'exhaust' || metricKey === 'humidifier') {
                // Simplified current value lookup
                let val = metricKey === 'exhaust' ? overviewEntity?.attributes?.exhaust_value : overviewEntity?.attributes?.humidifier_value;

                if (val !== undefined) {
                    let numVal = parseFloat(val);
                    let meta: any = undefined;
                    if (isNaN(numVal)) {
                        if (String(val).toLowerCase() === 'on' || String(val).toLowerCase() === 'active') { numVal = 1; meta = { state: 'ON' }; }
                        else if (String(val).toLowerCase() === 'off' || String(val).toLowerCase() === 'idle') { numVal = 0; meta = { state: 'OFF' }; }
                    }
                    if (!isNaN(numVal)) dataPoints.push({ time: now.getTime(), value: numVal, meta });
                } else if (dataPoints.length > 0) { const last = dataPoints[dataPoints.length - 1]; dataPoints.push({ time: now.getTime(), value: last.value, meta: last.meta }); }
            }
        }

        if (dataPoints.length === 1) {
            dataPoints.unshift({
                time: startTime.getTime(),
                value: dataPoints[0].value,
                meta: dataPoints[0].meta
            });
        }

        if (dataPoints.length < 2 && type !== 'step') return null;


        const width = 1000;
        // Standardize height for all graph types to unified card size
        const height = 180;

        let minVal = 0;
        let maxVal = 1;

        const defaults = SENSOR_CHART_DEFAULTS[metricKey];

        if (unit !== 'state' && metricKey !== 'irrigation' && metricKey !== 'drain') {
            if (defaults && defaults.min !== undefined && defaults.max !== undefined) {
                minVal = defaults.min;
                maxVal = defaults.max;
            } else if (defaults && defaults.binary) {
                minVal = 0;
                maxVal = 1;
            } else {
                // Auto-scale
                if (dataPoints.length > 0) {
                    minVal = Math.min(...dataPoints.map(d => d.value));
                    maxVal = Math.max(...dataPoints.map(d => d.value));
                }
            }
        }

        const rangeVal = maxVal - minVal || 1;
        let paddedMin = minVal - (rangeVal * 0.1);
        let paddedMax = maxVal + (rangeVal * 0.1);

        if (defaults?.disablePadding) {
            paddedMin = minVal;
            paddedMax = maxVal;
        }

        const paddedRange = paddedMax - paddedMin;
        const avgValue = dataPoints.length > 0
            ? dataPoints.reduce((sum, d) => sum + d.value, 0) / dataPoints.length
            : (minVal + maxVal) / 2;

        let svgPath = "";
        if (type === 'step') {
            const points: [number, number][] = [];
            let currentState = dataPoints.length > 0 ? dataPoints[0].value : 0;
            // Guard against divide by zero if paddedRange is 0 (should use fallback 1)
            const safeRange = paddedRange === 0 ? 1 : paddedRange;

            points.push([0, height - ((currentState - paddedMin) / safeRange) * height]);

            dataPoints.forEach(d => {
                const x = ((d.time - startTime.getTime()) / durationMillis) * width;
                const y = height - ((d.value - paddedMin) / safeRange) * height;
                points.push([x, points[points.length - 1][1]]);
                points.push([x, y]);
                currentState = d.value;
            });
            points.push([width, height - ((currentState - paddedMin) / safeRange) * height]);
            svgPath = `M ${points.map(p => `${p[0]},${p[1]}`).join(' L ')} `;
        } else {
            const safeRange = paddedRange === 0 ? 1 : paddedRange;
            const points: [number, number][] = dataPoints.map(d => {
                const x = ((d.time - startTime.getTime()) / durationMillis) * width;
                const y = height - ((d.value - paddedMin) / safeRange) * height;
                return [x, y];
            });
            svgPath = `M ${points.map(p => `${p[0]},${p[1]}`).join(' L ')} `;
        }

        this._memoizedGraphData = { path: svgPath, dataPoints, minVal, maxVal, avgValue };
        return this._memoizedGraphData;
    }

    private _renderChartSvg(
        metricKey: string,
        color: string,
        height: number,
        width: number,
        paddedMin: number,
        paddedRange: number,
        avgValue: number,
        svgPath: string,
        unit: string,
        type: string
    ) {
        return html`
    <svg class="gs-chart-svg" style = "position: absolute; left: 50px; top: 20px; right: 40px; bottom: 30px; width: calc(100% - 90px); height: calc(100% - 50px); pointer-events: none;" viewBox = "0 0 ${width} ${height}" preserveAspectRatio = "none" >
        <defs>
        <linearGradient id="grad-${metricKey}" x1 = "0%" y1 = "0%" x2 = "0%" y2 = "100%" >
            <stop offset="0%" style = "stop-color:${color};stop-opacity:0.3" />
                <stop offset="100%" style = "stop-color:${color};stop-opacity:0" />
                    </linearGradient>
                    </defs>

                    <!--Vertical grid lines-->
                        <line x1="0" y1 = "0" x2 = "0" y2 = "${height}" stroke = "#333" stroke-width="1" />
                            <line x1="${width * 0.25}" y1 = "0" x2 = "${width * 0.25}" y2 = "${height}" stroke = "#222" stroke-width="1" stroke-dasharray="2,2" />
                                <line x1="${width * 0.5}" y1 = "0" x2 = "${width * 0.5}" y2 = "${height}" stroke = "#222" stroke-width="1" stroke-dasharray="2,2" />
                                    <line x1="${width * 0.75}" y1 = "0" x2 = "${width * 0.75}" y2 = "${height}" stroke = "#222" stroke-width="1" stroke-dasharray="2,2" />
                                        <line x1="${width}" y1 = "0" x2 = "${width}" y2 = "${height}" stroke = "#333" stroke-width="1" />

                                            <!--Target / average line- Only for line graphs or non- binary-->
                                                ${(type !== 'step' && avgValue) ? html`
                   <line x1="0" y1="${height - ((avgValue - paddedMin) / paddedRange) * height}" 
                         x2="${width}" y2="${height - ((avgValue - paddedMin) / paddedRange) * height}" 
                         stroke="${color}" stroke-width="1.5" stroke-dasharray="5,5" opacity="0.5" />
                 ` : ''
            }

<!--Data line and fill-->
    <path d="${svgPath} V ${height} H 0 Z" fill = "url(#grad-${metricKey})" />
        <path d="${svgPath}" fill = "none" stroke = "${color}" stroke-width="2.5" />
            </svg>
                `;
    }

    renderEnvGraph(): TemplateResult {
        const { metricKey, color, title, unit, type, icon, range } = this;

        // Restore time calculation for template usage
        const now = new Date();
        let durationMillis = 24 * 60 * 60 * 1000;
        if (range === '1h') durationMillis = 60 * 60 * 1000;
        else if (range === '6h') durationMillis = 6 * 60 * 60 * 1000;
        else if (range === '7d') durationMillis = 7 * 24 * 60 * 60 * 1000;
        const startTime = new Date(now.getTime() - durationMillis);

        const graphData = this._getGraphData();
        if (!graphData) return html``;

        const { path: svgPath, dataPoints, minVal, maxVal, avgValue } = graphData;

        // Recalculate paddedMin/Max for labels - simpler to just re-derive or store in memo? 
        // Storing in memo avoids recalc. But I didn't return them in interface.
        // I'll re-derive locally, it's cheap arithmetic compared to loop/path.

        const defaults = SENSOR_CHART_DEFAULTS[metricKey];

        const width = 1000;
        const height = 180; // Standardized height
        const rangeVal = maxVal - minVal || 1;
        let paddedMin = minVal - (rangeVal * 0.1);
        let paddedMax = maxVal + (rangeVal * 0.1);

        if (defaults?.disablePadding) {
            paddedMin = minVal;
            paddedMax = maxVal;
        }
        const paddedRange = paddedMax - paddedMin;


        let yLabels: (string | number)[] = [];
        // Only use ON/OFF labels if it's strictly binary or unit is state without range
        if (type === 'step' || (unit === 'state' && !defaults?.max) || metricKey === 'dehumidifier') {
            // Smart labels for binary/step data
            yLabels = ['ON', 'OFF'];
        } else {
            yLabels = [
                paddedMax,
                paddedMax - paddedRange * 0.25,
                paddedMax - paddedRange * 0.5,
                paddedMax - paddedRange * 0.75,
                paddedMin
            ];
        }

        return html`
            <div class="gs-env-graph-card" >
                <div class="gs-env-graph-header" @click=${this._toggleEnvGraph}>
                    <div style="display: flex; align-items: center; gap: 12px;" >
                        <svg style="width:24px;height:24px;fill:${color};" viewBox = "0 0 24 24" > <path d="${icon}" > </path></svg >
                            <div>
                            <div style="font-size: 0.9rem; font-weight: 600; color: #fff;" > ${title} </div>
                                </div>
                                </div>
                                </div>

                                <div class="gs-env-chart-container"
@mousemove=${(e: MouseEvent) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                this._handleGraphHover(e, metricKey, dataPoints, rect, unit);
            }
            }
@touchmove=${(e: TouchEvent) => {
                if (e.cancelable) e.preventDefault();
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                this._handleGraphHover(e, metricKey, dataPoints, rect, unit);
            }
            }
@touchstart=${(e: TouchEvent) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                this._handleGraphHover(e, metricKey, dataPoints, rect, unit);
            }
            }
@touchend=${() => this._tooltip = null}
@mouseleave=${() => this._tooltip = null}>

    ${this._tooltip && this._tooltip.id === metricKey ? html`
                 <div style="position: absolute; left: ${this._tooltip.x}px; top: 0; bottom: 0; width: 1px; background: ${color}80; pointer-events: none;"></div>
                 <div style="position: absolute; left: ${this._tooltip.x + 10}px; top: 20px; background: rgba(0,0,0,0.9); color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 0.75rem; border: 1px solid ${color}; pointer-events: none; z-index: 1000;">
                    <div style="color: ${color}; font-weight: 600;">${this._tooltip.time}</div>
                    <div style="margin-top: 4px;">${this._tooltip.value}</div>
                 </div>
             ` : ''
            }

<!--Y-axis labels-->
    <div style="position: absolute; left: 0; top: 20px; bottom: 30px; width: 45px; display: flex; flex-direction: column; justify-content: space-between; font-size: 0.65rem; color: #666; text-align: right; padding-right: 8px; pointer-events: none;" >
        ${yLabels.map(val => html`<div>${typeof val === 'number' ? val.toFixed(1) : val} ${typeof val === 'number' ? unit : ''}</div>`)}
</div>

    <svg class="gs-chart-svg" style="position: absolute; left: 50px; top: 20px; right: 40px; bottom: 30px; width: calc(100% - 90px); height: calc(100% - 50px); pointer-events: none;" viewBox = "0 0 1000 ${height}" preserveAspectRatio = "none" >
        <defs>
        <linearGradient id="grad-${metricKey}" x1 = "0%" y1 = "0%" x2 = "0%" y2 = "100%" >
            <stop offset="0%" style = "stop-color:${color};stop-opacity:0.3" />
                <stop offset="100%" style = "stop-color:${color};stop-opacity:0" />
                    </linearGradient>
                    </defs>

                    <!--Vertical grid lines-->
                        <line x1="0" y1 = "0" x2 = "0" y2 = "${height}" stroke = "#333" stroke - width="1" />
                            <line x1="${width * 0.25}" y1 = "0" x2 = "${width * 0.25}" y2 = "${height}" stroke = "#222" stroke - width="1" stroke - dasharray="2,2" />
                                <line x1="${width * 0.5}" y1 = "0" x2 = "${width * 0.5}" y2 = "${height}" stroke = "#222" stroke - width="1" stroke - dasharray="2,2" />
                                    <line x1="${width * 0.75}" y1 = "0" x2 = "${width * 0.75}" y2 = "${height}" stroke = "#222" stroke - width="1" stroke - dasharray="2,2" />
                                        <line x1="${width}" y1 = "0" x2 = "${width}" y2 = "${height}" stroke = "#333" stroke - width="1" />

                                            <!--Target / average line - Only for line graphs or non - binary-->
                                                ${(type !== 'step' && avgValue) ? html`
                   <line x1="0" y1="${height - ((avgValue - paddedMin) / paddedRange) * height}" 
                         x2="${width}" y2="${height - ((avgValue - paddedMin) / paddedRange) * height}" 
                         stroke="${color}" stroke-width="1.5" stroke-dasharray="5,5" opacity="0.5" />
                 ` : ''
            }

<!--Data line and fill-->
    <path d="${svgPath} V ${height} H 0 Z" fill = "url(#grad-${metricKey})" />
        <path d="${svgPath}" fill = "none" stroke = "${color}" stroke-width="2.5" />
            </svg>

            <!--X-axis markers-->
                <div class="chart-markers">
                    ${(() => {
                if (range === '1h') return html`<span>60m</span><span>45m</span><span>30m</span><span>15m</span>`;
                if (range === '6h') return html`<span>6h</span><span>4.5h</span><span>3h</span><span>1.5h</span>`;
                if (range === '7d') return html`<span>7d</span><span>5d</span><span>3d</span><span>1d</span>`;
                return html`<span>24h</span><span>18h</span><span>12h</span><span>6h</span>`;
            })()
            }
<span style="color: ${color};" > NOW </span>
    </div>
    </div>
    </div>
        `;
    }

    renderCombinedEnvGraph(): TemplateResult {
        const { metrics, metricConfig, range } = this;
        if (!this.device) return html``;

        // Determine Time Range (use range of first metric or default)
        let durationMillis = 24 * 60 * 60 * 1000;
        if (range === '1h') durationMillis = 60 * 60 * 1000;
        else if (range === '6h') durationMillis = 6 * 60 * 60 * 1000;
        else if (range === '7d') durationMillis = 7 * 24 * 60 * 60 * 1000;
        const now = new Date();
        const startTime = new Date(now.getTime() - durationMillis);

        // Prepare data for all metrics
        const graphData: {
            key: string,
            color: string,
            unit: string,
            title: string,
            points: { time: number, value: number, meta?: any }[],
            min: number,
            max: number
        }[] = [];

        metrics.forEach(metricKey => {
            const config = metricConfig[metricKey] || { color: '#fff', title: metricKey, unit: '' };

            let dataPoints: { time: number, value: number, meta?: any }[] = [];


            let historySource = this.history;
            // Use individual sensor histories for environment metrics
            if (metricKey === 'temperature') historySource = this.temperatureHistory;
            else if (metricKey === 'humidity') historySource = this.humidityHistory;
            else if (metricKey === 'vpd') historySource = this.vpdHistory;
            else if (metricKey === 'co2') historySource = this.co2History;
            else if (metricKey === 'dehumidifier') historySource = this.dehumidifierHistory;
            else if (metricKey === 'exhaust') historySource = this.exhaustHistory;
            else if (metricKey === 'humidifier') historySource = this.humidifierHistory;
            else if (metricKey === 'circulation_fan') historySource = this.circulationFanHistory;
            else if (metricKey === 'soil_moisture') historySource = this.soilMoistureHistory;
            else if (metricKey === 'optimal') historySource = this.optimalHistory;

            console.log(`[CombinedGraph] Metric: ${metricKey}, historySource length: ${historySource?.length || 0} `);
            if (historySource && historySource.length > 0) {
                console.log(`[CombinedGraph] First history entry for ${metricKey}: `, JSON.stringify(historySource[0]).slice(0, 500));
            }

            if (historySource && historySource.length > 0) {
                const sortedHistory = [...historySource].sort((a, b) => new Date(a.last_changed).getTime() - new Date(b.last_changed).getTime());

                // Refactored to use class helper methods
                const getValue = (ent: HistorySensorState, key: string) => this._normalizeSensorValue(ent, key, config.unit || ''); // Combined graph uses config unit

                // 1. Find the active state exactly AT startTime
                // We look for the latest entry that happened BEFORE or AT startTime
                let initialState = sortedHistory.length > 0 ? sortedHistory[0] : null;
                // Iterate to find the last one before start
                for (const h of sortedHistory) {
                    const t = new Date(h.last_changed).getTime();
                    if (t > startTime.getTime()) break;
                    initialState = h;
                }

                // 2. If found, add it as the anchor point at startTime
                if (initialState) {
                    const val = getValue(initialState, metricKey);
                    // const meta = getMeta(initialState, metricKey); // Combined graph doesn't use detailed meta in same way but consistent logic
                    if (val !== undefined && !isNaN(val)) {
                        dataPoints.push({ time: startTime.getTime(), value: val });
                    }
                }

                // 3. Add all points that happened AFTER startTime
                sortedHistory.forEach(h => {
                    const t = new Date(h.last_changed).getTime();
                    if (t <= startTime.getTime()) return; // Skip old points (we handled the anchor above)

                    const val = getValue(h, metricKey);
                    if (val !== undefined && !isNaN(val)) {
                        dataPoints.push({ time: t, value: val });
                    }
                });

                if (dataPoints.length > 0) {
                    const last = dataPoints[dataPoints.length - 1];
                    dataPoints.push({ time: now.getTime(), value: last.value });
                }
            }



            if (dataPoints.length > 0) {
                let min = Math.min(...dataPoints.map(d => d.value));
                let max = Math.max(...dataPoints.map(d => d.value));

                if (metricKey === 'exhaust' || metricKey === 'humidifier') {
                    min = 0;
                    max = 10;
                } else if (metricKey === 'dehumidifier') {
                    min = 0;
                    max = 1;
                }

                graphData.push({
                    key: metricKey,
                    ...config,
                    points: dataPoints,
                    min,
                    max
                });
            }
        });

        if (graphData.length === 0) return html``;

        const width = 1000;
        const height = 180;

        return html`
    <div class="gs-env-graph-card">
        <div class="gs-env-graph-header">
            <div style="display: flex; align-items: center; gap: 12px;" >
                ${graphData.map((g, i) => html`
                    ${i > 0 ? html`
                        <div class="link-icon" style="opacity: 0.8; cursor: pointer;" 
                             @click=${() => {
                    // Find group index logic would be needed here or passed down
                    // For now, we'll dispatch an event with the key
                    this.dispatchEvent(new UnlinkGraphMetricEvent(g.key));
                }}
                             title="Unlink Graph">
                             <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: #fff;"><path d="${mdiLink}"></path></svg>
                        </div>
                    ` : ''}
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background: ${g.color};"></div>
                        <div style="font-size: 0.9rem; font-weight: 600; color: #fff;">${g.title}</div>
                    </div>
                 `)
            }
</div>
    </div>

    <div class="gs-env-chart-container"
@mousemove=${(e: MouseEvent) => this._handleCombinedGraphHover(e, startTime, durationMillis, graphData, width)}
@mouseleave=${() => this._tooltip = null}>

    ${this._tooltip && this._tooltip.id === 'combined-' + metrics.join('-') ? html`
                 <div style="position: absolute; left: ${this._tooltip.x}px; top: 0; bottom: 0; width: 1px; background: rgba(255,255,255,0.2); pointer-events: none;"></div>
                 <div style="position: absolute; left: ${Math.min(this._tooltip.x + 10, width - 150)}px; top: 20px; background: rgba(0,0,0,0.9); color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 0.75rem; border: 1px solid rgba(255,255,255,0.1); pointer-events: none; z-index: 1000;">
                    <div style="font-weight: 600; margin-bottom: 4px;">${this._tooltip.time}</div>
                    ${(() => {
                    try {
                        const values = JSON.parse(this._tooltip.value);
                        return values.map((v: any) => html`
                                <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                                    <div style="width: 8px; height: 8px; border-radius: 50%; background: ${v.color};"></div>
                                    <span style="color: rgba(255,255,255,0.7);">${v.title}:</span>
                                    <span style="font-weight: 500;">${v.value} ${v.unit}</span>
                                </div>
                            `);
                    } catch { return html``; }
                })()}
                 </div>
             ` : ''
            }

<svg style="position: absolute; left: 50px; top: 20px; right: 40px; bottom: 30px; width: calc(100% - 90px); height: calc(100% - 50px); pointer-events: none;" viewBox = "0 0 1000 ${height}" preserveAspectRatio = "none" >
    <line x1="0" y1 = "0" x2 = "0" y2 = "${height}" stroke = "#333" stroke-width="1" />
        <line x1="${width}" y1 = "0" x2 = "${width}" y2 = "${height}" stroke = "#333" stroke-width="1" />
            <line x1="0" y1 = "${height}" x2 = "${width}" y2 = "${height}" stroke = "#333" stroke-width="1" />

                ${graphData.map(g => {
                const defaults = SENSOR_CHART_DEFAULTS[g.key];
                const range = g.max - g.min || 1;
                let paddedMin = g.min - (range * 0.1);
                let paddedMax = g.max + (range * 0.1);

                if (defaults?.disablePadding) {
                    paddedMin = g.min;
                    paddedMax = g.max;
                }

                const paddedRange = paddedMax - paddedMin;

                const points = g.points.map(p => {
                    const x = ((p.time - startTime.getTime()) / durationMillis) * width;
                    const y = height - ((p.value - paddedMin) / paddedRange) * height;
                    return [x, y];
                });

                const path = `M ${points.map(p => `${p[0]},${p[1]}`).join(' L ')}`;
                return svg`
                         <path d="${path}" fill="none" stroke="${g.color}" stroke-width="2" />
                         <path d="${path} V ${height} H ${points[0][0]} Z" fill="${g.color}" fill-opacity="0.1" stroke="none" />
                     `;
            })
            }
</svg>

    <div class="chart-markers">
        ${(() => {
                if (range === '1h') return html`<span>60m</span><span>45m</span><span>30m</span><span>15m</span>`;
                if (range === '6h') return html`<span>6h</span><span>4.5h</span><span>3h</span><span>1.5h</span>`;
                if (range === '7d') return html`<span>7d</span><span>5d</span><span>3d</span><span>1d</span>`;
                return html`<span>24h</span><span>18h</span><span>12h</span><span>6h</span>`;
            })()
            }
<span style="color: #fff;" > NOW </span>
    </div>
    </div>
    </div>
        `;
    }
}
