import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { atom } from 'nanostores';
import {
  setIsCompactView,
  showToast,
  setActiveDialog,
  closeDialog,
  toggleHeaderExpansion,
  togglePlantSelection,
  selectAllPlants,
  clearPlantSelection,
  exitEditMode,
  openPlantOverviewDialog,
  handleDeepLink,
  openBatchWateringDialog,
  openBatchTrainingDialog,
  openAddPlantDialog,
  openStrainRecommendationDialog,
  openNutrientPresetsDialog,
  openIPMDialog,
  openLogbookDialog,
  exportStrainLibrary,
  openConfigDialog,
  openStrainLibraryDialog,
  openIrrigationDialog,
  openGrowMasterDialog,
  openWateringDialog,
  openTrainingDialog,
  openNutrientsDialog,
  openSnapshotsDialog,
  openCropSteeringDialog,
} from './ui-actions';
import { GrowspaceUIStore } from './ui-store';
import * as libraryActions from '../plant/library-actions';
import {
  setDevices,
  optimisticDeletedPlantIds$,
  clearOptimisticDeletedPlantIds,
  addOptimisticDeletedPlantId,
  plantToDeviceMap$,
} from '../../slices/grid/index';
import type { ActionContext } from '../core/action-context';
import type { PlantEntity, GrowspaceDevice } from '../../types';
import { ViewMode } from '../../features/environment/constants';

vi.mock('../plant/library-actions', () => ({
  fetchStrainLibrary: vi.fn(),
  fetchNutrientPresets: vi.fn(),
  fetchIPMPresets: vi.fn(),
}));

function makePlant(plantId: string, row = 1, col = 1): PlantEntity {
  return {
    entity_id: `sensor.${plantId}`,
    attributes: { plant_id: plantId, row, col },
  } as unknown as PlantEntity;
}

function makeCtx(overrides: Partial<ActionContext> = {}): ActionContext {
  const ui = new GrowspaceUIStore();
  const $selectedDevice = atom<string | null>(null);
  return {
    ui,
    grid: { $selectedDevice } as unknown as ActionContext['grid'],
    dataService: {} as ActionContext['dataService'],
    undoRedoManager: {} as ActionContext['undoRedoManager'],
    optimisticManager: {} as ActionContext['optimisticManager'],
    closeDialog: vi.fn(),
    refreshData: vi.fn(),
    ...overrides,
  } satisfies ActionContext;
}

beforeEach(() => {
  vi.clearAllMocks();
  clearOptimisticDeletedPlantIds();
  setDevices([]);
});

afterEach(() => {
  setDevices([]);
  clearOptimisticDeletedPlantIds();
});

// ---------------------------------------------------------------------------
// setIsCompactView
// ---------------------------------------------------------------------------

describe('setIsCompactView', () => {
  it('sets viewMode to COMPACT when value is true', () => {
    const ctx = makeCtx();
    setIsCompactView(ctx, true);
    expect(ctx.ui.$viewMode.get()).toBe(ViewMode.COMPACT);
  });

  it('sets viewMode to STANDARD when value is false and currently COMPACT', () => {
    const ctx = makeCtx();
    ctx.ui.setViewMode(ViewMode.COMPACT);
    setIsCompactView(ctx, false);
    expect(ctx.ui.$viewMode.get()).toBe(ViewMode.STANDARD);
  });

  it('does not change viewMode when value is false and not COMPACT', () => {
    const ctx = makeCtx();
    ctx.ui.setViewMode(ViewMode.STANDARD);
    setIsCompactView(ctx, false);
    expect(ctx.ui.$viewMode.get()).toBe(ViewMode.STANDARD);
  });
});

// ---------------------------------------------------------------------------
// showToast
// ---------------------------------------------------------------------------

describe('showToast', () => {
  it('calls ctx.ui.showToast with message and type', () => {
    const ctx = makeCtx();
    const spy = vi.spyOn(ctx.ui, 'showToast');
    showToast(ctx, 'Hello', 'success');
    expect(spy).toHaveBeenCalledWith('Hello', 'success');
  });

  it('defaults type to info', () => {
    const ctx = makeCtx();
    const spy = vi.spyOn(ctx.ui, 'showToast');
    showToast(ctx, 'Info message');
    expect(spy).toHaveBeenCalledWith('Info message', 'info');
  });
});

// ---------------------------------------------------------------------------
// setActiveDialog
// ---------------------------------------------------------------------------

describe('setActiveDialog', () => {
  it('delegates to ctx.ui.setActiveDialog', () => {
    const ctx = makeCtx();
    const spy = vi.spyOn(ctx.ui, 'setActiveDialog');
    const dialog = { type: 'NUTRIENTS' as const, payload: {} };
    setActiveDialog(ctx, dialog);
    expect(spy).toHaveBeenCalledWith(dialog);
  });
});

// ---------------------------------------------------------------------------
// closeDialog
// ---------------------------------------------------------------------------

describe('closeDialog', () => {
  it('delegates to ctx.ui.closeDialog', () => {
    const ctx = makeCtx();
    const spy = vi.spyOn(ctx.ui, 'closeDialog');
    closeDialog(ctx);
    expect(spy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// toggleHeaderExpansion
// ---------------------------------------------------------------------------

describe('toggleHeaderExpansion', () => {
  it('sets viewMode to STANDARD when currently HEADER', () => {
    const ctx = makeCtx();
    ctx.ui.setViewMode(ViewMode.HEADER);
    toggleHeaderExpansion(ctx);
    expect(ctx.ui.$viewMode.get()).toBe(ViewMode.STANDARD);
  });

  it('sets viewMode to HEADER when not currently HEADER', () => {
    const ctx = makeCtx();
    ctx.ui.setViewMode(ViewMode.STANDARD);
    toggleHeaderExpansion(ctx);
    expect(ctx.ui.$viewMode.get()).toBe(ViewMode.HEADER);
  });
});

// ---------------------------------------------------------------------------
// togglePlantSelection
// ---------------------------------------------------------------------------

describe('togglePlantSelection', () => {
  it('selects a plant by string ID', () => {
    const ctx = makeCtx();
    togglePlantSelection(ctx, 'plant-1');
    expect(ctx.ui.$selectedPlants.get().has('plant-1')).toBe(true);
  });

  it('selects a plant by PlantEntity', () => {
    const ctx = makeCtx();
    togglePlantSelection(ctx, makePlant('plant-2'));
    expect(ctx.ui.$selectedPlants.get().has('plant-2')).toBe(true);
  });

  it('does nothing when PlantEntity has no plant_id', () => {
    const ctx = makeCtx();
    const plant = { entity_id: 'sensor.x', attributes: {} } as unknown as PlantEntity;
    togglePlantSelection(ctx, plant);
    expect(ctx.ui.$selectedPlants.get().size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// selectAllPlants
// ---------------------------------------------------------------------------

describe('selectAllPlants', () => {
  it('does nothing when no device is selected', () => {
    const ctx = makeCtx();
    selectAllPlants(ctx);
    expect(ctx.ui.$selectedPlants.get().size).toBe(0);
  });

  it('selects all non-deleted plants on the selected device', () => {
    const ctx = makeCtx();
    setDevices([{ deviceId: 'gs-1', plants: [makePlant('p1'), makePlant('p2')] } as any]);
    ctx.grid.$selectedDevice.set('gs-1');
    selectAllPlants(ctx);
    expect(ctx.ui.$selectedPlants.get().has('p1')).toBe(true);
    expect(ctx.ui.$selectedPlants.get().has('p2')).toBe(true);
  });

  it('excludes optimistically-deleted plants', () => {
    const ctx = makeCtx();
    setDevices([{ deviceId: 'gs-1', plants: [makePlant('p1'), makePlant('p2')] } as any]);
    ctx.grid.$selectedDevice.set('gs-1');
    addOptimisticDeletedPlantId('p1');
    selectAllPlants(ctx);
    expect(ctx.ui.$selectedPlants.get().has('p1')).toBe(false);
    expect(ctx.ui.$selectedPlants.get().has('p2')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// clearPlantSelection
// ---------------------------------------------------------------------------

describe('clearPlantSelection', () => {
  it('clears all selected plants', () => {
    const ctx = makeCtx();
    ctx.ui.$selectedPlants.set(new Set(['p1', 'p2']));
    clearPlantSelection(ctx);
    expect(ctx.ui.$selectedPlants.get().size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// exitEditMode
// ---------------------------------------------------------------------------

describe('exitEditMode', () => {
  it('disables edit mode and clears plant selection', () => {
    const ctx = makeCtx();
    ctx.ui.$isEditMode.set(true);
    ctx.ui.$selectedPlants.set(new Set(['p1']));
    exitEditMode(ctx);
    expect(ctx.ui.$isEditMode.get()).toBe(false);
    expect(ctx.ui.$selectedPlants.get().size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// openPlantOverviewDialog
// ---------------------------------------------------------------------------

describe('openPlantOverviewDialog', () => {
  it('opens PLANT_OVERVIEW dialog with the given plant', () => {
    const ctx = makeCtx();
    const plant = makePlant('p1');
    openPlantOverviewDialog(ctx, plant);
    const dialog = ctx.ui.$activeDialog.get();
    expect(dialog.type).toBe('PLANT_OVERVIEW');
    if (dialog.type === 'PLANT_OVERVIEW') {
      expect(dialog.payload.plant).toBe(plant);
      expect(dialog.payload.activeTab).toBe('dashboard');
    }
  });

  it('copies plant attributes as editedAttributes', () => {
    const ctx = makeCtx();
    const plant = makePlant('p1');
    openPlantOverviewDialog(ctx, plant);
    const dialog = ctx.ui.$activeDialog.get();
    if (dialog.type === 'PLANT_OVERVIEW') {
      expect(dialog.payload.editedAttributes).toEqual(plant.attributes);
      expect(dialog.payload.editedAttributes).not.toBe(plant.attributes);
    }
  });

  it('passes selectedPlantIds when provided', () => {
    const ctx = makeCtx();
    const plant = makePlant('p1');
    openPlantOverviewDialog(ctx, plant, ['p1', 'p2']);
    const dialog = ctx.ui.$activeDialog.get();
    if (dialog.type === 'PLANT_OVERVIEW') {
      expect(dialog.payload.selectedPlantIds).toEqual(['p1', 'p2']);
    }
  });
});

// ---------------------------------------------------------------------------
// handleDeepLink
// ---------------------------------------------------------------------------

describe('handleDeepLink', () => {
  let replaceStateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    replaceStateSpy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
  });

  afterEach(() => {
    replaceStateSpy.mockRestore();
  });

  it('sets pending deep link when devices are not loaded', () => {
    const ctx = makeCtx();
    setDevices([]);
    const spy = vi.spyOn(ctx.ui, 'setPendingDeepLink');
    handleDeepLink(ctx, 'p1');
    expect(spy).toHaveBeenCalledWith('p1');
    expect(ctx.ui.$activeDialog.get().type).toBe('NONE');
  });

  it('opens plant dialog and clears pending link when plant is found', () => {
    const ctx = makeCtx();
    setDevices([{ deviceId: 'gs-1', plants: [makePlant('p1')] } as any]);
    const spy = vi.spyOn(ctx.ui, 'setPendingDeepLink');
    handleDeepLink(ctx, 'p1');
    expect(ctx.ui.$activeDialog.get().type).toBe('PLANT_OVERVIEW');
    expect(spy).toHaveBeenCalledWith(null);
    expect(replaceStateSpy).toHaveBeenCalled();
  });

  it('clears pending link when plant is not found', () => {
    const ctx = makeCtx();
    setDevices([{ deviceId: 'gs-1', plants: [makePlant('other')] } as any]);
    const spy = vi.spyOn(ctx.ui, 'setPendingDeepLink');
    handleDeepLink(ctx, 'ghost');
    expect(ctx.ui.$activeDialog.get().type).toBe('NONE');
    expect(spy).toHaveBeenCalledWith(null);
  });
});

// ---------------------------------------------------------------------------
// openBatchWateringDialog
// ---------------------------------------------------------------------------

describe('openBatchWateringDialog', () => {
  it('does nothing when no plants are selected and no growspaceId given', () => {
    const ctx = makeCtx();
    openBatchWateringDialog(ctx);
    expect(ctx.ui.$activeDialog.get().type).toBe('NONE');
  });

  it('opens WATERING dialog with selected plant IDs', () => {
    const ctx = makeCtx();
    ctx.ui.$selectedPlants.set(new Set(['p1', 'p2']));
    openBatchWateringDialog(ctx);
    const dialog = ctx.ui.$activeDialog.get();
    expect(dialog.type).toBe('WATERING');
    if (dialog.type === 'WATERING') {
      expect(dialog.payload.plantIds).toContain('p1');
      expect(dialog.payload.plantIds).toContain('p2');
    }
  });

  it('opens WATERING dialog with explicit growspaceId', () => {
    const ctx = makeCtx();
    openBatchWateringDialog(ctx, 'gs-1');
    const dialog = ctx.ui.$activeDialog.get();
    expect(dialog.type).toBe('WATERING');
    if (dialog.type === 'WATERING') {
      expect(dialog.payload.growspaceId).toBe('gs-1');
    }
  });

  it('resolves common growspaceId from selected plants when none given', () => {
    const ctx = makeCtx();
    setDevices([{ deviceId: 'gs-1', plants: [makePlant('p1'), makePlant('p2')] } as any]);
    ctx.ui.$selectedPlants.set(new Set(['p1', 'p2']));
    openBatchWateringDialog(ctx);
    const dialog = ctx.ui.$activeDialog.get();
    if (dialog.type === 'WATERING') {
      expect(dialog.payload.growspaceId).toBe('gs-1');
    }
  });

  it('sets growspaceId to undefined when plants span multiple growspaces', () => {
    const ctx = makeCtx();
    setDevices([
      { deviceId: 'gs-1', plants: [makePlant('p1')] } as any,
      { deviceId: 'gs-2', plants: [makePlant('p2')] } as any,
    ]);
    ctx.ui.$selectedPlants.set(new Set(['p1', 'p2']));
    openBatchWateringDialog(ctx);
    const dialog = ctx.ui.$activeDialog.get();
    if (dialog.type === 'WATERING') {
      expect(dialog.payload.growspaceId).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// openBatchTrainingDialog
// ---------------------------------------------------------------------------

describe('openBatchTrainingDialog', () => {
  it('does nothing when no plants selected and no growspaceId', () => {
    const ctx = makeCtx();
    openBatchTrainingDialog(ctx);
    expect(ctx.ui.$activeDialog.get().type).toBe('NONE');
  });

  it('opens TRAINING dialog with selected plant IDs', () => {
    const ctx = makeCtx();
    ctx.ui.$selectedPlants.set(new Set(['p1']));
    openBatchTrainingDialog(ctx);
    const dialog = ctx.ui.$activeDialog.get();
    expect(dialog.type).toBe('TRAINING');
    if (dialog.type === 'TRAINING') {
      expect(dialog.payload.plantIds).toContain('p1');
    }
  });

  it('opens TRAINING dialog with explicit growspaceId', () => {
    const ctx = makeCtx();
    openBatchTrainingDialog(ctx, 'gs-2');
    const dialog = ctx.ui.$activeDialog.get();
    expect(dialog.type).toBe('TRAINING');
    if (dialog.type === 'TRAINING') {
      expect(dialog.payload.growspaceId).toBe('gs-2');
    }
  });

  it('resolves common growspaceId from selected plants', () => {
    const ctx = makeCtx();
    setDevices([{ deviceId: 'gs-1', plants: [makePlant('p1')] } as any]);
    ctx.ui.$selectedPlants.set(new Set(['p1']));
    openBatchTrainingDialog(ctx);
    const dialog = ctx.ui.$activeDialog.get();
    if (dialog.type === 'TRAINING') {
      expect(dialog.payload.growspaceId).toBe('gs-1');
    }
  });
});

// ---------------------------------------------------------------------------
// openAddPlantDialog
// ---------------------------------------------------------------------------

describe('openAddPlantDialog', () => {
  it('opens ADD_PLANT dialog at explicit row/col', () => {
    const ctx = makeCtx();
    openAddPlantDialog(ctx, 2, 3);
    const dialog = ctx.ui.$activeDialog.get();
    expect(dialog.type).toBe('ADD_PLANT');
    if (dialog.type === 'ADD_PLANT') {
      expect(dialog.payload.row).toBe(2);
      expect(dialog.payload.col).toBe(3);
    }
    expect(libraryActions.fetchStrainLibrary).toHaveBeenCalledWith(ctx, true);
  });

  it('does nothing when no device is selected and no row/col given', () => {
    const ctx = makeCtx();
    openAddPlantDialog(ctx);
    expect(ctx.ui.$activeDialog.get().type).toBe('NONE');
  });

  it('finds first empty cell when device is selected', () => {
    const ctx = makeCtx();
    setDevices([
      {
        deviceId: 'gs-1',
        rows: 2,
        plantsPerRow: 2,
        plants: [makePlant('p1', 1, 1)],
      } as any,
    ]);
    ctx.grid.$selectedDevice.set('gs-1');
    openAddPlantDialog(ctx);
    const dialog = ctx.ui.$activeDialog.get();
    expect(dialog.type).toBe('ADD_PLANT');
    if (dialog.type === 'ADD_PLANT') {
      expect(`${dialog.payload.row},${dialog.payload.col}`).not.toBe('0,0');
    }
  });
});

// ---------------------------------------------------------------------------
// openStrainRecommendationDialog
// ---------------------------------------------------------------------------

describe('openStrainRecommendationDialog', () => {
  it('opens STRAIN_RECOMMENDATION dialog', () => {
    const ctx = makeCtx();
    openStrainRecommendationDialog(ctx);
    const dialog = ctx.ui.$activeDialog.get();
    expect(dialog.type).toBe('STRAIN_RECOMMENDATION');
    if (dialog.type === 'STRAIN_RECOMMENDATION') {
      expect(dialog.payload.isLoading).toBe(false);
      expect(dialog.payload.response).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// openNutrientPresetsDialog
// ---------------------------------------------------------------------------

describe('openNutrientPresetsDialog', () => {
  it('opens NUTRIENT_PRESETS dialog and fetches presets', () => {
    const ctx = makeCtx();
    openNutrientPresetsDialog(ctx);
    expect(libraryActions.fetchNutrientPresets).toHaveBeenCalledWith(ctx);
    expect(ctx.ui.$activeDialog.get().type).toBe('NUTRIENT_PRESETS');
  });
});

// ---------------------------------------------------------------------------
// openIPMDialog
// ---------------------------------------------------------------------------

describe('openIPMDialog', () => {
  it('opens IPM dialog and fetches presets', () => {
    const ctx = makeCtx();
    openIPMDialog(ctx);
    expect(libraryActions.fetchIPMPresets).toHaveBeenCalledWith(ctx);
    expect(ctx.ui.$activeDialog.get().type).toBe('IPM');
  });

  it('uses provided growspaceId', () => {
    const ctx = makeCtx();
    openIPMDialog(ctx, { growspaceId: 'gs-1' });
    const dialog = ctx.ui.$activeDialog.get();
    if (dialog.type === 'IPM') {
      expect(dialog.payload.growspaceId).toBe('gs-1');
    }
  });

  it('falls back to selected device when no context given', () => {
    const ctx = makeCtx();
    ctx.grid.$selectedDevice.set('gs-2');
    openIPMDialog(ctx);
    const dialog = ctx.ui.$activeDialog.get();
    if (dialog.type === 'IPM') {
      expect(dialog.payload.growspaceId).toBe('gs-2');
    }
  });

  it('does not use selected device when plantIds are provided', () => {
    const ctx = makeCtx();
    ctx.grid.$selectedDevice.set('gs-2');
    openIPMDialog(ctx, { plantIds: ['p1'] });
    const dialog = ctx.ui.$activeDialog.get();
    if (dialog.type === 'IPM') {
      expect(dialog.payload.growspaceId).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// openLogbookDialog
// ---------------------------------------------------------------------------

describe('openLogbookDialog', () => {
  it('opens LOGBOOK dialog when a device is selected', () => {
    const ctx = makeCtx();
    ctx.grid.$selectedDevice.set('gs-1');
    openLogbookDialog(ctx);
    const dialog = ctx.ui.$activeDialog.get();
    expect(dialog.type).toBe('LOGBOOK');
    if (dialog.type === 'LOGBOOK') {
      expect(dialog.payload.growspaceId).toBe('gs-1');
    }
  });

  it('does nothing when no device is selected', () => {
    const ctx = makeCtx();
    openLogbookDialog(ctx);
    expect(ctx.ui.$activeDialog.get().type).toBe('NONE');
  });
});

// ---------------------------------------------------------------------------
// exportStrainLibrary
// ---------------------------------------------------------------------------

describe('exportStrainLibrary', () => {
  it('creates a download anchor and triggers click on success', async () => {
    const mockAnchor = {
      setAttribute: vi.fn(),
      click: vi.fn(),
      remove: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValueOnce(mockAnchor as any);
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any);

    const ctx = makeCtx();
    (ctx as any).dataService = {
      fetchStrainLibrary: vi.fn().mockResolvedValue([{ strain: 'test' }]),
    };

    await exportStrainLibrary(ctx);

    expect(mockAnchor.click).toHaveBeenCalled();
    expect(mockAnchor.remove).toHaveBeenCalled();
    appendSpy.mockRestore();
  });

  it('shows error toast when export fails', async () => {
    const ctx = makeCtx();
    (ctx as any).dataService = {
      fetchStrainLibrary: vi.fn().mockRejectedValue(new Error('network error')),
    };
    const spy = vi.spyOn(ctx.ui, 'showToast');

    await exportStrainLibrary(ctx);

    expect(spy).toHaveBeenCalledWith('Failed to export library', 'error');
  });
});

// ---------------------------------------------------------------------------
// openConfigDialog
// ---------------------------------------------------------------------------

describe('openConfigDialog', () => {
  it('opens CONFIG dialog without a device', () => {
    const ctx = makeCtx();
    openConfigDialog(ctx);
    const dialog = ctx.ui.$activeDialog.get();
    expect(dialog.type).toBe('CONFIG');
    if (dialog.type === 'CONFIG') {
      expect(dialog.payload.environmentData.selectedGrowspaceId).toBe('');
    }
  });

  it('opens CONFIG dialog with device attributes', () => {
    const ctx = makeCtx();
    const device = {
      deviceId: 'gs-1',
      environmentAttributes: {
        temperatureSensors: ['sensor.temp'],
        humiditySensors: [],
        vpdSensors: [],
        temperatureSensor: '',
        humiditySensor: '',
        vpdSensor: '',
        co2Sensor: '',
        circulationFanEntity: '',
        circulationFanEntities: [],
        stressThreshold: 0.8,
        moldThreshold: 0.8,
        lightSensor: '',
        lightSensors: [],
        exhaustEntity: '',
        exhaustFanEntities: [],
        humidifierEntity: '',
        humidifierEntities: [],
        humidifierControlEnabled: false,
        dehumidifierEntity: '',
        dehumidifierEntities: [],
        dehumidifierThresholds: {},
        soilMoistureSensor: '',
        dehumidifierControlEnabled: false,
        sensorGroups: [],
        sensorCoordinates: {},
        irrigationTanks: [],
        cameraEntities: [],
        substrateTemperatureSensors: [],
        phSensors: [],
        feedEcSensors: [],
        bulkEcSensors: [],
        poreEcSensors: [],
        runoffEcSensors: [],
        drainVolumeSensors: [],
        irrigationFlowSensors: [],
        powerSensors: [],
        energySensors: [],
      },
    } as unknown as GrowspaceDevice;

    openConfigDialog(ctx, device);
    const dialog = ctx.ui.$activeDialog.get();
    expect(dialog.type).toBe('CONFIG');
    if (dialog.type === 'CONFIG') {
      expect(dialog.payload.environmentData.selectedGrowspaceId).toBe('gs-1');
      expect(dialog.payload.environmentData.temperatureSensors).toEqual(['sensor.temp']);
    }
  });

  it('threads circulationFanConfig from device attributes into the dialog payload', () => {
    const ctx = makeCtx();
    const circulationFanConfig = {
      enabled: true,
      regulation_mode: 'temperature' as const,
      min_speed: 5,
      max_speed: 80,
      vpd_target: 1.0,
      vpd_tolerance: 0.2,
      humidity_target: 60.0,
      humidity_tolerance: 5.0,
      temperature_target: 22.0,
      temperature_tolerance: 1.0,
      critical_temp_low: 15.0,
      critical_temp_high: 30.0,
      critical_temp_hysteresis: 1.0,
      wind_enabled: true,
      wind_period_seconds: 90,
      wind_amplitude_pct: 15,
  stage_vpd_enabled: false,
    };
    const device = {
      deviceId: 'gs-2',
      environmentAttributes: { circulationFanConfig },
    } as unknown as GrowspaceDevice;

    openConfigDialog(ctx, device);
    const dialog = ctx.ui.$activeDialog.get();
    expect(dialog.type).toBe('CONFIG');
    if (dialog.type === 'CONFIG') {
      expect(dialog.payload.environmentData.circulationFanConfig).toEqual(circulationFanConfig);
    }
  });
});

// ---------------------------------------------------------------------------
// openStrainLibraryDialog
// ---------------------------------------------------------------------------

describe('openStrainLibraryDialog', () => {
  it('opens STRAIN_LIBRARY dialog with no initial tab', () => {
    const ctx = makeCtx();
    openStrainLibraryDialog(ctx);
    expect(ctx.ui.$activeDialog.get().type).toBe('STRAIN_LIBRARY');
  });

  it('passes initialTab when given', () => {
    const ctx = makeCtx();
    openStrainLibraryDialog(ctx, 'seeds');
    const dialog = ctx.ui.$activeDialog.get();
    if (dialog.type === 'STRAIN_LIBRARY') {
      expect(dialog.payload.initialTab).toBe('seeds');
    }
  });
});

// ---------------------------------------------------------------------------
// openIrrigationDialog
// ---------------------------------------------------------------------------

describe('openIrrigationDialog', () => {
  it('opens IRRIGATION dialog with empty payload when no options given', () => {
    const ctx = makeCtx();
    openIrrigationDialog(ctx);
    expect(ctx.ui.$activeDialog.get().type).toBe('IRRIGATION');
  });

  it('passes options through to payload', () => {
    const ctx = makeCtx();
    openIrrigationDialog(ctx, { initialTab: 'schedule', scrollToField: 'volume' });
    const dialog = ctx.ui.$activeDialog.get();
    if (dialog.type === 'IRRIGATION') {
      expect((dialog.payload as any).initialTab).toBe('schedule');
    }
  });
});

// ---------------------------------------------------------------------------
// openGrowMasterDialog
// ---------------------------------------------------------------------------

describe('openGrowMasterDialog', () => {
  it('opens GROW_MASTER dialog with growspaceId', () => {
    const ctx = makeCtx();
    openGrowMasterDialog(ctx, 'gs-1');
    const dialog = ctx.ui.$activeDialog.get();
    expect(dialog.type).toBe('GROW_MASTER');
    if (dialog.type === 'GROW_MASTER') {
      expect(dialog.payload.growspaceId).toBe('gs-1');
    }
  });
});

// ---------------------------------------------------------------------------
// openWateringDialog
// ---------------------------------------------------------------------------

describe('openWateringDialog', () => {
  it('opens WATERING dialog in growspace mode by default', () => {
    const ctx = makeCtx();
    openWateringDialog(ctx, { growspaceId: 'gs-1' });
    const dialog = ctx.ui.$activeDialog.get();
    expect(dialog.type).toBe('WATERING');
    if (dialog.type === 'WATERING') {
      expect(dialog.payload.mode).toBe('growspace');
      expect(dialog.payload.growspaceId).toBe('gs-1');
    }
  });

  it('opens WATERING dialog in plant mode when plantIds given', () => {
    const ctx = makeCtx();
    openWateringDialog(ctx, { plantIds: ['p1'] });
    const dialog = ctx.ui.$activeDialog.get();
    if (dialog.type === 'WATERING') {
      expect(dialog.payload.mode).toBe('plant');
    }
  });

  it('respects explicit mode override', () => {
    const ctx = makeCtx();
    openWateringDialog(ctx, { mode: 'growspace', plantIds: ['p1'] });
    const dialog = ctx.ui.$activeDialog.get();
    if (dialog.type === 'WATERING') {
      expect(dialog.payload.mode).toBe('growspace');
    }
  });
});

// ---------------------------------------------------------------------------
// openTrainingDialog
// ---------------------------------------------------------------------------

describe('openTrainingDialog', () => {
  it('opens TRAINING dialog with plantIds and growspaceId', () => {
    const ctx = makeCtx();
    openTrainingDialog(ctx, ['p1', 'p2'], 'gs-1');
    const dialog = ctx.ui.$activeDialog.get();
    expect(dialog.type).toBe('TRAINING');
    if (dialog.type === 'TRAINING') {
      expect(dialog.payload.plantIds).toEqual(['p1', 'p2']);
      expect(dialog.payload.growspaceId).toBe('gs-1');
      expect(dialog.payload.isOpen).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// openNutrientsDialog
// ---------------------------------------------------------------------------

describe('openNutrientsDialog', () => {
  it('opens NUTRIENTS dialog', () => {
    const ctx = makeCtx();
    openNutrientsDialog(ctx);
    expect(ctx.ui.$activeDialog.get().type).toBe('NUTRIENTS');
  });
});

// ---------------------------------------------------------------------------
// openSnapshotsDialog
// ---------------------------------------------------------------------------

describe('openSnapshotsDialog', () => {
  it('opens SNAPSHOTS dialog with growspaceId', () => {
    const ctx = makeCtx();
    openSnapshotsDialog(ctx, 'gs-1');
    const dialog = ctx.ui.$activeDialog.get();
    expect(dialog.type).toBe('SNAPSHOTS');
    if (dialog.type === 'SNAPSHOTS') {
      expect(dialog.payload.growspaceId).toBe('gs-1');
    }
  });

  it('uses empty string when no growspaceId given', () => {
    const ctx = makeCtx();
    openSnapshotsDialog(ctx);
    const dialog = ctx.ui.$activeDialog.get();
    if (dialog.type === 'SNAPSHOTS') {
      expect(dialog.payload.growspaceId).toBe('');
    }
  });
});

// ---------------------------------------------------------------------------
// openCropSteeringDialog
// ---------------------------------------------------------------------------

describe('openCropSteeringDialog', () => {
  it('opens CROP_STEERING dialog with growspaceId', () => {
    const ctx = makeCtx();
    openCropSteeringDialog(ctx, 'gs-1');
    const dialog = ctx.ui.$activeDialog.get();
    expect(dialog.type).toBe('CROP_STEERING');
    if (dialog.type === 'CROP_STEERING') {
      expect(dialog.payload.growspaceId).toBe('gs-1');
    }
  });

  it('uses empty string when no growspaceId given', () => {
    const ctx = makeCtx();
    openCropSteeringDialog(ctx);
    const dialog = ctx.ui.$activeDialog.get();
    if (dialog.type === 'CROP_STEERING') {
      expect(dialog.payload.growspaceId).toBe('');
    }
  });
});
