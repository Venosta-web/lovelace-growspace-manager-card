import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionContext } from '../../src/store/core/action-context';
import {
  logDryingWeight,
  logMoistureReading,
  setVisualTag,
} from '../../src/store/plant/drying-actions';

describe('drying-actions', () => {
  let ctx: ActionContext;
  let mockDataService: {
    logDryingWeight: any;
    logMoistureReading: any;
    setVisualTag: any;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDataService = {
      logDryingWeight: vi.fn().mockResolvedValue(undefined),
      logMoistureReading: vi.fn().mockResolvedValue(undefined),
      setVisualTag: vi.fn().mockResolvedValue(undefined),
    };

    ctx = {
      dataService: mockDataService as any,
      showToast: vi.fn(),
      closeDialog: vi.fn(),
      undoRedoManager: { pushAction: vi.fn() },
      refreshData: vi.fn().mockResolvedValue(undefined),
      ui: {
          showToast: vi.fn(),
        deselectPlants: vi.fn(),
        $activeDialog: { get: vi.fn().mockReturnValue({ type: 'NONE' }) },
        $isEditMode: { get: vi.fn().mockReturnValue(false) },
        setEditMode: vi.fn(),
        clearPlantSelection: vi.fn()
      },
      data: {
        $devices: { get: vi.fn().mockReturnValue([]), set: vi.fn() },
        addOptimisticDeletedPlantId: vi.fn(),
        removeOptimisticDeletedPlantId: vi.fn(),
        updateWsDataCacheGrid: vi.fn()
      } as any,
      grid: {
        $selectedDevice: { get: vi.fn() },
      } as any,
      optimisticManager: {
        applyOptimisticUpdate: vi.fn(),
        confirmUpdate: vi.fn(),
        rollbackUpdate: vi.fn()
      } as any
    } as any;
  });

  describe('logDryingWeight', () => {
    it('should successfully log drying weight and show success toast', async () => {
      await logDryingWeight(ctx, 'plant-123', 50.5, '2026-05-19');

      expect(mockDataService.logDryingWeight).toHaveBeenCalledWith({
        plant_id: 'plant-123',
        weight_grams: 50.5,
        date: '2026-05-19',
      });
      expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Weight logged', 'success');
    });

    it('should show error toast and throw error when logDryingWeight fails with Error object', async () => {
      const mockError = new Error('Database connection failed');
      mockDataService.logDryingWeight.mockRejectedValueOnce(mockError);

      await expect(logDryingWeight(ctx, 'plant-123', 50.5)).rejects.toThrow(mockError);

      expect(mockDataService.logDryingWeight).toHaveBeenCalledWith({
        plant_id: 'plant-123',
        weight_grams: 50.5,
        date: undefined,
      });
      expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Failed to log weight: Database connection failed', 'error');
    });

    it('should show error toast with Unknown error and throw error when logDryingWeight fails with non-Error object', async () => {
      mockDataService.logDryingWeight.mockRejectedValueOnce('Some string error');

      await expect(logDryingWeight(ctx, 'plant-123', 50.5)).rejects.toEqual('Some string error');

      expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Failed to log weight: Unknown error', 'error');
    });
  });

  describe('logMoistureReading', () => {
    it('should successfully log moisture reading and show success toast', async () => {
      await logMoistureReading(ctx, 'plant-123', 12.3, '2026-05-19');

      expect(mockDataService.logMoistureReading).toHaveBeenCalledWith({
        plant_id: 'plant-123',
        moisture_percent: 12.3,
        date: '2026-05-19',
      });
      expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Moisture logged', 'success');
    });

    it('should show error toast and throw error when logMoistureReading fails with Error object', async () => {
      const mockError = new Error('Network timeout');
      mockDataService.logMoistureReading.mockRejectedValueOnce(mockError);

      await expect(logMoistureReading(ctx, 'plant-123', 12.3)).rejects.toThrow(mockError);

      expect(mockDataService.logMoistureReading).toHaveBeenCalledWith({
        plant_id: 'plant-123',
        moisture_percent: 12.3,
        date: undefined,
      });
      expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Failed to log moisture: Network timeout', 'error');
    });

    it('should show error toast with Unknown error and throw error when logMoistureReading fails with non-Error object', async () => {
      mockDataService.logMoistureReading.mockRejectedValueOnce({ custom: 'object error' });

      await expect(logMoistureReading(ctx, 'plant-123', 12.3)).rejects.toEqual({ custom: 'object error' });

      expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Failed to log moisture: Unknown error', 'error');
    });
  });

  describe('setVisualTag', () => {
    it('should successfully set visual tag and show success toast', async () => {
      await setVisualTag(ctx, 'plant-123', 'Trichomes Cloudy');

      expect(mockDataService.setVisualTag).toHaveBeenCalledWith({
        plant_id: 'plant-123',
        visual_tag: 'Trichomes Cloudy',
      });
      expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Visual tag saved', 'success');
    });

    it('should successfully set visual tag to null and show success toast', async () => {
      await setVisualTag(ctx, 'plant-123', null);

      expect(mockDataService.setVisualTag).toHaveBeenCalledWith({
        plant_id: 'plant-123',
        visual_tag: null,
      });
      expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Visual tag saved', 'success');
    });

    it('should show error toast and throw error when setVisualTag fails with Error object', async () => {
      const mockError = new Error('Validation failed');
      mockDataService.setVisualTag.mockRejectedValueOnce(mockError);

      await expect(setVisualTag(ctx, 'plant-123', 'test-tag')).rejects.toThrow(mockError);

      expect(mockDataService.setVisualTag).toHaveBeenCalledWith({
        plant_id: 'plant-123',
        visual_tag: 'test-tag',
      });
      expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Failed to save visual tag: Validation failed', 'error');
    });

    it('should show error toast with Unknown error and throw error when setVisualTag fails with non-Error object', async () => {
      mockDataService.setVisualTag.mockRejectedValueOnce(null);

      await expect(setVisualTag(ctx, 'plant-123', 'test-tag')).rejects.toBeNull();

      expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Failed to save visual tag: Unknown error', 'error');
    });
  });
});
