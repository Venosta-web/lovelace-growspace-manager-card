/**
 * Growspace Grid ViewModel
 *
 * Consolidates all business logic and state for the growspace grid display.
 * Single computed atom that components subscribe to.
 */

import { computed, type ReadableAtom } from 'nanostores';
import type { PlantEntity } from '../../../types';
import type { GrowspaceStore } from '../../../store/core/growspace-store';
import { GridOverlayMode, StatusLevel } from '../../../features/environment/constants';

/**
 * Overlay color constants
 */
const OVERLAY_COLORS = {
  OK: 'var(--overlay-ok-color, rgba(76, 175, 80, 0.15))',
  WARNING: 'var(--overlay-warning-color, rgba(255, 152, 0, 0.15))',
  DANGER: 'var(--overlay-danger-color, rgba(244, 67, 54, 0.15))',
  ALERT: 'var(--overlay-alert-color, rgba(244, 67, 54, 0.2))',
  TRANSPARENT: 'transparent',
} as const;

/**
 * Grid cell data with overlay information
 */
export interface GridCellData {
  plant: PlantEntity | null;
  row: number;
  col: number;
  overlayColor: string;
  isSelected: boolean;
}

/**
 * Growspace grid view model interface
 */
export interface GrowspaceGridViewModel {
  // Grid layout
  rows: number;
  cols: number;
  isListView: boolean;

  // Grid data
  cells: GridCellData[];

  // UI state
  isEditMode: boolean;
  isCompactView: boolean;
  isLoading: boolean;
  overlayMode: GridOverlayMode;
  selectedPlants: Set<string>;
}

/**
 * Calculate overlay color for a plant based on overlay mode
 */
function calculateOverlayColor(
  mode: GridOverlayMode,
  plant: PlantEntity,
  store: GrowspaceStore
): string {
  if (mode === GridOverlayMode.NONE) {
    return OVERLAY_COLORS.TRANSPARENT;
  }

  const growspaceId = plant.attributes.growspace_id;
  if (!growspaceId) {
    return OVERLAY_COLORS.TRANSPARENT;
  }

  const device = store.data.$devices.get().find((d) => d.deviceId === growspaceId);
  if (!device) {
    return OVERLAY_COLORS.TRANSPARENT;
  }

  switch (mode) {
    case GridOverlayMode.VPD: {
      const { vpdStatus } = device.biologicalMetrics;
      if (vpdStatus === 'ok') return OVERLAY_COLORS.OK;
      if (vpdStatus === StatusLevel.WARNING) return OVERLAY_COLORS.WARNING;
      if (vpdStatus === StatusLevel.DANGER) return OVERLAY_COLORS.DANGER;
      break;
    }
    case GridOverlayMode.BIO_STATUS: {
      const { hass } = store;
      if (!hass) return OVERLAY_COLORS.TRANSPARENT;

      const optimalEntity = hass.states[`binary_sensor.${growspaceId}_optimal_conditions`];
      const stressEntity = hass.states[`binary_sensor.${growspaceId}_plants_under_stress`];
      const moldEntity = hass.states[`binary_sensor.${growspaceId}_high_mold_risk`];

      if (stressEntity?.state === 'on' || moldEntity?.state === 'on') {
        return OVERLAY_COLORS.ALERT;
      }
      if (optimalEntity?.state === 'on') {
        return OVERLAY_COLORS.OK;
      }

      const { vpdStatus } = device.biologicalMetrics;
      if (vpdStatus === StatusLevel.WARNING || vpdStatus === StatusLevel.DANGER) {
        return OVERLAY_COLORS.WARNING;
      }
      break;
    }
  }

  return OVERLAY_COLORS.TRANSPARENT;
}

/**
 * Transform flat plant grid into cell data with overlay information
 */
function transformGridCells(
  plants: (PlantEntity | null)[][],
  cols: number,
  overlayMode: GridOverlayMode,
  selectedPlants: Set<string>,
  store: GrowspaceStore
): GridCellData[] {
  const flatGrid = plants.flat();

  return flatGrid.map((plant, index) => {
    const row = Math.floor(index / cols) + 1;
    const col = (index % cols) + 1;

    return {
      plant,
      row,
      col,
      overlayColor: plant
        ? calculateOverlayColor(overlayMode, plant, store)
        : OVERLAY_COLORS.TRANSPARENT,
      isSelected: plant ? selectedPlants.has(plant.attributes.plant_id || '') : false,
    };
  });
}

/**
 * Create growspace grid view model
 *
 * @param plants - 2D array of plants in grid layout
 * @param rows - Number of rows in grid
 * @param cols - Number of columns in grid
 * @param store - Global store instance
 * @returns Computed atom with view model data
 */
export function createGrowspaceGridViewModel(
  plants: (PlantEntity | null)[][],
  rows: number,
  cols: number,
  store: GrowspaceStore
): ReadableAtom<GrowspaceGridViewModel> {
  return computed(
    [
      store.ui.$isEditMode,
      store.ui.$selectedPlants,
      store.ui.$isCompactView,
      store.ui.$isLoading,
      store.ui.$gridOverlayMode,
      store.data.$devices,
    ],
    (isEditMode, selectedPlants, isCompactView, isLoading, overlayMode) => {
      // Pre-compute list view flag (grids wider than 5 columns use list layout)
      const isListView = cols > 5;

      // Transform grid cells with overlay data
      const cells = transformGridCells(plants, cols, overlayMode, selectedPlants, store);

      return {
        rows,
        cols,
        isListView,
        cells,
        isEditMode,
        isCompactView,
        isLoading,
        overlayMode,
        selectedPlants,
      };
    }
  );
}
