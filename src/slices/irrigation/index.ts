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
 *
 * Action type, payload shapes, and zod schemas are private to this module.
 * Tank data absorption: this slice is the authoritative source for tank levels,
 * superseding direct reads from store/growspace or services/api/TankAPI.
 */

import { atom } from 'nanostores';
import type { IrrigationConfig, IrrigationStrategy, IrrigationTank } from '../../services/types';
import { mutate } from '../../services/mutate';
import { callService } from '../../services/hass-call';
import type { IrrigationMode, PhaseWindows } from './schema';

// ---------------------------------------------------------------------------
// Atoms (public read)
// ---------------------------------------------------------------------------

export const irrigationConfigs$ = atom<Map<string, IrrigationConfig>>(new Map());
export const irrigationStrategies$ = atom<Map<string, IrrigationStrategy>>(new Map());
export const tankLevels$ = atom<Map<string, IrrigationTank[]>>(new Map());

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
  vegDayHours = 18,
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
      color: '#4CAF50',
      target: 'Reach FC',
    },
    {
      id: 'p2' as const,
      label: 'P2',
      name: 'Maintenance',
      start: p1End,
      end: p3Start,
      color: '#2196F3',
      target: 'Runoff target',
    },
    {
      id: 'p3' as const,
      label: 'P3',
      name: 'Dryback',
      start: p3Start,
      end: lightsOffMin,
      color: '#FF9800',
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
    growspaceId,
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
  duration = 60,
): Promise<void> {
  const prev = _getConfig(growspaceId);
  const next = _sortByTime([...prev.irrigationTimes, { time, duration }]);

  await mutate(
    {
      type: 'addIrrigationTime',
      optimistic: () => _patchConfig(growspaceId, { irrigationTimes: next }),
      inverse: () => _patchConfig(growspaceId, { irrigationTimes: prev.irrigationTimes }),
      apply: () =>
        callService('growspace_manager', 'add_irrigation_time', {
          growspace_id: growspaceId,
          time,
          duration,
        }),
    },
    growspaceId,
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
      optimistic: () => _patchConfig(growspaceId, { irrigationTimes: next }),
      inverse: () => _patchConfig(growspaceId, { irrigationTimes: prev.irrigationTimes }),
      apply: () =>
        callService('growspace_manager', 'remove_irrigation_time', {
          growspace_id: growspaceId,
          time,
        }),
    },
    growspaceId,
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
  duration = 60,
): Promise<void> {
  const prev = _getConfig(growspaceId);
  const next = _sortByTime([...prev.drainTimes, { time, duration }]);

  await mutate(
    {
      type: 'addDrainTime',
      optimistic: () => _patchConfig(growspaceId, { drainTimes: next }),
      inverse: () => _patchConfig(growspaceId, { drainTimes: prev.drainTimes }),
      apply: () =>
        callService('growspace_manager', 'add_drain_time', {
          growspace_id: growspaceId,
          time,
          duration,
        }),
    },
    growspaceId,
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
      optimistic: () => _patchConfig(growspaceId, { drainTimes: next }),
      inverse: () => _patchConfig(growspaceId, { drainTimes: prev.drainTimes }),
      apply: () =>
        callService('growspace_manager', 'remove_drain_time', {
          growspace_id: growspaceId,
          time,
        }),
    },
    growspaceId,
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
  updates: Partial<IrrigationStrategy>,
): Promise<void> {
  const prev = _getStrategy(growspaceId);

  const payload: Record<string, unknown> = { growspace_id: growspaceId };
  if (updates.enabled !== undefined) payload.enabled = updates.enabled;
  if (updates.lightsOnTime !== undefined) payload.lights_on_time = updates.lightsOnTime;
  if (updates.p0DurationMinutes !== undefined) payload.p0_duration_minutes = updates.p0DurationMinutes;
  if (updates.p2StopBeforeLightsOffMinutes !== undefined)
    payload.p2_stop_before_lights_off_minutes = updates.p2StopBeforeLightsOffMinutes;
  if (updates.targetVwcPercent !== undefined) payload.target_vwc_percent = updates.targetVwcPercent;
  if (updates.maintenanceDrybackPercent !== undefined)
    payload.maintenance_dryback_percent = updates.maintenanceDrybackPercent;
  if (updates.shotDurationSeconds !== undefined) payload.shot_duration_seconds = updates.shotDurationSeconds;
  if (updates.shotIntervalMinutes !== undefined) payload.shot_interval_minutes = updates.shotIntervalMinutes;
  if (updates.autoLightTracking !== undefined) payload.auto_light_tracking = updates.autoLightTracking;

  await mutate(
    {
      type: 'updateIrrigationStrategy',
      optimistic: () => _patchStrategy(growspaceId, updates),
      inverse: () => _patchStrategy(growspaceId, prev),
      apply: () => callService('growspace_manager', 'set_irrigation_strategy', payload),
    },
    growspaceId,
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
  },
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

  const payload: Record<string, unknown> = {
    growspace_id: growspaceId,
    irrigation_pump_entity: settings.irrigationPumpEntity,
    drain_pump_entity: settings.drainPumpEntity,
    irrigation_duration: settings.irrigationDuration,
    drain_duration: settings.drainDuration,
  };
  if (settings.soilTriggerPercent !== undefined) payload.soil_trigger_percent = settings.soilTriggerPercent;
  if (settings.dailyVolumeCapLiters !== undefined) payload.daily_volume_cap_liters = settings.dailyVolumeCapLiters;
  if (settings.maxCyclesPerDay !== undefined) payload.max_cycles_per_day = settings.maxCyclesPerDay;
  if (settings.skipDuringDark !== undefined) payload.skip_during_dark = settings.skipDuringDark;
  if (settings.pauseOnLowTank !== undefined) payload.pause_on_low_tank = settings.pauseOnLowTank;
  if (settings.logToLogbook !== undefined) payload.log_to_logbook = settings.logToLogbook;
  if (settings.autoAdvanceP1ToP2 !== undefined) payload.auto_advance_p1_to_p2 = settings.autoAdvanceP1ToP2;
  if (settings.autoAdvanceP2ToP3 !== undefined) payload.auto_advance_p2_to_p3 = settings.autoAdvanceP2ToP3;
  if (settings.haltOnRunoffEcThreshold !== undefined)
    payload.halt_on_runoff_ec_threshold = settings.haltOnRunoffEcThreshold;
  if (settings.activeSteeringPhase !== undefined)
    payload.active_steering_phase = settings.activeSteeringPhase;

  await mutate(
    {
      type: 'saveIrrigationSettings',
      optimistic: () => _patchConfig(growspaceId, patch),
      inverse: () => {
        const restored = new Map(irrigationConfigs$.get());
        restored.set(growspaceId, prev);
        irrigationConfigs$.set(restored);
      },
      apply: () => callService('growspace_manager', 'set_irrigation_settings', payload),
    },
    growspaceId,
  );
}

/**
 * Record a drain/runoff EC reading.
 *
 * Fire-and-forget — no optimistic update, no undo.
 */
export async function logDrainReading(
  growspaceId: string,
  params: { feedEc: number; drainEc: number; feedVolumeMl?: number; drainVolumeMl?: number },
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
  params: { enabled?: boolean; maxEcDelta?: number; targetRunoffPercent?: number },
): Promise<void> {
  const payload: Record<string, unknown> = { growspace_id: growspaceId };
  if (params.enabled !== undefined) payload.enabled = params.enabled;
  if (params.maxEcDelta !== undefined) payload.max_ec_delta = params.maxEcDelta;
  if (params.targetRunoffPercent !== undefined) payload.target_runoff_percent = params.targetRunoffPercent;

  await callService('growspace_manager', 'configure_drain_monitoring', payload);
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
