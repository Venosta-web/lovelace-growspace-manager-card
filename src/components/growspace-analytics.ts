import { LitElement, html, css, PropertyValues, TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceDevice, HistorySensorState, SensorHistories } from '../types';
import { RangeChangeEvent } from '../events';
import { METRIC_CONFIG, METRIC_SORT_ORDER, DEFAULT_METRIC_CONFIG } from '../constants';
import '../growspace-env-chart';
import { growspaceCardStyles } from '../styles/growspace-card.styles';

import { consume } from '@lit/context';
import { hassContext } from '../context';

@customElement('growspace-analytics')
export class GrowspaceAnalytics extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  hass!: HomeAssistant;

  @property({ attribute: false }) device?: GrowspaceDevice;
  @property({ attribute: false }) historyData: HistorySensorState[] = []; // Generic bucket if needed
  @property({ attribute: false }) optimalHistory: HistorySensorState[] = [];
  @property({ attribute: false }) dehumidifierHistory: HistorySensorState[] = [];
  @property({ attribute: false }) exhaustHistory: HistorySensorState[] = [];
  @property({ attribute: false }) humidifierHistory: HistorySensorState[] = [];
  @property({ attribute: false }) circulationFanHistory: HistorySensorState[] = [];
  @property({ attribute: false }) soilMoistureHistory: HistorySensorState[] = [];
  @property({ attribute: false }) lightHistory: HistorySensorState[] = [];
  @property({ attribute: false }) irrigationHistory: HistorySensorState[] = [];
  @property({ attribute: false }) drainHistory: HistorySensorState[] = [];
  // Individual environment sensor histories (since env data moved to WebSocket)
  @property({ attribute: false }) temperatureHistory: HistorySensorState[] = [];
  @property({ attribute: false }) humidityHistory: HistorySensorState[] = [];
  @property({ attribute: false }) vpdHistory: HistorySensorState[] = [];
  @property({ attribute: false }) co2History: HistorySensorState[] = [];

  @property({ attribute: false }) activeEnvGraphs: Set<string> = new Set();
  @property({ attribute: false }) linkedGraphGroups: string[][] = [];
  @property({ type: String }) range: '1h' | '6h' | '24h' | '7d' = '24h';

  /** Preferred single property for all sensor histories. If provided, individual history props are ignored. */
  @property({ attribute: false }) sensorHistory?: SensorHistories;

  static styles = [
    growspaceCardStyles,
    css`
      :host {
        display: block;
      }
      .graphs-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
    `,
  ];

  @state() private _itemsToRender: {
    type: 'group' | 'single';
    metrics: string[];
    sortIndex: number;
  }[] = [];

  @state() private _sensorHistory: SensorHistories = {};

  protected willUpdate(changedProperties: PropertyValues) {
    if (changedProperties.has('activeEnvGraphs') || changedProperties.has('linkedGraphGroups')) {
      this._computeItemsToRender();
    }

    // Use sensorHistory prop if provided (preferred API)
    if (changedProperties.has('sensorHistory') && this.sensorHistory) {
      this._sensorHistory = this.sensorHistory;
    } else if (
      // Backward compatibility: merge individual props if sensorHistory not provided
      !this.sensorHistory && (
        changedProperties.has('temperatureHistory') ||
        changedProperties.has('humidityHistory') ||
        changedProperties.has('vpdHistory') ||
        changedProperties.has('co2History') ||
        changedProperties.has('dehumidifierHistory') ||
        changedProperties.has('exhaustHistory') ||
        changedProperties.has('humidifierHistory') ||
        changedProperties.has('circulationFanHistory') ||
        changedProperties.has('soilMoistureHistory') ||
        changedProperties.has('lightHistory') ||
        changedProperties.has('irrigationHistory') ||
        changedProperties.has('drainHistory') ||
        changedProperties.has('optimalHistory')
      )
    ) {
      this._sensorHistory = {
        temperature: this.temperatureHistory || [],
        humidity: this.humidityHistory || [],
        vpd: this.vpdHistory || [],
        co2: this.co2History || [],
        dehumidifier: this.dehumidifierHistory || [],
        exhaust: this.exhaustHistory || [],
        humidifier: this.humidifierHistory || [],
        circulation_fan: this.circulationFanHistory || [],
        soil_moisture: this.soilMoistureHistory || [],
        light: this.lightHistory || [],
        irrigation: this.irrigationHistory || [],
        drain: this.drainHistory || [],
        optimal: this.optimalHistory || [],
      };
    }
  }

  private _computeItemsToRender() {
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

    // Process Linked Groups
    this.linkedGraphGroups.forEach((group) => {
      const activeMetricsInGroup = group.filter((m) => this.activeEnvGraphs.has(m));
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
    this.activeEnvGraphs.forEach((metric) => {
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
    if (this.activeEnvGraphs.size === 0) return html``;
    if (!this.device) return html``;

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
              .sensorHistory=${this._sensorHistory}
              .metrics=${item.metrics}
              .isCombined=${true}
              .metricConfig=${METRIC_CONFIG}
              .range=${this.range}
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
              .sensorHistory=${this._sensorHistory}
              .metricKey=${metric}
              .unit=${config.unit}
              .color=${config.color}
              .title=${config.title}
              .icon=${config.icon}
              .range=${this.range}
              .type=${config.type || 'line'}
              @toggle-graph=${this._handleToggleGraph}
            ></growspace-env-chart>
          `;
        }
      }
    );

    return html` <div class="graphs-container">${this.renderTimeRangeSelector()} ${graphs}</div> `;
  }

  private renderTimeRangeSelector(): TemplateResult {
    const ranges: ('1h' | '6h' | '24h' | '7d')[] = ['1h', '6h', '24h', '7d'];

    return html`
      <div class="time-range-selector">
        ${ranges.map(
      (r) => html`
            <button
              class="range-btn ${this.range === r ? 'active' : ''}"
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
    this.dispatchEvent(new RangeChangeEvent(range));
  }

  private _handleToggleGraph(e: CustomEvent) {
    // Original event bubbles
  }

  private _handleUnlinkGraphs(e: CustomEvent) {
    // Original event bubbles
  }

  private _handleUnlinkGraphMetric(e: CustomEvent) {
    // Original event bubbles
  }
}
