import { describe, expect, it } from 'vitest';
import { VisionCaptureResultSchema, VisionStatusSchema } from './schema';

describe('Vision V1 schema versions', () => {
  it('refuses a service status from an unsupported Vision schema', () => {
    const result = VisionStatusSchema.safeParse({
      availability: 'ready',
      connection_source: 'supervisor',
      service_version: '2.0.0',
      vision_schema_version: 2,
      model: { id: 'dinov2-small', version: '1.0.0', dimension: 384 },
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['vision_schema_version'],
          message: expect.stringContaining('1'),
        }),
      ])
    );
  });

  it('refuses stored evidence stamped with an unsupported Vision schema', () => {
    const result = VisionCaptureResultSchema.safeParse({
      capture_id: 'capture-1',
      camera_id: 'camera.test',
      captured_at: '2026-09-04T08:00:00Z',
      analysis_state: 'analyzed',
      image: { available: false },
      quality: { accepted: true, reasons: [] },
      provenance: { vision_schema_version: 2 },
      visual: { outcome: 'monitoring', unavailable_reasons: [] },
      environment: { verdict: 'unavailable', stress_reasons: [], mold_reasons: [] },
      fusion: { unavailable_reasons: [] },
      trend: [],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['provenance', 'vision_schema_version'],
          message: expect.stringContaining('1'),
        }),
      ])
    );
  });
});
