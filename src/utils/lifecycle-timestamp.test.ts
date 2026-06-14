import { describe, it, expect } from 'vitest';
import { fromBackend, toWire } from './lifecycle-timestamp';

describe('lifecycle-timestamp – fromBackend', () => {
  it('renders a full backend datetime as a datetime-local value (minute precision)', () => {
    // A value carrying an explicit local time round-trips its wall-clock components.
    expect(fromBackend('2026-03-01T14:30:00')).toBe('2026-03-01T14:30');
  });

  it('renders a legacy date-only value as local midnight without a timezone shift', () => {
    // The bug fromBackend must avoid: new Date('2026-01-15') is UTC midnight, which
    // in a negative-offset timezone would render 2026-01-14. Date-only must be read
    // as a LOCAL calendar date, so the day is preserved in every timezone.
    expect(fromBackend('2026-01-15')).toBe('2026-01-15T00:00');
  });

  it('returns empty string for null / undefined / empty', () => {
    expect(fromBackend(null)).toBe('');
    expect(fromBackend(undefined)).toBe('');
    expect(fromBackend('')).toBe('');
  });

  it('returns empty string for an unparseable value', () => {
    expect(fromBackend('not-a-date')).toBe('');
  });
});

describe('lifecycle-timestamp – toWire', () => {
  it('sends a datetime-local value verbatim, preserving the time', () => {
    // No truncation — the time the user picked reaches the backend.
    expect(toWire('2026-03-01T14:30')).toBe('2026-03-01T14:30');
  });

  it('passes a date-only value through unchanged', () => {
    expect(toWire('2026-01-15')).toBe('2026-01-15');
  });

  it('maps empty / null-ish values to null', () => {
    expect(toWire('')).toBeNull();
    expect(toWire(null)).toBeNull();
    expect(toWire(undefined)).toBeNull();
    expect(toWire('null')).toBeNull();
    expect(toWire('undefined')).toBeNull();
  });
});
