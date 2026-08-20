import { describe, it, expect } from 'vitest';
import { createSubareasTabViewModel, type SubareasTabDeps } from './subareas-tab.viewmodel';
import { createInitialSM, transition } from '../../../dialogs/config-dialog-sm';
import type { ConfigDialogSM } from '../../../dialogs/config-dialog-sm';
import type { Subarea } from '../../../slices/subarea';

function sm(): ConfigDialogSM {
  return createInitialSM();
}

function withGrowspace(s: ConfigDialogSM): ConfigDialogSM {
  return transition(s, { type: 'UPDATE_ENV_DRAFT', partial: { selectedGrowspaceId: 'gs1' } });
}

const subA = { id: 'sa1', name: 'Zone A' } as Subarea;
const subB = { id: 'sa2', name: 'Zone B' } as Subarea;
const empty: SubareasTabDeps = { subareas: [], loading: false };

describe('createSubareasTabViewModel — gating', () => {
  it('reports no growspace when none is selected', () => {
    expect(createSubareasTabViewModel(sm(), empty).hasGrowspace).toBe(false);
  });

  it('reports a growspace from the env draft selection', () => {
    expect(createSubareasTabViewModel(withGrowspace(sm()), empty).hasGrowspace).toBe(true);
  });

  it('reports a growspace from the Growspaces tab editing id', () => {
    const s = transition(sm(), {
      type: 'SELECT_GROWSPACE',
      growspaceId: 'gs9',
      name: 'X',
      rows: 4,
      plantsPerRow: 4,
      notificationService: '',
    });
    expect(createSubareasTabViewModel(s, empty).hasGrowspace).toBe(true);
  });
});

describe('createSubareasTabViewModel — list + state', () => {
  it('shows loading / empty appropriately', () => {
    const loading = createSubareasTabViewModel(withGrowspace(sm()), { subareas: [], loading: true });
    expect(loading.loading).toBe(true);
    expect(loading.showEmpty).toBe(false);
    const emptyVm = createSubareasTabViewModel(withGrowspace(sm()), empty);
    expect(emptyVm.showEmpty).toBe(true);
  });

  it('projects each subarea row, with confirmingDelete only on the targeted one', () => {
    let s = withGrowspace(sm());
    s = transition(s, { type: 'REQUEST_DELETE_SUBAREA', subareaId: 'sa2' });
    const vm = createSubareasTabViewModel(s, { subareas: [subA, subB], loading: false });
    expect(vm.subareas.map((r) => r.subarea.id)).toEqual(['sa1', 'sa2']);
    expect(vm.subareas.find((r) => r.subarea.id === 'sa1')!.confirmingDelete).toBe(false);
    expect(vm.subareas.find((r) => r.subarea.id === 'sa2')!.confirmingDelete).toBe(true);
  });

  it('projects the add-form name when adding', () => {
    let s = withGrowspace(sm());
    s = transition(s, { type: 'BEGIN_ADD_SUBAREA' });
    s = transition(s, { type: 'UPDATE_SUBAREA_NAME', name: 'New Zone' });
    expect(createSubareasTabViewModel(s, empty).adding).toEqual({ name: 'New Zone' });
  });
});
