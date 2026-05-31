import { ActionContext } from '../core/action-context';
import { ViewMode, ConfigTab } from '../../constants';
import { PlantEntity, GrowspaceDevice, EnvironmentConfigData } from '../../types';
import * as libraryActions from '../plant/library-actions';
import { devices$, optimisticDeletedPlantIds$, plantToDeviceMap$ } from '../../slices/grid';

export function setIsCompactView(ctx: ActionContext, value: boolean) {
  if (value) {
    ctx.ui.setViewMode(ViewMode.COMPACT);
  } else if (ctx.ui.$viewMode.get() === ViewMode.COMPACT) {
    ctx.ui.setViewMode(ViewMode.STANDARD);
  }
}

export function showToast(
  ctx: ActionContext,
  message: string,
  type: 'success' | 'error' | 'info' = 'info'
) {
  ctx.ui.showToast(message, type);
}

export function setActiveDialog(
  ctx: ActionContext,
  dialog: import('../../ui-state').ActiveDialogState
) {
  ctx.ui.setActiveDialog(dialog);
}

export function closeDialog(ctx: ActionContext) {
  ctx.ui.closeDialog();
}

export function toggleHeaderExpansion(ctx: ActionContext) {
  if (ctx.ui.$viewMode.get() === ViewMode.HEADER) {
    ctx.ui.setViewMode(ViewMode.STANDARD);
  } else {
    ctx.ui.setViewMode(ViewMode.HEADER);
  }
}

export function togglePlantSelection(ctx: ActionContext, plantOrId: string | PlantEntity) {
  const plantId = typeof plantOrId === 'string' ? plantOrId : plantOrId.attributes.plant_id || '';
  if (!plantId) return;

  ctx.ui.togglePlantSelection(plantId);
}

export function selectAllPlants(ctx: ActionContext) {
  const selectedDevice = ctx.grid.$selectedDevice.get();
  if (!selectedDevice) return;

  const devices = devices$.get();
  const selectedDeviceData = devices.find((d) => d.deviceId === selectedDevice);

  const allIds: string[] = [];

  if (selectedDeviceData && selectedDeviceData.plants) {
    selectedDeviceData.plants.forEach((plant) => {
      const pId = plant.attributes.plant_id;
      if (pId && !optimisticDeletedPlantIds$.get().has(pId)) {
        allIds.push(pId);
      }
    });

    ctx.ui.selectAllPlants(allIds);
  }
}

export function clearPlantSelection(ctx: ActionContext) {
  ctx.ui.clearPlantSelection();
}

export function exitEditMode(ctx: ActionContext) {
  ctx.ui.setEditMode(false);
  ctx.ui.clearPlantSelection();
}

export function openPlantOverviewDialog(
  ctx: ActionContext,
  plant: PlantEntity,
  selectedIds?: string[]
) {
  ctx.ui.setActiveDialog({
    type: 'PLANT_OVERVIEW',
    payload: {
      plant,
      editedAttributes: { ...plant.attributes },
      activeTab: 'dashboard',
      selectedPlantIds: selectedIds,
    },
  });
}

export function handleDeepLink(ctx: ActionContext, plantId: string) {
  // 1. Wait for data to be ready if needed - for now we check devices
  const devices = devices$.get();

  if (!devices || devices.length === 0) {
    console.log('[DeepLink] Devices not loaded yet, setting pending deep link:', plantId);
    ctx.ui.setPendingDeepLink(plantId);
    return;
  }

  // 2. Find the plant across all devices
  let foundPlant: PlantEntity | undefined;
  for (const device of devices) {
    if (!device.plants) continue;
    foundPlant = device.plants.find(
      (p) => (p.attributes.plant_id || p.entity_id.replace('sensor.', '')) === plantId
    );
    if (foundPlant) break;
  }

  if (foundPlant) {
    console.log('[DeepLink] Plant found, opening dialog:', plantId);
    openPlantOverviewDialog(ctx, foundPlant);

    // 3. Clear pending state
    ctx.ui.setPendingDeepLink(null);

    // 4. Cleanup URL to prevent re-opening on refresh
    const url = new URL(window.location.href);
    url.searchParams.delete('plantId');
    window.history.replaceState({}, '', url.toString());
  } else {
    // Not found - could be stale or restricted access
    console.warn(`[DeepLink] Plant ${plantId} not found in current devices.`);
    // Still clear pending state to avoid infinite retries if the ID is just wrong
    ctx.ui.setPendingDeepLink(null);
  }
}

export function openBatchPrintLabelsDialog(ctx: ActionContext) {
  const selectedIds = Array.from(ctx.ui.$selectedPlants.get());
  if (selectedIds.length === 0) return;

  ctx.ui.setActiveDialog({
    type: 'BATCH_PRINT_LABELS',
    payload: { plantIds: selectedIds },
  });
}

export function openBatchCloneDialog(ctx: ActionContext) {
  const selectedIds = Array.from(ctx.ui.$selectedPlants.get());
  if (selectedIds.length === 0) return;

  ctx.ui.setActiveDialog({
    type: 'BATCH_CLONE',
    payload: { plantIds: selectedIds },
  });
}

export function openBatchWateringDialog(ctx: ActionContext, growspaceId?: string) {
  const selectedIds = Array.from(ctx.ui.$selectedPlants.get());
  if (selectedIds.length === 0 && !growspaceId) return;

  let targetGrowspaceId = growspaceId;
  if (!targetGrowspaceId && selectedIds.length > 0) {
    targetGrowspaceId = getCommonGrowspaceId(ctx, selectedIds);
  }

  ctx.ui.setActiveDialog({
    type: 'WATERING',
    payload: {
      mode: 'plant',
      plantIds: selectedIds,
      growspaceId: targetGrowspaceId,
    },
  });
}

export function openBatchTrainingDialog(ctx: ActionContext, growspaceId?: string) {
  const selectedIds = Array.from(ctx.ui.$selectedPlants.get());
  if (selectedIds.length === 0 && !growspaceId) return;

  let targetGrowspaceId = growspaceId;
  if (!targetGrowspaceId && selectedIds.length > 0) {
    targetGrowspaceId = getCommonGrowspaceId(ctx, selectedIds);
  }

  ctx.ui.setActiveDialog({
    type: 'TRAINING',
    payload: {
      isOpen: true,
      plantIds: selectedIds,
      growspaceId: targetGrowspaceId,
    },
  });
}

export function openAddPlantDialog(ctx: ActionContext, row?: number, col?: number) {
  if (row !== undefined && col !== undefined) {
    libraryActions.fetchStrainLibrary(ctx, true);
    ctx.ui.setActiveDialog({
      type: 'ADD_PLANT',
      payload: { row, col },
    });
    return;
  }

  const selectedDeviceId = ctx.grid.$selectedDevice.get();
  if (!selectedDeviceId) {
    return;
  }

  const devices = devices$.get();
  const device = devices.find((d) => d.deviceId === selectedDeviceId);

  let targetRow = 0;
  let targetCol = 0;

  if (device) {
    const occupied = new Set<string>();
    const deleted = optimisticDeletedPlantIds$.get();

    device.plants.forEach((p) => {
      const pId = p.attributes.plant_id || p.entity_id.replace('sensor.', '');
      if (deleted.has(pId)) return;

      const r = (p.attributes.row !== undefined ? p.attributes.row : 1) - 1;
      const c = (p.attributes.col !== undefined ? p.attributes.col : 1) - 1;
      occupied.add(`${r},${c}`);
    });

    let found = false;
    const rows = device.rows || 4;
    const cols = device.plantsPerRow || 4;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!occupied.has(`${r},${c}`)) {
          targetRow = r;
          targetCol = c;
          found = true;
          break;
        }
      }
      if (found) break;
    }
  }

  libraryActions.fetchStrainLibrary(ctx, true);
  ctx.ui.setActiveDialog({
    type: 'ADD_PLANT',
    payload: { row: targetRow, col: targetCol },
  });
}

export function openStrainRecommendationDialog(ctx: ActionContext) {
  ctx.ui.setActiveDialog({
    type: 'STRAIN_RECOMMENDATION',
    payload: { isLoading: false, response: null },
  });
}

export function openNutrientPresetsDialog(ctx: ActionContext) {
  libraryActions.fetchNutrientPresets(ctx);
  ctx.ui.setActiveDialog({
    type: 'NUTRIENT_PRESETS',
    payload: {},
  });
}

export function openIPMDialog(
  ctx: ActionContext,
  context?: { growspaceId?: string; plantIds?: string[] }
) {
  libraryActions.fetchIPMPresets(ctx);
  const growspaceId =
    context?.growspaceId ||
    (!context?.plantIds?.length ? ctx.grid.$selectedDevice.get() || undefined : undefined);

  ctx.ui.setActiveDialog({
    type: 'IPM',
    payload: {
      growspaceId,
      plantIds: context?.plantIds,
    },
  });
}

export function openLogbookDialog(ctx: ActionContext) {
  const growspaceId = ctx.grid.$selectedDevice.get();
  if (growspaceId) {
    ctx.ui.setActiveDialog({
      type: 'LOGBOOK',
      payload: { growspaceId },
    });
  }
}

export async function exportStrainLibrary(ctx: ActionContext) {
  try {
    const library = await ctx.dataService.fetchStrainLibrary();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(library));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', 'strain_library_export.json');
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  } catch (e) {
    console.error(e);
    ctx.ui.showToast('Failed to export library', 'error');
  }
}

/** HELPER: Get common growspace ID for multiple plants */
function getCommonGrowspaceId(ctx: ActionContext, plantIds: string[]): string | undefined {
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

// ===== Standardized Dialog Opening Functions =====

export function openConfigDialog(ctx: ActionContext, device?: GrowspaceDevice) {
  ctx.ui.setActiveDialog({
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
        visionCheckupConfig: device?.environmentAttributes?.visionCheckupConfig,
        substrateTemperatureSensors:
          device?.environmentAttributes?.substrateTemperatureSensors || [],
        phSensors: device?.environmentAttributes?.phSensors || [],
        feedEcSensors: device?.environmentAttributes?.feedEcSensors || [],
        substrateEcSensors: device?.environmentAttributes?.substrateEcSensors || [],
        runoffEcSensors: device?.environmentAttributes?.runoffEcSensors || [],
        drainVolumeSensors: device?.environmentAttributes?.drainVolumeSensors || [],
        irrigationFlowSensors: device?.environmentAttributes?.irrigationFlowSensors || [],
        powerSensors: device?.environmentAttributes?.powerSensors || [],
        energySensors: device?.environmentAttributes?.energySensors || [],
      } as EnvironmentConfigData,
    },
  });
}

export function openStrainLibraryDialog(ctx: ActionContext, initialTab?: 'strains' | 'seeds') {
  ctx.ui.setActiveDialog({
    type: 'STRAIN_LIBRARY',
    payload: { initialTab },
  });
}

export function openIrrigationDialog(
  ctx: ActionContext,
  options?: { initialTab?: string; scrollToField?: string }
) {
  ctx.ui.setActiveDialog({ type: 'IRRIGATION', payload: options ?? {} });
}

export function openGrowMasterDialog(ctx: ActionContext, growspaceId: string) {
  ctx.ui.setActiveDialog({
    type: 'GROW_MASTER',
    payload: {
      growspaceId,
      isLoading: false,
      response: '',
      mode: 'single',
    },
  });
}

export function openWateringDialog(
  ctx: ActionContext,
  options: { plantIds?: string[]; growspaceId?: string; mode?: 'plant' | 'growspace' }
) {
  ctx.ui.setActiveDialog({
    type: 'WATERING',
    payload: {
      plantIds: options.plantIds,
      growspaceId: options.growspaceId,
      mode: options.mode || (options.plantIds?.length ? 'plant' : 'growspace'),
    },
  });
}

export function openTrainingDialog(ctx: ActionContext, plantIds: string[], growspaceId?: string) {
  ctx.ui.setActiveDialog({
    type: 'TRAINING',
    payload: {
      isOpen: true,
      plantIds,
      growspaceId,
    },
  });
}

export function openNutrientsDialog(ctx: ActionContext) {
  ctx.ui.setActiveDialog({ type: 'NUTRIENTS', payload: {} });
}

export function openSnapshotsDialog(ctx: ActionContext, growspaceId?: string) {
  ctx.ui.setActiveDialog({
    type: 'SNAPSHOTS',
    payload: {
      growspaceId: growspaceId || '',
    },
  });
}

export function openCropSteeringDialog(ctx: ActionContext, growspaceId?: string) {
  ctx.ui.setActiveDialog({
    type: 'CROP_STEERING',
    payload: {
      growspaceId: growspaceId || '',
    },
  });
}


