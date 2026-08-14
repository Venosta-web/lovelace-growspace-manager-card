import { describe, it, expect, afterEach } from 'vitest';
import './config-sensors-tab';
import type { ConfigSensorsTab } from './config-sensors-tab';
import type {
  SensorsTabViewModel,
  SensorFieldVM,
  SensorFieldKey,
} from '../viewmodels/sensors-tab.viewmodel';
import type { EnvironmentDraft } from '../../../dialogs/config-dialog-sm';

function field(key: SensorFieldKey, over: Partial<SensorFieldVM> = {}): SensorFieldVM {
  const multi = over.multi ?? key.endsWith('Sensors');
  return {
    key,
    label: key,
    multi,
    value: over.value ?? (multi ? [] : ''),
    options: over.options ?? [],
    ...over,
  };
}

function makeVm(over: Partial<SensorsTabViewModel> = {}): SensorsTabViewModel {
  return {
    moistureBand: null,
    fields: [
      field('temperatureSensors'),
      field('humiditySensors'),
      field('vpdSensors'),
      field('soilMoistureSensor'),
      field('co2Sensor'),
      field('lightSensors'),
      field('substrateTemperatureSensors'),
    ],
    lst: null,
    ...over,
  };
}

async function mount(vm: SensorsTabViewModel): Promise<ConfigSensorsTab> {
  const el = document.createElement('config-sensors-tab') as ConfigSensorsTab;
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

describe('ConfigSensorsTab — render', () => {
  it('renders seven entity pickers (3 multi-select rows + a single soil + co2 + substrate)', async () => {
    const el = await mount(makeVm());
    const multi = el.shadowRoot!.querySelectorAll('config-entity-multi-select');
    const single = el.shadowRoot!.querySelectorAll('.entity-select-container');
    expect(multi.length).toBe(5); // temp, humidity, vpd, light, substrate
    expect(single.length).toBe(2); // soil moisture, co2
  });

  it('renders chips for current multi-select values', async () => {
    const el = await mount(
      makeVm({
        fields: makeVm().fields.map((f) =>
          f.key === 'temperatureSensors' ? { ...f, value: ['sensor.a', 'sensor.b'] } : f
        ),
      })
    );
    const picker = el.shadowRoot!.querySelector('config-entity-multi-select')!;
    expect(picker.shadowRoot!.querySelectorAll('.chip').length).toBe(2);
  });

  it('populates each picker datalist from options', async () => {
    const el = await mount(
      makeVm({
        fields: makeVm().fields.map((f) =>
          f.key === 'co2Sensor' ? { ...f, options: ['sensor.co2_a', 'sensor.co2_b'] } : f
        ),
      })
    );
    const opts = el.shadowRoot!.querySelectorAll('#list-co2Sensor option');
    expect(opts.length).toBe(2);
  });

  it('renders the LST section only when present in the VM', async () => {
    const without = await mount(makeVm());
    expect(without.shadowRoot!.textContent).not.toContain('Leaf Surface Temperature');
    document.body.innerHTML = '';
    const withLst = await mount(makeVm({ lst: { offset: 2, vpdDisplay: '0.85 kPa' } }));
    expect(withLst.shadowRoot!.textContent).toContain('Current VPD: 0.85 kPa');
  });
});

describe('ConfigSensorsTab — intents out', () => {
  it('emits env-draft-changed adding an entity to a multi-select', async () => {
    const el = await mount(makeVm());
    const received = listenPartials(el);
    const picker = el.shadowRoot!.querySelector('config-entity-multi-select')!;
    const input = picker.shadowRoot!.querySelector<HTMLInputElement>('input')!;
    input.value = 'sensor.new';
    input.dispatchEvent(new Event('change'));
    expect(received).toEqual([{ temperatureSensors: ['sensor.new'] }]);
  });

  it('emits env-draft-changed removing a chip from a multi-select', async () => {
    const el = await mount(
      makeVm({
        fields: makeVm().fields.map((f) =>
          f.key === 'temperatureSensors' ? { ...f, value: ['sensor.a', 'sensor.b'] } : f
        ),
      })
    );
    const received = listenPartials(el);
    const picker = el.shadowRoot!.querySelector('config-entity-multi-select')!;
    const remove = picker.shadowRoot!.querySelector<HTMLButtonElement>('.chip .chip-remove')!;
    expect(remove.tagName).toBe('BUTTON');
    expect(remove.getAttribute('aria-label')).toBe('Remove sensor.a');
    expect(getComputedStyle(remove).minWidth).toBe('44px');
    expect(getComputedStyle(remove).minHeight).toBe('44px');
    remove.click();
    expect(received).toEqual([{ temperatureSensors: ['sensor.b'] }]);
  });

  it('emits env-draft-changed for a single-select entity change', async () => {
    const el = await mount(makeVm());
    const received = listenPartials(el);
    const input = el.shadowRoot!.querySelector<HTMLInputElement>(
      '.entity-select-container input.md3-input'
    )!;
    input.value = 'sensor.soil_x';
    input.dispatchEvent(new Event('change'));
    expect(received).toEqual([{ soilMoistureSensor: 'sensor.soil_x' }]);
  });

  it('emits lstOffset change from the LST section', async () => {
    const el = await mount(makeVm({ lst: { offset: 2, vpdDisplay: '0.85 kPa' } }));
    const received = listenPartials(el);
    const input = el.shadowRoot!.querySelector('md3-number-input')!;
    input.dispatchEvent(
      new CustomEvent('change', { detail: '3.5', bubbles: true, composed: true })
    );
    expect(received).toEqual([{ lstOffset: 3.5 }]);
  });
});

// ─── Acceptable Moisture Band ────────────────────────────────────────────────

function band(over: Partial<NonNullable<SensorsTabViewModel['moistureBand']>> = {}) {
  return {
    min: 20,
    max: 60,
    rawMin: null,
    rawMax: null,
    isCustom: false,
    step: 0.1,
    error: null,
    canSave: true,
    preview: null,
    incompatibleUnit: null,
    ...over,
  };
}

describe('ConfigSensorsTab — acceptable moisture band', () => {
  it('is absent when the VM omits it', async () => {
    const el = await mount(makeVm({ moistureBand: null }));
    expect(el.shadowRoot!.querySelector('.moisture-band')).toBeNull();
  });

  it('renders both bounds with a 0.1 step', async () => {
    const el = await mount(makeVm({ moistureBand: band() }));
    const inputs = el.shadowRoot!.querySelectorAll('.moisture-band md3-number-input');
    expect(inputs.length).toBe(2);
    expect(inputs[0].getAttribute('step')).toBe('0.1');
  });

  it('badges an inherited band so defaults do not read as a saved override', async () => {
    const el = await mount(makeVm({ moistureBand: band({ isCustom: false }) }));
    expect(el.shadowRoot!.querySelector('.moisture-band__badge')).not.toBeNull();
  });

  it('drops the badge for a custom band', async () => {
    const el = await mount(makeVm({ moistureBand: band({ isCustom: true }) }));
    expect(el.shadowRoot!.querySelector('.moisture-band__badge')).toBeNull();
  });

  it('shows the preview classification when a reading exists', async () => {
    const el = await mount(
      makeVm({
        moistureBand: band({
          preview: { classification: 'too_wet', label: 'Too wet', reading: 65 },
        }),
      })
    );
    const preview = el.shadowRoot!.querySelector('.moisture-band__preview')!;
    expect(preview.textContent).toContain('Too wet');
    expect(preview.getAttribute('data-classification')).toBe('too_wet');
  });

  it('omits the preview when there is no valid reading', async () => {
    const el = await mount(makeVm({ moistureBand: band({ preview: null }) }));
    expect(el.shadowRoot!.querySelector('.moisture-band__preview')).toBeNull();
  });

  it('shows an incompatibility state instead of the controls for a non-percentage sensor', async () => {
    const el = await mount(makeVm({ moistureBand: band({ incompatibleUnit: '°C' }) }));
    expect(el.shadowRoot!.querySelector('.moisture-band--incompatible')).not.toBeNull();
    expect(el.shadowRoot!.querySelectorAll('.moisture-band md3-number-input').length).toBe(0);
  });

  it('surfaces a validation error', async () => {
    const el = await mount(makeVm({ moistureBand: band({ error: 'bad band', canSave: false }) }));
    expect(el.shadowRoot!.querySelector('.moisture-band__error')!.textContent).toContain(
      'bad band'
    );
  });

  it('emits both bounds as null when resetting to defaults', async () => {
    const el = await mount(makeVm({ moistureBand: band({ isCustom: true }) }));
    const received = listenPartials(el);
    (el.shadowRoot!.querySelector('.moisture-band__reset') as HTMLButtonElement).click();
    expect(received).toEqual([{ soilMoistureMin: null, soilMoistureMax: null }]);
  });

  it('disables reset while the band is already inherited', async () => {
    const el = await mount(makeVm({ moistureBand: band({ isCustom: false }) }));
    const reset = el.shadowRoot!.querySelector('.moisture-band__reset') as HTMLButtonElement;
    expect(reset.disabled).toBe(true);
    expect(reset.title).toBe('Nothing to reset — this moisture band already uses the defaults.');
    expect(reset.classList.contains('config-reset-button')).toBe(true);
  });

  it('materialises both bounds when only one is edited from an inherited band', async () => {
    const el = await mount(
      makeVm({ moistureBand: band({ isCustom: false, rawMin: null, rawMax: null }) })
    );
    const received = listenPartials(el);
    const minInput = el.shadowRoot!.querySelectorAll('.moisture-band md3-number-input')[0];
    minInput.dispatchEvent(new CustomEvent('change', { detail: '30' }));
    expect(received).toEqual([{ soilMoistureMin: 30, soilMoistureMax: 60 }]);
  });
});
