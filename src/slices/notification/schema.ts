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
