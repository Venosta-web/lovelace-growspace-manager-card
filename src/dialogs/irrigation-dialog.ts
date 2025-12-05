import { LitElement, html, css, PropertyValues, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { mdiWater, mdiClose, mdiPlus } from '@mdi/js';
import { IrrigationTime } from '../types';
import { DataService } from '../data-service';

@customElement('irrigation-dialog')
export class IrrigationDialog extends LitElement {
    @property({ attribute: false }) public hass!: HomeAssistant;
    @property({ type: Boolean }) public open = false;
    @property({ type: String }) public growspaceId = '';
    @property({ type: String }) public growspaceName = '';
    @property({ type: String }) public growspaceEntityId = '';

    @state() private _irrigation_pump_entity = '';
    @state() private _drain_pump_entity = '';
    @state() private _irrigation_duration = 60;
    @state() private _drain_duration = 60;
    @state() private _irrigation_times: IrrigationTime[] = [];
    @state() private _drain_times: IrrigationTime[] = [];

    @state() private _adding_irrigation_time?: { time: string; duration: number };
    @state() private _adding_drain_time?: { time: string; duration: number };

    private _dataService?: DataService;

    static styles = css`
    :host {
      --mdc-dialog-min-width: 400px;
      --mdc-dialog-max-width: 1000px;
    }
    .glass-dialog-container {
      background: rgba(30, 30, 30, 0.95);
      border-radius: 24px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      color: #fff;
    }
    .dialog-header {
      padding: 20px 24px;
      background: #2d2d2d;
      display: flex;
      align-items: center;
      gap: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .dialog-icon {
      padding: 10px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .dialog-title-group {
      flex: 1;
    }
    .dialog-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }
    .dialog-subtitle {
      font-size: 0.9rem;
      color: var(--secondary-text-color);
      margin-top: 4px;
    }
    .dialog-body {
      padding: 24px;
      overflow-y: auto;
      max-height: 70vh;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .detail-card {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 20px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .md3-button {
      border: none;
      border-radius: 20px;
      padding: 0 24px;
      height: 40px;
      font-family: inherit;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .md3-button.text {
      background: transparent;
      color: var(--primary-text-color);
    }
    .md3-button.text:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    .md3-button.tonal {
      background: rgba(255, 255, 255, 0.1);
      color: var(--primary-text-color);
    }
    .md3-button.tonal:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    .md3-button.primary {
      background: var(--primary-color, #2196F3);
      color: #fff;
    }
    .md3-button.primary:hover {
      filter: brightness(1.1);
      box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
    }
    .md3-input-group {
      margin-bottom: 16px;
    }
    .md3-label {
      display: block;
      margin-bottom: 8px;
      font-size: 0.85rem;
      color: var(--secondary-text-color);
      font-weight: 500;
    }
    .md3-input {
      width: 100%;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 10px 12px;
      color: #fff;
      font-family: inherit;
      font-size: 0.95rem;
      transition: all 0.2s;
      box-sizing: border-box;
    }
    .md3-input:focus {
      outline: none;
      border-color: var(--primary-color, #2196F3);
      background: rgba(0, 0, 0, 0.3);
    }
    .button-group {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      background: #2d2d2d;
    }
  `;

    protected willUpdate(changedProps: PropertyValues): void {
        if (changedProps.has('open') && this.open) {
            this._initializeState();
        }
        if (changedProps.has('hass')) {
            this._dataService = new DataService(this.hass);
        }
    }

    private _initializeState() {
        if (!this.hass || !this.growspaceEntityId) return;

        const stateObj = this.hass.states[this.growspaceEntityId];
        if (!stateObj) return;

        const attrs = stateObj.attributes;
        this._irrigation_pump_entity = attrs.irrigation_pump || '';
        this._drain_pump_entity = attrs.drain_pump || '';
        this._irrigation_duration = attrs.irrigation_duration || 60;
        this._drain_duration = attrs.drain_duration || 60;
        this._irrigation_times = this._parseScheduleString(attrs.irrigation_times || []);
        this._drain_times = this._parseScheduleString(attrs.drain_times || []);
    }

    private _parseScheduleString(scheduleString: string | IrrigationTime[]): IrrigationTime[] {
        if (Array.isArray(scheduleString)) return scheduleString;
        if (!scheduleString) return [];
        return scheduleString.split(',').map(t => {
            const parts = t.trim().split('|');
            return {
                time: parts[0],
                duration: parts[1] ? parseInt(parts[1]) : undefined
            };
        });
    }

    private async _saveSettings() {
        if (!this.growspaceId || !this._dataService) return;

        try {
            await this._dataService.setIrrigationSettings({
                growspace_id: this.growspaceId,
                irrigation_pump_entity: this._irrigation_pump_entity,
                drain_pump_entity: this._drain_pump_entity,
                irrigation_duration: this._irrigation_duration,
                drain_duration: this._drain_duration
            });
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }

    private async _addIrrigationTime(time: string, duration?: number) {
        if (!this.growspaceId || !this._dataService) return;

        try {
            await this._dataService.addIrrigationTime({
                growspace_id: this.growspaceId,
                time,
                duration: duration || this._irrigation_duration
            });

            // Optimistic update
            const newTime: IrrigationTime = { time, duration: duration || this._irrigation_duration };
            this._irrigation_times = [...this._irrigation_times, newTime].sort((a, b) => a.time.localeCompare(b.time));
            this._adding_irrigation_time = undefined;
        } catch (e) {
            console.error('Failed to add irrigation time:', e);
        }
    }

    private async _removeIrrigationTime(time: string) {
        if (!this.growspaceId || !this._dataService) return;

        try {
            await this._dataService.removeIrrigationTime({
                growspace_id: this.growspaceId,
                time
            });

            // Optimistic update
            this._irrigation_times = this._irrigation_times.filter(t => t.time !== time);
        } catch (e) {
            console.error('Failed to remove irrigation time:', e);
        }
    }

    private async _addDrainTime(time: string, duration?: number) {
        if (!this.growspaceId || !this._dataService) return;

        try {
            await this._dataService.addDrainTime({
                growspace_id: this.growspaceId,
                time,
                duration: duration || this._drain_duration
            });

            // Optimistic update
            const newTime: IrrigationTime = { time, duration: duration || this._drain_duration };
            this._drain_times = [...this._drain_times, newTime].sort((a, b) => a.time.localeCompare(b.time));
            this._adding_drain_time = undefined;
        } catch (e) {
            console.error('Failed to add drain time:', e);
        }
    }

    private async _removeDrainTime(time: string) {
        if (!this.growspaceId || !this._dataService) return;

        try {
            await this._dataService.removeDrainTime({
                growspace_id: this.growspaceId,
                time
            });

            // Optimistic update
            this._drain_times = this._drain_times.filter(t => t.time !== time);
        } catch (e) {
            console.error('Failed to remove drain time:', e);
        }
    }

    private _startAddingIrrigationTime(x: number, width: number) {
        const percentage = x / width;
        const totalMinutes = Math.round(percentage * 24 * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

        this._adding_irrigation_time = {
            time: timeStr,
            duration: this._irrigation_duration
        };
    }

    private _startAddingDrainTime(x: number, width: number) {
        const percentage = x / width;
        const totalMinutes = Math.round(percentage * 24 * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

        this._adding_drain_time = {
            time: timeStr,
            duration: this._drain_duration
        };
    }

    private _close() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    protected render() {
        if (!this.open) return nothing;

        const dialogColor = '#2196F3'; // Irrigation Blue

        return html`
      <ha-dialog
        open
        @closed=${this._close}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${''}
      >
        <div class="glass-dialog-container" style="--stage-color: ${dialogColor};">
          <div class="dialog-header">
            <div class="dialog-icon" style="background: ${dialogColor}30; color: ${dialogColor};">
              <svg style="width:32px;height:32px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiWater}"></path>
              </svg>
            </div>
            <div class="dialog-title-group">
              <h2 class="dialog-title">Irrigation Management</h2>
              <div class="dialog-subtitle">${this.growspaceName}</div>
            </div>
            <button class="md3-button text" @click=${this._close} style="min-width: auto; padding: 8px;">
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiClose}"></path>
              </svg>
            </button>
          </div>

          <div class="dialog-body">
            ${this._renderScheduleSection(
            'Irrigation Schedule',
            this._irrigation_times,
            this._irrigation_duration,
            'irrigation',
            dialogColor
        )}

            ${this._renderScheduleSection(
            'Drain Schedule',
            this._drain_times,
            this._drain_duration,
            'drain',
            '#FF9800'
        )}
          </div>

          <div class="button-group">
            <button class="md3-button tonal" @click=${this._close}>
              Close
            </button>
          </div>
        </div>
      </ha-dialog>
    `;
    }

    private _renderScheduleSection(
        title: string,
        times: IrrigationTime[],
        defaultDuration: number,
        type: 'irrigation' | 'drain',
        color: string
    ) {
        const addingTime = type === 'irrigation' ? this._adding_irrigation_time : this._adding_drain_time;

        return html`
      <div class="detail-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="margin: 0;">${title}</h3>
          <button
            @click=${(e: Event) => {
                const container = (e.target as HTMLElement).closest('.detail-card')?.querySelector(`.${type}-time-bar`) as HTMLElement;
                if (container) {
                    const rect = container.getBoundingClientRect();
                    type === 'irrigation'
                        ? this._startAddingIrrigationTime(rect.width / 2, rect.width)
                        : this._startAddingDrainTime(rect.width / 2, rect.width);
                }
            }}
            class="md3-button primary"
            style="background: ${color};"
          >
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiPlus}"></path></svg>
            ADD TIME
          </button>
        </div>

        <div
          class="${type}-time-bar"
          @click=${(e: MouseEvent) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const x = e.clientX - rect.left;
                type === 'irrigation'
                    ? this._startAddingIrrigationTime(x, rect.width)
                    : this._startAddingDrainTime(x, rect.width);
            }}
          style="position: relative; height: 80px; background: rgba(0,0,0,0.3); border-radius: 8px; cursor: crosshair; border: 2px solid ${color}40;"
        >
          ${Array.from({ length: 25 }, (_, i) => i).map(hour => html`
            <div style="position: absolute; left: ${(hour / 24) * 100}%; top: 0; bottom: 0; border-left: 1px solid ${hour % 6 === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)'}; pointer-events: none;">
              ${hour % 3 === 0 ? html`
                <span style="position: absolute; bottom: -22px; left: -12px; font-size: 0.7rem; color: var(--secondary-text-color);">${hour.toString().padStart(2, '0')}:00</span>
              ` : ''}
            </div>
          `)}

          ${times.map((t: IrrigationTime) => {
                const [hours, minutes] = t.time.split(':').map(Number);
                const position = ((hours + minutes / 60) / 24) * 100;
                return html`
              <div
                @click=${(e: Event) => {
                        e.stopPropagation();
                        if (confirm(`Remove ${type} time ${t.time}?`)) {
                            type === 'irrigation'
                                ? this._removeIrrigationTime(t.time)
                                : this._removeDrainTime(t.time);
                        }
                    }}
                style="position: absolute; left: ${position}%; top: 10%; bottom: 10%; width: 4px; background: ${color}; cursor: pointer; box-shadow: 0 0 8px ${color}; border-radius: 2px;"
                title="${t.time} | Duration: ${t.duration || defaultDuration}seconds"
              >
                <div style="position: absolute; left: 8px; top: -24px; background: ${color}; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                  ${t.time} | ${t.duration || defaultDuration}seconds
                </div>
              </div>
            `;
            })}
        </div>

        <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--secondary-text-color);">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>

        ${addingTime ? html`
          <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;" 
               @click=${() => type === 'irrigation' ? this._adding_irrigation_time = undefined : this._adding_drain_time = undefined}>
            <div class="detail-card" style="max-width: 400px; margin: 0;" @click=${(e: Event) => e.stopPropagation()}>
              <h3>Add ${title} Time</h3>

              <div class="md3-input-group">
                <label class="md3-label">Time</label>
                <input
                  type="time"
                  class="md3-input"
                  .value=${addingTime.time}
                  @input=${(e: Event) => {
                    const val = (e.target as HTMLInputElement).value;
                    if (type === 'irrigation' && this._adding_irrigation_time) this._adding_irrigation_time = { ...this._adding_irrigation_time, time: val };
                    if (type === 'drain' && this._adding_drain_time) this._adding_drain_time = { ...this._adding_drain_time, time: val };
                }}
                />
              </div>

              <div class="md3-input-group">
                <label class="md3-label">Duration (seconds)</label>
                <input
                  type="number"
                  class="md3-input"
                  .value=${addingTime.duration.toString()}
                  @input=${(e: Event) => {
                    const val = parseInt((e.target as HTMLInputElement).value);
                    if (!isNaN(val)) {
                        if (type === 'irrigation' && this._adding_irrigation_time) this._adding_irrigation_time = { ...this._adding_irrigation_time, duration: val };
                        if (type === 'drain' && this._adding_drain_time) this._adding_drain_time = { ...this._adding_drain_time, duration: val };
                    }
                }}
                  min="1"
                />
              </div>

              <div class="button-group">
                <button class="md3-button tonal" @click=${() => type === 'irrigation' ? this._adding_irrigation_time = undefined : this._adding_drain_time = undefined}>
                  Cancel
                </button>
                <button
                  class="md3-button primary"
                  @click=${() => {
                    type === 'irrigation'
                        ? this._addIrrigationTime(addingTime.time, addingTime.duration)
                        : this._addDrainTime(addingTime.time, addingTime.duration);
                }}
                  style="background: ${color};"
                >
                  Add Schedule
                </button>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
    }
}
