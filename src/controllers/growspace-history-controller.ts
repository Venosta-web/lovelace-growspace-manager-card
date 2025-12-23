import { ReactiveController, ReactiveControllerHost } from 'lit';
import { HomeAssistant } from 'custom-card-helpers';
import { DataService } from '../data-service';
import { GrowspaceDevice, HistorySensorState } from '../types';
import { METRIC_ENTITY_KEYS } from '../constants';
import * as historyStore from '../store/history-store';

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
   * History cache is now managed by historyStore.
   * This getter provides backward-compatible access.
   */
  public get historyCache(): Record<string, HistorySensorState[]> {
    return historyStore.$historyCache.get();
  }

  /**
   * Timestamps are now managed by historyStore.
   * This getter provides backward-compatible access.
   */
  private get _lastTimestamps(): Record<string, string> {
    return historyStore.$lastTimestamps.get();
  }

  /**
   * Lazy loading flags
   */
  public get isHistoryLoaded(): boolean {
    return historyStore.$historyLoaded.get();
  }

  public get isHistoryLoading(): boolean {
    return historyStore.$historyLoading.get();
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
    return historyStore.$combinedHistory.get();
  }

  public get activeEnvGraphs(): Set<string> {
    return historyStore.$activeEnvGraphs.get();
  }

  public get linkedGraphGroups(): string[][] {
    return historyStore.$linkedGraphGroups.get();
  }

  public get graphRanges(): Record<string, '1h' | '6h' | '24h' | '7d'> {
    return historyStore.$graphRanges.get();
  }



  // Storage constants
  private readonly STORAGE_KEY_PREFIX = 'growspace_history_';
  private readonly CACHE_VALIDITY_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(host: GrowspaceCardHost) {
    (this.host = host).addController(this);
  }



  private _refreshInterval: number | null = null;

  hostConnected() {
    // OPTIMIZATION: Don't auto-fetch history on connect
    // History will be loaded on-demand when analytics component renders

    // Try to load from storage immediately to show cached data
    if (this.host.selectedDevice) {
      this._loadFromStorage(this.host.selectedDevice);
    }

    this.startAutoRefresh();
  }

  hostDisconnected() {
    this.stopAutoRefresh();
  }

  startAutoRefresh() {
    if (this._refreshInterval) return;
    this._refreshInterval = window.setInterval(() => {
      // Use delta loading for refresh - only fetch new data since last update
      this._fetchHistoryDelta();
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

  /**
   * Load history data on-demand.
   * Called by components when they need history data (e.g., analytics component on first render)
   */
  async loadHistoryOnDemand(): Promise<void> {
    if (this.isHistoryLoaded || this.isHistoryLoading) {
      return;
    }

    historyStore.setHistoryLoading(true);
    this.host.requestUpdate();

    try {
      await this._fetchHistory(this.getRange());
      historyStore.setHistoryLoaded(true);
      console.log('[HistoryController] History loaded successfully');
    } catch (error) {
      console.error('[HistoryController] Failed to load history', error);
    } finally {
      historyStore.setHistoryLoading(false);
      this.host.requestUpdate();
    }
  }

  private _prevSelectedDevice: string | null = null;

  async hostUpdate() {
    if (this.host.selectedDevice !== this._prevSelectedDevice) {
      this._prevSelectedDevice = this.host.selectedDevice;
      // Reset loading flags and clear cached data for new device
      historyStore.clearHistoryCache();

      // Try to load cached data for the new device
      if (this.host.selectedDevice) {
        this._loadFromStorage(this.host.selectedDevice);
      }

      // Notify listeners that device changed (analytics will trigger lazy load if visible)

    }
  }

  /**
   * Loads history data from localStorage.
   * Returns true if valid data was found and loaded.
   */
  private _loadFromStorage(deviceId: string): boolean {
    try {
      const key = this.STORAGE_KEY_PREFIX + deviceId;
      const raw = localStorage.getItem(key);
      if (!raw) return false;

      const data = JSON.parse(raw);

      // Validation
      if (!data || !data.version || !data.timestamp || !data.history) {
        return false;
      }

      // Check expiry
      const age = Date.now() - data.timestamp;
      if (age > this.CACHE_VALIDITY_MS) {
        console.log('[HistoryController] Storage cache expired');
        localStorage.removeItem(key);
        return false;
      }

      historyStore.setHistoryBatch(data.history);
      // Update timestamps via the store
      const timestamps = data.timestamps || {};
      Object.keys(timestamps).forEach(metric => {
        historyStore.$lastTimestamps.setKey(metric, timestamps[metric]);
      });

      // Consider history "loaded" if we have data, but still might want to fetch fresh data
      if (Object.keys(data.history).length > 0) {
        historyStore.setHistoryLoaded(true);
      }

      console.log(`[HistoryController] Loaded ${Object.keys(this.historyCache).length} metrics from storage`);

      return true;
    } catch (e) {
      console.error('[HistoryController] Failed to load from storage', e);
      return false;
    }
  }

  /**
   * Saves current history cache to localStorage.
   */
  private _saveToStorage() {
    if (!this.host.selectedDevice) return;

    try {
      const key = this.STORAGE_KEY_PREFIX + this.host.selectedDevice;
      const data = {
        version: 1,
        timestamp: Date.now(),
        history: this.historyCache,
        timestamps: this._lastTimestamps
      };

      localStorage.setItem(key, JSON.stringify(data));

    } catch (e) {
      console.error('[HistoryController] Failed to save to storage', e);
    }
  }

  getRange(): '1h' | '6h' | '24h' | '7d' {
    return this.host.selectedDevice ? this.graphRanges[this.host.selectedDevice] || '24h' : '24h';
  }

  setGraphRange(range: '1h' | '6h' | '24h' | '7d') {
    if (!this.host.selectedDevice) return;

    historyStore.setGraphRange(this.host.selectedDevice, range);


    this._fetchHistory(range);
    this.refreshSecondaryHistories(range);
  }

  toggleEnvGraph(details: { metric: string; visible: boolean }) {
    const { metric } = details;
    const isNowActive = historyStore.toggleEnvGraph(metric);
    if (isNowActive) {
      // Fetch history for this metric using generic method
      const range = this.getRange();
      this._fetchMetricHistory(metric, range);
    }

  }

  linkGraphs(metric1: string, metric2: string) {
    historyStore.linkGraphs(metric1, metric2);

    // Fetch data for the linked metrics immediately
    const range = this.getRange();
    this._fetchMetricHistory(metric1, range);
    this._fetchMetricHistory(metric2, range);


  }

  unlinkGraphGroup(index: number) {
    historyStore.unlinkGraphGroup(index);

  }

  clearAllLinks() {
    historyStore.clearAllLinks();

  }

  unlinkGraphMetric(metric: string) {
    historyStore.unlinkGraphMetric(metric);

  }

  /**
   * Refreshes history data for all currently active environment graphs.
   * OPTIMIZED: Batches all secondary metrics into a single request.
   */
  private async refreshSecondaryHistories(range: '1h' | '6h' | '24h' | '7d') {
    const device = this.host.devices.find((d) => d.device_id === this.host.selectedDevice);
    if (!device) return;

    const metricsToFetch: string[] = [];
    const entityMap: Record<string, string> = {};

    for (const metricKey of Array.from(this.activeEnvGraphs)) {
      // Skip 'main' and 'optimal' as those are fetched by _fetchHistory
      if (metricKey === 'main' || metricKey === 'optimal') continue;

      const entityId = this.getEntityIdForMetric(device, metricKey);
      if (entityId) {
        metricsToFetch.push(metricKey);
        entityMap[metricKey] = entityId;
      }
    }

    if (metricsToFetch.length === 0) return;

    // OPTIMIZATION: Batch all secondary metrics into ONE request
    const { start, end } = this.calculateTimeRange(range);
    const entityIds = Object.values(entityMap);

    try {
      const batchResults = await this.host.dataService.getHistoryStats(
        entityIds,
        start,
        end,
        this._getIntervalForRange(range),
        true
      );

      // Distribute results
      for (const metricKey of metricsToFetch) {
        const entityId = entityMap[metricKey];
        if (entityId && batchResults[entityId]) {
          historyStore.setHistoryData(metricKey, batchResults[entityId]);
          console.log(
            `[HistoryController] ${metricKey} history fetched via batch, length: ${batchResults[entityId].length}`
          );
        }
      }

      this._saveToStorage();
      this.host.requestUpdate();
    } catch (e) {
      console.error('[HistoryController] Failed to batch fetch secondary histories', e);
    }
  }

  /**
   * Fetches delta (new data since last update) for all metrics.
   * Used by auto-refresh to minimize data transfer.
   * Falls back to full fetch if no timestamps exist (fresh load).
   */
  private async _fetchHistoryDelta() {
    if (!this.host.hass || !this.host.selectedDevice) return;

    const device = this.host.devices.find((d) => d.device_id === this.host.selectedDevice);
    if (!device) return;

    // Check if we have any timestamps - if not, do a full fetch instead
    const hasAnyTimestamps = Object.keys(this._lastTimestamps).length > 0;
    if (!hasAnyTimestamps) {
      console.log('[HistoryController] No timestamps found, falling back to full fetch');
      await this._fetchHistory(this.getRange());
      return;
    }

    const now = new Date();
    const metricsToFetch = [
      'main', 'optimal', 'temperature', 'humidity', 'vpd', 'co2', 'light',
      'soil_moisture', 'exhaust', 'humidifier', 'dehumidifier',
      'circulation_fan', 'irrigation', 'drain'
    ];

    const entityMap: Record<string, string> = {};
    const entitiesToFetch = new Set<string>();

    // Identify entities and their last timestamps
    if (device.overview_entity_id) {
      const lastTimestamp = this._lastTimestamps['main'];
      if (lastTimestamp) {
        entityMap['main'] = device.overview_entity_id;
        entitiesToFetch.add(device.overview_entity_id);
      }
    }

    for (const metric of metricsToFetch) {
      if (metric === 'main') continue; // Already handled
      const entityId = this.getEntityIdForMetric(device, metric);
      const lastTimestamp = this._lastTimestamps[metric];
      if (entityId && lastTimestamp) {
        entityMap[metric] = entityId;
        entitiesToFetch.add(entityId);
      }
    }

    if (entitiesToFetch.size === 0) {
      console.log('[HistoryController] No entities to delta fetch, skipping');
      return;
    }

    try {
      // Fetch only new data since the oldest last timestamp
      const oldestTimestamp = Math.min(
        ...Object.values(this._lastTimestamps)
          .filter(t => t)
          .map(t => new Date(t).getTime())
      );
      const start = new Date(oldestTimestamp);

      const batchResults = await this.host.dataService.getHistoryStats(
        Array.from(entitiesToFetch),
        start,
        now,
        5, // Small interval for delta
        true
      );

      // Merge delta with cached data
      for (const [metric, entityId] of Object.entries(entityMap)) {
        const deltaData = batchResults[entityId] || [];
        if (deltaData.length > 0) {
          this._mergeDeltaData(metric, deltaData);
        }
      }

      this._saveToStorage();
      this.host.requestUpdate();
    } catch (e) {
      console.error('[HistoryController] Failed to fetch delta history', e);
    }
  }

  /**
   * Merges new delta data with existing cached data.
   * Removes duplicates and maintains chronological order.
   */
  private _mergeDeltaData(metric: string, deltaData: HistorySensorState[]) {
    const existing = this.historyCache[metric] || [];
    if (existing.length === 0) {
      historyStore.setHistoryData(metric, deltaData);
      historyStore.updateLastTimestamp(metric, deltaData);
      return;
    }

    // Find the last timestamp in existing data
    const lastExisting = existing[existing.length - 1];
    const lastTimestamp = new Date((lastExisting as any).last_updated || (lastExisting as any).last_changed).getTime();

    // Filter delta to only include newer data
    const newData = deltaData.filter(point => {
      const pointTime = new Date((point as any).last_updated || (point as any).last_changed).getTime();
      return pointTime > lastTimestamp;
    });

    if (newData.length > 0) {
      historyStore.setHistoryData(metric, [...existing, ...newData]);
      historyStore.updateLastTimestamp(metric, newData);
      console.log(`[HistoryController] Merged ${newData.length} new points for ${metric}`);
    }
  }

  /**
   * Updates the last known timestamp for a metric.
   */
  private _updateLastTimestamp(metric: string, data: HistorySensorState[]) {
    historyStore.updateLastTimestamp(metric, data);
  }

  private async _fetchHistory(range: '1h' | '6h' | '24h' | '7d' = '24h') {
    if (!this.host.hass || !this.host.selectedDevice) return;

    const device = this.host.devices.find((d) => d.device_id === this.host.selectedDevice);
    if (!device) return;

    const { start, end } = this.calculateTimeRange(range);
    console.log(`[HistoryController._fetchHistory] range=${range}, start=${start.toISOString()}, end=${end.toISOString()}, duration=${(end.getTime() - start.getTime()) / 1000}s`);

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

    const entityMap: Record<string, string> = {};
    const entitiesToFetch = new Set<string>();

    // 1. Identify Overview Entity
    if (device.overview_entity_id) {
      entitiesToFetch.add(device.overview_entity_id);
    }

    // 2. Identify Metric Entities
    for (const metric of metricsToFetch) {
      const entityId = this.getEntityIdForMetric(device, metric);
      if (entityId) {
        entityMap[metric] = entityId;
        entitiesToFetch.add(entityId);
      }
    }

    if (entitiesToFetch.size === 0) return;

    try {
      // 3. Batch Fetch via optimized WebSocket endpoint
      const batchResults = await this.host.dataService.getHistoryStats(
        Array.from(entitiesToFetch),
        start,
        end,
        this._getIntervalForRange(range),
        true // significant_changes_only
      );

      // 4. Distribute Results and Update Timestamps
      // Main
      if (device.overview_entity_id && batchResults[device.overview_entity_id]) {
        const data = batchResults[device.overview_entity_id];
        historyStore.setHistoryData('main', data);
        this._updateLastTimestamp('main', data);
      }

      // Metrics
      for (const metric of metricsToFetch) {
        const entityId = entityMap[metric];
        if (entityId) {
          const result = batchResults[entityId] || [];
          historyStore.setHistoryData(metric, result);
          this._updateLastTimestamp(metric, result);
          if (result.length > 0) {
            console.log(
              `[HistoryController] ${metric} history fetched via batch, length: ${result.length}`
            );
          }
        }
      }

      this._saveToStorage();
      this.host.requestUpdate();

    } catch (e) {
      console.error('Failed to fetch batch history', e);
    }
  }

  /**
   * Generic method to fetch history for any metric.
   * OPTIMIZED: Uses batched getHistoryStats instead of individual getHistory.
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
    console.log(`[HistoryController._fetchMetricHistory] metric=${metricKey}, range=${range}, start=${start.toISOString()}, end=${end.toISOString()}, duration=${(end.getTime() - start.getTime()) / 1000}s, entityId=${entityId}`);
    try {
      // OPTIMIZATION: Use batched getHistoryStats instead of individual getHistory
      const batchResults = await this.host.dataService.getHistoryStats(
        [entityId],
        start,
        end,
        this._getIntervalForRange(range),
        true
      );

      const history = batchResults[entityId] || [];
      console.log(
        `[HistoryController] ${metricKey} history fetched from ${entityId}, length: ${history.length}`
      );
      historyStore.setHistoryData(metricKey, history);
      this._saveToStorage();
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

  /**
   * Helper to calculate interval minutes based on time range for downsampling.
   */
  private _getIntervalForRange(range: '1h' | '6h' | '24h' | '7d'): number {
    switch (range) {
      case '7d':
        return 240; // 4 hours
      case '24h':
        return 30;
      case '6h':
        return 15;
      case '1h':
        return 5;
      default:
        return 15;
    }
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

