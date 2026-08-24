import { expect, test, describe, beforeEach, vi } from 'vitest';
import { GrowspaceAiInsightCardEditor } from '../../../src/cards/editors/growspace-ai-insight-card-editor';
import type { GrowspaceManagerCardConfig } from '../../../src/lib/types/config';

if (!customElements.get('growspace-ai-insight-card-editor')) {
  customElements.define('growspace-ai-insight-card-editor', GrowspaceAiInsightCardEditor);
}

describe('GrowspaceAiInsightCardEditor', () => {
  let element: GrowspaceAiInsightCardEditor;
  let capturedCallback: any;

  beforeEach(() => {
    capturedCallback = null;
    element = new GrowspaceAiInsightCardEditor();
    element.hass = {
      states: {
        'sensor.growspaces_list': {
          state: '2',
          attributes: {
            growspaces: {
              gs1: 'Test Tent',
              gs2: 'Another Tent',
            },
          },
        },
      },
      connection: {
        subscribeEvents: vi.fn().mockImplementation((callback) => {
          capturedCallback = callback;
          return Promise.resolve(vi.fn());
        }),
      },
    } as any;
  });

  test('is defined', () => {
    expect(element).toBeInstanceOf(GrowspaceAiInsightCardEditor);
  });

  test('loads configured value on setConfig', () => {
    const config: GrowspaceManagerCardConfig = {
      type: 'custom:growspace-ai-insight-card',
      default_growspace: 'gs1',
    };
    element.setConfig(config);
    expect(element._default_growspace).toBe('gs1');
  });

  test('renders options based on sensor.growspaces_list via controller', () => {
    const config: GrowspaceManagerCardConfig = {
      type: 'custom:growspace-ai-insight-card',
      default_growspace: 'gs1',
    };
    element.setConfig(config);
    (element as any).willUpdate(new Map([['hass', null]]));

    const controller = (element as any)._gsController;
    expect(controller.options.length).toBe(2);
    expect(controller.options[0]).toEqual({ id: 'gs1', name: 'Test Tent' });
    expect(controller.options[1]).toEqual({ id: 'gs2', name: 'Another Tent' });
  });

  test('handles missing hass gracefully', () => {
    element.hass = undefined as any;
    expect(() => {
      element.setConfig({ type: 'custom:growspace-ai-insight-card' });
    }).not.toThrow();
  });

  test('handles sensor update events via subscription callback', () => {
    const config: GrowspaceManagerCardConfig = {
      type: 'custom:growspace-ai-insight-card',
      default_growspace: 'gs1',
    };
    element.setConfig(config);
    (element as any).willUpdate(new Map([['hass', null]]));

    expect(capturedCallback).toBeDefined();

    capturedCallback({
      data: {
        new_state: {
          entity_id: 'sensor.growspaces_list',
          attributes: {
            growspaces: { gs3: 'Update' },
          },
        },
      },
    });

    const controller = (element as any)._gsController;
    expect(controller.options).toEqual([{ id: 'gs3', name: 'Update' }]);
  });

  test('_valueChanged dispatches config-changed', () => {
    const config: GrowspaceManagerCardConfig = {
      type: 'custom:growspace-ai-insight-card',
      default_growspace: 'gs1',
    };
    element.setConfig(config);
    const spy = vi.spyOn(element, 'dispatchEvent');

    (element as any)._valueChanged({
      detail: { value: { ...config, default_growspace: 'gs2' } },
    } as any);

    expect(spy).toHaveBeenCalled();
    const eventArg = spy.mock.calls[0][0] as CustomEvent;
    expect(eventArg.type).toBe('config-changed');
    expect(eventArg.detail.config.default_growspace).toBe('gs2');
  });

  test('_valueChanged guard: no dispatch when config is undefined', () => {
    const spy = vi.spyOn(element, 'dispatchEvent');
    (element as any)._config = undefined;
    (element as any)._valueChanged({ detail: { value: {} } } as any);
    expect(spy).not.toHaveBeenCalled();
  });

  test('_valueChanged guard: no dispatch when hass is undefined', () => {
    element.setConfig({ type: 'custom:growspace-ai-insight-card' });
    element.hass = undefined as any;
    const spy = vi.spyOn(element, 'dispatchEvent');
    (element as any)._valueChanged({ detail: { value: {} } } as any);
    expect(spy).not.toHaveBeenCalled();
  });

  test('render returns empty template if hass or config is missing', async () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    div.appendChild(element);
    await element.updateComplete;

    // Config not set, should render empty
    expect(element.shadowRoot?.innerHTML).toContain('<!---->');
    document.body.removeChild(div);
  });

  test('willUpdate() calls controller.update when hass key is present', () => {
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
