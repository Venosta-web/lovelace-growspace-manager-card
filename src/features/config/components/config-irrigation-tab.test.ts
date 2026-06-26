import { describe, it, expect, afterEach } from 'vitest';
import './config-irrigation-tab';
import type { ConfigIrrigationTab } from './config-irrigation-tab';
import type {
  IrrigationTabViewModel,
  IrrigationFieldVM,
  IrrigationFieldKey,
} from '../viewmodels/irrigation-tab.viewmodel';
import type { EnvironmentDraft } from '../../../dialogs/config-dialog-sm';

function field(key: IrrigationFieldKey, over: Partial<IrrigationFieldVM> = {}): IrrigationFieldVM {
  return { key, label: key, value: [], options: [], ...over };
}

function makeVm(over: Partial<IrrigationTabViewModel> = {}): IrrigationTabViewModel {
  return {
    monitoring: [
      field('phSensors'),
      field('feedEcSensors'),
      field('runoffEcSensors'),
      field('drainVolumeSensors'),
      field('irrigationFlowSensors'),
      field('powerSensors'),
      field('energySensors'),
    ],
    substrate: [field('bulkEcSensors'), field('poreEcSensors')],
    ...over,
  };
}

async function mount(vm: IrrigationTabViewModel): Promise<ConfigIrrigationTab> {
  const el = document.createElement('config-irrigation-tab') as ConfigIrrigationTab;
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

describe('ConfigIrrigationTab — render', () => {
  it('renders two section cards and a picker for every field (7 + 2)', async () => {
    const el = await mount(makeVm());
    expect(el.shadowRoot!.querySelectorAll('.detail-card').length).toBe(2);
    expect(el.shadowRoot!.querySelectorAll('.multi-select-container').length).toBe(9);
    const headers = [...el.shadowRoot!.querySelectorAll('h3')].map((h) => h.textContent);
    expect(headers).toEqual(['Irrigation Monitoring', 'Substrate EC']);
  });

  it('renders chips for current values and populates the datalist from options', async () => {
    const el = await mount(
      makeVm({
        substrate: [
          field('bulkEcSensors', { value: ['sensor.a', 'sensor.b'], options: ['sensor.a', 'sensor.b', 'sensor.c'] }),
          field('poreEcSensors'),
        ],
      })
    );
    expect(el.shadowRoot!.querySelectorAll('#list-multi-bulkEcSensors option').length).toBe(3);
    expect(el.shadowRoot!.querySelectorAll('.multi-select-container')[7].querySelectorAll('.chip').length).toBe(2);
  });
});

describe('ConfigIrrigationTab — intents out', () => {
  it('emits env-draft-changed adding an entity to a monitoring field', async () => {
    const el = await mount(makeVm());
    const received = listenPartials(el);
    const phInput = el.shadowRoot!
      .querySelector('#list-multi-phSensors')!
      .closest('.multi-select-container')!
      .querySelector<HTMLInputElement>('input.search-input-inner')!;
    phInput.value = 'sensor.ph1';
    phInput.dispatchEvent(new Event('change'));
    expect(received).toEqual([{ phSensors: ['sensor.ph1'] }]);
  });

  it('emits env-draft-changed removing a chip from a substrate field', async () => {
    const el = await mount(
      makeVm({
        substrate: [field('bulkEcSensors', { value: ['sensor.a', 'sensor.b'] }), field('poreEcSensors')],
      })
    );
    const received = listenPartials(el);
    const bulk = el.shadowRoot!.querySelector('#list-multi-bulkEcSensors')!.closest('.multi-select-container')!;
    bulk.querySelector<HTMLElement>('.chip .chip-remove')!.click();
    expect(received).toEqual([{ bulkEcSensors: ['sensor.b'] }]);
  });
});
