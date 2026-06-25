/**
 * Config Notifications Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's Notifications tab.
 * `@property .vm: NotificationsTabViewModel` in, semantic Tab Intents out, **no
 * `@state()` of its own** — all draft/edit state lives in the ConfigDialogSM and
 * is projected into the VM. Markup is transcribed verbatim from the former
 * inline `_renderNotificationsSection` / `_renderTimedNotificationsSection` /
 * `_renderTimedNotificationForm` helpers so the rendered output stays
 * byte-identical; `md3-*`, `detail-card`, `row-col-grid` come from the shared
 * `dialogStyles`, while the config-specific `.form-section` / `.checkbox-label`
 * / `.cfg-gs-row` styles moved here with the markup.
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
import { dialogStyles } from '../../../styles/dialog.styles';
import '../../shared/ui/md3-number-input';
import type {
  NotificationsDraft,
  NotificationsTabSub,
  TimedNotificationDraft,
  TimedNotificationTrigger,
} from '../../../dialogs/config-dialog-sm';
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
      /* ── config-specific layout — copied from config-dialog ── */
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
        display: flex;
        align-items: center;
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
    `,
  ];

  private _emit(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private _updateDraft(partial: Partial<NotificationsDraft>): void {
    this._emit('notif-draft-changed', { partial });
  }

  render(): TemplateResult {
    return html`${this._renderSettings()}${this._renderTimed()}`;
  }

  private _renderSettings(): TemplateResult {
    const draft = this.vm.draft;
    return html`
      <div class="form-section">
        <md3-number-input
          data-notif="criticalCooldownMinutes"
          label="Critical Cooldown (min)"
          .value=${draft.criticalCooldownMinutes}
          @change=${(e: CustomEvent) =>
            this._updateDraft({ criticalCooldownMinutes: Number(e.detail) })}
        ></md3-number-input>
        <md3-number-input
          data-notif="warningCooldownMinutes"
          label="Warning Cooldown (min)"
          .value=${draft.warningCooldownMinutes}
          @change=${(e: CustomEvent) =>
            this._updateDraft({ warningCooldownMinutes: Number(e.detail) })}
        ></md3-number-input>
        <md3-number-input
          data-notif="recoveryCooldownMinutes"
          label="Recovery Cooldown (min)"
          .value=${draft.recoveryCooldownMinutes}
          @change=${(e: CustomEvent) =>
            this._updateDraft({ recoveryCooldownMinutes: Number(e.detail) })}
        ></md3-number-input>
        <md3-number-input
          data-notif="escalationDelayMinutes"
          label="Escalation Delay (min)"
          .value=${draft.escalationDelayMinutes}
          @change=${(e: CustomEvent) =>
            this._updateDraft({ escalationDelayMinutes: Number(e.detail) })}
        ></md3-number-input>
        <md3-number-input
          data-notif="minStressDurationSeconds"
          label="Min Stress Duration (sec)"
          .value=${draft.minStressDurationSeconds}
          @change=${(e: CustomEvent) =>
            this._updateDraft({ minStressDurationSeconds: Number(e.detail) })}
        ></md3-number-input>
        <md3-number-input
          data-notif="warningPersistenceMinutes"
          label="Warning Persistence (min)"
          .value=${draft.warningPersistenceMinutes}
          @change=${(e: CustomEvent) =>
            this._updateDraft({ warningPersistenceMinutes: Number(e.detail) })}
        ></md3-number-input>
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
      <div class="form-section">
        <div
          style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;"
        >
          <h3 style="margin:0;font-size:1rem;font-weight:600;">Timed Notifications</h3>
          ${sub.kind === 'idle'
            ? html`
                <button
                  class="md3-button outlined"
                  style="padding:4px 12px;"
                  @click=${() => this._emit('add-timed-requested')}
                >
                  Add
                </button>
              `
            : nothing}
        </div>

        ${sub.kind === 'confirm-delete'
          ? html`
              <div class="detail-card" style="text-align:center;padding:24px 16px;">
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

        ${sub.kind === 'adding' || sub.kind === 'editing'
          ? this._renderForm(sub)
          : nothing}

        ${notifications.length === 0 && sub.kind === 'idle'
          ? html`
              <div
                data-timed="empty-state"
                style="text-align:center;padding:24px;color:var(--secondary-text-color);"
              >
                No timed notifications configured
              </div>
            `
          : nothing}

        ${sub.kind === 'idle' || sub.kind === 'confirm-delete'
          ? notifications.map(
              (n) => html`
                <div
                  class="cfg-gs-row"
                  data-timed-id=${n.id}
                  style="display:flex;align-items:center;justify-content:space-between;"
                >
                  <span
                    style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
                  >
                    ${n.message} · ${n.triggerType} · Day ${n.day}
                  </span>
                  <div style="display:flex;gap:4px;flex-shrink:0;">
                    <button
                      class="md3-button text"
                      style="padding:4px 8px;"
                      data-timed-edit=${n.id}
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
                      Edit
                    </button>
                    <button
                      class="md3-button text"
                      style="padding:4px 8px;color:var(--error-color,#ff5252);"
                      data-timed-delete=${n.id}
                      @click=${() => this._emit('request-delete-timed', { id: n.id })}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              `
            )
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
      <div class="detail-card" style="margin-bottom:12px;">
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
            .value=${draft.triggerType}
            @change=${(e: Event) =>
              update({
                triggerType: (e.target as HTMLSelectElement).value as TimedNotificationTrigger,
              })}
          >
            ${this.vm.triggerOptions.map(
              (o) => html`
                <option value="${o.value}" ?selected=${draft.triggerType === o.value}>
                  ${o.label}
                </option>
              `
            )}
          </select>
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
