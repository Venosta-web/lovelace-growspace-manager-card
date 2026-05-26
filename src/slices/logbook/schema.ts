/**
 * Logbook slice — zod schemas for WebSocket response validation.
 *
 * Consolidates the GrowspaceEvent interface from
 * `src/features/environment/types.ts` and the NotePayload from
 * `src/services/timeline-service.ts`.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// LogbookEntry (a.k.a. GrowspaceEvent in legacy code)
// ---------------------------------------------------------------------------

export const LogbookEntrySchema = z.object({
  // Required for all entries
  growspace_id: z.string(),
  category: z.string(),
  // Optional: present on GrowspaceEvent entries (watering/training/IPM/alert),
  // absent on note entries which carry `notes` instead.
  sensor_type: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  duration_sec: z.number().optional(),
  severity: z.number().optional(),
  reasons: z.array(z.string()).optional(),
  timestamp: z.string().optional(),
  notes: z.string().optional(),
  images: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  plant_id: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  event_id: z.union([z.string(), z.number()]).optional(),
});

export type LogbookEntry = z.infer<typeof LogbookEntrySchema>;

// ---------------------------------------------------------------------------
// Response schemas
// ---------------------------------------------------------------------------

/**
 * get_log and get_alerts both return Record<id, LogbookEntry[]>.
 * The key is either growspace_id or plant_id depending on the call.
 */
export const LogResponseSchema = z.record(z.array(LogbookEntrySchema));

export type LogResponse = z.infer<typeof LogResponseSchema>;

/** remove_timeline_event returns nothing meaningful. */
export const DeleteEventResponseSchema = z.unknown();

/** add_timeline_note and add_growspace_note return nothing meaningful. */
export const AddNoteResponseSchema = z.unknown();

// ---------------------------------------------------------------------------
// NotePayload
// ---------------------------------------------------------------------------

export interface NotePayload {
  notes: string;
  images?: string[];
  tags?: string[];
  transitionDate?: string;
}
