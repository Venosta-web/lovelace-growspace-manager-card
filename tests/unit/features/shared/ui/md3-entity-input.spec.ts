import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../../../../../src/features/shared/ui/md3-entity-input';
import type { Md3EntityInput } from '../../../../../src/features/shared/ui/md3-entity-input';
import { hassWithEntities, pickEntity, pickerOptions } from '../../../../harness/entity-picker';

describe('Md3EntityInput', () => {
  let el: Md3EntityInput;

  beforeEach(async () => {
    el = document.createElement('md3-entity-input') as Md3EntityInput;
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => {
    if (el.isConnected) document.body.removeChild(el);
  });

  it('renders no picker when hass is not set', async () => {
    expect(el.shadowRoot!.querySelector('gm-entity-picker')!.shadowRoot!.children.length).toBe(0);
  });

  it('offers all entities when no domain filter is given', async () => {
    el.hass = hassWithEntities({
      'sensor.temp': 'Temp',
      'light.desk': 'Desk',
      'switch.fan': 'Fan',
    });
    await el.updateComplete;

    expect(pickerOptions(el.shadowRoot!)).toEqual(['light.desk', 'sensor.temp', 'switch.fan']);
  });

  it('filters options to the specified domains', async () => {
    el.hass = hassWithEntities({
      'sensor.temp': 'Temp',
      'light.desk': 'Desk',
      'sensor.humidity': 'Humidity',
    });
    el.domains = ['sensor'];
    await el.updateComplete;

    expect(pickerOptions(el.shadowRoot!)).toEqual(['sensor.humidity', 'sensor.temp']);
  });

  it('dispatches a change event with the picked entity', async () => {
    el.hass = hassWithEntities({ 'sensor.temp': 'Temp' });
    await el.updateComplete;
    const details: unknown[] = [];
    el.addEventListener('change', (e) => {
      if (e instanceof CustomEvent) details.push(e.detail);
    });

    pickEntity(el.shadowRoot!, 'sensor.temp');

    expect(details).toEqual(['sensor.temp']);
  });

  it('dispatches change with null when the picker is cleared', async () => {
    el.hass = hassWithEntities({ 'sensor.temp': 'Temp' });
    await el.updateComplete;
    const details: unknown[] = [];
    el.addEventListener('change', (e) => {
      if (e instanceof CustomEvent) details.push(e.detail);
    });

    pickEntity(el.shadowRoot!, '');

    expect(details).toEqual([null]);
  });
});
