import { describe, it, expect, afterEach } from 'vitest';
import './config-climate-tab';
import type { ConfigClimateTab } from './config-climate-tab';
import { createInitialSM } from '../../../dialogs/config-dialog-sm';
import type { ClimateTabViewModel } from '../viewmodels/climate-tab.viewmodel';
import type { EnvironmentDraft } from '../../../dialogs/config-dialog-sm';

const defaults = createInitialSM().environmentDraft;

function makeVm(over: Partial<ClimateTabViewModel> = {}): ClimateTabViewModel {
  return {
    control: {
      exhaustFanEntities: [],
      exhaustFanOptions: [],
      circulationFanEntities: [],
      circulationFanOptions: [],
      exhaustFanAcInfinityDevices: [],
      circulationFanAcInfinityDevices: [],
      acInfinityModeOptions: [],
      acInfinitySpeedOptions: [],
      acInfinityConflicts: {},
      acInfinityPortDevices: [],
      exhaustFanPortDeviceIds: [],
      circulationFanPortDeviceIds: [],
      exhaustFanPrefillWarnings: [],
      circulationFanPrefillWarnings: [],
      exhaustFanDuplicateWarnings: [],
      circulationFanDuplicateWarnings: [],
      stressThreshold: 0.7,
      moldThreshold: 0.85,
      canRemoveEnvironment: true,
      ...over.control,
    },
    fan: {
      config: defaults.circulationFanConfig,
      disabled: false,
      mode: 'vpd',
      showStageVpd: true,
      showStageVpdTable: false,
      vpdTargetLabel: 'VPD Target (kPa)',
      vpdTargetDimmed: false,
      showTempOverride: true,
      tempOverrideExpanded: false,
      showWind: false,
      ...over.fan,
    },
    exhaust: {
      config: defaults.exhaustFanConfig,
      disabled: false,
      showStageVpdTable: false,
      vpdTargetLabel: 'VPD Target (kPa)',
      vpdTargetDimmed: false,
      criticalTempExpanded: false,
      ...over.exhaust,
    },
  };
}

async function mount(vm: ClimateTabViewModel): Promise<ConfigClimateTab> {
  const el = document.createElement('config-climate-tab') as ConfigClimateTab;
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

function listen<T = unknown>(el: HTMLElement, type: string): T[] {
  const received: T[] = [];
  el.addEventListener(type, (e: Event) => received.push((e as CustomEvent).detail as T));
  return received;
}

function checkbox(el: ConfigClimateTab, labelText: string): HTMLInputElement {
  const label = [...el.shadowRoot!.querySelectorAll('label.checkbox-label')].find((l) =>
    l.textContent?.includes(labelText)
  )!;
  return label.querySelector('input[type="checkbox"]')!;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ConfigClimateTab — render', () => {
  it('renders the three section headers', async () => {
    const el = await mount(makeVm());
    const headers = [...el.shadowRoot!.querySelectorAll('h3')].map((h) => h.textContent);
    expect(headers).toEqual(['Climate Control', 'Fan Controller', 'Exhaust Fan Controller']);
  });

  it('shows the stage-vpd table only when the fan VM says so', async () => {
    const without = await mount(makeVm());
    expect(without.shadowRoot!.querySelector('stage-vpd-overrides-table')).toBeNull();
    document.body.innerHTML = '';
    const withTable = await mount(makeVm({ fan: { ...makeVm().fan, showStageVpdTable: true } }));
    expect(withTable.shadowRoot!.querySelector('stage-vpd-overrides-table')).not.toBeNull();
  });

  it('uses the Fallback label the VM provides', async () => {
    const el = await mount(makeVm({ fan: { ...makeVm().fan, vpdTargetLabel: 'Fallback VPD Target (kPa)' } }));
    const labels = [...el.shadowRoot!.querySelectorAll('md3-number-input')].map((n) => n.getAttribute('label'));
    expect(labels).toContain('Fallback VPD Target (kPa)');
  });
});

function devicePickers(el: ConfigClimateTab): Element[] {
  return [...el.shadowRoot!.querySelectorAll('md3-select')].filter(
    (s) => (s as unknown as { label: string }).label === 'AC Infinity device'
  );
}

describe('ConfigClimateTab — Port Pre-fill', () => {
  const withPort = () =>
    makeVm({
      control: {
        ...makeVm().control,
        exhaustFanAcInfinityDevices: [{ mode_entity: 'select.m', speed_entity: '', on_speed: 10 }],
        acInfinityPortDevices: [{ id: 'dev1', label: 'Grow Tent Port 1' }],
        exhaustFanPortDeviceIds: ['dev1'],
        exhaustFanPrefillWarnings: [[]],
      },
    });

  it('renders a device picker per port, valued from the derived device id', async () => {
    const el = await mount(withPort());
    const pickers = devicePickers(el);
    expect(pickers.length).toBe(1);
    expect((pickers[0] as unknown as { value: string }).value).toBe('dev1');
    expect((pickers[0] as unknown as { options: unknown[] }).options).toEqual([
      { label: 'Grow Tent Port 1', value: 'dev1' },
    ]);
  });

  it('emits pick-ac-infinity-device with the field, index and picked device', async () => {
    const el = await mount(withPort());
    const events = listen<{ field: string; index: number; deviceId: string }>(
      el,
      'pick-ac-infinity-device'
    );
    devicePickers(el)[0].dispatchEvent(
      new CustomEvent('change', { detail: 'dev1', bubbles: true, composed: true })
    );
    expect(events).toEqual([
      { field: 'exhaustFanAcInfinityDevices', index: 0, deviceId: 'dev1' },
    ]);
  });

  it('renders the inline warning naming the roles the VM reports missing', async () => {
    const vm = withPort();
    vm.control.exhaustFanPrefillWarnings = [['Speed']];
    const el = await mount(vm);
    expect(el.shadowRoot!.textContent).toContain('Speed');
  });

  it('renders the Duplicate Port Warning the VM supplies for a port', async () => {
    const vm = withPort();
    vm.control.exhaustFanDuplicateWarnings = [
      'This port is also configured as Dehumidifier — two controllers would fight over it.',
    ];
    const el = await mount(vm);
    expect(el.shadowRoot!.textContent).toContain('also configured as Dehumidifier');
  });
});

describe('ConfigClimateTab — intents out', () => {
  it('forwards the circulation fan enabled toggle as a fan-config partial', async () => {
    const el = await mount(makeVm());
    const received = listen<{ partial: Record<string, unknown> }>(el, 'fan-config-changed');
    checkbox(el, 'Enabled').checked = false; // first Enabled is the fan controller's
    checkbox(el, 'Enabled').dispatchEvent(new Event('change'));
    expect(received).toEqual([{ partial: { enabled: false } }]);
  });

  it('forwards the regulation mode change as a fan-config partial', async () => {
    const el = await mount(makeVm());
    const received = listen<{ partial: Record<string, unknown> }>(el, 'fan-config-changed');
    const select = el.shadowRoot!.querySelector('md3-select')!;
    select.dispatchEvent(new CustomEvent('change', { detail: 'humidity', bubbles: true, composed: true }));
    expect(received).toEqual([{ partial: { regulation_mode: 'humidity' } }]);
  });

  it('forwards an exhaust-config edit as an exhaust-config partial', async () => {
    const el = await mount(makeVm());
    const received = listen<{ partial: Record<string, unknown> }>(el, 'exhaust-config-changed');
    // The exhaust panel's Enabled is the second checkbox with that label.
    const exhaustEnabled = [...el.shadowRoot!.querySelectorAll('label.checkbox-label')]
      .filter((l) => l.textContent?.includes('Enabled'))[1]
      .querySelector('input[type="checkbox"]') as HTMLInputElement;
    exhaustEnabled.checked = true;
    exhaustEnabled.dispatchEvent(new Event('change'));
    expect(received).toEqual([{ partial: { enabled: true } }]);
  });

  it('emits the two expander toggle intents', async () => {
    const el = await mount(makeVm());
    let fanToggle = 0;
    let exhaustToggle = 0;
    el.addEventListener('toggle-fan-temp-override', () => fanToggle++);
    el.addEventListener('toggle-exhaust-critical-temp', () => exhaustToggle++);
    const btn = (t: string) =>
      [...el.shadowRoot!.querySelectorAll('button')].find((b) => b.textContent?.includes(t))!;
    btn('Temperature Override').click();
    btn('Critical Temperature').click();
    expect(fanToggle).toBe(1);
    expect(exhaustToggle).toBe(1);
  });

  it('emits remove-environment-requested', async () => {
    const el = await mount(makeVm());
    let fired = 0;
    el.addEventListener('remove-environment-requested', () => fired++);
    [...el.shadowRoot!.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Remove Environment')!.click();
    expect(fired).toBe(1);
  });

  it('emits a top-level threshold change', async () => {
    const el = await mount(makeVm());
    const received = listenPartials(el);
    const stress = [...el.shadowRoot!.querySelectorAll('md3-number-input')].find(
      (n) => n.getAttribute('label') === 'Stress Threshold %'
    )!;
    stress.dispatchEvent(new CustomEvent('change', { detail: '0.9', bubbles: true, composed: true }));
    expect(received).toEqual([{ stressThreshold: 0.9 }]);
  });
});

describe('ConfigClimateTab — AC Infinity editor', () => {
  function vmWithExhaustDevice() {
    const base = makeVm();
    return {
      ...base,
      control: {
        ...base.control,
        exhaustFanAcInfinityDevices: [
          { mode_entity: 'select.port1_mode', speed_entity: 'number.port1_speed', on_speed: 8 },
        ],
      },
    };
  }

  it('renders a device card per configured bundle', async () => {
    const el = await mount(vmWithExhaustDevice());
    const text = el.shadowRoot!.textContent ?? '';
    expect(text).toContain('Exhaust Fan AC Infinity Devices');
    expect(text).toContain('Port 1');
  });

  it('appends a blank device when Add is clicked', async () => {
    const el = await mount(vmWithExhaustDevice());
    const partials = listenPartials(el);
    const addBtn = [...el.shadowRoot!.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Add AC Infinity device')
    )!;
    addBtn.click();
    expect(partials).toHaveLength(1);
    expect(partials[0].exhaustFanAcInfinityDevices).toHaveLength(2);
    expect(partials[0].exhaustFanAcInfinityDevices![1]).toEqual({
      mode_entity: '',
      speed_entity: '',
      on_speed: 10,
    });
  });

  it('removes a device when its × is clicked', async () => {
    const el = await mount(vmWithExhaustDevice());
    const partials = listenPartials(el);
    const removeBtn = el.shadowRoot!.querySelector('.ac-infinity-device .chip-remove') as HTMLElement;
    removeBtn.click();
    expect(partials).toHaveLength(1);
    expect(partials[0].exhaustFanAcInfinityDevices).toEqual([]);
  });

  it('renders the mode and speed pickers as md3-select, not free-text inputs', async () => {
    const el = await mount(vmWithExhaustDevice());
    const card = el.shadowRoot!.querySelector('.ac-infinity-device')!;
    const selects = card.querySelectorAll('md3-select');
    expect(selects).toHaveLength(2);
    expect(card.querySelector('input[list]')).toBeNull();
  });

  it('forwards a mode-picker change as an updated device bundle', async () => {
    const el = await mount(vmWithExhaustDevice());
    const partials = listenPartials(el);
    const modeSelect = el.shadowRoot!.querySelector('.ac-infinity-device md3-select')!;
    modeSelect.dispatchEvent(
      new CustomEvent('change', { detail: 'select.new_mode', bubbles: true, composed: true })
    );
    expect(partials[0].exhaustFanAcInfinityDevices).toEqual([
      { mode_entity: 'select.new_mode', speed_entity: 'number.port1_speed', on_speed: 8 },
    ]);
  });

  it('keeps an already-saved value in the option list even when the filter excludes it', async () => {
    const base = makeVm();
    const el = await mount({
      ...base,
      control: {
        ...base.control,
        acInfinityModeOptions: ['select.other'],
        exhaustFanAcInfinityDevices: [
          { mode_entity: 'select.legacy', speed_entity: '', on_speed: 8 },
        ],
      },
    });
    const modeSelect = el.shadowRoot!.querySelector('.ac-infinity-device md3-select')!;
    expect((modeSelect as unknown as { options: string[] }).options).toContain('select.legacy');
  });

  it('renders the section title in normal flow, not absolutely positioned', async () => {
    const el = await mount(vmWithExhaustDevice());
    const editor = el.shadowRoot!.querySelector('.ac-infinity-editor')!;
    const title = [...editor.children].find((c) =>
      c.textContent?.includes('Exhaust Fan AC Infinity Devices')
    )!;
    expect(getComputedStyle(title).position).not.toBe('absolute');
  });

  it('renders an Automated Mode Conflict warning for a port in a self-running mode', async () => {
    const vm = vmWithExhaustDevice();
    vm.control.acInfinityConflicts = {
      'select.port1_mode': { deviceName: 'Grow Tent Port 1', mode: 'VPD' },
    };
    const el = await mount(vm);
    const warning = el.shadowRoot!.querySelector('.ac-infinity-mode-conflict');
    expect(warning).not.toBeNull();
    const text = warning!.textContent ?? '';
    expect(text).toContain('Grow Tent Port 1');
    expect(text).toContain('VPD');
  });

  it('renders no warning when the port has no conflict', async () => {
    const el = await mount(vmWithExhaustDevice());
    expect(el.shadowRoot!.querySelector('.ac-infinity-mode-conflict')).toBeNull();
  });
});
