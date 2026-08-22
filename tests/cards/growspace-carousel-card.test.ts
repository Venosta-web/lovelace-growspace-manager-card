import { expect, test, describe, vi } from 'vitest';
import { GrowspaceCarouselCard } from '../../src/cards/growspace-carousel-card';
import { aHass, aGrowspace } from '../fixtures';
import { renderCard } from '../harness';

if (!customElements.get('growspace-carousel-card')) {
  customElements.define('growspace-carousel-card', GrowspaceCarouselCard);
}

vi.mock('../../src/growspace-manager-card', () => {
  class MockManagerCard extends HTMLElement {
    public hass: any;
    public _config: any;
    public store = { handleDeviceChange: vi.fn() };
    constructor() {
      super();
      this.attachShadow({ mode: 'open' }).innerHTML = '<div>Mock Manager</div>';
    }
  }
  if (!customElements.get('growspace-manager-card')) {
    customElements.define('growspace-manager-card', MockManagerCard);
  }
  return { GrowspaceManagerCard: MockManagerCard };
});

describe('GrowspaceCarouselCard', () => {
  const gs1 = aGrowspace({ growspaceId: 'tent_a', name: 'Tent A' });
  const gs2 = aGrowspace({ growspaceId: 'tent_b', name: 'Tent B' });
  const hass = aHass({ growspaces: [gs1, gs2] });

  const carouselConfig = {
    type: 'custom:growspace-carousel-card',
    growspaces: [gs1.growspaceId, gs2.growspaceId],
    interval: 15,
  } as any;

  test('renders without crash', async () => {
    const handle = await renderCard<GrowspaceCarouselCard>('growspace-carousel-card', {
      hass,
      growspace: gs1,
      config: carouselConfig,
    });
    expect(handle.element).toBeInstanceOf(GrowspaceCarouselCard);
    handle.unmount();
  });

  test('setConfig defaults interval to 15', async () => {
    const handle = await renderCard<GrowspaceCarouselCard>('growspace-carousel-card', {
      hass,
      growspace: gs1,
      config: carouselConfig,
    });
    expect((handle.element as any)._config.interval).toBe(15);
    handle.unmount();
  });

  test('renders a setup message if no growspaces are configured', async () => {
    const handle = await renderCard<GrowspaceCarouselCard>('growspace-carousel-card', {
      hass,
      growspace: gs1,
      config: carouselConfig,
    });
    handle.element.setConfig({ type: 'custom:growspace-carousel-card', growspaces: [] } as any);
    await handle.element.updateComplete;

    expect(handle.element.shadowRoot?.textContent).toContain('Growspace filter not configured');
    expect(handle.element.shadowRoot?.textContent).toContain('Configure the growspace filter');
    handle.unmount();
  });

  test('renders a setup message if the growspace filter is absent', async () => {
    const handle = await renderCard<GrowspaceCarouselCard>('growspace-carousel-card', {
      hass,
      growspace: gs1,
      config: carouselConfig,
    });
    handle.element.setConfig({ type: 'custom:growspace-carousel-card' } as any);
    await handle.element.updateComplete;

    expect(handle.element.shadowRoot?.textContent).toContain('Growspace filter not configured');
    handle.unmount();
  });

  test('getCardSize returns 4', async () => {
    const handle = await renderCard<GrowspaceCarouselCard>('growspace-carousel-card', {
      hass,
      growspace: gs1,
      config: carouselConfig,
    });
    expect(handle.element.getCardSize()).toBe(4);
    handle.unmount();
  });

  test('getLayoutOptions returns grid constraints', async () => {
    const handle = await renderCard<GrowspaceCarouselCard>('growspace-carousel-card', {
      hass,
      growspace: gs1,
      config: carouselConfig,
    });
    expect(handle.element.getLayoutOptions()).toEqual({
      grid_columns: 4,
      grid_min_columns: 2,
      grid_min_rows: 4,
    });
    handle.unmount();
  });

  test('getStubConfig returns default config', () => {
    expect(GrowspaceCarouselCard.getStubConfig()).toEqual({
      type: 'custom:growspace-carousel-card',
      growspaces: [],
      interval: 15,
    });
  });

  test('_handleMouseEnter stops timer', async () => {
    const handle = await renderCard<GrowspaceCarouselCard>('growspace-carousel-card', {
      hass,
      growspace: gs1,
      config: carouselConfig,
    });
    const spy = vi.spyOn(handle.element as any, '_stopTimer');
    (handle.element as any)._handleMouseEnter();
    expect(spy).toHaveBeenCalled();
    handle.unmount();
  });

  test('_handleMouseLeave starts timer', async () => {
    const handle = await renderCard<GrowspaceCarouselCard>('growspace-carousel-card', {
      hass,
      growspace: gs1,
      config: carouselConfig,
    });
    const spy = vi.spyOn(handle.element as any, '_startTimer');
    (handle.element as any)._handleMouseLeave();
    expect(spy).toHaveBeenCalled();
    handle.unmount();
  });

  test('disconnectedCallback stops timer', async () => {
    const handle = await renderCard<GrowspaceCarouselCard>('growspace-carousel-card', {
      hass,
      growspace: gs1,
      config: carouselConfig,
    });
    const spy = vi.spyOn(handle.element as any, '_stopTimer');
    handle.element.disconnectedCallback();
    expect(spy).toHaveBeenCalled();
    handle.unmount();
  });

  test('getConfigElement returns editor', async () => {
    const editor = await GrowspaceCarouselCard.getConfigElement();
    expect(editor.tagName.toLowerCase()).toBe('growspace-carousel-card-editor');
  });

  test('renders a filter setup message when no config is present', async () => {
    const handle = await renderCard<GrowspaceCarouselCard>('growspace-carousel-card', {
      hass,
      growspace: gs1,
      config: carouselConfig,
    });
    (handle.element as any)._config = undefined;
    await handle.element.updateComplete;

    expect(handle.element.shadowRoot?.textContent).toContain('Growspace filter not configured');
    handle.unmount();
  });

  describe('auto-cycle between two growspaces', () => {
    const cycleConfig = {
      type: 'custom:growspace-carousel-card',
      growspaces: [gs1.growspaceId, gs2.growspaceId],
      interval: 10,
    } as any;

    test('_nextSlide advances currentIndex from 0 to 1', async () => {
      vi.useFakeTimers();
      const handle = await renderCard<GrowspaceCarouselCard>('growspace-carousel-card', {
        hass,
        growspace: gs1,
        config: cycleConfig,
      });
      await handle.element.updateComplete;

      expect((handle.element as any)._currentIndex).toBe(0);

      const nextSlidePromise = (handle.element as any)._nextSlide();
      await vi.advanceTimersByTimeAsync(300);
      expect((handle.element as any)._currentIndex).toBe(1);
      await vi.advanceTimersByTimeAsync(300);
      await nextSlidePromise;

      handle.unmount();
      vi.useRealTimers();
    });

    test('_nextSlide wraps back to 0 after last growspace', async () => {
      vi.useFakeTimers();
      const handle = await renderCard<GrowspaceCarouselCard>('growspace-carousel-card', {
        hass,
        growspace: gs1,
        config: cycleConfig,
      });
      (handle.element as any)._currentIndex = 1;
      await handle.element.updateComplete;

      const nextSlidePromise = (handle.element as any)._nextSlide();
      await vi.advanceTimersByTimeAsync(300);
      expect((handle.element as any)._currentIndex).toBe(0);
      await vi.advanceTimersByTimeAsync(300);
      await nextSlidePromise;

      handle.unmount();
      vi.useRealTimers();
    });

    test('_nextSlide is a no-op when _isAnimating is true', async () => {
      const handle = await renderCard<GrowspaceCarouselCard>('growspace-carousel-card', {
        hass,
        growspace: gs1,
        config: cycleConfig,
      });
      (handle.element as any)._isAnimating = true;
      const before = (handle.element as any)._currentIndex;
      await (handle.element as any)._nextSlide();
      expect((handle.element as any)._currentIndex).toBe(before);
      handle.unmount();
    });

    test('_nextSlide is a no-op when only one active growspace', async () => {
      const singleConfig = {
        type: 'custom:growspace-carousel-card',
        growspaces: [gs1.growspaceId],
        interval: 10,
      } as any;
      const handle = await renderCard<GrowspaceCarouselCard>('growspace-carousel-card', {
        hass,
        growspace: gs1,
        config: singleConfig,
      });
      const before = (handle.element as any)._currentIndex;
      await (handle.element as any)._nextSlide();
      expect((handle.element as any)._currentIndex).toBe(before);
      handle.unmount();
    });

    test('timer triggers _nextSlide after interval', async () => {
      vi.useFakeTimers();
      const handle = await renderCard<GrowspaceCarouselCard>('growspace-carousel-card', {
        hass,
        growspace: gs1,
        config: cycleConfig,
      });
      (handle.element as any)._startTimer();

      const spy = vi.spyOn(handle.element as any, '_nextSlide');
      vi.advanceTimersByTime(10001);
      expect(spy).toHaveBeenCalled();

      handle.unmount();
      vi.useRealTimers();
    });
  });

  describe('active growspace filtering', () => {
    const hassWithCounts = {
      ...hass,
      states: {
        ...hass.states,
        'sensor.growspaces_list': {
          attributes: {
            growspaces: {
              [gs1.growspaceId]: { name: gs1.name, total_plants: 2 },
              [gs2.growspaceId]: { name: gs2.name, total_plants: 0 },
            },
          },
        },
      },
    } as any;

    test('filter_empty=true keeps only growspaces with plants', async () => {
      const handle = await renderCard<GrowspaceCarouselCard>('growspace-carousel-card', {
        hass: hassWithCounts,
        growspace: gs1,
        config: {
          type: 'custom:growspace-carousel-card',
          growspaces: [gs1.growspaceId, gs2.growspaceId],
          filter_empty: true,
        },
      });
      handle.element.hass = hassWithCounts;
      const active = (handle.element as any)._activeGrowspaces;
      expect(active).toEqual([gs1.growspaceId]);
      handle.unmount();
    });

    test('without filter_empty, all configured growspaces are active', async () => {
      const handle = await renderCard<GrowspaceCarouselCard>('growspace-carousel-card', {
        hass: hassWithCounts,
        growspace: gs1,
        config: {
          type: 'custom:growspace-carousel-card',
          growspaces: [gs1.growspaceId, gs2.growspaceId],
        },
      });
      handle.element.hass = hassWithCounts;
      const active = (handle.element as any)._activeGrowspaces;
      expect(active).toEqual([gs1.growspaceId, gs2.growspaceId]);
      handle.unmount();
    });

    test('filter_empty=true shows a message when all growspaces are empty', async () => {
      const allEmptyHass = {
        ...hass,
        states: {
          ...hass.states,
          'sensor.growspaces_list': {
            attributes: {
              growspaces: {
                [gs1.growspaceId]: { name: gs1.name, total_plants: 0 },
                [gs2.growspaceId]: { name: gs2.name, total_plants: 0 },
              },
            },
          },
        },
      } as any;
      const handle = await renderCard<GrowspaceCarouselCard>('growspace-carousel-card', {
        hass: allEmptyHass,
        growspace: gs1,
        config: {
          type: 'custom:growspace-carousel-card',
          growspaces: [gs1.growspaceId, gs2.growspaceId],
          filter_empty: true,
        },
      });
      handle.element.hass = allEmptyHass;
      await handle.element.updateComplete;
      const active = (handle.element as any)._activeGrowspaces;
      expect(active).toEqual([]);
      expect(handle.element.shadowRoot?.textContent).toContain('No growspaces with plants');
      expect(handle.element.shadowRoot?.textContent).toContain(
        'None of the filtered growspaces have any plants.'
      );
      expect(handle.element.shadowRoot?.querySelector('growspace-manager-card')).toBeNull();
      handle.unmount();
    });

    test('reads plant counts from overview sensors with the integration list format', async () => {
      const integrationListHass = {
        ...hass,
        states: {
          'sensor.growspaces_list': {
            attributes: {
              growspaces: {
                [gs1.growspaceId]: 'Tent A',
                [gs2.growspaceId]: 'Tent B',
              },
            },
          },
          'sensor.tent_a': {
            state: '2',
            attributes: { growspace_id: gs1.growspaceId, total_plants: 2 },
          },
          'sensor.tent_b': {
            state: '0',
            attributes: { growspace_id: gs2.growspaceId, total_plants: 0 },
          },
        },
      } as any;
      const handle = await renderCard<GrowspaceCarouselCard>('growspace-carousel-card', {
        hass: integrationListHass,
        growspace: gs1,
        config: {
          type: 'custom:growspace-carousel-card',
          growspaces: [gs1.growspaceId, gs2.growspaceId],
          filter_empty: true,
        },
      });
      handle.element.hass = integrationListHass;
      const active = (handle.element as any)._activeGrowspaces;
      expect(active).toEqual([gs1.growspaceId]);
      handle.unmount();
    });

    test('renders the growspace at the filtered index', async () => {
      const filteredHass = {
        ...hass,
        states: {
          'sensor.growspaces_list': {
            attributes: {
              growspaces: {
                [gs1.growspaceId]: { name: gs1.name, total_plants: 2 },
                [gs2.growspaceId]: { name: gs2.name, total_plants: 0 },
                tent_c: { name: 'Tent C', total_plants: 1 },
              },
            },
          },
        },
      } as any;
      const handle = await renderCard<GrowspaceCarouselCard>('growspace-carousel-card', {
        hass: filteredHass,
        growspace: gs1,
        config: {
          type: 'custom:growspace-carousel-card',
          growspaces: [gs1.growspaceId, gs2.growspaceId, 'tent_c'],
          filter_empty: true,
        },
      });
      handle.element.hass = filteredHass;
      (handle.element as any)._currentIndex = 1;
      handle.element.requestUpdate();
      await handle.element.updateComplete;

      const manager = handle.element.shadowRoot?.querySelector('growspace-manager-card') as any;
      expect(manager?._config.default_growspace).toBe('tent_c');
      handle.unmount();
    });

    test('_startTimer uses default interval of 15s when interval is not configured', async () => {
      vi.useFakeTimers();
      const handle = await renderCard<GrowspaceCarouselCard>('growspace-carousel-card', {
        hass: hassWithCounts,
        growspace: gs1,
        config: {
          type: 'custom:growspace-carousel-card',
          growspaces: [gs1.growspaceId, gs2.growspaceId],
        },
      });
      handle.element.hass = hassWithCounts;
      (handle.element as any)._config.interval = 0;
      (handle.element as any)._startTimer();

      const nextSlideSpy = vi
        .spyOn(handle.element as any, '_nextSlide')
        .mockResolvedValue(undefined);
      vi.advanceTimersByTime(15000);
      expect(nextSlideSpy).toHaveBeenCalledTimes(1);

      handle.unmount();
      vi.useRealTimers();
    });
  });
});
