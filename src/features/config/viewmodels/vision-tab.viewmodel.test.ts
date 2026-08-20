import { describe, it, expect } from 'vitest';
import { createVisionTabViewModel, type VisionTabDeps } from './vision-tab.viewmodel';
import { createInitialSM, transition } from '../../../dialogs/config-dialog-sm';
import type { ConfigDialogSM } from '../../../dialogs/config-dialog-sm';

const noDeps: VisionTabDeps = { entityOptions: () => [] };

function sm(): ConfigDialogSM {
  return createInitialSM();
}

describe('createVisionTabViewModel', () => {
  it('requests camera-domain options and reflects hasCameras=false when empty', () => {
    const deps: VisionTabDeps = { entityOptions: (domains) => (domains[0] === 'camera' ? ['camera.a'] : []) };
    const vm = createVisionTabViewModel(sm(), deps);
    expect(vm.cameraOptions).toEqual(['camera.a']);
    expect(vm.hasCameras).toBe(false);
    expect(vm.cameraEntities).toEqual([]);
  });

  it('flips hasCameras once a camera is configured', () => {
    const s = transition(sm(), { type: 'UPDATE_ENV_DRAFT', partial: { cameraEntities: ['camera.a'] } });
    const vm = createVisionTabViewModel(s, noDeps);
    expect(vm.hasCameras).toBe(true);
    expect(vm.cameraEntities).toEqual(['camera.a']);
  });

  it('projects the checkup schedule fields from the draft', () => {
    const s = transition(sm(), {
      type: 'UPDATE_ENV_DRAFT',
      partial: { visionEnabled: true, visionEarlyOffset: 30, visionMidHours: 6, visionLateOffset: 45 },
    });
    const vm = createVisionTabViewModel(s, noDeps);
    expect(vm.visionEnabled).toBe(true);
    expect(vm.earlyOffset).toBe(30);
    expect(vm.midHours).toBe(6);
    expect(vm.lateOffset).toBe(45);
  });
});
