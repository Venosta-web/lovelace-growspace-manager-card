import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HeaderChip } from '../../../utils/metrics-utils';
import { ViewMode } from '../../../constants';
import { GrowspaceDevice } from '../../../types';
import '../../shared/ui/scroll-container';
import '../../shared/ui/growspace-chip';
import '../../shared/ui/gs-help-tooltip';

// Icons
import {
  mdiCog,
  mdiBrain,
  mdiDotsVertical,
  mdiPencil,
  mdiLink,
  mdiClipboardTextClock,
  mdiWater,
  mdiWaterPlus,
  mdiBottleTonicPlus,
  mdiBug,
  mdiDumbbell,
  mdiPlus,
  mdiDna,
  mdiCube,
  mdiCamera,
  mdiChartLine,
} from '@mdi/js';

@customElement('growspace-header-actions-ui')
export class GrowspaceHeaderActionsUI extends LitElement {
  @property({ attribute: false }) public deviceChips: HeaderChip[] = [];
  @property({ type: Boolean }) public isMobile = false;
  @property({ type: Boolean }) public mobileLink = false;
  @property() public viewMode = ViewMode.STANDARD;
  @property({ type: Boolean }) public isEditMode = false;
  @property({ attribute: false }) public selectedPlants = new Set<string>();
  @property() public selectedDevice: string | null = null;
  @property({ attribute: false }) public device?: GrowspaceDevice;

  @state() private _draggedMetric: string | null = null;

  private get _chipDraggable(): string {
    if (this.isMobile) {
      return this.mobileLink.toString();
    }
    return 'true';
  }

  private _triggerAction(action: string) {
    const menu = this.shadowRoot?.getElementById('header-menu') as HTMLElement & {
      hidePopover?: () => void;
    };
    if (menu && typeof menu.hidePopover === 'function') {
      try {
        menu.hidePopover();
      } catch {
        /* ignore */
      }
    }

    this.dispatchEvent(
      new CustomEvent('action-triggered', {
        detail: { action },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleChipDragStart(e: DragEvent, metric: string) {
    this._draggedMetric = metric;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', metric);
    }
    this.dispatchEvent(
      new CustomEvent('chip-drag-start', { detail: { metric }, bubbles: true, composed: true })
    );
  }

  private _handleChipDrop(e: DragEvent, targetMetric: string) {
    e.preventDefault();
    if (!this._draggedMetric || this._draggedMetric === targetMetric) {
      this._draggedMetric = null;
      return;
    }

    this.dispatchEvent(
      new CustomEvent('chip-drop', {
        detail: { sourceMetric: this._draggedMetric, targetMetric },
        bubbles: true,
        composed: true,
      })
    );
    this._draggedMetric = null;
  }

  private _handleDragOver(e: DragEvent) {
    if (this._draggedMetric) e.preventDefault();
  }

  private _unlinkGraphs(groupIndex: number) {
    this.dispatchEvent(
      new CustomEvent('unlink-graphs', { detail: { groupIndex }, bubbles: true, composed: true })
    );
  }

  private _toggleEnvGraph(metric: string) {
    this.dispatchEvent(
      new CustomEvent('toggle-graph', { detail: { metric }, bubbles: true, composed: true })
    );
  }

  private _iconButton(icon: string, action: string, label: string, help: string, active = false) {
    return html`
      <div style="position:relative;display:inline-flex;align-items:center;">
        <button
          class="icon-button ${active ? 'active' : ''}"
          @click=${() => this._triggerAction(action)}
          title="${label}"
          aria-label="${label}"
          aria-pressed="${active}"
          type="button"
        >
          <svg viewBox="0 0 24 24"><path d="${icon}"></path></svg>
        </button>
        <gs-help-tooltip
          .content=${help}
          placement="bottom"
          .label=${label}
          style="position:absolute;top:-10px;right:-10px;z-index:1;"
        ></gs-help-tooltip>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      min-width: 0;
      gap: 12px;
    }

    .gs-device-chips-container {
      display: flex;
      align-items: center;
      overflow: hidden;
      min-width: 0;
      max-width: 100%;
      flex: 1;
      height: 48px;
    }

    .icon-button {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--secondary-background-color, rgba(255, 255, 255, 0.1));
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary-text-color, #fff);
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
      padding: 0;
      font: inherit;
      outline: none;
    }
    .icon-button:hover {
      background: var(--secondary-background-color, rgba(255, 255, 255, 0.2));
    }
    .icon-button:focus-visible {
      outline: 2px solid var(--primary-color, #2196f3);
      outline-offset: 2px;
    }
    .icon-button svg {
      width: 22px;
      height: 22px;
      fill: currentColor;
    }

    .icon-button.mobile-link.active,
    .icon-button.active {
      background: var(--primary-color, #2196f3);
      border-color: var(--primary-color, #2196f3);
    }

    .menu-dropdown {
      position: fixed;
      inset: auto;
      position-anchor: --menu-trigger;
      top: anchor(bottom);
      right: anchor(right);
      position-try-fallbacks: flip-block;
      margin-top: 8px;
      background: var(--card-background-color, #2a2a2a);
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      border-radius: 12px;
      font-size: 0.9rem;
      min-width: 180px;
      padding: 0;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
      z-index: 1000;
    }

    .menu-dropdown:popover-open {
      display: block;
      animation: slide-in 0.2s ease-out;
    }

    @keyframes slide-in {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .menu-item {
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      color: var(--primary-text-color, #ddd);
    }
    .menu-item:hover {
      background: var(--secondary-background-color, rgba(255, 255, 255, 0.1));
      color: var(--primary-text-color, #fff);
    }
    .menu-item svg {
      width: 20px;
      height: 20px;
      fill: currentColor;
    }
    .menu-item-label {
      flex: 1;
    }
    .menu-header {
      padding: 8px 16px 4px;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--secondary-text-color);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .menu-divider {
      height: 1px;
      background: var(--divider-color, rgba(255, 255, 255, 0.1));
      margin: 4px 0;
    }

    .drag-handle {
      display: none;
    }

    @media (max-width: 600px) {
      .menu-dropdown:popover-open {
        inset: auto 0 0 0;
        width: 100%;
        position-anchor: none;
        border-radius: 20px 20px 0 0;
        margin: 0;
        max-height: calc(100dvh - env(safe-area-inset-top, 0px));
        overflow-y: auto;
        padding-bottom: env(safe-area-inset-bottom, 0px);
        animation: slide-up 0.3s cubic-bezier(0.1, 0.7, 0.1, 1);
      }
      @keyframes slide-up {
        from {
          transform: translateY(100%);
        }
        to {
          transform: translateY(0);
        }
      }
      .drag-handle {
        display: flex;
        justify-content: center;
        padding: 10px 0 4px;
      }
      .drag-handle::before {
        content: '';
        width: 36px;
        height: 4px;
        border-radius: 2px;
        background: var(--divider-color, rgba(255, 255, 255, 0.3));
      }
    }

    .chips-wrapper {
      display: flex;
      gap: 8px;
      padding: 0 4px;
    }
  `;

  render() {
    return html`
      ${!this.isMobile
        ? html`
            <div class="gs-device-chips-container">
              <scroll-container .scrollAmount=${150} containerClass="device-chips-scroll">
                <div class="chips-wrapper">
                  ${this.deviceChips.map(
                    (chip) => html`
                      <growspace-chip
                        .icon=${chip.icon}
                        .label=${chip.label}
                        .value=${chip.value}
                        .multiValues=${chip.multiValues}
                        .status=${chip.status}
                        .active=${chip.active}
                        .linked=${chip.linked}
                        .tooltip=${chip.tooltip}
                        draggable="${this._chipDraggable}"
                        @dragstart=${(e: DragEvent) => this._handleChipDragStart(e, chip.key)}
                        @drop=${(e: DragEvent) => this._handleChipDrop(e, chip.key)}
                        @dragover=${this._handleDragOver}
                        @click=${() => this._toggleEnvGraph(chip.key)}
                        @unlink=${() => this._unlinkGraphs(chip.groupIndex)}
                      ></growspace-chip>
                    `
                  )}
                </div>
              </scroll-container>
            </div>
          `
        : nothing}
      ${this.isMobile
        ? html`
            <button
              class="icon-button mobile-link ${this.mobileLink ? 'active' : ''}"
              @click=${() =>
                this.dispatchEvent(
                  new CustomEvent('toggle-mobile-link', { bubbles: true, composed: true })
                )}
              title="Toggle Link Mode"
              aria-label="Toggle Link Mode"
              aria-pressed="${this.mobileLink}"
              type="button"
            >
              <svg viewBox="0 0 24 24"><path d="${mdiLink}"></path></svg>
            </button>
          `
        : ''}
      ${this._iconButton(
        mdiPencil,
        'edit',
        'Edit Mode',
        'Edit mode lets you reorder plants, remove them from the growspace, or drag metric chips to rearrange the header.',
        this.isEditMode
      )}
      ${!this.isMobile
        ? html`
            ${this._iconButton(
              mdiCube,
              'heatmap',
              '3D Heatmap',
              'Switch to 3D VPD heatmap view — visualizes temperature and humidity distribution across your canopy as a 3D surface.',
              this.viewMode === ViewMode.HEATMAP
            )}
            ${this._iconButton(
              mdiCog,
              'config',
              'Settings',
              'Open growspace settings — configure sensor assignments, irrigation strategy, and integration options.'
            )}
          `
        : nothing}

      <div class="menu-container">
        <button
          class="icon-button"
          id="menu-trigger"
          style="anchor-name: --menu-trigger"
          popovertarget="header-menu"
          title="Open Menu"
        >
          <svg viewBox="0 0 24 24"><path d="${mdiDotsVertical}"></path></svg>
        </button>
        ${this._renderMenu()}
      </div>
    `;
  }

  private _renderMenu() {
    const selectedCount = this.selectedPlants?.size || 0;
    return html`
      <div id="header-menu" popover="auto" class="menu-dropdown">
        <div class="drag-handle"></div>
        ${this.isMobile
          ? html`
              <div class="menu-header">Growspace</div>
              <div class="menu-item" @click=${() => this._triggerAction('config')}>
                <svg viewBox="0 0 24 24"><path d="${mdiCog}"></path></svg>
                <span class="menu-item-label">Settings</span>
              </div>
              <div class="menu-item" @click=${() => this._triggerAction('heatmap')}>
                <svg viewBox="0 0 24 24"><path d="${mdiCube}"></path></svg>
                <span class="menu-item-label">3D Heatmap</span>
              </div>
              <div class="menu-divider"></div>
            `
          : nothing}
        <div class="menu-header">Plant Actions</div>
        <div class="menu-item" @click=${() => this._triggerAction('add_plant')}>
          <svg viewBox="0 0 24 24"><path d="${mdiPlus}"></path></svg>
          <span class="menu-item-label">Add Plant</span>
        </div>
        <div class="menu-item" @click=${() => this._triggerAction('water')}>
          <svg viewBox="0 0 24 24"><path d="${mdiWaterPlus}"></path></svg>
          <span class="menu-item-label"
            >${selectedCount > 0 ? 'Water Selected' : 'Water Growspace'}</span
          >
        </div>
        <div class="menu-item" @click=${() => this._triggerAction('ipm')}>
          <svg viewBox="0 0 24 24"><path d="${mdiBug}"></path></svg>
          <span class="menu-item-label"
            >${selectedCount > 0 ? 'Apply IPM to Selected' : 'Log / Manage IPM'}</span
          >
        </div>
        <div class="menu-item" @click=${() => this._triggerAction('training')}>
          <svg viewBox="0 0 24 24"><path d="${mdiDumbbell}"></path></svg>
          <span class="menu-item-label"
            >${selectedCount > 0 ? 'Train Selected' : 'Log Training'}</span
          >
        </div>

        <div class="menu-divider"></div>

        <div class="menu-header">Setup</div>
        <div class="menu-item" @click=${() => this._triggerAction('irrigation')}>
          <svg viewBox="0 0 24 24"><path d="${mdiWater}"></path></svg>
          <span class="menu-item-label">Irrigation</span>
        </div>
        <div class="menu-item" @click=${() => this._triggerAction('nutrients')}>
          <svg viewBox="0 0 24 24"><path d="${mdiBottleTonicPlus}"></path></svg>
          <span class="menu-item-label">Nutrients</span>
        </div>
        ${this._showECRamp()
          ? html`
              <div class="menu-item" @click=${() => this._triggerAction('ec_ramp')}>
                <svg viewBox="0 0 24 24"><path d="${mdiChartLine}"></path></svg>
                <span class="menu-item-label">EC Ramp Curves</span>
              </div>
            `
          : ''}
        <div class="menu-item" @click=${() => this._triggerAction('strains')}>
          <svg viewBox="0 0 24 24"><path d="${mdiDna}"></path></svg>
          <span class="menu-item-label">Strains</span>
        </div>

        <div class="menu-divider"></div>

        <div class="menu-header">Insights</div>
        <div class="menu-item" @click=${() => this._triggerAction('logbook')}>
          <svg viewBox="0 0 24 24"><path d="${mdiClipboardTextClock}"></path></svg>
          <span class="menu-item-label">Logbook</span>
        </div>
        <div class="menu-item" @click=${() => this._triggerAction('snapshots')}>
          <svg viewBox="0 0 24 24"><path d="${mdiCamera}"></path></svg>
          <span class="menu-item-label">Camera Snapshots</span>
        </div>
        <div class="menu-item" @click=${() => this._triggerAction('ai')}>
          <svg viewBox="0 0 24 24"><path d="${mdiBrain}"></path></svg>
          <span class="menu-item-label">Ask AI</span>
        </div>
      </div>
    `;
  }

  private _showECRamp(): boolean {
    if (!this.device) return false;

    const hasPump =
      !!this.device.irrigationConfig?.irrigationPumpEntity ||
      !!this.device.irrigationConfig?.drainPumpEntity;
    const hasSchedule = (this.device.irrigationConfig?.irrigationTimes?.length || 0) > 0;
    const hasECSensor =
      (this.device.environmentAttributes?.feedEcSensors?.length || 0) > 0 ||
      (this.device.environmentAttributes?.runoffEcSensors?.length || 0) > 0 ||
      (this.device.environmentAttributes?.substrateEcSensors?.length || 0) > 0;

    return hasPump && hasSchedule && hasECSensor;
  }
}
