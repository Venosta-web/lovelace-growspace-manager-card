import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IrrigationAPI } from '../../../../src/services/api/irrigation-api';
import { DOMAIN, SERVICES } from '../../../../src/lib/constants';
import type { ECTargetRange } from '../../../../src/services/types';

let callServiceMock: ReturnType<typeof vi.fn>;
let mockHass: any;
let api: IrrigationAPI;

beforeEach(() => {
  callServiceMock = vi.fn().mockResolvedValue(undefined);
  mockHass = {
    callService: callServiceMock,
    callWS: vi.fn().mockResolvedValue({}),
    connection: { sendMessagePromise: vi.fn().mockResolvedValue({}) },
  };
  api = new IrrigationAPI(mockHass);
});

describe('IrrigationAPI — configureDrainMonitoring', () => {
  it('sends only growspace_id when params are empty', async () => {
    await api.configureDrainMonitoring('gs-1', {});
    expect(callServiceMock).toHaveBeenCalledWith(DOMAIN, SERVICES.CONFIGURE_DRAIN_MONITORING, {
      growspace_id: 'gs-1',
    });
  });

  it('includes enabled: true in payload', async () => {
    await api.configureDrainMonitoring('gs-1', { enabled: true });
    expect(callServiceMock).toHaveBeenCalledWith(
      DOMAIN,
      SERVICES.CONFIGURE_DRAIN_MONITORING,
      expect.objectContaining({ enabled: true }),
    );
  });

  it('includes enabled: false in payload (falsy but defined)', async () => {
    await api.configureDrainMonitoring('gs-1', { enabled: false });
    expect(callServiceMock).toHaveBeenCalledWith(
      DOMAIN,
      SERVICES.CONFIGURE_DRAIN_MONITORING,
      expect.objectContaining({ enabled: false }),
    );
  });

  it('maps maxEcDelta to max_ec_delta', async () => {
    await api.configureDrainMonitoring('gs-1', { maxEcDelta: 0.5 });
    expect(callServiceMock).toHaveBeenCalledWith(
      DOMAIN,
      SERVICES.CONFIGURE_DRAIN_MONITORING,
      expect.objectContaining({ max_ec_delta: 0.5 }),
    );
  });

  it('maps targetRunoffPercent to target_runoff_percent', async () => {
    await api.configureDrainMonitoring('gs-1', { targetRunoffPercent: 20 });
    expect(callServiceMock).toHaveBeenCalledWith(
      DOMAIN,
      SERVICES.CONFIGURE_DRAIN_MONITORING,
      expect.objectContaining({ target_runoff_percent: 20 }),
    );
  });

  it('includes all optional fields when all are provided', async () => {
    await api.configureDrainMonitoring('gs-1', {
      enabled: true,
      maxEcDelta: 0.5,
      targetRunoffPercent: 20,
    });
    expect(callServiceMock).toHaveBeenCalledWith(DOMAIN, SERVICES.CONFIGURE_DRAIN_MONITORING, {
      growspace_id: 'gs-1',
      enabled: true,
      max_ec_delta: 0.5,
      target_runoff_percent: 20,
    });
  });

  it('omits keys when values are explicitly undefined', async () => {
    await api.configureDrainMonitoring('gs-1', {
      enabled: undefined,
      maxEcDelta: undefined,
    });
    const payload = callServiceMock.mock.calls[0][2];
    expect(payload).not.toHaveProperty('enabled');
    expect(payload).not.toHaveProperty('max_ec_delta');
  });
});

describe('IrrigationAPI — logDrainReading', () => {
  it('sends only required fields when no volumes provided', async () => {
    await api.logDrainReading('gs-1', { feedEc: 2.0, drainEc: 2.4 });
    expect(callServiceMock).toHaveBeenCalledWith(DOMAIN, SERVICES.LOG_DRAIN_READING, {
      growspace_id: 'gs-1',
      feed_ec: 2.0,
      drain_ec: 2.4,
    });
  });

  it('maps feedVolumeMl to feed_volume_ml', async () => {
    await api.logDrainReading('gs-1', { feedEc: 2.0, drainEc: 2.4, feedVolumeMl: 500 });
    expect(callServiceMock).toHaveBeenCalledWith(
      DOMAIN,
      SERVICES.LOG_DRAIN_READING,
      expect.objectContaining({ feed_volume_ml: 500 }),
    );
  });

  it('maps drainVolumeMl to drain_volume_ml', async () => {
    await api.logDrainReading('gs-1', { feedEc: 2.0, drainEc: 2.4, drainVolumeMl: 150 });
    expect(callServiceMock).toHaveBeenCalledWith(
      DOMAIN,
      SERVICES.LOG_DRAIN_READING,
      expect.objectContaining({ drain_volume_ml: 150 }),
    );
  });

  it('includes both volume fields when both are provided', async () => {
    await api.logDrainReading('gs-1', {
      feedEc: 2.0,
      drainEc: 2.4,
      feedVolumeMl: 500,
      drainVolumeMl: 150,
    });
    expect(callServiceMock).toHaveBeenCalledWith(DOMAIN, SERVICES.LOG_DRAIN_READING, {
      growspace_id: 'gs-1',
      feed_ec: 2.0,
      drain_ec: 2.4,
      feed_volume_ml: 500,
      drain_volume_ml: 150,
    });
  });

  it('omits volume keys when explicitly undefined', async () => {
    await api.logDrainReading('gs-1', {
      feedEc: 2.0,
      drainEc: 2.4,
      feedVolumeMl: undefined,
      drainVolumeMl: undefined,
    });
    const payload = callServiceMock.mock.calls[0][2];
    expect(payload).not.toHaveProperty('feed_volume_ml');
    expect(payload).not.toHaveProperty('drain_volume_ml');
  });
});

describe('IrrigationAPI — setEcTargetRanges', () => {
  it('does not call service when ranges array is empty', async () => {
    await api.setEcTargetRanges('gs-1', []);
    expect(callServiceMock).not.toHaveBeenCalled();
  });

  it('calls service once for a single range with correct payload', async () => {
    const ranges: ECTargetRange[] = [{ stage: 'veg', minEc: 1.2, maxEc: 1.8 }];
    await api.setEcTargetRanges('gs-1', ranges);
    expect(callServiceMock).toHaveBeenCalledTimes(1);
    expect(callServiceMock).toHaveBeenCalledWith(DOMAIN, SERVICES.SET_EC_TARGET_RANGE, {
      growspace_id: 'gs-1',
      stage: 'veg',
      feed_ec_min: 1.2,
      feed_ec_max: 1.8,
    });
  });

  it('calls service once per range (not one batched call)', async () => {
    const ranges: ECTargetRange[] = [
      { stage: 'veg', minEc: 1.2, maxEc: 1.8 },
      { stage: 'flower_early', minEc: 1.5, maxEc: 2.2 },
    ];
    await api.setEcTargetRanges('gs-1', ranges);
    expect(callServiceMock).toHaveBeenCalledTimes(2);
    expect(callServiceMock).toHaveBeenNthCalledWith(1, DOMAIN, SERVICES.SET_EC_TARGET_RANGE, {
      growspace_id: 'gs-1',
      stage: 'veg',
      feed_ec_min: 1.2,
      feed_ec_max: 1.8,
    });
    expect(callServiceMock).toHaveBeenNthCalledWith(2, DOMAIN, SERVICES.SET_EC_TARGET_RANGE, {
      growspace_id: 'gs-1',
      stage: 'flower_early',
      feed_ec_min: 1.5,
      feed_ec_max: 2.2,
    });
  });
});

describe('IrrigationAPI — getIrrigationAnalytics', () => {
  it('returns data from sendWebSocketSafe on success', async () => {
    const data = { growspace_id: 'gs-1', stage_aggregates: { veg: 3 } };
    mockHass.callWS = vi.fn().mockResolvedValue(data);
    const result = await api.getIrrigationAnalytics('gs-1');
    expect(result).toEqual(data);
  });

  it('returns null when WebSocket call fails', async () => {
    mockHass.callWS = vi.fn().mockRejectedValue(new Error('ws error'));
    const result = await api.getIrrigationAnalytics('gs-1');
    expect(result).toBeNull();
  });
});
