import { LitElement, html, css, svg } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { customElement, property } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { storeContext, hassContext } from '../../context';
import { ChartUtils } from '../../utils/chart-utils';
import { GrowspaceDevice } from '../../types';
import { HeaderChip } from '../../utils/metrics-utils';
import { StoreController } from '@nanostores/lit';
import { sharedStyles } from '../../styles/shared.styles';

@customElement('growspace-header-hero')
export class GrowspaceHeaderHero extends LitElement {
  @consume({ context: storeContext, subscribe: true })
  @property({ attribute: false })
  public store!: any;

  @consume({ context: hassContext, subscribe: true })
  public hass!: any;

  @property({ attribute: false }) public device!: GrowspaceDevice;
  @property({ attribute: false }) public chips: HeaderChip[] = [];
  @property({ type: Boolean }) public isMobile = false;
  @property({ type: Boolean }) public mobileLink = false;

  // History data needed for sparklines
  private _historyCacheController!: StoreController<any>;

  connectedCallback() {
    super.connectedCallback();
    if (this.store) {
      this._historyCacheController = new StoreController(this, this.store.history.$historyCache);
    }
  }

  private _handleChipDragStart(e: DragEvent, metric: string) {
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', metric);
    }
    this.dispatchEvent(
      new CustomEvent('chip-drag-start', { detail: { metric }, bubbles: true, composed: true })
    );
  }

  private _handleChipDrop(e: DragEvent, targetMetric: string) {
    e.preventDefault();
    this.dispatchEvent(
      new CustomEvent('chip-drop', { detail: { targetMetric }, bubbles: true, composed: true })
    );
  }

  private _handleDragOver(e: DragEvent) {
    e.preventDefault(); // Allow drop
  }

  private _toggleEnvGraph(metric: string) {
    this.dispatchEvent(
      new CustomEvent('toggle-graph', { detail: { metric }, bubbles: true, composed: true })
    );
  }

  static styles = [
    sharedStyles,
    css`
      :host {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 16px;
        width: 100%;
        min-height: 50px;
      }

      .hero-card {
        background: var(--glass-bg, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        backdrop-filter: var(--glass-blur);
        box-shadow:
          0 4px 24px -1px rgba(0, 0, 0, 0.2),
          0 0 0 1px rgba(255, 255, 255, 0.02) inset;

        border-radius: 24px;
        padding: 20px 24px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        position: relative;
        cursor: grab;
        transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
        overflow: hidden;
        min-height: 110px;
      }

      .hero-card:active {
        cursor: grabbing;
        transform: scale(0.98);
      }

      .hero-card:hover {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.08));
        border-color: var(--divider-color, rgba(255, 255, 255, 0.15));
        box-shadow:
          0 8px 32px -4px rgba(0, 0, 0, 0.3),
          0 0 0 1px rgba(255, 255, 255, 0.05) inset;
        transform: translateY(-2px);
      }

      .hero-card.linked {
        border-color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.08));
      }

      .hero-value-group {
        display: flex;
        align-items: baseline;
        gap: 4px;
        position: relative;
        z-index: 1;
      }

      .hero-value {
        font-size: 2rem;
        font-weight: 400;
        color: var(--primary-text-color, #fff);
        line-height: 1;
      }

      .hero-unit {
        font-size: 1rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
        font-weight: 500;
      }

      .hero-card.active {
        background: color-mix(
          in srgb,
          var(--primary-color, #2196f3) 15%,
          var(--glass-bg, rgba(255, 255, 255, 0.05))
        );
        border-color: var(--primary-color, #2196f3);
        box-shadow:
          0 8px 32px -4px rgba(0, 0, 0, 0.3),
          0 0 0 1px var(--primary-color, #2196f3) inset;
      }

      .hero-card.active .hero-value,
      .hero-card.active .hero-label,
      .hero-card.active .hero-unit,
      .hero-card.active .hero-icon {
        color: var(--primary-text-color, #fff) !important;
        fill: var(--primary-text-color, #fff) !important;
      }

      .hero-sparkline {
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 50%;
        pointer-events: none;
        z-index: 0;
        opacity: 0.7;
      }

      .hero-sparkline path {
        transition:
          d 0.5s cubic-bezier(0.4, 0, 0.2, 1),
          stroke 0.3s ease,
          fill 0.3s ease;
      }

      @media (max-width: 600px) {
        :host {
          gap: 12px;
        }
        .hero-value {
          font-size: 1.75rem;
        }
      }

      .hero-multi-values {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 1.5rem;
        color: var(--primary-text-color);
      }

      .hero-multi-divider {
        width: 1px;
        height: 24px;
        background: var(--divider-color, rgba(255, 255, 255, 0.1));
      }
    `,
  ];

  render() {
    return html`
      ${repeat(
        this.chips,
        (chip) => chip.key,
        (chip) => this._renderHeroCard(chip)
      )}
    `;
  }

  private _renderHeroCard(chip: HeaderChip) {
    const match = String(chip.value || '').match(/^([\d.,]+)\s*(.*)$/);
    const val = match ? match[1] : chip.value;
    const unit = match ? match[2] : '';

    const sparklineWidth = 140;
    const sparklineHeight = 80;

    const timeRange = (this.store?.history as any)?.getRange() || '24h';
    const isVpd = chip.key === 'vpd';
    let vpdSegments: Array<{ path: string; color: string }> = [];

    if (isVpd && this.store?.history && this.device) {
      const historyData = this._historyCacheController?.value?.vpd;
      const lightHistory = this._historyCacheController?.value?.light || [];

      const overviewEntity = this.device.overviewEntityId
        ? this.hass?.states[this.device.overviewEntityId]
        : null;

      const attrs = overviewEntity?.attributes || {};
      // Default thresholds fallback
      const day = {
        targetMin: attrs.day_vpd_target_min ?? attrs.vpd_target_min ?? 0.8,
        targetMax: attrs.day_vpd_target_max ?? attrs.vpd_target_max ?? 1.2,
        dangerMin: attrs.day_vpd_danger_min ?? attrs.vpd_danger_min ?? 0.4,
        dangerMax: attrs.day_vpd_danger_max ?? attrs.vpd_danger_max ?? 1.6,
      };
      const night = {
        targetMin: attrs.night_vpd_target_min ?? day.targetMin,
        targetMax: attrs.night_vpd_target_max ?? day.targetMax,
        dangerMin: attrs.night_vpd_danger_min ?? day.dangerMin,
        dangerMax: attrs.night_vpd_danger_max ?? day.dangerMax,
      };

      vpdSegments = ChartUtils.generateVpdSparklineSegments(
        historyData,
        sparklineWidth,
        sparklineHeight,
        { day, night },
        lightHistory,
        timeRange
      );
    }

    const useVpdSegments = isVpd && vpdSegments.length > 0;
    let sparklinePath = '';

    if (!useVpdSegments && this.store?.history) {
      sparklinePath = ChartUtils.generateSparklinePath(
        this._historyCacheController?.value?.[chip.key],
        sparklineWidth,
        sparklineHeight,
        timeRange
      );
    }

    const sparklineColor = ChartUtils.getSparklineColor(chip.key, chip.status);

    return html`
      <div
        class="hero-card ${chip.status ? `status-${chip.status}` : ''} ${chip.active
          ? 'active'
          : ''} ${chip.linked ? 'linked' : ''}"
        draggable="${!this.isMobile || this.mobileLink}"
        @dragstart=${(e: DragEvent) => this._handleChipDragStart(e, chip.key)}
        @drop=${(e: DragEvent) => this._handleChipDrop(e, chip.key)}
        @dragover=${(e: DragEvent) => this._handleDragOver(e)}
        @click=${() => this._toggleEnvGraph(chip.key)}
        title="${chip.tooltip || ''}"
      >
        ${useVpdSegments
          ? html`
              <svg
                class="hero-sparkline"
                viewBox="0 0 ${sparklineWidth} ${sparklineHeight}"
                preserveAspectRatio="none"
                style="overflow: visible;"
              >
                <rect
                  x="0"
                  y="0"
                  width="${sparklineWidth}"
                  height="${sparklineHeight}"
                  fill="transparent"
                />
                ${vpdSegments.map(
                  (seg) => svg`
                      <path d="${seg.path}" fill="none" stroke="${seg.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                    `
                )}
              </svg>
            `
          : sparklinePath
            ? html`
                <svg
                  class="hero-sparkline"
                  viewBox="0 0 ${sparklineWidth} ${sparklineHeight}"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient
                      id="sparkline-grad-${chip.key}"
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <stop offset="0%" stop-color="${sparklineColor}" stop-opacity="0.3" />
                      <stop offset="100%" stop-color="${sparklineColor}" stop-opacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="${sparklinePath} V ${sparklineHeight} H 0 Z"
                    fill="url(#sparkline-grad-${chip.key})"
                  />
                  <path
                    d="${sparklinePath}"
                    fill="none"
                    stroke="${sparklineColor}"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              `
            : ''}

        <div class="hero-value-group">
          ${chip.multiValues && chip.multiValues.length > 0
            ? html`
                <div class="hero-multi-values">
                  ${chip.multiValues.map(
                    (v, i) => html`
                      ${i > 0 ? html`<div class="hero-multi-divider"></div>` : ''}
                      <span>${v}</span>
                    `
                  )}
                </div>
              `
            : html`
                <span class="hero-value">${val}</span>
                <span class="hero-unit">${unit}</span>
              `}
        </div>
      </div>
    `;
  }
}
