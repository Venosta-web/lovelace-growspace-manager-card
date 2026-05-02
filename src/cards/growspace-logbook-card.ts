import { LitElement, html, css, CSSResultGroup, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { provide } from '@lit/context';
import { HomeAssistant, LovelaceCard, LovelaceCardEditor } from 'custom-card-helpers';
import { GrowspaceManagerCardConfig } from '../lib/types/config';
import { GrowspaceStore } from '../store/core/growspace-store';
import { SubscriptionController } from '../controllers/subscription-controller';
import { StoreController } from '@nanostores/lit';
import { hassContext, configContext, storeContext } from '../lib/context';
import { variables } from '../styles/variables';
import { sharedStyles } from '../styles/shared.styles';
import { uiStyles } from '../styles/ui.styles';
import { growspaceCardStyles } from '../styles/growspace-card.styles';
import '../components/ui/growspace-logbook';
import '../components/ui/growspace-timeline';
import '../features/shared/ui/error-boundary';

@customElement('growspace-logbook-card')
export class GrowspaceLogbookCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: GrowspaceManagerCardConfig;
  @state() private _activeTab: 'list' | 'timeline' = 'list';

  @provide({ context: storeContext })
  private _store = new GrowspaceStore();

  @provide({ context: hassContext })
  private _hassContext = this.hass;

  @provide({ context: configContext })
  private _configContext = this._config;

  private _subscriptionController = new SubscriptionController(
    this,
    this._store.data,
    (refresh) => {
      if (this.hass) {
        this._store.updateHass(this.hass);
      }
      if (refresh) {
        this._store.refreshData(true);
      }
    }
  );

  private _viewController = new StoreController(this, this._store.$sharedCardViewState);

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./editors/growspace-logbook-card-editor.js');
    return document.createElement('growspace-logbook-card-editor') as unknown as LovelaceCardEditor;
  }

  public static getStubConfig(): Partial<GrowspaceManagerCardConfig> {
    return {
      type: 'custom:growspace-logbook-card',
      default_growspace: '',
      default_view: 'list'
    };
  }

  public setConfig(config: GrowspaceManagerCardConfig): void {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    this._config = config;
    this._configContext = config;
    this._activeTab = config.default_view || 'list';
    
    this._store.initializeSelectedDevice(config);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._store.destroy();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has('hass') && this.hass) {
      this._hassContext = this.hass;
      this._store.updateHass(this.hass);
      this._subscriptionController.updateHass(this.hass);
    }
  }

  public getCardSize(): number {
    return 5;
  }

  private _handleTabClick(tab: 'list' | 'timeline'): void {
    this._activeTab = tab;
  }

  private _handleError(err: Error): void {
    console.error('Growspace Logbook Card Error:', err);
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const { devices, selectedDevice } = this._viewController.value.grid;
    const { isLoading } = this._viewController.value.ui;

    if (isLoading && !devices.length) {
      return html`<ha-card class="loading">Loading...</ha-card>`;
    }

    const device = devices.find((d: any) => d.deviceId === selectedDevice);
    if (!device) {
      return html`
        <ha-card class="error">
          <p>Please select a growspace in the card configuration.</p>
        </ha-card>
      `;
    }

    return html`
      <error-boundary
        .fallbackMessage=${'Failed to load Growspace Logbook Card'}
        .onError=${this._handleError}
      >
        <ha-card>
          <div class="card-content">
            <div class="tab-bar">
              <button 
                class="tab ${this._activeTab === 'list' ? 'active' : ''}" 
                @click=${() => this._handleTabClick('list')}
              >
                <svg viewBox="0 0 24 24"><path d="M7,5H21V7H7V5M7,13V11H21V13H7M4,4.5A1.5,1.5 0 0,1 5.5,6A1.5,1.5 0 0,1 4,7.5A1.5,1.5 0 0,1 2.5,6A1.5,1.5 0 0,1 4,4.5M4,10.5A1.5,1.5 0 0,1 5.5,12A1.5,1.5 0 0,1 4,13.5A1.5,1.5 0 0,1 2.5,12A1.5,1.5 0 0,1 4,10.5M7,19V17H21V19H7M4,16.5A1.5,1.5 0 0,1 5.5,18A1.5,1.5 0 0,1 4,19.5A1.5,1.5 0 0,1 2.5,18A1.5,1.5 0 0,1 4,16.5Z" /></svg>
                List View
              </button>
              <button 
                class="tab ${this._activeTab === 'timeline' ? 'active' : ''}" 
                @click=${() => this._handleTabClick('timeline')}
              >
                <svg viewBox="0 0 24 24"><path d="M2,2H4V20H22V22H2V2M7,10H17V13H7V10M11,15H21V18H11V15M6,4H22V8H6V4Z" /></svg>
                Timeline
              </button>
            </div>

            <div class="tab-content">
              ${this._activeTab === 'list' 
                ? html`<growspace-logbook .hass=${this.hass} .growspaceId=${selectedDevice}></growspace-logbook>`
                : html`<growspace-timeline .hass=${this.hass} .growspaceId=${selectedDevice}></growspace-timeline>`
              }
            </div>
          </div>
        </ha-card>
      </error-boundary>
    `;
  }

  static styles: CSSResultGroup = [
    variables,
    sharedStyles,
    uiStyles,
    growspaceCardStyles,
    css`
      :host {
        display: block;
      }

      ha-card {
        height: 100%;
        display: flex;
        flex-direction: column;
        background: var(--ha-card-background, var(--card-background-color, rgba(20, 20, 20, 0.8)));
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      }

      .card-content {
        padding: 16px;
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 400px;
      }

      .tab-bar {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        padding-bottom: 2px;
      }

      .tab {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.9rem;
      }

      .tab svg {
        width: 20px;
        height: 20px;
        fill: currentColor;
      }

      .tab:hover {
        color: var(--primary-text-color, #fff);
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
      }

      .tab.active {
        color: var(--primary-color, #4caf50);
        border-bottom-color: var(--primary-color, #4caf50);
      }

      .tab-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      growspace-logbook, growspace-timeline {
        flex: 1;
        min-height: 0;
      }

      .loading, .error {
        padding: 24px;
        text-align: center;
        color: var(--secondary-text-color);
      }
    `
  ];
}
