import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  mdiWaterOutline,
  mdiBottleTonicPlus,
  mdiFormatListBulleted,
  mdiInformation,
} from '@mdi/js';
import {
  createInitialSM,
  transition,
  type SM,
  type SMEvent,
  type TabId,
  type NutrientStockDraft,
  type NutrientPresetDraft,
} from './feed-and-water-dialog-sm';
import {
  type NutrientInventoryResponse,
  type NutrientPresetsResponse,
  updateNutrientStock,
  removeNutrientStock,
  saveNutrientPreset,
  removeNutrientPreset,
  fetchNutrientInventory,
  fetchNutrientPresets,
} from '../slices/nutrient';
import { dialogStyles } from '../styles/dialog.styles';
import '../features/shared/ui/gs-dialog';
import '../features/shared/ui/md3-number-input';
import '../features/shared/ui/md3-select';
import '../features/ui/components/growspace-nutrient-inventory-dialog-ui';
import '../features/ui/components/growspace-nutrient-presets-editor-ui';

@customElement('feed-and-water-dialog')
export class FeedAndWaterDialog extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ attribute: false }) presetOptions: { label: string; value: string }[] = [];
  @property({ type: String }) targetText = '';
  @property({ type: Boolean }) hasPhiWarning = false;
  @property({ type: String }) phiWarningText = '';
  @property({ attribute: false }) inventory: NutrientInventoryResponse | null = null;
  @property({ attribute: false }) presets: NutrientPresetsResponse | null = null;

  @state() private _sm: SM = createInitialSM();
  private _prevSm: SM | undefined;

  static styles = [
    dialogStyles,
    css`
      :host { display: contents; }

      /* Body: nav-rail + content */
      .body {
        display: flex;
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }

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
        border-radius: var(--border-radius-md, 12px);
        background: none;
        border: none;
        cursor: pointer;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
        font-size: 0.6875rem;
        font-family: inherit;
        width: 56px;
        transition: background 0.15s, color 0.15s;
      }

      .nav-item:hover { background: rgba(255, 255, 255, 0.06); }

      .nav-item[aria-pressed='true'] {
        color: var(--primary-color, #4caf50);
        background: rgba(76, 175, 80, 0.12);
      }

      .content {
        flex: 1;
        overflow-y: auto;
        padding: 20px 24px;
        min-height: 0;
      }

      /* Footer */
      .footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding: 12px 24px;
        border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.2));
        flex-shrink: 0;
      }

      .btn-record {
        padding: 10px 20px;
        border-radius: var(--border-radius-sm, 8px);
        border: none;
        cursor: pointer;
        font-size: 0.875rem;
        font-family: inherit;
        font-weight: 500;
        background: var(--primary-color, #4caf50);
        color: #fff;
        transition: filter 0.15s, opacity 0.15s;
      }

      .btn-record:hover:not(:disabled) { filter: brightness(1.1); }

      .btn-record:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      /* Confirm-discard overlay */
      .confirm-discard-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .confirm-discard-box {
        background: var(--card-background-color, #1c1c1c);
        border-radius: var(--border-radius-lg, 16px);
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
        border-radius: var(--border-radius-sm, 8px);
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
        bottom: 72px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.85);
        color: #fff;
        padding: 8px 16px;
        border-radius: var(--border-radius-full, 9999px);
        font-size: 0.875rem;
        pointer-events: none;
        z-index: 20;
      }

      /* Tab placeholder */
      .tab-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: var(--secondary-text-color, rgba(255,255,255,0.5));
        font-size: 0.875rem;
      }

      /* Watering tab */
      .phi-warning {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(255, 152, 0, 0.15);
        color: var(--gm-phi-color, #ff9800);
        border: 1px solid var(--gm-phi-color, #ff9800);
        border-radius: var(--border-radius-sm, 8px);
        padding: 10px 14px;
        margin-bottom: 20px;
        font-size: 0.875rem;
      }

      .targeting-summary {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        border-radius: var(--border-radius-sm, 8px);
        padding: 12px 16px;
        font-size: 0.875rem;
        margin-top: 8px;
      }

      .targeting-label {
        opacity: 0.6;
        margin-right: 6px;
      }

      .targeting-value {
        color: var(--primary-color, #4caf50);
        font-weight: 500;
      }
    `,
  ];

  protected updated(changed: PropertyValues): void {
    super.updated(changed);
    if (changed.has('_sm')) {
      this._triggerAsyncIfNeeded(this._prevSm);
    }
    this._prevSm = this._sm;
  }

  private _triggerAsyncIfNeeded(prev: SM | undefined): void {
    const tab = this._sm.activeTab;
    const sub = this._sm.tabs[tab].sub;
    const prevSub = prev?.tabs[tab].sub;
    if (sub.kind !== 'applying' || sub.kind === prevSub?.kind) return;
    if (tab === 'inventory') {
      this._runInventoryApply(sub.draft as NutrientStockDraft, prev?.tabs.inventory.sub);
    } else if (tab === 'presets') {
      this._runPresetsApply(sub.draft as NutrientPresetDraft, prev?.tabs.presets.sub);
    }
  }

  private async _runInventoryApply(
    draft: NutrientStockDraft,
    prevSub: SM['tabs']['inventory']['sub'] | undefined
  ): Promise<void> {
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

  private async _runPresetsApply(
    draft: NutrientPresetDraft,
    prevSub: SM['tabs']['presets']['sub'] | undefined
  ): Promise<void> {
    const selectedId = this._sm.tabs.presets.selectedId;
    try {
      if (prevSub?.kind === 'confirm-delete') {
        await removeNutrientPreset(prevSub.id);
        this._applyEvent({ type: 'PresetDeleteResolved' });
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
        this._applyEvent({ type: 'PresetSaveResolved' });
        await fetchNutrientPresets();
      }
    } catch (err) {
      this._applyEvent({ type: 'PresetSaveFailed', message: String(err) });
    }
  }

  private _applyEvent(event: SMEvent) {
    this._sm = transition(this._sm, event);
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private _handleRecordWatering = () => {
    const { draft } = this._sm.tabs.watering;
    this._applyEvent({ type: 'WateringSubmitRequested' });
    this.dispatchEvent(
      new CustomEvent('submit-watering', {
        detail: { volume: draft.volume, presetId: draft.presetId },
        bubbles: true,
        composed: true,
      })
    );
  };

  private _isFooterBlocked(): boolean {
    const { activeTab, tabs } = this._sm;
    return (
      activeTab !== 'watering' ||
      tabs.watering.sub.kind === 'submitting'
    );
  }

  render() {
    if (!this.open) return nothing;

    const { _sm } = this;

    return html`
      <gs-dialog
        .open=${true}
        heading="Feed & Water"
        subtitle="Record watering and manage nutrients"
        .iconPath=${mdiWaterOutline}
        containerStyle="min-height: 400px;"
        @close=${this._close}
      >
        <div class="glass-dialog-container">
          <div class="body">
            ${this._renderNavRail(_sm)}
            <div class="content" @sm-event=${this._handleContentSmEvent}>
              ${this._renderContent(_sm.activeTab)}
            </div>
          </div>
          ${this._renderFooter()}
          ${_sm.status.kind === 'confirm-discard' ? this._renderConfirmDiscard() : nothing}
          ${_sm.toast ? html`<div class="toast">${_sm.toast}</div>` : nothing}
        </div>
      </gs-dialog>
    `;
  }

  private _renderNavRail(sm: SM) {
    const navItems: Array<{ tab: TabId; icon: string; label: string }> = [
      { tab: 'watering', icon: mdiWaterOutline, label: 'Watering' },
      { tab: 'inventory', icon: mdiBottleTonicPlus, label: 'Inventory' },
      { tab: 'presets', icon: mdiFormatListBulleted, label: 'Presets' },
    ];

    return html`
      <nav class="nav-rail">
        ${navItems.map(
      ({ tab, icon, label }) => html`
            <button
              class="nav-item"
              data-nav=${tab}
              aria-pressed=${sm.activeTab === tab ? 'true' : 'false'}
              @click=${() => this._applyEvent({ type: 'TabSelected', tab })}
            >
              <ha-svg-icon .path=${icon} style="width:22px;height:22px;fill:currentColor"></ha-svg-icon>
              <span>${label}</span>
            </button>
          `
    )}
      </nav>
    `;
  }

  private _renderContent(activeTab: TabId) {
    if (activeTab === 'watering') return this._renderWateringTab();
    if (activeTab === 'inventory') return this._renderInventoryTab();
    return this._renderPresetsTab();
  }

  private _handleContentSmEvent = (e: CustomEvent) => {
    if (this._sm.activeTab === 'presets') {
      this._applyPresetEvent(e.detail);
    } else {
      this._applyEvent(e.detail);
    }
  };

  private _renderInventoryTab() {
    const { inventory: invTab } = this._sm.tabs;
    return html`
      <growspace-nutrient-inventory-dialog-ui
        .inventory=${this.inventory}
        .selectedId=${invTab.selectedId}
        .sub=${invTab.sub}
      ></growspace-nutrient-inventory-dialog-ui>
    `;
  }

  private _renderPresetsTab() {
    const { presets: presetsTab } = this._sm.tabs;
    return html`
      <growspace-nutrient-presets-editor-ui
        .presets=${this.presets}
        .inventory=${this.inventory}
        .selectedId=${presetsTab.selectedId}
        .sub=${presetsTab.sub}
      ></growspace-nutrient-presets-editor-ui>
    `;
  }

  private _applyPresetEvent(event: { type: string;[key: string]: unknown }) {
    const PRESET_MAP: Record<string, string> = {
      ItemSelected: 'PresetItemSelected',
      BackToList: 'PresetBackToList',
      NewItemRequested: 'PresetNewItemRequested',
      EditStarted: 'PresetEditStarted',
      SaveRequested: 'PresetSaveRequested',
      SaveResolved: 'PresetSaveResolved',
      SaveFailed: 'PresetSaveFailed',
      ErrorDismissed: 'PresetErrorDismissed',
      DeleteRequested: 'PresetDeleteRequested',
      DeleteConfirmed: 'PresetDeleteConfirmed',
      DeleteResolved: 'PresetDeleteResolved',
      DeleteCancelled: 'PresetDeleteCancelled',
    };
    const mappedType = PRESET_MAP[event.type] ?? event.type;
    this._applyEvent({ ...event, type: mappedType } as SMEvent);
  }

  private _renderWateringTab() {
    const { draft } = this._sm.tabs.watering;
    return html`
      <div data-tab="watering">
        ${this.hasPhiWarning
        ? html`
              <div class="phi-warning" data-testid="phi-warning">
                <ha-svg-icon .path=${mdiInformation} style="width:18px;height:18px;fill:currentColor;flex-shrink:0"></ha-svg-icon>
                ${this.phiWarningText}
              </div>
            `
        : nothing}

        <md3-number-input
          label="Volume (Liters)"
          .value=${draft.volume}
          .min=${0.1}
          unit="L"
          @change=${(e: CustomEvent) => {
        const v = parseFloat(e.detail);
        if (!isNaN(v) && v > 0) this._applyEvent({ type: 'WateringVolumeChanged', volume: v });
      }}
        ></md3-number-input>

        <md3-select
          label="Nutrient Preset"
          .value=${draft.presetId}
          .options=${this.presetOptions}
          @change=${(e: CustomEvent) =>
        this._applyEvent({ type: 'WateringPresetChanged', presetId: e.detail })}
        ></md3-select>

        ${this.targetText
        ? html`
              <div class="targeting-summary">
                <span class="targeting-label">Targeting:</span>
                <span class="targeting-value">${this.targetText}</span>
              </div>
            `
        : nothing}
      </div>
    `;
  }

  private _renderFooter() {
    const blocked = this._isFooterBlocked();
    return html`
      <div class="footer">
        <button
          class="btn-record"
          data-action="record-watering"
          ?disabled=${blocked}
          @click=${this._handleRecordWatering}
        >
          Record Watering
        </button>
      </div>
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
    'feed-and-water-dialog': FeedAndWaterDialog;
  }
}
