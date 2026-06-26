import { describe, it, expect } from 'vitest';
import { createHeatmapTabViewModel } from './heatmap-tab.viewmodel';
import { createInitialSM, transition } from '../../../dialogs/config-dialog-sm';
import type { ConfigDialogSM } from '../../../dialogs/config-dialog-sm';
import type { SensorGroup } from '../../../types';

function sm(): ConfigDialogSM {
  return createInitialSM();
}

const group: SensorGroup = { id: 'g1', name: 'Group A', x: 1, y: 2, z: 3, sensors: [] } as SensorGroup;

describe('createHeatmapTabViewModel', () => {
  it('reports the empty state when there are no sensor groups', () => {
    const vm = createHeatmapTabViewModel(sm());
    expect(vm.groups).toEqual([]);
    expect(vm.showEmpty).toBe(true);
  });

  it('projects the sensor groups from the env draft', () => {
    const s = transition(sm(), { type: 'UPDATE_ENV_DRAFT', partial: { sensorGroups: [group] } });
    const vm = createHeatmapTabViewModel(s);
    expect(vm.groups).toEqual([group]);
    expect(vm.showEmpty).toBe(false);
  });
});
