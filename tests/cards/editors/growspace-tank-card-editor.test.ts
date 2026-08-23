import { expect, test, describe, beforeEach, vi, afterEach } from 'vitest';
import '../../../src/cards/editors/growspace-tank-card-editor';
import { GrowspaceTankCardEditor } from '../../../src/cards/editors/growspace-tank-card-editor';

describe('GrowspaceTankCardEditor', () => {
  let element: GrowspaceTankCardEditor;
  let mockHass: any;
  let capturedCallback: any;

  beforeEach(async () => {
    capturedCallback = null;
    mockHass = {
      states: {
        'sensor.growspaces_list': {
          attributes: {
            growspaces: {
              gs1: 'Growroom 1',
              gs2: 'Growroom 2',
            },
          },
        },
      },
      language: 'en',
      connection: {
        subscribeEvents: vi.fn().mockImplementation((callback) => {
          capturedCallback = callback;
          return Promise.resolve(vi.fn());
        }),
      },
    };

    element = new GrowspaceTankCardEditor();
    element.hass = mockHass;
    element.setConfig({
      type: 'custom:growspace-tank-card',
      default_growspace: 'gs1',
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('is defined', () => {
    expect(element).toBeInstanceOf(GrowspaceTankCardEditor);
  });

  test('renders options based on sensor.growspaces_list via controller', () => {
    (element as any).willUpdate(new Map([['hass', null]]));
    const controller = (element as any)._gsController;
    expect(controller.options.length).toBe(2);
    expect(controller.options[0]).toEqual({ id: 'gs1', name: 'Growroom 1' });
    expect(controller.options[1]).toEqual({ id: 'gs2', name: 'Growroom 2' });
  });

  test('handles growspace change and dispatches config-changed via _valueChanged', () => {
    const configChangedSpy = vi.fn();
    element.addEventListener('config-changed', configChangedSpy);

    const newConfig = { type: 'custom:growspace-tank-card', default_growspace: 'gs2' };
    (element as any)._valueChanged({ detail: { value: newConfig } } as any);

    expect(configChangedSpy).toHaveBeenCalled();
    expect(configChangedSpy.mock.calls[0][0].detail.config.default_growspace).toBe('gs2');
  });

  test('does not dispatch event if _valueChanged guard prevents it (no config)', () => {
    (element as any)._config = undefined;
    const configChangedSpy = vi.fn();
    element.addEventListener('config-changed', configChangedSpy);

    (element as any)._valueChanged({ detail: { value: {} } } as any);
    expect(configChangedSpy).not.toHaveBeenCalled();
  });

  test('handles missing growspaces list sensor', () => {
    element.hass = { ...mockHass, states: {} };
    (element as any).willUpdate(new Map([['hass', null]]));
    expect((element as any)._gsController.options).toEqual([]);
  });

  test('handles sensor update events via subscription callback', () => {
    (element as any).willUpdate(new Map([['hass', null]]));
    expect(capturedCallback).toBeDefined();

    capturedCallback({
      data: {
        new_state: {
          entity_id: 'sensor.growspaces_list',
          attributes: {
            growspaces: { gs3: 'Tent 3', gs4: 'Tent 4' },
          },
        },
      },
    });

    const controller = (element as any)._gsController;
    expect(controller.options).toEqual([
      { id: 'gs3', name: 'Tent 3' },
      { id: 'gs4', name: 'Tent 4' },
    ]);
  });

  test('handles uninitialized config in render', async () => {
    const div = document.createElement('div');
    div.appendChild(element);
    document.body.appendChild(div);
    (element as any)._config = undefined;
    await element.updateComplete;
    expect(element.shadowRoot?.innerHTML.trim()).not.toContain('ha-form');
    document.body.removeChild(div);
  });

  test('willUpdate() calls controller.update when hass changes', () => {
    const spy = vi.spyOn((element as any)._gsController, 'update');
    (element as any).willUpdate(new Map([['hass', null]]));
    expect(spy).toHaveBeenCalledWith(element.hass);
  });

  test('willUpdate() does not call controller.update when hass not in changedProps', () => {
    const spy = vi.spyOn((element as any)._gsController, 'update');
    (element as any).willUpdate(new Map([['config', null]]));
    expect(spy).not.toHaveBeenCalled();
  });
});
