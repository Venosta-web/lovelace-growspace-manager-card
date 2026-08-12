/**
 * Unit tests for ConfigDialog — logic branches only (no render/DOM assertions).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import './config-dialog';
import { ConfigDialog } from './config-dialog';
import { VPD_OPTIMAL_STAGE_DEFAULTS } from '../features/environment/constants';
import { getVpdOptimal } from '../features/config/viewmodels/vpd-targets-tab.viewmodel';

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

describe('_getEntities cache', () => {
  it('reuses a filtered result until the Home Assistant state snapshot changes', () => {
    const el = makeEl();
    let scans = 0;
    const trackScans = {
      ownKeys(target: Record<string, unknown>) {
        scans += 1;
        return Reflect.ownKeys(target);
      },
    };
    const states = new Proxy(
      {
        'sensor.temperature': {
          state: '24',
          attributes: { device_class: 'temperature' },
        },
      },
      trackScans
    );
    el.hass = { states, services: {} } as any;

    const first = (el as any)._getEntities(['sensor'], 'temperature');
    const second = (el as any)._getEntities(['sensor'], 'temperature');

    expect(second).toBe(first);
    expect(scans).toBe(1);

    el.hass = {
      states: new Proxy(
        {
          'sensor.temperature': {
            state: '25',
            attributes: { device_class: 'temperature' },
          },
        },
        trackScans
      ),
      services: {},
    } as any;
    (el as any)._getEntities(['sensor'], 'temperature');
    expect(scans).toBe(2);
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

// ─── seed from device: irrigation tanks mapping ──────────────────────────────

describe('_seedFromDevice irrigation tanks mapping', () => {
  it('maps tanks array and fills missing fields with defaults', () => {
    const el = makeEl();
    (el as any)._seedFromDevice({
      deviceId: 'gs1',
      environmentAttributes: {
        irrigationTanks: [
          { sensorEntity: 'sensor.tank1', name: 'Main Tank', volumeLiters: 50, warningLevel: 20 },
          { sensorEntity: 'sensor.tank2' },
        ],
      },
    } as any);
    const tanks = (el as any)._sm.environmentDraft.irrigationTanks;
    expect(tanks).toHaveLength(2);
    expect(tanks[0]).toEqual({ sensorEntity: 'sensor.tank1', name: 'Main Tank', volumeLiters: 50, warningLevel: 20 });
    expect(tanks[1]).toEqual({ sensorEntity: 'sensor.tank2', name: 'Tank', volumeLiters: null, warningLevel: 30 });
  });
});

// ─── seed from device: AC Infinity devices ───────────────────────────────────

describe('_seedFromDevice AC Infinity devices', () => {
  it('seeds exhaust AC Infinity devices from the device into the draft', () => {
    const el = makeEl();
    const device = {
      mode_entity: 'select.sog_exhaust_aktiver_modus',
      speed_entity: 'number.sog_exhaust_einschaltleistung',
      on_speed: 10,
    };
    (el as any)._seedFromDevice({
      deviceId: 'gs1',
      environmentAttributes: { exhaustFanAcInfinityDevices: [device] },
    } as any);
    const draft = (el as any)._sm.environmentDraft;
    expect(draft.exhaustFanAcInfinityDevices).toEqual([device]);
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
  // restoreAllMocks does not unstub globals, so a failing assertion below would
  // otherwise leak the stubbed crypto into the rest of the file.
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('_startAddTimedNotification transitions sub to adding', () => {
    const el = makeEl();
    (el as any)._startAddTimedNotification();
    expect((el as any)._sm.tabs.notifications.sub.kind).toBe('adding');
  });

  it('_commitAddTimedNotification adds the notification with a generated id', () => {
    const el = makeEl();
    (el as any)._startAddTimedNotification();
    (el as any)._commitAddTimedNotification();

    const tab = (el as any)._sm.tabs.notifications;
    expect(tab.timedNotifications).toHaveLength(1);
    expect(tab.timedNotifications[0].id).toBeTruthy();
  });

  it('_commitAddTimedNotification works without crypto.randomUUID (insecure context)', () => {
    // HA over plain HTTP is not a secure context, so crypto.randomUUID is undefined
    // there. Calling it threw, so the notification never entered the SM and nothing
    // was ever saved or shown on reopen.
    const realGetRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
    vi.stubGlobal('crypto', { getRandomValues: realGetRandomValues });

    const el = makeEl();
    (el as any)._startAddTimedNotification();
    (el as any)._commitAddTimedNotification();

    const tab = (el as any)._sm.tabs.notifications;
    expect(tab.timedNotifications).toHaveLength(1);
    expect(tab.timedNotifications[0].id).toBeTruthy();
  });
});

describe('timed notifications — edit flow', () => {
  it('_startEditTimedNotification transitions sub to editing with pre-populated draft', () => {
    const el = makeEl();
    const draft = { message: 'Check roots', triggerType: 'veg' as const, day: 7, growspaceIds: ['gs1'] };
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
          timedNotifications: [{ id: 'notif-1', message: 'msg', triggerType: 'veg', day: 3, growspaceIds: [] }],
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

describe('_submitNotifications — timed notifications persistence', () => {
  it('includes the timed notifications (snake_case) in the save payload', () => {
    const el = makeEl();
    (el as any)._sm = {
      ...(el as any)._sm,
      tabs: {
        ...(el as any)._sm.tabs,
        notifications: {
          draft: (el as any)._sm.tabs.notifications.draft,
          timedNotifications: [
            { id: 'notif-1', message: 'Feed me', triggerType: 'veg', day: 3, growspaceIds: ['gs-1'] },
          ],
          sub: { kind: 'idle' },
        },
      },
    };

    let detail: any;
    el.addEventListener('save-notification-settings-submit', (e: Event) => {
      detail = (e as CustomEvent).detail;
    });

    (el as any)._submitNotifications();

    // trigger_type must be a bare stage so the backend firing path
    // (calculate_days_in_stage) resolves it; 'veg' never fires.
    expect(detail.timed_notifications).toEqual([
      { id: 'notif-1', message: 'Feed me', trigger_type: 'veg', day: 3, growspace_ids: ['gs-1'] },
    ]);
  });

  it('writes an unrecognised trigger back verbatim instead of rewriting it', () => {
    const el = makeEl();
    (el as any)._sm = {
      ...(el as any)._sm,
      tabs: {
        ...(el as any)._sm.tabs,
        notifications: {
          draft: (el as any)._sm.tabs.notifications.draft,
          timedNotifications: [
            {
              id: 'notif-1',
              message: 'Odd one',
              triggerType: { raw: 'days_since_germination' },
              day: 3,
              growspaceIds: ['gs-1'],
            },
          ],
          sub: { kind: 'idle' },
        },
      },
    };

    let detail: any;
    el.addEventListener('save-notification-settings-submit', (e: Event) => {
      detail = (e as CustomEvent).detail;
    });

    (el as any)._submitNotifications();

    expect(detail.timed_notifications).toEqual([
      {
        id: 'notif-1',
        message: 'Odd one',
        trigger_type: 'days_since_germination',
        day: 3,
        growspace_ids: ['gs-1'],
      },
    ]);
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

// ─── VPD optimal targets (inlined from vpd-optimal-overrides-table) ───────────

describe('_getVpdOptimalValue', () => {
  // The read logic moved to the VPD Targets VM (ADR-0019); assert it at its new
  // home (getVpdOptimal) against the dialog's live draft.
  it('returns the built-in default when the stage has no override', () => {
    const el = makeEl();
    const overrides = (el as any)._sm.environmentDraft.vpdOptimalOverrides;
    expect(getVpdOptimal(overrides, 'seedling', 'day', 'low')).toBe(
      VPD_OPTIMAL_STAGE_DEFAULTS.seedling.day.low
    );
  });

  it('returns the override value when the stage is overridden', () => {
    const el = makeEl();
    (el as any)._t({
      type: 'UPDATE_ENV_DRAFT',
      partial: {
        vpdOptimalOverrides: { veg: { day: { low: 0.6, high: 1.0 }, night: { low: 0.5, high: 0.9 } } },
      },
    });
    const overrides = (el as any)._sm.environmentDraft.vpdOptimalOverrides;
    expect(getVpdOptimal(overrides, 'veg', 'day', 'low')).toBe(0.6);
    expect(getVpdOptimal(overrides, 'veg', 'night', 'high')).toBe(0.9);
  });
});

describe('_updateVpdOptimal', () => {
  it('writes the edited slot into the draft as a full stage entry', () => {
    const el = makeEl();
    (el as any)._updateVpdOptimal('seedling', 'day', 'low', '0.5');
    const overrides = (el as any)._sm.environmentDraft.vpdOptimalOverrides;
    expect(overrides.seedling.day.low).toBe(0.5);
    // the rest of the stage is seeded from defaults
    expect(overrides.seedling.day.high).toBe(VPD_OPTIMAL_STAGE_DEFAULTS.seedling.day.high);
    expect(overrides.seedling.night).toEqual(VPD_OPTIMAL_STAGE_DEFAULTS.seedling.night);
  });

  it('preserves existing overrides for other stages', () => {
    const el = makeEl();
    (el as any)._t({
      type: 'UPDATE_ENV_DRAFT',
      partial: {
        vpdOptimalOverrides: { veg: { day: { low: 0.6, high: 1.0 }, night: { low: 0.5, high: 0.9 } } },
      },
    });
    (el as any)._updateVpdOptimal('seedling', 'day', 'low', '0.5');
    const overrides = (el as any)._sm.environmentDraft.vpdOptimalOverrides;
    expect(overrides.veg).toEqual({ day: { low: 0.6, high: 1.0 }, night: { low: 0.5, high: 0.9 } });
    expect(overrides.seedling.day.low).toBe(0.5);
  });

  it('snaps a cleared slot to its default while preserving sibling slots', () => {
    const el = makeEl();
    (el as any)._t({
      type: 'UPDATE_ENV_DRAFT',
      partial: {
        vpdOptimalOverrides: { veg: { day: { low: 0.6, high: 1.0 }, night: { low: 0.5, high: 0.9 } } },
      },
    });
    (el as any)._updateVpdOptimal('veg', 'day', 'low', '');
    const veg = (el as any)._sm.environmentDraft.vpdOptimalOverrides.veg;
    expect(veg.day.low).toBe(VPD_OPTIMAL_STAGE_DEFAULTS.veg.day.low);
    expect(veg.day.high).toBe(1.0);
    expect(veg.night).toEqual({ low: 0.5, high: 0.9 });
  });
});

describe('_resetVpdOptimal', () => {
  it('clears all VPD optimal overrides back to an empty dict', () => {
    const el = makeEl();
    (el as any)._t({
      type: 'UPDATE_ENV_DRAFT',
      partial: {
        vpdOptimalOverrides: {
          veg: { day: { low: 0.6, high: 1.0 }, night: { low: 0.5, high: 0.9 } },
          seedling: { day: { low: 0.5, high: 0.9 }, night: { low: 0.5, high: 0.9 } },
        },
      },
    });
    (el as any)._resetVpdOptimal();
    expect((el as any)._sm.environmentDraft.vpdOptimalOverrides).toEqual({});
  });
});

describe('_getEntities — platform filter', () => {
  function hassWith(): any {
    return {
      states: {
        'select.aci_mode': { attributes: {} },
        'select.zha_mode': { attributes: {} },
        'number.aci_speed': { attributes: {} },
      },
      entities: {
        'select.aci_mode': { platform: 'ac_infinity' },
        'select.zha_mode': { platform: 'zha' },
        'number.aci_speed': { platform: 'ac_infinity' },
      },
    };
  }

  it('keeps only entities whose registry platform matches when a platform is given', () => {
    const el = makeEl();
    el.hass = hassWith();
    expect((el as any)._getEntities(['select'], null, 'ac_infinity')).toEqual(['select.aci_mode']);
  });

  it('ignores platform (returns all matching domains) when none is given', () => {
    const el = makeEl();
    el.hass = hassWith();
    expect((el as any)._getEntities(['select'], null)).toEqual(['select.aci_mode', 'select.zha_mode']);
  });

  it('excludes entities missing from the registry when a platform is required', () => {
    const el = makeEl();
    const hass = hassWith();
    delete hass.entities['select.aci_mode'];
    el.hass = hass;
    expect((el as any)._getEntities(['select'], null, 'ac_infinity')).toEqual([]);
  });

  it('forwards the ac_infinity platform from the Climate tab deps down to _getEntities', () => {
    const el = makeEl();
    el.hass = { states: {}, entities: {} } as any;
    const spy = vi.spyOn(el as any, '_getEntities');
    (el as any)._renderClimateTab();
    expect(spy).toHaveBeenCalledWith(['select'], null, 'ac_infinity');
    expect(spy).toHaveBeenCalledWith(['number'], null, 'ac_infinity');
  });

  it('forwards the ac_infinity platform from the Humidity tab deps down to _getEntities', () => {
    const el = makeEl();
    el.hass = { states: {}, entities: {} } as any;
    const spy = vi.spyOn(el as any, '_getEntities');
    (el as any)._renderHumidityTab();
    expect(spy).toHaveBeenCalledWith(['select'], null, 'ac_infinity');
    expect(spy).toHaveBeenCalledWith(['number'], null, 'ac_infinity');
  });
});

describe('Port Pre-fill — pick handler', () => {
  // A port device (dev1) exposing a full mode + speed pair, and a mode-only
  // device (dev2) whose speed number is disabled (absent from the registry).
  function hassWithPorts(): any {
    return {
      states: {},
      entities: {
        'select.p1_mode': {
          platform: 'ac_infinity',
          device_id: 'dev1',
          translation_key: 'active_mode',
        },
        'number.p1_power': {
          platform: 'ac_infinity',
          device_id: 'dev1',
          translation_key: 'on_power',
        },
        'select.p2_mode': {
          platform: 'ac_infinity',
          device_id: 'dev2',
          translation_key: 'active_mode',
        },
      },
      devices: {
        dev1: { name_by_user: 'Tent Port 1' },
        dev2: { name: 'Tent Port 2' },
      },
    };
  }

  function withPort(el: ConfigDialog): void {
    (el as any)._seedFromDevice({
      deviceId: 'gs1',
      environmentAttributes: {
        exhaustFanAcInfinityDevices: [{ mode_entity: '', speed_entity: '', on_speed: 7 }],
      },
    } as any);
  }

  it('lists the pickable port devices labeled by device name, sorted', () => {
    const el = makeEl();
    el.hass = hassWithPorts();
    expect((el as any)._acInfinityPortDevices()).toEqual([
      { id: 'dev1', label: 'Tent Port 1' },
      { id: 'dev2', label: 'Tent Port 2' },
    ]);
  });

  it('fills mode + speed from the picked device and preserves on_speed, no warning', () => {
    const el = makeEl();
    el.hass = hassWithPorts();
    withPort(el);
    (el as any)._pickAcInfinityPort('exhaustFanAcInfinityDevices', 0, 'dev1');
    const draft = (el as any)._sm.environmentDraft;
    expect(draft.exhaustFanAcInfinityDevices[0]).toEqual({
      mode_entity: 'select.p1_mode',
      speed_entity: 'number.p1_power',
      on_speed: 7,
    });
    expect((el as any)._acInfinityPrefillWarnings['exhaustFanAcInfinityDevices:0']).toEqual([]);
  });

  it('clears the unresolved speed role and warns when the device lacks it', () => {
    const el = makeEl();
    el.hass = hassWithPorts();
    withPort(el);
    (el as any)._pickAcInfinityPort('exhaustFanAcInfinityDevices', 0, 'dev2');
    const draft = (el as any)._sm.environmentDraft;
    expect(draft.exhaustFanAcInfinityDevices[0]).toEqual({
      mode_entity: 'select.p2_mode',
      speed_entity: '',
      on_speed: 7,
    });
    expect((el as any)._acInfinityPrefillWarnings['exhaustFanAcInfinityDevices:0']).toEqual([
      'Speed',
    ]);
  });

  it('leaves a configured bundle untouched when the blank option is selected', () => {
    const el = makeEl();
    el.hass = hassWithPorts();
    (el as any)._seedFromDevice({
      deviceId: 'gs1',
      environmentAttributes: {
        exhaustFanAcInfinityDevices: [
          { mode_entity: 'select.p1_mode', speed_entity: 'number.p1_power', on_speed: 7 },
        ],
      },
    } as any);
    (el as any)._pickAcInfinityPort('exhaustFanAcInfinityDevices', 0, '');
    const draft = (el as any)._sm.environmentDraft;
    expect(draft.exhaustFanAcInfinityDevices[0]).toEqual({
      mode_entity: 'select.p1_mode',
      speed_entity: 'number.p1_power',
      on_speed: 7,
    });
    expect((el as any)._acInfinityPrefillWarnings['exhaustFanAcInfinityDevices:0']).toBeUndefined();
  });

  it('drops the port warning once the bundle is edited manually', () => {
    const el = makeEl();
    el.hass = hassWithPorts();
    withPort(el);
    (el as any)._pickAcInfinityPort('exhaustFanAcInfinityDevices', 0, 'dev2');
    expect((el as any)._acInfinityPrefillWarnings['exhaustFanAcInfinityDevices:0']).toEqual([
      'Speed',
    ]);
    (el as any)._setEnv({
      exhaustFanAcInfinityDevices: [{ mode_entity: 'select.p2_mode', speed_entity: 'number.x', on_speed: 7 }],
    });
    expect((el as any)._acInfinityPrefillWarnings['exhaustFanAcInfinityDevices:0']).toBeUndefined();
  });
});

describe('Port Pre-fill — grow light six-role fill', () => {
  // dev1 exposes all six grow-light roles; dev2 lacks the two sunrise entities.
  function hassWithGrowLightPorts(): any {
    return {
      states: {},
      entities: {
        'select.g1_mode': { platform: 'ac_infinity', device_id: 'dev1', translation_key: 'active_mode' },
        'time.g1_on': { platform: 'ac_infinity', device_id: 'dev1', translation_key: 'schedule_mode_on_time' },
        'time.g1_off': { platform: 'ac_infinity', device_id: 'dev1', translation_key: 'schedule_mode_off_time' },
        'number.g1_power': { platform: 'ac_infinity', device_id: 'dev1', translation_key: 'on_power' },
        'switch.g1_sunrise': { platform: 'ac_infinity', device_id: 'dev1', translation_key: 'sunrise_timer_enabled' },
        'number.g1_sunrise_min': { platform: 'ac_infinity', device_id: 'dev1', translation_key: 'sunrise_timer_minutes' },
        'select.g2_mode': { platform: 'ac_infinity', device_id: 'dev2', translation_key: 'active_mode' },
        'time.g2_on': { platform: 'ac_infinity', device_id: 'dev2', translation_key: 'schedule_mode_on_time' },
        'time.g2_off': { platform: 'ac_infinity', device_id: 'dev2', translation_key: 'schedule_mode_off_time' },
        'number.g2_power': { platform: 'ac_infinity', device_id: 'dev2', translation_key: 'on_power' },
      },
      devices: { dev1: { name: 'Light Port 1' }, dev2: { name: 'Light Port 2' } },
    };
  }

  const blankGrowLight = () => ({
    mode_entity: '',
    on_time_entity: '',
    off_time_entity: '',
    power_entity: '',
    sunrise_switch_entity: '',
    sunrise_duration_entity: '',
  });

  function withGrowLightPort(el: ConfigDialog): void {
    (el as any)._seedFromDevice({
      deviceId: 'gs1',
      environmentAttributes: { growlightAcInfinityDevices: [blankGrowLight()] },
    } as any);
  }

  it('fills all six roles from one pick, no warning', () => {
    const el = makeEl();
    el.hass = hassWithGrowLightPorts();
    withGrowLightPort(el);
    (el as any)._pickAcInfinityPort('growlightAcInfinityDevices', 0, 'dev1');
    const draft = (el as any)._sm.environmentDraft;
    expect(draft.growlightAcInfinityDevices[0]).toEqual({
      mode_entity: 'select.g1_mode',
      on_time_entity: 'time.g1_on',
      off_time_entity: 'time.g1_off',
      power_entity: 'number.g1_power',
      sunrise_switch_entity: 'switch.g1_sunrise',
      sunrise_duration_entity: 'number.g1_sunrise_min',
    });
    expect((el as any)._acInfinityPrefillWarnings['growlightAcInfinityDevices:0']).toEqual([]);
  });

  it('clears unresolved sunrise roles and warns, bundle still saveable', () => {
    const el = makeEl();
    el.hass = hassWithGrowLightPorts();
    withGrowLightPort(el);
    (el as any)._pickAcInfinityPort('growlightAcInfinityDevices', 0, 'dev2');
    const draft = (el as any)._sm.environmentDraft;
    expect(draft.growlightAcInfinityDevices[0]).toEqual({
      mode_entity: 'select.g2_mode',
      on_time_entity: 'time.g2_on',
      off_time_entity: 'time.g2_off',
      power_entity: 'number.g2_power',
      sunrise_switch_entity: '',
      sunrise_duration_entity: '',
    });
    expect((el as any)._acInfinityPrefillWarnings['growlightAcInfinityDevices:0']).toEqual([
      'Sunrise switch',
      'Sunrise duration',
    ]);
  });
});
