/**
 * Irrigation Tanks Tab Component (ADR-0019)
 *
 * The dumb presentational element for the Irrigation Dialog's Tanks tab.
 * `@property .vm: TanksTabViewModel` in, semantic Tab Intents out, **no
 * `@state()` of its own** — the edit draft lives in the DialogStateMachine and
 * is projected into the VM (b1). Markup is transcribed verbatim from the former
 * inline `_renderTanksTab` / `_renderTankEditForm` / `_renderTankRow` helpers so
 * the rendered output stays byte-identical; the `.tank-*` styles moved here with
 * it. `md3-*`, `detail-card`, `row-col-grid`, `button-group` come from the
 * shared `dialogStyles`.
 *
 * Tab Intents (the Dialog Shell owns their translation to SM events):
 *   - `edit-tank-requested`  detail: { index }
 *   - `tank-draft-changed`   detail: { partial: Partial<TankDraft> }
 *   - `cancel-tank-edit`     (no detail)
 *   - `save-tank-requested`  (no detail)
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiPencil } from '@mdi/js';
import { dialogStyles } from '../../../styles/dialog.styles';
import type { TankDraft } from '../../../dialogs/irrigation-dialog-sm';
import type { TanksTabViewModel, TankRowVM, TankEditVM } from '../viewmodels/tanks-tab.viewmodel';

@customElement('irrigation-tanks-tab')
export class IrrigationTanksTab extends LitElement {
  @property({ attribute: false }) vm!: TanksTabViewModel;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }
      /* ── Tank row (bar-style) — copied from irrigation-dialog ── */
      .tank-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: var(--border-radius-md, 12px);
        background: rgba(255, 255, 255, 0.02);
        transition: border-color 0.2s;
      }
      .tank-row.warning {
        border-color: rgba(244, 67, 54, 0.4);
        background: rgba(244, 67, 54, 0.04);
      }
      .tank-row-info {
        flex: 1;
        min-width: 0;
      }
      .tank-row-name {
        font-size: var(--font-size-supporting);
        font-weight: 500;
      }
      .tank-bar-track {
        height: 5px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: var(--border-radius-xs, 4px);
        overflow: hidden;
        margin-top: 5px;
      }
      .tank-bar-fill {
        height: 100%;
        width: 100%;
        transform: scaleX(0);
        transform-origin: left;
        transition: transform var(--md3-motion-duration-medium2) var(--md3-motion-easing-standard);
      }
      .tank-row-stat {
        font-size: 12.5px;
        text-align: right;
        flex-shrink: 0;
        font-variant-numeric: tabular-nums;
      }
      .tank-row-pct {
        font-weight: 600;
      }
      .tank-row-sub {
        font-size: 11px;
        opacity: 0.5;
        margin-top: 2px;
      }
    `,
  ];

  private _emit(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  render(): TemplateResult {
    const vm = this.vm;
    if (!vm || vm.tanks.length === 0) {
      return html`
        <div class="detail-card" style="text-align:center;padding:40px;">
          <p style="opacity:0.7;">No irrigation tanks configured for this growspace.</p>
          <p style="font-size:var(--font-size-sm);opacity:0.5;">
            Configure tank sensors in the Environment Settings to monitor tank levels.
          </p>
        </div>
      `;
    }

    return html`
      <div class="detail-card">
        <div
          style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"
        >
          <h3 style="margin:0;">Tank Levels</h3>
          <span style="font-size:11px;opacity:0.45;">Updates every 30 s</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${vm.tanks.map((row) => this._renderTankRow(row))}
        </div>
        ${vm.editing ? this._renderTankEditForm(vm.editing) : nothing}
      </div>
    `;
  }

  private _renderTankRow(row: TankRowVM): TemplateResult {
    return html`
      <div class="tank-row ${row.isWarning ? 'warning' : ''}">
        <div class="tank-row-info">
          <div class="tank-row-name">${row.name}</div>
          <div class="tank-bar-track">
            <div
              class="tank-bar-fill"
              style="transform:scaleX(${row.barWidthPct / 100});background:${row.color};"
            ></div>
          </div>
        </div>
        <div class="tank-row-stat">
          <div class="tank-row-pct" style="color:${row.color};">
            ${row.fillLabel}
            ${row.isWarning ? html`<span style="margin-left:4px;">⚠️</span>` : nothing}
          </div>
          ${row.subLine ? html`<div class="tank-row-sub">${row.subLine}</div>` : nothing}
          <button
            class="md3-button text tank-edit-btn"
            style="padding:4px;min-width:auto;margin-top:4px;"
            title="Edit tank"
            @click=${() => this._emit('edit-tank-requested', { index: row.index })}
          >
            <ha-svg-icon .path=${mdiPencil}></ha-svg-icon>
          </button>
        </div>
      </div>
    `;
  }

  private _renderTankEditForm(editing: TankEditVM): TemplateResult {
    const draft = editing.draft;
    const update = (partial: Partial<TankDraft>) => this._emit('tank-draft-changed', { partial });
    return html`
      <div
        class="tank-edit-form"
        style="margin-top:12px;background:rgba(255,255,255,0.04);border:1px solid var(--divider-color,rgba(255,255,255,0.15));border-radius: var(--border-radius-sm, 8px);padding:16px;display:flex;flex-direction:column;gap:12px;"
      >
        <div class="md3-input-group">
          <label class="md3-label">Sensor Entity *</label>
          <input
            class="md3-input"
            list="tank-edit-sensor-datalist"
            .value=${draft.sensorEntity}
            @input=${(e: Event) => update({ sensorEntity: (e.target as HTMLInputElement).value })}
            placeholder="Search entity..."
          />
          <datalist id="tank-edit-sensor-datalist">
            ${editing.entityOptions.map((id) => html`<option value="${id}"></option>`)}
          </datalist>
        </div>
        <div class="md3-input-group">
          <label class="md3-label">Name</label>
          <input
            class="md3-input"
            type="text"
            .value=${draft.name}
            @input=${(e: Event) => update({ name: (e.target as HTMLInputElement).value })}
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
              .value=${draft.volumeLiters !== null ? String(draft.volumeLiters) : ''}
              @input=${(e: Event) => {
                const v = parseFloat((e.target as HTMLInputElement).value);
                update({ volumeLiters: isNaN(v) ? null : v });
              }}
              placeholder="e.g. 200"
            />
          </div>
          <div class="md3-input-group">
            <label class="md3-label">Warning Level (%)</label>
            <input
              class="md3-input"
              type="number"
              min="0"
              max="100"
              .value=${String(draft.warningLevel)}
              @input=${(e: Event) => {
                const v = parseInt((e.target as HTMLInputElement).value, 10);
                update({ warningLevel: isNaN(v) ? 30 : v });
              }}
            />
          </div>
        </div>
        <div class="button-group">
          <button class="md3-button tonal" @click=${() => this._emit('cancel-tank-edit')}>
            Cancel
          </button>
          <button class="md3-button primary" @click=${() => this._emit('save-tank-requested')}>
            Save
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'irrigation-tanks-tab': IrrigationTanksTab;
  }
}
