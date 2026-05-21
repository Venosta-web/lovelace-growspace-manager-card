import { fixture } from '@open-wc/testing-helpers';
import { expect, test, describe, aroundEach, vi } from 'vitest';
import { page } from 'vitest/browser';
import { html } from 'lit';
import { GrowspaceCarouselCard } from '../../src/cards/growspace-carousel-card';
import { createMockHass } from '../mocks/hass';

// Define the element if not already defined
if (!customElements.get('growspace-carousel-card')) {
  customElements.define('growspace-carousel-card', GrowspaceCarouselCard);
}

// Mock GrowspaceManagerCard
vi.mock('../../src/growspace-manager-card', () => {
  class MockManagerCard extends HTMLElement {
    public hass: any;
    public _config: any;
    public store = {
      handleDeviceChange: vi.fn()
    };
    constructor() {
      super();
      this.attachShadow({ mode: 'open' }).innerHTML = '<div style="padding:16px;color:#ccc;font-family:sans-serif">Test Tent</div>';
    }
  }

  if (!customElements.get('growspace-manager-card')) {
    customElements.define('growspace-manager-card', MockManagerCard);
  }

  return {
    GrowspaceManagerCard: MockManagerCard
  };
});

describe('GrowspaceCarouselCard', () => {
  let element: GrowspaceCarouselCard;

  aroundEach(async (runTest) => {
    element = await fixture<GrowspaceCarouselCard>(html`
      <growspace-carousel-card></growspace-carousel-card>
    `);
    element.hass = createMockHass() as any;
    await runTest();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  test('is defined', () => {
    expect(element).toBeInstanceOf(GrowspaceCarouselCard);
  });

  test('setConfig sets config and defaults', () => {
    const config = {
      type: 'custom:growspace-carousel-card',
      growspaces: ['device1', 'device2']
    };
    element.setConfig(config as any);
    expect((element as any)._config.interval).toBe(15);
    expect((element as any)._config.growspaces).toEqual(['device1', 'device2']);
  });

  test('setConfig throws error if no growspaces', () => {
    const config = {
      type: 'custom:growspace-carousel-card',
      growspaces: []
    };
    expect(() => element.setConfig(config as any)).toThrowError('You need to define at least one growspace');
  });

  test('getCardSize returns 4', () => {
    expect(element.getCardSize()).toBe(4);
  });

  test('getStubConfig returns default config', () => {
    expect(GrowspaceCarouselCard.getStubConfig()).toEqual({
      type: 'custom:growspace-carousel-card',
      growspaces: [],
      interval: 15
    });
  });

  test('connectedCallback starts timer if multiple growspaces', () => {
    vi.useFakeTimers();
    const config = {
      type: 'custom:growspace-carousel-card',
      growspaces: ['device1', 'device2'],
      interval: 10
    };
    element.setConfig(config as any);

    const startTimerSpy = vi.spyOn(element as any, '_startTimer');
    element.connectedCallback();
    expect(startTimerSpy).toHaveBeenCalled();
  });

  test('disconnectedCallback stops timer', () => {
    const stopTimerSpy = vi.spyOn(element as any, '_stopTimer');
    element.disconnectedCallback();
    expect(stopTimerSpy).toHaveBeenCalled();
  });

  test('timer triggers _nextSlide', async () => {
    vi.useFakeTimers();
    const config = {
      type: 'custom:growspace-carousel-card',
      growspaces: ['device1', 'device2'],
      interval: 10
    };
    element.setConfig(config as any);
    (element as any)._startTimer();

    const nextSlideSpy = vi.spyOn(element as any, '_nextSlide');

    vi.advanceTimersByTime(10001); // 10s interval
    expect(nextSlideSpy).toHaveBeenCalled();
  });

  test('_nextSlide updates index and calls store.handleDeviceChange', async () => {
    vi.useFakeTimers();
    const config = {
      type: 'custom:growspace-carousel-card',
      growspaces: ['device1', 'device2'],
      interval: 10
    };
    element.setConfig(config as any);
    await element.updateComplete;

    const managerCard = element.shadowRoot?.querySelector('growspace-manager-card') as any;
    expect(managerCard).toBeTruthy();
    const handleDeviceChangeSpy = vi.spyOn(managerCard.store, 'handleDeviceChange');

    // Manually trigger _nextSlide
    const nextSlidePromise = (element as any)._nextSlide();

    // Should add slide-out class
    const wrapper = element.shadowRoot?.querySelector('.carousel-wrapper');
    expect(wrapper?.classList.contains('slide-out')).toBe(true);

    // Advance time for first timeout (300ms)
    await vi.advanceTimersByTimeAsync(300);

    // After first timeout, index should update
    expect((element as any)._currentIndex).toBe(1);
    expect(handleDeviceChangeSpy).toHaveBeenCalledWith('device2');

    // Advance time for second timeout (300ms)
    await vi.advanceTimersByTimeAsync(300);

    await nextSlidePromise;
    expect((element as any)._isAnimating).toBe(false);
    expect(wrapper?.classList.contains('slide-in-prepare')).toBe(false);
  });

  test('mouseenter stops timer, mouseleave starts timer', async () => {
    vi.useFakeTimers();
    const config = {
      type: 'custom:growspace-carousel-card',
      growspaces: ['device1', 'device2'],
      interval: 10
    };
    element.setConfig(config as any);
    await element.updateComplete;
    (element as any)._startTimer();
    expect((element as any)._timer).toBeDefined();

    const container = element.shadowRoot?.querySelector('.carousel-container');
    container?.dispatchEvent(new MouseEvent('mouseenter'));
    expect((element as any)._timer).toBeUndefined();

    container?.dispatchEvent(new MouseEvent('mouseleave'));
    expect((element as any)._timer).toBeDefined();
  });

  test('render returns empty when no config', async () => {
    (element as any)._config = undefined;
    await element.updateComplete;
    expect(element.shadowRoot?.innerHTML).toBe('<!----><!--?-->');
  });

  test('getConfigElement returns editor', async () => {
    const editor = await GrowspaceCarouselCard.getConfigElement();
    expect(editor.tagName.toLowerCase()).toBe('growspace-carousel-card-editor');
  });

  describe('active growspace filtering', () => {
    const hassWithPlants = {
      states: {
        'sensor.growspaces_list': {
          attributes: {
            growspaces: {
              'device1': { name: 'Tent A', total_plants: 2 },
              'device2': { name: 'Tent B', total_plants: 0 },
              'device3': { name: 'Tent C', total_plants: 1 },
            }
          }
        }
      },
      language: 'en',
    } as any;

    test('with filter_empty=true, only growspaces with plants are active', () => {
      element.setConfig({
        type: 'custom:growspace-carousel-card',
        growspaces: ['device1', 'device2', 'device3'],
        filter_empty: true,
      } as any);
      element.hass = hassWithPlants;
      const active = (element as any)._activeGrowspaces;
      expect(active).toEqual(['device1', 'device3']);
    });

    test('with filter_empty=true, falls back to full list when all have 0 plants', () => {
      element.setConfig({
        type: 'custom:growspace-carousel-card',
        growspaces: ['device1', 'device2'],
        filter_empty: true,
      } as any);
      element.hass = {
        states: {
          'sensor.growspaces_list': {
            attributes: {
              growspaces: {
                'device1': { name: 'Tent A', total_plants: 0 },
                'device2': { name: 'Tent B', total_plants: 0 },
              }
            }
          }
        },
        language: 'en',
      } as any;
      const active = (element as any)._activeGrowspaces;
      expect(active).toEqual(['device1', 'device2']);
    });

    test('without filter_empty, all configured growspaces are active', () => {
      element.setConfig({
        type: 'custom:growspace-carousel-card',
        growspaces: ['device1', 'device2', 'device3'],
      } as any);
      element.hass = hassWithPlants;
      const active = (element as any)._activeGrowspaces;
      expect(active).toEqual(['device1', 'device2', 'device3']);
    });
  });

  test('matches visual snapshot', async () => {
    element.setConfig({ type: 'custom:growspace-carousel-card', growspaces: ['device1'] } as any);
    await element.updateComplete;
    await expect(page.elementLocator(element)).toMatchScreenshot();
  });
});
