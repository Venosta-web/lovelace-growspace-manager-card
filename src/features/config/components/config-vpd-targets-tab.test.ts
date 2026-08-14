import { describe, it, expect, afterEach } from 'vitest';
import './config-vpd-targets-tab';
import type { ConfigVpdTargetsTab } from './config-vpd-targets-tab';
import type { VpdStageVM, VpdTargetsTabViewModel } from '../viewmodels/vpd-targets-tab.viewmodel';

function stage(over: Partial<VpdStageVM> = {}): VpdStageVM {
  return {
    key: 'veg',
    label: 'Vegetative',
    color: '#4caf50',
    open: false,
    day: { low: 0.8, high: 1.2 },
    night: { low: 0.7, high: 1.0 },
    ...over,
  };
}

function makeVm(over: Partial<VpdTargetsTabViewModel> = {}): VpdTargetsTabViewModel {
  return { stages: [stage()], ...over };
}

async function mount(vm: VpdTargetsTabViewModel): Promise<ConfigVpdTargetsTab> {
  const el = document.createElement('config-vpd-targets-tab') as ConfigVpdTargetsTab;
  el.vm = vm;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

function listen<T = unknown>(el: HTMLElement, type: string): T[] {
  const received: T[] = [];
  el.addEventListener(type, (e: Event) => received.push((e as CustomEvent).detail as T));
  return received;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ConfigVpdTargetsTab — render', () => {
  it('renders an accordion row per stage and a reset button', async () => {
    const el = await mount(
      makeVm({ stages: [stage({ key: 'veg' }), stage({ key: 'flower_mid' })] })
    );
    const accordion = el.shadowRoot!.querySelector('config-stage-accordion')!;
    expect(accordion.stages).toHaveLength(2);
    const reset = el.shadowRoot!.querySelector('.config-reset-button');
    expect(reset).toBeDefined();
    expect(reset!.textContent).toContain('Reset to defaults');
  });

  it('shows the collapsed day/night summary closed, four inputs open', async () => {
    const closed = await mount(makeVm({ stages: [stage({ open: false })] }));
    expect(closed.shadowRoot!.querySelector('.acc-head-desc')).not.toBeNull();
    expect(closed.shadowRoot!.querySelector('md3-number-input')).toBeNull();
    document.body.innerHTML = '';
    const open = await mount(makeVm({ stages: [stage({ open: true })] }));
    expect(open.shadowRoot!.querySelectorAll('md3-number-input').length).toBe(4);
  });
});

describe('ConfigVpdTargetsTab — intents out', () => {
  it('emits toggle-stage with the stage key', async () => {
    const el = await mount(makeVm({ stages: [stage({ key: 'flower_late' })] }));
    const received = listen<{ key: string }>(el, 'toggle-stage');
    const accordion = el.shadowRoot!.querySelector('config-stage-accordion')!;
    accordion.shadowRoot!.querySelector<HTMLElement>('.acc-head')!.click();
    expect(received).toEqual([{ key: 'flower_late' }]);
  });

  it('emits reset-vpd-optimal on the reset button', async () => {
    const el = await mount(makeVm());
    let fired = 0;
    el.addEventListener('reset-vpd-optimal', () => fired++);
    [...el.shadowRoot!.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Reset to defaults'))!
      .click();
    expect(fired).toBe(1);
  });

  it('forwards an optimal edit with key/period/slot/value (raw detail)', async () => {
    const el = await mount(makeVm({ stages: [stage({ key: 'veg', open: true })] }));
    const received = listen<{ key: string; period: string; slot: string; value: string }>(
      el,
      'update-vpd-optimal'
    );
    // First md3-number-input under the open stage = Day / Low.
    const first = el.shadowRoot!.querySelector('md3-number-input')!;
    first.dispatchEvent(
      new CustomEvent('change', { detail: '0.95', bubbles: true, composed: true })
    );
    expect(received).toEqual([{ key: 'veg', period: 'day', slot: 'low', value: '0.95' }]);
  });
});
