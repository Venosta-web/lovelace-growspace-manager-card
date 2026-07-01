import { ConfigTab, ViewMode } from '../../constants';
import { PlantEntity, GrowspaceDevice, EnvironmentConfigData } from '../../types';
import { plantToDeviceMap$, selectedDeviceId$, devices$, optimisticDeletedPlantIds$ } from '../grid';
import { openDialog, selectedPlants$, setPendingDeepLink } from './index';
import type { GrowspaceViewMode } from '../../types';

/** Minimal per-card view-mode surface (a card's `store.ui`) used to drop HEADER → STANDARD. */
interface ViewModeHost {
  $viewMode: { get(): GrowspaceViewMode };
  setViewMode(mode: GrowspaceViewMode): void;
}

/**
 * Pure dialog-open helpers: each builds an `ActiveDialogState` payload and calls
 * the UI slice `openDialog` setter. The add-plant / IPM helpers are "fetch-coupled"
 * only by name — the dialogs self-fetch on open (CONTEXT.md "Dialog self-fetch on
 * open"), so these are pure UI-state ops too.
 */

/** Resolve the single growspace shared by a set of plants, or undefined if mixed. */
function getCommonGrowspaceId(plantIds: string[]): string | undefined {
  const plantToDevice = plantToDeviceMap$.get();
  let commonGrowspaceId: string | undefined;

  for (const plantId of plantIds) {
    const plantGrowspaceId = plantToDevice.get(plantId);
    if (!plantGrowspaceId) continue;

    if (commonGrowspaceId === undefined) {
      commonGrowspaceId = plantGrowspaceId;
    } else if (commonGrowspaceId !== plantGrowspaceId) {
      return undefined; // Mixed growspaces
    }
  }

  return commonGrowspaceId;
}

export function openPlantOverviewDialog(plant: PlantEntity, selectedIds?: string[]): void {
  openDialog({
    type: 'PLANT_OVERVIEW',
    payload: {
      plant,
      editedAttributes: { ...plant.attributes },
      activeTab: 'dashboard',
      selectedPlantIds: selectedIds,
    },
  });
}

/**
 * Open the add-plant dialog. With an explicit row/col, open there; otherwise pick
 * the first empty cell of the selected growspace. The dialog self-fetches its
 * strain library on open.
 */
export function openAddPlantDialog(row?: number, col?: number): void {
  if (row !== undefined && col !== undefined) {
    openDialog({ type: 'ADD_PLANT', payload: { row, col } });
    return;
  }

  const selectedDeviceId = selectedDeviceId$.get();
  if (!selectedDeviceId) return;

  const device = devices$.get().find((d) => d.deviceId === selectedDeviceId);
  let targetRow = 0;
  let targetCol = 0;

  if (device) {
    const deleted = optimisticDeletedPlantIds$.get();
    const occupied = new Set<string>();
    device.plants.forEach((p) => {
      const pId = p.attributes.plant_id || p.entity_id.replace('sensor.', '');
      if (deleted.has(pId)) return;
      const r = (p.attributes.row ?? 1) - 1;
      const c = (p.attributes.col ?? 1) - 1;
      occupied.add(`${r},${c}`);
    });

    const rows = device.rows || 4;
    const cols = device.plantsPerRow || 4;
    let found = false;
    for (let r = 0; r < rows && !found; r++) {
      for (let c = 0; c < cols; c++) {
        if (!occupied.has(`${r},${c}`)) {
          targetRow = r;
          targetCol = c;
          found = true;
          break;
        }
      }
    }
  }

  openDialog({ type: 'ADD_PLANT', payload: { row: targetRow, col: targetCol } });
}

/**
 * Toggle an environment metric graph. `crop_steering` opens the irrigation dialog
 * instead of a graph; other metrics toggle the per-card history graph (passed in,
 * since it's per-card state) and drop HEADER view back to STANDARD when activated.
 */
export function toggleEnvGraph(
  metric: string,
  history?: { toggleEnvGraph(metric: string): boolean },
  ui?: ViewModeHost
): void {
  if (metric === 'crop_steering') {
    const gsId = selectedDeviceId$.get();
    if (gsId) openIrrigationDialog({ growspaceId: gsId, initialTab: 'overview' });
    return;
  }
  if (!history) return;
  const isNowActive = history.toggleEnvGraph(metric);
  if (isNowActive && ui && ui.$viewMode.get() === ViewMode.HEADER) {
    ui.setViewMode(ViewMode.STANDARD);
  }
}

/** Open the IPM dialog for a growspace or a set of plants (self-fetches presets). */
export function openIPMDialog(context?: { growspaceId?: string; plantIds?: string[] }): void {
  const growspaceId =
    context?.growspaceId ||
    (!context?.plantIds?.length ? selectedDeviceId$.get() || undefined : undefined);
  openDialog({ type: 'IPM', payload: { growspaceId, plantIds: context?.plantIds } });
}

/**
 * Resolve a deep link (`?plantId=`) to the plant overview dialog. When devices
 * aren't loaded yet, stash the id as pending so a later hydration can retry.
 */
export function handleDeepLink(plantId: string): void {
  const devices = devices$.get();
  if (!devices || devices.length === 0) {
    setPendingDeepLink(plantId);
    return;
  }

  let foundPlant: PlantEntity | undefined;
  for (const device of devices) {
    if (!device.plants) continue;
    foundPlant = device.plants.find(
      (p) => (p.attributes.plant_id || p.entity_id.replace('sensor.', '')) === plantId
    );
    if (foundPlant) break;
  }

  if (foundPlant) {
    openPlantOverviewDialog(foundPlant);
    setPendingDeepLink(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('plantId');
    window.history.replaceState({}, '', url.toString());
  } else {
    console.warn(`[DeepLink] Plant ${plantId} not found in current devices.`);
    setPendingDeepLink(null);
  }
}

export function openBatchPrintLabelsDialog(): void {
  const selectedIds = Array.from(selectedPlants$.get());
  if (selectedIds.length === 0) return;

  openDialog({
    type: 'BATCH_PRINT_LABELS',
    payload: { plantIds: selectedIds },
  });
}

export function openBatchCloneDialog(): void {
  const selectedIds = Array.from(selectedPlants$.get());
  if (selectedIds.length === 0) return;

  openDialog({
    type: 'BATCH_CLONE',
    payload: { plantIds: selectedIds },
  });
}

export function openBatchWateringDialog(growspaceId?: string): void {
  const selectedIds = Array.from(selectedPlants$.get());
  if (selectedIds.length === 0 && !growspaceId) return;

  let targetGrowspaceId = growspaceId;
  if (!targetGrowspaceId && selectedIds.length > 0) {
    targetGrowspaceId = getCommonGrowspaceId(selectedIds);
  }

  openDialog({
    type: 'WATERING',
    payload: {
      mode: 'plant',
      plantIds: selectedIds,
      growspaceId: targetGrowspaceId,
    },
  });
}

export function openBatchTrainingDialog(growspaceId?: string): void {
  const selectedIds = Array.from(selectedPlants$.get());
  if (selectedIds.length === 0 && !growspaceId) return;

  let targetGrowspaceId = growspaceId;
  if (!targetGrowspaceId && selectedIds.length > 0) {
    targetGrowspaceId = getCommonGrowspaceId(selectedIds);
  }

  openDialog({
    type: 'TRAINING',
    payload: {
      isOpen: true,
      plantIds: selectedIds,
      growspaceId: targetGrowspaceId,
    },
  });
}

export function openStrainRecommendationDialog(): void {
  openDialog({
    type: 'STRAIN_RECOMMENDATION',
    payload: { isLoading: false, response: null },
  });
}

export function openLogbookDialog(): void {
  const growspaceId = selectedDeviceId$.get();
  if (growspaceId) {
    openDialog({
      type: 'LOGBOOK',
      payload: { growspaceId },
    });
  }
}

export function openConfigDialog(device?: GrowspaceDevice): void {
  openDialog({
    type: 'CONFIG',
    payload: {
      currentTab: ConfigTab.SENSORS,
      environmentData: {
        selectedGrowspaceId: device?.deviceId || '',
        // Multi sensors (preferred)
        temperatureSensors: device?.environmentAttributes?.temperatureSensors || [],
        humiditySensors: device?.environmentAttributes?.humiditySensors || [],
        vpdSensors: device?.environmentAttributes?.vpdSensors || [],
        // Legacy singular (backward compat)
        temperatureSensor: device?.environmentAttributes?.temperatureSensor || '',
        humiditySensor: device?.environmentAttributes?.humiditySensor || '',
        vpdSensor: device?.environmentAttributes?.vpdSensor || '',
        co2Sensor: device?.environmentAttributes?.co2Sensor || '',
        circulationFanEntity: device?.environmentAttributes?.circulationFanEntity || '',
        circulationFanEntities: device?.environmentAttributes?.circulationFanEntities || [],
        stressThreshold: 0.8,
        moldThreshold: 0.8,
        lightSensor: device?.environmentAttributes?.lightSensor || '',
        lightSensors: device?.environmentAttributes?.lightSensors || [],
        exhaustEntity: device?.environmentAttributes?.exhaustEntity || '',
        exhaustFanEntities: device?.environmentAttributes?.exhaustFanEntities || [],
        exhaustFanAcInfinityDevices:
          device?.environmentAttributes?.exhaustFanAcInfinityDevices || [],
        circulationFanAcInfinityDevices:
          device?.environmentAttributes?.circulationFanAcInfinityDevices || [],
        humidifierAcInfinityDevices:
          device?.environmentAttributes?.humidifierAcInfinityDevices || [],
        dehumidifierAcInfinityDevices:
          device?.environmentAttributes?.dehumidifierAcInfinityDevices || [],
        humidifierEntity: device?.environmentAttributes?.humidifierEntity || '',
        humidifierEntities: device?.environmentAttributes?.humidifierEntities || [],
        humidifierControlEnabled: device?.environmentAttributes?.humidifierControlEnabled || false,
        dehumidifierEntity: device?.environmentAttributes?.dehumidifierEntity || '',
        dehumidifierEntities: device?.environmentAttributes?.dehumidifierEntities || [],
        dehumidifierThresholds: device?.environmentAttributes?.dehumidifierThresholds || {},
        soilMoistureSensor: device?.environmentAttributes?.soilMoistureSensor || '',
        dehumidifierControlEnabled:
          device?.environmentAttributes?.dehumidifierControlEnabled || false,
        sensorGroups: device?.environmentAttributes?.sensorGroups || [],
        sensorCoordinates: device?.environmentAttributes?.sensorCoordinates || {},
        irrigationTanks: device?.environmentAttributes?.irrigationTanks || [],
        cameraEntities: device?.environmentAttributes?.cameraEntities || [],
        lungroomTempSensors: device?.environmentAttributes?.lungroomTempSensors || [],
        visionCheckupConfig: device?.environmentAttributes?.visionCheckupConfig,
        substrateTemperatureSensors:
          device?.environmentAttributes?.substrateTemperatureSensors || [],
        phSensors: device?.environmentAttributes?.phSensors || [],
        feedEcSensors: device?.environmentAttributes?.feedEcSensors || [],
        bulkEcSensors: device?.environmentAttributes?.bulkEcSensors || [],
        poreEcSensors: device?.environmentAttributes?.poreEcSensors || [],
        runoffEcSensors: device?.environmentAttributes?.runoffEcSensors || [],
        drainVolumeSensors: device?.environmentAttributes?.drainVolumeSensors || [],
        irrigationFlowSensors: device?.environmentAttributes?.irrigationFlowSensors || [],
        powerSensors: device?.environmentAttributes?.powerSensors || [],
        energySensors: device?.environmentAttributes?.energySensors || [],
        circulationFanConfig: device?.environmentAttributes?.circulationFanConfig,
        exhaustFanConfig: device?.environmentAttributes?.exhaustFanConfig,
        vpdOptimalOverrides: device?.environmentAttributes?.vpdOptimalOverrides || {},
      } as EnvironmentConfigData,
    },
  });
}

export function openStrainLibraryDialog(initialTab?: 'strains' | 'seeds'): void {
  openDialog({
    type: 'STRAIN_LIBRARY',
    payload: { initialTab },
  });
}

export function openIrrigationDialog(options?: {
  growspaceId?: string;
  initialTab?: string;
  scrollToField?: string;
}): void {
  openDialog({ type: 'IRRIGATION', payload: options ?? {} });
}

export function openGrowMasterDialog(growspaceId: string): void {
  openDialog({
    type: 'GROW_MASTER',
    payload: {
      growspaceId,
      isLoading: false,
      response: '',
      mode: 'single',
    },
  });
}

export function openWateringDialog(options: {
  plantIds?: string[];
  growspaceId?: string;
  mode?: 'plant' | 'growspace';
}): void {
  openDialog({
    type: 'WATERING',
    payload: {
      plantIds: options.plantIds,
      growspaceId: options.growspaceId,
      mode: options.mode || (options.plantIds?.length ? 'plant' : 'growspace'),
    },
  });
}

export function openTrainingDialog(plantIds: string[], growspaceId?: string): void {
  openDialog({
    type: 'TRAINING',
    payload: {
      isOpen: true,
      plantIds,
      growspaceId,
    },
  });
}

export function openNutrientsDialog(): void {
  openDialog({ type: 'NUTRIENTS', payload: {} });
}

export function openSnapshotsDialog(growspaceId?: string): void {
  openDialog({
    type: 'SNAPSHOTS',
    payload: {
      growspaceId: growspaceId || '',
    },
  });
}
