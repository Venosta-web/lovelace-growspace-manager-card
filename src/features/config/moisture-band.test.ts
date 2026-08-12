/**
 * Acceptable Moisture Band draft logic.
 *
 * The invariant every test here defends: the save payload never carries one
 * bound without the other. The backend rejects a lone bound and fails the whole
 * `configure_environment` call, so a half pair is not a cosmetic bug.
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_MOISTURE_MAX,
  DEFAULT_MOISTURE_MIN,
  bandSavePayload,
  bandValidationError,
  classifyReading,
  editBound,
  effectiveBand,
  isCompleteValidBand,
  parseReading,
  resetBand,
} from './moisture-band';

describe('effectiveBand', () => {
  it('shows the inherited 20-60% defaults without claiming a custom override', () => {
    expect(effectiveBand({ min: null, max: null })).toEqual({
      min: DEFAULT_MOISTURE_MIN,
      max: DEFAULT_MOISTURE_MAX,
      isCustom: false,
    });
  });

  it('reports a complete stored pair as custom', () => {
    expect(effectiveBand({ min: 32.5, max: 54 })).toEqual({
      min: 32.5,
      max: 54,
      isCustom: true,
    });
  });

  it('treats a half-filled draft as custom, filling the untouched bound', () => {
    expect(effectiveBand({ min: 30, max: null })).toEqual({
      min: 30,
      max: DEFAULT_MOISTURE_MAX,
      isCustom: true,
    });
  });
});

describe('validation', () => {
  it.each([
    ['full range', 0, 100],
    ['decimal pair', 32.5, 54.5],
    ['zero minimum', 0, 0.1],
  ])('accepts %s', (_label, min, max) => {
    expect(isCompleteValidBand({ min, max })).toBe(true);
    expect(bandValidationError({ min, max })).toBeNull();
  });

  it.each([
    ['inverted', 60, 30],
    ['equal bounds', 40, 40],
    ['below floor', -1, 50],
    ['above ceiling', 20, 101],
    ['NaN', Number.NaN, 50],
  ])('rejects %s', (_label, min, max) => {
    expect(isCompleteValidBand({ min, max })).toBe(false);
    expect(bandValidationError({ min, max })).not.toBeNull();
  });

  it('reports an incomplete pair as an error but a full clear as fine', () => {
    expect(bandValidationError({ min: 30, max: null })).toMatch(/both/i);
    expect(bandValidationError({ min: null, max: null })).toBeNull();
  });
});

describe('editBound', () => {
  it('materialises both bounds when editing an inherited band', () => {
    // Typing only a minimum must not leave a half pair the backend rejects.
    expect(editBound({ min: null, max: null }, 'min', 30)).toEqual({
      min: 30,
      max: DEFAULT_MOISTURE_MAX,
    });
    expect(editBound({ min: null, max: null }, 'max', 70)).toEqual({
      min: DEFAULT_MOISTURE_MIN,
      max: 70,
    });
  });

  it('edits one bound of an existing custom pair without disturbing the other', () => {
    expect(editBound({ min: 30, max: 70 }, 'max', 65)).toEqual({ min: 30, max: 65 });
  });

  it('keeps a zero minimum rather than treating it as empty', () => {
    expect(editBound({ min: null, max: null }, 'min', 0)).toEqual({
      min: 0,
      max: DEFAULT_MOISTURE_MAX,
    });
  });

  it('leaves an incomplete pair when emptying one bound of a custom band', () => {
    // The draft is allowed to be transiently incomplete while the user retypes;
    // the error surfaces in the VM and bandSavePayload refuses to send it, so
    // the stored band is left untouched rather than half-overwritten.
    const emptied = editBound({ min: 30, max: 70 }, 'min', null);
    expect(emptied).toEqual({ min: null, max: 70 });
    expect(bandValidationError(emptied)).not.toBeNull();
    expect(bandSavePayload(emptied)).toBeNull();
  });

  it('collapses to inherited when emptying a bound that was never materialised', () => {
    expect(editBound({ min: null, max: null }, 'min', null)).toEqual({
      min: null,
      max: null,
    });
  });
});

describe('bandSavePayload', () => {
  it('sends both bounds as null to clear a stored override', () => {
    expect(bandSavePayload(resetBand())).toEqual({ min: null, max: null });
  });

  it('sends a complete valid pair', () => {
    expect(bandSavePayload({ min: 32.5, max: 54 })).toEqual({ min: 32.5, max: 54 });
  });

  it.each([
    ['half pair', { min: 30, max: null }],
    ['inverted pair', { min: 60, max: 30 }],
    ['out of range', { min: 20, max: 101 }],
  ])('omits the band entirely for a %s, leaving the stored one untouched', (_l, draft) => {
    expect(bandSavePayload(draft)).toBeNull();
  });

  it('never yields a payload with exactly one bound set', () => {
    const drafts = [
      { min: null, max: null },
      { min: 30, max: null },
      { min: null, max: 70 },
      { min: 30, max: 70 },
      { min: 70, max: 30 },
    ];
    for (const draft of drafts) {
      const payload = bandSavePayload(draft);
      if (payload === null) continue;
      expect((payload.min === null) === (payload.max === null)).toBe(true);
    }
  });
});

describe('parseReading', () => {
  it.each([
    ['a numeric string', '56.0', 56],
    ['a number', 42, 42],
  ])('parses %s', (_label, raw, expected) => {
    expect(parseReading(raw as string | number)).toBe(expected);
  });

  it.each([['unavailable'], ['unknown'], ['']])('rejects %s', (raw) => {
    expect(parseReading(raw)).toBeNull();
  });

  it('rejects null and undefined', () => {
    expect(parseReading(null)).toBeNull();
    expect(parseReading(undefined)).toBeNull();
  });
});

describe('classifyReading', () => {
  const band = { min: 20, max: 60, isCustom: false };

  it.each([
    ['just below the minimum', 19.9, 'too_dry'],
    ['exactly on the minimum', 20, 'in_band'],
    ['mid band', 40, 'in_band'],
    ['exactly on the maximum', 60, 'in_band'],
    ['just above the maximum', 60.1, 'too_wet'],
  ])('classifies %s', (_label, reading, expected) => {
    expect(classifyReading(reading, band)).toBe(expected);
  });

  it('follows a custom band rather than the defaults', () => {
    const custom = { min: 32.5, max: 54, isCustom: true };
    expect(classifyReading(56, band)).toBe('in_band');
    expect(classifyReading(56, custom)).toBe('too_wet');
  });
});
