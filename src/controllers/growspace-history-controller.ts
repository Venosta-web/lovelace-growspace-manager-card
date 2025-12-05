import { ReactiveController, ReactiveControllerHost } from 'lit';
import { HomeAssistant } from 'custom-card-helpers';
import { DataService } from '../data-service';

// Interface for the host to ensure it has the required properties
export interface GrowspaceCardHost extends ReactiveControllerHost {
    hass: HomeAssistant;
    selectedDevice: string | null;
    dataService: DataService;
}

export class GrowspaceHistoryController implements ReactiveController {
    host: GrowspaceCardHost;

    public historyData: any[] | null = null;
    public dehumidifierHistory: any[] | null = null;
    public exhaustHistory: any[] | null = null;
    public humidifierHistory: any[] | null = null;
    public soilMoistureHistory: any[] | null = null;

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
        if (this.activeEnvGraphs.has('soil_moisture')) this._fetchSoilMoistureHistory(range);
    }

    private async _fetchHistory(range: '1h' | '6h' | '24h' | '7d' = '24h') {
        if (!this.host.hass || !this.host.selectedDevice) return;
        const devices = this.host.dataService.getGrowspaceDevices();
        const device = devices.find(d => d.device_id === this.host.selectedDevice);
        if (!device) return;

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

        const { start, end } = this.calculateTimeRange(range);

        try {
            const history = await this.host.dataService.getHistory(envEntityId, start, end);
            this.historyData = history;
            this.host.requestUpdate();
        } catch (e) {
            console.error("Failed to fetch history", e);
        }
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
        const { device, entityId } = this.getRelatedEntityId('exhaust_entity');
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
        const { device, entityId } = this.getRelatedEntityId('humidifier_entity');
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
        const devices = this.host.dataService.getGrowspaceDevices();
        const device = devices.find(d => d.device_id === this.host.selectedDevice);
        if (!device || !device.overview_entity_id) return { device, entityId: null };

        const overviewEntity = this.host.hass.states[device.overview_entity_id];
        const entityId = overviewEntity?.attributes?.[attribute];
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
