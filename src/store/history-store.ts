/**
 * History Store - Nano Store atoms for sensor history data.
 *
 * This module replaces the internal state management in GrowspaceHistoryController.
 * Components can now subscribe directly to history atoms using StoreController,
 * eliminating the need for manual listener management.
 */

import { atom, map, computed } from 'nanostores';
import { HistorySensorState, SensorHistories } from '../types';

// --- Core History Cache ---

/**
 * Main history cache keyed by metric name.
 * Keys: 'temperature', 'humidity', 'vpd', 'co2', 'light', 'optimal', 'main',
 *       'soil_moisture', 'exhaust', 'humidifier', 'dehumidifier',
 *       'circulation_fan', 'irrigation', 'drain'
 */
export const $historyCache = map<Record<string, HistorySensorState[]>>({});

/**
 * Last known timestamps for each metric (for delta loading).
 */
export const $lastTimestamps = map<Record<string, string>>({});

// --- Loading/Error State ---

/** Whether history is currently loading */
export const $historyLoading = atom<boolean>(false);

/** Whether history has been loaded at least once */
export const $historyLoaded = atom<boolean>(false);

/** Error message if history fetch failed */
export const $historyError = atom<string | null>(null);

// --- Time Range Selection ---

export type HistoryTimeRange = '1h' | '6h' | '24h' | '7d';

/** Time ranges per device (keyed by device_id) */
export const $graphRanges = map<Record<string, HistoryTimeRange>>({});

// --- Graph Configuration ---

/** Currently active environment graphs (set of metric keys) */
export const $activeEnvGraphs = atom<Set<string>>(new Set());

/** Linked graph groups (metrics displayed together) */
export const $linkedGraphGroups = atom<string[][]>([]);

// --- Computed Stores ---

/**
 * Combined history object for analytics component.
 * Computed from $historyCache to ensure consistency.
 */
export const $combinedHistory = computed($historyCache, (cache): SensorHistories => ({
    temperature: cache.temperature || [],
    humidity: cache.humidity || [],
    vpd: cache.vpd || [],
    co2: cache.co2 || [],
    dehumidifier: cache.dehumidifier || [],
    exhaust: cache.exhaust || [],
    humidifier: cache.humidifier || [],
    circulation_fan: cache.circulation_fan || [],
    soil_moisture: cache.soil_moisture || [],
    light: cache.light || [],
    irrigation: cache.irrigation || [],
    drain: cache.drain || [],
    optimal: cache.optimal || [],
}));

// --- Actions ---

/**
 * Set history data for a specific metric.
 */
export function setHistoryData(metric: string, data: HistorySensorState[]): void {
    const current = $historyCache.get();
    $historyCache.set({ ...current, [metric]: data });
}

/**
 * Set history data for multiple metrics at once.
 */
export function setHistoryBatch(updates: Record<string, HistorySensorState[]>): void {
    const current = $historyCache.get();
    $historyCache.set({ ...current, ...updates });
}

/**
 * Update the last timestamp for a metric.
 */
export function updateLastTimestamp(metric: string, data: HistorySensorState[]): void {
    if (data.length === 0) return;
    const lastPoint = data[data.length - 1];
    const timestamp = (lastPoint as any).last_updated || (lastPoint as any).last_changed;
    if (timestamp) {
        $lastTimestamps.setKey(metric, timestamp);
    }
}

/**
 * Clear the history cache (e.g., when switching devices).
 */
export function clearHistoryCache(): void {
    $historyCache.set({});
    $lastTimestamps.set({});
    $historyLoaded.set(false);
    $historyError.set(null);
}

/**
 * Set loading state.
 */
export function setHistoryLoading(loading: boolean): void {
    $historyLoading.set(loading);
}

/**
 * Mark history as loaded.
 */
export function setHistoryLoaded(loaded: boolean): void {
    $historyLoaded.set(loaded);
}

/**
 * Set the time range for a specific device.
 */
export function setGraphRange(deviceId: string, range: HistoryTimeRange): void {
    $graphRanges.setKey(deviceId, range);
}

/**
 * Get the time range for a specific device (defaults to '24h').
 */
export function getGraphRange(deviceId: string | null): HistoryTimeRange {
    if (!deviceId) return '24h';
    return $graphRanges.get()[deviceId] || '24h';
}

/**
 * Toggle a metric in the active environment graphs.
 */
export function toggleEnvGraph(metric: string): boolean {
    const current = $activeEnvGraphs.get();
    const newSet = new Set(current);

    if (newSet.has(metric)) {
        newSet.delete(metric);
        $activeEnvGraphs.set(newSet);
        return false; // Metric is now inactive
    } else {
        newSet.add(metric);
        $activeEnvGraphs.set(newSet);
        return true; // Metric is now active
    }
}

/**
 * Link two metric graphs together.
 */
export function linkGraphs(metric1: string, metric2: string): void {
    const groups = $linkedGraphGroups.get();
    const existingGroupIndex = groups.findIndex(
        group => group.includes(metric1) || group.includes(metric2)
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

    $linkedGraphGroups.set(newGroups);

    // Auto-activate both metrics
    const newActive = new Set($activeEnvGraphs.get());
    newActive.add(metric1);
    newActive.add(metric2);
    $activeEnvGraphs.set(newActive);
}

/**
 * Unlink a specific graph group.
 */
export function unlinkGraphGroup(index: number): void {
    const groups = $linkedGraphGroups.get();
    if (index >= 0 && index < groups.length) {
        const newGroups = [...groups];
        newGroups.splice(index, 1);
        $linkedGraphGroups.set(newGroups);
    }
}

/**
 * Remove a metric from all linked groups.
 */
export function unlinkGraphMetric(metric: string): void {
    const groups = $linkedGraphGroups.get();
    const newGroups = groups
        .map(group => group.filter(m => m !== metric))
        .filter(group => group.length > 1);
    $linkedGraphGroups.set(newGroups);
}

/**
 * Clear all linked graph groups.
 */
export function clearAllLinks(): void {
    $linkedGraphGroups.set([]);
}

// --- Backward Compatibility Getters ---

/**
 * Get history data for a specific metric.
 * Useful for components not yet migrated to StoreController.
 */
export function getHistoryForMetric(metric: string): HistorySensorState[] | null {
    return $historyCache.get()[metric] || null;
}
