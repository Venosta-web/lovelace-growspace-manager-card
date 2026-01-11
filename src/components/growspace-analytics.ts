import { LitElement, html, css, PropertyValues, TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceDevice } from '../types';

import { METRIC_CONFIG, METRIC_SORT_ORDER, DEFAULT_METRIC_CONFIG } from '../constants';
import '../growspace-env-chart';
import { growspaceCardStyles } from '../styles/growspace-card.styles';
import { sharedStyles } from '../styles/shared.styles';

import { consume } from '@lit/context';
import { hassContext, storeContext } from '../context';
import type { GrowspaceStore } from '../store/growspace-store';
import { StoreController } from '@nanostores/lit';
// Global imports removed

@customElement('growspace-analytics')
export class GrowspaceAnalytics extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  accessor hass!: HomeAssistant;

  @consume({ context: storeContext })
  private accessor store!: GrowspaceStore;

  @property({ attribute: false }) accessor device: GrowspaceDevice | undefined;

  static styles = [
    growspaceCardStyles,
    sharedStyles,
    css`
      :host {
        display: block;
      }
      .graphs-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `,
  ];

  @state() private accessor _itemsToRender: {
    type: 'group' | 'single';
    metrics: string[];
    sortIndex: number;
  }[] = [];

  // StoreController subscriptions for automatic reactivity
  private _historyCacheController!: StoreController<Record<string, import('../types').HistorySensorState[]>>;
  private _historyLoadingController!: StoreController<boolean>;
  private _historyLoadedController!: StoreController<boolean>;
  private _activeEnvGraphsController!: StoreController<Set<string>>;
  private _linkedGraphGroupsController!: StoreController<string[][]>;
  private _combinedHistoryController!: StoreController<import('../types').SensorHistories>;
  private _graphRangesController!: StoreController<Record<string, import('../types').HistoryTimeRange>>;

  connectedCallback() {
    super.connectedCallback();
    if (this.store) {
      this._historyCacheController = new StoreController(this, this.store.history.$historyCache);
      this._historyLoadingController = new StoreController(this, this.store.history.$historyLoading);
      this._historyLoadedController = new StoreController(this, this.store.history.$historyLoaded);
      this._activeEnvGraphsController = new StoreController(this, this.store.history.$activeEnvGraphs);
      this._linkedGraphGroupsController = new StoreController(this, this.store.history.$linkedGraphGroups);
      this._combinedHistoryController = new StoreController(this, this.store.history.$combinedHistory);
      this._graphRangesController = new StoreController(this, this.store.history.$graphRanges);

      // OPTIMIZATION: Trigger lazy loading of history when component connects if needed
      this.store.history.startAutoRefresh();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.store) {
      this.store.history.stopAutoRefresh();
    }
  }

  firstUpdated() {
    // OPTIMIZATION: Trigger lazy loading of history data when analytics component first renders
    if (this.store?.history && !this._historyLoadedController.value) {
      this.store.history.loadHistoryOnDemand();
    }
  }

  protected willUpdate(changedProperties: PropertyValues) {
    // Trigger lazy load if history is not loaded and not currently loading
    if (this.store?.history && !this._historyLoadedController.value && !this._historyLoadingController.value) {
      this.store.history.loadHistoryOnDemand();
    }

    // Recompute items whenever update is requested (controller notifies)
    this._computeItemsToRender();
  }

  private _computeItemsToRender() {
    if (!this.store?.history || !this._activeEnvGraphsController) return;

    const getSortIndex = (metric: string): number => {
      const index = METRIC_SORT_ORDER.indexOf(metric);
      return index !== -1 ? index : 999;
    };

    const items: {
      type: 'group' | 'single';
      metrics: string[];
      sortIndex: number;
    }[] = [];

    const processedMetrics = new Set<string>();
    const activeEnvGraphs = this._activeEnvGraphsController.value;
    const linkedGraphGroups = this._linkedGraphGroupsController.value;

    // Process Linked Groups
    linkedGraphGroups.forEach((group) => {
      const activeMetricsInGroup = group.filter((m) => activeEnvGraphs.has(m));
      if (activeMetricsInGroup.length > 0) {
        const minIndex = Math.min(...activeMetricsInGroup.map(getSortIndex));
        items.push({
          type: 'group',
          metrics: activeMetricsInGroup,
          sortIndex: minIndex,
        });
        activeMetricsInGroup.forEach((m) => processedMetrics.add(m));
      }
    });

    // Process Individual Metrics
    activeEnvGraphs.forEach((metric) => {
      if (!processedMetrics.has(metric)) {
        items.push({
          type: 'single',
          metrics: [metric],
          sortIndex: getSortIndex(metric),
        });
      }
    });

    items.sort((a, b) => a.sortIndex - b.sortIndex);
    this._itemsToRender = items;
  }

  protected render(): TemplateResult {
    if (!this.store?.history || !this._activeEnvGraphsController || this._activeEnvGraphsController.value.size === 0) return html``;
    if (!this.device) return html``;

    // Show loading state while history is being fetched
    if (this._historyLoadingController.value) {
      return html`
        <div class="graphs-container">
          ${this.renderTimeRangeSelector(this.store.history.getRange())}
          <div style="display: flex; align-items: center; justify-content: center; padding: 40px; color: var(--secondary-text-color, #666);">
            <div class="loading-spinner" style="width: 24px; height: 24px; border: 2px solid var(--primary-color, #03a9f4); border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <span style="margin-left: 12px;">Loading history data...</span>
          </div>
        </div>
      `;
    }

    const sensorHistory = this._combinedHistoryController.value;
    const range = this.store.history.getRange();

    const graphs = repeat(
      this._itemsToRender,
      // Key function: Unique ID for the item
      (item) =>
        item.type === 'group' ? `group-${item.metrics.join('-')}` : `single-${item.metrics[0]}`,
      // Render function
      (item) => {
        if (item.type === 'group') {
          return html`
            <growspace-env-chart
              .hass=${this.hass}
              .device=${this.device}
              .sensorHistory=${sensorHistory}
              .metrics=${item.metrics}
              .isCombined=${true}
              .metricConfig=${METRIC_CONFIG}
              .range=${range}
              @toggle-graph=${this._handleToggleGraph}
              @unlink-graphs=${this._handleUnlinkGraphs}
              @unlink-graph=${this._handleUnlinkGraphMetric}
            ></growspace-env-chart>
          `;
        } else {
          const metric = item.metrics[0];
          const config = METRIC_CONFIG[metric] || DEFAULT_METRIC_CONFIG;

          return html`
            <growspace-env-chart
              .hass=${this.hass}
              .device=${this.device}
              .sensorHistory=${sensorHistory}
              .metricKey=${metric}
              .unit=${config.unit}
              .color=${config.color}
              .title=${config.title}
              .icon=${config.icon}
              .range=${range}
              .type=${config.type || 'line'}
              @toggle-graph=${this._handleToggleGraph}
            ></growspace-env-chart>
          `;
        }
      }
    );

    return html` <div class="graphs-container">${this.renderTimeRangeSelector(range)} ${graphs}</div> `;
  }

  private renderTimeRangeSelector(currentRange: '1h' | '6h' | '24h' | '7d'): TemplateResult {
    const ranges: ('1h' | '6h' | '24h' | '7d')[] = ['1h', '6h', '24h', '7d'];

    return html`
      <div class="time-range-selector">
        ${ranges.map(
      (r) => html`
            <button
              class="range-btn ${currentRange === r ? 'active' : ''}"
              @click=${() => this._setGraphRange(r)}
            >
              ${r}
            </button>
          `
    )}
      </div>
    `;
  }

  private _setGraphRange(range: '1h' | '6h' | '24h' | '7d') {
    if (this.device) {
      this.store.history.setGraphRange(this.device.device_id, range);
      this.store.history.loadHistoryOnDemand(); // Reload logic to match controller behavior
    }
  }

  private _handleToggleGraph(e: CustomEvent) {
    e.stopPropagation();
    // Chart emits detail: metricKey (string)
    const metric = e.detail;
    if (metric && typeof metric === 'string' && this.store) {
      this.store.toggleEnvGraph(metric);
    }
  }

  private _handleUnlinkGraphs(e: CustomEvent) {
    e.stopPropagation();
    // detail is groupIndex
    this.store.history.unlinkGraphGroup(e.detail);
  }

  private _handleUnlinkGraphMetric(e: CustomEvent) {
    e.stopPropagation();
    // detail is metric string
    this.store.history.unlinkGraphMetric(e.detail);
  }
}
