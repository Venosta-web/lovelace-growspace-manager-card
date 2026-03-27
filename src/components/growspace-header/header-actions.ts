import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { storeContext, hassContext } from '../../context';
import type { GrowspaceStore } from '../../store/core/growspace-store';
import { StoreController } from '@nanostores/lit';
import { HomeAssistant } from 'custom-card-helpers';
import { HeaderChip } from '../../utils/metrics-utils';
import { ViewMode } from '../../constants';
import '../ui/scroll-container';
import '../growspace-chip';
import '../ui/gs-help-tooltip';

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
  mdiFileChart,
} from '@mdi/js';

@customElement('growspace-header-actions')
export class GrowspaceHeaderActions extends LitElement {
  @consume({ context: storeContext, subscribe: true })
  public store!: GrowspaceStore;

  @consume({ context: hassContext, subscribe: true })
  public hass!: HomeAssistant;

  @property({ attribute: false }) public deviceChips: HeaderChip[] = [];
  @property({ type: Boolean }) public isMobile = false;
  @property({ type: Boolean }) public mobileLink = false;

  @state() private _draggedMetric: string | null = null; // Local drag state

  // Controllers
  private _viewModeController!: StoreController<string>;
  private _isEditModeController!: StoreController<boolean>;
  private _selectedPlantsController!: StoreController<Set<string>>;
  private _selectedDeviceController!: StoreController<string | null>;

  connectedCallback() {
    super.connectedCallback();
    if (this.store) {
      this._viewModeController = new StoreController(this, this.store.ui.$viewMode);
      this._isEditModeController = new StoreController(this, this.store.ui.$isEditMode);
      this._selectedPlantsController = new StoreController(this, this.store.ui.$selectedPlants);
      this._selectedDeviceController = new StoreController(this, this.store.data.$selectedDevice);
    }
  }

  private get _chipDraggable(): string {
    if (this.isMobile) {
      return this.mobileLink.toString();
    }
    return 'true';
  }

  private _triggerAction(action: string) {
    // Popover closing is handled by browser for 'popover="auto"', but specific logic for custom events might be needed
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

    switch (action) {
      case 'add_plant':
        this.store.openAddPlantDialog();
        break;
      case 'config': {
        const device = this.store.data.$devices
          .get()
          .find((d) => d.deviceId === this._selectedDeviceController.value);
        if (device) this.store.openConfigDialog(device);
        break;
      }
      case 'edit':
        this.store.ui.setEditMode(!this._isEditModeController.value);
        break;
      case 'compact': {
        const currentMode = this._viewModeController.value;
        this.store.ui.setViewMode(
          currentMode === ViewMode.COMPACT ? ViewMode.STANDARD : ViewMode.COMPACT
        );
        break;
      }
      case 'heatmap': {
        const currentMode = this._viewModeController.value;
        this.store.ui.setViewMode(
          currentMode === ViewMode.HEATMAP ? ViewMode.STANDARD : ViewMode.HEATMAP
        );
        break;
      }
      case 'strains':
        this.store.openStrainLibraryDialog();
        break;
      case 'irrigation':
        if (this._selectedDeviceController.value) this.store.openIrrigationDialog();
        break;
      case 'ai':
        this.store.openGrowMasterDialog(this._selectedDeviceController.value || '');
        break;
      case 'logbook':
        this.store.openLogbookDialog();
        break;
      case 'snapshots':
        this.store.openSnapshotsDialog(this._selectedDeviceController.value || undefined);
        break;
      case 'water': {
        const selectedPlants = this.store.ui.$selectedPlants.get();
        this.store.openWateringDialog({
          plantIds: selectedPlants.size > 0 ? Array.from(selectedPlants) : undefined,
          growspaceId: this._selectedDeviceController.value || undefined,
          mode: selectedPlants.size > 0 ? 'plant' : 'growspace',
        });
        break;
      }
      case 'ipm': {
        const selectedPlants = this.store.ui.$selectedPlants.get();
        this.store.openIPMDialog({
          growspaceId:
            this._selectedDeviceController.value ||
            this.store.data.$devices.get()[0]?.deviceId ||
            '', // Fallback
          plantIds: selectedPlants.size > 0 ? Array.from(selectedPlants) : undefined,
        });
        break;
      }
      case 'training': {
        const selectedPlants = this.store.ui.$selectedPlants.get();
        this.store.openTrainingDialog(
          selectedPlants.size > 0 ? Array.from(selectedPlants) : [],
          this._selectedDeviceController.value || undefined
        );
        break;
      }
      case 'nutrients':
        this.store.openNutrientsDialog();
        break;
      case 'ec_ramp':
        this.store.openECRampDialog(this._selectedDeviceController.value || undefined);
        break;
      case 'report':
        this.store.openGrowReportDialog(this._selectedDeviceController.value || undefined);
        break;
    }
  }

  private _handleChipDragStart(e: DragEvent, metric: string) {
    this._draggedMetric = metric;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', metric);
    }
    // Also bubble up if needed
    this.dispatchEvent(
      new CustomEvent('chip-drag-start', { detail: { metric }, bubbles: true, composed: true })
    );
  }

  private _handleChipDrop(e: DragEvent, targetMetric: string) {
    e.preventDefault();
    // Internal link logic if we want, or bubble up
    // The original code handled linking in GrowspaceHeader
    // But since both chips are in this container or header-hero, we delegate history linking to store here or bubble
    if (!this._draggedMetric || this._draggedMetric === targetMetric) {
      this._draggedMetric = null;
      return;
    }

    if (this.store?.history) {
      this.store.history.linkGraphs(this._draggedMetric, targetMetric);
    }
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

  // Pass through toggle event
  private _toggleEnvGraph(metric: string) {
    this.dispatchEvent(
      new CustomEvent('toggle-graph', { detail: { metric }, bubbles: true, composed: true })
    );
  }

  private _iconButton(
    icon: string,
    action: string,
    label: string,
    help: string,
    active = false
  ) {
    return html`
      <div style="position:relative;display:inline-flex;align-items:center;">
        <div
          class="icon-button ${active ? 'active' : ''}"
          @click=${() => this._triggerAction(action)}
          title="${label}"
        >
          <svg viewBox="0 0 24 24"><path d="${icon}"></path></svg>
        </div>
        <gs-help-tooltip
          .content=${help}
          placement="bottom"
          .label=${label}
          style="position:absolute;top:-4px;right:-4px;"
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
      height: 48px; /* Fixed height for scroll container */
    }

    /* Styles copied/adapted from GrowspaceHeader */
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
      anchor-name: --menu-trigger;
      flex-shrink: 0;
    }
    .icon-button:hover {
      background: var(--secondary-background-color, rgba(255, 255, 255, 0.2));
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

    @media (max-width: 600px) {
      .menu-dropdown:popover-open {
        inset: auto 0 0 0;
        width: 100%;
        position-anchor: none;
        border-radius: 20px 20px 0 0;
        margin: 0;
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
    }

    /* Chips wrapper in scroll container */
    .chips-wrapper {
      display: flex;
      gap: 8px;
      padding: 0 4px;
    }
  `;

  render() {
    return html`
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

      ${this.isMobile
        ? html`
            <div
              class="icon-button mobile-link ${this.mobileLink ? 'active' : ''}"
              @click=${() =>
            this.dispatchEvent(
              new CustomEvent('toggle-mobile-link', { bubbles: true, composed: true })
            )}
              title="Toggle Link Mode"
            >
              <svg viewBox="0 0 24 24"><path d="${mdiLink}"></path></svg>
            </div>
          `
        : ''}

      ${this._iconButton(
        mdiPencil, 'edit', 'Edit Mode',
        'Edit mode lets you reorder plants, remove them from the growspace, or drag metric chips to rearrange the header.',
        this._isEditModeController?.value
      )}

      ${this._iconButton(
        mdiCube, 'heatmap', '3D Heatmap',
        'Switch to 3D VPD heatmap view — visualizes temperature and humidity distribution across your canopy as a 3D surface.',
        this._viewModeController?.value === ViewMode.HEATMAP
      )}

      ${this._iconButton(
        mdiCog, 'config', 'Settings',
        'Open growspace settings — configure sensor assignments, irrigation strategy, and integration options.'
      )}

      <div class="menu-container">
        <button class="icon-button" id="menu-trigger" popovertarget="header-menu" title="Open Menu">
          <svg viewBox="0 0 24 24"><path d="${mdiDotsVertical}"></path></svg>
        </button>
        ${this._renderMenu()}
      </div>
    `;
  }

  private _renderMenu() {
    const selectedCount = this._selectedPlantsController?.value?.size || 0;
    return html`
      <div id="header-menu" popover="auto" class="menu-dropdown">
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
        <div class="menu-item" @click=${() => this._triggerAction('ec_ramp')}>
          <svg viewBox="0 0 24 24"><path d="${mdiChartLine}"></path></svg>
          <span class="menu-item-label">EC Ramp Curves</span>
        </div>
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
        <div class="menu-item" @click=${() => this._triggerAction('report')}>
          <svg viewBox="0 0 24 24"><path d="${mdiFileChart}"></path></svg>
          <span class="menu-item-label">Generate Report</span>
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
}
