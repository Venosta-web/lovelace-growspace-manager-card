import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import type { HomeAssistant } from 'custom-card-helpers';
import type { GrowspaceDevice, SensorHistories, HistoryTimeRange } from '../../../types';
import { growspaceCardStyles } from '../../../styles/growspace-card.styles';
import { sharedStyles } from '../../../styles/shared.styles';
import '../../../growspace-env-chart';

export type AnalyticsItem = {
  type: 'group' | 'single';
  metrics: string[];
};

@customElement('growspace-analytics-ui')
export class GrowspaceAnalyticsUI extends LitElement {
  @property({ attribute: false }) items: AnalyticsItem[] = [];
  @property({ type: Boolean }) isLoading = false;
  @property({ attribute: false }) range: HistoryTimeRange = '24h';
  @property({ attribute: false }) hass: HomeAssistant | undefined;
  @property({ attribute: false }) device: GrowspaceDevice | undefined;
  @property({ attribute: false }) sensorHistory: SensorHistories = {};

  static styles = [
    growspaceCardStyles,
    sharedStyles,
    css`
      :host { display: block; }
      .graphs-container { display: flex; flex-direction: column; gap: 12px; }
      @keyframes spin { to { transform: rotate(360deg); } }
    `,
  ];

  render(): TemplateResult {
    if (this.items.length === 0) return html``;

    if (this.isLoading) {
      return html`
        <div class="graphs-container">
          ${this._renderTimeRangeSelector()}
          <div style="display:flex;align-items:center;justify-content:center;padding:40px;color:var(--secondary-text-color,#666);">
            <div class="loading-spinner" style="width:24px;height:24px;border:2px solid var(--primary-color,#03a9f4);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></div>
            <span style="margin-left:12px;">Loading history data...</span>
          </div>
        </div>
      `;
    }

    return html`
      <div class="graphs-container">
        ${this._renderTimeRangeSelector()}
        ${repeat<AnalyticsItem>(
      this.items,
      (item: AnalyticsItem) => (item.type === 'group' ? `group-${item.metrics.join('-')}` : `single-${item.metrics[0]}`),
      (item: AnalyticsItem) => this._renderItem(item)
    )}
      </div>
    `;
  }

  private _renderTimeRangeSelector(): TemplateResult {
    const ranges: HistoryTimeRange[] = ['1h', '6h', '24h', '7d'];
    return html`
      <div class="time-range-selector">
        ${ranges.map((r) => html`
          <button
            class="range-btn ${this.range === r ? 'active' : ''}"
            @click=${() => this._emitSetRange(r)}
          >${r}</button>
        `)}
      </div>
    `;
  }

  private _renderItem(item: AnalyticsItem): TemplateResult {
    if (item.type === 'group') {
      return html`
        <growspace-env-chart
          .hass=${this.hass}
          .device=${this.device}
          .sensorHistory=${this.sensorHistory}
          .metrics=${item.metrics}
          .isCombined=${true}
          .range=${this.range}
          @toggle-graph=${(e: CustomEvent) => this._redispatch('toggle-graph', e.detail)}
          @unlink-graphs=${(e: CustomEvent) => this._redispatch('unlink-graphs', e.detail)}
          @unlink-graph=${(e: CustomEvent) => this._redispatch('unlink-graph', e.detail)}
        ></growspace-env-chart>
      `;
    }
    return html`
      <growspace-env-chart
        .hass=${this.hass}
        .device=${this.device}
        .sensorHistory=${this.sensorHistory}
        .metricKey=${item.metrics[0]}
        .metrics=${item.metrics}
        .range=${this.range}
        @toggle-graph=${(e: CustomEvent) => this._redispatch('toggle-graph', e.detail)}
      ></growspace-env-chart>
    `;
  }

  private _emitSetRange(range: HistoryTimeRange) {
    this.dispatchEvent(new CustomEvent('set-range', { detail: range, bubbles: true, composed: true }));
  }

  private _redispatch(type: string, detail: unknown) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-analytics-ui': GrowspaceAnalyticsUI;
  }
}
