import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VisionAPI } from '../../../../src/services/api/vision-api';
import {
  WS_TYPE_GET_VISION_HISTORY,
  WS_TYPE_UPDATE_VISION_CHECKUP_CONFIG,
  SERVICES,
} from '../../../../src/lib/constants';

describe('VisionAPI', () => {
  let api: VisionAPI;
  let sendMessagePromise: ReturnType<typeof vi.fn>;
  let mockHass: any;

  beforeEach(() => {
    api = new VisionAPI();
    sendMessagePromise = vi.fn();
    mockHass = { connection: { sendMessagePromise } };
  });

  describe('getVisionHistory', () => {
    it('returns null when hass not set', async () => {
      expect(await api.getVisionHistory('gs1')).toBeNull();
    });

    it('sends correct WS message', async () => {
      const mockResp = { history: [], total: 0 };
      sendMessagePromise.mockResolvedValue(mockResp);
      api.updateHass(mockHass);
      const result = await api.getVisionHistory('gs1');
      expect(sendMessagePromise).toHaveBeenCalledWith({
        type: WS_TYPE_GET_VISION_HISTORY,
        growspace_id: 'gs1',
        limit: 10,
      });
      expect(result).toEqual(mockResp);
    });

    it('rethrows errors', async () => {
      sendMessagePromise.mockRejectedValue(new Error('WS fail'));
      api.updateHass(mockHass);
      await expect(api.getVisionHistory('gs1')).rejects.toThrow('WS fail');
    });
  });

  describe('triggerVisionCheckup', () => {
    it('returns null when hass not set', async () => {
      expect(await api.triggerVisionCheckup('gs1')).toBeNull();
    });

    it('sends service call with return_response', async () => {
      const mockResult = { severity: 'low', analysis: 'All good' };
      sendMessagePromise.mockResolvedValue(mockResult);
      api.updateHass(mockHass);
      const result = await api.triggerVisionCheckup('gs1');
      expect(sendMessagePromise).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'call_service',
          domain: 'growspace_manager',
          service: SERVICES.TRIGGER_VISION_CHECKUP,
          service_data: { growspace_id: 'gs1' },
          return_response: true,
        })
      );
      expect(result).toEqual(mockResult);
    });

    it('rethrows errors', async () => {
      sendMessagePromise.mockRejectedValue(new Error('No cameras'));
      api.updateHass(mockHass);
      await expect(api.triggerVisionCheckup('gs1')).rejects.toThrow('No cameras');
    });
  });

  describe('updateVisionCheckupConfig', () => {
    it('returns null when hass not set', async () => {
      expect(await api.updateVisionCheckupConfig('gs1', { enabled: true } as any)).toBeNull();
    });

    it('sends correct WS message', async () => {
      sendMessagePromise.mockResolvedValue({ success: true });
      api.updateHass(mockHass);
      const config = { enabled: true, early_check_offset_minutes: 90, mid_check_hours: 8, late_check_offset_minutes: 45 };
      await api.updateVisionCheckupConfig('gs1', config);
      expect(sendMessagePromise).toHaveBeenCalledWith({
        type: WS_TYPE_UPDATE_VISION_CHECKUP_CONFIG,
        growspace_id: 'gs1',
        ...config,
      });
    });

    it('rethrows errors', async () => {
      sendMessagePromise.mockRejectedValue(new Error('Save fail'));
      api.updateHass(mockHass);
      await expect(api.updateVisionCheckupConfig('gs1', {} as any)).rejects.toThrow('Save fail');
    });
  });
});
