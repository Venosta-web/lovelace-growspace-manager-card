/**
 * Irrigation slice — atoms and mutators for Irrigation domain data.
 *
 * Public API (atoms):
 *   irrigationConfigs$    — read: Map<growspaceId, IrrigationConfig>
 *   irrigationStrategies$ — read: Map<growspaceId, IrrigationStrategy>
 *   tankLevels$           — read: Map<growspaceId, IrrigationTank[]>
 *
 * Public API (bootstrap writes — called by SyncService):
 *   setIrrigationConfig()   — replace the IrrigationConfig for a growspace
 *   setIrrigationStrategy() — replace the IrrigationStrategy for a growspace
 *   setTankLevels()         — replace the IrrigationTank list for a growspace
 *
 * Public API (pure computation):
 *   computeIrrigationMode()  — derive 'manual' | 'crop_steering' from strategy
 *   computePhaseWindows()    — derive P0–P3 phase windows from strategy
 *
 * Public API (mutators):
 *   toggleIrrigationMode()       — optimistic: flip strategy.enabled
 *   addIrrigationTime()          — optimistic: append + sort irrigation schedule
 *   removeIrrigationTime()       — optimistic: remove from irrigation schedule
 *   addDrainTime()               — optimistic: append + sort drain schedule
 *   removeDrainTime()            — optimistic: remove from drain schedule
 *   updateIrrigationStrategy()   — optimistic: merge strategy fields
 *   saveIrrigationSettings()     — optimistic: merge config settings
 *   logDrainReading()            — fire-and-forget
 *   configureDrainMonitoring()   — fire-and-forget
 *   runIrrigationCycle()         — fire-and-forget
 *   fetchCropSteeringHistory()   — fetches sensor-driven VWC/EC history for one growspace
 *
 * Action type, payload shapes, and zod schemas are private to this module.
 * Tank data absorption: this slice is the authoritative source for tank levels,
 * superseding direct reads from store/growspace or services/api/TankAPI.
 */

import { atom } from 'nanostores';
import type {
  IrrigationConfig,
  IrrigationStrategy,
  IrrigationTank,
  ECTargetRange,
} from '../../services/types';
import { mutate } from '../../services/mutate';
import { callService, hassCall } from '../../services/hass-call';
import type { IrrigationMode, PhaseWindows, IrrigationAnalytics } from './schema';
import { IrrigationAnalyticsSchema } from './schema';
import { patchDeviceIrrigationConfig, patchDeviceStrategy } from '../grid';
import { CropSteeringHistorySchema, type CropSteeringHistory } from '../../schemas/api-schema';
import { ApplySteeringModeResultSchema, type SteeringMode } from './schema';
import { token } from '../../styles/variables';

// ---------------------------------------------------------------------------
// Atoms (public read)
// ---------------------------------------------------------------------------

export const irrigationConfigs$ = atom<Map<string, IrrigationConfig>>(new Map());
export const irrigationStrategies$ = atom<Map<string, IrrigationStrategy>>(new Map());
export const tankLevels$ = atom<Map<string, IrrigationTank[]>>(new Map());
export const cropSteeringHistory$ = atom<Map<string, CropSteeringHistory>>(new Map());

// ---------------------------------------------------------------------------
// Bootstrap writes (called by SyncService when fresh data arrives)
// ---------------------------------------------------------------------------

export function setIrrigationConfig(growspaceId: string, config: IrrigationConfig): void {
  const updated = new Map(irrigationConfigs$.get());
  updated.set(growspaceId, config);
  irrigationConfigs$.set(updated);
}

export function setIrrigationStrategy(growspaceId: string, strategy: IrrigationStrategy): void {
  const updated = new Map(irrigationStrategies$.get());
  updated.set(growspaceId, strategy);
  irrigationStrategies$.set(updated);
}

export function setTankLevels(growspaceId: string, tanks: IrrigationTank[]): void {
  const updated = new Map(tankLevels$.get());
  updated.set(growspaceId, tanks);
  tankLevels$.set(updated);
}

// ---------------------------------------------------------------------------
// Pure computation (exported — used by components and tests)
// ---------------------------------------------------------------------------

/**
 * Derive irrigation mode from the strategy's enabled flag.
 * 'crop_steering' when strategy.enabled is true, 'manual' otherwise.
 */
export function computeIrrigationMode(strategy: IrrigationStrategy | undefined): IrrigationMode {
  return strategy?.enabled === true ? 'crop_steering' : 'manual';
}

/**
 * Derive P0–P3 phase windows from a crop-steering strategy.
 *
 * Returns null when strategy is undefined or disabled.
 * P1 = Saturation (lightsOn → lightsOn + p0Duration)
 * P2 = Maintenance (P1 end → P3 start)
 * P3 = Dryback (P3 start → lightsOff)
 * P0 is the pre-lights period (dark before lights-on), not explicitly windowed here.
 */
export function computePhaseWindows(
  strategy: IrrigationStrategy | undefined,
  vegDayHours = 18
): PhaseWindows | null {
  if (!strategy?.enabled) return null;

  const [hh, mm] = (strategy.lightsOnTime ?? '06:00').split(':').map(Number);
  const lightsOnMin = hh * 60 + (mm || 0);
  const lightsOffMin = lightsOnMin + vegDayHours * 60;

  const p1End = lightsOnMin + (strategy.p0DurationMinutes ?? 60);
  const p3Start = Math.max(p1End, lightsOffMin - (strategy.p2StopBeforeLightsOffMinutes ?? 120));

  const phases = [
    {
      id: 'p1' as const,
      label: 'P1',
      name: 'Saturation',
      start: lightsOnMin,
      end: p1End,
      color: token['--phase-p1'],
      target: 'Reach FC',
    },
    {
      id: 'p2' as const,
      label: 'P2',
      name: 'Maintenance',
      start: p1End,
      end: p3Start,
      color: token['--phase-p2'],
      target: 'Runoff target',
    },
    {
      id: 'p3' as const,
      label: 'P3',
      name: 'Dryback',
      start: p3Start,
      end: lightsOffMin,
      color: token['--phase-p3'],
      target: `−${strategy.maintenanceDrybackPercent ?? 3}% VWC`,
    },
  ];

  return { lightsOnMin, lightsOffMin, lightHours: vegDayHours, phases };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _getConfig(growspaceId: string): IrrigationConfig {
  return irrigationConfigs$.get().get(growspaceId) ?? { irrigationTimes: [], drainTimes: [] };
}

function _getStrategy(growspaceId: string): IrrigationStrategy {
  return (
    irrigationStrategies$.get().get(growspaceId) ?? {
      enabled: false,
      lightsOnTime: '06:00',
      p0DurationMinutes: 60,
      p2StopBeforeLightsOffMinutes: 120,
      targetVwcPercent: 65,
      maintenanceDrybackPercent: 3,
      shotDurationSeconds: 30,
      shotIntervalMinutes: 15,
    }
  );
}

function _patchConfig(growspaceId: string, patch: Partial<IrrigationConfig>): void {
  const updated = new Map(irrigationConfigs$.get());
  updated.set(growspaceId, { ..._getConfig(growspaceId), ...patch });
  irrigationConfigs$.set(updated);
}

function _patchStrategy(growspaceId: string, patch: Partial<IrrigationStrategy>): void {
  const updated = new Map(irrigationStrategies$.get());
  updated.set(growspaceId, { ..._getStrategy(growspaceId), ...patch });
  irrigationStrategies$.set(updated);
}

/** Sort schedule items by time string (HH:MM or HH:MM:SS). */
function _sortByTime<T extends { time?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
}

// ---------------------------------------------------------------------------
// Mutators (public write)
// ---------------------------------------------------------------------------

/**
 * Toggle irrigation mode between 'manual' and 'crop_steering'.
 *
 * Optimistic: flips strategy.enabled in irrigationStrategies$.
 * Apply: calls growspace_manager.set_irrigation_strategy with the new enabled flag.
 * Inverse: restores previous enabled value on failure.
 */
export async function toggleIrrigationMode(growspaceId: string): Promise<void> {
  const prev = _getStrategy(growspaceId);
  const nextEnabled = !prev.enabled;

  await mutate(
    {
      type: 'toggleIrrigationMode',
      optimistic: () => _patchStrategy(growspaceId, { enabled: nextEnabled }),
      inverse: () => _patchStrategy(growspaceId, { enabled: prev.enabled }),
      apply: () =>
        callService('growspace_manager', 'set_irrigation_strategy', {
          growspace_id: growspaceId,
          enabled: nextEnabled,
        }),
    },
    growspaceId
  );
}

/**
 * Add a manual irrigation time to the schedule.
 *
 * Optimistic: appends the new time and sorts irrigationTimes.
 * Apply: calls growspace_manager.add_irrigation_time.
 * Inverse: restores the previous irrigationTimes list on failure.
 */
export async function addIrrigationTime(
  growspaceId: string,
  time: string,
  duration = 60
): Promise<void> {
  const prev = _getConfig(growspaceId);
  const next = _sortByTime([...prev.irrigationTimes, { time, duration }]);

  await mutate(
    {
      type: 'addIrrigationTime',
      optimistic: () => {
        _patchConfig(growspaceId, { irrigationTimes: next });
        patchDeviceIrrigationConfig(growspaceId, { irrigationTimes: next });
      },
      inverse: () => {
        _patchConfig(growspaceId, { irrigationTimes: prev.irrigationTimes });
        patchDeviceIrrigationConfig(growspaceId, { irrigationTimes: prev.irrigationTimes });
      },
      apply: () =>
        callService('growspace_manager', 'add_irrigation_time', {
          growspace_id: growspaceId,
          time,
          duration,
        }),
    },
    growspaceId
  );
}

/**
 * Remove a manual irrigation time from the schedule.
 *
 * Optimistic: removes the matching time from irrigationTimes.
 * Apply: calls growspace_manager.remove_irrigation_time.
 * Inverse: restores the previous irrigationTimes list on failure.
 */
export async function removeIrrigationTime(growspaceId: string, time: string): Promise<void> {
  const prev = _getConfig(growspaceId);
  const next = prev.irrigationTimes.filter((t) => t.time !== time);

  await mutate(
    {
      type: 'removeIrrigationTime',
      optimistic: () => {
        _patchConfig(growspaceId, { irrigationTimes: next });
        patchDeviceIrrigationConfig(growspaceId, { irrigationTimes: next });
      },
      inverse: () => {
        _patchConfig(growspaceId, { irrigationTimes: prev.irrigationTimes });
        patchDeviceIrrigationConfig(growspaceId, { irrigationTimes: prev.irrigationTimes });
      },
      apply: () =>
        callService('growspace_manager', 'remove_irrigation_time', {
          growspace_id: growspaceId,
          time,
        }),
    },
    growspaceId
  );
}

/**
 * Add a drain time to the schedule.
 *
 * Optimistic: appends the new drain time and sorts drainTimes.
 * Apply: calls growspace_manager.add_drain_time.
 * Inverse: restores the previous drainTimes list on failure.
 */
export async function addDrainTime(
  growspaceId: string,
  time: string,
  duration = 60
): Promise<void> {
  const prev = _getConfig(growspaceId);
  const next = _sortByTime([...prev.drainTimes, { time, duration }]);

  await mutate(
    {
      type: 'addDrainTime',
      optimistic: () => {
        _patchConfig(growspaceId, { drainTimes: next });
        patchDeviceIrrigationConfig(growspaceId, { drainTimes: next });
      },
      inverse: () => {
        _patchConfig(growspaceId, { drainTimes: prev.drainTimes });
        patchDeviceIrrigationConfig(growspaceId, { drainTimes: prev.drainTimes });
      },
      apply: () =>
        callService('growspace_manager', 'add_drain_time', {
          growspace_id: growspaceId,
          time,
          duration,
        }),
    },
    growspaceId
  );
}

/**
 * Remove a drain time from the schedule.
 *
 * Optimistic: removes the matching drain time from drainTimes.
 * Apply: calls growspace_manager.remove_drain_time.
 * Inverse: restores the previous drainTimes list on failure.
 */
export async function removeDrainTime(growspaceId: string, time: string): Promise<void> {
  const prev = _getConfig(growspaceId);
  const next = prev.drainTimes.filter((t) => t.time !== time);

  await mutate(
    {
      type: 'removeDrainTime',
      optimistic: () => {
        _patchConfig(growspaceId, { drainTimes: next });
        patchDeviceIrrigationConfig(growspaceId, { drainTimes: next });
      },
      inverse: () => {
        _patchConfig(growspaceId, { drainTimes: prev.drainTimes });
        patchDeviceIrrigationConfig(growspaceId, { drainTimes: prev.drainTimes });
      },
      apply: () =>
        callService('growspace_manager', 'remove_drain_time', {
          growspace_id: growspaceId,
          time,
        }),
    },
    growspaceId
  );
}

/**
 * Merge partial strategy updates into the active irrigation strategy.
 *
 * Optimistic: patches irrigationStrategies$ with the provided fields.
 * Apply: calls growspace_manager.set_irrigation_strategy with serialized payload.
 * Inverse: restores the previous strategy on failure.
 */
export async function updateIrrigationStrategy(
  growspaceId: string,
  updates: Partial<IrrigationStrategy>
): Promise<void> {
  const prev = _getStrategy(growspaceId);

  const payload: Record<string, unknown> = { growspace_id: growspaceId };
  if (updates.enabled !== undefined) payload.enabled = updates.enabled;
  if (updates.lightsOnTime !== undefined) payload.lights_on_time = updates.lightsOnTime;
  if (updates.p0DurationMinutes !== undefined)
    payload.p0_duration_minutes = updates.p0DurationMinutes;
  if (updates.p2StopBeforeLightsOffMinutes !== undefined)
    payload.p2_stop_before_lights_off_minutes = updates.p2StopBeforeLightsOffMinutes;
  if (updates.targetVwcPercent !== undefined) payload.target_vwc_percent = updates.targetVwcPercent;
  if (updates.maintenanceDrybackPercent !== undefined)
    payload.maintenance_dryback_percent = updates.maintenanceDrybackPercent;
  if (updates.shotDurationSeconds !== undefined)
    payload.shot_duration_seconds = updates.shotDurationSeconds;
  if (updates.shotIntervalMinutes !== undefined)
    payload.shot_interval_minutes = updates.shotIntervalMinutes;
  if (updates.p1ShotDurationSeconds !== undefined)
    payload.p1_shot_duration_seconds = updates.p1ShotDurationSeconds;
  if (updates.p1ShotIntervalMinutes !== undefined)
    payload.p1_shot_interval_minutes = updates.p1ShotIntervalMinutes;
  if (updates.p2ShotDurationSeconds !== undefined)
    payload.p2_shot_duration_seconds = updates.p2ShotDurationSeconds;
  if (updates.p2ShotIntervalMinutes !== undefined)
    payload.p2_shot_interval_minutes = updates.p2ShotIntervalMinutes;
  if (updates.p1ShotVolumePercent !== undefined)
    payload.p1_shot_volume_percent = updates.p1ShotVolumePercent;
  if (updates.p2ShotVolumePercent !== undefined)
    payload.p2_shot_volume_percent = updates.p2ShotVolumePercent;
  if (updates.shotSizingMode !== undefined) payload.shot_sizing_mode = updates.shotSizingMode;
  // Substrate Profile serializes to the backend's flat keys (folded into the
  // nested substrate_profile server-side); the read side stays nested.
  if (updates.substrateProfile !== undefined) {
    payload.substrate_media_type = updates.substrateProfile.mediaType;
    payload.substrate_liters_per_pot = updates.substrateProfile.litersPerPot;
  }
  if (updates.poreEcTargetMin !== undefined) payload.pore_ec_target_min = updates.poreEcTargetMin;
  if (updates.poreEcTargetMax !== undefined) payload.pore_ec_target_max = updates.poreEcTargetMax;
  if (updates.ecModulationEnabled !== undefined)
    payload.ec_modulation_enabled = updates.ecModulationEnabled;
  if (updates.autoLightTracking !== undefined)
    payload.auto_light_tracking = updates.autoLightTracking;
  if (updates.dynamicShotEnabled !== undefined)
    payload.dynamic_shot_enabled = updates.dynamicShotEnabled;
  if (updates.dynamicAggressiveness !== undefined)
    payload.dynamic_aggressiveness = updates.dynamicAggressiveness;
  if (updates.dynamicRecovery !== undefined) payload.dynamic_recovery = updates.dynamicRecovery;
  if (updates.dynamicShotSizeFloor !== undefined)
    payload.dynamic_shot_size_floor = updates.dynamicShotSizeFloor;
  if (updates.dynamicIntervalCeiling !== undefined)
    payload.dynamic_interval_ceiling = updates.dynamicIntervalCeiling;

  await mutate(
    {
      type: 'updateIrrigationStrategy',
      // Patch both the strategy read-model atom and the device the dialog reads,
      // so immediate-persist controls (sizing mode, profile, modulation) reflect
      // optimistically without waiting for a full device sync (ADR-0017).
      optimistic: () => {
        _patchStrategy(growspaceId, updates);
        patchDeviceStrategy(growspaceId, updates);
      },
      inverse: () => {
        _patchStrategy(growspaceId, prev);
        patchDeviceStrategy(growspaceId, prev);
      },
      apply: () => callService('growspace_manager', 'set_irrigation_strategy', payload),
    },
    growspaceId
  );
}

/**
 * Stamp a Steering Mode's server-owned preset into the strategy (ADR-0012).
 *
 * The server owns the preset table and writes the new field values; the WS
 * command returns only the declared mode. We optimistically reflect the
 * selected mode so the selector highlights immediately — the stamped numeric
 * field values arrive through the normal device sync.
 */
export async function applySteeringMode(growspaceId: string, mode: SteeringMode): Promise<void> {
  const prev = _getStrategy(growspaceId);

  await mutate(
    {
      type: 'applySteeringMode',
      optimistic: () => _patchStrategy(growspaceId, { declaredSteeringMode: mode }),
      inverse: () => _patchStrategy(growspaceId, prev),
      apply: async () => {
        await hassCall(
          'growspace_manager/apply_steering_mode',
          { growspace_id: growspaceId, steering_mode: mode },
          ApplySteeringModeResultSchema
        );
      },
    },
    growspaceId
  );
}

/**
 * Persist irrigation settings (pump entities, durations, caps, flags).
 *
 * Optimistic: patches irrigationConfigs$ with the new settings.
 * Apply: calls growspace_manager.set_irrigation_settings with serialized payload.
 * Inverse: restores the previous config on failure.
 */
export async function saveIrrigationSettings(
  growspaceId: string,
  settings: {
    irrigationPumpEntity: string;
    pumpFlowRateMlPerSec?: number;
    drainPumpEntity: string;
    irrigationDuration: number;
    drainDuration: number;
    soilTriggerPercent?: number | null;
    dailyVolumeCapLiters?: number | null;
    maxCyclesPerDay?: number | null;
    skipDuringDark?: boolean;
    pauseOnLowTank?: boolean;
    logToLogbook?: boolean;
    autoAdvanceP1ToP2?: boolean;
    autoAdvanceP2ToP3?: boolean;
    haltOnRunoffEcThreshold?: number | null;
    activeSteeringPhase?: 'p1' | 'p2' | 'p3';
  }
): Promise<void> {
  const prev = _getConfig(growspaceId);

  const patch: Partial<IrrigationConfig> = {
    irrigationPumpEntity: settings.irrigationPumpEntity,
    drainPumpEntity: settings.drainPumpEntity,
    irrigationDuration: settings.irrigationDuration,
    drainDuration: settings.drainDuration,
    soilTriggerPercent: settings.soilTriggerPercent,
    dailyVolumeCapLiters: settings.dailyVolumeCapLiters,
    maxCyclesPerDay: settings.maxCyclesPerDay,
    skipDuringDark: settings.skipDuringDark,
    pauseOnLowTank: settings.pauseOnLowTank,
    logToLogbook: settings.logToLogbook,
    autoAdvanceP1ToP2: settings.autoAdvanceP1ToP2,
    autoAdvanceP2ToP3: settings.autoAdvanceP2ToP3,
    haltOnRunoffEcThreshold: settings.haltOnRunoffEcThreshold,
    activeSteeringPhase: settings.activeSteeringPhase,
  };
  if (settings.pumpFlowRateMlPerSec !== undefined)
    patch.pumpFlowRateMlPerSec = settings.pumpFlowRateMlPerSec;

  const payload: Record<string, unknown> = {
    growspace_id: growspaceId,
    irrigation_pump_entity: settings.irrigationPumpEntity,
    drain_pump_entity: settings.drainPumpEntity,
    irrigation_duration: settings.irrigationDuration,
    drain_duration: settings.drainDuration,
  };
  if (settings.pumpFlowRateMlPerSec !== undefined)
    payload.pump_flow_rate_ml_per_sec = settings.pumpFlowRateMlPerSec;
  if (settings.soilTriggerPercent !== undefined)
    payload.soil_trigger_percent = settings.soilTriggerPercent;
  if (settings.dailyVolumeCapLiters !== undefined)
    payload.daily_volume_cap_liters = settings.dailyVolumeCapLiters;
  if (settings.maxCyclesPerDay !== undefined) payload.max_cycles_per_day = settings.maxCyclesPerDay;
  if (settings.skipDuringDark !== undefined) payload.skip_during_dark = settings.skipDuringDark;
  if (settings.pauseOnLowTank !== undefined) payload.pause_on_low_tank = settings.pauseOnLowTank;
  if (settings.logToLogbook !== undefined) payload.log_to_logbook = settings.logToLogbook;
  if (settings.autoAdvanceP1ToP2 !== undefined)
    payload.auto_advance_p1_to_p2 = settings.autoAdvanceP1ToP2;
  if (settings.autoAdvanceP2ToP3 !== undefined)
    payload.auto_advance_p2_to_p3 = settings.autoAdvanceP2ToP3;
  if (settings.haltOnRunoffEcThreshold !== undefined)
    payload.halt_on_runoff_ec_threshold = settings.haltOnRunoffEcThreshold;
  if (settings.activeSteeringPhase !== undefined)
    payload.active_steering_phase = settings.activeSteeringPhase;

  await mutate(
    {
      type: 'saveIrrigationSettings',
      optimistic: () => {
        _patchConfig(growspaceId, patch);
        patchDeviceIrrigationConfig(growspaceId, patch);
      },
      inverse: () => {
        const restored = new Map(irrigationConfigs$.get());
        restored.set(growspaceId, prev);
        irrigationConfigs$.set(restored);
        patchDeviceIrrigationConfig(growspaceId, prev);
      },
      apply: () => callService('growspace_manager', 'set_irrigation_settings', payload),
    },
    growspaceId
  );
}

/**
 * Record a drain/runoff EC reading.
 *
 * Fire-and-forget — no optimistic update, no undo.
 */
export async function logDrainReading(
  growspaceId: string,
  params: { feedEc: number; drainEc: number; feedVolumeMl?: number; drainVolumeMl?: number }
): Promise<void> {
  const payload: Record<string, unknown> = {
    growspace_id: growspaceId,
    feed_ec: params.feedEc,
    drain_ec: params.drainEc,
  };
  if (params.feedVolumeMl !== undefined) payload.feed_volume_ml = params.feedVolumeMl;
  if (params.drainVolumeMl !== undefined) payload.drain_volume_ml = params.drainVolumeMl;

  await callService('growspace_manager', 'log_drain_reading', payload);
}

/**
 * Configure drain EC monitoring thresholds.
 *
 * Fire-and-forget — no optimistic update, no undo.
 */
export async function configureDrainMonitoring(
  growspaceId: string,
  params: { enabled?: boolean; maxEcDelta?: number; targetRunoffPercent?: number }
): Promise<void> {
  const payload: Record<string, unknown> = { growspace_id: growspaceId };
  if (params.enabled !== undefined) payload.enabled = params.enabled;
  if (params.maxEcDelta !== undefined) payload.max_ec_delta = params.maxEcDelta;
  if (params.targetRunoffPercent !== undefined)
    payload.target_runoff_percent = params.targetRunoffPercent;

  await callService('growspace_manager', 'configure_drain_monitoring', payload);
}

/**
 * Set per-stage EC target ranges. One service call per range.
 *
 * Fire-and-forget — no optimistic update, no undo.
 */
export async function setEcTargetRanges(
  growspaceId: string,
  ranges: ECTargetRange[]
): Promise<void> {
  for (const r of ranges) {
    await callService('growspace_manager', 'set_ec_target_range', {
      growspace_id: growspaceId,
      stage: r.stage,
      feed_ec_min: r.minEc,
      feed_ec_max: r.maxEc,
    });
  }
}

/**
 * Trigger a manual irrigation cycle.
 *
 * Fire-and-forget — no optimistic update, no undo.
 */
export async function runIrrigationCycle(growspaceId: string, duration?: number): Promise<void> {
  const payload: Record<string, unknown> = { growspace_id: growspaceId };
  if (duration !== undefined) payload.duration = duration;

  await callService('growspace_manager', 'run_irrigation_cycle', payload);
}

export async function fetchCropSteeringHistory(growspaceId: string): Promise<void> {
  const result = await hassCall(
    'growspace_manager/get_crop_steering_history',
    { growspace_id: growspaceId },
    CropSteeringHistorySchema
  );
  const updated = new Map(cropSteeringHistory$.get());
  updated.set(growspaceId, result);
  cropSteeringHistory$.set(updated);
}

/**
 * Fetch irrigation analytics for a growspace.
 *
 * Returns null when the backend call fails so callers can treat absent analytics
 * the same way as the legacy IrrigationAPI.getIrrigationAnalytics (sendWebSocketSafe).
 */
export async function getIrrigationAnalytics(
  growspaceId: string
): Promise<IrrigationAnalytics | null> {
  try {
    return await hassCall(
      'growspace_manager/irrigation_analytics',
      { growspace_id: growspaceId },
      IrrigationAnalyticsSchema
    );
  } catch (err) {
    console.error(
      '[IrrigationSlice] getIrrigationAnalytics failed:',
      err instanceof Error ? err.message : err
    );
    return null;
  }
}
