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
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiPlus } from '@mdi/js';
import { dialogStyles } from '../../../styles/dialog.styles';
import '../../shared/ui/md3-text-input';
import '../../shared/ui/md3-number-input';
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
        font-size: 0.875rem;
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
        font-size: 0.85rem;
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
      /* ── multi-select pickers (edit form) ── */
      .multi-select-container {
        position: relative;
        margin-bottom: 0;
      }
      .multi-select-box {
        background: rgba(var(--card-background-color, 255, 255, 255), 0.05);
        border-radius: 4px 4px 0 0;
        border-bottom: 1px solid var(--primary-text-color, rgba(255, 255, 255, 0.4));
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        padding: 26px 16px 6px;
        min-height: 56px;
        box-sizing: border-box;
      }
      .md3-label-multi {
        position: absolute;
        top: 8px;
        left: 16px;
        font-size: 0.75rem;
        color: var(--secondary-text-color);
        pointer-events: none;
        z-index: 10;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.1));
        border-radius: 16px;
        padding: 0 4px 0 12px;
        font-size: 0.9rem;
        min-height: 44px;
      }
      .chip-remove {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 44px;
        min-height: 44px;
        padding: 0;
        border: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        cursor: pointer;
        margin-left: 2px;
        font-weight: bold;
        opacity: 0.7;
      }
      .chip-remove:hover {
        opacity: 1;
      }
      .chip-remove:focus-visible {
        outline: 2px solid var(--primary-text-color, #fff);
        outline-offset: -4px;
        opacity: 1;
      }
      .search-input-inner {
        flex: 1;
        min-width: 100px;
        border: none;
        background: transparent;
        color: var(--primary-text-color);
        font-family: inherit;
        font-size: 1rem;
        padding: 0;
        margin: 0;
        height: 24px;
        outline: none;
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
            <h3 style="color:var(--error-color,#ff5252);">Delete Growspace?</h3>
            <p style="margin-bottom:30px;color:var(--secondary-text-color);">
              Are you sure you want to delete "<strong>${state.name}</strong>"?<br />
              This will remove all associated plants and history.<br />
              This action cannot be undone.
            </p>
          </div>
        </div>
      `;
    }

    return html`
      <div class="cfg-master-detail">
        <div class="cfg-master-list">
          <div
            style="font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--secondary-text-color,rgba(255,255,255,0.5));padding:0 4px 8px;"
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
                state.camera
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
    camera?: EnvMultiSelect
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
    `;
  }

  private _multiSelect(
    label: string,
    key: 'lungroomTempSensors' | 'cameraEntities',
    field: EnvMultiSelect
  ): TemplateResult {
    const values = field.value;
    const listId = `list-multi-${key}`;
    const emit = (partial: Partial<EnvironmentDraft>) =>
      this._emit('env-draft-changed', { partial });
    return html`
      <div class="multi-select-container">
        <label class="md3-label-multi">${label}</label>
        <div class="multi-select-box">
          ${values.map(
            (val) => html`
              <div class="chip">
                ${val}
                <button
                  type="button"
                  class="chip-remove"
                  aria-label=${`Remove ${val}`}
                  title=${`Remove ${val}`}
                  @click=${() => emit({ [key]: values.filter((v) => v !== val) })}
                >
                  ×
                </button>
              </div>
            `
          )}
          <input
            class="search-input-inner"
            list="${listId}"
            placeholder=${values.length === 0 ? 'Add Entity...' : ''}
            @change=${(e: Event) => {
              const input = e.target as HTMLInputElement;
              const val = input.value;
              if (val && !values.includes(val)) emit({ [key]: [...values, val] });
              input.value = '';
            }}
          />
        </div>
        <datalist id="${listId}">
          ${field.options.map((eid) => html`<option value="${eid}"></option>`)}
        </datalist>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'config-growspaces-tab': ConfigGrowspacesTab;
  }
}
