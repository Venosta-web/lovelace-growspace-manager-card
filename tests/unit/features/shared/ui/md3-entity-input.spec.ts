import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../../../../../src/features/shared/ui/md3-entity-input';
import type { Md3EntityInput } from '../../../../../src/features/shared/ui/md3-entity-input';

function makeHass(entityIds: string[]) {
  const states: Record<string, unknown> = {};
  for (const id of entityIds) states[id] = {};
  return { states } as any;
}

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

  it('renders no options when hass is not set', async () => {
    const options = el.shadowRoot?.querySelectorAll('option');
    expect(options?.length).toBe(0);
  });

  it('renders all entities as options when no domain filter is given', async () => {
    el.hass = makeHass(['sensor.temp', 'light.desk', 'switch.fan']);
    await el.updateComplete;
    const options = Array.from(el.shadowRoot?.querySelectorAll('option') ?? []).map((o) =>
      o.getAttribute('value')
    );
    expect(options).toContain('sensor.temp');
    expect(options).toContain('light.desk');
    expect(options).toContain('switch.fan');
  });

  it('filters options to the specified domains', async () => {
    el.hass = makeHass(['sensor.temp', 'light.desk', 'sensor.humidity']);
    el.domains = ['sensor'];
    await el.updateComplete;
    const options = Array.from(el.shadowRoot?.querySelectorAll('option') ?? []).map((o) =>
      o.getAttribute('value')
    );
    expect(options).toContain('sensor.temp');
    expect(options).toContain('sensor.humidity');
    expect(options).not.toContain('light.desk');
  });

  it('dispatches a change event with the new value when the input changes', async () => {
    const details: unknown[] = [];
    // Only collect the component's CustomEvent (detail field present), not the raw input event.
    el.addEventListener('change', (e) => {
      if (e instanceof CustomEvent) details.push(e.detail);
    });

    const input = el.shadowRoot?.querySelector('input') as HTMLInputElement;
    input.value = 'sensor.temp';
    input.dispatchEvent(new Event('change', { bubbles: false }));

    expect(details).toHaveLength(1);
    expect(details[0]).toBe('sensor.temp');
  });

  it('dispatches change event with null when the input is cleared', async () => {
    const details: unknown[] = [];
    el.addEventListener('change', (e) => {
      if (e instanceof CustomEvent) details.push(e.detail);
    });

    const input = el.shadowRoot?.querySelector('input') as HTMLInputElement;
    input.value = '';
    input.dispatchEvent(new Event('change', { bubbles: false }));

    expect(details[0]).toBeNull();
  });
});
