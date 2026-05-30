/**
 * Config Dialog State Machine
 *
 * Pure module — no Lit, no DOM. All interaction state for ConfigDialog lives here.
 * The component calls `transition(sm, event)` and replaces its single `@state() _sm`.
 *
 * Structure:
 *   ConfigDialogSM
 *     .activeTab          — which tab is visible
 *     .status             — root-level tab-switch confirm overlay
 *     .toast              — transient message
 *     .environmentDraft   — shared draft for sensors/climate/humidity/irrigation/vision tabs
 *     .tabs               — per-tab sub-state
 */

import type { DialogStateMachine } from './dialog-sm';
import type { GrowspaceDevice, SensorGroup } from '../types';
import type { Subarea } from '../slices/subarea/schema';

// ─── Tab ID ───────────────────────────────────────────────────────────────────

export type ConfigTabId =
  | 'growspaces'
  | 'sensors'
  | 'climate'
  | 'humidity'
  | 'irrigation'
  | 'tanks'
  | 'vision'
  | 'heatmap'
  | 'subareas';

// ─── Environment Draft ────────────────────────────────────────────────────────

export interface EnvironmentDraft {
  selectedGrowspaceId: string;

  // Air sensors
  temperatureSensors: string[];
  humiditySensors: string[];
  vpdSensors: string[];
  co2Sensor: string;
  lightSensors: string[];

  // Climate devices
  exhaustFanEntities: string[];
  circulationFanEntities: string[];
  stressThreshold: number;
  moldThreshold: number;

  // Humidity devices
  humidifierEntities: string[];
  dehumidifierEntities: string[];
  humidifierControlEnabled: boolean;
  humidifierThresholds: Record<string, Record<string, { on: number; off: number }>>;
  dehumidifierThresholds: Record<string, Record<string, { on: number; off: number }>>;

  // Substrate / irrigation monitoring sensors
  soilMoistureSensor: string;
  substrateTemperatureSensors: string[];
  phSensors: string[];
  feedEcSensors: string[];
  substrateEcSensors: string[];
  runoffEcSensors: string[];
  drainVolumeSensors: string[];
  irrigationFlowSensors: string[];
  powerSensors: string[];
  energySensors: string[];

  // Heatmap / spatial
  sensorGroups: SensorGroup[];
  sensorCoordinates: Record<string, { x: number; y: number; z: number; rotation?: number }>;

  // Tanks
  irrigationTanks: Array<{
    sensorEntity: string;
    name: string;
    volumeLiters: number | null;
    warningLevel: number;
  }>;

  // Camera / lungroom
  cameraEntities: string[];
  lungroomTempSensors: string[];

  // Vision checkup
  visionEnabled: boolean;
  visionEarlyOffset: number;
  visionMidHours: number;
  visionLateOffset: number;
}

// ─── Growspaces tab ───────────────────────────────────────────────────────────

export type GrowspacesSubState =
  | { kind: 'idle' }
  | {
      kind: 'adding';
      name: string;
      rows: number;
      plantsPerRow: number;
      notificationService: string;
    }
  | {
      kind: 'editing';
      growspaceId: string;
      name: string;
      rows: number;
      plantsPerRow: number;
      notificationService: string;
    }
  | { kind: 'confirm-delete'; growspaceId: string; name: string };

export interface GrowspacesTabState {
  sub: GrowspacesSubState;
}

// ─── Env-group tabs (sensors / climate / humidity / irrigation / vision) ──────
// These tabs share environmentDraft at the SM root — their per-tab state is minimal.

export interface EnvTabState {
  sub: { kind: 'idle' };
}

// ─── Tanks tab ────────────────────────────────────────────────────────────────

export type TankDraftFields = {
  sensorEntity: string;
  name: string;
  volumeLiters: number | null;
  warningLevel: number;
};

export type TanksSubState =
  | { kind: 'idle' }
  | ({ kind: 'adding' } & TankDraftFields)
  | ({ kind: 'editing'; index: number } & TankDraftFields);

export interface TanksTabState {
  sub: TanksSubState;
}

// ─── Heatmap tab ─────────────────────────────────────────────────────────────

export type HeatmapSubState = { kind: 'idle' } | { kind: 'editing-group'; group?: SensorGroup };

export interface HeatmapTabState {
  sub: HeatmapSubState;
}

// ─── Subareas tab ─────────────────────────────────────────────────────────────

export type SubareasSubState =
  | { kind: 'idle' }
  | { kind: 'adding'; name: string }
  | { kind: 'confirm-delete'; subareaId: string }
  | { kind: 'editing-subarea'; subarea: Subarea };

export interface SubareasTabState {
  sub: SubareasSubState;
}

// ─── Root SM ──────────────────────────────────────────────────────────────────

export interface ConfigTabStates {
  growspaces: GrowspacesTabState;
  sensors: EnvTabState;
  climate: EnvTabState;
  humidity: EnvTabState;
  irrigation: EnvTabState;
  tanks: TanksTabState;
  vision: EnvTabState;
  heatmap: HeatmapTabState;
  subareas: SubareasTabState;
}

export interface ConfigDialogSM
  extends DialogStateMachine<ConfigTabId, ConfigTabStates> {
  environmentDraft: EnvironmentDraft;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export type ConfigDialogEvent =
  // ── Navigation ──
  | { type: 'REQUEST_TAB'; tab: ConfigTabId }
  | { type: 'SWITCH_TAB'; tab: ConfigTabId }
  | { type: 'DISCARD_AND_SWITCH' }
  | { type: 'CANCEL_TAB_SWITCH' }

  // ── Growspaces ──
  | { type: 'START_ADD_GROWSPACE' }
  | {
      type: 'UPDATE_ADD_DRAFT';
      partial: Partial<{
        name: string;
        rows: number;
        plantsPerRow: number;
        notificationService: string;
      }>;
    }
  | { type: 'SELECT_GROWSPACE'; growspaceId: string; name: string; rows: number; plantsPerRow: number; notificationService: string }
  | {
      type: 'UPDATE_EDIT_DRAFT';
      partial: Partial<{
        name: string;
        rows: number;
        plantsPerRow: number;
        notificationService: string;
      }>;
    }
  | { type: 'REQUEST_DELETE_GROWSPACE'; growspaceId: string; name: string }
  | { type: 'CANCEL_GROWSPACES' }

  // ── Environment (shared across env-group tabs) ──
  | { type: 'UPDATE_ENV_DRAFT'; partial: Partial<EnvironmentDraft> }

  // ── Tanks ──
  | { type: 'BEGIN_ADD_TANK' }
  | { type: 'BEGIN_EDIT_TANK'; index: number; sensorEntity: string; name: string; volumeLiters: number | null; warningLevel: number }
  | { type: 'UPDATE_TANK_DRAFT'; partial: Partial<TankDraftFields> }
  | { type: 'CANCEL_TANK' }
  | { type: 'COMMIT_TANK' }

  // ── Heatmap / sensor groups ──
  | { type: 'BEGIN_EDIT_GROUP'; group?: SensorGroup }
  | { type: 'CLOSE_GROUP_DIALOG' }

  // ── Subareas ──
  | { type: 'BEGIN_ADD_SUBAREA' }
  | { type: 'UPDATE_SUBAREA_NAME'; name: string }
  | { type: 'CANCEL_SUBAREA' }
  | { type: 'REQUEST_DELETE_SUBAREA'; subareaId: string }
  | { type: 'CANCEL_DELETE_SUBAREA' }
  | { type: 'BEGIN_EDIT_SUBAREA'; subarea: Subarea }
  | { type: 'CLOSE_SUBAREA_DIALOG' }

  // ── Global ──
  | { type: 'SET_TOAST'; message: string | undefined }
  | { type: 'RESET_FROM_DEVICE'; device: GrowspaceDevice };

// ─── Default draft ────────────────────────────────────────────────────────────

function defaultEnvironmentDraft(): EnvironmentDraft {
  return {
    selectedGrowspaceId: '',
    temperatureSensors: [],
    humiditySensors: [],
    vpdSensors: [],
    co2Sensor: '',
    lightSensors: [],
    exhaustFanEntities: [],
    circulationFanEntities: [],
    stressThreshold: 0.8,
    moldThreshold: 0.8,
    humidifierEntities: [],
    dehumidifierEntities: [],
    humidifierControlEnabled: false,
    humidifierThresholds: {},
    dehumidifierThresholds: {},
    soilMoistureSensor: '',
    substrateTemperatureSensors: [],
    phSensors: [],
    feedEcSensors: [],
    substrateEcSensors: [],
    runoffEcSensors: [],
    drainVolumeSensors: [],
    irrigationFlowSensors: [],
    powerSensors: [],
    energySensors: [],
    sensorGroups: [],
    sensorCoordinates: {},
    irrigationTanks: [],
    cameraEntities: [],
    lungroomTempSensors: [],
    visionEnabled: false,
    visionEarlyOffset: 60,
    visionMidHours: 6,
    visionLateOffset: 60,
  };
}

function defaultTabs(): ConfigTabStates {
  return {
    growspaces: { sub: { kind: 'idle' } },
    sensors: { sub: { kind: 'idle' } },
    climate: { sub: { kind: 'idle' } },
    humidity: { sub: { kind: 'idle' } },
    irrigation: { sub: { kind: 'idle' } },
    tanks: { sub: { kind: 'idle' } },
    vision: { sub: { kind: 'idle' } },
    heatmap: { sub: { kind: 'idle' } },
    subareas: { sub: { kind: 'idle' } },
  };
}

/** Seed EnvironmentDraft from a GrowspaceDevice. */
function envDraftFromDevice(device: GrowspaceDevice): EnvironmentDraft {
  const attrs = device.environmentAttributes ?? {};
  const vc = attrs.visionCheckupConfig;
  return {
    selectedGrowspaceId: device.deviceId,
    temperatureSensors: attrs.temperatureSensors?.length
      ? attrs.temperatureSensors
      : attrs.temperatureSensor
        ? [attrs.temperatureSensor]
        : [],
    humiditySensors: attrs.humiditySensors?.length
      ? attrs.humiditySensors
      : attrs.humiditySensor
        ? [attrs.humiditySensor]
        : [],
    vpdSensors: attrs.vpdSensors?.length
      ? attrs.vpdSensors
      : attrs.vpdSensor
        ? [attrs.vpdSensor]
        : [],
    co2Sensor: attrs.co2Sensor ?? '',
    lightSensors: attrs.lightSensors?.length
      ? attrs.lightSensors
      : attrs.lightSensor
        ? [attrs.lightSensor]
        : [],
    exhaustFanEntities: attrs.exhaustFanEntities?.length
      ? attrs.exhaustFanEntities
      : attrs.exhaustEntity
        ? [attrs.exhaustEntity]
        : [],
    circulationFanEntities: attrs.circulationFanEntities?.length
      ? attrs.circulationFanEntities
      : attrs.circulationFanEntity
        ? [attrs.circulationFanEntity]
        : [],
    stressThreshold: 0.8,
    moldThreshold: 0.8,
    humidifierEntities: attrs.humidifierEntities?.length
      ? attrs.humidifierEntities
      : attrs.humidifierEntity
        ? [attrs.humidifierEntity]
        : [],
    dehumidifierEntities: attrs.dehumidifierEntities?.length
      ? attrs.dehumidifierEntities
      : attrs.dehumidifierEntity
        ? [attrs.dehumidifierEntity]
        : [],
    humidifierControlEnabled: attrs.humidifierControlEnabled ?? false,
    humidifierThresholds: attrs.humidifierThresholds ?? {},
    dehumidifierThresholds: attrs.dehumidifierThresholds ?? {},
    soilMoistureSensor: attrs.soilMoistureSensor ?? '',
    substrateTemperatureSensors: attrs.substrateTemperatureSensors ?? [],
    phSensors: attrs.phSensors ?? [],
    feedEcSensors: attrs.feedEcSensors ?? [],
    substrateEcSensors: attrs.substrateEcSensors ?? [],
    runoffEcSensors: attrs.runoffEcSensors ?? [],
    drainVolumeSensors: attrs.drainVolumeSensors ?? [],
    irrigationFlowSensors: attrs.irrigationFlowSensors ?? [],
    powerSensors: attrs.powerSensors ?? [],
    energySensors: attrs.energySensors ?? [],
    sensorGroups: attrs.sensorGroups ?? [],
    sensorCoordinates: attrs.sensorCoordinates ?? {},
    irrigationTanks: (attrs.irrigationTanks ?? []).map((t: any) => ({
      sensorEntity: t.sensorEntity ?? '',
      name: t.name ?? 'Tank',
      volumeLiters: t.volumeLiters ?? null,
      warningLevel: t.warningLevel ?? 30,
    })),
    cameraEntities: attrs.cameraEntities ?? [],
    lungroomTempSensors: attrs.lungroomTempSensors ?? [],
    visionEnabled: vc?.enabled ?? false,
    visionEarlyOffset: vc?.early_check_offset_minutes ?? 60,
    visionMidHours: vc?.mid_check_hours ?? 6,
    visionLateOffset: vc?.late_check_offset_minutes ?? 60,
  };
}

/** Create the initial SM state, optionally seeded from a device. */
export function createInitialSM(device?: GrowspaceDevice): ConfigDialogSM {
  const sm: ConfigDialogSM = {
    activeTab: 'sensors',
    tabs: defaultTabs(),
    status: { kind: 'idle' },
    toast: undefined,
    environmentDraft: defaultEnvironmentDraft(),
  };
  if (device) {
    return applyDeviceToSM(sm, device);
  }
  return sm;
}

/** Rebuild environmentDraft from device data (used on open and after RESET_FROM_DEVICE). */
function applyDeviceToSM(sm: ConfigDialogSM, device: GrowspaceDevice): ConfigDialogSM {
  return { ...sm, environmentDraft: envDraftFromDevice(device) };
}

// ─── Dirty predicates ─────────────────────────────────────────────────────────

/** True if the growspaces tab has unsaved in-progress changes. */
export function isGrowspacesDirty(sm: ConfigDialogSM, device: GrowspaceDevice): boolean {
  const sub = sm.tabs.growspaces.sub;
  if (sub.kind === 'adding') {
    return sub.name.trim() !== '' || sub.rows !== 4 || sub.plantsPerRow !== 4;
  }
  if (sub.kind === 'editing') {
    return (
      sub.name !== (device.name ?? '') ||
      sub.rows !== (device.rows ?? 4) ||
      sub.plantsPerRow !== (device.plantsPerRow ?? 4) ||
      sub.notificationService !== (device.notificationTarget ?? '')
    );
  }
  return false;
}

/**
 * Returns true if the currently-active tab has unsaved changes.
 * Only the growspaces tab has dirty-guarded navigation.
 */
export function isActiveTabDirty(sm: ConfigDialogSM, device: GrowspaceDevice): boolean {
  if (sm.activeTab === 'growspaces') {
    return isGrowspacesDirty(sm, device);
  }
  return false;
}

// ─── Transition helpers ───────────────────────────────────────────────────────

/**
 * Request a tab switch with dirty-state handling.
 * Automatically dispatches REQUEST_TAB or SWITCH_TAB based on dirty state.
 */
export function requestTabSwitch(
  sm: ConfigDialogSM,
  tab: ConfigTabId,
  device: GrowspaceDevice
): ConfigDialogSM {
  if (sm.activeTab === tab) return sm;
  if (isActiveTabDirty(sm, device)) {
    return transition(sm, { type: 'REQUEST_TAB', tab });
  }
  return transition(sm, { type: 'SWITCH_TAB', tab });
}

/**
 * Discard the active tab's draft and switch to the pending tab.
 */
export function discardAndSwitch(sm: ConfigDialogSM, device: GrowspaceDevice): ConfigDialogSM {
  if (sm.status.kind !== 'confirm-discard') return sm;
  const pendingTab = sm.status.pendingTab;
  return {
    ...sm,
    activeTab: pendingTab,
    status: { kind: 'idle' },
    tabs: {
      ...sm.tabs,
      growspaces: { sub: { kind: 'idle' } },
    },
  };
}

// ─── Transition function ──────────────────────────────────────────────────────

/** Pure state machine transition. Returns a new SM without mutating the input. */
export function transition(sm: ConfigDialogSM, event: ConfigDialogEvent): ConfigDialogSM {
  switch (event.type) {
    // ── Navigation ────────────────────────────────────────────────────────────

    case 'REQUEST_TAB':
      return { ...sm, status: { kind: 'confirm-discard', pendingTab: event.tab } };

    case 'SWITCH_TAB':
      return { ...sm, activeTab: event.tab, status: { kind: 'idle' } };

    case 'DISCARD_AND_SWITCH': {
      if (sm.status.kind !== 'confirm-discard') return sm;
      return {
        ...sm,
        activeTab: sm.status.pendingTab,
        status: { kind: 'idle' },
        tabs: { ...sm.tabs, growspaces: { sub: { kind: 'idle' } } },
      };
    }

    case 'CANCEL_TAB_SWITCH':
      return { ...sm, status: { kind: 'idle' } };

    // ── Growspaces ────────────────────────────────────────────────────────────

    case 'START_ADD_GROWSPACE':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          growspaces: {
            sub: { kind: 'adding', name: '', rows: 4, plantsPerRow: 4, notificationService: '' },
          },
        },
      };

    case 'UPDATE_ADD_DRAFT': {
      const sub = sm.tabs.growspaces.sub;
      if (sub.kind !== 'adding') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          growspaces: { sub: { ...sub, ...event.partial } },
        },
      };
    }

    case 'SELECT_GROWSPACE':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          growspaces: {
            sub: {
              kind: 'editing',
              growspaceId: event.growspaceId,
              name: event.name,
              rows: event.rows,
              plantsPerRow: event.plantsPerRow,
              notificationService: event.notificationService,
            },
          },
        },
      };

    case 'UPDATE_EDIT_DRAFT': {
      const sub = sm.tabs.growspaces.sub;
      if (sub.kind !== 'editing') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          growspaces: { sub: { ...sub, ...event.partial } },
        },
      };
    }

    case 'REQUEST_DELETE_GROWSPACE':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          growspaces: {
            sub: { kind: 'confirm-delete', growspaceId: event.growspaceId, name: event.name },
          },
        },
      };

    case 'CANCEL_GROWSPACES':
      return {
        ...sm,
        tabs: { ...sm.tabs, growspaces: { sub: { kind: 'idle' } } },
      };

    // ── Environment ───────────────────────────────────────────────────────────

    case 'UPDATE_ENV_DRAFT':
      return {
        ...sm,
        environmentDraft: { ...sm.environmentDraft, ...event.partial },
      };

    // ── Tanks ─────────────────────────────────────────────────────────────────

    case 'BEGIN_ADD_TANK':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          tanks: {
            sub: { kind: 'adding', sensorEntity: '', name: '', volumeLiters: null, warningLevel: 30 },
          },
        },
      };

    case 'BEGIN_EDIT_TANK':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          tanks: {
            sub: {
              kind: 'editing',
              index: event.index,
              sensorEntity: event.sensorEntity,
              name: event.name,
              volumeLiters: event.volumeLiters,
              warningLevel: event.warningLevel,
            },
          },
        },
      };

    case 'UPDATE_TANK_DRAFT': {
      const sub = sm.tabs.tanks.sub;
      if (sub.kind !== 'adding' && sub.kind !== 'editing') return sm;
      return {
        ...sm,
        tabs: { ...sm.tabs, tanks: { sub: { ...sub, ...event.partial } } },
      };
    }

    case 'CANCEL_TANK':
      return { ...sm, tabs: { ...sm.tabs, tanks: { sub: { kind: 'idle' } } } };

    case 'COMMIT_TANK': {
      const sub = sm.tabs.tanks.sub;
      if (sub.kind !== 'adding' && sub.kind !== 'editing') return sm;
      const tank = {
        sensorEntity: sub.sensorEntity,
        name: sub.name || 'Tank',
        volumeLiters: sub.volumeLiters,
        warningLevel: sub.warningLevel,
      };
      const existing = sm.environmentDraft.irrigationTanks;
      const updatedTanks =
        sub.kind === 'editing'
          ? existing.map((t, i) => (i === sub.index ? tank : t))
          : [...existing, tank];
      return {
        ...sm,
        environmentDraft: { ...sm.environmentDraft, irrigationTanks: updatedTanks },
        tabs: { ...sm.tabs, tanks: { sub: { kind: 'idle' } } },
      };
    }

    // ── Heatmap / sensor groups ───────────────────────────────────────────────

    case 'BEGIN_EDIT_GROUP':
      return {
        ...sm,
        tabs: { ...sm.tabs, heatmap: { sub: { kind: 'editing-group', group: event.group } } },
      };

    case 'CLOSE_GROUP_DIALOG':
      return { ...sm, tabs: { ...sm.tabs, heatmap: { sub: { kind: 'idle' } } } };

    // ── Subareas ──────────────────────────────────────────────────────────────

    case 'BEGIN_ADD_SUBAREA':
      return {
        ...sm,
        tabs: { ...sm.tabs, subareas: { sub: { kind: 'adding', name: '' } } },
      };

    case 'UPDATE_SUBAREA_NAME': {
      const sub = sm.tabs.subareas.sub;
      if (sub.kind !== 'adding') return sm;
      return {
        ...sm,
        tabs: { ...sm.tabs, subareas: { sub: { ...sub, name: event.name } } },
      };
    }

    case 'CANCEL_SUBAREA':
      return { ...sm, tabs: { ...sm.tabs, subareas: { sub: { kind: 'idle' } } } };

    case 'REQUEST_DELETE_SUBAREA':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          subareas: { sub: { kind: 'confirm-delete', subareaId: event.subareaId } },
        },
      };

    case 'CANCEL_DELETE_SUBAREA':
      return { ...sm, tabs: { ...sm.tabs, subareas: { sub: { kind: 'idle' } } } };

    case 'BEGIN_EDIT_SUBAREA':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          subareas: { sub: { kind: 'editing-subarea', subarea: event.subarea } },
        },
      };

    case 'CLOSE_SUBAREA_DIALOG':
      return { ...sm, tabs: { ...sm.tabs, subareas: { sub: { kind: 'idle' } } } };

    // ── Global ────────────────────────────────────────────────────────────────

    case 'SET_TOAST':
      return { ...sm, toast: event.message };

    case 'RESET_FROM_DEVICE':
      return applyDeviceToSM(sm, event.device);

    default:
      return sm;
  }
}
