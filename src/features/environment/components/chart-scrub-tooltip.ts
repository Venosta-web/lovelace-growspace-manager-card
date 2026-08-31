import { LitElement, css, html, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * One row of a scrub readout.
 *
 * `interval` is what separates the two kinds a chart can report at one instant:
 * absent, the row is an [[Instantaneous Metric]] read *at* the scrub moment;
 * present, it is an [[Interval Metric]] bucket that *contains* it. The row
 * carries the bucket rather than a timestamp because the readout prints the
 * moment once, as its heading — see the class docstring.
 */
export interface ChartScrubRow {
  title: string;
  value: string;
  color?: string;
  interval?: { startTime: number; endTime: number };
}

/** A scrub, as one chart hands it to whoever draws the readout. */
export interface ChartScrubDetail {
  /** Horizontal position within the chart, from 0 at the window start to 1 at now. */
  position: number;
  /** The instant scrubbed. Every row reports this moment, however it reads it. */
  time: number;
  rows: ChartScrubRow[];
  /** Input owner, so a composed chart can keep keyboard scrubs across pointer exits. */
  source?: 'pointer' | 'keyboard';
}

/**
 * The one scrub readout of the [[Env Graph]] family, and the cursor that locates
 * it in time.
 *
 * Both entry points render *this* element: a standalone Env Graph mounts it
 * itself, and a [[Curated Combo]] mounts it across both of its panes with the
 * Env Graph delegating. Whether a metric happens to have a combo recipe is an
 * editorial claim about which metrics pair with which context (ADR-0051); it
 * decides nothing about what the scrub looks like or what clock it speaks
 * (#866).
 *
 * The moment is printed once, as a heading, rather than on every row. A scrub
 * *is* one instant, so a timestamp per row is the same fact restated as many
 * times as the chart has series — and it would then have to be restated for
 * interval rows too, which do not read at that instant at all. The distinction
 * those rows need is carried by the swatch instead: a dot for a reading taken at
 * the moment, a bar for a bucket averaged across it, which is the shape each row
 * was read off in the pane below.
 *
 * The ground is fixed dark and the foreground uses the matching `on-overlay`
 * roles, the way the [[Crop Steering Day Chart]]'s readout does (ADR-0039). The
 * cursor is the exception: it is drawn on the chart's own theme-owned pane, so
 * it takes a theme-owned rule colour.
 */
@customElement('chart-scrub-tooltip')
export class ChartScrubTooltip extends LitElement {
  @property({ attribute: false }) rows: ChartScrubRow[] = [];
  @property({ type: String }) locale: string | undefined;
  /** The instant scrubbed, printed once as the readout's heading. */
  @property({ type: Number }) time: number | undefined;
  /** Horizontal position within the chart, from 0 at the window start to 1 at now. */
  @property({ type: Number }) position = 0;

  static styles = css`
    :host {
      position: absolute;
      inset: 0;
      z-index: 20;
      pointer-events: none;
      /* The cursor sits on a theme-owned pane, so it needs a theme-owned
         foreground with non-text contrast of its own — the same rule the Day
         Chart's grid takes, and the reason it is not an on-overlay role like
         everything inside the readout. */
      --chart-scrub-rule: color-mix(
        in srgb,
        var(--primary-text-color, #ffffff) 50%,
        var(--secondary-background-color, #0d0d0d)
      );
    }
    .chart-scrub-tooltip {
      position: absolute;
      top: 8px;
      z-index: 2;
      padding: 8px 12px;
      transform: translateX(-50%);
      /* Unlike the chart pane beneath it, the readout owns this fixed-dark
         ground. Its foreground therefore uses the matching on-overlay roles
         (ADR 0039). */
      background: rgb(20, 20, 20);
      backdrop-filter: blur(4px);
      border: 1px solid var(--on-overlay-muted, rgba(255, 255, 255, 0.55));
      border-radius: 8px;
      box-shadow: var(--card-shadow, 0 4px 12px rgba(0, 0, 0, 0.5));
      color: var(--on-overlay-primary, #ffffff);
      font-size: var(--font-size-xs);
      line-height: 1.4;
      white-space: nowrap;
    }
    .chart-scrub-time {
      margin-bottom: 4px;
      padding-bottom: 3px;
      border-bottom: 1px solid var(--on-overlay-muted, rgba(255, 255, 255, 0.55));
      font-weight: 600;
      text-align: center;
    }
    .chart-scrub-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 2px;
    }
    /* The swatch carries the series' hue so the words do not have to: coloured
       body text on this ground is the contrast defect the Env Graph legend had
       taken out of it, and the same rule holds here (ADR 0039). */
    .chart-scrub-swatch {
      display: inline-block;
      width: 7px;
      height: 7px;
      margin-right: 6px;
      border-radius: 50%;
      background: var(--on-overlay-muted, rgba(255, 255, 255, 0.55));
      vertical-align: middle;
    }
    /* An interval row's swatch is the bar it was read off, not a point on a
       trace — which is what tells the two kinds of row apart without giving
       either of them a timestamp of its own. */
    .chart-scrub-swatch.is-interval {
      width: 11px;
      height: 4px;
      border-radius: 1px;
    }
    .chart-scrub-value {
      font-family: monospace;
      font-weight: 700;
    }
    .chart-scrub-cursor {
      position: absolute;
      inset-block: 0;
      border-left: 1px dashed var(--chart-scrub-rule);
    }
  `;

  render(): TemplateResult {
    const left = `${Math.max(0, Math.min(1, this.position)) * 100}%`;
    return html`
      <div class="chart-scrub-tooltip" role="tooltip" style="left:${left}">
        ${this.time === undefined
          ? nothing
          : html`<div class="chart-scrub-time">${this._formatTime(this.time)}</div>`}
        ${this.rows.map(
          (row) => html`
            <div class="chart-scrub-row">
              <span
                ><i
                  class="chart-scrub-swatch ${row.interval ? 'is-interval' : ''}"
                  style=${row.color ? `background:${row.color}` : ''}
                ></i
                >${row.title}:</span
              >
              <span class="chart-scrub-value">${row.value}</span>
            </div>
          `
        )}
      </div>
      <div class="chart-scrub-cursor" style="left:${left}"></div>
    `;
  }

  /**
   * The heading's clock.
   *
   * Whatever the user's Home Assistant locale says, rather than a forced
   * 24-hour clock: the readout that delegated used to speak one and the one
   * drawn inline the other, so the same chart told the time two ways depending
   * on which of them a metric happened to fall into (#866).
   */
  private _formatTime(time: number): string {
    return new Date(time).toLocaleTimeString(this.locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chart-scrub-tooltip': ChartScrubTooltip;
  }
}
