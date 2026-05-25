/**
 * Regression test for issue #143: Per-Instance Grid Slice Atoms.
 *
 * Verifies that two GrowspaceStore instances maintain fully independent
 * selected-device state.  With module-level singleton atoms the second store
 * overwrites the first's selection — this test must catch that regression.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GrowspaceStore } from '../../../src/store/core/growspace-store';
import { GrowspaceSharedStore } from '../../../src/store/core/growspace-shared-store';

// ── Minimal mocks: only things that make real network calls ────────────────

vi.mock('../../../src/slices/strain', () => ({
  fetchStrainLibrary: vi.fn().mockResolvedValue([]),
  setStrainLibrary: vi.fn(),
  addStrain: vi.fn().mockResolvedValue(undefined),
  updateStrainMeta: vi.fn().mockResolvedValue(undefined),
  removeStrain: vi.fn().mockResolvedValue(undefined),
  exportStrainLibrary: vi.fn().mockResolvedValue(undefined),
  importStrainLibrary: vi.fn().mockResolvedValue({ success: true }),
  clearStrainLibrary: vi.fn().mockResolvedValue(undefined),
  updateBreeder: vi.fn().mockResolvedValue(undefined),
  deleteBreeder: vi.fn().mockResolvedValue(undefined),
  strainLibrary$: { get: vi.fn(() => []), set: vi.fn(), subscribe: vi.fn(() => () => {}) },
}));

vi.mock('../../../src/slices/plant', () => ({
  plants$: { get: vi.fn(() => []), set: vi.fn(), subscribe: vi.fn(() => () => {}) },
  selectedPlant$: { get: vi.fn(() => null), set: vi.fn(), subscribe: vi.fn(() => () => {}) },
  setPlants: vi.fn(),
  waterPlant: vi.fn().mockResolvedValue(undefined),
  addPlant: vi.fn().mockResolvedValue(undefined),
  addPlants: vi.fn().mockResolvedValue(undefined),
  updatePlant: vi.fn().mockResolvedValue(undefined),
  deletePlant: vi.fn().mockResolvedValue(undefined),
  harvestPlant: vi.fn().mockResolvedValue(undefined),
  movePlantToGrowspace: vi.fn().mockResolvedValue(undefined),
  swapPlants: vi.fn().mockResolvedValue(undefined),
  takeClone: vi.fn().mockResolvedValue(undefined),
  printLabel: vi.fn().mockResolvedValue(undefined),
  saveHarvestMetrics: vi.fn().mockResolvedValue(undefined),
  scorePlant: vi.fn().mockResolvedValue(undefined),
  logDryingWeight: vi.fn().mockResolvedValue(undefined),
  logMoistureReading: vi.fn().mockResolvedValue(undefined),
  setVisualTag: vi.fn().mockResolvedValue(undefined),
  addOptimisticDeletedPlantId: vi.fn(),
  removeOptimisticDeletedPlantId: vi.fn(),
}));

vi.mock('../../../src/store/system/optimistic-manager', () => ({
  OptimisticManager: class {
    applyOptimisticUpdate = vi.fn();
    confirmUpdate = vi.fn();
    rollbackUpdate = vi.fn();
    isEntityPending = vi.fn(() => false);
  },
}));

const mockDataService = {
  hass: { connection: {} },
  updateHass: vi.fn(),
  getGrowspaceDevices: vi.fn(() => []),
  fetchGrowspaceData: vi.fn().mockResolvedValue({}),
  invalidateCache: vi.fn(),
};

vi.mock('../../../src/services/data-service', () => ({
  DataService: class {
    constructor() {
      return mockDataService;
    }
  },
}));

// ── Tests ──────────────────────────────────────────────────────────────────

describe('GrowspaceStore grid isolation (issue #143)', () => {
  let store1: GrowspaceStore;
  let store2: GrowspaceStore;

  beforeEach(() => {
    store1 = new GrowspaceStore(new GrowspaceSharedStore());
    store2 = new GrowspaceStore(new GrowspaceSharedStore());
  });

  afterEach(() => {
    store1.destroy();
    store2.destroy();
  });

  it('two store instances start with independent null selections', () => {
    expect(store1.grid.$selectedDevice.get()).toBeNull();
    expect(store2.grid.$selectedDevice.get()).toBeNull();
  });

  it('setting selectedDevice on store1 does not affect store2', () => {
    store1.grid.setSelectedDevice('gs-a');

    expect(store1.grid.$selectedDevice.get()).toBe('gs-a');
    expect(store2.grid.$selectedDevice.get()).toBeNull();
  });

  it('setting selectedDevice on store2 does not affect store1', () => {
    store2.grid.setSelectedDevice('gs-b');

    expect(store1.grid.$selectedDevice.get()).toBeNull();
    expect(store2.grid.$selectedDevice.get()).toBe('gs-b');
  });

  it('both stores can hold different selections simultaneously', () => {
    store1.grid.setSelectedDevice('gs-one');
    store2.grid.setSelectedDevice('gs-two');

    expect(store1.grid.$selectedDevice.get()).toBe('gs-one');
    expect(store2.grid.$selectedDevice.get()).toBe('gs-two');
  });

  it('changing store2 after store1 is set leaves store1 unchanged', () => {
    store1.grid.setSelectedDevice('gs-one');
    store2.grid.setSelectedDevice('gs-two');
    store2.grid.setSelectedDevice('gs-three');

    expect(store1.grid.$selectedDevice.get()).toBe('gs-one');
    expect(store2.grid.$selectedDevice.get()).toBe('gs-three');
  });
});
