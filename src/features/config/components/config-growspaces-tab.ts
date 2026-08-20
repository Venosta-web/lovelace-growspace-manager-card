/**
 * Config Growspaces Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's Growspaces tab — a
 * master/detail collection-CRUD view. `@property .vm: GrowspacesTabViewModel` in,
 * semantic Tab Intents out, **no `@state()` and no `hass`**. Markup + `cfg-*`
 * master/detail styles transcribed from the former inline `_renderGrowspacesSection`
 * / `_renderAddGrowspaceForm` / `_renderEditGrowspaceForm`.
 *
 * **No Save/Delete/Cancel here** — those buttons live in the Dialog Shell footer.
 * The component emits only navigation + draft-edit intents.
 *
 * Tab Intents (the Shell translates them):
 *   - `select-growspace`     detail: { id }   (master row click; '' clears)
 *   - `start-add-growspace`  (no detail)
 *   - `add-draft-changed`    detail: { partial: Partial<GrowspaceDraft> }
 *   - `edit-draft-changed`   detail: { partial: Partial<GrowspaceDraft> }
 *   - `env-draft-changed`    detail: { partial }   (edit-form lung-room/camera pickers)
 *   - `remove-environment-requested` detail: { sensorCount, controllerCount }
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiAlertOutline, mdiPlus } from '@mdi/js';
import { dialogStyles } from '../../../styles/dialog.styles';
import '../../shared/ui/md3-text-input';
import '../../shared/ui/md3-number-input';
import './config-entity-multi-select';
import type { EnvironmentDraft } from '../../../dialogs/config-dialog-sm';
import type {
  EnvMultiSelect,
  GrowspaceDraft,
  GrowspacesTabViewModel,
  NotifyService,
} from '../viewmodels/growspaces-tab.viewmodel';

@customElement('config-growspaces-tab')
export class ConfigGrowspacesTab extends LitElement {
  @property({ attribute: false }) vm!: GrowspacesTabViewModel;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }
      .cfg-master-detail {
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 16px;
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }
      .cfg-master-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
        overflow-y: auto;
        padding-right: 2px;
        scrollbar-width: thin;
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
        font-size: 1rem;
      }
      .cfg-gs-row:hover {
        background: rgba(255, 255, 255, 0.04);
      }
      .cfg-gs-row.active {
        background: rgba(76, 175, 80, 0.08);
        border-color: rgba(76, 175, 80, 0.25);
      }
      .cfg-gs-row .gs-name {
        flex: 1;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .cfg-master-add-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        height: 38px;
        margin-top: 8px;
        border: 1px dashed var(--divider-color, rgba(255, 255, 255, 0.2));
        border-radius: 8px;
        background: transparent;
        color: var(--primary-color, #4caf50);
        font-family: inherit;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
        width: 100%;
      }
      .cfg-master-add-btn:hover {
        background: rgba(76, 175, 80, 0.06);
        border-color: var(--primary-color, #4caf50);
      }
      .cfg-detail-pane {
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding-right: 2px;
        scrollbar-width: thin;
      }
      @media (max-width: 600px) {
        .cfg-master-detail {
          grid-template-columns: 1fr;
        }
      }
      .danger-zone {
        margin-top: auto;
        padding: 16px;
        border: 1px solid color-mix(in srgb, var(--error-color, #f44336) 35%, transparent);
        border-radius: 12px;
        background: color-mix(in srgb, var(--error-color, #f44336) 6%, transparent);
      }
      .danger-zone-heading {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 8px;
        color: var(--error-color, #f44336);
        font-size: 1.142857rem;
        font-weight: 600;
      }
      .danger-zone-heading svg {
        width: 20px;
        height: 20px;
        flex: 0 0 auto;
        fill: currentColor;
      }
      .danger-zone p {
        max-width: 65ch;
        margin: 0 0 16px;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
        font-size: 1rem;
        line-height: 1.5;
        overflow-wrap: anywhere;
      }
      .danger-zone .md3-button {
        min-height: 44px;
      }
      .remove-environment-confirm {
        padding: 40px 20px;
        text-align: center;
      }
      .remove-environment-confirm h3 {
        color: var(--error-color, #f44336);
      }
      .remove-environment-confirm p {
        max-width: 65ch;
        margin: 0 auto 12px;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
        line-height: 1.5;
        overflow-wrap: anywhere;
      }
    `,
  ];

  private _emit(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  render(): TemplateResult {
    const state = this.vm.state;
    if (state.mode === 'confirm-delete') {
      return html`
        <div class="cfg-master-detail" style="grid-template-columns:1fr;">
          <div class="detail-card" style="text-align:center;padding:40px 20px;">
            <h3 style="color:var(--error-color,#f44336);">Delete Growspace?</h3>
            <p style="margin-bottom:30px;color:var(--secondary-text-color);">
              Are you sure you want to delete "<strong>${state.name}</strong>"?<br />
              This will remove all associated plants and history.<br />
              This action cannot be undone.
            </p>
          </div>
        </div>
      `;
    }

    if (state.mode === 'confirm-remove-environment') {
      const sensorLabel = state.sensorCount === 1 ? 'sensor' : 'sensors';
      const controllerLabel = state.controllerCount === 1 ? 'controller' : 'controllers';
      return html`
        <div class="cfg-master-detail" style="grid-template-columns:1fr;">
          <div class="detail-card remove-environment-confirm" role="status" aria-live="polite">
            <h3>Remove environment from ${state.name}?</h3>
            <p>
              This will disconnect <strong>${state.sensorCount} ${sensorLabel}</strong> and
              <strong>${state.controllerCount} ${controllerLabel}</strong> from this growspace.
            </p>
            <p>
              Camera, tank, spatial, threshold, and automation settings will also be cleared. This
              action cannot be undone.
            </p>
            ${state.removing ? html`<p>Removing environment…</p>` : nothing}
          </div>
        </div>
      `;
    }

    return html`
      <div class="cfg-master-detail">
        <div class="cfg-master-list">
          <div
            style="font-size:0.785714rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--secondary-text-color,rgba(255,255,255,0.5));padding:0 4px 8px;"
          >
            All Growspaces
          </div>
          ${this.vm.growspaces.map(
            (gs) => html`
              <div
                class="cfg-gs-row ${gs.active ? 'active' : ''}"
                @click=${() => this._emit('select-growspace', { id: gs.id })}
              >
                <span class="gs-name">${gs.name}</span>
              </div>
            `
          )}
          <button class="cfg-master-add-btn" @click=${() => this._emit('start-add-growspace')}>
            <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiPlus}"></path>
            </svg>
            Add Growspace
          </button>
        </div>

        <div class="cfg-detail-pane">
          ${state.mode === 'adding'
            ? this._renderForm('add', 'New Growspace', state.draft)
            : nothing}
          ${state.mode === 'editing'
            ? html`${this._renderForm(
                'edit',
                'Edit Details',
                state.draft,
                state.lungroom,
                state.camera,
                state.removalImpact
              )}`
            : nothing}
          ${state.mode === 'idle'
            ? html`
                <div style="text-align:center;padding:40px 20px;color:var(--secondary-text-color);">
                  Select a growspace to edit, or click "Add Growspace" to create a new one.
                </div>
              `
            : nothing}
        </div>
      </div>
    `;
  }

  private _renderForm(
    which: 'add' | 'edit',
    heading: string,
    draft: GrowspaceDraft,
    lungroom?: EnvMultiSelect,
    camera?: EnvMultiSelect,
    removalImpact?: { sensorCount: number; controllerCount: number }
  ): TemplateResult {
    const intent = which === 'add' ? 'add-draft-changed' : 'edit-draft-changed';
    const update = (partial: Partial<GrowspaceDraft>) => this._emit(intent, { partial });
    return html`
      <div class="detail-card">
        <h3>${heading}</h3>
        <md3-text-input
          label="Growspace Name"
          .value=${draft.name}
          @change=${(e: CustomEvent) => update({ name: e.detail })}
        ></md3-text-input>
        <div class="row-col-grid">
          <md3-number-input
            label="Rows"
            .value=${draft.rows}
            @change=${(e: CustomEvent) => update({ rows: parseInt(e.detail) })}
          ></md3-number-input>
          <md3-number-input
            label="Plants per Row"
            .value=${draft.plantsPerRow}
            @change=${(e: CustomEvent) => update({ plantsPerRow: parseInt(e.detail) })}
          ></md3-number-input>
        </div>
        <div class="md3-input-group">
          <label class="md3-label">Notification Service (Mobile App)</label>
          <select
            class="md3-input"
            .value=${draft.notificationService}
            @change=${(e: Event) =>
              update({ notificationService: (e.target as HTMLSelectElement).value })}
          >
            <option value="">None</option>
            ${this.vm.notifyServices.map(
              (s: NotifyService) => html`
                <option value="${s.value}" ?selected=${draft.notificationService === s.value}>
                  ${s.label}
                </option>
              `
            )}
          </select>
        </div>
        ${lungroom
          ? this._multiSelect('Lung Room Temp Sensors', 'lungroomTempSensors', lungroom)
          : nothing}
        ${camera ? this._multiSelect('Area Camera', 'cameraEntities', camera) : nothing}
      </div>
      ${which === 'edit' && removalImpact
        ? html`
            <section class="danger-zone" aria-labelledby="environment-danger-zone-title">
              <h3 id="environment-danger-zone-title" class="danger-zone-heading">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d=${mdiAlertOutline}></path>
                </svg>
                Danger zone
              </h3>
              <p>
                Remove every environmental assignment and controller configuration from this
                growspace. Plants and growspace history are not deleted.
              </p>
              <button
                type="button"
                class="md3-button danger"
                @click=${() => this._emit('remove-environment-requested', removalImpact)}
              >
                Remove Environment
              </button>
            </section>
          `
        : nothing}
    `;
  }

  private _multiSelect(
    label: string,
    key: 'lungroomTempSensors' | 'cameraEntities',
    field: EnvMultiSelect
  ): TemplateResult {
    const values = field.value;
    const emit = (partial: Partial<EnvironmentDraft>) =>
      this._emit('env-draft-changed', { partial });
    return html`
      <config-entity-multi-select
        .label=${label}
        .values=${values}
        .options=${field.options}
        @entity-values-changed=${(event: CustomEvent<{ values: string[] }>) =>
          emit({ [key]: event.detail.values })}
      ></config-entity-multi-select>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'config-growspaces-tab': ConfigGrowspacesTab;
  }
}
