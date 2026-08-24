import { describe, it, expect } from 'vitest';
import { createGrowspacesTabViewModel, type GrowspacesTabDeps } from './growspaces-tab.viewmodel';
import { createInitialSM, transition } from '../../../dialogs/config-dialog-sm';
import type { ConfigDialogSM } from '../../../dialogs/config-dialog-sm';

const baseDeps: GrowspacesTabDeps = {
  growspaceOptions: { gs1: 'Tent 1', gs2: 'Tent 2' },
  notifyServices: [{ label: 'phone', value: 'mobile_app_phone' }],
  entityOptions: () => [],
};

function sm(): ConfigDialogSM {
  return createInitialSM();
}

describe('createGrowspacesTabViewModel — master list', () => {
  it('lists growspaces from the injected options, none active when idle', () => {
    const vm = createGrowspacesTabViewModel(sm(), baseDeps);
    expect(vm.growspaces.map((g) => g.id)).toEqual(['gs1', 'gs2']);
    expect(vm.growspaces.every((g) => !g.active)).toBe(true);
    expect(vm.state.mode).toBe('idle');
    expect(vm.notifyServices).toEqual(baseDeps.notifyServices);
  });

  it('marks the edited growspace active', () => {
    const s = transition(sm(), {
      type: 'SELECT_GROWSPACE',
      growspaceId: 'gs2',
      name: 'Tent 2',
      rows: 4,
      plantsPerRow: 4,
      notificationService: '',
    });
    const vm = createGrowspacesTabViewModel(s, baseDeps);
    expect(vm.growspaces.find((g) => g.id === 'gs2')!.active).toBe(true);
    expect(vm.growspaces.find((g) => g.id === 'gs1')!.active).toBe(false);
  });
});

describe('createGrowspacesTabViewModel — detail state', () => {
  it('projects the add draft when adding', () => {
    let s = transition(sm(), { type: 'START_ADD_GROWSPACE' });
    s = transition(s, { type: 'UPDATE_ADD_DRAFT', partial: { name: 'New', rows: 3 } });
    const vm = createGrowspacesTabViewModel(s, baseDeps);
    expect(vm.state).toMatchObject({ mode: 'adding', draft: { name: 'New', rows: 3 } });
    // master list shows no active row while adding
    expect(vm.growspaces.every((g) => !g.active)).toBe(true);
  });

  it('projects the edit draft plus env multi-selects when editing', () => {
    let s = transition(sm(), {
      type: 'SELECT_GROWSPACE',
      growspaceId: 'gs1',
      name: 'Tent 1',
      rows: 4,
      plantsPerRow: 4,
      notificationService: 'mobile_app_phone',
    });
    s = transition(s, {
      type: 'UPDATE_ENV_DRAFT',
      partial: { lungroomTempSensors: ['sensor.lr'], cameraEntities: ['camera.a'] },
    });
    const deps: GrowspacesTabDeps = {
      ...baseDeps,
      entityOptions: (d) => (d[0] === 'camera' ? ['camera.a', 'camera.b'] : ['sensor.lr']),
    };
    const vm = createGrowspacesTabViewModel(s, deps);
    expect(vm.state.mode).toBe('editing');
    if (vm.state.mode === 'editing') {
      expect(vm.state.id).toBe('gs1');
      expect(vm.state.draft.notificationService).toBe('mobile_app_phone');
      expect(vm.state.lungroom).toEqual({ value: ['sensor.lr'], options: ['sensor.lr'] });
      expect(vm.state.camera).toEqual({ value: ['camera.a'], options: ['camera.a', 'camera.b'] });
    }
  });

  it('projects the confirm-delete name', () => {
    let s = transition(sm(), {
      type: 'SELECT_GROWSPACE',
      growspaceId: 'gs1',
      name: 'Tent 1',
      rows: 4,
      plantsPerRow: 4,
      notificationService: '',
    });
    s = transition(s, { type: 'REQUEST_DELETE_GROWSPACE', growspaceId: 'gs1', name: 'Tent 1' });
    const vm = createGrowspacesTabViewModel(s, baseDeps);
    expect(vm.state).toEqual({ mode: 'confirm-delete', name: 'Tent 1' });
  });
});
