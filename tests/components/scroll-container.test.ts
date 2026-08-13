import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../../src/features/shared/ui/scroll-container';
import type { ScrollContainer } from '../../src/features/shared/ui/scroll-container';

describe('scroll-container accessibility', () => {
  it('names the scroll region and exposes only available directions', async () => {
    const el = await fixture<ScrollContainer>(html`
      <scroll-container><div>Metrics</div></scroll-container>
    `);
    const content = el.shadowRoot!.querySelector('.scroll-content') as HTMLDivElement;
    Object.defineProperties(content, {
      clientWidth: { configurable: true, value: 100 },
      scrollWidth: { configurable: true, value: 300 },
      scrollLeft: { configurable: true, value: 0, writable: true },
    });
    el.checkScroll();
    await el.updateComplete;
    const [left, right] = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.scroll-arrow')
    );

    expect(content.getAttribute('role')).toBe('region');
    expect(content.getAttribute('aria-label')).toBe('Header metrics');
    expect(left.disabled).toBe(true);
    expect(right.disabled).toBe(false);
    expect(right.getAttribute('aria-label')).toBe('Scroll header metrics right');
  });

  it('scrolls from a keyboard-activated arrow button', async () => {
    const el = await fixture<ScrollContainer>(html`
      <scroll-container .scrollAmount=${150}><div>Metrics</div></scroll-container>
    `);
    const content = el.shadowRoot!.querySelector('.scroll-content') as HTMLDivElement;
    Object.defineProperties(content, {
      clientWidth: { configurable: true, value: 100 },
      scrollWidth: { configurable: true, value: 300 },
      scrollLeft: { configurable: true, value: 0, writable: true },
    });
    const scrollBy = vi.spyOn(content, 'scrollBy');
    el.checkScroll();
    await el.updateComplete;
    const right = el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.scroll-arrow')[1];

    right.focus();
    await userEvent.keyboard('{Enter}');

    expect(scrollBy).toHaveBeenCalledWith({ left: 150, behavior: 'smooth' });
  });
});
