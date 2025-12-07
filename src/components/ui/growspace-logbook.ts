import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceEvent } from '../../types';
import { GrowspaceLogbookController } from '../../controllers/growspace-logbook-controller';
import { dialogStyles } from '../../styles/dialog.styles';

@customElement('growspace-logbook')
export class GrowspaceLogbook extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: String }) growspaceId!: string;

  @state() private _events: GrowspaceEvent[] = [];
  @state() private _isLoading = false;
  @state() private _activeFilter = 'all';

  private _controller?: GrowspaceLogbookController;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
        height: 100%;
        overflow: hidden;
      }
      .log-container {
        height: 100%;
        overflow-y: auto;
        padding-right: 4px; /* Space for scrollbar */
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
        color: var(--accent-color, #4CAF50);
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
        background: var(--accent-color, #4CAF50);
        color: white;
        opacity: 1;
        border-color: transparent;
        font-weight: 500;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
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
    `
  ];

  protected firstUpdated() {
    this._initController();
  }

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
    if (changedProps.has('hass') && !this._controller) {
      this._initController();
    }
    if (changedProps.has('growspaceId')) {
      this._fetchEvents();
    }
  }

  private _initController() {
    if (this.hass && !this._controller) {
      this._controller = new GrowspaceLogbookController(this.hass);
      this._fetchEvents();
    }
  }

  private async _fetchEvents() {
    if (!this._controller || !this.growspaceId) return;

    this._isLoading = true;
    try {
      this._events = await this._controller.fetchEventLog(this.growspaceId);
    } finally {
      this._isLoading = false;
    }
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
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  }

  render() {
    if (this._isLoading) {
      return html`<div class="empty-state">Loading events...</div>`;
    }

    const allEvents = this._events || [];

    // Filter logic
    let filteredEvents = allEvents;
    if (this._activeFilter === 'alerts') {
      filteredEvents = allEvents.filter(e => e.category === 'alert' || e.severity >= 0.75);
    } else if (this._activeFilter === 'irrigation') {
      filteredEvents = allEvents.filter(e => e.category === 'irrigation' || ['irrigation', 'drain'].includes(e.sensor_type));
    } else if (this._activeFilter === 'environment') {
      filteredEvents = allEvents.filter(e => ['temperature', 'humidity', 'vpd', 'co2'].includes(e.sensor_type));
    }

    // Sort by time descending (newest first)
    const sortedEvents = [...filteredEvents].sort((a, b) =>
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );

    const filters = [
      { id: 'all', label: 'All' },
      { id: 'alerts', label: 'Alerts' },
      { id: 'irrigation', label: 'Irrigation' },
      { id: 'environment', label: 'Environment' }
    ];

    return html`
      <div class="filter-bar">
        ${filters.map(filter => html`
          <div 
            class="filter-chip ${this._activeFilter === filter.id ? 'active' : ''}"
            @click=${() => this._activeFilter = filter.id}
          >
            ${filter.label}
          </div>
        `)}
      </div>

      <div class="log-container">
        ${sortedEvents.length > 0 ? sortedEvents.map(event => html`
          <div class="event-card">
            <div class="event-header">
              <span class="event-time">${this._formatTime(event.start_time)}</span>
              <span class="event-duration">${this._formatDuration(event.duration_sec)}</span>
            </div>
            
            <div class="event-details">
              <div>
                <div class="event-type">${event.sensor_type.replace(/_/g, ' ')}</div>
                
                ${event.reasons && event.reasons.length > 0 ? html`
                  <div class="event-reasons">
                    ${event.reasons.map(reason => html`<span class="reason-badge">${reason}</span>`)}
                  </div>
                ` : nothing}
              </div>
              
              ${event.category === 'alert' ? html`
                  <div class="event-probability" style="color: ${this._getSeverityColor(event.severity, event.sensor_type)}">
                    ${this._formatProb(event.severity)}
                  </div>
                ` : html`
                   <div class="event-probability">
                     <ha-icon icon="mdi:water"></ha-icon>
                   </div>
                `}
            </div>
          </div>
        `) : html`
          <div class="empty-state">No events found for "${filters.find(f => f.id === this._activeFilter)?.label}".</div>
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
