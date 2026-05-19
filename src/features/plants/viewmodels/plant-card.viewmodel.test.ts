/**
 * Plant Card ViewModel Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { atom, type WritableAtom } from 'nanostores';
import { createPlantCardViewModel, type PlantCardAtoms } from './plant-card.viewmodel';
import type { PlantEntity, StrainEntry } from '../../../types';

describe('PlantCardViewModel', () => {
  let $plant: WritableAtom<PlantEntity | null>;
  let deps: PlantCardAtoms;
  let mockPlant: PlantEntity;

  beforeEach(() => {
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

    $plant = atom<PlantEntity | null>(mockPlant);

    deps = {
      $isEditMode: atom(false),
      $selectedPlants: atom(new Set<string>()),
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
    };
  });

  it('should return null when plant is null', () => {
    $plant.set(null);
    const viewModel = createPlantCardViewModel($plant, deps);
    expect(viewModel.get()).toBeNull();
  });

  it('should create view model with correct structure', () => {
    const viewModel = createPlantCardViewModel($plant, deps);
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
    const viewModel = createPlantCardViewModel($plant, deps);

    expect(viewModel.get()!.isSelected).toBe(false);

    (deps.$selectedPlants as WritableAtom<Set<string>>).set(new Set(['test-plant-1']));
    expect(viewModel.get()!.isSelected).toBe(true);

    (deps.$selectedPlants as WritableAtom<Set<string>>).set(new Set());
    expect(viewModel.get()!.isSelected).toBe(false);
  });

  it('should compute isEditMode correctly', () => {
    const viewModel = createPlantCardViewModel($plant, deps);

    expect(viewModel.get()!.isEditMode).toBe(false);

    (deps.$isEditMode as WritableAtom<boolean>).set(true);
    expect(viewModel.get()!.isEditMode).toBe(true);
    expect(viewModel.get()!.isDraggable).toBe(false);
  });

  it('should recompute when plant entity changes', () => {
    const viewModel = createPlantCardViewModel($plant, deps);
    expect(viewModel.get()!.statusIndicators.hasTraining).toBe(false);

    $plant.set({
      ...mockPlant,
      attributes: { ...mockPlant.attributes, last_training_technique: 'LST' },
    });
    expect(viewModel.get()!.statusIndicators.hasTraining).toBe(true);
  });

  it('should compute status indicators correctly', () => {
    const viewModel = createPlantCardViewModel($plant, deps);
    const indicators = viewModel.get()!.statusIndicators;

    expect(indicators).toHaveProperty('hasTraining');
    expect(indicators).toHaveProperty('hasIPM');
    expect(indicators).toHaveProperty('isRecentlyWatered');
    expect(indicators).toHaveProperty('hasProblem');
    expect(indicators).toHaveProperty('hasGrowthDeviation');
    expect(indicators).toHaveProperty('hasRecommendedPreset');
  });

  it('should detect training status', () => {
    $plant.set({ ...mockPlant, attributes: { ...mockPlant.attributes, last_training_technique: 'LST' } });
    const viewModel = createPlantCardViewModel($plant, deps);
    expect(viewModel.get()!.statusIndicators.hasTraining).toBe(true);
  });

  it('should detect IPM status', () => {
    $plant.set({ ...mockPlant, attributes: { ...mockPlant.attributes, last_ipm: '2024-01-01', last_ipm_type: 'Neem Oil' } });
    const viewModel = createPlantCardViewModel($plant, deps);
    expect(viewModel.get()!.statusIndicators.hasIPM).toBe(true);
  });

  it('should detect problem status', () => {
    $plant.set({ ...mockPlant, attributes: { ...mockPlant.attributes, problem: 'Nutrient deficiency' } });
    const viewModel = createPlantCardViewModel($plant, deps);
    expect(viewModel.get()!.statusIndicators.hasProblem).toBe(true);
  });

  it('should detect recent watering', () => {
    const recentWatering = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    $plant.set({ ...mockPlant, attributes: { ...mockPlant.attributes, last_watered: recentWatering } });
    const viewModel = createPlantCardViewModel($plant, deps);
    expect(viewModel.get()!.statusIndicators.isRecentlyWatered).toBe(true);
  });

  it('should not detect old watering as recent', () => {
    const oldWatering = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    $plant.set({ ...mockPlant, attributes: { ...mockPlant.attributes, last_watered: oldWatering } });
    const viewModel = createPlantCardViewModel($plant, deps);
    expect(viewModel.get()!.statusIndicators.isRecentlyWatered).toBe(false);
  });

  it('should generate correct accessibility labels', () => {
    const viewModel = createPlantCardViewModel($plant, deps);
    const value = viewModel.get()!;

    expect(value.ariaLabel).toContain('Test Strain');
    expect(value.ariaLabel).toContain('vegetative');
    expect(value.checkboxAriaLabel).toContain('Test Strain');
  });

  it('should recompute when store atoms change', () => {
    const viewModel = createPlantCardViewModel($plant, deps);

    expect(viewModel.get()!.isEditMode).toBe(false);

    (deps.$isEditMode as WritableAtom<boolean>).set(true);
    expect(viewModel.get()!.isEditMode).toBe(true);

    (deps.$selectedPlants as WritableAtom<Set<string>>).set(new Set(['test-plant-1']));
    expect(viewModel.get()!.isSelected).toBe(true);
  });
});
