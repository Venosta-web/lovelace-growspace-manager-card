/**
 * Camera slice — unit tests.
 *
 * Tests cover:
 *   - atom defaults
 *   - getSnapshots (apply, updates snapshots$, error re-throw)
 *   - captureSnapshot (apply, error re-throw)
 *   - setSnapshots (bootstrap write)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as hassCall from '../../services/hass-call';
import {
  snapshots$,
  setSnapshots,
  getSnapshots,
  captureSnapshot,
} from './index';

vi.mock('../../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  callServiceReturning: vi.fn().mockResolvedValue(undefined),
  hassCall: vi.fn().mockResolvedValue({ growspace_id: 'gs1', snapshots: [], total: 0 }),
  setHass: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Reset atoms before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  setSnapshots([]);
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Atom defaults
// ---------------------------------------------------------------------------

describe('snapshots$', () => {
  it('defaults to an empty array', () => {
    expect(snapshots$.get()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// setSnapshots (bootstrap write)
// ---------------------------------------------------------------------------

describe('setSnapshots', () => {
  it('replaces snapshots$ with the provided array', () => {
    const snap = { path: '/img/a.jpg', filename: 'a.jpg', timestamp: '2026-01-01T00:00:00Z' };
    setSnapshots([snap]);
    expect(snapshots$.get()).toEqual([snap]);
  });
});

// ---------------------------------------------------------------------------
// getSnapshots
// ---------------------------------------------------------------------------

describe('getSnapshots', () => {
  it('calls hassCall with the correct WS command and growspace_id', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      growspace_id: 'gs1',
      snapshots: [],
      total: 0,
    });

    await getSnapshots('gs1');

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_snapshots',
      expect.objectContaining({ growspace_id: 'gs1' }),
      expect.anything(),
    );
  });

  it('passes limit and offset when provided', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      growspace_id: 'gs1',
      snapshots: [],
      total: 0,
    });

    await getSnapshots('gs1', 10, 20);

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_snapshots',
      { growspace_id: 'gs1', limit: 10, offset: 20 },
      expect.anything(),
    );
  });

  it('updates snapshots$ with the returned snapshots', async () => {
    const snap = { path: '/img/b.jpg', filename: 'b.jpg', timestamp: '2026-01-02T00:00:00Z' };
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      growspace_id: 'gs1',
      snapshots: [snap],
      total: 1,
    });

    await getSnapshots('gs1');

    expect(snapshots$.get()).toEqual([snap]);
  });

  it('returns the full response', async () => {
    const snap = { path: '/img/c.jpg', filename: 'c.jpg', timestamp: '2026-01-03T00:00:00Z' };
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      growspace_id: 'gs1',
      snapshots: [snap],
      total: 1,
    });

    const result = await getSnapshots('gs1');

    expect(result.total).toBe(1);
    expect(result.snapshots).toEqual([snap]);
  });

  it('re-throws when hassCall fails', async () => {
    vi.mocked(hassCall.hassCall).mockRejectedValueOnce(new Error('network error'));

    await expect(getSnapshots('gs1')).rejects.toThrow('network error');
  });

  it('does not update snapshots$ when hassCall fails', async () => {
    setSnapshots([{ path: '/img/prev.jpg', filename: 'prev.jpg', timestamp: '2026-01-01T00:00:00Z' }]);
    vi.mocked(hassCall.hassCall).mockRejectedValueOnce(new Error('fail'));

    await expect(getSnapshots('gs1')).rejects.toThrow();

    expect(snapshots$.get()).toEqual([{ path: '/img/prev.jpg', filename: 'prev.jpg', timestamp: '2026-01-01T00:00:00Z' }]);
  });
});

// ---------------------------------------------------------------------------
// captureSnapshot
// ---------------------------------------------------------------------------

describe('captureSnapshot', () => {
  it('calls hassCall with the capture WS command and growspace_id', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      growspace_id: 'gs1',
      timestamp: '2026-05-25T10:00:00Z',
      snapshots: ['/img/new.jpg'],
    });

    await captureSnapshot('gs1');

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/capture_snapshot',
      { growspace_id: 'gs1' },
      expect.anything(),
    );
  });

  it('returns the capture response', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      growspace_id: 'gs1',
      timestamp: '2026-05-25T10:00:00Z',
      snapshots: ['/img/new.jpg'],
    });

    const result = await captureSnapshot('gs1');

    expect(result.growspace_id).toBe('gs1');
    expect(result.snapshots).toEqual(['/img/new.jpg']);
  });

  it('re-throws when hassCall fails', async () => {
    vi.mocked(hassCall.hassCall).mockRejectedValueOnce(new Error('camera offline'));

    await expect(captureSnapshot('gs1')).rejects.toThrow('camera offline');
  });
});
