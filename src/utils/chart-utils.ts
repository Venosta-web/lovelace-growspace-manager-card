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
        height: number
    ): string {
        if (!historyData || historyData.length < 2) return '';

        // Sort by time and extract numeric values
        let sortedData = [...historyData]
            .sort((a, b) => new Date(a.last_changed).getTime() - new Date(b.last_changed).getTime())
            .filter(h => {
                const val = parseFloat(h.state);
                return !isNaN(val) && h.state !== 'unavailable' && h.state !== 'unknown';
            });

        if (sortedData.length < 2) return '';

        // Downsample to ~192 points (8 per hour on 24h grid) for performance
        const targetPoints = 192;
        if (sortedData.length > targetPoints) {
            const step = Math.ceil(sortedData.length / targetPoints);
            sortedData = sortedData.filter((_, i) => i % step === 0 || i === sortedData.length - 1);
        }

        const values = sortedData.map(h => parseFloat(h.state));
        const times = sortedData.map(h => new Date(h.last_changed).getTime());

        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);

        const valueRange = maxVal - minVal || 1;
        const timeRange = maxTime - minTime || 1;

        // Generate SVG path points
        const points = sortedData.map((h, i) => {
            const x = ((times[i] - minTime) / timeRange) * width;
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
        }
    ): Array<{ path: string; color: string }> {
        if (!historyData || historyData.length < 2) return [];

        // Sort and filter data
        let sortedData = [...historyData]
            .sort((a, b) => new Date(a.last_changed).getTime() - new Date(b.last_changed).getTime())
            .filter(h => {
                const val = parseFloat(h.state);
                return !isNaN(val) && h.state !== 'unavailable' && h.state !== 'unknown';
            });

        if (sortedData.length < 2) return [];

        // Downsample
        const targetPoints = 192;
        if (sortedData.length > targetPoints) {
            const step = Math.ceil(sortedData.length / targetPoints);
            sortedData = sortedData.filter((_, i) => i % step === 0 || i === sortedData.length - 1);
        }

        const values = sortedData.map(h => parseFloat(h.state));
        const times = sortedData.map(h => new Date(h.last_changed).getTime());

        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);

        const valueRange = maxVal - minVal || 1;
        const timeRange = maxTime - minTime || 1;

        // Generate points with coordinates and status
        // Add padding so lines don't touch edges (5px top/bottom)
        const padding = 5;
        const usableHeight = height - (padding * 2);
        const points = sortedData.map((h, i) => {
            const value = values[i];
            const x = ((times[i] - minTime) / timeRange) * width;
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
}
