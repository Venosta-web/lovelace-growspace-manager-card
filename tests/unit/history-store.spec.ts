import { describe, it, expect, beforeEach } from 'vitest';
import {
    $historyCache,
    $historyLoading,
    $historyLoaded,
    $historyError,
    $graphRanges,
    $activeEnvGraphs,
    $linkedGraphGroups,
    $combinedHistory,
    $lastTimestamps,
    setHistoryData,
    setHistoryBatch,
    updateLastTimestamp,
    clearHistoryCache,
    setHistoryLoading,
    setHistoryLoaded,
    setGraphRange,
    getGraphRange,
    toggleEnvGraph,
    linkGraphs,
    unlinkGraphGroup,
    unlinkGraphMetric,
    clearAllLinks,
    getHistoryForMetric,
} from '../../src/store/history-store';
import { HistorySensorState } from '../../src/types';

describe('history-store', () => {
    const mockHistoryData: HistorySensorState[] = [
        { entity_id: 'sensor.temp', state: '25', attributes: {}, last_changed: '2024-01-01T00:00:00Z' },
        { entity_id: 'sensor.temp', state: '26', attributes: {}, last_changed: '2024-01-01T01:00:00Z' },
    ];

    beforeEach(() => {
        // Reset all atoms before each test
        $historyCache.set({});
        $lastTimestamps.set({});
        $historyLoading.set(false);
        $historyLoaded.set(false);
        $historyError.set(null);
        $graphRanges.set({});
        $activeEnvGraphs.set(new Set());
        $linkedGraphGroups.set([]);
    });

    describe('History Cache Operations', () => {
        it('should set history data for a metric', () => {
            setHistoryData('temperature', mockHistoryData);

            expect($historyCache.get().temperature).toEqual(mockHistoryData);
        });

        it('should set history batch for multiple metrics', () => {
            const batch = {
                temperature: mockHistoryData,
                humidity: [{ entity_id: 'sensor.hum', state: '60', attributes: {}, last_changed: '2024-01-01T00:00:00Z' }],
            };

            setHistoryBatch(batch);

            expect($historyCache.get().temperature).toEqual(mockHistoryData);
            expect($historyCache.get().humidity).toHaveLength(1);
        });

        it('should clear history cache', () => {
            setHistoryData('temperature', mockHistoryData);
            setHistoryLoaded(true);

            clearHistoryCache();

            expect($historyCache.get()).toEqual({});
            expect($historyLoaded.get()).toBe(false);
        });

        it('should get history for metric', () => {
            setHistoryData('vpd', mockHistoryData);

            expect(getHistoryForMetric('vpd')).toEqual(mockHistoryData);
            expect(getHistoryForMetric('nonexistent')).toBeNull();
        });
    });

    describe('Last Timestamps', () => {
        it('should update last timestamp from data', () => {
            updateLastTimestamp('temperature', mockHistoryData);

            expect($lastTimestamps.get().temperature).toBe('2024-01-01T01:00:00Z');
        });

        it('should not update timestamp for empty data', () => {
            updateLastTimestamp('temperature', []);

            expect($lastTimestamps.get().temperature).toBeUndefined();
        });
    });

    describe('Loading State', () => {
        it('should set loading state', () => {
            setHistoryLoading(true);
            expect($historyLoading.get()).toBe(true);

            setHistoryLoading(false);
            expect($historyLoading.get()).toBe(false);
        });

        it('should set loaded state', () => {
            setHistoryLoaded(true);
            expect($historyLoaded.get()).toBe(true);
        });
    });

    describe('Graph Ranges', () => {
        it('should set graph range for device', () => {
            setGraphRange('device1', '6h');

            expect($graphRanges.get().device1).toBe('6h');
        });

        it('should get graph range with default', () => {
            expect(getGraphRange('device1')).toBe('24h');
            expect(getGraphRange(null)).toBe('24h');

            setGraphRange('device1', '7d');
            expect(getGraphRange('device1')).toBe('7d');
        });
    });

    describe('Active Environment Graphs', () => {
        it('should toggle env graph on', () => {
            const result = toggleEnvGraph('temperature');

            expect(result).toBe(true);
            expect($activeEnvGraphs.get().has('temperature')).toBe(true);
        });

        it('should toggle env graph off', () => {
            toggleEnvGraph('temperature'); // On
            const result = toggleEnvGraph('temperature'); // Off

            expect(result).toBe(false);
            expect($activeEnvGraphs.get().has('temperature')).toBe(false);
        });
    });

    describe('Linked Graphs', () => {
        it('should link two metrics', () => {
            linkGraphs('temperature', 'humidity');

            expect($linkedGraphGroups.get()).toEqual([['temperature', 'humidity']]);
            expect($activeEnvGraphs.get().has('temperature')).toBe(true);
            expect($activeEnvGraphs.get().has('humidity')).toBe(true);
        });

        it('should add to existing group', () => {
            linkGraphs('temperature', 'humidity');
            linkGraphs('temperature', 'vpd');

            expect($linkedGraphGroups.get()).toHaveLength(1);
            expect($linkedGraphGroups.get()[0]).toContain('temperature');
            expect($linkedGraphGroups.get()[0]).toContain('humidity');
            expect($linkedGraphGroups.get()[0]).toContain('vpd');
        });

        it('should unlink graph group', () => {
            linkGraphs('temperature', 'humidity');
            linkGraphs('vpd', 'co2');

            unlinkGraphGroup(0);

            expect($linkedGraphGroups.get()).toHaveLength(1);
            expect($linkedGraphGroups.get()[0]).toContain('vpd');
        });

        it('should unlink specific metric', () => {
            linkGraphs('temperature', 'humidity');
            linkGraphs('temperature', 'vpd');

            unlinkGraphMetric('temperature');

            // Group should still exist but without temperature
            // If only one metric left, group should be removed
            expect($linkedGraphGroups.get()[0]).not.toContain('temperature');
        });

        it('should clear all links', () => {
            linkGraphs('temperature', 'humidity');
            linkGraphs('vpd', 'co2');

            clearAllLinks();

            expect($linkedGraphGroups.get()).toEqual([]);
        });
    });

    describe('Computed: combinedHistory', () => {
        it('should compute combined history from cache', () => {
            setHistoryData('temperature', mockHistoryData);
            setHistoryData('vpd', [{ entity_id: 'sensor.vpd', state: '1.2', attributes: {}, last_changed: '2024-01-01T00:00:00Z' }]);

            const combined = $combinedHistory.get();

            expect(combined.temperature).toEqual(mockHistoryData);
            expect(combined.vpd).toHaveLength(1);
            expect(combined.humidity).toEqual([]);
        });

        it('should update when cache changes', () => {
            const initialCombined = $combinedHistory.get();
            expect(initialCombined.temperature).toEqual([]);

            setHistoryData('temperature', mockHistoryData);

            const updatedCombined = $combinedHistory.get();
            expect(updatedCombined.temperature).toEqual(mockHistoryData);
        });
    });
});
