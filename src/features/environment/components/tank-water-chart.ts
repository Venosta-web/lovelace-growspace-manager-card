import { LitElement, html, css, svg, type TemplateResult, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { z } from 'zod';
import type { GrowspaceDevice } from '../../../services/types';
import type { HistoryTimeRange } from '../constants';
import { hassCall } from '../../../services/hass-call';
import { reducedMotion } from '../../../styles/reduced-motion.styles';
import { localize } from '../../../localize/localize';

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
  @state() private _error = false;

  private _lastRequestKey: string | undefined;
  private _requestVersion = 0;

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
      font-size: var(--font-size-supporting);
      color: var(--text-secondary);
      margin-bottom: 12px;
    }
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: var(--text-secondary);
      gap: 12px;
    }
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid var(--gm-primary-color);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    .empty,
    .error {
      padding: 32px;
      text-align: center;
      color: var(--text-muted);
      font-size: var(--font-size-supporting);
    }
    .retry-button {
      min-height: 40px;
      margin-top: 12px;
      padding-inline: 16px;
      border: 1px solid currentColor;
      border-radius: var(--border-radius-full, 9999px);
      background: transparent;
      color: var(--gm-primary-color);
      font: inherit;
      cursor: pointer;
    }
    .retry-button:hover {
      background: var(--primary-container);
    }
    .retry-button:focus-visible {
      outline: 2px solid var(--gm-primary-color);
      outline-offset: 2px;
    }
    svg {
      width: 100%;
      overflow: visible;
    }
    .bar {
      fill: var(--metric-water, var(--gm-primary-color, #03a9f4));
      opacity: 0.85;
    }
    .bar:hover {
      opacity: 1;
    }
    .axis-label {
      font-size: var(--font-size-xs);
      fill: var(--text-muted);
    }

    ${reducedMotion}
  `;

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has('range') || changed.has('device')) {
      void this._fetch();
    }
  }

  private async _fetch(): Promise<void> {
    const deviceId = this.device?.deviceId;
    if (!deviceId) {
      this._lastRequestKey = undefined;
      this._requestVersion++;
      this._buckets = [];
      this._loading = false;
      this._error = false;
      return;
    }

    const requestKey = `${deviceId}:${this.range}`;
    if (requestKey === this._lastRequestKey) return;

    this._lastRequestKey = requestKey;
    const requestVersion = ++this._requestVersion;
    this._loading = true;
    this._error = false;
    try {
      const result = await hassCall(
        'growspace_manager/get_tank_water_history',
        { growspace_id: deviceId, range: this.range },
        TankWaterHistorySchema
      );
      if (requestVersion !== this._requestVersion) return;
      this._buckets = result.buckets;
    } catch {
      if (requestVersion !== this._requestVersion) return;
      this._buckets = [];
      this._error = true;
    } finally {
      if (requestVersion === this._requestVersion) {
        this._loading = false;
      }
    }
  }

  render(): TemplateResult {
    if (this._loading) {
      return html`
        <div class="chart-wrapper">
          <div class="chart-title">${localize('water_chart.title')}</div>
          <div class="loading" role="status" aria-live="polite">
            <div class="spinner"></div>
            <span>${localize('water_chart.loading')}</span>
          </div>
        </div>
      `;
    }

    if (this._error) {
      return html`
        <div class="chart-wrapper">
          <div class="chart-title">${localize('water_chart.title')}</div>
          <div class="error" role="alert">
            <div>${localize('water_chart.load_failed')}</div>
            <button class="retry-button" type="button" @click=${this._retry}>
              ${localize('water_chart.retry')}
            </button>
          </div>
        </div>
      `;
    }

    if (this._buckets.length === 0) {
      return html`
        <div class="chart-wrapper">
          <div class="chart-title">${localize('water_chart.title')}</div>
          <div class="empty">${localize('water_chart.empty')}</div>
        </div>
      `;
    }

    return html`
      <div class="chart-wrapper">
        <div class="chart-title">${localize('water_chart.title')}</div>
        ${this._renderBars()}
      </div>
    `;
  }

  private _retry(): void {
    this._lastRequestKey = undefined;
    void this._fetch();
  }

  private _renderBars(): TemplateResult {
    const max = Math.max(...this._buckets.map((b) => b.liters), 0.001);
    const chartH = 80;
    const barW = 100 / this._buckets.length;
    const gap = Math.min(0.5, barW * 0.2);

    return html`
      <svg viewBox="0 0 100 ${chartH}" preserveAspectRatio="none" height="${chartH}">
        ${this._buckets.map((bucket, i) => {
          const barH = (bucket.liters / max) * (chartH - 16);
          const x = i * barW + gap / 2;
          const y = chartH - barH - 14;
          return svg`
            <rect class="bar" x="${x}" y="${y}" width="${barW - gap}" height="${barH}" rx="1">
              <title>
                ${new Date(bucket.timestamp).toLocaleTimeString()} — ${bucket.liters.toFixed(1)} L
              </title>
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
