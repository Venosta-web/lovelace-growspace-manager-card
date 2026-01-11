import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { PlantTimelineEvent, TimelineEventMetadata } from '../../types';
import { sharedStyles } from '../../styles/shared.styles';
import {
  mdiWater, mdiSprout, mdiAlertCircle, mdiNoteText, mdiLeaf, mdiBug,
  mdiThermometer, mdiWaterPercent, mdiGauge, mdiFlaskOutline, mdiFlash,
  mdiCupWater, mdiTag, mdiCameraPlus, mdiSend, mdiClose
} from '@mdi/js';

@customElement('plant-timeline')
export class PlantTimeline extends LitElement {
  @property({ attribute: false }) accessor hass!: HomeAssistant;
  @property({ type: String }) accessor plant_id!: string;
  @property({ type: Array }) accessor events: PlantTimelineEvent[] = [];

  @state() private accessor _noteText = '';
  @state() private accessor _noteImages: string[] = [];
  @state() private accessor _isSaving = false;

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

      /* Quick Note */
      .quick-note {
        margin-bottom: 24px;
        padding: 12px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px dashed var(--divider-color);
      }
      .note-input {
        display: flex;
        gap: 8px;
        align-items: flex-start;
      }
      .note-input textarea {
        flex: 1;
        background: transparent;
        border: none;
        color: var(--primary-text-color);
        font-size: 0.9rem;
        resize: none;
        padding: 4px;
        outline: none;
      }
      .note-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 8px;
      }
      .image-previews {
        display: flex;
        gap: 8px;
        margin-top: 8px;
        overflow-x: auto;
      }
      .preview-item {
        position: relative;
        width: 60px;
        height: 60px;
      }
      .preview-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 4px;
      }
      .remove-img {
        position: absolute;
        top: -4px;
        right: -4px;
        background: var(--error-color);
        color: white;
        border-radius: 50%;
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        border: none;
      }

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
      .chip.sensor { border-color: rgba(var(--rgb-primary-color), 0.2); }
      .chip.action-stat { background: rgba(var(--rgb-primary-color), 0.1); color: var(--primary-color); }

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
        font-size: 0.7rem;
        padding: 1px 6px;
        border-radius: 4px;
        background: var(--divider-color);
        color: var(--secondary-text-color);
      }

      /* Milestone Banner */
      .event.type-milestone {
        border-left: 4px solid var(--success-color);
        background: linear-gradient(90deg, rgba(var(--rgb-success-color), 0.15) 0%, transparent 100%);
      }
      .event.type-milestone .content {
        font-size: 1.05rem;
        letter-spacing: 0.5px;
        color: var(--success-color);
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

  private _getStageColor(stage?: string): string {
    switch (stage?.toLowerCase()) {
      case 'flower': return '#e91e63';
      case 'veg': return '#4caf50';
      case 'seedling': return '#8bc34a';
      case 'clone': return '#66bb6a';
      case 'mother': return '#2e7d32';
      case 'dry': return '#ff9800';
      case 'cure': return '#795548';
      default: return 'var(--divider-color)';
    }
  }

  private _isCorrelated(event: PlantTimelineEvent, allEvents: PlantTimelineEvent[]): boolean {
    if (event.type !== 'note') return false;
    const noteTime = new Date(event.date).getTime();
    // Check for alerts within 2 hours before this note
    return allEvents.some(e => {
      if (e.type !== 'alert') return false;
      const alertTime = new Date(e.date).getTime();
      const diff = noteTime - alertTime;
      return diff > 0 && diff < 2 * 60 * 60 * 1000;
    });
  }

  private _formatDayHeader(dateStr: string) {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) throw new Error();
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) return 'Today';
      if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
      return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return dateStr; }
  }

  private _formatTime(dateStr: string) {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) throw new Error();
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr; }
  }

  private _getDateKey(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) throw new Error();
      return date.toDateString();
    } catch { return dateStr; }
  }

  private _formatDate(dateStr: string) {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) throw new Error();
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return dateStr; }
  }

  async _submitNote() {
    if (!this._noteText.trim() && !this._noteImages.length) return;
    this._isSaving = true;

    try {
      await this.hass.callWS({
        type: 'growspace_manager/add_timeline_note',
        plant_id: this.plant_id,
        notes: this._noteText,
        images: this._noteImages,
        transition_date: new Date().toISOString()
      });
      this._noteText = '';
      this._noteImages = [];
      // Fire refresh event
      this.dispatchEvent(new CustomEvent('growspace-refresh', { bubbles: true, composed: true }));
    } catch (e) {
      console.error(e);
    } finally {
      this._isSaving = false;
    }
  }

  private async _resizeImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Max dimensions
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG 0.8
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        };
        img.onerror = (e) => reject(e);
        img.src = e.target?.result as string;
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }

  private async _handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files) return;

    // Process files sequentially or in parallel, but await them
    const files = Array.from(input.files);
    for (const file of files) {
      try {
        const resized = await this._resizeImage(file);
        this._noteImages = [...this._noteImages, resized];
      } catch (err) {
        console.error('Error processing image:', err);
      }
    }
    
    // Clear input to allow re-selecting same file if needed
    input.value = '';
  }

  private _removeImage(index: number) {
    this._noteImages = this._noteImages.filter((_, i) => i !== index);
  }

  render() {
    // Sort events descending
    const sortedEvents = [...(this.events || [])]
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

    const latestStageEvent = sortedEvents.find(e => e.type === 'stage_change' || e.type === 'milestone');
    const currentStage = (latestStageEvent as any)?.to || (latestStageEvent as any)?.label;
    const stageColor = this._getStageColor(currentStage);

    return html`
      <div class="timeline" style="--stage-color: ${stageColor}">
        <!-- Quick Note Section -->
        <div class="quick-note glass-surface">
          <div class="note-input">
            <textarea 
              placeholder="Add a cultivation note..." 
              .value=${this._noteText}
              @input=${(e: any) => this._noteText = e.target.value}
              rows="2"
            ></textarea>
          </div>
          
          ${this._noteImages.length > 0 ? html`
            <div class="image-previews">
              ${this._noteImages.map((img, i) => html`
                <div class="preview-item">
                  <img src=${img} />
                  <button class="remove-img" @click=${() => this._removeImage(i)}>
                    <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
                  </button>
                </div>
              `)}
            </div>
          ` : nothing}

          <div class="note-actions">
            <div style="display: flex; gap: 8px;">
              <input 
                type="file" 
                id="fileInput" 
                @change=${this._handleFileSelect} 
                multiple 
                accept="image/*" 
                style="display: none;"
              >
              <ha-icon-button @click=${() => this.shadowRoot?.getElementById('fileInput')?.click()}>
                <ha-svg-icon .path=${mdiCameraPlus}></ha-svg-icon>
              </ha-icon-button>
            </div>
            <ha-icon-button 
              .disabled=${(!this._noteText.trim() && !this._noteImages.length) || this._isSaving}
              @click=${this._submitNote}
            >
              <ha-svg-icon .path=${mdiSend}></ha-svg-icon>
            </ha-icon-button>
          </div>
        </div>

        ${sortedEvents.length === 0 ? html`
          <div style="text-align: center; color: var(--secondary-text-color); padding: 20px;">
            No entries for this plant yet.
          </div>
        ` : Array.from(groupedByDay.entries()).map(([_, dayEvents]) => {
      const alerts = dayEvents.filter(e => e.type === 'alert');
      const others = dayEvents.filter(e => e.type !== 'alert');

      return html`
              <div class="day-group">
                <div class="day-header">${this._formatDayHeader(dayEvents[0].date)}</div>
                
                ${alerts.length > 2 ? html`
                  <div class="day-summary glass-surface">
                    <ha-svg-icon .path=${mdiAlertCircle}></ha-svg-icon>
                    <span>${alerts.length} system alerts recorded. Environment may require attention.</span>
                  </div>
                ` : alerts.map(event => this._renderEvent(event, sortedEvents))}

                ${others.map(event => this._renderEvent(event, sortedEvents))}
              </div>
            `;
    })}
      </div>
    `;
  }

  private _renderEvent(event: PlantTimelineEvent, allEvents: PlantTimelineEvent[]) {
    const isCorrelated = event.type === 'note' && this._isCorrelated(event, allEvents);

    return html`
      <div class="event type-${event.type} glass-surface">
        <div class="icon-wrapper">
          <svg viewBox="0 0 24 24">
            <path d="${this._getIcon(event.type, (event as any).action)}" />
          </svg>
        </div>
        <div class="date">
          ${this._formatTime(event.date)}
          ${isCorrelated ? html`<span class="correlated-badge">System Correlated</span>` : nothing}
        </div>
        ${this._renderEventContent(event)}
        ${this._renderMetadata(event.metadata)}
        ${this._renderImages(event.images)}
        ${this._renderTags(event.tags)}
      </div>
    `;
  }

  private _renderEventContent(event: PlantTimelineEvent) {
    switch (event.type) {
      case 'stage_change':
        return html`
            <div class="content">Stage Changed</div>
            <div class="details">Transitioned from <strong>${event.from}</strong> to <strong>${event.to}</strong></div>
        `;
      case 'milestone':
        return html`
            <div class="content">${event.label} Started</div>
            <div class="details">Agricultural milestone reached.</div>
        `;
      case 'action':
        const label = event.action === 'ipm' ? 'IPM' :
          event.action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        return html`
            <div class="content">${label}</div>
            ${event.details ? html`<div class="details">${event.details}</div>` : nothing}
        `;
      case 'alert':
        return html`
            <div class="content" style="color: var(--error-color)">Critical Alert: ${event.message}</div>
            <div class="details">Severity: ${event.severity}</div>
        `;
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
        ${items.map(item => {
      const val = (metadata as any)[item.key];
      if (val === undefined || val === null) return nothing;
      const display = item.prefix ? `${item.label}${val}` : `${val}${item.label}`;
      return html`
            <div class="chip ${item.key === 'ph' || item.key === 'ec' ? 'action-stat' : 'sensor'}">
              <svg viewBox="0 0 24 24"><path d="${item.icon}" /></svg>
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
        ${images.map(img => {
      // If it's a relative path, prefix with /api/growspace_manager/v1/images/
      const src = img.startsWith('data:') ? img : `/api/growspace_manager/v1/images/${img}`;
      return html`<img src=${src} @click=${() => this._openImage(src)} />`;
    })}
      </div>
    `;
  }

  private _renderTags(tags?: string[]) {
    if (!tags || tags.length === 0) return nothing;
    return html`
      <div class="tags">
        ${tags.map(tag => html`
          <div class="tag">
            <svg viewBox="0 0 24 24" style="width:10px;height:10px;fill:currentColor;margin-right:2px;"><path d="${mdiTag}" /></svg>
            ${tag}
          </div>
        `)}
      </div>
    `;
  }

  private _openImage(src: string) {
    window.open(src, '_blank');
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'plant-timeline': PlantTimeline;
  }
}
