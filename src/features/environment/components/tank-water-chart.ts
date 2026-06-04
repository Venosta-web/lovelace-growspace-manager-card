import { LitElement, html, css, type TemplateResult, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { z } from 'zod';
import type { GrowspaceDevice } from '../../../services/types';
import type { HistoryTimeRange } from '../constants';
import { hassCall } from '../../../services/hass-call';

const TankWaterBucketSchema = z.object({
  timestamp: z.string(),
  liters: z.number(),
});

const TankWaterHistorySchema = z.object({
  buckets: z.array(TankWaterBucketSchema),
});

type TankWaterBucket = z.infer<typeof TankWaterBucketSchema>;

@customElement('tank-water-chart')
export class TankWaterChart extends LitElement {
  @property({ attribute: false }) device: GrowspaceDevice | undefined;
  @property({ type: String }) range: HistoryTimeRange = '24h';

  @state() private _buckets: TankWaterBucket[] = [];
  @state() private _loading = false;

  static styles = css`
    :host {
      display: block;
    }
    .chart-wrapper {
      background: var(--card-background-color, #1c1c1e);
      border-radius: 12px;
      padding: 16px;
    }
    .chart-title {
      font-size: 13px;
      color: var(--secondary-text-color, #9e9e9e);
      margin-bottom: 12px;
    }
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: var(--secondary-text-color, #666);
      gap: 12px;
    }
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid var(--primary-color, #03a9f4);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .empty {
      padding: 32px;
      text-align: center;
      color: var(--secondary-text-color, #666);
      font-size: 13px;
    }
    svg {
      width: 100%;
      overflow: visible;
    }
    .bar {
      fill: var(--primary-color, #03a9f4);
      opacity: 0.85;
    }
    .bar:hover {
      opacity: 1;
    }
    .axis-label {
      font-size: 10px;
      fill: var(--secondary-text-color, #9e9e9e);
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this._fetch();
  }

  updated(changed: PropertyValues): void {
    if (changed.has('range') || changed.has('device')) {
      this._fetch();
    }
  }

  private async _fetch(): Promise<void> {
    if (!this.device) return;
    this._loading = true;
    try {
      const result = await hassCall(
        'growspace_manager/get_tank_water_history',
        { growspace_id: this.device.deviceId, range: this.range },
        TankWaterHistorySchema
      );
      this._buckets = result.buckets;
    } catch {
      this._buckets = [];
    } finally {
      this._loading = false;
    }
  }

  render(): TemplateResult {
    if (this._loading) {
      return html`
        <div class="chart-wrapper">
          <div class="chart-title">Water Consumption</div>
          <div class="loading">
            <div class="spinner"></div>
            <span>Loading...</span>
          </div>
        </div>
      `;
    }

    if (this._buckets.length === 0) {
      return html`
        <div class="chart-wrapper">
          <div class="chart-title">Water Consumption</div>
          <div class="empty">No water data for this period.</div>
        </div>
      `;
    }

    return html`
      <div class="chart-wrapper">
        <div class="chart-title">Water Consumption</div>
        ${this._renderBars()}
      </div>
    `;
  }

  private _renderBars(): TemplateResult {
    const max = Math.max(...this._buckets.map((b) => b.liters), 0.001);
    const chartH = 80;
    const barW = Math.floor(100 / this._buckets.length);
    const gap = 2;

    return html`
      <svg viewBox="0 0 100 ${chartH}" preserveAspectRatio="none" height="${chartH}">
        ${this._buckets.map((bucket, i) => {
          const barH = (bucket.liters / max) * (chartH - 16);
          const x = i * barW + gap / 2;
          const y = chartH - barH - 14;
          return html`
            <rect
              class="bar"
              x="${x}"
              y="${y}"
              width="${barW - gap}"
              height="${barH}"
              rx="1"
            >
              <title>${new Date(bucket.timestamp).toLocaleTimeString()} — ${bucket.liters.toFixed(1)} L</title>
            </rect>
          `;
        })}
      </svg>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tank-water-chart': TankWaterChart;
  }
}
