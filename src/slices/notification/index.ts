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
  type SaveNotificationSettingsResponse,
  SaveNotificationSettingsResponseSchema,
} from './schema';

export type { SaveNotificationSettingsResponse };

/** A timed notification in the backend (snake_case) wire shape. */
export interface TimedNotificationWire {
  id: string;
  message: string;
  trigger_type: string;
  day: number;
  growspace_ids: string[];
}

/** Settings persisted by {@link saveNotificationSettings}. */
export interface NotificationSettingsPayload {
  notification_settings: Record<string, number>;
  ai_auto_alerts: boolean;
  timed_notifications?: TimedNotificationWire[];
}

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
