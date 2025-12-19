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
    if (this.historyCache.light && this.historyCache.light.length > 0) {
      return this.historyCache.light;
    }
    // Fallback: Synthesize from optimal history if available
    if (this.historyCache.optimal && this.historyCache.optimal.length > 0) {
      return this.historyCache.optimal.map((entry) => ({
        state: entry.attributes?.is_lights_on ? 'on' : 'off',
        last_changed: entry.last_changed,
        attributes: {},
      }));
    }
    return null;
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

  /** Returns all sensor histories as a combined object for analytics component */
  public get combinedHistory(): import('../types').SensorHistories {
    return {
      temperature: this.historyCache.temperature || [],
      humidity: this.historyCache.humidity || [],
      vpd: this.historyCache.vpd || [],
      co2: this.historyCache.co2 || [],
      dehumidifier: this.historyCache.dehumidifier || [],
      exhaust: this.historyCache.exhaust || [],
      humidifier: this.historyCache.humidifier || [],
      circulation_fan: this.historyCache.circulation_fan || [],
      soil_moisture: this.historyCache.soil_moisture || [],
      light: this.historyCache.light || [],
      irrigation: this.historyCache.irrigation || [],
      drain: this.historyCache.drain || [],
      optimal: this.historyCache.optimal || [],
    };
  }

  public activeEnvGraphs: Set<string> = new Set();
  public linkedGraphGroups: string[][] = [];
  public graphRanges: Record<string, '1h' | '6h' | '24h' | '7d'> = {};

  private _listeners: (() => void)[] = [];

  constructor(host: GrowspaceCardHost) {
    (this.host = host).addController(this);
  }

  public addListener(callback: () => void) {
    this._listeners.push(callback);
  }

  public removeListener(callback: () => void) {
    this._listeners = this._listeners.filter(l => l !== callback);
  }

  private _notifyUpdate() {
    this.host.requestUpdate();
    this._listeners.forEach(cb => cb());
  }

  private _refreshInterval: number | null = null;

  hostConnected() {
    this.startAutoRefresh();
  }

  hostDisconnected() {
    this.stopAutoRefresh();
  }

  startAutoRefresh() {
    if (this._refreshInterval) return;
    this._refreshInterval = window.setInterval(() => {
      this._fetchHistory(this.getRange());
    }, 5 * 60 * 1000); // 5 minutes
  }

  stopAutoRefresh() {
    if (this._refreshInterval) {
      window.clearInterval(this._refreshInterval);
      this._refreshInterval = null;
    }
  }

  hostUpdated() {
    // Rely on hostUpdate or manual calls
  }

  initFetch() {
    this._fetchHistory(this.getRange());
  }

  private _prevSelectedDevice: string | null = null;

  async hostUpdate() {
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
    this._notifyUpdate();

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
    this._notifyUpdate();
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

    // Fetch data for the linked metrics immediately
    const range = this.getRange();
    this._fetchMetricHistory(metric1, range);
    this._fetchMetricHistory(metric2, range);

    this._notifyUpdate();
  }

  unlinkGraphGroup(index: number) {
    if (index >= 0 && index < this.linkedGraphGroups.length) {
      const newGroups = [...this.linkedGraphGroups];
      newGroups.splice(index, 1);
      this.linkedGraphGroups = newGroups;
      this._notifyUpdate();
    }
  }

  clearAllLinks() {
    this.linkedGraphGroups = [];
    this._notifyUpdate();
  }

  unlinkGraphMetric(metric: string) {
    this.linkedGraphGroups = this.linkedGraphGroups
      .map((group) => group.filter((m) => m !== metric))
      .filter((group) => group.length > 1);
    this._notifyUpdate();
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
    if (!this.host.hass || !this.host.selectedDevice) return;

    const device = this.host.devices.find((d) => d.device_id === this.host.selectedDevice);
    if (!device) return;

    const { start, end } = this.calculateTimeRange(range);

    // 1. Fetch Main Sensor History (Temp, Humidity, VPD, etc.) via Overivew Entity
    // We still fetch this manually because it populates 'main' history which is a special aggregate
    if (device.overview_entity_id) {
      try {
        const history = await this.host.dataService.getHistory(
          device.overview_entity_id,
          start,
          end
        );
        this.historyData = history;
      } catch (e) {
        console.error('Failed to fetch main sensor history', e);
      }
    }

    // 2. Fetch all other metrics using the standard specialized method
    // This ensures hero graph metrics (which are just these keys) are populated
    const metricsToFetch = [
      'optimal',
      'temperature',
      'humidity',
      'vpd',
      'co2',
      'light',
      'soil_moisture',
      'exhaust',
      'humidifier',
      'dehumidifier',
      'circulation_fan',
      'irrigation',
      'drain'
    ];

    const chunkSize = 4;
    for (let i = 0; i < metricsToFetch.length; i += chunkSize) {
      const chunk = metricsToFetch.slice(i, i + chunkSize);
      await Promise.all(chunk.map((metric) => this._fetchMetricHistory(metric, range)));
      this.host.requestUpdate();
    }
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
    } catch (e) {
      console.error(`Failed to fetch ${metricKey} history`, e);
    }
  }

  /**
   * Resolves the entity ID for a given metric using METRIC_ENTITY_KEYS mapping.
   */
  public getEntityIdForMetric(device: GrowspaceDevice, metricKey: string): string | null {
    // Special handling for Optimal Conditions - checked FIRST because it has no entry in METRIC_ENTITY_KEYS
    if (metricKey === 'optimal') {
      let slug = device.name.toLowerCase().replace(/\s+/g, '_');
      if (device.overview_entity_id) {
        slug = device.overview_entity_id.replace('sensor.', '');
      }

      let optimalId = `binary_sensor.${slug}_optimal_conditions`;

      // Legacy hardcoded slugs
      if (slug === 'cure') optimalId = `binary_sensor.cure_optimal_curing`;
      else if (slug === 'dry') optimalId = `binary_sensor.dry_optimal_drying`;

      return optimalId;
    }

    const mapping = METRIC_ENTITY_KEYS[metricKey];
    if (!mapping) return null;

    // Check based on source type
    if (mapping.source === 'irrigation') {
      const config = device.irrigation_config;
      const key = mapping.primary as keyof typeof config;
      const entityId = config?.[key];

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

    // Special fallback for VPD calculated sensor
    if (!entityId && metricKey === 'vpd' && device.name) {
      const slugify = (text: string) =>
        text
          .toString()
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^\w\-]+/g, '')
          .replace(/\-\-+/g, '_')
          .replace(/^-+/, '')
          .replace(/-+$/, '');

      const calcName = `${device.name} Calculated VPD`;
      const calculatedId = `sensor.${slugify(calcName)}`;

      if (this.host.hass && this.host.hass.states[calculatedId]) {
        entityId = calculatedId;
        console.log('[HistoryController] Using calculated VPD sensor fallback in getEntityIdForMetric:', entityId);
      }
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
