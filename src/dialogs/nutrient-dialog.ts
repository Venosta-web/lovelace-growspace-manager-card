import { LitElement, html, css, nothing, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { consume } from '@lit/context';
import { StoreController } from '@nanostores/lit';
import { hassContext, storeContext } from '../context';
import { mdiBottleTonicPlus, mdiClose, mdiFormatListBulleted, mdiClipboardList } from '@mdi/js';
import { dialogStyles } from '../styles/dialog.styles';
import { GrowspaceStore } from '../store/core/growspace-store';
import '../features/ui/components/growspace-nutrient-inventory-dialog-ui';
import '../features/ui/containers/growspace-nutrient-presets-editor.container';
import '../components/ui/gs-help-tooltip';

type Tab = 'inventory' | 'presets';

@customElement('nutrient-dialog')
export class NutrientDialog extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  public hass!: HomeAssistant;

  @consume({ context: storeContext, subscribe: true })
  @property({ attribute: false })
  public store!: GrowspaceStore;

  @property({ type: Boolean }) public open = false;
  @state() private _activeTab: Tab = 'inventory';

  private _inventoryController!: StoreController<import('../types').NutrientInventory | null>;

  private _initControllers() {
    if (this.store && !this._inventoryController) {
      this._inventoryController = new StoreController(this, this.store.data.$nutrientInventory);
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._initControllers();
  }

  willUpdate(changedProps: PropertyValues) {
    if (changedProps.has('store')) {
      this._initControllers();
    }
  }

  static styles = [
    dialogStyles,
    css`
      :host {
        --ha-dialog-width-md: 95vw;
        --ha-dialog-max-width: 98vw;
        --ha-dialog-width-full: 98vw;
        --dialog-content-padding: 0;
      }

      .dialog-header {
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 16px;
        margin-bottom: 0 !important;
      }

      .tab-bar {
        display: flex;
        gap: 24px;
        padding: 0 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        margin-bottom: 24px;
      }

      .tab {
        padding: 16px 0;
        color: var(--secondary-text-color);
        cursor: pointer;
        position: relative;
        font-weight: 500;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .tab:hover {
        color: var(--primary-text-color);
      }

      .tab.active {
        color: var(--primary-color, #4caf50);
      }

      .tab.active::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        width: 100%;
        height: 2px;
        background: var(--primary-color, #4caf50);
        border-radius: 2px 2px 0 0;
      }

      .content-area {
        min-height: 400px;
        max-height: 70vh;
        overflow-y: auto;
        padding: 0 24px 24px;
      }

      /* Scrollbar styling */
      .content-area::-webkit-scrollbar {
        width: 8px;
      }
      .content-area::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.1);
      }
      .content-area::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 4px;
      }
    `,
  ];

  private _close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private _setTab(tab: Tab) {
    this._activeTab = tab;
  }

  protected render() {
    if (!this.open) return nothing;

    return html`
      <ha-dialog
        open
        @closed=${this._close}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
        width="full"
      >
        <div class="glass-dialog-container">
          <div class="dialog-header">
            <div class="dialog-icon">
              <svg style="width:32px;height:32px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiBottleTonicPlus}"></path>
              </svg>
            </div>
            <div class="dialog-title-group">
              <h2 class="dialog-title">Nutrients</h2>
              <div class="dialog-subtitle">Manage inventory and recipes</div>
            </div>
            <button class="md3-button text" @click=${this._close}>
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiClose}"></path>
              </svg>
            </button>
          </div>

          <div class="tab-bar">
            <div
              class="tab ${this._activeTab === 'inventory' ? 'active' : ''}"
              @click=${() => this._setTab('inventory')}
            >
              <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiClipboardList}"></path>
              </svg>
              Inventory
              <gs-help-tooltip
                content="Track your nutrient bottles — name, brand, and stock level. Add all nutrients you own so they appear in your feeding presets."
                placement="bottom"
                label="Inventory"
              ></gs-help-tooltip>
            </div>
            <div
              class="tab ${this._activeTab === 'presets' ? 'active' : ''}"
              @click=${() => this._setTab('presets')}
            >
              <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiFormatListBulleted}"></path>
              </svg>
              Presets
              <gs-help-tooltip
                content="Feeding recipes that define how much of each nutrient to add per litre. Create one preset per growth stage (e.g. 'Week 3 Veg', 'Week 5 Flower'). The watering dialog uses these to calculate your mix."
                placement="bottom"
                label="Presets"
              ></gs-help-tooltip>
            </div>
          </div>

          <div class="content-area">
            ${this._activeTab === 'inventory'
              ? html`<growspace-nutrient-inventory-dialog-ui
                  .open=${true}
                  .embedded=${true}
                  .inventory=${this._inventoryController?.value ?? null}
                  @update-stock=${(e: CustomEvent) => this.store.updateNutrientStock(e.detail.id, e.detail.name, e.detail.current_ml, e.detail.initial_ml)}
                  @add-stock=${(e: CustomEvent) => this.store.updateNutrientStock(e.detail.id || `nutrient_${Date.now()}`, e.detail.name, e.detail.current_ml, e.detail.initial_ml)}
                ></growspace-nutrient-inventory-dialog-ui>`
              : html`<growspace-nutrient-presets-editor
                  .open=${true}
                  .embedded=${true}
                ></growspace-nutrient-presets-editor>`}
          </div>
        </div>
      </ha-dialog>
    `;
  }
}
