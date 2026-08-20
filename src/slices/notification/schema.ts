/**
 * Zod schemas for the notification slice.
 *
 * The backend `growspace_manager/save_notification_settings` WebSocket command
 * persists notification timing settings + ai_auto_alerts atomically and replies
 * with `{ success: true }`.
 */

import { z } from 'zod';

export const SaveNotificationSettingsResponseSchema = z.object({
  success: z.boolean(),
});

export type SaveNotificationSettingsResponse = z.infer<
  typeof SaveNotificationSettingsResponseSchema
>;

/**
 * A timed notification, as it appears both in the `timed_notifications` list of
 * the growspace payload and in the save payload below — one shape, declared
 * here (ADR 0031) and imported by `growspace/schema.ts`.
 */
export const TimedNotificationSchema = z.object({
  id: z.string(),
  message: z.string(),
  trigger_type: z.string(),
  day: z.number(),
  growspace_ids: z.array(z.string()),
});

export type TimedNotificationWire = z.infer<typeof TimedNotificationSchema>;

/** Settings persisted by `saveNotificationSettings`. Outbound, so strict. */
export const NotificationSettingsPayloadSchema = z.strictObject({
  notification_settings: z.record(z.string(), z.number()),
  ai_auto_alerts: z.boolean(),
  timed_notifications: z.array(TimedNotificationSchema).optional(),
});

export type NotificationSettingsPayload = z.infer<typeof NotificationSettingsPayloadSchema>;
