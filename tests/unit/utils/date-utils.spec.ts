import { describe, it, expect } from 'vitest';
import {
    getEventTimestamp,
    formatRelativeDay,
    formatTime,
    formatDateTime,
    formatShortDate,
    formatFullDate,
    getDateKey,
    formatDuration,
    parseDate,
    formatProbability,
} from '../../../src/utils/date-utils';

describe('date-utils', () => {
    describe('getEventTimestamp', () => {
        it('should extract timestamp from timestamp field', () => {
            const event = { timestamp: '2026-01-15T10:00:00Z' };
            const result = getEventTimestamp(event);
            expect(result).toBeGreaterThan(0);
            expect(new Date(result).toISOString()).toBe('2026-01-15T10:00:00.000Z');
        });

        it('should extract timestamp from start_time field', () => {
            const event = { start_time: '2026-01-15T10:00:00Z' };
            const result = getEventTimestamp(event);
            expect(result).toBeGreaterThan(0);
        });

        it('should extract timestamp from date field', () => {
            const event = { date: '2026-01-15T10:00:00Z' };
            const result = getEventTimestamp(event);
            expect(result).toBeGreaterThan(0);
        });

        it('should return 0 for empty object', () => {
            const event = {};
            const result = getEventTimestamp(event);
            expect(result).toBe(0);
        });

        it('should prioritize timestamp over start_time', () => {
            const event = {
                timestamp: '2026-01-15T10:00:00Z',
                start_time: '2026-01-14T10:00:00Z'
            };
            const result = getEventTimestamp(event);
            expect(new Date(result).toISOString()).toBe('2026-01-15T10:00:00.000Z');
        });
    });

    describe('formatRelativeDay', () => {
        it('should return "Today" for current date', () => {
            const today = new Date();
            expect(formatRelativeDay(today)).toBe('Today');
        });

        it('should return "Yesterday" for yesterday', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            expect(formatRelativeDay(yesterday)).toBe('Yesterday');
        });

        it('should return formatted date for older dates', () => {
            const oldDate = new Date('2026-01-01T00:00:00Z');
            const result = formatRelativeDay(oldDate);
            expect(result).toMatch(/^\w+, \w+ \d+, \d{4}$/); // e.g., "Wednesday, Jan 1, 2026"
        });
    });

    describe('formatTime', () => {
        it('should format time correctly', () => {
            const date = new Date('2026-01-15T14:30:00Z');
            const result = formatTime(date);
            // Format may vary by locale, but should include hours and minutes
            expect(result).toMatch(/\d{1,2}:\d{2}/);
        });
    });

    describe('formatDateTime', () => {
        it('should format date and time', () => {
            const date = new Date('2026-01-15T14:30:00Z');
            const result = formatDateTime(date);
            // Should include month, day, and time
            expect(result).toMatch(/\w+/); // Month
            expect(result).toMatch(/\d/); // Day/time numbers
        });
    });

    describe('formatShortDate', () => {
        it('should format short date', () => {
            const date = new Date('2026-01-15T00:00:00Z');
            const result = formatShortDate(date);
            // Should be like "Jan 15"
            expect(result).toMatch(/\w+ \d+/);
        });
    });

    describe('formatFullDate', () => {
        it('should format full date with year', () => {
            const date = new Date('2026-01-15T00:00:00Z');
            const result = formatFullDate(date);
            // Should be like "Jan 15, 2026"
            expect(result).toMatch(/\w+ \d+, \d{4}/);
        });
    });

    describe('getDateKey', () => {
        it('should return date string for grouping', () => {
            const date = new Date('2026-01-15T14:30:00Z');
            const result = getDateKey(date);
            // Should be like "Wed Jan 15 2026"
            expect(result).toBe(date.toDateString());
        });

        it('should return same key for different times on same day', () => {
            const date1 = new Date('2026-01-15T10:00:00Z');
            const date2 = new Date('2026-01-15T20:00:00Z');
            expect(getDateKey(date1)).toBe(getDateKey(date2));
        });
    });

    describe('formatDuration', () => {
        it('should format duration in minutes and seconds', () => {
            expect(formatDuration(330)).toBe('5m 30s');
        });

        it('should format duration with only seconds', () => {
            expect(formatDuration(45)).toBe('0m 45s');
        });

        it('should format duration with only minutes', () => {
            expect(formatDuration(120)).toBe('2m 0s');
        });

        it('should handle zero duration', () => {
            expect(formatDuration(0)).toBe('0m 0s');
        });

        it('should handle large durations', () => {
            expect(formatDuration(3661)).toBe('61m 1s');
        });
    });

    describe('parseDate', () => {
        it('should parse valid ISO string', () => {
            const result = parseDate('2026-01-15T10:00:00Z');
            expect(result).toBeInstanceOf(Date);
            expect(result?.toISOString()).toBe('2026-01-15T10:00:00.000Z');
        });

        it('should return null for invalid date string', () => {
            const result = parseDate('invalid-date');
            expect(result).toBeNull();
        });

        it('should return null for empty string', () => {
            const result = parseDate('');
            expect(result).toBeNull();
        });

        it('should parse other valid date formats', () => {
            const result = parseDate('2026-01-15');
            expect(result).toBeInstanceOf(Date);
        });
    });

    describe('formatProbability', () => {
        it('should format probability as percentage', () => {
            expect(formatProbability(0.85)).toBe('85%');
        });

        it('should round to nearest integer', () => {
            expect(formatProbability(0.856)).toBe('86%');
            expect(formatProbability(0.854)).toBe('85%');
        });

        it('should handle 0', () => {
            expect(formatProbability(0)).toBe('0%');
        });

        it('should handle 1', () => {
            expect(formatProbability(1)).toBe('100%');
        });

        it('should return "--%" for undefined', () => {
            expect(formatProbability(undefined)).toBe('--%');
        });

        it('should return "--%" for NaN', () => {
            expect(formatProbability(NaN)).toBe('--%');
        });

        it('should return "--%" for null', () => {
            expect(formatProbability(null as any)).toBe('--%');
        });
    });
});
