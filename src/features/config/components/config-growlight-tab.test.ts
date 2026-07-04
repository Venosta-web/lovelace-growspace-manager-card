import { describe, it, expect, afterEach } from 'vitest';
import './config-growlight-tab';
import type { ConfigGrowlightTab } from './config-growlight-tab';
import type { GrowlightTabViewModel } from '../viewmodels/growlight-tab.viewmodel';
import type { EnvironmentDraft } from '../../../dialogs/config-dialog-sm';

function makeVm(over: Partial<GrowlightTabViewModel> = {}): GrowlightTabViewModel {
  return {
    enabled: false,
    power: 100,
    sunriseEnabled: false,
    sunriseMinutes: 0,
    disabled: true,
    growlightEntities: [],
    growlightEntityOptions: ['switch.grow', 'light.bar'],
    acInfinityDevices: [],
    modeOptions: ['select.m'],
    timeOptions: ['time.on', 'time.off'],
    numberOptions: ['number.p'],
    switchOptions: ['switch.s'],
    lightsOnTime: null,
    ...over,
  };
}

async function mount(vm: GrowlightTabViewModel): Promise<ConfigGrowlightTab> {
  const el = document.createElement('config-growlight-tab') as ConfigGrowlightTab;
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

function checkbox(el: ConfigGrowlightTab, labelText: string): HTMLInputElement {
  const label = [...el.shadowRoot!.querySelectorAll('label.checkbox-label')].find((l) =>
    l.textContent?.includes(labelText)
  )!;
  return label.querySelector('input[type="checkbox"]')!;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ConfigGrowlightTab', () => {
  it('renders the enable checkbox and the anchor note', async () => {
    const el = await mount(makeVm());
    expect(el.shadowRoot!.textContent).toContain('Enable grow light controller');
    expect(el.shadowRoot!.textContent).toContain('Irrigation → Steering');
  });

  it('enabling the controller dispatches growlightConfig.enabled=true', async () => {
    const el = await mount(makeVm());
    const partials = listenPartials(el);
    checkbox(el, 'Enable grow light controller').click();
    expect(partials[partials.length - 1]?.growlightConfig?.enabled).toBe(true);
  });

  it('greys the controls out when disabled', async () => {
    const el = await mount(makeVm({ disabled: true }));
    expect(el.shadowRoot!.querySelector('.disabled')).not.toBeNull();
  });

  it('shows the sunrise duration input only when sunrise is enabled', async () => {
    const off = await mount(makeVm({ enabled: true, disabled: false }));
    const offLabels = [...off.shadowRoot!.querySelectorAll('md3-number-input')].map((n) =>
      n.getAttribute('label')
    );
    expect(offLabels).not.toContain('Sunrise duration (minutes)');
    document.body.innerHTML = '';
    const on = await mount(makeVm({ enabled: true, disabled: false, sunriseEnabled: true }));
    const onLabels = [...on.shadowRoot!.querySelectorAll('md3-number-input')].map((n) =>
      n.getAttribute('label')
    );
    expect(onLabels).toContain('Sunrise duration (minutes)');
  });

  it('adds an AC Infinity grow light port via the editor', async () => {
    const el = await mount(makeVm({ enabled: true, disabled: false }));
    const partials = listenPartials(el);
    const addBtn = [...el.shadowRoot!.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Add AC Infinity grow light')
    )!;
    addBtn.click();
    expect(partials[partials.length - 1]?.growlightAcInfinityDevices).toHaveLength(1);
  });
});
