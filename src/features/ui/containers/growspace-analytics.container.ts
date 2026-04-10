import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { StoreController } from '@nanostores/lit';
import { hassContext, storeContext } from '../../../context';
import type { HomeAssistant } from 'custom-card-helpers';
import type { GrowspaceStore } from '../../../store/core/growspace-store';
import type { GrowspaceDevice } from '../../../types';
import { METRIC_CONFIG, METRIC_SORT_ORDER, type MetricKey } from '../../../constants';
import type { AnalyticsItem } from '../components/growspace-analytics-ui';
import '../components/growspace-analytics-ui';

@customElement('growspace-analytics')
export class GrowspaceAnalyticsContainer extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  hass!: HomeAssistant;

  @consume({ context: storeContext })
  private store!: GrowspaceStore;

  @property({ attribute: false }) device: GrowspaceDevice | undefined;

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
    if (this.store?.history && !this._controller?.value?.historyLoaded) {
      this.store.history.loadHistoryOnDemand();
    }
  }

  protected updated() {
    const state = this._controller?.value;
    if (this.store?.history && state && !state.historyLoaded && !state.historyLoading) {
      this.store.history.loadHistoryOnDemand();
    }
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

    linkedGraphGroups.forEach((group) => {
      const active = group.filter((m) => activeEnvGraphs.has(m));
      if (active.length > 0) {
        items.push({ type: 'group', metrics: active, sortIndex: Math.min(...active.map(getSortIndex)) });
        active.forEach((m) => processed.add(m));
      }
    });

    activeEnvGraphs.forEach((metric) => {
      if (!processed.has(metric)) {
        const base = metric.includes(':') ? metric.split(':')[0] : metric;
        items.push({ type: 'single', metrics: [metric], sortIndex: getSortIndex(base) });
      }
    });

    return items.sort((a, b) => a.sortIndex - b.sortIndex);
  }

  render() {
    const state = this._controller?.value;
    if (!state || state.activeEnvGraphs?.size === 0 || !this.device) return html``;

    return html`
      <growspace-analytics-ui
        .items=${this._items}
        .isLoading=${state.historyLoading}
        .range=${this.store.history.getRange()}
        .hass=${this.hass}
        .device=${this.device}
        .sensorHistory=${state.combinedHistory || {}}
        @set-range=${this._handleSetRange}
        @toggle-graph=${this._handleToggleGraph}
        @unlink-graphs=${this._handleUnlinkGraphs}
        @unlink-graph=${this._handleUnlinkGraphMetric}
      ></growspace-analytics-ui>
    `;
  }

  private _handleSetRange(e: CustomEvent) {
    if (this.device) {
      this.store.history.setGraphRange(this.device.deviceId, e.detail);
      this.store.history.loadHistoryOnDemand();
    }
  }

  private _handleToggleGraph(e: CustomEvent) {
    const metric = typeof e.detail === 'string' ? e.detail : e.detail.metric;
    if (metric) {
      this.store?.toggleEnvGraph(metric);
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
