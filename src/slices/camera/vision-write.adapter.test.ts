import { describe, expect, it, vi } from 'vitest';
import { updateVisionCheckupConfig } from './index';
import { executeVisionWrite } from './vision-write.adapter';

vi.mock('./index', () => ({
  updateVisionCheckupConfig: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Vision write adapter', () => {
  it('maps one draft command to the Camera action wire form', async () => {
    await executeVisionWrite({
      growspaceId: 'tent-1',
      config: {
        visionEnabled: true,
        visionEarlyOffset: 90,
        visionMidHours: 8,
        visionLateOffset: 45,
      },
    });
    expect(updateVisionCheckupConfig).toHaveBeenCalledWith('tent-1', {
      enabled: true,
      early_check_offset_minutes: 90,
      mid_check_hours: 8,
      late_check_offset_minutes: 45,
    });
  });
});
