/** Translate a dedicated Vision Draft command at the Camera action boundary. */
import type { VisionWriteCommand } from '../../features/config/environment-draft';
import { updateVisionCheckupConfig } from './index';

export async function executeVisionWrite(command: VisionWriteCommand): Promise<void> {
  const { config } = command;
  await updateVisionCheckupConfig(command.growspaceId, {
    enabled: config.visionEnabled,
    early_check_offset_minutes: config.visionEarlyOffset,
    mid_check_hours: config.visionMidHours,
    late_check_offset_minutes: config.visionLateOffset,
  });
}
