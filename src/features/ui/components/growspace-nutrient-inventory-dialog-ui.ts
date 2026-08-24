import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  mdiBottleTonicPlus,
  mdiPlus,
  mdiArrowLeft,
  mdiPencil,
  mdiDelete,
  mdiCheck,
  mdiAlertCircle,
  mdiFlask,
  mdiLeaf,
  mdiMoleculeCo2,
  mdiSprout,
  mdiTestTube,
  mdiBug,
} from '@mdi/js';
import type {
  NutrientInventoryResponse,
  NutrientStock,
  NutrientStockType,
} from '../../../slices/nutrient';
import type {
  InventorySub,
  NutrientStockDraft,
  SMEvent,
} from '../../../dialogs/feed-and-water-dialog-sm';
import { dialogStyles } from '../../../styles/dialog.styles';

// ─── Type-color map ───────────────────────────────────────────────────────────

const TYPE_COLOR: Record<NutrientStockType, string> = {
  base: 'var(--primary-color, #4caf50)',
  bloom: 'var(--nutrient-bloom, #e91e63)',
  calmag: 'var(--nutrient-calmag, #ff9800)',
  root: 'var(--nutrient-root, #795548)',
  additive: 'var(--nutrient-additive, #9c27b0)',
  microbe: 'var(--nutrient-microbe, #00bcd4)',
};

const TYPE_ICON: Record<NutrientStockType, string> = {
  base: mdiFlask,
  bloom: mdiLeaf,
  calmag: mdiMoleculeCo2,
  root: mdiSprout,
  additive: mdiTestTube,
  microbe: mdiBug,
};

function stockColor(type: NutrientStockType): string {
  return TYPE_COLOR[type] ?? 'var(--primary-color, #4caf50)';
}

function stockIcon(type: NutrientStockType): string {
  return TYPE_ICON[type] ?? mdiBottleTonicPlus;
}

function fillPercent(stock: NutrientStock): number {
  if (stock.initial_ml === 0) return 0;
  return Math.max(0, Math.min(100, (stock.current_ml / stock.initial_ml) * 100));
}

function fillClass(pct: number): string {
  if (pct <= 10) return 'danger';
  if (pct <= 25) return 'warning';
  return '';
}

function draftFromStock(stock: NutrientStock): NutrientStockDraft {
  return {
    name: stock.name,
    current_ml: stock.current_ml,
    initial_ml: stock.initial_ml,
    brand: stock.brand ?? '',
    stockType: stock.type ?? 'base',
    npk: stock.npk ?? '',
    dose_ml_l: stock.dose_ml_l ?? 0,
    notes: stock.notes ?? '',
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

@customElement('growspace-nutrient-inventory-dialog-ui')
export class GrowspaceNutrientInventoryDialogUI extends LitElement {
  @property({ attribute: false }) inventory: NutrientInventoryResponse | null = null;
  @property({ attribute: false }) selectedId: string | null = null;
  @property({ attribute: false }) sub: InventorySub = { kind: 'idle' };

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
        border-radius: var(--border-radius-md, 12px);
        cursor: pointer;
        transition: background 0.15s;
      }

      .list-item:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      /* Mixed here rather than by concatenating an alpha suffix onto the colour in the
         template: the type colours are var() references, and
         'var(--nutrient-bloom, #e91e63)22' is not a colour. */
      .type-icon {
        background: color-mix(
          in srgb,
          var(--stock-c, var(--primary-color, #4caf50)) 13%,
          transparent
        );
        color: var(--stock-c, var(--primary-color, #4caf50));
        width: 36px;
        height: 36px;
        border-radius: var(--border-radius-md, 12px);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .item-body {
        flex: 1;
        min-width: 0;
      }

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

      .fill-bar-wrap {
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        margin-top: 4px;
        overflow: hidden;
      }

      .fill-bar {
        height: 100%;
        width: 100%;
        background: var(--primary-color, #4caf50);
        transform: scaleX(0);
        transform-origin: left;
        transition: transform var(--md3-motion-duration-medium2) var(--md3-motion-easing-standard);
      }

      .fill-bar.warning {
        background: var(--gm-warning-color, #ff9800);
      }
      .fill-bar.danger {
        background: var(--gm-error-color);
      }

      .add-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 10px 16px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px dashed rgba(255, 255, 255, 0.2);
        border-radius: var(--border-radius-md, 12px);
        color: var(--primary-text-color);
        cursor: pointer;
        font-size: 0.875rem;
        font-family: inherit;
        transition: background 0.15s;
        margin-bottom: 12px;
      }

      .add-btn:hover {
        background: rgba(255, 255, 255, 0.09);
      }

      .empty-state {
        text-align: center;
        padding: 32px 0;
        color: var(--secondary-text-color);
        font-size: 0.9rem;
        opacity: 0.7;
      }

      /* Detail view */
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
        border-radius: var(--border-radius-sm, 8px);
        display: flex;
        align-items: center;
        transition: background 0.15s;
      }

      .back-btn:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .detail-title {
        flex: 1;
        font-size: 1rem;
        font-weight: 500;
        margin: 0;
      }

      .detail-actions {
        display: flex;
        gap: 8px;
      }

      .icon-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 6px;
        border-radius: var(--border-radius-sm, 8px);
        display: flex;
        align-items: center;
        transition: background 0.15s;
        color: var(--primary-text-color);
      }

      .icon-btn:hover {
        background: rgba(255, 255, 255, 0.08);
      }
      .icon-btn.danger {
        color: var(--error-color, #f44336);
      }

      .detail-section {
        background: rgba(255, 255, 255, 0.04);
        border-radius: var(--border-radius-md, 12px);
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

      .detail-row:last-child {
        border-bottom: none;
      }
      .detail-label {
        color: var(--secondary-text-color);
      }

      .detail-fill-bar-wrap {
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: var(--border-radius-xs, 4px);
        margin-top: 8px;
        overflow: hidden;
      }

      /* Edit form */
      .form {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .form-row {
        display: flex;
        gap: 12px;
      }

      .form-row > * {
        flex: 1;
      }

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
        border-radius: var(--border-radius-sm, 8px);
        color: var(--primary-text-color);
        font-size: 0.875rem;
        font-family: inherit;
        outline: none;
        transition: border-color 0.15s;
      }

      .form-input:focus {
        border-color: var(--primary-color, #4caf50);
      }

      .form-select {
        width: 100%;
        box-sizing: border-box;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: var(--border-radius-sm, 8px);
        color: var(--primary-text-color);
        font-size: 0.875rem;
        font-family: inherit;
      }

      .form-select option {
        background-color: var(--card-background-color, #1e1e1e);
        color: var(--primary-text-color, #ffffff);
      }

      .form-footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 4px;
      }

      .btn {
        padding: 8px 16px;
        border-radius: var(--border-radius-sm, 8px);
        border: none;
        cursor: pointer;
        font-size: 0.875rem;
        font-family: inherit;
        transition: background 0.15s;
      }

      .btn:disabled {
        opacity: 0.5;
        cursor: default;
      }

      .btn-text {
        background: transparent;
        color: var(--secondary-text-color);
      }

      .btn-text:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.06);
      }

      .btn-primary {
        background: var(--primary-color, #4caf50);
        color: var(--on-primary);
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .btn-primary:hover:not(:disabled) {
        filter: brightness(1.1);
      }

      /* Confirm-delete overlay */
      .confirm-box {
        background: rgba(244, 67, 54, 0.1);
        border: 1px solid rgba(244, 67, 54, 0.3);
        border-radius: var(--border-radius-md, 12px);
        padding: 20px;
        text-align: center;
      }

      .confirm-box p {
        margin: 0 0 16px;
        font-size: 0.9rem;
      }

      .confirm-box .confirm-name {
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
        color: var(--on-error);
      }

      .btn-danger:hover {
        filter: brightness(1.1);
      }

      /* Error banner */
      .error-banner {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(244, 67, 54, 0.1);
        border-radius: var(--border-radius-sm, 8px);
        padding: 10px 14px;
        margin-bottom: 12px;
        font-size: 0.875rem;
        color: var(--error-color, #f44336);
      }
    `,
  ];

  private _dispatch(event: SMEvent): void {
    this.dispatchEvent(
      new CustomEvent('sm-event', { detail: event, bubbles: true, composed: true })
    );
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
      const stock = this.inventory?.stocks[selectedId] ?? null;
      return stock ? this._renderDetail(stock) : nothing;
    }

    return this._renderList();
  }

  // ─── Master list ────────────────────────────────────────────────────────────

  private _renderList() {
    const stocks = this.inventory ? Object.values(this.inventory.stocks) : [];

    return html`
      <button
        class="add-btn"
        data-action="add"
        @click=${() => this._dispatch({ type: 'NewItemRequested' })}
      >
        <ha-svg-icon
          .path=${mdiPlus}
          style="width:18px;height:18px;fill:currentColor"
        ></ha-svg-icon>
        Add Nutrient
      </button>

      ${stocks.length === 0
        ? html`<div class="empty-state">No nutrient stock items tracked.</div>`
        : html` <div class="list">${stocks.map((s) => this._renderListItem(s))}</div> `}
    `;
  }

  private _renderListItem(stock: NutrientStock) {
    const pct = fillPercent(stock);
    const color = stockColor(stock.type as NutrientStockType);
    const icon = stockIcon(stock.type as NutrientStockType);

    return html`
      <div
        class="list-item"
        data-stock-id=${stock.nutrient_id}
        @click=${() => this._dispatch({ type: 'ItemSelected', id: stock.nutrient_id })}
      >
        <div class="type-icon" style="--stock-c:${color}">
          <ha-svg-icon .path=${icon} style="width:20px;height:20px;fill:currentColor"></ha-svg-icon>
        </div>
        <div class="item-body">
          <div class="item-name">${stock.name}</div>
          <div class="item-meta">
            ${stock.current_ml.toFixed(0)} / ${stock.initial_ml.toFixed(0)} ml
          </div>
          <div class="fill-bar-wrap">
            <div class="fill-bar ${fillClass(pct)}" style="transform:scaleX(${pct / 100})"></div>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Detail view ────────────────────────────────────────────────────────────

  private _renderDetail(stock: NutrientStock) {
    const pct = fillPercent(stock);
    const color = stockColor(stock.type as NutrientStockType);

    return html`
      <div class="detail-header">
        <button
          class="back-btn"
          data-action="back"
          @click=${() => this._dispatch({ type: 'BackToList' })}
        >
          <ha-svg-icon
            .path=${mdiArrowLeft}
            style="width:20px;height:20px;fill:currentColor"
          ></ha-svg-icon>
        </button>
        <h3 class="detail-title">${stock.name}</h3>
        <div class="detail-actions">
          <button
            class="icon-btn"
            data-action="edit"
            @click=${() => this._dispatch({ type: 'EditStarted', draft: draftFromStock(stock) })}
          >
            <ha-svg-icon
              .path=${mdiPencil}
              style="width:18px;height:18px;fill:currentColor"
            ></ha-svg-icon>
          </button>
          <button
            class="icon-btn danger"
            data-action="delete"
            @click=${() =>
              this._dispatch({ type: 'DeleteRequested', id: stock.nutrient_id, name: stock.name })}
          >
            <ha-svg-icon
              .path=${mdiDelete}
              style="width:18px;height:18px;fill:currentColor"
            ></ha-svg-icon>
          </button>
        </div>
      </div>

      <div class="detail-section">
        <p class="detail-section-title">Container</p>
        <div class="detail-row">
          <span class="detail-label">Current</span>
          <span>${stock.current_ml.toFixed(0)} ml</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Capacity</span>
          <span>${stock.initial_ml.toFixed(0)} ml</span>
        </div>
        <div class="detail-fill-bar-wrap" data-fill-bar>
          <div
            class="fill-bar ${fillClass(pct)}"
            style="transform:scaleX(${pct / 100});background:${color}"
          ></div>
        </div>
      </div>

      <div class="detail-section">
        <p class="detail-section-title">Identity</p>
        <div class="detail-row">
          <span class="detail-label">Brand</span>
          <span>${stock.brand || '—'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Type</span>
          <span style="color:${color}">${stock.type}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">NPK</span>
          <span>${stock.npk || '—'}</span>
        </div>
      </div>

      ${stock.dose_ml_l > 0
        ? html`
            <div class="detail-section">
              <p class="detail-section-title">Composition</p>
              <div class="detail-row">
                <span class="detail-label">Default dose</span>
                <span>${stock.dose_ml_l} ml/L</span>
              </div>
            </div>
          `
        : nothing}
      ${stock.notes
        ? html`
            <div class="detail-section">
              <p class="detail-section-title">Notes</p>
              <p style="margin:0;font-size:0.875rem">${stock.notes}</p>
            </div>
          `
        : nothing}
    `;
  }

  // ─── Edit form ──────────────────────────────────────────────────────────────

  private _renderEditForm(sub: { kind: 'editing' | 'applying'; draft: NutrientStockDraft }) {
    const { draft } = sub;
    const applying = sub.kind === 'applying';

    return html`
      <div class="form" data-form="stock">
        <div>
          <label class="form-label">Name *</label>
          <input
            class="form-input"
            type="text"
            .value=${draft.name}
            @input=${(e: Event) =>
              this._dispatch({
                type: 'StockDraftChanged',
                field: 'name',
                value: (e.target as HTMLInputElement).value,
              })}
          />
        </div>

        <div>
          <label class="form-label">Brand</label>
          <input
            class="form-input"
            type="text"
            .value=${draft.brand}
            @input=${(e: Event) =>
              this._dispatch({
                type: 'StockDraftChanged',
                field: 'brand',
                value: (e.target as HTMLInputElement).value,
              })}
          />
        </div>

        <div>
          <label class="form-label">Type</label>
          <select
            class="form-select"
            .value=${draft.stockType}
            @change=${(e: Event) =>
              this._dispatch({
                type: 'StockDraftChanged',
                field: 'stockType',
                value: (e.target as HTMLSelectElement).value,
              })}
          >
            <option value="base">Base</option>
            <option value="bloom">Bloom</option>
            <option value="calmag">Cal-Mag</option>
            <option value="root">Root</option>
            <option value="additive">Additive</option>
            <option value="microbe">Microbe</option>
          </select>
        </div>

        <div class="form-row">
          <div>
            <label class="form-label">Current (ml)</label>
            <input
              class="form-input"
              type="number"
              min="0"
              .value=${String(draft.current_ml)}
              @input=${(e: Event) =>
                this._dispatch({
                  type: 'StockDraftChanged',
                  field: 'current_ml',
                  value: parseFloat((e.target as HTMLInputElement).value) || 0,
                })}
            />
          </div>
          <div>
            <label class="form-label">Capacity (ml)</label>
            <input
              class="form-input"
              type="number"
              min="0"
              .value=${String(draft.initial_ml)}
              @input=${(e: Event) =>
                this._dispatch({
                  type: 'StockDraftChanged',
                  field: 'initial_ml',
                  value: parseFloat((e.target as HTMLInputElement).value) || 0,
                })}
            />
          </div>
        </div>

        <div class="form-row">
          <div>
            <label class="form-label">NPK</label>
            <input
              class="form-input"
              type="text"
              .value=${draft.npk}
              @input=${(e: Event) =>
                this._dispatch({
                  type: 'StockDraftChanged',
                  field: 'npk',
                  value: (e.target as HTMLInputElement).value,
                })}
            />
          </div>
          <div>
            <label class="form-label">Default dose (ml/L)</label>
            <input
              class="form-input"
              type="number"
              min="0"
              step="0.1"
              .value=${String(draft.dose_ml_l)}
              @input=${(e: Event) =>
                this._dispatch({
                  type: 'StockDraftChanged',
                  field: 'dose_ml_l',
                  value: parseFloat((e.target as HTMLInputElement).value) || 0,
                })}
            />
          </div>
        </div>

        <div>
          <label class="form-label">Notes</label>
          <input
            class="form-input"
            type="text"
            .value=${draft.notes}
            @input=${(e: Event) =>
              this._dispatch({
                type: 'StockDraftChanged',
                field: 'notes',
                value: (e.target as HTMLInputElement).value,
              })}
          />
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
            <ha-svg-icon
              .path=${mdiCheck}
              style="width:16px;height:16px;fill:currentColor"
            ></ha-svg-icon>
            ${applying ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    `;
  }

  // ─── Confirm delete ─────────────────────────────────────────────────────────

  private _renderConfirmDelete(id: string, name: string) {
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

  private _renderError(sub: { kind: 'error'; draft: NutrientStockDraft; message: string }) {
    return html`
      <div class="error-banner">
        <ha-svg-icon
          .path=${mdiAlertCircle}
          style="width:18px;height:18px;fill:currentColor"
        ></ha-svg-icon>
        ${sub.message}
      </div>
      ${this._renderEditForm({ kind: 'editing', draft: sub.draft })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-nutrient-inventory-dialog-ui': GrowspaceNutrientInventoryDialogUI;
  }
}
