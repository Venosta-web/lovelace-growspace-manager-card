import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceEvent } from '../../types';
import { GrowspaceLogbookController } from '../../controllers/growspace-logbook-controller';
import { sharedStyles } from '../../styles/shared.styles';
import {
    mdiWater, mdiSprout, mdiAlertCircle, mdiNoteText, mdiLeaf, mdiBug,
    mdiThermometer, mdiWaterPercent, mdiGauge, mdiFlash, mdiCupWater,
    mdiDumbbell, mdiFlower, mdiHairDryer, mdiCannabis
} from '@mdi/js';

@customElement('growspace-timeline')
export class GrowspaceTimeline extends LitElement {
    @property({ attribute: false }) public hass!: HomeAssistant;
    @property({ type: String }) public growspaceId!: string;

    @state() private _events: GrowspaceEvent[] = [];
    @state() private _isLoading = false;
    @state() private _hoveredEvent: GrowspaceEvent | null = null;
    @state() private _zoomLevel = 1; // 1 = normal, 2 = zoomed in

    private _controller = new GrowspaceLogbookController();

    static styles = [
        sharedStyles,
        css`
      :host {
        display: block;
        height: 100%;
        overflow: hidden;
        position: relative;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 12px;
      }

      .timeline-container {
        height: 100%;
        overflow-x: auto;
        overflow-y: hidden;
        position: relative;
        padding: 40px 20px;
        scrollbar-width: thin;
        cursor: grab;
      }

      .timeline-container:active {
        cursor: grabbing;
      }

      .timeline-track {
        position: relative;
        height: 4px;
        background: var(--divider-color, rgba(255, 255, 255, 0.1));
        top: 50%;
        margin-top: -2px;
        min-width: 100%;
      }

      .event-marker {
        position: absolute;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--card-background-color, #202020);
        border: 2px solid var(--divider-color);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        z-index: 2;
      }

      .event-marker:hover {
        transform: translate(-50%, -50%) scale(1.2);
        z-index: 10;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      }

      .event-marker svg {
        width: 18px;
        height: 18px;
        fill: var(--secondary-text-color);
      }

      /* Event Types */
      .marker-alert { border-color: var(--error-color); }
      .marker-alert svg { fill: var(--error-color); }
      
      .marker-water { border-color: var(--info-color, #2196f3); }
      .marker-water svg { fill: var(--info-color, #2196f3); }
      
      .marker-note { border-color: var(--warning-color); }
      .marker-note svg { fill: var(--warning-color); }
      
      .marker-stage { 
        width: 40px; 
        height: 40px; 
        border-color: var(--success-color);
        background: var(--success-color); 
      }
      .marker-stage svg { fill: white; width: 24px; height: 24px; }

      .date-axis {
        position: absolute;
        bottom: 20px;
        left: 0;
        right: 0;
        height: 30px;
        pointer-events: none;
      }

      .date-tick {
        position: absolute;
        bottom: 0;
        transform: translateX(-50%);
        font-size: 0.75rem;
        color: var(--secondary-text-color);
        white-space: nowrap;
      }

      .date-tick::before {
        content: '';
        position: absolute;
        top: -10px;
        left: 50%;
        width: 1px;
        height: 10px;
        background: var(--divider-color);
      }

      .tooltip {
        position: absolute;
        bottom: 70px; /* Above the track */
        transform: translateX(-50%);
        background: var(--ha-card-background, #1c1c1c);
        border: 1px solid var(--divider-color);
        padding: 12px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        z-index: 20;
        min-width: 200px;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s;
      }

      .tooltip.visible {
        opacity: 1;
      }

      .tooltip-header {
        font-weight: bold;
        margin-bottom: 4px;
        color: var(--primary-text-color);
      }

      .tooltip-time {
        font-size: 0.8rem;
        color: var(--secondary-text-color);
        margin-bottom: 8px;
      }

      .controls {
        position: absolute;
        top: 16px;
        right: 16px;
        display: flex;
        gap: 8px;
        z-index: 20;
      }

      .zoom-btn {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      }
      
      .zoom-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--secondary-text-color);
      }
    `
    ];

    protected willUpdate(changedProps: Map<string, any>) {
        if (changedProps.has('growspaceId') || (changedProps.has('hass') && !this._events.length)) {
            this._fetchEvents();
        }
    }

    private async _fetchEvents() {
        if (!this.hass || !this.growspaceId) return;
        this._isLoading = true;
        try {
            this._events = await this._controller.fetchEventLog(this.hass, this.growspaceId, 100); // Fetch more events for timeline
        } catch (e) {
            console.error(e);
        } finally {
            this._isLoading = false;
        }
    }

    private _getIcon(event: GrowspaceEvent) {
        const cat = event.category?.toLowerCase();
        const type = event.sensor_type?.toLowerCase();

        if (cat === 'alert') return mdiAlertCircle;
        if (cat === 'note') return mdiNoteText;
        if (type?.includes('water') || type?.includes('irrigation')) return mdiWater;
        if (cat === 'training') return mdiDumbbell;
        if (type === 'temperature') return mdiThermometer;
        if (type === 'humidity') return mdiWaterPercent;
        if (type === 'vpd') return mdiGauge;

        return mdiLeaf;
    }

    private _getClass(event: GrowspaceEvent) {
        const cat = event.category?.toLowerCase();
        const type = event.sensor_type?.toLowerCase();
        const severity = event.severity || 0;

        if (cat === 'alert' || severity > 0.8) return 'marker-alert';
        if (cat === 'note') return 'marker-note';
        if (type?.includes('water') || type?.includes('irrigation')) return 'marker-water';
        if (cat === 'phase_change') return 'marker-stage'; // Hypothetical category

        return '';
    }

    private _getPosition(event: GrowspaceEvent, minTime: number, totalDuration: number): number {
        const time = new Date((event as any).timestamp || event.start_time).getTime();
        const position = ((time - minTime) / totalDuration) * 100;
        return position;
    }

    render() {
        if (this._isLoading) return html`<div class="empty-state">Loading timeline...</div>`;
        if (this._events.length === 0) return html`<div class="empty-state">No events to display</div>`;

        // Process times
        const timestamps = this._events.map(e => new Date((e as any).timestamp || e.start_time).getTime());
        const minTime = Math.min(...timestamps);
        const maxTime = Math.max(...timestamps);

        // Add buffer (1 day)
        const buffer = 24 * 60 * 60 * 1000;
        const start = minTime - buffer;
        const end = maxTime + buffer;
        const totalDuration = end - start;

        // Zoom multiplier
        const width = 100 * this._zoomLevel;

        return html`
      <div class="controls">
        <button class="zoom-btn" @click=${() => this._zoomLevel = Math.max(1, this._zoomLevel - 0.5)}>-</button>
        <button class="zoom-btn" @click=${() => this._zoomLevel = Math.min(5, this._zoomLevel + 0.5)}>+</button>
      </div>

      <div class="timeline-container">
        <div class="timeline-track" style="width: ${width}%">
          ${this._events.map(event => {
            const left = this._getPosition(event, start, totalDuration);
            const icon = this._getIcon(event);
            const className = this._getClass(event);

            return html`
              <div 
                class="event-marker ${className}" 
                style="left: ${left}%"
                @mouseenter=${() => this._hoveredEvent = event}
                @mouseleave=${() => this._hoveredEvent = null}
              >
                <svg viewBox="0 0 24 24"><path d="${icon}"></path></svg>
                
                ${this._hoveredEvent === event ? html`
                  <div class="tooltip visible" style="left: ${left}%">
                    <div class="tooltip-header">
                      ${event.category === 'note' ? 'Note' : (event.sensor_type || 'Event')}
                    </div>
                    <div class="tooltip-time">
                      ${new Date((event as any).timestamp || event.start_time).toLocaleString()}
                    </div>
                    <div>${(event as any).notes || event.reasons?.join(', ') || ''}</div>
                  </div>
                ` : nothing}
              </div>
            `;
        })}

          <div class="date-axis">
            <!-- Generate ticks every 20% -->
            ${[0, 20, 40, 60, 80, 100].map(pct => {
            const time = start + (totalDuration * (pct / 100));
            return html`
                <div class="date-tick" style="left: ${pct}%">
                  ${new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              `;
        })}
          </div>
        </div>
      </div>
    `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'growspace-timeline': GrowspaceTimeline;
    }
}
