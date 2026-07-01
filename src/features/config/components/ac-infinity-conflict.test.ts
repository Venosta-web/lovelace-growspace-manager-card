import { describe, it, expect } from 'vitest';
import { isAutomatedMode } from './ac-infinity-conflict';

describe('isAutomatedMode', () => {
  it('treats Off and On (any case) as not automated', () => {
    expect(isAutomatedMode('Off')).toBe(false);
    expect(isAutomatedMode('On')).toBe(false);
    expect(isAutomatedMode('off')).toBe(false);
    expect(isAutomatedMode('ON')).toBe(false);
  });

  it('treats unavailable/unknown as not automated (no false alarm on offline ports)', () => {
    expect(isAutomatedMode('unavailable')).toBe(false);
    expect(isAutomatedMode('unknown')).toBe(false);
  });

  it('treats empty/missing state as not automated', () => {
    expect(isAutomatedMode('')).toBe(false);
    expect(isAutomatedMode(null)).toBe(false);
    expect(isAutomatedMode(undefined)).toBe(false);
  });

  it('treats every self-running mode as automated', () => {
    for (const mode of ['Auto', 'VPD', 'Timer to On', 'Timer to Off', 'Cycle', 'Schedule']) {
      expect(isAutomatedMode(mode)).toBe(true);
    }
  });

  it('treats an unknown future mode string as automated (forward-compatible)', () => {
    expect(isAutomatedMode('Some New Mode')).toBe(true);
  });
});
