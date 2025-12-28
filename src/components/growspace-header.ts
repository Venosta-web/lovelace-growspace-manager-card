import { LitElement, html, css, svg, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StoreController } from '@nanostores/lit';
// Global store imports removed
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
import './growspace-chip';
import { consume } from '@lit/context';
import { hassContext, configContext, storeContext } from '../context';
import { GrowspaceDevice, GrowspaceManagerCardConfig, IrrigationTime } from '../types';
import { MetricsUtils, HeaderChip, DominantStageInfo } from '../utils/metrics-utils';
import { ChartUtils } from '../utils/chart-utils';
import { ResizeController } from '../controllers/resize-controller';
import type { GrowspaceStore } from '../store/growspace-store';

@customElement('growspace-header')
export class GrowspaceHeader extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  public accessor hass!: HomeAssistant;

  @consume({ context: storeContext, subscribe: true })
  public accessor store!: GrowspaceStore;

  @consume({ context: configContext, subscribe: true })
  @property({ attribute: false })
  public accessor config!: GrowspaceManagerCardConfig;

  @property({ attribute: false }) public accessor device!: GrowspaceDevice;
  @property({ type: Boolean }) public accessor compact = false;
  @property({ type: Boolean }) public accessor isEditMode = false;
  // activeEnvGraphs and linkedGraphGroups removed as props, accessed via historyController in render or getters
  @property({ attribute: false }) public accessor growspaceOptions: Record<string, string> = {};
  @property({ attribute: false }) public accessor historyData: any[] | null = null;

  @state() private accessor _canScrollLeft = false;
  @state() private accessor _canScrollRight = false;
  @state() private accessor _canScrollStageLeft = false;
  @state() private accessor _canScrollStageRight = false;
  @state() private accessor _canScrollDeviceLeft = false;
  @state() private accessor _canScrollDeviceRight = false;
  @state() private accessor _menuOpen = false;
  @state() private accessor _mobileLink = false;

  // Reactivity Controllers
  private _viewModeController!: StoreController<string>;
  private _isEditModeController!: StoreController<boolean>;

  // Data Store Controllers
  private _devicesController!: StoreController<GrowspaceDevice[]>;
  private _selectedDeviceController!: StoreController<string | null>;

  // History Store Controllers
  private _historyCacheController!: StoreController<any>;
  private _historyLoadingController!: StoreController<boolean>;
  private _activeEnvGraphsController!: StoreController<Set<string>>;
  private _linkedGraphGroupsController!: StoreController<string[][]>;

  private _chipsContainerRef: Ref<HTMLDivElement> = createRef();
  private _stageContainerRef: Ref<HTMLDivElement> = createRef();
  private _deviceChipsContainerRef: Ref<HTMLDivElement> = createRef();
  private _resizeController = new ResizeController(this, () => this._checkScroll());

  // Cached metrics to avoid re-computation on every render
  private _mainChips: HeaderChip[] = [];
  private _deviceChips: HeaderChip[] = [];
  private _dominant: DominantStageInfo | undefined;
  private _envAttrs: import('../types').SerializedEnvironmentAttributes = {};
  private _draggedMetric: string | null = null;

  // Helper getters for clarity in render/compute
  get activeEnvGraphs() {
    return this._activeEnvGraphsController?.value || new Set();
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
      this._linkedGraphGroupsController?.value || []
    );
  }

  private _scrollChips(direction: 'left' | 'right') {
    const container = this._chipsContainerRef.value;
    if (container) {
      container.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
    }
  }

  private _scrollStage(direction: 'left' | 'right') {
    const container = this._stageContainerRef.value;
    if (container) {
      container.scrollBy({ left: direction === 'left' ? -100 : 100, behavior: 'smooth' });
    }
  }

  private _scrollDeviceChips(direction: 'left' | 'right') {
    const container = this._deviceChipsContainerRef.value;
    if (container) {
      container.scrollBy({ left: direction === 'left' ? -100 : 100, behavior: 'smooth' });
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

    const stageContainer = this._stageContainerRef.value;
    if (stageContainer) {
      this._canScrollStageLeft = stageContainer.scrollLeft > 1;
      this._canScrollStageRight =
        stageContainer.scrollLeft < stageContainer.scrollWidth - stageContainer.clientWidth - 1;
    }

    const deviceContainer = this._deviceChipsContainerRef.value;
    if (deviceContainer) {
      this._canScrollDeviceLeft = deviceContainer.scrollLeft > 1;
      this._canScrollDeviceRight =
        deviceContainer.scrollLeft < deviceContainer.scrollWidth - deviceContainer.clientWidth - 1;
    }
  }

  /*
   * Computes derived metrics for rendering.
   * Called by willUpdate (for reactive props) and _handleControllerUpdate (for controller events).
   */
  private _updateMetrics() {
    if (!this.device || !this.hass) {
      this._mainChips = [];
      this._deviceChips = [];
      this._dominant = undefined;
      this._envAttrs = {};
      return;
    }

    const { mainChips, deviceChips, dominant, envAttrs } = MetricsUtils.computeHeaderMetrics(
      this.hass,
      this.device,
      this.activeEnvGraphs,
      this._linkedGraphGroupsController?.value || []
    );

    this._mainChips = mainChips;
    this._deviceChips = deviceChips;
    this._dominant = dominant;
    this._envAttrs = envAttrs;
  }



  updated(changedProps: Map<string, any>) {
    if (changedProps.has('device')) {
      // Content might change size
      setTimeout(() => this._checkScroll(), 0);
    }
  }

  firstUpdated() {
    const container = this._chipsContainerRef.value;
    if (container) {
      container.addEventListener('scroll', () => this._checkScroll());
      this._resizeController.observe(container);
    }

    const stageContainer = this._stageContainerRef.value;
    if (stageContainer) {
      stageContainer.addEventListener('scroll', () => this._checkScroll());
      this._resizeController.observe(stageContainer);
    }

    const deviceContainer = this._deviceChipsContainerRef.value;
    if (deviceContainer) {
      deviceContainer.addEventListener('scroll', () => this._checkScroll());
      this._resizeController.observe(deviceContainer);
    }

    // Initial check
    setTimeout(() => this._checkScroll(), 0);
  }


  static styles = css`
    :host {
      display: block;
    }

    .gs-stats-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
      margin-bottom: 24px;
    }

    /* ABSOLUTE OVERLAY TRICK for Auto-Width Select */
    .select-wrapper {
        position: relative;
        display: inline-flex; /* Use inline-flex for tight wrapping */
        align-items: center;
        max-width: 100%;
        vertical-align: middle;
    }

    /* The visible text element that drives width */
    .select-sizer {
        font-family: 'Roboto', sans-serif;
        font-size: 3.5rem;
        font-weight: 300;
        margin: 0;
        line-height: 1.1;
        text-transform: capitalize;
        background: linear-gradient(135deg, var(--primary-text-color, #ffffff) 0%, var(--secondary-text-color, rgba(255, 255, 255, 0.9)) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        white-space: pre;
        pointer-events: none; /* Let clicks pass through to select */
        visibility: visible; /* Ensure it is seen */
    }

    /* The functional select element, invisible but clickable */
    .growspace-select-header {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0; /* Invisible */
        cursor: pointer;
        appearance: none;
        font-size: 2.5rem; /* Match size for approximate sizing if fallback */
        margin: 0;
        padding: 0;
    }

    .growspace-select-header option {
        color: initial; /* Reset color for dropdown options */
        background-color: initial;
    }

    .gs-stage-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      background: var(--secondary-background-color, rgba(255, 255, 255, 0.1));
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--primary-text-color, rgba(255, 255, 255, 0.9));
      width: fit-content;
      backdrop-filter: blur(8px);
    }

    /* --- Header Top Section --- */
    .gs-header-top {
      display: grid;
      grid-template-columns: minmax(280px, 25%) minmax(0, 1fr);
      grid-template-rows: auto auto;
      align-items: center;
      gap: 4px 16px;
    }

    .header-title-area {
        grid-column: 1;
        grid-row: 1;
        display: flex;
        align-items: center;
    }

    .header-actions {
        grid-column: 2;
        grid-row: 1;
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    .header-stage-area {
        grid-column: 1;
        grid-row: 2;
        display: flex;
        align-items: center;
        gap: 8px;
        overflow-x: auto;
        scrollbar-width: none;
        width: 100%;
        min-width: 0;
        max-width: 100%;
        padding-right: 16px;
        box-sizing: border-box;
        mask-image: linear-gradient(to right, black 90%, transparent 100%);
    }

    .gs-device-chips-container {
      display: flex;
      align-items: center;
      margin-right: 8px;
      overflow: hidden;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
      position: relative;
      margin-left: auto;
    }

    .gs-device-chips-header {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow-x: auto;
      scrollbar-width: none;
      min-width: 0;
      padding: 0 4px; /* Small padding for focus rings etc */
      scroll-behavior: smooth;
    }
    
    .gs-device-chips-header::-webkit-scrollbar { display: none; }
    
    .gs-device-chips-header growspace-chip {
        flex-shrink: 0;
    }

    /* --- Hero Grid (Vital Stats) --- */
    .hero-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      width: 100%;
      min-height: 50px;
    }

    .hero-card {
      background: var(--glass-bg, rgba(255, 255, 255, 0.05));
      border: var(--divider-color, rgba(255, 255, 255, 0.1));
      backdrop-filter: var(--glass-blur);
      box-shadow:
        0 4px 24px -1px rgba(0, 0, 0, 0.2),
        0 0 0 1px rgba(255, 255, 255, 0.02) inset;
      
      border-radius: 24px; /* Increased rounded corners */
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      position: relative;
      cursor: grab;
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      overflow: hidden;
      min-height: 110px;
    }

    .hero-card:active {
      cursor: grabbing;
      transform: scale(0.98);
    }
    
    .hero-card:hover {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.08)); /* Slightly lighter on hover */
        border-color: var(--divider-color, rgba(255, 255, 255, 0.15));
        box-shadow: 
             0 8px 32px -4px rgba(0, 0, 0, 0.3),
             0 0 0 1px rgba(255, 255, 255, 0.05) inset;
        transform: translateY(-2px);
    }

    .hero-card.linked {
        border-color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.08));
    }

    .hero-value-group {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }

    .hero-value {
      font-size: 2rem;
      font-weight: 400; /* Thinner for modern look */
      color: var(--primary-text-color, #fff);
      line-height: 1;
    }

    .hero-unit {
      font-size: 1rem;
      color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
      font-weight: 500;
    }
    .hero-icon {
        width: 20px;
        height: 20px;
        fill: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
    }

    .hero-label {
        font-size: 0.9rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
        font-weight: 500;
    }
    /* Active graph indication */
    .hero-card.active {
        background: color-mix(in srgb, var(--primary-color, #2196f3) 15%, var(--glass-bg, rgba(255, 255, 255, 0.05)));
        border-color: var(--primary-color, #2196f3);
        box-shadow: 
            0 8px 32px -4px rgba(0, 0, 0, 0.3),
            0 0 0 1px var(--primary-color, #2196f3) inset;
    }
    
    .hero-card.active .hero-value,
    .hero-card.active .hero-label, 
    .hero-card.active .hero-unit,
    .hero-card.active .hero-icon {
        color: var(--primary-text-color, #fff) !important;
        fill: var(--primary-text-color, #fff) !important;
    }

    /* Mini sparkline background for hero cards */
    .hero-sparkline {
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 50%;
        pointer-events: none;
        z-index: 0;
        opacity: 0.7;
    }

    .hero-sparkline path {
        transition: d 0.5s cubic-bezier(0.4, 0.0, 0.2, 1), stroke 0.3s ease, fill 0.3s ease;
    }

    .hero-value, .hero-unit {
        transition: color 0.3s ease, transform 0.3s ease;
    }

    .hero-value-group {
        position: relative;
        z-index: 1;
    }

    /* --- Secondary Strip (Scrollable) --- */
    .secondary-strip-container {
        position: relative;
        display: flex;
        align-items: center;
        border-radius: 16px;
        grid-column: 2;
        min-width: 0;
        width: 100%;
        overflow: hidden; 
        box-sizing: border-box;
    }

    .scroll-arrow {
        min-width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--secondary-text-color, rgba(255,255,255,0.7));
        cursor: pointer;
        border-radius: 50%;
        transition: background 0.2s;
    }
    .scroll-arrow:hover {
        background: rgba(255,255,255,0.1);
        color: var(--primary-text-color, #fff);
    }
    .scroll-arrow.hidden {
        opacity: 0;
        pointer-events: none;
        min-width: 0;
        width: 0;
        min-height: 0;
        height: 0;
    }
    .scroll-arrow svg { width: 20px; height: 20px; fill: currentColor; }

    .secondary-strip {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        gap: 12px;
        overflow-x: auto;
        overflow-y: hidden;
        flex: 1;
        width: 0;
        min-width: 0;
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* IE */
        padding: 8px 4px 8px 4px; 
        scroll-behavior: smooth;
    }
    .secondary-strip > growspace-chip:first-child {
        margin-left: auto;
    }
    .secondary-strip::-webkit-scrollbar { display: none; }

    .secondary-divider {
        width: 1px;
        height: 24px;
        background: var(--divider-color, rgba(255,255,255,0.15));
        flex-shrink: 0;
        margin: 0 4px;
    }

    /* Secondary Chips styling tweaks if needed */
    /* Reuse existing .stat-chip or use growspace-chip component */
    
    /* --- Mobile & Responsive --- */
    @media (max-width: 600px) {
        .gs-title { font-size: 2rem; }
        .hero-grid {
            gap: 12px;
        }
        .header-title-area {
          max-width: 70%;
        }
        .hero-value { font-size: 1.75rem; }
        
        .header-actions {
            grid-column: 1;
            grid-row: 3;
            justify-content: flex-start;
            justify-self: auto;
        }
        .gs-header-top {
            grid-template-columns: minmax(0, 1fr);
            position: relative; /* For absolute actions */
            gap: 8px;
        }

        /* Wrap secondary strip when link mode active */
        .secondary-strip.mobile-wrap {
            flex-wrap: wrap;
            height: auto;
            overflow-x: visible;
        }

        /* Absolute positioning for mobile actions */
        .icon-button.mobile-link {
            position: absolute;
            top: 0;
            right: 48px;
        }
        .menu-container {
            position: absolute !important;
            top: 0 !important;
            right: 0 !important;
        }

        /* Fix scroll issue with flex-end on mobile */
        .secondary-strip {
            justify-content: flex-start;
            flex-wrap: nowrap !important;
            overflow-x: auto !important;
            width: 100%; /* Ensure width is defined */
            max-width: 100%;
        }
        .secondary-strip-container {
            grid-row: 4;
            grid-column: 1;
        }
        /* Allow arrows if they fit logic */
        /* .secondary-strip-container .scroll-arrow { display: none; } REMOVED to allow arrows */
    }

    /* Menu & Buttons (Reused/Refined) */
    .menu-container { position: relative; }
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
    }
    .icon-button:hover { background: var(--secondary-background-color, rgba(255, 255, 255, 0.2)); }
    .icon-button svg { width: 22px; height: 22px; fill: currentColor; }
    
    .icon-button.mobile-link.active {
        background: var(--primary-color, #2196f3);
        border-color: var(--primary-color, #2196f3);
    }


    .menu-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 8px;
      background: var(--card-background-color, #2a2a2a);
      border: 1px solid var(--divider-color, rgba(255,255,255,0.1));
      border-radius: 12px;
      font-size: 0.9rem;
      min-width: 180px;
      z-index: 1000;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0,0,0,0.5);
    }
    .menu-item {
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        color: var(--primary-text-color, #ddd);
        transition: background 0.2s;
    }
    .menu-item:hover { background: var(--secondary-background-color, rgba(255,255,255,0.1)); color: var(--primary-text-color, #fff); }
    .menu-item svg { width: 20px; height: 20px; fill: currentColor; }
    .menu-item-label { flex: 1; }

    .menu-toggle-switch {
      width: 40px;
      height: 20px;
      background: var(--secondary-background-color, rgba(255, 255, 255, 0.2));
      border-radius: 10px;
      position: relative;
      transition: background 0.2s;
      flex-shrink: 0;
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
  `;

  private _handleDeviceChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    this.store.handleDeviceChange(target.value);
  }

  private _toggleEnvGraph(metric: string) {
    if (!this.store?.history) return;
    this.store.history.toggleEnvGraph(metric);
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

    if (this.store?.history) {
      this.store.history.linkGraphs(this._draggedMetric, targetMetric);
    }

    this._draggedMetric = null;
  }

  private _handleDragOver(e: DragEvent) {
    if (this._draggedMetric) {
      e.preventDefault();
    }
  }

  private _unlinkGraphs(groupIndex: number) {
    if (this.store?.history) {
      this.store.history.unlinkGraphGroup(groupIndex);
    }
  }



  connectedCallback() {
    super.connectedCallback();
    if (this.store) {
      this._viewModeController = new StoreController(this, this.store.ui.$viewMode);
      this._isEditModeController = new StoreController(this, this.store.ui.$isEditMode);
      this._devicesController = new StoreController(this, this.store.data.$devices);
      this._selectedDeviceController = new StoreController(this, this.store.data.$selectedDevice);
      this._historyCacheController = new StoreController(this, this.store.history.$historyCache);
      this._historyLoadingController = new StoreController(this, this.store.history.$historyLoading);
      this._activeEnvGraphsController = new StoreController(this, this.store.history.$activeEnvGraphs);
      this._linkedGraphGroupsController = new StoreController(this, this.store.history.$linkedGraphGroups);
    }
    this._updateMetrics();
  }

  protected willUpdate(changedProperties: Map<string, any>) {
    // Update metrics if key dependencies changed or if active graphs changed (StoreController handles the reactivity)
    if (
      changedProperties.has('device') ||
      changedProperties.has('hass') ||
      this._activeEnvGraphsController?.value
    ) {
      this._updateMetrics();
    }
  }

  private get _chipDraggable(): string {
    if (this._resizeController.isMobile || this._resizeController.hasTouch) {
      return this._mobileLink.toString();
    }
    return 'true';
  }

  private _triggerAction(action: string) {
    this._menuOpen = false;
    // Direct store method calls
    switch (action) {
      case 'add_plant':
        this.store.openAddPlantDialog();
        break;
      case 'config':
        this.store.ui.$activeDialog.set({
          type: 'CONFIG',
          payload: {
            currentTab: 'environment',
            environmentData: {
              selectedGrowspaceId: this._selectedDeviceController.value || '',
              temp_sensor: this.device?.environment_attributes?.temperature_sensor || '',
              humidity_sensor: this.device?.environment_attributes?.humidity_sensor || '',
              vpd_sensor: this.device?.environment_attributes?.vpd_sensor || '',
              co2_sensor: this.device?.environment_attributes?.co2_sensor || '',
              circulation_fan: this.device?.environment_attributes?.circulation_fan_entity || '',
              stress_threshold: 0.8,
              mold_threshold: 0.8,
              light_sensor: this.device?.environment_attributes?.light_sensor || '',
              exhaust_entity: this.device?.environment_attributes?.exhaust_entity || '',
              humidifier_entity: this.device?.environment_attributes?.humidifier_entity || '',
              dehumidifier_entity: this.device?.environment_attributes?.dehumidifier_entity || '',
              soil_moisture_sensor: this.device?.environment_attributes?.soil_moisture_sensor || '',
              control_dehumidifier: this.device?.environment_attributes?.dehumidifier_control_enabled || false,
              dehumidifier_thresholds: this.device?.environment_attributes?.dehumidifier_thresholds || {},
            } as any
          }
        });
        break;
      case 'edit':
        this.store.ui.setEditMode(!this._isEditModeController.value);
        break;
      case 'compact':
        // Legacy mapping; now should set ViewMode
        const currentMode = this._viewModeController.value;
        this.store.ui.setViewMode(currentMode === 'compact' ? 'standard' : 'compact');
        break;
      case 'strains':
        this.store.ui.setActiveDialog({ type: 'STRAIN_LIBRARY', payload: {} });
        break;
      case 'irrigation':
        if (this._selectedDeviceController.value) {
          this.store.ui.$activeDialog.set({ type: 'IRRIGATION', payload: {} });
        }
        break;
      case 'ai':
        this.store.ui.$activeDialog.set({
          type: 'GROW_MASTER',
          payload: { growspaceId: this._selectedDeviceController.value || '', isLoading: false, response: '', mode: 'single' }
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
    const devices = this._devicesController.value;

    // ⚡ Performance: Single-pass partitioning with Set.has() O(1) instead of Array.includes() O(n)
    // Reduces from 2 array iterations to 1, ~50% fewer iterations for chip splitting
    const heroKeySet = new Set(['temperature', 'humidity', 'vpd', 'co2']);
    const { heroChips, secondaryChips } = this._mainChips.reduce(
      (acc, chip) => {
        if (heroKeySet.has(chip.key)) {
          acc.heroChips.push(chip);
        } else {
          acc.secondaryChips.push(chip);
        }
        return acc;
      },
      { heroChips: [] as any[], secondaryChips: [] as any[] }
    );

    return html`
      <div class="gs-stats-container">
        
        <!-- TOP HEADER: Title + Actions -->
        <div class="gs-header-top">
          
          <!-- Row 1 Left: Title/Select -->
          <div class="header-title-area">
            ${!this.config?.default_growspace
        ? html`
            <div class="select-wrapper">
                <span class="select-sizer">${devices.find(d => d.device_id === this.device.device_id)?.name || this.device.name}</span>
                <select
                    class="growspace-select-header"
                    .value=${this.device.device_id}
                    @change=${this._handleDeviceChange}
                >
                    ${devices.map(
          (d) => html`<option value=${d.device_id}>${d.name}</option>`
        )}
                </select>
            </div>`
        : html`<h1 class="gs-title">${this.device.name}</h1>`
      }
          </div>

          <!-- Row 1 Right: Header Actions (Device Chips + Menu) -->
          <div class="header-actions">
              <div class="gs-device-chips-container">
                  <div class="scroll-arrow ${!this._canScrollDeviceLeft ? 'hidden' : ''}" @click=${() => this._scrollDeviceChips('left')}>
                      <svg viewBox="0 0 24 24"><path d="${mdiChevronLeft}"></path></svg>
                  </div>
                  <div class="gs-device-chips-header" ${ref(this._deviceChipsContainerRef)}>
                    ${this._deviceChips.map(chip => html`
                        <growspace-chip
                            .icon=${chip.icon}
                            .label=${chip.label}
                            .value=${chip.value}
                            .status=${chip.status}
                            .active=${chip.active}
                            .linked=${chip.linked}
                            .tooltip=${chip.tooltip}
                            draggable="${this._chipDraggable}"
                            @dragstart=${(e: DragEvent) => this._handleChipDragStart(e, chip.key)}
                            @drop=${(e: DragEvent) => this._handleChipDrop(e, chip.key)}
                            @dragover=${this._handleDragOver}
                            @click=${() => this._toggleEnvGraph(chip.key)}
                            @unlink=${(e: CustomEvent) => this._unlinkGraphs(chip.groupIndex)}
                        ></growspace-chip>
                    `)}
                  </div>
                  <div class="scroll-arrow ${!this._canScrollDeviceRight ? 'hidden' : ''}" @click=${() => this._scrollDeviceChips('right')}>
                      <svg viewBox="0 0 24 24"><path d="${mdiChevronRight}"></path></svg>
                  </div>
              </div>

             ${(this._resizeController.isMobile || this._resizeController.hasTouch) ? html`
                <div 
                    class="icon-button mobile-link ${this._mobileLink ? 'active' : ''}"
                    @click=${() => this._mobileLink = !this._mobileLink} 
                    title="Toggle Link Mode"
                >
                    <svg viewBox="0 0 24 24"><path d="${mdiLink}"></path></svg>
                </div>
             ` : ''}

             <div class="menu-container">
                <div class="icon-button" @click=${() => this._menuOpen = !this._menuOpen}>
                    <svg viewBox="0 0 24 24"><path d="${mdiDotsVertical}"></path></svg>
                </div>
                ${this._renderMenu()}
             </div>
          </div>
          
           <!-- Row 2 Left: Stage Chips -->
           <div class="header-stage-area-wrapper" style="grid-column: 1; grid-row: 2; display: flex; align-items: center; min-width: 0; position: relative;">
               <!-- Added arrows for stage if needed, using same logic or simplified -->
                <div class="scroll-arrow ${!this._canScrollStageLeft ? 'hidden' : ''}" @click=${() => this._scrollStage('left')}>
                    <svg viewBox="0 0 24 24"><path d="${mdiChevronLeft}"></path></svg>
                </div>
               <div class="header-stage-area" ${ref(this._stageContainerRef)}>
                 ${dominant
        ? html`
                         <div class="gs-stage-pill">
                             <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor"><path d="${dominant.icon}"></path></svg>
                             ${dominant.daysLabel}
                         </div>
                         <div class="gs-stage-pill">
                             <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor"><path d="${dominant.icon}"></path></svg>
                             ${dominant.weeksLabel}
                         </div>
                       `
        : ''}
               </div>
                <div class="scroll-arrow ${!this._canScrollStageRight ? 'hidden' : ''}" @click=${() => this._scrollStage('right')}>
                    <svg viewBox="0 0 24 24"><path d="${mdiChevronRight}"></path></svg>
                </div>
           </div>

          <!-- Row 2 Right: Secondary Strip -->
          <div class="secondary-strip-container">
            <div class="scroll-arrow ${!this._canScrollLeft ? 'hidden' : ''}" @click=${() => this._scrollChips('left')}>
                <svg viewBox="0 0 24 24"><path d="${mdiChevronLeft}"></path></svg>
            </div>
            
            <div 
                class="secondary-strip ${this._mobileLink ? 'mobile-wrap' : ''}"
                ${ref(this._chipsContainerRef)}
            >
                ${secondaryChips.map((chip: any) => html`
                    <growspace-chip
                        .icon=${chip.icon}
                        .label=${chip.label}
                        .value=${chip.value}
                        .status=${chip.status}
                        .active=${chip.active}
                        .linked=${chip.linked}
                        .tooltip=${chip.tooltip}
                        draggable="${this._chipDraggable}"
                        @dragstart=${(e: DragEvent) => this._handleChipDragStart(e, chip.key)}
                        @drop=${(e: DragEvent) => this._handleChipDrop(e, chip.key)}
                        @dragover=${this._handleDragOver}
                        @click=${() => this._toggleEnvGraph(chip.key)}
                        @unlink=${(e: CustomEvent) => this._unlinkGraphs(chip.groupIndex)}
                    ></growspace-chip>
                `)}
            </div>

            <div class="scroll-arrow ${!this._canScrollRight ? 'hidden' : ''}" @click=${() => this._scrollChips('right')}>
                <svg viewBox="0 0 24 24"><path d="${mdiChevronRight}"></path></svg>
            </div>
          </div>

        </div>


        <!-- HERO GRID (Vital Stats) -->
        <div class="hero-grid">
            ${heroChips.map((chip: any) => this._renderHeroCard(chip))}
        </div>
      </div>
    `;
  }

  private _renderHeroCard(chip: any) {
    const match = String(chip.value || '').match(/^([\d.,]+)\s*(.*)$/);
    const val = match ? match[1] : chip.value;
    const unit = match ? match[2] : '';

    // Generate sparkline path for this metric
    const sparklineWidth = 140; // Approximate card width
    const sparklineHeight = 80;  // Approximate card height minus padding

    // Get current time range from controller
    const timeRange = (this.store?.history as any)?.getRange() || '24h';

    // For VPD, try multi-segment coloring first, fall back to standard if no segments
    const isVpd = chip.key === 'vpd';

    let vpdSegments: Array<{ path: string; color: string }> = [];

    if (isVpd && this.store?.history && this.device) {
      const historyData = this._historyCacheController?.value?.['vpd'];
      const lightHistory = this._historyCacheController?.value?.['light'] || [];
      // Get VPD thresholds from device overview entity
      const overviewEntity = this.device.overview_entity_id
        ? this.hass?.states[this.device.overview_entity_id]
        : null;

      const defaultThresholds = { targetMin: 0.8, targetMax: 1.2, dangerMin: 0.4, dangerMax: 1.6 };

      const attrs = overviewEntity?.attributes || {};

      const day = {
        targetMin: attrs.day_vpd_target_min ?? attrs.vpd_target_min ?? 0.8,
        targetMax: attrs.day_vpd_target_max ?? attrs.vpd_target_max ?? 1.2,
        dangerMin: attrs.day_vpd_danger_min ?? attrs.vpd_danger_min ?? 0.4,
        dangerMax: attrs.day_vpd_danger_max ?? attrs.vpd_danger_max ?? 1.6,
      };

      const night = {
        targetMin: attrs.night_vpd_target_min ?? day.targetMin,
        targetMax: attrs.night_vpd_target_max ?? day.targetMax,
        dangerMin: attrs.night_vpd_danger_min ?? day.dangerMin,
        dangerMax: attrs.night_vpd_danger_max ?? day.dangerMax,
      };

      vpdSegments = ChartUtils.generateVpdSparklineSegments(
        historyData,
        sparklineWidth,
        sparklineHeight,
        { day, night },
        lightHistory,
        timeRange
      );
    }

    const useVpdSegments = isVpd && vpdSegments.length > 0;

    let sparklinePath = '';
    if (!useVpdSegments && this.store?.history) {
      sparklinePath = ChartUtils.generateSparklinePath(
        this._historyCacheController?.value?.[chip.key],
        sparklineWidth,
        sparklineHeight,
        timeRange
      );
    }

    const sparklineColor = ChartUtils.getSparklineColor(chip.key, chip.status);

    return html`
        <div 
            class="hero-card ${chip.status ? `status-${chip.status}` : ''} ${chip.active ? 'active' : ''} ${chip.linked ? 'linked' : ''}"
            draggable="${this._chipDraggable}"
            @dragstart=${(e: DragEvent) => this._handleChipDragStart(e, chip.key)}
            @drop=${(e: DragEvent) => this._handleChipDrop(e, chip.key)}
            @dragover=${this._handleDragOver}
            @click=${() => this._toggleEnvGraph(chip.key)}
            title="${chip.tooltip || ''}"
        >
            <!-- Mini sparkline background -->
            ${useVpdSegments ? html`
              <svg 
                class="hero-sparkline" 
                viewBox="0 0 ${sparklineWidth} ${sparklineHeight}" 
                preserveAspectRatio="none"
                style="overflow: visible;"
              >
                <!-- Transparent rect to establish dimensions -->
                <rect x="0" y="0" width="${sparklineWidth}" height="${sparklineHeight}" fill="transparent" />
                ${vpdSegments.map(seg => svg`
                  <path 
                    d="${seg.path}" 
                    fill="none" 
                    stroke="${seg.color}" 
                    stroke-width="2.5" 
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                `)}
              </svg>
            ` : sparklinePath ? html`
              <svg 
                class="hero-sparkline" 
                viewBox="0 0 ${sparklineWidth} ${sparklineHeight}" 
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="sparkline-grad-${chip.key}" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="${sparklineColor}" stop-opacity="0.3" />
                    <stop offset="100%" stop-color="${sparklineColor}" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <path 
                  d="${sparklinePath} V ${sparklineHeight} H 0 Z" 
                  fill="url(#sparkline-grad-${chip.key})" 
                />
                <path 
                  d="${sparklinePath}" 
                  fill="none" 
                  stroke="${sparklineColor}" 
                  stroke-width="2" 
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            ` : ''}

            <div class="hero-value-group">
                <span class="hero-value">${val}</span>
                <span class="hero-unit">${unit}</span>
            </div>
        </div>
    `;
  }

  private _renderMenu() {
    if (!this._menuOpen) return '';
    return html`
      <div class="menu-dropdown" @click=${(e: Event) => e.stopPropagation()}>
        <div class="menu-item" @click=${() => this._triggerAction('config')}>
            <svg viewBox="0 0 24 24"><path d="${mdiCog}"></path></svg>
            <span class="menu-item-label">Config</span>
        </div>
        <div class="menu-item" @click=${() => this._triggerAction('edit')}>
            <svg viewBox="0 0 24 24"><path d="${mdiPencil}"></path></svg>
            <span class="menu-item-label">Edit</span>
            <div class=${classMap({ 'menu-toggle-switch': true, active: this._isEditModeController.value })}></div>
        </div>
        <div class="menu-item" @click=${() => this._triggerAction('compact')}>
            <svg viewBox="0 0 24 24"><path d="${mdiMagnify}"></path></svg>
            <span class="menu-item-label">Compact View</span>
            <div class=${classMap({ 'menu-toggle-switch': true, active: this._viewModeController.value === 'compact' })}></div>
        </div>
        <div class="menu-item" @click=${() => this._triggerAction('control_dehumidifier')}>
            <svg viewBox="0 0 24 24"><path d="${mdiAirHumidifierOff}"></path></svg>
            <span class="menu-item-label">Control Dehumidifier</span>
            <div class=${classMap({ 'menu-toggle-switch': true, active: !!this._envAttrs.dehumidifier_control_enabled })}></div>
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
    `;
  }
}
