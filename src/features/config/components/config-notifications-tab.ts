/**
 * Config Notifications Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's Notifications tab.
 * `@property .vm: NotificationsTabViewModel` in, semantic Tab Intents out, **no
 * `@state()` of its own** — all draft/edit state lives in the ConfigDialogSM and
 * is projected into the VM. Markup is transcribed verbatim from the former
 * inline `_renderNotificationsSection` / `_renderTimedNotificationsSection` /
 * `_renderTimedNotificationForm` helpers. Shared config headers and dialog styles
 * keep this tab aligned with the rest of the configuration surface.
 *
 * Tab Intents (the Config Dialog Shell owns their translation to SM events):
 *   - `notif-draft-changed`   detail: { partial: Partial<NotificationsDraft> }
 *   - `add-timed-requested`   (no detail)
 *   - `edit-timed-requested`  detail: { id, draft: TimedNotificationDraft }
 *   - `timed-draft-changed`   detail: { partial: Partial<TimedNotificationDraft> }
 *   - `cancel-timed`          (no detail)
 *   - `commit-add-timed`      (no detail; the Shell generates the id)
 *   - `commit-edit-timed`     (no detail)
 *   - `request-delete-timed`  detail: { id }
 *   - `confirm-delete-timed`  (no detail)
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiBellAlertOutline, mdiClockOutline, mdiDelete, mdiPencil } from '@mdi/js';
import { dialogStyles } from '../../../styles/dialog.styles';
import '../../shared/ui/md3-number-input';
import './config-section-header';
import type {
  NotificationsDraft,
  NotificationsTabSub,
  TimedNotificationDraft,
} from '../../../dialogs/config-dialog-sm';
import {
  isKnownTrigger,
  normalizeTriggerType,
  triggerRawValue,
} from '../../../slices/notification/triggers';
import type { NotificationsTabViewModel } from '../viewmodels/notifications-tab.viewmodel';

@customElement('config-notifications-tab')
export class ConfigNotificationsTab extends LitElement {
  @property({ attribute: false }) vm!: NotificationsTabViewModel;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }
      .notifications-layout {
        display: grid;
        gap: 16px;
      }
      .settings-groups {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 24px;
      }
      .settings-group {
        min-width: 0;
      }
      .settings-group h4 {
        margin: 0;
        color: var(--primary-text-color, #fff);
        font-size: var(--font-size-md);
        font-weight: 500;
      }
      .settings-group__description {
        min-height: 2.8em;
        margin: 4px 0 12px;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
        font-size: var(--font-size-supporting);
        line-height: 1.4;
        overflow-wrap: anywhere;
      }
      .settings-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .settings-group[data-settings-group='stress-detection'] .settings-grid {
        grid-template-columns: minmax(0, 1fr);
      }
      .form-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.875rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
      }
      .checkbox-label input[type='checkbox'] {
        width: 20px;
        height: 20px;
        cursor: pointer;
      }
      .cfg-gs-row {
        box-sizing: border-box;
        display: flex;
        align-items: center;
        width: 100%;
        min-width: 0;
        gap: 10px;
        padding: 8px 10px;
        border-radius: 8px;
        border: 1px solid transparent;
        cursor: pointer;
        transition: all 0.15s;
        font-size: 0.875rem;
      }
      .cfg-gs-row:hover {
        background: rgba(255, 255, 255, 0.04);
      }
      .timed-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .timed-row {
        justify-content: space-between;
      }
      .timed-row__summary {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .row-actions {
        display: flex;
        flex-shrink: 0;
        gap: 4px;
      }
      .detail-card .row-action {
        flex: 0 0 40px;
        width: 40px;
        min-width: 40px;
        padding: 0;
      }
      .row-action svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }
      .row-action--delete {
        color: var(--error-color, #f44336);
      }
      .detail-card .section-action {
        flex: 0 0 auto;
      }
      .inline-panel {
        padding: 16px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.15));
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.04);
      }
      .empty-state {
        padding: 24px;
        color: var(--secondary-text-color);
        text-align: center;
      }
      @media (max-width: 700px) {
        .settings-groups,
        .settings-grid {
          grid-template-columns: minmax(0, 1fr);
        }
        .settings-group__description {
          min-height: 0;
        }
        .timed-row__summary {
          display: -webkit-box;
          overflow: hidden;
          white-space: normal;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }
      }
    `,
  ];

  private _emit(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private _updateDraft(partial: Partial<NotificationsDraft>): void {
    this._emit('notif-draft-changed', { partial });
  }

  render(): TemplateResult {
    return html`
      <div class="notifications-layout">${this._renderSettings()}${this._renderTimed()}</div>
    `;
  }

  private _renderSettings(): TemplateResult {
    const draft = this.vm.draft;
    return html`
      <div class="detail-card" data-notif-card="settings">
        <config-section-header
          .icon=${mdiBellAlertOutline}
          label="Notification settings"
        ></config-section-header>
        <div class="settings-groups">
          <section class="settings-group" data-settings-group="alert-timing">
            <h4>Alert timing</h4>
            <p class="settings-group__description">
              Choose how long alert levels wait before repeating, recovering, or escalating.
            </p>
            <div class="settings-grid">
              <md3-number-input
                data-notif="criticalCooldownMinutes"
                label="Critical cooldown (min)"
                .value=${draft.criticalCooldownMinutes}
                @change=${(e: CustomEvent) =>
                  this._updateDraft({ criticalCooldownMinutes: Number(e.detail) })}
              ></md3-number-input>
              <md3-number-input
                data-notif="warningCooldownMinutes"
                label="Warning cooldown (min)"
                .value=${draft.warningCooldownMinutes}
                @change=${(e: CustomEvent) =>
                  this._updateDraft({ warningCooldownMinutes: Number(e.detail) })}
              ></md3-number-input>
              <md3-number-input
                data-notif="recoveryCooldownMinutes"
                label="Recovery cooldown (min)"
                .value=${draft.recoveryCooldownMinutes}
                @change=${(e: CustomEvent) =>
                  this._updateDraft({ recoveryCooldownMinutes: Number(e.detail) })}
              ></md3-number-input>
              <md3-number-input
                data-notif="escalationDelayMinutes"
                label="Escalation delay (min)"
                .value=${draft.escalationDelayMinutes}
                @change=${(e: CustomEvent) =>
                  this._updateDraft({ escalationDelayMinutes: Number(e.detail) })}
              ></md3-number-input>
            </div>
          </section>
          <section class="settings-group" data-settings-group="stress-detection">
            <h4>Stress detection</h4>
            <p class="settings-group__description">
              Choose how long stress must last before alerting and how long warnings remain active.
            </p>
            <div class="settings-grid">
              <md3-number-input
                data-notif="minStressDurationSeconds"
                label="Minimum stress duration (min)"
                .value=${draft.minStressDurationSeconds / 60}
                @change=${(e: CustomEvent) =>
                  this._updateDraft({ minStressDurationSeconds: Number(e.detail) * 60 })}
              ></md3-number-input>
              <md3-number-input
                data-notif="warningPersistenceMinutes"
                label="Warning persistence (min)"
                .value=${draft.warningPersistenceMinutes}
                @change=${(e: CustomEvent) =>
                  this._updateDraft({ warningPersistenceMinutes: Number(e.detail) })}
              ></md3-number-input>
            </div>
          </section>
        </div>
        <label class="checkbox-label">
          <input
            type="checkbox"
            data-notif="aiAutoAlerts"
            .checked=${draft.aiAutoAlerts}
            @change=${(e: Event) =>
              this._updateDraft({ aiAutoAlerts: (e.target as HTMLInputElement).checked })}
          />
          <span>AI Auto-Alerts</span>
        </label>
      </div>
    `;
  }

  private _renderTimed(): TemplateResult {
    const sub = this.vm.sub;
    const notifications = this.vm.timedNotifications;

    return html`
      <div class="detail-card" data-notif-card="timed">
        <config-section-header .icon=${mdiClockOutline} label="Timed notifications">
          ${sub.kind === 'idle'
            ? html`
                <button
                  class="md3-button tonal section-action"
                  style="padding:0 16px;"
                  @click=${() => this._emit('add-timed-requested')}
                >
                  Add
                </button>
              `
            : nothing}
        </config-section-header>

        ${sub.kind === 'confirm-delete'
          ? html`
              <div class="inline-panel" style="text-align:center;padding:24px 16px;">
                <p style="margin:0 0 16px;color:var(--secondary-text-color);">
                  Delete this timed notification?
                </p>
                <div style="display:flex;gap:8px;justify-content:center;">
                  <button class="md3-button outlined" @click=${() => this._emit('cancel-timed')}>
                    Cancel
                  </button>
                  <button
                    class="md3-button primary"
                    style="background:var(--error-color,#ff5252);"
                    @click=${() => this._emit('confirm-delete-timed')}
                  >
                    Delete
                  </button>
                </div>
              </div>
            `
          : nothing}
        ${sub.kind === 'adding' || sub.kind === 'editing' ? this._renderForm(sub) : nothing}
        ${notifications.length === 0 && sub.kind === 'idle'
          ? html`
              <div class="empty-state" data-timed="empty-state">
                No timed notifications configured
              </div>
            `
          : nothing}
        ${sub.kind === 'idle' || sub.kind === 'confirm-delete'
          ? html`
              <div class="timed-list">
                ${notifications.map(
                  (n) => html`
                    <div class="cfg-gs-row timed-row" data-timed-id=${n.id}>
                      <span class="timed-row__summary">
                        ${n.message} ·
                        ${isKnownTrigger(n.triggerType)
                          ? n.triggerType
                          : html`<span
                              data-timed-unknown-trigger=${n.id}
                              style="color:var(--warning-color,#ffa726);"
                              >Unrecognised trigger “${n.triggerType.raw}”</span
                            >`}
                        · Day ${n.day}
                      </span>
                      <div class="row-actions">
                        <button
                          class="md3-button text row-action"
                          data-timed-edit=${n.id}
                          aria-label=${`Edit ${n.message}`}
                          title=${`Edit ${n.message}`}
                          @click=${() =>
                            this._emit('edit-timed-requested', {
                              id: n.id,
                              draft: {
                                message: n.message,
                                triggerType: n.triggerType,
                                day: n.day,
                                growspaceIds: n.growspaceIds,
                              },
                            })}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d=${mdiPencil}></path>
                          </svg>
                        </button>
                        <button
                          class="md3-button text row-action row-action--delete"
                          data-timed-delete=${n.id}
                          aria-label=${`Delete ${n.message}`}
                          title=${`Delete ${n.message}`}
                          @click=${() => this._emit('request-delete-timed', { id: n.id })}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d=${mdiDelete}></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  `
                )}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _renderForm(sub: NotificationsTabSub & { kind: 'adding' | 'editing' }): TemplateResult {
    const isAdding = sub.kind === 'adding';
    const draft = sub.draft;
    const update = (partial: Partial<TimedNotificationDraft>) =>
      this._emit('timed-draft-changed', { partial });

    return html`
      <div class="inline-panel" style="margin-bottom:12px;">
        <h4 style="margin:0 0 12px;font-size:0.9rem;font-weight:600;">
          ${isAdding ? 'Add Timed Notification' : 'Edit Timed Notification'}
        </h4>

        <div class="md3-input-group">
          <label class="md3-label">Message</label>
          <input
            class="md3-input"
            type="text"
            data-timed-field="message"
            .value=${draft.message}
            @input=${(e: Event) => update({ message: (e.target as HTMLInputElement).value })}
          />
        </div>

        <div class="md3-input-group">
          <label class="md3-label">Trigger</label>
          <select
            class="md3-input"
            data-timed-field="triggerType"
            .value=${triggerRawValue(draft.triggerType)}
            @change=${(e: Event) =>
              update({
                triggerType: normalizeTriggerType((e.target as HTMLSelectElement).value),
              })}
          >
            ${isKnownTrigger(draft.triggerType)
              ? nothing
              : html`
                  <option
                    data-timed-unknown-option
                    value="${draft.triggerType.raw}"
                    selected
                    style="color:var(--warning-color,#ffa726);"
                  >
                    Unrecognised: ${draft.triggerType.raw}
                  </option>
                `}
            ${this.vm.triggerOptions.map(
              (o) => html`
                <option value="${o.value}" ?selected=${draft.triggerType === o.value}>
                  ${o.label}
                </option>
              `
            )}
          </select>
          ${isKnownTrigger(draft.triggerType)
            ? nothing
            : html`
                <div
                  data-timed-unknown-hint
                  style="font-size:0.75rem;color:var(--warning-color,#ffa726);margin-top:4px;"
                >
                  This notification's stored trigger is not one this card recognises. It is kept as
                  is unless you pick a stage.
                </div>
              `}
        </div>

        <div class="md3-input-group">
          <label class="md3-label">Day</label>
          <input
            class="md3-input"
            type="number"
            min="1"
            data-timed-field="day"
            .value=${String(draft.day)}
            @change=${(e: Event) => update({ day: Number((e.target as HTMLInputElement).value) })}
          />
        </div>

        <div class="md3-input-group">
          <label class="md3-label">Growspaces</label>
          <div
            style="display:flex;flex-direction:column;gap:4px;max-height:160px;overflow-y:auto;padding:4px 0;"
          >
            ${this.vm.growspaceOptions.map(
              ({ id, name }) => html`
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                  <input
                    type="checkbox"
                    data-timed-gs=${id}
                    .checked=${draft.growspaceIds.includes(id)}
                    @change=${(e: Event) => {
                      const checked = (e.target as HTMLInputElement).checked;
                      const next = checked
                        ? [...draft.growspaceIds, id]
                        : draft.growspaceIds.filter((g) => g !== id);
                      update({ growspaceIds: next });
                    }}
                  />
                  ${name}
                </label>
              `
            )}
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-top:12px;">
          <button class="md3-button outlined" @click=${() => this._emit('cancel-timed')}>
            Cancel
          </button>
          <button
            class="md3-button primary"
            @click=${() => this._emit(isAdding ? 'commit-add-timed' : 'commit-edit-timed')}
          >
            ${isAdding ? 'Add' : 'Save'}
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'config-notifications-tab': ConfigNotificationsTab;
  }
}
