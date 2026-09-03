/**
 * Vision evidence ViewModel (ADR-0019 shape: pure derivation, no `hass`, no DOM).
 *
 * Turns the `evidence_v1` projection — `get_vision_history_v2` plus
 * `get_vision_status` — into the **two-channel ledger** resolved for the card on
 * growspace_manager_workspace#92: two columns that never merge, a gate strip
 * above them, and the Evidence Fusion Outcome as the only band that names both.
 *
 * Three rules are structural here rather than editorial, and every one of them
 * is a decision from #60/#68/#75 that a later edit must not quietly undo:
 *
 *  1. **The channels never borrow each other's language.** `visual` and
 *     `environment` are derived by separate functions that receive separate
 *     inputs; neither can reach the other's copy. Environmental risk therefore
 *     cannot be reported as visible plant stress.
 *  2. **The Anomaly Score is a sentence, never a numeral badge and never a
 *     gauge.** `rankSentence` is the only surface form; the decimal lives behind
 *     the `numbers` disclosure, next to the note that it is not a probability.
 *  3. **Tone is never the only signal.** Every toned item carries a `cue`
 *     (icon + word), following `src/styles/status.styles.ts`.
 *
 * The Capture Continuity Break is an *equipment* condition and takes the
 * `equipment` tone, which is deliberately off the calm/watch/alert ramp so that
 * a camera fault cannot be read as a plant verdict. It does not travel in the
 * evidence projection at all — it is a Triage Alert (`capture_continuity_break`)
 * and is joined here by `camera_id`.
 */

import {
  mdiAlert,
  mdiAlertOctagon,
  mdiCheckCircleOutline,
  mdiHelpCircleOutline,
  mdiWrench,
} from '@mdi/js';
import { localize, localizePlural, localizeWithParams } from '../../localize/localize';
import type {
  VisionCaptureResult,
  VisionCheckup,
  VisionHistoryItem,
  VisionStatus,
} from '../../slices/camera';
import type { TriageAlert } from '../../slices/ai-insight/schema';

// ─── Tone ─────────────────────────────────────────────────────────────────────

/**
 * `calm | watch | alert` is the severity ramp. `quiet` is the absence of
 * evidence, which is never styled as calm. `equipment` is off the ramp entirely.
 */
export type EvidenceTone = 'calm' | 'watch' | 'alert' | 'quiet' | 'equipment';

/** The non-colour half of a tone. Rendered beside every tinted element. */
export interface ToneCue {
  icon: string;
  /** Screen-reader and colourblind-safe word, e.g. `Warning`. */
  label: string;
}

const TONE_CUES: Record<EvidenceTone, ToneCue> = {
  calm: { icon: mdiCheckCircleOutline, label: 'OK' },
  watch: { icon: mdiAlert, label: 'Watch' },
  alert: { icon: mdiAlertOctagon, label: 'Alert' },
  quiet: { icon: mdiHelpCircleOutline, label: 'No evidence' },
  equipment: { icon: mdiWrench, label: 'Equipment' },
};

export function toneCue(tone: EvidenceTone): ToneCue {
  return TONE_CUES[tone];
}

// ─── Public shapes ────────────────────────────────────────────────────────────

export interface ServiceViewModel {
  tone: EvidenceTone;
  cue: ToneCue;
  label: string;
  /** Model provenance when ready, the unavailability reason otherwise. */
  detail: string;
  ready: boolean;
}

export interface ContinuityViewModel {
  cameraId: string;
  kind: string;
  title: string;
  detail: string;
  note: string;
  tone: 'equipment';
  cue: ToneCue;
}

export interface GateItemViewModel {
  label: string;
  value: string;
  tone: EvidenceTone;
  cue: ToneCue;
}

export interface GateViewModel {
  quality: GateItemViewModel;
  baseline: GateItemViewModel;
  /** Frame Quality Result reasons, in plain language. Empty when accepted. */
  reasons: string[];
  /** Shown only alongside `reasons`. */
  keptNote: string | null;
}

export interface MeasureRow {
  label: string;
  value: string;
}

export interface TrendPointViewModel {
  /** 0–1; `null` when the point carries no score. */
  score: number | null;
  tone: EvidenceTone;
  title: string;
}

export interface TrendViewModel {
  points: TrendPointViewModel[];
  /** `role="img"` description of the whole sparkline. */
  accessibleLabel: string;
  count: string;
  legend: string;
}

export interface VisualViewModel {
  columnTitle: string;
  columnNote: string;
  title: string;
  gloss: string;
  caveat: string;
  tone: EvidenceTone;
  cue: ToneCue;
  /** The Anomaly Score said in words. `null` when nothing was scored. */
  rank: string | null;
  confidence: string | null;
  /** Present only when a comparison ran. */
  numbers: MeasureRow[];
  numbersSummary: string;
  numbersNote: string | null;
  trend: TrendViewModel | null;
  /** Set when the column is silent, so the silence reads as evidence-shaped. */
  silentNote: string | null;
  imageAlt: string;
  /** Resolved, authenticated URL. `null` while unresolved or unavailable. */
  imageUrl: string | null;
  imageUnavailable: string | null;
}

export interface EnvironmentPointViewModel {
  risk: boolean;
  title: string;
}

export interface EnvironmentViewModel {
  columnTitle: string;
  columnNote: string;
  title: string;
  gloss: string;
  caveat: string | null;
  tone: EvidenceTone;
  cue: ToneCue;
  reasons: string[];
  evaluatedAt: string | null;
  history: EnvironmentPointViewModel[];
  historySummary: string;
  historyTitle: string;
  neverVisual: string;
}

export interface ReportViewModel {
  summary: string;
  observation: { label: string; text: string };
  environmentalRisk: { label: string; text: string };
  hypothesis: { label: string; text: string };
  recommendationsLabel: string;
  recommendations: string[];
  note: string;
}

export interface FusionViewModel {
  label: string;
  title: string;
  gloss: string;
  caveat: string;
  tone: EvidenceTone;
  cue: ToneCue;
  chips: string[];
  /** Set when coverage is partial, so "partial" cannot read as "fine". */
  coverageNote: string | null;
  report: ReportViewModel | null;
}

export interface CaptureViewModel {
  captureId: string;
  cameraId: string;
  cameraName: string;
  capturedAt: string;
  continuity: ContinuityViewModel | null;
  gate: GateViewModel;
  visual: VisualViewModel;
  environment: EnvironmentViewModel;
  fusion: FusionViewModel;
  provenance: MeasureRow[];
}

export interface CheckupViewModel {
  checkupId: string;
  window: string;
  trigger: string;
  status: string;
  statusNote: string;
  noVerdictNote: string;
  cameraCount: string;
  startedAt: string;
  captures: CaptureViewModel[];
}

export interface LegacyViewModel {
  key: string;
  label: string;
  note: string;
  timestamp: string;
  checkType: string;
  severity: string;
  analysis: string;
  issuesLabel: string;
  issues: string[];
  recommendationsLabel: string;
  recommendations: string[];
}

export interface VisionEvidenceViewModel {
  service: ServiceViewModel;
  checkups: CheckupViewModel[];
  legacy: LegacyViewModel[];
  /** `null` when everything that could be shown is shown. */
  moreNote: string | null;
  isEmpty: boolean;
  emptyTitle: string;
  emptyBody: string;
  loadingLabel: string;
  retryLabel: string;
  scopeLineLead: string;
  scopeLine: string;
  calibrationLineLead: string;
  calibrationLine: string;
}

// ─── Input ────────────────────────────────────────────────────────────────────

export interface VisionEvidenceInput {
  history: VisionHistoryItem[];
  total: number;
  status: VisionStatus | null;
  /** Triage alerts for this growspace; only continuity breaks are read. */
  alerts: TriageAlert[];
  /** `capture_id` → resolved media URL, filled in by the transport layer. */
  images: Record<string, string>;
}

export interface VisionEvidenceDeps {
  /** Entity id → friendly name. */
  cameraName: (entityId: string) => string;
  /** BCP-47 tag; also selects the localization table. */
  language?: string;
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function t(key: string, language: string): string {
  return localize(`vision.${key}`, '', '', language);
}

function tp(key: string, params: Record<string, string | number>, language: string): string {
  return localizeWithParams(`vision.${key}`, params, language);
}

/** Localized `Mon 3, 14:02`. Returns the raw value when it is not a date. */
function clock(iso: string | null, language: string): string {
  if (!iso) return t('numbers_absent', language);
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(language.replace(/_/, '-'), {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Epoch seconds → the same shape. Triage alerts carry seconds, not ISO. */
function clockFromEpoch(seconds: number | null | undefined, language: string): string {
  if (seconds === null || seconds === undefined) return t('numbers_absent', language);
  return clock(new Date(seconds * 1000).toISOString(), language);
}

function num(value: number | null | undefined, digits: number, language: string): string {
  if (value === null || value === undefined) return t('numbers_absent', language);
  return value.toFixed(digits);
}

function pct(value: number, language: string): string {
  return new Intl.NumberFormat(language.replace(/_/, '-'), {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value);
}

/** `snake_case` → `snake case`, the last-resort rendering of an unmapped key. */
function words(key: string): string {
  return key.replace(/_/g, ' ');
}

/** Localized when known, humanised when not — an unknown key is never dropped. */
function lookupOrWords(prefix: string, key: string, language: string): string {
  const resolved = t(`${prefix}${key}`, language);
  return resolved === `vision.${prefix}${key}` ? words(key) : resolved;
}

function joinReasons(reasons: string[], language: string): string {
  return reasons
    .map((reason) => lookupOrWords('reason_', reason, language))
    .join(t('reason_join', language));
}

// ─── Service status ───────────────────────────────────────────────────────────

export function createServiceViewModel(
  status: VisionStatus | null,
  language: string
): ServiceViewModel {
  if (status === null) {
    return {
      tone: 'quiet',
      cue: toneCue('quiet'),
      label: t('service_unavailable', language),
      detail: t('service_reason_unknown', language),
      ready: false,
    };
  }
  if (status.availability === 'ready') {
    const source =
      status.connection_source === 'supervisor'
        ? t('service_source_supervisor', language)
        : t('service_source_manual', language);
    return {
      tone: 'calm',
      cue: toneCue('calm'),
      label: t('service_ready', language),
      detail: status.model
        ? tp(
            'service_model',
            {
              id: status.model.id,
              version: status.model.version,
              dimension: status.model.dimension,
              schema: status.vision_schema_version ?? '?',
              source,
            },
            language
          )
        : t('service_model_unknown', language),
      ready: true,
    };
  }
  return {
    tone: status.availability === 'incompatible' ? 'alert' : 'quiet',
    cue: toneCue(status.availability === 'incompatible' ? 'alert' : 'quiet'),
    label:
      status.availability === 'incompatible'
        ? t('service_incompatible', language)
        : t('service_unavailable', language),
    detail: status.reason
      ? t(`service_reason_${status.reason}`, language)
      : t('service_reason_unknown', language),
    ready: false,
  };
}

// ─── Capture Continuity Break ─────────────────────────────────────────────────

/**
 * The active continuity break for one camera, or `null`.
 *
 * Cleared conditions are not rendered: the alert record survives so the streak
 * can be audited, but the banner reports a condition that is happening now.
 */
export function createContinuityViewModel(
  alerts: TriageAlert[],
  cameraId: string,
  language: string
): ContinuityViewModel | null {
  const alert = alerts.find(
    (candidate) =>
      candidate.type === 'capture_continuity_break' &&
      candidate.camera_id === cameraId &&
      candidate.condition_active === true
  );
  if (!alert) return null;
  const reasons = Object.entries(alert.reason_counts ?? {})
    .map(([reason, count]) =>
      tp('continuity_reason_count', { count, reason: words(reason) }, language)
    )
    .join(', ');
  return {
    cameraId,
    kind: t('continuity_kind', language),
    title: t('continuity_title', language),
    detail: tp(
      'continuity_detail',
      {
        count: alert.consecutive_count ?? 0,
        reasons,
        since: clockFromEpoch(alert.streak_started_at, language),
      },
      language
    ),
    note: t('continuity_note', language),
    tone: 'equipment',
    cue: toneCue('equipment'),
  };
}

// ─── Gate strip ───────────────────────────────────────────────────────────────

const BASELINE_TONES: Record<string, EvidenceTone> = {
  ready: 'calm',
  stale: 'watch',
  monitoring: 'quiet',
};

function createGateViewModel(capture: VisionCaptureResult, language: string): GateViewModel {
  const accepted = capture.quality.accepted;
  const baselineState = capture.visual.baseline_state;
  const baselineTone = baselineState ? (BASELINE_TONES[baselineState] ?? 'quiet') : 'quiet';
  const progress =
    capture.visual.samples_collected !== undefined && capture.visual.samples_required !== undefined
      ? ` (${tp('baseline_progress', { collected: capture.visual.samples_collected, required: capture.visual.samples_required }, language)})`
      : '';
  const reasons = accepted
    ? []
    : capture.quality.reasons.map((reason) => lookupOrWords('quality_reason_', reason, language));
  return {
    quality: {
      label: t('gate_quality_label', language),
      value: accepted ? t('gate_quality_usable', language) : t('gate_quality_unusable', language),
      tone: accepted ? 'calm' : 'alert',
      cue: toneCue(accepted ? 'calm' : 'alert'),
    },
    baseline: {
      label: t('gate_baseline_label', language),
      value: `${baselineState ? t(`baseline_${baselineState}`, language) : t('baseline_none', language)}${progress}`,
      tone: baselineTone,
      cue: toneCue(baselineTone),
    },
    reasons,
    keptNote: reasons.length ? t('gate_kept', language) : null,
  };
}

// ─── Visual channel ───────────────────────────────────────────────────────────

const VERDICT_TONES: Record<string, EvidenceTone> = {
  normal: 'calm',
  uncertain: 'watch',
  material_scene_change: 'alert',
};

/**
 * The Anomaly Score, said in words.
 *
 * The score is a rank in `[0, 1]` against the camera's own baseline members, so
 * `score × samples_collected` is the count of frames it exceeds. Without a
 * member count there is no denominator and therefore no sentence — the score is
 * withheld rather than rendered as a bare decimal.
 */
export function rankSentence(
  visual: VisionCaptureResult['visual'],
  language: string
): string | null {
  const { anomaly_score: score, samples_collected: collected } = visual;
  if (score === undefined || collected === undefined || collected <= 0) return null;
  if (score >= 1) return tp('rank_all', { total: collected }, language);
  return tp('rank_partial', { rank: Math.round(score * collected), total: collected }, language);
}

export function confidenceSentence(
  visual: VisionCaptureResult['visual'],
  language: string
): string | null {
  const confidence = visual.comparison_confidence;
  if (confidence === undefined) return null;
  const key = confidence >= 0.7 ? 'confidence_clear' : 'confidence_close';
  return tp(key, { separation: pct(confidence, language) }, language);
}

function createTrendViewModel(
  capture: VisionCaptureResult,
  language: string
): TrendViewModel | null {
  if (capture.trend.length === 0) return null;
  // The projection returns earlier comparisons newest-first; a chart that reads
  // left-to-right must run oldest-first or it draws time backwards.
  const ordered = [...capture.trend].reverse();
  const points = ordered.map((point) => {
    const tone = point.verdict ? (VERDICT_TONES[point.verdict] ?? 'quiet') : 'quiet';
    return {
      score: point.anomaly_score,
      tone,
      title: `${clock(point.evaluated_at, language)} — ${
        point.verdict
          ? t(`verdict_${point.verdict}_title`, language)
          : t('verdict_unknown_title', language)
      }`,
    };
  });
  return {
    points,
    accessibleLabel: tp('trend_label', { count: points.length }, language),
    count: localizePlural('vision.trend_count', points.length, {}, language),
    legend: t('trend_legend', language),
  };
}

function createVisualViewModel(
  capture: VisionCaptureResult,
  imageUrl: string | null,
  cameraName: string,
  language: string
): VisualViewModel {
  const visual = capture.visual;
  const imageAlt = tp(
    'visual_image_alt',
    { camera: cameraName, time: clock(capture.captured_at, language) },
    language
  );
  const imageUnavailable =
    imageUrl === null && !capture.image.available ? t('visual_image_unavailable', language) : null;

  if (visual.outcome !== 'scored') {
    const monitoring = visual.outcome === 'monitoring';
    const reasons = visual.unavailable_reasons.length
      ? joinReasons(visual.unavailable_reasons, language)
      : t('reason_baseline_not_ready', language);
    return {
      columnTitle: t('visual_column_title', language),
      columnNote: t('visual_column_note', language),
      title: monitoring
        ? t('visual_monitoring_title', language)
        : t('visual_unavailable_title', language),
      gloss: tp('visual_unavailable_body', { reasons }, language),
      caveat: '',
      tone: 'quiet',
      cue: toneCue('quiet'),
      rank: null,
      confidence: null,
      numbers: [],
      numbersSummary: t('numbers_summary', language),
      numbersNote: null,
      trend: null,
      silentNote: t('visual_silent_note', language),
      imageAlt,
      imageUrl,
      imageUnavailable,
    };
  }

  const verdict = visual.verdict;
  const tone = verdict ? (VERDICT_TONES[verdict] ?? 'quiet') : 'quiet';
  const stem = verdict ? `verdict_${verdict}` : 'verdict_unknown';
  const total = visual.samples_collected;
  return {
    columnTitle: t('visual_column_title', language),
    columnNote: t('visual_column_note', language),
    title: t(`${stem}_title`, language),
    gloss: t(`${stem}_gloss`, language),
    caveat: t(`${stem}_caveat`, language),
    tone,
    cue: toneCue(tone),
    rank: rankSentence(visual, language),
    confidence: confidenceSentence(visual, language),
    numbers: [
      {
        label: tp('numbers_anomaly', { total: total ?? t('numbers_absent', language) }, language),
        value: num(visual.anomaly_score, 2, language),
      },
      { label: t('numbers_distance', language), value: num(visual.raw_distance, 3, language) },
      {
        label: t('numbers_confidence', language),
        value: num(visual.comparison_confidence, 2, language),
      },
      {
        label: t('numbers_model', language),
        value:
          [capture.provenance.model_id, capture.provenance.model_version]
            .filter(Boolean)
            .join(' ') || t('numbers_absent', language),
      },
    ],
    numbersSummary: t('numbers_summary', language),
    numbersNote: t('numbers_note', language),
    trend: createTrendViewModel(capture, language),
    silentNote: null,
    imageAlt,
    imageUrl,
    imageUnavailable,
  };
}

// ─── Environmental channel ────────────────────────────────────────────────────

const ENVIRONMENT_TONES: Record<string, EvidenceTone> = {
  risk: 'watch',
  within_evaluated_range: 'calm',
  unavailable: 'quiet',
};

function createEnvironmentViewModel(
  capture: VisionCaptureResult,
  language: string
): EnvironmentViewModel {
  const environment = capture.environment;
  const tone = ENVIRONMENT_TONES[environment.verdict] ?? 'quiet';
  // The projection publishes no separate environmental history, so the column's
  // own history is read off the `fusion_state` the trend already carries.
  // Inventing a second series would be a fiction.
  const history = [...capture.trend]
    .reverse()
    .filter((point) => point.fusion_state !== undefined)
    .map((point) => {
      const risk = point.fusion_state!.includes('environmental_risk');
      return {
        risk,
        title: tp(
          risk ? 'env_history_point_risk' : 'env_history_point_clear',
          { time: clock(point.evaluated_at, language) },
          language
        ),
      };
    });
  return {
    columnTitle: t('env_column_title', language),
    columnNote: t('env_column_note', language),
    title: t(`env_${environment.verdict}_title`, language),
    gloss: t(`env_${environment.verdict}_gloss`, language),
    caveat: environment.verdict === 'unavailable' ? t('env_unavailable_caveat', language) : null,
    tone,
    cue: toneCue(tone),
    reasons: [...environment.stress_reasons, ...environment.mold_reasons].map((reason) =>
      lookupOrWords('env_reason_', reason, language)
    ),
    evaluatedAt: environment.evaluated_at
      ? tp('env_evaluated_at', { time: clock(environment.evaluated_at, language) }, language)
      : null,
    history,
    historyTitle: t('env_history_title', language),
    historySummary: history.length
      ? localizePlural('vision.env_history_summary', history.length, {}, language)
      : t('env_history_empty', language),
    neverVisual: t('env_never_visual', language),
  };
}

// ─── Fusion band ──────────────────────────────────────────────────────────────

const FUSION_TONES: Record<string, EvidenceTone> = {
  no_detected_change: 'calm',
  environmental_risk: 'watch',
  visual_anomaly: 'watch',
  concurrent_environmental_risk_and_visual_anomaly: 'alert',
  persistent_visual_anomaly: 'alert',
};

function createReportViewModel(
  report: NonNullable<VisionCaptureResult['report']>,
  language: string
): ReportViewModel {
  return {
    summary: t('report_summary', language),
    observation: { label: t('report_observation', language), text: report.observation },
    environmentalRisk: {
      label: t('report_environmental_risk', language),
      text: report.environmental_risk,
    },
    hypothesis: { label: t('report_hypothesis', language), text: report.hypothesis },
    recommendationsLabel: t('report_recommendations', language),
    recommendations: [...report.recommendations],
    note: t('report_note', language),
  };
}

function createFusionViewModel(capture: VisionCaptureResult, language: string): FusionViewModel {
  const fusion = capture.fusion;
  const report = capture.report ? createReportViewModel(capture.report, language) : null;
  if (!fusion.state) {
    const reasons = fusion.unavailable_reasons.length
      ? joinReasons(fusion.unavailable_reasons, language)
      : t('reason_fusion_unavailable', language);
    return {
      label: t('fusion_label', language),
      title: t('fusion_none_title', language),
      gloss: tp('fusion_none_gloss', { reasons }, language),
      caveat: t('fusion_none_caveat', language),
      tone: 'quiet',
      cue: toneCue('quiet'),
      chips: [],
      coverageNote: null,
      report,
    };
  }
  const tone = FUSION_TONES[fusion.state] ?? 'quiet';
  const chips: string[] = [];
  if (fusion.confidence) chips.push(t(`fusion_confidence_${fusion.confidence}`, language));
  if (fusion.coverage) chips.push(t(`fusion_coverage_${fusion.coverage}`, language));
  return {
    label: t('fusion_label', language),
    title: t(`fusion_${fusion.state}_title`, language),
    gloss: t(`fusion_${fusion.state}_gloss`, language),
    caveat: t(`fusion_${fusion.state}_caveat`, language),
    tone,
    cue: toneCue(tone),
    chips,
    coverageNote:
      fusion.coverage === 'partial' ? t('fusion_coverage_partial_note', language) : null,
    report,
  };
}

// ─── Capture and checkup ──────────────────────────────────────────────────────

function createProvenanceRows(capture: VisionCaptureResult, language: string): MeasureRow[] {
  const provenance = capture.provenance;
  const rows: MeasureRow[] = [];
  if (provenance.service_version !== undefined) {
    rows.push({
      label: t('provenance_service_version', language),
      value: provenance.service_version,
    });
  }
  if (provenance.vision_schema_version !== undefined) {
    rows.push({
      label: t('provenance_schema_version', language),
      value: String(provenance.vision_schema_version),
    });
  }
  if (provenance.scoring_policy_version !== undefined) {
    rows.push({
      label: t('provenance_scoring_policy', language),
      value: String(provenance.scoring_policy_version),
    });
  }
  return rows;
}

function createCaptureViewModel(
  capture: VisionCaptureResult,
  input: VisionEvidenceInput,
  deps: VisionEvidenceDeps,
  language: string
): CaptureViewModel {
  const cameraName = deps.cameraName(capture.camera_id);
  return {
    captureId: capture.capture_id,
    cameraId: capture.camera_id,
    cameraName,
    capturedAt: clock(capture.captured_at, language),
    continuity: createContinuityViewModel(input.alerts, capture.camera_id, language),
    gate: createGateViewModel(capture, language),
    visual: createVisualViewModel(
      capture,
      input.images[capture.capture_id] ?? null,
      cameraName,
      language
    ),
    environment: createEnvironmentViewModel(capture, language),
    fusion: createFusionViewModel(capture, language),
    provenance: createProvenanceRows(capture, language),
  };
}

function createCheckupViewModel(
  checkup: VisionCheckup,
  input: VisionEvidenceInput,
  deps: VisionEvidenceDeps,
  language: string
): CheckupViewModel {
  return {
    checkupId: checkup.checkup_id,
    window: tp(
      'checkup_window',
      { window: t(`window_${checkup.light_window}`, language) },
      language
    ),
    trigger: t(`trigger_${checkup.trigger_source}`, language),
    status: checkup.status
      ? t(`checkup_status_${checkup.status}`, language)
      : t('checkup_status_unknown', language),
    statusNote: t('checkup_status_note', language),
    noVerdictNote: t('checkup_no_verdict', language),
    cameraCount: localizePlural(
      'vision.checkup_capture_count',
      checkup.captures.length,
      {},
      language
    ),
    startedAt: clock(checkup.completed_at ?? checkup.started_at, language),
    captures: checkup.captures.map((capture) =>
      createCaptureViewModel(capture, input, deps, language)
    ),
  };
}

function createLegacyViewModel(
  item: Extract<VisionHistoryItem, { result_schema: 'legacy_cloud_v1' }>,
  index: number,
  language: string
): LegacyViewModel {
  return {
    key: `${item.timestamp}-${index}`,
    label: t('legacy_label', language),
    note: t('legacy_note', language),
    timestamp: clock(item.timestamp, language),
    checkType: item.check_type,
    severity: tp('legacy_severity', { severity: item.severity }, language),
    analysis: item.analysis,
    issuesLabel: t('legacy_issues', language),
    issues: [...item.issues_detected],
    recommendationsLabel: t('legacy_recommendations', language),
    recommendations: [...item.recommendations],
  };
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createVisionEvidenceViewModel(
  input: VisionEvidenceInput,
  deps: VisionEvidenceDeps
): VisionEvidenceViewModel {
  const language = deps.language ?? 'en';
  const checkups: CheckupViewModel[] = [];
  const legacy: LegacyViewModel[] = [];

  input.history.forEach((item, index) => {
    if (item.result_schema === 'evidence_v1') {
      checkups.push(createCheckupViewModel(item, input, deps, language));
    } else {
      legacy.push(createLegacyViewModel(item, index, language));
    }
  });

  const shown = checkups.length + legacy.length;
  return {
    service: createServiceViewModel(input.status, language),
    checkups,
    legacy,
    moreNote:
      input.total > shown ? tp('history_more', { shown, total: input.total }, language) : null,
    isEmpty: shown === 0,
    emptyTitle: t('empty_title', language),
    emptyBody: t('empty_body', language),
    loadingLabel: t('loading', language),
    retryLabel: t('retry', language),
    scopeLineLead: t('scope_line_lead', language),
    scopeLine: t('scope_line', language),
    calibrationLineLead: t('calibration_line_lead', language),
    calibrationLine: t('calibration_line', language),
  };
}
