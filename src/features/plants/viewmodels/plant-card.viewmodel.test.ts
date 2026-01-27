/**
 * Plant Card ViewModel Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { atom } from 'nanostores';
import { createPlantCardViewModel } from './plant-card.viewmodel';
import type { PlantEntity, StrainEntry } from '../../../types';
import type { GrowspaceStore } from '../../../store/core/growspace-store';

describe('PlantCardViewModel', () => {
  let mockStore: Partial<GrowspaceStore>;
  let mockPlant: PlantEntity;

  beforeEach(() => {
    // Mock store with necessary atoms
    mockStore = {
      ui: {
        $isEditMode: atom(false),
        $selectedPlants: atom(new Set<string>()),
      } as any,
      data: {
        $strainLibrary: atom<StrainEntry[]>([
          {
            strain: 'Test Strain',
            phenotype: 'Pheno A',
            key: 'test-plant-1',
            averageFlowerDays: 60,
            averageVegDays: 30,
          } as StrainEntry,
        ]),
        $nutrientPresets: atom({}),
        $devices: atom([]),
      } as any,
    };

    // Mock plant
    mockPlant = {
      entity_id: 'sensor.test_plant',
      state: 'vegetative',
      attributes: {
        plant_id: 'test-plant-1',
        strain: 'Test Strain',
        phenotype: 'Pheno A',
        stage: 'vegetative',
        growspace_id: 'test-growspace',
        days_in_stage: 15,
        row: 0,
        col: 0,
      },
    } as PlantEntity;
  });

  it('should create view model with correct structure', () => {
    const viewModel = createPlantCardViewModel(mockPlant, mockStore as GrowspaceStore);
    const value = viewModel.get();

    expect(value).toHaveProperty('plant');
    expect(value).toHaveProperty('displayData');
    expect(value).toHaveProperty('isSelected');
    expect(value).toHaveProperty('isEditMode');
    expect(value).toHaveProperty('isDraggable');
    expect(value).toHaveProperty('growthDeviation');
    expect(value).toHaveProperty('statusIndicators');
    expect(value).toHaveProperty('ariaLabel');
    expect(value).toHaveProperty('checkboxAriaLabel');
  });

  it('should compute isSelected correctly', () => {
    const viewModel = createPlantCardViewModel(mockPlant, mockStore as GrowspaceStore);

    // Initially not selected
    expect(viewModel.get().isSelected).toBe(false);

    // Select plant
    mockStore.ui!.$selectedPlants.set(new Set(['test-plant-1']));
    expect(viewModel.get().isSelected).toBe(true);

    // Deselect plant
    mockStore.ui!.$selectedPlants.set(new Set());
    expect(viewModel.get().isSelected).toBe(false);
  });

  it('should compute isEditMode correctly', () => {
    const viewModel = createPlantCardViewModel(mockPlant, mockStore as GrowspaceStore);

    // Initially not in edit mode
    expect(viewModel.get().isEditMode).toBe(false);

    // Enter edit mode
    mockStore.ui!.$isEditMode.set(true);
    expect(viewModel.get().isEditMode).toBe(true);
    expect(viewModel.get().isDraggable).toBe(true); // Should be draggable in edit mode
  });

  it('should compute status indicators correctly', () => {
    const viewModel = createPlantCardViewModel(mockPlant, mockStore as GrowspaceStore);
    const indicators = viewModel.get().statusIndicators;

    expect(indicators).toHaveProperty('hasTraining');
    expect(indicators).toHaveProperty('hasIPM');
    expect(indicators).toHaveProperty('isRecentlyWatered');
    expect(indicators).toHaveProperty('hasProblem');
    expect(indicators).toHaveProperty('hasGrowthDeviation');
    expect(indicators).toHaveProperty('hasRecommendedPreset');
  });

  it('should detect training status', () => {
    const plantWithTraining = {
      ...mockPlant,
      attributes: {
        ...mockPlant.attributes,
        last_training_technique: 'LST',
      },
    };

    const viewModel = createPlantCardViewModel(plantWithTraining, mockStore as GrowspaceStore);
    expect(viewModel.get().statusIndicators.hasTraining).toBe(true);
  });

  it('should detect IPM status', () => {
    const plantWithIPM = {
      ...mockPlant,
      attributes: {
        ...mockPlant.attributes,
        last_ipm: '2024-01-01',
        last_ipm_type: 'Neem Oil',
      },
    };

    const viewModel = createPlantCardViewModel(plantWithIPM, mockStore as GrowspaceStore);
    expect(viewModel.get().statusIndicators.hasIPM).toBe(true);
  });

  it('should detect problem status', () => {
    const plantWithProblem = {
      ...mockPlant,
      attributes: {
        ...mockPlant.attributes,
        problem: 'Nutrient deficiency',
      },
    };

    const viewModel = createPlantCardViewModel(plantWithProblem, mockStore as GrowspaceStore);
    expect(viewModel.get().statusIndicators.hasProblem).toBe(true);
  });

  it('should detect recent watering', () => {
    const now = new Date();
    const recentWatering = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago

    const plantWithWatering = {
      ...mockPlant,
      attributes: {
        ...mockPlant.attributes,
        last_watered: recentWatering.toISOString(),
      },
    };

    const viewModel = createPlantCardViewModel(plantWithWatering, mockStore as GrowspaceStore);
    expect(viewModel.get().statusIndicators.isRecentlyWatered).toBe(true);
  });

  it('should not detect old watering as recent', () => {
    const now = new Date();
    const oldWatering = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48 hours ago

    const plantWithOldWatering = {
      ...mockPlant,
      attributes: {
        ...mockPlant.attributes,
        last_watered: oldWatering.toISOString(),
      },
    };

    const viewModel = createPlantCardViewModel(plantWithOldWatering, mockStore as GrowspaceStore);
    expect(viewModel.get().statusIndicators.isRecentlyWatered).toBe(false);
  });

  it('should generate correct accessibility labels', () => {
    const viewModel = createPlantCardViewModel(mockPlant, mockStore as GrowspaceStore);
    const value = viewModel.get();

    expect(value.ariaLabel).toContain('Test Strain');
    expect(value.ariaLabel).toContain('vegetative');
    expect(value.checkboxAriaLabel).toContain('Test Strain');
  });

  it('should recompute when dependencies change', () => {
    const viewModel = createPlantCardViewModel(mockPlant, mockStore as GrowspaceStore);

    // Initial state
    expect(viewModel.get().isEditMode).toBe(false);

    // Change edit mode
    mockStore.ui!.$isEditMode.set(true);
    expect(viewModel.get().isEditMode).toBe(true);

    // Change selection
    mockStore.ui!.$selectedPlants.set(new Set(['test-plant-1']));
    expect(viewModel.get().isSelected).toBe(true);
  });
});
