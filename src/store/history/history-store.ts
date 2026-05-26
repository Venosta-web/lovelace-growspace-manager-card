import { atom, map, computed, WritableAtom, MapStore, ReadableAtom } from 'nanostores';
import {
  HistorySensorState,
  SensorHistories,
  HistoryTimeRange,
  GrowspaceDevice,
} from '../../types';
import { METRIC_ENTITY_KEYS, STORAGE_KEYS } from '../../constants';
import { DataService } from '../../services/data-service';
import { GrowspaceDataStore } from '../core/data-store';

export class GrowspaceHistoryStore {
  // --- Core History Cache ---
  public readonly $historyCache: MapStore<Record<string, HistorySensorState[]>>;
  public readonly $lastTimestamps: MapStore<Record<string, string>>;

  // --- Loading/Error State ---
  public readonly $historyLoading: WritableAtom<boolean>;
  public readonly $historyLoaded: WritableAtom<boolean>;
  public readonly $historyError: WritableAtom<string | null>;

  // --- Time Range Selection ---
  public readonly $graphRanges: MapStore<Record<string, HistoryTimeRange>>;

  // --- Graph Configuration ---
  public readonly $activeEnvGraphs: WritableAtom<Set<string>>;
  public readonly $linkedGraphGroups: WritableAtom<string[][]>;

  // --- Dependencies ---
  private dataService: DataService;
  private dataStore: GrowspaceDataStore;
  private _selectedDevice: ReadableAtom<string | null>;

  // --- Internals ---
  private readonly STORAGE_KEY_PREFIX = STORAGE_KEYS.HISTORY_PREFIX;
  private readonly CACHE_VALIDITY_MS = 24 * 60 * 60 * 1000;
  private _refreshInterval: number | null = null;
  private _selectedDeviceUnsub: (() => void) | null = null;
  private _visibilityHandler: (() => void) | null = null;

  // --- Computed Stores ---
  public readonly $combinedHistory: ReadableAtom<SensorHistories>;

  /**
   * Single combined atom for all header-relevant history state. Replaces four
   * separate StoreController subscriptions in GrowspaceHeader.
   */
  public readonly $headerHistoryState: ReadableAtom<{
    historyCache: Record<string, HistorySensorState[]>;
    historyLoading: boolean;
    activeEnvGraphs: Set<string>;
    linkedGraphGroups: string[][];
  }>;

  /**
   * Single combined atom for all analytics-relevant history state. Replaces
   * seven separate StoreController subscriptions in GrowspaceAnalytics.
   * Does not include $historyCache — $combinedHistory already derives from it.
   */
  public readonly $analyticsViewState: ReadableAtom<{
    historyLoading: boolean;
    historyLoaded: boolean;
    activeEnvGraphs: Set<string>;
    linkedGraphGroups: string[][];
    combinedHistory: SensorHistories;
    graphRanges: Record<string, HistoryTimeRange>;
  }>;

  constructor(
    dataService: DataService,
    dataStore: GrowspaceDataStore,
    selectedDevice: ReadableAtom<string | null>
  ) {
    this.dataService = dataService;
    this.dataStore = dataStore;
    this._selectedDevice = selectedDevice;

    this.$historyCache = map<Record<string, HistorySensorState[]>>({});
    this.$lastTimestamps = map<Record<string, string>>({});
    this.$historyLoading = atom<boolean>(false);
    this.$historyLoaded = atom<boolean>(false);
    this.$historyError = atom<string | null>(null);
    this.$graphRanges = map<Record<string, HistoryTimeRange>>({});
    this.$activeEnvGraphs = atom<Set<string>>(new Set());
    this.$linkedGraphGroups = atom<string[][]>([]);

    // Subscribe to device changes to handle cache and storage
    this._selectedDeviceUnsub = this._selectedDevice.subscribe((deviceId) => {
      if (deviceId) {
        this.handleDeviceChange(deviceId);
      }
    });

    this.$headerHistoryState = computed(
      [this.$historyCache, this.$historyLoading, this.$activeEnvGraphs, this.$linkedGraphGroups],
      (historyCache, historyLoading, activeEnvGraphs, linkedGraphGroups) => ({
        historyCache,
        historyLoading,
        activeEnvGraphs,
        linkedGraphGroups,
      })
    );

    this.$combinedHistory = computed(this.$historyCache, (cache): SensorHistories => {
      const result: SensorHistories = { ...cache };
      const commonMetrics = [
        'temperature',
        'humidity',
        'vpd',
        'co2',
        'soil_moisture',
        'light',
        'optimal',
      ];
      commonMetrics.forEach((m) => {
        if (!result[m]) result[m] = [];
      });
      return result;
    });

    this.$analyticsViewState = computed(
      [
        this.$historyLoading,
        this.$historyLoaded,
        this.$activeEnvGraphs,
        this.$linkedGraphGroups,
        this.$combinedHistory,
        this.$graphRanges,
      ],
      (
        historyLoading,
        historyLoaded,
        activeEnvGraphs,
        linkedGraphGroups,
        combinedHistory,
        graphRanges
      ) => ({
        historyLoading,
        historyLoaded,
        activeEnvGraphs,
        linkedGraphGroups,
        combinedHistory,
        graphRanges,
      })
    );
  }

  // --- Actions ---

  public setHistoryData(metric: string, data: HistorySensorState[]): void {
    const current = this.$historyCache.get();
    this.$historyCache.set({ ...current, [metric]: data });
  }

  public setHistoryBatch(updates: Record<string, HistorySensorState[]>): void {
    const current = this.$historyCache.get();
    this.$historyCache.set({ ...current, ...updates });
  }

  public updateLastTimestamp(metric: string, data: HistorySensorState[]): void {
    if (data.length === 0) return;
    const lastPoint = data[data.length - 1];
    const timestamp = lastPoint.last_updated || lastPoint.last_changed;
    if (timestamp) {
      this.$lastTimestamps.setKey(metric, timestamp);
    }
  }

  public clearHistoryCache(): void {
    this.$historyCache.set({});
    this.$lastTimestamps.set({});
    this.$historyLoaded.set(false);
    this.$historyError.set(null);
  }

  public setHistoryLoading(loading: boolean): void {
    this.$historyLoading.set(loading);
  }

  public setHistoryLoaded(loaded: boolean): void {
    this.$historyLoaded.set(loaded);
  }

  public setGraphRange(deviceId: string, range: HistoryTimeRange): void {
    this.$graphRanges.setKey(deviceId, range);
    this.setHistoryLoaded(false);
  }

  public getGraphRange(deviceId: string | null): HistoryTimeRange {
    if (!deviceId) return '24h';
    return this.$graphRanges.get()[deviceId] || '24h';
  }

  public toggleEnvGraph(metric: string): boolean {
    const current = this.$activeEnvGraphs.get();
    const newSet = new Set(current);

    if (newSet.has(metric)) {
      newSet.delete(metric);
      this.$activeEnvGraphs.set(newSet);
      return false;
    } else {
      newSet.add(metric);
      this.$activeEnvGraphs.set(newSet);
      return true;
    }
  }

  public linkGraphs(metric1: string, metric2: string): void {
    const groups = this.$linkedGraphGroups.get();
    const existingGroupIndex = groups.findIndex(
      (group) => group.includes(metric1) || group.includes(metric2)
    );

    const newGroups = [...groups];

    if (existingGroupIndex >= 0) {
      const group = new Set(newGroups[existingGroupIndex]);
      group.add(metric1);
      group.add(metric2);
      newGroups[existingGroupIndex] = Array.from(group);
    } else {
      newGroups.push([metric1, metric2]);
    }

    this.$linkedGraphGroups.set(newGroups);

    const newActive = new Set(this.$activeEnvGraphs.get());
    newActive.add(metric1);
    newActive.add(metric2);
    this.$activeEnvGraphs.set(newActive);
  }

  public unlinkGraphGroup(index: number): void {
    const groups = this.$linkedGraphGroups.get();
    if (index >= 0 && index < groups.length) {
      const newGroups = [...groups];
      newGroups.splice(index, 1);
      this.$linkedGraphGroups.set(newGroups);
    }
  }

  public unlinkGraphMetric(metric: string): void {
    const groups = this.$linkedGraphGroups.get();
    const newGroups = groups
      .map((group) => group.filter((m) => m !== metric))
      .filter((group) => group.length > 1);
    this.$linkedGraphGroups.set(newGroups);
  }

  public clearAllLinks(): void {
    this.$linkedGraphGroups.set([]);
  }

  public getHistoryForMetric(metric: string): HistorySensorState[] | null {
    return this.$historyCache.get()[metric] || null;
  }

  // --- Fetching & Logic (Migrated from Controller) ---

  private handleDeviceChange(deviceId: string) {
    // Clear runtime cache
    this.clearHistoryCache();
    // Try load from storage
    this._loadFromStorage(deviceId);
  }

  public async loadHistoryOnDemand(): Promise<void> {
    if (this.$historyLoading.get() || this.$historyLoaded.get()) {
      return;
    }

    this.setHistoryLoading(true);

    try {
      await this._fetchHistory(this.getRange());
      this.setHistoryLoaded(true);
      console.log('[HistoryStore] History loaded successfully');
    } catch (error: unknown) {
      const e = error instanceof Error ? error.message : undefined;
      console.error('[HistoryStore] Failed to load history', error);
      this.$historyError.set(e || 'Failed to load history');
    } finally {
      this.setHistoryLoading(false);
    }
  }

  public startAutoRefresh() {
    if (this._refreshInterval) return;
    this._refreshInterval = window.setInterval(
      () => {
        this._fetchHistoryDelta();
      },
      5 * 60 * 1000
    ); // 5 minutes

    // Refresh when tab becomes visible again (browsers throttle setInterval when hidden)
    this._visibilityHandler = () => {
      if (!document.hidden) {
        this._fetchHistoryDelta();
      }
    };
    document.addEventListener('visibilitychange', this._visibilityHandler);
  }

  public stopAutoRefresh() {
    if (this._refreshInterval) {
      window.clearInterval(this._refreshInterval);
      this._refreshInterval = null;
    }
    if (this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      this._visibilityHandler = null;
    }
  }

  public destroy() {
    this.stopAutoRefresh();
    if (this._selectedDeviceUnsub) {
      this._selectedDeviceUnsub();
      this._selectedDeviceUnsub = null;
    }
  }

  public getRange(): HistoryTimeRange {
    const deviceId = this._selectedDevice.get();
    return this.getGraphRange(deviceId);
  }

  private async _fetchHistory(range: HistoryTimeRange = '24h') {
    const deviceId = this._selectedDevice.get();
    if (!deviceId) return;

    const devices = this.dataStore.$devices.get();
    const device = devices.find((d) => d.deviceId === deviceId);
    if (!device) return;

    const { start, end } = this.calculateTimeRange(range);

    const metricsToFetch = [
      'optimal',
      'temperature',
      'humidity',
      'vpd',
      'co2',
      'light',
      'irrigation_tank_level',
      'soil_moisture',
      'exhaust',
      'humidifier',
      'dehumidifier',
      'circulation_fan',
      'irrigation',
      'drain',
    ];

    const entityMap: Record<string, string> = {};
    const entitiesToFetch = new Set<string>();

    // 1. Identify Overview Entity
    if (device.overviewEntityId) {
      entitiesToFetch.add(device.overviewEntityId);
      // Map main overview entity to 'main' for timestamp tracking if needed,
      // but usually main data is split into metrics.
      // The controller logic mapped overview_entity_id to 'main' in some places,
      // let's follow that pattern if consistent.
    }

    // 2. Identify Metric Entities
    for (const metric of metricsToFetch) {
      const entityIds = this.getEntityIdsForMetric(device, metric);
      entityIds.forEach((entityId) => {
        const key = entityIds.length > 1 ? `${metric}:${entityId}` : metric;
        entityMap[key] = entityId;
        entitiesToFetch.add(entityId);
      });
    }

    // 3. Identify Composite Keys (Multi-Device Graphs)
    const activeGraphs = this.$activeEnvGraphs.get();
    activeGraphs.forEach((key) => {
      if (key.includes(':')) {
        const [metric, entityId] = key.split(':');
        if (metric && entityId) {
          entityMap[key] = entityId;
          entitiesToFetch.add(entityId);
        }
      }
    });

    if (entitiesToFetch.size === 0) return;

    const batchResults = await this.dataService.getHistoryStats(
      Array.from(entitiesToFetch),
      start,
      end,
      this._getIntervalForRange(range),
      true
    );

    if (!batchResults) return;

    // Overview/Main

    // Metrics
    const formattedUpdates: Record<string, HistorySensorState[]> = {};

    for (const metric of metricsToFetch) {
      const entityIds = this.getEntityIdsForMetric(device, metric);
      entityIds.forEach((entityId) => {
        const key = entityIds.length > 1 ? `${metric}:${entityId}` : metric;
        const result = batchResults[entityId] || [];
        formattedUpdates[key] = result;
        this.updateLastTimestamp(key, result);
      });
    }

    this.setHistoryBatch(formattedUpdates);
    this._saveToStorage();
  }

  private async _fetchHistoryDelta() {
    const deviceId = this._selectedDevice.get();
    if (!deviceId) return;

    const devices = this.dataStore.$devices.get();
    const device = devices.find((d) => d.deviceId === deviceId);
    if (!device) return;

    const currentTimestamps = this.$lastTimestamps.get();
    const hasAnyTimestamps = Object.keys(currentTimestamps).length > 0;

    if (!hasAnyTimestamps) {
      await this._fetchHistory(this.getRange());
      return;
    }

    const now = new Date();
    const metricsToFetch = [
      'optimal',
      'temperature',
      'humidity',
      'vpd',
      'co2',
      'light',
      'irrigation_tank_level',
      'soil_moisture',
      'exhaust',
      'humidifier',
      'dehumidifier',
      'circulation_fan',
      'irrigation',
      'drain',
    ];

    const entityMap: Record<string, string> = {};
    const entitiesToFetch = new Set<string>();

    // Overview
    if (device.overviewEntityId) {
      // Logic for overview delta if needed
    }

    for (const metric of metricsToFetch) {
      const entityIds = this.getEntityIdsForMetric(device, metric);
      entityIds.forEach((entityId) => {
        const key = entityIds.length > 1 ? `${metric}:${entityId}` : metric;
        const lastTimestamp = currentTimestamps[key];
        if (lastTimestamp) {
          entityMap[key] = entityId;
          entitiesToFetch.add(entityId);
        }
      });
    }

    // Composite Keys Delta
    const activeGraphs = this.$activeEnvGraphs.get();
    activeGraphs.forEach((key) => {
      if (key.includes(':')) {
        const [metric, entityId] = key.split(':');
        const lastTimestamp = currentTimestamps[key];
        if (metric && entityId && lastTimestamp) {
          entityMap[key] = entityId;
          entitiesToFetch.add(entityId);
        }
      }
    });

    if (entitiesToFetch.size === 0) return;

    try {
      const oldestTimestamp = Math.min(
        ...Object.values(currentTimestamps)
          .filter((t) => t)
          .map((t) => new Date(t).getTime())
      );
      const start = new Date(oldestTimestamp);

      const batchResults = await this.dataService.getHistoryStats(
        Array.from(entitiesToFetch),
        start,
        now,
        5, // Small interval
        true
      );

      if (!batchResults) return;

      for (const [key, entityId] of Object.entries(entityMap)) {
        const deltaData = batchResults[entityId] || [];
        if (deltaData.length > 0) {
          this._mergeDeltaData(key, deltaData);
        }
      }

      this._saveToStorage();
    } catch (e) {
      console.error('[HistoryStore] Failed to fetch delta history', e);
    }
  }

  private _mergeDeltaData(metric: string, deltaData: HistorySensorState[]) {
    const currentCache = this.$historyCache.get();
    const existing = currentCache[metric] || [];

    if (existing.length === 0) {
      this.setHistoryData(metric, deltaData);
      this.updateLastTimestamp(metric, deltaData);
      return;
    }

    const lastExisting = existing[existing.length - 1];
    const lastTimestamp = new Date(
      lastExisting.last_updated || lastExisting.last_changed
    ).getTime();

    const newData = deltaData.filter((point) => {
      const pointTime = new Date(point.last_updated || point.last_changed).getTime();
      return pointTime > lastTimestamp;
    });

    if (newData.length > 0) {
      this.setHistoryData(metric, [...existing, ...newData]);
      this.updateLastTimestamp(metric, newData);
    }
  }

  private _loadFromStorage(deviceId: string): boolean {
    try {
      const key = this.STORAGE_KEY_PREFIX + deviceId;
      const raw = localStorage.getItem(key);
      if (!raw) return false;

      const data = JSON.parse(raw);
      if (!data || !data.version || !data.timestamp || !data.history) return false;

      const age = Date.now() - data.timestamp;
      if (age > this.CACHE_VALIDITY_MS) {
        localStorage.removeItem(key);
        return false;
      }

      this.setHistoryBatch(data.history);

      // Restore timestamps
      const timestamps = data.timestamps || {};
      this.$lastTimestamps.set(timestamps);

      // Don't mark as fully loaded — localStorage data serves as an
      // immediate preview while loadHistoryOnDemand() fetches fresh data.
      // Previously this set historyLoaded=true, which prevented fresh
      // fetches and left graphs showing stale cached data for hours.
      return true;
    } catch (e) {
      console.error('[HistoryStore] Failed to load from storage', e);
      return false;
    }
  }

  private _saveToStorage() {
    const deviceId = this._selectedDevice.get();
    if (!deviceId) return;

    try {
      const key = this.STORAGE_KEY_PREFIX + deviceId;
      const data = {
        version: 1,
        timestamp: Date.now(),
        history: this.$historyCache.get(),
        timestamps: this.$lastTimestamps.get(),
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('[HistoryStore] Failed to save to storage', e);
    }
  }

  // --- Utils ---

  private getEntityIdsForMetric(device: GrowspaceDevice, metricKey: string): string[] {
    const ids: string[] = [];

    if (metricKey === 'optimal') {
      let slug = device.name.toLowerCase().replace(/\s+/g, '_');
      const overviewId =
        device.overviewEntityId ||
        ((device as unknown as Record<string, unknown>).overview_entity_id as string);

      if (overviewId) {
        slug = overviewId.replace('sensor.', '').replace(/_overview$/, '');
      }
      let optimalId = `binary_sensor.${slug}_optimal_conditions`;
      if (slug === 'cure') optimalId = `binary_sensor.cure_optimal_curing`;
      else if (slug === 'dry') optimalId = `binary_sensor.dry_optimal_drying`;

      ids.push(optimalId);
      return ids;
    }

    const mapping = METRIC_ENTITY_KEYS[metricKey];
    if (!mapping) return ids;

    const envAttrs = (device.environmentAttributes ||
      (device as unknown as Record<string, unknown>).environment_attributes ||
      {}) as Record<string, unknown>;

    // 1. Try plural keys first
    const pluralKey = mapping.primary.endsWith('Sensor')
      ? mapping.primary.replace('Sensor', 'Sensors')
      : `${mapping.primary}s`;

    let pluralIds = envAttrs[pluralKey] as string[] | undefined;
    if (!pluralIds && /[A-Z]/.test(pluralKey)) {
      const snakePlural = pluralKey.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      pluralIds = envAttrs[snakePlural] as string[] | undefined;
    }

    if (pluralIds && Array.isArray(pluralIds) && pluralIds.length > 0) {
      return pluralIds;
    }

    // 2. Fallback to single primary/fallback
    if (mapping.source === 'irrigation') {
      const config = (device.irrigationConfig ||
        (device as unknown as Record<string, unknown>).irrigation_config) as unknown as Record<
        string,
        unknown
      >;
      if (!config) return ids;

      let entityId = config[mapping.primary];
      if (!entityId && /[A-Z]/.test(mapping.primary)) {
        const snakeKey = mapping.primary.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        entityId = config[snakeKey];
      }
      if (typeof entityId === 'string') ids.push(entityId);
    } else {
      let entityId = envAttrs[mapping.primary] as string | undefined;
      if (!entityId && mapping.fallback) {
        entityId = envAttrs[mapping.fallback] as string | undefined;
      }
      if (!entityId && /[A-Z]/.test(mapping.primary)) {
        const snakeKey = mapping.primary.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        entityId = envAttrs[snakeKey] as string | undefined;
      }

      // Special fallback for VPD calculated sensor
      if (!entityId && metricKey === 'vpd' && device.name) {
        const slugify = (text: string) =>
          text
            .toString()
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^\w-]+/g, '')
            .replace(/--+/g, '_')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
        const calcName = `${device.name} Calculated VPD`;
        const calculatedId = `sensor.${slugify(calcName)}`;
        if (this.dataService.hass && this.dataService.hass.states[calculatedId]) {
          entityId = calculatedId;
        }
      }
      if (entityId) ids.push(entityId);
    }

    // Special case for irrigation_tank_level - extract sensor entities from tanks array
    if (metricKey === 'irrigation_tank_level') {
      const tanks =
        (envAttrs['irrigationTanks'] as unknown as Array<{ sensorEntity?: string }>) || [];
      return tanks.map((t) => t.sensorEntity).filter(Boolean) as string[];
    }

    return ids;
  }

  private getEntityIdForMetric(device: GrowspaceDevice, metricKey: string): string | null {
    const ids = this.getEntityIdsForMetric(device, metricKey);
    return ids.length > 0 ? ids[0] : null;
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

  private _getIntervalForRange(range: '1h' | '6h' | '24h' | '7d'): number {
    switch (range) {
      case '7d':
        return 240;
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
}
