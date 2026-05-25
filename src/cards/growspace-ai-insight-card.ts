import { LitElement, html, CSSResultGroup, PropertyValues, css, TemplateResult, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { provide } from '@lit/context';

import { hassContext, configContext, storeContext } from '../lib/context';
import { HomeAssistant, LovelaceCard, LovelaceCardEditor } from 'custom-card-helpers';
import { mdiBrain, mdiLoading } from '@mdi/js';

import type { GrowspaceManagerCardConfig } from '../lib/types/config';

import { growspaceStoreRegistry } from '../store/core/growspace-store-registry';
import '../features/shared/ui/error-boundary';

import { sharedStyles } from '../styles/shared.styles';
import { uiStyles } from '../styles/ui.styles';
import { growspaceCardStyles } from '../styles/growspace-card.styles';
import { variables } from '../styles/variables';

import { GrowspaceStore } from '../store/core/growspace-store';
import { StoreController } from '@nanostores/lit';

import {
  aiInsight$,
  isAiLoading$,
  aiError$,
  askGrowAdvice,
  analyzeAllGrowspaces,
  dismissInsight,
} from '../slices/ai-insight';

@customElement('growspace-ai-insight-card')
export class GrowspaceAiInsightCard extends LitElement implements LovelaceCard {
  private _sharedStore = growspaceStoreRegistry.acquire();

  @provide({ context: storeContext })
  store = new GrowspaceStore(this._sharedStore);

  protected _viewController = new StoreController(this, this.store.$sharedCardViewState);
  protected _aiInsightController = new StoreController(this, aiInsight$);
  protected _aiLoadingController = new StoreController(this, isAiLoading$);
  protected _aiErrorController = new StoreController(this, aiError$);

  get selectedDevice() {
    return this._viewController.value.grid.selectedDevice;
  }

  @provide({ context: hassContext })
  @property({ attribute: false })
  hass!: HomeAssistant;

  @provide({ context: configContext })
  @property({ attribute: false })
  _config!: GrowspaceManagerCardConfig;

  @state() private _userQuery = '';

  static styles: CSSResultGroup = [
    variables,
    sharedStyles,
    uiStyles,
    growspaceCardStyles,
    css`
      ha-card {
        padding: 0;
        background: transparent;
        border: none;
        box-shadow: none;
      }
      .unified-growspace-card {
        margin: 0;
      }
      .ai-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        margin-bottom: 20px;
      }
      .ai-icon svg {
        width: 32px;
        height: 32px;
        fill: #4CAF50;
      }
      .ai-title {
        margin: 0;
        font-size: 1.4rem;
        font-weight: 600;
        color: var(--primary-text-color, #ffffff);
      }
      .ai-subtitle {
        margin: 0;
        font-size: 0.9rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
      }
      .gm-response-box {
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid #4CAF50;
        border-radius: 12px;
        padding: 20px;
        line-height: 1.6;
        font-size: 0.95rem;
        white-space: pre-wrap;
        margin-top: 20px;
        color: var(--primary-text-color, #ffffff);
      }
      .gm-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
        gap: 12px;
      }
      @keyframes spin {
        100% { transform: rotate(360deg); }
      }
      .spinner {
        animation: spin 1s linear infinite;
        width: 24px;
        height: 24px;
      }
      .sd-textarea {
        width: 100%;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        border-radius: 8px;
        padding: 12px;
        color: var(--primary-text-color, #ffffff);
        font-family: inherit;
        resize: vertical;
        box-sizing: border-box;
        font-size: 1rem;
        min-height: 80px;
        margin-bottom: 16px;
      }
      .sd-textarea:focus {
        outline: none;
        background: rgba(255, 255, 255, 0.08);
        border-color: #4CAF50;
      }
      .button-group {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }
      .error-state {
        color: #f44336;
        padding: 16px;
        background: rgba(244, 67, 54, 0.1);
        border-radius: 8px;
        margin-top: 20px;
      }
    `
  ];

  protected firstUpdated() {
    if (this.hass) {
      this.store.updateHass(this.hass);
    }
    this.store.initializeSelectedDevice(this._config);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    dismissInsight();
    this.store.destroy();
    growspaceStoreRegistry.release();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has('hass') && this.hass) {
      this.store.updateHass(this.hass);
    }
  }

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./editors/growspace-ai-insight-card-editor.js');
    return document.createElement('growspace-ai-insight-card-editor') as unknown as LovelaceCardEditor;
  }

  public static getStubConfig() {
    return {
      type: 'custom:growspace-ai-insight-card',
      default_growspace: '',
    };
  }

  public setConfig(config: GrowspaceManagerCardConfig): void {
    if (!config) throw new Error('Invalid configuration');
    this._config = config;
    this.store.initializeSelectedDevice(this._config);
  }

  public getCardSize(): number {
    return 4;
  }

  public getLayoutOptions() {
    return {
      grid_columns: 4,
      grid_min_columns: 2,
      grid_rows: 6,
      grid_min_rows: 5,
    };
  }

  private async _analyze(all: boolean) {
    try {
      if (all) {
        await analyzeAllGrowspaces();
      } else {
        const device = this.selectedDevice;
        if (!device) throw new Error('No device selected and "Analyze All" was false.');
        const devices = this.store.data.$devices.get();
        if (!devices.find((d: { deviceId: string }) => d.deviceId === device)) {
          throw new Error('Selected device not found in devices list.');
        }
        await askGrowAdvice(device, this._userQuery);
      }
    } catch (e: unknown) {
      console.error('AI Analysis failed:', e);
    }
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html`<ha-card><div class="error-state">Home Assistant not available</div></ha-card>`;
    }

    const { devices, selectedDevice } = this._viewController.value.grid;
    const { isLoading: storeLoading } = this._viewController.value.ui;

    if (storeLoading && !devices.length) {
      return html`
        <ha-card>
          <div class="gm-loading">
            <svg class="spinner" viewBox="0 0 24 24">
              <path d="${mdiLoading}" fill="currentColor"></path>
            </svg>
            <span>Synchronizing growspace data...</span>
          </div>
        </ha-card>
      `;
    }

    const selectedDeviceData = devices.find((d: { deviceId: string; name: string }) => d.deviceId === selectedDevice);
    const targetName = selectedDeviceData ? selectedDeviceData.name : 'Unknown Growspace';
    const isLoading = this._aiLoadingController.value;
    const response = this._aiInsightController.value;
    const error = this._aiErrorController.value;

    return html`
      <error-boundary
        .fallbackMessage=${'Failed to load Growspace AI Insights'}
        .onError=${this._handleError}
      >
        <ha-card>
          <div class="unified-growspace-card glass-surface glass-panel" style="padding: 24px;">

            <div class="ai-header">
                <div class="ai-icon">
                    <svg viewBox="0 0 24 24">
                        <path d="${mdiBrain}"></path>
                    </svg>
                </div>
                <div>
                    <h2 class="ai-title">Grow Master AI</h2>
                    <p class="ai-subtitle">Target: ${targetName}</p>
                </div>
            </div>

            <textarea
                class="sd-textarea"
                placeholder="Ask advice about your environment, plants, or VPD history..."
                .value=${this._userQuery}
                @input=${(e: InputEvent) => (this._userQuery = (e.target as HTMLTextAreaElement).value)}
            ></textarea>

            <div class="button-group">
              <button
                class="md3-button tonal"
                @click=${() => this._analyze(true)}
                ?disabled=${isLoading}
                style="opacity: ${isLoading ? 0.7 : 1}"
              >
                Analyze All
              </button>
              <button
                class="md3-button primary"
                @click=${() => this._analyze(false)}
                ?disabled=${isLoading}
                style="opacity: ${isLoading ? 0.7 : 1}"
              >
                ${isLoading ? 'Analyzing...' : 'Analyze Specific'}
              </button>
            </div>

            ${isLoading ? html`
              <div class="gm-loading">
                <svg class="spinner" viewBox="0 0 24 24">
                  <path d="${mdiLoading}" fill="currentColor"></path>
                </svg>
                <span>Consulting the archives...</span>
              </div>
            ` : nothing}

            ${!isLoading && response ? html`
              <div class="gm-response-box">
                ${response}
              </div>
            ` : nothing}

            ${error ? html`
              <div class="error-state">
                Error: ${error}
              </div>
            ` : nothing}

          </div>
        </ha-card>
      </error-boundary>
    `;
  }

  private _handleError = (error: Error, errorInfo: unknown) => {
    console.error('Growspace AI Insight Card caught error:', error, errorInfo);
    if (this.hass) {
      this.hass.callService('system_log', 'write', {
        message: `Growspace AI Insight Card Error: ${error.message}`,
        level: 'error',
        logger: 'lovelace_growspace_manager_card',
      });
    }
  };
}
