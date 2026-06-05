/**
 * Unit tests for ConfigDialog — logic branches only (no render/DOM assertions).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import './config-dialog';
import { ConfigDialog } from './config-dialog';
import { ConfigTab } from '../constants';

vi.mock('../slices/subarea', () => ({
  getSubareas: vi.fn(),
  addSubarea: vi.fn(),
  updateSubarea: vi.fn(),
  removeSubarea: vi.fn(),
  subareas$: { get: vi.fn(() => []), subscribe: vi.fn(() => () => {}) },
  setSubareas: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

function makeEl(): ConfigDialog {
  return document.createElement('config-dialog') as ConfigDialog;
}

// ─── env* property setters (lines 180–231) ───────────────────────────────────

describe('envHumidifierControlEnabled', () => {
  it('defaults to false', () => {
    const el = makeEl();
    expect(el.envHumidifierControlEnabled).toBe(false);
  });

  it('setter stores the value', () => {
    const el = makeEl();
    el.envHumidifierControlEnabled = true;
    expect(el.envHumidifierControlEnabled).toBe(true);
  });
});

describe('envSensorCoordinates', () => {
  it('defaults to empty object', () => {
    const el = makeEl();
    expect(el.envSensorCoordinates).toEqual({});
  });

  it('setter updates the draft', () => {
    const el = makeEl();
    const coords = { 'sensor.a': { x: 1, y: 2, z: 0 } };
    el.envSensorCoordinates = coords;
    expect(el.envSensorCoordinates).toEqual(coords);
  });
});

describe('env sensor array setters (lines 219–231)', () => {
  it.each([
    ['envBulkEcSensors', ['sensor.bulk_ec']],
    ['envPoreEcSensors', ['sensor.pore_ec']],
    ['envRunoffEcSensors', ['sensor.runoff_ec']],
    ['envDrainVolumeSensors', ['sensor.drain_vol']],
    ['envIrrigationFlowSensors', ['sensor.irr_flow']],
    ['envPowerSensors', ['sensor.power']],
  ] as const)('%s setter updates the draft', (prop, value) => {
    const el = makeEl();
    (el as any)[prop] = value;
    expect((el as any)[prop]).toEqual(value);
  });
});

// ─── _editingSubarea setter else-branch (line 376) ───────────────────────────

describe('_editingSubarea setter', () => {
  it('fires CLOSE_SUBAREA_DIALOG when assigned undefined', () => {
    const el = makeEl();
    // Put subareas tab into editing-subarea state first
    (el as any)._editingSubarea = { id: 'sa1', name: 'North', environment_config: {} };
    // Now clear it — exercises the else-branch
    (el as any)._editingSubarea = undefined;
    expect((el as any)._sm.tabs.subareas.sub.kind).toBe('idle');
  });
});

// ─── _showAddSubarea setter else-branch (line 382) ───────────────────────────

describe('_showAddSubarea setter', () => {
  it('fires CANCEL_SUBAREA when set to false', () => {
    const el = makeEl();
    (el as any)._showAddSubarea = true;
    expect((el as any)._sm.tabs.subareas.sub.kind).toBe('adding');
    (el as any)._showAddSubarea = false;
    expect((el as any)._sm.tabs.subareas.sub.kind).toBe('idle');
  });
});

// ─── _tankDraft default return (line 414) ────────────────────────────────────

describe('_tankDraft getter', () => {
  it('returns empty defaults when tanks sub-state is idle', () => {
    const el = makeEl();
    const draft = (el as any)._tankDraft;
    expect(draft).toEqual({ sensorEntity: '', name: '', volumeLiters: null, warningLevel: 30 });
  });
});

// ─── setInitialState irrigation tanks mapping (line 974) ─────────────────────

describe('setInitialState irrigation tanks mapping', () => {
  it('maps tanks array and fills missing fields with defaults', () => {
    const el = makeEl();
    el.setInitialState(ConfigTab.SENSORS, {
      selectedGrowspaceId: 'gs1',
      irrigationTanks: [
        { sensorEntity: 'sensor.tank1', name: 'Main Tank', volumeLiters: 50, warningLevel: 20 },
        { sensorEntity: 'sensor.tank2' }, // name/volumeLiters/warningLevel missing
      ],
    } as any);
    const tanks = (el as any)._sm.environmentDraft.irrigationTanks;
    expect(tanks).toHaveLength(2);
    expect(tanks[0]).toEqual({ sensorEntity: 'sensor.tank1', name: 'Main Tank', volumeLiters: 50, warningLevel: 20 });
    expect(tanks[1]).toEqual({ sensorEntity: 'sensor.tank2', name: 'Tank', volumeLiters: null, warningLevel: 30 });
  });
});

// ─── _loadSubareas catch block (lines 1432–1433) ─────────────────────────────

describe('_loadSubareas error handling', () => {
  it('resets subareas to [] and does not throw when getSubareas rejects', async () => {
    const { getSubareas } = await import('../slices/subarea');
    vi.mocked(getSubareas).mockRejectedValueOnce(new Error('network error'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const el = makeEl();
    el.envSelectedId = 'gs1';

    await expect((el as any)._loadSubareas()).resolves.toBeUndefined();
    expect((el as any)._subareas).toEqual([]);
    expect((el as any)._subareasLoading).toBe(false);
  });
});

// ─── Timed Notifications ─────────────────────────────────────────────────────

describe('timed notifications — add flow', () => {
  it('_startAddTimedNotification transitions sub to adding', () => {
    const el = makeEl();
    (el as any)._startAddTimedNotification();
    expect((el as any)._sm.tabs.notifications.sub.kind).toBe('adding');
  });
});

describe('timed notifications — edit flow', () => {
  it('_startEditTimedNotification transitions sub to editing with pre-populated draft', () => {
    const el = makeEl();
    const draft = { message: 'Check roots', triggerType: 'veg_start' as const, day: 7, growspaceIds: ['gs1'] };
    (el as any)._startEditTimedNotification('notif-1', draft);
    const sub = (el as any)._sm.tabs.notifications.sub;
    expect(sub.kind).toBe('editing');
    expect(sub.id).toBe('notif-1');
    expect(sub.draft).toEqual(draft);
  });
});

describe('timed notifications — confirm-delete flow', () => {
  it('_requestDeleteTimedNotification transitions sub to confirm-delete', () => {
    const el = makeEl();
    (el as any)._requestDeleteTimedNotification('notif-1');
    const sub = (el as any)._sm.tabs.notifications.sub;
    expect(sub.kind).toBe('confirm-delete');
    expect(sub.id).toBe('notif-1');
  });

  it('_confirmDeleteTimedNotification removes the notification and returns to idle', () => {
    const el = makeEl();
    // seed a notification via SM directly
    (el as any)._sm = {
      ...(el as any)._sm,
      tabs: {
        ...(el as any)._sm.tabs,
        notifications: {
          draft: (el as any)._sm.tabs.notifications.draft,
          timedNotifications: [{ id: 'notif-1', message: 'msg', triggerType: 'veg_start', day: 3, growspaceIds: [] }],
          sub: { kind: 'confirm-delete', id: 'notif-1' },
        },
      },
    };
    (el as any)._confirmDeleteTimedNotification();
    const tab = (el as any)._sm.tabs.notifications;
    expect(tab.timedNotifications).toHaveLength(0);
    expect(tab.sub.kind).toBe('idle');
  });

  it('_cancelTimedNotification returns sub to idle', () => {
    const el = makeEl();
    (el as any)._startAddTimedNotification();
    (el as any)._cancelTimedNotification();
    expect((el as any)._sm.tabs.notifications.sub.kind).toBe('idle');
  });
});

// ─── _updateFanConfig (line 1829) ────────────────────────────────────────────

describe('_updateFanConfig', () => {
  it('merges partial into circulationFanConfig in the environment draft', () => {
    const el = makeEl();
    (el as any)._updateFanConfig({ enabled: true, min_speed: 20 });
    const fan = (el as any)._sm.environmentDraft.circulationFanConfig;
    expect(fan.enabled).toBe(true);
    expect(fan.min_speed).toBe(20);
    // unrelated fields are preserved
    expect(fan.max_speed).toBe(100);
  });

  it('does not mutate other parts of the environment draft', () => {
    const el = makeEl();
    el.envTemperatureSensors = ['sensor.temp'];
    (el as any)._updateFanConfig({ enabled: true });
    expect(el.envTemperatureSensors).toEqual(['sensor.temp']);
  });
});
