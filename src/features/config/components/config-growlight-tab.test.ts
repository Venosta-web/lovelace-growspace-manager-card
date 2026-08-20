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
    acInfinityPortDevices: [],
    growlightPortDeviceIds: [],
    growlightPrefillWarnings: [],
    growlightDuplicateWarnings: [],
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
  it('renders the enable checkbox and an editable lights-on input', async () => {
    const el = await mount(makeVm({ lightsOnTime: '06:00' }));
    expect(el.shadowRoot!.textContent).toContain('Enable grow light controller');
    const input = [...el.shadowRoot!.querySelectorAll('md3-text-input')].find(
      (n) => n.getAttribute('label') === 'Lights On Time'
    );
    expect(input).toBeDefined();
    expect((input as { value?: string }).value).toBe('06:00');
    // The old "edit on the Steering tab" pointer is gone — this tab owns it now.
    expect(el.shadowRoot!.textContent).not.toContain('Irrigation → Steering');
  });

  it('editing lights-on dispatches lights-on-changed (not env-draft-changed)', async () => {
    const el = await mount(makeVm({ lightsOnTime: '06:00' }));
    const envPartials = listenPartials(el);
    let emitted: string | undefined;
    el.addEventListener('lights-on-changed', (e: Event) => {
      emitted = (e as CustomEvent).detail.lightsOnTime;
    });
    const input = [...el.shadowRoot!.querySelectorAll('md3-text-input')].find(
      (n) => n.getAttribute('label') === 'Lights On Time'
    )! as HTMLElement & { value: string };
    input.value = '07:30';
    input.dispatchEvent(
      new CustomEvent('change', { detail: '07:30', bubbles: true, composed: true })
    );
    expect(emitted).toBe('07:30');
    // Lights-on is a strategy field — it must not ride the buffered env draft.
    expect(envPartials).toHaveLength(0);
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

  it('scrolls + pulses the lights-on input when deep-linked via scrollToField (#433)', async () => {
    const el = await mount(makeVm({ lightsOnTime: '06:00' }));
    const input = el.shadowRoot!.querySelector(
      '[data-scroll-target="lightsOnTime"]'
    ) as HTMLElement;
    // scrollIntoView is unreliable in headless layout — stub it so we assert the pulse.
    input.scrollIntoView = () => {};
    el.scrollToField = 'lightsOnTime';
    await el.updateComplete;
    expect(input.classList.contains('field-pulse')).toBe(true);
  });

  it('does not pulse for an unrelated scrollToField', async () => {
    const el = await mount(makeVm({ lightsOnTime: '06:00' }));
    const input = el.shadowRoot!.querySelector(
      '[data-scroll-target="lightsOnTime"]'
    ) as HTMLElement;
    el.scrollToField = 'somethingElse';
    await el.updateComplete;
    expect(input.classList.contains('field-pulse')).toBe(false);
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

  it('renders the AC Infinity remove control as a focusable button', async () => {
    const el = await mount(
      makeVm({
        enabled: true,
        disabled: false,
        acInfinityDevices: [
          {
            mode_entity: 'select.m',
            on_time_entity: 'time.on',
            off_time_entity: 'time.off',
            power_entity: 'number.p',
            sunrise_switch_entity: 'switch.s',
            sunrise_duration_entity: 'number.duration',
          },
        ],
      })
    );
    const remove = el.shadowRoot!.querySelector<HTMLButtonElement>(
      '.ac-infinity-device .chip-remove'
    )!;

    expect(remove.tagName).toBe('BUTTON');
    expect(remove.tabIndex).toBe(0);
  });
});

function listen<T = unknown>(el: HTMLElement, type: string): T[] {
  const received: T[] = [];
  el.addEventListener(type, (e: Event) => received.push((e as CustomEvent).detail as T));
  return received;
}

function devicePickers(el: ConfigGrowlightTab): Element[] {
  return [...el.shadowRoot!.querySelectorAll('md3-select')].filter(
    (s) => (s as unknown as { label: string }).label === 'AC Infinity device'
  );
}

describe('ConfigGrowlightTab — Port Pre-fill', () => {
  const withPort = () =>
    makeVm({
      acInfinityDevices: [
        {
          mode_entity: 'select.m',
          on_time_entity: '',
          off_time_entity: '',
          power_entity: '',
          sunrise_switch_entity: '',
          sunrise_duration_entity: '',
        },
      ],
      acInfinityPortDevices: [{ id: 'dev1', label: 'Grow Tent Port 1' }],
      growlightPortDeviceIds: ['dev1'],
      growlightPrefillWarnings: [[]],
    });

  it('renders a device picker per grow light port, valued from the derived device id', async () => {
    const el = await mount(withPort());
    const pickers = devicePickers(el);
    expect(pickers.length).toBe(1);
    expect((pickers[0] as unknown as { value: string }).value).toBe('dev1');
    expect((pickers[0] as unknown as { options: unknown[] }).options).toEqual([
      { label: 'Grow Tent Port 1', value: 'dev1' },
    ]);
  });

  it('emits pick-ac-infinity-device targeting the grow light bundle field', async () => {
    const el = await mount(withPort());
    const events = listen<{ field: string; index: number; deviceId: string }>(
      el,
      'pick-ac-infinity-device'
    );
    devicePickers(el)[0].dispatchEvent(
      new CustomEvent('change', { detail: 'dev1', bubbles: true, composed: true })
    );
    expect(events).toEqual([{ field: 'growlightAcInfinityDevices', index: 0, deviceId: 'dev1' }]);
  });

  it('renders the inline warning naming the roles the VM reports missing', async () => {
    const vm = withPort();
    vm.growlightPrefillWarnings = [['Sunrise switch', 'Sunrise duration']];
    const el = await mount(vm);
    expect(el.shadowRoot!.textContent).toContain('Sunrise switch');
  });
});
