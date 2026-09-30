import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReactiveControllerHost } from 'lit';
import { GrowspaceOptionsController } from './growspace-options-controller';

const makeHass = (growspaces: Record<string, string> | null) => ({
  states: {
    'sensor.growspaces_list': growspaces ? { attributes: { growspaces } } : undefined,
  },
  connection: {
    subscribeEvents: vi.fn().mockResolvedValue(() => {}),
  },
});

const makeHost = (): ReactiveControllerHost & { requestUpdate: ReturnType<typeof vi.fn> } => {
  const controllers: any[] = [];
  return {
    addController: (c: any) => controllers.push(c),
    removeController: vi.fn() as unknown as any,
    requestUpdate: vi.fn() as unknown as any,
    updateComplete: Promise.resolve(true),
  };
};

describe('GrowspaceOptionsController', () => {
  let host: ReturnType<typeof makeHost>;
  let controller: GrowspaceOptionsController;

  beforeEach(() => {
    host = makeHost();
    controller = new GrowspaceOptionsController(host);
  });

  it('starts with empty options', () => {
    expect(controller.options).toEqual([]);
  });

  it('loads options from hass state on update()', () => {
    const hass = makeHass({ 'gs-1': 'Tent A', 'gs-2': 'Tent B' }) as any;
    controller.update(hass);
    expect(controller.options).toEqual([
      { id: 'gs-1', name: 'Tent A' },
      { id: 'gs-2', name: 'Tent B' },
    ]);
  });

  it('sets options to [] when sensor is absent', () => {
    const hass = makeHass(null) as any;
    controller.update(hass);
    expect(controller.options).toEqual([]);
  });

  it('discovers the translated service entity and handles its object values on events', async () => {
    const hass = makeHass(null) as any;
    const entityId = 'sensor.growspace_manager_service_growspaces_list';
    hass.states[entityId] = {
      attributes: { growspaces: { demo: { name: 'Demo Tent', total_plants: 17 } } },
    };
    controller.update(hass);
    expect(controller.options).toEqual([{ id: 'demo', name: 'Demo Tent' }]);
    await Promise.resolve();
    const listener = hass.connection.subscribeEvents.mock.calls[0][0];
    listener({
      data: {
        new_state: {
          entity_id: entityId,
          attributes: { growspaces: { demo: { name: 'Renamed Tent', total_plants: 17 } } },
        },
      },
    });
    expect(controller.options).toEqual([{ id: 'demo', name: 'Renamed Tent' }]);
  });

  it('calls host.requestUpdate() after loading options', () => {
    const hass = makeHass({ 'gs-1': 'Tent A' }) as any;
    controller.update(hass);
    expect(host.requestUpdate).toHaveBeenCalled();
  });

  it('subscribes to state_changed only once across multiple update() calls', () => {
    const hass = makeHass({ 'gs-1': 'Tent A' }) as any;
    controller.update(hass);
    controller.update(hass);
    controller.update(hass);
    expect(hass.connection.subscribeEvents).toHaveBeenCalledTimes(1);
  });

  it('resets subscribed flag on hostDisconnected()', async () => {
    const unsubSpy = vi.fn();
    const hass = makeHass({ 'gs-1': 'Tent A' }) as any;
    hass.connection.subscribeEvents.mockResolvedValue(unsubSpy);
    controller.update(hass);
    await Promise.resolve();
    controller.hostDisconnected();
    expect(unsubSpy).toHaveBeenCalledTimes(1);
    controller.update(hass);
    expect(hass.connection.subscribeEvents).toHaveBeenCalledTimes(2);
  });
});
