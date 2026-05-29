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

  test('setConfig throws if growspaces is empty', async () => {
    const handle = await renderCard<GrowspaceCarouselCard>('growspace-carousel-card', {
      hass,
      growspace: gs1,
      config: carouselConfig,
    });
    expect(() =>
      handle.element.setConfig({ type: 'custom:growspace-carousel-card', growspaces: [] } as any)
    ).toThrowError('You need to define at least one growspace');
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

  test('getStubConfig returns default config', () => {
    expect(GrowspaceCarouselCard.getStubConfig()).toEqual({
      type: 'custom:growspace-carousel-card',
      growspaces: [],
      interval: 15,
    });
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
        config: { type: 'custom:growspace-carousel-card', growspaces: [gs1.growspaceId, gs2.growspaceId], filter_empty: true },
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
        config: { type: 'custom:growspace-carousel-card', growspaces: [gs1.growspaceId, gs2.growspaceId] },
      });
      handle.element.hass = hassWithCounts;
      const active = (handle.element as any)._activeGrowspaces;
      expect(active).toEqual([gs1.growspaceId, gs2.growspaceId]);
      handle.unmount();
    });
  });
});
