import { LitElement, html, css } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCard, LovelaceCardEditor } from 'custom-card-helpers';
import type { GrowspaceCarouselCardConfig } from '../lib/types/config';
import '../growspace-manager-card';
import { reducedMotion } from '../styles/reduced-motion.styles';

@customElement('growspace-carousel-card')
export class GrowspaceCarouselCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: GrowspaceCarouselCardConfig;

  @query('.carousel-wrapper') private _wrapper!: HTMLElement;

  private _currentIndex = 0;
  private _timer?: number;
  private _isAnimating = false;

  public setConfig(config: GrowspaceCarouselCardConfig): void {
    this._config = {
      interval: 15,
      ...config,
      growspaces: config.growspaces ?? [],
    };
    this._currentIndex = 0;
  }

  public getCardSize(): number {
    return 4;
  }

  public getLayoutOptions() {
    return {
      grid_columns: 4,
      grid_min_columns: 2,
      grid_min_rows: 4,
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./editors/growspace-carousel-card-editor.js');
    return document.createElement('growspace-carousel-card-editor') as LovelaceCardEditor;
  }

  public static getStubConfig() {
    return {
      type: 'custom:growspace-carousel-card',
      growspaces: [],
      interval: 15,
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this._startTimer();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopTimer();
  }

  private get _activeGrowspaces(): string[] {
    const all = this._config?.growspaces ?? [];
    if (!this._config?.filter_empty || !this.hass) return all;

    const raw = this.hass.states['sensor.growspaces_list']?.attributes?.growspaces ?? {};
    return all.filter((id) => {
      const entry = raw[id];
      return this._plantCount(id, entry) > 0;
    });
  }

  /** Resolve counts from either an enriched list entry or the integration's overview sensor. */
  private _plantCount(growspaceId: string, listEntry: unknown): number {
    if (listEntry && typeof listEntry === 'object') {
      const directCount = Number((listEntry as Record<string, unknown>).total_plants);
      if (Number.isFinite(directCount)) return directCount;
    }

    const overview = Object.values(this.hass?.states ?? {}).find(
      (state) => state.attributes?.growspace_id === growspaceId
    );
    if (!overview) return 0;

    const attributeCount = Number(overview.attributes?.total_plants);
    if (Number.isFinite(attributeCount)) return attributeCount;

    const stateCount = Number(overview.state);
    return Number.isFinite(stateCount) ? stateCount : 0;
  }

  private _startTimer() {
    this._stopTimer();
    if (this._config && this._activeGrowspaces.length > 1) {
      this._timer = window.setInterval(
        () => this._nextSlide(),
        (this._config.interval || 15) * 1000
      );
    }
  }

  private _stopTimer() {
    if (this._timer) {
      window.clearInterval(this._timer);
      this._timer = undefined;
    }
  }

  private _handleMouseEnter() {
    this._stopTimer();
  }

  private _handleMouseLeave() {
    this._startTimer();
  }

  private async _nextSlide() {
    const active = this._activeGrowspaces;
    if (!this._config || active.length <= 1 || this._isAnimating) return;

    this._isAnimating = true;

    // Slide out to the left
    this._wrapper.classList.add('slide-out');

    // Wait for slide out animation (matches CSS transition duration)
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Advance the index; re-render will propagate the new default_growspace via config.
    this._currentIndex = (this._currentIndex + 1) % active.length;
    this.requestUpdate();

    // Jump to the right side seamlessly (prepare for slide in)
    this._wrapper.classList.remove('slide-out');
    this._wrapper.classList.add('slide-in-prepare');

    void this._wrapper.offsetWidth;

    // Slide in from the right
    this._wrapper.classList.remove('slide-in-prepare');

    // Wait for slide in animation
    await new Promise((resolve) => setTimeout(resolve, 300));

    this._isAnimating = false;
  }

  protected render() {
    const configured = this._config?.growspaces ?? [];
    if (!this._config || configured.length === 0) {
      return this._renderEmptyState(
        'Growspace filter not configured',
        'Configure the growspace filter in the card settings to choose which growspaces to display.'
      );
    }

    const active = this._activeGrowspaces;
    if (this._config.filter_empty && active.length === 0) {
      return this._renderEmptyState(
        'No growspaces with plants',
        'None of the filtered growspaces have any plants.'
      );
    }

    // Use the filtered list for both index advancement and rendering.
    const currentDeviceId = active[this._currentIndex % active.length];

    const managerConfig = {
      type: 'custom:growspace-manager-card',
      default_growspace: currentDeviceId,
    };

    return html`
      <div
        class="carousel-container"
        @mouseenter=${this._handleMouseEnter}
        @mouseleave=${this._handleMouseLeave}
      >
        <div class="carousel-wrapper">
          <growspace-manager-card
            .hass=${this.hass}
            ._config=${managerConfig}
          ></growspace-manager-card>
        </div>
      </div>
    `;
  }

  private _renderEmptyState(title: string, message: string) {
    return html`
      <ha-card>
        <div class="empty-state" role="status">
          <div class="empty-state-title">${title}</div>
          <div>${message}</div>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
    .carousel-container {
      overflow: hidden;
      position: relative;
      width: 100%;
      /* Avoid layout jumps during animation */
      min-height: 200px;
    }
    .carousel-wrapper {
      width: 100%;
      transition:
        transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      transform: translateX(0);
      opacity: 1;
    }
    .carousel-wrapper.slide-out {
      transform: translateX(-30px);
      opacity: 0;
    }
    .carousel-wrapper.slide-in-prepare {
      transition: none;
      transform: translateX(30px);
      opacity: 0;
    }
    .empty-state {
      box-sizing: border-box;
      min-height: 160px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 32px;
      text-align: center;
      color: var(--secondary-text-color);
    }
    .empty-state-title {
      color: var(--primary-text-color);
      font-size: 1rem;
      font-weight: 600;
    }

    ${reducedMotion}
  `;
}
