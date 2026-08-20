import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it, vi } from 'vitest';
import { GrowspaceGridCardEditor } from '../../../src/cards/editors/growspace-grid-card-editor';
import { GrowspaceManagerCardEditor } from '../../../src/growspace-manager-card-editor';

if (!customElements.get('growspace-manager-card-editor')) {
  customElements.define('growspace-manager-card-editor', GrowspaceManagerCardEditor);
}
if (!customElements.get('growspace-grid-card-editor')) {
  customElements.define('growspace-grid-card-editor', GrowspaceGridCardEditor);
}

const emptyMessage = 'No growspaces found — configure the growspace_manager integration first.';

function makeHass(onStateChanged?: (callback: (event: unknown) => void) => void) {
  return {
    language: 'en',
    states: {},
    connection: {
      subscribeEvents: vi.fn().mockImplementation((callback) => {
        onStateChanged?.(callback);
        return Promise.resolve(vi.fn());
      }),
    },
  } as any;
}

describe('growspace picker empty state', () => {
  it('replaces the main editor picker with setup guidance while keeping other fields', async () => {
    const element = await fixture<GrowspaceManagerCardEditor>(html`
      <growspace-manager-card-editor></growspace-manager-card-editor>
    `);
    element.hass = makeHass();
    element.setConfig({ type: 'custom:growspace-manager-card' });
    await element.updateComplete;

    expect(element.shadowRoot?.textContent).toContain(emptyMessage);
    const schema = (element.shadowRoot?.querySelector('ha-form') as any)?.schema;
    expect(schema.map((field: { name: string }) => field.name)).not.toContain('default_growspace');
    expect(schema.map((field: { name: string }) => field.name)).toContain('initial_view_mode');
  });

  it('updates a standalone editor live from the empty state to the picker', async () => {
    let stateChanged: ((event: unknown) => void) | undefined;
    const element = await fixture<GrowspaceGridCardEditor>(html`
      <growspace-grid-card-editor></growspace-grid-card-editor>
    `);
    element.hass = makeHass((callback) => {
      stateChanged = callback;
    });
    element.setConfig({ type: 'custom:growspace-grid-card' });
    await element.updateComplete;

    expect(element.shadowRoot?.textContent).toContain(emptyMessage);
    let schema = (element.shadowRoot?.querySelector('ha-form') as any)?.schema;
    expect(schema).toEqual([]);

    stateChanged?.({
      data: {
        new_state: {
          entity_id: 'sensor.growspaces_list',
          attributes: { growspaces: { 'gs-1': 'Tent A' } },
        },
      },
    });
    await element.updateComplete;

    expect(element.shadowRoot?.textContent).not.toContain(emptyMessage);
    schema = (element.shadowRoot?.querySelector('ha-form') as any)?.schema;
    expect(schema).toHaveLength(1);
    expect(schema[0].name).toBe('default_growspace');
    expect(schema[0].selector.select.options).toContainEqual({
      label: 'Tent A',
      value: 'gs-1',
    });
  });
});
