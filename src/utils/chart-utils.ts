import { METRIC_CONFIG } from '../constants';

export class ChartUtils {
    /**
     * Generates an SVG path string for a mini sparkline from history data.
     * Returns empty string if not enough data points.
     * Downsamples to ~8 points per hour (192 points on 24h grid) for performance.
     */
    public static generateSparklinePath(
        historyData: any[],
        width: number,
        height: number,
        timeRange: '1h' | '6h' | '24h' | '7d' = '24h'
    ): string {
        if (!historyData || historyData.length < 2) return '';

        // Sort by time
        const sortedData = [...historyData]
            .sort((a, b) => new Date(a.last_changed).getTime() - new Date(b.last_changed).getTime());

        // Helper for strict interval checks
        const shouldKeepPoint = (dateStr: string, range: string): boolean => {
            const date = new Date(dateStr);
            const minutes = date.getMinutes();

            switch (range) {
                case '7d': return minutes === 0; // Every hour
                case '24h': return minutes % 15 === 0; // Every 15 mins
                case '6h': return minutes % 5 === 0; // Every 5 mins
                case '1h': return true; // Keep all for high fidelity
                default: return minutes % 15 === 0;
            }
        };

        // Filter valid numeric values AND apply time-based downsampling
        const validData = sortedData.filter((h, index) => {
            const val = parseFloat(h.state);
            const isValid = !isNaN(val) && h.state !== 'unavailable' && h.state !== 'unknown';
            if (!isValid) return false;

            // Always keep the LAST point to avoid graph cutoff
            if (index === sortedData.length - 1) return true;

            // Apply time interval filter
            return shouldKeepPoint(h.last_changed, timeRange);
        });

        if (validData.length < 2) return '';

        const values = validData.map(h => parseFloat(h.state));
        const times = validData.map(h => new Date(h.last_changed).getTime());

        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);

        const valueRange = maxVal - minVal || 1;
        const timeRangeVal = maxTime - minTime || 1;

        // Generate SVG path points
        const points = validData.map((h, i) => {
            const x = ((times[i] - minTime) / timeRangeVal) * width;
            const y = height - ((values[i] - minVal) / valueRange) * height;
            return `${x},${y}`;
        });

        return `M ${points.join(' L ')}`;
    }

    /**
     * Gets the sparkline color based on the metric's configured color from METRIC_CONFIG.
     * For VPD, uses status colors (optimal=green, warning=orange, danger=red).
     */
    public static getSparklineColor(metricKey: string, status?: string): string {
        if (metricKey === 'vpd' && status) {
            switch (status) {
                case 'optimal': return '#4caf50'; // Green
                case 'warning': return '#ff9800'; // Orange
                case 'danger': return '#f44336';  // Red
            }
        }
        const config = METRIC_CONFIG[metricKey];
        return config?.color || 'rgba(255, 255, 255, 0.3)';
    }

    /**
     * Gets VPD status based on value and thresholds.
     */
    private static getVpdStatusForValue(value: number, thresholds: {
        targetMin: number; targetMax: number; dangerMin: number; dangerMax: number;
    }): string {
        if (value < thresholds.dangerMin || value > thresholds.dangerMax) {
            return 'danger';
        } else if (value < thresholds.targetMin || value > thresholds.targetMax) {
            return 'warning';
        }
        return 'optimal';
    }

    /**
     * Generates colored VPD sparkline segments based on VPD value at each point.
     * Returns array of { path, color } objects for rendering.
     */
    public static generateVpdSparklineSegments(
        historyData: any[],
        width: number,
        height: number,
        thresholds: {
            targetMin: number; targetMax: number; dangerMin: number; dangerMax: number;
        },
        timeRange: '1h' | '6h' | '24h' | '7d' = '24h'
    ): Array<{ path: string; color: string }> {
        if (!historyData || historyData.length < 2) return [];

        // Sort by time
        const sortedData = [...historyData]
            .sort((a, b) => new Date(a.last_changed).getTime() - new Date(b.last_changed).getTime());

        // Helper for strict interval checks
        const shouldKeepPoint = (dateStr: string, range: string): boolean => {
            const date = new Date(dateStr);
            const minutes = date.getMinutes();

            switch (range) {
                case '7d': return minutes === 0; // Every hour
                case '24h': return minutes % 15 === 0; // Every 15 mins
                case '6h': return minutes % 5 === 0; // Every 5 mins
                case '1h': return true; // Keep all
                default: return minutes % 15 === 0;
            }
        };

        // Filter valid numeric values AND apply time-based downsampling
        const validData = sortedData.filter((h, index) => {
            const val = parseFloat(h.state);
            const isValid = !isNaN(val) && h.state !== 'unavailable' && h.state !== 'unknown';
            if (!isValid) return false;

            // Always keep the LAST point
            if (index === sortedData.length - 1) return true;

            return shouldKeepPoint(h.last_changed, timeRange);
        });

        if (validData.length < 2) return [];

        const values = validData.map(h => parseFloat(h.state));
        const times = validData.map(h => new Date(h.last_changed).getTime());

        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);

        const valueRange = maxVal - minVal || 1;
        const timeRangeVal = maxTime - minTime || 1;

        // Generate points with coordinates and status
        // Add padding so lines don't touch edges (5px top/bottom)
        const padding = 5;
        const usableHeight = height - (padding * 2);
        const points = validData.map((h, i) => {
            const value = values[i];
            const x = ((times[i] - minTime) / timeRangeVal) * width;
            const y = padding + (usableHeight - ((value - minVal) / valueRange) * usableHeight);
            const status = this.getVpdStatusForValue(value, thresholds);
            return { x, y, status };
        });

        // Generate segments by color
        const segments: Array<{ path: string; color: string }> = [];
        let currentSegment: typeof points = [];
        let currentStatus = points[0]?.status;

        for (let i = 0; i < points.length; i++) {
            const p = points[i];

            if (p.status === currentStatus) {
                currentSegment.push(p);
            } else {
                // Status changed - finish current segment and start new one
                if (currentSegment.length >= 1) {
                    // Add connecting point to current segment
                    currentSegment.push(p);
                    const pathStr = `M ${currentSegment.map(pt => `${pt.x},${pt.y}`).join(' L ')}`;
                    segments.push({
                        path: pathStr,
                        color: this.getSparklineColor('vpd', currentStatus)
                    });
                }
                // Start new segment with this point
                currentSegment = [p];
                currentStatus = p.status;
            }
        }

        // Finish last segment
        if (currentSegment.length >= 2) {
            const pathStr = `M ${currentSegment.map(pt => `${pt.x},${pt.y}`).join(' L ')}`;
            segments.push({
                path: pathStr,
                color: this.getSparklineColor('vpd', currentStatus)
            });
        }

        return segments;
    }

    /**
     * Generates an SVG path string from pre-processed time/value points.
     * Handles scaling, optional min/max overrides, and line/step types.
     */
    public static generatePathFromValues(
        data: { time: number; value: number }[],
        width: number,
        height: number,
        options: {
            min?: number;
            max?: number;
            startTime?: number;
            endTime?: number;
            type?: 'line' | 'step';
            timeRange?: '1h' | '6h' | '24h' | '7d';
        } = {}
    ): string {
        if (!data || data.length < 2) return '';

        let processedData = data;

        // Apply downsampling if timeRange is provided
        if (options.timeRange) {
            const shouldKeepPoint = (timestamp: number, range: string): boolean => {
                const date = new Date(timestamp);
                const minutes = date.getMinutes();

                switch (range) {
                    case '7d': return minutes === 0; // Every hour
                    case '24h': return minutes % 15 === 0; // Every 15 mins
                    case '6h': return minutes % 5 === 0; // Every 5 mins
                    case '1h': return true; // Keep all
                    default: return minutes % 15 === 0;
                }
            };

            processedData = data.filter((d, index) => {
                // Always keep LAST point
                if (index === data.length - 1) return true;
                return shouldKeepPoint(d.time, options.timeRange!);
            });

            if (processedData.length < 2) return '';
        }

        const type = options.type || 'line';
        const vals = processedData.map(d => d.value);
        const times = processedData.map(d => d.time);

        // Calculate ranges based on original data or options?
        // Usually we want to scale based on the visible data?
        // Or if min/max are provided use those.
        // options.min/max are usually derived from the full dataset or fixed ranges.

        // If we filter points, the local min/max might change, but usually we want to respect the intended scale.
        // Assuming options.min/max are provided (as they are in GrowspaceEnvChart), we use those.
        // If not, we re-calculate from processedData.

        const minVal = options.min !== undefined ? options.min : Math.min(...vals);
        const maxVal = options.max !== undefined ? options.max : Math.max(...vals);
        const valueRange = (maxVal - minVal) || 1;

        const minTime = options.startTime !== undefined ? options.startTime : Math.min(...times);
        const maxTime = options.endTime !== undefined ? options.endTime : Math.max(...times);
        const timeRange = (maxTime - minTime) || 1;

        const points: [number, number][] = processedData.map(d => {
            const x = ((d.time - minTime) / timeRange) * width;
            const y = height - ((d.value - minVal) / valueRange) * height;
            return [x, y];
        });

        if (points.length === 0) return '';

        // Generate Path
        if (type === 'step') {
            let pathStr = `M ${points[0][0]},${points[0][1]}`;
            for (let i = 1; i < points.length; i++) {
                // Step: Horizontal to next X, prev Y, then Vertical to next Y
                pathStr += ` L ${points[i][0]},${points[i - 1][1]}`;
                pathStr += ` L ${points[i][0]},${points[i][1]}`;
            }
            return pathStr;
        } else {
            // Line
            return `M ${points.map(p => `${p[0]},${p[1]}`).join(' L ')}`;
        }
    }

    /**
     * Generates an SVG path string for a step graph (binary/state) from history data.
     * Use generatePathFromValues for pre-processed data.
     */
    public static generateStepPath(
        historyData: any[],
        width: number,
        height: number,
        timeRange?: '1h' | '6h' | '24h' | '7d'
    ): string {
        if (!historyData || historyData.length < 2) return '';

        // Pre-filter valid binary/numeric data
        const sortedData = [...historyData]
            .sort((a, b) => new Date(a.last_changed).getTime() - new Date(b.last_changed).getTime())
            .filter(h => {
                const val = parseFloat(h.state);
                const isBinary = h.state === 'on' || h.state === 'off';
                return isBinary || (!isNaN(val) && h.state !== 'unavailable' && h.state !== 'unknown');
            });

        if (sortedData.length < 2) return '';

        // Map to { time, value }
        const values = sortedData.map(h => {
            const t = new Date(h.last_changed).getTime();
            let v = 0;
            if (h.state === 'on') v = 1;
            else if (h.state === 'off') v = 0;
            else v = parseFloat(h.state);
            return { time: t, value: v };
        });

        // Delegate to generic generator with step type and downsampling
        return this.generatePathFromValues(values, width, height, {
            type: 'step',
            timeRange
        });
    }
}
