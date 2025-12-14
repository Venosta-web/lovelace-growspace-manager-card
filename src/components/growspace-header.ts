import { LitElement, html, css, svg, TemplateResult } from 'lit';
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
      --glass-bg: rgba(255, 255, 255, 0.05);
      --glass-border: 1px solid rgba(255, 255, 255, 0.1);
      --glass-blur: blur(12px);
    }

    .gs-stats-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* --- Header Top Section --- */
    .gs-header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }

    .gs-title-group {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
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
        font-size: 2.5rem;
        font-weight: 300;
        margin: 0;
        line-height: 1.1;
        text-transform: capitalize;
        background: linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.9) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
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
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);
      width: fit-content;
      backdrop-filter: blur(8px);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* --- Hero Grid (Vital Stats) --- */
    .hero-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 16px;
      width: 100%;
      min-height: 50px;
    }

    .hero-card {
      background: var(--glass-bg);
      border: var(--glass-border);
      backdrop-filter: var(--glass-blur);
      border-radius: 20px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      position: relative;
      cursor: grab;
      transition: transform 0.2s, box-shadow 0.2s;
      overflow: hidden;
      min-height: 110px;
    }

    .hero-card:active {
      cursor: grabbing;
      transform: scale(0.98);
    }
    
    .hero-card:hover {
        background: rgba(255, 255, 255, 0.08);
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    .hero-card.linked {
        border-color: rgba(255, 255, 255, 0.3);
        background: rgba(255, 255, 255, 0.08);
    }

    .hero-value-group {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }

    .hero-value {
      font-size: 2rem;
      font-weight: 400; /* Thinner for modern look */
      color: #fff;
      line-height: 1;
    }

    .hero-unit {
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.6);
      font-weight: 500;
    }
    .hero-icon {
        width: 20px;
        height: 20px;
        fill: rgba(255, 255, 255, 0.7);
    }

    .hero-label {
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.7);
        font-weight: 500;
    }

    /* Status Indicators for Hero Cards via bottom border/bar */
    .hero-status-bar {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: rgba(255,255,255,0.1);
    }
    .status-optimal .hero-status-bar { background: #4caf50;box-shadow: 0 -2px 8px rgba(76, 175, 80, 0.4); }
    .status-warning .hero-status-bar { background: #ff9800;box-shadow: 0 -2px 8px rgba(255, 152, 0, 0.4); }
    .status-danger .hero-status-bar { background: #f44336;box-shadow: 0 -2px 8px rgba(244, 67, 54, 0.4); }
    
    /* Active graph indication */
    .hero-card.active {
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.4);
    }

    /* Mini sparkline background for hero cards */
    .hero-sparkline {
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 0;
        opacity: 0.7;
    }

    .hero-value-group,
    .hero-status-bar {
        position: relative;
        z-index: 1;
    }

    /* --- Secondary Strip (Scrollable) --- */
    .secondary-strip-container {
        position: relative;
        display: flex;
        align-items: center;
        gap: 8px; /* For arrows */
        background: var(--glass-bg);
        border: var(--glass-border);
        backdrop-filter: var(--glass-blur);
        border-radius: 16px;
        padding: 4px;
        width: 100%;
        box-sizing: border-box;
    }

    .scroll-arrow {
        min-width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(255,255,255,0.7);
        cursor: pointer;
        border-radius: 50%;
        transition: background 0.2s;
    }
    .scroll-arrow:hover {
        background: rgba(255,255,255,0.1);
        color: #fff;
    }
    .scroll-arrow.hidden {
        opacity: 0;
        pointer-events: none;
    }
    .scroll-arrow svg { width: 20px; height: 20px; fill: currentColor; }

    .secondary-strip {
        display: flex;
        align-items: center;
        gap: 12px;
        overflow-x: auto;
        overflow-y: hidden;
        flex: 1;
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* IE */
        padding: 8px 4px;
        scroll-behavior: smooth;
    }
    .secondary-strip::-webkit-scrollbar { display: none; }

    .secondary-divider {
        width: 1px;
        height: 24px;
        background: rgba(255,255,255,0.15);
        flex-shrink: 0;
        margin: 0 4px;
    }

    /* Secondary Chips styling tweaks if needed */
    /* Reuse existing .stat-chip or use growspace-chip component */
    
    /* --- Mobile & Responsive --- */
    @media (max-width: 600px) {
        .gs-title { font-size: 2rem; }
        .hero-grid {
            grid-template-columns: 1fr 1fr; /* 2 cols on mobile */
            gap: 12px;
        }
        .hero-value { font-size: 1.75rem; }
        
        .header-actions {
            position: absolute;
            top: 0;
            right: 0;
        }
        .gs-header-top {
            position: relative; /* For absolute actions */
            flex-direction: column;
            gap: 8px;
        }

        /* Wrap secondary strip when link mode active */
        .secondary-strip.mobile-wrap {
            flex-wrap: wrap;
            height: auto;
            overflow-x: visible;
        }
    }

    /* Menu & Buttons (Reused/Refined) */
    .icon-button {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      cursor: pointer;
      transition: all 0.2s;
    }
    .icon-button:hover { background: rgba(255, 255, 255, 0.2); }
    .icon-button svg { width: 22px; height: 22px; fill: currentColor; }
    
    .icon-button.mobile-link.active {
        background: var(--primary-color, #2196f3);
        border-color: var(--primary-color, #2196f3);
    }

    .menu-container { position: relative; }
    .menu-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 8px;
      background: #2a2a2a;
      border: 1px solid rgba(255,255,255,0.1);
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
        color: #ddd;
        transition: background 0.2s;
    }
    .menu-item:hover { background: rgba(255,255,255,0.1); color: #fff; }
    .menu-item svg { width: 20px; height: 20px; fill: currentColor; }
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
    // Direct store method calls
    switch (action) {
      case 'add_plant':
        this.store.openAddPlantDialog();
        break;
      case 'config':
        this.store.setActiveDialog({
          type: 'CONFIG',
          payload: {
            currentTab: 'environment', // Default tab
            environmentData: {
              selectedGrowspaceId: this.store.state.selectedDevice || '',
              // Pass minimal defaults; store handles merging usually, or fetching
              temp_sensor: '', humidity_sensor: '', vpd_sensor: '', co2_sensor: '',
              circulation_fan: '', stress_threshold: 0.8, mold_threshold: 0.8
            }
          }
        });
        break;
      case 'edit':
        this.store.setEditMode(!this.store.state.isEditMode);
        break;
      case 'compact':
        // Legacy mapping; now should set ViewMode
        const currentMode = this.store.state.viewMode;
        this.store.setViewMode(currentMode === 'compact' ? 'standard' : 'compact');
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
          payload: { growspaceId: this.store.state.selectedDevice || '', isLoading: false, response: null, mode: 'single' }
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

    // Split Chips
    const heroKeys = ['temperature', 'humidity', 'vpd', 'co2'];
    // Filter chips and force valid status/value if testing
    const heroChips = this._mainChips.filter(c => heroKeys.includes(c.key));
    const secondaryChips = this._mainChips.filter(c => !heroKeys.includes(c.key));

    return html`
      <div class="gs-stats-container">
        
        <!-- TOP HEADER: Title + Actions -->
        <div class="gs-header-top">
          <div class="gs-title-group">
            ${!this.config?.default_growspace
        ? html`
            <div class="select-wrapper">
                <!-- Hidden span to drive width based on selected value -->
                <span class="select-sizer">${this.store.state.devices.find(d => d.device_id === this.device.device_id)?.name || this.device.name}</span>
                <select
                    class="growspace-select-header"
                    .value=${this.device.device_id}
                    @change=${this._handleDeviceChange}
                >
                    ${this.store.state.devices.map(
          (d) => html`<option value=${d.device_id}>${d.name}</option>`
        )}
                </select>
            </div>`
        : html`<h1 class="gs-title">${this.device.name}</h1>`
      }
            
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

          <div class="header-actions">
             ${(this._isMobileCheck || this._hasTouch) ? html`
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
        </div>

        <!-- HERO GRID (Vital Stats) -->
        <div class="hero-grid">
            ${heroChips.map(chip => this._renderHeroCard(chip))}
        </div>

        <!-- SECONDARY STRIP (Scrollable) -->
        <div class="secondary-strip-container">
            <div class="scroll-arrow ${!this._canScrollLeft ? 'hidden' : ''}" @click=${() => this._scrollChips('left')}>
                <svg viewBox="0 0 24 24"><path d="${mdiChevronLeft}"></path></svg>
            </div>
            
            <div 
                class="secondary-strip ${this._mobileLink ? 'mobile-wrap' : ''}"
                ${ref(this._chipsContainerRef)}
            >
                <!-- Secondary Metrics -->
                ${secondaryChips.map(chip => html`
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

                ${this._deviceChips.length > 0 && secondaryChips.length > 0 ? html`<div class="secondary-divider"></div>` : ''}

                <!-- Device Chips -->
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

            <div class="scroll-arrow ${!this._canScrollRight ? 'hidden' : ''}" @click=${() => this._scrollChips('right')}>
                <svg viewBox="0 0 24 24"><path d="${mdiChevronRight}"></path></svg>
            </div>
        </div>

      </div>
    `;
  }

  /**
   * Generates an SVG path string for a mini sparkline from history data.
   * Returns empty string if not enough data points.
   * Downsamples to ~8 points per hour (192 points on 24h grid) for performance.
   */
  private _generateSparklinePath(metricKey: string, width: number, height: number): string {
    if (!this.historyController) return '';

    const historyData = this.historyController.historyCache[metricKey];
    if (!historyData || historyData.length < 2) return '';

    // Sort by time and extract numeric values
    let sortedData = [...historyData]
      .sort((a, b) => new Date(a.last_changed).getTime() - new Date(b.last_changed).getTime())
      .filter(h => {
        const val = parseFloat(h.state);
        return !isNaN(val) && h.state !== 'unavailable' && h.state !== 'unknown';
      });

    if (sortedData.length < 2) return '';

    // Downsample to ~192 points (8 per hour on 24h grid) for performance
    const targetPoints = 192;
    if (sortedData.length > targetPoints) {
      const step = Math.ceil(sortedData.length / targetPoints);
      sortedData = sortedData.filter((_, i) => i % step === 0 || i === sortedData.length - 1);
    }

    const values = sortedData.map(h => parseFloat(h.state));
    const times = sortedData.map(h => new Date(h.last_changed).getTime());

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    const valueRange = maxVal - minVal || 1;
    const timeRange = maxTime - minTime || 1;

    // Generate SVG path points
    const points = sortedData.map((h, i) => {
      const x = ((times[i] - minTime) / timeRange) * width;
      const y = height - ((values[i] - minVal) / valueRange) * height;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }

  /**
   * Gets the sparkline color based on the metric's configured color from METRIC_CONFIG.
   */
  private _getSparklineColor(metricKey: string): string {
    const config = METRIC_CONFIG[metricKey];
    return config?.color || 'rgba(255, 255, 255, 0.3)';
  }

  private _renderHeroCard(chip: any) {
    const match = String(chip.value || '').match(/^([\d.,]+)\s*(.*)$/);
    const val = match ? match[1] : chip.value;
    const unit = match ? match[2] : '';

    // Generate sparkline path for this metric
    const sparklineWidth = 140; // Approximate card width
    const sparklineHeight = 80;  // Approximate card height minus padding
    const sparklinePath = this._generateSparklinePath(chip.key, sparklineWidth, sparklineHeight);
    const sparklineColor = this._getSparklineColor(chip.key);

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
            ${sparklinePath ? html`
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

            ${chip.status ? html`<div class="hero-status-bar"></div>` : ''}
        </div>
    `;
  }

  private _renderMenu() {
    if (!this._menuOpen) return '';
    return html`
      <div class="menu-dropdown">
        <div class="menu-item" @click=${() => this._triggerAction('add_plant')}>
            <svg viewBox="0 0 24 24"><path d="${mdiPencil}"></path></svg>
            <span>Add Plant</span>
        </div>
        <div class="menu-item" @click=${() => this._triggerAction('edit')}>
             <div class="menu-toggle-switch ${this.store.state.isEditMode ? 'active' : ''}"></div>
             <span>Edit Mode</span>
        </div>
        <div class="menu-item" @click=${() => this._triggerAction('compact')}>
             <div class="menu-toggle-switch ${this.store.state.viewMode === 'compact' ? 'active' : ''}"></div>
             <span>Compact View</span>
        </div>
        <div class="menu-item" @click=${() => this._triggerAction('strains')}>
            <svg viewBox="0 0 24 24"><path d="${mdiDna}"></path></svg>
            <span>Strain Library</span>
        </div>
        <div class="menu-item" @click=${() => this._triggerAction('logbook')}>
            <svg viewBox="0 0 24 24"><path d="${mdiClipboardTextClock}"></path></svg>
            <span>Logbook</span>
        </div>
        <div class="menu-item" @click=${() => this._triggerAction('irrigation')}>
            <svg viewBox="0 0 24 24"><path d="${mdiWater}"></path></svg>
            <span>Irrigation Manager</span>
        </div>
        <div class="menu-item" @click=${() => this._triggerAction('ai')}>
            <svg viewBox="0 0 24 24"><path d="${mdiBrain}"></path></svg>
            <span>Ask GrowMaster</span>
        </div>
        <div class="menu-item" @click=${() => this._triggerAction('config')}>
            <svg viewBox="0 0 24 24"><path d="${mdiCog}"></path></svg>
            <span>Settings</span>
        </div>
      </div>
    `;
  }
}
