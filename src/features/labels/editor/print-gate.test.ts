/**
 * When the editor lets a label go to paper, and the reason it gives when not.
 */

import { describe, expect, it } from 'vitest';

import type { SessionState } from './draft-session';
import { measurementProblems, testPrintBlockedBy } from './print-gate';

const BOUNDS = {
  printable_width_mm: 48,
  printable_height_mm: 30,
  feed_axis: 'y',
  quantum_mm: 0.01,
};

function state(overrides: Partial<SessionState> = {}): SessionState {
  return {
    rendering: false,
    dirty: false,
    saving: false,
    rasterStanding: 'settled',
    draft: { version: 3 },
    approval: { approvalId: 'held', draftVersion: 3, rasterIdentity: 'sha256:x' },
    render: {
      raster: { image: 'data:,' },
      eligibility: { test_print: { operation: 'test_print', allowed: true, blocked_by: [] } },
    },
    ...overrides,
  } as unknown as SessionState;
}

const READY = { admin: true, deviceId: 'image.b1_last_label_made' };

describe('test print', () => {
  it('is available for a settled, held, printable preview', () => {
    expect(testPrintBlockedBy(state(), READY)).toBeNull();
  });

  it('names the first reason, in the order a user fixes them', () => {
    expect(testPrintBlockedBy(state(), { ...READY, admin: false })).toBe('not_admin');
    expect(testPrintBlockedBy(state(), { ...READY, deviceId: null })).toBe('no_printer');
    expect(testPrintBlockedBy(state({ dirty: true }), READY)).toBe('rendering');
    expect(testPrintBlockedBy(state({ rasterStanding: 'stale' }), READY)).toBe('stale_preview');
    expect(testPrintBlockedBy(state({ rasterStanding: 'absent' }), READY)).toBe('no_preview');
    expect(testPrintBlockedBy(state({ approval: null }), READY)).toBe('not_held');
  });

  it('is blocked by the render itself, never by a warning', () => {
    const blocked = state({
      render: {
        raster: { image: 'data:,' },
        eligibility: {
          test_print: {
            operation: 'test_print',
            allowed: false,
            blocked_by: ['blocking_diagnostics'],
          },
        },
        diagnostics: [],
      } as never,
    });
    expect(testPrintBlockedBy(blocked, READY)).toBe('blocked');
  });
});

describe('calibration measurements', () => {
  const GOOD = { top_mm: '0.5', right_mm: '0', bottom_mm: '0,25', left_mm: '1', feed_mm: '-0.4' };

  it('accepts five numbers on the quantum, with a comma as a decimal point', () => {
    const { measurement, problems } = measurementProblems(GOOD, BOUNDS);

    expect(problems).toEqual([]);
    expect(measurement).toEqual({
      top_mm: 0.5,
      right_mm: 0,
      bottom_mm: 0.25,
      left_mm: 1,
      feed_mm: -0.4,
    });
  });

  it('names every field that cannot be right, and why', () => {
    const { measurement, problems } = measurementProblems(
      { top_mm: '', right_mm: 'abc', bottom_mm: '-1', left_mm: '49', feed_mm: '0.005' },
      BOUNDS
    );

    expect(measurement).toBeNull();
    expect(problems).toEqual([
      { field: 'top_mm', reason: 'required' },
      { field: 'right_mm', reason: 'not_a_number' },
      { field: 'bottom_mm', reason: 'negative' },
      { field: 'left_mm', reason: 'too_large' },
      { field: 'feed_mm', reason: 'not_on_quantum' },
    ]);
  });

  it('holds the feed offset to the axis the media travels along', () => {
    const across = { ...BOUNDS, feed_axis: 'x' };
    expect(measurementProblems({ ...GOOD, feed_mm: '40' }, BOUNDS).problems).toEqual([
      { field: 'feed_mm', reason: 'too_large' },
    ]);
    expect(measurementProblems({ ...GOOD, feed_mm: '40' }, across).problems).toEqual([]);
  });
});
