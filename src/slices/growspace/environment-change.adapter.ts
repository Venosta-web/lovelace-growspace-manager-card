/** Home Assistant adapter for the Environment Change module. */

import { callService } from '../../services/hass-call';
import type {
  ConfigureEnvironmentActionData,
  ConfigureExhaustFanActionData,
  EnvironmentChangeAdapter,
} from '../../features/config/environment-change';

export function createEnvironmentChangeAdapter(
  refresh: () => Promise<void>
): EnvironmentChangeAdapter {
  return {
    async configureEnvironment(payload: ConfigureEnvironmentActionData): Promise<void> {
      await callService('growspace_manager', 'configure_environment', payload);
    },
    async configureExhaustFan(payload: ConfigureExhaustFanActionData): Promise<void> {
      await callService('growspace_manager', 'configure_exhaust_fan', payload);
    },
    refresh,
  };
}
