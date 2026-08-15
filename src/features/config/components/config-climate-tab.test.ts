import { describe, it, expect, afterEach } from 'vitest';
import './config-climate-tab';
import type { ConfigClimateTab } from './config-climate-tab';
import type { Md3NumberInput } from '../../shared/ui/md3-number-input';
import { createInitialSM } from '../../../dialogs/config-dialog-sm';
import type { ClimateTabViewModel } from '../viewmodels/climate-tab.viewmodel';
import type { EnvironmentDraft } from '../../../dialogs/config-dialog-sm';
import {
  FAN_VPD_STAGE_COLORS,
  FAN_VPD_STAGE_DEFAULTS,
  FAN_VPD_STAGE_KEYS,
  FAN_VPD_STAGE_LABELS,
} from '../../environment/constants';

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
      ...over.control,
    },
    fan: {
      config: defaults.circulationFanConfig,
      disabled: false,
      mode: 'vpd',
      showStageVpd: true,
      vpdTargetLabel: 'VPD Target (kPa)',
      vpdTargetDimmed: false,
      showTempOverride: true,
      showWind: false,
      ...over.fan,
    },
    stageVpd: {
      visible: false,
      stages: FAN_VPD_STAGE_KEYS.map((id) => ({
        id,
        label: FAN_VPD_STAGE_LABELS[id],
        color: FAN_VPD_STAGE_COLORS[id],
        open: false,
        current: false,
        fan: FAN_VPD_STAGE_DEFAULTS[id],
        exhaust: FAN_VPD_STAGE_DEFAULTS[id],
      })),
      ...over.stageVpd,
    },
    exhaust: {
      config: defaults.exhaustFanConfig,
      disabled: false,
      vpdTargetLabel: 'VPD Target (kPa)',
      vpdTargetDimmed: false,
      ...over.exhaust,
    },
    units: {
      temperature: '°C',
      pressure: 'kPa',
      currentTemperature: '24.0 °C',
      ...over.units,
    },
    language: over.language ?? 'en',
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
    const headers = [...el.shadowRoot!.querySelectorAll('config-section-header')].map(
      (header) => header.label
    );
    expect(headers).toEqual(['Climate Control', 'Fan Controller', 'Exhaust Fan Controller']);
  });

  it('shows the shared stage accordion only when a stage-aware controller is active', async () => {
    const without = await mount(makeVm());
    expect(without.shadowRoot!.querySelector('config-stage-accordion')).toBeNull();
    document.body.innerHTML = '';
    const withAccordion = await mount(
      makeVm({ stageVpd: { ...makeVm().stageVpd, visible: true } })
    );
    expect(withAccordion.shadowRoot!.querySelector('config-stage-accordion')).not.toBeNull();
    expect(withAccordion.shadowRoot!.querySelector('stage-vpd-overrides-table')).toBeNull();
  });

  it('summarizes both controllers and marks the current stage', async () => {
    const vm = makeVm({ stageVpd: { ...makeVm().stageVpd, visible: true } });
    vm.stageVpd.stages[3] = {
      ...vm.stageVpd.stages[3],
      current: true,
      fan: { day: 0.7, night: 0.6 },
      exhaust: { day: 0.8, night: 0.65 },
    };
    const el = await mount(vm);
    const accordion = el.shadowRoot!.querySelector('config-stage-accordion')!;

    expect(accordion.textContent?.replaceAll(/\s+/g, ' ')).toContain(
      'Fan 0.70 / 0.60 · Exhaust 0.80 / 0.65 kPa'
    );
    expect(accordion.stages.find((stage) => stage.id === 'veg')?.current).toBe(true);
    expect(accordion.shadowRoot!.querySelector('.current-stage')).not.toBeNull();
  });

  /*
   * Raised from 1200px in #545: the 44px tap floors apply at every width, so the
   * accordion heads, tab buttons and checkbox rows are taller than #540 sized them.
   * Still a real budget — it holds the tab to roughly two desktop screens.
   */
  it('keeps the desktop Climate tab below 1300px with stage rows collapsed', async () => {
    const el = await mount(makeVm({ stageVpd: { ...makeVm().stageVpd, visible: true } }));
    el.style.width = '648px';

    const cards = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.detail-card')].map(
      (card) => card.getBoundingClientRect().height
    );
    const accordion = el.shadowRoot!.querySelector('config-stage-accordion')!;
    const headersFit = [...accordion.shadowRoot!.querySelectorAll<HTMLElement>('.acc-head')].every(
      (header) => header.scrollWidth <= header.clientWidth
    );
    expect(el.getBoundingClientRect().height, `section heights: ${cards.join(', ')}`).toBeLessThan(
      1300
    );
    expect(headersFit).toBe(true);
  });

  it('uses the Fallback label the VM provides', async () => {
    const el = await mount(
      makeVm({ fan: { ...makeVm().fan, vpdTargetLabel: 'Fallback VPD Target (kPa)' } })
    );
    const labels = [...el.shadowRoot!.querySelectorAll('md3-number-input')].map((n) =>
      n.getAttribute('label')
    );
    expect(labels).toContain('Fallback VPD Target (kPa)');
  });

  it('uses the shared reset treatment for both stage override actions', async () => {
    const el = await mount(makeVm({ stageVpd: { ...makeVm().stageVpd, visible: true } }));
    const resets = [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.config-reset-button')];
    expect(resets).toHaveLength(2);
    expect(resets.map((button) => button.textContent!.trim())).toEqual([
      'Reset Fan to defaults',
      'Reset Exhaust to defaults',
    ]);
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
    expect(events).toEqual([{ field: 'exhaustFanAcInfinityDevices', index: 0, deviceId: 'dev1' }]);
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
    select.dispatchEvent(
      new CustomEvent('change', { detail: 'humidity', bubbles: true, composed: true })
    );
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

  it('promotes both safety cutoffs out of disclosures', async () => {
    const el = await mount(makeVm());
    const safetyBands = el.shadowRoot!.querySelectorAll('.critical-temperature');
    expect(safetyBands).toHaveLength(2);
    expect(el.shadowRoot!.textContent).toContain('leaving both empty disables this safety cutoff.');
    expect(el.shadowRoot!.textContent).toContain('Current 24.0 °C');
    expect(el.shadowRoot!.querySelector('button[aria-expanded]')).toBeNull();
  });

  it('emits a complete pair when the first critical bound is entered', async () => {
    const el = await mount(makeVm());
    const changes = listen<{ partial: Record<string, unknown> }>(el, 'fan-config-changed');
    const low = el.shadowRoot!.querySelector<Md3NumberInput>(
      '.critical-temperature[data-controller="fan"] md3-number-input[label="Low cutoff"]'
    )!;

    low.dispatchEvent(new CustomEvent('change', { detail: '20' }));

    expect(changes).toEqual([{ partial: { critical_temp_low: 20, critical_temp_high: 32 } }]);
  });

  it('attaches an inverted-bound error to the field that caused it', async () => {
    const base = makeVm();
    const el = await mount(
      makeVm({
        fan: {
          ...base.fan,
          config: {
            ...base.fan.config,
            critical_temp_low: 18,
            critical_temp_high: 32,
          },
        },
      })
    );
    const changes = listen(el, 'fan-config-changed');
    const high = el.shadowRoot!.querySelector<Md3NumberInput>(
      '.critical-temperature[data-controller="fan"] md3-number-input[label="High cutoff"]'
    )!;

    high.dispatchEvent(new CustomEvent('change', { detail: '17' }));
    await high.updateComplete;

    expect(changes).toEqual([]);
    expect(high.error).toBe('High cutoff must be higher than the low cutoff.');
  });

  it('converts Home Assistant display units back to the canonical save payload', async () => {
    const el = await mount(
      makeVm({
        units: { temperature: '°F', pressure: 'Pa', currentTemperature: '75.2 °F' },
      })
    );
    const changes = listen<{ partial: Record<string, unknown> }>(el, 'fan-config-changed');
    const low = el.shadowRoot!.querySelector<Md3NumberInput>(
      '.critical-temperature[data-controller="fan"] md3-number-input[label="Low cutoff"]'
    )!;
    low.dispatchEvent(new CustomEvent('change', { detail: '68' }));

    expect(changes[0].partial).toEqual({ critical_temp_low: 20, critical_temp_high: 32 });
    expect(low.getAttribute('unit')).toBe('°F');
    expect(el.shadowRoot!.textContent).toContain('Current 75.2 °F');
    expect(
      [...el.shadowRoot!.querySelectorAll<Md3NumberInput>('md3-number-input')].some(
        (input) => input.getAttribute('label') === 'VPD Tolerance (Pa)'
      )
    ).toBe(true);
  });

  it('does not expose growspace-wide environment removal', async () => {
    const el = await mount(makeVm());
    expect(el.shadowRoot!.textContent).not.toContain('Remove Environment');
  });

  it('emits a top-level threshold change', async () => {
    const el = await mount(makeVm());
    const received = listenPartials(el);
    const stress = [...el.shadowRoot!.querySelectorAll('md3-number-input')].find(
      (n) => n.getAttribute('label') === 'Stress Threshold %'
    )!;
    stress.dispatchEvent(
      new CustomEvent('change', { detail: '0.9', bubbles: true, composed: true })
    );
    expect(received).toEqual([{ stressThreshold: 0.9 }]);
  });

  it('keeps both controllers save-equivalent to the previous sparse override layout', async () => {
    const base = makeVm();
    const vm = makeVm({
      fan: {
        ...base.fan,
        config: {
          ...base.fan.config,
          stage_vpd_overrides: { flower_mid: { day: 1.3, night: 1.1 } },
        },
      },
      exhaust: {
        ...base.exhaust,
        config: {
          ...base.exhaust.config,
          stage_vpd_overrides: { dry: { day: 0.9, night: 0.85 } },
        },
      },
      stageVpd: {
        ...base.stageVpd,
        visible: true,
        stages: base.stageVpd.stages.map((stage) =>
          stage.id === 'veg' ? { ...stage, open: true } : stage
        ),
      },
    });
    const el = await mount(vm);
    const fanChanges = listen<{ partial: Record<string, unknown> }>(el, 'fan-config-changed');
    const exhaustChanges = listen<{ partial: Record<string, unknown> }>(
      el,
      'exhaust-config-changed'
    );
    const inputs = [...el.shadowRoot!.querySelectorAll('md3-number-input')];
    const fanDay = inputs.find(
      (input) => input.getAttribute('input-aria-label') === 'Veg Fan day VPD in kPa'
    )!;
    const exhaustNight = inputs.find(
      (input) => input.getAttribute('input-aria-label') === 'Veg Exhaust night VPD in kPa'
    )!;

    fanDay.dispatchEvent(new CustomEvent('change', { detail: '0.91' }));
    exhaustNight.dispatchEvent(new CustomEvent('change', { detail: '0.77' }));

    expect(fanChanges).toEqual([
      {
        partial: {
          stage_vpd_overrides: {
            flower_mid: { day: 1.3, night: 1.1 },
            veg: { day: 0.91, night: 0.6 },
          },
        },
      },
    ]);
    expect(exhaustChanges).toEqual([
      {
        partial: {
          stage_vpd_overrides: {
            dry: { day: 0.9, night: 0.85 },
            veg: { day: 0.7, night: 0.77 },
          },
        },
      },
    ]);
  });

  it('gives each expanded input a unit and stage/controller/day-night accessible name', async () => {
    const base = makeVm();
    const el = await mount(
      makeVm({
        stageVpd: {
          ...base.stageVpd,
          visible: true,
          stages: base.stageVpd.stages.map((stage) =>
            stage.id === 'veg' ? { ...stage, open: true } : stage
          ),
        },
      })
    );
    const inputs = [...el.shadowRoot!.querySelectorAll('md3-number-input')].filter((input) =>
      input.getAttribute('input-aria-label')?.startsWith('Veg ')
    );

    expect(inputs).toHaveLength(4);
    expect(inputs.map((input) => input.getAttribute('unit'))).toEqual(['kPa', 'kPa', 'kPa', 'kPa']);
    expect(inputs.map((input) => input.getAttribute('input-aria-label'))).toEqual([
      'Veg Fan day VPD in kPa',
      'Veg Fan night VPD in kPa',
      'Veg Exhaust day VPD in kPa',
      'Veg Exhaust night VPD in kPa',
    ]);
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
    const removeBtn = el.shadowRoot!.querySelector(
      '.ac-infinity-device .chip-remove'
    ) as HTMLButtonElement;
    expect(removeBtn.tagName).toBe('BUTTON');
    expect(removeBtn.tabIndex).toBe(0);
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
