import { z } from 'zod';
import { atom } from 'nanostores';
import { hassCall, callService } from '../../services/hass-call';
import { mutate } from '../../services/mutate';
import { GrowspaceAdapter } from '../../adapters/growspace-adapter';
import { devices$, patchDeviceEnvironmentAttributes } from '../grid';
import {
  GrowspaceAPICollectionSchema,
  GrowReportSchema,
  type GrowReport,
  type CirculationFanConfig,
} from './schema';
import type { GrowspaceDevice, GrowspaceAPIResponse } from '../../services/types';

export type { GrowReport } from './schema';

export const growspaceDevices$ = atom<GrowspaceDevice[] | null>(null);

export function getGrowspaceDevices(): GrowspaceDevice[] {
  return growspaceDevices$.get() ?? [];
}

export async function addGrowspace(data: {
  name: string;
  rows: number;
  plantsPerRow: number;
  notificationService?: string;
}): Promise<void> {
  await callService('growspace_manager', 'add_growspace', {
    name: data.name,
    rows: data.rows,
    plants_per_row: data.plantsPerRow,
    notification_target: data.notificationService,
  });
}

export async function removeGrowspace(growspaceId: string): Promise<void> {
  await callService('growspace_manager', 'remove_growspace', { growspace_id: growspaceId });
}

export async function updateGrowspace(data: {
  growspaceId: string;
  name?: string;
  rows?: number;
  plantsPerRow?: number;
  notificationService?: string;
}): Promise<void> {
  const previous = growspaceDevices$.get();

  // configure_environment is patch semantics (GSM ADR-0026): an omitted key keeps
  // the backend value; a present key — including [] or null — is a deliberate
  // set/clear. Gates must therefore be `!== undefined`, never truthiness/length,
  // or clearing a field silently stops working.
  const payload: Record<string, unknown> = { growspace_id: data.growspaceId };
  if (data.name !== undefined) payload.name = data.name;
  if (data.rows !== undefined) payload.rows = data.rows;
  if (data.plantsPerRow !== undefined) payload.plants_per_row = data.plantsPerRow;
  if (data.notificationService !== undefined)
    payload.notification_target = data.notificationService;

  await mutate(
    {
      type: 'updateGrowspace',
      optimistic: () => {
        if (!previous) return;
        growspaceDevices$.set(
          previous.map((d) =>
            d.deviceId === data.growspaceId
              ? {
                  ...d,
                  ...(data.name !== undefined && { name: data.name }),
                  ...(data.rows !== undefined && { rows: data.rows }),
                  ...(data.plantsPerRow !== undefined && { plantsPerRow: data.plantsPerRow }),
                  ...(data.notificationService !== undefined && {
                    notificationTarget: data.notificationService,
                  }),
                }
              : d
          )
        );
      },
      inverse: () => growspaceDevices$.set(previous),
      apply: () => callService('growspace_manager', 'update_growspace', payload),
    },
    data.growspaceId
  );
}

export async function exportGrowReport(
  growspaceId: string,
  format: 'json' | 'pdf' = 'json'
): Promise<void> {
  await callService('growspace_manager', 'export_grow_report', {
    growspace_id: growspaceId,
    format,
  });
}

export async function fetchGrowReport(growspaceId: string): Promise<GrowReport> {
  return hassCall(
    'growspace_manager/get_grow_report',
    { growspace_id: growspaceId },
    GrowReportSchema
  );
}

export async function removeEnvironment(growspaceId: string): Promise<void> {
  await callService('growspace_manager', 'remove_environment', { growspace_id: growspaceId });
}

export async function resetWaterTracking(growspaceId: string): Promise<void> {
  await callService('growspace_manager', 'reset_water_tracking', { growspace_id: growspaceId });
}

export async function setDehumidifierControl(growspaceId: string, enabled: boolean): Promise<void> {
  const prev =
    devices$.get().find((d) => d.deviceId === growspaceId)?.environmentAttributes
      .dehumidifierControlEnabled ?? false;
  await mutate(
    {
      type: 'setDehumidifierControl',
      // Patch the device the config dialog reseeds from immediately, so a
      // close-then-reopen reflects the flip without waiting for hass to push
      // the backend's confirmed state back through a full sync.
      optimistic: () =>
        patchDeviceEnvironmentAttributes(growspaceId, { dehumidifierControlEnabled: enabled }),
      inverse: () =>
        patchDeviceEnvironmentAttributes(growspaceId, { dehumidifierControlEnabled: prev }),
      apply: () =>
        callService('growspace_manager', 'set_dehumidifier_control', {
          growspace_id: growspaceId,
          enabled,
        }),
    },
    growspaceId
  );
}

export async function setHumidifierControl(growspaceId: string, enabled: boolean): Promise<void> {
  const prev =
    devices$.get().find((d) => d.deviceId === growspaceId)?.environmentAttributes
      .humidifierControlEnabled ?? false;
  await mutate(
    {
      type: 'setHumidifierControl',
      optimistic: () =>
        patchDeviceEnvironmentAttributes(growspaceId, { humidifierControlEnabled: enabled }),
      inverse: () =>
        patchDeviceEnvironmentAttributes(growspaceId, { humidifierControlEnabled: prev }),
      apply: () =>
        callService('growspace_manager', 'set_humidifier_control', {
          growspace_id: growspaceId,
          enabled,
        }),
    },
    growspaceId
  );
}

export async function updateSensorCoordinates(
  growspaceId: string,
  entityId: string,
  x: number,
  y: number,
  zCoord: number,
  rotation?: number
): Promise<void> {
  await hassCall(
    'growspace_manager/update_sensor_coordinates',
    {
      growspace_id: growspaceId,
      entity_id: entityId,
      x: Math.round(x),
      y: Math.round(y),
      z: Math.round(zCoord),
      rotation: rotation !== undefined ? Math.round(rotation) : undefined,
    },
    z.unknown()
  );
}

export async function configureCirculationFan({
  growspaceId,
  fanConfig,
}: {
  growspaceId: string;
  fanConfig: CirculationFanConfig;
}): Promise<void> {
  await callService('growspace_manager', 'configure_circulation_fan', {
    growspace_id: growspaceId,
    ...fanConfig,
  });
}

export async function fetchGrowspaceData(): Promise<void> {
  const collection = await hassCall('growspace_manager/get_data', {}, GrowspaceAPICollectionSchema);
  const devices = Object.values(collection)
    .map((wsData) => GrowspaceAdapter.transformGrowspace(null, wsData))
    .filter((d): d is GrowspaceDevice => d !== null);
  growspaceDevices$.set(devices);
}

export async function fetchRawCollection(): Promise<Record<string, GrowspaceAPIResponse>> {
  return hassCall('growspace_manager/get_data', {}, GrowspaceAPICollectionSchema);
}
