import { describe, it, expect } from 'vitest';
import { createVpdTargetsTabViewModel, getVpdOptimal } from './vpd-targets-tab.viewmodel';
import {
  FAN_VPD_STAGE_COLORS,
  FAN_VPD_STAGE_KEYS,
  VPD_OPTIMAL_STAGE_DEFAULTS,
  type VpdOptimalOverrides,
} from '../../../features/environment/constants';
import { createInitialSM, transition } from '../../../dialogs/config-dialog-sm';
import type { ConfigDialogSM } from '../../../dialogs/config-dialog-sm';

function sm(): ConfigDialogSM {
  return createInitialSM();
}

describe('getVpdOptimal', () => {
  it('returns the stage default when no override is present', () => {
    expect(getVpdOptimal({}, 'veg', 'day', 'low')).toBe(VPD_OPTIMAL_STAGE_DEFAULTS.veg.day.low);
  });

  it('returns the override when present', () => {
    const overrides = {
      veg: { day: { low: 0.91, high: 1.2 }, night: { low: 0.8, high: 1.0 } },
    } as VpdOptimalOverrides;
    expect(getVpdOptimal(overrides, 'veg', 'day', 'low')).toBe(0.91);
  });
});

describe('createVpdTargetsTabViewModel', () => {
  it('emits a stage VM for every fan VPD stage, with colour + label', () => {
    const vm = createVpdTargetsTabViewModel(sm(), { openStageId: '' });
    expect(vm.stages.map((s) => s.key)).toEqual([...FAN_VPD_STAGE_KEYS]);
    const veg = vm.stages.find((s) => s.key === 'veg')!;
    expect(veg.color).toBe(FAN_VPD_STAGE_COLORS.veg);
    expect(veg.label.length).toBeGreaterThan(0);
  });

  it('flags only the open stage', () => {
    const vm = createVpdTargetsTabViewModel(sm(), { openStageId: 'flower_mid' });
    expect(vm.stages.find((s) => s.key === 'flower_mid')!.open).toBe(true);
    expect(vm.stages.find((s) => s.key === 'veg')!.open).toBe(false);
  });

  it('projects defaults until overridden, then the override', () => {
    const veg0 = createVpdTargetsTabViewModel(sm(), { openStageId: '' }).stages.find(
      (s) => s.key === 'veg'
    )!;
    expect(veg0.day.low).toBe(VPD_OPTIMAL_STAGE_DEFAULTS.veg.day.low);

    const s = transition(sm(), {
      type: 'UPDATE_ENV_DRAFT',
      partial: {
        vpdOptimalOverrides: {
          veg: { day: { low: 0.95, high: 1.3 }, night: { low: 0.7, high: 0.9 } },
        },
      },
    });
    const veg1 = createVpdTargetsTabViewModel(s, { openStageId: '' }).stages.find(
      (st) => st.key === 'veg'
    )!;
    expect(veg1.day.low).toBe(0.95);
    expect(veg1.night.high).toBe(0.9);
  });
});
