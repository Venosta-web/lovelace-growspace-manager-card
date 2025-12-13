
import { GraphDataPoint } from './growspace-env-chart';

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
}
