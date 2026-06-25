import { describe, it, expect, afterEach } from 'vitest';
import './config-humidity-tab';
import type { ConfigHumidityTab } from './config-humidity-tab';
import type {
  HumidityTabViewModel,
  HumidityStageVM,
} from '../viewmodels/humidity-tab.viewmodel';

function stage(over: Partial<HumidityStageVM> = {}): HumidityStageVM {
  return {
    id: 'veg',
    label: 'Vegetative',
    color: '#4caf50',
    open: false,
    dehumKey: 'veg',
    humKey: 'veg',
    dehum: { day: { on: 0.6, off: 0.7 }, night: { on: 0.65, off: 0.75 } },
    hum: { day: { on: 1.0, off: 0.8 }, night: { on: 0.85, off: 0.65 } },
    ...over,
  };
}

function makeVm(over: Partial<HumidityTabViewModel> = {}): HumidityTabViewModel {
  return {
    humidifierEntities: [],
    humidifierOptions: [],
    dehumidifierEntities: [],
    dehumidifierOptions: [],
    humidifierControlEnabled: false,
    dehumidifierControlEnabled: false,
    stages: [stage()],
    ...over,
  };
}

async function mount(vm: HumidityTabViewModel): Promise<ConfigHumidityTab> {
  const el = document.createElement('config-humidity-tab') as ConfigHumidityTab;
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

function checkbox(el: ConfigHumidityTab, labelText: string): HTMLInputElement {
  const label = [...el.shadowRoot!.querySelectorAll('label.checkbox-label')].find((l) =>
    l.textContent?.includes(labelText)
  )!;
  return label.querySelector('input[type="checkbox"]')!;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ConfigHumidityTab — render', () => {
  it('renders both device pickers and an accordion row per stage', async () => {
    const el = await mount(makeVm({ stages: [stage({ id: 'veg' }), stage({ id: 'seedling' })] }));
    expect(el.shadowRoot!.querySelectorAll('.multi-select-container').length).toBe(2);
    expect(el.shadowRoot!.querySelectorAll('.acc-card').length).toBe(2);
  });

  it('shows the collapsed summary when a stage is closed, thresholds when open', async () => {
    const closed = await mount(makeVm({ stages: [stage({ open: false })] }));
    expect(closed.shadowRoot!.querySelector('.acc-head-desc')).not.toBeNull();
    expect(closed.shadowRoot!.querySelector('.acc-body')).toBeNull();
    document.body.innerHTML = '';
    const open = await mount(makeVm({ stages: [stage({ open: true })] }));
    expect(open.shadowRoot!.querySelector('.acc-body')).not.toBeNull();
    // dehum (2) + hum (2) cycles × on/off = 8 inputs when open
    expect(open.shadowRoot!.querySelectorAll('md3-number-input').length).toBe(8);
  });
});

describe('ConfigHumidityTab — intents out', () => {
  it('emits set-humidifier-control / set-dehumidifier-control on the toggles', async () => {
    const el = await mount(makeVm());
    const hum = listen<{ enabled: boolean }>(el, 'set-humidifier-control');
    const dehum = listen<{ enabled: boolean }>(el, 'set-dehumidifier-control');
    const h = checkbox(el, 'Enable Humidifier Control');
    h.checked = true;
    h.dispatchEvent(new Event('change'));
    const d = checkbox(el, 'Enable Dehumidifier Control');
    d.checked = true;
    d.dispatchEvent(new Event('change'));
    expect(hum).toEqual([{ enabled: true }]);
    expect(dehum).toEqual([{ enabled: true }]);
  });

  it('emits toggle-stage with the display id on accordion-head click', async () => {
    const el = await mount(makeVm({ stages: [stage({ id: 'veg' })] }));
    const received = listen<{ stageId: string }>(el, 'toggle-stage');
    el.shadowRoot!.querySelector<HTMLElement>('.acc-head')!.click();
    expect(received).toEqual([{ stageId: 'veg' }]);
  });

  it('emits env-draft-changed when adding a humidifier entity', async () => {
    const el = await mount(makeVm());
    const received = listen<{ partial: Record<string, unknown> }>(el, 'env-draft-changed');
    const input = el.shadowRoot!.querySelector<HTMLInputElement>(
      '.multi-select-container input.search-input-inner'
    )!;
    input.value = 'switch.new';
    input.dispatchEvent(new Event('change'));
    expect(received).toEqual([{ partial: { humidifierEntities: ['switch.new'] } }]);
  });

  it('forwards a dehumidifier threshold edit with the enum-value key + cycle/point', async () => {
    const el = await mount(makeVm({ stages: [stage({ id: 'veg', dehumKey: 'veg', open: true })] }));
    const received = listen<{ stage: string; cycle: string; point: string; value: number }>(
      el,
      'update-dehum-threshold'
    );
    // First md3-number-input under the open stage = Dehumidifier / Day / On Above.
    const firstInput = el.shadowRoot!.querySelector('md3-number-input')!;
    firstInput.dispatchEvent(new CustomEvent('change', { detail: '0.42', bubbles: true, composed: true }));
    expect(received).toEqual([{ stage: 'veg', cycle: 'day', point: 'on', value: 0.42 }]);
  });
});
