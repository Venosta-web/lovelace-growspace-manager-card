/**
 * Plant Card ViewModel
 *
 * Consolidates all business logic and state for plant card display.
 * Single computed atom that components subscribe to.
 */

import { computed, type ReadableAtom } from 'nanostores';
import type {
  PlantEntity,
  PlantDisplayData,
  StrainEntry,
  NutrientPreset,
  GrowspaceDevice,
} from '../../../types';
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
 * Exact atoms createPlantCardViewModel depends on.
 * Callers pass these directly so the function's interface matches its actual needs.
 */
export interface PlantCardAtoms {
  $isEditMode: ReadableAtom<boolean>;
  $selectedPlants: ReadableAtom<Set<string>>;
  $strainLibrary: ReadableAtom<StrainEntry[]>;
  $nutrientPresets: ReadableAtom<Record<string, NutrientPreset>>;
  $devices: ReadableAtom<GrowspaceDevice[]>;
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
 * Create plant card view model.
 *
 * @param $plant - Reactive atom holding the plant entity (null during init)
 * @param deps - The specific store atoms this ViewModel needs
 * @returns Computed atom; null when plant is not yet available
 */
export function createPlantCardViewModel(
  $plant: ReadableAtom<PlantEntity | null>,
  deps: PlantCardAtoms
): ReadableAtom<PlantCardViewModel | null> {
  return computed(
    [
      $plant,
      deps.$isEditMode,
      deps.$selectedPlants,
      deps.$strainLibrary,
      deps.$nutrientPresets,
      deps.$devices,
    ],
    (plant, isEditMode, selectedPlants, strainLibrary, nutrientPresets, devices) => {
      if (!plant) return null;

      const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');
      const displayData = PlantUtils.getPlantDisplayData(plant, strainLibrary);
      const strain = strainLibrary.find((s: StrainEntry) => s.strain === plant.attributes.strain);
      const growthDeviation = calculateGrowthDeviation(plant, strain);

      const statusIndicators: PlantStatusIndicators = {
        hasTraining: !!plant.attributes.last_training_technique,
        hasIPM: !!plant.attributes.last_ipm,
        isRecentlyWatered: isRecentlyWatered(plant),
        hasProblem: !!plant.attributes.problem,
        hasGrowthDeviation: growthDeviation !== 0,
        hasRecommendedPreset: hasRecommendedPreset(plant, nutrientPresets, devices),
      };

      const strainName = displayData.strainName || 'Unknown strain';
      const stageName = plant.state || 'unknown';

      return {
        plant,
        displayData,
        isSelected: selectedPlants.has(plantId),
        isEditMode,
        isDraggable: !isEditMode,
        growthDeviation,
        statusIndicators,
        ariaLabel: `${strainName} in ${stageName} stage`,
        checkboxAriaLabel: `Select ${strainName}`,
      };
    }
  );
}
