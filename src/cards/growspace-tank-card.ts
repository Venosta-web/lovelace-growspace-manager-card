import { LitElement, html, CSSResultGroup, PropertyValues, css, TemplateResult, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { provide } from '@lit/context';

import { hassContext, configContext } from '../lib/context';
import { storeContext } from '../lib/context';
import { HomeAssistant, LovelaceCard, LovelaceCardEditor } from 'custom-card-helpers';

import type { GrowspaceManagerCardConfig } from '../lib/types/config';
import type { IrrigationTank } from '../services/types';

import { SubscriptionController } from '../controllers/subscription-controller';
import '../components/error-boundary';

import { sharedStyles } from '../styles/shared.styles';
import { uiStyles } from '../styles/ui.styles';
import { growspaceCardStyles } from '../styles/growspace-card.styles';
import { variables } from '../styles/variables';

import { GrowspaceStore } from '../store/core/growspace-store';
import { StoreController } from '@nanostores/lit';

@customElement('growspace-tank-card')
export class GrowspaceTankCard extends LitElement implements LovelaceCard {
    @provide({ context: storeContext })
    store = new GrowspaceStore();

    protected _subscriptionController = new SubscriptionController(
        this,
        this.store.data,
        (refresh) => {
            if (this.hass) {
                this.store.updateHass(this.hass);
            }
            if (refresh) {
                this.store.refreshData(true);
            }
        }
    );

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

            .tank-card-wrapper {
                padding: 16px;
            }

            .card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }

            .card-title {
                font-size: 1rem;
                font-weight: 600;
                opacity: 0.9;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .warning-badge {
                background: rgba(244, 67, 54, 0.2);
                color: #f44336;
                border: 1px solid rgba(244, 67, 54, 0.4);
                border-radius: 20px;
                padding: 3px 10px;
                font-size: 0.78rem;
                font-weight: 600;
            }

            .avg-badge {
                font-size: 0.82rem;
                opacity: 0.5;
            }

            .tanks-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
                gap: 16px;
            }

            .empty-state {
                text-align: center;
                padding: 40px 20px;
                opacity: 0.6;
                font-size: 0.9rem;
            }

            /* Tank Visualization */
            .tank-card {
                background: #1e1e1e;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                padding: 16px;
                transition: all 0.3s;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                display: flex;
                flex-direction: column;
                align-items: center;
            }

            .tank-card.warning {
                border: 1px solid rgba(244, 67, 54, 0.5);
                box-shadow: 0 0 20px rgba(244, 67, 54, 0.2), inset 0 0 20px rgba(244, 67, 54, 0.1);
            }

            .tank-header {
                width: 100%;
                text-align: center;
                margin-bottom: 16px;
            }

            .tank-header h4 {
                margin: 0 0 4px;
                font-size: 0.95rem;
                font-weight: 500;
                color: rgba(255, 255, 255, 0.9);
            }

            .tank-meta {
                font-size: 0.75rem;
                opacity: 0.55;
                display: flex;
                justify-content: center;
                gap: 8px;
            }

            .tank-container {
                position: relative;
                width: 120px;
                height: 155px;
                display: flex;
                justify-content: center;
                margin-bottom: 12px;
            }

            .tank-cap {
                position: absolute;
                top: -10px;
                width: 44px;
                height: 10px;
                background: linear-gradient(to right, #2c3e50, #4a6fa5, #2c3e50);
                border-radius: 4px 4px 0 0;
                z-index: 1;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }

            .tank-card.warning .tank-cap {
                background: linear-gradient(to right, #3e2723, #a54a4a, #3e2723);
            }

            .tank-cap-detail {
                position: absolute;
                top: -3px;
                width: 26px;
                height: 3px;
                left: 9px;
                background: inherit;
                border-radius: 2px 2px 0 0;
                opacity: 0.8;
            }

            .tank-body {
                position: relative;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #34495e, #2c3e50);
                border-radius: 14px;
                box-shadow: inset 2px 2px 5px rgba(255, 255, 255, 0.1), inset -2px -2px 5px rgba(0, 0, 0, 0.5),
                    0 5px 15px rgba(0, 0, 0, 0.4);
                display: flex;
                justify-content: center;
                align-items: center;
                overflow: hidden;
            }

            .tank-card.warning .tank-body {
                background: linear-gradient(135deg, #4e342e, #3e2723);
            }

            .tank-rib {
                position: absolute;
                left: -3px;
                width: 126px;
                height: 10px;
                background: linear-gradient(to bottom, rgba(255, 255, 255, 0.1), rgba(0, 0, 0, 0.2));
                border-radius: 5px;
                z-index: 2;
            }

            .rib-top {
                top: 16px;
            }
            .rib-bottom {
                bottom: 16px;
            }

            .side-rib {
                position: absolute;
                width: 7px;
                height: 80%;
                background: rgba(0, 0, 0, 0.2);
                z-index: 2;
                border-radius: 2px;
            }

            .side-left {
                left: 3px;
            }
            .side-right {
                right: 3px;
            }

            .tank-window {
                width: 78%;
                height: 68%;
                background: rgba(0, 0, 0, 0.4);
                border-radius: 8px;
                position: relative;
                overflow: hidden;
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
                z-index: 1;
            }

            .liquid {
                position: absolute;
                bottom: 0;
                width: 100%;
                height: var(--level, 0%);
                background: linear-gradient(to bottom, #2196f3, #1976d2);
                transition: height 1s ease-out;
                opacity: 0.9;
            }

            .tank-card.warning .liquid {
                background: linear-gradient(to bottom, #f44336, #d32f2f);
            }

            .liquid-surface {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 10px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                transform: scaleX(1.5);
                filter: blur(2px);
            }

            .wave {
                position: absolute;
                top: -10px;
                left: 0;
                width: 200%;
                height: 18px;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'%3E%3Cpath d='M0,60 C300,100 900,20 1200,60 V120 H0 Z' fill='white' fill-opacity='0.2'/%3E%3C/svg%3E");
                background-repeat: repeat-x;
                background-size: 50% 100%;
                animation: wave-motion 4s linear infinite;
                z-index: 2;
            }

            @keyframes wave-motion {
                0% {
                    transform: translateX(0);
                }
                100% {
                    transform: translateX(-50%);
                }
            }

            .window-reflection {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 40%;
                background: linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%);
                pointer-events: none;
                z-index: 5;
            }

            .percentage-text {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 1.5rem;
                font-weight: 800;
                color: white;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
                z-index: 10;
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .warning-icon {
                font-size: 0.9rem;
                color: #ffeb3b;
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0% {
                    transform: scale(1);
                    opacity: 1;
                }
                50% {
                    transform: scale(1.2);
                    opacity: 0.8;
                }
                100% {
                    transform: scale(1);
                    opacity: 1;
                }
            }

            .tank-footer {
                font-size: 0.75rem;
                opacity: 0.55;
                text-align: center;
                width: 100%;
            }

            .depletion-label {
                display: inline-block;
                font-size: 0.72rem;
                border-radius: 10px;
                padding: 2px 7px;
                margin-top: 4px;
                background: rgba(255, 255, 255, 0.07);
            }

            .depletion-label.depleting {
                color: #ff9800;
                background: rgba(255, 152, 0, 0.1);
            }

            .depletion-label.refilling {
                color: #4caf50;
                background: rgba(76, 175, 80, 0.1);
            }
        `,
    ];

    protected firstUpdated() {
        if (this.hass) {
            this.store.updateHass(this.hass);
        }
        this.store.initializeSelectedDevice(this._config);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.store.destroy();
    }

    protected updated(changedProps: PropertyValues): void {
        super.updated(changedProps);

        if (changedProps.has('hass') && this.hass) {
            this.store.updateHass(this.hass);
            this._subscriptionController.updateHass(this.hass);
        }
    }

    public static async getConfigElement(): Promise<LovelaceCardEditor> {
        await import('./editors/growspace-tank-card-editor');
        return document.createElement('growspace-tank-card-editor') as unknown as LovelaceCardEditor;
    }

    public static getStubConfig() {
        return {
            type: 'custom:growspace-tank-card',
            default_growspace: '',
        };
    }

    public setConfig(config: GrowspaceManagerCardConfig): void {
        if (!config) throw new Error('Invalid configuration');
        this._config = config;
        this.store.initializeSelectedDevice(this._config);
    }

    public getCardSize(): number {
        return 3;
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

        const device = devices.find((d: any) => d.deviceId === selectedDevice);
        if (!device) {
            return html`<ha-card><div class="error">No valid growspace selected. Please configure the card.</div></ha-card>`;
        }

        const tanks: IrrigationTank[] = device.environmentAttributes?.irrigationTanks ?? [];

        const warningTanks = tanks.filter((t) => t.isWarning);
        const tanksWithData = tanks.filter((t) => t.fillLevel !== null && t.fillLevel !== undefined);
        const avgLevel =
            tanksWithData.length > 0
                ? tanksWithData.reduce((s, t) => s + (t.fillLevel ?? 0), 0) / tanksWithData.length
                : null;

        return html`
            <error-boundary
                .fallbackMessage=${'Failed to load Tank Card'}
                .onError=${this._handleError}
            >
                <ha-card>
                    <div class="tank-card-wrapper glass-surface glass-panel">
                        <div class="card-header">
                            <span class="card-title">
                                <ha-icon icon="mdi:water" style="--mdi-icon-size: 18px;"></ha-icon>
                                ${device.name} — Tanks
                            </span>
                            ${warningTanks.length > 0
                                ? html`<span class="warning-badge">⚠ ${warningTanks.length} low</span>`
                                : avgLevel !== null
                                  ? html`<span class="avg-badge">Avg ${avgLevel.toFixed(0)}%</span>`
                                  : nothing}
                        </div>

                        ${tanks.length === 0
                            ? html`
                                  <div class="empty-state">
                                      No irrigation tanks configured for this growspace.<br />
                                      <span style="font-size: 0.82rem; opacity: 0.7;"
                                          >Add tank sensors in Environment Settings to monitor levels.</span
                                      >
                                  </div>
                              `
                            : html`
                                  <div class="tanks-grid">
                                      ${tanks.map((tank) => this._renderTank(tank))}
                                  </div>
                              `}
                    </div>
                </ha-card>
            </error-boundary>
        `;
    }

    private _renderTank(tank: IrrigationTank): TemplateResult {
        const fillLevel = tank.fillLevel ?? 0;
        const isWarning = tank.isWarning;

        const depletionLabel =
            tank.depletionStatus === 'depleting'
                ? '↓ Depleting'
                : tank.depletionStatus === 'refilling'
                  ? '↑ Refilling'
                  : tank.depletionStatus === 'static'
                    ? '— Stable'
                    : null;

        const depletionClass =
            tank.depletionStatus === 'depleting'
                ? 'depleting'
                : tank.depletionStatus === 'refilling'
                  ? 'refilling'
                  : '';

        const timeLeft =
            tank.hoursRemaining != null
                ? tank.hoursRemaining >= 48
                    ? `${Math.floor(tank.hoursRemaining / 24)}d left`
                    : `${Math.round(tank.hoursRemaining)}h left`
                : null;

        return html`
            <div class="tank-card ${isWarning ? 'warning' : ''}">
                <div class="tank-header">
                    <h4>${tank.name}</h4>
                    <div class="tank-meta">
                        ${timeLeft ? html`<span>${timeLeft}</span>` : nothing}
                        ${tank.volumeLiters != null ? html`<span>${tank.volumeLiters} L</span>` : nothing}
                    </div>
                </div>

                <div class="tank-container">
                    <div class="tank-cap"></div>
                    <div class="tank-cap-detail"></div>

                    <div class="tank-rib rib-top"></div>
                    <div class="tank-rib rib-bottom"></div>

                    <div class="tank-body">
                        <div class="side-rib side-left"></div>
                        <div class="side-rib side-right"></div>

                        <div class="tank-window">
                            <div class="window-reflection"></div>
                            <div class="liquid" style="--level: ${fillLevel}%">
                                <div class="wave"></div>
                                <div class="liquid-surface"></div>
                            </div>
                            <div class="percentage-text">
                                ${tank.fillLevel !== null && tank.fillLevel !== undefined
                                    ? `${fillLevel.toFixed(0)}%`
                                    : 'N/A'}
                                ${isWarning ? html`<span class="warning-icon">⚠️</span>` : nothing}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="tank-footer">
                    Warning: ${tank.warningLevel}%
                    ${depletionLabel
                        ? html`<br /><span class="depletion-label ${depletionClass}">${depletionLabel}</span>`
                        : nothing}
                </div>
            </div>
        `;
    }

    private _handleError = (error: Error, errorInfo: unknown) => {
        console.error('Growspace Tank Card caught error:', error, errorInfo);
    };
}

declare global {
    interface HTMLElementTagNameMap {
        'growspace-tank-card': GrowspaceTankCard;
    }
}
