import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  mdiWaterOutline,
  mdiBottleTonicPlus,
  mdiFormatListBulleted,
  mdiClose,
  mdiInformation,
} from '@mdi/js';
import {
  createInitialSM,
  transition,
  type SM,
  type SMEvent,
  type TabId,
} from './feed-and-water-dialog-sm';

@customElement('feed-and-water-dialog')
export class FeedAndWaterDialog extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ attribute: false }) presetOptions: { label: string; value: string }[] = [];
  @property({ type: String }) targetText = '';
  @property({ type: Boolean }) hasPhiWarning = false;
  @property({ type: String }) phiWarningText = '';

  @state() private _sm: SM = createInitialSM();

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
      position: relative;
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
      transition: background 0.15s, color 0.15s;
    }

    .nav-item:hover { background: rgba(255, 255, 255, 0.06); }

    .nav-item[aria-pressed='true'] {
      color: var(--primary-color, #4caf50);
      background: rgba(76, 175, 80, 0.12);
    }

    /* Content */
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
      border-radius: 8px;
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
      bottom: 72px;
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
      color: #ff9800;
      border: 1px solid #ff9800;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 20px;
      font-size: 0.875rem;
    }

    .form-field {
      margin-bottom: 16px;
    }

    .form-label {
      display: block;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.6;
      margin-bottom: 6px;
    }

    .volume-input {
      width: 100%;
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.15));
      border-radius: 8px;
      color: var(--primary-text-color, #fff);
      font-size: 0.9375rem;
      font-family: inherit;
      box-sizing: border-box;
    }

    .volume-input:focus {
      outline: none;
      border-color: var(--primary-color, #4caf50);
    }

    .preset-select {
      width: 100%;
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.15));
      border-radius: 8px;
      color: var(--primary-text-color, #fff);
      font-size: 0.9375rem;
      font-family: inherit;
      box-sizing: border-box;
      appearance: none;
    }

    .preset-select:focus {
      outline: none;
      border-color: var(--primary-color, #4caf50);
    }

    .targeting-summary {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 0.875rem;
    }

    .targeting-label {
      opacity: 0.6;
      margin-right: 6px;
    }

    .targeting-value {
      color: var(--primary-color, #4caf50);
      font-weight: 500;
    }
  `;

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
    const { tabs } = this._sm;
    return (
      tabs.watering.sub.kind === 'submitting' ||
      tabs.inventory.sub.kind === 'editing' ||
      tabs.presets.sub.kind === 'editing'
    );
  }

  render() {
    if (!this.open) return nothing;

    const { _sm } = this;

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
            ${this._renderNavRail(_sm)}
            <div class="content">
              ${this._renderContent(_sm.activeTab)}
            </div>
          </div>
          ${this._renderFooter()}
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
          <ha-svg-icon .path=${mdiWaterOutline} style="width:24px;height:24px;fill:currentColor"></ha-svg-icon>
        </div>
        <div class="header-title-group">
          <h2 class="header-title">Feed &amp; Water</h2>
          <div class="header-subtitle">Record watering and manage nutrients</div>
        </div>
        <button class="close-btn" @click=${this._close} aria-label="Close">
          <ha-svg-icon .path=${mdiClose} style="width:24px;height:24px;fill:currentColor"></ha-svg-icon>
        </button>
      </div>
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
    const labels: Record<'inventory' | 'presets', string> = {
      inventory: 'Inventory',
      presets: 'Presets',
    };
    return html`
      <div class="tab-placeholder" data-tab=${activeTab}>
        ${labels[activeTab]} tab — coming soon
      </div>
    `;
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

        <div class="form-field">
          <label class="form-label">Volume (Liters)</label>
          <input
            class="volume-input"
            type="number"
            min="0.1"
            step="0.1"
            .value=${String(draft.volume)}
            @change=${(e: Event) => {
              const v = parseFloat((e.target as HTMLInputElement).value);
              if (!isNaN(v) && v > 0) this._applyEvent({ type: 'WateringVolumeChanged', volume: v });
            }}
          />
        </div>

        <div class="form-field">
          <label class="form-label">Nutrient Preset</label>
          <select
            class="preset-select"
            .value=${draft.presetId}
            @change=${(e: Event) =>
              this._applyEvent({
                type: 'WateringPresetChanged',
                presetId: (e.target as HTMLSelectElement).value,
              })}
          >
            <option value="">— No preset —</option>
            ${this.presetOptions.map(
              (opt) => html`<option value=${opt.value} ?selected=${opt.value === draft.presetId}>${opt.label}</option>`
            )}
          </select>
        </div>

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
