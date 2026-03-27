/**
 * Plant Timeline Tab - Presentational Component
 *
 * Displays plant timeline with milestones and events.
 * Pure component: props in, no events out (read-only display).
 */

import { LitElement, html, css, type TemplateResult, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { TimelineEvent } from '../viewmodels/plant-overview.viewmodel';
import { sharedStyles } from '../../../styles/shared.styles';

@customElement('plant-timeline-tab')
export class PlantTimelineTab extends LitElement {
  @property({ attribute: false }) timelineEvents!: TimelineEvent[];

  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
      }

      .timeline {
        position: relative;
        padding-left: 24px;
        border-left: 2px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        margin-top: 16px;
      }

      .timeline-event {
        margin-bottom: 24px;
        position: relative;
      }

      .timeline-event::before {
        content: '';
        position: absolute;
        left: -31px;
        top: 0;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--event-color, #4caf50);
        border: 2px solid var(--card-background-color, #2c2c2c);
      }

      .timeline-event.milestone::before {
        background: var(--primary-color, #4caf50);
      }

      .timeline-event.action::before {
        background: var(--accent-color, #2196f3);
      }

      .timeline-event.note::before {
        background: var(--warning-color, #ff9800);
      }

      .timeline-date {
        font-size: 0.8rem;
        opacity: 0.6;
        margin-bottom: 4px;
      }

      .timeline-content {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border-radius: 8px;
        padding: 12px;
      }

      .timeline-label {
        font-weight: 500;
        margin-bottom: 4px;
      }

      .timeline-description {
        font-size: 0.9rem;
        opacity: 0.8;
      }

      .timeline-category {
        display: inline-block;
        font-size: 0.75rem;
        padding: 2px 8px;
        border-radius: 4px;
        background: var(--card-background-color, rgba(0, 0, 0, 0.2));
        margin-top: 8px;
        opacity: 0.7;
      }

      .empty-state {
        text-align: center;
        padding: 40px 20px;
        opacity: 0.6;
      }

      .empty-state svg {
        width: 48px;
        height: 48px;
        fill: currentColor;
        margin-bottom: 16px;
      }
    `,
  ];

  render(): TemplateResult {
    if (!this.timelineEvents || this.timelineEvents.length === 0) {
      return this._renderEmptyState();
    }

    return html`
      <div class="timeline">
        ${this.timelineEvents.map((event) => this._renderTimelineEvent(event))}
      </div>
    `;
  }

  private _renderTimelineEvent(event: TimelineEvent): TemplateResult {
    const formattedDate = this._formatDate(event.date);

    return html`
      <div class="timeline-event ${event.type}">
        <div class="timeline-date">${formattedDate}</div>
        <div class="timeline-content">
          <div class="timeline-label">${event.label}</div>
          ${event.description
            ? html`<div class="timeline-description">${event.description}</div>`
            : nothing}
          ${event.category
            ? html`<span class="timeline-category">${event.category}</span>`
            : nothing}
        </div>
      </div>
    `;
  }

  private _renderEmptyState(): TemplateResult {
    return html`
      <div class="empty-state">
        <svg viewBox="0 0 24 24">
          <path
            d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16Z"
          />
        </svg>
        <div>No timeline events yet</div>
        <div style="font-size: 0.9rem; margin-top: 8px;">
          Events will appear here as you interact with your plant
        </div>
      </div>
    `;
  }

  private _formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      // Relative time for recent events
      if (diffMins < 1) {
        return 'Just now';
      } else if (diffMins < 60) {
        return `${diffMins}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      }

      // Absolute date for older events
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'plant-timeline-tab': PlantTimelineTab;
  }
}
