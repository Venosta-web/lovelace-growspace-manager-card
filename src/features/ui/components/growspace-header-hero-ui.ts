import { LitElement, html, css, svg, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { customElement, property, state, query } from 'lit/decorators.js';
import { ChartUtils } from '../../../utils/chart-utils';
import { GrowspaceDevice } from '../../../types';
import { HeaderChip } from '../../../slices/header-metrics';
import { metricHistoryKeys } from '../../../slices/metric-descriptors';
import { sharedStyles } from '../../../styles/shared.styles';
import { statusTokens } from '../../../styles/status.styles';
import { MetricKey, STATUS_CUES, toStatusLevel } from '../../../features/environment/constants';
import type { IrrigationStrategy, IrrigationConfig } from '../../../services/types';
import type { RawHistoryDataPoint } from '../../../adapters/hass-types';
import type { HomeAssistant } from 'custom-card-helpers';
import { mdiChevronDown } from '@mdi/js';
import './growspace-phase-hero-card';

@customElement('growspace-header-hero-ui')
export class GrowspaceHeaderHeroUI extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public device!: GrowspaceDevice;
  @property({ attribute: false }) public chips: HeaderChip[] = [];
  @property({ attribute: false }) public additionalChips: HeaderChip[] = [];
  @property({ type: Boolean }) public isMobile = false;
  @property({ type: Boolean }) public mobileLink = false;
  @property({ attribute: false }) public historyCache: any = {};
  @property() public timeRange = '24h';

  @property({ attribute: false }) public irrigationStrategy: IrrigationStrategy | null = null;
  @property({ attribute: false }) public irrigationConfig: IrrigationConfig | null = null;
  @property({ type: Boolean }) public isFlower = false;

  @state() private _deckIndex = 0;
  @query('.deck-scroll') private _deckEl?: HTMLElement;

  private _prioritizeExceptions(chips: HeaderChip[]): HeaderChip[] {
    const highestPriorityIndex = chips.findIndex((chip) => chip.status === 'danger');
    const exceptionIndex =
      highestPriorityIndex >= 0
        ? highestPriorityIndex
        : chips.findIndex((chip) => chip.status === 'warning');

    if (exceptionIndex <= 0) return chips;
    return [
      chips[exceptionIndex],
      ...chips.slice(0, exceptionIndex),
      ...chips.slice(exceptionIndex + 1),
    ];
  }

  private get _primaryMobileChips(): HeaderChip[] {
    const allChips = [...this.chips, ...this.additionalChips].filter(
      (chip, index, chips) => chips.findIndex((candidate) => candidate.key === chip.key) === index
    );
    const primaryCount = Math.max(1, this.chips.length);
    return this._prioritizeExceptions(allChips).slice(0, primaryCount);
  }

  private get _moreMobileChips(): HeaderChip[] {
    const allChips = [...this.chips, ...this.additionalChips].filter(
      (chip, index, chips) => chips.findIndex((candidate) => candidate.key === chip.key) === index
    );
    const primaryKeys = new Set(this._primaryMobileChips.map((chip) => chip.key));
    return this._prioritizeExceptions(allChips).filter((chip) => !primaryKeys.has(chip.key));
  }

  protected willUpdate(changedProperties: Map<PropertyKey, unknown>): void {
    if (changedProperties.has('chips') || changedProperties.has('additionalChips')) {
      this._deckIndex = 0;
    }
  }

  private _onDeckScroll() {
    const el = this._deckEl;
    if (!el) return;
    const items = Array.from(el.children) as HTMLElement[];
    if (items.length === 0) return;
    const next = items.reduce(
      (closest, item, index) =>
        Math.abs(item.offsetLeft - el.scrollLeft) <
        Math.abs(items[closest].offsetLeft - el.scrollLeft)
          ? index
          : closest,
      0
    );
    if (next !== this._deckIndex) this._deckIndex = next;
  }

  private _goToReading(index: number) {
    const chips = this._primaryMobileChips;
    const next = Math.max(0, Math.min(index, chips.length - 1));
    const item = this._deckEl?.children.item(next) as HTMLElement | null;
    if (!item || !this._deckEl) return;

    this._deckIndex = next;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._deckEl.scrollTo({ left: item.offsetLeft, behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  private _handleDeckKeydown(event: KeyboardEvent) {
    let next: number | undefined;
    switch (event.key) {
      case 'ArrowLeft':
        next = this._deckIndex - 1;
        break;
      case 'ArrowRight':
        next = this._deckIndex + 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = this._primaryMobileChips.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    this._goToReading(next);
  }

  private _renderDeck() {
    const primaryChips = this._primaryMobileChips;
    const moreChips = this._moreMobileChips;
    const currentChip = primaryChips[this._deckIndex] ?? primaryChips[0];

    return html`
      <section class="mobile-reading-flow" aria-labelledby="mobile-readings-heading">
        <div class="deck-heading-row">
          <h2 id="mobile-readings-heading">Readings</h2>
          <span class="reading-position" aria-live="polite" aria-atomic="true">
            ${currentChip
              ? `Reading ${this._deckIndex + 1} of ${primaryChips.length}: ${currentChip.label ?? currentChip.key}`
              : 'No readings available'}
          </span>
        </div>
        <div
          class="deck-scroll"
          role="region"
          aria-roledescription="carousel"
          aria-label="Prioritized growspace readings"
          tabindex="0"
          @keydown=${this._handleDeckKeydown}
          @scroll=${this._onDeckScroll}
        >
          ${repeat(
            primaryChips,
            (chip) => chip.key,
            (chip, index) => html`
              <div
                class="deck-item"
                role="group"
                aria-roledescription="slide"
                aria-label="${chip.label ?? chip.key}, reading ${index +
                1} of ${primaryChips.length}"
              >
                ${this._renderHeroCard(chip)}
              </div>
            `
          )}
        </div>
        ${primaryChips.length > 1
          ? html`
              <div class="deck-navigation" aria-label="Reading navigation">
                <button
                  class="deck-arrow"
                  type="button"
                  aria-label="Previous reading"
                  ?disabled=${this._deckIndex === 0}
                  @click=${() => this._goToReading(this._deckIndex - 1)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M15.4 16.6 10.8 12l4.6-4.6L14 6l-6 6 6 6 1.4-1.4Z"></path>
                  </svg>
                </button>
                <div class="deck-dots">
                  ${primaryChips.map(
                    (chip, index) => html`
                      <button
                        class="deck-dot ${index === this._deckIndex ? 'active' : ''}"
                        type="button"
                        aria-label="Show ${chip.label ?? chip.key}, reading ${index +
                        1} of ${primaryChips.length}"
                        aria-current=${index === this._deckIndex ? 'true' : nothing}
                        @click=${() => this._goToReading(index)}
                      ></button>
                    `
                  )}
                </div>
                <button
                  class="deck-arrow"
                  type="button"
                  aria-label="Next reading"
                  ?disabled=${this._deckIndex === primaryChips.length - 1}
                  @click=${() => this._goToReading(this._deckIndex + 1)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m8.6 16.6 4.6-4.6-4.6-4.6L10 6l6 6-6 6-1.4-1.4Z"></path>
                  </svg>
                </button>
              </div>
            `
          : nothing}
        ${moreChips.length > 0
          ? html`
              <details class="more-readings">
                <summary>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d=${mdiChevronDown}></path>
                  </svg>
                  More readings <span>${moreChips.length}</span>
                </summary>
                <div class="more-readings-grid">
                  ${repeat(
                    moreChips,
                    (chip) => chip.key,
                    (chip) => this._renderHeroCard(chip)
                  )}
                </div>
              </details>
            `
          : nothing}
      </section>
    `;
  }

  private _handleChipDragStart(e: DragEvent, metric: string) {
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', metric);
    }
    this.dispatchEvent(
      new CustomEvent('chip-drag-start', {
        detail: { metric, event: e },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleChipDrop(e: DragEvent, targetMetric: string) {
    e.preventDefault();
    this.dispatchEvent(
      new CustomEvent('chip-drop', { detail: { targetMetric }, bubbles: true, composed: true })
    );
  }

  private _handleDragOver(e: DragEvent) {
    e.preventDefault();
  }

  private _toggleEnvGraph(metric: string) {
    this.dispatchEvent(
      new CustomEvent('toggle-graph', { detail: { metric }, bubbles: true, composed: true })
    );
  }

  /**
   * A hero card also colors its icon and sparkline by status, so the badge carries
   * the matching icon and word for every level — including optimal, whose green
   * sparkline would otherwise be a color-only signal.
   */
  private _renderStatusBadge(chip: HeaderChip) {
    const level = toStatusLevel(chip.status);
    if (!level) return nothing;

    const cue = STATUS_CUES[level];
    return html`
      <span class="status-cue hero-status-badge status-${level}">
        <svg viewBox="0 0 24 24"><path d="${cue.icon}"></path></svg>
        <span>${cue.label}</span>
      </span>
    `;
  }

  static styles = [
    sharedStyles,
    statusTokens,
    css`
      :host {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 16px;
        width: 100%;
        min-height: 50px;
      }

      growspace-phase-hero-card {
        display: contents;
      }

      .hero-card {
        background: var(--glass-bg, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        backdrop-filter: var(--glass-blur);
        box-shadow:
          0 4px 24px -1px rgba(0, 0, 0, 0.2),
          0 0 0 1px rgba(255, 255, 255, 0.02) inset;

        border-radius: var(--border-radius-xl, 28px);
        padding: 20px 24px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        position: relative;
        cursor: grab;
        transition:
          background-color 0.2s cubic-bezier(0.2, 0, 0, 1),
          border-color 0.2s cubic-bezier(0.2, 0, 0, 1),
          box-shadow 0.2s cubic-bezier(0.2, 0, 0, 1),
          transform 0.2s cubic-bezier(0.2, 0, 0, 1);
        overflow: hidden;
        min-height: 110px;
        width: 100%;
        color: inherit;
        font: inherit;
        text-align: start;
        appearance: none;
      }

      .hero-card:focus-visible {
        outline: 3px solid var(--gm-primary-color);
        outline-offset: 3px;
      }

      .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
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

      .hero-header {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
        z-index: 1;
      }

      .hero-icon {
        --mdc-icon-size: 20px;
        flex-shrink: 0;
      }

      .hero-label {
        font-size: 0.9rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .hero-value-group {
        display: flex;
        align-items: baseline;
        gap: 4px;
        position: relative;
        z-index: 1;
      }

      .hero-value {
        font-size: var(--font-size-xl);
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
          var(--gm-primary-color) 15%,
          var(--glass-bg, rgba(255, 255, 255, 0.05))
        );
        border-color: var(--gm-primary-color);
        box-shadow:
          0 8px 32px -4px rgba(0, 0, 0, 0.3),
          0 0 0 1px var(--gm-primary-color) inset;
      }

      .hero-card.active .hero-value,
      .hero-card.active .hero-label,
      .hero-card.active .hero-unit {
        color: var(--primary-text-color, #fff) !important;
      }

      .hero-card.active .hero-icon {
        color: var(--primary-text-color, #fff);
        fill: currentColor;
      }

      .phase-hero-card.active .hero-label {
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.55)) !important;
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
          display: block;
        }

        .deck-scroll {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
          padding: 3px;
          border-radius: var(--border-radius-lg, 16px);
        }

        .deck-scroll::-webkit-scrollbar {
          display: none;
        }

        .deck-scroll:focus-visible {
          outline: 3px solid var(--primary-color, #4caf50);
          outline-offset: 2px;
        }

        .deck-item {
          flex: 0 0 100%;
          scroll-snap-align: start;
          min-width: 0;
        }

        .mobile-reading-flow {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .deck-heading-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
        }

        .deck-heading-row h2 {
          margin: 0;
          color: var(--primary-text-color, #fff);
          font-size: 1rem;
          font-weight: 600;
          line-height: 1.4;
        }

        .reading-position {
          color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
          font-size: 0.75rem;
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .deck-navigation {
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr) 44px;
          align-items: center;
          gap: 8px;
        }

        .deck-arrow,
        .deck-dot {
          border: 0;
          color: var(--primary-text-color, #fff);
          background: transparent;
          font: inherit;
          cursor: pointer;
        }

        .deck-arrow {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: var(--secondary-background-color, rgba(255, 255, 255, 0.08));
        }

        .deck-arrow svg {
          width: 22px;
          height: 22px;
          fill: currentColor;
        }

        .deck-arrow:disabled {
          opacity: 0.38;
          cursor: default;
        }

        .deck-arrow:focus-visible,
        .deck-dot:focus-visible,
        .more-readings summary:focus-visible {
          outline: 3px solid var(--primary-color, #4caf50);
          outline-offset: 2px;
        }

        .deck-dots {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
          min-width: 0;
        }

        .deck-dot {
          position: relative;
          width: 28px;
          height: 44px;
          border-radius: var(--border-radius-md, 12px);
        }

        .deck-dot::before {
          content: '';
          position: absolute;
          top: 19px;
          left: 9px;
          height: 6px;
          width: 10px;
          border-radius: var(--border-radius-full, 9999px);
          background: var(--divider-color, rgba(255, 255, 255, 0.24));
          transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
        }

        .deck-dot.active::before {
          left: 5px;
          width: 18px;
          background: var(--primary-color, #4caf50);
        }

        .more-readings {
          border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
          padding-top: 4px;
        }

        .more-readings summary {
          min-height: 48px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--primary-text-color, #fff);
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          list-style-position: inside;
        }

        .more-readings summary span {
          min-width: 24px;
          height: 24px;
          padding: 0 7px;
          border-radius: var(--border-radius-md, 12px);
          display: inline-grid;
          place-items: center;
          background: var(--secondary-background-color, rgba(255, 255, 255, 0.08));
          color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
          font-size: 0.75rem;
          font-variant-numeric: tabular-nums;
        }

        .more-readings summary svg {
          width: 20px;
          height: 20px;
          fill: currentColor;
          transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1);
        }

        .more-readings[open] summary svg {
          transform: rotate(180deg);
        }

        .more-readings-grid {
          display: grid;
          gap: 12px;
          padding-top: 8px;
        }

        .more-readings-grid .hero-card {
          min-height: 96px;
          border-radius: var(--border-radius-lg, 16px);
          padding: 16px;
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

      /*
       * The badge classes used to be status-ok / status-error while every producer
       * of HeaderChip.status emits optimal / warning / danger, so two of the three
       * levels rendered as unstyled text. They now key off the real vocabulary and
       * read their hue from the shared status tokens.
       */
      .hero-status-badge {
        padding: 2px 8px;
        border-radius: var(--border-radius-full, 9999px);
        border: 1px solid transparent;
        margin-left: auto;
      }

      .hero-status-badge.status-optimal {
        background: var(--gm-status-optimal-fill);
        border-color: var(--gm-status-optimal-outline);
      }

      .hero-status-badge.status-warning {
        background: var(--gm-status-warning-fill);
        border-color: var(--gm-status-warning-outline);
      }

      .hero-status-badge.status-danger {
        background: var(--gm-status-danger-fill);
        border-color: var(--gm-status-danger-outline);
      }

      /* ── Phase hero card ─────────────────────────── */

      .phase-hero-card {
        min-height: 110px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        border-color: color-mix(in srgb, var(--crop-steering-accent) 16%, transparent);
        background:
          linear-gradient(
            180deg,
            color-mix(in srgb, var(--crop-steering-accent) 4.5%, transparent) 0%,
            color-mix(in srgb, var(--crop-steering-accent) 1.2%, transparent) 100%
          ),
          var(--glass-bg, rgba(255, 255, 255, 0.05));
        backdrop-filter: var(--glass-blur);
        box-shadow:
          0 4px 24px -1px rgba(0, 0, 0, 0.2),
          0 0 0 1px rgba(255, 255, 255, 0.02) inset;
      }

      .phase-hero-card:hover {
        background:
          linear-gradient(
            180deg,
            color-mix(in srgb, var(--crop-steering-accent) 5.5%, transparent) 0%,
            color-mix(in srgb, var(--crop-steering-accent) 1.8%, transparent) 100%
          ),
          var(--secondary-background-color, rgba(255, 255, 255, 0.08));
        border-color: color-mix(in srgb, var(--crop-steering-accent) 28%, transparent);
        box-shadow:
          0 8px 32px -4px rgba(0, 0, 0, 0.3),
          0 0 0 1px rgba(255, 255, 255, 0.05) inset;
        transform: translateY(-2px);
      }

      .phase-hero-card.active {
        background:
          linear-gradient(
            180deg,
            color-mix(in srgb, var(--crop-steering-accent) 8%, transparent) 0%,
            color-mix(in srgb, var(--crop-steering-accent) 2.5%, transparent) 100%
          ),
          var(--glass-bg, rgba(255, 255, 255, 0.05));
        border-color: color-mix(in srgb, var(--crop-steering-accent) 30%, transparent);
        box-shadow:
          0 8px 32px -4px rgba(0, 0, 0, 0.3),
          0 0 0 1px color-mix(in srgb, var(--crop-steering-accent) 35%, transparent) inset;
      }

      .phase-hero-card .hero-header {
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.55));
      }

      .hero-card.phase-hero-card .hero-icon {
        color: color-mix(in srgb, var(--crop-steering-accent) 85%, transparent);
        fill: currentColor;
      }

      .phase-hero-card .hero-label {
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.55)) !important;
      }

      .phase-vwc-readout {
        margin-left: auto;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.55));
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        flex-shrink: 0;
      }

      .phase-badge {
        display: inline-flex;
        align-items: center;
        padding: 2px 7px;
        border-radius: var(--border-radius-full, 9999px);
        font-size: var(--font-size-xs);
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        margin-left: 6px;
        flex-shrink: 0;
        align-self: center;
      }

      .phase-badge--dryback {
        color: var(--phase-p3);
        background: color-mix(in srgb, var(--phase-p3) 14%, transparent);
        border: 1px solid color-mix(in srgb, var(--phase-p3) 38%, transparent);
      }

      .phase-chart-container {
        position: relative;
        flex: 1;
        min-height: 68px;
        overflow: visible;
      }

      .phase-chart-svg {
        display: block;
        width: 100%;
        height: 100%;
        cursor: crosshair;
        overflow: visible;
      }

      .phase-now-pulse {
        animation: phase-pulse 2.4s ease-out infinite;
        transform-box: fill-box;
        transform-origin: center;
      }

      @keyframes phase-pulse {
        0% {
          transform: scale(1);
          opacity: 0.4;
        }
        70%,
        100% {
          transform: scale(2.6);
          opacity: 0;
        }
      }

      /* Respect user motion preferences (WCAG 2.3.3) */
      @media (prefers-reduced-motion: reduce) {
        .phase-now-pulse {
          animation: none;
          opacity: 0;
        }

        .hero-card,
        .hero-sparkline path,
        .deck-dot {
          transition: none;
        }

        .hero-card:hover,
        .phase-hero-card:hover,
        .hero-card:active {
          transform: none;
        }
      }

      .phase-tooltip {
        position: absolute;
        top: -4px;
        transform: translateX(-50%);
        padding: 3px 7px;
        border-radius: var(--border-radius-sm, 8px);
        pointer-events: none;
        background: rgba(20, 20, 24, 0.85);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 0.67rem;
        white-space: nowrap;
        display: flex;
        gap: 5px;
        z-index: 10;
      }

      .phase-tooltip-phase {
        font-weight: 700;
      }

      .phase-tooltip-time {
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.55));
        font-variant-numeric: tabular-nums;
      }

      .phase-tooltip-vwc {
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
        font-variant-numeric: tabular-nums;
      }

      .phase-bar {
        padding: 0 2px;
        flex-shrink: 0;
      }

      .phase-bar-track {
        position: relative;
        height: 6px;
        border-radius: var(--border-radius-xs, 4px);
        overflow: hidden;
        background: rgba(255, 255, 255, 0.05);
      }

      .phase-bar-seg {
        position: absolute;
        top: 0;
        height: 100%;
      }

      .phase-bar-now {
        position: absolute;
        top: -2px;
        width: 2px;
        height: 10px;
        background: var(--text-primary);
        border-radius: var(--border-radius-xs, 4px);
        transform: translateX(-50%);
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.6);
      }

      .phase-bar-labels {
        position: relative;
        height: 14px;
        margin-top: 2px;
      }

      .phase-bar-label {
        position: absolute;
        transform: translateX(-50%);
        font-size: var(--font-size-xs);
        font-weight: 600;
        letter-spacing: 0.05em;
        opacity: 0.85;
        white-space: nowrap;
      }
    `,
  ];

  render() {
    if (this.isMobile) {
      return this._renderDeck();
    }
    return html`
      ${repeat(
        this.chips,
        (chip) => chip.key,
        (chip) => this._renderHeroCard(chip)
      )}
    `;
  }

  private _renderPhaseHeroCard(chip: HeaderChip) {
    const historyData = (this.historyCache as Record<string, RawHistoryDataPoint[]>)?.[
      MetricKey.SOIL_MOISTURE
    ];

    return html`
      <growspace-phase-hero-card
        .chip=${chip}
        .strategy=${this.irrigationStrategy!}
        .config=${this.irrigationConfig}
        .historyData=${historyData}
        .timeRange=${this.timeRange}
      ></growspace-phase-hero-card>
    `;
  }
  private _renderHeroCard(chip: HeaderChip) {
    if (chip.key === MetricKey.STEERING_PHASE && this.irrigationStrategy?.enabled) {
      return this._renderPhaseHeroCard(chip);
    }

    const match = String(chip.value || '').match(/^([\d.,]+)\s*(.*)$/);
    const val = match ? match[1] : chip.value;
    const unit = match ? match[2] : '';

    const sparklineWidth = 140;
    const sparklineHeight = 80;

    const timeRange = this.timeRange;
    const isVpd = chip.key === 'vpd';
    let vpdSegments: Array<{ path: string; color: string }> = [];

    if (isVpd && this.device) {
      const lightHistory = (this.historyCache as any)?.light || [];

      const overviewEntity = this.device.overviewEntityId
        ? this.hass?.states[this.device.overviewEntityId]
        : null;

      const attrs = overviewEntity?.attributes || {};
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
        this.historyCache?.vpd,
        sparklineWidth,
        sparklineHeight,
        { day, night },
        lightHistory,
        timeRange as any
      );
    }

    const useVpdSegments = isVpd && vpdSegments.length > 0;
    const sparklineColor = ChartUtils.getSparklineColor(chip.key, chip.status);
    const entityIds = chip.entityIds || [];
    const sparklinePaths: Array<{ d: string; color: string }> = [];

    if (!useVpdSegments) {
      if (entityIds.length > 1) {
        const historyKeys = metricHistoryKeys(chip.key, entityIds);
        historyKeys.forEach(({ historyKey }, idx) => {
          const path = ChartUtils.generateSparklinePath(
            (this.historyCache as any)?.[historyKey],
            sparklineWidth,
            sparklineHeight,
            timeRange as any
          );
          if (path) {
            const color =
              idx === 0
                ? sparklineColor
                : `color-mix(in srgb, ${sparklineColor}, white ${idx * 20}%)`;
            sparklinePaths.push({ d: path, color });
          }
        });
      } else {
        const path = ChartUtils.generateSparklinePath(
          (this.historyCache as any)?.[chip.key],
          sparklineWidth,
          sparklineHeight,
          timeRange as any
        );
        if (path) {
          sparklinePaths.push({ d: path, color: sparklineColor });
        }
      }
    }

    return html`
      <button
        class="hero-card ${chip.status ? `status-${chip.status}` : ''} ${chip.active
          ? 'active'
          : ''} ${chip.linked ? 'linked' : ''}"
        type="button"
        aria-label="Toggle ${chip.label || chip.key} graph${chip.linked ? ', linked' : ''}"
        aria-pressed=${chip.active}
        draggable="false"
        @dragstart=${(e: DragEvent) => this._handleChipDragStart(e, chip.key)}
        @drop=${(e: DragEvent) => this._handleChipDrop(e, chip.key)}
        @dragover=${(e: DragEvent) => this._handleDragOver(e)}
        @click=${() => this._toggleEnvGraph(chip.key)}
        title=${chip.tooltip || nothing}
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
          : sparklinePaths.length > 0
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
                  ${sparklinePaths.map(
                    (p) => svg`
                    <path
                      d="${p.d}"
                      fill="none"
                      stroke="${p.color}"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      style="opacity: ${p.color === sparklineColor ? 1 : 0.6}"
                    />
                  `
                  )}
                  <path
                    d="${sparklinePaths[0].d} V ${sparklineHeight} H 0 Z"
                    fill="url(#sparkline-grad-${chip.key})"
                  />
                </svg>
              `
            : ''}

        <div class="hero-header">
          <ha-svg-icon
            class="hero-icon"
            .path=${chip.icon}
            style="color: ${sparklineColor}"
          ></ha-svg-icon>
          <span class="hero-label">${chip.label || chip.key}</span>
          ${this._renderStatusBadge(chip)}
        </div>

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
      </button>
    `;
  }
}
