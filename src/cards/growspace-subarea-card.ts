import { LitElement, html, css, svg, CSSResultGroup, PropertyValues, TemplateResult, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { provide } from '@lit/context';
import { mdiCog, mdiThermometer, mdiWaterPercent, mdiCloudOutline, mdiWeatherCloudy } from '@mdi/js';

import { hassContext, configContext, storeContext } from '../lib/context';
import { HomeAssistant, LovelaceCard, LovelaceCardEditor } from 'custom-card-helpers';

import type { GrowspaceManagerCardConfig } from '../lib/types/config';
import type { Subarea } from '../services/types';
import { DataService } from '../services/data-service';
import { ConfigTab } from '../features/environment/constants';
import { ChartUtils } from '../utils/chart-utils';
import '../dialogs/config-dialog';

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

const SENSOR_LABEL_TO_METRIC: Record<string, string> = {
    Temperature: 'temperature',
    Humidity: 'humidity',
    VPD: 'vpd',
    CO2: 'co2',
};

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
    private _analyticsStateController: StoreController<any> | null = null;

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
    @state() private _showConfigDialog = false;
    @state() private _historyCache: Record<string, any[]> = {};

    static styles: CSSResultGroup = [
        variables,
        sharedStyles,
        uiStyles,
        growspaceCardStyles,
        css`
            .subarea-inner {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .subarea-header {
                padding: 0 0 4px;
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
            }

            .subarea-header-text {
                display: flex;
                flex-direction: column;
            }

            .config-button {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: var(--secondary-background-color, rgba(255, 255, 255, 0.1));
                border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--primary-text-color, #fff);
                cursor: pointer;
                transition: all 0.2s;
                flex-shrink: 0;
            }

            .config-button:hover {
                background: var(--secondary-background-color, rgba(255, 255, 255, 0.2));
            }

            .config-button svg {
                width: 22px;
                height: 22px;
                fill: currentColor;
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

            /* Device strip — horizontal scrollable row above hero sensors */
            .device-strip {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                min-height: 0;
            }

            .device-chip {
                background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
                border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
                border-radius: 20px;
                padding: 5px 14px;
                font-size: 0.82rem;
                color: var(--primary-text-color);
                display: flex;
                align-items: center;
                gap: 6px;
                white-space: nowrap;
                flex-shrink: 0;
                cursor: pointer;
                transition:
                    background 0.2s cubic-bezier(0.2, 0, 0, 1),
                    border-color 0.2s cubic-bezier(0.2, 0, 0, 1);
                user-select: none;
            }

            .device-chip:hover {
                background: var(--secondary-background-color, rgba(255, 255, 255, 0.1));
                border-color: var(--divider-color, rgba(255, 255, 255, 0.2));
            }

            .device-chip.active {
                background: color-mix(
                    in srgb,
                    var(--primary-color, #2196f3) 15%,
                    var(--glass-bg, rgba(255, 255, 255, 0.05))
                );
                border-color: var(--primary-color, #2196f3);
                color: var(--primary-text-color);
            }

            .device-chip-state {
                font-size: 0.75rem;
                color: var(--secondary-text-color);
                opacity: 0.85;
            }

            /* Hero sensor grid */
            .env-config-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                gap: 16px;
            }

            .env-sensor-item {
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
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
                user-select: none;
                overflow: hidden;
                position: relative;
                min-height: 110px;
            }

            .sensor-sparkline {
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

            .sensor-sparkline path {
                transition:
                    d 0.5s cubic-bezier(0.4, 0, 0.2, 1),
                    stroke 0.3s ease,
                    fill 0.3s ease;
            }

            .sensor-header,
            .env-sensor-value-group,
            .env-sensor-entity {
                position: relative;
                z-index: 1;
            }

            .sensor-header {
                display: flex;
                align-items: center;
                gap: 8px;
                color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
            }

            .env-sensor-label {
                font-size: 0.9rem;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .env-sensor-value-group {
                display: flex;
                align-items: baseline;
                gap: 4px;
            }

            .env-sensor-value {
                font-size: 2rem;
                font-weight: 400;
                color: var(--primary-text-color);
                line-height: 1;
            }

            .env-sensor-unit {
                font-size: 1rem;
                color: var(--secondary-text-color);
                font-weight: 500;
            }

            .env-sensor-item:hover {
                background: var(--secondary-background-color, rgba(255, 255, 255, 0.08));
                border-color: var(--divider-color, rgba(255, 255, 255, 0.15));
                box-shadow:
                    0 8px 32px -4px rgba(0, 0, 0, 0.3),
                    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
                transform: translateY(-2px);
            }

            .env-sensor-item.active {
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

            .env-sensor-item.non-interactive {
                cursor: default;
            }

            .env-sensor-item.non-interactive:hover {
                transform: none;
                background: var(--glass-bg, rgba(255, 255, 255, 0.05));
                border-color: var(--divider-color, rgba(255, 255, 255, 0.1));
                box-shadow:
                    0 4px 24px -1px rgba(0, 0, 0, 0.2),
                    0 0 0 1px rgba(255, 255, 255, 0.02) inset;
            }

            .env-sensor-entity {
                font-size: 0.72rem;
                color: var(--secondary-text-color);
                opacity: 0.7;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                position: relative;
                z-index: 1;
            }

            /* Additional sensors — compact secondary grid */
            .secondary-sensors-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
                gap: 8px;
            }

            .secondary-sensor-item {
                background: var(--secondary-background-color, rgba(255, 255, 255, 0.03));
                border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.07));
                border-radius: 12px;
                padding: 10px 12px;
                display: flex;
                flex-direction: column;
                gap: 2px;
            }

            .secondary-sensor-label {
                font-size: 0.7rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--secondary-text-color);
                opacity: 0.8;
            }

            .secondary-sensor-value {
                font-size: 1rem;
                font-weight: 500;
                color: var(--primary-text-color);
            }

            .no-sensors {
                color: var(--secondary-text-color);
                font-size: 0.875rem;
                opacity: 0.7;
            }
        `,
    ];

    private _initAnalyticsController(): void {
        if (this.store?.history && !this._analyticsStateController) {
            this._analyticsStateController = new StoreController(
                this,
                this.store.history.$analyticsViewState
            );
            this.store.history.startAutoRefresh();
        }
    }

    connectedCallback(): void {
        super.connectedCallback();
        this._initAnalyticsController();
    }

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
        if (!this._subarea && !this._loading) {
            this._loadSubarea();
        }
        this._initAnalyticsController();
        if (this.store?.history && !this._analyticsStateController?.value?.historyLoaded) {
            this.store.history.loadHistoryOnDemand();
        }
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        this.store.history?.stopAutoRefresh();
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

        const devices = this._viewController.value?.grid?.devices ?? [];
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
                this._loadHistory(found);
            }
        } catch (err) {
            console.error('[GrowspaceSubareaCard] Failed to load subarea:', err);
            this._error = 'Failed to load subarea data.';
        } finally {
            this._loading = false;
        }
    }

    private async _loadHistory(subarea: Subarea): Promise<void> {
        if (!this._dataService) return;

        const ec = subarea.environment_config;
        const end = new Date();
        const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

        const metricEntities: Array<{ metric: string; entityIds: string[] }> = [];

        const tempIds = ec.temperature_sensors?.length ? ec.temperature_sensors : ec.temperature_sensor ? [ec.temperature_sensor] : [];
        const humIds = ec.humidity_sensors?.length ? ec.humidity_sensors : ec.humidity_sensor ? [ec.humidity_sensor] : [];
        const vpdIds = ec.vpd_sensors?.length ? ec.vpd_sensors : ec.vpd_sensor ? [ec.vpd_sensor] : [];
        const co2Ids = ec.co2_sensor ? [ec.co2_sensor] : [];

        if (tempIds.length) metricEntities.push({ metric: 'temperature', entityIds: tempIds });
        if (humIds.length) metricEntities.push({ metric: 'humidity', entityIds: humIds });
        if (vpdIds.length) metricEntities.push({ metric: 'vpd', entityIds: vpdIds });
        if (co2Ids.length) metricEntities.push({ metric: 'co2', entityIds: co2Ids });

        const allEntityIds = [...new Set(metricEntities.flatMap((m) => m.entityIds))];
        if (!allEntityIds.length) return;

        try {
            const batchResults = await this._dataService.getBatchHistory(allEntityIds, start, end);
            const cache: Record<string, any[]> = {};

            for (const { metric, entityIds } of metricEntities) {
                if (entityIds.length === 1) {
                    cache[metric] = batchResults[entityIds[0]] || [];
                } else {
                    entityIds.forEach((id) => {
                        cache[`${metric}:${id}`] = batchResults[id] || [];
                    });
                }
            }

            this._historyCache = cache;
        } catch (err) {
            console.error('[GrowspaceSubareaCard] Failed to load history:', err);
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
        const syntheticConfig: GrowspaceManagerCardConfig = {
            ...config,
            default_growspace: config.growspace_id || '',
        };
        this.store.initializeSelectedDevice(syntheticConfig);
    }

    public getCardSize(): number {
        return 4;
    }

    private _isMetricActive(metric: string): boolean {
        return this._analyticsStateController?.value?.activeEnvGraphs?.has(metric) ?? false;
    }

    private _toggleMetricGraph(metric: string): void {
        this.store?.toggleEnvGraph(metric);
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
        const { devices } = this._viewController.value.grid;
        const parentDevice = devices.find((d: any) => d.deviceId === this._config.growspace_id);

        const growspaceOptions: Record<string, string> = Object.fromEntries(
            devices.map((d: any) => [d.deviceId, d.name])
        );

        const parentEnvAttrs = parentDevice?.environmentAttributes;
        const configEnvData = {
            selectedGrowspaceId: this._config.growspace_id,
            temperatureSensor: parentEnvAttrs?.temperatureSensor || '',
            humiditySensor: parentEnvAttrs?.humiditySensor || '',
            vpdSensor: parentEnvAttrs?.vpdSensor || '',
            co2Sensor: parentEnvAttrs?.co2Sensor || '',
            circulationFanEntity: parentEnvAttrs?.circulationFanEntity || '',
            circulationFanEntities: parentEnvAttrs?.circulationFanEntities || [],
            stressThreshold: 0.8,
            moldThreshold: 0.8,
            lightSensor: parentEnvAttrs?.lightSensor || '',
            lightSensors: parentEnvAttrs?.lightSensors || [],
            exhaustEntity: parentEnvAttrs?.exhaustEntity || '',
            exhaustFanEntities: parentEnvAttrs?.exhaustFanEntities || [],
            humidifierEntity: parentEnvAttrs?.humidifierEntity || '',
            humidifierEntities: parentEnvAttrs?.humidifierEntities || [],
            dehumidifierEntity: parentEnvAttrs?.dehumidifierEntity || '',
            dehumidifierEntities: parentEnvAttrs?.dehumidifierEntities || [],
            soilMoistureSensor: parentEnvAttrs?.soilMoistureSensor || '',
            dehumidifierControlEnabled: parentEnvAttrs?.dehumidifierControlEnabled || false,
            dehumidifierThresholds: parentEnvAttrs?.dehumidifierThresholds || {},
            sensorGroups: parentEnvAttrs?.sensorGroups || [],
            sensorCoordinates: parentEnvAttrs?.sensorCoordinates || {},
            irrigationTanks: parentEnvAttrs?.irrigationTanks || [],
            cameraEntities: parentEnvAttrs?.cameraEntities || [],
        };

        return html`
            <error-boundary
                .fallbackMessage=${'Failed to load Subarea Card'}
                .onError=${this._handleError}
            >
                <ha-card>
                    <div class="unified-growspace-card glass-surface glass-panel">
                        <div class="subarea-inner">
                            <div class="subarea-header">
                                <div class="subarea-header-text">
                                    <h2 class="subarea-title">${this._subarea.name}</h2>
                                    <p class="subarea-subtitle">
                                        <ha-icon icon="mdi:sprout" style="--mdi-icon-size: 16px;"></ha-icon>
                                        ${parentName}
                                    </p>
                                </div>
                                <button
                                    class="config-button"
                                    title="Configure subareas"
                                    @click=${() => { this._showConfigDialog = true; }}
                                >
                                    <svg viewBox="0 0 24 24"><path d="${mdiCog}"></path></svg>
                                </button>
                            </div>

                            ${this._renderDeviceChips(ec)}
                            ${this._renderHeroSensors(ec)}
                            ${this._renderAdditionalSensors(ec)}

                            ${parentDevice
                                ? html`<growspace-analytics .device=${parentDevice}></growspace-analytics>`
                                : ''}
                        </div>
                    </div>
                </ha-card>

                ${this._showConfigDialog ? html`
                    <config-dialog
                        .open=${true}
                        .hass=${this.hass}
                        .devices=${devices}
                        .growspaceOptions=${growspaceOptions}
                        .initialTab=${ConfigTab.SUBAREAS}
                        .allowedTabs=${[ConfigTab.SUBAREAS]}
                        .environmentData=${configEnvData}
                        @close=${() => { this._showConfigDialog = false; }}
                    ></config-dialog>
                ` : nothing}
            </error-boundary>
        `;
    }

    private _renderHeroSensors(ec: Subarea['environment_config']): TemplateResult {
        const heroSensors: Array<{ label: string; metric: string; entityIds: string[] }> = [];

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

        if (tempSensors.length) heroSensors.push({ label: 'Temperature', metric: 'temperature', entityIds: tempSensors });
        if (humSensors.length) heroSensors.push({ label: 'Humidity', metric: 'humidity', entityIds: humSensors });
        if (vpdSensors.length) heroSensors.push({ label: 'VPD', metric: 'vpd', entityIds: vpdSensors });
        if (co2Sensors.length) heroSensors.push({ label: 'CO2', metric: 'co2', entityIds: co2Sensors });

        if (!heroSensors.length) {
            return html`<div class="no-sensors">No environment sensors configured for this subarea.</div>`;
        }

        return html`
            <div class="env-config-grid">
                ${heroSensors.map((s) => this._renderHeroCard(s.label, s.metric, s.entityIds))}
            </div>
        `;
    }

    private static readonly _METRIC_ICONS: Record<string, string> = {
        temperature: mdiThermometer,
        humidity: mdiWaterPercent,
        vpd: mdiCloudOutline,
        co2: mdiWeatherCloudy,
    };

    private _renderHeroCard(label: string, metric: string, entityIds: string[]): TemplateResult {
        const rawValues = entityIds.map((id) => {
            const st = this.hass?.states[id];
            return st ? { val: parseFloat(st.state).toFixed(1), unit: st.attributes?.unit_of_measurement || '' } : null;
        }).filter(Boolean) as Array<{ val: string; unit: string }>;

        const primaryEntityId = entityIds[0] || '';
        const friendlyName = this.hass?.states[primaryEntityId]?.attributes?.friendly_name || primaryEntityId;
        const isActive = this._isMetricActive(metric);
        const icon = GrowspaceSubareaCard._METRIC_ICONS[metric];

        const sparklineWidth = 140;
        const sparklineHeight = 80;
        const sparklineColor = ChartUtils.getSparklineColor(metric);
        const sparklinePaths: Array<{ d: string; color: string }> = [];

        if (entityIds.length > 1) {
            entityIds.forEach((id, idx) => {
                const path = ChartUtils.generateSparklinePath(
                    this._historyCache[`${metric}:${id}`],
                    sparklineWidth,
                    sparklineHeight
                );
                if (path) {
                    const color = idx === 0
                        ? sparklineColor
                        : `color-mix(in srgb, ${sparklineColor}, white ${idx * 20}%)`;
                    sparklinePaths.push({ d: path, color });
                }
            });
        } else {
            const path = ChartUtils.generateSparklinePath(
                this._historyCache[metric],
                sparklineWidth,
                sparklineHeight
            );
            if (path) sparklinePaths.push({ d: path, color: sparklineColor });
        }

        const singleUnit = rawValues.length === 1 ? rawValues[0].unit : (rawValues[0]?.unit || '');
        const allSameUnit = rawValues.every((v) => v.unit === singleUnit);
        const displayVal = rawValues.length
            ? rawValues.map((v) => v.val).join(' / ')
            : '—';
        const displayUnit = rawValues.length && allSameUnit ? singleUnit : '';

        return html`
            <div
                class="env-sensor-item ${isActive ? 'active' : ''}"
                @click=${() => this._toggleMetricGraph(metric)}
                title="Click to toggle ${label} graph"
            >
                ${sparklinePaths.length > 0 ? html`
                    <svg
                        class="sensor-sparkline"
                        viewBox="0 0 ${sparklineWidth} ${sparklineHeight}"
                        preserveAspectRatio="none"
                    >
                        <defs>
                            <linearGradient id="sg-${metric}" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stop-color="${sparklineColor}" stop-opacity="0.3" />
                                <stop offset="100%" stop-color="${sparklineColor}" stop-opacity="0" />
                            </linearGradient>
                        </defs>
                        ${sparklinePaths.map((p) => svg`
                            <path
                                d="${p.d}"
                                fill="none"
                                stroke="${p.color}"
                                stroke-width="2.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                style="opacity: ${p.color === sparklineColor ? '1' : '0.6'}"
                            />
                        `)}
                        <path
                            d="${sparklinePaths[0].d} V ${sparklineHeight} H 0 Z"
                            fill="url(#sg-${metric})"
                        />
                    </svg>
                ` : nothing}
                <div class="sensor-header">
                    ${icon ? svg`<svg viewBox="0 0 24 24" style="width:20px;height:20px;flex-shrink:0;fill:currentColor"><path d="${icon}"></path></svg>` : nothing}
                    <span class="env-sensor-label">${label}</span>
                </div>
                <div class="env-sensor-value-group">
                    <span class="env-sensor-value">${displayVal}</span>
                    ${displayUnit ? html`<span class="env-sensor-unit">${displayUnit}</span>` : nothing}
                </div>
                ${entityIds.length === 1
                    ? html`<span class="env-sensor-entity" title="${primaryEntityId}">${friendlyName}</span>`
                    : html`<span class="env-sensor-entity">${entityIds.length} sensors</span>`}
            </div>
        `;
    }

    private _renderDeviceChips(ec: Subarea['environment_config']): TemplateResult {
        const deviceGroups: Array<{ label: string; icon: string; metric: string; entities: string[] }> = [];

        if (ec.light_sensors?.length) {
            deviceGroups.push({ label: 'Lights', icon: 'mdi:lightbulb', metric: 'light', entities: ec.light_sensors });
        }
        if (ec.exhaust_fan_entities?.length) {
            deviceGroups.push({ label: 'Exhaust', icon: 'mdi:air-filter', metric: 'exhaust', entities: ec.exhaust_fan_entities });
        }
        if (ec.circulation_fan_entities?.length) {
            deviceGroups.push({ label: 'Fan', icon: 'mdi:fan', metric: 'circulation_fan', entities: ec.circulation_fan_entities });
        }
        if (ec.humidifier_entities?.length) {
            deviceGroups.push({ label: 'Humidifier', icon: 'mdi:water-percent', metric: 'humidifier', entities: ec.humidifier_entities });
        }
        if (ec.dehumidifier_entities?.length) {
            deviceGroups.push({ label: 'Dehumidifier', icon: 'mdi:water-off', metric: 'dehumidifier', entities: ec.dehumidifier_entities });
        }

        if (!deviceGroups.length) return html``;

        return html`
            <div class="device-strip">
                ${deviceGroups.map((g) => {
                    const states = g.entities.map((id) => this.hass?.states[id]?.state ?? '');
                    const onCount = states.filter((s) => s === 'on').length;
                    const stateLabel = g.entities.length === 1
                        ? (states[0] === 'on' ? 'On' : states[0] === 'off' ? 'Off' : states[0] || '—')
                        : `${onCount}/${g.entities.length}`;
                    const isActive = this._isMetricActive(g.metric);
                    return html`
                        <div
                            class="device-chip ${isActive ? 'active' : ''}"
                            @click=${() => this._toggleMetricGraph(g.metric)}
                            title="Click to toggle ${g.label} graph"
                        >
                            <ha-icon icon="${g.icon}" style="--mdi-icon-size: 16px;"></ha-icon>
                            ${g.label}
                            <span class="device-chip-state">${stateLabel}</span>
                        </div>
                    `;
                })}
            </div>
        `;
    }

    private _renderAdditionalSensors(ec: Subarea['environment_config']): TemplateResult {
        const groups: Array<{ label: string; entities: string[] }> = [];

        if (ec.substrate_temperature_sensors?.length) {
            groups.push({ label: 'Substrate Temp', entities: ec.substrate_temperature_sensors });
        }
        if (ec.ph_sensors?.length) {
            groups.push({ label: 'pH', entities: ec.ph_sensors });
        }
        if (ec.feed_ec_sensors?.length) {
            groups.push({ label: 'Feed EC', entities: ec.feed_ec_sensors });
        }
        if (ec.substrate_ec_sensors?.length) {
            groups.push({ label: 'Substrate EC', entities: ec.substrate_ec_sensors });
        }

        if (!groups.length) return html``;

        return html`
            <div class="secondary-sensors-grid">
                ${groups.map((g) => this._renderSecondaryCard(g.label, g.entities))}
            </div>
        `;
    }

    private _renderSecondaryCard(label: string, entityIds: string[]): TemplateResult {
        const values = entityIds
            .map((id) => {
                const st = this.hass?.states[id];
                return st
                    ? `${parseFloat(st.state).toFixed(1)} ${st.attributes?.unit_of_measurement || ''}`
                    : '—';
            })
            .filter(Boolean);

        const displayValue = values.length ? values.join(' / ') : '—';

        return html`
            <div class="secondary-sensor-item">
                <span class="secondary-sensor-label">${label}</span>
                <span class="secondary-sensor-value">${displayValue}</span>
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
