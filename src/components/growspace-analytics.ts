import { LitElement, html, css, PropertyValues, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceDevice } from '../types';
import { METRIC_CONFIG, METRIC_SORT_ORDER, DEFAULT_METRIC_CONFIG } from '../constants';
import '../growspace-env-chart';
import { growspaceCardStyles } from '../styles/growspace-card.styles';

@customElement('growspace-analytics')
export class GrowspaceAnalytics extends LitElement {
    @property({ attribute: false }) hass!: HomeAssistant;
    @property({ attribute: false }) device?: GrowspaceDevice;
    @property({ attribute: false }) historyData: any[] = [];
    @property({ attribute: false }) dehumidifierHistory: any[] = [];
    @property({ attribute: false }) exhaustHistory: any[] = [];
    @property({ attribute: false }) humidifierHistory: any[] = [];
    @property({ attribute: false }) soilMoistureHistory: any[] = [];

    @property({ attribute: false }) activeEnvGraphs: Set<string> = new Set();
    @property({ attribute: false }) linkedGraphGroups: string[][] = [];
    @property({ type: String }) range: '1h' | '6h' | '24h' | '7d' = '24h';

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
    `
    ];

    protected render(): TemplateResult {
        if (this.activeEnvGraphs.size === 0) return html``;
        if (!this.device) return html``;

        // Helper to get sort index for a metric
        const getSortIndex = (metric: string): number => {
            const index = METRIC_SORT_ORDER.indexOf(metric);
            return index !== -1 ? index : 999;
        };

        // 1. Collect all items to render
        const itemsToRender: {
            type: 'group' | 'single';
            metrics: string[];
            sortIndex: number;
        }[] = [];

        const processedMetrics = new Set<string>();

        // Process Linked Groups
        this.linkedGraphGroups.forEach(group => {
            const activeMetricsInGroup = group.filter(m => this.activeEnvGraphs.has(m));
            if (activeMetricsInGroup.length > 0) {
                // Sort index based on highest priority (lowest index) metric
                const minIndex = Math.min(...activeMetricsInGroup.map(getSortIndex));
                itemsToRender.push({
                    type: 'group',
                    metrics: activeMetricsInGroup,
                    sortIndex: minIndex
                });
                activeMetricsInGroup.forEach(m => processedMetrics.add(m));
            }
        });

        // Process Individual Metrics
        this.activeEnvGraphs.forEach(metric => {
            if (!processedMetrics.has(metric)) {
                itemsToRender.push({
                    type: 'single',
                    metrics: [metric],
                    sortIndex: getSortIndex(metric)
                });
            }
        });

        itemsToRender.sort((a, b) => a.sortIndex - b.sortIndex);

        const graphs: TemplateResult[] = itemsToRender.map(item => {
            if (item.type === 'group') {
                const activeMetrics = item.metrics;
                // Pass the METRIC_CONFIG down for the combined graph to pick colors/titles
                return html`
              <growspace-env-chart
                  .hass=${this.hass}
                  .device=${this.device}
                  .history=${this.historyData || []}
                  .dehumidifierHistory=${this.dehumidifierHistory || []}
                  .exhaustHistory=${this.exhaustHistory || []}
                  .humidifierHistory=${this.humidifierHistory || []}
                  .soilMoistureHistory=${this.soilMoistureHistory || []}
                  .metrics=${activeMetrics}
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

                // Determine correct history array based on metric
                let history = this.historyData || [];
                if (metric === 'exhaust') history = this.exhaustHistory || [];
                else if (metric === 'humidifier') history = this.humidifierHistory || [];
                else if (metric === 'dehumidifier') history = this.dehumidifierHistory || [];
                else if (metric === 'soil_moisture') history = this.soilMoistureHistory || [];

                return html`
          <growspace-env-chart
              .hass=${this.hass}
              .device=${this.device}
              .history=${history}
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
        });

        return html`
        <div class="graphs-container">
            ${this.renderTimeRangeSelector()}
            ${graphs}
        </div>
    `;
    }

    private renderTimeRangeSelector(): TemplateResult {
        const ranges: ('1h' | '6h' | '24h' | '7d')[] = ['1h', '6h', '24h', '7d'];

        return html`
      <div class="time-range-selector">
        ${ranges.map(r => html`
          <button 
            class="range-btn ${this.range === r ? 'active' : ''}"
            @click=${() => this._setGraphRange(r)}
          >
            ${r}
          </button>
        `)}
      </div>
    `;
    }

    private _setGraphRange(range: '1h' | '6h' | '24h' | '7d') {
        this.dispatchEvent(new CustomEvent('range-change', {
            detail: { range },
            bubbles: true,
            composed: true
        }));
    }

    private _handleToggleGraph(e: CustomEvent) {
        // Re-dispatch if needed, but since we use bubbles: true, it might go up automatically.
        // However, if the event was stopped or we want to be explicit:
        // The original event bubbles, so it should reach the top.
        // But let's monitor if any processing is needed.
    }

    private _handleUnlinkGraphs(e: CustomEvent) {
        // Original event bubbles
    }

    private _handleUnlinkGraphMetric(e: CustomEvent) {
        // Original event bubbles
    }
}
