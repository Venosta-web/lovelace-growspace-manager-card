import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  mdiBottleTonicPlus,
  mdiClose,
  mdiPlus,
  mdiDelete,
  mdiCheck,
  mdiAlertCircle,
} from '@mdi/js';
import { NutrientInventory, NutrientStock } from '../../../types';
import { dialogStyles } from '../../../styles/dialog.styles';
import '../../shared/ui'; // Ensure MD3 components are registered

@customElement('growspace-nutrient-inventory-dialog-ui')
export class GrowspaceNutrientInventoryDialogUI extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ type: Boolean }) embedded = false;
  @property({ attribute: false }) inventory: NutrientInventory | null = null;
  @property({ type: Boolean }) isLoading = false;
  @property({ type: String }) error: string | null = null;
  @property({ type: Boolean }) isSaving = false;

  @state() private _editingId: string | null = null;
  @state() private _editName = '';
  @state() private _editCurrent = 0;
  @state() private _editInitial = 0;
  @state() private _isAdding = false;

  static styles = [
    dialogStyles,
    css`
      .inventory-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 16px;
      }
      .stock-item {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 16px;
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 12px;
        align-items: center;
      }
      .stock-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .stock-name {
        font-weight: 500;
        font-size: 1rem;
      }
      .stock-meta {
        font-size: 0.85rem;
        color: var(--secondary-text-color);
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .stock-actions {
        display: flex;
        gap: 8px;
      }
      .edit-form {
        grid-column: 1 / -1;
        background: rgba(0, 0, 0, 0.2);
        padding: 16px;
        border-radius: 8px;
        margin-top: 8px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .form-row {
        display: flex;
        gap: 12px;
      }
      .add-button {
        margin-bottom: 16px;
        width: 100%;
      }
      .progress-bar {
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        overflow: hidden;
        margin-top: 8px;
        width: 100%;
      }
      .progress-fill {
        height: 100%;
        background: var(--primary-color, #4caf50);
        transition: width 0.3s ease;
      }
      .progress-fill.warning {
        background: #ff9800;
      }
      .progress-fill.danger {
        background: #f44336;
      }
      .error-banner {
        background: rgba(211, 47, 47, 0.2);
        color: var(--error-color, #f44336);
        padding: 12px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }
    `,
  ];

  private _close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private _startEdit(stock: NutrientStock) {
    this._editingId = stock.nutrient_id;
    this._editName = stock.name;
    this._editCurrent = stock.current_ml;
    this._editInitial = stock.initial_ml;
    this._isAdding = false;
  }

  private _startAdd() {
    this._editingId = null;
    this._editName = '';
    this._editCurrent = 1000;
    this._editInitial = 1000;
    this._isAdding = true;
  }

  private _cancelEdit() {
    this._editingId = null;
    this._isAdding = false;
  }

  private _handleSave() {
    if (!this._editName.trim()) return;
    this.dispatchEvent(
      new CustomEvent('update-stock', {
        detail: {
          id: this._editingId || this._editName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          name: this._editName,
          current: this._editCurrent,
          initial: this._editInitial,
        },
      })
    );
    this._cancelEdit();
  }

  private _handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this nutrient stock?')) return;
    this.dispatchEvent(new CustomEvent('remove-stock', { detail: { id } }));
  }

  render() {
    if (!this.open && !this.embedded) return nothing;

    const content = html`
      <div
        class="glass-dialog-container"
        style="${this.embedded ? 'background: none; border: none; padding: 0;' : ''}"
      >
        ${!this.embedded
          ? html`
              <div class="dialog-header">
                <div class="dialog-icon">
                  <ha-svg-icon .path=${mdiBottleTonicPlus}></ha-svg-icon>
                </div>
                <div class="dialog-title-group">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <h2 class="dialog-title">Nutrient Inventory</h2>
                    <gs-help-tooltip
                      content=\"Track your nutrient bottles — name, brand, and current stock levels. Used to calculate feeds and trigger low-stock alerts.\"
                      placement=\"bottom\"
                      label=\"Nutrient Inventory\"
                    ></gs-help-tooltip>
                  </div>
                  <div class="dialog-subtitle">Manage stock levels</div>
                </div>
                <button class="md3-button text" @click=${this._close}>
                  <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
                </button>
              </div>
            `
          : nothing}

        <div class="dialog-content-grid" style="${this.embedded ? 'padding: 0;' : ''}">
          ${this.isLoading
            ? html`<ha-circular-progress active></ha-circular-progress>`
            : this.error
            ? html`<div class=\"error-banner\">
                <ha-svg-icon .path=${mdiAlertCircle}></ha-svg-icon>
                ${this.error}
              </div>`
            : this._renderContent()}
        </div>
      </div>
    `;

    if (this.embedded) {
      return content;
    }

    return html`
      <ha-dialog open @closed=${this._close} hideActions without-header width="full"> ${content} </ha-dialog>
    `;
  }

  private _renderContent() {
    const stocks = this.inventory ? Object.values(this.inventory.stocks) : [];

    return html`
      ${!this._isAdding
        ? html`
            <button class="md3-button tonal add-button" @click=${this._startAdd}>
              <ha-svg-icon .path=${mdiPlus} style="margin-right:8px"></ha-svg-icon>
              Add Nutrient
            </button>
          `
        : this._renderEditForm()}

      <div class="inventory-list">
        ${stocks.length === 0 && !this._isAdding
          ? html`<p style="text-align:center; opacity:0.6">No nutrient stock items tracked.</p>`
          : stocks.map((stock) => this._renderStockItem(stock))}
      </div>
    `;
  }

  private _renderStockItem(stock: NutrientStock) {
    const isEditing = this._editingId === stock.nutrient_id;
    if (isEditing) return this._renderEditForm();

    const percent = Math.max(0, Math.min(100, (stock.current_ml / stock.initial_ml) * 100));
    let statusClass = '';
    if (percent <= 20) statusClass = 'danger';
    else if (percent <= 40) statusClass = 'warning';

    return html`
      <div class="stock-item">
        <div class="stock-info">
          <div class="stock-name">${stock.name}</div>
          <div class="stock-meta">
            ${stock.current_ml.toFixed(0)} / ${stock.initial_ml.toFixed(0)} ml
            (${percent.toFixed(0)}%)
          </div>
          <div class="progress-bar">
            <div class="progress-fill ${statusClass}" style="width: ${percent}%"></div>
          </div>
        </div>

        <div class="stock-actions">
          <button class="md3-button text" @click=${() => this._startEdit(stock)}>Edit</button>
          <button
            class="md3-button icon"
            style="color: var(--error-color, #F44336)"
            @click=${() => this._handleDelete(stock.nutrient_id)}
          >
            <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
          </button>
        </div>
      </div>
    `;
  }

  private _renderEditForm() {
    return html`
      <div class="stock-item" style="border-color: var(--primary-color);">
        <div class="edit-form">
          <h3 style="margin:0 0 12px 0;">${this._isAdding ? 'Add Nutrient' : 'Edit Nutrient'}</h3>

          <md3-text-input
            label="Name"
            .value=${this._editName}
            @change=${(e: CustomEvent) => (this._editName = e.detail)}
          ></md3-text-input>

          <div class="form-row">
            <md3-number-input
              label="Current (ml)"
              .value=${this._editCurrent}
              @change=${(e: CustomEvent) => (this._editCurrent = parseFloat(e.detail))}
            ></md3-number-input>

            <md3-number-input
              label="Total Capacity (ml)"
              .value=${this._editInitial}
              @change=${(e: CustomEvent) => (this._editInitial = parseFloat(e.detail))}
            ></md3-number-input>
          </div>

          <div class="form-row" style="justify-content: flex-end; margin-top: 8px;">
            <button class="md3-button text" @click=${this._cancelEdit}>Cancel</button>
            <button class="md3-button primary" @click=${this._handleSave} ?disabled=${this.isSaving}>
              <ha-svg-icon .path=${mdiCheck} style="margin-right:8px"></ha-svg-icon>
              ${this.isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}
