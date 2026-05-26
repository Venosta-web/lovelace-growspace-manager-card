import { describe, it, expect, beforeEach } from 'vitest';
import { atom } from 'nanostores';
import { createGrowspaceGridViewModel } from '../../../../../src/features/plants/viewmodels/growspace-grid.viewmodel';
import { GridOverlayMode, StatusLevel } from '../../../../../src/features/environment/constants';
import type { PlantEntity } from '../../../../../src/types';

const makePlant = (overrides: Partial<PlantEntity['attributes']> = {}): PlantEntity =>
  ({
    entity_id: 'sensor.plant_test',
    state: 'Vegetative',
    attributes: {
      plant_id: 'plant_test',
      growspace_id: 'gs1',
      strain: 'OG Kush',
      ...overrides,
    },
    context: { id: '', parent_id: null, user_id: null },
    last_changed: '',
    last_updated: '',
  } as unknown as PlantEntity);

const makeDevice = (overrides: Record<string, any> = {}) => ({
  deviceId: 'gs1',
  biologicalMetrics: { vpdStatus: 'ok', ...overrides.biologicalMetrics },
  ...overrides,
});

const makeStore = (deviceOverrides: Record<string, any> = {}, hassStates: Record<string, any> = {}) => ({
  ui: {
    $isEditMode: atom(false),
    $selectedPlants: atom(new Set<string>()),
    $isCompactView: atom(false),
    $isLoading: atom(false),
    $gridOverlayMode: atom(GridOverlayMode.NONE),
  },
  data: {
    $devices: atom([makeDevice(deviceOverrides)]),
    $strainLibrary: atom([]),
    $nutrientPresets: atom({}),
  },
  hass: { states: hassStates },
});

describe('createGrowspaceGridViewModel', () => {
  let mockPlant: PlantEntity;

  beforeEach(() => {
    mockPlant = makePlant();
  });

  describe('isListView', () => {
    it('is false when cols <= 5', () => {
      const store = makeStore();
      const vm$ = createGrowspaceGridViewModel([[mockPlant]], 1, 5, store as any);
      expect(vm$.get().isListView).toBe(false);
    });

    it('is true when cols > 5', () => {
      const store = makeStore();
      const vm$ = createGrowspaceGridViewModel([[mockPlant]], 1, 6, store as any);
      expect(vm$.get().isListView).toBe(true);
    });
  });

  describe('overlay NONE mode', () => {
    it('returns transparent for all plants', () => {
      const store = makeStore();
      store.ui.$gridOverlayMode.set(GridOverlayMode.NONE);
      const vm$ = createGrowspaceGridViewModel([[mockPlant]], 1, 1, store as any);
      expect(vm$.get().cells[0].overlayColor).toBe('transparent');
    });
  });

  describe('overlay VPD mode', () => {
    it('returns transparent when plant has no growspace_id', () => {
      const plant = makePlant({ growspace_id: undefined as any });
      const store = makeStore();
      store.ui.$gridOverlayMode.set(GridOverlayMode.VPD);
      const vm$ = createGrowspaceGridViewModel([[plant]], 1, 1, store as any);
      expect(vm$.get().cells[0].overlayColor).toBe('transparent');
    });

    it('returns transparent when device not found', () => {
      const plant = makePlant({ growspace_id: 'nonexistent' });
      const store = makeStore();
      store.ui.$gridOverlayMode.set(GridOverlayMode.VPD);
      const vm$ = createGrowspaceGridViewModel([[plant]], 1, 1, store as any);
      expect(vm$.get().cells[0].overlayColor).toBe('transparent');
    });

    it('returns OK color when vpdStatus is ok', () => {
      const store = makeStore({ biologicalMetrics: { vpdStatus: 'ok' } });
      store.ui.$gridOverlayMode.set(GridOverlayMode.VPD);
      const vm$ = createGrowspaceGridViewModel([[mockPlant]], 1, 1, store as any);
      expect(vm$.get().cells[0].overlayColor).toContain('76, 175, 80');
    });

    it('returns WARNING color when vpdStatus is warning', () => {
      const store = makeStore({ biologicalMetrics: { vpdStatus: StatusLevel.WARNING } });
      store.ui.$gridOverlayMode.set(GridOverlayMode.VPD);
      const vm$ = createGrowspaceGridViewModel([[mockPlant]], 1, 1, store as any);
      expect(vm$.get().cells[0].overlayColor).toContain('255, 152, 0');
    });

    it('returns DANGER color when vpdStatus is danger', () => {
      const store = makeStore({ biologicalMetrics: { vpdStatus: StatusLevel.DANGER } });
      store.ui.$gridOverlayMode.set(GridOverlayMode.VPD);
      const vm$ = createGrowspaceGridViewModel([[mockPlant]], 1, 1, store as any);
      expect(vm$.get().cells[0].overlayColor).toContain('244, 67, 54');
    });

    it('returns transparent when vpdStatus is an unknown value', () => {
      const store = makeStore({ biologicalMetrics: { vpdStatus: 'unknown_status' } });
      store.ui.$gridOverlayMode.set(GridOverlayMode.VPD);
      const vm$ = createGrowspaceGridViewModel([[mockPlant]], 1, 1, store as any);
      expect(vm$.get().cells[0].overlayColor).toBe('transparent');
    });
  });

  describe('overlay BIO_STATUS mode', () => {
    it('returns transparent when hass is not available', () => {
      const store = makeStore();
      (store as any).hass = null;
      store.ui.$gridOverlayMode.set(GridOverlayMode.BIO_STATUS);
      const vm$ = createGrowspaceGridViewModel([[mockPlant]], 1, 1, store as any);
      expect(vm$.get().cells[0].overlayColor).toBe('transparent');
    });

    it('returns ALERT color when plants under stress', () => {
      const hassStates = {
        'binary_sensor.gs1_optimal_conditions': { state: 'off' },
        'binary_sensor.gs1_plants_under_stress': { state: 'on' },
        'binary_sensor.gs1_high_mold_risk': { state: 'off' },
      };
      const store = makeStore({}, hassStates);
      store.ui.$gridOverlayMode.set(GridOverlayMode.BIO_STATUS);
      const vm$ = createGrowspaceGridViewModel([[mockPlant]], 1, 1, store as any);
      expect(vm$.get().cells[0].overlayColor).toContain('244, 67, 54');
    });

    it('returns ALERT color when high mold risk', () => {
      const hassStates = {
        'binary_sensor.gs1_optimal_conditions': { state: 'off' },
        'binary_sensor.gs1_plants_under_stress': { state: 'off' },
        'binary_sensor.gs1_high_mold_risk': { state: 'on' },
      };
      const store = makeStore({}, hassStates);
      store.ui.$gridOverlayMode.set(GridOverlayMode.BIO_STATUS);
      const vm$ = createGrowspaceGridViewModel([[mockPlant]], 1, 1, store as any);
      expect(vm$.get().cells[0].overlayColor).toContain('244, 67, 54');
    });

    it('returns OK color when conditions are optimal', () => {
      const hassStates = {
        'binary_sensor.gs1_optimal_conditions': { state: 'on' },
        'binary_sensor.gs1_plants_under_stress': { state: 'off' },
        'binary_sensor.gs1_high_mold_risk': { state: 'off' },
      };
      const store = makeStore({}, hassStates);
      store.ui.$gridOverlayMode.set(GridOverlayMode.BIO_STATUS);
      const vm$ = createGrowspaceGridViewModel([[mockPlant]], 1, 1, store as any);
      expect(vm$.get().cells[0].overlayColor).toContain('76, 175, 80');
    });

    it('returns WARNING color when vpd is warning but not in stress', () => {
      const hassStates = {
        'binary_sensor.gs1_optimal_conditions': { state: 'off' },
        'binary_sensor.gs1_plants_under_stress': { state: 'off' },
        'binary_sensor.gs1_high_mold_risk': { state: 'off' },
      };
      const store = makeStore({ biologicalMetrics: { vpdStatus: StatusLevel.WARNING } }, hassStates);
      store.ui.$gridOverlayMode.set(GridOverlayMode.BIO_STATUS);
      const vm$ = createGrowspaceGridViewModel([[mockPlant]], 1, 1, store as any);
      expect(vm$.get().cells[0].overlayColor).toContain('255, 152, 0');
    });

    it('returns transparent when no conditions trigger a color', () => {
      const hassStates = {
        'binary_sensor.gs1_optimal_conditions': { state: 'off' },
        'binary_sensor.gs1_plants_under_stress': { state: 'off' },
        'binary_sensor.gs1_high_mold_risk': { state: 'off' },
      };
      const store = makeStore({ biologicalMetrics: { vpdStatus: 'ok' } }, hassStates);
      store.ui.$gridOverlayMode.set(GridOverlayMode.BIO_STATUS);
      const vm$ = createGrowspaceGridViewModel([[mockPlant]], 1, 1, store as any);
      expect(vm$.get().cells[0].overlayColor).toBe('transparent');
    });
  });

  describe('cell selection state', () => {
    it('marks a plant as selected when its plant_id is in selectedPlants', () => {
      const store = makeStore();
      store.ui.$selectedPlants.set(new Set(['plant_test']));
      const vm$ = createGrowspaceGridViewModel([[mockPlant]], 1, 1, store as any);
      expect(vm$.get().cells[0].isSelected).toBe(true);
    });

    it('marks a plant as not selected when absent from selectedPlants', () => {
      const store = makeStore();
      const vm$ = createGrowspaceGridViewModel([[mockPlant]], 1, 1, store as any);
      expect(vm$.get().cells[0].isSelected).toBe(false);
    });

    it('assigns transparent overlay to null cells', () => {
      const store = makeStore();
      store.ui.$gridOverlayMode.set(GridOverlayMode.VPD);
      const vm$ = createGrowspaceGridViewModel([[null]], 1, 1, store as any);
      expect(vm$.get().cells[0].overlayColor).toBe('transparent');
    });
  });

  describe('grid layout', () => {
    it('computes correct row/col for each cell', () => {
      const store = makeStore();
      const p1 = makePlant({ plant_id: 'p1' });
      const p2 = makePlant({ plant_id: 'p2' });
      const vm$ = createGrowspaceGridViewModel([[p1, p2]], 1, 2, store as any);
      const cells = vm$.get().cells;
      expect(cells[0]).toMatchObject({ row: 1, col: 1 });
      expect(cells[1]).toMatchObject({ row: 1, col: 2 });
    });

    it('reacts to store state changes', () => {
      const store = makeStore();
      const vm$ = createGrowspaceGridViewModel([[mockPlant]], 1, 1, store as any);
      expect(vm$.get().isEditMode).toBe(false);
      store.ui.$isEditMode.set(true);
      expect(vm$.get().isEditMode).toBe(true);
    });
  });
});
