/**
 * Unit tests for the Config Dialog State Machine.
 *
 * Pure transition functions only — no DOM, no Lit.
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialSM,
  transition,
  requestTabSwitch,
  discardAndSwitch,
  isGrowspacesDirty,
  isActiveTabDirty,
  isNotificationsDirty,
  type ConfigDialogSM,
} from './config-dialog-sm';
import { createGrowspaceDevice } from '../services/types';
import type { CirculationFanConfig, ExhaustFanConfig } from '../slices/growspace/schema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDevice(overrides: Partial<Parameters<typeof createGrowspaceDevice>[0]> = {}) {
  return createGrowspaceDevice({ deviceId: 'gs1', name: 'Tent 1', rows: 4, plantsPerRow: 4, ...overrides });
}

function makeSubarea() {
  return {
    id: 'sa1',
    name: 'North Side',
    environment_config: {
      temperature_sensors: [],
      humidity_sensors: [],
      vpd_sensors: [],
      light_sensors: [],
      exhaust_fan_entities: [],
      circulation_fan_entities: [],
      humidifier_entities: [],
      dehumidifier_entities: [],
    },
  };
}

// ─── createInitialSM ─────────────────────────────────────────────────────────

describe('createInitialSM', () => {
  it('defaults to sensors tab', () => {
    const sm = createInitialSM();
    expect(sm.activeTab).toBe('sensors');
  });

  it('starts with idle status', () => {
    const sm = createInitialSM();
    expect(sm.status.kind).toBe('idle');
  });

  it('starts with no toast', () => {
    const sm = createInitialSM();
    expect(sm.toast).toBeUndefined();
  });

  it('starts with all tabs in idle sub-state', () => {
    const sm = createInitialSM();
    expect(sm.tabs.growspaces.sub.kind).toBe('idle');
    expect(sm.tabs.notifications.sub.kind).toBe('idle');
    expect(sm.tabs.sensors.sub.kind).toBe('idle');
    expect(sm.tabs.climate.sub.kind).toBe('idle');
    expect(sm.tabs.humidity.sub.kind).toBe('idle');
    expect(sm.tabs.irrigation.sub.kind).toBe('idle');
    expect(sm.tabs.tanks.sub.kind).toBe('idle');
    expect(sm.tabs.vision.sub.kind).toBe('idle');
    expect(sm.tabs.heatmap.sub.kind).toBe('idle');
    expect(sm.tabs.subareas.sub.kind).toBe('idle');
  });

  it('starts notifications tab with default draft values', () => {
    const sm = createInitialSM();
    expect(sm.tabs.notifications.draft.criticalCooldownMinutes).toBe(60);
    expect(sm.tabs.notifications.draft.aiAutoAlerts).toBe(true);
    expect(sm.tabs.notifications.timedNotifications).toEqual([]);
  });

  it('starts with empty environment draft', () => {
    const sm = createInitialSM();
    expect(sm.environmentDraft.temperatureSensors).toEqual([]);
    expect(sm.environmentDraft.selectedGrowspaceId).toBe('');
    expect(sm.environmentDraft.stressThreshold).toBe(0.8);
  });

  it('does not include dehumidifierControlEnabled in the environment draft', () => {
    const sm = createInitialSM();
    expect('dehumidifierControlEnabled' in sm.environmentDraft).toBe(false);
  });

  it('does not seed dehumidifierControlEnabled from device attributes', () => {
    const device = makeDevice({
      environmentAttributes: { dehumidifierControlEnabled: true },
    });
    const sm = createInitialSM(device);
    expect('dehumidifierControlEnabled' in sm.environmentDraft).toBe(false);
  });

  it('seeds environment draft from device', () => {
    const device = makeDevice({
      environmentAttributes: {
        temperatureSensors: ['sensor.temp1'],
        humiditySensors: ['sensor.hum1'],
      },
    });
    const sm = createInitialSM(device);
    expect(sm.environmentDraft.temperatureSensors).toEqual(['sensor.temp1']);
    expect(sm.environmentDraft.humiditySensors).toEqual(['sensor.hum1']);
    expect(sm.environmentDraft.selectedGrowspaceId).toBe('gs1');
  });

  it('normalises legacy single-sensor fields to arrays when seeding from device', () => {
    const device = makeDevice({
      environmentAttributes: {
        temperatureSensor: 'sensor.old_temp',
      },
    });
    const sm = createInitialSM(device);
    expect(sm.environmentDraft.temperatureSensors).toEqual(['sensor.old_temp']);
  });

  it('seeds vision checkup config from device', () => {
    const device = makeDevice({
      environmentAttributes: {
        visionCheckupConfig: {
          enabled: true,
          early_check_offset_minutes: 30,
          mid_check_hours: 4,
          late_check_offset_minutes: 45,
        },
      },
    });
    const sm = createInitialSM(device);
    expect(sm.environmentDraft.visionEnabled).toBe(true);
    expect(sm.environmentDraft.visionEarlyOffset).toBe(30);
    expect(sm.environmentDraft.visionMidHours).toBe(4);
    expect(sm.environmentDraft.visionLateOffset).toBe(45);
  });

  it('seeds vpdOptimalOverrides from device environment attributes', () => {
    const overrides = {
      veg: { day: { low: 0.8, high: 1.2 }, night: { low: 0.6, high: 1.0 } },
    };
    const device = makeDevice({
      environmentAttributes: { vpdOptimalOverrides: overrides } as any,
    });
    const sm = createInitialSM(device);
    expect(sm.environmentDraft.vpdOptimalOverrides).toEqual(overrides);
  });

  it('defaults vpdOptimalOverrides to empty object when absent from device', () => {
    const device = makeDevice({ environmentAttributes: {} });
    const sm = createInitialSM(device);
    expect(sm.environmentDraft.vpdOptimalOverrides).toEqual({});
  });
});

// ─── Notifications tab seeding ────────────────────────────────────────────────

describe('notifications tab seeding', () => {
  it('seeds global notification settings from device', () => {
    const device = makeDevice({
      notificationSettings: {
        criticalCooldownMinutes: 90,
        warningCooldownMinutes: 45,
        aiAutoAlerts: false,
      },
    });
    const sm = createInitialSM(device);
    expect(sm.tabs.notifications.draft.criticalCooldownMinutes).toBe(90);
    expect(sm.tabs.notifications.draft.warningCooldownMinutes).toBe(45);
    expect(sm.tabs.notifications.draft.aiAutoAlerts).toBe(false);
  });

  it('falls back to defaults for missing notification settings fields', () => {
    const device = makeDevice({ notificationSettings: { criticalCooldownMinutes: 120 } });
    const sm = createInitialSM(device);
    expect(sm.tabs.notifications.draft.criticalCooldownMinutes).toBe(120);
    expect(sm.tabs.notifications.draft.warningCooldownMinutes).toBe(30);
    expect(sm.tabs.notifications.draft.aiAutoAlerts).toBe(true);
  });

  it('seeds timed notifications list from device', () => {
    const notification = {
      id: 'n1',
      message: 'Check roots',
      triggerType: 'clone' as const,
      day: 7,
      growspaceIds: ['gs1'],
    };
    const device = makeDevice({ timedNotifications: [notification] });
    const sm = createInitialSM(device);
    expect(sm.tabs.notifications.timedNotifications).toEqual([notification]);
  });

  it('seeds an unrecognised trigger through to the tab state unchanged', () => {
    const notification = {
      id: 'n1',
      message: 'Check roots',
      triggerType: { raw: 'days_since_germination' },
      day: 7,
      growspaceIds: ['gs1'],
    };
    const device = makeDevice({ timedNotifications: [notification] });
    const sm = createInitialSM(device);
    expect(sm.tabs.notifications.timedNotifications).toEqual([notification]);
  });

  it('defaults to empty timed notifications when device has none', () => {
    const sm = createInitialSM(makeDevice());
    expect(sm.tabs.notifications.timedNotifications).toEqual([]);
  });
});

// ─── UPDATE_NOTIFICATIONS_DRAFT ──────────────────────────────────────────────

describe('UPDATE_NOTIFICATIONS_DRAFT', () => {
  it('patches the global notifications draft', () => {
    const sm = createInitialSM();
    const next = transition(sm, {
      type: 'UPDATE_NOTIFICATIONS_DRAFT',
      partial: { criticalCooldownMinutes: 120, aiAutoAlerts: false },
    });
    expect(next.tabs.notifications.draft.criticalCooldownMinutes).toBe(120);
    expect(next.tabs.notifications.draft.aiAutoAlerts).toBe(false);
    expect(next.tabs.notifications.draft.warningCooldownMinutes).toBe(30);
  });
});

// ─── isNotificationsDirty ────────────────────────────────────────────────────

describe('isNotificationsDirty', () => {
  it('returns false when draft matches device and no timed notifications changed', () => {
    const device = makeDevice({
      notificationSettings: { criticalCooldownMinutes: 90 },
      timedNotifications: [],
    });
    const sm = createInitialSM(device);
    expect(isNotificationsDirty(sm, device)).toBe(false);
  });

  it('returns true when a global draft field differs from device', () => {
    const device = makeDevice({ notificationSettings: { criticalCooldownMinutes: 60 } });
    const sm = createInitialSM(device);
    const dirty = transition(sm, {
      type: 'UPDATE_NOTIFICATIONS_DRAFT',
      partial: { criticalCooldownMinutes: 90 },
    });
    expect(isNotificationsDirty(dirty, device)).toBe(true);
  });

  it('returns true when timed notifications list differs from device', () => {
    const device = makeDevice({ timedNotifications: [] });
    const sm = createInitialSM(device);
    // no adding sub — ADD_TIMED_NOTIFICATION is a no-op without prior START_ADD; seed one manually
    const smWithAdd = transition(
      transition(sm, { type: 'START_ADD_TIMED_NOTIFICATION' }),
      { type: 'ADD_TIMED_NOTIFICATION', id: 'n1' }
    );
    expect(isNotificationsDirty(smWithAdd, device)).toBe(true);
  });

  it('returns true when sub is adding with a non-empty message', () => {
    const device = makeDevice();
    const sm = createInitialSM(device);
    const adding = transition(
      transition(sm, { type: 'START_ADD_TIMED_NOTIFICATION' }),
      { type: 'UPDATE_TIMED_DRAFT', partial: { message: 'Check roots' } }
    );
    expect(isNotificationsDirty(adding, device)).toBe(true);
  });

  it('returns false when sub is adding but draft is empty', () => {
    const device = makeDevice();
    const sm = transition(createInitialSM(device), { type: 'START_ADD_TIMED_NOTIFICATION' });
    expect(isNotificationsDirty(sm, device)).toBe(false);
  });

  it('returns false for an untouched notification carrying an unrecognised trigger', () => {
    const device = makeDevice({
      timedNotifications: [
        {
          id: 'n1',
          message: 'Odd one',
          triggerType: { raw: 'days_since_germination' },
          day: 7,
          growspaceIds: [],
        },
      ],
    });
    const sm = createInitialSM(device);
    expect(isNotificationsDirty(sm, device)).toBe(false);
  });

  it('returns false when editing an unrecognised trigger without touching the draft', () => {
    const notification = {
      id: 'n1',
      message: 'Odd one',
      triggerType: { raw: 'days_since_germination' },
      day: 7,
      growspaceIds: [],
    };
    const device = makeDevice({ timedNotifications: [notification] });
    const editing = transition(createInitialSM(device), {
      type: 'START_EDIT_TIMED_NOTIFICATION',
      id: 'n1',
      draft: {
        message: notification.message,
        triggerType: notification.triggerType,
        day: notification.day,
        growspaceIds: notification.growspaceIds,
      },
    });
    expect(isNotificationsDirty(editing, device)).toBe(false);
  });

  it('returns true when sub is editing with a changed draft', () => {
    const notification = {
      id: 'n1', message: 'Original', triggerType: 'clone' as const, day: 7, growspaceIds: [],
    };
    const device = makeDevice({ timedNotifications: [notification] });
    const sm = createInitialSM(device);
    const editing = transition(
      transition(sm, {
        type: 'START_EDIT_TIMED_NOTIFICATION',
        id: 'n1',
        draft: { message: 'Original', triggerType: 'clone', day: 7, growspaceIds: [] },
      }),
      { type: 'UPDATE_TIMED_DRAFT', partial: { message: 'Changed' } }
    );
    expect(isNotificationsDirty(editing, device)).toBe(true);
  });
});

// ─── Notifications dirty guard ────────────────────────────────────────────────

describe('notifications dirty guard', () => {
  it('isActiveTabDirty returns true when on notifications tab with changed draft', () => {
    const device = makeDevice();
    const sm = transition(
      { ...createInitialSM(device), activeTab: 'notifications' },
      { type: 'UPDATE_NOTIFICATIONS_DRAFT', partial: { criticalCooldownMinutes: 120 } }
    );
    expect(isActiveTabDirty(sm, device)).toBe(true);
  });

  it('REQUEST_TAB triggers confirm-discard when notifications tab is dirty', () => {
    const device = makeDevice();
    const sm = transition(
      { ...createInitialSM(device), activeTab: 'notifications' },
      { type: 'UPDATE_NOTIFICATIONS_DRAFT', partial: { criticalCooldownMinutes: 120 } }
    );
    const next = requestTabSwitch(sm, 'sensors', device);
    expect(next.status.kind).toBe('confirm-discard');
    if (next.status.kind === 'confirm-discard') {
      expect(next.status.pendingTab).toBe('sensors');
    }
  });

  it('discardAndSwitch resets notifications tab from device and switches', () => {
    const device = makeDevice({ notificationSettings: { criticalCooldownMinutes: 60 } });
    const sm = transition(
      { ...createInitialSM(device), activeTab: 'notifications', status: { kind: 'confirm-discard', pendingTab: 'sensors' } },
      { type: 'UPDATE_NOTIFICATIONS_DRAFT', partial: { criticalCooldownMinutes: 120 } }
    );
    const dirtyThenRequest = {
      ...sm,
      status: { kind: 'confirm-discard' as const, pendingTab: 'sensors' as const },
    };
    const next = discardAndSwitch(dirtyThenRequest, device);
    expect(next.activeTab).toBe('sensors');
    expect(next.tabs.notifications.draft.criticalCooldownMinutes).toBe(60);
    expect(next.tabs.notifications.sub.kind).toBe('idle');
    expect(next.status.kind).toBe('idle');
  });
});

// ─── Navigation ──────────────────────────────────────────────────────────────

describe('SWITCH_TAB', () => {
  it('changes the active tab', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'SWITCH_TAB', tab: 'climate' });
    expect(next.activeTab).toBe('climate');
  });

  it('clears status to idle', () => {
    const sm = createInitialSM();
    const withStatus: ConfigDialogSM = { ...sm, status: { kind: 'confirm-discard', pendingTab: 'climate' } };
    const next = transition(withStatus, { type: 'SWITCH_TAB', tab: 'climate' });
    expect(next.status.kind).toBe('idle');
  });
});

describe('REQUEST_TAB', () => {
  it('enters confirm-discard with the pending tab', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'REQUEST_TAB', tab: 'humidity' });
    expect(next.status).toEqual({ kind: 'confirm-discard', pendingTab: 'humidity' });
  });

  it('does not change the active tab', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'REQUEST_TAB', tab: 'humidity' });
    expect(next.activeTab).toBe('sensors');
  });
});

describe('DISCARD_AND_SWITCH', () => {
  it('switches to the pending tab and clears status', () => {
    const sm = createInitialSM();
    const withPending: ConfigDialogSM = {
      ...sm,
      activeTab: 'growspaces',
      status: { kind: 'confirm-discard', pendingTab: 'climate' },
      tabs: {
        ...sm.tabs,
        growspaces: { sub: { kind: 'adding', name: 'Test', rows: 4, plantsPerRow: 4, notificationService: '' } },
      },
    };
    const next = transition(withPending, { type: 'DISCARD_AND_SWITCH' });
    expect(next.activeTab).toBe('climate');
    expect(next.status.kind).toBe('idle');
  });

  it('resets growspaces sub to idle', () => {
    const sm = createInitialSM();
    const withPending: ConfigDialogSM = {
      ...sm,
      activeTab: 'growspaces',
      status: { kind: 'confirm-discard', pendingTab: 'climate' },
      tabs: {
        ...sm.tabs,
        growspaces: { sub: { kind: 'adding', name: 'X', rows: 4, plantsPerRow: 4, notificationService: '' } },
      },
    };
    const next = transition(withPending, { type: 'DISCARD_AND_SWITCH' });
    expect(next.tabs.growspaces.sub.kind).toBe('idle');
  });

  it('is a no-op when status is not confirm-discard', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'DISCARD_AND_SWITCH' });
    expect(next).toBe(sm);
  });
});

describe('CANCEL_TAB_SWITCH', () => {
  it('clears confirm-discard status without switching', () => {
    const sm = createInitialSM();
    const withStatus: ConfigDialogSM = { ...sm, status: { kind: 'confirm-discard', pendingTab: 'climate' } };
    const next = transition(withStatus, { type: 'CANCEL_TAB_SWITCH' });
    expect(next.status.kind).toBe('idle');
    expect(next.activeTab).toBe('sensors');
  });
});

// ─── Growspaces tab ───────────────────────────────────────────────────────────

describe('START_ADD_GROWSPACE', () => {
  it('enters adding sub-state with default values', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'START_ADD_GROWSPACE' });
    const sub = next.tabs.growspaces.sub;
    expect(sub.kind).toBe('adding');
    if (sub.kind === 'adding') {
      expect(sub.name).toBe('');
      expect(sub.rows).toBe(4);
      expect(sub.plantsPerRow).toBe(4);
    }
  });
});

describe('UPDATE_ADD_DRAFT', () => {
  it('merges partial fields into the adding sub-state', () => {
    const sm = createInitialSM();
    const adding = transition(sm, { type: 'START_ADD_GROWSPACE' });
    const next = transition(adding, { type: 'UPDATE_ADD_DRAFT', partial: { name: 'Veg Tent', rows: 3 } });
    const sub = next.tabs.growspaces.sub;
    expect(sub.kind).toBe('adding');
    if (sub.kind === 'adding') {
      expect(sub.name).toBe('Veg Tent');
      expect(sub.rows).toBe(3);
      expect(sub.plantsPerRow).toBe(4);
    }
  });

  it('is a no-op when not in adding state', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'UPDATE_ADD_DRAFT', partial: { name: 'X' } });
    expect(next.tabs.growspaces.sub.kind).toBe('idle');
  });
});

describe('SELECT_GROWSPACE', () => {
  it('enters editing sub-state with provided values', () => {
    const sm = createInitialSM();
    const next = transition(sm, {
      type: 'SELECT_GROWSPACE',
      growspaceId: 'gs1',
      name: 'Tent 1',
      rows: 4,
      plantsPerRow: 4,
      notificationService: 'mobile_app_notify',
    });
    const sub = next.tabs.growspaces.sub;
    expect(sub.kind).toBe('editing');
    if (sub.kind === 'editing') {
      expect(sub.growspaceId).toBe('gs1');
      expect(sub.name).toBe('Tent 1');
    }
  });
});

describe('UPDATE_EDIT_DRAFT', () => {
  it('merges partial fields into the editing sub-state', () => {
    const sm = createInitialSM();
    const editing = transition(sm, {
      type: 'SELECT_GROWSPACE',
      growspaceId: 'gs1',
      name: 'Tent 1',
      rows: 4,
      plantsPerRow: 4,
      notificationService: '',
    });
    const next = transition(editing, { type: 'UPDATE_EDIT_DRAFT', partial: { name: 'Flower Tent' } });
    const sub = next.tabs.growspaces.sub;
    expect(sub.kind).toBe('editing');
    if (sub.kind === 'editing') {
      expect(sub.name).toBe('Flower Tent');
      expect(sub.growspaceId).toBe('gs1');
    }
  });

  it('is a no-op when not in editing state', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'UPDATE_EDIT_DRAFT', partial: { name: 'X' } });
    expect(next.tabs.growspaces.sub.kind).toBe('idle');
  });
});

describe('REQUEST_DELETE_GROWSPACE', () => {
  it('enters confirm-delete sub-state', () => {
    const sm = createInitialSM();
    const next = transition(sm, {
      type: 'REQUEST_DELETE_GROWSPACE',
      growspaceId: 'gs1',
      name: 'Tent 1',
    });
    const sub = next.tabs.growspaces.sub;
    expect(sub.kind).toBe('confirm-delete');
    if (sub.kind === 'confirm-delete') {
      expect(sub.growspaceId).toBe('gs1');
      expect(sub.name).toBe('Tent 1');
    }
  });
});

describe('CANCEL_GROWSPACES', () => {
  it('resets growspaces sub to idle', () => {
    const sm = createInitialSM();
    const adding = transition(sm, { type: 'START_ADD_GROWSPACE' });
    const next = transition(adding, { type: 'CANCEL_GROWSPACES' });
    expect(next.tabs.growspaces.sub.kind).toBe('idle');
  });
});

// ─── Environment draft ────────────────────────────────────────────────────────

describe('UPDATE_ENV_DRAFT', () => {
  it('merges partial fields into the environment draft', () => {
    const sm = createInitialSM();
    const next = transition(sm, {
      type: 'UPDATE_ENV_DRAFT',
      partial: { co2Sensor: 'sensor.co2', stressThreshold: 0.9 },
    });
    expect(next.environmentDraft.co2Sensor).toBe('sensor.co2');
    expect(next.environmentDraft.stressThreshold).toBe(0.9);
    expect(next.environmentDraft.moldThreshold).toBe(0.8);
  });

  it('replaces array fields entirely', () => {
    const sm = createInitialSM();
    const next = transition(sm, {
      type: 'UPDATE_ENV_DRAFT',
      partial: { temperatureSensors: ['sensor.a', 'sensor.b'] },
    });
    expect(next.environmentDraft.temperatureSensors).toEqual(['sensor.a', 'sensor.b']);
  });

  it('updates vpdOptimalOverrides in the environment draft', () => {
    const sm = createInitialSM();
    const overrides = {
      flower_early: { day: { low: 0.9, high: 1.3 }, night: { low: 0.7, high: 1.1 } },
    };
    const next = transition(sm, {
      type: 'UPDATE_ENV_DRAFT',
      partial: { vpdOptimalOverrides: overrides },
    });
    expect(next.environmentDraft.vpdOptimalOverrides).toEqual(overrides);
  });
});

// ─── Tanks tab ────────────────────────────────────────────────────────────────

describe('BEGIN_ADD_TANK', () => {
  it('enters adding sub-state with empty defaults', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'BEGIN_ADD_TANK' });
    const sub = next.tabs.tanks.sub;
    expect(sub.kind).toBe('adding');
    if (sub.kind === 'adding') {
      expect(sub.sensorEntity).toBe('');
      expect(sub.volumeLiters).toBeNull();
      expect(sub.warningLevel).toBe(30);
    }
  });
});

describe('BEGIN_EDIT_TANK', () => {
  it('enters editing sub-state with provided values', () => {
    const sm = createInitialSM();
    const next = transition(sm, {
      type: 'BEGIN_EDIT_TANK',
      index: 1,
      sensorEntity: 'sensor.tank1',
      name: 'Main Tank',
      volumeLiters: 100,
      warningLevel: 20,
    });
    const sub = next.tabs.tanks.sub;
    expect(sub.kind).toBe('editing');
    if (sub.kind === 'editing') {
      expect(sub.index).toBe(1);
      expect(sub.sensorEntity).toBe('sensor.tank1');
      expect(sub.volumeLiters).toBe(100);
    }
  });
});

describe('UPDATE_TANK_DRAFT', () => {
  it('merges partial fields while adding', () => {
    const sm = createInitialSM();
    const adding = transition(sm, { type: 'BEGIN_ADD_TANK' });
    const next = transition(adding, {
      type: 'UPDATE_TANK_DRAFT',
      partial: { sensorEntity: 'sensor.tank2', name: 'Tank 2' },
    });
    const sub = next.tabs.tanks.sub;
    if (sub.kind === 'adding') {
      expect(sub.sensorEntity).toBe('sensor.tank2');
      expect(sub.name).toBe('Tank 2');
    }
  });

  it('is a no-op when tanks sub is idle', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'UPDATE_TANK_DRAFT', partial: { sensorEntity: 'x' } });
    expect(next.tabs.tanks.sub.kind).toBe('idle');
  });
});

describe('CANCEL_TANK', () => {
  it('resets tanks sub to idle', () => {
    const sm = createInitialSM();
    const adding = transition(sm, { type: 'BEGIN_ADD_TANK' });
    const next = transition(adding, { type: 'CANCEL_TANK' });
    expect(next.tabs.tanks.sub.kind).toBe('idle');
  });
});

describe('COMMIT_TANK', () => {
  it('appends a new tank to irrigationTanks and resets sub to idle', () => {
    const sm = createInitialSM();
    const adding = transition(sm, { type: 'BEGIN_ADD_TANK' });
    const filled = transition(adding, {
      type: 'UPDATE_TANK_DRAFT',
      partial: { sensorEntity: 'sensor.tank1', name: 'Res 1', volumeLiters: 200, warningLevel: 25 },
    });
    const next = transition(filled, { type: 'COMMIT_TANK' });
    expect(next.tabs.tanks.sub.kind).toBe('idle');
    expect(next.environmentDraft.irrigationTanks).toHaveLength(1);
    expect(next.environmentDraft.irrigationTanks[0].sensorEntity).toBe('sensor.tank1');
  });

  it('replaces an existing tank by index when editing', () => {
    const sm = createInitialSM();
    const withTanks = transition(sm, {
      type: 'UPDATE_ENV_DRAFT',
      partial: {
        irrigationTanks: [
          { sensorEntity: 'sensor.old', name: 'Old', volumeLiters: null, warningLevel: 30 },
        ],
      },
    });
    const editing = transition(withTanks, {
      type: 'BEGIN_EDIT_TANK',
      index: 0,
      sensorEntity: 'sensor.old',
      name: 'Old',
      volumeLiters: null,
      warningLevel: 30,
    });
    const updated = transition(editing, {
      type: 'UPDATE_TANK_DRAFT',
      partial: { name: 'New Name' },
    });
    const next = transition(updated, { type: 'COMMIT_TANK' });
    expect(next.environmentDraft.irrigationTanks).toHaveLength(1);
    expect(next.environmentDraft.irrigationTanks[0].name).toBe('New Name');
  });

  it('is a no-op when tanks sub is idle', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'COMMIT_TANK' });
    expect(next).toBe(sm);
  });
});

// ─── Heatmap / sensor groups ──────────────────────────────────────────────────

describe('BEGIN_EDIT_GROUP', () => {
  it('enters editing-group sub-state with provided group', () => {
    const sm = createInitialSM();
    const group = {
      id: 'grp1',
      name: 'Top Sensors',
      x: 1,
      y: 2,
      z: 0,
      temperature_sensors: [],
      humidity_sensors: [],
      vpd_sensors: [],
    };
    const next = transition(sm, { type: 'BEGIN_EDIT_GROUP', group });
    const sub = next.tabs.heatmap.sub;
    expect(sub.kind).toBe('editing-group');
    if (sub.kind === 'editing-group') {
      expect(sub.group).toBe(group);
    }
  });

  it('enters editing-group sub-state with no group for new group flow', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'BEGIN_EDIT_GROUP' });
    const sub = next.tabs.heatmap.sub;
    expect(sub.kind).toBe('editing-group');
    if (sub.kind === 'editing-group') {
      expect(sub.group).toBeUndefined();
    }
  });
});

describe('CLOSE_GROUP_DIALOG', () => {
  it('resets heatmap sub to idle', () => {
    const sm = createInitialSM();
    const editing = transition(sm, { type: 'BEGIN_EDIT_GROUP' });
    const next = transition(editing, { type: 'CLOSE_GROUP_DIALOG' });
    expect(next.tabs.heatmap.sub.kind).toBe('idle');
  });
});

// ─── Subareas tab ─────────────────────────────────────────────────────────────

describe('BEGIN_ADD_SUBAREA', () => {
  it('enters adding sub-state with empty name', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'BEGIN_ADD_SUBAREA' });
    const sub = next.tabs.subareas.sub;
    expect(sub.kind).toBe('adding');
    if (sub.kind === 'adding') {
      expect(sub.name).toBe('');
    }
  });
});

describe('UPDATE_SUBAREA_NAME', () => {
  it('updates the name in adding sub-state', () => {
    const sm = createInitialSM();
    const adding = transition(sm, { type: 'BEGIN_ADD_SUBAREA' });
    const next = transition(adding, { type: 'UPDATE_SUBAREA_NAME', name: 'North Side' });
    const sub = next.tabs.subareas.sub;
    if (sub.kind === 'adding') {
      expect(sub.name).toBe('North Side');
    }
  });

  it('is a no-op when not in adding state', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'UPDATE_SUBAREA_NAME', name: 'X' });
    expect(next.tabs.subareas.sub.kind).toBe('idle');
  });
});

describe('CANCEL_SUBAREA', () => {
  it('resets subareas sub to idle', () => {
    const sm = createInitialSM();
    const adding = transition(sm, { type: 'BEGIN_ADD_SUBAREA' });
    const next = transition(adding, { type: 'CANCEL_SUBAREA' });
    expect(next.tabs.subareas.sub.kind).toBe('idle');
  });
});

describe('REQUEST_DELETE_SUBAREA', () => {
  it('enters confirm-delete sub-state with the subareaId', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'REQUEST_DELETE_SUBAREA', subareaId: 'sa1' });
    const sub = next.tabs.subareas.sub;
    expect(sub.kind).toBe('confirm-delete');
    if (sub.kind === 'confirm-delete') {
      expect(sub.subareaId).toBe('sa1');
    }
  });
});

describe('CANCEL_DELETE_SUBAREA', () => {
  it('resets subareas sub to idle', () => {
    const sm = createInitialSM();
    const pending = transition(sm, { type: 'REQUEST_DELETE_SUBAREA', subareaId: 'sa1' });
    const next = transition(pending, { type: 'CANCEL_DELETE_SUBAREA' });
    expect(next.tabs.subareas.sub.kind).toBe('idle');
  });
});

describe('BEGIN_EDIT_SUBAREA', () => {
  it('enters editing-subarea sub-state with the subarea', () => {
    const sm = createInitialSM();
    const subarea = makeSubarea();
    const next = transition(sm, { type: 'BEGIN_EDIT_SUBAREA', subarea });
    const sub = next.tabs.subareas.sub;
    expect(sub.kind).toBe('editing-subarea');
    if (sub.kind === 'editing-subarea') {
      expect(sub.subarea.id).toBe('sa1');
    }
  });
});

describe('CLOSE_SUBAREA_DIALOG', () => {
  it('resets subareas sub to idle', () => {
    const sm = createInitialSM();
    const subarea = makeSubarea();
    const editing = transition(sm, { type: 'BEGIN_EDIT_SUBAREA', subarea });
    const next = transition(editing, { type: 'CLOSE_SUBAREA_DIALOG' });
    expect(next.tabs.subareas.sub.kind).toBe('idle');
  });
});

// ─── Global ───────────────────────────────────────────────────────────────────

describe('SET_TOAST', () => {
  it('sets a toast message', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'SET_TOAST', message: 'Saved!' });
    expect(next.toast).toBe('Saved!');
  });

  it('clears the toast message', () => {
    const sm = createInitialSM();
    const withToast = transition(sm, { type: 'SET_TOAST', message: 'Saved!' });
    const next = transition(withToast, { type: 'SET_TOAST', message: undefined });
    expect(next.toast).toBeUndefined();
  });
});

describe('RESET_FROM_DEVICE', () => {
  it('rebuilds the environment draft from the new device', () => {
    const sm = createInitialSM();
    const device = makeDevice({
      environmentAttributes: { temperatureSensors: ['sensor.new'] },
    });
    const next = transition(sm, { type: 'RESET_FROM_DEVICE', device });
    expect(next.environmentDraft.temperatureSensors).toEqual(['sensor.new']);
    expect(next.environmentDraft.selectedGrowspaceId).toBe('gs1');
  });

  it('does not change active tab or status', () => {
    const sm: ConfigDialogSM = {
      ...createInitialSM(),
      activeTab: 'climate',
      status: { kind: 'idle' },
    };
    const device = makeDevice();
    const next = transition(sm, { type: 'RESET_FROM_DEVICE', device });
    expect(next.activeTab).toBe('climate');
    expect(next.status.kind).toBe('idle');
  });
});

// ─── Dirty predicates ─────────────────────────────────────────────────────────

describe('isGrowspacesDirty', () => {
  it('returns false when growspaces sub is idle', () => {
    const sm = createInitialSM();
    const device = makeDevice();
    expect(isGrowspacesDirty(sm, device)).toBe(false);
  });

  it('returns false when adding with all-default fields', () => {
    const sm = createInitialSM();
    const adding = transition(sm, { type: 'START_ADD_GROWSPACE' });
    const device = makeDevice();
    expect(isGrowspacesDirty(adding, device)).toBe(false);
  });

  it('returns true when adding has a non-empty name', () => {
    const sm = createInitialSM();
    const adding = transition(sm, { type: 'START_ADD_GROWSPACE' });
    const withName = transition(adding, { type: 'UPDATE_ADD_DRAFT', partial: { name: 'X' } });
    const device = makeDevice();
    expect(isGrowspacesDirty(withName, device)).toBe(true);
  });

  it('returns false when editing matches the device', () => {
    const sm = createInitialSM();
    const device = makeDevice({ name: 'Tent 1', rows: 4, plantsPerRow: 4, notificationTarget: '' });
    const editing = transition(sm, {
      type: 'SELECT_GROWSPACE',
      growspaceId: 'gs1',
      name: 'Tent 1',
      rows: 4,
      plantsPerRow: 4,
      notificationService: '',
    });
    expect(isGrowspacesDirty(editing, device)).toBe(false);
  });

  it('returns true when editing name differs from device', () => {
    const sm = createInitialSM();
    const device = makeDevice({ name: 'Tent 1' });
    const editing = transition(sm, {
      type: 'SELECT_GROWSPACE',
      growspaceId: 'gs1',
      name: 'Tent 1',
      rows: 4,
      plantsPerRow: 4,
      notificationService: '',
    });
    const changed = transition(editing, { type: 'UPDATE_EDIT_DRAFT', partial: { name: 'Changed' } });
    expect(isGrowspacesDirty(changed, device)).toBe(true);
  });
});

describe('isActiveTabDirty', () => {
  it('returns false for non-growspaces tabs regardless of env changes', () => {
    const sm: ConfigDialogSM = { ...createInitialSM(), activeTab: 'sensors' };
    const device = makeDevice();
    expect(isActiveTabDirty(sm, device)).toBe(false);
  });

  it('delegates to isGrowspacesDirty when on growspaces tab', () => {
    const sm: ConfigDialogSM = { ...createInitialSM(), activeTab: 'growspaces' };
    const withAdding = transition(sm, { type: 'START_ADD_GROWSPACE' });
    const withName = transition(withAdding, { type: 'UPDATE_ADD_DRAFT', partial: { name: 'New' } });
    const device = makeDevice();
    expect(isActiveTabDirty(withName, device)).toBe(true);
  });
});

// ─── requestTabSwitch helper ──────────────────────────────────────────────────

describe('requestTabSwitch', () => {
  it('is a no-op when switching to the current tab', () => {
    const sm: ConfigDialogSM = { ...createInitialSM(), activeTab: 'sensors' };
    const device = makeDevice();
    const next = requestTabSwitch(sm, 'sensors', device);
    expect(next).toBe(sm);
  });

  it('switches directly when the current tab is clean', () => {
    const sm: ConfigDialogSM = { ...createInitialSM(), activeTab: 'growspaces' };
    const device = makeDevice();
    const next = requestTabSwitch(sm, 'climate', device);
    expect(next.activeTab).toBe('climate');
    expect(next.status.kind).toBe('idle');
  });

  it('enters confirm-discard when growspaces tab is dirty', () => {
    const sm: ConfigDialogSM = { ...createInitialSM(), activeTab: 'growspaces' };
    const withName = transition(
      transition(sm, { type: 'START_ADD_GROWSPACE' }),
      { type: 'UPDATE_ADD_DRAFT', partial: { name: 'Dirty' } }
    );
    const device = makeDevice();
    const next = requestTabSwitch(withName, 'climate', device);
    expect(next.status).toEqual({ kind: 'confirm-discard', pendingTab: 'climate' });
  });
});

// ─── discardAndSwitch helper ──────────────────────────────────────────────────

describe('discardAndSwitch', () => {
  it('switches to the pending tab and clears growspaces draft', () => {
    const sm: ConfigDialogSM = {
      ...createInitialSM(),
      activeTab: 'growspaces',
      status: { kind: 'confirm-discard', pendingTab: 'humidity' },
      tabs: {
        ...createInitialSM().tabs,
        growspaces: { sub: { kind: 'adding', name: 'Dirty', rows: 4, plantsPerRow: 4, notificationService: '' } },
      },
    };
    const device = makeDevice();
    const next = discardAndSwitch(sm, device);
    expect(next.activeTab).toBe('humidity');
    expect(next.status.kind).toBe('idle');
    expect(next.tabs.growspaces.sub.kind).toBe('idle');
  });

  it('is a no-op when status is not confirm-discard', () => {
    const sm = createInitialSM();
    const device = makeDevice();
    const next = discardAndSwitch(sm, device);
    expect(next).toBe(sm);
  });
});

// ─── circulationFanConfig in EnvironmentDraft ─────────────────────────────────

const fanConfig: CirculationFanConfig = {
  enabled: true,
  regulation_mode: 'humidity',
  min_speed: 15,
  max_speed: 90,
  vpd_target: 1.0,
  vpd_tolerance: 0.2,
  humidity_target: 65.0,
  humidity_tolerance: 4.0,
  temperature_target: 24.0,
  temperature_tolerance: 1.5,
  critical_temp_low: null,
  critical_temp_high: null,
  critical_temp_hysteresis: 1.0,
  wind_enabled: false,
  wind_period_seconds: 60,
  wind_amplitude_pct: 10,
  stage_vpd_enabled: false,
  stage_vpd_overrides: {},
};

describe('circulationFanConfig in EnvironmentDraft', () => {
  it('seeds circulationFanConfig from device attributes when present', () => {
    const device = makeDevice({
      environmentAttributes: { circulationFanConfig: fanConfig } as any,
    });
    const sm = createInitialSM(device);
    expect(sm.environmentDraft.circulationFanConfig).toEqual(fanConfig);
  });

  it('uses backend-matching defaults when circulationFanConfig is absent', () => {
    const device = makeDevice();
    const sm = createInitialSM(device);
    expect(sm.environmentDraft.circulationFanConfig).toEqual({
      enabled: false,
      regulation_mode: 'vpd',
      min_speed: 0,
      max_speed: 100,
      vpd_target: 1.0,
      vpd_tolerance: 0.2,
      humidity_target: 60.0,
      humidity_tolerance: 5.0,
      temperature_target: 25.0,
      temperature_tolerance: 2.0,
      critical_temp_low: null,
      critical_temp_high: null,
      critical_temp_hysteresis: 1.0,
      wind_enabled: false,
      wind_period_seconds: 60,
      wind_amplitude_pct: 10,
      stage_vpd_enabled: false,
      stage_vpd_overrides: {},
    });
  });
});

// ─── exhaustFanConfig in EnvironmentDraft ─────────────────────────────────────

const exhaustFanConfig: ExhaustFanConfig = {
  enabled: true,
  min_speed: 20,
  max_speed: 80,
  vpd_target: 1.1,
  vpd_tolerance: 0.25,
  humidity_target: 58.0,
  humidity_tolerance: 4.0,
  temperature_target: 23.0,
  temperature_tolerance: 1.5,
  critical_temp_low: 18,
  critical_temp_high: 30,
  critical_temp_hysteresis: 1.0,
  stage_vpd_enabled: true,
  stage_vpd_overrides: { flower_mid: { day: 1.3, night: 1.1 } },
};

describe('exhaustFanConfig in EnvironmentDraft', () => {
  it('seeds exhaustFanConfig from device attributes when present', () => {
    const device = makeDevice({
      environmentAttributes: { exhaustFanConfig } as any,
    });
    const sm = createInitialSM(device);
    expect(sm.environmentDraft.exhaustFanConfig).toEqual(exhaustFanConfig);
  });

  it('uses backend-matching defaults when exhaustFanConfig is absent (no mode/wind)', () => {
    const device = makeDevice();
    const sm = createInitialSM(device);
    expect(sm.environmentDraft.exhaustFanConfig).toEqual({
      enabled: false,
      min_speed: 0,
      max_speed: 100,
      vpd_target: 1.0,
      vpd_tolerance: 0.2,
      humidity_target: 60.0,
      humidity_tolerance: 5.0,
      temperature_target: 25.0,
      temperature_tolerance: 2.0,
      critical_temp_low: null,
      critical_temp_high: null,
      critical_temp_hysteresis: 1.0,
      stage_vpd_enabled: false,
      stage_vpd_overrides: {},
    });
  });
});

// ─── Timed Notification CRUD ──────────────────────────────────────────────────

describe('START_ADD_TIMED_NOTIFICATION', () => {
  it('enters adding sub-state with empty draft', () => {
    const sm = transition(createInitialSM(), { type: 'START_ADD_TIMED_NOTIFICATION' });
    expect(sm.tabs.notifications.sub.kind).toBe('adding');
    if (sm.tabs.notifications.sub.kind === 'adding') {
      expect(sm.tabs.notifications.sub.draft.message).toBe('');
      expect(sm.tabs.notifications.sub.draft.day).toBe(1);
    }
  });
});

describe('UPDATE_TIMED_DRAFT', () => {
  it('patches the adding draft', () => {
    const sm = transition(
      transition(createInitialSM(), { type: 'START_ADD_TIMED_NOTIFICATION' }),
      { type: 'UPDATE_TIMED_DRAFT', partial: { message: 'Check roots', day: 7 } }
    );
    const sub = sm.tabs.notifications.sub;
    expect(sub.kind).toBe('adding');
    if (sub.kind === 'adding') {
      expect(sub.draft.message).toBe('Check roots');
      expect(sub.draft.day).toBe(7);
    }
  });

  it('is a no-op when sub is idle', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'UPDATE_TIMED_DRAFT', partial: { message: 'Ignored' } });
    expect(next.tabs.notifications.sub.kind).toBe('idle');
  });
});

describe('ADD_TIMED_NOTIFICATION', () => {
  it('commits the draft to timedNotifications and returns to idle', () => {
    const sm = transition(
      transition(
        transition(createInitialSM(), { type: 'START_ADD_TIMED_NOTIFICATION' }),
        { type: 'UPDATE_TIMED_DRAFT', partial: { message: 'Check roots', day: 7, growspaceIds: ['gs1'] } }
      ),
      { type: 'ADD_TIMED_NOTIFICATION', id: 'n1' }
    );
    expect(sm.tabs.notifications.sub.kind).toBe('idle');
    expect(sm.tabs.notifications.timedNotifications).toHaveLength(1);
    expect(sm.tabs.notifications.timedNotifications[0]).toEqual({
      id: 'n1', message: 'Check roots', triggerType: 'clone', day: 7, growspaceIds: ['gs1'],
    });
  });

  it('is a no-op when sub is not adding', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'ADD_TIMED_NOTIFICATION', id: 'n1' });
    expect(next.tabs.notifications.timedNotifications).toHaveLength(0);
  });
});

describe('START_EDIT_TIMED_NOTIFICATION', () => {
  it('enters editing sub-state with the given draft', () => {
    const draft = { message: 'Original', triggerType: 'veg' as const, day: 14, growspaceIds: ['gs1'] };
    const sm = transition(createInitialSM(), { type: 'START_EDIT_TIMED_NOTIFICATION', id: 'n1', draft });
    const sub = sm.tabs.notifications.sub;
    expect(sub.kind).toBe('editing');
    if (sub.kind === 'editing') {
      expect(sub.id).toBe('n1');
      expect(sub.draft.message).toBe('Original');
    }
  });
});

describe('EDIT_TIMED_NOTIFICATION', () => {
  it('updates the item in the list and returns to idle', () => {
    const existing = {
      id: 'n1', message: 'Original', triggerType: 'clone' as const, day: 7, growspaceIds: [],
    };
    const device = makeDevice({ timedNotifications: [existing] });
    const sm = transition(
      transition(
        transition(createInitialSM(device), {
          type: 'START_EDIT_TIMED_NOTIFICATION',
          id: 'n1',
          draft: { message: 'Original', triggerType: 'clone', day: 7, growspaceIds: [] },
        }),
        { type: 'UPDATE_TIMED_DRAFT', partial: { message: 'Updated', day: 10 } }
      ),
      { type: 'EDIT_TIMED_NOTIFICATION' }
    );
    expect(sm.tabs.notifications.sub.kind).toBe('idle');
    expect(sm.tabs.notifications.timedNotifications[0]).toEqual({
      id: 'n1', message: 'Updated', triggerType: 'clone', day: 10, growspaceIds: [],
    });
  });
});

describe('CANCEL_TIMED_NOTIFICATION', () => {
  it('resets sub to idle from adding', () => {
    const sm = transition(
      transition(createInitialSM(), { type: 'START_ADD_TIMED_NOTIFICATION' }),
      { type: 'CANCEL_TIMED_NOTIFICATION' }
    );
    expect(sm.tabs.notifications.sub.kind).toBe('idle');
  });

  it('resets sub to idle from editing', () => {
    const draft = { message: 'X', triggerType: 'veg' as const, day: 1, growspaceIds: [] };
    const sm = transition(
      transition(createInitialSM(), { type: 'START_EDIT_TIMED_NOTIFICATION', id: 'n1', draft }),
      { type: 'CANCEL_TIMED_NOTIFICATION' }
    );
    expect(sm.tabs.notifications.sub.kind).toBe('idle');
  });

  it('resets sub to idle from confirm-delete', () => {
    const sm = transition(
      transition(createInitialSM(), { type: 'DELETE_TIMED_NOTIFICATION', id: 'n1' }),
      { type: 'CANCEL_TIMED_NOTIFICATION' }
    );
    expect(sm.tabs.notifications.sub.kind).toBe('idle');
  });
});

describe('DELETE_TIMED_NOTIFICATION + CONFIRM_DELETE', () => {
  it('enters confirm-delete sub-state', () => {
    const sm = transition(createInitialSM(), { type: 'DELETE_TIMED_NOTIFICATION', id: 'n1' });
    const sub = sm.tabs.notifications.sub;
    expect(sub.kind).toBe('confirm-delete');
    if (sub.kind === 'confirm-delete') expect(sub.id).toBe('n1');
  });

  it('removes the item from the list on CONFIRM_DELETE', () => {
    const existing = {
      id: 'n1', message: 'Delete me', triggerType: 'clone' as const, day: 3, growspaceIds: [],
    };
    const device = makeDevice({ timedNotifications: [existing] });
    const sm = transition(
      transition(createInitialSM(device), { type: 'DELETE_TIMED_NOTIFICATION', id: 'n1' }),
      { type: 'CONFIRM_DELETE' }
    );
    expect(sm.tabs.notifications.sub.kind).toBe('idle');
    expect(sm.tabs.notifications.timedNotifications).toHaveLength(0);
  });
});

describe('SAVE_NOTIFICATIONS', () => {
  it('resets sub to idle', () => {
    const sm = transition(
      transition(createInitialSM(), { type: 'START_ADD_TIMED_NOTIFICATION' }),
      { type: 'SAVE_NOTIFICATIONS' }
    );
    expect(sm.tabs.notifications.sub.kind).toBe('idle');
  });
});

describe('RESET_FROM_DEVICE re-seeds notifications', () => {
  it('updates notifications draft and list when device changes', () => {
    const device1 = makeDevice({ notificationSettings: { criticalCooldownMinutes: 60 } });
    const sm = transition(
      transition(createInitialSM(device1), {
        type: 'UPDATE_NOTIFICATIONS_DRAFT', partial: { criticalCooldownMinutes: 120 },
      }),
      {
        type: 'RESET_FROM_DEVICE',
        device: makeDevice({ notificationSettings: { criticalCooldownMinutes: 90 }, timedNotifications: [
          { id: 'n1', message: 'New', triggerType: 'veg', day: 5, growspaceIds: [] },
        ] }),
      }
    );
    expect(sm.tabs.notifications.draft.criticalCooldownMinutes).toBe(90);
    expect(sm.tabs.notifications.timedNotifications).toHaveLength(1);
    expect(sm.tabs.notifications.timedNotifications[0].message).toBe('New');
  });
});

// ─── LST Offset on EnvironmentDraft ──────────────────────────────────────────

describe('lstOffset on EnvironmentDraft', () => {
  it('defaults to -2.0 in a fresh SM', () => {
    const sm = createInitialSM();
    expect(sm.environmentDraft.lstOffset).toBe(-2.0);
  });

  it('seeds lstOffset from device environmentAttributes', () => {
    const device = makeDevice({
      environmentAttributes: { lstOffset: -3.5 } as any,
    });
    const sm = createInitialSM(device);
    expect(sm.environmentDraft.lstOffset).toBe(-3.5);
  });

  it('falls back to -2.0 when device has no lstOffset', () => {
    const device = makeDevice({
      environmentAttributes: {} as any,
    });
    const sm = createInitialSM(device);
    expect(sm.environmentDraft.lstOffset).toBe(-2.0);
  });

  it('updates lstOffset via UPDATE_ENV_DRAFT', () => {
    const sm = createInitialSM();
    const updated = transition(sm, { type: 'UPDATE_ENV_DRAFT', partial: { lstOffset: -5.0 } });
    expect(updated.environmentDraft.lstOffset).toBe(-5.0);
  });

  it('RESET_FROM_DEVICE re-seeds lstOffset', () => {
    const sm = transition(createInitialSM(), {
      type: 'UPDATE_ENV_DRAFT', partial: { lstOffset: -8.0 },
    });
    expect(sm.environmentDraft.lstOffset).toBe(-8.0);

    const reset = transition(sm, {
      type: 'RESET_FROM_DEVICE',
      device: makeDevice({ environmentAttributes: { lstOffset: -1.0 } as any }),
    });
    expect(reset.environmentDraft.lstOffset).toBe(-1.0);
  });
});
