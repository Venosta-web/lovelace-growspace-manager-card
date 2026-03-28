/**
 * Plant Timeline Tab - Presentational Component
 *
 * Thin wrapper around plant-timeline that passes events through.
 * Pure component: props in, events out (delete/refresh from plant-timeline).
 */

import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { HomeAssistant } from 'custom-card-helpers';
import type { PlantTimelineEvent } from '../../../types';
import '../../../components/plant/plant-timeline';

@customElement('plant-timeline-tab')
export class PlantTimelineTab extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: String }) plantId!: string;
  @property({ attribute: false }) events: PlantTimelineEvent[] = [];

  render(): TemplateResult {
    return html`
      <plant-timeline
        .hass=${this.hass}
        .plant_id=${this.plantId}
        .events=${this.events}
        @growspace-refresh=${this._handleRefresh}
      ></plant-timeline>
    `;
  }

  private _handleRefresh(): void {
    this.dispatchEvent(new CustomEvent('timeline-refresh', { bubbles: true, composed: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'plant-timeline-tab': PlantTimelineTab;
  }
}
