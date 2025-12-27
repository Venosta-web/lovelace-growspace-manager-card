
import { describe, it, expect } from 'vitest';
import { GraphDataTransformer } from '../../src/graph-data-transformer';
import { HistorySensorState } from '../../src/types';

describe('GraphDataTransformer', () => {

    describe('transformEventsToTimeSeries', () => {
        it('should return empty array if times is undefined or not array', () => {
            const start = 1000;
            const end = 2000;
            expect(GraphDataTransformer.transformEventsToTimeSeries(undefined, start, end)).toEqual([]);
            expect(GraphDataTransformer.transformEventsToTimeSeries(null as any, start, end)).toEqual([]);
            expect(GraphDataTransformer.transformEventsToTimeSeries('invalid' as any, start, end)).toEqual([]);
        });

        it('should transform events into data points correctly', () => {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            const now = new Date(start);
            now.setHours(12, 0, 0, 0);

            // Event at 06:00 for 1 hour (3600s)
            const times = [{ time: '06:00', duration: 3600 }];

            const result = GraphDataTransformer.transformEventsToTimeSeries(times, start.getTime(), now.getTime());

            expect(result.length).toBeGreaterThan(0);
            expect(result[0]).toEqual({ time: start.getTime(), value: 0 });
            expect(result[result.length - 1]).toEqual({ time: now.getTime(), value: 0 });

            const onPoint = result.find(p => p.value === 1);
            expect(onPoint).toBeDefined();

            // Expected start is 06:00 Local on the start day
            const expectedEventStart = new Date(start);
            expectedEventStart.setHours(6, 0, 0, 0);

            expect(onPoint?.time).toBe(expectedEventStart.getTime());
        });

        it('should handle events overlapping the window boundaries', () => {
            // Window 10:00 to 11:00 Local
            const start = new Date();
            start.setHours(10, 0, 0, 0);
            const end = new Date(start);
            end.setHours(11, 0, 0, 0);

            // Event starts at 09:30 for 1 hour (up to 10:30)
            const times = [{ time: '09:30', duration: 3600 }];

            const result = GraphDataTransformer.transformEventsToTimeSeries(times, start.getTime(), end.getTime());

            // Expect an active segment starting at 'start' (clamped)
            const onPoints = result.filter(p => p.value === 1);
            expect(onPoints.length).toBeGreaterThan(0);
            expect(onPoints[0].time).toBe(start.getTime()); // Should start at window start
        });
    });

    describe('synthesizeLiveDataPoint', () => {
        const now = new Date();

        it('should synthesize dehumidifier point', () => {
            const entity = { attributes: { dehumidifier_state: 'on' } };
            const result = GraphDataTransformer.synthesizeLiveDataPoint('dehumidifier', entity, now);
            expect(result).toEqual({
                time: now.getTime(),
                value: 1,
                meta: { state: 'ON' }
            });
        });

        it('should synthesize dehumidifier point when off', () => {
            const entity = { attributes: { dehumidifier_state: 'off' } };
            const result = GraphDataTransformer.synthesizeLiveDataPoint('dehumidifier', entity, now);
            expect(result).toEqual({
                time: now.getTime(),
                value: 0,
                meta: { state: 'OFF' }
            });
        });

        it('should synthesize exhaust point (numeric)', () => {
            const entity = { attributes: { exhaust_value: '50' } };
            const result = GraphDataTransformer.synthesizeLiveDataPoint('exhaust', entity, now);
            expect(result).toEqual({
                time: now.getTime(),
                value: 50,
                meta: undefined
            });
        });

        it('should synthesize exhaust point (on/off)', () => {
            const entity = { attributes: { exhaust_value: 'on' } };
            const result = GraphDataTransformer.synthesizeLiveDataPoint('exhaust', entity, now);
            expect(result).toEqual({
                time: now.getTime(),
                value: 1,
                meta: { state: 'ON' }
            });
        });

        it('should fallback to last data point if generic', () => {
            const last = { time: 123, value: 42, meta: { foo: 'bar' } };
            const result = GraphDataTransformer.synthesizeLiveDataPoint('temp', {}, now, last);
            expect(result).toEqual({
                time: now.getTime(),
                value: 42,
                meta: { foo: 'bar' }
            });
        });

        it('should return null if no match and no last point', () => {
            const result = GraphDataTransformer.synthesizeLiveDataPoint('temp', {}, now);
            expect(result).toBeNull();
        });

        it('should synthesize humidifier point (numeric)', () => {
            const entity = { attributes: { humidifier_value: '75' } };
            const result = GraphDataTransformer.synthesizeLiveDataPoint('humidifier', entity, now);
            expect(result).toEqual({
                time: now.getTime(),
                value: 75,
                meta: undefined
            });
        });

        it('should synthesize humidifier point (active state)', () => {
            const entity = { attributes: { humidifier_value: 'active' } };
            const result = GraphDataTransformer.synthesizeLiveDataPoint('humidifier', entity, now);
            expect(result).toEqual({
                time: now.getTime(),
                value: 1,
                meta: { state: 'ON' }
            });
        });

        it('should synthesize exhaust point (idle state)', () => {
            const entity = { attributes: { exhaust_value: 'idle' } };
            const result = GraphDataTransformer.synthesizeLiveDataPoint('exhaust', entity, now);
            expect(result).toEqual({
                time: now.getTime(),
                value: 0,
                meta: { state: 'OFF' }
            });
        });

        it('should synthesize exhaust point (off state)', () => {
            const entity = { attributes: { exhaust_value: 'off' } };
            const result = GraphDataTransformer.synthesizeLiveDataPoint('exhaust', entity, now);
            expect(result).toEqual({
                time: now.getTime(),
                value: 0,
                meta: { state: 'OFF' }
            });
        });

        it('should return null when value is undefined', () => {
            const entity = { attributes: {} };
            const result = GraphDataTransformer.synthesizeLiveDataPoint('exhaust', entity, now);
            expect(result).toBeNull();
        });

        it('should return null when NaN value cannot be parsed', () => {
            const entity = { attributes: { exhaust_value: 'invalid_value' } };
            const result = GraphDataTransformer.synthesizeLiveDataPoint('exhaust', entity, now);
            expect(result).toBeNull();
        });

        it('should return null for dehumidifier when entity or attribute missing', () => {
            const result1 = GraphDataTransformer.synthesizeLiveDataPoint('dehumidifier', null, now);
            expect(result1).toBeNull();

            const result2 = GraphDataTransformer.synthesizeLiveDataPoint('dehumidifier', { attributes: {} }, now);
            expect(result2).toBeNull();
        });
    });

    describe('normalizeSensorValue', () => {
        it('should return undefined for unavailable/unknown', () => {
            expect(GraphDataTransformer.normalizeSensorValue({ state: 'unavailable' } as any, 'temp')).toBeUndefined();
            expect(GraphDataTransformer.normalizeSensorValue({ state: 'unknown' } as any, 'temp')).toBeUndefined();
        });

        it('should normalize dehumidifier states', () => {
            expect(GraphDataTransformer.normalizeSensorValue({ state: 'heating' } as any, 'dehumidifier')).toBe(1);
            expect(GraphDataTransformer.normalizeSensorValue({ state: 'off' } as any, 'dehumidifier')).toBe(0);
        });

        it('should normalize light states', () => {
            expect(GraphDataTransformer.normalizeSensorValue({ state: 'on' } as any, 'light')).toBe(1);
            expect(GraphDataTransformer.normalizeSensorValue({ state: 'off' } as any, 'light')).toBe(0);
            expect(GraphDataTransformer.normalizeSensorValue({ state: '50' } as any, 'light')).toBe(1);
            expect(GraphDataTransformer.normalizeSensorValue({ state: '0' } as any, 'light')).toBe(0);
        });

        it('should normalize numeric values', () => {
            expect(GraphDataTransformer.normalizeSensorValue({ state: '25.5' } as any, 'temp')).toBe(25.5);
        });

        it('should fallback for generic on/off', () => {
            expect(GraphDataTransformer.normalizeSensorValue({ state: 'on' } as any, 'pump')).toBe(1);
            expect(GraphDataTransformer.normalizeSensorValue({ state: 'off' } as any, 'pump')).toBe(0);
        });

        it('should normalize light true/false string states', () => {
            expect(GraphDataTransformer.normalizeSensorValue({ state: 'true' } as any, 'light')).toBe(1);
            expect(GraphDataTransformer.normalizeSensorValue({ state: 'false' } as any, 'light')).toBe(0);
        });

        it('should return undefined for non-numeric invalid state', () => {
            expect(GraphDataTransformer.normalizeSensorValue({ state: 'garbage' } as any, 'pump')).toBeUndefined();
        });
    });
});
