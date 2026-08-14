import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it, vi } from 'vitest';
import '../../src/features/config/components/config-entity-multi-select';
import type {
  ConfigEntityMultiSelect,
  ConfigEntityValuesChangedDetail,
} from '../../src/features/config/components/config-entity-multi-select';

async function mount(values: string[] = []): Promise<ConfigEntityMultiSelect> {
  return fixture<ConfigEntityMultiSelect>(html`
    <config-entity-multi-select
      label="Temperature sensors"
      list-id="temperature-options"
      .values=${values}
      .options=${['sensor.a', 'sensor.b', 'sensor.c']}
    ></config-entity-multi-select>
  `);
}

describe('ConfigEntityMultiSelect', () => {
  it('adds a selected entity', async () => {
    const element = await mount(['sensor.a']);
    const listener = vi.fn<(event: CustomEvent<ConfigEntityValuesChangedDetail>) => void>();
    element.addEventListener('entity-values-changed', listener);
    const input = element.shadowRoot!.querySelector('input')!;

    input.value = 'sensor.b';
    input.dispatchEvent(new Event('change'));

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].detail.values).toEqual(['sensor.a', 'sensor.b']);
    expect(input.value).toBe('');
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
    const input = element.shadowRoot!.querySelector<HTMLInputElement>('input')!;

    expect(input.placeholder).toBe('Add Entity...');
    expect(element.shadowRoot!.querySelector('.chip')).not.toBeNull();
  });
});
