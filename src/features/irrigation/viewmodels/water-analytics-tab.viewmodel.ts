/**
 * Water Analytics Tab ViewModel (ADR-0019)
 *
 * The pure derivation behind the Irrigation Dialog's read-mostly Water Analytics
 * tab. Like the Overview tab it owns no draft and has only two narrow
 * interactions (reset-all-data, open-steering link); those are Tab Intents, not
 * derivation, so the factory stays a pure projection.
 *
 * `$sm`-first per the documented ADR-0019 seam: the tab reads the cross-tab
 * `tabs.steering.draft` (to compute the crop-steering shot summary via the PURE
 * `crop-steering-model` helper, the way the Schedules VM does — never the host
 * method) and `tabs.water_analytics.stageAggregates` (fetched by the host's
 * `_fetchStageAnalytics`, passed through here). The device atom supplies every
 * other input: `waterUsage`, `environmentAttributes.irrigationTanks`,
 * `irrigationConfig.{irrigationTimes,drainTimes,…}`, `drainConfig.readings`, and
 * the cycle-telemetry fields.
 *
 * Clock-dependent and locale-dependent formatting (the 24h consumption-bucket
 * chart, `toLocaleString` timestamps, the recent-refills list) is kept in the
 * component so this factory is deterministic and DOM-free; the VM hands the
 * component the raw event arrays it needs for those.
 *
 * Markup-feeding values are copied verbatim from the dialog's former inline
 * `_renderWaterAnalyticsTab` so the rendered output stays byte-identical.
 */

import { computed, type ReadableAtom } from 'nanostores';
import {
  computeCropSteeringCycle,
  type CropSteeringShot,
} from '../../../features/environment/crop-steering-model';
import type {
  GrowspaceDevice,
  IrrigationStrategy,
  IrrigationTime,
  TankConsumptionBucket,
  TankWaterEvent,
} from '../../../types';
import type { WaterUsage } from '../../../services/types';
import type { DialogSM } from '../../../dialogs/irrigation-dialog-sm';

/** One row of the schedule summary (irrigation / drain), pre-shaped for render. */
export interface WaterAnalyticsScheduleRow {
  /** Display time string, already `time ?? start_time` resolved (raw, unsliced). */
  time: string;
  /** Resolved duration in seconds (`duration ?? duration_seconds ?? fallback`). */
  duration: number;
}

/** Crop-steering schedule summary (shown when steering is enabled). */
export interface WaterAnalyticsCropSteeringSummary {
  /** Shots/day from the pure `computeCropSteeringCycle` over the steering draft. */
  shots: CropSteeringShot[];
  /** Drain event rows (first 5 shown by the component). */
  drainRows: WaterAnalyticsScheduleRow[];
  totalDrain: number;
  drainDuration: number;
}

/** Non-steering schedule summary (irrigation + drain event counts). */
export interface WaterAnalyticsScheduleSummary {
  totalIrrig: number;
  totalDrain: number;
  irrigDuration: number;
  drainDuration: number;
  irrigRows: WaterAnalyticsScheduleRow[];
  drainRows: WaterAnalyticsScheduleRow[];
}

/** Per-tank fill bar + warning state for the Tank Levels card. */
export interface WaterAnalyticsTankRow {
  name: string;
  fillLevel: number | null;
  isWarning: boolean;
  hoursRemaining: number | null;
}

/** One volume-history table row, derived from a drain reading with volumes. */
export interface WaterAnalyticsVolumeRow {
  timestamp: string;
  feedVolumeMl: number;
  drainVolumeMl: number;
  /** Runoff % (drain/feed*100) or null when feed volume is 0. */
  runoff: number | null;
  /** Drain EC − feed EC. */
  ecDelta: number;
}

/**
 * Complete render input for `<irrigation-water-analytics-tab>`.
 */
export interface WaterAnalyticsTabViewModel {
  // ── Cycle telemetry (gated on hasPump) ──
  hasPump: boolean;
  /** At least one tank is configured — a gravity/manual tank-fed setup when !hasPump. */
  hasTank: boolean;
  cyclesToday: number;
  /** Raw L dispensed today; component formats. */
  volumeDispensedToday: number;
  /** Raw ms timestamp or null; component locale-formats. */
  lastCycleTimestamp: number | string | null;
  nextScheduledCycle: number | string | null;

  // ── Today's usage (gated on hasPump || hasTank) ──
  waterUsage: WaterUsage | null | undefined;
  /** Avg runoff % across readings with volumes, or null. */
  avgRunoff: number | null;
  /** Count of readings that have both feed+drain volumes (for the "N readings" label). */
  readingsWithVolumesCount: number;

  // ── Tank Levels card ──
  tanks: WaterAnalyticsTankRow[];
  warningTankCount: number;
  /** Average fill level across tanks that report one, or null. */
  avgTankLevel: number | null;

  // ── Tank-Derived Water Usage (gated on hasTankSensors && history) ──
  hasTankSensors: boolean;
  tankLitersToday: number;
  tankLiters7d: number;
  tankAvgPerDay: number;
  /**
   * Card-derived avg daily tank consumption per plant (`tankAvgPerDay /
   * plantCount`), 0 when either operand is 0. Uses the cycle-average basis (not
   * a partial-day "today" figure) so it reconciles with the displayed "Avg per
   * day" ÷ plant count, mirroring the backend pump `litersPerPlantPerDay`.
   */
  tankLitersPerPlantPerDay: number;
  /** Full-data 15-min consumption buckets (last 24h) across tanks with history. */
  tankBuckets24h: TankConsumptionBucket[];
  /** Recent refill events (full 7d summary) across tanks with history. */
  tankRefills: TankWaterEvent[];
  /** True when at least one tank has volume + history. */
  hasTankHistory: boolean;

  // ── Schedule Summary ──
  isCropSteering: boolean;
  cropSteering: WaterAnalyticsCropSteeringSummary;
  schedule: WaterAnalyticsScheduleSummary;

  // ── Water Usage by Growth Stage (passthrough from SM) ──
  stageAggregates: Record<string, number> | null;

  // ── Volume History (gated on schedules draft drainPumpEntity) ──
  hasDrainPumpEntity: boolean;
  volumeRows: WaterAnalyticsVolumeRow[];
  totalFeedMl: number;
  totalDrainMl: number;
}

function deriveScheduleRows(
  times: IrrigationTime[],
  fallbackDuration: number
): WaterAnalyticsScheduleRow[] {
  return times.map((t) => ({
    time: t.time ?? t.start_time ?? '',
    duration: t.duration ?? t.duration_seconds ?? fallbackDuration,
  }));
}

/**
 * Pure factory: SM atom + device atom → one Water Analytics VM atom.
 * `$sm`-first per ADR-0019 (it carries `tabs.steering.draft` and
 * `tabs.water_analytics.stageAggregates`); the device atom supplies all the
 * telemetry/tank/reading inputs.
 */
export function createWaterAnalyticsTabViewModel(
  $sm: ReadableAtom<DialogSM>,
  $device: ReadableAtom<GrowspaceDevice | undefined>
): ReadableAtom<WaterAnalyticsTabViewModel> {
  return computed([$sm, $device], (sm, device) => {
    const wu = device?.waterUsage;
    const tanks = device?.environmentAttributes?.irrigationTanks ?? [];
    const irrigTimes = device?.irrigationConfig?.irrigationTimes ?? [];
    const drainTimes = device?.irrigationConfig?.drainTimes ?? [];
    const readings = device?.drainConfig?.readings ?? [];

    const isCropSteering = !!sm.tabs.steering.draft.enabled;
    const isFlower = (device?.biologicalMetrics?.flowerWeek ?? 0) > 0;
    const csShots: CropSteeringShot[] = isCropSteering
      ? computeCropSteeringCycle(sm.tabs.steering.draft as IrrigationStrategy, isFlower)
      : [];

    const hasPump = !!(
      device?.irrigationConfig?.irrigationPumpEntity || device?.irrigationConfig?.drainPumpEntity
    );
    const hasTank = tanks.length > 0;
    const hasTankSensors = tanks.some((t) => t.sensorEntity);

    const recentReadings = readings.slice(-30).reverse();
    const readingsWithVolumes = recentReadings.filter((r) => r.feedVolumeMl && r.drainVolumeMl);
    const totalFeedMl = readingsWithVolumes.reduce((s, r) => s + (r.feedVolumeMl || 0), 0);
    const totalDrainMl = readingsWithVolumes.reduce((s, r) => s + (r.drainVolumeMl || 0), 0);
    const avgRunoff = totalFeedMl > 0 ? (totalDrainMl / totalFeedMl) * 100 : null;

    const tanksWithData = tanks.filter((t) => t.fillLevel !== null && t.fillLevel !== undefined);
    const avgTankLevel =
      tanksWithData.length > 0
        ? tanksWithData.reduce((s, t) => s + (t.fillLevel ?? 0), 0) / tanksWithData.length
        : null;
    const warningTanks = tanks.filter((t) => t.isWarning);

    const totalIrrig = irrigTimes.length;
    const totalDrain = drainTimes.length;
    const irrigDuration = device?.irrigationConfig?.irrigationDuration ?? 0;
    const drainDuration = device?.irrigationConfig?.drainDuration ?? 0;

    const tanksWithHistory = tanks.filter(
      (t) =>
        t.volumeLiters != null &&
        (t.waterHistory?.buckets_24h?.length ||
          t.waterHistory?.daily_7d?.length ||
          t.waterHistory?.recent_refills?.length)
    );
    const allTankBuckets24h: TankConsumptionBucket[] = tanksWithHistory.flatMap(
      (t) => t.waterHistory!.buckets_24h ?? []
    );
    const allTankRefills: TankWaterEvent[] = tanksWithHistory.flatMap(
      (t) => t.waterHistory!.recent_refills ?? []
    );
    const allDaily7d = tanksWithHistory.flatMap((t) => t.waterHistory!.daily_7d ?? []);
    const todayKey = new Date().toISOString().slice(0, 10);
    const tankLitersToday = allDaily7d
      .filter((d) => d.date === todayKey)
      .reduce((s, d) => s + d.consumed, 0);
    const tankLiters7d = allDaily7d.reduce((s, d) => s + d.consumed, 0);
    const daysWithData = new Set(allDaily7d.filter((d) => d.consumed > 0).map((d) => d.date)).size;
    const tankAvgPerDay = daysWithData > 0 ? tankLiters7d / daysWithData : 0;
    const plantCount = device?.plants?.length ?? 0;
    const tankLitersPerPlantPerDay =
      tankAvgPerDay > 0 && plantCount > 0 ? tankAvgPerDay / plantCount : 0;

    const volumeRows: WaterAnalyticsVolumeRow[] = readingsWithVolumes.map((r) => ({
      timestamp: r.timestamp,
      feedVolumeMl: r.feedVolumeMl!,
      drainVolumeMl: r.drainVolumeMl!,
      runoff: r.feedVolumeMl ? (r.drainVolumeMl! / r.feedVolumeMl!) * 100 : null,
      ecDelta: r.drainEc - r.feedEc,
    }));

    return {
      hasPump,
      hasTank,
      cyclesToday: device?.cyclesToday ?? 0,
      volumeDispensedToday: device?.volumeDispensedToday ?? 0,
      lastCycleTimestamp: device?.lastCycleTimestamp ?? null,
      nextScheduledCycle: device?.nextScheduledCycle ?? null,

      waterUsage: wu,
      avgRunoff,
      readingsWithVolumesCount: readingsWithVolumes.length,

      tanks: tanks.map((t) => ({
        name: t.name,
        fillLevel: t.fillLevel ?? null,
        isWarning: !!t.isWarning,
        hoursRemaining: t.hoursRemaining ?? null,
      })),
      warningTankCount: warningTanks.length,
      avgTankLevel,

      hasTankSensors,
      tankLitersToday,
      tankLiters7d,
      tankAvgPerDay,
      tankLitersPerPlantPerDay,
      tankBuckets24h: allTankBuckets24h,
      tankRefills: allTankRefills,
      hasTankHistory: tanksWithHistory.length > 0,

      isCropSteering,
      cropSteering: {
        shots: csShots,
        drainRows: deriveScheduleRows(drainTimes, drainDuration),
        totalDrain,
        drainDuration,
      },
      schedule: {
        totalIrrig,
        totalDrain,
        irrigDuration,
        drainDuration,
        irrigRows: deriveScheduleRows(irrigTimes, irrigDuration),
        drainRows: deriveScheduleRows(drainTimes, drainDuration),
      },

      stageAggregates: sm.tabs.water_analytics.stageAggregates,

      hasDrainPumpEntity: !!sm.tabs.schedules.draft.drainPumpEntity,
      volumeRows,
      totalFeedMl,
      totalDrainMl,
    };
  });
}
