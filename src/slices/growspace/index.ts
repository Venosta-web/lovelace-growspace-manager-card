import { atom } from 'nanostores';
import { hassCall, callService } from '../../services/hass-call';
import { mutate } from '../../services/mutate';
import { GrowspaceAdapter } from '../../adapters/growspace-adapter';
import { GrowspaceAPICollectionSchema } from './schema';
import type { GrowspaceDevice } from '../../services/types';

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

  const payload: Record<string, unknown> = { growspace_id: data.growspaceId };
  if (data.name !== undefined) payload.name = data.name;
  if (data.rows !== undefined) payload.rows = data.rows;
  if (data.plantsPerRow !== undefined) payload.plants_per_row = data.plantsPerRow;
  if (data.notificationService !== undefined) payload.notification_target = data.notificationService;

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

export async function fetchGrowspaceData(): Promise<void> {
  const collection = await hassCall('growspace_manager/get_data', {}, GrowspaceAPICollectionSchema);
  const devices = Object.values(collection)
    .map((wsData) => GrowspaceAdapter.transformGrowspace(null, wsData))
    .filter((d): d is GrowspaceDevice => d !== null);
  growspaceDevices$.set(devices);
}
