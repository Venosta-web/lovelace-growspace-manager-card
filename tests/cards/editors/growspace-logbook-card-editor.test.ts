import { expect, test, describe, beforeEach, vi } from 'vitest';
import { GrowspaceLogbookCardEditor } from '../../../src/cards/editors/growspace-logbook-card-editor';
import type { GrowspaceManagerCardConfig } from '../../../src/lib/types/config';

if (!customElements.get('growspace-logbook-card-editor')) {
  customElements.define('growspace-logbook-card-editor', GrowspaceLogbookCardEditor);
}

describe('GrowspaceLogbookCardEditor', () => {
  let element: GrowspaceLogbookCardEditor;

  beforeEach(() => {
    element = new GrowspaceLogbookCardEditor();
    element.hass = {
      states: {
        'sensor.growspaces_list': {
          state: '2',
          attributes: {
            growspaces: {
              'gs1': 'Test Tent',
              'gs2': 'Another Tent',
            }
          }
        }
      },
      connection: {
        subscribeEvents: vi.fn().mockResolvedValue(vi.fn()),
      },
    } as any;
  });

  test('is defined', () => {
    expect(element).toBeInstanceOf(GrowspaceLogbookCardEditor);
  });

  test('setConfig stores config', () => {
    const config: GrowspaceManagerCardConfig = {
      type: 'custom:growspace-logbook-card',
      default_growspace: 'gs1',
      default_view: 'timeline'
    };
    element.setConfig(config);
    expect((element as any)._config).toEqual(config);
  });

  test('loads configured default_view', () => {
    const config: GrowspaceManagerCardConfig = {
      type: 'custom:growspace-logbook-card',
      default_view: 'timeline',
    };
    element.setConfig(config);
    expect((element as any)._config.default_view).toBe('timeline');
  });

  test('loads growspaces from sensor via controller', () => {
    (element as any).willUpdate(new Map([['hass', null]]));
    const controller = (element as any)._gsController;
    expect(controller.options.length).toBe(2);
    expect(controller.options[0]).toEqual({ id: 'gs1', name: 'Test Tent' });
  });

  test('dispatches config-changed event via _valueChanged', () => {
    const config: GrowspaceManagerCardConfig = {
      type: 'custom:growspace-logbook-card',
      default_growspace: '',
    };
    element.setConfig(config);

    const dispatchEventSpy = vi.spyOn(element, 'dispatchEvent');

    (element as any)._valueChanged({
      detail: { value: { ...config, default_view: 'timeline' } }
    } as any);

    expect(dispatchEventSpy).toHaveBeenCalled();
    const eventArg = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
    expect(eventArg.type).toBe('config-changed');
    expect(eventArg.detail.config.default_view).toBe('timeline');
  });

  test('_valueChanged does nothing if config is undefined', () => {
    (element as any)._config = undefined;
    const spy = vi.spyOn(element, 'dispatchEvent');
    (element as any)._valueChanged({ detail: { value: {} } } as any);
    expect(spy).not.toHaveBeenCalled();
  });

  test('_valueChanged does nothing if hass is undefined', () => {
    element.setConfig({ type: 'custom:growspace-logbook-card' });
    element.hass = undefined as any;
    const spy = vi.spyOn(element, 'dispatchEvent');
    (element as any)._valueChanged({ detail: { value: {} } } as any);
    expect(spy).not.toHaveBeenCalled();
  });

  test('controller sets empty options when hass has no sensor', () => {
    element.hass = {
      states: {},
      connection: { subscribeEvents: vi.fn().mockResolvedValue(vi.fn()) },
    } as any;
    (element as any).willUpdate(new Map([['hass', null]]));
    expect((element as any)._gsController.options).toEqual([]);
  });

  test('schema includes default_view select with list/timeline options', () => {
    const schema = (element as any)._computeSchema();
    const defaultViewField = schema.find((f: any) => f.name === 'default_view');
    expect(defaultViewField).toBeTruthy();
    expect(defaultViewField.selector.select.options).toContainEqual({ label: 'List View', value: 'list' });
    expect(defaultViewField.selector.select.options).toContainEqual({ label: 'Timeline', value: 'timeline' });
  });

  test('willUpdate() calls controller.update when hass key is present', () => {
    const spy = vi.spyOn((element as any)._gsController, 'update');
    (element as any).willUpdate(new Map([['hass', null]]));
    expect(spy).toHaveBeenCalledWith(element.hass);
  });

  test('willUpdate() does not call controller.update when hass is falsy', () => {
    const spy = vi.spyOn((element as any)._gsController, 'update');
    element.hass = undefined as any;
    (element as any).willUpdate(new Map([['hass', null]]));
    expect(spy).not.toHaveBeenCalled();
  });

  test('_computeSchema returns options from controller', () => {
    (element as any).willUpdate(new Map([['hass', null]]));
    const schema = (element as any)._computeSchema();
    const growspaceField = schema.find((f: any) => f.name === 'default_growspace');
    expect(growspaceField.selector.select.options).toContainEqual({ label: 'Test Tent', value: 'gs1' });
    expect(growspaceField.selector.select.options).toContainEqual({ label: 'Another Tent', value: 'gs2' });
  });

  test('render returns empty template if hass is missing', () => {
    element.hass = undefined as any;
    element.setConfig({ type: 'custom:growspace-logbook-card' });
    const result = (element as any).render();
    expect(result.values).toEqual([]);
  });

  test('render returns empty template if config is missing', () => {
    element.hass = { states: {} } as any;
    (element as any)._config = undefined;
    const result = (element as any).render();
    expect(result.values).toEqual([]);
  });

  test('render returns full template if hass and config are present', () => {
    element.hass = { states: {} } as any;
    element.setConfig({ type: 'custom:growspace-logbook-card' });
    const result = (element as any).render();
    expect(result).toBeTruthy();
    expect(result.strings[0]).toContain('ha-form');
  });
});
