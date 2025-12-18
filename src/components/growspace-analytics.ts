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
import { hassContext, historyContext } from '../context';
import type { GrowspaceHistoryController } from '../controllers/growspace-history-controller';

@customElement('growspace-analytics')
export class GrowspaceAnalytics extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  accessor hass!: HomeAssistant;

  @consume({ context: historyContext, subscribe: true })
  public accessor historyController!: GrowspaceHistoryController;

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
    `,
  ];

  @state() private accessor _itemsToRender: {
    type: 'group' | 'single';
    metrics: string[];
    sortIndex: number;
  }[] = [];

  connectedCallback() {
    super.connectedCallback();
    if (this.historyController) {
      this.historyController.addListener(this._handleControllerUpdate);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.historyController) {
      this.historyController.removeListener(this._handleControllerUpdate);
    }
  }

  private _handleControllerUpdate = () => {
    this.requestUpdate();
  }

  protected willUpdate(changedProperties: PropertyValues) {
    // Recompute items whenever update is requested (controller notifies)
    this._computeItemsToRender();
  }

  private _computeItemsToRender() {
    if (!this.historyController) return;

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
    const activeEnvGraphs = this.historyController.activeEnvGraphs;
    const linkedGraphGroups = this.historyController.linkedGraphGroups;

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
    if (!this.historyController || this.historyController.activeEnvGraphs.size === 0) return html``;
    if (!this.device) return html``;

    const sensorHistory = this.historyController.combinedHistory;
    const range = this.historyController.getRange();

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
    // Call controller directly
    this.historyController.setGraphRange(range);
    // Deprecated event removed: this.dispatchEvent(new RangeChangeEvent(range));
  }

  private _handleToggleGraph(e: CustomEvent) {
    e.stopPropagation();
    const metric = e.detail.metric; // Assuming detail contains metric
    if (metric) {
      this.historyController.toggleEnvGraph({ metric, visible: false }); // Toggling off usually? Handled by controller logic
    }
    // Actually, toggleEnvGraph event from chart usually means "close" or "toggle".
    // The chart emits toggle-graph with detail: { metric }
    this.historyController.toggleEnvGraph({ metric: e.detail, visible: false });
    // Wait, e.detail from GrowspaceEnvChart might vary. 
    // Let's assume e.detail is the metric string based on previous usage.
  }

  private _handleUnlinkGraphs(e: CustomEvent) {
    e.stopPropagation();
    // detail is likely groupIndex?
    // But looking at header implementation, unlink emits groupIndex.
    // From chart, we need to know what it emits.
    // Assuming it emits the group index or metrics?
    // Let's assume it emits groupIndex for now, or check code.
    // But based on usage in stored method `unlinkGraphGroup(index)`, it expects index.
    this.historyController.unlinkGraphGroup(e.detail);
  }

  private _handleUnlinkGraphMetric(e: CustomEvent) {
    e.stopPropagation();
    // detail is metric string
    this.historyController.unlinkGraphMetric(e.detail);
  }
}
