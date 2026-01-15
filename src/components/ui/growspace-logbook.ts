import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceEvent } from '../../types';
import { getTimelineService } from '../../services/timeline-service';
import { getEventTimestamp, formatDateTime, formatDuration, formatProbability } from '../../utils/date-utils';
import { dialogStyles } from '../../styles/dialog.styles';
import { createRef, ref, Ref } from 'lit/directives/ref.js';
import { virtualize } from '@lit-labs/virtualizer/virtualize.js';

import { consume } from '@lit/context';
import { hassContext } from '../../context';

@customElement('growspace-logbook')
export class GrowspaceLogbook extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  hass!: HomeAssistant;

  @property({ type: String }) growspaceId!: string;

  @state() private _events: GrowspaceEvent[] = [];
  @state() private _isLoading = false;
  @state() private _activeFilter = 'all';
  @state() private _highlightedTimestamp: number | null = null;

  private _containerRef: Ref<HTMLDivElement> = createRef();

  /**
   * Normalize string for filtering (moved to class method for performance)
   */
  private _normalize(s?: string): string {
    return s?.toLowerCase().trim() || '';
  }

  static styles = [
    dialogStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }
      .log-container {
        flex: 1;
        overflow-y: auto;
        padding-right: 4px; /* Space for scrollbar */
        position: relative;
      }
      .log-container::-webkit-scrollbar {
        width: 8px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
      }
      .log-container::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 4px;
      }
      .event-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        transition: all 0.3s ease;
        width: 100%;
        box-sizing: border-box;
      }
      .event-card.highlighted {
        background: rgba(76, 175, 80, 0.15);
        border-color: var(--primary-color, #4caf50);
        box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.3);
        animation: highlight-pulse 1.5s ease;
      }
      @keyframes highlight-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.02); }
      }
      .event-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .event-time {
        font-size: 0.9rem;
        opacity: 0.8;
        font-weight: 500;
        color: var(--primary-text-color);
      }
      .event-duration {
        font-size: 0.85rem;
        opacity: 0.6;
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 8px;
        border-radius: 12px;
      }
      .event-details {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 12px;
        align-items: start;
      }
      .event-type {
        font-weight: 600;
        color: var(--accent-color, #4caf50);
        margin-bottom: 4px;
        text-transform: capitalize;
      }
      .event-probability {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--primary-text-color);
        text-align: right;
      }
      .event-reasons {
        font-size: 0.85rem;
        opacity: 0.7;
        margin-top: 8px;
        line-height: 1.4;
      }
      .reason-badge {
        display: inline-block;
        background: rgba(255, 255, 255, 0.08);
        padding: 2px 8px;
        border-radius: 4px;
        margin-right: 6px;
        margin-bottom: 4px;
      }
      .filter-bar {
        display: flex;
        gap: 8px;
        padding: 0 4px 12px 4px;
        overflow-x: auto;
        white-space: nowrap;
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* IE/Edge */
        flex-shrink: 0;
      }
      .filter-bar::-webkit-scrollbar {
        display: none; /* Chrome/Safari/Opera */
      }
      .filter-chip {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.2s ease;
        color: var(--primary-text-color);
        opacity: 0.7;
        flex-shrink: 0;
      }
      .filter-chip.active {
        background: var(--accent-color, #4caf50);
        color: white;
        opacity: 1;
        border-color: transparent;
        font-weight: 500;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      .filter-chip:hover:not(.active) {
        background: rgba(255, 255, 255, 0.1);
        opacity: 0.9;
      }
      .empty-state {
        text-align: center;
        padding: 40px 20px;
        opacity: 0.5;
        font-style: italic;
      }
    `,
  ];

  private _getSeverityColor(severity: number, sensorType?: string): string {
    if (sensorType?.toLowerCase() === 'optimal') {
      if (severity >= 0.9) return 'var(--success-color, #4CAF50)';
      if (severity >= 0.75) return 'var(--warning-color)';
      return 'var(--error-color)';
    }

    // Default logic (High severity = Bad)
    if (severity >= 0.9) return 'var(--error-color)';
    if (severity >= 0.75) return 'var(--warning-color)';
    return 'var(--primary-text-color)';
  }

  protected willUpdate(changedProps: Map<string, any>) {
    if (changedProps.has('hass') && !this.hass) {
      console.warn('GrowspaceLogbook: No HASS context available');
      return;
    }
    if (changedProps.has('growspaceId')) {
      this._fetchEvents();
    }
  }

  private async _fetchEvents() {
    if (!this.growspaceId || !this.hass) return;

    this._isLoading = true;
    const service = getTimelineService(this.hass);
    this._events = await service.fetchGrowspaceEvents(this.growspaceId, 50);
    this._isLoading = false;
  }

  private _formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  private _formatProb(val: number | undefined): string {
    if (val === undefined || val === null || isNaN(val)) {
      return '--%';
    }
    return `${Math.round(Number(val) * 100)}%`;
  }

  private _formatTime(isoString: string): string {
    return formatDateTime(new Date(isoString));
  }

  private _setActiveFilter(filter: string) {
    this._activeFilter = filter;
  }

  /**
   * Public method to scroll to and highlight an event near the given timestamp
   */
  public scrollToTimestamp(timestamp: number) {
    this._highlightedTimestamp = timestamp;

    if (!this._events || this._events.length === 0) return;

    let closestIndex = 0;
    let minDiff = Number.MAX_VALUE;

    for (let i = 0; i < this._events.length; i++) {
      const eventTime = getEventTimestamp(this._events[i]);
      const diff = Math.abs(eventTime - timestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }

    // Scroll to event after render
    requestAnimationFrame(() => {
      const container = this._containerRef.value;
      if (!container) return;

      const eventCard = container.querySelector(`[data-event-index="${closestIndex}"]`) as HTMLElement;
      if (eventCard) {
        eventCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    // Clear highlight after animation
    setTimeout(() => {
      this._highlightedTimestamp = null;
    }, 3000);
  }

  render() {
    if (this._isLoading) {
      return html`<div class="empty-state">Loading events...</div>`;
    }

    const allEvents = this._events || [];

    // Filter logic using class method for normalization
    let filteredEvents = allEvents;

    if (this._activeFilter === 'watering') {
      filteredEvents = allEvents.filter(e => {
        const cat = this._normalize(e.category);
        const type = this._normalize(e.sensor_type);
        return cat === 'irrigation' ||
          (cat === 'environmental' && ['irrigation', 'drain'].includes(type)) ||
          ['irrigation', 'drain', 'water'].includes(type) ||
          type.includes('water');
      });
    } else if (this._activeFilter === 'training') {
      const techniques = ['topping', 'fim', 'lst', 'super_cropping', 'scrog', 'defoliating', 'lollipopping'];
      filteredEvents = allEvents.filter(e => {
        const cat = this._normalize(e.category);
        const type = this._normalize(e.sensor_type);
        return cat === 'training' || techniques.some(t => type.includes(t));
      });
    } else if (this._activeFilter === 'alerts') {
      filteredEvents = allEvents.filter(e => {
        const cat = this._normalize(e.category);
        return cat === 'alert' || (e.severity !== undefined && e.severity >= 0.75);
      });
    } else if (this._activeFilter === 'environment') {
      filteredEvents = allEvents.filter(e => {
        const type = this._normalize(e.sensor_type);
        return ['temperature', 'humidity', 'vpd', 'co2'].includes(type);
      });
    } else if (this._activeFilter === 'notes') {
      filteredEvents = allEvents.filter(e => this._normalize(e.category) === 'note');
    }

    // Schwartzian transform for efficient sorting
    const sortedEvents = filteredEvents
      .map(e => ({
        event: e,
        time: getEventTimestamp(e)
      }))
      .sort((a, b) => b.time - a.time)
      .map(item => item.event);

    const filters = [
      { id: 'all', label: 'All' },
      { id: 'notes', label: 'Notes' },
      { id: 'alerts', label: 'Alerts' },
      { id: 'watering', label: 'Watering/Nutrients' },
      { id: 'environment', label: 'Environment' },
      { id: 'training', label: 'Training' },
    ];

    return html`
      <div class="filter-bar">
        ${filters.map(
      (filter) => html`
            <div
              class="filter-chip ${this._activeFilter === filter.id ? 'active' : ''}"
              @click=${() => this._setActiveFilter(filter.id)}
            >
              ${filter.label}
            </div>
          `
    )}
      </div>

      <div class="log-container" ${ref(this._containerRef)}>
        ${sortedEvents.length > 0
        ? html`
            ${virtualize({
          items: sortedEvents,
          scroller: true,
          renderItem: (event: GrowspaceEvent) => {
            if (!event) return html``;
            const cat = this._normalize(event.category);
            const isNote = cat === 'note';
            const type = isNote ? 'Plant Note' :
              (event.sensor_type ? event.sensor_type.replace(/_/g, ' ') :
                (cat ? cat.replace(/_/g, ' ') : 'Event'));
            const startTime = (event as any).timestamp || event.start_time;
            const index = (this._events || []).indexOf(event);

            return html`
                    <div class="event-card ${this._highlightedTimestamp && Math.abs(new Date(startTime).getTime() - this._highlightedTimestamp) < 1000 ? 'highlighted' : ''}" data-event-index="${index}">
                      <div class="event-header">
                        <div>
                          <div class="event-type" style="color: ${isNote ? 'var(--warning-color, #ff9800)' : ''}">${type}</div>
                          <div class="event-time">${this._formatTime(startTime)}</div>
                        </div>
                        ${event.duration_sec > 0
                ? html`<div class="event-duration">${this._formatDuration(event.duration_sec)}</div>`
                : nothing}
                      </div>
                      
                      <div class="event-details">
                        <div class="event-reasons">
                          ${isNote ? html`
                            <div class="note-text" style="font-size: 0.95rem; opacity: 1; margin-bottom: 8px;">
                              ${(event as any).notes}
                            </div>
                            ${(event as any).tags?.length > 0 ? html`
                              <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 4px;">
                                ${(event as any).tags.map((tag: string) => html`
                                  <span class="reason-badge" style="background: rgba(var(--rgb-primary-color), 0.1); color: var(--primary-color);">#${tag}</span>
                                `)}
                              </div>
                            ` : nothing}
                            ${(event as any).images?.length > 0 ? html`
                              <div style="font-size: 0.8rem; opacity: 0.6; font-style: italic;">
                                ${(event as any).images.length} Image${(event as any).images.length > 1 ? 's' : ''} attached
                              </div>
                            ` : nothing}
                          ` : (event.reasons && event.reasons.length > 0
                ? event.reasons.map((reason: string) => html`<span class="reason-badge">${reason}</span>`)
                : nothing)}
                        </div>
                        
                        ${!isNote && event.severity > 0.5 && event.category !== 'training'
                ? html`
                              <div 
                                class="event-probability"
                                style="color: ${this._getSeverityColor(event.severity, event.sensor_type)}"
                              >
                                ${this._formatProb(event.severity)}
                              </div>
                            `
                : nothing}
                      </div>
                    </div>
                  `;
          }
        })}
          `
        : html`
              <div class="empty-state">
                No events found for "${filters.find((f) => f.id === this._activeFilter)?.label}".
              </div>
            `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-logbook': GrowspaceLogbook;
  }
}
