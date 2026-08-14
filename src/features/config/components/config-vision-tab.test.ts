import { describe, it, expect, afterEach } from 'vitest';
import './config-vision-tab';
import type { ConfigVisionTab } from './config-vision-tab';
import type { VisionTabViewModel } from '../viewmodels/vision-tab.viewmodel';
import type { EnvironmentDraft } from '../../../dialogs/config-dialog-sm';

function makeVm(over: Partial<VisionTabViewModel> = {}): VisionTabViewModel {
  return {
    cameraEntities: [],
    cameraOptions: [],
    hasCameras: false,
    visionEnabled: false,
    earlyOffset: 15,
    midHours: 6,
    lateOffset: 15,
    ...over,
  };
}

async function mount(vm: VisionTabViewModel): Promise<ConfigVisionTab> {
  const el = document.createElement('config-vision-tab') as ConfigVisionTab;
  el.vm = vm;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

function listenPartials(el: HTMLElement): Array<Partial<EnvironmentDraft>> {
  const received: Array<Partial<EnvironmentDraft>> = [];
  el.addEventListener('env-draft-changed', (e: Event) =>
    received.push((e as CustomEvent).detail.partial)
  );
  return received;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ConfigVisionTab — render', () => {
  it('shows the hint and hides the schedule form when no camera is configured', async () => {
    const el = await mount(makeVm({ hasCameras: false }));
    expect(el.shadowRoot!.textContent).toContain('Add camera entities above');
    expect(el.shadowRoot!.querySelector('.form-section')).toBeNull();
  });

  it('shows the schedule form (toggle + 3 inputs) once a camera is configured', async () => {
    const el = await mount(makeVm({ hasCameras: true, cameraEntities: ['camera.a'] }));
    expect(el.shadowRoot!.querySelector('.form-section')).not.toBeNull();
    expect(el.shadowRoot!.querySelectorAll('md3-number-input').length).toBe(3);
    const picker = el.shadowRoot!.querySelector('config-entity-multi-select')!;
    expect(picker.shadowRoot!.querySelector('.chip')!.textContent).toContain('camera.a');
  });
});

describe('ConfigVisionTab — intents out', () => {
  it('emits env-draft-changed adding a camera entity', async () => {
    const el = await mount(makeVm());
    const received = listenPartials(el);
    const picker = el.shadowRoot!.querySelector('config-entity-multi-select')!;
    const input = picker.shadowRoot!.querySelector<HTMLInputElement>('input')!;
    input.value = 'camera.new';
    input.dispatchEvent(new Event('change'));
    expect(received).toEqual([{ cameraEntities: ['camera.new'] }]);
  });

  it('emits visionEnabled and offset changes from the schedule form', async () => {
    const el = await mount(makeVm({ hasCameras: true, cameraEntities: ['camera.a'] }));
    const received = listenPartials(el);

    const toggle = el.shadowRoot!.querySelector<HTMLInputElement>('.checkbox-label input[type="checkbox"]')!;
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    expect(received[0]).toEqual({ visionEnabled: true });

    const early = el.shadowRoot!.querySelector('md3-number-input')!;
    early.dispatchEvent(new CustomEvent('change', { detail: '30', bubbles: true, composed: true }));
    expect(received[1]).toEqual({ visionEarlyOffset: 30 });
  });
});
