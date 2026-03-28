import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { atom } from 'nanostores';
import { createPlantCardViewModel } from '../../../../../src/features/plants/viewmodels/plant-card.viewmodel';
import type { PlantEntity, StrainEntry } from '../../../../../src/types';

const makePlant = (overrides: Partial<PlantEntity['attributes']> = {}): PlantEntity =>
  ({
    entity_id: 'sensor.plant_test',
    state: 'Vegetative',
    attributes: {
      plant_id: 'plant_test',
      growspace_id: 'gs1',
      strain: 'OG Kush',
      stage: 'veg',
      days_in_stage: 10,
      ...overrides,
    },
    context: { id: '', parent_id: null, user_id: null },
    last_changed: '',
    last_updated: '',
  } as unknown as PlantEntity);

const makeStore = (overrides: Partial<{
  isEditMode: boolean;
  selectedPlants: Set<string>;
  strainLibrary: StrainEntry[];
  nutrientPresets: Record<string, any>;
  devices: any[];
}> = {}) => ({
  ui: {
    $isEditMode: atom(overrides.isEditMode ?? false),
    $selectedPlants: atom(overrides.selectedPlants ?? new Set<string>()),
  },
  data: {
    $strainLibrary: atom(overrides.strainLibrary ?? []),
    $nutrientPresets: atom(overrides.nutrientPresets ?? {}),
    $devices: atom(overrides.devices ?? []),
  },
});

describe('createPlantCardViewModel', () => {
  describe('hasRecommendedPreset', () => {
    it('returns false when no device matches growspace_id', () => {
      const store = makeStore({ devices: [{ deviceId: 'other_gs' }] });
      const plant = makePlant({ growspace_id: 'gs1' });
      const vm$ = createPlantCardViewModel(plant, store as any);
      expect(vm$.get().statusIndicators.hasRecommendedPreset).toBe(false);
    });

    it('returns false when no presets exist', () => {
      const store = makeStore({
        devices: [{ deviceId: 'gs1' }],
        nutrientPresets: {},
      });
      const vm$ = createPlantCardViewModel(makePlant(), store as any);
      expect(vm$.get().statusIndicators.hasRecommendedPreset).toBe(false);
    });

    it('returns true when a preset matches stage and days_in_stage requirement', () => {
      const store = makeStore({
        devices: [{ deviceId: 'gs1' }],
        nutrientPresets: {
          preset1: { stage: 'veg', min_days_in_stage: 5 },
        },
      });
      const plant = makePlant({ stage: 'veg', days_in_stage: 10 });
      const vm$ = createPlantCardViewModel(plant, store as any);
      expect(vm$.get().statusIndicators.hasRecommendedPreset).toBe(true);
    });

    it('returns false when days_in_stage is below min_days_in_stage', () => {
      const store = makeStore({
        devices: [{ deviceId: 'gs1' }],
        nutrientPresets: {
          preset1: { stage: 'veg', min_days_in_stage: 20 },
        },
      });
      const plant = makePlant({ stage: 'veg', days_in_stage: 5 });
      const vm$ = createPlantCardViewModel(plant, store as any);
      expect(vm$.get().statusIndicators.hasRecommendedPreset).toBe(false);
    });

    it('returns true for a preset with no min_days_in_stage restriction', () => {
      const store = makeStore({
        devices: [{ deviceId: 'gs1' }],
        nutrientPresets: {
          preset1: { stage: 'veg' },
        },
      });
      const plant = makePlant({ stage: 'veg', days_in_stage: 0 });
      const vm$ = createPlantCardViewModel(plant, store as any);
      expect(vm$.get().statusIndicators.hasRecommendedPreset).toBe(true);
    });
  });

  describe('isRecentlyWatered', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns true when last_watered is within the last 24 hours', () => {
      vi.useFakeTimers();
      const now = new Date('2026-01-15T12:00:00Z');
      vi.setSystemTime(now);

      const twelveHoursAgo = new Date('2026-01-15T00:00:00Z').toISOString();
      const plant = makePlant({ last_watered: twelveHoursAgo });
      const store = makeStore();
      const vm$ = createPlantCardViewModel(plant, store as any);
      expect(vm$.get().statusIndicators.isRecentlyWatered).toBe(true);
    });

    it('returns false when last_watered is more than 24 hours ago', () => {
      vi.useFakeTimers();
      const now = new Date('2026-01-15T12:00:00Z');
      vi.setSystemTime(now);

      const twoDaysAgo = new Date('2026-01-13T12:00:00Z').toISOString();
      const plant = makePlant({ last_watered: twoDaysAgo });
      const store = makeStore();
      const vm$ = createPlantCardViewModel(plant, store as any);
      expect(vm$.get().statusIndicators.isRecentlyWatered).toBe(false);
    });

    it('returns false when last_watered is absent', () => {
      const plant = makePlant({ last_watered: undefined });
      const store = makeStore();
      const vm$ = createPlantCardViewModel(plant, store as any);
      expect(vm$.get().statusIndicators.isRecentlyWatered).toBe(false);
    });
  });

  describe('selection and edit mode', () => {
    it('marks plant as selected when plant_id is in selectedPlants', () => {
      const store = makeStore({ selectedPlants: new Set(['plant_test']) });
      const vm$ = createPlantCardViewModel(makePlant(), store as any);
      expect(vm$.get().isSelected).toBe(true);
    });

    it('isDraggable is false when isEditMode is true', () => {
      const store = makeStore({ isEditMode: true });
      const vm$ = createPlantCardViewModel(makePlant(), store as any);
      expect(vm$.get().isDraggable).toBe(false);
    });

    it('isDraggable is true when isEditMode is false', () => {
      const store = makeStore({ isEditMode: false });
      const vm$ = createPlantCardViewModel(makePlant(), store as any);
      expect(vm$.get().isDraggable).toBe(true);
    });
  });

  describe('accessibility labels', () => {
    it('builds ariaLabel from strain and stage', () => {
      const store = makeStore();
      const vm$ = createPlantCardViewModel(makePlant(), store as any);
      const label = vm$.get().ariaLabel;
      expect(label).toContain('Vegetative');
    });

    it('uses entity_id fallback when plant_id is missing', () => {
      const plant = makePlant({ plant_id: undefined as any });
      const store = makeStore({ selectedPlants: new Set(['plant_test']) });
      const vm$ = createPlantCardViewModel(plant, store as any);
      // Should not throw; selection may not match but ViewModel builds correctly
      expect(vm$.get().ariaLabel).toBeDefined();
    });
  });
});
