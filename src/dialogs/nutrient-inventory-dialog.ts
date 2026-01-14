import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { consume } from '@lit/context';
import { hassContext } from '../context';
import { mdiBottleTonicPlus, mdiClose, mdiPlus, mdiDelete, mdiCheck, mdiAlertCircle } from '@mdi/js';
import { DataService } from '../data-service';
import { dialogStyles } from '../styles/dialog.styles';
import { NutrientInventory, NutrientStock } from '../types';
import '../components/ui/md3-text-input';
import '../components/ui/md3-number-input';

@customElement('nutrient-inventory-dialog')
export class NutrientInventoryDialog extends LitElement {
    @consume({ context: hassContext, subscribe: true })
    public hass!: HomeAssistant;

    @property({ type: Boolean }) public open = false;
    @property({ type: Boolean }) public embedded = false;

    @state() private _inventory: NutrientInventory | null = null;
    @state() private _isLoading = true;
    @state() private _error: string | null = null;

    // For adding/editing
    @state() private _editingId: string | null = null;
    @state() private _editName = '';
    @state() private _editCurrent = 0;
    @state() private _editInitial = 0;
    @state() private _isAdding = false;

    private _dataService?: DataService;

    static styles = [
        dialogStyles,
        css`
      :host {
        --mdc-dialog-min-width: clamp(400px, 600px, 90vw);
      }
      
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
        background: var(--primary-color, #4CAF50);
        transition: width 0.3s ease;
      }
      
      .progress-fill.warning {
        background: #FF9800;
      }
      
      .progress-fill.danger {
        background: #F44336;
      }
    `
    ];

    protected firstUpdated(): void {
        if (this.hass) {
            this._dataService = new DataService(this.hass);
            this._fetchInventory();
        }
    }

    private async _fetchInventory() {
        if (!this._dataService) return;
        this._isLoading = true;
        this._error = null;
        try {
            const result = await this._dataService.fetchNutrientInventory();
            if (result) {
                this._inventory = result;
            }
        } catch (e: any) {
            this._error = e.message || 'Failed to load inventory';
        } finally {
            this._isLoading = false;
        }
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

    private async _save() {
        if (!this._dataService) return;

        // Basic validation
        if (!this._editName.trim()) {
            alert('Name is required');
            return;
        }

        try {
            const id = this._editingId || this._editName.toLowerCase().replace(/[^a-z0-9]/g, '_');

            await this._dataService.updateNutrientStock(
                id,
                this._editName,
                this._editCurrent,
                this._editInitial
            );

            await this._fetchInventory(); // Refresh list
            this._notifyDataChanged();
            this._cancelEdit();
        } catch (e: any) {
            alert(`Error saving: ${e.message}`);
        }
    }

    private async _delete(id: string) {
        if (!confirm('Are you sure you want to delete this nutrient stock?')) return;
        if (!this._dataService) return;

        try {
            await this._dataService.removeNutrientStock(id);
            await this._fetchInventory();
            this._notifyDataChanged();
        } catch (e: any) {
            alert(`Error deleting: ${e.message}`);
        }
    }

    private _notifyDataChanged() {
        this.dispatchEvent(new CustomEvent('data-changed', { bubbles: true, composed: true }));
    }

    private _close() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    protected render() {
        if (!this.open && !this.embedded) return nothing;

        const content = html`
          <div class="glass-dialog-container" style="${this.embedded ? 'background: none; border: none; padding: 0;' : ''}">
            ${!this.embedded ? html`
            <div class="dialog-header">
              <div class="dialog-icon">
                <svg style="width:32px;height:32px;fill:currentColor;" viewBox="0 0 24 24">
                  <path d="${mdiBottleTonicPlus}"></path>
                </svg>
              </div>
              <div class="dialog-title-group">
                <h2 class="dialog-title">Nutrient Inventory</h2>
                <div class="dialog-subtitle">Manage stock levels</div>
              </div>
              <button class="md3-button text" @click=${this._close}>
                <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                  <path d="${mdiClose}"></path>
                </svg>
              </button>
            </div>
            ` : nothing}

            <div class="dialog-body" style="${this.embedded ? 'padding: 0;' : ''}">
              ${this._isLoading
                ? html`<p>Loading...</p>`
                : this._error
                    ? html`<div class="error-banner">
                      <svg viewBox="0 0 24 24"><path d="${mdiAlertCircle}"></path></svg>
                      ${this._error}
                    </div>`
                    : this._renderContent()}
            </div>
          </div>
        `;

        if (this.embedded) {
            return content;
        }

        return html`
      <ha-dialog
        open
        @closed=${this._close}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${''}
      >
        ${content}
      </ha-dialog>
    `;
    }

    private _renderContent() {
        const stocks = this._inventory ? Object.values(this._inventory.stocks) : [];

        return html`
      ${!this._isAdding
                ? html`
            <button class="md3-button tonal add-button" @click=${this._startAdd}>
              <svg style="width:18px;height:18px;fill:currentColor;margin-right:8px" viewBox="0 0 24 24">
                <path d="${mdiPlus}"></path>
              </svg>
              Add Nutrient
            </button>
          `
                : this._renderEditForm()}

      <div class="inventory-list">
        ${stocks.length === 0 && !this._isAdding
                ? html`<p style="text-align:center; opacity:0.6">No nutrient stock items tracked.</p>`
                : stocks.map(stock => this._renderStockItem(stock))}
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
            ${stock.current_ml.toFixed(0)} / ${stock.initial_ml.toFixed(0)} ml (${percent.toFixed(0)}%)
          </div>
          <div class="progress-bar">
            <div class="progress-fill ${statusClass}" style="width: ${percent}%"></div>
          </div>
        </div>
        
        <div class="stock-actions">
          <button class="md3-button text" @click=${() => this._startEdit(stock)}>
            Edit
          </button>
          <button class="md3-button text" style="color: #F44336" @click=${() => this._delete(stock.nutrient_id)}>
            <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiDelete}"></path>
            </svg>
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
            @change=${(e: CustomEvent) => this._editName = e.detail}
          ></md3-text-input>

          <div class="form-row">
            <md3-number-input
              label="Current (ml)"
              .value=${this._editCurrent}
              @change=${(e: CustomEvent) => this._editCurrent = parseFloat(e.detail)}
            ></md3-number-input>

            <md3-number-input
              label="Total Capacity (ml)"
              .value=${this._editInitial}
              @change=${(e: CustomEvent) => this._editInitial = parseFloat(e.detail)}
            ></md3-number-input>
          </div>

          <div class="form-row" style="justify-content: flex-end; margin-top: 8px;">
            <button class="md3-button text" @click=${this._cancelEdit}>Cancel</button>
            <button class="md3-button primary" @click=${this._save}>
              <svg style="width:18px;height:18px;fill:currentColor;margin-right:8px" viewBox="0 0 24 24">
                <path d="${mdiCheck}"></path>
              </svg>
              Save
            </button>
          </div>
        </div>
      </div>
    `;
    }
}
