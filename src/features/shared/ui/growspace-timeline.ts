import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceEvent } from '../../../types';
import { fetchGrowspaceEvents } from '../../../slices/logbook';
import { getEventTimestamp } from '../../../utils/date-utils';
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

interface EventDay {
  key: string;
  date: Date;
  events: GrowspaceEvent[];
  hasAlert: boolean;
}

@customElement('growspace-timeline')
export class GrowspaceTimeline extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: String }) public growspaceId!: string;

  @state() private _events: GrowspaceEvent[] = [];
  @state() private _isLoading = false;
  @state() private _hasError = false;
  @state() private _errorMessage = '';
  @state() private _selectedDay = '';

  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        height: 100%;
        min-height: 0;
        color: var(--primary-text-color);
      }

      error-boundary {
        display: block;
        height: 100%;
        min-height: 0;
      }

      .timeline {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
      }

      .day-strip {
        display: flex;
        flex: none;
        gap: 4px;
        overflow-x: auto;
        padding: 4px 4px 12px;
        border-bottom: 1px solid var(--divider-color);
        scrollbar-width: thin;
      }

      .day {
        display: flex;
        flex: none;
        flex-direction: column;
        align-items: flex-start;
        gap: 5px;
        min-width: 74px;
        padding: 10px 12px;
        border: 0;
        border-radius: var(--border-radius-sm, 8px);
        background: transparent;
        color: var(--secondary-text-color);
        font: inherit;
        cursor: pointer;
        text-align: left;
      }

      .day:hover {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.06));
        color: var(--primary-text-color);
      }

      .day[aria-pressed='true'] {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.09));
        color: var(--primary-text-color);
        box-shadow: inset 0 -2px var(--primary-color);
      }

      .day:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: -2px;
      }

      .day-date {
        font-size: var(--font-size-sm);
        font-weight: 600;
        white-space: nowrap;
      }

      .day-count {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: var(--font-size-supporting);
        font-variant-numeric: tabular-nums;
      }

      .alert-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--error-color);
      }

      .day-detail {
        overflow-y: auto;
        flex: 1;
        min-height: 0;
        padding: 20px 4px 24px;
        scrollbar-width: thin;
      }

      .day-heading {
        margin: 0 0 16px;
        font-size: 1rem;
        font-weight: 600;
      }

      .event-list {
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .event-row {
        display: grid;
        grid-template-columns: 64px 24px minmax(0, 1fr);
        gap: 12px;
        align-items: start;
        padding: 0 0 20px;
      }

      .event-row:last-child {
        padding-bottom: 0;
      }

      .event-time {
        padding-top: 6px;
        color: var(--secondary-text-color);
        font-size: var(--font-size-supporting);
        font-variant-numeric: tabular-nums;
        text-align: right;
      }

      .event-rail {
        display: flex;
        flex-direction: column;
        align-items: center;
        align-self: stretch;
        gap: 6px;
      }

      .event-marker {
        display: grid;
        flex: none;
        width: 24px;
        height: 24px;
        place-items: center;
        border-radius: 50%;
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.08));
        color: var(--secondary-text-color);
      }

      .event-marker svg {
        width: 14px;
        height: 14px;
        fill: currentColor;
      }

      .marker-alert {
        color: var(--error-color);
      }

      .marker-water {
        color: var(--info-color, #2196f3);
      }

      .marker-note {
        color: var(--warning-color);
      }

      .marker-stage {
        color: var(--success-color);
      }

      .rail-line {
        flex: 1;
        width: 1px;
        min-height: 16px;
        background: var(--divider-color);
      }

      .event-row:last-child .rail-line {
        display: none;
      }

      .event-content {
        min-width: 0;
        padding-top: 3px;
      }

      .event-title {
        font-size: var(--font-size-sm);
        font-weight: 600;
        line-height: 1.4;
        text-transform: capitalize;
      }

      .event-description {
        margin: 3px 0 0;
        color: var(--secondary-text-color);
        font-size: var(--font-size-supporting);
        line-height: 1.45;
        overflow-wrap: anywhere;
      }

      .empty-state {
        display: grid;
        height: 100%;
        place-items: center;
        color: var(--secondary-text-color);
        text-align: center;
      }

      .empty-state.error {
        color: var(--error-color);
      }

      @media (max-width: 600px) {
        .event-row {
          grid-template-columns: 48px 24px minmax(0, 1fr);
          gap: 8px;
        }
      }
    `,
  ];

  protected willUpdate(changedProps: PropertyValues) {
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
      this._selectedDay = '';
    } catch (e: unknown) {
      this._errorMessage = e instanceof Error ? e.message : 'Fetch failed';
      console.error('Error fetching growspace events:', e);
      this._hasError = true;
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
    if (cat === 'alert' || (event.severity || 0) > 0.8) return 'marker-alert';
    if (cat === 'note') return 'marker-note';
    if (type?.includes('water') || type?.includes('irrigation')) return 'marker-water';
    if (cat === 'phase_change') return 'marker-stage';
    return '';
  }

  private _getDays(): EventDay[] {
    const days = new Map<string, EventDay>();
    for (const event of this._events) {
      const time = getEventTimestamp(event);
      if (!Number.isFinite(time)) continue;
      const date = new Date(time);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      let day = days.get(key);
      if (!day) {
        day = { key, date, events: [], hasAlert: false };
        days.set(key, day);
      }
      day.events.push(event);
      day.hasAlert ||= this._getClass(event) === 'marker-alert';
    }
    return [...days.values()]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map((day) => ({
        ...day,
        events: day.events.sort((a, b) => getEventTimestamp(b) - getEventTimestamp(a)),
      }));
  }

  private _getTitle(event: GrowspaceEvent): string {
    if (event.category?.toLowerCase() === 'note') return 'Note';
    return event.sensor_type || event.category || 'Event';
  }

  private _getDescription(event: GrowspaceEvent): string {
    return [event.notes, event.reasons?.join(', ')].filter(Boolean).join(' · ');
  }

  render() {
    if (this._isLoading) return html`<div class="empty-state">Loading timeline...</div>`;
    if (this._hasError)
      return html`<div class="empty-state error" role="alert">${this._errorMessage}</div>`;

    const days = this._getDays();
    if (!days.length) return html`<div class="empty-state">No events to display</div>`;
    const selected = days.find((day) => day.key === this._selectedDay) ?? days[0];
    const dayDate = new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
    });
    const headingDate = new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const eventTime = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });

    return html`
      <error-boundary .fallbackMessage=${'Failed to render timeline'}>
        <div class="timeline">
          <nav class="day-strip" aria-label="Event days">
            ${days.map(
              (day) => html`
                <button
                  class="day"
                  type="button"
                  aria-pressed=${day.key === selected.key}
                  aria-label="${headingDate.format(day.date)}, ${day.events.length} events"
                  @click=${() => (this._selectedDay = day.key)}
                >
                  <span class="day-date">${dayDate.format(day.date)}</span>
                  <span class="day-count">
                    ${day.events.length} ${day.events.length === 1 ? 'event' : 'events'}
                    ${day.hasAlert
                      ? html`<span class="alert-dot" aria-hidden="true"></span>`
                      : nothing}
                  </span>
                </button>
              `
            )}
          </nav>
          <section class="day-detail" aria-label="Events for ${headingDate.format(selected.date)}">
            <h3 class="day-heading">${headingDate.format(selected.date)}</h3>
            <ol class="event-list">
              ${selected.events.map(
                (event) => html`
                  <li class="event-row">
                    <time
                      class="event-time"
                      datetime=${new Date(getEventTimestamp(event)).toISOString()}
                    >
                      ${eventTime.format(getEventTimestamp(event))}
                    </time>
                    <span class="event-rail" aria-hidden="true">
                      <span class="event-marker ${this._getClass(event)}">
                        <svg viewBox="0 0 24 24"><path d="${this._getIcon(event)}"></path></svg>
                      </span>
                      <span class="rail-line"></span>
                    </span>
                    <div class="event-content">
                      <div class="event-title">${this._getTitle(event)}</div>
                      ${this._getDescription(event)
                        ? html`<p class="event-description">${this._getDescription(event)}</p>`
                        : nothing}
                    </div>
                  </li>
                `
              )}
            </ol>
          </section>
        </div>
      </error-boundary>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-timeline': GrowspaceTimeline;
  }
}
