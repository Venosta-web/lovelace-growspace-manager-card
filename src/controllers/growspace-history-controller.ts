import { ReactiveController, ReactiveControllerHost } from 'lit';
import { HomeAssistant } from 'custom-card-helpers';
import { DataService } from '../data-service';
import { GrowspaceDevice, HistorySensorState } from '../types';
import { METRIC_ENTITY_KEYS } from '../constants';

// Interface for the host to ensure it has the required properties
export interface GrowspaceCardHost extends ReactiveControllerHost {
  hass: HomeAssistant;
  selectedDevice: string | null;
  dataService: DataService;
  devices: GrowspaceDevice[]; // Pre-loaded devices from store
}

export class GrowspaceHistoryController implements ReactiveController {
  host: GrowspaceCardHost;

  /**
   * Unified history cache keyed by metric name.
   * Replaces individual properties like temperatureHistory, humidityHistory, etc.
   * Access via: this.historyCache['temperature'], this.historyCache['vpd'], etc.
   */
  public historyCache: Record<string, HistorySensorState[]> = {};

  /** @deprecated Use historyCache['main'] instead */
  public get historyData(): HistorySensorState[] | null {
    return this.historyCache.main || null;
  }

  public set historyData(value: HistorySensorState[] | null) {
    this.historyCache.main = value || [];
  }

  /** @deprecated Use historyCache['optimal'] instead */
  public get optimalHistory(): HistorySensorState[] | null {
    return this.historyCache.optimal || null;
  }

  public set optimalHistory(value: HistorySensorState[] | null) {
    this.historyCache.optimal = value || [];
  }

  // Backward compatibility getters for existing code that reads these properties
  public get temperatureHistory() {
    return this.historyCache.temperature || null;
  }

  public get humidityHistory() {
    return this.historyCache.humidity || null;
  }

  public get vpdHistory() {
    return this.historyCache.vpd || null;
  }

  public get co2History() {
    return this.historyCache.co2 || null;
  }

  public get lightHistory() {
    return this.historyCache.light || null;
  }

  public get soilMoistureHistory() {
    return this.historyCache.soil_moisture || null;
  }

  public get exhaustHistory() {
    return this.historyCache.exhaust || null;
  }

  public get humidifierHistory() {
    return this.historyCache.humidifier || null;
  }

  public get dehumidifierHistory() {
    return this.historyCache.dehumidifier || null;
  }

  public get circulationFanHistory() {
    return this.historyCache.circulation_fan || null;
  }

  public get irrigationHistory() {
    return this.historyCache.irrigation || null;
  }

  public get drainHistory() {
    return this.historyCache.drain || null;
  }

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
    return this.host.selectedDevice ? this.graphRanges[this.host.selectedDevice] || '24h' : '24h';
  }

  setGraphRange(range: '1h' | '6h' | '24h' | '7d') {
    if (!this.host.selectedDevice) return;
    this.graphRanges = {
      ...this.graphRanges,
      [this.host.selectedDevice]: range,
    };
    this.host.requestUpdate();

    this._fetchHistory(range);
    this.refreshSecondaryHistories(range);
  }

  toggleEnvGraph(details: { metric: string; visible: boolean }) {
    const { metric } = details;
    const newSet = new Set(this.activeEnvGraphs);
    if (newSet.has(metric)) {
      newSet.delete(metric);
    } else {
      newSet.add(metric);
      // Fetch history for this metric using generic method
      const range = this.getRange();
      this._fetchMetricHistory(metric, range);
    }
    this.activeEnvGraphs = newSet;
    this.host.requestUpdate();
  }

  linkGraphs(metric1: string, metric2: string) {
    // Check if already linked
    const existingGroupIndex = this.linkedGraphGroups.findIndex(
      (group) => group.includes(metric1) || group.includes(metric2)
    );

    const newGroups = [...this.linkedGraphGroups];

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
    this.linkedGraphGroups = this.linkedGraphGroups
      .map((group) => group.filter((m) => m !== metric))
      .filter((group) => group.length > 1);
    this.host.requestUpdate();
  }

  /**
   * Refreshes history data for all currently active environment graphs.
   */
  private refreshSecondaryHistories(range: '1h' | '6h' | '24h' | '7d') {
    for (const metricKey of this.activeEnvGraphs) {
      // Skip 'main' and 'optimal' as those are fetched by _fetchHistory
      if (metricKey === 'main' || metricKey === 'optimal') continue;
      this._fetchMetricHistory(metricKey, range);
    }
  }

  private async _fetchHistory(range: '1h' | '6h' | '24h' | '7d' = '24h') {
    console.log('[HistoryController] _fetchHistory called with range:', range);
    if (!this.host.hass || !this.host.selectedDevice) {
      console.log('[HistoryController] Aborting: no hass or selectedDevice', {
        hasHass: !!this.host.hass,
        selectedDevice: this.host.selectedDevice,
      });
      return;
    }
    // Use pre-loaded devices from store instead of fetching independently
    const devices = this.host.devices;
    console.log(
      '[HistoryController] selectedDevice:',
      this.host.selectedDevice,
      'available devices:',
      devices.map((d) => ({ device_id: d.device_id, name: d.name }))
    );
    const device = devices.find((d) => d.device_id === this.host.selectedDevice);
    if (!device) {
      console.log(
        '[HistoryController] Aborting: device not found. Looking for:',
        this.host.selectedDevice
      );
      return;
    }

    const { start, end } = this.calculateTimeRange(range);
    console.log(
      '[HistoryController] Fetching history for device:',
      device.name,
      'entity:',
      device.overview_entity_id
    );

    // 1. Fetch Main Sensor History (Temp, Humidity, VPD, etc.)
    if (device.overview_entity_id) {
      try {
        const history = await this.host.dataService.getHistory(
          device.overview_entity_id,
          start,
          end
        );
        console.log(
          '[HistoryController] History fetched, length:',
          history?.length || 0,
          'sample:',
          history?.[0] ? JSON.stringify(history[0]).slice(0, 300) : 'empty'
        );
        this.historyData = history;
      } catch (e) {
        console.error('Failed to fetch main sensor history', e);
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
      console.error('Failed to fetch optimal history', e);
    }

    // 3. Fetch individual environment sensor histories (since env data moved to WebSocket)
    const envAttrs = device.environment_attributes || {};

    // Temperature
    if (envAttrs.temperature_sensor) {
      try {
        const history = await this.host.dataService.getHistory(
          envAttrs.temperature_sensor,
          start,
          end
        );
        console.log(
          '[HistoryController] Temperature history fetched from',
          envAttrs.temperature_sensor,
          'length:',
          history?.length || 0
        );
        this.historyCache.temperature = history || [];
      } catch (e) {
        console.error('Failed to fetch temperature history', e);
      }
    }

    // Humidity
    if (envAttrs.humidity_sensor) {
      try {
        const history = await this.host.dataService.getHistory(
          envAttrs.humidity_sensor,
          start,
          end
        );
        console.log(
          '[HistoryController] Humidity history fetched from',
          envAttrs.humidity_sensor,
          'length:',
          history?.length || 0
        );
        this.historyCache.humidity = history || [];
      } catch (e) {
        console.error('Failed to fetch humidity history', e);
      }
    }

    // VPD
    if (envAttrs.vpd_sensor) {
      try {
        const history = await this.host.dataService.getHistory(envAttrs.vpd_sensor, start, end);
        console.log(
          '[HistoryController] VPD history fetched from',
          envAttrs.vpd_sensor,
          'length:',
          history?.length || 0
        );
        this.historyCache.vpd = history || [];
      } catch (e) {
        console.error('Failed to fetch VPD history', e);
      }
    }

    // CO2
    if (envAttrs.co2_sensor) {
      try {
        const history = await this.host.dataService.getHistory(envAttrs.co2_sensor, start, end);
        console.log(
          '[HistoryController] CO2 history fetched from',
          envAttrs.co2_sensor,
          'length:',
          history?.length || 0
        );
        this.historyCache.co2 = history || [];
      } catch (e) {
        console.error('Failed to fetch CO2 history', e);
      }
    }

    // Light
    if (envAttrs.light_sensor) {
      try {
        const history = await this.host.dataService.getHistory(envAttrs.light_sensor, start, end);
        console.log(
          '[HistoryController] Light history fetched from',
          envAttrs.light_sensor,
          'length:',
          history?.length || 0
        );
        this.historyCache.light = history || [];
      } catch (e) {
        console.error('Failed to fetch Light history', e);
      }
    }

    // Soil Moisture
    if (envAttrs.soil_moisture_sensor) {
      try {
        const history = await this.host.dataService.getHistory(
          envAttrs.soil_moisture_sensor,
          start,
          end
        );
        console.log(
          '[HistoryController] Soil Moisture history fetched from',
          envAttrs.soil_moisture_sensor,
          'length:',
          history?.length || 0
        );
        this.historyCache.soil_moisture = history || [];
      } catch (e) {
        console.error('Failed to fetch soil moisture history', e);
      }
    }

    // Fallback: If light history is missing but we have optimal history, try to derive it from 'is_lights_on' attribute
    const lightHistory = this.historyCache.light;
    const optimalHistory = this.historyCache.optimal;
    if (
      (!lightHistory || lightHistory.length === 0) &&
      optimalHistory &&
      optimalHistory.length > 0
    ) {
      console.log('[HistoryController] Synthesizing Light history from Optimal attributes');
      this.historyCache.light = optimalHistory.map((h) => ({
        ...h,
        entity_id: 'derived_light',
        state: h.attributes?.is_lights_on ? 'on' : 'off',
        attributes: {},
      }));
    }

    this.host.requestUpdate();
  }

  /**
   * Generic method to fetch history for any metric.
   * Uses METRIC_ENTITY_KEYS to resolve the entity ID from device attributes.
   */
  private async _fetchMetricHistory(metricKey: string, range: '1h' | '6h' | '24h' | '7d') {
    const device = this.host.devices.find((d) => d.device_id === this.host.selectedDevice);
    if (!device) return;

    const entityId = this.getEntityIdForMetric(device, metricKey);
    if (!entityId) {
      console.log(`[HistoryController] No entity ID found for metric: ${metricKey}`);
      return;
    }

    const { start, end } = this.calculateTimeRange(range);
    try {
      const history = await this.host.dataService.getHistory(entityId, start, end);
      console.log(
        `[HistoryController] ${metricKey} history fetched from ${entityId}, length: ${history?.length || 0}`
      );
      this.historyCache[metricKey] = history || [];
      this.host.requestUpdate();
    } catch (e) {
      console.error(`Failed to fetch ${metricKey} history`, e);
    }
  }

  /**
   * Resolves the entity ID for a given metric using METRIC_ENTITY_KEYS mapping.
   */
  public getEntityIdForMetric(device: GrowspaceDevice, metricKey: string): string | null {
    const mapping = METRIC_ENTITY_KEYS[metricKey];
    if (!mapping) return null;

    // Check based on source type
    if (mapping.source === 'irrigation') {
      const entityId =
        device.irrigation_config?.[mapping.primary as keyof typeof device.irrigation_config];
      if (entityId) return entityId as string;
      // Fallback: If not found in irrigation_config, continue to check environment_attributes/etc below
    }

    // Default: environment_attributes
    const envAttrs = device.environment_attributes || {};
    let entityId = envAttrs[mapping.primary as keyof typeof envAttrs] as string | undefined;

    // Try fallback if primary not found
    if (!entityId && mapping.fallback) {
      entityId = envAttrs[mapping.fallback as keyof typeof envAttrs] as string | undefined;
    }

    return entityId || null;
  }

  // Legacy method kept for compatibility - prefer getEntityIdForMetric instead
  private getRelatedEntityId(attribute: string) {
    if (!this.host.hass || !this.host.selectedDevice) return { device: null, entityId: null };
    const devices = this.host.devices;
    const device = devices.find((d) => d.device_id === this.host.selectedDevice);
    if (!device) return { device: null, entityId: null };

    let entityId =
      device.environment_attributes?.[attribute as keyof typeof device.environment_attributes];
    if (entityId) return { device, entityId };

    // Fallback logic
    if (attribute.endsWith('_entity')) {
      const sensorAttr = attribute.replace('_entity', '_sensor');
      entityId =
        device.environment_attributes?.[sensorAttr as keyof typeof device.environment_attributes];
    } else if (attribute.endsWith('_sensor')) {
      const entityAttr = attribute.replace('_sensor', '_entity');
      entityId =
        device.environment_attributes?.[entityAttr as keyof typeof device.environment_attributes];
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
