import { LitElement, html, CSSResultGroup, PropertyValues, css, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { provide } from '@lit/context';

import { hassContext, configContext } from '../lib/context';
import { storeContext } from '../lib/context';
import { HomeAssistant, LovelaceCard, LovelaceCardEditor } from 'custom-card-helpers';

import type { GrowspaceManagerCardConfig } from '../lib/types/config';

import { growspaceStoreRegistry } from '../store/core/growspace-store-registry';
import '../features/ui/containers/growspace-analytics.container';
import '../features/shared/ui/error-boundary';

import { sharedStyles } from '../styles/shared.styles';
import { uiStyles } from '../styles/ui.styles';
import { growspaceCardStyles } from '../styles/growspace-card.styles';
import { variables } from '../styles/variables';

import { GrowspaceStore } from '../store/core/growspace-store';
import { StoreController } from '@nanostores/lit';

@customElement('growspace-analytics-card')
export class GrowspaceAnalyticsCard extends LitElement implements LovelaceCard {
    private _sharedStore = growspaceStoreRegistry.acquire();

    @provide({ context: storeContext })
    store = new GrowspaceStore(this._sharedStore);

    protected _viewController = new StoreController(this, this.store.$sharedCardViewState);

    get selectedDevice() {
        return this._viewController.value.grid.selectedDevice;
    }

    @provide({ context: hassContext })
    @property({ attribute: false })
    hass!: HomeAssistant;

    @provide({ context: configContext })
    @property({ attribute: false })
    _config!: GrowspaceManagerCardConfig;

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
    `
    ];

    protected firstUpdated() {
        if (this.hass) {
            this.store.updateHass(this.hass);
        }
        this.store.initializeSelectedDevice(this._config);

        // The standalone analytics card has no header chips to toggle graphs,
        // so default to the primary env metrics if none are active yet.
        if (this.store.history.$activeEnvGraphs.get().size === 0) {
            ['temperature', 'humidity', 'vpd', 'co2'].forEach((m) =>
                this.store.toggleEnvGraph(m)
            );
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
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
        await import('./editors/growspace-analytics-card-editor.js');
        return document.createElement('growspace-analytics-card-editor') as unknown as LovelaceCardEditor;
    }

    public static getStubConfig() {
        return {
            type: 'custom:growspace-analytics-card',
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

    protected render(): TemplateResult {
        if (!this.hass) {
            return html`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;
        }

        const { devices, selectedDevice } = this._viewController.value.grid;
        const { isLoading } = this._viewController.value.ui;

        if (isLoading && !devices.length) {
            return html`
        <ha-card>
          <div class="loading-container">
            <div class="loading-spinner"></div>
          </div>
        </ha-card>
      `;
        }

        if (!devices.length) {
            return html`<ha-card><div class="no-data">No growspace devices found.</div></ha-card>`;
        }

        const selectedDeviceData = devices.find((d: any) => d.deviceId === selectedDevice);
        if (!selectedDeviceData) {
            return html`<ha-card><div class="error">No valid growspace selected. Please configure the card.</div></ha-card>`;
        }

        return html`
      <error-boundary
        .fallbackMessage=${'Failed to load Growspace Analytics'}
        .onError=${this._handleError}
      >
        <ha-card>
          <div class="unified-growspace-card glass-surface glass-panel">
            <growspace-analytics
                .device=${selectedDeviceData}
            ></growspace-analytics>
          </div>
        </ha-card>
      </error-boundary>
    `;
    }

    private _handleError = (error: Error, errorInfo: unknown) => {
        console.error('Growspace Analytics Card caught error:', error, errorInfo);
        if (this.hass) {
            this.hass.callService('system_log', 'write', {
                message: `Growspace Analytics Card Error: ${error.message}`,
                level: 'error',
                logger: 'lovelace_growspace_manager_card',
            });
        }
    };
}
