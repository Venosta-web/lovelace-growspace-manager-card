import { LitElement, html, css, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { mdiFullscreen, mdiFullscreenExit } from '@mdi/js';
import type { HomeAssistant } from 'custom-card-helpers';
import type { GrowspaceDevice, SensorHistories, HistoryTimeRange } from '../../../types';
import type { MetricDescriptor } from '../../../slices/metric-descriptors';
import { localizeWithParams } from '../../../localize/localize';
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

  private _localize(key: string, params: Record<string, string | number> = {}): string {
    return localizeWithParams(key, params, this.hass?.locale?.language ?? 'en');
  }

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
      /* Inline, .graphs is a grouping element only — the charts stay direct
         flex children of .graphs-container. In the wall it becomes the grid. */
      .graphs {
        display: contents;
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

      /*
       * width="full" alone is not full bleed: --ha-dialog-width-full
       * defaults to min(95vw, var(--safe-width)), and the surface height is
       * content-driven under max-height: calc(var(--safe-height) - space-20).
       * Both leave a scrim margin the Wall has no use for. The properties below
       * are ha-dialog's own theme hooks; --safe-width / --safe-height are
       * 100vw / 100vh minus the safe-area insets, which is what "fullscreen"
       * means on a device with a notch.
       *
       * Home Assistant's own [fullscreen] attribute sets the same geometry,
       * but it also sets .body { overflow: hidden } — and .body is the
       * Wall's only scroll container once the graphs outgrow the viewport.
       */
      ha-dialog {
        --dialog-content-padding: 0;
        --ha-dialog-width-full: var(--safe-width, 100vw);
        --ha-dialog-max-width: var(--safe-width, 100vw);
        --ha-dialog-min-height: var(--safe-height, 100vh);
        --ha-dialog-max-height: var(--safe-height, 100vh);
        --ha-dialog-border-radius: 0;
        --dialog-surface-margin-top: 0;
      }

      /*
       * The wall is the same .graphs-container node, relocated into the dialog
       * (see _syncWallPlacement). Everything below is therefore an override of
       * the inline layout above, not a second layout.
       *
       * The container is the vertical frame — toolbar, then graphs — and
       * .graphs is the stack. They are two elements rather than one so that the
       * toolbar is not a grid row: the stack stretches its rows to spend the
       * viewport height, and a toolbar inside it would take an equal share of
       * that space.
       */
      .graphs-container.wall {
        display: flex;
        flex-direction: column;
        gap: 0;
        /*
         * The surface is exactly --safe-height and carries no header, footer or
         * content padding, so its scrollable body is that tall too. A percentage
         * cannot say this: ha-dialog's body is a flex-grown item with height:auto,
         * and Chromium leaves min-height:100% unresolved against it — measured
         * at :8123, where the wall stopped at its content height of 472px inside
         * a 1000px surface.
         */
        min-height: var(--safe-height, 100vh);
        box-sizing: border-box;
      }
      /* Sticky against ha-dialog's .body, which is the scroller. */
      .graphs-container.wall .time-range-selector {
        position: sticky;
        top: 0;
        z-index: 1;
        flex: none;
        justify-content: flex-start;
        margin: 0;
        padding: 12px 16px;
        background: var(--card-background-color, #1a1a1a);
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
      }
      .graphs-container.wall .time-range-selector .fullscreen-toggle {
        margin-left: auto;
      }
      /*
       * flex: 1 0 auto plus stretched rows is what spends the full viewport
       * height: one open graph fills the wall, a handful share it evenly, and
       * once they need more than the viewport the rows fall back to their floor
       * and .body scrolls.
       */
      .graphs-container.wall .graphs {
        display: grid;
        /* One full-width column: the graphs stack vertically, each spanning the
           whole wall, rather than tiling into columns. */
        grid-template-columns: 1fr;
        /* Every chart gets the same row height. max-content preserves each
           chart's intrinsic chrome (including the steering phase strip), while
           1fr lets a small set share spare viewport height evenly. */
        grid-auto-rows: minmax(max-content, 1fr);
        align-content: stretch;
        gap: 16px;
        padding: 16px;
        box-sizing: border-box;
        flex: 1 0 auto;
        /* The floor a chart body grows from; without it a 1440p wall is six
           postage stamps. env-chart reads it as a flex-basis, not a fixed
           height. */
        --gs-env-chart-height: clamp(240px, 30vh, 460px);
      }
      .graphs-container.wall .graphs > * {
        min-width: 0;
      }
      /* env-chart's top margin is spacing for the inline stack; here the grid
         gap owns it, and a margin would push the card past its stretched row. */
      .graphs-container.wall .graphs > growspace-env-chart {
        margin-top: 0;
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
      <div class="graphs-container">
        ${this._renderTimeRangeSelector()}
        <div class="graphs">${this._renderBody()}</div>
      </div>
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
          <span style="margin-left:12px;">${this._localize('analytics.loading_history')}</span>
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
    const fullscreenLabel = this._localize(
      this.fullscreen ? 'analytics.exit_graph_wall' : 'analytics.open_graph_wall'
    );
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
                .label=${fullscreenLabel}
                title=${fullscreenLabel}
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
    // Both tank metrics open the same card: the combined graph draws the level
    // trace and the consumption bars over one X axis, so routing them apart
    // would give the grower two halves of one story (design 2a).
    if (
      item.metrics[0] === MetricKey.WATER ||
      item.metrics[0] === MetricKey.IRRIGATION_TANK_LEVEL
    ) {
      return html`
        <tank-water-chart
          .device=${this.device}
          .range=${this.range}
          .sensorHistory=${this.sensorHistory}
          .metricKey=${item.metrics[0]}
        ></tank-water-chart>
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
