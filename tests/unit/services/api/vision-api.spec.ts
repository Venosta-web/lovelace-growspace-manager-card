import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VisionAPI } from '../../../../src/services/api/vision-api';
import {
  WS_TYPE_GET_VISION_HISTORY,
  WS_TYPE_UPDATE_VISION_CHECKUP_CONFIG,
  SERVICES,
} from '../../../../src/lib/constants';
import type { VisionCheckupConfig } from '../../../../src/slices/camera';

let sendMessagePromiseMock: ReturnType<typeof vi.fn>;
let mockHass: any;
let api: VisionAPI;

beforeEach(() => {
  sendMessagePromiseMock = vi.fn().mockResolvedValue({});
  mockHass = {
    connection: { sendMessagePromise: sendMessagePromiseMock },
  };
  api = new VisionAPI(mockHass);
});

describe('VisionAPI — getVisionHistory', () => {
  it('returns null without calling WS when hass is not set', async () => {
    const noHassApi = new VisionAPI();
    const result = await noHassApi.getVisionHistory('gs-1');
    expect(result).toBeNull();
    expect(sendMessagePromiseMock).not.toHaveBeenCalled();
  });

  it('sends correct WS message with growspace_id and default limit', async () => {
    const response = { history: [], total: 0 };
    sendMessagePromiseMock.mockResolvedValue(response);
    await api.getVisionHistory('gs-1');
    expect(sendMessagePromiseMock).toHaveBeenCalledWith({
      type: WS_TYPE_GET_VISION_HISTORY,
      growspace_id: 'gs-1',
      limit: 10,
    });
  });

  it('passes custom limit to WS message', async () => {
    sendMessagePromiseMock.mockResolvedValue({ history: [], total: 0 });
    await api.getVisionHistory('gs-1', 5);
    expect(sendMessagePromiseMock).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5 }),
    );
  });

  it('returns the WS response on success', async () => {
    const response = { history: [{ id: '1' } as any], total: 1 };
    sendMessagePromiseMock.mockResolvedValue(response);
    const result = await api.getVisionHistory('gs-1');
    expect(result).toEqual(response);
  });

  it('re-throws and logs when WS throws', async () => {
    const error = new Error('network error');
    sendMessagePromiseMock.mockRejectedValue(error);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(api.getVisionHistory('gs-1')).rejects.toThrow('network error');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('VisionAPI — triggerVisionCheckup', () => {
  it('returns null without calling WS when hass is not set', async () => {
    const noHassApi = new VisionAPI();
    const result = await noHassApi.triggerVisionCheckup('gs-1');
    expect(result).toBeNull();
    expect(sendMessagePromiseMock).not.toHaveBeenCalled();
  });

  it('sends WS message with return_response: true', async () => {
    sendMessagePromiseMock.mockResolvedValue({ id: 'r1' } as any);
    await api.triggerVisionCheckup('gs-1');
    expect(sendMessagePromiseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        service: SERVICES.TRIGGER_VISION_CHECKUP,
        return_response: true,
        service_data: { growspace_id: 'gs-1' },
      }),
    );
  });

  it('returns the WS response on success', async () => {
    const response = { id: 'r1', score: 0.9 } as any;
    sendMessagePromiseMock.mockResolvedValue(response);
    const result = await api.triggerVisionCheckup('gs-1');
    expect(result).toEqual(response);
  });

  it('re-throws and logs when WS throws', async () => {
    sendMessagePromiseMock.mockRejectedValue(new Error('vision error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(api.triggerVisionCheckup('gs-1')).rejects.toThrow('vision error');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('VisionAPI — updateVisionCheckupConfig', () => {
  const config: VisionCheckupConfig = { enabled: true, interval_hours: 6 } as any;

  it('returns null without calling WS when hass is not set', async () => {
    const noHassApi = new VisionAPI();
    const result = await noHassApi.updateVisionCheckupConfig('gs-1', config);
    expect(result).toBeNull();
    expect(sendMessagePromiseMock).not.toHaveBeenCalled();
  });

  it('sends WS message with growspace_id and spread config', async () => {
    sendMessagePromiseMock.mockResolvedValue({ success: true });
    await api.updateVisionCheckupConfig('gs-1', config);
    expect(sendMessagePromiseMock).toHaveBeenCalledWith({
      type: WS_TYPE_UPDATE_VISION_CHECKUP_CONFIG,
      growspace_id: 'gs-1',
      ...config,
    });
  });

  it('returns the WS response on success', async () => {
    sendMessagePromiseMock.mockResolvedValue({ success: true });
    const result = await api.updateVisionCheckupConfig('gs-1', config);
    expect(result).toEqual({ success: true });
  });

  it('re-throws and logs when WS throws', async () => {
    sendMessagePromiseMock.mockRejectedValue(new Error('config error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(api.updateVisionCheckupConfig('gs-1', config)).rejects.toThrow('config error');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
