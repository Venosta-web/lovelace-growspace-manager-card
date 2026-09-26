import { describe, expect, it } from 'vitest';
import { parseStaleAfterMinutes, parseTankGraceMinutes, staleWindowLabel } from './tank-staleness';

describe('parseStaleAfterMinutes', () => {
  it.each([
    ['0', 0],
    ['45', 45],
    ['', 120],
    ['abc', 120],
    ['-5', 0],
  ])('reads %j as %d', (raw, minutes) => {
    expect(parseStaleAfterMinutes(raw)).toBe(minutes);
  });
});

describe('parseTankGraceMinutes', () => {
  it.each([
    ['0', 0],
    ['15', 15],
    ['', 10],
    ['200', 120],
    ['-1', 0],
  ])('reads %j as %d', (raw, minutes) => {
    expect(parseTankGraceMinutes(raw)).toBe(minutes);
  });
});

describe('staleWindowLabel', () => {
  it('names only a window that is not the default', () => {
    expect(staleWindowLabel(0)).toBe('Never stale');
    expect(staleWindowLabel(30)).toBe('Stale after 30 min');
    expect(staleWindowLabel(120)).toBeNull();
    expect(staleWindowLabel(null)).toBeNull();
    expect(staleWindowLabel(undefined)).toBeNull();
  });
});
