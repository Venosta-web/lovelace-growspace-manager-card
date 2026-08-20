/**
 * Notification slice — mutators for global notification settings.
 *
 * Public API (mutators):
 *   saveNotificationSettings(payload)  — persist notification timing settings +
 *                                        ai_auto_alerts via the backend WS command
 *
 * Notification settings are global (not growspace-scoped), so this slice holds
 * no atoms — it is a thin write path over the
 * `growspace_manager/save_notification_settings` WebSocket command.
 */

import { hassCall } from '../../services/hass-call';
import {
  type NotificationSettingsPayload,
  type SaveNotificationSettingsResponse,
  type TimedNotificationWire,
  SaveNotificationSettingsResponseSchema,
} from './schema';

export type {
  NotificationSettingsPayload,
  SaveNotificationSettingsResponse,
  TimedNotificationWire,
};

/**
 * Persist notification timing settings and the ai_auto_alerts toggle atomically.
 *
 * @param payload - The full notification_settings dict + ai_auto_alerts flag
 */
export async function saveNotificationSettings(
  payload: NotificationSettingsPayload
): Promise<SaveNotificationSettingsResponse> {
  return hassCall(
    'growspace_manager/save_notification_settings',
    { ...payload },
    SaveNotificationSettingsResponseSchema
  );
}
