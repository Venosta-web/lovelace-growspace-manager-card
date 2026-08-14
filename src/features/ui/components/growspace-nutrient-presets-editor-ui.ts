import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  mdiPlus,
  mdiDelete,
  mdiPencil,
  mdiArrowLeft,
  mdiCheck,
  mdiAlertCircle,
  mdiFlask,
} from '@mdi/js';
import type { NutrientPresetsResponse, NutrientInventoryResponse } from '../../../slices/nutrient';
import type { PresetsSub, NutrientPresetDraft } from '../../../dialogs/feed-and-water-dialog-sm';

type PresetsEditorEvent =
  | { type: 'NewItemRequested' }
  | { type: 'ItemSelected'; id: string }
  | { type: 'BackToList' }
  | { type: 'EditStarted'; draft: NutrientPresetDraft }
  | { type: 'SaveRequested' }
  | { type: 'DeleteRequested'; id: string; name: string }
  | { type: 'DeleteConfirmed' }
  | { type: 'DeleteCancelled' }
  | { type: 'PresetDraftChanged'; field: keyof Omit<NutrientPresetDraft, 'nutrients'>; value: string | number | null | undefined }
  | { type: 'PresetNutrientRowAdded' }
  | { type: 'PresetNutrientRowRemoved'; index: number }
  | { type: 'PresetNutrientRowUpdated'; index: number; patch: Partial<{ nutrient_id: string; dose_ml_l: number; name: string }> };
import { dialogStyles } from '../../../styles/dialog.styles';

// ─── Stage colors ─────────────────────────────────────────────────────────────

const STAGE_COLOR: Record<string, string> = {
  veg: 'var(--primary-color, #4caf50)',
  flower: '#e91e63',
  seedling: '#00bcd4',
  clone: '#9c27b0',
  mother: '#ff9800',
};

function stageColor(stage?: string): string {
  return STAGE_COLOR[stage ?? ''] ?? 'var(--secondary-text-color)';
}

function draftFromPreset(preset: NutrientPresetsResponse[string]): NutrientPresetDraft {
  return {
    name: preset.name,
    stage: preset.stage,
    week: preset.week,
    ec_target: preset.ec_target ?? null,
    ph_target: preset.ph_target ?? null,
    nutrients: (preset.nutrients ?? []).map((n) => ({ nutrient_id: n.nutrient_id, dose_ml_l: n.dose_ml_l, name: n.name })),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

@customElement('growspace-nutrient-presets-editor-ui')
export class GrowspaceNutrientPresetsEditorUI extends LitElement {
  @property({ attribute: false }) presets: NutrientPresetsResponse | null = null;
  @property({ attribute: false }) inventory: NutrientInventoryResponse | null = null;
  @property({ attribute: false }) selectedId: string | null = null;
  @property({ attribute: false }) sub: PresetsSub = { kind: 'idle' };

  static styles = [
    dialogStyles,
    css`
      .list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .list-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        cursor: pointer;
        transition: background 0.15s;
      }

      .list-item:hover { background: rgba(255, 255, 255, 0.08); }

      .stage-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .item-body { flex: 1; min-width: 0; }

      .item-name {
        font-weight: 500;
        font-size: 0.9rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .item-meta {
        font-size: 0.75rem;
        color: var(--secondary-text-color);
        margin-top: 2px;
      }

      .add-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 10px 16px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px dashed rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        color: var(--primary-text-color);
        cursor: pointer;
        font-size: 0.875rem;
        font-family: inherit;
        transition: background 0.15s;
        margin-bottom: 12px;
      }

      .add-btn:hover { background: rgba(255, 255, 255, 0.09); }

      .empty-state {
        text-align: center;
        padding: 32px 0;
        color: var(--secondary-text-color);
        font-size: 0.9rem;
        opacity: 0.7;
      }

      /* Detail */
      .detail-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
      }

      .back-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--secondary-text-color);
        padding: 6px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        transition: background 0.15s;
      }

      .back-btn:hover { background: rgba(255, 255, 255, 0.08); }

      .detail-title { flex: 1; font-size: 1rem; font-weight: 500; margin: 0; }

      .detail-actions { display: flex; gap: 8px; }

      .icon-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 6px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        color: var(--primary-text-color);
        transition: background 0.15s;
      }

      .icon-btn:hover { background: rgba(255, 255, 255, 0.08); }
      .icon-btn.danger { color: var(--error-color, #f44336); }

      .detail-section {
        background: rgba(255, 255, 255, 0.04);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
      }

      .detail-section-title {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--secondary-text-color);
        margin: 0 0 12px 0;
      }

      .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 0;
        font-size: 0.875rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }

      .detail-row:last-child { border-bottom: none; }
      .detail-label { color: var(--secondary-text-color); }

      .mix-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 0;
        font-size: 0.875rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }

      .mix-row:last-child { border-bottom: none; }

      .orphan-badge {
        font-size: 0.7rem;
        background: rgba(255, 152, 0, 0.15);
        color: var(--gm-warning-color, #ff9800);
        border-radius: 4px;
        padding: 2px 6px;
        text-decoration: line-through;
      }

      /* Edit form */
      .form {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .form-row { display: flex; gap: 12px; }
      .form-row > * { flex: 1; }

      .form-label {
        font-size: 0.75rem;
        color: var(--secondary-text-color);
        margin-bottom: 4px;
        display: block;
      }

      .form-input {
        width: 100%;
        box-sizing: border-box;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        color: var(--primary-text-color);
        font-size: 0.875rem;
        font-family: inherit;
        outline: none;
        transition: border-color 0.15s;
      }

      .form-input:focus { border-color: var(--primary-color, #4caf50); }

      .form-select {
        width: 100%;
        box-sizing: border-box;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        color: var(--primary-text-color);
        font-size: 0.875rem;
        font-family: inherit;
      }

      .form-select option {
        background-color: var(--card-background-color, #1e1e1e);
        color: var(--primary-text-color, #ffffff);
      }

      .nutrient-rows-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .nutrient-rows-label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--secondary-text-color);
      }

      .nutrient-row-item {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 8px;
      }

      .nutrient-row-item > .form-select { flex: 2; }
      .nutrient-row-item > .form-input  { flex: 1; }

      .btn-icon-small {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        color: var(--error-color, #f44336);
        border-radius: 6px;
        display: flex;
        align-items: center;
        flex-shrink: 0;
      }

      .btn-icon-small:hover { background: rgba(244, 67, 54, 0.1); }

      .add-row-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        background: none;
        border: 1px dashed rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding: 6px 12px;
        color: var(--secondary-text-color);
        cursor: pointer;
        font-size: 0.8rem;
        font-family: inherit;
        transition: background 0.15s;
        width: 100%;
        justify-content: center;
      }

      .add-row-btn:hover { background: rgba(255, 255, 255, 0.05); }

      .form-footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 4px;
      }

      .btn {
        padding: 8px 16px;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        font-size: 0.875rem;
        font-family: inherit;
        transition: background 0.15s;
      }

      .btn:disabled { opacity: 0.5; cursor: default; }

      .btn-text {
        background: transparent;
        color: var(--secondary-text-color);
      }

      .btn-text:hover:not(:disabled) { background: rgba(255, 255, 255, 0.06); }

      .btn-primary {
        background: var(--primary-color, #4caf50);
        color: #fff;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .btn-primary:hover:not(:disabled) { filter: brightness(1.1); }

      /* Confirm-delete */
      .confirm-box {
        background: rgba(244, 67, 54, 0.1);
        border: 1px solid rgba(244, 67, 54, 0.3);
        border-radius: 12px;
        padding: 20px;
        text-align: center;
      }

      .confirm-box p { margin: 0 0 16px; font-size: 0.9rem; }

      .confirm-name {
        font-weight: 600;
        color: var(--error-color, #f44336);
      }

      .confirm-box-actions {
        display: flex;
        justify-content: center;
        gap: 8px;
      }

      .btn-danger {
        background: var(--error-color, #f44336);
        color: #fff;
      }

      .btn-danger:hover { filter: brightness(1.1); }
    `,
  ];

  private _dispatch(event: PresetsEditorEvent): void {
    this.dispatchEvent(new CustomEvent('sm-event', { detail: event, bubbles: true, composed: true }));
  }

  render() {
    const { sub, selectedId } = this;

    if (sub.kind === 'editing' || sub.kind === 'applying') {
      return this._renderEditForm(sub);
    }

    if (sub.kind === 'confirm-delete') {
      return this._renderConfirmDelete(sub.id, sub.name);
    }

    if (sub.kind === 'error') {
      return this._renderError(sub);
    }

    if (selectedId !== null) {
      const preset = this.presets?.[selectedId] ?? null;
      return preset ? this._renderDetail(preset) : nothing;
    }

    return this._renderList();
  }

  // ─── Master list ────────────────────────────────────────────────────────────

  private _renderList() {
    const entries = Object.values(this.presets ?? {});

    return html`
      <button
        class="add-btn"
        data-action="add"
        @click=${() => this._dispatch({ type: 'NewItemRequested' })}
      >
        <ha-svg-icon .path=${mdiPlus} style="width:18px;height:18px;fill:currentColor"></ha-svg-icon>
        Add Preset
      </button>

      ${entries.length === 0
        ? html`<div class="empty-state">No presets defined yet.</div>`
        : html`
            <div class="list">
              ${entries.map((p) => this._renderListItem(p))}
            </div>
          `}
    `;
  }

  private _renderListItem(preset: NutrientPresetsResponse[string]) {
    const color = stageColor(preset.stage);
    const count = preset.nutrients?.length ?? 0;

    return html`
      <div
        class="list-item"
        data-preset-id=${preset.id}
        @click=${() => this._dispatch({ type: 'ItemSelected', id: preset.id })}
      >
        <div class="stage-dot" style="background:${color}"></div>
        <div class="item-body">
          <div class="item-name">${preset.name}</div>
          <div class="item-meta">
            ${preset.stage ? html`${preset.stage}` : nothing}
            ${preset.week ? html` · Week ${preset.week}` : nothing}
            · ${count} nutrient${count !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    `;
  }

  // ─── Detail view ────────────────────────────────────────────────────────────

  private _renderDetail(preset: NutrientPresetsResponse[string]) {
    const color = stageColor(preset.stage);

    return html`
      <div class="detail-header">
        <button
          class="back-btn"
          data-action="back"
          @click=${() => this._dispatch({ type: 'BackToList' })}
        >
          <ha-svg-icon .path=${mdiArrowLeft} style="width:20px;height:20px;fill:currentColor"></ha-svg-icon>
        </button>
        <h3 class="detail-title">${preset.name}</h3>
        <div class="detail-actions">
          <button
            class="icon-btn"
            data-action="edit"
            @click=${() => this._dispatch({ type: 'EditStarted', draft: draftFromPreset(preset) })}
          >
            <ha-svg-icon .path=${mdiPencil} style="width:18px;height:18px;fill:currentColor"></ha-svg-icon>
          </button>
          <button
            class="icon-btn danger"
            data-action="delete"
            @click=${() => this._dispatch({ type: 'DeleteRequested', id: preset.id, name: preset.name })}
          >
            <ha-svg-icon .path=${mdiDelete} style="width:18px;height:18px;fill:currentColor"></ha-svg-icon>
          </button>
        </div>
      </div>

      <div class="detail-section">
        <p class="detail-section-title">Stage</p>
        <div class="detail-row">
          <span class="detail-label">Stage</span>
          <span style="color:${color}">${preset.stage ?? '—'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Week</span>
          <span>${preset.week ?? '—'}</span>
        </div>
      </div>

      ${preset.ec_target != null || preset.ph_target != null
        ? html`
            <div class="detail-section">
              <p class="detail-section-title">Targets</p>
              ${preset.ec_target != null
                ? html`
                    <div class="detail-row">
                      <span class="detail-label">EC target</span>
                      <span>${preset.ec_target} mS/cm</span>
                    </div>
                  `
                : nothing}
              ${preset.ph_target != null
                ? html`
                    <div class="detail-row">
                      <span class="detail-label">pH target</span>
                      <span>${preset.ph_target}</span>
                    </div>
                  `
                : nothing}
            </div>
          `
        : nothing}

      <div class="detail-section">
        <p class="detail-section-title">Nutrient mix</p>
        ${(preset.nutrients ?? []).map((row) => {
          const stock = this.inventory?.stocks[row.nutrient_id];
          const isOrphan = !stock;
          return html`
            <div class="mix-row">
              <ha-svg-icon .path=${mdiFlask} style="width:14px;height:14px;fill:currentColor;opacity:0.5"></ha-svg-icon>
              ${isOrphan
                ? html`<span class="orphan-badge" data-orphan style="flex:1">${row.name ?? row.nutrient_id} (missing)</span>`
                : html`<span style="flex:1">${stock!.name}</span>`}
              <span style="color:var(--secondary-text-color)">${row.dose_ml_l} ml/L</span>
            </div>
          `;
        })}
      </div>
    `;
  }

  // ─── Edit form ──────────────────────────────────────────────────────────────

  private _renderEditForm(sub: { kind: 'editing' | 'applying'; draft: NutrientPresetDraft }) {
    const { draft } = sub;
    const applying = sub.kind === 'applying';

    return html`
      <div class="form" data-form="preset">
        <div>
          <label class="form-label">Name *</label>
          <input
            class="form-input"
            type="text"
            .value=${draft.name}
            @input=${(e: Event) =>
              this._dispatch({ type: 'PresetDraftChanged', field: 'name', value: (e.target as HTMLInputElement).value })}
          />
        </div>

        <div class="form-row">
          <div>
            <label class="form-label">Stage</label>
            <select
              class="form-select"
              .value=${draft.stage ?? ''}
              @change=${(e: Event) =>
                this._dispatch({ type: 'PresetDraftChanged', field: 'stage', value: (e.target as HTMLSelectElement).value || undefined })}
            >
              <option value="">—</option>
              <option value="seedling">Seedling</option>
              <option value="clone">Clone</option>
              <option value="veg">Veg</option>
              <option value="flower">Flower</option>
              <option value="mother">Mother</option>
            </select>
          </div>
          <div>
            <label class="form-label">Week</label>
            <input
              class="form-input"
              type="number"
              min="1"
              .value=${String(draft.week ?? '')}
              @input=${(e: Event) => {
                const v = parseInt((e.target as HTMLInputElement).value);
                this._dispatch({ type: 'PresetDraftChanged', field: 'week', value: isNaN(v) ? undefined : v });
              }}
            />
          </div>
        </div>

        <div class="form-row">
          <div>
            <label class="form-label">EC target (mS/cm)</label>
            <input
              class="form-input"
              type="number"
              min="0"
              step="0.1"
              .value=${String(draft.ec_target ?? '')}
              @input=${(e: Event) => {
                const v = parseFloat((e.target as HTMLInputElement).value);
                this._dispatch({ type: 'PresetDraftChanged', field: 'ec_target', value: isNaN(v) ? null : v });
              }}
            />
          </div>
          <div>
            <label class="form-label">pH target</label>
            <input
              class="form-input"
              type="number"
              min="0"
              max="14"
              step="0.1"
              .value=${String(draft.ph_target ?? '')}
              @input=${(e: Event) => {
                const v = parseFloat((e.target as HTMLInputElement).value);
                this._dispatch({ type: 'PresetDraftChanged', field: 'ph_target', value: isNaN(v) ? null : v });
              }}
            />
          </div>
        </div>

        <div>
          <div class="nutrient-rows-header">
            <span class="nutrient-rows-label">Nutrients</span>
            <button
              class="add-row-btn"
              data-action="add-row"
              @click=${() => this._dispatch({ type: 'PresetNutrientRowAdded' })}
            >
              <ha-svg-icon .path=${mdiPlus} style="width:14px;height:14px;fill:currentColor"></ha-svg-icon>
              Add row
            </button>
          </div>

          ${draft.nutrients.map((row, i) => this._renderNutrientRow(row, i))}
        </div>

        <div class="form-footer">
          <button
            class="btn btn-text"
            data-action="cancel"
            @click=${() => this._dispatch({ type: 'BackToList' })}
          >
            Cancel
          </button>
          <button
            class="btn btn-primary"
            data-action="save"
            ?disabled=${applying}
            @click=${() => this._dispatch({ type: 'SaveRequested' })}
          >
            <ha-svg-icon .path=${mdiCheck} style="width:16px;height:16px;fill:currentColor"></ha-svg-icon>
            ${applying ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    `;
  }

  private _renderNutrientRow(row: { nutrient_id: string; dose_ml_l: number; name?: string }, index: number) {
    const stocks = Object.values(this.inventory?.stocks ?? {});
    const isOrphan = row.nutrient_id !== '' && !this.inventory?.stocks[row.nutrient_id];

    return html`
      <div class="nutrient-row-item" data-nutrient-row>
        <select
          class="form-select"
          style="${isOrphan ? 'border-color:var(--gm-warning-color, #ff9800)' : ''}"
          @change=${(e: Event) => {
            const nutrient_id = (e.target as HTMLSelectElement).value;
            const name = this.inventory?.stocks[nutrient_id]?.name ?? '';
            this._dispatch({ type: 'PresetNutrientRowUpdated', index, patch: { nutrient_id, name } });
          }}
        >
          <option value="" ?selected=${row.nutrient_id === ''}>— select nutrient —</option>
          ${isOrphan ? html`<option value=${row.nutrient_id} selected>${row.name ?? row.nutrient_id} (missing)</option>` : nothing}
          ${stocks.map((s) => html`<option value=${s.nutrient_id} ?selected=${s.nutrient_id === row.nutrient_id}>${s.name}</option>`)}
        </select>
        <input
          class="form-input"
          type="number"
          min="0"
          step="0.1"
          placeholder="ml/L"
          .value=${String(row.dose_ml_l)}
          @input=${(e: Event) =>
            this._dispatch({
              type: 'PresetNutrientRowUpdated',
              index,
              patch: { dose_ml_l: parseFloat((e.target as HTMLInputElement).value) || 0 },
            })}
        />
        <button
          class="btn-icon-small"
          data-action="remove-row"
          @click=${() => this._dispatch({ type: 'PresetNutrientRowRemoved', index })}
        >
          <ha-svg-icon .path=${mdiDelete} style="width:16px;height:16px;fill:currentColor"></ha-svg-icon>
        </button>
      </div>
    `;
  }

  // ─── Confirm delete ─────────────────────────────────────────────────────────

  private _renderConfirmDelete(_id: string, name: string) {
    return html`
      <div class="confirm-box">
        <p>Delete <span class="confirm-name">${name}</span>? This cannot be undone.</p>
        <div class="confirm-box-actions">
          <button
            class="btn btn-text"
            data-action="cancel-delete"
            @click=${() => this._dispatch({ type: 'DeleteCancelled' })}
          >
            Cancel
          </button>
          <button
            class="btn btn-danger"
            data-action="confirm-delete"
            @click=${() => this._dispatch({ type: 'DeleteConfirmed' })}
          >
            Delete
          </button>
        </div>
      </div>
    `;
  }

  // ─── Error state ────────────────────────────────────────────────────────────

  private _renderError(sub: { kind: 'error'; draft: NutrientPresetDraft; message: string }) {
    return html`
      <div style="display:flex;align-items:center;gap:8px;background:rgba(244,67,54,0.1);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:0.875rem;color:var(--error-color,#f44336)">
        <ha-svg-icon .path=${mdiAlertCircle} style="width:18px;height:18px;fill:currentColor"></ha-svg-icon>
        ${sub.message}
      </div>
      ${this._renderEditForm({ kind: 'editing', draft: sub.draft })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-nutrient-presets-editor-ui': GrowspaceNutrientPresetsEditorUI;
  }
}
