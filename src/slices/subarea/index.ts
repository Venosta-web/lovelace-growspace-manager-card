/**
 * Subarea slice — atoms and mutators for Subarea domain data.
 *
 * Public API (atoms):
 *   subareas$       — read: subareas for the most-recently queried growspace
 *   setSubareas()   — write: replace subarea list (called by bootstrap/sync)
 *
 * Public API (mutators):
 *   getSubareas(growspaceId)                          — fetch subareas, updates subareas$
 *   addSubarea(growspaceId, name)                     — add a subarea, appends to subareas$
 *   updateSubarea(growspaceId, subareaId, envConfig)  — update env config (optimistic)
 *   removeSubarea(growspaceId, subareaId)             — remove a subarea (optimistic)
 *
 * Zod schemas and response types are in ./schema.ts.
 */

import { atom } from 'nanostores';
import { hassCall } from '../../services/hass-call';
import { mutate } from '../../services/mutate';
import {
  type Subarea,
  type EnvironmentConfig,
  GetSubareasResponseSchema,
  SubareaResponseSchema,
  RemoveSubareaResponseSchema,
} from './schema';

export type { Subarea, EnvironmentConfig };

// ---------------------------------------------------------------------------
// Atoms (public)
// ---------------------------------------------------------------------------

export const subareas$ = atom<Subarea[]>([]);

// ---------------------------------------------------------------------------
// Bootstrap write (called by SyncService when fresh data arrives)
// ---------------------------------------------------------------------------

export function setSubareas(subareas: Subarea[]): void {
  subareas$.set(subareas);
}

// ---------------------------------------------------------------------------
// Mutators (public)
// ---------------------------------------------------------------------------

/**
 * Fetch all subareas for a growspace.
 *
 * Updates subareas$ with the returned list on success.
 * Re-throws on backend errors without mutating subareas$.
 *
 * @param growspaceId - The growspace to query
 */
export async function getSubareas(growspaceId: string): Promise<Subarea[]> {
  const result = await hassCall(
    'growspace_manager/get_subareas',
    { growspace_id: growspaceId },
    GetSubareasResponseSchema,
  );
  subareas$.set(result);
  return result;
}

/**
 * Add a new subarea to a growspace.
 *
 * No optimistic update — the backend assigns the subarea ID.
 * Appends the returned subarea to subareas$ on success.
 * Re-throws on backend errors without modifying subareas$.
 *
 * @param growspaceId - The growspace to add the subarea to
 * @param name        - Display name for the new subarea
 */
export async function addSubarea(growspaceId: string, name: string): Promise<Subarea> {
  const created = await hassCall(
    'growspace_manager/add_subarea',
    { growspace_id: growspaceId, name },
    SubareaResponseSchema,
  );
  subareas$.set([...subareas$.get(), created]);
  return created;
}

/**
 * Update the environment config of an existing subarea.
 *
 * Optimistic: patches subareas$ immediately.
 * Apply: calls growspace_manager/update_subarea.
 * Inverse: restores the original subareas$ on failure.
 *
 * @param growspaceId       - The parent growspace
 * @param subareaId         - The subarea to update
 * @param environmentConfig - Partial environment config to merge
 */
export async function updateSubarea(
  growspaceId: string,
  subareaId: string,
  environmentConfig: Partial<EnvironmentConfig>,
): Promise<void> {
  const originalList = subareas$.get();
  const patched = originalList.map((s) => {
    if (s.id !== subareaId) return s;
    return { ...s, environment_config: { ...s.environment_config, ...environmentConfig } };
  });

  await mutate(
    {
      type: 'updateSubarea',
      optimistic: () => subareas$.set(patched),
      inverse: () => subareas$.set(originalList),
      apply: () =>
        hassCall(
          'growspace_manager/update_subarea',
          { growspace_id: growspaceId, subarea_id: subareaId, environment_config: environmentConfig },
          SubareaResponseSchema,
        ).then(() => undefined),
    },
    growspaceId,
  );
}

/**
 * Remove a subarea from a growspace.
 *
 * Optimistic: removes the subarea from subareas$ immediately.
 * Apply: calls growspace_manager/remove_subarea.
 * Inverse: restores subareas$ on failure.
 *
 * @param growspaceId - The parent growspace
 * @param subareaId   - The subarea to remove
 */
export async function removeSubarea(growspaceId: string, subareaId: string): Promise<void> {
  const originalList = subareas$.get();
  const filtered = originalList.filter((s) => s.id !== subareaId);

  await mutate(
    {
      type: 'removeSubarea',
      optimistic: () => subareas$.set(filtered),
      inverse: () => subareas$.set(originalList),
      apply: () =>
        hassCall(
          'growspace_manager/remove_subarea',
          { growspace_id: growspaceId, subarea_id: subareaId },
          RemoveSubareaResponseSchema,
        ).then(() => undefined),
    },
    growspaceId,
  );
}
