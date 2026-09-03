import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import '../../src/features/vision/components/growspace-vision-evidence';
import type { GrowspaceVisionEvidence } from '../../src/features/vision/components/growspace-vision-evidence';
import type { GrowspaceVisionCaptureLedger } from '../../src/features/vision/components/growspace-vision-capture-ledger';
import {
  createVisionEvidenceViewModel,
  type VisionEvidenceInput,
  type VisionEvidenceViewModel,
} from '../../src/features/vision/vision-evidence.viewmodel';
import type { VisionCaptureResult, VisionCheckup } from '../../src/slices/camera';
import type { TriageAlert } from '../../src/slices/ai-insight/schema';

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
    environment: { verdict: 'within_evaluated_range', stress_reasons: [], mold_reasons: [] },
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

function viewModel(overrides: Partial<VisionEvidenceInput> = {}): VisionEvidenceViewModel {
  return createVisionEvidenceViewModel(
    {
      history: [checkup()],
      total: 1,
      status: {
        availability: 'ready',
        connection_source: 'supervisor',
        vision_schema_version: 1,
        model: { id: 'dinov2', version: '1.0.0', dimension: 384 },
      },
      alerts: [],
      images: { 'cap-1': '/media/local/x.jpg?authSig=abc' },
      ...overrides,
    },
    { cameraName: (id) => `Camera ${id.split('.')[1]}`, language: 'en' }
  );
}

async function mount(
  overrides: Partial<VisionEvidenceInput> = {},
  props: { loading?: boolean; error?: string } = {}
): Promise<GrowspaceVisionEvidence> {
  return fixture<GrowspaceVisionEvidence>(html`
    <growspace-vision-evidence
      .vm=${viewModel(overrides)}
      .loading=${props.loading ?? false}
      .error=${props.error ?? ''}
    ></growspace-vision-evidence>
  `);
}

function ledgerOf(element: GrowspaceVisionEvidence): GrowspaceVisionCaptureLedger {
  return element.shadowRoot!.querySelector<GrowspaceVisionCaptureLedger>(
    'growspace-vision-capture-ledger'
  )!;
}

function textOf(root: ParentNode, selector: string): string {
  return (root.querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('growspace-vision-evidence', () => {
  it('heads the panel with connection and model state', async () => {
    const element = await mount();
    const service = element.shadowRoot!.querySelector('.service')!;

    expect(service.className).toContain('tone-calm');
    expect(service.textContent).toContain('Vision connected');
    expect(service.textContent).toContain('dinov2 1.0.0');
    expect(service.getAttribute('role')).toBe('status');
  });

  it('carries both permanent scope lines on every render', async () => {
    const element = await mount();
    const scope = element.shadowRoot!.querySelector('.scope')!.textContent!;

    expect(scope).toContain('Scene-change monitoring only.');
    expect(scope).toContain('Plant-health calibration: none in V1.');
  });

  it('renders one ledger per capture and no cross-camera verdict', async () => {
    const element = await mount({
      history: [checkup([capture(), capture({ capture_id: 'cap-2', camera_id: 'camera.tent_b' })])],
    });

    expect(element.shadowRoot!.querySelectorAll('growspace-vision-capture-ledger')).toHaveLength(2);
    expect(element.shadowRoot!.textContent).toContain('no combined cross-camera verdict');
  });

  it('shows an empty state rather than an empty ledger', async () => {
    const element = await mount({ history: [], total: 0 });

    expect(element.shadowRoot!.querySelector('growspace-vision-capture-ledger')).toBeNull();
    expect(textOf(element.shadowRoot!, '.state h4')).toBe('No Vision evidence yet');
  });

  it('offers a retry that emits one intent and mutates nothing itself', async () => {
    const element = await mount({ history: [], total: 0 }, { error: 'Nope.' });
    let fired = 0;
    element.addEventListener('vision-retry', () => (fired += 1));

    element.shadowRoot!.querySelector<HTMLButtonElement>('button.retry')!.click();
    expect(fired).toBe(1);
  });

  it('renders a legacy row as dashed attribution, never as a toned V1 outcome', async () => {
    const element = await mount({
      history: [
        {
          result_schema: 'legacy_cloud_v1',
          timestamp: '2026-05-01T09:00:00+00:00',
          check_type: 'mid',
          analysis: 'Leaves look pale.',
          issues_detected: ['chlorosis'],
          severity: 'high',
          recommendations: [],
          snapshot_paths: [],
        },
      ],
    });

    const legacy = element.shadowRoot!.querySelector('.legacy')!;
    expect(legacy.textContent).toContain('Legacy cloud analysis');
    expect(legacy.textContent).toContain('Recorded severity: high');
    expect(legacy.className).not.toMatch(/tone-(calm|watch|alert)/);
  });
});

describe('growspace-vision-capture-ledger', () => {
  it('keeps the two channels as siblings, never nesting one inside the other', async () => {
    const root = ledgerOf(await mount()).shadowRoot!;
    const channels = root.querySelectorAll('.channels > section.channel');

    expect(channels).toHaveLength(2);
    expect(textOf(channels[0], 'h5')).toBe('What the camera saw');
    expect(textOf(channels[1], 'h5')).toBe('What the sensors measured');
    expect(channels[0].contains(channels[1])).toBe(false);
    // The rule between them is presentational, so it never lands in the a11y tree.
    expect(root.querySelector('.rule')!.getAttribute('role')).toBe('presentation');
  });

  it('states the Anomaly Score as a sentence and hides the decimal behind a disclosure', async () => {
    const root = ledgerOf(await mount()).shadowRoot!;
    const visual = root.querySelector('section.channel')!;
    const disclosure = root.querySelector<HTMLDetailsElement>('details')!;

    expect(textOf(visual, '.rank')).toContain('than 27 of the 30 frames in its baseline');
    expect(disclosure.open).toBe(false);
    expect(textOf(disclosure, 'summary')).toBe('Numbers behind this');
    expect(disclosure.textContent).toContain('0.90');
    expect(disclosure.textContent).toContain('not a probability');
  });

  it('never renders a gauge or a numeral badge for the score', async () => {
    const root = ledgerOf(await mount()).shadowRoot!;

    expect(root.querySelector('progress, meter')).toBeNull();
    expect(textOf(root, '.verdict')).toContain('Matches recent history');
    expect(textOf(root, '.verdict')).not.toMatch(/\d/);
  });

  it('pairs every tone with a word, so colour is never the only signal', async () => {
    const root = ledgerOf(await mount()).shadowRoot!;
    const toned = root.querySelectorAll('[class*="tone-"]');

    expect(toned.length).toBeGreaterThan(0);
    for (const element of toned) {
      if (element.classList.contains('rule')) continue;
      expect(element.querySelector('.cue')).not.toBeNull();
    }
  });

  it('labels the gate strip with both terms in full', async () => {
    const gate = ledgerOf(await mount()).shadowRoot!.querySelector('.gate')!;

    expect(gate.textContent).toContain('Frame Quality Result:');
    expect(gate.textContent).toContain('usable');
    expect(gate.textContent).toContain('Baseline State:');
    expect(gate.textContent).toContain('ready (30 of 30)');
  });

  it('shows an unusable capture with its reasons rather than dropping it', async () => {
    const element = await mount({
      history: [
        checkup([
          capture({
            quality: { accepted: false, reasons: ['below_absolute_luminance_floor'] },
            visual: { outcome: 'unavailable', unavailable_reasons: ['frame_rejected'] },
          }),
        ]),
      ],
    });
    const root = ledgerOf(element).shadowRoot!;

    expect(root.querySelector('.gate')!.textContent).toContain('unusable');
    expect(root.querySelector('.gate-reasons')!.textContent).toContain('Too dark to analyse');
    expect(root.querySelector('section.channel')!.textContent).toContain(
      'A silent column is not a normal reading'
    );
  });

  it('gives the Capture Continuity Break its own banner, off the severity ramp', async () => {
    const alert = {
      id: 'a1',
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
      reason_counts: { frame_rejected: 4 },
      condition_active: true,
    } as TriageAlert;

    const root = ledgerOf(await mount({ alerts: [alert] })).shadowRoot!;
    const banner = root.querySelector('.continuity')!;

    expect(banner.className).toContain('tone-equipment');
    expect(banner.className).not.toMatch(/tone-(calm|watch|alert)/);
    expect(banner.textContent).toContain('Capture Continuity Break');
    expect(banner.textContent).toContain('names no cause and no plant condition');
    expect(banner.getAttribute('aria-labelledby')).toBe('continuity-heading');
  });

  it('omits the banner when no continuity break is active', async () => {
    expect(ledgerOf(await mount()).shadowRoot!.querySelector('.continuity')).toBeNull();
  });

  it('names the fusion band and says both channels only there', async () => {
    const root = ledgerOf(await mount()).shadowRoot!;
    const fusion = root.querySelector('.fusion')!;

    expect(textOf(fusion, '.eyebrow')).toBe('Evidence Fusion Outcome');
    expect(fusion.textContent).toContain('Nothing detected');
    expect(fusion.textContent).toContain('not a clean bill of health');
  });

  it('keeps the optional cloud explanation collapsed and marked as generated', async () => {
    const element = await mount({
      history: [
        checkup([
          capture({
            report: {
              observation: 'Lower leaves are lighter.',
              environmental_risk: 'VPD ran high overnight.',
              hypothesis: 'Possible feed issue.',
              recommendations: ['Check EC'],
            },
          }),
        ]),
      ],
    });
    const report = ledgerOf(element).shadowRoot!.querySelector<HTMLDetailsElement>(
      'details.report'
    )!;

    expect(report.open).toBe(false);
    expect(textOf(report, 'summary')).toContain('generated text, may disagree');
    expect(report.textContent).toContain('never a diagnosis');
  });

  it('describes the sparkline for assistive technology and titles every point', async () => {
    const element = await mount({
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
    const svg = ledgerOf(element).shadowRoot!.querySelector('.spark svg')!;

    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toContain('oldest first');
    expect(svg.querySelectorAll('circle title')).toHaveLength(2);
  });

  it('reflows to one column below the width where two columns stop working', async () => {
    const ledger = ledgerOf(await mount());
    // The ledger is its own container, so it reflows on its own width rather
    // than the viewport's — it renders inside a dialog of unrelated width.
    expect(getComputedStyle(ledger).containerType).toBe('inline-size');

    ledger.style.width = '400px';
    await ledger.updateComplete;
    const channels = ledger.shadowRoot!.querySelector('.channels')!;
    expect(getComputedStyle(channels).gridTemplateColumns.split(' ')).toHaveLength(1);

    ledger.style.width = '900px';
    await ledger.updateComplete;
    expect(getComputedStyle(channels).gridTemplateColumns.split(' ')).toHaveLength(3);
  });

  it('never lets its content scroll the panel sideways', async () => {
    const element = await mount({
      history: [
        checkup([
          capture({
            trend: [
              { evaluated_at: '2026-09-01T12:00:00+00:00', anomaly_score: 0.88, verdict: 'uncertain' },
              { evaluated_at: '2026-08-31T12:00:00+00:00', anomaly_score: 0.22, verdict: 'normal' },
            ],
          }),
        ]),
      ],
    });
    const ledger = ledgerOf(element);

    for (const width of [360, 420, 620, 900]) {
      ledger.style.width = `${width}px`;
      await ledger.updateComplete;
      const root = ledger.shadowRoot!;
      for (const selector of ['.channels', 'section.channel', '.gate', '.fusion']) {
        for (const node of root.querySelectorAll<HTMLElement>(selector)) {
          expect(
            node.scrollWidth,
            `${selector} overflows at ${width}px`
          ).toBeLessThanOrEqual(node.clientWidth + 1);
        }
      }
    }
  });

  it('colours each sparkline point by its own verdict', async () => {
    const element = await mount({
      history: [
        checkup([
          capture({
            trend: [
              {
                evaluated_at: '2026-09-01T12:00:00+00:00',
                anomaly_score: 0.98,
                verdict: 'material_scene_change',
              },
              { evaluated_at: '2026-08-31T12:00:00+00:00', anomaly_score: 0.22, verdict: 'normal' },
            ],
          }),
        ]),
      ],
    });
    const circles = ledgerOf(element).shadowRoot!.querySelectorAll('.spark circle');

    expect(circles).toHaveLength(2);
    const fills = [...circles].map((circle) => getComputedStyle(circle).fill);
    expect(new Set(fills).size).toBe(2);
    for (const fill of fills) {
      expect(fill).not.toBe('none');
      // Black is what an unresolved `var()` in an SVG presentation attribute
      // renders as, which is invisible on this surface.
      expect(fill).not.toBe('rgb(0, 0, 0)');
    }

    const line = ledgerOf(element).shadowRoot!.querySelector('.spark path')!;
    expect(getComputedStyle(line).stroke).not.toBe('none');
    expect(getComputedStyle(line).fill).toBe('none');

    // Geometry, not just paint. A nested Lit template is parsed on its own, so a
    // <circle> written with `html` instead of `svg` lands in the HTML namespace:
    // it keeps its class and its computed fill, and draws nothing at all.
    for (const circle of circles) {
      expect(circle.namespaceURI).toBe('http://www.w3.org/2000/svg');
      expect(circle.getBoundingClientRect().width).toBeGreaterThan(0);
    }
  });

  it('renders the resolved frame, and says so when the frame is gone', async () => {
    const withFrame = ledgerOf(await mount()).shadowRoot!.querySelector('img.frame')!;
    expect(withFrame.getAttribute('src')).toBe('/media/local/x.jpg?authSig=abc');
    expect(withFrame.getAttribute('alt')).toContain('Camera tent_a');

    const element = await mount({
      history: [checkup([capture({ image: { available: false } })])],
      images: {},
    });
    const root = ledgerOf(element).shadowRoot!;
    expect(root.querySelector('img.frame')).toBeNull();
    expect(root.querySelector('.frame-missing')!.textContent).toContain('no longer available');
  });
});
