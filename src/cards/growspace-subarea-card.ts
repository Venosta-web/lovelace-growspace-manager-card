import {
  LitElement,
  html,
  css,
  CSSResultGroup,
  PropertyValues,
  TemplateResult,
  nothing,
} from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { provide } from '@lit/context';
import { mdiCog } from '@mdi/js';

import { hassContext, configContext, storeContext } from '../lib/context';
import { DATA_STALE_EVENT } from '../features/shared/events';
import { HomeAssistant, LovelaceCard, LovelaceCardEditor } from 'custom-card-helpers';

import type { GrowspaceManagerCardConfig } from '../lib/types/config';
import { getSubareas } from '../slices/subarea';
import type { Subarea } from '../slices/subarea';
import { setSubareaEnvSnapshot, subareaEnvSnapshots$ } from '../slices/environment';
import type { EnvSnapshot, SensorReadings } from '../slices/environment';
import { setSubareaDeviceSnapshot, subareaDeviceSnapshots$ } from '../slices/device-state';
import { computeHeaderMetrics } from '../slices/header-metrics';
import { setHass } from '../services/hass-call';
import { getHistoryStats } from '../store/history/history-store';
import { ConfigTab } from '../features/environment/constants';
import type { HistoryTimeRange } from '../features/environment/constants';
import { ResizeController } from '../controllers/resize-controller';

import '../features/shared/ui/error-boundary';
import '../features/ui/containers/growspace-header.container';
import '../features/ui/containers/growspace-analytics.container';

import '../features/ui/components/growspace-header-hero-ui';
import '../features/ui/components/growspace-header-secondary-ui';
import '../features/shared/ui/growspace-chip';
import { filterChips } from '../utils/chip-filter';

import { sharedStyles } from '../styles/shared.styles';
import { uiStyles } from '../styles/ui.styles';
import { growspaceCardStyles } from '../styles/growspace-card.styles';
import { variables } from '../styles/variables';

import { GrowspaceStore } from '../store/core/growspace-store';
import { toggleEnvGraph } from '../slices/ui';
import { metricHistoryKeys } from '../slices/metric-descriptors';
import { BootstrapController } from '../controllers/bootstrap.controller';
import { StoreController } from '@nanostores/lit';
import { growspaceStoreRegistry } from '../store/core/growspace-store-registry';
import { LAZY_CHUNKS, LazyChunk, loadLazyChunk } from '../lib/lazy-chunk';
import { lazyChunkErrorEditor } from '../features/shared/ui/lazy-chunk-error';

export interface GrowspaceSubareaCardConfig extends GrowspaceManagerCardConfig {
  /** Legacy key retained for existing dashboard configurations. */
  growspace_id?: string;
  subarea_id: string;
}

/**
 * Metric → entity-ID lists for the subarea history fetch, derived from the
 * subarea EnvSnapshot's SensorReadings (ADR-0018). The snapshot is the single
 * source of resolved entity IDs, so the history cache keys structurally match
 * what the chips display — both read the same snapshot field.
 */
export function deriveSubareaMetricEntities(
  snapshot: EnvSnapshot
): Array<{ metric: string; entityIds: string[] }> {
  const readings: Array<[string, SensorReadings | null]> = [
    ['temperature', snapshot.temperatureReadings],
    ['humidity', snapshot.humidityReadings],
    ['vpd', snapshot.vpdReadings],
    ['co2', snapshot.co2Readings],
  ];

  const metricEntities: Array<{ metric: string; entityIds: string[] }> = [];
  for (const [metric, reading] of readings) {
    if (reading && reading.entityIds.length > 0) {
      metricEntities.push({ metric, entityIds: [...reading.entityIds] });
    }
  }
  return metricEntities;
}

@customElement('growspace-subarea-card')
export class GrowspaceSubareaCard extends LitElement implements LovelaceCard {
  private _sharedStore = growspaceStoreRegistry.acquire();

  @provide({ context: storeContext })
  store = new GrowspaceStore(this._sharedStore);

  protected _viewController = new StoreController(this, this.store.$sharedCardViewState);
  private _bootstrapCtrl!: BootstrapController;
  protected _subareaEnvController = new StoreController(this, subareaEnvSnapshots$);
  protected _subareaDeviceController = new StoreController(this, subareaDeviceSnapshots$);
  private _resizeController = new ResizeController(this, () => {});

  private _analyticsStateController: StoreController<any> | null = null;
  private _staleUnsub?: () => void;

  @provide({ context: hassContext })
  @property({ attribute: false })
  hass!: HomeAssistant;

  @provide({ context: configContext })
  @property({ attribute: false })
  _config!: GrowspaceSubareaCardConfig;

  @state() private _subarea: Subarea | null = null;
  @state() private _loading = true;
  @state() private _error: string | null = null;
  @state() private _parentGrowspaceName = '';
  @state() private _showConfigDialog = false;
  @state() private _missingChunk: LazyChunk | null = null;
  @state() private _historyCache: Record<string, any[]> = {};
  /**
   * The entity lists `_historyCache` was keyed by. Handed to the analytics
   * charts so a metric's series and its history describe the same sensors —
   * a subarea's are its own, not the parent growspace's.
   */
  @state() private _metricSensors: Record<string, string[]> = {};
  private _historyRequestId = 0;

  static styles: CSSResultGroup = [
    variables,
    sharedStyles,
    uiStyles,
    growspaceCardStyles,
    css`
      .subarea-inner {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .subarea-header {
        padding: 0 0 4px;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
      }

      .subarea-header-text {
        display: flex;
        flex-direction: column;
      }

      .config-button {
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
      }

      .config-button:hover {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.2));
      }

      .config-button svg {
        width: 22px;
        height: 22px;
        fill: currentColor;
      }

      .subarea-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--primary-text-color);
        margin: 0 0 4px 0;
      }

      .subarea-subtitle {
        font-size: 0.875rem;
        color: var(--secondary-text-color);
        margin: 0;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      /* Additional sensors — compact secondary grid */
      .secondary-sensors-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 8px;
      }

      .secondary-sensor-item {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.03));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.07));
        border-radius: 12px;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .secondary-sensor-label {
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--secondary-text-color);
        opacity: 0.8;
      }

      .secondary-sensor-value {
        font-size: 1rem;
        font-weight: 500;
        color: var(--primary-text-color);
      }

      .no-sensors {
        color: var(--secondary-text-color);
        font-size: 0.875rem;
        opacity: 0.7;
      }
    `,
  ];

  private _initAnalyticsController(): void {
    if (this.store?.history && !this._analyticsStateController) {
      this._analyticsStateController = new StoreController(
        this,
        this.store.history.$analyticsViewState
      );
      this.store.history.startAutoRefresh();
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._initAnalyticsController();
    this._staleUnsub = this.store.eventBus.on(DATA_STALE_EVENT, () => this._loadSubarea());
  }

  protected firstUpdated(): void {
    if (this.hass) {
      this.store.updateHass(this.hass);
      setHass(this.hass);
      this._bootstrapCtrl?.updateHass(this.hass);
    }
    if (!this._subarea && !this._loading) {
      this._loadSubarea();
    }
    this._initAnalyticsController();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._staleUnsub?.();
    this.store.history?.stopAutoRefresh();
    this.store.destroy();
    growspaceStoreRegistry.release();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (changedProps.has('hass') && this.hass) {
      this.store.updateHass(this.hass);
      setHass(this.hass);
      this._bootstrapCtrl?.updateHass(this.hass);
    }

    if (changedProps.has('_config') && this._config?.default_growspace) {
      this._loadSubarea();
    }

    const devices = this._viewController.value?.grid?.devices ?? [];
    if (devices.length && this._config?.default_growspace) {
      const parent = devices.find((d) => d.deviceId === this._config.default_growspace);
      if (parent && parent.name !== this._parentGrowspaceName) {
        this._parentGrowspaceName = parent.name;
      }
    }
  }

  private async _loadSubarea(): Promise<void> {
    if (!this._config?.default_growspace || !this._config?.subarea_id) return;
    if (!this.hass) return;

    this._loading = true;
    this._error = null;

    try {
      const subareas = await getSubareas(this._config.default_growspace);
      const found = subareas.find((s) => s.id === this._config.subarea_id) ?? null;
      if (!found) {
        this._error = `Subarea "${this._config.subarea_id}" not found in growspace "${this._config.default_growspace}".`;
      } else {
        this._subarea = found;
        this._seedSnapshots(found);
        this._loadHistory(found);
      }
    } catch (err) {
      console.error('[GrowspaceSubareaCard] Failed to load subarea:', err);
      this._error = 'Failed to load subarea data.';
    } finally {
      this._loading = false;
    }
  }

  /**
   * Bootstrap seed for subareaEnvSnapshots$ and subareaDeviceSnapshots$ right
   * after the subarea loads, so the first render has data. SyncService keeps
   * both snapshots fresh afterwards (it iterates subareas$, which getSubareas
   * just hydrated).
   */
  private _seedSnapshots(subarea: Subarea): void {
    if (!this.hass) return;
    const devices = this._viewController.value?.grid?.devices ?? [];
    const parent = devices.find((d) => d.deviceId === this._config.default_growspace);
    setSubareaEnvSnapshot(
      subarea.id,
      subarea,
      {
        growspaceId: this._config.default_growspace,
        growspaceName: parent?.name || this._parentGrowspaceName || undefined,
      },
      this.hass.states
    );
    setSubareaDeviceSnapshot(subarea.id, subarea, this.hass.states);
  }

  private _calculateHistoryStart(range: HistoryTimeRange): Date {
    const now = new Date();
    switch (range) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '6h':
        return new Date(now.getTime() - 6 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  private async _loadHistory(subarea: Subarea, range?: HistoryTimeRange): Promise<void> {
    const snapshot = subareaEnvSnapshots$.get().get(subarea.id);
    if (!snapshot) return;

    const activeRange = range ?? this.store.history.getRange();
    const end = new Date();
    const start = this._calculateHistoryStart(activeRange);

    const metricEntities = deriveSubareaMetricEntities(snapshot);

    const allEntityIds = [...new Set(metricEntities.flatMap((m) => m.entityIds))];
    if (!allEntityIds.length) return;

    const requestId = ++this._historyRequestId;
    this.store.history.setHistoryLoading(true);
    this.store.history.setHistoryLoaded(false);

    try {
      // Seven days of raw HA state changes can be tens of thousands of rows.
      // Keep chart cost bounded with the same downsampled transport as main graphs.
      const batchResults = await getHistoryStats(
        allEntityIds,
        start,
        end,
        this._historyIntervalMinutes(activeRange),
        true
      );
      if (requestId !== this._historyRequestId) return;
      const cache: Record<string, any[]> = {};

      for (const { metric, entityIds } of metricEntities) {
        // Keyed through the shared function so this view's injected
        // histories are filed exactly where the chart looks (#473).
        for (const { entityId, historyKey } of metricHistoryKeys(metric, entityIds)) {
          cache[historyKey] = batchResults[entityId] || [];
        }
      }

      this._historyCache = cache;
      this._metricSensors = Object.fromEntries(
        metricEntities.map(({ metric, entityIds }) => [metric, entityIds])
      );
      // Inject subarea sensor history into the store so growspace-analytics
      // shows the subarea's sensors instead of the parent growspace's sensors.
      this.store.history.setHistoryBatch(cache);
      this.store.history.setHistoryLoaded(true);
    } catch (err) {
      if (requestId !== this._historyRequestId) return;
      console.error('[GrowspaceSubareaCard] Failed to load history:', err);
    } finally {
      if (requestId === this._historyRequestId) {
        this.store.history.setHistoryLoading(false);
      }
    }
  }

  private _historyIntervalMinutes(range: HistoryTimeRange): number {
    switch (range) {
      case '7d':
        return 240;
      case '24h':
        return 30;
      case '6h':
        return 15;
      default:
        return 5;
    }
  }

  private _handleSubareaRangeChange(e: CustomEvent): void {
    const deviceId = this._config.default_growspace;
    if (this._subarea && deviceId) {
      const range = e.detail as HistoryTimeRange;
      this.store.history.setGraphRange(deviceId, range);
      this._loadHistory(this._subarea, range);
    }
  }

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    const editor = await loadLazyChunk(
      LAZY_CHUNKS.subareaCardEditor,
      () => import('./editors/growspace-subarea-card-editor.js')
    );
    if (!editor) {
      return lazyChunkErrorEditor(LAZY_CHUNKS.subareaCardEditor) as unknown as LovelaceCardEditor;
    }
    return document.createElement('growspace-subarea-card-editor') as unknown as LovelaceCardEditor;
  }

  public static getStubConfig(): GrowspaceSubareaCardConfig {
    return {
      type: 'custom:growspace-subarea-card',
      default_growspace: '',
      subarea_id: '',
    };
  }

  public setConfig(config: GrowspaceSubareaCardConfig): void {
    if (!config) throw new Error('Invalid configuration');
    const { growspace_id: legacyGrowspaceId, ...currentConfig } = config;
    this._config = {
      ...currentConfig,
      default_growspace: config.default_growspace ?? legacyGrowspaceId ?? '',
    };
    if (!this._bootstrapCtrl) {
      this._bootstrapCtrl = new BootstrapController(this, this.store.grid, this._config);
      this.store.setRefreshCallback(() => this._bootstrapCtrl.refresh());
    } else {
      this._bootstrapCtrl.setCardConfig(this._config);
    }
  }

  public getCardSize(): number {
    return 4;
  }

  public getLayoutOptions() {
    return {
      grid_columns: 12,
      grid_min_columns: 6,
      grid_min_rows: 4,
    };
  }

  private _toggleMetricGraph(metric: string): void {
    toggleEnvGraph(metric, this.store?.history, this.store?.ui);
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;
    }

    if (!this._config?.default_growspace || !this._config?.subarea_id) {
      return html`
        <ha-card>
          <div class="no-data">Please configure a growspace and subarea.</div>
        </ha-card>
      `;
    }

    // Compute these outside the loading guard so the config-dialog stays alive
    // even while the card body is reloading (DATA_STALE_EVENT).
    const devices = this._viewController.value?.grid?.devices ?? [];
    const parentDevice = devices.find((d) => d.deviceId === this._config.default_growspace);
    const growspaceOptions: Record<string, string> = Object.fromEntries(
      devices.map((d) => [d.deviceId, d.name])
    );
    const subareaDeviceSnapshot = this._subarea
      ? (subareaDeviceSnapshots$.get().get(this._subarea.id) ?? null)
      : null;
    const parentName = this._parentGrowspaceName || this._config.default_growspace;

    return html`
      <error-boundary
        .fallbackMessage=${'Failed to load Subarea Card'}
        .onError=${this._handleError}
      >
        <ha-card>
          <growspace-lazy-chunk-error .chunk=${this._missingChunk}></growspace-lazy-chunk-error>
          ${this._loading
            ? html`
                <div class="loading-container">
                  <ha-circular-progress active></ha-circular-progress>
                </div>
              `
            : this._error
              ? html`<div class="error">${this._error}</div>`
              : !this._subarea
                ? html`<div class="no-data">Subarea not found.</div>`
                : html`
                    <div class="unified-growspace-card glass-surface glass-panel">
                      <div class="subarea-inner">
                        <div class="subarea-header">
                          <div class="subarea-header-text">
                            <h2 class="subarea-title">${this._subarea.name}</h2>
                            <p class="subarea-subtitle">
                              <ha-icon icon="mdi:sprout" style="--mdi-icon-size: 16px;"></ha-icon>
                              ${parentName}
                            </p>
                          </div>
                          <button
                            class="config-button"
                            title="Configure subareas"
                            @click=${() => {
                              this._showConfigDialog = true;
                              void loadLazyChunk(
                                LAZY_CHUNKS.configDialog,
                                () => import('../dialogs/config-dialog')
                              ).then((configDialog) => {
                                if (!configDialog) {
                                  this._showConfigDialog = false;
                                  this._missingChunk = LAZY_CHUNKS.configDialog;
                                }
                              });
                            }}
                          >
                            <svg viewBox="0 0 24 24"><path d="${mdiCog}"></path></svg>
                          </button>
                        </div>

                        ${this._renderHeaderMetrics(parentDevice)}
                        ${parentDevice
                          ? html`<growspace-analytics
                              .device=${parentDevice}
                              .deviceSnapshot=${subareaDeviceSnapshot}
                              .metricSensors=${this._metricSensors}
                              .historyManagedExternally=${true}
                              @set-range=${this._handleSubareaRangeChange}
                            ></growspace-analytics>`
                          : ''}
                      </div>
                    </div>
                  `}
        </ha-card>

        ${this._showConfigDialog
          ? html`
              <config-dialog
                .open=${true}
                .hass=${this.hass}
                .devices=${devices}
                .growspaceOptions=${growspaceOptions}
                .initialTab=${ConfigTab.SUBAREAS}
                .allowedTabs=${[ConfigTab.SUBAREAS]}
                .growspaceId=${this._config.default_growspace}
                @close=${() => {
                  this._showConfigDialog = false;
                }}
              ></config-dialog>
            `
          : nothing}
      </error-boundary>
    `;
  }

  private _renderHeaderMetrics(parentDevice: any): TemplateResult {
    const activeEnvGraphs = this._analyticsStateController?.value?.activeEnvGraphs ?? new Set();

    // All chips are atom-sourced: the subarea EnvSnapshot and DeviceSnapshot are
    // fed by SyncService (and seeded in _loadSubarea); empty plant/irrigation/tank
    // inputs mean dominant-stage and irrigation chips correctly don't render.
    const envSnapshot = this._subarea
      ? (subareaEnvSnapshots$.get().get(this._subarea.id) ?? null)
      : null;
    const deviceSnapshot = this._subarea
      ? (subareaDeviceSnapshots$.get().get(this._subarea.id) ?? null)
      : null;
    const {
      hero,
      chips,
      deviceChips: allDeviceChips,
    } = computeHeaderMetrics(
      envSnapshot,
      [],
      null,
      [],
      'subarea',
      activeEnvGraphs,
      [],
      null,
      deviceSnapshot
    );

    const hidden = this._config?.hidden_chips;
    const heroChips = filterChips(hero, hidden);
    const secondaryChips = filterChips(chips, hidden);
    const deviceChips = filterChips(allDeviceChips, hidden);

    const hasAny = heroChips.length > 0 || secondaryChips.length > 0 || deviceChips.length > 0;
    const isMobile = this._resizeController.isMobile;
    const timeRange = this._analyticsStateController?.value?.timeRange || '24h';

    return html`
      <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 16px;">
        ${!hasAny
          ? html`
              <div class="no-sensors">No environment sensors configured for this subarea.</div>
            `
          : ''}
        ${deviceChips.length > 0
          ? html`
              ${isMobile
                ? html`
                    <growspace-header-hero-ui
                      .chips=${deviceChips}
                      .historyCache=${this._historyCache}
                      .device=${parentDevice}
                      .hass=${this.hass}
                      .isMobile=${true}
                      .timeRange=${timeRange}
                      @toggle-graph=${(e: CustomEvent) => this._toggleMetricGraph(e.detail.metric)}
                    ></growspace-header-hero-ui>
                  `
                : html`
                    <div
                      style="display: flex; gap: 8px; padding: 0 4px; overflow-x: auto; scrollbar-width: none;"
                    >
                      ${deviceChips.map(
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
                            .toggle=${true}
                            .actionLabel=${`Toggle ${chip.label} graph`}
                            @click=${() => this._toggleMetricGraph(chip.key)}
                          ></growspace-chip>
                        `
                      )}
                    </div>
                  `}
            `
          : ''}
        ${heroChips.length > 0
          ? html`
              <growspace-header-hero-ui
                .chips=${heroChips}
                .historyCache=${this._historyCache}
                .device=${parentDevice}
                .hass=${this.hass}
                .isMobile=${isMobile}
                .timeRange=${timeRange}
                @toggle-graph=${(e: CustomEvent) => this._toggleMetricGraph(e.detail.metric)}
              ></growspace-header-hero-ui>
            `
          : ''}
        ${secondaryChips.length > 0
          ? html`
              ${isMobile
                ? html`
                    <growspace-header-hero-ui
                      .chips=${secondaryChips}
                      .historyCache=${this._historyCache}
                      .device=${parentDevice}
                      .hass=${this.hass}
                      .isMobile=${true}
                      .timeRange=${timeRange}
                      @toggle-graph=${(e: CustomEvent) => this._toggleMetricGraph(e.detail.metric)}
                    ></growspace-header-hero-ui>
                  `
                : html`
                    <growspace-header-secondary-ui
                      .chips=${secondaryChips}
                      @toggle-graph=${(e: CustomEvent) => this._toggleMetricGraph(e.detail.metric)}
                    ></growspace-header-secondary-ui>
                  `}
            `
          : ''}
      </div>
    `;
  }

  private _handleError = (error: Error, errorInfo: unknown): void => {
    console.error('Growspace Subarea Card caught error:', error, errorInfo);
    if (this.hass) {
      this.hass.callService('system_log', 'write', {
        message: `Growspace Subarea Card Error: ${error.message}`,
        level: 'error',
        logger: 'lovelace_growspace_manager_card',
      });
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-subarea-card': GrowspaceSubareaCard;
  }
}
