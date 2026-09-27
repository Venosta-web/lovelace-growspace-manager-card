import { z } from 'zod';
import { atom } from 'nanostores';
import { hassCall, callService } from '../../services/hass-call';
import { mutate } from '../../services/mutate';
import { GrowspaceAdapter } from '../../adapters/growspace-adapter';
import { devices$, patchDeviceEnvironmentAttributes, patchDeviceSetup } from '../grid';
import {
  GrowspaceAPICollectionSchema,
  GrowReportSchema,
  type GrowReport,
  type CirculationFanConfig,
  type SetupModules,
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

export type SetupModule = keyof SetupModules;

/**
 * Offer or stop offering one Setup Module on a growspace's setup checklist.
 *
 * A partial `setup_modules` edit, merged over the stamp by the backend (GSM
 * ADR-0064), so it never disturbs the other modules or the preset label. Undo
 * re-issues the previous value, because the edit has committed by then.
 */
export async function setSetupModule(
  growspaceId: string,
  module: SetupModule,
  offered: boolean
): Promise<void> {
  const device = devices$.get().find((d) => d.deviceId === growspaceId);
  const previousModules = device?.setupModules ?? null;
  const wasOffered = previousModules?.[module] ?? true;
  const send = (value: boolean) =>
    callService('growspace_manager', 'update_growspace', {
      growspace_id: growspaceId,
      setup_modules: { [module]: value },
    });
  await mutate(
    {
      type: 'setSetupModule',
      label: offered ? 'Setup step offered' : 'Setup step skipped',
      optimistic: () =>
        patchDeviceSetup(growspaceId, {
          setupModules: { ...(previousModules ?? {}), [module]: offered },
        }),
      inverse: () => patchDeviceSetup(growspaceId, { setupModules: previousModules }),
      undoInverse: () => {
        patchDeviceSetup(growspaceId, { setupModules: previousModules });
        void send(wasOffered).catch((err: unknown) =>
          console.error('[setSetupModule undo failed]', err)
        );
      },
      apply: () => send(offered),
    },
    growspaceId
  );
}

/**
 * Stamp a Setup Preset on a growspace: the backend rewrites its offered Setup
 * Modules from its own table (GSM ADR-0064) and the card learns the result on
 * the next device sync, so only the label moves optimistically.
 *
 * Not a `mutate`: a stamp cannot be undone by re-issuing anything — the label
 * has no "unset" and re-stamping the previous preset would discard whatever
 * hand edits the grower had made before. Choosing the previous preset again is
 * the grower's undo, which is exactly what the stamp semantics promise.
 */
export async function stampSetupPreset(growspaceId: string, preset: string): Promise<void> {
  const previous = devices$.get().find((d) => d.deviceId === growspaceId)?.setupPreset ?? null;
  patchDeviceSetup(growspaceId, { setupPreset: preset });
  try {
    await callService('growspace_manager', 'update_growspace', {
      growspace_id: growspaceId,
      setup_preset: preset,
    });
  } catch (err) {
    patchDeviceSetup(growspaceId, { setupPreset: previous });
    throw err;
  }
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

/**
 * The growspaces a graduating Culture could be planted into.
 *
 * `devices$` is filled by the manager card's bootstrap and by nothing else, so
 * on a dashboard holding only `custom:growspace-tc-card` it is permanently
 * empty — and the Graduate dialog offered no destination at all, however many
 * growspaces with free positions Growspace Manager had (workspace #188). The
 * TC surface therefore asks for the list itself, the way it already asks for
 * the strain library, rather than waiting for a host that may not be there.
 *
 * The same collection the bootstrap hydrates from answers it, so no backend
 * change and no second parser: `transformGrowspace` is the one reader of that
 * payload. It throws rather than resolving empty — "Growspace Manager has none"
 * and "nobody could ask" are different answers and only one of them is the
 * grower's problem.
 */
export async function fetchGraduationDestinations(): Promise<GrowspaceDevice[]> {
  const collection = await fetchRawCollection();
  return Object.values(collection)
    .map((wsData) => GrowspaceAdapter.transformGrowspace(null, wsData))
    .filter((device): device is GrowspaceDevice => device !== null);
}
