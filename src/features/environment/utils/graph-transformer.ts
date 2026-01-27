import type { GraphDataPoint, HistorySensorState } from '../types';
import { MetricKey } from '../constants';
import { EntityState, BINARY_ON_STATES } from '../../../lib/types/hass';

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

    const events: { start: number; end: number; durationStr: string }[] = [];
    // We look at reference days covering the window
    // The window might span multiple calendar days, so we check "now" and "startTime" days
    // A safer approach for short windows (<= 7 days) is to iterate daily,
    // but the original logic just checked simplistic referenceDays.
    // We will preserve the original logic's intent but robustify if needed.
    // Original used: const referenceDays = [new Date(now), new Date(startTime)];

    const now = new Date(endTime);
    const start = new Date(startTime);
    const referenceDays = [now, start];

    times.forEach((t: { time: string; duration?: number }) => {
      const [h, m] = t.time.split(':').map(Number);
      const duration = (t.duration || 60) * 1000;
      const durationSeconds = duration / 1000;

      let durationStr = `${durationSeconds}s`;
      if (durationSeconds >= 60) durationStr = `${Math.round(durationSeconds / 60)}m`;

      referenceDays.forEach((refDay) => {
        const eventStart = new Date(refDay);
        eventStart.setHours(h, m, 0, 0);
        const eventEnd = new Date(eventStart.getTime() + duration);

        // Check overlap with window [startTime, endTime]
        if (eventEnd.getTime() > startTime && eventStart.getTime() < endTime) {
          events.push({
            start: Math.max(eventStart.getTime(), startTime),
            end: Math.min(eventEnd.getTime(), endTime),
            durationStr,
          });
        }
      });
    });

    events.sort((a, b) => a.start - b.start);

    // Initial point
    dataPoints.push({ time: startTime, value: 0 });

    events.forEach((ev) => {
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
    overviewEntity: unknown,
    now: Date,
    lastDataPoint?: GraphDataPoint
  ): GraphDataPoint | null {
    // Type guard: check if entity has attributes property
    const entity = overviewEntity as { attributes?: Record<string, unknown> } | null | undefined;

    if (metricKey === MetricKey.DEHUMIDIFIER) {
      const dehumState = entity?.attributes?.dehumidifier_state;
      if (dehumState) {
        const val = BINARY_ON_STATES.includes(dehumState as string) ? 1 : 0;
        return { time: now.getTime(), value: val, meta: { state: val ? 'ON' : 'OFF' } };
      }
    } else if (metricKey === MetricKey.EXHAUST || metricKey === MetricKey.HUMIDIFIER) {
      const val =
        metricKey === MetricKey.EXHAUST
          ? entity?.attributes?.exhaust_value
          : entity?.attributes?.humidifier_value;
      if (val !== undefined && val !== null) {
        let numVal = parseFloat(String(val));
        let meta: Record<string, string> | undefined;
        if (isNaN(numVal)) {
          const lowerVal = String(val).toLowerCase();
          if (lowerVal === EntityState.ON || lowerVal === EntityState.ACTIVE) {
            numVal = 1;
            meta = { state: 'ON' };
          } else if (lowerVal === EntityState.OFF || lowerVal === EntityState.IDLE) {
            numVal = 0;
            meta = { state: 'OFF' };
          }
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
    if (s === EntityState.UNAVAILABLE || s === EntityState.UNKNOWN) return undefined;

    if (key === MetricKey.DEHUMIDIFIER) {
      return BINARY_ON_STATES.includes(s) || s === 'heating' || s === 'drying' ? 1 : 0;
    }
    if (key === MetricKey.LIGHT) {
      // Text based check
      if (s === EntityState.ON || s === EntityState.TRUE) return 1;
      if (s === EntityState.OFF || s === EntityState.FALSE) return 0;

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
