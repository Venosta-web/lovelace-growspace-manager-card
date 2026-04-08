import { LitElement, html, css, PropertyValues, TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { customElement, property, state as _state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceDevice } from '../types';

import { METRIC_CONFIG, METRIC_SORT_ORDER, MetricKey } from '../constants';
import '../growspace-env-chart';
import { growspaceCardStyles } from '../styles/growspace-card.styles';
import { sharedStyles } from '../styles/shared.styles';

import { consume } from '@lit/context';
import { hassContext, storeContext } from '../context';
import type { GrowspaceStore } from '../store/core/growspace-store';
import { StoreController } from '@nanostores/lit';
// Global imports removed

@customElement('growspace-analytics')
export class GrowspaceAnalytics extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  hass!: HomeAssistant;

  @consume({ context: storeContext })
  private store!: GrowspaceStore;

  @property({ attribute: false }) device: GrowspaceDevice | undefined;

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
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ];

  private _analyticsController!: StoreController<{
    historyLoading: boolean;
    historyLoaded: boolean;
    activeEnvGraphs: Set<string>;
    linkedGraphGroups: string[][];
    combinedHistory: import('../types').SensorHistories;
    graphRanges: Record<string, import('../types').HistoryTimeRange>;
  }>;

  private _initControllers() {
    if (this.store && !this._analyticsController) {
      this._analyticsController = new StoreController(
        this,
        this.store.history.$analyticsViewState
      );

      // OPTIMIZATION: Trigger lazy loading of history when component connects if needed
      this.store.history.startAutoRefresh();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._initControllers();
  }

  willUpdate(changedProps: PropertyValues) {
    if (changedProps.has('store')) {
      this._initControllers();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.store) {
      this.store.history.stopAutoRefresh();
    }
  }

  firstUpdated() {
    if (this.store?.history && !this._analyticsController?.value?.historyLoaded) {
      this.store.history.loadHistoryOnDemand();
    }
  }

  protected updated(_changedProperties: PropertyValues) {
    const state = this._analyticsController?.value;
    if (this.store?.history && state && !state.historyLoaded && !state.historyLoading) {
      this.store.history.loadHistoryOnDemand();
    }
  }

  private get _itemsToRender() {
    if (!this.store?.history || !this._analyticsController) return [];

    const getSortIndex = (metric: string): number => {
      const index = METRIC_SORT_ORDER.indexOf(metric as MetricKey);
      return index !== -1 ? index : 999;
    };

    const items: {
      type: 'group' | 'single';
      metrics: string[];
      sortIndex: number;
    }[] = [];

    const processedMetrics = new Set<string>();
    const { activeEnvGraphs = new Set<string>(), linkedGraphGroups = [] } =
      this._analyticsController.value ?? {};

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
      // Check for composite keys (e.g. circulation_fan:sensor.fan_1)
      const baseMetric = metric.includes(':') ? metric.split(':')[0] : metric;

      if (!processedMetrics.has(metric)) {
        items.push({
          type: 'single',
          metrics: [metric],
          sortIndex: getSortIndex(baseMetric),
        });
      }
    });

    items.sort((a, b) => a.sortIndex - b.sortIndex);
    return items;
  }

  protected render(): TemplateResult {
    const analyticsState = this._analyticsController?.value;
    if (
      !this.store?.history ||
      !analyticsState ||
      (analyticsState.activeEnvGraphs?.size || 0) === 0
    )
      return html``;
    if (!this.device) return html``;

    if (analyticsState.historyLoading) {
      return html`
        <div class="graphs-container">
          ${this.renderTimeRangeSelector(this.store.history.getRange())}
          <div
            style="display: flex; align-items: center; justify-content: center; padding: 40px; color: var(--secondary-text-color, #666);"
          >
            <div
              class="loading-spinner"
              style="width: 24px; height: 24px; border: 2px solid var(--primary-color, #03a9f4); border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"
            ></div>
            <span style="margin-left: 12px;">Loading history data...</span>
          </div>
        </div>
      `;
    }

    let sensorHistory = analyticsState.combinedHistory || {};
    const range = this.store.history.getRange();

    const graphs = repeat(
      this._itemsToRender,
      // Key function: Unique ID for the item
      (item) =>
        item.type === 'group' ? `group-${item.metrics.join('-')}` : `single-${item.metrics[0]}`,
      // Render function
      (item) => {
        let customSensorId: string | undefined;

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
          const metricKey = item.metrics[0];
          let baseMetric = metricKey;
          let chartTitle: string | undefined;

          // Handle Composite Key
          if (metricKey.includes(':')) {
            const [metric, entityId] = metricKey.split(':');
            baseMetric = metric;
            // Synthetic History: Map 'baseMetric' to the data stored under 'metricKey'
            // We create a new object to avoid mutating the global cache structure for this render pass
            // This effectively "renames" the data key so the chart component finds it under the expected metric name
            if (sensorHistory[metricKey]) {
              sensorHistory = { ...sensorHistory, [baseMetric]: sensorHistory[metricKey] };
            }

            // Try to get a friendly name for the title
            const stateObj = this.hass.states[entityId];
            const friendlyName = stateObj?.attributes?.friendly_name || entityId;
            chartTitle = `${METRIC_CONFIG[baseMetric]?.title || baseMetric} (${friendlyName})`;
            customSensorId = entityId; // Pass the specific sensor ID
          }

          return html`
            <growspace-env-chart
              .hass=${this.hass}
              .device=${this.device}
              .sensorHistory=${sensorHistory}
              .metricKey=${baseMetric}
              .metrics=${[baseMetric]}
              .metricConfig=${METRIC_CONFIG}
              .range=${range}
              .chartTitle=${chartTitle}
              .customSensorId=${customSensorId}
              @toggle-graph=${(e: CustomEvent) => {
                e.stopPropagation();
                this.store.toggleEnvGraph(metricKey);
              }}
            ></growspace-env-chart>
          `;
        }
      }
    );

    return html`
      <div class="graphs-container">${this.renderTimeRangeSelector(range)} ${graphs}</div>
    `;
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
      this.store.history.setGraphRange(this.device.deviceId, range);
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
