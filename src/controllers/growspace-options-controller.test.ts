import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReactiveControllerHost } from 'lit';
import { GrowspaceOptionsController } from './growspace-options-controller';

const makeHass = (growspaces: Record<string, string> | null) => ({
  states: {
    'sensor.growspaces_list': growspaces
      ? { attributes: { growspaces } }
      : undefined,
  },
  connection: {
    subscribeEvents: vi.fn().mockResolvedValue(() => {}),
  },
});

const makeHost = (): ReactiveControllerHost & { requestUpdate: ReturnType<typeof vi.fn> } => {
  const controllers: any[] = [];
  return {
    addController: (c: any) => controllers.push(c),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
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

  it('resets subscribed flag on hostDisconnected()', () => {
    const hass = makeHass({ 'gs-1': 'Tent A' }) as any;
    controller.update(hass);
    controller.hostDisconnected();
    controller.update(hass);
    expect(hass.connection.subscribeEvents).toHaveBeenCalledTimes(2);
  });
});
