import { describe, it, expect } from 'vitest';
import { calculateVpdWithLstOffset } from './vpd-calc';

describe('calculateVpdWithLstOffset', () => {
  it('matches backend for standard grow-room conditions (25°C, 60%, -2 offset)', () => {
    expect(calculateVpdWithLstOffset(25, 60, -2)).toBe(0.91);
  });

  it('matches backend with zero offset', () => {
    expect(calculateVpdWithLstOffset(25, 60, 0)).toBe(1.26);
  });

  it('matches backend for cool humid conditions (20°C, 80%, -2 offset)', () => {
    expect(calculateVpdWithLstOffset(20, 80, -2)).toBe(0.19);
  });

  it('matches backend for warm dry conditions (30°C, 50%, -3 offset)', () => {
    expect(calculateVpdWithLstOffset(30, 50, -3)).toBe(1.44);
  });

  it('handles 0% humidity', () => {
    expect(calculateVpdWithLstOffset(25, 0, -2)).toBe(2.8);
  });

  it('handles 100% humidity (negative VPD is valid)', () => {
    expect(calculateVpdWithLstOffset(25, 100, -2)).toBe(-0.36);
  });

  it('returns null for NaN temperature', () => {
    expect(calculateVpdWithLstOffset(NaN, 60, -2)).toBeNull();
  });

  it('returns null for NaN humidity', () => {
    expect(calculateVpdWithLstOffset(25, NaN, -2)).toBeNull();
  });

  it('returns null for NaN offset', () => {
    expect(calculateVpdWithLstOffset(25, 60, NaN)).toBeNull();
  });
});
