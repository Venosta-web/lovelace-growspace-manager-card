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

        // AUTO-OPTIMIZATION: If we already have sparse data (e.g. from backend downsampling),
        // skip further downsampling to prevent data loss.
        // Assuming ~100px width, if we have < 150 points, just render them.
        const skipDownsampling = len < (width * 1.5);

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

            if (skipDownsampling) {
                keep = true;
            } else {
                switch (timeRange) {
                    // 7d: Every 4 hours (was 1h) - Reduced to 42 points
                    case '7d': keep = minutes === 0 && date.getHours() % 4 === 0; break;
                    // 24h: Every 30 mins (was 15m) - Reduced to 48 points
                    case '24h': keep = minutes % 30 === 0; break;
                    // 6h: Every 15 mins (was 5m) - Reduced to 24 points
                    case '6h': keep = minutes % 15 === 0; break;
                    // 1h: Every 5 mins (was all) - Reduced to ~12 points
                    case '1h': keep = minutes % 5 === 0; break;
                    default: keep = minutes % 30 === 0;
                }
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
     * Determines if it is "Day" (Light ON) at a specific time based on history.
     */
    public static getIsDay(time: number, lightHistory: any[]): boolean {
        if (!lightHistory || lightHistory.length === 0) return true; // Default to Day

        // 1. Check if time is before the entire history
        if (time < lightHistory[0].time) {
            // First point: if 0 (OFF), assume previous was ON (Day).
            // if >0 (ON), assume previous was OFF (Night).
            return lightHistory[0].value === 0;
        }

        // Find most recent state
        let state = 0;
        for (let i = lightHistory.length - 1; i >= 0; i--) {
            if (lightHistory[i].time <= time) {
                state = lightHistory[i].value;
                break;
            }
        }
        return state > 0;
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
     * Generates colored VPD sparkline segments based on VPD value at each point, respecting Day/Night cycles.
     */
    public static generateVpdSparklineSegments(
        historyData: any[],
        width: number,
        height: number,
        thresholds: {
            day: { targetMin: number; targetMax: number; dangerMin: number; dangerMax: number };
            night: { targetMin: number; targetMax: number; dangerMin: number; dangerMax: number };
        },
        lightHistory: any[],
        timeRange: '1h' | '6h' | '24h' | '7d' = '24h'
    ): Array<{ path: string; color: string }> {
        if (!historyData || historyData.length < 2) return [];

        const sortedData = [...historyData].sort(
            (a, b) => new Date(a.last_changed).getTime() - new Date(b.last_changed).getTime()
        );

        // Normalize light history once if needed, but assuming caller passes normalized points is safer/faster?
        // Actually, GrowspaceEnvChart passes normalized points. GrowspaceHeader probably passes raw history.
        // Let's assume normalized points for 'lightHistory' to match 'getIsDay' expectation (array of {time, value}).
        // If passed raw HA history, we need to normalize it first.
        let normalizedLight: any[] = lightHistory;
        if (lightHistory.length > 0 && (lightHistory[0].last_changed)) {
            normalizedLight = this.normalizeHistory(lightHistory, 'light', 0, Date.now());
        }


        const validData: any[] = [];
        const len = sortedData.length;
        const skipDownsampling = len < (width * 1.5);

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

            if (skipDownsampling) {
                keep = true;
            } else {
                switch (timeRange) {
                    case '7d': keep = minutes === 0 && date.getHours() % 4 === 0; break;
                    case '24h': keep = minutes % 30 === 0; break;
                    case '6h': keep = minutes % 15 === 0; break;
                    case '1h': keep = minutes % 5 === 0; break;
                    default: keep = minutes % 30 === 0;
                }
            }

            if (keep) validData.push(h);
        }

        if (validData.length < 2) return [];

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

            const isDay = this.getIsDay(t, normalizedLight);
            const activeThresholds = isDay ? thresholds.day : thresholds.night;
            const status = this.getVpdStatusForValue(val, activeThresholds);

            return { x, y, status };
        });

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

        // Backend already downsamples data, so use it directly
        const processedData = data;

        // ⚡ Performance: Single-pass min/max calculation
        // Replaces 4 separate Math.min/max(...array.map()) calls that each create intermediate arrays
        // Reduces from O(4n) with 4 array allocations to O(n) with 0 allocations
        let computedMinVal = Number.MAX_VALUE;
        let computedMaxVal = Number.MIN_VALUE;
        let computedMinTime = Number.MAX_VALUE;
        let computedMaxTime = Number.MIN_VALUE;

        // Only calculate if options don't override (lazy computation)
        const needMinVal = options.min === undefined;
        const needMaxVal = options.max === undefined;
        const needMinTime = options.startTime === undefined;
        const needMaxTime = options.endTime === undefined;

        if (needMinVal || needMaxVal || needMinTime || needMaxTime) {
            for (let i = 0; i < processedData.length; i++) {
                const d = processedData[i];
                if (needMinVal && d.value < computedMinVal) computedMinVal = d.value;
                if (needMaxVal && d.value > computedMaxVal) computedMaxVal = d.value;
                if (needMinTime && d.time < computedMinTime) computedMinTime = d.time;
                if (needMaxTime && d.time > computedMaxTime) computedMaxTime = d.time;
            }
        }

        const minVal = options.min !== undefined ? options.min : computedMinVal;
        const maxVal = options.max !== undefined ? options.max : computedMaxVal;
        const valueRange = maxVal - minVal || 1;

        const minTime = options.startTime !== undefined ? options.startTime : computedMinTime;
        const maxTime = options.endTime !== undefined ? options.endTime : computedMaxTime;
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

    /**
     * Normalizes raw HA history data into GraphDataPoints.
     * Handles binary conversions (on=1/off=0), numeric parsing, and time filtering.
     */
    public static normalizeHistory(
        historyData: any[],
        metricKey: string,
        startTimeMs: number,
        endTimeMs: number
    ): Array<{ time: number; value: number; meta?: any }> {
        if (!historyData || historyData.length === 0) return [];

        const points: Array<{ time: number; value: number; meta?: any }> = [];

        // Sort first
        const sorted = [...historyData].sort((a, b) =>
            new Date(a.last_changed).getTime() - new Date(b.last_changed).getTime()
        );

        for (const h of sorted) {
            const rawTime = new Date(h.last_changed).getTime();

            // Allow points slightly before startTime to establish initial state if needed,
            // but primarily we filter by window here or let caller handle it.
            // For now, let's include everything and let charts filter/clip.

            let val = 0;
            let isValid = false;

            if (metricKey === 'light' || metricKey === 'irrigation' || metricKey === 'drain' || h.state === 'on' || h.state === 'off') {
                if (h.state === 'on') { val = 1; isValid = true; }
                else if (h.state === 'off') { val = 0; isValid = true; }
                else {
                    // Try parsing float for safety
                    const f = parseFloat(h.state);
                    if (!isNaN(f)) { val = f; isValid = true; }
                }
            } else {
                const f = parseFloat(h.state);
                if (!isNaN(f)) { val = f; isValid = true; }
            }

            if (isValid && h.state !== 'unavailable' && h.state !== 'unknown') {
                const point: any = { time: rawTime, value: val };
                if (h.attributes) point.meta = h.attributes;
                points.push(point);
            }
        }

        return points;
    }
}
