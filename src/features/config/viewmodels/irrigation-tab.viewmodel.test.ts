import { describe, it, expect } from 'vitest';
import { createIrrigationTabViewModel, type IrrigationTabDeps } from './irrigation-tab.viewmodel';
import { createInitialSM, transition } from '../../../dialogs/config-dialog-sm';
import type { ConfigDialogSM } from '../../../dialogs/config-dialog-sm';

const noDeps: IrrigationTabDeps = { entityOptions: () => [] };

function sm(): ConfigDialogSM {
  return createInitialSM();
}

describe('createIrrigationTabViewModel', () => {
  it('projects the seven monitoring fields and two substrate fields in order', () => {
    const vm = createIrrigationTabViewModel(sm(), noDeps);
    expect(vm.monitoring.map((f) => f.key)).toEqual([
      'phSensors',
      'feedEcSensors',
      'runoffEcSensors',
      'drainVolumeSensors',
      'irrigationFlowSensors',
      'powerSensors',
      'energySensors',
    ]);
    expect(vm.substrate.map((f) => f.key)).toEqual(['bulkEcSensors', 'poreEcSensors']);
  });

  it('projects each field value from the environment draft', () => {
    const s = transition(sm(), {
      type: 'UPDATE_ENV_DRAFT',
      partial: { phSensors: ['sensor.ph'], bulkEcSensors: ['sensor.bulk'] },
    });
    const vm = createIrrigationTabViewModel(s, noDeps);
    expect(vm.monitoring.find((f) => f.key === 'phSensors')!.value).toEqual(['sensor.ph']);
    expect(vm.substrate.find((f) => f.key === 'bulkEcSensors')!.value).toEqual(['sensor.bulk']);
  });

  it('requests the power/energy device classes for those fields and null for the rest', () => {
    const calls: Array<string | null> = [];
    const deps: IrrigationTabDeps = {
      entityOptions: (_domains, dc) => {
        calls.push(dc);
        return dc ? [`x.${dc}`] : ['x.generic'];
      },
    };
    const vm = createIrrigationTabViewModel(sm(), deps);
    expect(vm.monitoring.find((f) => f.key === 'powerSensors')!.options).toEqual(['x.power']);
    expect(vm.monitoring.find((f) => f.key === 'energySensors')!.options).toEqual(['x.energy']);
    expect(vm.monitoring.find((f) => f.key === 'phSensors')!.options).toEqual(['x.generic']);
    expect(calls).toContain('power');
    expect(calls).toContain('energy');
  });
});
