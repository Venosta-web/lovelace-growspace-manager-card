/**
 * Growspace Grid ViewModel Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { atom } from 'nanostores';
import { createGrowspaceGridViewModel } from './growspace-grid.viewmodel';
import type { PlantEntity } from '../../../types';
import type { GrowspaceStore } from '../../../store/core/growspace-store';
import { GridOverlayMode, StatusLevel } from '../../../features/environment/constants';

describe('GrowspaceGridViewModel', () => {
  let mockStore: Partial<GrowspaceStore>;
  let mockPlants: (PlantEntity | null)[][];

  beforeEach(() => {
    // Mock store with necessary atoms
    mockStore = {
      ui: {
        $isEditMode: atom(false),
        $selectedPlants: atom(new Set<string>()),
        $isCompactView: atom(false),
        $isLoading: atom(false),
        $gridOverlayMode: atom(GridOverlayMode.NONE),
      } as any,
      data: {
        $devices: atom([
          {
            deviceId: 'test-growspace',
            biologicalMetrics: {
              vpdStatus: 'ok',
            },
          },
        ]),
      } as any,
      hass: {
        states: {},
      } as any,
    };

    // Mock 2x2 grid with 2 plants and 2 empty slots
    mockPlants = [
      [
        {
          entity_id: 'sensor.plant_1',
          state: 'vegetative',
          attributes: {
            plant_id: 'plant-1',
            strain: 'Test Strain',
            growspace_id: 'test-growspace',
            row: 0,
            col: 0,
          },
        } as PlantEntity,
        null,
      ],
      [
        {
          entity_id: 'sensor.plant_2',
          state: 'flowering',
          attributes: {
            plant_id: 'plant-2',
            strain: 'Another Strain',
            growspace_id: 'test-growspace',
            row: 1,
            col: 0,
          },
        } as PlantEntity,
        null,
      ],
    ];
  });

  it('should create view model with correct structure', () => {
    const viewModel = createGrowspaceGridViewModel(mockPlants, 2, 2, mockStore as GrowspaceStore);
    const value = viewModel.get();

    expect(value).toHaveProperty('rows', 2);
    expect(value).toHaveProperty('cols', 2);
    expect(value).toHaveProperty('isListView');
    expect(value).toHaveProperty('cells');
    expect(value).toHaveProperty('isEditMode');
    expect(value).toHaveProperty('isCompactView');
    expect(value).toHaveProperty('isLoading');
    expect(value).toHaveProperty('overlayMode');
    expect(value).toHaveProperty('selectedPlants');
  });

  it('should compute isListView correctly', () => {
    // Not list view for 2 cols
    const viewModel2Cols = createGrowspaceGridViewModel(mockPlants, 2, 2, mockStore as GrowspaceStore);
    expect(viewModel2Cols.get().isListView).toBe(false);

    // Not list view for 5 cols
    const viewModel5Cols = createGrowspaceGridViewModel(mockPlants, 2, 5, mockStore as GrowspaceStore);
    expect(viewModel5Cols.get().isListView).toBe(false);

    // List view for 6 cols
    const viewModel6Cols = createGrowspaceGridViewModel(mockPlants, 2, 6, mockStore as GrowspaceStore);
    expect(viewModel6Cols.get().isListView).toBe(true);
  });

  it('should transform grid cells correctly', () => {
    const viewModel = createGrowspaceGridViewModel(mockPlants, 2, 2, mockStore as GrowspaceStore);
    const value = viewModel.get();

    expect(value.cells).toHaveLength(4);

    // Cell 0: plant at (1, 1)
    expect(value.cells[0].plant?.attributes.plant_id).toBe('plant-1');
    expect(value.cells[0].row).toBe(1);
    expect(value.cells[0].col).toBe(1);

    // Cell 1: empty at (1, 2)
    expect(value.cells[1].plant).toBeNull();
    expect(value.cells[1].row).toBe(1);
    expect(value.cells[1].col).toBe(2);

    // Cell 2: plant at (2, 1)
    expect(value.cells[2].plant?.attributes.plant_id).toBe('plant-2');
    expect(value.cells[2].row).toBe(2);
    expect(value.cells[2].col).toBe(1);

    // Cell 3: empty at (2, 2)
    expect(value.cells[3].plant).toBeNull();
    expect(value.cells[3].row).toBe(2);
    expect(value.cells[3].col).toBe(2);
  });

  it('should reflect UI state changes', () => {
    const viewModel = createGrowspaceGridViewModel(mockPlants, 2, 2, mockStore as GrowspaceStore);

    // Initially not in edit mode
    expect(viewModel.get().isEditMode).toBe(false);

    // Enable edit mode
    mockStore.ui!.$isEditMode.set(true);
    expect(viewModel.get().isEditMode).toBe(true);

    // Initially not compact
    expect(viewModel.get().isCompactView).toBe(false);

    // Enable compact view
    (mockStore.ui!.$isCompactView as any).set(true);
    expect(viewModel.get().isCompactView).toBe(true);

    // Initially not loading
    expect(viewModel.get().isLoading).toBe(false);

    // Set loading
    mockStore.ui!.$isLoading.set(true);
    expect(viewModel.get().isLoading).toBe(true);
  });

  it('should track selected plants', () => {
    const viewModel = createGrowspaceGridViewModel(mockPlants, 2, 2, mockStore as GrowspaceStore);

    // Initially no selection
    expect(viewModel.get().cells[0].isSelected).toBe(false);
    expect(viewModel.get().cells[2].isSelected).toBe(false);

    // Select first plant
    mockStore.ui!.$selectedPlants.set(new Set(['plant-1']));
    expect(viewModel.get().cells[0].isSelected).toBe(true);
    expect(viewModel.get().cells[2].isSelected).toBe(false);

    // Select both plants
    mockStore.ui!.$selectedPlants.set(new Set(['plant-1', 'plant-2']));
    expect(viewModel.get().cells[0].isSelected).toBe(true);
    expect(viewModel.get().cells[2].isSelected).toBe(true);
  });

  it('should calculate overlay colors for NONE mode', () => {
    mockStore.ui!.$gridOverlayMode.set(GridOverlayMode.NONE);
    const viewModel = createGrowspaceGridViewModel(mockPlants, 2, 2, mockStore as GrowspaceStore);
    const value = viewModel.get();

    // All cells should have transparent overlay
    expect(value.cells[0].overlayColor).toBe('transparent');
    expect(value.cells[2].overlayColor).toBe('transparent');
  });

  it('should calculate overlay colors for VPD mode', () => {
    mockStore.ui!.$gridOverlayMode.set(GridOverlayMode.VPD);

    // Test OK status
    mockStore.data!.$devices.set([
      {
        deviceId: 'test-growspace',
        biologicalMetrics: { vpdStatus: 'ok' },
      } as any,
    ]);
    let viewModel = createGrowspaceGridViewModel(mockPlants, 2, 2, mockStore as GrowspaceStore);
    expect(viewModel.get().cells[0].overlayColor).toContain('76, 175, 80'); // OK color

    // Test WARNING status
    mockStore.data!.$devices.set([
      {
        deviceId: 'test-growspace',
        biologicalMetrics: { vpdStatus: StatusLevel.WARNING },
      } as any,
    ]);
    viewModel = createGrowspaceGridViewModel(mockPlants, 2, 2, mockStore as GrowspaceStore);
    expect(viewModel.get().cells[0].overlayColor).toContain('255, 152, 0'); // WARNING color

    // Test DANGER status
    mockStore.data!.$devices.set([
      {
        deviceId: 'test-growspace',
        biologicalMetrics: { vpdStatus: StatusLevel.DANGER },
      } as any,
    ]);
    viewModel = createGrowspaceGridViewModel(mockPlants, 2, 2, mockStore as GrowspaceStore);
    expect(viewModel.get().cells[0].overlayColor).toContain('244, 67, 54'); // DANGER color
  });

  it('should calculate overlay colors for BIO_STATUS mode', () => {
    mockStore.ui!.$gridOverlayMode.set(GridOverlayMode.BIO_STATUS);

    // Test optimal conditions
    mockStore.hass = {
      states: {
        'binary_sensor.test-growspace_optimal_conditions': { state: 'on' },
      },
    } as any;
    let viewModel = createGrowspaceGridViewModel(mockPlants, 2, 2, mockStore as GrowspaceStore);
    expect(viewModel.get().cells[0].overlayColor).toContain('76, 175, 80'); // OK color

    // Test stress alert
    mockStore.hass = {
      states: {
        'binary_sensor.test-growspace_plants_under_stress': { state: 'on' },
      },
    } as any;
    viewModel = createGrowspaceGridViewModel(mockPlants, 2, 2, mockStore as GrowspaceStore);
    expect(viewModel.get().cells[0].overlayColor).toContain('244, 67, 54'); // ALERT color

    // Test mold risk alert
    mockStore.hass = {
      states: {
        'binary_sensor.test-growspace_high_mold_risk': { state: 'on' },
      },
    } as any;
    viewModel = createGrowspaceGridViewModel(mockPlants, 2, 2, mockStore as GrowspaceStore);
    expect(viewModel.get().cells[0].overlayColor).toContain('244, 67, 54'); // ALERT color
  });

  it('should handle empty cells correctly', () => {
    const viewModel = createGrowspaceGridViewModel(mockPlants, 2, 2, mockStore as GrowspaceStore);
    const value = viewModel.get();

    // Empty cells should have null plant and transparent overlay
    expect(value.cells[1].plant).toBeNull();
    expect(value.cells[1].overlayColor).toBe('transparent');
    expect(value.cells[1].isSelected).toBe(false);

    expect(value.cells[3].plant).toBeNull();
    expect(value.cells[3].overlayColor).toBe('transparent');
  });

  it('should handle missing growspace gracefully', () => {
    // Plant with unknown growspace
    const plantsWithUnknownGrowspace: (PlantEntity | null)[][] = [
      [
        {
          entity_id: 'sensor.plant_1',
          state: 'vegetative',
          attributes: {
            plant_id: 'plant-1',
            strain: 'Test Strain',
            growspace_id: 'unknown-growspace',
            row: 0,
            col: 0,
          },
        } as PlantEntity,
      ],
    ];

    mockStore.ui!.$gridOverlayMode.set(GridOverlayMode.VPD);
    const viewModel = createGrowspaceGridViewModel(
      plantsWithUnknownGrowspace,
      1,
      1,
      mockStore as GrowspaceStore
    );

    // Should return transparent when growspace not found
    expect(viewModel.get().cells[0].overlayColor).toBe('transparent');
  });
});
