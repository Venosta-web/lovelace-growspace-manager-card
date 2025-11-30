import { LitElement, html, css, svg, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { mdiMagnify, mdiLink, mdiChevronDown } from '@mdi/js';
import { GrowspaceDevice } from './types';

@customElement('growspace-env-chart')
export class GrowspaceEnvChart extends LitElement {
    @property({ attribute: false }) hass!: HomeAssistant;
    @property({ attribute: false }) device?: GrowspaceDevice;
    @property({ type: Array }) history: any[] = [];
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

    .chart-markers {
      position: absolute;
      left: 50px;
      right: 40px;
      bottom: 5px;
      display: flex;
      justify-content: space-between;
      font-size: 0.65rem;
      color: #666;
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
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
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

    /* Step Graph Styles */
    .gs-light-cycle-card {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 16px;
      padding: 20px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: all 0.3s ease;
      margin-top: 12px;
    }

    .gs-light-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      cursor: pointer;
    }

    .gs-light-title {
       font-size: 1.5rem;
       font-weight: 600;
       display: flex;
       align-items: center;
       gap: 12px;
       color: #fff;
    }

    .gs-icon-box {
      border-radius: 14px;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .gs-light-subtitle {
      font-size: 0.75rem;
      opacity: 0.5;
      font-weight: 500;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-top: 4px;
    }
    
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
  `;

    private _handleGraphHover(e: MouseEvent, metricKey: string, dataPoints: any[], rect: DOMRect, unit: string) {
        const x = e.clientX - rect.left;
        const width = rect.width;

        // Determine range
        const rangeKey = this.range;
        const durationMillis = rangeKey === '1h' ? 60 * 60 * 1000 :
            rangeKey === '6h' ? 6 * 60 * 60 * 1000 :
                rangeKey === '7d' ? 7 * 24 * 60 * 60 * 1000 :
                    24 * 60 * 60 * 1000;

        const now = new Date();
        const startTime = now.getTime() - durationMillis;

        // Calculate time from x position
        const time = startTime + (x / width) * durationMillis;

        // Find closest data point
        let closest = dataPoints[0];
        let minDiff = Math.abs(dataPoints[0].time - time);

        for (let i = 1; i < dataPoints.length; i++) {
            const diff = Math.abs(dataPoints[i].time - time);
            if (diff < minDiff) {
                minDiff = diff;
                closest = dataPoints[i];
            }
        }

        const date = new Date(closest.time);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let valStr = `${closest.value} ${unit}`;
        if (unit === 'state') {
            if (metricKey === 'irrigation' || metricKey === 'drain') {
                if (closest.value === 1) {
                    valStr = `ON (${closest.meta?.duration || 'Unknown'})`;
                } else {
                    valStr = 'OFF';
                }
            } else if (metricKey === 'dehumidifier' || metricKey === 'light') {
                valStr = closest.value === 1 ? 'ON' : 'OFF';
            } else if (closest.value === 1) {
                valStr = 'Optimal Conditions';
            } else {
                valStr = closest.meta || 'Not Optimal';
            }
        }

        this._tooltip = {
            id: metricKey,
            x: x,
            time: timeStr,
            value: valStr
        };
    }

    private _handleCombinedGraphHover(e: MouseEvent, startTime: Date, durationMillis: number, graphData: any[], width: number) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = startTime.getTime() + (x / rect.width) * durationMillis;
        const timeStr = new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const values = graphData.map(g => {
            let closest = g.points[0];
            let minDiff = Math.abs(g.points[0].time - time);
            for (let i = 1; i < g.points.length; i++) {
                const diff = Math.abs(g.points[i].time - time);
                if (diff < minDiff) { minDiff = diff; closest = g.points[i]; }
            }
            return { ...g, value: closest.value };
        });

        this._tooltip = {
            id: 'combined-' + this.metrics.join('-'),
            x: x,
            time: timeStr,
            value: JSON.stringify(values)
        };
    }

    private _toggleEnvGraph() {
        this.dispatchEvent(new CustomEvent('toggle-graph', {
            detail: { metric: this.metricKey },
            bubbles: true,
            composed: true
        }));
    }

    private _unlinkGraphs(groupIndex: number) {
        this.dispatchEvent(new CustomEvent('unlink-graphs', {
            detail: { groupIndex },
            bubbles: true,
            composed: true
        }));
    }

    render() {
        if (this.isCombined) {
            return this.renderCombinedEnvGraph();
        }
        return this.renderEnvGraph();
    }

    renderEnvGraph(): TemplateResult {
        const { metricKey, color, title, unit, type, icon, range } = this;

        if (!this.device) return html``;

        // Determine Env Entity ID (replicated logic)
        let slug = this.device.name.toLowerCase().replace(/\s+/g, '_');
        if (this.device.overview_entity_id) {
            slug = this.device.overview_entity_id.replace('sensor.', '');
        }
        let envEntityId = `binary_sensor.${slug}_optimal_conditions`;
        if (slug === 'cure') envEntityId = `binary_sensor.cure_optimal_curing`;
        else if (slug === 'dry') envEntityId = `binary_sensor.dry_optimal_drying`;

        const envEntity = this.hass.states[envEntityId];
        const overviewEntity = this.device.overview_entity_id ? this.hass.states[this.device.overview_entity_id] : undefined;

        // Determine Time Range
        let durationMillis = 24 * 60 * 60 * 1000;
        if (range === '1h') durationMillis = 60 * 60 * 1000;
        else if (range === '6h') durationMillis = 6 * 60 * 60 * 1000;
        else if (range === '7d') durationMillis = 7 * 24 * 60 * 60 * 1000;
        const now = new Date();
        const startTime = new Date(now.getTime() - durationMillis);

        // Data Generation
        let dataPoints: { time: number, value: number, meta?: any }[] = [];

        if (metricKey === 'irrigation' || metricKey === 'drain') {
            // Generate from Schedule
            const times = metricKey === 'irrigation'
                ? overviewEntity?.attributes?.irrigation_times
                : overviewEntity?.attributes?.drain_times;

            if (times && Array.isArray(times)) {
                // Create a timeline for the selected range
                const events: { start: number, end: number }[] = [];

                // Check today and yesterday to cover the window
                // For 1h, we might need to check just today, but checking both is safe
                const referenceDays = [new Date(now), new Date(startTime)];

                times.forEach((t: any) => {
                    const [h, m] = t.time.split(':').map(Number);
                    const duration = (t.duration || 60) * 1000; // default 60s if missing

                    referenceDays.forEach(refDay => {
                        const start = new Date(refDay);
                        start.setHours(h, m, 0, 0);
                        const end = new Date(start.getTime() + duration);

                        // Check overlap with window [startTime, now]
                        if (end.getTime() > startTime.getTime() && start.getTime() < now.getTime()) {
                            events.push({
                                start: Math.max(start.getTime(), startTime.getTime()),
                                end: Math.min(end.getTime(), now.getTime())
                            });
                        }
                    });
                });

                // Sort events
                events.sort((a, b) => a.start - b.start);
                // Convert to points
                // Start with 0
                dataPoints.push({ time: startTime.getTime(), value: 0 });

                events.forEach(ev => {
                    const durationSeconds = (ev.end - ev.start) / 1000;
                    let durationStr = `${durationSeconds}s`;
                    if (durationSeconds >= 60) {
                        durationStr = `${Math.round(durationSeconds / 60)}m`;
                    }

                    // Add point before start (0)
                    dataPoints.push({ time: ev.start - 1, value: 0 });
                    // Add start point (1)
                    dataPoints.push({ time: ev.start, value: 1, meta: { duration: durationStr } });
                    // Add end point (1)
                    dataPoints.push({ time: ev.end, value: 1, meta: { duration: durationStr } });
                    // Add point after end (0)
                    dataPoints.push({ time: ev.end + 1, value: 0 });
                });

                // End with 0 at 'now'
                dataPoints.push({ time: now.getTime(), value: 0 });

            }
        } else {
            const getValue = (ent: any, key: string) => {
                if (!ent) return undefined;
                // Special case for 'state' unit (optimal conditions)
                if (unit === 'state' && key === 'optimal') {
                    return ent.state === 'on' ? 1 : 0;
                }
                // Special case for light cycle
                if (key === 'light') {
                    const isLightsOn = ent.attributes?.is_lights_on ?? ent.attributes?.observations?.is_lights_on;
                    return isLightsOn === true ? 1 : 0;
                }
                // Special case for dehumidifier
                if (key === 'dehumidifier') {
                    if (ent.entity_id && ent.state) {
                        return (ent.state === 'on' || ent.state === 'true' || ent.state === '1') ? 1 : 0;
                    }
                    const val = ent.attributes?.dehumidifier ?? ent.attributes?.observations?.dehumidifier;
                    return (val === true || val === 'on' || val === 1) ? 1 : 0;
                }
                if (key === 'exhaust' || key === 'humidifier') {
                    if (ent.state && !isNaN(parseFloat(ent.state))) {
                        return ent.state;
                    }
                }
                if (ent.attributes && ent.attributes[key] !== undefined) return ent.attributes[key];
                if (ent.attributes && ent.attributes.observations && typeof ent.attributes.observations === 'object') {
                    return ent.attributes.observations[key];
                }
                return undefined;
            };

            const getMeta = (ent: any, key: string) => {
                if (unit === 'state' && key === 'optimal') {
                    return ent.attributes?.reasons;
                }
                if (key === 'light') {
                    const isLightsOn = ent.attributes?.is_lights_on ?? ent.attributes?.observations?.is_lights_on;
                    return { state: isLightsOn ? 'ON' : 'OFF' };
                }
                if (key === 'dehumidifier') {
                    if (ent.entity_id && ent.state) {
                        return { state: (ent.state === 'on' || ent.state === 'true' || ent.state === '1') ? 'ON' : 'OFF' };
                    }
                }
                return undefined;
            };

            // Use History Data
            let historySource = this.history;

            // if (!historySource || historySource.length === 0) return html``; // REMOVED

            const sortedHistory = historySource ? [...historySource].sort((a, b) => new Date(a.last_changed).getTime() - new Date(b.last_changed).getTime()) : [];

            sortedHistory.forEach(h => {
                const t = new Date(h.last_changed).getTime();
                if (t < startTime.getTime()) return;
                const val = getValue(h, metricKey);
                const meta = getMeta(h, metricKey);

                if (val !== undefined && !isNaN(parseFloat(val))) {
                    dataPoints.push({ time: t, value: parseFloat(val), meta });
                }
            });

            // Add current point to extend graph to 'now'
            if (metricKey === 'dehumidifier') {
                if (overviewEntity && overviewEntity.attributes.dehumidifier_state) {
                    const state = overviewEntity.attributes.dehumidifier_state;
                    const val = (state === 'on' || state === 'true' || state === '1') ? 1 : 0;
                    dataPoints.push({ time: now.getTime(), value: val, meta: { state: val ? 'ON' : 'OFF' } });
                } else if (dataPoints.length > 0) {
                    const last = dataPoints[dataPoints.length - 1];
                    dataPoints.push({ time: now.getTime(), value: last.value, meta: last.meta });
                }
            } else if (metricKey === 'exhaust') {
                if (overviewEntity && overviewEntity.attributes.exhaust_value !== undefined) {
                    const val = overviewEntity.attributes.exhaust_value;
                    dataPoints.push({ time: now.getTime(), value: parseFloat(val) });
                } else if (dataPoints.length > 0) {
                    const last = dataPoints[dataPoints.length - 1];
                    dataPoints.push({ time: now.getTime(), value: last.value, meta: last.meta });
                }
            } else if (metricKey === 'humidifier') {
                if (overviewEntity && overviewEntity.attributes.humidifier_value !== undefined) {
                    const val = overviewEntity.attributes.humidifier_value;
                    dataPoints.push({ time: now.getTime(), value: parseFloat(val) });
                } else if (dataPoints.length > 0) {
                    const last = dataPoints[dataPoints.length - 1];
                    dataPoints.push({ time: now.getTime(), value: last.value, meta: last.meta });
                }
            } else if (envEntity) {
                const currentVal = getValue(envEntity, metricKey);
                const currentMeta = getMeta(envEntity, metricKey);
                if (currentVal !== undefined && !isNaN(parseFloat(currentVal))) {
                    dataPoints.push({ time: now.getTime(), value: parseFloat(currentVal), meta: currentMeta });
                }
            }
        }

        // If we have data but the first point is after start time, synthesize a start point
        if (dataPoints.length > 0) {
            const firstPoint = dataPoints[0];
            if (firstPoint.time > startTime.getTime()) {
                dataPoints.unshift({
                    time: startTime.getTime(),
                    value: firstPoint.value,
                    meta: firstPoint.meta
                });
            }
        }

        // If we have only 1 point (current state), synthesize a start point to draw a flat line
        if (dataPoints.length === 1) {
            dataPoints.unshift({
                time: startTime.getTime(),
                value: dataPoints[0].value,
                meta: dataPoints[0].meta
            });
        }

        if (dataPoints.length < 2 && type !== 'step') return html``;

        const width = 1000;
        const height = type === 'step' ? 100 : 180; // Taller for line graphs

        let minVal = 0;
        let maxVal = 1;

        if (unit !== 'state' && metricKey !== 'irrigation' && metricKey !== 'drain') {
            minVal = Math.min(...dataPoints.map(d => d.value));
            maxVal = Math.max(...dataPoints.map(d => d.value));
        }

        const rangeVal = maxVal - minVal || 1;

        const paddedMin = minVal - (rangeVal * 0.1);
        const paddedMax = maxVal + (rangeVal * 0.1);
        const paddedRange = paddedMax - paddedMin;

        // Calculate average for target line
        const avgValue = dataPoints.length > 0
            ? dataPoints.reduce((sum, d) => sum + d.value, 0) / dataPoints.length
            : (minVal + maxVal) / 2;

        let svgPath = "";

        if (type === 'step') {
            const points: [number, number][] = [];
            let currentState = dataPoints.length > 0 ? dataPoints[0].value : 0;

            points.push([0, height - ((currentState - paddedMin) / paddedRange) * height]);

            dataPoints.forEach(d => {
                const x = ((d.time - startTime.getTime()) / durationMillis) * width;
                const y = height - ((d.value - paddedMin) / paddedRange) * height;
                points.push([x, points[points.length - 1][1]]);
                points.push([x, y]);
                currentState = d.value;
            });

            points.push([width, height - ((currentState - paddedMin) / paddedRange) * height]);
            svgPath = `M ${points.map(p => `${p[0]},${p[1]}`).join(' L ')}`;

        } else {
            const points: [number, number][] = dataPoints.map(d => {
                const x = ((d.time - startTime.getTime()) / durationMillis) * width;
                const y = height - ((d.value - paddedMin) / paddedRange) * height;
                return [x, y];
            });
            svgPath = `M ${points.map(p => `${p[0]},${p[1]}`).join(' L ')}`;
        }

        // For step graphs, use compact design
        if (type === 'step') {
            return html`
        <div class="gs-light-cycle-card" style="border: 1px solid ${color}40;">
           <div class="gs-light-header-row">
               <div class="gs-light-title" style="font-size: 1.2rem; flex: 1; cursor: pointer;" @click=${this._toggleEnvGraph}>
                   <div class="gs-icon-box" style="color: ${color}; background: ${color}10; border-color: ${color}30; width: 36px; height: 36px;">
                        <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${icon}"></path></svg>
                   </div>
                   <div>
                      <div>${title}</div>
                      <div class="gs-light-subtitle">${range.toUpperCase()} HISTORY • ${(() => {
                    if (metricKey === 'light') {
                        // Get the light schedule sensor for this device
                        if (this.device) {
                            const lightScheduleSensorId = `binary_sensor.${this.device.device_id}_light_schedule_correct`;
                            const lightScheduleSensor = this.hass.states[lightScheduleSensorId];
                            if (lightScheduleSensor?.attributes['Expected schedule']) {
                                return lightScheduleSensor.attributes['Expected schedule'];
                            }
                        }
                        return dataPoints[dataPoints.length - 1]?.value === 1 ? 'ON' : 'OFF';
                    } else if (unit === 'state') {
                        if (metricKey === 'optimal' && dataPoints.length > 0) {
                            let optimalDuration = 0;
                            let currentTime = startTime.getTime();
                            let currentValue = dataPoints[0].value;

                            for (let i = 0; i < dataPoints.length; i++) {
                                const point = dataPoints[i];
                                const duration = point.time - currentTime;
                                if (duration > 0 && currentValue === 1) {
                                    optimalDuration += duration;
                                }
                                currentTime = point.time;
                                currentValue = point.value;
                            }

                            const totalDuration = now.getTime() - startTime.getTime();
                            const percentage = totalDuration > 0 ? Math.round((optimalDuration / totalDuration) * 100) : 0;
                            return `OPTIMAL ${percentage}%`;
                        }
                        return dataPoints[dataPoints.length - 1]?.value === 1 ? 'OPTIMAL' : 'NOT OPTIMAL';
                    } else if (metricKey === 'irrigation' || metricKey === 'drain') {
                        return dataPoints[dataPoints.length - 1]?.value === 1 ? 'ACTIVE' : 'INACTIVE';
                    } else {
                        return `${minVal.toFixed(1)} - ${maxVal.toFixed(1)} ${unit}`;
                    }
                })()}</div>
                   </div>
               </div>
               
               <div style="opacity: 0.7; cursor: pointer;" @click=${this._toggleEnvGraph}>
                  <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiChevronDown}"></path></svg>
               </div>
           </div>

           <div class="gs-chart-container" style="height: 100px;"
                @mousemove=${(e: MouseEvent) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    this._handleGraphHover(e, metricKey, dataPoints, rect, unit);
                }}
                @mouseleave=${() => this._tooltip = null}>

               ${this._tooltip && this._tooltip.id === metricKey ? html`
                   <div class="gs-cursor-line" style="left: ${this._tooltip.x}px;"></div>
                   <div class="gs-tooltip" style="left: ${this._tooltip.x}px;">
                      <div class="time">${this._tooltip.time}</div>
                      <div>${this._tooltip.value}</div>
                   </div>
               ` : ''}

               <svg class="gs-chart-svg" viewBox="0 0 1000 100" preserveAspectRatio="none">
                   <defs>
                       <linearGradient id="grad-${metricKey}" x1="0%" y1="0%" x2="0%" y2="100%">
                           <stop offset="0%" style="stop-color:${color};stop-opacity:0.5" />
                           <stop offset="100%" style="stop-color:${color};stop-opacity:0" />
                       </linearGradient>
                   </defs>
                   <path class="chart-line" d="${svgPath}" style="stroke: ${color};" />
                   <path class="chart-gradient-fill" d="${svgPath} V 100 H 0 Z" style="fill: url(#grad-${metricKey});" />
               </svg>
               <div class="chart-markers">
                ${(() => {
                    if (range === '1h') return html`<span>-60m</span><span>NOW</span>`;
                    if (range === '6h') return html`<span>-6h</span><span>NOW</span>`;
                    if (range === '7d') return html`<span>-7d</span><span>NOW</span>`;
                    return html`<span>-24H</span><span>NOW</span>`;
                })()}
               </div>
           </div>
        </div>
      `;
        }

        // For line graphs, use new rectangular design
        const yLabels = [
            paddedMax,
            paddedMax - paddedRange * 0.25,
            paddedMax - paddedRange * 0.5,
            paddedMax - paddedRange * 0.75,
            paddedMin
        ];

        return html`
      <div class="gs-env-graph-card">
         <div class="gs-env-graph-header" @click=${this._toggleEnvGraph}>
             <div style="display: flex; align-items: center; gap: 12px;">
                 <svg style="width:24px;height:24px;fill:${color};" viewBox="0 0 24 24"><path d="${icon}"></path></svg>
                 <div>
                    <div style="font-size: 0.9rem; font-weight: 600; color: #fff;">${title}</div>
                 </div>
             </div>
         </div>

         <div class="gs-env-chart-container"
              @mousemove=${(e: MouseEvent) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                this._handleGraphHover(e, metricKey, dataPoints, rect, unit);
            }}
              @mouseleave=${() => this._tooltip = null}>

             ${this._tooltip && this._tooltip.id === metricKey ? html`
                 <div style="position: absolute; left: ${this._tooltip.x}px; top: 0; bottom: 0; width: 1px; background: ${color}80; pointer-events: none;"></div>
                 <div style="position: absolute; left: ${this._tooltip.x + 10}px; top: 20px; background: rgba(0,0,0,0.9); color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 0.75rem; border: 1px solid ${color}; pointer-events: none; z-index: 1000;">
                    <div style="color: ${color}; font-weight: 600;">${this._tooltip.time}</div>
                    <div style="margin-top: 4px;">${this._tooltip.value}</div>
                 </div>
             ` : ''}

             <!-- Y-axis labels -->
             <div style="position: absolute; left: 0; top: 20px; bottom: 30px; width: 45px; display: flex; flex-direction: column; justify-content: space-between; font-size: 0.65rem; color: #666; text-align: right; padding-right: 8px;">
                ${yLabels.map(val => html`<div>${val.toFixed(1)} ${unit}</div>`)}
             </div>

             <svg style="position: absolute; left: 50px; top: 20px; right: 40px; bottom: 30px; width: calc(100% - 90px); height: calc(100% - 50px);" viewBox="0 0 1000 ${height}" preserveAspectRatio="none">
                 <defs>
                     <linearGradient id="grad-${metricKey}" x1="0%" y1="0%" x2="0%" y2="100%">
                         <stop offset="0%" style="stop-color:${color};stop-opacity:0.3" />
                         <stop offset="100%" style="stop-color:${color};stop-opacity:0" />
                     </linearGradient>
                 </defs>
                 
                 <!-- Vertical grid lines -->
                 <line x1="0" y1="0" x2="0" y2="${height}" stroke="#333" stroke-width="1" />
                 <line x1="${width * 0.25}" y1="0" x2="${width * 0.25}" y2="${height}" stroke="#222" stroke-width="1" stroke-dasharray="2,2" />
                 <line x1="${width * 0.5}" y1="0" x2="${width * 0.5}" y2="${height}" stroke="#222" stroke-width="1" stroke-dasharray="2,2" />
                 <line x1="${width * 0.75}" y1="0" x2="${width * 0.75}" y2="${height}" stroke="#222" stroke-width="1" stroke-dasharray="2,2" />
                 <line x1="${width}" y1="0" x2="${width}" y2="${height}" stroke="#333" stroke-width="1" />
                 
                 <!-- Target/average line -->
                 ${avgValue ? html`
                   <line x1="0" y1="${height - ((avgValue - paddedMin) / paddedRange) * height}" 
                         x2="${width}" y2="${height - ((avgValue - paddedMin) / paddedRange) * height}" 
                         stroke="${color}" stroke-width="1.5" stroke-dasharray="5,5" opacity="0.5" />
                 ` : ''}
                 
                 <!-- Data line and fill -->
                 <path d="${svgPath} V ${height} H 0 Z" fill="url(#grad-${metricKey})" />
                 <path d="${svgPath}" fill="none" stroke="${color}" stroke-width="2.5" />
             </svg>
             
             <!-- X-axis markers -->
             <div class="chart-markers">
                ${(() => {
                if (range === '1h') return html`<span>60m</span><span>45m</span><span>30m</span><span>15m</span>`;
                if (range === '6h') return html`<span>6h</span><span>4.5h</span><span>3h</span><span>1.5h</span>`;
                if (range === '7d') return html`<span>7d</span><span>5d</span><span>3d</span><span>1d</span>`;
                return html`<span>24h</span><span>18h</span><span>12h</span><span>6h</span>`;
            })()}
                <span style="color: ${color};">NOW</span>
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
            // Note: Dehumidifier history handling might need adjustment if passed separately, 
            // but for now assuming it's in the same history or handled by parent.
            // If dehumidifier history is separate, we might need another property.
            // For now, let's assume the parent passes the correct history array if it's a single graph,
            // but for combined, it's trickier.
            // However, looking at the original code:
            // if (metricKey === 'dehumidifier') historySource = this._dehumidifierHistory;
            // This suggests we might need `dehumidifierHistory` prop too.
            // For simplicity, let's assume `history` contains what we need or we add `dehumidifierHistory`.

            // Actually, let's add `dehumidifierHistory` prop to be safe.

            if (historySource && historySource.length > 0) {
                const sortedHistory = [...historySource].sort((a, b) => new Date(a.last_changed).getTime() - new Date(b.last_changed).getTime());

                sortedHistory.forEach(h => {
                    const t = new Date(h.last_changed).getTime();
                    if (t < startTime.getTime()) return;

                    const getValue = (ent: any, key: string) => {
                        if (!ent) return undefined;
                        if (config.unit === 'state' && key === 'optimal') return ent.state === 'on' ? 1 : 0;
                        if (key === 'light') {
                            const isLightsOn = ent.attributes?.is_lights_on ?? ent.attributes?.observations?.is_lights_on;
                            return isLightsOn === true ? 1 : 0;
                        }
                        if (key === 'dehumidifier') {
                            if (ent.entity_id && ent.state) return (ent.state === 'on' || ent.state === 'true' || ent.state === '1') ? 1 : 0;
                            const val = ent.attributes?.dehumidifier ?? ent.attributes?.observations?.dehumidifier;
                            return (val === true || val === 'on' || val === 1) ? 1 : 0;
                        }
                        if (ent.attributes && ent.attributes[key] !== undefined) return ent.attributes[key];
                        if (ent.attributes && ent.attributes.observations && typeof ent.attributes.observations === 'object') return ent.attributes.observations[key];
                        return undefined;
                    };

                    const val = getValue(h, metricKey);
                    if (val !== undefined && !isNaN(parseFloat(val))) {
                        dataPoints.push({ time: t, value: parseFloat(val) });
                    }
                });

                if (dataPoints.length > 0) {
                    const last = dataPoints[dataPoints.length - 1];
                    dataPoints.push({ time: now.getTime(), value: last.value });
                }
            }

            if (dataPoints.length > 0) {
                const first = dataPoints[0];
                if (first.time > startTime.getTime()) {
                    dataPoints.unshift({ time: startTime.getTime(), value: first.value });
                }
            }

            if (dataPoints.length > 0) {
                const min = Math.min(...dataPoints.map(d => d.value));
                const max = Math.max(...dataPoints.map(d => d.value));
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
             <div style="display: flex; align-items: center; gap: 12px;">
                 ${graphData.map((g, i) => html`
                    ${i > 0 ? html`
                        <div class="link-icon" style="opacity: 0.8; cursor: pointer;" 
                             @click=${() => {
                    // Find group index logic would be needed here or passed down
                    // For now, we'll dispatch an event with the key
                    this.dispatchEvent(new CustomEvent('unlink-graph', { detail: { metric: g.key } }));
                }}
                             title="Unlink Graph">
                             <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: #fff;"><path d="${mdiLink}"></path></svg>
                        </div>
                    ` : ''}
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background: ${g.color};"></div>
                        <div style="font-size: 0.9rem; font-weight: 600; color: #fff;">${g.title}</div>
                    </div>
                 `)}
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
             ` : ''}

             <svg style="position: absolute; left: 50px; top: 20px; right: 40px; bottom: 30px; width: calc(100% - 90px); height: calc(100% - 50px);" viewBox="0 0 1000 ${height}" preserveAspectRatio="none">
                 <line x1="0" y1="0" x2="0" y2="${height}" stroke="#333" stroke-width="1" />
                 <line x1="${width}" y1="0" x2="${width}" y2="${height}" stroke="#333" stroke-width="1" />
                 <line x1="0" y1="${height}" x2="${width}" y2="${height}" stroke="#333" stroke-width="1" />

                 ${graphData.map(g => {
                    const range = g.max - g.min || 1;
                    const paddedMin = g.min - (range * 0.1);
                    const paddedMax = g.max + (range * 0.1);
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
                })}
             </svg>
             
              <div class="chart-markers">
                 ${(() => {
                if (range === '1h') return html`<span>60m</span><span>45m</span><span>30m</span><span>15m</span>`;
                if (range === '6h') return html`<span>6h</span><span>4.5h</span><span>3h</span><span>1.5h</span>`;
                if (range === '7d') return html`<span>7d</span><span>5d</span><span>3d</span><span>1d</span>`;
                return html`<span>24h</span><span>18h</span><span>12h</span><span>6h</span>`;
            })()}
                 <span style="color: #fff;">NOW</span>
              </div>
         </div>
      </div>
    `;
    }
}
