/**
 * Logbook slice — atoms and mutators for event log / timeline data.
 *
 * Public API (atoms):
 *   growspaceEvents$   — read: merged log+alert events for the last queried growspace
 *   plantEvents$       — read: merged log+alert events for the last queried plant
 *
 * Public API (bootstrap / sibling writes):
 *   setGrowspaceEvents(entries) — replace growspaceEvents$ (called by sync or cross-slice)
 *   setPlantEvents(entries)     — replace plantEvents$ (called by sync or cross-slice)
 *
 * Public API (mutators):
 *   fetchGrowspaceEvents(growspaceId, limit?) — fetch log+alerts, merge, update growspaceEvents$
 *   fetchPlantEvents(plantId, growspaceId, limit?) — same scoped to a plant
 *   addPlantNote(plantId, payload)      — fire-and-forget: add a note to a plant timeline
 *   addGrowspaceNote(growspaceId, payload) — fire-and-forget: add a note to a growspace
 *   deleteEvent(eventId)                — optimistic remove from both atoms + backend call
 *
 * Zod schemas and response types are in ./schema.ts.
 *
 * Cross-slice notes:
 *   The Plant slice calls setGrowspaceEvents/setPlantEvents after harvest or other
 *   mutations that produce logbook entries, so both atoms stay consistent without
 *   requiring a full refetch.
 */

import { atom } from 'nanostores';
import { hassCall } from '../../services/hass-call';
import { mutate } from '../../services/mutate';
import {
  type LogbookEntry,
  type NotePayload,
  LogResponseSchema,
  AddNoteResponseSchema,
  DeleteEventResponseSchema,
} from './schema';

export type { LogbookEntry, NotePayload };

// ---------------------------------------------------------------------------
// Atoms (public)
// ---------------------------------------------------------------------------

export const growspaceEvents$ = atom<LogbookEntry[]>([]);
export const plantEvents$ = atom<LogbookEntry[]>([]);

// ---------------------------------------------------------------------------
// Bootstrap / sibling writes (public)
// ---------------------------------------------------------------------------

export function setGrowspaceEvents(entries: LogbookEntry[]): void {
  growspaceEvents$.set(entries);
}

export function setPlantEvents(entries: LogbookEntry[]): void {
  plantEvents$.set(entries);
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/** Merge log + alert entries and sort newest-first. */
function _merge(logs: LogbookEntry[], alerts: LogbookEntry[]): LogbookEntry[] {
  return [...logs, ...alerts].sort((a, b) => {
    const tA = new Date(a.timestamp ?? a.start_time).getTime();
    const tB = new Date(b.timestamp ?? b.start_time).getTime();
    return tB - tA;
  });
}

// ---------------------------------------------------------------------------
// Mutators (public)
// ---------------------------------------------------------------------------

/**
 * Fetch log and alert entries for a growspace, merge them, and update growspaceEvents$.
 *
 * Re-throws on backend errors without modifying growspaceEvents$.
 *
 * @param growspaceId - The growspace to query
 * @param limit       - Max log entries (default 50); alerts use 6× this value
 */
export async function fetchGrowspaceEvents(
  growspaceId: string,
  limit = 50
): Promise<LogbookEntry[]> {
  const [logsResp, alertsResp] = await Promise.all([
    hassCall('growspace_manager/get_log', { growspace_id: growspaceId, limit }, LogResponseSchema),
    hassCall(
      'growspace_manager/get_alerts',
      { growspace_id: growspaceId, limit: limit * 6 },
      LogResponseSchema
    ),
  ]);

  const merged = _merge(logsResp[growspaceId] ?? [], alertsResp[growspaceId] ?? []);
  growspaceEvents$.set(merged);
  return merged;
}

/**
 * Fetch log and alert entries scoped to a plant, merge them, and update plantEvents$.
 *
 * Re-throws on backend errors without modifying plantEvents$.
 *
 * @param plantId     - The plant to query
 * @param growspaceId - The plant's current growspace (for shared/irrigation events)
 * @param limit       - Max log entries (default 50); alerts use 6× this value
 */
export async function fetchPlantEvents(
  plantId: string,
  growspaceId: string,
  limit = 50
): Promise<LogbookEntry[]> {
  const [logsResp, alertsResp] = await Promise.all([
    hassCall(
      'growspace_manager/get_log',
      { plant_id: plantId, growspace_id: growspaceId, limit },
      LogResponseSchema
    ),
    hassCall(
      'growspace_manager/get_alerts',
      { plant_id: plantId, growspace_id: growspaceId, limit: limit * 6 },
      LogResponseSchema
    ),
  ]);

  const merged = _merge(logsResp[plantId] ?? [], alertsResp[plantId] ?? []);
  plantEvents$.set(merged);
  return merged;
}

/**
 * Add a note to a plant's timeline (fire-and-forget, no undo).
 *
 * @param plantId - Target plant
 * @param payload - Note content: notes text, optional images, tags, transitionDate
 */
export async function addPlantNote(plantId: string, payload: NotePayload): Promise<void> {
  await hassCall(
    'growspace_manager/add_timeline_note',
    {
      plant_id: plantId,
      notes: payload.notes,
      images: payload.images ?? [],
      tags: payload.tags ?? [],
      transition_date: payload.transitionDate ?? new Date().toISOString(),
    },
    AddNoteResponseSchema
  );
}

/**
 * Add a note to a growspace's log (fire-and-forget, no undo).
 *
 * @param growspaceId - Target growspace
 * @param payload     - Note content: notes text, optional images
 */
export async function addGrowspaceNote(growspaceId: string, payload: NotePayload): Promise<void> {
  await hassCall(
    'growspace_manager/add_growspace_note',
    {
      growspace_id: growspaceId,
      notes: payload.notes,
      images: payload.images ?? [],
    },
    AddNoteResponseSchema
  );
}

/**
 * Delete a logbook/timeline event by ID.
 *
 * Optimistic: removes from growspaceEvents$ and plantEvents$ immediately.
 * Apply: calls growspace_manager/remove_timeline_event.
 * Inverse: restores both atoms on failure.
 *
 * @param eventId - The event_id to delete (string or number)
 */
export async function deleteEvent(eventId: string | number): Promise<void> {
  const originalGrowspace = growspaceEvents$.get();
  const originalPlant = plantEvents$.get();

  const filtered = (entries: LogbookEntry[]) => entries.filter((e) => e.event_id !== eventId);

  const growspaceId =
    [...originalGrowspace, ...originalPlant].find((e) => e.event_id === eventId)?.growspace_id ??
    '';

  await mutate(
    {
      type: 'deleteEvent',
      optimistic: () => {
        growspaceEvents$.set(filtered(originalGrowspace));
        plantEvents$.set(filtered(originalPlant));
      },
      inverse: () => {
        growspaceEvents$.set(originalGrowspace);
        plantEvents$.set(originalPlant);
      },
      apply: () =>
        hassCall(
          'growspace_manager/remove_timeline_event',
          { event_id: eventId },
          DeleteEventResponseSchema
        ).then(() => undefined),
    },
    growspaceId
  );
}
