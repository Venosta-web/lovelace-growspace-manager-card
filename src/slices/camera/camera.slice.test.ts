/**
 * Camera slice — unit tests.
 *
 * Tests cover:
 *   - atom defaults
 *   - getSnapshots (apply, updates snapshots$, error re-throw)
 *   - captureSnapshot (apply, error re-throw)
 *   - setSnapshots (bootstrap write)
 *   - visionHistory$ atom default
 *   - setVisionHistory (bootstrap write)
 *   - getVisionHistory (apply, updates visionHistory$, error re-throw)
 *   - triggerVisionCheckup (apply, error re-throw)
 *   - updateVisionCheckupConfig (apply, error re-throw)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as hassCall from '../../services/hass-call';
import {
  snapshots$,
  setSnapshots,
  getSnapshots,
  captureSnapshot,
  visionHistory$,
  setVisionHistory,
  getVisionHistory,
  triggerVisionCheckup,
  updateVisionCheckupConfig,
} from './index';

vi.mock('../../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  callServiceReturning: vi.fn().mockResolvedValue(undefined),
  hassCall: vi.fn().mockResolvedValue({ growspace_id: 'gs1', snapshots: [], total: 0 }),
  setHass: vi.fn(),
}));

const aVisionResult = () => ({
  timestamp: '2026-05-01T08:00:00Z',
  check_type: 'early' as const,
  analysis: 'Plants look healthy',
  issues_detected: [],
  severity: 'none' as const,
  recommendations: [],
  snapshot_paths: ['/img/snap.jpg'],
});

// ---------------------------------------------------------------------------
// Reset atoms before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  setSnapshots([]);
  setVisionHistory([]);
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
      expect.anything()
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
      expect.anything()
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
    setSnapshots([
      { path: '/img/prev.jpg', filename: 'prev.jpg', timestamp: '2026-01-01T00:00:00Z' },
    ]);
    vi.mocked(hassCall.hassCall).mockRejectedValueOnce(new Error('fail'));

    await expect(getSnapshots('gs1')).rejects.toThrow();

    expect(snapshots$.get()).toEqual([
      { path: '/img/prev.jpg', filename: 'prev.jpg', timestamp: '2026-01-01T00:00:00Z' },
    ]);
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
      expect.anything()
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

// ---------------------------------------------------------------------------
// visionHistory$ atom
// ---------------------------------------------------------------------------

describe('visionHistory$', () => {
  it('defaults to an empty array', () => {
    expect(visionHistory$.get()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// setVisionHistory (bootstrap write)
// ---------------------------------------------------------------------------

describe('setVisionHistory', () => {
  it('replaces visionHistory$ with the provided array', () => {
    const result = aVisionResult();
    setVisionHistory([result]);
    expect(visionHistory$.get()).toEqual([result]);
  });
});

// ---------------------------------------------------------------------------
// getVisionHistory
// ---------------------------------------------------------------------------

describe('getVisionHistory', () => {
  it('calls hassCall with the correct WS command and growspace_id', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({ history: [], total: 0 });

    await getVisionHistory('gs1');

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_vision_history',
      expect.objectContaining({ growspace_id: 'gs1' }),
      expect.anything()
    );
  });

  it('passes limit when provided', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({ history: [], total: 0 });

    await getVisionHistory('gs1', 5);

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_vision_history',
      { growspace_id: 'gs1', limit: 5 },
      expect.anything()
    );
  });

  it('updates visionHistory$ with the returned history', async () => {
    const result = aVisionResult();
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({ history: [result], total: 1 });

    await getVisionHistory('gs1');

    expect(visionHistory$.get()).toEqual([result]);
  });

  it('returns the full response', async () => {
    const result = aVisionResult();
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({ history: [result], total: 1 });

    const response = await getVisionHistory('gs1');

    expect(response.total).toBe(1);
    expect(response.history).toEqual([result]);
  });

  it('re-throws when hassCall fails', async () => {
    vi.mocked(hassCall.hassCall).mockRejectedValueOnce(new Error('network error'));

    await expect(getVisionHistory('gs1')).rejects.toThrow('network error');
  });

  it('does not update visionHistory$ when hassCall fails', async () => {
    setVisionHistory([aVisionResult()]);
    vi.mocked(hassCall.hassCall).mockRejectedValueOnce(new Error('fail'));

    await expect(getVisionHistory('gs1')).rejects.toThrow();

    expect(visionHistory$.get()).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// triggerVisionCheckup
// ---------------------------------------------------------------------------

describe('triggerVisionCheckup', () => {
  it('calls callServiceReturning with the correct domain, service, and growspace_id', async () => {
    const result = aVisionResult();
    vi.mocked(hassCall.callServiceReturning).mockResolvedValueOnce(result);

    await triggerVisionCheckup('gs1');

    expect(hassCall.callServiceReturning).toHaveBeenCalledWith(
      'growspace_manager',
      'trigger_vision_checkup',
      { growspace_id: 'gs1' },
      expect.anything()
    );
  });

  it('returns the checkup result', async () => {
    const result = aVisionResult();
    vi.mocked(hassCall.callServiceReturning).mockResolvedValueOnce(result);

    const response = await triggerVisionCheckup('gs1');

    expect(response).toEqual(result);
  });

  it('re-throws when callServiceReturning fails', async () => {
    vi.mocked(hassCall.callServiceReturning).mockRejectedValueOnce(new Error('no cameras'));

    await expect(triggerVisionCheckup('gs1')).rejects.toThrow('no cameras');
  });
});

// ---------------------------------------------------------------------------
// updateVisionCheckupConfig
// ---------------------------------------------------------------------------

describe('updateVisionCheckupConfig', () => {
  const config = {
    enabled: true,
    early_check_offset_minutes: 30,
    mid_check_hours: 6,
    late_check_offset_minutes: 60,
  };

  it('calls hassCall with the correct WS command, growspace_id, and config fields', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({ success: true });

    await updateVisionCheckupConfig('gs1', config);

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/update_vision_checkup_config',
      { growspace_id: 'gs1', ...config },
      expect.anything()
    );
  });

  it('returns the success response', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({ success: true });

    const response = await updateVisionCheckupConfig('gs1', config);

    expect(response).toEqual({ success: true });
  });

  it('re-throws when hassCall fails', async () => {
    vi.mocked(hassCall.hassCall).mockRejectedValueOnce(new Error('save failed'));

    await expect(updateVisionCheckupConfig('gs1', config)).rejects.toThrow('save failed');
  });
});
