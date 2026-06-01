import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StoreController } from '@nanostores/lit';
import {
  mdiBottleTonicPlus,
  mdiClose,
  mdiClipboardList,
  mdiFormatListBulleted,
  mdiAlertCircle,
} from '@mdi/js';
import {
  nutrientInventory$,
  nutrientPresets$,
  fetchNutrientInventory,
  fetchNutrientPresets,
  updateNutrientStock,
  removeNutrientStock,
  saveNutrientPreset,
  removeNutrientPreset,
} from '../slices/nutrient';
import {
  createInitialSM,
  transition,
  isLowStock,
  type SM,
  type SMEvent,
  type NutrientStockDraft,
  type NutrientPresetDraft,
} from './nutrient-dialog-sm';
import '../features/ui/components/growspace-nutrient-inventory-dialog-ui';
import '../features/ui/components/growspace-nutrient-presets-editor-ui';

@customElement('nutrient-dialog')
export class NutrientDialog extends LitElement {
  @property({ type: Boolean }) open = false;

  @state() private _sm: SM = createInitialSM();

  private _inventory = new StoreController(this, nutrientInventory$);
  private _presets = new StoreController(this, nutrientPresets$);

  static styles = css`
    :host { display: contents; }

    ha-dialog {
      --dialog-surface-margin-top: 40px;
      --ha-dialog-min-height: var(--ha-dialog-min-height, 85vh);
      --dialog-content-padding: 0;
    }

    .shell {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-height: 85vh;
      max-height: 85vh;
      overflow: hidden;
      color: var(--primary-text-color, #fff);
      font-family: 'Roboto', sans-serif;
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      padding: 16px 24px;
      gap: 12px;
      border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.2));
      flex-shrink: 0;
    }

    .header-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--primary-color, #4caf50);
    }

    .header-title-group { flex: 1; }

    .header-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 500;
    }

    .header-subtitle {
      font-size: 0.85rem;
      opacity: 0.7;
      margin-top: 2px;
      color: var(--secondary-text-color);
    }

    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--primary-text-color, #fff);
      padding: 8px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
    }

    .close-btn:hover { background: rgba(255, 255, 255, 0.08); }

    /* Body */
    .body {
      display: flex;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    /* Nav rail */
    .nav-rail {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px 8px;
      border-right: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.1));
      width: 72px;
      align-items: center;
      flex-shrink: 0;
    }

    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px 6px;
      border-radius: 12px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
      font-size: 0.6875rem;
      font-family: inherit;
      width: 56px;
      position: relative;
      transition: background 0.15s, color 0.15s;
    }

    .nav-item:hover { background: rgba(255, 255, 255, 0.06); }

    .nav-item[aria-pressed='true'] {
      color: var(--primary-color, #4caf50);
      background: rgba(76, 175, 80, 0.12);
    }

    .nav-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      min-width: 16px;
      height: 16px;
      border-radius: 8px;
      background: var(--primary-color, #4caf50);
      color: #fff;
      font-size: 0.6rem;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 3px;
      font-weight: 600;
    }

    .nav-item[aria-pressed='false'] .nav-badge {
      background: var(--secondary-text-color, rgba(255,255,255,0.4));
    }

    .nav-rail-bottom {
      margin-top: auto;
      padding-top: 8px;
      border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
      width: 100%;
      display: flex;
      justify-content: center;
    }

    .low-stock-indicator {
      color: #ff9800;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px;
    }

    /* Content */
    .content {
      flex: 1;
      overflow-y: auto;
      padding: 20px 24px;
      min-height: 0;
    }

    /* Confirm-discard overlay */
    .confirm-discard-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .confirm-discard-box {
      background: var(--card-background-color, #1c1c1c);
      border-radius: 16px;
      padding: 24px;
      max-width: 360px;
      width: 100%;
      margin: 16px;
    }

    .confirm-discard-box h3 { margin: 0 0 8px; font-size: 1rem; }
    .confirm-discard-box p { margin: 0 0 20px; font-size: 0.875rem; color: var(--secondary-text-color); }

    .confirm-discard-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .btn {
      padding: 8px 16px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-size: 0.875rem;
      font-family: inherit;
    }

    .btn-text { background: transparent; color: var(--secondary-text-color); }
    .btn-text:hover { background: rgba(255,255,255,0.06); }

    .btn-danger { background: var(--error-color, #f44336); color: #fff; }
    .btn-danger:hover { filter: brightness(1.1); }

    /* Toast */
    .toast {
      position: absolute;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.85);
      color: #fff;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.875rem;
      pointer-events: none;
      z-index: 20;
    }
  `;

  protected updated(changed: PropertyValues) {
    super.updated(changed);
    if (changed.has('open') && this.open) {
      void fetchNutrientInventory();
      void fetchNutrientPresets();
    }
    if (changed.has('_sm')) {
      this._triggerAsyncIfNeeded(changed.get('_sm') as SM | undefined);
    }
  }

  private _applyEvent(event: SMEvent) {
    this._sm = transition(this._sm, event);
  }

  private _handleSmEvent(e: Event) {
    this._applyEvent((e as CustomEvent<SMEvent>).detail);
  }

  private _triggerAsyncIfNeeded(prev: SM | undefined) {
    const tab = this._sm.activeTab;
    const sub = this._sm.tabs[tab].sub;
    const prevSub = prev?.tabs[tab].sub;

    if (sub.kind === prevSub?.kind) return;

    if (sub.kind === 'applying') {
      if (tab === 'inventory') {
        this._runInventoryApply(sub.draft as NutrientStockDraft, prev?.tabs.inventory.sub);
      } else {
        this._runPresetsApply(sub.draft as NutrientPresetDraft, prev?.tabs.presets.sub);
      }
    }
  }

  private async _runInventoryApply(draft: NutrientStockDraft, prevSub: SM['tabs']['inventory']['sub'] | undefined) {
    const selectedId = this._sm.tabs.inventory.selectedId;
    try {
      if (prevSub?.kind === 'confirm-delete') {
        await removeNutrientStock(prevSub.id);
        this._applyEvent({ type: 'DeleteResolved' });
      } else {
        await updateNutrientStock(
          selectedId ?? `nutrient_${Date.now()}`,
          draft.name,
          draft.current_ml,
          draft.initial_ml,
          draft.brand,
          draft.stockType,
          draft.npk,
          draft.dose_ml_l,
          draft.notes
        );
        this._applyEvent({ type: 'SaveResolved' });
        await fetchNutrientInventory();
      }
    } catch (err) {
      this._applyEvent({ type: 'SaveFailed', message: String(err) });
    }
  }

  private async _runPresetsApply(draft: NutrientPresetDraft, prevSub: SM['tabs']['presets']['sub'] | undefined) {
    const selectedId = this._sm.tabs.presets.selectedId;
    try {
      if (prevSub?.kind === 'confirm-delete') {
        await removeNutrientPreset(prevSub.id);
        this._applyEvent({ type: 'DeleteResolved' });
      } else {
        await saveNutrientPreset({
          preset_id: selectedId ?? undefined,
          name: draft.name,
          nutrients: draft.nutrients,
          stage: draft.stage,
          week: draft.week,
          ec_target: draft.ec_target,
          ph_target: draft.ph_target,
        });
        this._applyEvent({ type: 'SaveResolved' });
        await fetchNutrientPresets();
      }
    } catch (err) {
      this._applyEvent({ type: 'SaveFailed', message: String(err) });
    }
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  render() {
    if (!this.open) return nothing;

    const { _sm } = this;
    const inventory = this._inventory.value;
    const presets = this._presets.value;

    const inventoryCount = inventory ? Object.keys(inventory.stocks).length : 0;
    const presetsCount = presets ? Object.keys(presets).length : 0;
    const hasLowStock = inventory
      ? Object.values(inventory.stocks).some((s) => isLowStock(s))
      : false;

    return html`
      <ha-dialog
        open
        hideActions
        without-header
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
        width="large"
        @closed=${this._close}
      >
        <div class="shell">
          ${this._renderHeader()}
          <div class="body">
            ${this._renderNavRail(_sm, inventoryCount, presetsCount, hasLowStock)}
            <div
              class="content"
              data-content
              @sm-event=${this._handleSmEvent}
            >
              ${this._renderContent(_sm, inventory, presets)}
            </div>
          </div>
          ${_sm.status.kind === 'confirm-discard' ? this._renderConfirmDiscard() : nothing}
          ${_sm.toast ? html`<div class="toast">${_sm.toast}</div>` : nothing}
        </div>
      </ha-dialog>
    `;
  }

  private _renderHeader() {
    return html`
      <div class="header">
        <div class="header-icon">
          <ha-svg-icon .path=${mdiBottleTonicPlus} style="width:24px;height:24px;fill:currentColor"></ha-svg-icon>
        </div>
        <div class="header-title-group">
          <h2 class="header-title">Nutrients</h2>
          <div class="header-subtitle">Manage inventory and recipes</div>
        </div>
        <button class="close-btn" @click=${this._close} aria-label="Close">
          <ha-svg-icon .path=${mdiClose} style="width:24px;height:24px;fill:currentColor"></ha-svg-icon>
        </button>
      </div>
    `;
  }

  private _renderNavRail(sm: SM, inventoryCount: number, presetsCount: number, hasLowStock: boolean) {
    return html`
      <nav class="nav-rail">
        <button
          class="nav-item"
          data-nav="inventory"
          aria-pressed=${sm.activeTab === 'inventory' ? 'true' : 'false'}
          @click=${() => this._applyEvent({ type: 'TabSelected', tab: 'inventory' })}
        >
          <ha-svg-icon .path=${mdiClipboardList} style="width:22px;height:22px;fill:currentColor"></ha-svg-icon>
          <span>Inventory</span>
          ${inventoryCount > 0
            ? html`<span class="nav-badge" data-badge="inventory">${inventoryCount}</span>`
            : nothing}
        </button>

        <button
          class="nav-item"
          data-nav="presets"
          aria-pressed=${sm.activeTab === 'presets' ? 'true' : 'false'}
          @click=${() => this._applyEvent({ type: 'TabSelected', tab: 'presets' })}
        >
          <ha-svg-icon .path=${mdiFormatListBulleted} style="width:22px;height:22px;fill:currentColor"></ha-svg-icon>
          <span>Presets</span>
          ${presetsCount > 0
            ? html`<span class="nav-badge" data-badge="presets">${presetsCount}</span>`
            : nothing}
        </button>

        ${hasLowStock
          ? html`
              <div class="nav-rail-bottom">
                <div class="low-stock-indicator" data-low-stock title="One or more nutrients are running low">
                  <ha-svg-icon .path=${mdiAlertCircle} style="width:18px;height:18px;fill:currentColor"></ha-svg-icon>
                </div>
              </div>
            `
          : nothing}
      </nav>
    `;
  }

  private _renderContent(
    sm: SM,
    inventory: ReturnType<typeof nutrientInventory$.get>,
    presets: ReturnType<typeof nutrientPresets$.get>
  ) {
    if (sm.activeTab === 'inventory') {
      return html`
        <growspace-nutrient-inventory-dialog-ui
          .inventory=${inventory}
          .selectedId=${sm.tabs.inventory.selectedId}
          .sub=${sm.tabs.inventory.sub}
        ></growspace-nutrient-inventory-dialog-ui>
      `;
    }

    return html`
      <growspace-nutrient-presets-editor-ui
        .presets=${presets}
        .inventory=${inventory}
        .selectedId=${sm.tabs.presets.selectedId}
        .sub=${sm.tabs.presets.sub}
      ></growspace-nutrient-presets-editor-ui>
    `;
  }

  private _renderConfirmDiscard() {
    return html`
      <div class="confirm-discard-overlay">
        <div class="confirm-discard-box">
          <h3>Discard changes?</h3>
          <p>You have unsaved changes. If you switch sections now, your edits will be lost.</p>
          <div class="confirm-discard-actions">
            <button
              class="btn btn-text"
              @click=${() => this._applyEvent({ type: 'DiscardCancelled' })}
            >
              Keep editing
            </button>
            <button
              class="btn btn-danger"
              @click=${() => this._applyEvent({ type: 'DiscardConfirmed' })}
            >
              Discard
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nutrient-dialog': NutrientDialog;
  }
}
