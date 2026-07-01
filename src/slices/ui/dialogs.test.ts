import { describe, it, expect, beforeEach } from 'vitest';
import {
  __resetUiSliceForTests,
  activeDialog$,
  selectedPlants$,
  openPlantOverviewDialog,
  openStrainRecommendationDialog,
  openLogbookDialog,
  openConfigDialog,
  openStrainLibraryDialog,
  openIrrigationDialog,
  openGrowMasterDialog,
  openWateringDialog,
  openTrainingDialog,
  openNutrientsDialog,
  openSnapshotsDialog,
  openBatchWateringDialog,
  openBatchTrainingDialog,
  selectAllPlantsInSelectedDevice,
} from './index';
import {
  setDevices,
  setSelectedDeviceId,
  addOptimisticDeletedPlantId,
  removeOptimisticDeletedPlantId,
} from '../grid';
import type { PlantEntity } from '../../types';

function deviceWithPlants(deviceId: string, plantIds: string[]) {
  return {
    deviceId,
    plants: plantIds.map((plant_id) => ({ attributes: { plant_id } })),
  } as never;
}

describe('slices/ui pure dialog-open helpers', () => {
  beforeEach(() => {
    __resetUiSliceForTests();
    setDevices([]);
    setSelectedDeviceId(null);
  });

  it('openGrowMasterDialog opens GROW_MASTER with the growspace id', () => {
    openGrowMasterDialog('gs-1');
    const dialog = activeDialog$.get();
    expect(dialog.type).toBe('GROW_MASTER');
    if (dialog.type === 'GROW_MASTER') {
      expect(dialog.payload.growspaceId).toBe('gs-1');
    }
  });

  it('openWateringDialog opens WATERING and infers plant mode from plant ids', () => {
    openWateringDialog({ plantIds: ['p1'], growspaceId: 'gs-1' });
    const dialog = activeDialog$.get();
    expect(dialog.type).toBe('WATERING');
    if (dialog.type === 'WATERING') {
      expect(dialog.payload.mode).toBe('plant');
      expect(dialog.payload.plantIds).toEqual(['p1']);
    }
  });

  it('openWateringDialog defaults to growspace mode when no plant ids', () => {
    openWateringDialog({ growspaceId: 'gs-1' });
    const dialog = activeDialog$.get();
    if (dialog.type === 'WATERING') {
      expect(dialog.payload.mode).toBe('growspace');
    }
  });

  it('openTrainingDialog opens TRAINING with plant ids and growspace id', () => {
    openTrainingDialog(['p1', 'p2'], 'gs-1');
    const dialog = activeDialog$.get();
    expect(dialog.type).toBe('TRAINING');
    if (dialog.type === 'TRAINING') {
      expect(dialog.payload.plantIds).toEqual(['p1', 'p2']);
      expect(dialog.payload.growspaceId).toBe('gs-1');
    }
  });

  it('openNutrientsDialog opens NUTRIENTS', () => {
    openNutrientsDialog();
    expect(activeDialog$.get().type).toBe('NUTRIENTS');
  });

  it('openSnapshotsDialog opens SNAPSHOTS with the growspace id', () => {
    openSnapshotsDialog('gs-2');
    const dialog = activeDialog$.get();
    expect(dialog.type).toBe('SNAPSHOTS');
    if (dialog.type === 'SNAPSHOTS') {
      expect(dialog.payload.growspaceId).toBe('gs-2');
    }
  });

  it('openStrainRecommendationDialog opens STRAIN_RECOMMENDATION', () => {
    openStrainRecommendationDialog();
    expect(activeDialog$.get().type).toBe('STRAIN_RECOMMENDATION');
  });

  it('openStrainLibraryDialog opens STRAIN_LIBRARY with the requested tab', () => {
    openStrainLibraryDialog('seeds');
    const dialog = activeDialog$.get();
    expect(dialog.type).toBe('STRAIN_LIBRARY');
    if (dialog.type === 'STRAIN_LIBRARY') {
      expect(dialog.payload.initialTab).toBe('seeds');
    }
  });

  it('openIrrigationDialog opens IRRIGATION with the provided options', () => {
    openIrrigationDialog({ growspaceId: 'gs-1', initialTab: 'overview' });
    const dialog = activeDialog$.get();
    expect(dialog.type).toBe('IRRIGATION');
    if (dialog.type === 'IRRIGATION') {
      expect(dialog.payload.growspaceId).toBe('gs-1');
    }
  });

  it('openConfigDialog opens CONFIG seeded from the device', () => {
    openConfigDialog({ deviceId: 'gs-1' } as never);
    const dialog = activeDialog$.get();
    expect(dialog.type).toBe('CONFIG');
    if (dialog.type === 'CONFIG') {
      expect(dialog.payload.environmentData.selectedGrowspaceId).toBe('gs-1');
    }
  });

  it('openConfigDialog carries exhaust AC Infinity devices from the device', () => {
    const acDevice = {
      mode_entity: 'select.sog_exhaust_aktiver_modus',
      speed_entity: 'number.sog_exhaust_einschaltleistung',
      on_speed: 10,
    };
    openConfigDialog({
      deviceId: 'gs-1',
      environmentAttributes: { exhaustFanAcInfinityDevices: [acDevice] },
    } as never);
    const dialog = activeDialog$.get();
    expect(dialog.type).toBe('CONFIG');
    if (dialog.type === 'CONFIG') {
      expect(dialog.payload.environmentData.exhaustFanAcInfinityDevices).toEqual([acDevice]);
    }
  });

  it('openPlantOverviewDialog opens PLANT_OVERVIEW with a snapshot of the plant', () => {
    const plant = { attributes: { plant_id: 'p1', strain: 'OG' } } as unknown as PlantEntity;
    openPlantOverviewDialog(plant, ['p1', 'p2']);
    const dialog = activeDialog$.get();
    expect(dialog.type).toBe('PLANT_OVERVIEW');
    if (dialog.type === 'PLANT_OVERVIEW') {
      expect(dialog.payload.plant).toBe(plant);
      expect(dialog.payload.selectedPlantIds).toEqual(['p1', 'p2']);
    }
  });

  it('openLogbookDialog opens LOGBOOK for the selected device', () => {
    setSelectedDeviceId('gs-1');
    openLogbookDialog();
    const dialog = activeDialog$.get();
    expect(dialog.type).toBe('LOGBOOK');
    if (dialog.type === 'LOGBOOK') {
      expect(dialog.payload.growspaceId).toBe('gs-1');
    }
  });

  it('openLogbookDialog uses the explicit growspace id over the selected device', () => {
    setSelectedDeviceId('gs-selected');
    openLogbookDialog('gs-explicit');
    const dialog = activeDialog$.get();
    expect(dialog.type).toBe('LOGBOOK');
    if (dialog.type === 'LOGBOOK') {
      expect(dialog.payload.growspaceId).toBe('gs-explicit');
    }
  });

  it('openLogbookDialog is a no-op when no device is selected', () => {
    openLogbookDialog();
    expect(activeDialog$.get().type).toBe('NONE');
  });

  it('openBatchWateringDialog opens WATERING from the current selection', () => {
    selectedPlants$.set(new Set(['p1', 'p2']));
    openBatchWateringDialog('gs-1');
    const dialog = activeDialog$.get();
    expect(dialog.type).toBe('WATERING');
    if (dialog.type === 'WATERING') {
      expect(dialog.payload.plantIds).toHaveLength(2);
      expect(dialog.payload.growspaceId).toBe('gs-1');
    }
  });

  it('openBatchWateringDialog is a no-op with no selection and no growspace', () => {
    openBatchWateringDialog();
    expect(activeDialog$.get().type).toBe('NONE');
  });

  it('openBatchTrainingDialog opens TRAINING from the current selection', () => {
    selectedPlants$.set(new Set(['p1']));
    openBatchTrainingDialog('gs-1');
    expect(activeDialog$.get().type).toBe('TRAINING');
  });

  it('selectAllPlantsInSelectedDevice selects every plant in the selected device', () => {
    setDevices([deviceWithPlants('gs-1', ['p1', 'p2', 'p3'])]);
    setSelectedDeviceId('gs-1');

    selectAllPlantsInSelectedDevice();

    expect(selectedPlants$.get()).toEqual(new Set(['p1', 'p2', 'p3']));
  });

  it('selectAllPlantsInSelectedDevice excludes optimistically-deleted plants', () => {
    setDevices([deviceWithPlants('gs-1', ['p1', 'p2'])]);
    setSelectedDeviceId('gs-1');
    addOptimisticDeletedPlantId('p2');

    selectAllPlantsInSelectedDevice();

    expect(selectedPlants$.get()).toEqual(new Set(['p1']));
    removeOptimisticDeletedPlantId('p2');
  });

  it('selectAllPlantsInSelectedDevice is a no-op when no device is selected', () => {
    setDevices([deviceWithPlants('gs-1', ['p1'])]);
    setSelectedDeviceId(null);

    selectAllPlantsInSelectedDevice();

    expect(selectedPlants$.get()).toEqual(new Set());
  });
});
