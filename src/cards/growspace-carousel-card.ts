import { LitElement, html, css } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCard, LovelaceCardEditor } from 'custom-card-helpers';
import type { GrowspaceCarouselCardConfig } from '../lib/types/config';
import '../growspace-manager-card';
import type { GrowspaceManagerCard } from '../growspace-manager-card';

@customElement('growspace-carousel-card')
export class GrowspaceCarouselCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: GrowspaceCarouselCardConfig;

  @query('.carousel-wrapper') private _wrapper!: HTMLElement;
  @query('growspace-manager-card') private _managerCard!: GrowspaceManagerCard;

  private _currentIndex = 0;
  private _timer?: number;
  private _isAnimating = false;

  public setConfig(config: GrowspaceCarouselCardConfig): void {
    if (!config.growspaces || config.growspaces.length === 0) {
      throw new Error("You need to define at least one growspace");
    }

    this._config = {
      interval: 15,
      ...config
    };
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
      interval: 15
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

  private _startTimer() {
    this._stopTimer();
    if (this._config && this._config.growspaces && this._config.growspaces.length > 1) {
      this._timer = window.setInterval(() => this._nextSlide(), (this._config.interval || 15) * 1000);
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
    if (!this._config || !this._config.growspaces || this._config.growspaces.length <= 1 || this._isAnimating) return;

    this._isAnimating = true;

    // Slide out to the left
    this._wrapper.classList.add('slide-out');

    // Wait for slide out animation (matches CSS transition duration)
    await new Promise(resolve => setTimeout(resolve, 300));

    // Update active growspace index
    this._currentIndex = (this._currentIndex + 1) % this._config.growspaces.length;
    const nextDeviceId = this._config.growspaces[this._currentIndex];

    // Instruct the inner manager card to switch context
    if (this._managerCard && this._managerCard.store) {
      this._managerCard.store.handleDeviceChange(nextDeviceId);
    }

    // Jump to the right side seamlessly (prepare for slide in)
    this._wrapper.classList.remove('slide-out');
    this._wrapper.classList.add('slide-in-prepare');

    // eslint-disable-next-line no-void
    void this._wrapper.offsetWidth;

    // Slide in from the right
    this._wrapper.classList.remove('slide-in-prepare');

    // Wait for slide in animation
    await new Promise(resolve => setTimeout(resolve, 300));

    this._isAnimating = false;
  }

  protected render() {
    if (!this._config || !this._config.growspaces || this._config.growspaces.length === 0) {
      return html``;
    }

    // Use current growspace as default for the inner card config
    const currentDeviceId = this._config.growspaces[this._currentIndex];

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
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
  `;
}
