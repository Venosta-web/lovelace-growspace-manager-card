import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { PlantTimelineEvent } from '../../types';
import { sharedStyles } from '../../styles/shared.styles';
import { mdiWater, mdiSprout, mdiAlertCircle, mdiNoteText, mdiLeaf, mdiBug } from '@mdi/js';

@customElement('plant-timeline')
export class PlantTimeline extends LitElement {
  @property({ type: Array }) accessor events: PlantTimelineEvent[] = [];

  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        padding: var(--spacing-md, 16px);
      }
      .timeline {
        position: relative;
        padding-left: 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .timeline::before {
        content: '';
        position: absolute;
        left: 11px;
        top: 0;
        bottom: 0;
        width: 2px;
        background: var(--divider-color, rgba(255, 255, 255, 0.1));
      }
      .event {
        position: relative;
        padding: 12px;
        border-radius: 8px;
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.05));
      }
      .icon-wrapper {
        position: absolute;
        left: -37px; /* 24px padding + 13px center align */
        top: 12px;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: var(--card-background-color, #202020);
        border: 2px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1;
      }
      .icon-wrapper svg {
        width: 16px;
        height: 16px;
        fill: var(--secondary-text-color, #aaa);
      }
      .date {
        font-size: 0.75rem;
        color: var(--secondary-text-color, #aaa);
        margin-bottom: 4px;
      }
      .content {
        font-size: 0.9rem;
        color: var(--primary-text-color, #fff);
        font-weight: 500;
      }
      .details {
        margin-top: 4px;
        font-size: 0.85rem;
        color: var(--secondary-text-color, #ccc);
        line-height: 1.4;
      }
      
      /* Type specific styling */
      .type-alert .icon-wrapper { border-color: var(--error-color, #f44336); }
      .type-alert .icon-wrapper svg { fill: var(--error-color, #f44336); }
      
      .type-action .icon-wrapper { border-color: var(--primary-color, #03a9f4); }
      .type-action .icon-wrapper svg { fill: var(--primary-color, #03a9f4); }

      .type-stage_change .icon-wrapper { border-color: var(--success-color, #4caf50); }
      .type-stage_change .icon-wrapper svg { fill: var(--success-color, #4caf50); }
      
      .type-note .icon-wrapper { border-color: var(--warning-color, #ff9800); }
      .type-note .icon-wrapper svg { fill: var(--warning-color, #ff9800); }

      /* Day grouping */
      .day-group {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .day-header {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--primary-color, #03a9f4);
        padding: 8px 0;
        margin-left: -24px;
        padding-left: 24px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        position: sticky;
        top: 0;
        background: var(--card-background-color, #1c1c1c);
        z-index: 2;
      }
    `
  ];

  private _getIcon(type: string, action?: string) {
    switch (type) {
      case 'stage_change': return mdiSprout;
      case 'alert': return mdiAlertCircle;
      case 'note': return mdiNoteText;
      case 'milestone': return mdiSprout;
      case 'action':
        if (action === 'water' || action === 'watering') return mdiWater;
        if (action === 'ipm') return mdiBug;
        return mdiLeaf;
      default: return mdiLeaf;
    }
  }

  private _formatDate(dateStr: string) {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) throw new Error();
      return date.toLocaleString();
    } catch {
      return dateStr;
    }
  }

  private _formatDayHeader(dateStr: string) {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) throw new Error();
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      }
      return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  private _formatTime(dateStr: string) {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) throw new Error();
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  }

  private _getDateKey(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) throw new Error();
      return date.toDateString();
    } catch {
      return dateStr;
    }
  }

  render() {
    if (!this.events || this.events.length === 0) {
      return html`
            <div class="glass-surface glass-panel" style="text-align: center; color: var(--secondary-text-color);">
                No events recorded.
            </div>
        `;
    }

    // Sort events descending
    const sortedEvents = [...this.events]
      .filter(e => e.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Group by day
    const groupedByDay = new Map<string, typeof sortedEvents>();
    for (const event of sortedEvents) {
      const dayKey = this._getDateKey(event.date);
      if (!groupedByDay.has(dayKey)) {
        groupedByDay.set(dayKey, []);
      }
      groupedByDay.get(dayKey)!.push(event);
    }

    return html`
      <div class="timeline">
        ${Array.from(groupedByDay.entries()).map(([dayKey, events]) => html`
          <div class="day-group">
            <div class="day-header">${this._formatDayHeader(events[0].date)}</div>
            ${events.map(event => html`
              <div class="event type-${event.type} glass-surface">
                <div class="icon-wrapper">
                  <svg viewBox="0 0 24 24">
                    <path d="${this._getIcon(event.type, (event as any).action)}" />
                  </svg>
                </div>
                <div class="date">${this._formatTime(event.date)}</div>
                ${this._renderEventContent(event)}
              </div>
            `)}
          </div>
        `)}
      </div>
    `;
  }

  private _renderEventContent(event: PlantTimelineEvent) {
    switch (event.type) {
      case 'stage_change':
        return html`
            <div class="content">Stage Changed</div>
            <div class="details">Changed from <strong>${event.from}</strong> to <strong>${event.to}</strong></div>
        `;
      case 'milestone':
        return html`
            <div class="content">${event.label} Started</div>
            <div class="details">Milestone reached on ${this._formatDate(event.date)}</div>
        `;
      case 'action':
        const actionLabel = event.action === 'ipm' ? 'IPM' :
          (event.action ? event.action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Action');
        return html`
            <div class="content">${actionLabel}</div>
            ${event.details ? html`<div class="details">${event.details}</div>` : nothing}
        `;
      case 'alert':
        return html`
            <div class="content" style="color: var(--error-color, #f44336)">Alert: ${event.message}</div>
            <div class="details">Severity: ${event.severity}</div>
        `;
      case 'note':
        return html`
            <div class="content">Note</div>
            <div class="details">${event.text}</div>
        `;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'plant-timeline': PlantTimeline;
  }
}
