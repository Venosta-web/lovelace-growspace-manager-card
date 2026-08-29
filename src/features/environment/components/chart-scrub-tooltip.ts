import { LitElement, css, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type ChartScrubTime =
  | { kind: 'moment'; time: number }
  | { kind: 'interval'; startTime: number; endTime: number };

export interface ChartScrubRow {
  title: string;
  time: ChartScrubTime;
  value: string;
  color?: string;
}

export interface ChartScrubDetail {
  position: number;
  rows: ChartScrubRow[];
}

/** One chart-owned scrub readout and the cursor that locates it in time. */
@customElement('chart-scrub-tooltip')
export class ChartScrubTooltip extends LitElement {
  @property({ attribute: false }) rows: ChartScrubRow[] = [];
  @property({ type: String }) locale: string | undefined;
  /** Horizontal position within the chart, from 0 at the window start to 1 at now. */
  @property({ type: Number }) position = 0;

  static styles = css`
    :host {
      position: absolute;
      inset: 0;
      z-index: 20;
      pointer-events: none;
    }
    .chart-scrub-tooltip {
      position: absolute;
      top: 8px;
      z-index: 2;
      padding: 8px 12px;
      transform: translateX(-50%);
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      border-radius: 8px;
      background: var(--card-background-color, rgba(30, 30, 35, 0.95));
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      color: var(--primary-text-color, #fff);
      font-size: var(--font-size-xs);
      line-height: 1.4;
      white-space: nowrap;
    }
    .chart-scrub-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .chart-scrub-value {
      font-family: monospace;
      font-weight: 700;
    }
    .chart-scrub-cursor {
      position: absolute;
      inset-block: 0;
      border-left: 1px dashed rgba(255, 255, 255, 0.5);
    }
  `;

  render(): TemplateResult {
    const left = `${Math.max(0, Math.min(1, this.position)) * 100}%`;
    return html`
      <div class="chart-scrub-tooltip" role="tooltip" style="left:${left}">
        ${this.rows.map(
          (row) => html`
            <div class="chart-scrub-row">
              <span style=${row.color ? `color:${row.color}` : ''}>${row.title}:</span>
              <span class="chart-scrub-value">${this._formatRowValue(row)}</span>
            </div>
          `
        )}
      </div>
      <div class="chart-scrub-cursor" style="left:${left}"></div>
    `;
  }

  private _formatRowValue(row: ChartScrubRow): string {
    const label =
      row.time.kind === 'moment'
        ? this._formatTime(row.time.time)
        : `${this._formatTime(row.time.startTime)}–${this._formatTime(row.time.endTime)}`;
    return `${label} · ${row.value}`;
  }

  private _formatTime(time: number): string {
    return new Date(time).toLocaleTimeString(this.locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chart-scrub-tooltip': ChartScrubTooltip;
  }
}
