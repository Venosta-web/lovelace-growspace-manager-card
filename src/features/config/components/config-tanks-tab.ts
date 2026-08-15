/**
 * Config Tanks Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's Tanks tab — the tank
 * list plus the inline add/edit form. `@property .vm: TanksTabViewModel` in,
 * semantic Tab Intents out, **no `@state()` and no `hass`**. Markup transcribed
 * from the former inline `_renderTanksSection`; `md3-*` / `detail-card` /
 * `row-col-grid` come from the shared `dialogStyles`.
 *
 * Tab Intents (the Shell translates them):
 *   - `add-tank-requested`    (no detail)
 *   - `edit-tank-requested`   detail: { index }
 *   - `delete-tank-requested` detail: { index }
 *   - `tank-draft-changed`    detail: { partial: Partial<TankDraftFields> }
 *   - `cancel-tank`           (no detail)
 *   - `save-tank-requested`   (no detail)
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiWater, mdiPlus, mdiPencil, mdiDelete } from '@mdi/js';
import { dialogStyles } from '../../../styles/dialog.styles';
import './config-section-header';
import type { TankDraftFields } from '../../../dialogs/config-dialog-sm';
import type { TankEditVM, TankRowVM, TanksTabViewModel } from '../viewmodels/tanks-tab.viewmodel';

const LIST_ID = 'list-tank-sensor-entity';

@customElement('config-tanks-tab')
export class ConfigTanksTab extends LitElement {
  @property({ attribute: false }) vm!: TanksTabViewModel;

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

  private _updateDraft(partial: Partial<TankDraftFields>): void {
    this._emit('tank-draft-changed', { partial });
  }

  render(): TemplateResult {
    return html`
      <div class="detail-card">
        <config-section-header .icon=${mdiWater} label="Irrigation Tanks">
          <button
            class="md3-button tonal"
            @click=${() => this._emit('add-tank-requested')}
            style="padding:6px 12px;"
          >
            <svg
              style="width:16px;height:16px;fill:currentColor;margin-right:4px;"
              viewBox="0 0 24 24"
            >
              <path d="${mdiPlus}"></path>
            </svg>
            Add Tank
          </button>
        </config-section-header>

        ${this.vm.showEmpty
          ? html`<div style="font-size:0.85rem;color:var(--secondary-text-color);padding:8px 0;">
              No tanks configured.
            </div>`
          : nothing}

        <div style="display:flex;flex-direction:column;gap:8px;">
          ${this.vm.tanks.map((tank) => this._renderRow(tank))}
        </div>

        ${this.vm.editing ? this._renderForm(this.vm.editing) : nothing}
      </div>
    `;
  }

  private _renderRow(tank: TankRowVM): TemplateResult {
    return html`
      <div
        style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);padding:10px 12px;border-radius:8px;"
      >
        <div>
          <div style="font-weight:500;">${tank.displayName}</div>
          <div style="font-size:0.78rem;color:var(--secondary-text-color);">
            ${tank.sensorEntity}
            ${tank.volumeLiters != null ? html` · ${tank.volumeLiters} L` : nothing} · warn at
            ${tank.warningLevel}%
          </div>
        </div>
        <div style="display:flex;gap:6px;">
          <button
            class="md3-button text"
            @click=${() => this._emit('edit-tank-requested', { index: tank.index })}
            style="padding:6px;min-width:auto;"
            aria-label=${`Edit ${tank.displayName}`}
            title=${`Edit ${tank.displayName}`}
          >
            <svg
              style="width:18px;height:18px;fill:currentColor;"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="${mdiPencil}"></path>
            </svg>
          </button>
          <button
            class="md3-button text danger"
            @click=${() => this._emit('delete-tank-requested', { index: tank.index })}
            style="padding:6px;min-width:auto;"
            aria-label=${`Delete ${tank.displayName}`}
            title=${`Delete ${tank.displayName}`}
          >
            <svg
              style="width:18px;height:18px;fill:currentColor;"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="${mdiDelete}"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  private _renderForm(draft: TankEditVM): TemplateResult {
    return html`
      <div
        style="margin-top:12px;background:rgba(255,255,255,0.04);border:1px solid var(--divider-color,rgba(255,255,255,0.15));border-radius:8px;padding:16px;display:flex;flex-direction:column;gap:12px;"
      >
        <div class="md3-input-group">
          <label class="md3-label">Sensor Entity *</label>
          <input
            class="md3-input"
            list="${LIST_ID}"
            .value=${draft.sensorEntity}
            @input=${(e: Event) =>
              this._updateDraft({ sensorEntity: (e.target as HTMLInputElement).value })}
            placeholder="Search entity..."
          />
          <datalist id="${LIST_ID}">
            ${this.vm.sensorOptions.map((eid) => html`<option value="${eid}"></option>`)}
          </datalist>
        </div>
        <div class="md3-input-group">
          <label class="md3-label">Name</label>
          <input
            class="md3-input"
            type="text"
            .value=${draft.name}
            @input=${(e: Event) =>
              this._updateDraft({ name: (e.target as HTMLInputElement).value })}
            placeholder="e.g. Main Tank"
          />
        </div>
        <div class="row-col-grid">
          <div class="md3-input-group">
            <label class="md3-label">Volume (L, optional)</label>
            <input
              class="md3-input"
              type="number"
              min="0"
              step="0.1"
              .value=${draft.volumeLiters != null ? String(draft.volumeLiters) : ''}
              @input=${(e: Event) => {
                const v = (e.target as HTMLInputElement).value;
                this._updateDraft({ volumeLiters: v === '' ? null : parseFloat(v) });
              }}
              placeholder="e.g. 100"
            />
          </div>
          <div class="md3-input-group">
            <label class="md3-label">Warning Level (%)</label>
            <input
              class="md3-input"
              type="number"
              min="0"
              max="100"
              step="1"
              .value=${String(draft.warningLevel)}
              @input=${(e: Event) =>
                this._updateDraft({
                  warningLevel: parseFloat((e.target as HTMLInputElement).value) || 30,
                })}
            />
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px;">
          <button class="md3-button tonal" @click=${() => this._emit('cancel-tank')}>Cancel</button>
          <button class="md3-button primary" @click=${() => this._emit('save-tank-requested')}>
            Save Tank
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'config-tanks-tab': ConfigTanksTab;
  }
}
