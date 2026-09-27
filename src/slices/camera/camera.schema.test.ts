import { describe, expect, it } from 'vitest';
import {
  GetVisionHistoryV2ResponseSchema,
  VisionCaptureResultSchema,
  VisionStatusSchema,
} from './schema';

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

describe('camera visual baselines (GSM 24cf0e6)', () => {
  const window = (state: string) => ({ state, samples_collected: 4, samples_required: 30 });
  const baseline = {
    camera_id: 'camera.tent',
    grow_run_id: 'run-1',
    epoch: {
      epoch_id: 'epoch-2',
      started_at: '2026-09-03T06:00:00+00:00',
      reason: 'manual_restart',
    },
    windows: { early: window('collecting'), mid: window('monitoring'), late: window('ready') },
  };

  it('keeps each camera’s epoch and window readiness', () => {
    const parsed = GetVisionHistoryV2ResponseSchema.parse({
      history: [],
      total: 0,
      capture_total: 0,
      camera_baselines: [baseline],
    });

    expect(parsed.camera_baselines).toEqual([baseline]);
  });

  it('accepts a camera that has no epoch or Grow Run yet', () => {
    const parsed = GetVisionHistoryV2ResponseSchema.parse({
      history: [],
      total: 0,
      capture_total: 0,
      camera_baselines: [{ ...baseline, grow_run_id: null, epoch: null }],
    });

    expect(parsed.camera_baselines?.[0].epoch).toBeNull();
  });

  it('still parses a released backend that sends neither field', () => {
    const parsed = GetVisionHistoryV2ResponseSchema.parse({
      history: [],
      total: 0,
      capture_total: 0,
    });

    expect(parsed.camera_baselines).toBeUndefined();
  });

  it('refuses a window state the backend never writes', () => {
    const result = GetVisionHistoryV2ResponseSchema.safeParse({
      history: [],
      total: 0,
      capture_total: 0,
      camera_baselines: [{ ...baseline, windows: { ...baseline.windows, mid: window('warming') } }],
    });

    expect(result.success).toBe(false);
  });
});
