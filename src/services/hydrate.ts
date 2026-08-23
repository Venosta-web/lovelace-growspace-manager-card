import { GrowspaceAdapter } from '../adapters/growspace-adapter';
import type { GrowspaceAPIResponse } from '../types';
import type { HassEntity } from 'home-assistant-js-websocket';
import { devices$, setDevices } from '../slices/grid';
import { setPlants } from '../slices/plant';
import {
  setDeviceSnapshot,
  setSubareaDeviceSnapshot,
  deviceSnapshots$,
  subareaDeviceSnapshots$,
  deviceSnapshotEntityIds,
  type EntityRegistry,
} from '../slices/device-state';
import {
  setEnvSnapshot,
  setSubareaEnvSnapshot,
  subareaEnvSnapshots$,
  envSnapshotEntityIds,
} from '../slices/environment';
import { setIrrigationConfig, setIrrigationStrategy, setTankLevels } from '../slices/irrigation';
import { subareas$, subareasGrowspaceId$ } from '../slices/subarea';

/**
 * Hydration orchestrator — ADR-0022.
 *
 * Transforms a raw WS collection once and fans out to every slice's bootstrap
 * setter. Returns the set of watched entity IDs for the Bootstrap controller's
 * change-detection optimisation.
 */
export function hydrate(
  collection: Record<string, GrowspaceAPIResponse>,
  hassStates: Record<string, HassEntity>,
  registry?: EntityRegistry
): Set<string> {
  const devices = Object.values(collection)
    .map((wsData) => GrowspaceAdapter.transformGrowspace(null, wsData))
    .filter((d): d is NonNullable<typeof d> => d !== null);

  const currentDevices = devices$.get();
  const changed =
    currentDevices.length !== devices.length ||
    JSON.stringify(currentDevices) !== JSON.stringify(devices);
  if (changed) {
    setDevices(devices);
  }

  const watchedEntities = new Set<string>();
  const allPlants = devices.flatMap((d) => d.plants ?? []);
  setPlants(allPlants);

  const hydratedGrowspaceId = subareasGrowspaceId$.get();

  devices.forEach((d) => {
    setDeviceSnapshot(d.deviceId, d, hassStates, registry);
    // The resolved device entities (incl. AC Infinity current-power sensors that
    // live outside environmentAttributes) must be watched so the chips refresh.
    const devSnap = deviceSnapshots$.get().get(d.deviceId);
    if (devSnap) deviceSnapshotEntityIds(devSnap).forEach((id) => watchedEntities.add(id));

    if (d.name) setEnvSnapshot(d.deviceId, d, hassStates);

    if (d.irrigationConfig) setIrrigationConfig(d.deviceId, d.irrigationConfig);
    if (d.irrigationStrategy) setIrrigationStrategy(d.deviceId, d.irrigationStrategy);
    setTankLevels(d.deviceId, d.environmentAttributes?.irrigationTanks ?? []);

    (d.plants ?? []).forEach((p) => {
      if (p.entity_id) watchedEntities.add(p.entity_id);
    });
    if (d.irrigationConfig?.irrigationPumpEntity)
      watchedEntities.add(d.irrigationConfig.irrigationPumpEntity);
    if (d.irrigationConfig?.drainPumpEntity)
      watchedEntities.add(d.irrigationConfig.drainPumpEntity);
    if (d.environmentAttributes) {
      Object.values(d.environmentAttributes).forEach((val) => {
        if (typeof val === 'string' && val.includes('.')) watchedEntities.add(val);
      });
    }

    const subareas = hydratedGrowspaceId === d.deviceId ? subareas$.get() : (d.subareas ?? []);
    subareas.forEach((subarea) => {
      setSubareaEnvSnapshot(
        subarea.id,
        subarea,
        { growspaceId: d.deviceId, growspaceName: d.name },
        hassStates
      );
      const envSnap = subareaEnvSnapshots$.get().get(subarea.id);
      if (envSnap) envSnapshotEntityIds(envSnap).forEach((id) => watchedEntities.add(id));

      setSubareaDeviceSnapshot(subarea.id, subarea, hassStates);
      const devSnap = subareaDeviceSnapshots$.get().get(subarea.id);
      if (devSnap) deviceSnapshotEntityIds(devSnap).forEach((id) => watchedEntities.add(id));
    });
  });

  return watchedEntities;
}
