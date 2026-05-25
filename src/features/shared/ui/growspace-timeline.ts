import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceEvent } from '../../../types';
import { fetchGrowspaceEvents } from '../../../slices/logbook';
import { getEventTimestamp, formatDateTime, formatShortDate } from '../../../utils/date-utils';
import { sharedStyles } from '../../../styles/shared.styles';
import {
  mdiWater,
  mdiAlertCircle,
  mdiNoteText,
  mdiLeaf,
  mdiThermometer,
  mdiWaterPercent,
  mdiGauge,
  mdiDumbbell,
} from '@mdi/js';
import './error-boundary';

@customElement('growspace-timeline')
export class GrowspaceTimeline extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: String }) public growspaceId!: string;

  @state() private _events: GrowspaceEvent[] = [];
  @state() private _isLoading = false;
  @state() private _hasError = false;
  @state() private _errorMessage = '';
  @state() private _hoveredEvent: GrowspaceEvent | null = null;
  @state() private _tooltipPos: { x: number; y: number } | null = null;
  @state() private _zoomLevel = 1; // 1 = normal, 2 = zoomed in

  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        height: 100%;
        overflow: hidden;
        position: relative;
        background: rgba(0, 0, 0, 0.2);
        border-radius: var(--border-radius-md);
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
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      }

      .event-marker svg {
        width: 18px;
        height: 18px;
        fill: var(--secondary-text-color);
      }

      /* Event Types */
      .marker-alert {
        border-color: var(--error-color);
      }
      .marker-alert svg {
        fill: var(--error-color);
      }

      .marker-water {
        border-color: var(--info-color, #2196f3);
      }
      .marker-water svg {
        fill: var(--info-color, #2196f3);
      }

      .marker-note {
        border-color: var(--warning-color);
      }
      .marker-note svg {
        fill: var(--warning-color);
      }

      .marker-stage {
        width: 40px;
        height: 40px;
        border-color: var(--success-color);
        background: var(--success-color);
      }
      .marker-stage svg {
        fill: white;
        width: 24px;
        height: 24px;
      }

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
        position: fixed; /* Fixed to escape container clipping */
        background: var(--ha-card-background, #1c1c1c);
        border: 1px solid var(--divider-color);
        padding: 12px;
        border-radius: var(--border-radius-sm);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        z-index: 1000;
        min-width: 200px;
        max-width: 300px;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.1s;
        /* Center horizontally and position above */
        transform: translate(-50%, -100%); 
        margin-top: -12px; /* Small gap above cursor/marker */
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
        border-radius: var(--border-radius-xs);
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
    `,
  ];

  protected willUpdate(changedProps: Map<string, any>) {
    if (changedProps.has('growspaceId') || (changedProps.has('hass') && !this._events.length)) {
      this._fetchEvents();
    }
  }

  private async _fetchEvents() {
    if (!this.hass || !this.growspaceId) return;
    this._isLoading = true;
    this._hasError = false;
    try {
      this._events = await fetchGrowspaceEvents(this.growspaceId, 100);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Fetch failed';
      console.error('Error fetching growspace events:', e);
      this._hasError = true;
      this._errorMessage = errorMessage;
      this._events = [];
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
    const time = getEventTimestamp(event);
    const position = ((time - minTime) / totalDuration) * 100;
    return position;
  }

  private _showTooltip(event: GrowspaceEvent, e: MouseEvent) {
    const target = e.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    this._hoveredEvent = event;
    this._tooltipPos = {
      x: rect.left + rect.width / 2,
      y: rect.top
    };
  }

  private _hideTooltip() {
    this._hoveredEvent = null;
    this._tooltipPos = null;
  }

  render() {
    if (this._isLoading) return html`<div class="empty-state">Loading timeline...</div>`;
    if (this._hasError)
      return html`<div class="empty-state" style="color: var(--error-color)">
        ${this._errorMessage}
      </div>`;
    if (this._events.length === 0) return html`<div class="empty-state">No events to display</div>`;



    // Process times using new utility
    const timestamps = this._events.map((e) => getEventTimestamp(e));
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
      <error-boundary .fallbackMessage=${'Failed to render timeline'}>
        <div class="controls">
          <button
            class="zoom-btn"
            @click=${() => (this._zoomLevel = Math.max(1, this._zoomLevel - 0.5))}
          >
            -
          </button>
          <button
            class="zoom-btn"
            @click=${() => (this._zoomLevel = Math.min(50, this._zoomLevel + 0.5))}
          >
            +
          </button>
        </div>

        <div class="timeline-container" @scroll=${this._hideTooltip}>
          <div class="timeline-track" style="width: ${width}%">
            ${this._events.map((event) => {
      const left = this._getPosition(event, start, totalDuration);
      const icon = this._getIcon(event);
      const className = this._getClass(event);

      return html`
                <div
                  class="event-marker ${className}"
                  style="left: ${left}%"
                  @click=${(e: Event) => {
          e.stopPropagation();
          this._zoomToEvent(event, start, totalDuration);
        }}
                  @mouseenter=${(e: MouseEvent) => this._showTooltip(event, e)}
                  @mouseleave=${this._hideTooltip}
                >
                  <svg viewBox="0 0 24 24"><path d="${icon}"></path></svg>
                </div>
              `;
    })}

            <div class="date-axis">
              <!-- Generate ticks dynamically based on zoom -->
              ${this._renderTicks(start, totalDuration)}
            </div>
          </div>
        </div>

        ${this._hoveredEvent && this._tooltipPos
        ? html`
              <div 
                class="tooltip visible" 
                style="top: ${this._tooltipPos.y}px; left: ${this._tooltipPos.x}px"
              >
                <div class="tooltip-header">
                  ${this._hoveredEvent.category === 'note' ? 'Note' : this._hoveredEvent.sensor_type || 'Event'}
                </div>
                <div class="tooltip-time">
                  ${formatDateTime(new Date(getEventTimestamp(this._hoveredEvent)))}
                </div>
                <div class="tooltip-body">
                  ${this._hoveredEvent.notes
            ? html`<div>${this._hoveredEvent.notes}</div>`
            : nothing}
                  ${this._hoveredEvent.reasons && this._hoveredEvent.reasons.length > 0
            ? html`<div>${this._hoveredEvent.reasons.join(', ')}</div>`
            : nothing}
                  ${!this._hoveredEvent.notes && (!this._hoveredEvent.reasons || this._hoveredEvent.reasons.length === 0)
            ? html`<div style="font-style:italic; opacity:0.7">No details</div>`
            : nothing}
                </div>
              </div>
            `
        : nothing}
      </error-boundary>
    `;
  }

  private _renderTicks(start: number, totalDuration: number) {
    const tickCount = Math.max(5, Math.floor(this._zoomLevel * 5));
    const ticks = [];
    for (let i = 0; i <= tickCount; i++) {
      ticks.push((i / tickCount) * 100);
    }

    return ticks.map((pct) => {
      const time = start + totalDuration * (pct / 100);
      return html`
            <div class="date-tick" style="left: ${pct}%">
            ${formatShortDate(new Date(time))}
            </div>
        `;
    });
  }

  private async _zoomToEvent(event: GrowspaceEvent, start: number, totalDuration: number) {
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    // Calculate required zoom to make 24h fill the screen (approx)
    // Formula: totalDuration / ONE_DAY_MS = number of "days" in total
    // We want 1 "screen width" to be 1 day.
    // Scale = totalDays / 1
    const requiredZoom = Math.max(1, totalDuration / ONE_DAY_MS);

    this._zoomLevel = requiredZoom;
    await this.updateComplete;

    const container = this.shadowRoot?.querySelector('.timeline-container') as HTMLElement;
    if (!container) return;

    // Calculate position
    const eventTime = getEventTimestamp(event);
    const leftPct = (eventTime - start) / totalDuration; // 0 to 1

    const trackWidth = container.scrollWidth;
    const containerWidth = container.clientWidth;

    // Target scroll position: center the event
    // pixel position of event = trackWidth * leftPct
    // center it: subtract half container width
    const scrollDest = (trackWidth * leftPct) - (containerWidth / 2);

    container.scrollTo({
      left: Math.max(0, scrollDest),
      behavior: 'smooth'
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-timeline': GrowspaceTimeline;
  }
}
