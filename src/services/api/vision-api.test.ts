/**
 * VisionAPI unit tests.
 *
 * Tests cover:
 *   - getVisionHistory: null guard, default limit, custom limit, happy path, error rethrow
 *   - triggerVisionCheckup: null guard, happy path, error rethrow
 *   - updateVisionCheckupConfig: null guard, config spread, happy path, error rethrow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VisionAPI } from './vision-api';
import {
  WS_TYPE_GET_VISION_HISTORY,
  WS_TYPE_UPDATE_VISION_CHECKUP_CONFIG,
  DOMAIN,
  SERVICES,
} from '../../lib/constants';
import type { VisionCheckupConfig, VisionCheckupResult } from '../../slices/camera';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeApi(): { api: VisionAPI; sendMessagePromise: ReturnType<typeof vi.fn> } {
  const sendMessagePromise = vi.fn().mockResolvedValue(null);
  const api = new VisionAPI();
  (api as unknown as { hass: unknown }).hass = {
    connection: { sendMessagePromise },
  };
  return { api, sendMessagePromise };
}

const sampleResult: VisionCheckupResult = {
  timestamp: '2026-05-31T10:00:00Z',
  check_type: 'mid',
  analysis: 'Plants look healthy.',
  issues_detected: [],
  severity: 'none',
  recommendations: [],
  snapshot_paths: [],
};

const sampleConfig: VisionCheckupConfig = {
  enabled: true,
  early_check_offset_minutes: 30,
  mid_check_hours: 6,
  late_check_offset_minutes: 60,
};

// ---------------------------------------------------------------------------
// getVisionHistory
// ---------------------------------------------------------------------------

describe('getVisionHistory', () => {
  it('returns null when hass is not set', async () => {
    const api = new VisionAPI();
    const result = await api.getVisionHistory('gs1');
    expect(result).toBeNull();
  });

  it('calls sendMessagePromise with correct payload and default limit', async () => {
    const { api, sendMessagePromise } = makeApi();
    const response = { history: [sampleResult], total: 1 };
    sendMessagePromise.mockResolvedValue(response);

    const result = await api.getVisionHistory('gs1');

    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: WS_TYPE_GET_VISION_HISTORY,
      growspace_id: 'gs1',
      limit: 10,
    });
    expect(result).toEqual(response);
  });

  it('passes a custom limit when provided', async () => {
    const { api, sendMessagePromise } = makeApi();
    sendMessagePromise.mockResolvedValue({ history: [], total: 0 });

    await api.getVisionHistory('gs2', 25);

    expect(sendMessagePromise.mock.calls[0][0].limit).toBe(25);
  });

  it('rethrows errors from sendMessagePromise', async () => {
    const { api, sendMessagePromise } = makeApi();
    sendMessagePromise.mockRejectedValue(new Error('ws error'));

    await expect(api.getVisionHistory('gs1')).rejects.toThrow('ws error');
  });
});

// ---------------------------------------------------------------------------
// triggerVisionCheckup
// ---------------------------------------------------------------------------

describe('triggerVisionCheckup', () => {
  it('returns null when hass is not set', async () => {
    const api = new VisionAPI();
    const result = await api.triggerVisionCheckup('gs1');
    expect(result).toBeNull();
  });

  it('calls sendMessagePromise with the call_service payload', async () => {
    const { api, sendMessagePromise } = makeApi();
    sendMessagePromise.mockResolvedValue(sampleResult);

    const result = await api.triggerVisionCheckup('gs1');

    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: 'call_service',
      domain: DOMAIN,
      service: SERVICES.TRIGGER_VISION_CHECKUP,
      service_data: { growspace_id: 'gs1' },
      return_response: true,
    });
    expect(result).toEqual(sampleResult);
  });

  it('rethrows errors from sendMessagePromise', async () => {
    const { api, sendMessagePromise } = makeApi();
    sendMessagePromise.mockRejectedValue(new Error('trigger failed'));

    await expect(api.triggerVisionCheckup('gs1')).rejects.toThrow('trigger failed');
  });
});

// ---------------------------------------------------------------------------
// updateVisionCheckupConfig
// ---------------------------------------------------------------------------

describe('updateVisionCheckupConfig', () => {
  it('returns null when hass is not set', async () => {
    const api = new VisionAPI();
    const result = await api.updateVisionCheckupConfig('gs1', sampleConfig);
    expect(result).toBeNull();
  });

  it('spreads config fields into the sendMessagePromise payload', async () => {
    const { api, sendMessagePromise } = makeApi();
    sendMessagePromise.mockResolvedValue({ success: true });

    const result = await api.updateVisionCheckupConfig('gs1', sampleConfig);

    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: WS_TYPE_UPDATE_VISION_CHECKUP_CONFIG,
      growspace_id: 'gs1',
      enabled: true,
      early_check_offset_minutes: 30,
      mid_check_hours: 6,
      late_check_offset_minutes: 60,
    });
    expect(result).toEqual({ success: true });
  });

  it('rethrows errors from sendMessagePromise', async () => {
    const { api, sendMessagePromise } = makeApi();
    sendMessagePromise.mockRejectedValue(new Error('config error'));

    await expect(api.updateVisionCheckupConfig('gs1', sampleConfig)).rejects.toThrow(
      'config error'
    );
  });
});
