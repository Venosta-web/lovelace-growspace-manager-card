import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../src/features/shared/ui/gm-entity-picker';
import type { GmEntityPicker } from '../../src/features/shared/ui/gm-entity-picker';
import {
  hassWithEntities,
  mountWithHass,
  pickEntity,
  pickerOptions,
} from '../harness/entity-picker';

const HASS = hassWithEntities({ 'sensor.a': 'Tent A', 'sensor.b': 'Tent B' });

async function mount(props: Partial<GmEntityPicker> = {}): Promise<GmEntityPicker> {
  const element = document.createElement('gm-entity-picker') as GmEntityPicker;
  element.label = 'Temperature sensor';
  element.options = ['sensor.a', 'sensor.b'];
  Object.assign(element, props);
  return mountWithHass(element, props.hass ?? HASS);
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('GmEntityPicker', () => {
  it('constrains the picker to the supplied options', async () => {
    const element = await mount();

    expect(pickerOptions(element.getRootNode() as ParentNode)).toEqual(['sensor.a', 'sensor.b']);
  });

  it('never allows a custom entity, so a typed non-entity cannot be committed', async () => {
    const element = await mount();
    const inner = element.shadowRoot!.querySelector('ha-entity-picker')!;

    expect(inner.hasAttribute('allow-custom-entity')).toBe(false);
    expect((inner as unknown as { allowCustomEntity?: boolean }).allowCustomEntity).toBeUndefined();
  });

  it('emits the picked entity id', async () => {
    const element = await mount();
    const picked = vi.fn<(event: CustomEvent<string>) => void>();
    element.addEventListener('entity-picked', picked);

    pickEntity(element.getRootNode() as ParentNode, 'sensor.b');

    expect(picked).toHaveBeenCalledOnce();
    expect(picked.mock.calls[0][0].detail).toBe('sensor.b');
    expect(element.value).toBe('sensor.b');
  });

  it('clears itself after a pick when asked, so it can serve as an add affordance', async () => {
    const element = await mount({ clearOnPick: true });

    pickEntity(element.getRootNode() as ParentNode, 'sensor.b');

    expect(element.value).toBe('');
    expect((element.shadowRoot!.querySelector('ha-entity-picker') as { value: string }).value).toBe(
      ''
    );
  });

  it('keeps a saved value that no longer exists, so a stale config is not silently cleared', async () => {
    // HA's picker renders an unknown id with a warning affordance rather than
    // blanking; all this component must do is keep passing the value through.
    const element = await mount({ value: 'sensor.gone', options: ['sensor.a'] });
    const inner = element.shadowRoot!.querySelector('ha-entity-picker') as { value: string };

    expect(inner.value).toBe('sensor.gone');
  });

  it('renders nothing without hass rather than falling back to free text', async () => {
    const element = document.createElement('gm-entity-picker') as GmEntityPicker;
    document.body.appendChild(element);
    await element.updateComplete;

    expect(element.shadowRoot!.querySelector('ha-entity-picker')).toBeNull();
    expect(element.shadowRoot!.querySelector('input')).toBeNull();
  });

  it('reserves a minimum height for ha-entity-picker, so a first render that throws inside the real component (#673) does not collapse the field to zero height', async () => {
    const element = await mount();
    const inner = element.shadowRoot!.querySelector('ha-entity-picker') as HTMLElement;

    expect(getComputedStyle(inner).minHeight).toBe('44px');
  });
});
