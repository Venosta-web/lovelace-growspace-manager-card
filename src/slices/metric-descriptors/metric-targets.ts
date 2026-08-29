/**
 * Metric Targets — the normalised records a [[Guide Mark]] is drawn from
 * (ADR-0050).
 *
 * The values an Env Graph guides on live in five shapes across five places on
 * `GrowspaceDevice`. This module is where they become one thing a chart can
 * draw, typed by ADR-0048's guide-mark kind so that "normalised" means something
 * more than "put in an array".
 *
 * Two rules the shape encodes:
 *
 * - **Every target is period-indexed**, because some sources are. A source that
 *   does not vary with the photoperiod resolves `day` and `night` to the same
 *   numbers, so a consumer never asks whether this particular target steps — it
 *   compares the two and steps only when they differ.
 * - **The records carry numbers, not strings.** Formatting a bound with its unit
 *   is the chart's job; this module stays pure of localisation.
 *
 * [[Optimal Band]] and [[Setpoint]] are both constructed for their own sake. The
 * VPD danger bounds are normalised as [[Limit]]s because absorbing
 * `vpdThresholds` has to be lossless — the VPD status bands classify against
 * them — but no other Limit source is read here and nothing draws a Limit mark
 * yet; both arrive with #50.
 *
 * A source is normalised only where the controller is actually acting on it. A
 * disabled fan, a regulation mode the fan is not in, and an appliance the card
 * does not control all yield no target, for the reason an incompatible moisture
 * sensor does: a mark asserts what the metric is being steered to, and a number
 * nothing acts on is not that.
 *
 * Two of ADR-0050's bare scalars are deliberately absent. `targetRunoffPercent`
 * is a Setpoint, but runoff percent is not a `MetricKey` — there is no chart for
 * it to mark. The DLI targets are a Setpoint too, and the growspace payload does
 * not carry `dli_target_veg` / `dli_target_flower` at all; wiring them is a
 * cross-repo change to the view model, not a normalisation this module can make.
 */

import { MetricKey } from '../../features/environment/constants';
import { DEFAULTS } from '../../lib/constants';
import type { GrowspaceDevice } from '../../services/types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * The three marks a target renders as (ADR-0048).
 *
 * The kind is a fact about the configuration rather than about the chart: a
 * controller's `{on, off}` hysteresis pair is two setpoints and never a band,
 * because it describes what the controller does and not where the grower wants
 * the metric to sit.
 */
export enum GuideMarkKind {
  OPTIMAL_BAND = 'optimal-band',
  SETPOINT = 'setpoint',
  LIMIT = 'limit',
}

export interface MetricTargetBounds {
  min: number;
  max: number;
}

/** A region the grower wants the metric to stay inside. */
export interface OptimalBandTarget {
  kind: GuideMarkKind.OPTIMAL_BAND;
  /** Stable within one metric — what a chart keys its mark and its label by. */
  id: string;
  day: MetricTargetBounds;
  night: MetricTargetBounds;
}

/** A single value a controller acts on. */
export interface SetpointTarget {
  kind: GuideMarkKind.SETPOINT;
  id: string;
  day: number;
  night: number;
  /**
   * The controller's deadband half-width around the setpoint, when the source
   * declares one.
   *
   * It is symmetric, and it is **not** an [[Optimal Band]]: it says how far the
   * metric may drift before the controller responds, not where the grower wants
   * the metric to sit. A consumer that draws it must not draw it as a band.
   */
  tolerance?: number;
}

/** A boundary the metric should not cross; `side` says which way is bad. */
export interface LimitTarget {
  kind: GuideMarkKind.LIMIT;
  id: string;
  side: 'lower' | 'upper';
  day: number;
  night: number;
}

export type MetricTarget = OptimalBandTarget | SetpointTarget | LimitTarget;

export interface OverviewEntitySnapshot {
  attributes?: Record<string, unknown>;
}

export function isOptimalBand(target: MetricTarget): target is OptimalBandTarget {
  return target.kind === GuideMarkKind.OPTIMAL_BAND;
}

export function isSetpoint(target: MetricTarget): target is SetpointTarget {
  return target.kind === GuideMarkKind.SETPOINT;
}

export function isLimit(target: MetricTarget): target is LimitTarget {
  return target.kind === GuideMarkKind.LIMIT;
}

/** The bounds or value this target holds during one photoperiod. */
export function targetForPeriod<T extends MetricTarget>(target: T, isDay: boolean): T['day'] {
  return isDay ? target.day : target.night;
}

// ---------------------------------------------------------------------------
// Per-metric normalisation
// ---------------------------------------------------------------------------

interface VpdThresholdRange {
  targetMin: number;
  targetMax: number;
  dangerMin: number;
  dangerMax: number;
}

function _vpdThresholds(overviewEntity?: OverviewEntitySnapshot): {
  day: VpdThresholdRange;
  night: VpdThresholdRange;
} {
  const attrs = overviewEntity?.attributes ?? {};
  const day = {
    targetMin: Number(attrs.day_vpd_target_min ?? attrs.vpd_target_min ?? DEFAULTS.VPD.TARGET_MIN),
    targetMax: Number(attrs.day_vpd_target_max ?? attrs.vpd_target_max ?? DEFAULTS.VPD.TARGET_MAX),
    dangerMin: Number(attrs.day_vpd_danger_min ?? attrs.vpd_danger_min ?? DEFAULTS.VPD.DANGER_MIN),
    dangerMax: Number(attrs.day_vpd_danger_max ?? attrs.vpd_danger_max ?? DEFAULTS.VPD.DANGER_MAX),
  };

  return {
    day,
    // Missing night values intentionally inherit the resolved day values, including
    // legacy keys and defaults.
    night: {
      targetMin: Number(attrs.night_vpd_target_min ?? day.targetMin),
      targetMax: Number(attrs.night_vpd_target_max ?? day.targetMax),
      dangerMin: Number(attrs.night_vpd_danger_min ?? day.dangerMin),
      dangerMax: Number(attrs.night_vpd_danger_max ?? day.dangerMax),
    },
  };
}

/**
 * VPD is the one metric whose target is period-indexed, and the only one that
 * always has one: the day/night table resolves to defaults when the grower has
 * configured nothing.
 */
function _vpdTargets(overviewEntity?: OverviewEntitySnapshot): MetricTarget[] {
  const { day, night } = _vpdThresholds(overviewEntity);

  return [
    {
      kind: GuideMarkKind.OPTIMAL_BAND,
      id: 'vpd-optimal',
      day: { min: day.targetMin, max: day.targetMax },
      night: { min: night.targetMin, max: night.targetMax },
    },
    {
      kind: GuideMarkKind.LIMIT,
      id: 'vpd-danger-low',
      side: 'lower',
      day: day.dangerMin,
      night: night.dangerMin,
    },
    {
      kind: GuideMarkKind.LIMIT,
      id: 'vpd-danger-high',
      side: 'upper',
      day: day.dangerMax,
      night: night.dangerMax,
    },
  ];
}

/**
 * A configured number, or `undefined` where the source holds none.
 *
 * Zero is read as unconfigured rather than as a value. These are grow-room
 * setpoints — nobody steers a tent to 0 °C, 0 % or 0 kPa — and zero is exactly
 * what an untouched field holds, the same reason a `{0, 0}` EC range is absent
 * rather than a real band at zero.
 */
function _configured(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

/** A setpoint that does not vary with the photoperiod, with its deadband. */
function _setpoint(
  id: string,
  value: number | null | undefined,
  tolerance?: number | null
): MetricTarget[] {
  const configured = _configured(value);
  if (configured === undefined) return [];

  const target: SetpointTarget = {
    kind: GuideMarkKind.SETPOINT,
    id,
    day: configured,
    night: configured,
  };
  const band = _configured(tolerance);
  if (band !== undefined) target.tolerance = band;
  return [target];
}

/** A setpoint that steps with the photoperiod; a missing night value inherits day. */
function _periodSetpoint(
  id: string,
  day: number | null | undefined,
  night: number | null | undefined
): MetricTarget[] {
  const dayValue = _configured(day);
  if (dayValue === undefined) return [];

  return [
    {
      kind: GuideMarkKind.SETPOINT,
      id,
      day: dayValue,
      night: _configured(night) ?? dayValue,
    },
  ];
}

/** The signal a fan config holds a `target`/`tolerance` pair for. */
type FanRegulatedSignal = 'temperature' | 'humidity' | 'vpd';

/** The signal each metric's fan setpoint is stored under, if it has one. */
const FAN_REGULATED_SIGNAL: Record<string, FanRegulatedSignal> = {
  [MetricKey.TEMPERATURE]: 'temperature',
  [MetricKey.HUMIDITY]: 'humidity',
  [MetricKey.VPD]: 'vpd',
};

/**
 * The shape both fan configs share.
 *
 * `regulation_mode` is the circulation fan's alone — exhaust demand is always
 * combined, so the exhaust config declares no mode and every signal it holds is
 * in force at once.
 */
interface FanControlConfig {
  enabled: boolean;
  regulation_mode?: FanRegulatedSignal;
  temperature_target: number;
  temperature_tolerance: number;
  humidity_target: number;
  humidity_tolerance: number;
  vpd_target: number;
  vpd_tolerance: number;
}

function _fanSetpoint(
  id: string,
  config: FanControlConfig | undefined,
  signal: FanRegulatedSignal
): MetricTarget[] {
  if (!config?.enabled) return [];
  // A circulation fan regulates on exactly one signal. It still stores a target
  // for the other two, but it does not steer to them, so marking one would name
  // a number nothing is acting on.
  if (config.regulation_mode !== undefined && config.regulation_mode !== signal) return [];

  return _setpoint(id, config[`${signal}_target`], config[`${signal}_tolerance`]);
}

/**
 * The control setpoints the two fans hold for `key`.
 *
 * Both fans can regulate the same metric, and a chart carrying two of these is
 * the configuration being reported rather than a duplicate — which is why the
 * ids name their source.
 */
function _fanSetpoints(key: string, device: GrowspaceDevice): MetricTarget[] {
  const signal = FAN_REGULATED_SIGNAL[key];
  if (!signal) return [];

  const environment = device.environmentAttributes;
  return [
    ..._fanSetpoint('circulation-fan-target', environment?.circulationFanConfig, signal),
    ..._fanSetpoint('exhaust-fan-target', environment?.exhaustFanConfig, signal),
  ];
}

/** The Stage Hysteresis Threshold table: stage → cycle → the pair. */
type StageHysteresisThresholds = Record<string, Record<string, { on: number; off: number }>>;

/**
 * One appliance's `{on, off}` pair, as **two setpoints and never a band**
 * (ADR-0048).
 *
 * `{on, off}` says what the controller does, not where the grower wants the
 * metric to sit; a band drawn between them would assert a preference the config
 * does not contain. The table is per stage as well as per period, so it resolves
 * through `granularStage` for the same reason the feed-EC range does.
 */
function _hysteresisSetpoints(
  id: string,
  controlEnabled: boolean | undefined,
  thresholds: StageHysteresisThresholds | undefined,
  stage: string | undefined
): MetricTarget[] {
  // The table is stored whether or not the card drives the appliance, so the
  // control flag is what decides whether anything is acting on these numbers.
  if (controlEnabled !== true || !stage) return [];

  const cycles = thresholds?.[stage];
  if (!cycles) return [];

  return [
    ..._periodSetpoint(`${id}-on`, cycles.day?.on, cycles.night?.on),
    ..._periodSetpoint(`${id}-off`, cycles.day?.off, cycles.night?.off),
  ];
}

/**
 * The humidifier and dehumidifier switching thresholds, which are VPD values in
 * kPa rather than relative humidity — the appliances are driven off VPD.
 */
function _humidityApplianceTargets(device: GrowspaceDevice): MetricTarget[] {
  const environment = device.environmentAttributes;
  const stage = device.biologicalMetrics?.granularStage;

  return [
    ..._hysteresisSetpoints(
      'humidifier',
      environment?.humidifierControlEnabled,
      environment?.humidifierThresholds,
      stage
    ),
    ..._hysteresisSetpoints(
      'dehumidifier',
      environment?.dehumidifierControlEnabled,
      environment?.dehumidifierThresholds,
      stage
    ),
  ];
}

/** A band that does not vary with the photoperiod, dropped when it is degenerate. */
function _flatBand(
  id: string,
  min: number | null | undefined,
  max: number | null | undefined
): MetricTarget[] {
  if (min === null || min === undefined || max === null || max === undefined) return [];
  if (!(max > min)) return [];

  const bounds = { min, max };
  return [{ kind: GuideMarkKind.OPTIMAL_BAND, id, day: bounds, night: bounds }];
}

function _soilMoistureTargets(device: GrowspaceDevice): MetricTarget[] {
  const environment = device.environmentAttributes;
  // The band is stored in percent and the backend reports whether the configured
  // sensor actually reads in percent. An incompatible sensor would put the band
  // at a number that means nothing on that trace, so it is not a target at all.
  if (environment?.soilMoistureBandCompatible !== true) return [];

  const band = environment.soilMoistureBand;
  return _flatBand('soil-moisture-band', band?.min, band?.max);
}

function _poreEcTargets(device: GrowspaceDevice): MetricTarget[] {
  const strategy = device.irrigationStrategy;
  return _flatBand('pore-ec-band', strategy?.poreEcTargetMin, strategy?.poreEcTargetMax);
}

/**
 * The feed-EC band is per growth stage, so the descriptor resolves it against the
 * growspace's `granularStage` — a target that ignores the stage is the wrong
 * number rather than a coarse one (ADR-0050).
 */
function _feedEcTargets(device: GrowspaceDevice): MetricTarget[] {
  const stage = device.biologicalMetrics?.granularStage;
  const range = (device.irrigationConfig?.ecTargetRanges ?? []).find((r) => r.stage === stage);
  if (!range) return [];

  // A stage the grower never configured still yields a row, as 0/0. `_flatBand`
  // drops it for being degenerate rather than anchoring an axis on 0 mS/cm.
  return _flatBand('feed-ec-band', range.minEc, range.maxEc);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * The targets configured for one metric, normalised.
 *
 * A metric with nothing configured returns an empty list, which is the whole of
 * what "no guide marks" means downstream — there is no second place to look.
 *
 * Several targets for one metric is the normal case, not a conflict to resolve
 * here: VPD alone can hold its optimal window, its danger bounds, a fan's
 * control setpoint and both appliances' switching thresholds, and each of those
 * is a true and separately configured fact. Telling them apart is the chart's
 * job, which is what the stable `id` on each record is for.
 */
export function computeMetricTargets(
  key: string,
  device?: GrowspaceDevice | null,
  overviewEntity?: OverviewEntitySnapshot
): MetricTarget[] {
  const targets: MetricTarget[] = [];

  // The one source that resolves to defaults rather than to nothing, and the
  // only one that does not need a device.
  if (key === MetricKey.VPD) targets.push(..._vpdTargets(overviewEntity));
  if (!device) return targets;

  switch (key) {
    case MetricKey.VPD:
      targets.push(..._humidityApplianceTargets(device));
      break;
    case MetricKey.SOIL_MOISTURE:
      targets.push(..._soilMoistureTargets(device));
      break;
    case MetricKey.PORE_EC:
      targets.push(..._poreEcTargets(device));
      break;
    case MetricKey.FEED_EC:
      targets.push(..._feedEcTargets(device));
      break;
  }

  // Not switched on above: which metric a fan marks is the fan's regulation
  // mode, not a property of the metric.
  targets.push(..._fanSetpoints(key, device));
  return targets;
}
