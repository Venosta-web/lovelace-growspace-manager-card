import { describe, it, expect, afterEach } from 'vitest';
import './config-sensors-tab';
import type { ConfigSensorsTab } from './config-sensors-tab';
import type {
  SensorsTabViewModel,
  SensorFieldVM,
  SensorFieldKey,
} from '../viewmodels/sensors-tab.viewmodel';
import type { EnvironmentDraft } from '../../../dialogs/config-dialog-sm';

function field(
  key: SensorFieldKey,
  over: Partial<SensorFieldVM> = {}
): SensorFieldVM {
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
    const multi = el.shadowRoot!.querySelectorAll('.multi-select-container');
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
    expect(el.shadowRoot!.querySelectorAll('.chip').length).toBe(2);
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
    const input = el.shadowRoot!.querySelector<HTMLInputElement>(
      '.multi-select-container input.search-input-inner'
    )!;
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
    el.shadowRoot!.querySelector<HTMLElement>('.chip .chip-remove')!.click();
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
    input.dispatchEvent(new CustomEvent('change', { detail: '3.5', bubbles: true, composed: true }));
    expect(received).toEqual([{ lstOffset: 3.5 }]);
  });
});
