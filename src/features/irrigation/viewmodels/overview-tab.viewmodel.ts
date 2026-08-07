/**
 * Overview Tab ViewModel (ADR-0019)
 *
 * The pure derivation behind the Irrigation Dialog's read-only Overview tab
 * (ADR-0016's trivial-SM tab). Crop-steering diagnostics only — no draft, no
 * intents, no effects. It `computed`s the tab's entire render input (signed
 * score text, badge classes, trend icon/colour, dryback strings, shot-composition
 * rows) from the device prop atom and the shared Dialog Capabilities atom.
 *
 * Modelled on `features/plants`' `createStablePlantOverviewViewModel`: input
 * atoms in, one `ReadableAtom<OverviewTabViewModel>` out, testable with no DOM.
 * The formatting here is copied verbatim from the dialog's former inline
 * `_renderOverviewTab` helpers so the rendered output stays byte-identical.
 */

import { computed, type ReadableAtom } from 'nanostores';
import {
  mdiArrowUp,
  mdiArrowDown,
  mdiMinus,
  mdiWeatherNight,
  mdiCounter,
} from '@mdi/js';
import type {
  GrowspaceDevice,
  SteeringMetrics,
  SteeringMode,
  SteeringClassification,
  IntentDeviation,
  SerializedShotComposition,
} from '../../../services/types';
import type { DialogCapabilities } from './dialog-capabilities';

/** A single metric card on the Overview tab (overnight / in-cycle dryback). */
export interface OverviewMetricCard {
  value: string;
  /** Optional secondary line (peak/trough context, shot count). */
  sub: string | null;
}

/** The EC-trend card, which can be sensor-locked (no pore-EC sensors reporting). */
export interface OverviewEcTrendCard {
  locked: boolean;
  /** Display value ('LOCKED' replaced by a lock hint when `locked`). */
  value: string;
  icon: string;
  color: string;
}

/** One row of the shot-composition breakdown (base × vwc × ec → effective). */
export interface ShotCompositionRow {
  label: string;
  value: string;
}

/** The measured Infiltration state, as a badge beside the panel heading. */
export interface InfiltrationBadge {
  label: string;
  color: string;
}

/** Why the last steering tick withheld a shot. */
export interface ShotSuppression {
  /** Grower-facing sentence explaining the withheld shot. */
  label: string;
  /**
   * True when something other than the ordinary cooldown is withholding the
   * shot. Release time then depends on the substrate and is not predictable, so
   * the Projected Shot Window must be labelled as held rather than counted down
   * (ADR-0031).
   */
  held: boolean;
}

/** Phase-state + shot-composition diagnostics for the last fired shot. */
export interface ShotCompositionPanel {
  /** Active steering phase pill text (e.g. 'P2'), or null when unknown. */
  phaseLabel: string | null;
  /**
   * Measured Infiltration state; null when the backend predates the field or
   * reports `unknown` (no fresh sensor data — nothing honest to show).
   */
  infiltration: InfiltrationBadge | null;
  /** Why the last tick withheld a shot; null when it fired, or on an older backend. */
  suppression: ShotSuppression | null;
  /** Composition rows; null when no shot has fired yet this session. */
  rows: ShotCompositionRow[] | null;
}

/**
 * Complete render input for `<irrigation-overview-tab>`.
 */
export interface OverviewTabViewModel {
  /**
   * True when no steering metrics are present — the tab shows the
   * data-unavailable placeholder instead of the diagnostics.
   */
  unavailable: boolean;

  // Score header
  /** Signed, 2-decimal score string ('+0.60', '-0.50', '—'). */
  scoreText: string;
  declared: SteeringMode | null;
  measured: SteeringClassification | null;
  /** Deviation banner: 'ontarget' | 'deviation' | null (silent). */
  intentBanner: 'ontarget' | 'deviation' | null;

  // Metric cards
  overnightDryback: OverviewMetricCard;
  inCycleDryback: OverviewMetricCard;
  ecTrend: OverviewEcTrendCard;

  // Shot composition
  shotComposition: ShotCompositionPanel | null;

  /** Shared capabilities (peer input, surfaced for downstream/test parity). */
  caps: DialogCapabilities;
}

const fmtNum = (v: unknown): string => (typeof v === 'number' ? String(v) : '—');

function deriveOvernightDryback(metrics: SteeringMetrics): OverviewMetricCard {
  const dryback = metrics.overnightDryback;
  const event = metrics.latestOvernightEvent;
  const value = dryback === null ? '—' : `${dryback.toFixed(1)} pts`;
  const sub = event
    ? `peak ${event.peakVwc.toFixed(1)}% → trough ${event.troughVwc.toFixed(1)}%`
    : null;
  return { value, sub };
}

function deriveInCycleDryback(metrics: SteeringMetrics): OverviewMetricCard {
  const avg = metrics.incycleDrybackAvg;
  const value = avg === null ? '—' : `${avg.toFixed(1)} pts`;
  return { value, sub: `${metrics.incycleDrybackCount} shots today` };
}

function deriveEcTrend(metrics: SteeringMetrics): OverviewEcTrendCard {
  if (!metrics.ecTrendAvailable) {
    return {
      locked: true,
      value: 'Locked',
      icon: mdiMinus,
      color: 'var(--secondary-text-color)',
    };
  }
  const trend = metrics.ecTrend ?? 'stable';
  let icon = mdiMinus;
  let color = 'var(--secondary-text-color)';
  if (trend === 'rising') {
    icon = mdiArrowUp;
    color = 'var(--error-color, #F44336)';
  } else if (trend === 'falling') {
    icon = mdiArrowDown;
    color = 'var(--success-color, #4CAF50)';
  }
  return { locked: false, value: trend.toUpperCase(), icon, color };
}

function deriveIntentBanner(deviation: IntentDeviation | null): 'ontarget' | 'deviation' | null {
  if (deviation === 'on_target') return 'ontarget';
  if (deviation === 'more_generative' || deviation === 'more_vegetative') return 'deviation';
  return null;
}

const INFILTRATION_BADGES: Record<string, InfiltrationBadge> = {
  infiltrating: { label: 'Absorbing', color: 'var(--info-color, #2196F3)' },
  settled: { label: 'Settled', color: 'var(--success-color, #4CAF50)' },
  drying: { label: 'Drying back', color: 'var(--warning-color, #FF9800)' },
};

const SUPPRESSION_LABELS: Record<string, ShotSuppression> = {
  cooldown: { label: 'Waiting out the shot cooldown.', held: false },
  infiltrating: {
    label: 'Held — the substrate is still absorbing the last shot.',
    held: true,
  },
  no_pump: { label: 'Held — no irrigation pump is configured.', held: true },
  zero_volume: { label: 'Held — the computed shot came out at zero.', held: true },
};

/**
 * The measured Infiltration state as a badge, or null when there is nothing
 * honest to show — an older backend omits the field entirely, and `unknown`
 * means no fresh sensor sample rather than a settled substrate.
 */
export function deriveInfiltration(
  composition: SerializedShotComposition | null | undefined
): InfiltrationBadge | null {
  const state = composition?.infiltration;
  if (typeof state !== 'string') return null;
  return INFILTRATION_BADGES[state] ?? null;
}

/**
 * Why the last steering tick withheld a shot, or null when it fired (or the
 * backend predates `suppressed_by`).
 *
 * Exported because the Irrigation Dialog footer applies the same rule to the
 * Projected Shot Window — the two must agree on what counts as held. A reason
 * this card does not recognise is treated as held: showing a countdown for a
 * shot that may never fire is the worse failure.
 */
export function deriveShotSuppression(
  composition: SerializedShotComposition | null | undefined
): ShotSuppression | null {
  const reason = composition?.suppressed_by;
  if (typeof reason !== 'string' || reason === '') return null;
  return SUPPRESSION_LABELS[reason] ?? { label: `Held — ${reason}.`, held: true };
}

function deriveShotComposition(
  metrics: SteeringMetrics,
  device: GrowspaceDevice | undefined
): ShotCompositionPanel | null {
  const composition = metrics.shotComposition;
  if (!composition) return null;

  const phase = device?.irrigationConfig?.activeSteeringPhase;
  const phaseLabel = phase ? phase.toUpperCase() : null;
  // Both live from the first tick, unlike `last_shot` — so they are resolved
  // above the no-shot-yet return, which is exactly when a grower asking "why
  // isn't it watering?" is looking at this panel.
  const infiltration = deriveInfiltration(composition);
  const suppression = deriveShotSuppression(composition);

  const lastShot = composition.last_shot as Record<string, unknown> | null | undefined;
  if (!lastShot) {
    return { phaseLabel, infiltration, suppression, rows: null };
  }

  return {
    phaseLabel,
    infiltration,
    suppression,
    rows: [
      { label: 'Base', value: `${fmtNum(lastShot.base_seconds)}s` },
      { label: 'VWC factor', value: `×${fmtNum(lastShot.vwc_factor)}` },
      { label: 'EC factor', value: `×${fmtNum(lastShot.ec_factor)}` },
      { label: 'Effective', value: `${fmtNum(lastShot.effective_seconds)}s` },
    ],
  };
}

function emptyMetricCard(): OverviewMetricCard {
  return { value: '—', sub: null };
}

/**
 * Pure factory: device prop atom + shared capabilities atom → one Overview VM atom.
 * `$caps` is a peer input (never re-derived here).
 *
 * NOTE on signature: ADR-0019 documents the canonical seam as
 * `createXTabViewModel($sm, $caps, …slice atoms)`. The Overview tab is the
 * read-only reference adapter (ADR-0016's trivial-SM tab) — its SM state is the
 * fixed `{ activeTab: 'overview' }` with no draft — so it has no `$sm` dependency
 * and the parameter is omitted here. Draft tabs (tanks, steering) take `$sm` as
 * the first argument per the documented seam; do not treat this narrower
 * `($device, $caps)` shape as the template for those.
 */
export function createOverviewTabViewModel(
  $device: ReadableAtom<GrowspaceDevice | undefined>,
  $caps: ReadableAtom<DialogCapabilities>
): ReadableAtom<OverviewTabViewModel> {
  return computed([$device, $caps], (device, caps) => {
    const metrics = device?.steeringMetrics;

    if (!metrics) {
      return {
        unavailable: true,
        scoreText: '—',
        declared: null,
        measured: null,
        intentBanner: null,
        overnightDryback: emptyMetricCard(),
        inCycleDryback: emptyMetricCard(),
        ecTrend: { locked: true, value: 'Locked', icon: mdiMinus, color: 'var(--secondary-text-color)' },
        shotComposition: null,
        caps,
      };
    }

    const score = metrics.score;
    const scoreText = score === null ? '—' : `${score > 0 ? '+' : ''}${score.toFixed(2)}`;
    const declared = device?.irrigationStrategy?.declaredSteeringMode ?? null;

    return {
      unavailable: false,
      scoreText,
      declared,
      measured: metrics.measuredClassification,
      intentBanner: deriveIntentBanner(metrics.intentDeviation),
      overnightDryback: deriveOvernightDryback(metrics),
      inCycleDryback: deriveInCycleDryback(metrics),
      ecTrend: deriveEcTrend(metrics),
      shotComposition: deriveShotComposition(metrics, device),
      caps,
    };
  });
}

/** Icons used by the metric cards, re-exported so the Tab Component stays dumb. */
export const OVERVIEW_ICONS = {
  overnightDryback: mdiWeatherNight,
  inCycleDryback: mdiCounter,
} as const;
