/**
 * Irrigation Dialog State Machine
 *
 * Pure module — no Lit, no DOM. All interaction state for IrrigationDialog lives here.
 * The component calls `transition(sm, event)` and replaces its single `@state() _sm`.
 *
 * Structure:
 *   DialogSM
 *     .activeTab          — which tab is visible
 *     .status             — root-level async/confirm overlay
 *     .toast              — transient error message
 *     .tabs               — one typed state object per tab (draft + sub-state)
 */

import type { IrrigationStrategy, GrowspaceDevice } from '../types';
import type { ECTargetRange } from '../services/types';

// ─── Shared primitives ────────────────────────────────────────────────────────

export type Phase = 'p1' | 'p2' | 'p3';

export type TabId =
  | 'schedules'
  | 'steering'
  | 'config'
  | 'tanks'
  | 'water_analytics'
  | 'drain_ec'
  | 'ec_targets'
  | 'ec_ramp';

// ─── Schedules tab ─────────────────────────────────────────────────────────────

export interface SchedulesDraft {
  irrigationPumpEntity: string;
  drainPumpEntity: string;
  irrigationDuration: number;
  drainDuration: number;
}

export type SchedulesSubState =
  | { kind: 'idle' }
  | { kind: 'adding-irrigation'; time: string; duration: number }
  | {
      kind: 'editing-irrigation';
      originalTime: string;
      originalDuration: number;
      time: string;
      duration: number;
    }
  | { kind: 'adding-drain'; time: string; duration: number }
  | {
      kind: 'editing-drain';
      originalTime: string;
      originalDuration: number;
      time: string;
      duration: number;
    };

export interface SchedulesTabState {
  draft: SchedulesDraft;
  sub: SchedulesSubState;
}

// ─── Steering tab ──────────────────────────────────────────────────────────────

export type SteeringSubState = { kind: 'idle' } | { kind: 'confirm-phase'; pending: Phase };

export interface SteeringTabState {
  draft: Partial<IrrigationStrategy>;
  phase: Phase;
  sub: SteeringSubState;
}

// ─── Config tab ────────────────────────────────────────────────────────────────

export interface ConfigDraft {
  soilTriggerPercent: number | null;
  dailyVolumeCapLiters: number | null;
  maxCyclesPerDay: number | null;
  skipDuringDark: boolean;
  pauseOnLowTank: boolean;
  logToLogbook: boolean;
  autoAdvanceP1ToP2: boolean;
  autoAdvanceP2ToP3: boolean;
  haltOnRunoffEcThreshold: number | null;
}

export interface ConfigTabState {
  draft: ConfigDraft;
  sub: { kind: 'idle' };
}

// ─── Tanks tab (display only) ─────────────────────────────────────────────────

export interface TanksTabState {
  sub: { kind: 'idle' };
}

// ─── Water analytics tab ───────────────────────────────────────────────────────

export interface WaterAnalyticsTabState {
  stageAggregates: Record<string, number> | null;
  sub: { kind: 'idle' };
}

// ─── Drain EC tab ──────────────────────────────────────────────────────────────

export interface DrainEcDraft {
  enabled: boolean;
  maxEcDelta: number;
  targetRunoffPercent: number;
  logFeedEc: number;
  logDrainEc: number;
  logFeedVolume: number;
  logDrainVolume: number;
}

export type DrainEcSubState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'logging' };

export interface DrainEcTabState {
  draft: DrainEcDraft;
  sub: DrainEcSubState;
}

// ─── EC Targets tab ────────────────────────────────────────────────────────────

export interface EcTargetsTabState {
  draft: ECTargetRange[];
  sub: { kind: 'idle' };
}

// ─── EC Ramp tab ───────────────────────────────────────────────────────────────

/** EC Ramp changes save immediately per curve — no draft or sub-state needed. */
export type EcRampTabState = Record<string, never>;

// ─── Root SM ───────────────────────────────────────────────────────────────────

export interface TabStates {
  schedules: SchedulesTabState;
  steering: SteeringTabState;
  config: ConfigTabState;
  tanks: TanksTabState;
  water_analytics: WaterAnalyticsTabState;
  drain_ec: DrainEcTabState;
  ec_targets: EcTargetsTabState;
  ec_ramp: EcRampTabState;
}

/** Root-level overlays (not scoped to a tab). */
export type DialogStatus =
  | { kind: 'idle' }
  | { kind: 'confirm-discard'; pendingTab: TabId }
  | { kind: 'run-now-saving' };

export interface DialogSM {
  activeTab: TabId;
  tabs: TabStates;
  status: DialogStatus;
  toast: string | undefined;
}

// ─── Events ────────────────────────────────────────────────────────────────────

export type DialogEvent =
  // ── Navigation ──
  /**
   * Request a tab switch. If the active tab has unsaved changes the component
   * should pass this event; the SM enters `confirm-discard` state.
   * If the tab is clean, use SWITCH_TAB instead.
   */
  | { type: 'REQUEST_TAB'; tab: TabId }
  /** Direct tab switch — no dirty check. */
  | { type: 'SWITCH_TAB'; tab: TabId }
  /** User confirmed "discard changes" — reset active tab draft and switch. */
  | { type: 'DISCARD_AND_SWITCH' }
  /** User cancelled the discard prompt — stay on current tab. */
  | { type: 'CANCEL_TAB_SWITCH' }

  // ── Schedules ──
  | { type: 'BEGIN_ADD_IRRIGATION'; time: string; duration: number }
  | { type: 'BEGIN_ADD_DRAIN'; time: string; duration: number }
  | {
      type: 'BEGIN_EDIT_IRRIGATION';
      originalTime: string;
      originalDuration: number;
      time: string;
      duration: number;
    }
  | {
      type: 'BEGIN_EDIT_DRAIN';
      originalTime: string;
      originalDuration: number;
      time: string;
      duration: number;
    }
  | { type: 'CANCEL_INLINE' }
  | { type: 'UPDATE_ADD_IRRIGATION'; time?: string; duration?: number }
  | { type: 'UPDATE_ADD_DRAIN'; time?: string; duration?: number }
  | { type: 'UPDATE_EDIT_IRRIGATION'; time?: string; duration?: number }
  | { type: 'UPDATE_EDIT_DRAIN'; time?: string; duration?: number }
  | { type: 'UPDATE_SCHEDULES_DRAFT'; partial: Partial<SchedulesDraft> }

  // ── Steering ──
  | { type: 'REQUEST_PHASE_CHANGE'; phase: Phase }
  | { type: 'CONFIRM_PHASE_CHANGE' }
  | { type: 'CANCEL_PHASE_CHANGE' }
  | { type: 'UPDATE_STEERING_DRAFT'; partial: Partial<IrrigationStrategy> }

  // ── Config ──
  | { type: 'UPDATE_CONFIG_DRAFT'; partial: Partial<ConfigDraft> }

  // ── Drain EC ──
  | { type: 'UPDATE_DRAIN_EC_DRAFT'; partial: Partial<DrainEcDraft> }
  | { type: 'SET_DRAIN_SAVING'; saving: boolean }
  | { type: 'SET_DRAIN_LOGGING'; logging: boolean }

  // ── EC Targets ──
  | { type: 'UPDATE_EC_TARGETS_DRAFT'; ranges: ECTargetRange[] }

  // ── Global ──
  | { type: 'SET_TOAST'; message: string | undefined }
  | { type: 'SET_RUN_NOW_SAVING'; saving: boolean }
  | { type: 'SET_STAGE_AGGREGATES'; data: Record<string, number> | null }
  | { type: 'RESET_FROM_DEVICE'; device: GrowspaceDevice };

// ─── Initial state ──────────────────────────────────────────────────────────────

const EC_STAGES = ['seedling', 'veg', 'flower_early', 'flower_mid', 'flower_late'] as const;

function defaultSchedulesDraft(): SchedulesDraft {
  return {
    irrigationPumpEntity: '',
    drainPumpEntity: '',
    irrigationDuration: 60,
    drainDuration: 60,
  };
}

function defaultSteeringDraft(): Partial<IrrigationStrategy> {
  return {
    enabled: false,
    lightsOnTime: '06:00:00',
    p0DurationMinutes: 60,
    p2StopBeforeLightsOffMinutes: 120,
    targetVwcPercent: 45.0,
    maintenanceDrybackPercent: 3.0,
    shotDurationSeconds: 15,
    shotIntervalMinutes: 15,
    autoLightTracking: false,
    detectedLightsOnTime: null,
  };
}

function defaultConfigDraft(): ConfigDraft {
  return {
    soilTriggerPercent: null,
    dailyVolumeCapLiters: null,
    maxCyclesPerDay: null,
    skipDuringDark: false,
    pauseOnLowTank: true,
    logToLogbook: true,
    autoAdvanceP1ToP2: false,
    autoAdvanceP2ToP3: false,
    haltOnRunoffEcThreshold: null,
  };
}

function defaultDrainEcDraft(): DrainEcDraft {
  return {
    enabled: false,
    maxEcDelta: 1.0,
    targetRunoffPercent: 20,
    logFeedEc: 2.0,
    logDrainEc: 2.0,
    logFeedVolume: 0,
    logDrainVolume: 0,
  };
}

function defaultEcTargetsDraft(): ECTargetRange[] {
  return EC_STAGES.map((stage) => ({ stage, minEc: 0, maxEc: 0 }));
}

function defaultTabs(): TabStates {
  return {
    schedules: { draft: defaultSchedulesDraft(), sub: { kind: 'idle' } },
    steering: { draft: defaultSteeringDraft(), phase: 'p2', sub: { kind: 'idle' } },
    config: { draft: defaultConfigDraft(), sub: { kind: 'idle' } },
    tanks: { sub: { kind: 'idle' } },
    water_analytics: { stageAggregates: null, sub: { kind: 'idle' } },
    drain_ec: { draft: defaultDrainEcDraft(), sub: { kind: 'idle' } },
    ec_targets: { draft: defaultEcTargetsDraft(), sub: { kind: 'idle' } },
    ec_ramp: {},
  };
}

/** Create the initial SM state, optionally seeded from a device. */
export function createInitialSM(device?: GrowspaceDevice): DialogSM {
  const sm: DialogSM = {
    activeTab: 'schedules',
    tabs: defaultTabs(),
    status: { kind: 'idle' },
    toast: undefined,
  };
  if (device) {
    return applyDeviceToSM(sm, device);
  }
  return sm;
}

/** Rebuild tab drafts from device data (used on dialog open and after RESET_FROM_DEVICE). */
function applyDeviceToSM(sm: DialogSM, device: GrowspaceDevice): DialogSM {
  const config = device.irrigationConfig ?? {};
  const strat = device.irrigationStrategy;
  const dc = device.drainConfig;

  const schedulesDraft: SchedulesDraft = {
    irrigationPumpEntity: config.irrigationPumpEntity ?? '',
    drainPumpEntity: config.drainPumpEntity ?? '',
    irrigationDuration: config.irrigationDuration ?? 60,
    drainDuration: config.drainDuration ?? 60,
  };

  const steeringDraft: Partial<IrrigationStrategy> = {
    enabled: strat?.enabled ?? false,
    lightsOnTime: strat?.lightsOnTime ?? '06:00:00',
    p0DurationMinutes: strat?.p0DurationMinutes ?? 60,
    p2StopBeforeLightsOffMinutes: strat?.p2StopBeforeLightsOffMinutes ?? 120,
    targetVwcPercent: strat?.targetVwcPercent ?? 45.0,
    maintenanceDrybackPercent: strat?.maintenanceDrybackPercent ?? 3.0,
    shotDurationSeconds: strat?.shotDurationSeconds ?? 15,
    shotIntervalMinutes: strat?.shotIntervalMinutes ?? 15,
    autoLightTracking: strat?.autoLightTracking ?? false,
    detectedLightsOnTime: strat?.detectedLightsOnTime ?? null,
  };

  const configDraft: ConfigDraft = {
    soilTriggerPercent: config.soilTriggerPercent ?? null,
    dailyVolumeCapLiters: config.dailyVolumeCapLiters ?? null,
    maxCyclesPerDay: config.maxCyclesPerDay ?? null,
    skipDuringDark: config.skipDuringDark ?? false,
    pauseOnLowTank: config.pauseOnLowTank ?? true,
    logToLogbook: config.logToLogbook ?? true,
    autoAdvanceP1ToP2: config.autoAdvanceP1ToP2 ?? false,
    autoAdvanceP2ToP3: config.autoAdvanceP2ToP3 ?? false,
    haltOnRunoffEcThreshold: config.haltOnRunoffEcThreshold ?? null,
  };

  const drainEcDraft: DrainEcDraft = {
    enabled: dc?.enabled ?? false,
    maxEcDelta: dc?.maxEcDelta ?? 1.0,
    targetRunoffPercent: dc?.targetRunoffPercent ?? 20,
    logFeedEc: sm.tabs.drain_ec.draft.logFeedEc,
    logDrainEc: sm.tabs.drain_ec.draft.logDrainEc,
    logFeedVolume: sm.tabs.drain_ec.draft.logFeedVolume,
    logDrainVolume: sm.tabs.drain_ec.draft.logDrainVolume,
  };

  const ranges = config.ecTargetRanges;
  const ecTargetsDraft: ECTargetRange[] =
    ranges && ranges.length > 0
      ? EC_STAGES.map((stage) => {
          const found = ranges.find((r) => r.stage === stage);
          return found ?? { stage, minEc: 0, maxEc: 0 };
        })
      : defaultEcTargetsDraft();

  const phase: Phase = (config.activeSteeringPhase as Phase | undefined) ?? sm.tabs.steering.phase;

  return {
    ...sm,
    tabs: {
      ...sm.tabs,
      schedules: { ...sm.tabs.schedules, draft: schedulesDraft },
      steering: { ...sm.tabs.steering, draft: steeringDraft, phase },
      config: { ...sm.tabs.config, draft: configDraft },
      drain_ec: { ...sm.tabs.drain_ec, draft: drainEcDraft },
      ec_targets: { ...sm.tabs.ec_targets, draft: ecTargetsDraft },
    },
  };
}

// ─── Dirty predicates ───────────────────────────────────────────────────────────

/** True if the schedules tab has unsaved form changes relative to the device. */
export function isSchedulesDirty(sm: DialogSM, device: GrowspaceDevice): boolean {
  const d = sm.tabs.schedules.draft;
  const c = device.irrigationConfig ?? {};
  return (
    d.irrigationPumpEntity !== (c.irrigationPumpEntity ?? '') ||
    d.drainPumpEntity !== (c.drainPumpEntity ?? '') ||
    d.irrigationDuration !== (c.irrigationDuration ?? 60) ||
    d.drainDuration !== (c.drainDuration ?? 60)
  );
}

/** True if the steering tab has unsaved form changes relative to the device. */
export function isSteeringDirty(sm: DialogSM, device: GrowspaceDevice): boolean {
  const d = sm.tabs.steering.draft;
  const s = device.irrigationStrategy;
  if (!s) return false;
  return (
    d.enabled !== s.enabled ||
    d.lightsOnTime !== s.lightsOnTime ||
    d.p0DurationMinutes !== s.p0DurationMinutes ||
    d.p2StopBeforeLightsOffMinutes !== s.p2StopBeforeLightsOffMinutes ||
    d.targetVwcPercent !== s.targetVwcPercent ||
    d.maintenanceDrybackPercent !== s.maintenanceDrybackPercent ||
    d.shotDurationSeconds !== s.shotDurationSeconds ||
    d.shotIntervalMinutes !== s.shotIntervalMinutes ||
    (d.autoLightTracking ?? false) !== (s.autoLightTracking ?? false) ||
    (d.detectedLightsOnTime ?? null) !== (s.detectedLightsOnTime ?? null)
  );
}

/** True if the config tab has unsaved form changes relative to the device. */
export function isConfigDirty(sm: DialogSM, device: GrowspaceDevice): boolean {
  const d = sm.tabs.config.draft;
  const c = device.irrigationConfig ?? {};
  return (
    d.soilTriggerPercent !== (c.soilTriggerPercent ?? null) ||
    d.dailyVolumeCapLiters !== (c.dailyVolumeCapLiters ?? null) ||
    d.maxCyclesPerDay !== (c.maxCyclesPerDay ?? null) ||
    d.skipDuringDark !== (c.skipDuringDark ?? false) ||
    d.pauseOnLowTank !== (c.pauseOnLowTank ?? true) ||
    d.logToLogbook !== (c.logToLogbook ?? true) ||
    d.autoAdvanceP1ToP2 !== (c.autoAdvanceP1ToP2 ?? false) ||
    d.autoAdvanceP2ToP3 !== (c.autoAdvanceP2ToP3 ?? false) ||
    d.haltOnRunoffEcThreshold !== (c.haltOnRunoffEcThreshold ?? null)
  );
}

/** True if the drain_ec tab config portion has unsaved changes relative to the device. */
export function isDrainEcDirty(sm: DialogSM, device: GrowspaceDevice): boolean {
  const d = sm.tabs.drain_ec.draft;
  const dc = device.drainConfig;
  if (!dc) return false;
  return (
    d.enabled !== dc.enabled ||
    d.maxEcDelta !== dc.maxEcDelta ||
    d.targetRunoffPercent !== dc.targetRunoffPercent
  );
}

/** True if the ec_targets tab has unsaved changes relative to the device. */
export function isEcTargetsDirty(sm: DialogSM, device: GrowspaceDevice): boolean {
  const d = sm.tabs.ec_targets.draft;
  const ranges = device.irrigationConfig?.ecTargetRanges ?? [];
  // When the device has no ranges, the SM initialises with all-zero defaults.
  // It is only dirty if the user has changed at least one value away from zero.
  if (ranges.length === 0) {
    return d.some((r) => r.minEc !== 0 || r.maxEc !== 0);
  }
  if (d.length !== ranges.length) return true;
  return d.some((dr) => {
    const deviceRange = ranges.find((r) => r.stage === dr.stage);
    return !deviceRange || deviceRange.minEc !== dr.minEc || deviceRange.maxEc !== dr.maxEc;
  });
}

/**
 * Returns true if the currently-active tab has unsaved changes.
 * Pass this to decide between SWITCH_TAB and REQUEST_TAB.
 */
export function isActiveTabDirty(sm: DialogSM, device: GrowspaceDevice): boolean {
  switch (sm.activeTab) {
    case 'schedules':
      return isSchedulesDirty(sm, device);
    case 'steering':
      return isSteeringDirty(sm, device);
    case 'config':
      return isConfigDirty(sm, device);
    case 'drain_ec':
      return isDrainEcDirty(sm, device);
    case 'ec_targets':
      return isEcTargetsDirty(sm, device);
    default:
      return false;
  }
}

// ─── Draft reset helpers ───────────────────────────────────────────────────────

/** Reset the active tab's draft back to device state (used after DISCARD_AND_SWITCH). */
function resetActiveTabDraft(sm: DialogSM, device: GrowspaceDevice): TabStates {
  const config = device.irrigationConfig ?? {};
  const strat = device.irrigationStrategy;
  const dc = device.drainConfig;

  switch (sm.activeTab) {
    case 'schedules':
      return {
        ...sm.tabs,
        schedules: {
          draft: {
            irrigationPumpEntity: config.irrigationPumpEntity ?? '',
            drainPumpEntity: config.drainPumpEntity ?? '',
            irrigationDuration: config.irrigationDuration ?? 60,
            drainDuration: config.drainDuration ?? 60,
          },
          sub: { kind: 'idle' },
        },
      };
    case 'steering':
      return {
        ...sm.tabs,
        steering: {
          draft: {
            enabled: strat?.enabled ?? false,
            lightsOnTime: strat?.lightsOnTime ?? '06:00:00',
            p0DurationMinutes: strat?.p0DurationMinutes ?? 60,
            p2StopBeforeLightsOffMinutes: strat?.p2StopBeforeLightsOffMinutes ?? 120,
            targetVwcPercent: strat?.targetVwcPercent ?? 45.0,
            maintenanceDrybackPercent: strat?.maintenanceDrybackPercent ?? 3.0,
            shotDurationSeconds: strat?.shotDurationSeconds ?? 15,
            shotIntervalMinutes: strat?.shotIntervalMinutes ?? 15,
            autoLightTracking: strat?.autoLightTracking ?? false,
            detectedLightsOnTime: strat?.detectedLightsOnTime ?? null,
          },
          phase: sm.tabs.steering.phase,
          sub: { kind: 'idle' },
        },
      };
    case 'config':
      return {
        ...sm.tabs,
        config: {
          draft: {
            soilTriggerPercent: config.soilTriggerPercent ?? null,
            dailyVolumeCapLiters: config.dailyVolumeCapLiters ?? null,
            maxCyclesPerDay: config.maxCyclesPerDay ?? null,
            skipDuringDark: config.skipDuringDark ?? false,
            pauseOnLowTank: config.pauseOnLowTank ?? true,
            logToLogbook: config.logToLogbook ?? true,
            autoAdvanceP1ToP2: config.autoAdvanceP1ToP2 ?? false,
            autoAdvanceP2ToP3: config.autoAdvanceP2ToP3 ?? false,
            haltOnRunoffEcThreshold: config.haltOnRunoffEcThreshold ?? null,
          },
          sub: { kind: 'idle' },
        },
      };
    case 'drain_ec':
      return {
        ...sm.tabs,
        drain_ec: {
          draft: {
            enabled: dc?.enabled ?? false,
            maxEcDelta: dc?.maxEcDelta ?? 1.0,
            targetRunoffPercent: dc?.targetRunoffPercent ?? 20,
            logFeedEc: sm.tabs.drain_ec.draft.logFeedEc,
            logDrainEc: sm.tabs.drain_ec.draft.logDrainEc,
            logFeedVolume: sm.tabs.drain_ec.draft.logFeedVolume,
            logDrainVolume: sm.tabs.drain_ec.draft.logDrainVolume,
          },
          sub: { kind: 'idle' },
        },
      };
    case 'ec_targets': {
      const ranges = config.ecTargetRanges;
      return {
        ...sm.tabs,
        ec_targets: {
          draft:
            ranges && ranges.length > 0
              ? EC_STAGES.map((stage) => {
                  const found = ranges.find((r) => r.stage === stage);
                  return found ?? { stage, minEc: 0, maxEc: 0 };
                })
              : defaultEcTargetsDraft(),
          sub: { kind: 'idle' },
        },
      };
    }
    default:
      return sm.tabs;
  }
}

// ─── Transition function ────────────────────────────────────────────────────────

/** Pure state machine transition. Returns a new SM without mutating the input. */
export function transition(sm: DialogSM, event: DialogEvent): DialogSM {
  switch (event.type) {
    // ── Navigation ──────────────────────────────────────────────────────────

    case 'REQUEST_TAB':
      return {
        ...sm,
        status: { kind: 'confirm-discard', pendingTab: event.tab },
      };

    case 'SWITCH_TAB':
      return {
        ...sm,
        activeTab: event.tab,
        status: { kind: 'idle' },
        tabs: {
          ...sm.tabs,
          // Clear any inline editing state when leaving the current tab
          schedules:
            sm.activeTab === 'schedules'
              ? { ...sm.tabs.schedules, sub: { kind: 'idle' } }
              : sm.tabs.schedules,
        },
      };

    case 'DISCARD_AND_SWITCH': {
      if (sm.status.kind !== 'confirm-discard') return sm;
      const pendingTab = sm.status.pendingTab;
      // Need device to reset draft — caller must pass RESET_FROM_DEVICE first
      // or provide the device. For pure transition, we just switch the tab and
      // note: the component should call RESET_FROM_DEVICE immediately after.
      return {
        ...sm,
        activeTab: pendingTab,
        status: { kind: 'idle' },
        tabs: {
          ...sm.tabs,
          schedules: { ...sm.tabs.schedules, sub: { kind: 'idle' } },
        },
      };
    }

    case 'CANCEL_TAB_SWITCH':
      return {
        ...sm,
        status: { kind: 'idle' },
      };

    // ── Schedules ────────────────────────────────────────────────────────────

    case 'BEGIN_ADD_IRRIGATION':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          schedules: {
            ...sm.tabs.schedules,
            sub: { kind: 'adding-irrigation', time: event.time, duration: event.duration },
          },
        },
      };

    case 'BEGIN_ADD_DRAIN':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          schedules: {
            ...sm.tabs.schedules,
            sub: { kind: 'adding-drain', time: event.time, duration: event.duration },
          },
        },
      };

    case 'BEGIN_EDIT_IRRIGATION':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          schedules: {
            ...sm.tabs.schedules,
            sub: {
              kind: 'editing-irrigation',
              originalTime: event.originalTime,
              originalDuration: event.originalDuration,
              time: event.time,
              duration: event.duration,
            },
          },
        },
      };

    case 'BEGIN_EDIT_DRAIN':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          schedules: {
            ...sm.tabs.schedules,
            sub: {
              kind: 'editing-drain',
              originalTime: event.originalTime,
              originalDuration: event.originalDuration,
              time: event.time,
              duration: event.duration,
            },
          },
        },
      };

    case 'CANCEL_INLINE':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          schedules: { ...sm.tabs.schedules, sub: { kind: 'idle' } },
        },
      };

    case 'UPDATE_ADD_IRRIGATION': {
      const sub = sm.tabs.schedules.sub;
      if (sub.kind !== 'adding-irrigation') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          schedules: {
            ...sm.tabs.schedules,
            sub: {
              ...sub,
              ...(event.time !== undefined && { time: event.time }),
              ...(event.duration !== undefined && { duration: event.duration }),
            },
          },
        },
      };
    }

    case 'UPDATE_ADD_DRAIN': {
      const sub = sm.tabs.schedules.sub;
      if (sub.kind !== 'adding-drain') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          schedules: {
            ...sm.tabs.schedules,
            sub: {
              ...sub,
              ...(event.time !== undefined && { time: event.time }),
              ...(event.duration !== undefined && { duration: event.duration }),
            },
          },
        },
      };
    }

    case 'UPDATE_EDIT_IRRIGATION': {
      const sub = sm.tabs.schedules.sub;
      if (sub.kind !== 'editing-irrigation') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          schedules: {
            ...sm.tabs.schedules,
            sub: {
              ...sub,
              ...(event.time !== undefined && { time: event.time }),
              ...(event.duration !== undefined && { duration: event.duration }),
            },
          },
        },
      };
    }

    case 'UPDATE_EDIT_DRAIN': {
      const sub = sm.tabs.schedules.sub;
      if (sub.kind !== 'editing-drain') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          schedules: {
            ...sm.tabs.schedules,
            sub: {
              ...sub,
              ...(event.time !== undefined && { time: event.time }),
              ...(event.duration !== undefined && { duration: event.duration }),
            },
          },
        },
      };
    }

    case 'UPDATE_SCHEDULES_DRAFT':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          schedules: {
            ...sm.tabs.schedules,
            draft: { ...sm.tabs.schedules.draft, ...event.partial },
          },
        },
      };

    // ── Steering ─────────────────────────────────────────────────────────────

    case 'REQUEST_PHASE_CHANGE':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          steering: {
            ...sm.tabs.steering,
            sub: { kind: 'confirm-phase', pending: event.phase },
          },
        },
      };

    case 'CONFIRM_PHASE_CHANGE': {
      const sub = sm.tabs.steering.sub;
      if (sub.kind !== 'confirm-phase') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          steering: {
            ...sm.tabs.steering,
            phase: sub.pending,
            sub: { kind: 'idle' },
          },
        },
      };
    }

    case 'CANCEL_PHASE_CHANGE':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          steering: { ...sm.tabs.steering, sub: { kind: 'idle' } },
        },
      };

    case 'UPDATE_STEERING_DRAFT':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          steering: {
            ...sm.tabs.steering,
            draft: { ...sm.tabs.steering.draft, ...event.partial },
          },
        },
      };

    // ── Config ───────────────────────────────────────────────────────────────

    case 'UPDATE_CONFIG_DRAFT':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          config: {
            ...sm.tabs.config,
            draft: { ...sm.tabs.config.draft, ...event.partial },
          },
        },
      };

    // ── Drain EC ─────────────────────────────────────────────────────────────

    case 'UPDATE_DRAIN_EC_DRAFT':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          drain_ec: {
            ...sm.tabs.drain_ec,
            draft: { ...sm.tabs.drain_ec.draft, ...event.partial },
          },
        },
      };

    case 'SET_DRAIN_SAVING':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          drain_ec: {
            ...sm.tabs.drain_ec,
            sub: event.saving ? { kind: 'saving' } : { kind: 'idle' },
          },
        },
      };

    case 'SET_DRAIN_LOGGING':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          drain_ec: {
            ...sm.tabs.drain_ec,
            sub: event.logging ? { kind: 'logging' } : { kind: 'idle' },
          },
        },
      };

    // ── EC Targets ───────────────────────────────────────────────────────────

    case 'UPDATE_EC_TARGETS_DRAFT':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          ec_targets: {
            ...sm.tabs.ec_targets,
            draft: event.ranges,
          },
        },
      };

    // ── Global ───────────────────────────────────────────────────────────────

    case 'SET_TOAST':
      return { ...sm, toast: event.message };

    case 'SET_RUN_NOW_SAVING':
      return {
        ...sm,
        status: event.saving ? { kind: 'run-now-saving' } : { kind: 'idle' },
      };

    case 'SET_STAGE_AGGREGATES':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          water_analytics: {
            ...sm.tabs.water_analytics,
            stageAggregates: event.data,
          },
        },
      };

    case 'RESET_FROM_DEVICE':
      return applyDeviceToSM(sm, event.device);

    default:
      return sm;
  }
}

/**
 * Transition to a new tab with dirty-state handling baked in.
 * Returns the new SM state. The component can use this helper instead of
 * checking `isActiveTabDirty` and dispatching different events manually.
 */
export function requestTabSwitch(sm: DialogSM, tab: TabId, device: GrowspaceDevice): DialogSM {
  if (sm.activeTab === tab) return sm;
  if (isActiveTabDirty(sm, device)) {
    return transition(sm, { type: 'REQUEST_TAB', tab });
  }
  return transition(sm, { type: 'SWITCH_TAB', tab });
}

/**
 * Discard the active tab's draft (reset to device state) and switch to the pending tab.
 * Convenience wrapper that handles the two-step: reset draft + switch.
 */
export function discardAndSwitch(sm: DialogSM, device: GrowspaceDevice): DialogSM {
  if (sm.status.kind !== 'confirm-discard') return sm;
  const tabs = resetActiveTabDraft(sm, device);
  return {
    ...sm,
    activeTab: sm.status.pendingTab,
    status: { kind: 'idle' },
    tabs,
  };
}
