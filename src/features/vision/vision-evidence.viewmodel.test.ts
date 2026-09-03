import { describe, expect, it } from 'vitest';
import {
  confidenceSentence,
  createContinuityViewModel,
  createServiceViewModel,
  createVisionEvidenceViewModel,
  rankSentence,
  type VisionEvidenceDeps,
  type VisionEvidenceInput,
} from './vision-evidence.viewmodel';
import type { VisionCaptureResult, VisionCheckup, VisionStatus } from '../../slices/camera';
import type { TriageAlert } from '../../slices/ai-insight/schema';

const DEPS: VisionEvidenceDeps = {
  cameraName: (entityId) => `Camera ${entityId.split('.')[1]}`,
  language: 'en',
};

function capture(overrides: Partial<VisionCaptureResult> = {}): VisionCaptureResult {
  return {
    capture_id: 'cap-1',
    camera_id: 'camera.tent_a',
    captured_at: '2026-09-01T14:02:00+00:00',
    analysis_state: 'analyzed',
    image: { available: true, media_content_id: 'media-source://media_source/local/x.jpg' },
    quality: { accepted: true, reasons: [] },
    provenance: { model_id: 'dinov2', model_version: '1.0.0' },
    visual: {
      outcome: 'scored',
      baseline_state: 'ready',
      samples_collected: 30,
      samples_required: 30,
      raw_distance: 0.184,
      anomaly_score: 0.9,
      verdict: 'normal',
      comparison_confidence: 0.82,
      unavailable_reasons: [],
    },
    environment: {
      verdict: 'within_evaluated_range',
      stress_reasons: [],
      mold_reasons: [],
    },
    fusion: {
      state: 'no_detected_change',
      confidence: 'confirmed',
      coverage: 'complete',
      unavailable_reasons: [],
    },
    trend: [],
    ...overrides,
  } as VisionCaptureResult;
}

function checkup(captures: VisionCaptureResult[] = [capture()]): VisionCheckup {
  return {
    result_schema: 'evidence_v1',
    checkup_id: 'chk-1',
    growspace_id: 'gs-1',
    trigger_source: 'scheduled',
    light_window: 'mid',
    started_at: '2026-09-01T14:00:00+00:00',
    completed_at: '2026-09-01T14:03:00+00:00',
    status: 'completed',
    captures,
  };
}

function input(overrides: Partial<VisionEvidenceInput> = {}): VisionEvidenceInput {
  return {
    history: [checkup()],
    total: 1,
    status: null,
    alerts: [],
    images: {},
    ...overrides,
  };
}

const build = (overrides: Partial<VisionEvidenceInput> = {}) =>
  createVisionEvidenceViewModel(input(overrides), DEPS);

const firstCapture = (overrides: Partial<VisionEvidenceInput> = {}) =>
  build(overrides).checkups[0].captures[0];

// ─── The Anomaly Score is a sentence ──────────────────────────────────────────

describe('the Anomaly Score', () => {
  it('is said as a rank against the baseline, never as a bare number', () => {
    const visual = capture().visual;
    expect(rankSentence(visual, 'en')).toBe(
      "Further from this camera's recent history than 27 of the 30 frames in its baseline."
    );
  });

  it('says "all" rather than a rank equal to the member count at the ceiling', () => {
    const visual = { ...capture().visual, anomaly_score: 1 };
    expect(rankSentence(visual, 'en')).toBe(
      "Further from this camera's recent history than all 30 frames in its baseline."
    );
  });

  it('is withheld entirely when there is no member count to rank against', () => {
    const visual = { ...capture().visual, samples_collected: undefined };
    expect(rankSentence(visual, 'en')).toBeNull();
  });

  it('never reaches the surface as a decimal — the numeral lives only in the disclosure', () => {
    const vm = firstCapture().visual;
    const surface = [vm.title, vm.gloss, vm.rank, vm.confidence, vm.caveat].join(' ');

    expect(surface).not.toMatch(/0\.\d/);
    expect(vm.numbers.map((row) => row.value)).toContain('0.90');
    expect(vm.numbersNote).toContain('not a probability');
  });
});

describe('Comparison Confidence', () => {
  it('is separation from the borderline band, never a bare percentage on its own', () => {
    expect(confidenceSentence(capture().visual, 'en')).toBe(
      'Clear of the borderline band (82% separation).'
    );
  });

  it('reads as proximity below the separation threshold', () => {
    const visual = { ...capture().visual, comparison_confidence: 0.4 };
    expect(confidenceSentence(visual, 'en')).toBe('Close to the borderline band (40% separation).');
  });
});

// ─── The two channels never merge ─────────────────────────────────────────────

describe('the two channels', () => {
  it('keeps environmental risk out of the visual column entirely', () => {
    const vm = firstCapture({
      history: [
        checkup([
          capture({
            environment: {
              verdict: 'risk',
              stress_reasons: ['vpd_above_range'],
              mold_reasons: [],
            },
            fusion: {
              state: 'environmental_risk',
              confidence: 'confirmed',
              coverage: 'complete',
              unavailable_reasons: [],
            },
          }),
        ]),
      ],
    });

    const visualText = [vm.visual.title, vm.visual.gloss, vm.visual.rank, vm.visual.caveat].join(
      ' '
    );
    expect(visualText).not.toMatch(/VPD|risk|sensor/i);
    expect(vm.environment.reasons).toEqual(['VPD above range']);
    expect(vm.environment.neverVisual).toContain('never a report of visible plant stress');
  });

  it('names both channels only in the fusion band, and only as co-occurrence', () => {
    const vm = firstCapture({
      history: [
        checkup([
          capture({
            fusion: {
              state: 'concurrent_environmental_risk_and_visual_anomaly',
              confidence: 'monitor',
              coverage: 'complete',
              unavailable_reasons: [],
            },
          }),
        ]),
      ],
    });

    expect(vm.fusion.title).toBe('Both, at the same time');
    expect(vm.fusion.caveat).toContain('Co-occurrence only');
    expect(vm.fusion.tone).toBe('alert');
  });
});

// ─── Absence is never styled as calm ──────────────────────────────────────────

describe('unavailable evidence', () => {
  it('gives a silent visual column the quiet tone and says the silence is not normal', () => {
    const vm = firstCapture({
      history: [
        checkup([
          capture({
            analysis_state: 'rejected',
            quality: { accepted: false, reasons: ['below_absolute_luminance_floor'] },
            visual: { outcome: 'unavailable', unavailable_reasons: ['frame_rejected'] },
          }),
        ]),
      ],
    });

    expect(vm.visual.tone).toBe('quiet');
    expect(vm.visual.gloss).toBe(
      'No Visual Comparison Result, because the frame was not usable, so there was nothing to compare.'
    );
    expect(vm.visual.silentNote).toBe(
      'This column is silent. A silent column is not a normal reading.'
    );
    expect(vm.visual.rank).toBeNull();
  });

  it('keeps an unusable capture visible and says so', () => {
    const vm = firstCapture({
      history: [
        checkup([
          capture({
            quality: { accepted: false, reasons: ['relative_detail_collapse'] },
            visual: { outcome: 'unavailable', unavailable_reasons: ['frame_rejected'] },
          }),
        ]),
      ],
    });

    expect(vm.gate.quality.value).toBe('unusable');
    expect(vm.gate.quality.tone).toBe('alert');
    expect(vm.gate.reasons).toEqual([
      "Detail fell below half of this camera's recent typical level.",
    ]);
    expect(vm.gate.keptNote).toContain('never silently dropped');
  });

  it('does not colour missing environmental evidence as calm', () => {
    const vm = firstCapture({
      history: [
        checkup([
          capture({
            environment: { verdict: 'unavailable', stress_reasons: [], mold_reasons: [] },
          }),
        ]),
      ],
    });

    expect(vm.environment.tone).toBe('quiet');
    expect(vm.environment.caveat).toContain('Unavailable is not fine');
  });

  it('does not colour an absent fusion outcome as calm', () => {
    const vm = firstCapture({
      history: [
        checkup([
          capture({
            fusion: { unavailable_reasons: ['visual_comparison_unavailable'] },
          }),
        ]),
      ],
    });

    expect(vm.fusion.tone).toBe('quiet');
    expect(vm.fusion.gloss).toBe(
      'Nothing was fused, because there is no Visual Comparison Result to fuse.'
    );
    expect(vm.fusion.caveat).toBe('An absent outcome is not a quiet one.');
  });

  it('flags partial coverage rather than letting it pass as complete', () => {
    const vm = firstCapture({
      history: [
        checkup([
          capture({
            fusion: {
              state: 'visual_anomaly',
              confidence: 'monitor',
              coverage: 'partial',
              unavailable_reasons: [],
            },
          }),
        ]),
      ],
    });

    expect(vm.fusion.chips).toEqual(['held as monitor', 'partial coverage']);
    expect(vm.fusion.coverageNote).toContain('could not speak');
  });
});

// ─── Baseline State is readiness, never calibration ───────────────────────────

describe('Baseline State', () => {
  it('reports monitoring with its collection progress', () => {
    const vm = firstCapture({
      history: [
        checkup([
          capture({
            visual: {
              outcome: 'monitoring',
              baseline_state: 'monitoring',
              samples_collected: 12,
              samples_required: 30,
              unavailable_reasons: ['baseline_not_ready'],
            },
          }),
        ]),
      ],
    });

    expect(vm.gate.baseline.value).toBe('monitoring only (12 of 30)');
    expect(vm.gate.baseline.tone).toBe('quiet');
    expect(vm.visual.title).toBe('Not compared yet');
  });

  it('marks a stale baseline as something to watch, not as a failure', () => {
    const vm = firstCapture({
      history: [checkup([capture({ visual: { ...capture().visual, baseline_state: 'stale' } })])],
    });

    expect(vm.gate.baseline.value).toBe('stale (30 of 30)');
    expect(vm.gate.baseline.tone).toBe('watch');
  });

  it('carries the permanent calibration line so readiness is never read as calibration', () => {
    const vm = build();
    expect(vm.calibrationLineLead).toBe('Plant-health calibration: none in V1.');
    expect(vm.scopeLineLead).toBe('Scene-change monitoring only.');
  });
});

// ─── Material scene change ────────────────────────────────────────────────────

describe('a material scene change', () => {
  it('says the scene changed and refuses to name a cause or a plant condition', () => {
    const vm = firstCapture({
      history: [
        checkup([
          capture({
            visual: { ...capture().visual, verdict: 'material_scene_change', anomaly_score: 1 },
          }),
        ]),
      ],
    });

    expect(vm.visual.title).toBe('Materially different scene');
    expect(vm.visual.tone).toBe('alert');
    expect(vm.visual.caveat).toContain('not a plant verdict');
  });
});

// ─── Trend ────────────────────────────────────────────────────────────────────

describe('the trend', () => {
  it('reverses the newest-first projection so the chart runs forward in time', () => {
    const vm = firstCapture({
      history: [
        checkup([
          capture({
            trend: [
              { evaluated_at: '2026-09-01T12:00:00+00:00', anomaly_score: 0.9, verdict: 'normal' },
              { evaluated_at: '2026-08-31T12:00:00+00:00', anomaly_score: 0.2, verdict: 'normal' },
            ],
          }),
        ]),
      ],
    });

    expect(vm.visual.trend!.points.map((point) => point.score)).toEqual([0.2, 0.9]);
    expect(vm.visual.trend!.accessibleLabel).toContain('oldest first');
  });

  it('reads the environmental column history off the fusion states the trend carries', () => {
    const vm = firstCapture({
      history: [
        checkup([
          capture({
            trend: [
              {
                evaluated_at: '2026-09-01T12:00:00+00:00',
                anomaly_score: 0.4,
                verdict: 'normal',
                fusion_state: 'environmental_risk',
              },
              {
                evaluated_at: '2026-08-31T12:00:00+00:00',
                anomaly_score: 0.3,
                verdict: 'normal',
                fusion_state: 'no_detected_change',
              },
            ],
          }),
        ]),
      ],
    });

    expect(vm.environment.history.map((point) => point.risk)).toEqual([false, true]);
    expect(vm.environment.historySummary).toContain('2 evaluated captures');
  });
});

// ─── Connection and model state ───────────────────────────────────────────────

describe('the service strip', () => {
  it('names the pinned model when the service is ready', () => {
    const status: VisionStatus = {
      availability: 'ready',
      connection_source: 'supervisor',
      vision_schema_version: 1,
      model: { id: 'dinov2', version: '1.0.0', dimension: 384 },
    };

    const vm = createServiceViewModel(status, 'en');
    expect(vm.ready).toBe(true);
    expect(vm.tone).toBe('calm');
    expect(vm.detail).toBe('model dinov2 1.0.0 · 384-d · schema v1 · via Supervisor discovery');
  });

  it('reports an unavailable service by reason, without claiming a fault it cannot see', () => {
    const vm = createServiceViewModel(
      { availability: 'unavailable', reason: 'not_running', connection_source: 'supervisor' },
      'en'
    );

    expect(vm.tone).toBe('quiet');
    expect(vm.detail).toBe('The Growspace Vision App is installed but not running.');
  });

  it('treats an incompatible schema as an alert, not as a quiet absence', () => {
    const vm = createServiceViewModel(
      { availability: 'incompatible', reason: 'schema_mismatch', connection_source: 'manual' },
      'en'
    );

    expect(vm.tone).toBe('alert');
    expect(vm.label).toBe('Vision incompatible');
  });

  it('falls back to unavailable when the status was never fetched', () => {
    expect(createServiceViewModel(null, 'en').ready).toBe(false);
  });
});

// ─── Capture Continuity Break ─────────────────────────────────────────────────

function continuityAlert(overrides: Partial<TriageAlert> = {}): TriageAlert {
  return {
    id: 'alert-1',
    growspace_id: 'gs-1',
    type: 'capture_continuity_break',
    severity: 'warning',
    bayesian_reasons: [],
    ai_reasoning: null,
    timestamp: 1_756_000_000,
    resolved: false,
    resolution_note: null,
    camera_id: 'camera.tent_a',
    streak_started_at: 1_755_900_000,
    consecutive_count: 4,
    reason_counts: { frame_rejected: 3, vision_unavailable: 1 },
    condition_active: true,
    ...overrides,
  } as TriageAlert;
}

describe('a Capture Continuity Break', () => {
  it('takes the equipment tone, off the severity ramp', () => {
    const vm = createContinuityViewModel([continuityAlert()], 'camera.tent_a', 'en')!;

    expect(vm.tone).toBe('equipment');
    expect(vm.kind).toBe('Equipment condition');
    expect(vm.title).toContain('check the equipment');
    expect(vm.detail).toContain('4 consecutive scheduled captures');
    expect(vm.detail).toContain('3× frame rejected');
    expect(vm.note).toBe('This names no cause and no plant condition.');
  });

  it('is not shown once the condition clears, even though the alert record survives', () => {
    expect(
      createContinuityViewModel(
        [continuityAlert({ condition_active: false })],
        'camera.tent_a',
        'en'
      )
    ).toBeNull();
  });

  it("belongs to one camera and never leaks onto another camera's ledger", () => {
    expect(createContinuityViewModel([continuityAlert()], 'camera.tent_b', 'en')).toBeNull();
  });

  it('reaches the capture that shares its camera', () => {
    const vm = firstCapture({ alerts: [continuityAlert()] });
    expect(vm.continuity).not.toBeNull();
    expect(vm.continuity!.cameraId).toBe('camera.tent_a');
  });
});

// ─── History and the legacy tail ──────────────────────────────────────────────

describe('history', () => {
  it('renders a legacy row as attribution and never as V1 evidence', () => {
    const vm = build({
      history: [
        {
          result_schema: 'legacy_cloud_v1',
          timestamp: '2026-05-01T09:00:00+00:00',
          check_type: 'mid',
          analysis: 'Leaves look pale.',
          issues_detected: ['chlorosis'],
          severity: 'high',
          recommendations: ['Check feed EC'],
          snapshot_paths: [],
        },
      ],
      total: 1,
    });

    expect(vm.checkups).toHaveLength(0);
    expect(vm.legacy[0].label).toBe('Legacy cloud analysis');
    expect(vm.legacy[0].severity).toBe('Recorded severity: high');
    expect(vm.legacy[0].note).toContain('not V1 fusion evidence');
  });

  it('reports a checkup outcome as how the task ran, with no cross-camera verdict', () => {
    const vm = build().checkups[0];

    expect(vm.status).toBe('Completed');
    expect(vm.statusNote).toContain('not what it found');
    expect(vm.noVerdictNote).toContain('no combined cross-camera verdict');
    expect(vm.cameraCount).toBe('1 camera');
  });

  it('says how much of the history is on screen when the backend holds more', () => {
    expect(build({ total: 12 }).moreNote).toBe('1 of 12 checkups shown');
    expect(build({ total: 1 }).moreNote).toBeNull();
  });

  it('is empty only when nothing at all came back', () => {
    expect(build({ history: [], total: 0 }).isEmpty).toBe(true);
    expect(build().isEmpty).toBe(false);
  });
});

// ─── Images ───────────────────────────────────────────────────────────────────

describe('the capture frame', () => {
  it('uses the resolved URL when the transport layer supplied one', () => {
    const vm = firstCapture({ images: { 'cap-1': '/media/local/x.jpg?authSig=abc' } });
    expect(vm.visual.imageUrl).toBe('/media/local/x.jpg?authSig=abc');
    expect(vm.visual.imageAlt).toContain('Camera tent_a');
  });

  it('says the stored frame is gone rather than rendering a broken image', () => {
    const vm = firstCapture({
      history: [checkup([capture({ image: { available: false } })])],
    });
    expect(vm.visual.imageUrl).toBeNull();
    expect(vm.visual.imageUnavailable).toBe('The stored frame is no longer available.');
  });
});

// ─── Localization ─────────────────────────────────────────────────────────────

describe('localization', () => {
  it('routes every string through the localize table', () => {
    const vm = createVisionEvidenceViewModel(input(), { ...DEPS, language: 'de' });
    // No German table ships yet, so `de` must fall back to English rather than
    // emitting raw keys — a missing locale is not a missing string.
    expect(vm.scopeLineLead).toBe('Scene-change monitoring only.');
    expect(vm.checkups[0].captures[0].visual.title).toBe('Matches recent history');
  });

  it('humanises an unmapped backend reason instead of dropping it', () => {
    const vm = firstCapture({
      history: [
        checkup([
          capture({
            environment: {
              verdict: 'risk',
              stress_reasons: ['some_new_backend_reason'],
              mold_reasons: [],
            },
          }),
        ]),
      ],
    });

    expect(vm.environment.reasons).toEqual(['some new backend reason']);
  });
});
