import { describe, it, expect, afterEach } from 'vitest';
import './config-irrigation-tab';
import type { ConfigIrrigationTab } from './config-irrigation-tab';
import type {
  IrrigationTabViewModel,
  IrrigationFieldVM,
  IrrigationFieldKey,
} from '../viewmodels/irrigation-tab.viewmodel';
import type { EnvironmentDraft } from '../../../dialogs/config-dialog-sm';
import {
  hassWithEntities,
  mountWithHass,
  pickEntity,
  pickerOptions,
} from '../../../../tests/harness/entity-picker';

const HASS = hassWithEntities({
  'sensor.a': 'Bulk EC A',
  'sensor.b': 'Bulk EC B',
  'sensor.c': 'Bulk EC C',
  'sensor.ph1': 'pH Probe',
});

/** The multi-select whose label matches the field key (the VM labels them so). */
function multiSelect(el: HTMLElement, label: string) {
  const found = [...el.shadowRoot!.querySelectorAll('config-entity-multi-select')].find(
    (candidate) => candidate.label === label
  );
  if (!found) throw new Error(`No multi-select labelled ${label}`);
  return found;
}

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
  return mountWithHass(el, HASS);
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
    expect(el.shadowRoot!.querySelectorAll('config-entity-multi-select').length).toBe(9);
    const headers = [...el.shadowRoot!.querySelectorAll('config-section-header')].map(
      (header) => header.label
    );
    expect(headers).toEqual(['Irrigation Monitoring', 'Substrate EC']);
  });

  it('renders chips for current values and offers the remaining options', async () => {
    const el = await mount(
      makeVm({
        substrate: [
          field('bulkEcSensors', {
            value: ['sensor.a', 'sensor.b'],
            options: ['sensor.a', 'sensor.b', 'sensor.c'],
          }),
          field('poreEcSensors'),
        ],
      })
    );
    const bulk = multiSelect(el, 'bulkEcSensors');
    expect(pickerOptions(bulk.shadowRoot!)).toEqual(['sensor.c']);
    expect(bulk.shadowRoot!.querySelectorAll('.chip').length).toBe(2);
  });
});

describe('ConfigIrrigationTab — intents out', () => {
  it('emits env-draft-changed adding an entity to a monitoring field', async () => {
    const el = await mount(makeVm());
    const received = listenPartials(el);
    pickEntity(multiSelect(el, 'phSensors').shadowRoot!, 'sensor.ph1');
    expect(received).toEqual([{ phSensors: ['sensor.ph1'] }]);
  });

  it('emits env-draft-changed removing a chip from a substrate field', async () => {
    const el = await mount(
      makeVm({
        substrate: [
          field('bulkEcSensors', { value: ['sensor.a', 'sensor.b'] }),
          field('poreEcSensors'),
        ],
      })
    );
    const received = listenPartials(el);
    const bulk = multiSelect(el, 'bulkEcSensors');
    bulk.shadowRoot!.querySelector<HTMLElement>('.chip .chip-remove')!.click();
    expect(received).toEqual([{ bulkEcSensors: ['sensor.b'] }]);
  });
});
