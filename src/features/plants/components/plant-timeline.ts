import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { PlantTimelineEvent, TimelineEventMetadata } from '../../../types';
import { addPlantNote, deleteEvent } from '../../../slices/logbook';
import { formatRelativeDay, formatTime, getDateKey } from '../../../utils/date-utils';
import { sharedStyles } from '../../../styles/shared.styles';
import '../../shared/ui/quick-note-input';
import '../../environment/components/vpd-heatmap';
import '../../shared/ui/confirm-delete-dialog';
import {
  mdiAlertCircle,
  mdiDelete,
  mdiNote,
  mdiTag,
  mdiThermometer,
  mdiWaterPercent,
  mdiGauge,
  mdiFlash,
  mdiCupWater,
  mdiFlaskOutline,
  mdiFlower,
  mdiHairDryer,
  mdiCannabis,
  mdiSprout,
  mdiNoteText,
  mdiWater,
  mdiBug,
  mdiLeaf,
  mdiWeatherSunny,
  mdiWeatherNight,
  mdiDumbbell,
} from '@mdi/js';

// Correlation window constant
const CORRELATION_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

@customElement('plant-timeline')
export class PlantTimeline extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: String }) plant_id!: string;
  @property({ type: Array }) events: PlantTimelineEvent[] = [];

  @state() private _showDeleteConfirmation = false;
  @state() private _deletingEventId: string | number | null = null;
  @state() private _hoveredImage: string | null = null;

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
        background: var(--stage-color, var(--divider-color));
      }
      .event {
        position: relative;
        padding: 12px;
        border-radius: 8px;
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.05));
      }
      .delete-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        background: transparent;
        border: none;
        color: var(--secondary-text-color);
        cursor: pointer;
        padding: 4px;
        opacity: 0;
        transition: opacity 0.2s;
        z-index: 10;
      }
      .event:hover .delete-btn {
        opacity: 1;
      }
      .delete-btn:hover {
        color: var(--error-color);
      }
      .icon-wrapper {
        position: absolute;
        left: -37px;
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
        font-size: 0.95rem;
        color: var(--primary-text-color, #fff);
        font-weight: 600;
      }
      .details {
        margin-top: 4px;
        font-size: 0.85rem;
        color: var(--secondary-text-color, #ccc);
        line-height: 1.4;
      }

      /* Quick Note - styles now handled by quick-note-input component */

      /* Metadata Chips */
      .metadata-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }
      .chip {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.1);
        font-size: 0.75rem;
        color: var(--secondary-text-color);
        border: 1px solid transparent;
      }
      .chip svg {
        width: 12px;
        height: 12px;
        fill: currentColor;
      }
      .chip.sensor {
        border-color: rgba(var(--rgb-primary-color), 0.2);
      }
      .chip.action-stat {
        background: rgba(var(--rgb-primary-color), 0.1);
        color: var(--primary-color);
      }

      /* Image Grid */
      .image-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 8px;
        margin-top: 12px;
      }
      .image-grid img {
        width: 100%;
        aspect-ratio: 1;
        object-fit: cover;
        border-radius: 6px;
        cursor: pointer;
        transition: transform 0.2s;
        border: 1px solid var(--divider-color);
      }
      .image-grid img:hover {
        transform: scale(1.02);
      }

      /* Tags */
      .tags {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 6px;
      }
      .tag {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.7rem;
        padding: 1px 6px;
        border-radius: 4px;
        background: var(--divider-color);
        color: var(--secondary-text-color);
      }

      /* Milestone Banner */
      .event.type-milestone {
        border-left: 4px solid var(--success-color);
        background: linear-gradient(
          90deg,
          rgba(var(--rgb-success-color), 0.15) 0%,
          transparent 100%
        );
      }
      .event.type-milestone .content {
        font-size: 1.05rem;
        letter-spacing: 0.5px;
        color: var(--success-color);
      }

      /* Type specific styling */
      .type-alert .icon-wrapper {
        border-color: var(--error-color, #f44336);
      }
      .type-alert .icon-wrapper svg {
        fill: var(--error-color, #f44336);
      }
      .type-action .icon-wrapper {
        border-color: var(--primary-color, #03a9f4);
      }
      .type-action .icon-wrapper svg {
        fill: var(--primary-color, #03a9f4);
      }
      .type-stage_change .icon-wrapper {
        border-color: var(--success-color, #4caf50);
      }
      .type-stage_change .icon-wrapper svg {
        fill: var(--success-color, #4caf50);
      }
      .type-note .icon-wrapper {
        border-color: var(--warning-color, #ff9800);
      }
      .type-note .icon-wrapper svg {
        fill: var(--warning-color, #ff9800);
      }
      .type-environmental_report.is-night .icon-wrapper {
        border-color: #3f51b5;
      }
      .type-environmental_report.is-night .icon-wrapper svg {
        fill: #3f51b5;
      }
      .type-environmental_report.is-day .icon-wrapper {
        border-color: #ffc107;
      }
      .type-environmental_report.is-day .icon-wrapper svg {
        fill: #ffc107;
      }

      /* Action specific styling */
      .action-ipm .icon-wrapper {
        border-color: #9c27b0;
      }
      .action-ipm .icon-wrapper svg {
        fill: #9c27b0;
      }
      .action-training .icon-wrapper {
        border-color: var(--gm-warning-color, #ff9800);
      }
      .action-training .icon-wrapper svg {
        fill: var(--gm-warning-color, #ff9800);
      }
      .action-water .icon-wrapper,
      .action-watering .icon-wrapper,
      .action-irrigation .icon-wrapper {
        border-color: var(--gm-info-color, #2196f3);
      }
      .action-water .icon-wrapper svg,
      .action-watering .icon-wrapper svg,
      .action-irrigation .icon-wrapper svg {
        fill: var(--gm-info-color, #2196f3);
      }

      /* Day grouping */
      .day-header {
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--primary-color, #03a9f4);
        padding: 12px 0 8px 12px;
        margin-left: -24px;
        background: var(--card-background-color, #1c1c1c);
        position: sticky;
        top: 0;
        z-index: 2;
        border-bottom: 1px solid var(--divider-color);
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .day-summary {
        margin: 8px 0 16px 0;
        padding: 8px 12px;
        background: rgba(var(--rgb-warning-color), 0.1);
        border: 1px solid rgba(var(--rgb-warning-color), 0.2);
        border-radius: 8px;
        font-size: 0.85rem;
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--warning-color);
      }
      .correlated-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: var(--success-color);
        color: white;
        font-size: 0.65rem;
        padding: 1px 4px;
        border-radius: 4px;
        margin-left: 8px;
        vertical-align: middle;
      }

      /* Delete dialog styles now handled by confirm-delete-dialog component */

      .image-hover-overlay {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 9999;
        pointer-events: none;
        background: rgba(0, 0, 0, 0.9);
        border-radius: 8px;
        padding: 4px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        max-width: 90vw;
        max-height: 90vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .image-hover-overlay img {
        max-width: 100%;
        max-height: 100%;
        border-radius: 4px;
        object-fit: contain;
      }
    `,
  ];

  private _getIcon(event: PlantTimelineEvent) {
    const { type } = event;
    switch (type) {
      case 'stage_change': {
        const to = event.to?.toLowerCase();
        if (to === 'flower') return mdiFlower;
        if (to === 'dry') return mdiHairDryer;
        if (to === 'cure') return mdiCannabis;
        return mdiSprout;
      }
      case 'alert':
        return mdiAlertCircle;
      case 'note':
        return mdiNoteText;
      case 'milestone': {
        const label = event.label?.toLowerCase() || '';
        if (label.includes('flower')) return mdiFlower;
        if (label.includes('dry')) return mdiHairDryer;
        if (label.includes('cure')) return mdiCannabis;
        return mdiSprout;
      }
      case 'action': {
        const action = event.action;
        if (action === 'water' || action === 'watering') return mdiWater;
        if (action === 'ipm') return mdiBug;
        if (action === 'training') return mdiDumbbell;
        return mdiLeaf;
      }
      case 'environmental_report':
        return event.sensor_type === 'night_report' ? mdiWeatherNight : mdiWeatherSunny;
      default:
        return mdiLeaf;
    }
  }

  private _getStageColor(stage?: string): string {
    switch (stage?.toLowerCase()) {
      case 'flower':
        return '#e91e63';
      case 'veg':
        return '#4caf50';
      case 'seedling':
        return '#8bc34a';
      case 'clone':
        return '#66bb6a';
      case 'mother':
        return '#2e7d32';
      case 'dry':
        return '#ff9800';
      case 'cure':
        return '#795548';
      default:
        return 'var(--divider-color)';
    }
  }

  private _isCorrelated(event: PlantTimelineEvent, allEvents: PlantTimelineEvent[]): boolean {
    if (event.type !== 'note') return false;
    const noteTime = new Date(event.date).getTime();
    // Check for alerts within correlation window before this note
    return allEvents.some((e) => {
      if (e.type !== 'alert') return false;
      const alertTime = new Date(e.date).getTime();
      const diff = noteTime - alertTime;
      return diff > 0 && diff < CORRELATION_WINDOW_MS;
    });
  }

  // Date formatting methods replaced by shared date utilities

  private async _handleNoteSubmit(e: CustomEvent) {
    const noteInput = this.shadowRoot?.querySelector('quick-note-input');
    if (!noteInput) return;

    noteInput.setSaving(true);

    try {
      await addPlantNote(this.plant_id, {
        notes: e.detail.text,
        images: e.detail.images,
      });

      // Clear input on success
      noteInput.clear();

      // Allow time for recorder to write to DB
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Fire refresh event
      this.dispatchEvent(new CustomEvent('growspace-refresh', { bubbles: true, composed: true }));
    } catch (err) {
      console.error('Error adding note:', err);
    } finally {
      noteInput.setSaving(false);
    }
  }

  private _deleteEvent(e: Event, eventId: string | number) {
    e.stopPropagation();
    this._deletingEventId = eventId;
    this._showDeleteConfirmation = true;
  }

  private async _confirmDeleteEvent() {
    if (this._deletingEventId === null) return;

    try {
      await deleteEvent(this._deletingEventId);
      this.dispatchEvent(new CustomEvent('growspace-refresh', { bubbles: true, composed: true }));
    } catch (err) {
      console.error('Error deleting event:', err);
    } finally {
      this._showDeleteConfirmation = false;
      this._deletingEventId = null;
    }
  }

  // Delete overlay now handled by confirm-delete-dialog component

  private _renderHoverOverlay(): TemplateResult | typeof nothing {
    if (!this._hoveredImage) return nothing;
    return html`
      <div class="image-hover-overlay">
        <img src=${this._hoveredImage} />
      </div>
    `;
  }

  // Image handling now done by quick-note-input component

  render() {
    // Sort events descending
    const sortedEvents = [...(this.events || [])]
      .filter((e) => e.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Group by day using shared utility
    const groupedByDay = new Map<string, typeof sortedEvents>();
    for (const event of sortedEvents) {
      const date = new Date(event.date);
      const dayKey = getDateKey(date);
      if (!groupedByDay.has(dayKey)) {
        groupedByDay.set(dayKey, []);
      }
      groupedByDay.get(dayKey)!.push(event);
    }

    const latestStageEvent = sortedEvents.find(
      (e) => e.type === 'stage_change' || e.type === 'milestone'
    );
    const currentStage = latestStageEvent
      ? latestStageEvent.type === 'stage_change'
        ? latestStageEvent.to
        : latestStageEvent.label
      : undefined;
    const stageColor = this._getStageColor(currentStage);

    return html`
      <div class="timeline" style="--stage-color: ${stageColor}">
        <confirm-delete-dialog
          .open=${this._showDeleteConfirmation}
          @confirm=${this._confirmDeleteEvent}
          @cancel=${() => (this._showDeleteConfirmation = false)}
        ></confirm-delete-dialog>

        ${this._renderHoverOverlay()}

        <!-- Quick Note Section -->
        <quick-note-input @submit=${this._handleNoteSubmit}></quick-note-input>

        ${sortedEvents.length === 0
          ? html`
              <div style="text-align: center; color: var(--secondary-text-color); padding: 20px;">
                No entries for this plant yet.
              </div>
            `
          : Array.from(groupedByDay.entries()).map(([_, dayEvents]) => {
              const alerts = dayEvents.filter((e) => e.type === 'alert');
              const others = dayEvents.filter((e) => e.type !== 'alert');

              return html`
                <div class="day-group">
                  <div class="day-header">${formatRelativeDay(new Date(dayEvents[0].date))}</div>

                  ${alerts.length > 2
                    ? html`
                        <div class="day-summary glass-surface">
                          <svg
                            viewBox="0 0 24 24"
                            style="width: 20px; height: 20px; fill: var(--warning-color); margin-right: 8px;"
                          >
                            <path d="${mdiAlertCircle}" />
                          </svg>
                          <span
                            >${alerts.length} system alerts recorded. Environment may require
                            attention.</span
                          >
                        </div>
                      `
                    : alerts.map((event) => this._renderEvent(event, sortedEvents))}
                  ${others.map((event) => this._renderEvent(event, sortedEvents))}
                </div>
              `;
            })}
      </div>
    `;
  }

  private _renderEvent(event: PlantTimelineEvent, allEvents: PlantTimelineEvent[]) {
    const isCorrelated = event.type === 'note' && this._isCorrelated(event, allEvents);

    return html`
      <div
        class="event type-${event.type} ${event.type === 'action' && event.action
          ? 'action-' + event.action
          : ''} ${event.type === 'environmental_report'
          ? event.sensor_type === 'night_report'
            ? 'is-night'
            : 'is-day'
          : ''} glass-surface"
      >
        <div class="icon-wrapper">
          <svg viewBox="0 0 24 24">
            <path d="${this._getIcon(event)}" />
          </svg>
        </div>
        ${event.event_id
          ? html`
              <button
                class="delete-btn"
                @click=${(e: Event) => this._deleteEvent(e, event.event_id!)}
              >
                <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor;">
                  <path d="${mdiDelete}" />
                </svg>
              </button>
            `
          : nothing}
        <div class="date">
          ${formatTime(new Date(event.date))}
          ${isCorrelated ? html`<span class="correlated-badge">System Correlated</span>` : nothing}
        </div>
        ${this._renderEventContent(event)} ${this._renderMetadata(event.metadata)}
        ${this._renderImages(event.images)} ${this._renderTags(event.tags)}
      </div>
    `;
  }

  private _renderEventContent(event: PlantTimelineEvent) {
    switch (event.type) {
      case 'stage_change':
        return html`
          <div class="content">Stage Changed</div>
          <div class="details">
            Transitioned from <strong>${event.from}</strong> to <strong>${event.to}</strong>
          </div>
        `;
      case 'milestone':
        return html`
          <div class="content">${event.label} Started</div>
          <div class="details">Agricultural milestone reached.</div>
        `;
      case 'action': {
        const label =
          event.action === 'ipm'
            ? 'IPM'
            : event.action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        return html`
          <div class="content">${label}</div>
          ${event.details ? html`<div class="details">${event.details}</div>` : nothing}
        `;
      }
      case 'alert':
        return html`
          <div class="content" style="color: var(--error-color)">
            Critical Alert: ${event.message}
          </div>
          <div class="details">Severity: ${event.severity}</div>
        `;
      case 'environmental_report': {
        const isDay = event.sensor_type !== 'night_report';
        return html`
          <div class="content" style="color: ${isDay ? '#ffc107' : '#3f51b5'}">
            ${isDay ? 'Day' : 'Night'} Environmental Report
          </div>
          <div class="details">
            ${event.reasons?.map(
              (r: string) =>
                html`<span
                  style="margin-right: 8px; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;"
                  >${r}</span
                >`
            )}
          </div>
          ${(() => {
            // Robust Data Extraction: Prefer metadata, fallback to parsing 'reasons'
            const { temperature, humidity, vpd } = this._getEnvironmentalData(event);

            return temperature !== undefined && humidity !== undefined
              ? html`
                  <div
                    style="margin-top: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 12px; border: 1px solid var(--divider-color);"
                  >
                    <vpd-heatmap
                      .temperature=${temperature}
                      .humidity=${humidity}
                      .vpd=${vpd}
                      .stage=${this._getCurrentStage()}
                      .hass=${this.hass}
                    ></vpd-heatmap>
                  </div>
                `
              : nothing;
          })()}
        `;
      }
      case 'note':
        return html`
          <div class="content">Note</div>
          <div class="details">${event.text}</div>
        `;
    }
  }

  private _renderMetadata(metadata?: TimelineEventMetadata) {
    if (!metadata || Object.keys(metadata).length === 0) return nothing;

    const items = [
      { key: 'temperature', icon: mdiThermometer, label: '°C' },
      { key: 'humidity', icon: mdiWaterPercent, label: '%' },
      { key: 'vpd', icon: mdiGauge, label: ' kPa' },
      { key: 'ph', icon: mdiFlaskOutline, label: 'pH ', prefix: true },
      { key: 'ec', icon: mdiFlash, label: 'EC ', prefix: true },
      { key: 'amount_ml', icon: mdiCupWater, label: 'ml' },
    ];

    return html`
      <div class="metadata-chips">
        ${items.map((item) => {
          const val = metadata[item.key as keyof TimelineEventMetadata];
          if (val === undefined || val === null) return nothing;
          const display = item.prefix ? `${item.label}${val}` : `${val}${item.label}`;
          return html`
            <div class="chip ${item.key === 'ph' || item.key === 'ec' ? 'action-stat' : 'sensor'}">
              <svg viewBox="0 0 24 24" style="fill: currentColor;"><path d="${item.icon}" /></svg>
              <span>${display}</span>
            </div>
          `;
        })}
      </div>
    `;
  }

  private _renderImages(images?: string[]) {
    if (!images || images.length === 0) return nothing;

    return html`
      <div class="image-grid">
        ${images.map((img) => {
          // If it's a relative path, prefix with /api/growspace_manager/v1/images/
          const src = img.startsWith('data:') ? img : `/api/growspace_manager/v1/images/${img}`;
          return html`
            <img
              src=${src}
              @click=${() => this._openImage(src)}
              @mouseenter=${() => (this._hoveredImage = src)}
              @mouseleave=${() => (this._hoveredImage = null)}
            />
          `;
        })}
      </div>
    `;
  }

  private _renderTags(tags?: string[]) {
    if (!tags || tags.length === 0) return nothing;
    return html`
      <div class="tags">
        ${tags.map(
          (tag) => html`
            <div class="tag">
              <svg viewBox="0 0 24 24" style="width:10px;height:10px;fill:currentColor;">
                <path d="${mdiTag}" />
              </svg>
              ${tag}
            </div>
          `
        )}
      </div>
    `;
  }

  private _openImage(src: string) {
    window.open(src, '_blank');
  }

  private _getCurrentStage(): 'seedling' | 'vegetative' | 'flower' | 'late_flower' {
    // Basic mapping from plant events/state to heatmap stage
    // Default to vegetative if unsure
    const sortedEvents = this.events || [];
    const latestStageEvent = sortedEvents
      .filter((e) => e.type === 'stage_change' || e.type === 'milestone')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    // If no events, try to infer from passed stage if available (though not passed as prop here directly except via events)
    // The parent passes events, but not the plant entity directly.
    // However, we can look at the latest stage event.

    if (!latestStageEvent) return 'vegetative';

    const stage =
      latestStageEvent.type === 'stage_change'
        ? latestStageEvent.to?.toLowerCase()
        : latestStageEvent.label?.toLowerCase();

    if (stage === 'seedling' || stage === 'clone') return 'seedling';
    if (stage === 'veg' || stage === 'vegetative' || stage === 'mother') return 'vegetative';
    if (stage === 'flower') return 'flower';
    if (stage === 'late_flower' || stage === 'ripen' || stage === 'flush') return 'late_flower';
    if (stage === 'dry' || stage === 'cure') return 'late_flower'; // Heatmap less relevant here but keep valid

    return 'vegetative';
  }

  private _getEnvironmentalData(event: PlantTimelineEvent) {
    const temperature = event.metadata?.temperature;
    const humidity = event.metadata?.humidity;
    const vpd = event.metadata?.vpd;

    if (event.type !== 'environmental_report' || !event.reasons) {
      return { temperature, humidity, vpd };
    }

    if (temperature !== undefined && humidity !== undefined && vpd !== undefined) {
      return { temperature, humidity, vpd };
    }

    let parsedTemp = temperature;
    let parsedHum = humidity;
    let parsedVpd = vpd;

    const parse = (label: string, current: number | undefined, reason: string) => {
      if (current !== undefined || !reason.includes(label)) {
        return current;
      }
      const m = reason.match(new RegExp(`${label}:\\s*([\\d.]+)`));
      return m ? parseFloat(m[1]) : current;
    };

    for (const r of event.reasons) {
      parsedTemp = parse('Temperature', parsedTemp, r);
      parsedHum = parse('Humidity', parsedHum, r);
      parsedVpd = parse('VPD', parsedVpd, r);
    }

    return { temperature: parsedTemp, humidity: parsedHum, vpd: parsedVpd };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'plant-timeline': PlantTimeline;
  }
}
