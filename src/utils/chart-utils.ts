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
        const sortedData = [...historyData].sort(
            (a, b) => new Date(a.last_changed).getTime() - new Date(b.last_changed).getTime()
        );

        // Filter valid numeric values AND apply time-based downsampling
        const validData: any[] = [];
        const len = sortedData.length;

        for (let i = 0; i < len; i++) {
            const h = sortedData[i];
            const val = parseFloat(h.state);
            const isValid = !isNaN(val) && h.state !== 'unavailable' && h.state !== 'unknown';

            if (!isValid) continue;

            // Always keep the LAST point
            if (i === len - 1) {
                validData.push(h);
                continue;
            }

            const date = new Date(h.last_changed);
            const minutes = date.getMinutes();
            let keep = false;

            switch (timeRange) {
                case '7d': keep = minutes === 0; break;
                case '24h': keep = minutes % 15 === 0; break;
                case '6h': keep = minutes % 5 === 0; break;
                case '1h': keep = true; break;
                default: keep = minutes % 15 === 0;
            }

            if (keep) validData.push(h);
        }

        if (validData.length < 2) return '';

        // Calculate ranges
        let minVal = Number.MAX_VALUE;
        let maxVal = Number.MIN_VALUE;
        let minTime = Number.MAX_VALUE;
        let maxTime = Number.MIN_VALUE;

        // First pass to find min/max
        for (const d of validData) {
            const val = parseFloat(d.state);
            const t = new Date(d.last_changed).getTime();
            if (val < minVal) minVal = val;
            if (val > maxVal) maxVal = val;
            if (t < minTime) minTime = t;
            if (t > maxTime) maxTime = t;
        }

        const valueRange = maxVal - minVal || 1;
        const timeRangeVal = maxTime - minTime || 1;
        const xFactor = width / timeRangeVal;
        const yFactor = height / valueRange;

        // Generate Path
        const pathCommands: string[] = [];
        let first = true;

        for (const d of validData) {
            const val = parseFloat(d.state);
            const t = new Date(d.last_changed).getTime();

            const x = (t - minTime) * xFactor;
            const y = height - (val - minVal) * yFactor;

            if (first) {
                pathCommands.push(`M ${x},${y}`);
                first = false;
            } else {
                pathCommands.push(`L ${x},${y}`);
            }
        }

        return pathCommands.join(' ');
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
    private static getVpdStatusForValue(
        value: number,
        thresholds: { targetMin: number; targetMax: number; dangerMin: number; dangerMax: number }
    ): string {
        if (value < thresholds.dangerMin || value > thresholds.dangerMax) {
            return 'danger';
        } else if (value < thresholds.targetMin || value > thresholds.targetMax) {
            return 'warning';
        }
        return 'optimal';
    }

    /**
     * Generates colored VPD sparkline segments based on VPD value at each point.
     */
    public static generateVpdSparklineSegments(
        historyData: any[],
        width: number,
        height: number,
        thresholds: { targetMin: number; targetMax: number; dangerMin: number; dangerMax: number },
        timeRange: '1h' | '6h' | '24h' | '7d' = '24h'
    ): Array<{ path: string; color: string }> {
        if (!historyData || historyData.length < 2) return [];

        const sortedData = [...historyData].sort(
            (a, b) => new Date(a.last_changed).getTime() - new Date(b.last_changed).getTime()
        );

        const validData: any[] = [];
        const len = sortedData.length;

        for (let i = 0; i < len; i++) {
            const h = sortedData[i];
            const val = parseFloat(h.state);
            const isValid = !isNaN(val) && h.state !== 'unavailable' && h.state !== 'unknown';
            if (!isValid) continue;

            if (i === len - 1) {
                validData.push(h);
                continue;
            }

            const date = new Date(h.last_changed);
            const minutes = date.getMinutes();
            let keep = false;

            switch (timeRange) {
                case '7d': keep = minutes === 0; break;
                case '24h': keep = minutes % 15 === 0; break;
                case '6h': keep = minutes % 5 === 0; break;
                case '1h': keep = true; break;
                default: keep = minutes % 15 === 0;
            }

            if (keep) validData.push(h);
        }

        if (validData.length < 2) return [];

        // Calculate Min/Max for scaling
        let minVal = Number.MAX_VALUE;
        let maxVal = Number.MIN_VALUE;
        let minTime = Number.MAX_VALUE;
        let maxTime = Number.MIN_VALUE;

        for (const d of validData) {
            const val = parseFloat(d.state);
            const t = new Date(d.last_changed).getTime();
            if (val < minVal) minVal = val;
            if (val > maxVal) maxVal = val;
            if (t < minTime) minTime = t;
            if (t > maxTime) maxTime = t;
        }

        const valueRange = maxVal - minVal || 1;
        const timeRangeVal = maxTime - minTime || 1;
        const xFactor = width / timeRangeVal;

        const padding = 5;
        const usableHeight = height - (padding * 2);
        const yFactor = usableHeight / valueRange;

        // Generate Points with Status
        const points = validData.map((d) => {
            const val = parseFloat(d.state);
            const t = new Date(d.last_changed).getTime();
            const x = (t - minTime) * xFactor;
            const y = padding + (usableHeight - (val - minVal) * yFactor);
            const status = this.getVpdStatusForValue(val, thresholds);
            return { x, y, status };
        });

        // Generate segments
        const segments: Array<{ path: string; color: string }> = [];
        if (points.length === 0) return segments;

        let currentSegmentX: number[] = [points[0].x];
        let currentSegmentY: number[] = [points[0].y];
        let currentStatus = points[0].status;

        for (let i = 1; i < points.length; i++) {
            const p = points[i];
            if (p.status === currentStatus) {
                currentSegmentX.push(p.x);
                currentSegmentY.push(p.y);
            } else {
                // Close current segment
                currentSegmentX.push(p.x);
                currentSegmentY.push(p.y);

                const pathCommands: string[] = [`M ${currentSegmentX[0]},${currentSegmentY[0]}`];
                for (let j = 1; j < currentSegmentX.length; j++) {
                    pathCommands.push(`L ${currentSegmentX[j]},${currentSegmentY[j]}`);
                }

                segments.push({
                    path: pathCommands.join(' '),
                    color: this.getSparklineColor('vpd', currentStatus),
                });

                // Start new segment
                currentSegmentX = [p.x];
                currentSegmentY = [p.y];
                currentStatus = p.status;
            }
        }

        // Finish last segment
        if (currentSegmentX.length >= 2) {
            const pathCommands: string[] = [`M ${currentSegmentX[0]},${currentSegmentY[0]}`];
            for (let j = 1; j < currentSegmentX.length; j++) {
                pathCommands.push(`L ${currentSegmentX[j]},${currentSegmentY[j]}`);
            }
            segments.push({
                path: pathCommands.join(' '),
                color: this.getSparklineColor('vpd', currentStatus),
            });
        }

        return segments;
    }

    /**
     * Generates an SVG path string from pre-processed time/value points.
     * Handles scaling, optional min/max overrides, and line/step types.
     * optimized for performance by single-pass processing and pixel culling.
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

        // 1. Filter Data (Downsampling)
        let processedData = data;
        if (options.timeRange && options.timeRange !== '1h') {
            processedData = [];
            const len = data.length;
            for (let i = 0; i < len; i++) {
                // Always keep last point to prevent cutoff
                if (i === len - 1) {
                    processedData.push(data[i]);
                    break;
                }

                const d = data[i];
                const date = new Date(d.time);
                const minutes = date.getMinutes();
                let keep = false;

                // Inline checks for speed
                if (options.timeRange === '7d') keep = minutes === 0;
                else if (options.timeRange === '6h') keep = minutes % 5 === 0;
                else keep = minutes % 15 === 0; // 24h default

                if (keep) processedData.push(d);
            }
        }

        if (processedData.length < 2) return '';

        // 2. Determine Scale
        const minVal = options.min !== undefined ? options.min : Math.min(...processedData.map(d => d.value));
        const maxVal = options.max !== undefined ? options.max : Math.max(...processedData.map(d => d.value));
        const valueRange = maxVal - minVal || 1;

        const minTime = options.startTime !== undefined ? options.startTime : Math.min(...processedData.map(d => d.time));
        const maxTime = options.endTime !== undefined ? options.endTime : Math.max(...processedData.map(d => d.time));
        const timeRange = maxTime - minTime || 1;

        // Pre-calculate factors to avoid division in loop
        const xFactor = width / timeRange;
        const yFactor = height / valueRange;

        // 3. Generate Commands (Single Pass with Pixel Culling)
        const type = options.type || 'line';
        const pathCommands: string[] = [];

        // Calculate first point
        const startX = (processedData[0].time - minTime) * xFactor;
        const startY = height - (processedData[0].value - minVal) * yFactor;

        pathCommands.push(`M ${startX},${startY}`);

        let prevX = startX;
        let prevY = startY;

        // Small epsilon to cull sub-pixel redundant moves (0.1px)
        const EPSILON = 0.1;

        for (let i = 1; i < processedData.length; i++) {
            const d = processedData[i];
            const x = (d.time - minTime) * xFactor;
            const y = height - (d.value - minVal) * yFactor;

            // SKIP if point is effectively on top of the previous one (redundant)
            if (Math.abs(x - prevX) < EPSILON && Math.abs(y - prevY) < EPSILON) {
                continue;
            }

            if (type === 'step') {
                // Step: Draw Horizontal to new X, then Vertical to new Y

                // Horizontal segment: (prevX, prevY) -> (x, prevY)
                if (Math.abs(x - prevX) > EPSILON) {
                    pathCommands.push(`L ${x},${prevY}`);
                }

                // Vertical segment: (x, prevY) -> (x, y)
                if (Math.abs(y - prevY) > EPSILON) {
                    pathCommands.push(`L ${x},${y}`);
                }
            } else {
                // Line: Direct draw
                pathCommands.push(`L ${x},${y}`);
            }

            prevX = x;
            prevY = y;
        }

        return pathCommands.join(' ');
    }

    /**
     * Generates an SVG path string for a step graph (binary/state) from history data.
     */
    public static generateStepPath(
        historyData: any[],
        width: number,
        height: number,
        timeRange?: '1h' | '6h' | '24h' | '7d'
    ): string {
        if (!historyData || historyData.length < 2) return '';

        // Filter valid binary/numeric data
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

        // Delegate to optimized generator
        return this.generatePathFromValues(values, width, height, {
            type: 'step',
            timeRange
        });
    }
}
