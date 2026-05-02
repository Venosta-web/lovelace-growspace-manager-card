/**
 * Plant Card ViewModel
 *
 * Consolidates all business logic and state for plant card display.
 * Single computed atom that components subscribe to.
 */

import { computed, type ReadableAtom } from 'nanostores';
import type { PlantEntity, PlantDisplayData, StrainEntry, NutrientPreset, GrowspaceDevice } from '../../../types';
import type { GrowspaceStore } from '../../../store/core/growspace-store';
import { PlantUtils } from '../../../utils/plant-utils';
import { calculateGrowthDeviation } from '../../../utils/analytics-utils';

/**
 * Status indicator types
 */
export interface PlantStatusIndicators {
  hasTraining: boolean;
  hasIPM: boolean;
  isRecentlyWatered: boolean;
  hasProblem: boolean;
  hasGrowthDeviation: boolean;
  hasRecommendedPreset: boolean;
}

/**
 * Plant card view model interface
 */
export interface PlantCardViewModel {
  // Plant data
  plant: PlantEntity;
  displayData: PlantDisplayData;

  // Selection state
  isSelected: boolean;
  isEditMode: boolean;
  isDraggable: boolean;

  // Computed indicators
  growthDeviation: number;
  statusIndicators: PlantStatusIndicators;

  // Accessibility
  ariaLabel: string;
  checkboxAriaLabel: string;
}

/**
 * Check if plant was recently watered (within 24 hours)
 */
function isRecentlyWatered(plant: PlantEntity): boolean {
  const lastWatered = plant.attributes.last_watered;
  if (!lastWatered) return false;

  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
  return new Date(lastWatered) > twentyFourHoursAgo;
}

/**
 * Check if plant has a recommended nutrient preset
 */
function hasRecommendedPreset(
  plant: PlantEntity,
  nutrientPresets: Record<string, NutrientPreset>,
  devices: GrowspaceDevice[]
): boolean {
  const growspaceId = plant.attributes.growspace_id;
  const device = devices.find((d) => d.deviceId === growspaceId);
  if (!device) return false;

  const currentStage = plant.attributes.stage;
  const daysInStage = plant.attributes.days_in_stage || 0;

  return Object.values(nutrientPresets).some(
    (preset) =>
      preset.stage === currentStage &&
      (!preset.min_days_in_stage || daysInStage >= preset.min_days_in_stage)
  );
}

/**
 * Create plant card view model
 *
 * @param plant - Plant entity to display
 * @param store - Global store instance
 * @returns Computed atom with view model data
 */
export function createPlantCardViewModel(
  plant: PlantEntity,
  store: GrowspaceStore
): ReadableAtom<PlantCardViewModel> {
  return computed(
    [
      store.ui.$isEditMode,
      store.ui.$selectedPlants,
      store.data.$strainLibrary,
      store.data.$nutrientPresets,
      store.data.$devices,
    ],
    (isEditMode, selectedPlants, strainLibrary, nutrientPresets, devices) => {
      // Get plant ID
      const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');

      // Compute display data
      const displayData = PlantUtils.getPlantDisplayData(plant, strainLibrary);

      // Find strain for growth deviation calculation
      const strain = strainLibrary.find((s: StrainEntry) => s.strain === plant.attributes.strain);
      const growthDeviation = calculateGrowthDeviation(plant, strain);

      // Compute status indicators
      const statusIndicators: PlantStatusIndicators = {
        hasTraining: !!plant.attributes.last_training_technique,
        hasIPM: !!plant.attributes.last_ipm,
        isRecentlyWatered: isRecentlyWatered(plant),
        hasProblem: !!plant.attributes.problem,
        hasGrowthDeviation: growthDeviation !== 0,
        hasRecommendedPreset: hasRecommendedPreset(plant, nutrientPresets, devices),
      };

      // Accessibility labels
      const strainName = displayData.strainName || 'Unknown strain';
      const stageName = plant.state || 'unknown';
      const ariaLabel = `${strainName} in ${stageName} stage`;
      const checkboxAriaLabel = `Select ${strainName}`;

      return {
        plant,
        displayData,
        isSelected: selectedPlants.has(plantId),
        isEditMode,
        isDraggable: !isEditMode,
        growthDeviation,
        statusIndicators,
        ariaLabel,
        checkboxAriaLabel,
      };
    }
  );
}
