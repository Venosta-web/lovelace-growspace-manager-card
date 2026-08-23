import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlantUtils } from '../../src/utils/plant-utils';
import { ChartUtils } from '../../src/utils/chart-utils';
import { PlantStage } from '../../src/types';
// Import component class - note: verify if this needs to be imported as side effect or class
import { GrowspaceLogbook } from '../../src/features/shared/ui/growspace-logbook';

describe('Coverage Top-off', () => {
  describe('PlantUtils', () => {
    it('getPlantStage should handle undefined attributes', () => {
      const plant = { attributes: undefined } as any;
      expect(PlantUtils.getPlantStage(plant)).toBe(PlantStage.SEEDLING);
    });

    it('createGridLayout should handle plants with missing row/col', () => {
      const plants = [{ attributes: { strain: 'A' }, entity_id: 'p1' } as any];
      const { grid } = PlantUtils.createGridLayout(plants, 2, 2);
      // Default row=1, col=1 -> index 0,0
      expect(grid[0][0]).toBeDefined();
      expect(grid[0][0]?.entity_id).toBe('p1');
    });
  });

  describe('ChartUtils', () => {
    it('generateVpdSparklineSegments should handle empty valid points', () => {
      const result = ChartUtils.generateVpdSparklineSegments(
        [],
        100,
        100,
        { day: {} as any, night: {} as any },
        []
      );
      expect(result).toEqual([]);
    });

    it('generateVpdSparklineSegments should handle case with 0 segments generated', () => {
      const result = ChartUtils.generateVpdSparklineSegments(
        [{ last_changed: '2023-01-01T12:00:00Z', state: 'unknown' }],
        100,
        100,
        { day: {} as any, night: {} as any },
        []
      );
      expect(result).toEqual([]);
    });
  });

  describe('GrowspaceLogbook Extra Coverage', () => {
    let element: GrowspaceLogbook;

    beforeEach(() => {
      element = new GrowspaceLogbook();
      // Mock controller
      (element as any)._controller = {
        fetchEventLog: vi.fn().mockResolvedValue([]),
      };
      (element as any)._containerRef = { value: document.createElement('div') };
    });

    it('scrollToTimestamp should handle missing container', () => {
      (element as any)._containerRef = { value: null };
      element.scrollToTimestamp(123);
    });

    it('scrollToTimestamp should handle empty events', () => {
      (element as any)._events = [];
      element.scrollToTimestamp(123);
    });

    it('scrollToTimestamp should scroll to element if found', async () => {
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: any) => {
        cb(0);
        return 0;
      });

      const mockEl = { scrollIntoView: vi.fn() };
      const mockContainer = {
        querySelector: vi.fn().mockReturnValue(mockEl),
      };
      (element as any)._containerRef = { value: mockContainer };
      (element as any)._events = [{ timestamp: 100 }, { timestamp: 200 }];

      element.scrollToTimestamp(150);

      // Wait for requestAnimationFrame - effectively just wait a tick since tests run in jsdom
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockContainer.querySelector).toHaveBeenCalled();
      expect(mockEl.scrollIntoView).toHaveBeenCalled();

      rafSpy.mockRestore();
    });
  });
});
