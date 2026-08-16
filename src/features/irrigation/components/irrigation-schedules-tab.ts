/**
 * Irrigation Schedules Tab Component (ADR-0019)
 *
 * The dumb presentational element for the Irrigation Dialog's Schedules tab — the
 * largest tab. `@property .vm: SchedulesTabViewModel` in, semantic Tab Intents
 * out, **no `@state()` of its own** — the inline add/edit drafts live in the
 * DialogStateMachine and are projected into the VM (b1). Markup is transcribed
 * verbatim from the former inline `_renderSchedulesTab` /
 * `_renderCropSteeringSchedule` / `_renderScheduleSection` so the rendered output
 * stays byte-identical; the schedules-specific styles moved here.
 *
 * Time-of-day view geometry (the now-line position, `isPast` shading) is computed
 * here in `render()` from `Date.now()` — it is presentation, not state, so it
 * stays out of the pure ViewModel. The shared `<crop-steering-day-chart>` is
 * hosted unchanged with the `device` passed through the VM.
 *
 * Tab Intents (the Dialog Shell owns their translation to SM events):
 *   - `schedules-begin-add`        detail: { type, time, duration }
 *   - `schedules-begin-edit`       detail: { type, timeStr, duration }
 *   - `schedules-update-add`       detail: { type, time?, duration? }
 *   - `schedules-update-edit`      detail: { type, time?, duration? }
 *   - `schedules-cancel-inline`    (no detail)
 *   - `schedules-save-add`         detail: { type, time, duration }
 *   - `schedules-save-edit`        detail: { type }
 *   - `schedules-delete-from-edit` detail: { type }
 *   - `schedules-remove-time`      detail: { type, timeStr }
 *   - `schedules-open-steering`    (no detail — the "Open Crop Steering →" links)
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiPlus } from '@mdi/js';
import { dialogStyles } from '../../../styles/dialog.styles';
import '../../../features/shared/ui/md3-text-input';
import '../../../features/shared/ui/md3-number-input';
import '../../../features/shared/ui/gs-help-tooltip';
import '../../../features/environment/components/crop-steering-day-chart';
import type {
  SchedulesTabViewModel,
  ScheduleSectionVM,
  ScheduleTimeVM,
  CropSteeringScheduleVM,
} from '../viewmodels/schedules-tab.viewmodel';

const MDI_INFO =
  'M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z';
const MDI_CHECK = 'M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z';

type ScheduleType = 'irrigation' | 'drain';

@customElement('irrigation-schedules-tab')
export class IrrigationSchedulesTab extends LitElement {
  @property({ attribute: false }) vm!: SchedulesTabViewModel;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }
      /* ── Schedules tab — copied from irrigation-dialog ── */
      .timeline-track {
        position: relative;
        height: 96px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: var(--border-radius-md, 12px);
        background: rgba(0, 0, 0, 0.2);
        overflow: hidden;
        cursor: crosshair;
      }
      .grid-v {
        position: absolute;
        top: 0;
        bottom: 18px;
        width: 1px;
        background: rgba(255, 255, 255, 0.04);
        pointer-events: none;
      }
      .grid-v.major {
        background: rgba(255, 255, 255, 0.09);
      }
      .x-label {
        position: absolute;
        bottom: 4px;
        transform: translateX(-50%);
        font-size: var(--font-size-xs);
        color: rgba(255, 255, 255, 0.35);
        font-variant-numeric: tabular-nums;
        pointer-events: none;
      }
      .timeline-event {
        position: absolute;
        top: 10px;
        height: 52px;
        border-radius: var(--border-radius-sm, 8px);
        cursor: pointer;
        display: flex;
        align-items: flex-end;
        padding: 4px 5px;
        overflow: hidden;
        transition: transform 0.15s;
        z-index: 5;
      }
      .timeline-event:hover {
        transform: translateY(-2px);
      }
      .timeline-event.completed {
        opacity: 0.45;
      }
      .timeline-event.completed::after {
        content: '';
        position: absolute;
        inset: 0;
        background: repeating-linear-gradient(
          45deg,
          transparent 0 3px,
          rgba(0, 0, 0, 0.18) 3px 5px
        );
        pointer-events: none;
      }
      .timeline-event .event-lbl {
        font-size: var(--font-size-xs);
        color: rgba(0, 0, 0, 0.78);
        font-weight: 600;
        white-space: nowrap;
        position: relative;
        z-index: 1;
      }
      .now-line {
        position: absolute;
        top: 4px;
        bottom: 22px;
        width: 1px;
        background: var(--marker-now);
        box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
        pointer-events: none;
        z-index: 8;
      }
      .now-line::before {
        content: '';
        position: absolute;
        left: -3px;
        top: -3px;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--marker-now);
      }
      /* ── Time chips ── */
      .time-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }
      .time-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 28px;
        padding: 0 4px 0 10px;
        border-radius: var(--border-radius-sm, 8px);
        font-size: 12.5px;
        font-variant-numeric: tabular-nums;
      }
      .time-chip.irrig-chip {
        background: rgba(33, 150, 243, 0.14);
        border: 1px solid rgba(33, 150, 243, 0.3);
        color: rgba(255, 255, 255, 0.9);
      }
      .time-chip.drain-chip {
        background: rgba(255, 152, 0, 0.14);
        border: 1px solid rgba(255, 152, 0, 0.3);
        color: rgba(255, 255, 255, 0.9);
      }
      .time-chip.new-chip {
        background: transparent;
        border: 1px dashed rgba(255, 255, 255, 0.2);
        color: rgba(255, 255, 255, 0.4);
        cursor: pointer;
        padding: 0 12px;
        border-radius: var(--border-radius-sm, 8px);
      }
      .time-chip.new-chip:hover {
        border-color: rgba(255, 255, 255, 0.35);
        color: rgba(255, 255, 255, 0.7);
      }
      .chip-dur {
        color: rgba(255, 255, 255, 0.45);
        font-size: 11px;
      }
      .chip-remove {
        width: 20px;
        height: 20px;
        border-radius: var(--border-radius-sm, 8px);
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.4);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        line-height: 1;
        margin-left: 2px;
        flex-shrink: 0;
      }
      .chip-remove:hover {
        background: rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.85);
      }
      /* ── Info banners ── */
      .info-banner {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 14px;
        background: rgba(33, 150, 243, 0.07);
        border: 1px solid rgba(33, 150, 243, 0.2);
        border-radius: var(--border-radius-sm, 8px);
        font-size: 12.5px;
        color: rgba(255, 255, 255, 0.65);
        line-height: 1.5;
      }
      .info-banner.banner-cs {
        background: linear-gradient(90deg, rgba(76, 175, 80, 0.1), rgba(33, 150, 243, 0.06));
        border: 1px solid rgba(76, 175, 80, 0.3);
        border-left: 3px solid var(--gm-primary-color); /* impeccable-disable-line side-tab -- advisory banner, not a content-card side tab */
      }
      .info-banner.banner-cs svg {
        fill: var(--gm-primary-color);
      }
      /* ── Overlay ── */
      .overlay-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      /* ── Edit dialog buttons ── */
      .edit-dialog-buttons {
        display: flex;
        gap: 8px;
        margin-top: 16px;
      }
      .edit-dialog-buttons .delete-button {
        flex: 0 0 auto;
      }
      .edit-dialog-buttons .spacer {
        flex: 1;
      }
      .edit-dialog-buttons .action-buttons {
        display: flex;
        gap: 8px;
      }
      .md3-button.delete-button {
        background: rgba(244, 67, 54, 0.2) !important;
        color: var(--gm-error-color) !important;
        border: 1px solid rgba(244, 67, 54, 0.3);
      }
      .md3-button.delete-button:hover {
        background: rgba(244, 67, 54, 0.3) !important;
      }
      /* ── Crop Steering Schedule ── */
      .auto-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        height: 22px;
        padding: 0 8px;
        font-size: var(--font-size-xs);
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        background: linear-gradient(135deg, rgba(76, 175, 80, 0.18), rgba(33, 150, 243, 0.18));
        border: 1px solid rgba(76, 175, 80, 0.4);
        color: var(--gm-primary-color);
        border-radius: var(--border-radius-sm, 8px);
      }
      .auto-pill .pulse-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--gm-primary-color);
        box-shadow: 0 0 6px rgba(76, 175, 80, 0.9);
        flex-shrink: 0;
      }
      .cs-timeline {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .cs-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding-top: 2px;
      }
      .cs-leg-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 24px;
        padding: 0 10px;
        background: rgba(255, 255, 255, 0.025);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: var(--border-radius-sm, 8px);
        font-size: 11.5px;
        color: rgba(255, 255, 255, 0.6);
        font-variant-numeric: tabular-nums;
      }
      .cs-leg-chip strong {
        color: rgba(255, 255, 255, 0.9);
        font-weight: 500;
      }
      .cs-leg-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }
    `,
  ];

  private _emit(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  /** Current minute-of-day — view geometry, computed at render time (no clock in the VM). */
  private _getNowMinutes(): number {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  render(): TemplateResult {
    const vm = this.vm;
    const isCropSteering = vm?.isCropSteering ?? false;
    return html`
      ${isCropSteering
        ? html`
            <div class="info-banner banner-cs">
              <svg style="width:14px;height:14px;flex-shrink:0;" viewBox="0 0 24 24">
                <path d="${MDI_INFO}"></path>
              </svg>
              <div>
                <strong>Crop Steering is active</strong> — irrigation cycles are computed
                automatically from VWC targets.
                <a
                  href="#"
                  style="color:var(--gm-primary-color);margin-left:4px;"
                  @click=${(e: Event) => {
                    e.preventDefault();
                    this._emit('schedules-open-steering');
                  }}
                  >Open Crop Steering →</a
                >
              </div>
            </div>
            ${vm?.cropSteering ? this._renderCropSteeringSchedule(vm.cropSteering) : nothing}
          `
        : vm?.irrigationSection
          ? this._renderScheduleSection(vm.irrigationSection)
          : nothing}
      ${vm?.drainSection ? this._renderScheduleSection(vm.drainSection) : nothing}
      ${!isCropSteering
        ? html`
            <div class="info-banner nudge-card">
              <svg
                style="width:14px;height:14px;flex-shrink:0;fill:currentColor;"
                viewBox="0 0 24 24"
              >
                <path d="${MDI_INFO}"></path>
              </svg>
              <div>
                Enable <strong>Crop Steering</strong> in the Steering tab to switch from a fixed
                daily plan to a phase-driven schedule that adapts to VWC targets.
                <a
                  href="#"
                  style="color:var(--stage-color,#2196F3);margin-left:4px;"
                  @click=${(e: Event) => {
                    e.preventDefault();
                    this._emit('schedules-open-steering');
                  }}
                  >Open Crop Steering →</a
                >
              </div>
            </div>
          `
        : nothing}
    `;
  }

  private _renderCropSteeringSchedule(cs: CropSteeringScheduleVM): TemplateResult {
    if (!cs.configured) {
      return html`
        <div class="detail-card crop-steering-schedule">
          <div
            style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"
          >
            <h3 style="margin:0;">Crop Steering Schedule</h3>
          </div>
          <p
            style="font-size:var(--font-size-supporting);opacity:0.6;text-align:center;margin-top:12px;"
          >
            No strategy configured — set Lights On Time in the Steering tab.
          </p>
        </div>
      `;
    }

    const p2ShotCount = cs.shotCount;

    return html`
      <div class="detail-card crop-steering-schedule">
        <!-- Header -->
        <div
          style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"
        >
          <div style="display:flex;align-items:center;gap:6px;">
            <h3 style="margin:0;">Crop Steering Schedule</h3>
            <gs-help-tooltip
              content="Auto-generated irrigation shots based on your VWC strategy settings. Read-only — edit timing in the Steering tab."
              placement="top"
              label="Crop Steering Schedule"
            ></gs-help-tooltip>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:0.75rem;opacity:0.55;"
              >${p2ShotCount} shots · ${cs.lightHours}h photoperiod</span
            >
            <span class="auto-pill"><span class="pulse-dot"></span>Auto</span>
          </div>
        </div>

        <div class="cs-timeline">
          <!-- Phase strip + shot track + substrate model: all owned by the shared chart -->
          <crop-steering-day-chart .device=${this.vm.device}></crop-steering-day-chart>

          <!-- Legend: flags missing sensors only — the readout above already
               supplies the color-to-trace mapping for configured metrics -->
          <div class="cs-legend">
            ${!cs.hasPoreEc
              ? html`
                  <span class="cs-leg-chip" style="opacity:0.4;">
                    Pore EC not configured — add it in Environment Settings
                  </span>
                `
              : ''}
            ${!cs.hasBulkEc
              ? html`
                  <span class="cs-leg-chip" style="opacity:0.4;">
                    Bulk EC not configured — add it in Environment Settings
                  </span>
                `
              : ''}
          </div>
          <div class="cs-legend">
            ${cs.phases.map(
              (p) => html`
                <span class="cs-leg-chip">
                  <span class="cs-leg-dot" style="background:${p.color};"></span>
                  <strong>${p.label}</strong> ${p.name}${p.shotCount !== null
                    ? html` · ${p.shotCount} shots`
                    : nothing}
                  · ${p.target}
                </span>
              `
            )}
            <span class="cs-leg-chip">
              <span
                style="width:8px;height:8px;border-radius:50%;background:rgba(255,235,59,0.85);flex-shrink:0;"
              ></span>
              ${cs.lightsOnLabel}–${cs.lightsOffLabel} · ${cs.lightHours}h photoperiod
            </span>
          </div>

          ${p2ShotCount === 0
            ? html`
                <p
                  style="font-size:var(--font-size-supporting);opacity:0.6;text-align:center;margin-top:4px;"
                >
                  No shots computed — check lights-on time and interval in the Steering tab.
                </p>
              `
            : nothing}
        </div>
      </div>
    `;
  }

  private _renderScheduleSection(section: ScheduleSectionVM): TemplateResult {
    const { type, title, color, times } = section;
    const nowMinutes = this._getNowMinutes();
    const sub = this.vm.sub;
    const addingTime =
      type === 'irrigation' && sub.kind === 'adding-irrigation'
        ? sub
        : type === 'drain' && sub.kind === 'adding-drain'
          ? sub
          : undefined;
    const editingTime =
      type === 'irrigation' && sub.kind === 'editing-irrigation'
        ? sub
        : type === 'drain' && sub.kind === 'editing-drain'
          ? sub
          : undefined;
    const chipClass = type === 'irrigation' ? 'irrig-chip' : 'drain-chip';

    return html`
      <div class="detail-card">
        <div
          style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"
        >
          <div style="display:flex;align-items:center;gap:6px;">
            <h3 style="margin:0;">${title}</h3>
            <gs-help-tooltip
              content=${type === 'irrigation'
                ? 'Each block is a scheduled irrigation event. Click a block to edit it, or click anywhere on the track to add a new one.'
                : 'Each block is a scheduled drain event. Run drain after irrigation to remove excess runoff.'}
              placement="top"
              label=${title}
            ></gs-help-tooltip>
          </div>
          <button
            class="md3-button primary btn-add-time"
            style="background:${color};"
            @click=${() => this._openAddTimeDialog(type)}
          >
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiPlus}"></path>
            </svg>
            ADD TIME
          </button>
        </div>

        <!-- Timeline track -->
        <div
          class="${type}-time-bar timeline-track"
          style="border-color:${color}40;"
          @click=${(e: MouseEvent) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            this._startAddingTime(type, e.clientX - rect.left, rect.width);
          }}
        >
          ${Array.from({ length: 25 }, (_, i) => i).map(
            (h) => html`
              <div
                class="grid-v ${h % 6 === 0 ? 'major' : ''}"
                style="left:${(h / 24) * 100}%;"
              ></div>
              ${h % 3 === 0
                ? html`
                    <span class="x-label" style="left:${(h / 24) * 100}%;">
                      ${h.toString().padStart(2, '0')}:00
                    </span>
                  `
                : nothing}
            `
          )}

          <!-- Event blocks -->
          ${times.map((t: ScheduleTimeVM) => {
            const dur = t.durationSeconds;
            const leftPct = (t.startMin / 1440) * 100;
            const widthPct = (dur / 86400) * 100;
            const isPast = t.startMin < nowMinutes;
            return html`
              <div
                class="timeline-event ${isPast ? 'completed' : ''}"
                style="
                  left: ${leftPct}%;
                  width: max(${widthPct}%, 18px);
                  background: ${color};
                  box-shadow: 0 0 0 1px ${color}99, 0 2px 6px ${color}55;
                "
                @click=${(e: Event) => {
                  e.stopPropagation();
                  this._emit('schedules-begin-edit', {
                    type,
                    timeStr: t.timeStr,
                    duration: dur,
                  });
                }}
                title="${t.timeStr.substring(0, 5)} · ${dur}s"
              >
                <span class="event-lbl">${t.timeStr.substring(0, 5)}</span>
              </div>
            `;
          })}

          <!-- Now line -->
          <div class="now-line" style="left:${(nowMinutes / 1440) * 100}%;"></div>
        </div>

        <!-- Time chips -->
        <div class="time-chips">
          ${times.map((t: ScheduleTimeVM) => {
            const dur = t.durationSeconds;
            const isPast = t.startMin < nowMinutes;
            return html`
              <span class="time-chip ${chipClass}">
                ${isPast
                  ? html`
                      <svg
                        style="width:12px;height:12px;fill:var(--gm-primary-color);flex-shrink:0;"
                        viewBox="0 0 24 24"
                      >
                        <path d="${MDI_CHECK}"></path>
                      </svg>
                    `
                  : nothing}
                ${t.timeStr.substring(0, 5)}
                <span class="chip-dur">· ${Math.max(1, Math.round(dur / 60))}m</span>
                <button
                  class="chip-remove"
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    this._emit('schedules-remove-time', { type, timeStr: t.timeStr });
                  }}
                  title="Remove"
                >
                  ×
                </button>
              </span>
            `;
          })}
          <button class="time-chip new-chip" @click=${() => this._openAddTimeDialog(type)}>
            + New
          </button>
        </div>

        <!-- Add overlay -->
        ${addingTime
          ? html`
              <div class="overlay-backdrop" @click=${() => this._emit('schedules-cancel-inline')}>
                <div
                  class="detail-card"
                  style="max-width:400px;margin:0;background:var(--surface-container-high);width:90%;"
                  @click=${(e: Event) => e.stopPropagation()}
                >
                  <h3>Add ${title} Time</h3>
                  <md3-text-input
                    label="Time"
                    type="time"
                    .value=${addingTime.time}
                    @change=${(e: CustomEvent) => {
                      const val = (e.target as HTMLInputElement).value || e.detail;
                      this._emit('schedules-update-add', { type, time: val });
                    }}
                  ></md3-text-input>
                  <div
                    style="display:flex;align-items:center;gap:4px;margin-bottom:4px;font-size:0.875rem;color:var(--secondary-text-color);"
                  >
                    <span
                      >${type === 'irrigation'
                        ? 'Shot Duration (seconds)'
                        : 'Drain Duration (seconds)'}</span
                    >
                    <gs-help-tooltip
                      content=${type === 'irrigation'
                        ? 'How long the irrigation pump runs per shot. Typical: 15–120 seconds.'
                        : 'How long the drain pump runs. Too short = waterlogging.'}
                      placement="right"
                      label=${type === 'irrigation' ? 'Shot Duration' : 'Drain Duration'}
                    ></gs-help-tooltip>
                  </div>
                  <md3-number-input
                    label="Duration (seconds)"
                    .value=${addingTime.duration}
                    .min=${1}
                    @change=${(e: CustomEvent) => {
                      const val = parseInt(e.detail);
                      if (!isNaN(val)) this._emit('schedules-update-add', { type, duration: val });
                    }}
                  ></md3-number-input>
                  <div class="button-group">
                    <button
                      class="md3-button tonal"
                      @click=${() => this._emit('schedules-cancel-inline')}
                    >
                      Cancel
                    </button>
                    <button
                      class="md3-button primary"
                      @click=${() =>
                        this._emit('schedules-save-add', {
                          type,
                          time: addingTime.time,
                          duration: addingTime.duration,
                        })}
                      style="background:${color};"
                    >
                      Add Schedule
                    </button>
                  </div>
                </div>
              </div>
            `
          : ''}

        <!-- Edit overlay -->
        ${editingTime
          ? html`
              <div class="overlay-backdrop" @click=${() => this._emit('schedules-cancel-inline')}>
                <div
                  class="detail-card"
                  style="max-width:400px;margin:0;background:var(--surface-container-high);width:90%;"
                  @click=${(e: Event) => e.stopPropagation()}
                >
                  <h3>Edit ${title} Time</h3>
                  <md3-text-input
                    label="Time"
                    type="time"
                    .value=${editingTime.time}
                    @change=${(e: CustomEvent) => {
                      const val = (e.target as HTMLInputElement).value || e.detail;
                      this._emit('schedules-update-edit', { type, time: val });
                    }}
                  ></md3-text-input>
                  <div
                    style="display:flex;align-items:center;gap:4px;margin-bottom:4px;font-size:0.875rem;color:var(--secondary-text-color);"
                  >
                    <span
                      >${type === 'irrigation'
                        ? 'Shot Duration (seconds)'
                        : 'Drain Duration (seconds)'}</span
                    >
                    <gs-help-tooltip
                      content=${type === 'irrigation'
                        ? 'How long the irrigation pump runs per shot.'
                        : 'How long the drain pump runs.'}
                      placement="right"
                      label=${type === 'irrigation' ? 'Shot Duration' : 'Drain Duration'}
                    ></gs-help-tooltip>
                  </div>
                  <md3-number-input
                    label="Duration (seconds)"
                    .value=${editingTime.duration}
                    .min=${1}
                    @change=${(e: CustomEvent) => {
                      const val = parseInt(e.detail);
                      if (!isNaN(val)) this._emit('schedules-update-edit', { type, duration: val });
                    }}
                  ></md3-number-input>
                  <div class="edit-dialog-buttons">
                    <button
                      class="md3-button delete-button"
                      @click=${() => this._emit('schedules-delete-from-edit', { type })}
                    >
                      Delete
                    </button>
                    <div class="spacer"></div>
                    <div class="action-buttons">
                      <button
                        class="md3-button tonal"
                        @click=${() => this._emit('schedules-cancel-inline')}
                      >
                        Cancel
                      </button>
                      <button
                        class="md3-button primary"
                        @click=${() => this._emit('schedules-save-edit', { type })}
                        style="background:${color};"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            `
          : ''}
      </div>
    `;
  }

  /** ADD TIME button + "+ New" chip → begin-add at the fixed 12:00 default. */
  private _openAddTimeDialog(type: ScheduleType): void {
    const duration =
      type === 'irrigation'
        ? (this.vm.irrigationSection?.defaultDuration ?? 60)
        : (this.vm.drainSection?.defaultDuration ?? 60);
    this._emit('schedules-begin-add', { type, time: '12:00', duration });
  }

  /** Track click → begin-add at the time computed from the click geometry. */
  private _startAddingTime(type: ScheduleType, x: number, width: number): void {
    const pct = Math.max(0, Math.min(1, x / width));
    const totalMinutes = Math.round(pct * 24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    const duration =
      type === 'irrigation'
        ? (this.vm.irrigationSection?.defaultDuration ?? 60)
        : (this.vm.drainSection?.defaultDuration ?? 60);
    this._emit('schedules-begin-add', { type, time, duration });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'irrigation-schedules-tab': IrrigationSchedulesTab;
  }
}
