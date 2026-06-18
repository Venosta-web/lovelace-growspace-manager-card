import { ConfigTab } from '../../constants';
import { PlantEntity, GrowspaceDevice, EnvironmentConfigData } from '../../types';
import { plantToDeviceMap$, selectedDeviceId$ } from '../grid';
import { openDialog, selectedPlants$ } from './index';

/**
 * Pure dialog-open helpers: each builds an `ActiveDialogState` payload and calls
 * the UI slice `openDialog` setter. No data fetching and no domain mutation — the
 * fetch-coupled `open*` helpers (add-plant, nutrient-presets, IPM) stay on the
 * legacy ActionDispatcher until their own retirement step.
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
