/**
 * Config Subareas Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's Subareas tab — the
 * subarea list, an inline add form, and a per-row confirm-delete.
 * `@property .vm: SubareasTabViewModel` in, semantic Tab Intents out, **no
 * `@state()` and no `hass`**. Markup transcribed from the former inline
 * `_renderSubareasSection`. The sensor-assignment editor itself is the Shell's
 * `<subarea-config-dialog>` modal, not part of this tab.
 *
 * Tab Intents (the Shell translates them):
 *   - `add-subarea-requested`     (no detail)
 *   - `subarea-name-changed`      detail: { name }
 *   - `commit-add-subarea`        (no detail; Add button or Enter)
 *   - `cancel-add-subarea`        (no detail)
 *   - `edit-subarea-requested`    detail: { subarea }
 *   - `delete-subarea-requested`  detail: { id }
 *   - `confirm-delete-subarea`    detail: { id }
 *   - `cancel-delete-subarea`     (no detail)
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiPlus, mdiPencil, mdiDelete } from '@mdi/js';
import { dialogStyles } from '../../../styles/dialog.styles';
import type { SubareaRowVM, SubareasTabViewModel } from '../viewmodels/subareas-tab.viewmodel';

@customElement('config-subareas-tab')
export class ConfigSubareasTab extends LitElement {
  @property({ attribute: false }) vm!: SubareasTabViewModel;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }
    `,
  ];

  private _emit(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  render(): TemplateResult {
    if (!this.vm.hasGrowspace) {
      return html`
        <div class="detail-card">
          <h3>Subareas</h3>
          <div style="text-align:center;padding:20px;color:var(--secondary-text-color);">
            Select a growspace in the Sensors tab first.
          </div>
        </div>
      `;
    }
    return html`
      <div class="detail-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 style="margin:0;">Subareas</h3>
          <button class="md3-button tonal" @click=${() => this._emit('add-subarea-requested')}>
            <svg style="width:18px;height:18px;fill:currentColor;margin-right:6px;" viewBox="0 0 24 24">
              <path d="${mdiPlus}"></path>
            </svg>
            Add Subarea
          </button>
        </div>

        ${this.vm.adding ? this._renderAddForm(this.vm.adding.name) : nothing}
        ${this.vm.loading
          ? html`<div style="text-align:center;padding:20px;color:var(--secondary-text-color);">
              Loading...
            </div>`
          : this.vm.showEmpty
            ? html`<div style="text-align:center;padding:20px;color:var(--secondary-text-color);">
                No subareas configured. Add one to get started.
              </div>`
            : html`
                <div style="display:flex;flex-direction:column;gap:8px;">
                  ${this.vm.subareas.map((row) => this._renderRow(row))}
                </div>
              `}
      </div>
    `;
  }

  private _renderAddForm(name: string): TemplateResult {
    return html`
      <div
        style="display:flex;gap:8px;align-items:center;margin-bottom:16px;background:rgba(255,255,255,0.05);padding:12px;border-radius:8px;"
      >
        <input
          class="md3-input"
          style="flex:1;"
          placeholder="Subarea name..."
          .value=${name}
          @input=${(e: Event) =>
            this._emit('subarea-name-changed', { name: (e.target as HTMLInputElement).value })}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key === 'Enter') this._emit('commit-add-subarea');
          }}
        />
        <button
          class="md3-button primary"
          @click=${() => this._emit('commit-add-subarea')}
          ?disabled=${!name.trim()}
        >
          Add
        </button>
        <button class="md3-button tonal" @click=${() => this._emit('cancel-add-subarea')}>
          Cancel
        </button>
      </div>
    `;
  }

  private _renderRow(row: SubareaRowVM): TemplateResult {
    const subarea = row.subarea;
    return html`
      <div
        style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);padding:12px;border-radius:8px;"
      >
        <div>
          <div style="font-weight:500;">${subarea.name}</div>
          <div style="font-size:0.8rem;color:var(--secondary-text-color);">ID: ${subarea.id}</div>
        </div>
        <div style="display:flex;gap:4px;align-items:center;">
          ${row.confirmingDelete
            ? html`
                <span style="font-size:0.85rem;color:var(--secondary-text-color);margin-right:4px;"
                  >Remove ${subarea.name}?</span
                >
                <button
                  class="md3-button primary error"
                  @click=${() => this._emit('confirm-delete-subarea', { id: subarea.id })}
                  style="padding:6px 10px;min-width:auto;font-size:0.8rem;"
                >
                  Yes
                </button>
                <button
                  class="md3-button tonal"
                  @click=${() => this._emit('cancel-delete-subarea')}
                  style="padding:6px 10px;min-width:auto;font-size:0.8rem;"
                >
                  No
                </button>
              `
            : html`
                <button
                  class="md3-button text"
                  @click=${() => this._emit('edit-subarea-requested', { subarea })}
                  style="padding:8px;min-width:auto;"
                  title="Edit sensors"
                >
                  <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
                    <path d="${mdiPencil}"></path>
                  </svg>
                </button>
                <button
                  class="md3-button text error"
                  @click=${() => this._emit('delete-subarea-requested', { id: subarea.id })}
                  style="padding:8px;min-width:auto;"
                  title="Delete subarea"
                >
                  <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
                    <path d="${mdiDelete}"></path>
                  </svg>
                </button>
              `}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'config-subareas-tab': ConfigSubareasTab;
  }
}
