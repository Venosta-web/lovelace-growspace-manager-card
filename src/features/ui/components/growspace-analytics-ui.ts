import { LitElement, html, css, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { mdiFullscreen, mdiFullscreenExit } from '@mdi/js';
import type { HomeAssistant } from 'custom-card-helpers';
import type { GrowspaceDevice, SensorHistories, HistoryTimeRange } from '../../../types';
import type { MetricDescriptor } from '../../../slices/metric-descriptors';
import { growspaceCardStyles } from '../../../styles/growspace-card.styles';
import { sharedStyles } from '../../../styles/shared.styles';
import '../../../growspace-env-chart';
import { MetricKey } from '../../environment/constants';
import '../../environment/components/tank-water-chart';
import '../../environment/components/crop-steering-day-chart';

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
  /** The Metric Descriptor table the charts derive from, built by the container. */
  @property({ attribute: false }) descriptors: Record<string, MetricDescriptor> = {};
  /** True while the [[Env Graph Wall]] overlay is showing. Owned by the container. */
  @property({ type: Boolean }) fullscreen = false;
  /**
   * Whether the wall toggle may be rendered at all. The container ANDs the two
   * conditions (desktop, and no card task mode in flight); when false the button
   * is absent from the DOM rather than hidden, so it cannot be tabbed to.
   */
  @property({ type: Boolean }) canFullscreen = false;

  @query('.graphs-container') private _graphs!: HTMLElement | null;
  @query('ha-dialog') private _dialog!: HTMLElement | null;

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

      .fullscreen-toggle {
        --mdc-icon-button-size: 32px;
        --mdc-icon-size: 20px;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
        align-self: center;
      }
      .fullscreen-toggle:hover {
        color: var(--primary-text-color, #fff);
      }

      /* ---- Env Graph Wall ---- */

      ha-dialog {
        --dialog-content-padding: 0;
      }

      /*
       * The wall is the same .graphs-container node, relocated into the dialog
       * (see _syncWallPlacement). Everything below is therefore an override of
       * the inline layout above, not a second layout.
       */
      .graphs-container.wall {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(520px, 1fr));
        align-content: start;
        gap: 16px;
        padding: 0 16px 16px;
        box-sizing: border-box;
        min-height: 100%;
        /* env-chart reads this; without it a 1440p wall is six postage stamps. */
        --gs-env-chart-height: clamp(240px, 32vh, 420px);
      }
      /* The time-range row spans the grid and sticks to the top of the overlay. */
      .graphs-container.wall .time-range-selector {
        grid-column: 1 / -1;
        position: sticky;
        top: 0;
        z-index: 1;
        justify-content: flex-start;
        margin: 0 -16px 0;
        padding: 12px 16px;
        background: var(--card-background-color, #1a1a1a);
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
      }
      .graphs-container.wall .time-range-selector .fullscreen-toggle {
        margin-left: auto;
      }
      /* env-chart's own top margin fights the grid gap. */
      .graphs-container.wall > * {
        min-width: 0;
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this._onKeyDown, true);
  }

  disconnectedCallback() {
    window.removeEventListener('keydown', this._onKeyDown, true);
    super.disconnectedCallback();
  }

  render(): TemplateResult {
    if (this.items.length === 0) return html``;

    // Both children below are static elements carrying only attribute bindings,
    // so Lit holds no child part around either. The dialog is rendered
    // unconditionally and toggled through `open`, which keeps
    // `.graphs-container` one stable node for the life of the component.
    // Rendering the charts inside a conditional branch instead would tear them
    // down and rebuild them on every toggle — restarting the crop-steering
    // chart's PollingController and re-fetching the tank chart. See ADR-0046.
    return html`
      <ha-dialog
        ?open=${this.fullscreen}
        width="full"
        without-header
        prevent-scrim-close
        @closed=${this._handleDialogClosed}
      ></ha-dialog>
      <div class="graphs-container">${this._renderTimeRangeSelector()} ${this._renderBody()}</div>
    `;
  }

  private _renderBody(): TemplateResult {
    if (this.isLoading) {
      return html`
        <div
          style="display:flex;align-items:center;justify-content:center;padding:40px;color:var(--text-secondary);"
        >
          <div
            class="loading-spinner"
            style="width:24px;height:24px;border:2px solid var(--gm-primary-color);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"
          ></div>
          <span style="margin-left:12px;">Loading history data...</span>
        </div>
      `;
    }

    return html`
      ${repeat<AnalyticsItem>(
        this.items,
        (item: AnalyticsItem) =>
          item.type === 'group' ? `group-${item.metrics.join('-')}` : `single-${item.metrics[0]}`,
        (item: AnalyticsItem) => this._renderItem(item)
      )}
    `;
  }

  protected updated(changed: PropertyValues) {
    super.updated(changed);
    this._syncWallPlacement();
  }

  /**
   * Move the single `.graphs-container` between its inline slot and the dialog.
   *
   * `.graphs-container` is a static element in this component's template — Lit
   * holds no part for the element itself, only for the bindings *inside* it,
   * whose marker nodes travel with it. Relocating the node therefore keeps
   * every chart instance and every binding alive across the toggle.
   */
  private _syncWallPlacement() {
    const graphs = this._graphs;
    const dialog = this._dialog;
    if (!graphs) return;

    graphs.classList.toggle('wall', this.fullscreen);

    if (this.fullscreen) {
      if (dialog && graphs.parentElement !== dialog) dialog.appendChild(graphs);
    } else if (graphs.parentElement !== this.renderRoot) {
      (this.renderRoot as ParentNode).appendChild(graphs);
    }
  }

  private _renderTimeRangeSelector(): TemplateResult {
    const ranges: HistoryTimeRange[] = ['1h', '6h', '24h', '7d'];
    return html`
      <div class="time-range-selector">
        ${ranges.map(
          (r) => html`
            <button
              class="range-btn ${this.range === r ? 'active' : ''}"
              @click=${() => this._emitSetRange(r)}
            >
              ${r}
            </button>
          `
        )}
        ${this.canFullscreen
          ? html`
              <ha-icon-button
                class="fullscreen-toggle"
                .path=${this.fullscreen ? mdiFullscreenExit : mdiFullscreen}
                .label=${this.fullscreen ? 'Exit graph wall' : 'Open graph wall'}
                title=${this.fullscreen ? 'Exit graph wall' : 'Open graph wall'}
                @click=${() => this._emitSetFullscreen(!this.fullscreen)}
              ></ha-icon-button>
            `
          : nothing}
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
          .descriptors=${this.descriptors}
          .metrics=${item.metrics}
          .isCombined=${true}
          .range=${this.range}
          @toggle-graph=${(e: CustomEvent) => this._redispatch('toggle-graph', e.detail)}
          @unlink-graphs=${(e: CustomEvent) => this._redispatch('unlink-graphs', e.detail)}
          @unlink-graph=${(e: CustomEvent) => this._redispatch('unlink-graph', e.detail)}
        ></growspace-env-chart>
      `;
    }
    if (item.metrics[0] === MetricKey.WATER) {
      return html`
        <tank-water-chart .device=${this.device} .range=${this.range}></tank-water-chart>
      `;
    }
    if (item.metrics[0] === MetricKey.STEERING_PHASE) {
      return html`<crop-steering-day-chart
        .device=${this.device}
        .hideShotTrack=${true}
        .range=${this.range}
        .sensorHistory=${this.sensorHistory}
        .rollingWindow=${true}
      ></crop-steering-day-chart>`;
    }
    return html`
      <growspace-env-chart
        .hass=${this.hass}
        .device=${this.device}
        .sensorHistory=${this.sensorHistory}
        .descriptors=${this.descriptors}
        .metricKey=${item.metrics[0]}
        .metrics=${item.metrics}
        .range=${this.range}
        @toggle-graph=${(e: CustomEvent) => this._redispatch('toggle-graph', e.detail)}
      ></growspace-env-chart>
    `;
  }

  /**
   * `prevent-scrim-close` suppresses Escape along with the scrim click, so the
   * wall closes on Escape here instead.
   *
   * The listener is a **capture-phase** one on `window`: the dialog is a native
   * modal in the top layer, and wa-dialog stops the bubbling keydown inside its
   * own shadow root, so a bubble-phase listener here never sees it. Verified
   * against ha-dialog on HA 2026.8 — see ADR-0046.
   */
  private _onKeyDown = (event: KeyboardEvent) => {
    if (this.fullscreen && event.key === 'Escape') {
      event.stopPropagation();
      this._emitSetFullscreen(false);
    }
  };

  private _handleDialogClosed() {
    if (this.fullscreen) this._emitSetFullscreen(false);
  }

  private _emitSetRange(range: HistoryTimeRange) {
    this.dispatchEvent(
      new CustomEvent('set-range', { detail: range, bubbles: true, composed: true })
    );
  }

  private _emitSetFullscreen(fullscreen: boolean) {
    this.dispatchEvent(
      new CustomEvent('set-fullscreen', { detail: fullscreen, bubbles: true, composed: true })
    );
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
