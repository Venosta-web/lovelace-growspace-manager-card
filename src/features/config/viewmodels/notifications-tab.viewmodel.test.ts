import { describe, it, expect } from 'vitest';
import { createNotificationsTabViewModel, TRIGGER_OPTIONS } from './notifications-tab.viewmodel';
import { createInitialSM, transition } from '../../../dialogs/config-dialog-sm';
import type { GrowspaceDevice } from '../../../types';

const device: GrowspaceDevice = {
  deviceId: 'gs1',
  name: 'Tent 1',
  rows: 4,
  plantsPerRow: 4,
  notificationTarget: '',
  notificationSettings: {
    criticalCooldownMinutes: 90,
    warningCooldownMinutes: 45,
    recoveryCooldownMinutes: 10,
    escalationDelayMinutes: 20,
    minStressDurationSeconds: 120,
    warningPersistenceMinutes: 30,
    aiAutoAlerts: false,
  },
  environmentAttributes: {},
} as unknown as GrowspaceDevice;

describe('createNotificationsTabViewModel', () => {
  it('projects the cooldown/persistence draft straight from the SM', () => {
    const sm = createInitialSM(device);
    const vm = createNotificationsTabViewModel(sm, {});
    expect(vm.draft).toBe(sm.tabs.notifications.draft);
    expect(vm.draft.criticalCooldownMinutes).toBe(90);
    expect(vm.draft.aiAutoAlerts).toBe(false);
  });

  it('projects the timed-notification list and inline sub-state from the SM', () => {
    let sm = createInitialSM(device);
    sm = transition(sm, { type: 'START_ADD_TIMED_NOTIFICATION' });
    const vm = createNotificationsTabViewModel(sm, {});
    expect(vm.sub.kind).toBe('adding');
    expect(vm.timedNotifications).toEqual(sm.tabs.notifications.timedNotifications);
  });

  it('projects an unrecognised trigger through without coercing it to a stage', () => {
    const sm = createInitialSM({
      ...device,
      timedNotifications: [
        {
          id: 'n1',
          message: 'Odd one',
          triggerType: { raw: 'days_since_germination' },
          day: 7,
          growspaceIds: [],
        },
      ],
    } as unknown as GrowspaceDevice);
    const vm = createNotificationsTabViewModel(sm, {});
    expect(vm.timedNotifications[0].triggerType).toEqual({ raw: 'days_since_germination' });
    expect(vm.triggerOptions.map((o) => o.value)).not.toContain('days_since_germination');
  });

  it('maps the growspaceOptions record into render-ready entries', () => {
    const sm = createInitialSM(device);
    const vm = createNotificationsTabViewModel(sm, { gs1: 'Tent 1', gs2: 'Tent 2' });
    expect(vm.growspaceOptions).toEqual([
      { id: 'gs1', name: 'Tent 1' },
      { id: 'gs2', name: 'Tent 2' },
    ]);
  });

  it('exposes the four trigger options in display order', () => {
    const sm = createInitialSM(device);
    const vm = createNotificationsTabViewModel(sm, {});
    // Bare stage names so the backend firing path (calculate_days_in_stage)
    // resolves them; the old '*_start' values never fired.
    expect(vm.triggerOptions.map((o) => o.value)).toEqual(['clone', 'veg', 'flower', 'dry']);
    // a fresh array copy, not the shared module constant
    expect(vm.triggerOptions).not.toBe(TRIGGER_OPTIONS);
  });
});
