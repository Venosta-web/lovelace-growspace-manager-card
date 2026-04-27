import { LitElement, html, css, CSSResultGroup, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { provide } from '@lit/context';

import { hassContext, configContext, storeContext } from '../lib/context';
import { HomeAssistant, LovelaceCard, LovelaceCardEditor } from 'custom-card-helpers';

import type { GrowspaceManagerCardConfig } from '../lib/types/config';
import type { Subarea } from '../services/types';
import { DataService } from '../services/data-service';

import '../components/error-boundary';
import '../features/ui/containers/growspace-header.container';
import '../features/ui/containers/growspace-analytics.container';

import { sharedStyles } from '../styles/shared.styles';
import { uiStyles } from '../styles/ui.styles';
import { growspaceCardStyles } from '../styles/growspace-card.styles';
import { variables } from '../styles/variables';

import { GrowspaceStore } from '../store/core/growspace-store';
import { StoreController } from '@nanostores/lit';
import { SubscriptionController } from '../controllers/subscription-controller';

export interface GrowspaceSubareaCardConfig extends GrowspaceManagerCardConfig {
    growspace_id: string;
    subarea_id: string;
}

@customElement('growspace-subarea-card')
export class GrowspaceSubareaCard extends LitElement implements LovelaceCard {
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
                this._loadSubarea();
            }
        }
    );

    protected _viewController = new StoreController(this, this.store.$sharedCardViewState);

    private _dataService: DataService | null = null;

    @provide({ context: hassContext })
    @property({ attribute: false })
    hass!: HomeAssistant;

    @provide({ context: configContext })
    @property({ attribute: false })
    _config!: GrowspaceSubareaCardConfig;

    @state() private _subarea: Subarea | null = null;
    @state() private _loading = true;
    @state() private _error: string | null = null;
    @state() private _parentGrowspaceName = '';

    static styles: CSSResultGroup = [
        variables,
        sharedStyles,
        uiStyles,
        growspaceCardStyles,
        css`
            ha-card {
                padding: 0;
            }

            .subarea-card-wrapper {
                padding: 16px;
            }

            .subarea-header {
                padding: 16px 16px 8px;
            }

            .subarea-title {
                font-size: 1.25rem;
                font-weight: 600;
                color: var(--primary-text-color);
                margin: 0 0 4px 0;
            }

            .subarea-subtitle {
                font-size: 0.875rem;
                color: var(--secondary-text-color);
                margin: 0;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .env-config-section {
                padding: 0 16px 16px;
            }

            .env-config-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 12px;
                margin-top: 12px;
            }

            .env-sensor-item {
                background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
                border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
                border-radius: 12px;
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .env-sensor-label {
                font-size: 0.75rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--secondary-text-color);
            }

            .env-sensor-value {
                font-size: 1.1rem;
                font-weight: 500;
                color: var(--primary-text-color);
            }

            .env-sensor-entity {
                font-size: 0.75rem;
                color: var(--secondary-text-color);
                opacity: 0.7;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .device-chips-section {
                padding: 0 16px 12px;
            }

            .device-chips-label {
                font-size: 0.75rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--secondary-text-color);
                margin-bottom: 8px;
            }

            .device-chips-grid {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .device-chip {
                background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
                border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
                border-radius: 20px;
                padding: 4px 12px;
                font-size: 0.82rem;
                color: var(--primary-text-color);
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .section-title {
                font-size: 0.8rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--secondary-text-color);
                padding: 8px 16px 4px;
            }

            .no-sensors {
                padding: 8px 16px;
                color: var(--secondary-text-color);
                font-size: 0.875rem;
                opacity: 0.7;
            }
        `,
    ];

    protected firstUpdated(): void {
        if (this.hass) {
            this.store.updateHass(this.hass);
            this._dataService = new DataService(this.hass);
        }
        if (this._config?.growspace_id) {
            const syntheticConfig: GrowspaceManagerCardConfig = {
                ...this._config,
                default_growspace: this._config.growspace_id,
            };
            this.store.initializeSelectedDevice(syntheticConfig);
        }
        this._loadSubarea();
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        this.store.destroy();
    }

    protected updated(changedProps: PropertyValues): void {
        super.updated(changedProps);

        if (changedProps.has('hass') && this.hass) {
            this.store.updateHass(this.hass);
            this._subscriptionController.updateHass(this.hass);
            if (!this._dataService) {
                this._dataService = new DataService(this.hass);
            } else {
                this._dataService.updateHass(this.hass);
            }
        }

        if (changedProps.has('_config') && this._config?.growspace_id) {
            const syntheticConfig: GrowspaceManagerCardConfig = {
                ...this._config,
                default_growspace: this._config.growspace_id,
            };
            this.store.initializeSelectedDevice(syntheticConfig);
            this._loadSubarea();
        }

        // Keep parent growspace name in sync
        const { devices } = this._viewController.value.grid;
        if (devices.length && this._config?.growspace_id) {
            const parent = devices.find((d: any) => d.deviceId === this._config.growspace_id);
            if (parent && parent.name !== this._parentGrowspaceName) {
                this._parentGrowspaceName = parent.name;
            }
        }
    }

    private async _loadSubarea(): Promise<void> {
        if (!this._config?.growspace_id || !this._config?.subarea_id) return;
        if (!this.hass) return;

        if (!this._dataService) {
            this._dataService = new DataService(this.hass);
        }

        this._loading = true;
        this._error = null;

        try {
            const subareas = await this._dataService.getSubareas(this._config.growspace_id);
            const found = subareas.find((s) => s.id === this._config.subarea_id) ?? null;
            if (!found) {
                this._error = `Subarea "${this._config.subarea_id}" not found in growspace "${this._config.growspace_id}".`;
            } else {
                this._subarea = found;
            }
        } catch (err) {
            console.error('[GrowspaceSubareaCard] Failed to load subarea:', err);
            this._error = 'Failed to load subarea data.';
        } finally {
            this._loading = false;
        }
    }

    public static async getConfigElement(): Promise<LovelaceCardEditor> {
        await import('./editors/growspace-subarea-card-editor.js');
        return document.createElement('growspace-subarea-card-editor') as unknown as LovelaceCardEditor;
    }

    public static getStubConfig(): GrowspaceSubareaCardConfig {
        return {
            type: 'custom:growspace-subarea-card',
            growspace_id: '',
            subarea_id: '',
        };
    }

    public setConfig(config: GrowspaceSubareaCardConfig): void {
        if (!config) throw new Error('Invalid configuration');
        this._config = config;
        if (config.growspace_id) {
            const syntheticConfig: GrowspaceManagerCardConfig = {
                ...config,
                default_growspace: config.growspace_id,
            };
            this.store.initializeSelectedDevice(syntheticConfig);
        }
    }

    public getCardSize(): number {
        return 4;
    }

    protected render(): TemplateResult {
        if (!this.hass) {
            return html`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;
        }

        if (!this._config?.growspace_id || !this._config?.subarea_id) {
            return html`
                <ha-card>
                    <div class="no-data">Please configure a growspace and subarea.</div>
                </ha-card>
            `;
        }

        if (this._loading) {
            return html`
                <ha-card>
                    <div class="loading-container">
                        <div class="loading-spinner"></div>
                    </div>
                </ha-card>
            `;
        }

        if (this._error) {
            return html`
                <ha-card>
                    <div class="error">${this._error}</div>
                </ha-card>
            `;
        }

        if (!this._subarea) {
            return html`
                <ha-card>
                    <div class="no-data">Subarea not found.</div>
                </ha-card>
            `;
        }

        const ec = this._subarea.environment_config;
        const parentName = this._parentGrowspaceName || this._config.growspace_id;

        return html`
            <error-boundary
                .fallbackMessage=${'Failed to load Subarea Card'}
                .onError=${this._handleError}
            >
                <ha-card class="unified-growspace-card glass-surface glass-panel">
                    <div class="subarea-header">
                        <h2 class="subarea-title">${this._subarea.name}</h2>
                        <p class="subarea-subtitle">
                            <ha-icon icon="mdi:sprout" style="--mdi-icon-size: 16px;"></ha-icon>
                            ${parentName}
                        </p>
                    </div>

                    ${this._renderHeroSensors(ec)}
                    ${this._renderDeviceChips(ec)}
                    ${this._renderAdditionalSensors(ec)}
                </ha-card>
            </error-boundary>
        `;
    }

    private _renderHeroSensors(ec: Subarea['environment_config']): TemplateResult {
        const heroSensors: Array<{ label: string; entityIds: string[] }> = [];

        const tempSensors = ec.temperature_sensors?.length
            ? ec.temperature_sensors
            : ec.temperature_sensor
              ? [ec.temperature_sensor]
              : [];
        const humSensors = ec.humidity_sensors?.length
            ? ec.humidity_sensors
            : ec.humidity_sensor
              ? [ec.humidity_sensor]
              : [];
        const vpdSensors = ec.vpd_sensors?.length
            ? ec.vpd_sensors
            : ec.vpd_sensor
              ? [ec.vpd_sensor]
              : [];
        const co2Sensors = [ec.co2_sensor].filter(Boolean) as string[];

        if (tempSensors.length) heroSensors.push({ label: 'Temperature', entityIds: tempSensors });
        if (humSensors.length) heroSensors.push({ label: 'Humidity', entityIds: humSensors });
        if (vpdSensors.length) heroSensors.push({ label: 'VPD', entityIds: vpdSensors });
        if (co2Sensors.length) heroSensors.push({ label: 'CO2', entityIds: co2Sensors });

        if (!heroSensors.length) {
            return html`<div class="no-sensors">No environment sensors configured for this subarea.</div>`;
        }

        return html`
            <div class="env-config-section">
                <div class="env-config-grid">
                    ${heroSensors.map((s) => this._renderSensorCard(s.label, s.entityIds))}
                </div>
            </div>
        `;
    }

    private _renderSensorCard(label: string, entityIds: string[]): TemplateResult {
        const values = entityIds
            .map((id) => {
                const state = this.hass?.states[id];
                return state
                    ? `${parseFloat(state.state).toFixed(1)} ${state.attributes?.unit_of_measurement || ''}`
                    : '—';
            })
            .filter(Boolean);

        const displayValue = values.length ? values.join(' / ') : '—';
        const primaryEntityId = entityIds[0] || '';
        const friendlyName = this.hass?.states[primaryEntityId]?.attributes?.friendly_name || primaryEntityId;

        return html`
            <div class="env-sensor-item">
                <span class="env-sensor-label">${label}</span>
                <span class="env-sensor-value">${displayValue}</span>
                ${entityIds.length === 1
                    ? html`<span class="env-sensor-entity" title="${primaryEntityId}">${friendlyName}</span>`
                    : html`<span class="env-sensor-entity">${entityIds.length} sensors</span>`}
            </div>
        `;
    }

    private _renderDeviceChips(ec: Subarea['environment_config']): TemplateResult {
        const deviceGroups: Array<{ label: string; icon: string; entities: string[] }> = [];

        if (ec.circulation_fan_entities?.length) {
            deviceGroups.push({ label: 'Fans', icon: 'mdi:fan', entities: ec.circulation_fan_entities });
        }
        if (ec.humidifier_entities?.length) {
            deviceGroups.push({ label: 'Humidifiers', icon: 'mdi:water-percent', entities: ec.humidifier_entities });
        }
        if (ec.dehumidifier_entities?.length) {
            deviceGroups.push({ label: 'Dehumidifiers', icon: 'mdi:water-off', entities: ec.dehumidifier_entities });
        }
        if (ec.exhaust_fan_entities?.length) {
            deviceGroups.push({ label: 'Exhaust', icon: 'mdi:air-filter', entities: ec.exhaust_fan_entities });
        }
        if (ec.light_sensors?.length) {
            deviceGroups.push({ label: 'Lights', icon: 'mdi:lightbulb', entities: ec.light_sensors });
        }

        if (!deviceGroups.length) return html``;

        return html`
            <div class="device-chips-section">
                <div class="device-chips-label">Devices</div>
                <div class="device-chips-grid">
                    ${deviceGroups.map(
                        (g) => html`
                            <div class="device-chip">
                                <ha-icon icon="${g.icon}" style="--mdi-icon-size: 16px;"></ha-icon>
                                ${g.label} (${g.entities.length})
                            </div>
                        `
                    )}
                </div>
            </div>
        `;
    }

    private _renderAdditionalSensors(ec: Subarea['environment_config']): TemplateResult {
        const additionalGroups: Array<{ label: string; entities: string[] }> = [];

        if (ec.substrate_temperature_sensors?.length) {
            additionalGroups.push({ label: 'Substrate Temp', entities: ec.substrate_temperature_sensors });
        }
        if (ec.ph_sensors?.length) {
            additionalGroups.push({ label: 'pH', entities: ec.ph_sensors });
        }
        if (ec.feed_ec_sensors?.length) {
            additionalGroups.push({ label: 'Feed EC', entities: ec.feed_ec_sensors });
        }
        if (ec.substrate_ec_sensors?.length) {
            additionalGroups.push({ label: 'Substrate EC', entities: ec.substrate_ec_sensors });
        }

        if (!additionalGroups.length) return html``;

        return html`
            <div class="section-title">Additional Sensors</div>
            <div class="env-config-section">
                <div class="env-config-grid">
                    ${additionalGroups.map((g) => this._renderSensorCard(g.label, g.entities))}
                </div>
            </div>
        `;
    }

    private _handleError = (error: Error, errorInfo: unknown): void => {
        console.error('Growspace Subarea Card caught error:', error, errorInfo);
        if (this.hass) {
            this.hass.callService('system_log', 'write', {
                message: `Growspace Subarea Card Error: ${error.message}`,
                level: 'error',
                logger: 'lovelace_growspace_manager_card',
            });
        }
    };
}

declare global {
    interface HTMLElementTagNameMap {
        'growspace-subarea-card': GrowspaceSubareaCard;
    }
}
