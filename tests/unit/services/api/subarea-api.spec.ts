import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubareaAPI } from '../../../../src/services/api/subarea-api';
import { HomeAssistant } from 'custom-card-helpers';
import {
  WS_TYPE_GET_SUBAREAS,
  WS_TYPE_ADD_SUBAREA,
  WS_TYPE_UPDATE_SUBAREA,
  WS_TYPE_REMOVE_SUBAREA,
} from '../../../../src/lib/constants';

describe('SubareaAPI', () => {
  let api: SubareaAPI;
  let mockHass: HomeAssistant;
  let sendMessagePromiseMock: any;

  beforeEach(() => {
    sendMessagePromiseMock = vi.fn().mockResolvedValue({});
    mockHass = {
      connection: {
        sendMessagePromise: sendMessagePromiseMock,
      },
    } as any;
    api = new SubareaAPI(mockHass);
  });

  describe('getSubareas', () => {
    it('should fetch subareas for a growspace', async () => {
      const mockResponse = [{ id: 's1', name: 'S1' }];
      sendMessagePromiseMock.mockResolvedValue(mockResponse);

      const result = await api.getSubareas('g1');

      expect(sendMessagePromiseMock).toHaveBeenCalledWith({
        type: WS_TYPE_GET_SUBAREAS,
        growspace_id: 'g1',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should return empty array if hass is missing', async () => {
      const noHassApi = new SubareaAPI(undefined);
      const result = await noHassApi.getSubareas('g1');
      expect(result).toEqual([]);
    });

    it('should throw error and log it on failure', async () => {
      const error = new Error('WS Error');
      sendMessagePromiseMock.mockRejectedValue(error);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(api.getSubareas('g1')).rejects.toThrow('WS Error');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to get subareas'), error);
    });
  });

  describe('addSubarea', () => {
    it('should add a subarea', async () => {
      const mockResponse = { id: 's1', name: 'New Subarea' };
      sendMessagePromiseMock.mockResolvedValue(mockResponse);

      const result = await api.addSubarea('g1', 'New Subarea');

      expect(sendMessagePromiseMock).toHaveBeenCalledWith({
        type: WS_TYPE_ADD_SUBAREA,
        growspace_id: 'g1',
        name: 'New Subarea',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw if hass is missing', async () => {
      const noHassApi = new SubareaAPI(undefined);
      await expect(noHassApi.addSubarea('g1', 'N')).rejects.toThrow('Hass instance is missing');
    });

    it('should handle failure', async () => {
      const error = new Error('Add Fail');
      sendMessagePromiseMock.mockRejectedValue(error);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(api.addSubarea('g1', 'N')).rejects.toThrow('Add Fail');
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('updateSubarea', () => {
    it('should update a subarea config', async () => {
      const config = { temperature_sensors: ['sensor.t1'] };
      const mockResponse = { id: 's1', environment_config: config };
      sendMessagePromiseMock.mockResolvedValue(mockResponse);

      const result = await api.updateSubarea('g1', 's1', config);

      expect(sendMessagePromiseMock).toHaveBeenCalledWith({
        type: WS_TYPE_UPDATE_SUBAREA,
        growspace_id: 'g1',
        subarea_id: 's1',
        environment_config: config,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw if hass is missing', async () => {
      const noHassApi = new SubareaAPI(undefined);
      await expect(noHassApi.updateSubarea('g1', 's1', {})).rejects.toThrow('Hass instance is missing');
    });

    it('should handle failure', async () => {
      sendMessagePromiseMock.mockRejectedValue(new Error('Update Fail'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(api.updateSubarea('g1', 's1', {})).rejects.toThrow('Update Fail');
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('removeSubarea', () => {
    it('should remove a subarea', async () => {
      sendMessagePromiseMock.mockResolvedValue({ success: true });

      await api.removeSubarea('g1', 's1');

      expect(sendMessagePromiseMock).toHaveBeenCalledWith({
        type: WS_TYPE_REMOVE_SUBAREA,
        growspace_id: 'g1',
        subarea_id: 's1',
      });
    });

    it('should throw if hass is missing', async () => {
      const noHassApi = new SubareaAPI(undefined);
      await expect(noHassApi.removeSubarea('g1', 's1')).rejects.toThrow('Hass instance is missing');
    });

    it('should handle failure', async () => {
      sendMessagePromiseMock.mockRejectedValue(new Error('Remove Fail'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(api.removeSubarea('g1', 's1')).rejects.toThrow('Remove Fail');
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
