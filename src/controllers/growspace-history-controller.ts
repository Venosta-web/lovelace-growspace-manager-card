import { ReactiveController, ReactiveControllerHost } from 'lit';
import { HomeAssistant } from 'custom-card-helpers';
import { DataService } from '../data-service';
import { GrowspaceDevice } from '../types';

// Interface for the host to ensure it has the required properties
export interface GrowspaceCardHost extends ReactiveControllerHost {
    hass: HomeAssistant;
    selectedDevice: string | null;
    dataService: DataService;
    devices: GrowspaceDevice[];  // Pre-loaded devices from store
}

export class GrowspaceHistoryController implements ReactiveController {
    host: GrowspaceCardHost;

    public historyData: any[] | null = null;
    public dehumidifierHistory: any[] | null = null;
    public exhaustHistory: any[] | null = null;
    public humidifierHistory: any[] | null = null;
    public circulationFanHistory: any[] | null = null;
    public soilMoistureHistory: any[] | null = null;
    // Individual environment sensor histories (since env data moved to WebSocket)
    public temperatureHistory: any[] | null = null;
    public humidityHistory: any[] | null = null;
    public vpdHistory: any[] | null = null;
    public co2History: any[] | null = null;

    public activeEnvGraphs: Set<string> = new Set();
    public linkedGraphGroups: string[][] = [];
    public graphRanges: Record<string, '1h' | '6h' | '24h' | '7d'> = {};

    constructor(host: GrowspaceCardHost) {
        (this.host = host).addController(this);
    }

    hostConnected() {
        // Initial fetch if needed, though hostUpdated usually handles it
    }

    hostUpdated() {
        // We can check if we need to refetch based on changes.
        // However, without keeping track of previous state, we might over-fetch.
        // The original card fetched in `updated` checking `changedProps.has('selectedDevice')`.
        // ReactiveController doesn't get `changedProps` in `hostUpdated`.
        // We might need to rely on explicit calls or manual caching.
        // But the user said "Listen for changes... to automatically re-fetch".
        // We can store prevSelectedDevice.
    }

    initFetch() {
        // Called manually from firstUpdated if needed
        this._fetchHistory();
    }

    private _prevSelectedDevice: string | null = null;

    async hostUpdate() {
        // Logic to detect changes if possible, or we rely on hostUpdated
        if (this.host.selectedDevice !== this._prevSelectedDevice) {
            this._prevSelectedDevice = this.host.selectedDevice;
            const range = this.getRange();
            await this._fetchHistory(range);
            this.refreshSecondaryHistories(range);
        }
    }

    getRange(): '1h' | '6h' | '24h' | '7d' {
        return this.host.selectedDevice ? (this.graphRanges[this.host.selectedDevice] || '24h') : '24h';
    }

    setGraphRange(range: '1h' | '6h' | '24h' | '7d') {
        if (!this.host.selectedDevice) return;
        this.graphRanges = {
            ...this.graphRanges,
            [this.host.selectedDevice]: range
        };
        this.host.requestUpdate();

        this._fetchHistory(range);
        this.refreshSecondaryHistories(range);
    }

    toggleEnvGraph(details: { metric: string, visible: boolean }) {
        const { metric } = details;
        const newSet = new Set(this.activeEnvGraphs);
        if (newSet.has(metric)) {
            newSet.delete(metric);
        } else {
            newSet.add(metric);

            // Fetch history for this metric if needed
            const range = this.getRange();
            if (metric === 'dehumidifier') this._fetchDehumidifierHistory(range);
            if (metric === 'exhaust') this._fetchExhaustHistory(range);
            if (metric === 'humidifier') this._fetchHumidifierHistory(range);
            if (metric === 'circulation_fan') this._fetchCirculationFanHistory(range);
            if (metric === 'soil_moisture') this._fetchSoilMoistureHistory(range);
        }
        this.activeEnvGraphs = newSet;
        this.host.requestUpdate();
    }

    linkGraphs(metric1: string, metric2: string) {
        // Check if already linked
        const existingGroupIndex = this.linkedGraphGroups.findIndex(group =>
            group.includes(metric1) || group.includes(metric2)
        );

        let newGroups = [...this.linkedGraphGroups];

        if (existingGroupIndex >= 0) {
            // Add unique
            const group = new Set(newGroups[existingGroupIndex]);
            group.add(metric1);
            group.add(metric2);
            newGroups[existingGroupIndex] = Array.from(group);
        } else {
            // Create new group
            newGroups.push([metric1, metric2]);
        }

        this.linkedGraphGroups = newGroups;

        // Auto-activate both metrics so the linked graph displays immediately
        const newActive = new Set(this.activeEnvGraphs);
        newActive.add(metric1);
        newActive.add(metric2);
        this.activeEnvGraphs = newActive;

        this.host.requestUpdate();
    }

    unlinkGraphGroup(index: number) {
        if (index >= 0 && index < this.linkedGraphGroups.length) {
            const newGroups = [...this.linkedGraphGroups];
            newGroups.splice(index, 1);
            this.linkedGraphGroups = newGroups;
            this.host.requestUpdate();
        }
    }

    clearAllLinks() {
        this.linkedGraphGroups = [];
        this.host.requestUpdate();
    }
    unlinkGraphMetric(metric: string) {
        this.linkedGraphGroups = this.linkedGraphGroups.map(group =>
            group.filter(m => m !== metric)
        ).filter(group => group.length > 1);
        this.host.requestUpdate();
    }

    private refreshSecondaryHistories(range: '1h' | '6h' | '24h' | '7d') {
        if (this.activeEnvGraphs.has('dehumidifier')) this._fetchDehumidifierHistory(range);
        if (this.activeEnvGraphs.has('exhaust')) this._fetchExhaustHistory(range);
        if (this.activeEnvGraphs.has('humidifier')) this._fetchHumidifierHistory(range);
        if (this.activeEnvGraphs.has('circulation_fan')) this._fetchCirculationFanHistory(range);
        if (this.activeEnvGraphs.has('soil_moisture')) this._fetchSoilMoistureHistory(range);
    }

    public optimalHistory: any[] | null = null;

    private async _fetchHistory(range: '1h' | '6h' | '24h' | '7d' = '24h') {
        console.log('[HistoryController] _fetchHistory called with range:', range);
        if (!this.host.hass || !this.host.selectedDevice) {
            console.log('[HistoryController] Aborting: no hass or selectedDevice', { hasHass: !!this.host.hass, selectedDevice: this.host.selectedDevice });
            return;
        }
        // Use pre-loaded devices from store instead of fetching independently
        const devices = this.host.devices;
        console.log('[HistoryController] selectedDevice:', this.host.selectedDevice, 'available devices:', devices.map(d => ({ device_id: d.device_id, name: d.name })));
        const device = devices.find(d => d.device_id === this.host.selectedDevice);
        if (!device) {
            console.log('[HistoryController] Aborting: device not found. Looking for:', this.host.selectedDevice);
            return;
        }

        const { start, end } = this.calculateTimeRange(range);
        console.log('[HistoryController] Fetching history for device:', device.name, 'entity:', device.overview_entity_id);

        // 1. Fetch Main Sensor History (Temp, Humidity, VPD, etc.)
        if (device.overview_entity_id) {
            try {
                const history = await this.host.dataService.getHistory(device.overview_entity_id, start, end);
                console.log('[HistoryController] History fetched, length:', history?.length || 0, 'sample:', history?.[0] ? JSON.stringify(history[0]).slice(0, 300) : 'empty');
                this.historyData = history;
            } catch (e) {
                console.error("Failed to fetch main sensor history", e);
            }
        } else {
            console.log('[HistoryController] No overview_entity_id on device');
        }

        // 2. Fetch Optimal Conditions Binary Sensor History
        let slug = device.name.toLowerCase().replace(/\s+/g, '_');
        if (device.overview_entity_id) {
            slug = device.overview_entity_id.replace('sensor.', '');
        }

        let envEntityId = `binary_sensor.${slug}_optimal_conditions`;
        if (slug === 'cure') {
            envEntityId = `binary_sensor.cure_optimal_curing`;
        } else if (slug === 'dry') {
            envEntityId = `binary_sensor.dry_optimal_drying`;
        }

        try {
            const history = await this.host.dataService.getHistory(envEntityId, start, end);
            this.optimalHistory = history;
        } catch (e) {
            console.error("Failed to fetch optimal history", e);
        }

        // 3. Fetch individual environment sensor histories (since env data moved to WebSocket)
        const envAttrs = device.environment_attributes || {};

        // Temperature
        if (envAttrs.temperature_sensor) {
            try {
                const history = await this.host.dataService.getHistory(envAttrs.temperature_sensor, start, end);
                console.log('[HistoryController] Temperature history fetched from', envAttrs.temperature_sensor, 'length:', history?.length || 0);
                this.temperatureHistory = history;
            } catch (e) {
                console.error("Failed to fetch temperature history", e);
            }
        }

        // Humidity
        if (envAttrs.humidity_sensor) {
            try {
                const history = await this.host.dataService.getHistory(envAttrs.humidity_sensor, start, end);
                console.log('[HistoryController] Humidity history fetched from', envAttrs.humidity_sensor, 'length:', history?.length || 0);
                this.humidityHistory = history;
            } catch (e) {
                console.error("Failed to fetch humidity history", e);
            }
        }

        // VPD
        if (envAttrs.vpd_sensor) {
            try {
                const history = await this.host.dataService.getHistory(envAttrs.vpd_sensor, start, end);
                console.log('[HistoryController] VPD history fetched from', envAttrs.vpd_sensor, 'length:', history?.length || 0);
                this.vpdHistory = history;
            } catch (e) {
                console.error("Failed to fetch VPD history", e);
            }
        }

        // CO2
        if (envAttrs.co2_sensor) {
            try {
                const history = await this.host.dataService.getHistory(envAttrs.co2_sensor, start, end);
                console.log('[HistoryController] CO2 history fetched from', envAttrs.co2_sensor, 'length:', history?.length || 0);
                this.co2History = history;
            } catch (e) {
                console.error("Failed to fetch CO2 history", e);
            }
        }

        this.host.requestUpdate();
    }

    private async _fetchDehumidifierHistory(range: '1h' | '6h' | '24h' | '7d' = '24h') {
        const { device, entityId } = this.getRelatedEntityId('dehumidifier_entity');
        if (!device || !entityId) return;

        const { start, end } = this.calculateTimeRange(range);

        try {
            const history = await this.host.dataService.getHistory(entityId, start, end);
            this.dehumidifierHistory = history;
            this.host.requestUpdate();
        } catch (e) {
            console.error("Failed to fetch dehumidifier history", e);
        }
    }

    private async _fetchExhaustHistory(range: '1h' | '6h' | '24h' | '7d' = '24h') {
        const { device, entityId } = this.getRelatedEntityId('exhaust_sensor');
        if (!device || !entityId) return;
        const { start, end } = this.calculateTimeRange(range);
        try {
            const history = await this.host.dataService.getHistory(entityId, start, end);
            this.exhaustHistory = history;
            this.host.requestUpdate();
        } catch (e) {
            console.error("Failed to fetch exhaust history", e);
        }
    }

    private async _fetchHumidifierHistory(range: '1h' | '6h' | '24h' | '7d' = '24h') {
        const { device, entityId } = this.getRelatedEntityId('humidifier_sensor');
        if (!device || !entityId) return;
        const { start, end } = this.calculateTimeRange(range);
        try {
            const history = await this.host.dataService.getHistory(entityId, start, end);
            this.humidifierHistory = history;
            this.host.requestUpdate();
        } catch (e) {
            console.error("Failed to fetch humidifier history", e);
        }
    }

    private async _fetchCirculationFanHistory(range: '1h' | '6h' | '24h' | '7d' = '24h') {
        const { device, entityId } = this.getRelatedEntityId('circulation_fan_entity');
        if (!device || !entityId) return;
        const { start, end } = this.calculateTimeRange(range);
        try {
            const history = await this.host.dataService.getHistory(entityId, start, end);
            this.circulationFanHistory = history;
            this.host.requestUpdate();
        } catch (e) {
            console.error("Failed to fetch circulation fan history", e);
        }
    }

    private async _fetchSoilMoistureHistory(range: '1h' | '6h' | '24h' | '7d' = '24h') {
        const { device, entityId } = this.getRelatedEntityId('soil_moisture_sensor');
        if (!device || !entityId) return;
        const { start, end } = this.calculateTimeRange(range);
        try {
            const history = await this.host.dataService.getHistory(entityId, start, end);
            this.soilMoistureHistory = history;
            this.host.requestUpdate();
        } catch (e) {
            console.error("Failed to fetch soil moisture history", e);
        }
    }

    private getRelatedEntityId(attribute: string) {
        if (!this.host.hass || !this.host.selectedDevice) return { device: null, entityId: null };
        // Use pre-loaded devices from store
        const devices = this.host.devices;
        const device = devices.find(d => d.device_id === this.host.selectedDevice);
        if (!device) return { device: null, entityId: null };

        // 0. Use environment_attributes from device (populated via WebSocket)
        let entityId = device.environment_attributes?.[attribute as keyof typeof device.environment_attributes];

        if (entityId) return { device, entityId };

        // Fallback: check other variants in environment_attributes
        if (attribute.endsWith('_entity')) {
            const sensorAttr = attribute.replace('_entity', '_sensor');
            entityId = device.environment_attributes?.[sensorAttr as keyof typeof device.environment_attributes];
        } else if (attribute.endsWith('_sensor')) {
            const entityAttr = attribute.replace('_sensor', '_entity');
            entityId = device.environment_attributes?.[entityAttr as keyof typeof device.environment_attributes];
        }

        if (entityId) return { device, entityId };

        // Legacy access via overview entity attributes
        const overviewEntity = device.overview_entity_id ? this.host.hass.states[device.overview_entity_id] : null;
        entityId = overviewEntity?.attributes?.[attribute];

        if (!entityId && attribute.endsWith('_entity')) {
            const sensorAttr = attribute.replace('_entity', '_sensor');
            entityId = overviewEntity?.attributes?.[sensorAttr];
        }

        if (!entityId && attribute.endsWith('_sensor')) {
            const entityAttr = attribute.replace('_sensor', '_entity');
            entityId = overviewEntity?.attributes?.[entityAttr];
        }

        if (!entityId && overviewEntity?.attributes?.observations) {
            entityId = overviewEntity.attributes.observations[attribute];
            if (!entityId && attribute.endsWith('_entity')) {
                const sensorAttr = attribute.replace('_entity', '_sensor');
                entityId = overviewEntity.attributes.observations[sensorAttr];
            }
        }

        return { device, entityId };
    }


    private calculateTimeRange(range: '1h' | '6h' | '24h' | '7d') {
        const now = new Date();
        let startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        switch (range) {
            case '1h':
                startTime = new Date(now.getTime() - 60 * 60 * 1000);
                break;
            case '6h':
                startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
                break;
            case '7d':
                startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
        }
        return { start: startTime, end: now };
    }
}
