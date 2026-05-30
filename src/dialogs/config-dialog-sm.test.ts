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
  type ConfigDialogSM,
  type ConfigTabId,
} from './config-dialog-sm';
import { createGrowspaceDevice } from '../services/types';

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
    expect(sm.tabs.sensors.sub.kind).toBe('idle');
    expect(sm.tabs.climate.sub.kind).toBe('idle');
    expect(sm.tabs.humidity.sub.kind).toBe('idle');
    expect(sm.tabs.irrigation.sub.kind).toBe('idle');
    expect(sm.tabs.tanks.sub.kind).toBe('idle');
    expect(sm.tabs.vision.sub.kind).toBe('idle');
    expect(sm.tabs.heatmap.sub.kind).toBe('idle');
    expect(sm.tabs.subareas.sub.kind).toBe('idle');
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
