/**
 * Unit tests for the Irrigation Dialog State Machine.
 *
 * These tests exercise pure transition functions — no DOM, no Lit component mounting.
 * All legal state transitions are covered per AC#5 of issue #126.
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialSM,
  transition,
  requestTabSwitch,
  discardAndSwitch,
  isSchedulesDirty,
  isSteeringDirty,
  isConfigDirty,
  isDrainEcDirty,
  isEcTargetsDirty,
  isActiveTabDirty,
  type DialogSM,
  type TabId,
} from './irrigation-dialog-sm';
import { createGrowspaceDevice } from '../services/types';

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeDevice(overrides: Partial<Parameters<typeof createGrowspaceDevice>[0]> = {}) {
  return createGrowspaceDevice({ deviceId: 'gs1', name: 'Tent 1', ...overrides });
}

// ─── createInitialSM ─────────────────────────────────────────────────────────

describe('createInitialSM', () => {
  it('creates SM with schedules as the default active tab', () => {
    const sm = createInitialSM();
    expect(sm.activeTab).toBe('schedules');
  });

  it('creates SM with idle status', () => {
    const sm = createInitialSM();
    expect(sm.status.kind).toBe('idle');
  });

  it('creates SM with no toast', () => {
    const sm = createInitialSM();
    expect(sm.toast).toBeUndefined();
  });

  it('creates SM with all tabs in idle sub-state', () => {
    const sm = createInitialSM();
    expect(sm.tabs.schedules.sub.kind).toBe('idle');
    expect(sm.tabs.steering.sub.kind).toBe('idle');
    expect(sm.tabs.config.sub.kind).toBe('idle');
    expect(sm.tabs.tanks.sub.kind).toBe('idle');
    expect(sm.tabs.water_analytics.sub.kind).toBe('idle');
    expect(sm.tabs.drain_ec.sub.kind).toBe('idle');
    expect(sm.tabs.ec_targets.sub.kind).toBe('idle');
  });

  it('seeds schedules draft from device irrigationConfig', () => {
    const device = makeDevice();
    // createGrowspaceDevice sets irrigationConfig.irrigationPumpEntity
    // Default is empty; override via the raw device approach would need deep fixture
    const sm = createInitialSM(device);
    // Should at minimum initialize without throwing
    expect(sm.tabs.schedules.draft).toBeDefined();
    expect(sm.tabs.schedules.draft.irrigationDuration).toBe(60);
  });

  it('seeds steering phase from device activeSteeringPhase', () => {
    const device = makeDevice();
    const sm = createInitialSM(device);
    // Default phase when device has no activeSteeringPhase set
    expect(['p1', 'p2', 'p3']).toContain(sm.tabs.steering.phase);
  });

  it('seeds water_analytics stageAggregates as null', () => {
    const sm = createInitialSM();
    expect(sm.tabs.water_analytics.stageAggregates).toBeNull();
  });
});

// ─── Navigation transitions ───────────────────────────────────────────────────

describe('SWITCH_TAB', () => {
  it('switches to the requested tab', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'SWITCH_TAB', tab: 'steering' });
    expect(next.activeTab).toBe('steering');
  });

  it('returns status to idle', () => {
    const sm: DialogSM = {
      ...createInitialSM(),
      status: { kind: 'confirm-discard', pendingTab: 'config' },
    };
    const next = transition(sm, { type: 'SWITCH_TAB', tab: 'config' });
    expect(next.status.kind).toBe('idle');
  });

  it('clears schedules inline editing state when switching away', () => {
    const sm = transition(createInitialSM(), {
      type: 'BEGIN_ADD_IRRIGATION',
      time: '08:00:00',
      duration: 60,
    });
    expect(sm.tabs.schedules.sub.kind).toBe('adding-irrigation');

    const next = transition(sm, { type: 'SWITCH_TAB', tab: 'steering' });
    expect(next.tabs.schedules.sub.kind).toBe('idle');
  });

  it('does not mutate the input SM', () => {
    const sm = createInitialSM();
    transition(sm, { type: 'SWITCH_TAB', tab: 'steering' });
    expect(sm.activeTab).toBe('schedules');
  });
});

describe('REQUEST_TAB', () => {
  it('enters confirm-discard state with the pending tab', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'REQUEST_TAB', tab: 'config' });
    expect(next.status.kind).toBe('confirm-discard');
    if (next.status.kind === 'confirm-discard') {
      expect(next.status.pendingTab).toBe('config');
    }
  });

  it('does not change the active tab', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'REQUEST_TAB', tab: 'config' });
    expect(next.activeTab).toBe('schedules');
  });
});

describe('CANCEL_TAB_SWITCH', () => {
  it('returns status to idle without changing active tab', () => {
    const sm = transition(createInitialSM(), { type: 'REQUEST_TAB', tab: 'config' });
    const next = transition(sm, { type: 'CANCEL_TAB_SWITCH' });
    expect(next.status.kind).toBe('idle');
    expect(next.activeTab).toBe('schedules');
  });
});

describe('DISCARD_AND_SWITCH (via discardAndSwitch helper)', () => {
  it('switches to the pending tab', () => {
    const device = makeDevice();
    const sm = transition(createInitialSM(device), { type: 'REQUEST_TAB', tab: 'steering' });
    const next = discardAndSwitch(sm, device);
    expect(next.activeTab).toBe('steering');
  });

  it('resets status to idle', () => {
    const device = makeDevice();
    const sm = transition(createInitialSM(device), { type: 'REQUEST_TAB', tab: 'steering' });
    const next = discardAndSwitch(sm, device);
    expect(next.status.kind).toBe('idle');
  });

  it('resets schedules draft to device values', () => {
    const device = makeDevice();
    let sm = createInitialSM(device);
    // Dirty the schedules draft
    sm = transition(sm, {
      type: 'UPDATE_SCHEDULES_DRAFT',
      partial: { irrigationPumpEntity: 'sensor.custom' },
    });
    expect(sm.tabs.schedules.draft.irrigationPumpEntity).toBe('sensor.custom');

    // Request switch to steering
    sm = transition(sm, { type: 'REQUEST_TAB', tab: 'steering' });
    const next = discardAndSwitch(sm, device);

    // Draft should be reset to device values (empty string since device default)
    expect(next.tabs.schedules.draft.irrigationPumpEntity).toBe(
      device.irrigationConfig?.irrigationPumpEntity ?? ''
    );
  });

  it('is a no-op if status is not confirm-discard', () => {
    const device = makeDevice();
    const sm = createInitialSM(device);
    const next = discardAndSwitch(sm, device);
    expect(next).toBe(sm); // same reference
  });

  it('resets steering draft to device values', () => {
    const device = makeDevice({
      irrigationStrategy: {
        enabled: true,
        lightsOnTime: '06:00:00',
        p0DurationMinutes: 60,
        p2StopBeforeLightsOffMinutes: 120,
        targetVwcPercent: 45.0,
        maintenanceDrybackPercent: 3.0,
        shotDurationSeconds: 15,
        shotIntervalMinutes: 15,
        autoLightTracking: false,
        detectedLightsOnTime: null,
      },
    });
    let sm = createInitialSM(device);
    sm = transition(sm, { type: 'SWITCH_TAB', tab: 'steering' });
    sm = transition(sm, {
      type: 'UPDATE_STEERING_DRAFT',
      partial: { lightsOnTime: '08:00:00' },
    });
    sm = transition(sm, { type: 'REQUEST_TAB', tab: 'schedules' });

    const next = discardAndSwitch(sm, device);
    expect(next.activeTab).toBe('schedules');
    expect(next.tabs.steering.draft.lightsOnTime).toBe('06:00:00');
  });

  it('resets config draft to device values', () => {
    const device = makeDevice({
      irrigationConfig: {
        irrigationTimes: [],
        drainTimes: [],
        skipDuringDark: false,
      },
    });
    let sm = createInitialSM(device);
    sm = transition(sm, { type: 'SWITCH_TAB', tab: 'config' });
    sm = transition(sm, {
      type: 'UPDATE_CONFIG_DRAFT',
      partial: { skipDuringDark: true },
    });
    sm = transition(sm, { type: 'REQUEST_TAB', tab: 'schedules' });

    const next = discardAndSwitch(sm, device);
    expect(next.activeTab).toBe('schedules');
    expect(next.tabs.config.draft.skipDuringDark).toBe(false);
  });

  it('resets drain_ec draft to device values', () => {
    const device = makeDevice({
      drainConfig: {
        enabled: true,
        maxEcDelta: 1.5,
        targetRunoffPercent: 25,
        readings: [],
      },
    });
    let sm = createInitialSM(device);
    sm = transition(sm, { type: 'SWITCH_TAB', tab: 'drain_ec' });
    sm = transition(sm, {
      type: 'UPDATE_DRAIN_EC_DRAFT',
      partial: { maxEcDelta: 3.0 },
    });
    sm = transition(sm, { type: 'REQUEST_TAB', tab: 'schedules' });

    const next = discardAndSwitch(sm, device);
    expect(next.activeTab).toBe('schedules');
    expect(next.tabs.drain_ec.draft.maxEcDelta).toBe(1.5);
  });

  it('resets ec_targets draft to device values (when device has ranges)', () => {
    const device = makeDevice({
      irrigationConfig: {
        irrigationTimes: [],
        drainTimes: [],
        ecTargetRanges: [
          { stage: 'seedling', minEc: 1.0, maxEc: 1.5 },
          { stage: 'veg', minEc: 1.5, maxEc: 2.0 },
          { stage: 'flower_early', minEc: 2.0, maxEc: 2.5 },
          { stage: 'flower_mid', minEc: 2.5, maxEc: 3.0 },
          { stage: 'flower_late', minEc: 2.0, maxEc: 2.5 },
        ],
      },
    });
    let sm = createInitialSM(device);
    sm = transition(sm, { type: 'SWITCH_TAB', tab: 'ec_targets' });
    sm = transition(sm, {
      type: 'UPDATE_EC_TARGETS_DRAFT',
      ranges: [
        { stage: 'seedling', minEc: 9.9, maxEc: 9.9 },
        { stage: 'veg', minEc: 1.5, maxEc: 2.0 },
        { stage: 'flower_early', minEc: 2.0, maxEc: 2.5 },
        { stage: 'flower_mid', minEc: 2.5, maxEc: 3.0 },
        { stage: 'flower_late', minEc: 2.0, maxEc: 2.5 },
      ],
    });
    sm = transition(sm, { type: 'REQUEST_TAB', tab: 'schedules' });

    const next = discardAndSwitch(sm, device);
    expect(next.activeTab).toBe('schedules');
    expect(next.tabs.ec_targets.draft[0].minEc).toBe(1.0);
  });

  it('resets ec_targets draft to default values (when device has no ranges)', () => {
    const device = makeDevice();
    let sm = createInitialSM(device);
    sm = transition(sm, { type: 'SWITCH_TAB', tab: 'ec_targets' });
    sm = transition(sm, {
      type: 'UPDATE_EC_TARGETS_DRAFT',
      ranges: [
        { stage: 'seedling', minEc: 9.9, maxEc: 9.9 },
        { stage: 'veg', minEc: 0, maxEc: 0 },
        { stage: 'flower_early', minEc: 0, maxEc: 0 },
        { stage: 'flower_mid', minEc: 0, maxEc: 0 },
        { stage: 'flower_late', minEc: 0, maxEc: 0 },
      ],
    });
    sm = transition(sm, { type: 'REQUEST_TAB', tab: 'schedules' });

    const next = discardAndSwitch(sm, device);
    expect(next.activeTab).toBe('schedules');
    expect(next.tabs.ec_targets.draft[0].minEc).toBe(0);
  });

  it('resetActiveTabDraft returns current tabs when activeTab is unknown/default', () => {
    const device = makeDevice();
    let sm = createInitialSM(device);
    sm = { ...sm, activeTab: 'invalid_tab' as any, status: { kind: 'confirm-discard', pendingTab: 'schedules' } };
    const next = discardAndSwitch(sm, device);
    expect(next.tabs).toBe(sm.tabs);
  });
});

describe('requestTabSwitch helper', () => {
  it('switches directly when the active tab is clean', () => {
    const device = makeDevice();
    const sm = createInitialSM(device);
    const next = requestTabSwitch(sm, 'steering', device);
    expect(next.activeTab).toBe('steering');
    expect(next.status.kind).toBe('idle');
  });

  it('enters confirm-discard when the active tab is dirty', () => {
    const device = makeDevice();
    let sm = createInitialSM(device);
    sm = transition(sm, {
      type: 'UPDATE_SCHEDULES_DRAFT',
      partial: { irrigationPumpEntity: 'sensor.something' },
    });
    const next = requestTabSwitch(sm, 'steering', device);
    expect(next.status.kind).toBe('confirm-discard');
    expect(next.activeTab).toBe('schedules');
  });

  it('is a no-op when switching to the already-active tab', () => {
    const device = makeDevice();
    const sm = createInitialSM(device);
    const next = requestTabSwitch(sm, 'schedules', device);
    expect(next).toBe(sm);
  });
});

// ─── Schedules sub-states ────────────────────────────────────────────────────

describe('BEGIN_ADD_IRRIGATION', () => {
  it('enters adding-irrigation sub-state with provided time and duration', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'BEGIN_ADD_IRRIGATION', time: '08:00:00', duration: 30 });
    expect(next.tabs.schedules.sub.kind).toBe('adding-irrigation');
    if (next.tabs.schedules.sub.kind === 'adding-irrigation') {
      expect(next.tabs.schedules.sub.time).toBe('08:00:00');
      expect(next.tabs.schedules.sub.duration).toBe(30);
    }
  });
});

describe('BEGIN_ADD_DRAIN', () => {
  it('enters adding-drain sub-state', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'BEGIN_ADD_DRAIN', time: '10:00:00', duration: 45 });
    expect(next.tabs.schedules.sub.kind).toBe('adding-drain');
    if (next.tabs.schedules.sub.kind === 'adding-drain') {
      expect(next.tabs.schedules.sub.time).toBe('10:00:00');
      expect(next.tabs.schedules.sub.duration).toBe(45);
    }
  });
});

describe('BEGIN_EDIT_IRRIGATION', () => {
  it('enters editing-irrigation sub-state with original and draft values', () => {
    const sm = createInitialSM();
    const next = transition(sm, {
      type: 'BEGIN_EDIT_IRRIGATION',
      originalTime: '06:00:00',
      originalDuration: 60,
      time: '06:00:00',
      duration: 60,
    });
    expect(next.tabs.schedules.sub.kind).toBe('editing-irrigation');
    if (next.tabs.schedules.sub.kind === 'editing-irrigation') {
      expect(next.tabs.schedules.sub.originalTime).toBe('06:00:00');
      expect(next.tabs.schedules.sub.originalDuration).toBe(60);
    }
  });
});

describe('BEGIN_EDIT_DRAIN', () => {
  it('enters editing-drain sub-state', () => {
    const sm = createInitialSM();
    const next = transition(sm, {
      type: 'BEGIN_EDIT_DRAIN',
      originalTime: '09:00:00',
      originalDuration: 30,
      time: '09:00:00',
      duration: 30,
    });
    expect(next.tabs.schedules.sub.kind).toBe('editing-drain');
  });
});

describe('CANCEL_INLINE', () => {
  it('returns schedules to idle sub-state from adding-irrigation', () => {
    const sm = transition(createInitialSM(), {
      type: 'BEGIN_ADD_IRRIGATION',
      time: '08:00:00',
      duration: 30,
    });
    const next = transition(sm, { type: 'CANCEL_INLINE' });
    expect(next.tabs.schedules.sub.kind).toBe('idle');
  });

  it('returns schedules to idle sub-state from editing-drain', () => {
    const sm = transition(createInitialSM(), {
      type: 'BEGIN_EDIT_DRAIN',
      originalTime: '09:00:00',
      originalDuration: 30,
      time: '09:00:00',
      duration: 30,
    });
    const next = transition(sm, { type: 'CANCEL_INLINE' });
    expect(next.tabs.schedules.sub.kind).toBe('idle');
  });
});

describe('UPDATE_ADD_IRRIGATION', () => {
  it('updates time on the adding-irrigation sub-state', () => {
    const sm = transition(createInitialSM(), {
      type: 'BEGIN_ADD_IRRIGATION',
      time: '08:00:00',
      duration: 30,
    });
    const next = transition(sm, { type: 'UPDATE_ADD_IRRIGATION', time: '09:00:00' });
    if (next.tabs.schedules.sub.kind === 'adding-irrigation') {
      expect(next.tabs.schedules.sub.time).toBe('09:00:00');
      expect(next.tabs.schedules.sub.duration).toBe(30); // unchanged
    } else {
      throw new Error('Expected adding-irrigation sub-state');
    }
  });

  it('updates duration on the adding-irrigation sub-state', () => {
    const sm = transition(createInitialSM(), {
      type: 'BEGIN_ADD_IRRIGATION',
      time: '08:00:00',
      duration: 30,
    });
    const next = transition(sm, { type: 'UPDATE_ADD_IRRIGATION', duration: 45 });
    if (next.tabs.schedules.sub.kind === 'adding-irrigation') {
      expect(next.tabs.schedules.sub.time).toBe('08:00:00');
      expect(next.tabs.schedules.sub.duration).toBe(45);
    } else {
      throw new Error('Expected adding-irrigation sub-state');
    }
  });

  it('updates both time and duration on the adding-irrigation sub-state', () => {
    const sm = transition(createInitialSM(), {
      type: 'BEGIN_ADD_IRRIGATION',
      time: '08:00:00',
      duration: 30,
    });
    const next = transition(sm, { type: 'UPDATE_ADD_IRRIGATION', time: '09:00:00', duration: 45 });
    if (next.tabs.schedules.sub.kind === 'adding-irrigation') {
      expect(next.tabs.schedules.sub.time).toBe('09:00:00');
      expect(next.tabs.schedules.sub.duration).toBe(45);
    } else {
      throw new Error('Expected adding-irrigation sub-state');
    }
  });

  it('is a no-op when not in adding-irrigation state', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'UPDATE_ADD_IRRIGATION', time: '09:00:00' });
    expect(next).toBe(sm);
  });
});

describe('UPDATE_ADD_DRAIN', () => {
  it('updates duration on the adding-drain sub-state', () => {
    const sm = transition(createInitialSM(), {
      type: 'BEGIN_ADD_DRAIN',
      time: '10:00:00',
      duration: 45,
    });
    const next = transition(sm, { type: 'UPDATE_ADD_DRAIN', duration: 60 });
    if (next.tabs.schedules.sub.kind === 'adding-drain') {
      expect(next.tabs.schedules.sub.duration).toBe(60);
      expect(next.tabs.schedules.sub.time).toBe('10:00:00');
    } else {
      throw new Error('Expected adding-drain sub-state');
    }
  });

  it('updates time on the adding-drain sub-state', () => {
    const sm = transition(createInitialSM(), {
      type: 'BEGIN_ADD_DRAIN',
      time: '10:00:00',
      duration: 45,
    });
    const next = transition(sm, { type: 'UPDATE_ADD_DRAIN', time: '11:00:00' });
    if (next.tabs.schedules.sub.kind === 'adding-drain') {
      expect(next.tabs.schedules.sub.duration).toBe(45);
      expect(next.tabs.schedules.sub.time).toBe('11:00:00');
    } else {
      throw new Error('Expected adding-drain sub-state');
    }
  });

  it('updates both time and duration on the adding-drain sub-state', () => {
    const sm = transition(createInitialSM(), {
      type: 'BEGIN_ADD_DRAIN',
      time: '10:00:00',
      duration: 45,
    });
    const next = transition(sm, { type: 'UPDATE_ADD_DRAIN', time: '11:00:00', duration: 60 });
    if (next.tabs.schedules.sub.kind === 'adding-drain') {
      expect(next.tabs.schedules.sub.duration).toBe(60);
      expect(next.tabs.schedules.sub.time).toBe('11:00:00');
    } else {
      throw new Error('Expected adding-drain sub-state');
    }
  });

  it('is a no-op when not in adding-drain state', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'UPDATE_ADD_DRAIN', time: '11:00:00' });
    expect(next).toBe(sm);
  });
});

describe('UPDATE_EDIT_IRRIGATION', () => {
  it('updates the edit draft without changing originalTime', () => {
    const sm = transition(createInitialSM(), {
      type: 'BEGIN_EDIT_IRRIGATION',
      originalTime: '06:00:00',
      originalDuration: 60,
      time: '06:00:00',
      duration: 60,
    });
    const next = transition(sm, { type: 'UPDATE_EDIT_IRRIGATION', time: '07:00:00' });
    if (next.tabs.schedules.sub.kind === 'editing-irrigation') {
      expect(next.tabs.schedules.sub.time).toBe('07:00:00');
      expect(next.tabs.schedules.sub.duration).toBe(60);
      expect(next.tabs.schedules.sub.originalTime).toBe('06:00:00');
    } else {
      throw new Error('Expected editing-irrigation sub-state');
    }
  });

  it('updates duration on the editing-irrigation sub-state', () => {
    const sm = transition(createInitialSM(), {
      type: 'BEGIN_EDIT_IRRIGATION',
      originalTime: '06:00:00',
      originalDuration: 60,
      time: '06:00:00',
      duration: 60,
    });
    const next = transition(sm, { type: 'UPDATE_EDIT_IRRIGATION', duration: 90 });
    if (next.tabs.schedules.sub.kind === 'editing-irrigation') {
      expect(next.tabs.schedules.sub.time).toBe('06:00:00');
      expect(next.tabs.schedules.sub.duration).toBe(90);
      expect(next.tabs.schedules.sub.originalTime).toBe('06:00:00');
    } else {
      throw new Error('Expected editing-irrigation sub-state');
    }
  });

  it('updates both time and duration on the editing-irrigation sub-state', () => {
    const sm = transition(createInitialSM(), {
      type: 'BEGIN_EDIT_IRRIGATION',
      originalTime: '06:00:00',
      originalDuration: 60,
      time: '06:00:00',
      duration: 60,
    });
    const next = transition(sm, { type: 'UPDATE_EDIT_IRRIGATION', time: '07:00:00', duration: 90 });
    if (next.tabs.schedules.sub.kind === 'editing-irrigation') {
      expect(next.tabs.schedules.sub.time).toBe('07:00:00');
      expect(next.tabs.schedules.sub.duration).toBe(90);
      expect(next.tabs.schedules.sub.originalTime).toBe('06:00:00');
    } else {
      throw new Error('Expected editing-irrigation sub-state');
    }
  });

  it('is a no-op when not in editing-irrigation state', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'UPDATE_EDIT_IRRIGATION', time: '07:00:00' });
    expect(next).toBe(sm);
  });
});

describe('UPDATE_EDIT_DRAIN', () => {
  it('updates the drain edit draft', () => {
    const sm = transition(createInitialSM(), {
      type: 'BEGIN_EDIT_DRAIN',
      originalTime: '09:00:00',
      originalDuration: 30,
      time: '09:00:00',
      duration: 30,
    });
    const next = transition(sm, { type: 'UPDATE_EDIT_DRAIN', duration: 45 });
    if (next.tabs.schedules.sub.kind === 'editing-drain') {
      expect(next.tabs.schedules.sub.duration).toBe(45);
      expect(next.tabs.schedules.sub.time).toBe('09:00:00');
      expect(next.tabs.schedules.sub.originalDuration).toBe(30);
    } else {
      throw new Error('Expected editing-drain sub-state');
    }
  });

  it('updates time on the editing-drain sub-state', () => {
    const sm = transition(createInitialSM(), {
      type: 'BEGIN_EDIT_DRAIN',
      originalTime: '09:00:00',
      originalDuration: 30,
      time: '09:00:00',
      duration: 30,
    });
    const next = transition(sm, { type: 'UPDATE_EDIT_DRAIN', time: '10:00:00' });
    if (next.tabs.schedules.sub.kind === 'editing-drain') {
      expect(next.tabs.schedules.sub.duration).toBe(30);
      expect(next.tabs.schedules.sub.time).toBe('10:00:00');
      expect(next.tabs.schedules.sub.originalDuration).toBe(30);
    } else {
      throw new Error('Expected editing-drain sub-state');
    }
  });

  it('updates both time and duration on the editing-drain sub-state', () => {
    const sm = transition(createInitialSM(), {
      type: 'BEGIN_EDIT_DRAIN',
      originalTime: '09:00:00',
      originalDuration: 30,
      time: '09:00:00',
      duration: 30,
    });
    const next = transition(sm, { type: 'UPDATE_EDIT_DRAIN', time: '10:00:00', duration: 45 });
    if (next.tabs.schedules.sub.kind === 'editing-drain') {
      expect(next.tabs.schedules.sub.duration).toBe(45);
      expect(next.tabs.schedules.sub.time).toBe('10:00:00');
      expect(next.tabs.schedules.sub.originalDuration).toBe(30);
    } else {
      throw new Error('Expected editing-drain sub-state');
    }
  });

  it('is a no-op when not in editing-drain state', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'UPDATE_EDIT_DRAIN', time: '10:00:00' });
    expect(next).toBe(sm);
  });
});

describe('UPDATE_SCHEDULES_DRAFT', () => {
  it('merges partial update into the schedules draft', () => {
    const sm = createInitialSM();
    const next = transition(sm, {
      type: 'UPDATE_SCHEDULES_DRAFT',
      partial: { irrigationPumpEntity: 'switch.pump', irrigationDuration: 90 },
    });
    expect(next.tabs.schedules.draft.irrigationPumpEntity).toBe('switch.pump');
    expect(next.tabs.schedules.draft.irrigationDuration).toBe(90);
    expect(next.tabs.schedules.draft.drainPumpEntity).toBe(''); // unchanged
  });
});

// ─── Steering transitions ─────────────────────────────────────────────────────

describe('REQUEST_PHASE_CHANGE', () => {
  it('enters confirm-phase sub-state with pending phase', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'REQUEST_PHASE_CHANGE', phase: 'p3' });
    expect(next.tabs.steering.sub.kind).toBe('confirm-phase');
    if (next.tabs.steering.sub.kind === 'confirm-phase') {
      expect(next.tabs.steering.sub.pending).toBe('p3');
    }
  });

  it('does not change the active phase immediately', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'REQUEST_PHASE_CHANGE', phase: 'p3' });
    expect(next.tabs.steering.phase).toBe('p2'); // default unchanged
  });
});

describe('CONFIRM_PHASE_CHANGE', () => {
  it('applies the pending phase and returns to idle', () => {
    const sm = transition(createInitialSM(), { type: 'REQUEST_PHASE_CHANGE', phase: 'p3' });
    const next = transition(sm, { type: 'CONFIRM_PHASE_CHANGE' });
    expect(next.tabs.steering.phase).toBe('p3');
    expect(next.tabs.steering.sub.kind).toBe('idle');
  });

  it('is a no-op when not in confirm-phase state', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'CONFIRM_PHASE_CHANGE' });
    expect(next).toBe(sm);
  });
});

describe('CANCEL_PHASE_CHANGE', () => {
  it('returns steering to idle without changing phase', () => {
    const sm = transition(createInitialSM(), { type: 'REQUEST_PHASE_CHANGE', phase: 'p3' });
    const next = transition(sm, { type: 'CANCEL_PHASE_CHANGE' });
    expect(next.tabs.steering.sub.kind).toBe('idle');
    expect(next.tabs.steering.phase).toBe('p2'); // unchanged
  });
});

describe('UPDATE_STEERING_DRAFT', () => {
  it('merges partial update into the steering draft', () => {
    const sm = createInitialSM();
    const next = transition(sm, {
      type: 'UPDATE_STEERING_DRAFT',
      partial: { lightsOnTime: '05:00:00', shotIntervalMinutes: 20 },
    });
    expect(next.tabs.steering.draft.lightsOnTime).toBe('05:00:00');
    expect(next.tabs.steering.draft.shotIntervalMinutes).toBe(20);
    expect(next.tabs.steering.draft.enabled).toBe(false); // unchanged
  });
});

// ─── Config transitions ───────────────────────────────────────────────────────

describe('UPDATE_CONFIG_DRAFT', () => {
  it('merges partial update into config draft', () => {
    const sm = createInitialSM();
    const next = transition(sm, {
      type: 'UPDATE_CONFIG_DRAFT',
      partial: { skipDuringDark: true, maxCyclesPerDay: 6 },
    });
    expect(next.tabs.config.draft.skipDuringDark).toBe(true);
    expect(next.tabs.config.draft.maxCyclesPerDay).toBe(6);
    expect(next.tabs.config.draft.pauseOnLowTank).toBe(true); // unchanged default
  });
});

// ─── Drain EC transitions ─────────────────────────────────────────────────────

describe('UPDATE_DRAIN_EC_DRAFT', () => {
  it('merges partial update into drain EC draft', () => {
    const sm = createInitialSM();
    const next = transition(sm, {
      type: 'UPDATE_DRAIN_EC_DRAFT',
      partial: { enabled: true, maxEcDelta: 2.5 },
    });
    expect(next.tabs.drain_ec.draft.enabled).toBe(true);
    expect(next.tabs.drain_ec.draft.maxEcDelta).toBe(2.5);
    expect(next.tabs.drain_ec.draft.targetRunoffPercent).toBe(20); // unchanged
  });
});

describe('SET_DRAIN_SAVING', () => {
  it('enters saving sub-state when saving=true', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'SET_DRAIN_SAVING', saving: true });
    expect(next.tabs.drain_ec.sub.kind).toBe('saving');
  });

  it('returns to idle when saving=false', () => {
    const sm = transition(createInitialSM(), { type: 'SET_DRAIN_SAVING', saving: true });
    const next = transition(sm, { type: 'SET_DRAIN_SAVING', saving: false });
    expect(next.tabs.drain_ec.sub.kind).toBe('idle');
  });
});

describe('SET_DRAIN_LOGGING', () => {
  it('enters logging sub-state when logging=true', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'SET_DRAIN_LOGGING', logging: true });
    expect(next.tabs.drain_ec.sub.kind).toBe('logging');
  });

  it('returns to idle when logging=false', () => {
    const sm = transition(createInitialSM(), { type: 'SET_DRAIN_LOGGING', logging: true });
    const next = transition(sm, { type: 'SET_DRAIN_LOGGING', logging: false });
    expect(next.tabs.drain_ec.sub.kind).toBe('idle');
  });
});

// ─── EC Targets transitions ───────────────────────────────────────────────────

describe('UPDATE_EC_TARGETS_DRAFT', () => {
  it('replaces the ec_targets draft', () => {
    const sm = createInitialSM();
    const newRanges = [
      { stage: 'seedling' as const, minEc: 0.8, maxEc: 1.2 },
      { stage: 'veg' as const, minEc: 1.2, maxEc: 1.8 },
      { stage: 'flower_early' as const, minEc: 1.4, maxEc: 2.0 },
      { stage: 'flower_mid' as const, minEc: 1.6, maxEc: 2.2 },
      { stage: 'flower_late' as const, minEc: 1.4, maxEc: 2.0 },
    ];
    const next = transition(sm, { type: 'UPDATE_EC_TARGETS_DRAFT', ranges: newRanges });
    expect(next.tabs.ec_targets.draft).toEqual(newRanges);
  });
});

// ─── Global transitions ───────────────────────────────────────────────────────

describe('SET_TOAST', () => {
  it('sets the toast message', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'SET_TOAST', message: 'Something went wrong' });
    expect(next.toast).toBe('Something went wrong');
  });

  it('clears the toast when message is undefined', () => {
    const sm: DialogSM = { ...createInitialSM(), toast: 'old message' };
    const next = transition(sm, { type: 'SET_TOAST', message: undefined });
    expect(next.toast).toBeUndefined();
  });
});

describe('SET_RUN_NOW_SAVING', () => {
  it('enters run-now-saving status when saving=true', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'SET_RUN_NOW_SAVING', saving: true });
    expect(next.status.kind).toBe('run-now-saving');
  });

  it('returns to idle status when saving=false', () => {
    const sm = transition(createInitialSM(), { type: 'SET_RUN_NOW_SAVING', saving: true });
    const next = transition(sm, { type: 'SET_RUN_NOW_SAVING', saving: false });
    expect(next.status.kind).toBe('idle');
  });
});

describe('SET_STAGE_AGGREGATES', () => {
  it('stores stage aggregates in water_analytics tab', () => {
    const sm = createInitialSM();
    const data = { seedling: 1.5, veg: 2.3 };
    const next = transition(sm, { type: 'SET_STAGE_AGGREGATES', data });
    expect(next.tabs.water_analytics.stageAggregates).toEqual(data);
  });

  it('clears aggregates when data is null', () => {
    const sm: DialogSM = {
      ...createInitialSM(),
      tabs: {
        ...createInitialSM().tabs,
        water_analytics: { stageAggregates: { veg: 1.0 }, sub: { kind: 'idle' } },
      },
    };
    const next = transition(sm, { type: 'SET_STAGE_AGGREGATES', data: null });
    expect(next.tabs.water_analytics.stageAggregates).toBeNull();
  });
});

describe('RESET_FROM_DEVICE', () => {
  it('rebuilds all tab drafts from device data', () => {
    const device = makeDevice();
    const sm = createInitialSM();
    const next = transition(sm, { type: 'RESET_FROM_DEVICE', device });
    expect(next.tabs.schedules.draft).toBeDefined();
    expect(next.tabs.steering.draft).toBeDefined();
    expect(next.tabs.config.draft).toBeDefined();
    expect(next.tabs.drain_ec.draft).toBeDefined();
    expect(next.tabs.ec_targets.draft).toBeDefined();
  });

  it('preserves the active tab and status after reset', () => {
    const device = makeDevice();
    let sm = createInitialSM();
    sm = transition(sm, { type: 'SWITCH_TAB', tab: 'steering' });
    const next = transition(sm, { type: 'RESET_FROM_DEVICE', device });
    expect(next.activeTab).toBe('steering');
    expect(next.status.kind).toBe('idle');
  });
});

// ─── Dirty predicates ─────────────────────────────────────────────────────────

describe('isSchedulesDirty', () => {
  it('returns false when draft matches device config', () => {
    const device = makeDevice();
    const sm = createInitialSM(device);
    expect(isSchedulesDirty(sm, device)).toBe(false);
  });

  it('returns true when irrigationPumpEntity changes', () => {
    const device = makeDevice();
    let sm = createInitialSM(device);
    sm = transition(sm, {
      type: 'UPDATE_SCHEDULES_DRAFT',
      partial: { irrigationPumpEntity: 'switch.custom_pump' },
    });
    expect(isSchedulesDirty(sm, device)).toBe(true);
  });

  it('returns true when irrigationDuration changes', () => {
    const device = makeDevice();
    let sm = createInitialSM(device);
    sm = transition(sm, {
      type: 'UPDATE_SCHEDULES_DRAFT',
      partial: { irrigationDuration: 120 },
    });
    expect(isSchedulesDirty(sm, device)).toBe(true);
  });
});

describe('isSteeringDirty', () => {
  it('returns false when device has no strategy', () => {
    const device = makeDevice();
    const sm = createInitialSM(device);
    expect(isSteeringDirty(sm, device)).toBe(false);
  });

  it('returns false when draft matches device strategy', () => {
    const device = makeDevice({
      irrigationStrategy: {
        enabled: true,
        lightsOnTime: '06:00:00',
        p0DurationMinutes: 60,
        p2StopBeforeLightsOffMinutes: 120,
        targetVwcPercent: 45.0,
        maintenanceDrybackPercent: 3.0,
        shotDurationSeconds: 15,
        shotIntervalMinutes: 15,
        autoLightTracking: false,
        detectedLightsOnTime: null,
      },
    });
    const sm = createInitialSM(device);
    expect(isSteeringDirty(sm, device)).toBe(false);
  });

  it('returns true when steering draft properties change', () => {
    const strategy = {
      enabled: true,
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
    const device = makeDevice({ irrigationStrategy: strategy });

    const fieldsToTest: Array<{ partial: any; desc: string }> = [
      { partial: { enabled: false }, desc: 'enabled' },
      { partial: { lightsOnTime: '07:00:00' }, desc: 'lightsOnTime' },
      { partial: { p0DurationMinutes: 45 }, desc: 'p0DurationMinutes' },
      { partial: { p2StopBeforeLightsOffMinutes: 90 }, desc: 'p2StopBeforeLightsOffMinutes' },
      { partial: { targetVwcPercent: 50.0 }, desc: 'targetVwcPercent' },
      { partial: { maintenanceDrybackPercent: 4.0 }, desc: 'maintenanceDrybackPercent' },
      { partial: { shotDurationSeconds: 10 }, desc: 'shotDurationSeconds' },
      { partial: { shotIntervalMinutes: 10 }, desc: 'shotIntervalMinutes' },
      { partial: { autoLightTracking: true }, desc: 'autoLightTracking' },
      { partial: { detectedLightsOnTime: '08:00:00' }, desc: 'detectedLightsOnTime' },
    ];

    for (const { partial, desc } of fieldsToTest) {
      let sm = createInitialSM(device);
      sm = transition(sm, {
        type: 'UPDATE_STEERING_DRAFT',
        partial,
      });
      expect(isSteeringDirty(sm, device), `Expected dirty for field: ${desc}`).toBe(true);
    }
  });
});

describe('isConfigDirty', () => {
  it('returns false when draft matches device config defaults', () => {
    const device = makeDevice();
    const sm = createInitialSM(device);
    expect(isConfigDirty(sm, device)).toBe(false);
  });

  it('returns true when skipDuringDark changes', () => {
    const device = makeDevice();
    let sm = createInitialSM(device);
    sm = transition(sm, {
      type: 'UPDATE_CONFIG_DRAFT',
      partial: { skipDuringDark: true },
    });
    expect(isConfigDirty(sm, device)).toBe(true);
  });

  it('returns true when maxCyclesPerDay changes from null', () => {
    const device = makeDevice();
    let sm = createInitialSM(device);
    sm = transition(sm, {
      type: 'UPDATE_CONFIG_DRAFT',
      partial: { maxCyclesPerDay: 8 },
    });
    expect(isConfigDirty(sm, device)).toBe(true);
  });
});

describe('isDrainEcDirty', () => {
  it('returns false when device has no drainConfig', () => {
    const device = makeDevice();
    const sm = createInitialSM(device);
    expect(isDrainEcDirty(sm, device)).toBe(false);
  });

  it('returns false when draft matches device drainConfig', () => {
    const device = makeDevice({
      drainConfig: {
        enabled: true,
        maxEcDelta: 1.5,
        targetRunoffPercent: 25,
        readings: [],
      },
    });
    const sm = createInitialSM(device);
    expect(isDrainEcDirty(sm, device)).toBe(false);
  });

  it('returns true when drainConfig properties change', () => {
    const drainConfig = {
      enabled: true,
      maxEcDelta: 1.5,
      targetRunoffPercent: 25,
      readings: [],
    };
    const device = makeDevice({ drainConfig });

    const fieldsToTest = [
      { partial: { enabled: false }, desc: 'enabled' },
      { partial: { maxEcDelta: 2.0 }, desc: 'maxEcDelta' },
      { partial: { targetRunoffPercent: 30 }, desc: 'targetRunoffPercent' },
    ];

    for (const { partial, desc } of fieldsToTest) {
      let sm = createInitialSM(device);
      sm = transition(sm, {
        type: 'UPDATE_DRAIN_EC_DRAFT',
        partial,
      });
      expect(isDrainEcDirty(sm, device), `Expected dirty for field: ${desc}`).toBe(true);
    }
  });
});

describe('isEcTargetsDirty', () => {
  it('returns false when device has no ecTargetRanges and draft has all-zero range values', () => {
    const device = makeDevice();
    const sm = createInitialSM(device);
    expect(isEcTargetsDirty(sm, device)).toBe(false);
  });

  it('returns true when device has no ecTargetRanges, but draft has non-zero range values', () => {
    const device = makeDevice();
    let sm = createInitialSM(device);
    sm = transition(sm, {
      type: 'UPDATE_EC_TARGETS_DRAFT',
      ranges: [
        { stage: 'seedling', minEc: 1.0, maxEc: 1.5 },
      ],
    });
    expect(isEcTargetsDirty(sm, device)).toBe(true);
  });

  it('returns false when draft matches device ranges exactly', () => {
    const device = makeDevice({
      irrigationConfig: {
        irrigationTimes: [],
        drainTimes: [],
        ecTargetRanges: [
          { stage: 'seedling', minEc: 1.0, maxEc: 1.5 },
          { stage: 'veg', minEc: 1.5, maxEc: 2.0 },
          { stage: 'flower_early', minEc: 2.0, maxEc: 2.5 },
          { stage: 'flower_mid', minEc: 2.5, maxEc: 3.0 },
          { stage: 'flower_late', minEc: 2.0, maxEc: 2.5 },
        ],
      },
    });
    const sm = createInitialSM(device);
    expect(isEcTargetsDirty(sm, device)).toBe(false);
  });

  it('returns true when ranges length differs', () => {
    const device = makeDevice({
      irrigationConfig: {
        irrigationTimes: [],
        drainTimes: [],
        ecTargetRanges: [
          { stage: 'seedling', minEc: 1.0, maxEc: 1.5 },
        ],
      },
    });
    const sm = createInitialSM(device);
    expect(isEcTargetsDirty(sm, device)).toBe(true);
  });

  it('returns true when a draft stage range has modified minEc or maxEc value', () => {
    const device = makeDevice({
      irrigationConfig: {
        irrigationTimes: [],
        drainTimes: [],
        ecTargetRanges: [
          { stage: 'seedling', minEc: 1.0, maxEc: 1.5 },
          { stage: 'veg', minEc: 1.5, maxEc: 2.0 },
          { stage: 'flower_early', minEc: 2.0, maxEc: 2.5 },
          { stage: 'flower_mid', minEc: 2.5, maxEc: 3.0 },
          { stage: 'flower_late', minEc: 2.0, maxEc: 2.5 },
        ],
      },
    });

    // Modified minEc
    let sm1 = createInitialSM(device);
    sm1 = transition(sm1, {
      type: 'UPDATE_EC_TARGETS_DRAFT',
      ranges: [
        { stage: 'seedling', minEc: 1.1, maxEc: 1.5 },
        { stage: 'veg', minEc: 1.5, maxEc: 2.0 },
        { stage: 'flower_early', minEc: 2.0, maxEc: 2.5 },
        { stage: 'flower_mid', minEc: 2.5, maxEc: 3.0 },
        { stage: 'flower_late', minEc: 2.0, maxEc: 2.5 },
      ],
    });
    expect(isEcTargetsDirty(sm1, device)).toBe(true);

    // Modified maxEc
    let sm2 = createInitialSM(device);
    sm2 = transition(sm2, {
      type: 'UPDATE_EC_TARGETS_DRAFT',
      ranges: [
        { stage: 'seedling', minEc: 1.0, maxEc: 1.5 },
        { stage: 'veg', minEc: 1.5, maxEc: 2.0 },
        { stage: 'flower_early', minEc: 2.0, maxEc: 2.5 },
        { stage: 'flower_mid', minEc: 2.5, maxEc: 3.1 },
        { stage: 'flower_late', minEc: 2.0, maxEc: 2.5 },
      ],
    });
    expect(isEcTargetsDirty(sm2, device)).toBe(true);
  });

  it('returns true when a stage range is missing in device or draft contains mismatching stage names', () => {
    const device = makeDevice({
      irrigationConfig: {
        irrigationTimes: [],
        drainTimes: [],
        ecTargetRanges: [
          { stage: 'seedling', minEc: 1.0, maxEc: 1.5 },
          { stage: 'veg', minEc: 1.5, maxEc: 2.0 },
          { stage: 'flower_early', minEc: 2.0, maxEc: 2.5 },
          { stage: 'flower_mid', minEc: 2.5, maxEc: 3.0 },
          // missing flower_late, replace with invalid stage
          { stage: 'invalid_stage' as any, minEc: 2.0, maxEc: 2.5 },
        ],
      },
    });
    const sm = createInitialSM(device);
    expect(isEcTargetsDirty(sm, device)).toBe(true);
  });
});

describe('isActiveTabDirty', () => {
  it('delegates to the active tab predicate (schedules)', () => {
    const device = makeDevice();
    let sm = createInitialSM(device);
    expect(isActiveTabDirty(sm, device)).toBe(false);
    sm = transition(sm, {
      type: 'UPDATE_SCHEDULES_DRAFT',
      partial: { irrigationPumpEntity: 'switch.dirty' },
    });
    expect(isActiveTabDirty(sm, device)).toBe(true);
  });

  it('delegates to the active tab predicate (steering)', () => {
    const device = makeDevice({
      irrigationStrategy: {
        enabled: true,
        lightsOnTime: '06:00:00',
        p0DurationMinutes: 60,
        p2StopBeforeLightsOffMinutes: 120,
        targetVwcPercent: 45.0,
        maintenanceDrybackPercent: 3.0,
        shotDurationSeconds: 15,
        shotIntervalMinutes: 15,
        autoLightTracking: false,
        detectedLightsOnTime: null,
      },
    });
    let sm = createInitialSM(device);
    sm = transition(sm, { type: 'SWITCH_TAB', tab: 'steering' });
    expect(isActiveTabDirty(sm, device)).toBe(false);
    sm = transition(sm, {
      type: 'UPDATE_STEERING_DRAFT',
      partial: { enabled: false },
    });
    expect(isActiveTabDirty(sm, device)).toBe(true);
  });

  it('delegates to the active tab predicate (config)', () => {
    const device = makeDevice();
    let sm = createInitialSM(device);
    sm = transition(sm, { type: 'SWITCH_TAB', tab: 'config' });
    expect(isActiveTabDirty(sm, device)).toBe(false);
    sm = transition(sm, {
      type: 'UPDATE_CONFIG_DRAFT',
      partial: { skipDuringDark: true },
    });
    expect(isActiveTabDirty(sm, device)).toBe(true);
  });

  it('delegates to the active tab predicate (drain_ec)', () => {
    const device = makeDevice({
      drainConfig: {
        enabled: true,
        maxEcDelta: 1.5,
        targetRunoffPercent: 25,
        readings: [],
      },
    });
    let sm = createInitialSM(device);
    sm = transition(sm, { type: 'SWITCH_TAB', tab: 'drain_ec' });
    expect(isActiveTabDirty(sm, device)).toBe(false);
    sm = transition(sm, {
      type: 'UPDATE_DRAIN_EC_DRAFT',
      partial: { enabled: false },
    });
    expect(isActiveTabDirty(sm, device)).toBe(true);
  });

  it('delegates to the active tab predicate (ec_targets)', () => {
    const device = makeDevice({
      irrigationConfig: {
        irrigationTimes: [],
        drainTimes: [],
        ecTargetRanges: [
          { stage: 'seedling', minEc: 1.0, maxEc: 1.5 },
          { stage: 'veg', minEc: 1.5, maxEc: 2.0 },
          { stage: 'flower_early', minEc: 2.0, maxEc: 2.5 },
          { stage: 'flower_mid', minEc: 2.5, maxEc: 3.0 },
          { stage: 'flower_late', minEc: 2.0, maxEc: 2.5 },
        ],
      },
    });
    let sm = createInitialSM(device);
    sm = transition(sm, { type: 'SWITCH_TAB', tab: 'ec_targets' });
    expect(isActiveTabDirty(sm, device)).toBe(false);
    sm = transition(sm, {
      type: 'UPDATE_EC_TARGETS_DRAFT',
      ranges: [
        { stage: 'seedling', minEc: 1.1, maxEc: 1.5 },
        { stage: 'veg', minEc: 1.5, maxEc: 2.0 },
        { stage: 'flower_early', minEc: 2.0, maxEc: 2.5 },
        { stage: 'flower_mid', minEc: 2.5, maxEc: 3.0 },
        { stage: 'flower_late', minEc: 2.0, maxEc: 2.5 },
      ],
    });
    expect(isActiveTabDirty(sm, device)).toBe(true);
  });

  it('returns false for tabs with no dirty predicate (tanks, water_analytics)', () => {
    const device = makeDevice();
    let sm = createInitialSM(device);
    sm = transition(sm, { type: 'SWITCH_TAB', tab: 'tanks' });
    expect(isActiveTabDirty(sm, device)).toBe(false);

    sm = transition(sm, { type: 'SWITCH_TAB', tab: 'water_analytics' });
    expect(isActiveTabDirty(sm, device)).toBe(false);
  });
});

// ─── EC Ramp tab ──────────────────────────────────────────────────────────────

describe('ec_ramp tab slot', () => {
  it('createInitialSM initializes tabs.ec_ramp as an empty object', () => {
    const sm = createInitialSM();
    expect(sm.tabs.ec_ramp).toBeDefined();
    expect(sm.tabs.ec_ramp).toEqual({});
  });

  it('SWITCH_TAB can navigate to ec_ramp', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'SWITCH_TAB', tab: 'ec_ramp' });
    expect(next.activeTab).toBe('ec_ramp');
    expect(next.status.kind).toBe('idle');
  });

  it('SWITCH_TAB can navigate away from ec_ramp', () => {
    const sm = transition(createInitialSM(), { type: 'SWITCH_TAB', tab: 'ec_ramp' });
    const next = transition(sm, { type: 'SWITCH_TAB', tab: 'ec_targets' });
    expect(next.activeTab).toBe('ec_targets');
  });

  it('requestTabSwitch to ec_ramp switches directly (no dirty state)', () => {
    const device = makeDevice();
    const sm = createInitialSM(device);
    const next = requestTabSwitch(sm, 'ec_ramp', device);
    expect(next.activeTab).toBe('ec_ramp');
    expect(next.status.kind).toBe('idle');
  });

  it('isActiveTabDirty returns false when ec_ramp is active', () => {
    const device = makeDevice();
    let sm = createInitialSM(device);
    sm = transition(sm, { type: 'SWITCH_TAB', tab: 'ec_ramp' });
    expect(isActiveTabDirty(sm, device)).toBe(false);
  });

  it('RESET_FROM_DEVICE preserves the ec_ramp tab slot unchanged', () => {
    const device = makeDevice();
    let sm = createInitialSM();
    sm = transition(sm, { type: 'SWITCH_TAB', tab: 'ec_ramp' });
    const next = transition(sm, { type: 'RESET_FROM_DEVICE', device });
    expect(next.tabs.ec_ramp).toEqual({});
  });
});

// ─── Immutability ─────────────────────────────────────────────────────────────

describe('immutability', () => {
  it('every transition returns a new object reference', () => {
    const sm = createInitialSM();
    const events = [
      { type: 'SWITCH_TAB' as const, tab: 'steering' as TabId },
      { type: 'REQUEST_PHASE_CHANGE' as const, phase: 'p1' as const },
      { type: 'UPDATE_CONFIG_DRAFT' as const, partial: { skipDuringDark: true } },
      { type: 'SET_TOAST' as const, message: 'test' },
    ];
    for (const event of events) {
      const next = transition(sm, event);
      expect(next).not.toBe(sm);
    }
  });
});

describe('DISCARD_AND_SWITCH pure transition', () => {
  it('returns sm unmodified when status is not confirm-discard', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'DISCARD_AND_SWITCH' });
    expect(next).toBe(sm);
  });

  it('switches tab and clears inline editing state when status is confirm-discard', () => {
    let sm: DialogSM = {
      ...createInitialSM(),
      status: { kind: 'confirm-discard', pendingTab: 'config' },
    };
    const next = transition(sm, { type: 'DISCARD_AND_SWITCH' });
    expect(next.activeTab).toBe('config');
    expect(next.status.kind).toBe('idle');
    expect(next.tabs.schedules.sub.kind).toBe('idle');
  });
});

describe('default transition case', () => {
  it('returns sm unmodified for unknown event types', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'UNKNOWN_EVENT' } as any);
    expect(next).toBe(sm);
  });
});
