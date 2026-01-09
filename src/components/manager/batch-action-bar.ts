import { LitElement, html, css, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { StoreController } from '@nanostores/lit';
import { mdiWater, mdiSprout, mdiClose } from '@mdi/js';
import { storeContext } from '../../context';
import type { GrowspaceStore } from '../../store/growspace-store';
import { sharedStyles } from '../../styles/shared.styles';

@customElement('batch-action-bar')
export class BatchActionBar extends LitElement {
  @consume({ context: storeContext })
  private accessor store!: GrowspaceStore;

  private _selectedPlantsController!: StoreController<Set<string>>;

  connectedCallback() {
    super.connectedCallback();
    if (this.store) {
      this._selectedPlantsController = new StoreController(this, this.store.ui.$selectedPlants);
    }
  }

  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        position: absolute;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(150%);
        z-index: 100;
        transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
        width: auto;
        max-width: 90%;
      }

      :host([visible]) {
        transform: translateX(-50%) translateY(0);
      }

      .batch-bar {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px 24px;
        border-radius: 32px;
        background: rgba(30, 30, 30, 0.95);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      }

      .count-badge {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
        padding: 4px 12px;
        border-radius: 16px;
        font-weight: 600;
        font-size: 0.9rem;
      }

      .actions {
        display: flex;
        gap: 8px;
        border-left: 1px solid rgba(255, 255, 255, 0.1);
        padding-left: 16px;
      }

      .action-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(255, 255, 255, 0.05);
        border: none;
        padding: 8px 16px;
        border-radius: 20px;
        color: var(--primary-text-color);
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: inherit;
        font-size: 0.9rem;
        font-weight: 500;
      }

      .action-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-1px);
      }

      .action-btn svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }
      
      .action-btn.primary {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
      }

      .action-btn.primary:hover {
        filter: brightness(1.1);
        background: var(--primary-color);
      }

      .close-btn {
        background: transparent;
        border: none;
        color: var(--secondary-text-color);
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        margin-left: 8px;
      }

      .close-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--primary-text-color);
      }
    `
  ];

  private _handleWater() {
    this.store.openBatchWateringDialog();
  }

  private _handleStage() {
    this.store.openBatchTrainingDialog();
  }

  private _handleClear() {
    this.store.clearPlantSelection();
    this.store.ui.setEditMode(false);
  }

  render() {
    const selectedCount = this._selectedPlantsController?.value.size || 0;

    // Toggle host attribute for CSS transition
    if (selectedCount > 0) {
      this.setAttribute('visible', '');
    } else {
      this.removeAttribute('visible');
    }

    if (selectedCount === 0) return nothing;

    return html`
      <div class="batch-bar">
        <div class="count-badge">${selectedCount} Selected</div>
        
        <div class="actions">
          <button class="action-btn primary" @click=${this._handleWater}>
            <svg viewBox="0 0 24 24"><path d="${mdiWater}"></path></svg>
            Water
          </button>
          
          <button class="action-btn" @click=${this._handleStage}>
            <svg viewBox="0 0 24 24"><path d="${mdiSprout}"></path></svg>
            Log Training
          </button>
        </div>

        <button class="close-btn" @click=${this._handleClear} title="Clear Selection">
          <svg style="width:20px;height:20px" viewBox="0 0 24 24">
            <path d="${mdiClose}"></path>
          </svg>
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'batch-action-bar': BatchActionBar;
  }
}
