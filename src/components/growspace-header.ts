import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StoreController } from '@nanostores/lit';
import { HomeAssistant } from 'custom-card-helpers';

import { consume } from '@lit/context';
import { hassContext, configContext, storeContext } from '../context';
import { GrowspaceDevice, GrowspaceManagerCardConfig, NutrientInventory } from '../types';
import { MetricsUtils, HeaderChip, DominantStageInfo } from '../utils/metrics-utils';
import { ResizeController } from '../controllers/resize-controller';
import type { GrowspaceStore } from '../store/core/growspace-store';

import { headerStyles } from '../styles/header.styles';
import './growspace-header/header-actions';
import './growspace-header/header-hero';
import './growspace-header/header-stages';
import './growspace-header/header-secondary';
import { HeaderDragController } from '../controllers/header-drag-controller';

@customElement('growspace-header')
export class GrowspaceHeader extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  public hass!: HomeAssistant;

  @consume({ context: storeContext, subscribe: true })
  public store!: GrowspaceStore;

  @consume({ context: configContext, subscribe: true })
  @property({ attribute: false })
  public config!: GrowspaceManagerCardConfig;

  @property({ attribute: false }) public device!: GrowspaceDevice;
  @property({ type: Boolean }) public compact = false;
  @property({ type: Boolean }) public isEditMode = false;
  @property({ attribute: false }) public growspaceOptions: Record<string, string> = {};
  @property({ attribute: false }) public historyData: unknown[] | null = null;

  // Combined controller replacing devices + nutrientInventory + headerHistory
  private _headerController!: StoreController<{
    devices: GrowspaceDevice[];
    nutrientInventory: NutrientInventory | null;
    history: { historyCache: Record<string, any>; historyLoading: boolean; activeEnvGraphs: Set<string>; linkedGraphGroups: string[][] };
  }>;

  private _resizeController = new ResizeController(this, () => { });

  // Cached metrics to avoid re-computation on every render
  private _mainChips: HeaderChip[] = [];
  private _deviceChips: HeaderChip[] = [];
  private _dominant: DominantStageInfo | undefined;
  private _envAttrs: import('../types').SerializedEnvironmentAttributes = {};
  private _dragController = new HeaderDragController(this);
  @state() private _mobileLink = false;

  // Helper getters
  get activeEnvGraphs() {
    return this._headerController?.value?.history?.activeEnvGraphs || new Set();
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
      this._headerController?.value?.history?.linkedGraphGroups || []
    );

    this._mainChips = mainChips;
    this._deviceChips = deviceChips;
    this._dominant = dominant;
    this._envAttrs = envAttrs;
  }

  private _initControllers() {
    if (this.store && !this._headerController) {
      this._headerController = new StoreController(this, this.store.$headerState);

      // Load history data when header is mounted (important for header-only view mode)
      this.store.history.loadHistoryOnDemand();
      // Start auto-refresh for hero sparklines even without analytics view
      this.store.history.startAutoRefresh();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._initControllers();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  // Memoization helper to prevent re-calc if inputs haven't changed
  private _lastUpdateArgs: unknown[] = [];

  private _shouldUpdateMetrics(): boolean {
    const args = [
      this.device?.deviceId,
      this.activeEnvGraphs,
      this._headerController?.value?.history?.linkedGraphGroups,
    ];
    const changed =
      !this._lastUpdateArgs.length || args.some((arg, i) => arg !== this._lastUpdateArgs[i]);
    if (changed) {
      this._lastUpdateArgs = args;
    }
    return changed;
  }

  // Perform metrics calculation before update to ensure data is ready for render
  willUpdate(changedProps: Map<PropertyKey, unknown>) {
    if (changedProps.has('store')) {
      this._initControllers();
    }

    // Only update metrics if relevant data changed
    if (changedProps.has('device') || this._shouldUpdateMetrics()) {
      this._updateMetrics();
    }

    // Re-fetch history when device changes so sparklines show fresh data
    if ((changedProps.has('device') || changedProps.has('store')) && this.store?.history) {
      this.store.history.loadHistoryOnDemand();
    }
  }

  private _handleDeviceChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    this.store.handleDeviceChange(target.value);
  }

  private _toggleEnvGraph(metric: string) {
    if (!this.store) return;
    this.store.toggleEnvGraph(metric);
  }

  private _handleChipDragStart(e: DragEvent | null, metric: string) {
    this._dragController.handleDragStart(e, metric);
  }

  private _handleChipDrop(e: DragEvent | null, targetMetric: string) {
    this._dragController.handleDrop(e, targetMetric, (source, target) => {
      if (this.store?.history) {
        this.store.history.linkGraphs(source, target);
      }
    });
  }

  private _unlinkGraphs(groupIndex: number) {
    if (this.store?.history) {
      this.store.history.unlinkGraphGroup(groupIndex);
    }
  }

  private _handleToggleMobileLink() {
    this._mobileLink = !this._mobileLink;
  }

  static styles = headerStyles;

  render() {
    if (!this.device || !this.hass) return html``;

    const devices = this._headerController?.value?.devices || [];
    const deviceId = this.device.deviceId;

    // Split chips into Hero and Secondary sets (Restoring original logic)
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
      { heroChips: [] as HeaderChip[], secondaryChips: [] as HeaderChip[] }
    );

    return html`
      <div class="gs-stats-container">
        <!-- TOP HEADER GRID -->
        <div class="gs-header-top">
          <!-- Row 1 Left: Title/Select -->
          <div class="header-title-area">
            ${!this.config?.default_growspace
        ? html` <div class="select-wrapper">
                  <div class="select-sizer">${this.device.name || 'Select Growspace'}</div>
                  <select
                    class="growspace-select-header"
                    .value=${deviceId}
                    @change=${this._handleDeviceChange}
                  >
                    ${devices.map((d) => html`<option value="${d.deviceId}">${d.name}</option>`)}
                  </select>
                </div>`
        : html`<h1 class="gs-title">${this.device.name}</h1>`}
          </div>

          <!-- Row 1 Right: Actions & Device Chips -->
          <growspace-header-actions
            class="header-actions"
            .deviceChips=${this._deviceChips}
            .isMobile=${this._resizeController.isMobile}
            .mobileLink=${this._mobileLink}
            @toggle-graph=${(e: CustomEvent) => this._toggleEnvGraph(e.detail.metric)}
            @chip-drag-start=${(e: CustomEvent) => this._handleChipDragStart(null, e.detail.metric)}
            @chip-drop=${(e: CustomEvent) => this._handleChipDrop(null, e.detail.targetMetric)}
            @toggle-mobile-link=${() => this._handleToggleMobileLink()}
          ></growspace-header-actions>

          <!-- Row 2 Left: Stages -->
          <div class="header-stage-area-wrapper">
            <growspace-header-stages .dominant=${this._dominant}></growspace-header-stages>
          </div>

          <!-- Row 2 Right: Secondary Chips & Inventory -->
          <div class="secondary-strip-container">
            <growspace-header-secondary
              .chips=${secondaryChips}
              .inventory=${this._headerController?.value?.nutrientInventory || null}
              .compact=${this.compact}
              .isMobile=${this._resizeController.isMobile}
              .mobileLink=${this._mobileLink}
              @open-nutrients=${() => this.store.openNutrientsDialog()}
              @toggle-graph=${(e: CustomEvent) => this._toggleEnvGraph(e.detail.metric)}
              @chip-drag-start=${(e: CustomEvent) =>
        this._handleChipDragStart(null, e.detail.metric)}
              @chip-drop=${(e: CustomEvent) => this._handleChipDrop(null, e.detail.targetMetric)}
              @unlink-graphs=${(e: CustomEvent) => this._unlinkGraphs(e.detail.groupIndex)}
            ></growspace-header-secondary>
          </div>
        </div>

        <!-- HERO GRID (Vital Stats) -->
        <growspace-header-hero
          .chips=${heroChips}
          .device=${this.device}
          .isMobile=${this._resizeController.isMobile}
          .mobileLink=${this._mobileLink}
          @toggle-graph=${(e: CustomEvent) => this._toggleEnvGraph(e.detail.metric)}
          @chip-drag-start=${(e: CustomEvent) => this._handleChipDragStart(null, e.detail.metric)}
          @chip-drop=${(e: CustomEvent) => this._handleChipDrop(null, e.detail.targetMetric)}
        ></growspace-header-hero>
      </div>
    `;
  }
}
