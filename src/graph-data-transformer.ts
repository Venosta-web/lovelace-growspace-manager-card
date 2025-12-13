import { GraphDataPoint, HistorySensorState, MetricType } from './types';

export class GraphDataTransformer {
    /**
     * Transforms start/end time events into a time-series of 0/1 data points for a step graph.
     * 
     * @param times Array of event objects with time string "HH:MM" and duration in seconds.
     * @param startTime The start time of the graph window (ms timestamp).
     * @param endTime The end time of the graph window (ms timestamp) - usually "now".
     * @returns Array of GraphDataPoint
     */
    static transformEventsToTimeSeries(
        times: { time: string; duration?: number }[] | undefined,
        startTime: number,
        endTime: number
    ): GraphDataPoint[] {
        const dataPoints: GraphDataPoint[] = [];

        if (!times || !Array.isArray(times)) {
            return dataPoints;
        }

        const events: { start: number; end: number, durationStr: string }[] = [];
        // We look at reference days covering the window
        // The window might span multiple calendar days, so we check "now" and "startTime" days
        // A safer approach for short windows (<= 7 days) is to iterate daily, 
        // but the original logic just checked simplistic referenceDays. 
        // We will preserve the original logic's intent but robustify if needed.
        // Original used: const referenceDays = [new Date(now), new Date(startTime)];

        const now = new Date(endTime);
        const start = new Date(startTime);
        const referenceDays = [now, start];

        times.forEach((t: any) => {
            const [h, m] = t.time.split(':').map(Number);
            const duration = (t.duration || 60) * 1000;
            const durationSeconds = duration / 1000;

            let durationStr = `${durationSeconds}s`;
            if (durationSeconds >= 60) durationStr = `${Math.round(durationSeconds / 60)}m`;

            referenceDays.forEach(refDay => {
                const eventStart = new Date(refDay);
                eventStart.setHours(h, m, 0, 0);
                const eventEnd = new Date(eventStart.getTime() + duration);

                // Check overlap with window [startTime, endTime]
                if (eventEnd.getTime() > startTime && eventStart.getTime() < endTime) {
                    events.push({
                        start: Math.max(eventStart.getTime(), startTime),
                        end: Math.min(eventEnd.getTime(), endTime),
                        durationStr
                    });
                }
            });
        });

        events.sort((a, b) => a.start - b.start);

        // Initial point
        dataPoints.push({ time: startTime, value: 0 });

        events.forEach(ev => {
            // "Step" up 1ms before
            dataPoints.push({ time: ev.start - 1, value: 0 });
            // Start of event
            dataPoints.push({ time: ev.start, value: 1, meta: { duration: ev.durationStr } });
            // End of event
            dataPoints.push({ time: ev.end, value: 1, meta: { duration: ev.durationStr } });
            // "Step" down 1ms after
            dataPoints.push({ time: ev.end + 1, value: 0 });
        });

        // Final point
        dataPoints.push({ time: endTime, value: 0 });

        return dataPoints;
    }

    static synthesizeLiveDataPoint(
        metricKey: string,
        overviewEntity: any,
        now: Date,
        lastDataPoint?: GraphDataPoint
    ): GraphDataPoint | null {
        if (metricKey === 'dehumidifier') {
            if (overviewEntity && overviewEntity.attributes.dehumidifier_state) {
                const state = overviewEntity.attributes.dehumidifier_state;
                const val = (state === 'on' || state === 'true' || state === '1') ? 1 : 0;
                return { time: now.getTime(), value: val, meta: { state: val ? 'ON' : 'OFF' } };
            }
        } else if (metricKey === 'exhaust' || metricKey === 'humidifier') {
            let val = metricKey === 'exhaust' ? overviewEntity?.attributes?.exhaust_value : overviewEntity?.attributes?.humidifier_value;
            if (val !== undefined) {
                let numVal = parseFloat(val);
                let meta: any = undefined;
                if (isNaN(numVal)) {
                    if (String(val).toLowerCase() === 'on' || String(val).toLowerCase() === 'active') { numVal = 1; meta = { state: 'ON' }; }
                    else if (String(val).toLowerCase() === 'off' || String(val).toLowerCase() === 'idle') { numVal = 0; meta = { state: 'OFF' }; }
                }
                if (!isNaN(numVal)) {
                    return { time: now.getTime(), value: numVal, meta };
                }
            }
        }

        // Generic fallback: extend last value
        if (lastDataPoint) {
            return { time: now.getTime(), value: lastDataPoint.value, meta: lastDataPoint.meta };
        }

        return null;
    }

    static normalizeSensorValue(ent: HistorySensorState, key: string): number | undefined {
        const s = ent.state;
        if (s === 'unavailable' || s === 'unknown') return undefined;

        if (key === 'dehumidifier') {
            return (s === 'on' || s === 'true' || s === '1' || s === 'heating' || s === 'drying') ? 1 : 0;
        }
        if (key === 'light') {
            // Text based check
            if (s === 'on' || s === 'true') return 1;
            if (s === 'off' || s === 'false') return 0;

            // Numeric check for dimmers/percentages (0 = off, >0 = on)
            const val = parseFloat(s);
            if (!isNaN(val)) {
                return val > 0 ? 1 : 0;
            }
            return 0;
        }

        const val = parseFloat(s);
        if (isNaN(val)) {
            // Try to handle ON/OFF for 0-10 sensors if state comes as text?
            // Usually they are numbers, but just in case
            if (s === 'on') return 1;
            if (s === 'off') return 0;
            return undefined;
        }

        return val;
    }
}
