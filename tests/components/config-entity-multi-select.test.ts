import { describe, expect, it, vi } from 'vitest';
import '../../src/features/config/components/config-entity-multi-select';
import type {
  ConfigEntityMultiSelect,
  ConfigEntityValuesChangedDetail,
} from '../../src/features/config/components/config-entity-multi-select';
import {
  hassWithEntities,
  mountWithHass,
  pickEntity,
  pickerOptions,
} from '../harness/entity-picker';

const HASS = hassWithEntities({
  'sensor.a': 'Tent A Temperature',
  'sensor.b': 'Tent B Temperature',
  'sensor.c': 'Tent C Temperature',
});

async function mount(values: string[] = []): Promise<ConfigEntityMultiSelect> {
  const element = document.createElement('config-entity-multi-select') as ConfigEntityMultiSelect;
  element.label = 'Temperature sensors';
  element.values = values;
  element.options = ['sensor.a', 'sensor.b', 'sensor.c'];
  return mountWithHass(element, HASS);
}

describe('ConfigEntityMultiSelect', () => {
  it('adds a selected entity', async () => {
    const element = await mount(['sensor.a']);
    const listener = vi.fn<(event: CustomEvent<ConfigEntityValuesChangedDetail>) => void>();
    element.addEventListener('entity-values-changed', listener);

    pickEntity(element.shadowRoot!, 'sensor.b');

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].detail.values).toEqual(['sensor.a', 'sensor.b']);
  });

  it('offers only the entities that are not already chips', async () => {
    const element = await mount(['sensor.a']);

    expect(pickerOptions(element.shadowRoot!)).toEqual(['sensor.b', 'sensor.c']);
  });

  it('labels a chip with the friendly name and keeps the entity id visible', async () => {
    const element = await mount(['sensor.a']);
    const chip = element.shadowRoot!.querySelector('.chip')!;

    expect(chip.querySelector('.chip-name')!.textContent).toBe('Tent A Temperature');
    expect(chip.querySelector('.chip-id')!.textContent).toBe('sensor.a');
  });

  it('falls back to the entity id when the entity is unknown', async () => {
    const element = await mount(['sensor.gone']);
    const chip = element.shadowRoot!.querySelector('.chip')!;

    expect(chip.querySelector('.chip-name')!.textContent).toBe('sensor.gone');
    expect(chip.querySelector('.chip-id')).toBeNull();
  });

  it('removes a chip while preserving its accessible 44px target', async () => {
    const element = await mount(['sensor.a', 'sensor.b']);
    const listener = vi.fn<(event: CustomEvent<ConfigEntityValuesChangedDetail>) => void>();
    element.addEventListener('entity-values-changed', listener);
    const remove = element.shadowRoot!.querySelector<HTMLButtonElement>('.chip-remove')!;

    expect(remove.getAttribute('aria-label')).toBe('Remove sensor.a');
    expect(remove.title).toBe('Remove sensor.a');
    expect(getComputedStyle(remove).minWidth).toBe('44px');
    expect(getComputedStyle(remove).minHeight).toBe('44px');
    remove.click();

    expect(listener.mock.calls[0][0].detail.values).toEqual(['sensor.b']);
  });

  it('keeps the add affordance visible when chips are present', async () => {
    const element = await mount(['sensor.a']);

    expect(element.shadowRoot!.querySelector('.chip')).not.toBeNull();
    expect(element.shadowRoot!.querySelector('gm-entity-picker')).not.toBeNull();
  });
});
