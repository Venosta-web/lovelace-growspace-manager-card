import { LitElement, html, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { StoreController } from '@nanostores/lit';
import { hassContext, storeContext } from '../../../context';
import type { HomeAssistant } from 'custom-card-helpers';
import type { GrowspaceStore } from '../../../store/core/growspace-store';
import { toggleEnvGraph } from '../../../slices/ui';
import type { GrowspaceDevice } from '../../../types';
import { METRIC_SORT_ORDER, type MetricKey } from '../../../constants';
import type { AnalyticsItem } from '../components/growspace-analytics-ui';
import { deviceSnapshots$, type DeviceSnapshot } from '../../../slices/device-state';
import { computeMetricDescriptors } from '../../../slices/metric-descriptors';
import { ResizeController } from '../../../controllers/resize-controller';
import type { CardTaskState } from '../../tasks/task-state';
import '../components/growspace-analytics-ui';

@customElement('growspace-analytics')
export class GrowspaceAnalyticsContainer extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  hass!: HomeAssistant;

  @consume({ context: storeContext })
  private store!: GrowspaceStore;

  @property({ attribute: false }) device: GrowspaceDevice | undefined;
  @property({ attribute: false }) deviceSnapshot: DeviceSnapshot | null | undefined;
  /** Per-metric entity lists when the host resolved them itself (subarea view). */
  @property({ attribute: false }) metricSensors: Record<string, string[]> | undefined;
  /** The host owns history requests (used by subareas with their own sensor set). */
  @property({ type: Boolean, attribute: false }) historyManagedExternally = false;
  /** One-shot startup request supplied only by the standalone analytics card. */
  @property({ type: Boolean, attribute: false }) startInGraphWall = false;
  /** Metrics this host wants omitted without mutating the shared open-graph state. */
  @property({ attribute: false }) hiddenMetrics: MetricKey[] = [];
  /** Home Assistant card-editor previews must stay inside the editor surface. */
  @property({ type: Boolean, attribute: false }) cardPreview = false;
  private _deviceSnapshotsController!: StoreController<Map<string, DeviceSnapshot>>;
  private _taskStateController!: StoreController<CardTaskState>;
  /** Whether the [[Env Graph Wall]] is showing for this mounted container. */
  @state() private _fullscreen = false;
  private _graphWallStartupHandled = false;
  private _resize = new ResizeController(this);

  private _controller!: StoreController<{
    historyLoading: boolean;
    historyLoaded: boolean;
    activeEnvGraphs: Set<string>;
    linkedGraphGroups: string[][];
    combinedHistory: import('../../../types').SensorHistories;
    graphRanges: Record<string, import('../../../types').HistoryTimeRange>;
  }>;

  private _initControllers() {
    if (this.store && !this._controller) {
      this._controller = new StoreController(this, this.store.history.$analyticsViewState);
      this.store.history.startAutoRefresh();
    }
    if (!this._deviceSnapshotsController) {
      this._deviceSnapshotsController = new StoreController(this, deviceSnapshots$);
    }
    if (this.store?.ui?.$taskState && !this._taskStateController) {
      this._taskStateController = new StoreController(this, this.store.ui.$taskState);
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._initControllers();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.store?.history?.stopAutoRefresh();
  }

  firstUpdated() {
    if (
      !this.historyManagedExternally &&
      this.store?.history &&
      !this._controller?.value?.historyLoaded
    ) {
      this.store.history.loadHistoryOnDemand();
    }
  }

  protected willUpdate(changedProps: PropertyValues<this>) {
    if (changedProps.has('startInGraphWall') && this.startInGraphWall) {
      this._graphWallStartupHandled = false;
    }

    const state = this._controller?.value;
    if (
      !this._graphWallStartupHandled &&
      this.startInGraphWall &&
      this._canFullscreen &&
      this._canShowWall(state)
    ) {
      this._graphWallStartupHandled = true;
      this._fullscreen = true;
    }
  }

  protected updated() {
    const state = this._controller?.value;
    if (
      !this.historyManagedExternally &&
      this.store?.history &&
      state &&
      !state.historyLoaded &&
      !state.historyLoading
    ) {
      this.store.history.loadHistoryOnDemand();
    }
    // The wall is live-bound to the Open Env Graphs: close the last one from
    // anywhere — a chip, another card, another tab — and the overlay goes away
    // rather than sitting empty. Losing the right to show the toggle closes it
    // too, so a resize down to mobile cannot strand the grower in an overlay
    // whose exit control has just been removed from the DOM.
    if (this._fullscreen && (!this._canShowWall(state) || !this._canFullscreen)) {
      this._fullscreen = false;
    }
  }

  private _canShowWall(state = this._controller?.value): boolean {
    return !!this.device && !!state && this._items.length > 0;
  }

  /**
   * The overlay is unavailable in card-editor previews and on mobile, and it
   * must not bury a provisional Metric Comparison or Arrangement Draft under
   * a modal mid-transaction.
   */
  private get _canFullscreen(): boolean {
    const task = this._taskStateController?.value ?? { kind: 'idle' };
    return !this.cardPreview && !this._resize.isMobile && task.kind === 'idle';
  }

  private get _items(): AnalyticsItem[] {
    if (!this._controller) return [];
    const { activeEnvGraphs = new Set<string>(), linkedGraphGroups = [] } =
      this._controller.value ?? {};

    const getSortIndex = (metric: string) => {
      const i = METRIC_SORT_ORDER.indexOf(metric as MetricKey);
      return i !== -1 ? i : 999;
    };

    const items: (AnalyticsItem & { sortIndex: number })[] = [];
    const processed = new Set<string>();
    const isVisible = (metric: string) => {
      const base = metric.includes(':') ? metric.split(':')[0] : metric;
      return !this.hiddenMetrics.includes(base as MetricKey);
    };

    linkedGraphGroups.forEach((group) => {
      const active = group.filter((m) => activeEnvGraphs.has(m) && isVisible(m));
      if (active.length > 0) {
        items.push({
          type: 'group',
          metrics: active,
          sortIndex: Math.min(...active.map(getSortIndex)),
        });
        active.forEach((m) => processed.add(m));
      }
    });

    activeEnvGraphs.forEach((metric) => {
      if (!processed.has(metric) && isVisible(metric)) {
        const base = metric.includes(':') ? metric.split(':')[0] : metric;
        items.push({ type: 'single', metrics: [metric], sortIndex: getSortIndex(base) });
      }
    });

    return items.sort((a, b) => a.sortIndex - b.sortIndex);
  }

  render() {
    const state = this._controller?.value;
    const items = this._items;
    if (!state || items.length === 0 || !this.device) return html``;

    const deviceSnapshot =
      this.deviceSnapshot === undefined
        ? (deviceSnapshots$.get().get(this.device.deviceId) ?? null)
        : this.deviceSnapshot;

    // Descriptors are built here, where reading `hass.states` is allowed, so the
    // charts below never have to (ADR-0030).
    const overviewEntity = this.device.overviewEntityId
      ? this.hass?.states[this.device.overviewEntityId]
      : undefined;
    const descriptors = computeMetricDescriptors(
      deviceSnapshot,
      this.hass?.states ?? {},
      overviewEntity,
      this.device,
      this.metricSensors
    );

    return html`
      <growspace-analytics-ui
        .items=${items}
        .isLoading=${state.historyLoading}
        .range=${this.store.history.getRange()}
        .hass=${this.hass}
        .device=${this.device}
        .descriptors=${descriptors}
        .sensorHistory=${state.combinedHistory || {}}
        .fullscreen=${this._fullscreen}
        .canFullscreen=${this._canFullscreen}
        @set-fullscreen=${this._handleSetFullscreen}
        @set-range=${this._handleSetRange}
        @toggle-graph=${this._handleToggleGraph}
        @unlink-graphs=${this._handleUnlinkGraphs}
        @unlink-graph=${this._handleUnlinkGraphMetric}
      ></growspace-analytics-ui>
    `;
  }

  private _handleSetFullscreen(e: CustomEvent<boolean>) {
    this._fullscreen = e.detail && this._canFullscreen && this._canShowWall();
  }

  private _handleSetRange(e: CustomEvent) {
    if (this.device && !this.historyManagedExternally) {
      this.store.history.setGraphRange(this.device.deviceId, e.detail);
      this.store.history.loadHistoryOnDemand();
    }
  }

  private _handleToggleGraph(e: CustomEvent) {
    const metric = typeof e.detail === 'string' ? e.detail : e.detail.metric;
    if (metric) {
      toggleEnvGraph(
        metric,
        this.store?.history,
        this.store?.ui,
        this.device?.deviceId ?? this.store?.grid.$selectedDevice.get()
      );
    }
  }

  private _handleUnlinkGraphs(e: CustomEvent) {
    this.store.history.unlinkGraphGroup(e.detail);
  }

  private _handleUnlinkGraphMetric(e: CustomEvent) {
    this.store.history.unlinkGraphMetric(e.detail);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-analytics': GrowspaceAnalyticsContainer;
  }
}
