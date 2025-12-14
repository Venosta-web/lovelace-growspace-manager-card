import { LitElement, html, css, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';

import {
  mdiCog,
  mdiBrain,
  mdiDotsVertical,
  mdiPencil,
  mdiLink,
  mdiMagnify,
  mdiClipboardTextClock,
  mdiChevronLeft,
  mdiChevronRight,
  mdiAirHumidifierOff,
  mdiDna,
  mdiWater
} from '@mdi/js';
import { createRef, ref, Ref } from 'lit/directives/ref.js';
import { classMap } from 'lit/directives/class-map.js';
import './growspace-chip'; // Import the new component
import { consume } from '@lit/context';
import { hassContext, configContext, storeContext, historyContext } from '../context';
import { GrowspaceDevice, GrowspaceManagerCardConfig, IrrigationTime } from '../types';
import { PlantUtils } from '../utils/plant-utils';
import { MetricsUtils } from '../utils/metrics-utils';
import { METRIC_CONFIG } from '../constants';
import type { GrowspaceStore } from '../store/growspace-store';
import type { GrowspaceHistoryController } from '../controllers/growspace-history-controller';

@customElement('growspace-header')
export class GrowspaceHeader extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  public hass!: HomeAssistant;

  @consume({ context: storeContext, subscribe: true })
  public store!: GrowspaceStore;

  @consume({ context: historyContext, subscribe: true })
  public historyController!: GrowspaceHistoryController;

  @consume({ context: configContext, subscribe: true })
  @property({ attribute: false })
  public config!: GrowspaceManagerCardConfig;

  @property({ attribute: false }) public device!: GrowspaceDevice;
  @property({ type: Boolean }) public compact = false;
  @property({ type: Boolean }) public isEditMode = false;
  // activeEnvGraphs and linkedGraphGroups removed as props, accessed via historyController in render or getters
  @property({ attribute: false }) public growspaceOptions: Record<string, string> = {};
  @property({ attribute: false }) public historyData: any[] | null = null;

  @state() private _menuOpen = false;

  @state() private _draggedMetric: string | null = null;

  // Cached Metric Data
  @state() private _mainChips: any[] = [];
  @state() private _deviceChips: any[] = [];
  @state() private _dominant: any = undefined;
  @state() private _envAttrs: any = {};

  @state() private _canScrollLeft = false;
  @state() private _canScrollRight = false;

  private _chipsContainerRef: Ref<HTMLDivElement> = createRef();
  private _resizeObserver: ResizeObserver | undefined;

  // Helper getters for clarity in render/compute
  get activeEnvGraphs() {
    return this.historyController?.activeEnvGraphs || new Set();
  }

  private _computeMetrics(): {
    mainChips: any[];
    deviceChips: any[];
    dominant: any;
    envAttrs: any;
  } {
    if (!this.device || !this.hass)
      return { mainChips: [], deviceChips: [], dominant: undefined, envAttrs: {} };

    return MetricsUtils.computeHeaderMetrics(
      this.hass,
      this.device,
      this.activeEnvGraphs,
      this.historyController?.linkedGraphGroups || []
    );
  }

  private _scrollChips(direction: 'left' | 'right') {
    const container = this._chipsContainerRef.value;
    if (container) {
      container.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
    }
  }

  private _checkScroll() {
    const container = this._chipsContainerRef.value;
    if (container) {
      // 1px buffer to handle subpixels
      this._canScrollLeft = container.scrollLeft > 1;
      this._canScrollRight =
        container.scrollLeft < container.scrollWidth - container.clientWidth - 1;
    }
  }

  protected willUpdate(changedProperties: Map<string, any>) {
    if (
      changedProperties.has('device') ||
      changedProperties.has('hass') ||
      changedProperties.has('activeEnvGraphs') ||
      changedProperties.has('linkedGraphGroups')
    ) {
      const { mainChips, deviceChips, dominant, envAttrs } = this._computeMetrics();
      this._mainChips = mainChips;
      this._deviceChips = deviceChips;
      this._dominant = dominant;
      this._envAttrs = envAttrs;
    }
  }

  updated(changedProps: Map<string, any>) {
    if (
      changedProps.has('activeEnvGraphs') ||
      changedProps.has('linkedGraphGroups') ||
      changedProps.has('device')
    ) {
      // Content might change size
      setTimeout(() => this._checkScroll(), 0);
    }
  }

  firstUpdated() {
    const container = this._chipsContainerRef.value;
    if (container) {
      container.addEventListener('scroll', () => this._checkScroll());
      this._resizeObserver = new ResizeObserver(() => this._checkScroll());
      this._resizeObserver.observe(container);

      // Initial check
      setTimeout(() => this._checkScroll(), 0);
    }
  }


  static styles = css`
    :host {
      display: block;
    }

    .gs-stats-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .gs-header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .header-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1; /* Ensure it takes available space */
    }

    .gs-title-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex-shrink: 0;
    }

    .gs-title {
      font-family: 'Roboto', sans-serif;
      font-size: 2.25rem;
      font-weight: 400;
      margin: 0;
      letter-spacing: 0;
      line-height: 2.75rem;
      text-transform: capitalize;
      background: linear-gradient(90deg, #ffffff 0%, rgba(255, 255, 255, 0.8) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .growspace-select-header {
      font-family: 'Roboto', sans-serif;
      font-size: 2.25rem;
      font-weight: 400;
      margin: 0;
      letter-spacing: 0;
      line-height: 2.75rem;
      text-transform: capitalize;
      background: linear-gradient(90deg, #ffffff 0%, rgba(255, 255, 255, 0.8) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
    }

    .growspace-select-header option {
      background: var(--card-background-color, #1c1c1c);
      color: var(--primary-text-color, #fff);
    }

    .gs-stage-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.1);
      padding: 6px 16px;
      border-radius: 24px;
      font-size: 0.875rem;
      font-weight: 500;
      color: #fff;
      width: fit-content;
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(4px);
    }

    .gs-stats-chips {
      display: flex;
      flex-wrap: nowrap;
      gap: 8px;
      justify-content: flex-start;
      align-items: center;
      overflow-x: auto;
      overflow-y: hidden;
      flex: 1;
      min-width: 0;
      scrollbar-width: none;
      -ms-overflow-style: none;
      /* Remove static mask */
      /* mask-image: linear-gradient(to right, black 85%, transparent 100%); */
      /* -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%); */
      padding: 4px 2px;
      transition: mask-image 0.3s;

      touch-action: manipulation;
      max-width: 100%;
      -webkit-overflow-scrolling: touch;
    }
    .gs-stats-chips::-webkit-scrollbar {
      display: none;
    }

    .gs-stats-chips > :first-child {
      margin-left: auto;
    }

    .stat-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 8px 16px;
      font-size: 0.875rem;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(8px);
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      user-select: none;
      flex-shrink: 0;
      white-space: nowrap;
      touch-action: auto;
    }

    /* Status Colors */
    @keyframes pulse-red {
      0% {
        box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.7);
      }
      70% {
        box-shadow: 0 0 0 10px rgba(244, 67, 54, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(244, 67, 54, 0);
      }
    }
    .stat-chip.status-optimal {
      color: #2e7d32 !important;
      background: rgba(46, 125, 50, 0.1) !important;
    }

    .stat-chip.status-warning {
      color: #ffa726 !important;
      border-color: rgba(255, 167, 38, 0.5) !important;
      background: rgba(255, 167, 38, 0.1) !important;
    }

    .stat-chip.status-danger {
      color: #ef5350 !important;
      border-color: rgba(239, 83, 80, 0.5) !important;
      background: rgba(239, 83, 80, 0.1) !important;
      animation: pulse-red 2s infinite;
    }

    .stat-chip:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-1px);
    }

    .stat-chip.active {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.4);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      color: #fff;
    }

    .stat-chip svg {
      width: 18px;
      height: 18px;
      fill: currentColor;
      opacity: 0.8;
      pointer-events: none; /* Ensure key events pass through to chip/container */
    }

    .gs-device-chips {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
      touch-action: pan-x;
      max-width: 100%;
      -webkit-overflow-scrolling: touch;
    }

    .menu-container {
      position: relative;
      display: inline-block;
    }

    .menu-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.1);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      color: #fff;
    }

    .menu-button:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .menu-button svg {
      width: 24px;
      height: 24px;
      fill: currentColor;
    }

    .menu-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      z-index: 1000;
      min-width: 200px;
      background: rgba(30, 30, 30, 0.95);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      cursor: pointer;
      transition: background 0.2s;
      color: rgba(255, 255, 255, 0.9);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .menu-item:last-child {
      border-bottom: none;
    }

    .menu-item:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .menu-item svg {
      width: 20px;
      height: 20px;
      fill: currentColor;
      flex-shrink: 0;
    }

    .menu-item-label {
      flex: 1;
      font-size: 0.9rem;
    }

    .menu-toggle-switch {
      width: 40px;
      height: 20px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      position: relative;
      transition: background 0.2s;
    }

    .menu-toggle-switch::after {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      background: white;
      border-radius: 50%;
      top: 2px;
      left: 2px;
      transition: transform 0.2s;
    }

    .menu-toggle-switch.active {
      background: var(--primary-color, #03a9f4);
    }

    .menu-toggle-switch.active::after {
      transform: translateX(20px);
    }

    .link-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      margin-left: -8px;
      margin-right: -8px;
    }

    @media (max-width: 768px) {
      .gs-title-group {
        gap: 8px;
        min-width: 0; /* Enable flex shrinking */
      }
      .gs-stats-chips {
        justify-content: flex-start;
        mask-image: linear-gradient(to right, black 90%, transparent 100%);
        -webkit-mask-image: linear-gradient(to right, black 90%, transparent 100%);
        padding-right: 16px;
        /* Force layout properties for scrolling */
        display: flex;
        flex-wrap: nowrap;
        overflow-x: auto;
        width: 100%;
        touch-action: manipulation;
        -webkit-overflow-scrolling: touch;
      }

      .gs-header-top {
        flex-direction: column;
        align-items: stretch;
        position: relative;
        min-width: 0;
      }
      .header-controls-container {
        max-width: 100%;
      }
      .header-controls {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
        overflow: visible;
        min-width: 0;
      }

      .menu-container {
        position: absolute;
        top: 0;
        right: 0;
        z-index: 10;
        margin: 0;
      }

      .gs-device-chips {
        justify-content: flex-start;
        flex-wrap: nowrap;
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: none;
        -ms-overflow-style: none;
        mask-image: linear-gradient(to right, black 90%, transparent 100%);
        -webkit-mask-image: linear-gradient(to right, black 90%, transparent 100%);
        padding: 4px 2px;
        padding-right: 16px;
        width: 100%;
        touch-action: manipulation; /* Allow X scrolling and Y page scrolling */
        min-width: 0;
        display: flex;
      }
      .gs-device-chips::-webkit-scrollbar {
        display: none;
      }
      .link-icon {
        width: 24px;
        height: 24px;
      }
      /* Mobile Link Button */
      .mobile-link-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #fff;
        cursor: pointer;
        transition: all 0.2s ease;
        align-self: flex-end;
        margin-bottom: 8px; /* Gap logic */
        flex-shrink: 0;
      }

      .mobile-link-btn.active {
        background: var(--primary-color, #03a9f4);
        border-color: var(--primary-color, #03a9f4);
        box-shadow: 0 0 12px rgba(3, 169, 244, 0.4);
      }

      .mobile-link-btn svg {
        width: 24px;
        height: 24px;
        fill: currentColor;
      }

      /* Link Mode Active State - WRAPPING ENABLED, SCROLL DISABLED */
      .gs-stats-chips.mobile-link-active,
      .gs-device-chips.mobile-link-active {
        overflow-x: visible;
        flex-wrap: wrap;
        mask-image: none;
        -webkit-mask-image: none;
        justify-content: space-between;
      }
      .gs-stats-chips.mobile-link-active .stat-chip,
      .gs-device-chips.mobile-link-active .stat-chip {
        width: 90%;
      }
    }

    .scroll-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0.5;
      transition: opacity 0.2s;
      min-width: 24px;
      color: #fff;
    }

    .scroll-nav:hover {
      opacity: 1;
    }

    .scroll-nav svg {
      width: 24px;
      height: 24px;
      fill: currentColor;
    }

    @media (pointer: coarse) {
      .scroll-nav {
        display: none;
      }
    }

    .gs-stats-chips.mask-right {
      mask-image: linear-gradient(to right, black calc(100% - 40px), transparent 100%);
      -webkit-mask-image: linear-gradient(to right, black calc(100% - 40px), transparent 100%);
    }

    .gs-stats-chips.mask-left {
      mask-image: linear-gradient(to right, transparent 0%, black 40px, black 100%);
      -webkit-mask-image: linear-gradient(to right, transparent 0%, black 40px, black 100%);
    }

    .gs-stats-chips.mask-left.mask-right {
      mask-image: linear-gradient(
        to right,
        transparent 0%,
        black 40px,
        black calc(100% - 40px),
        transparent 100%
      );
      -webkit-mask-image: linear-gradient(
        to right,
        transparent 0%,
        black 40px,
        black calc(100% - 40px),
        transparent 100%
      );
    }
  `;

  private _handleDeviceChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    this.store.handleDeviceChange(target.value);
  }

  private _toggleEnvGraph(metric: string) {
    if (!this.historyController) return;
    this.historyController.toggleEnvGraph({ metric, visible: true });
  }

  private _handleChipDragStart(e: DragEvent, metric: string) {
    this._draggedMetric = metric;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', metric);
    }
  }

  private _handleChipDrop(e: DragEvent, targetMetric: string) {
    e.preventDefault();
    if (!this._draggedMetric || this._draggedMetric === targetMetric) {
      this._draggedMetric = null;
      return;
    }

    if (this.historyController) {
      this.historyController.linkGraphs(this._draggedMetric, targetMetric);
    }

    this._draggedMetric = null;
  }

  private _handleDragOver(e: DragEvent) {
    if (this._draggedMetric) {
      e.preventDefault();
    }
  }

  private _unlinkGraphs(groupIndex: number) {
    if (this.historyController) {
      this.historyController.unlinkGraphGroup(groupIndex);
    }
  }

  @state() private _mobileLink = false;
  @state() private _isCompact = false;
  @state() private _isMobileCheck = false;
  @state() private _hasTouch = false;

  connectedCallback() {
    super.connectedCallback();
    this._checkMobile();
    window.addEventListener('resize', this._checkMobileBound);
    if (this.historyController) {
      this.historyController.addListener(this._handleControllerUpdate);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this._checkMobileBound);
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    if (this.historyController) {
      this.historyController.removeListener(this._handleControllerUpdate);
    }
  }

  private _handleControllerUpdate = () => {
    this.requestUpdate();
  }

  private _checkMobileBound = () => this._checkMobile();

  private _checkMobile() {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const hasTouch = window.matchMedia('(pointer: coarse)').matches;

    if (this._isMobileCheck !== isMobile) {
      this._isMobileCheck = isMobile;
    }

    if (this._hasTouch !== hasTouch) {
      this._hasTouch = hasTouch;
    }
  }

  private get _chipDraggable(): string {
    if (this._isMobileCheck || this._hasTouch) {
      return this._mobileLink.toString();
    }
    return 'true';
  }

  private _triggerAction(action: string) {
    this._menuOpen = false;
    // Direct store method calls instead of event dispatch
    switch (action) {
      case 'add_plant':
        this.store.openAddPlantDialog();
        break;
      case 'config':
        this.store.setActiveDialog({
          type: 'CONFIG',
          payload: {
            currentTab: 'environment',
            environmentData: {
              selectedGrowspaceId: this.store.state.selectedDevice || '',
              temp_sensor: '',
              humidity_sensor: '',
              vpd_sensor: '',
              co2_sensor: '',
              circulation_fan: '',
              stress_threshold: 0.8,
              mold_threshold: 0.8,
            },
          },
        });
        break;
      case 'edit':
        this.store.setEditMode(!this.store.state.isEditMode);
        break;
      case 'control_dehumidifier':
        if (this.store.state.selectedDevice) {
          this.store.toggleDehumidifierControl(this.store.state.selectedDevice);
        }
        break;
      case 'compact':
        this.store.setIsCompactView(!this.store.state.isCompactView);
        break;
      case 'strains':
        this.store.fetchStrainLibrary();
        this.store.setActiveDialog({ type: 'STRAIN_LIBRARY', payload: {} });
        break;
      case 'irrigation':
        if (this.store.state.selectedDevice) {
          this.store.setActiveDialog({ type: 'IRRIGATION', payload: true });
        }
        break;
      case 'ai':
        this.store.setActiveDialog({
          type: 'GROW_MASTER',
          payload: {
            growspaceId: this.store.state.selectedDevice || '',
            isLoading: false,
            response: null,
            mode: 'single',
          },
        });
        break;
      case 'logbook':
        this.store.openLogbookDialog();
        break;
    }
  }

  render() {
    if (!this.device || !this.hass) return html``;

    const dominant = this._dominant;
    const envAttrs = this._envAttrs;

    return html`
      <div class="gs-stats-container">
        <div class="gs-header-top">
          <div class="gs-title-group">
            ${!this.config?.default_growspace
        ? html`
                  <select
                    class="growspace-select-header"
                    .value=${this.device.device_id}
                    @change=${this._handleDeviceChange}
                  >
                    ${Object.entries(this.growspaceOptions).map(
          ([id, name]) => html`<option value="${id}">${name}</option>`
        )}
                  </select>
                `
        : html` <h3 class="gs-title">${this.device.name}</h3> `}
            ${dominant
        ? html`
                  <div style="display: flex; gap: 8px;">
                    <div class="gs-stage-chip">
                      <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                        <path d="${PlantUtils.getPlantStageIcon(dominant.stage)}"></path>
                      </svg>
                      ${dominant.stage.charAt(0).toUpperCase() + dominant.stage.slice(1)} • Day
                      ${dominant.days}
                    </div>
                    <div class="gs-stage-chip">
                      <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                        <path d="${PlantUtils.getPlantStageIcon(dominant.stage)}"></path>
                      </svg>
                      ${dominant.stage.charAt(0).toUpperCase() + dominant.stage.slice(1)} • Week
                      ${Math.ceil(dominant.days / 7)}
                    </div>
                  </div>
                `
        : ''}
          </div>

          <div
            class="header-controls-container"
            style="display: flex; flex-direction: column; flex: 1; min-width: 0; gap: 4px;"
          >
            <div class="header-controls">
              <div
                class=${classMap({ 'mobile-link-btn': true, active: this._mobileLink })}
                @click=${() => (this._mobileLink = !this._mobileLink)}
              >
                <svg viewBox="0 0 24 24"><path d="${mdiLink}"></path></svg>
              </div>

              <div
                style="display: flex; align-items: center; flex: 1; min-width: 0; gap: 4px; overflow: hidden;"
              >
                ${this._canScrollLeft && !this._mobileLink
        ? html`
                      <div class="scroll-nav left" @click=${() => this._scrollChips('left')}>
                        <svg viewBox="0 0 24 24"><path d="${mdiChevronLeft}"></path></svg>
                      </div>
                    `
        : ''}

                <div
                  class=${classMap({
          'gs-stats-chips': true,
          'mobile-link-active': this._mobileLink,
          'mask-left': this._canScrollLeft,
          'mask-right': this._canScrollRight,
        })}
                  ${ref(this._chipsContainerRef)}
                >
                  ${this._mainChips.map(
          (chip) => html`
                      <growspace-chip
                        .icon=${chip.icon}
                        .label=${chip.label || ''}
                        .value=${chip.value}
                        .status=${chip.status || ''}
                        .active=${chip.active}
                        .linked=${chip.linked}
                        .tooltip=${chip.tooltip || ''}
                        draggable="${this._chipDraggable}"
                        @dragstart=${(e: DragEvent) => this._handleChipDragStart(e, chip.key)}
                        @drop=${(e: DragEvent) => this._handleChipDrop(e, chip.key)}
                        @dragover=${(e: DragEvent) => this._handleDragOver(e)}
                        @click=${(e: Event) => {
              if ((e.target as HTMLElement).closest('.link-icon')) return;
              this._toggleEnvGraph(chip.key);
            }}
                        @unlink=${() =>
              chip.groupIndex !== undefined && this._unlinkGraphs(chip.groupIndex)}
                      ></growspace-chip>
                    `
        )}
                </div>

                ${this._canScrollRight && !this._mobileLink
        ? html`
                      <div class="scroll-nav right" @click=${() => this._scrollChips('right')}>
                        <svg viewBox="0 0 24 24"><path d="${mdiChevronRight}"></path></svg>
                      </div>
                    `
        : ''}
              </div>

              <div class="menu-container">
                <div class="menu-button" @click=${() => (this._menuOpen = !this._menuOpen)}>
                  <svg viewBox="0 0 24 24"><path d="${mdiDotsVertical}"></path></svg>
                </div>
                ${this._menuOpen
        ? html`
                      <div class="menu-dropdown" @click=${(e: Event) => e.stopPropagation()}>
                        <div class="menu-item" @click=${() => this._triggerAction('config')}>
                          <svg viewBox="0 0 24 24"><path d="${mdiCog}"></path></svg>
                          <span class="menu-item-label">Config</span>
                        </div>
                        <div class="menu-item" @click=${() => this._triggerAction('edit')}>
                          <svg viewBox="0 0 24 24"><path d="${mdiPencil}"></path></svg>
                          <span class="menu-item-label">Edit</span>
                          <div
                            class=${classMap({
          'menu-toggle-switch': true,
          active: this.isEditMode,
        })}
                          ></div>
                        </div>
                        <div class="menu-item" @click=${() => this._triggerAction('compact')}>
                          <svg viewBox="0 0 24 24"><path d="${mdiMagnify}"></path></svg>
                          <span class="menu-item-label">Compact View</span>
                          <div
                            class=${classMap({ 'menu-toggle-switch': true, active: this.compact })}
                          ></div>
                        </div>
                        <div
                          class="menu-item"
                          @click=${() => this._triggerAction('control_dehumidifier')}
                        >
                          <svg viewBox="0 0 24 24"><path d="${mdiAirHumidifierOff}"></path></svg>
                          <span class="menu-item-label">Control Dehumidifier</span>
                          <div
                            class=${classMap({
          'menu-toggle-switch': true,
          active: !!envAttrs.dehumidifier_control_enabled,
        })}
                          ></div>
                        </div>
                        <div class="menu-item" @click=${() => this._triggerAction('strains')}>
                          <svg viewBox="0 0 24 24"><path d="${mdiDna}"></path></svg>
                          <span class="menu-item-label">Strains</span>
                        </div>
                        <div class="menu-item" @click=${() => this._triggerAction('irrigation')}>
                          <svg viewBox="0 0 24 24"><path d="${mdiWater}"></path></svg>
                          <span class="menu-item-label">Irrigation</span>
                        </div>
                        <div class="menu-item" @click=${() => this._triggerAction('ai')}>
                          <svg viewBox="0 0 24 24"><path d="${mdiBrain}"></path></svg>
                          <span class="menu-item-label">Ask AI</span>
                        </div>
                        <div class="menu-item" @click=${() => this._triggerAction('logbook')}>
                          <svg viewBox="0 0 24 24"><path d="${mdiClipboardTextClock}"></path></svg>
                          <span class="menu-item-label">Logbook</span>
                        </div>
                      </div>
                    `
        : ''}
              </div>
            </div>

            <div
              class=${classMap({ 'gs-device-chips': true, 'mobile-link-active': this._mobileLink })}
            >
              ${this._deviceChips.map(
          (chip) => html`
                  <growspace-chip
                    .icon=${chip.icon}
                    .label=${chip.label || ''}
                    .value=${chip.value}
                    .status=${chip.status || ''}
                    .active=${chip.active}
                    .linked=${chip.linked}
                    .tooltip=${chip.tooltip || ''}
                    draggable="${this._chipDraggable}"
                    @dragstart=${(e: DragEvent) => this._handleChipDragStart(e, chip.key)}
                    @drop=${(e: DragEvent) => this._handleChipDrop(e, chip.key)}
                    @dragover=${(e: DragEvent) => this._handleDragOver(e)}
                    @click=${(e: Event) => {
              if ((e.target as HTMLElement).closest('.link-icon')) return;
              this._toggleEnvGraph(chip.key);
            }}
                    @unlink=${() =>
              chip.groupIndex !== undefined && this._unlinkGraphs(chip.groupIndex)}
                  ></growspace-chip>
                `
        )}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
