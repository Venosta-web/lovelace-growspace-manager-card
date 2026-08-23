import { describe, it, expect, vi } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';
import { html } from 'lit';
import '../../../src/features/shared/ui/gs-help-tooltip';
import type { GsHelpTooltip } from '../../../src/features/shared/ui/gs-help-tooltip';

function mockRect(btn: HTMLButtonElement, rect: Partial<DOMRect>) {
  vi.spyOn(btn, 'getBoundingClientRect').mockReturnValue({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
    ...rect,
  } as DOMRect);
}

function fireToggle(popover: HTMLElement, newState: 'open' | 'closed') {
  popover.dispatchEvent(
    new ToggleEvent('toggle', { newState, oldState: newState === 'open' ? 'closed' : 'open' })
  );
}

describe('GsHelpTooltip', () => {
  it('renders an info icon button', async () => {
    const el = await fixture<GsHelpTooltip>(html`
      <gs-help-tooltip content="Test help text"></gs-help-tooltip>
    `);
    const btn = el.shadowRoot!.querySelector('.help-trigger');
    expect(btn).toBeTruthy();
  });

  it('renders popover with content text', async () => {
    const el = await fixture<GsHelpTooltip>(html`
      <gs-help-tooltip content="Explains the feature"></gs-help-tooltip>
    `);
    const popover = el.shadowRoot!.querySelector('.help-popover');
    expect(popover?.textContent?.trim()).toContain('Explains the feature');
  });

  it('accepts placement prop without error', async () => {
    const el = await fixture<GsHelpTooltip>(html`
      <gs-help-tooltip content="Test" placement="bottom"></gs-help-tooltip>
    `);
    expect(el.placement).toBe('bottom');
  });

  it('renders nothing when content is empty', async () => {
    const el = await fixture<GsHelpTooltip>(html` <gs-help-tooltip content=""></gs-help-tooltip> `);
    const btn = el.shadowRoot!.querySelector('.help-trigger');
    expect(btn).toBeNull();
  });

  it('wires popovertarget on button to id on popover', async () => {
    const el = await fixture<GsHelpTooltip>(html`
      <gs-help-tooltip content="Test"></gs-help-tooltip>
    `);
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('.help-trigger')!;
    const popover = el.shadowRoot!.querySelector('.help-popover')!;
    expect(btn.getAttribute('popovertarget')).toBe(popover.id);
  });

  it('reflects placement as DOM attribute', async () => {
    const el = await fixture<GsHelpTooltip>(html`
      <gs-help-tooltip content="Test" placement="bottom"></gs-help-tooltip>
    `);
    expect(el.getAttribute('placement')).toBe('bottom');
  });

  describe('JS positioning fallback', () => {
    it('sets style.left on popover when toggle fires open (tracer bullet)', async () => {
      const el = await fixture<GsHelpTooltip>(html`
        <gs-help-tooltip content="Test"></gs-help-tooltip>
      `);
      const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('.help-trigger')!;
      const popover = el.shadowRoot!.querySelector<HTMLElement>('.help-popover')!;
      mockRect(btn, { top: 100, bottom: 118, left: 200, right: 218, width: 18, height: 18 });

      fireToggle(popover, 'open');

      expect(popover.style.left).not.toBe('');
    });

    it('sets style.top on popover when toggle fires open', async () => {
      const el = await fixture<GsHelpTooltip>(html`
        <gs-help-tooltip content="Test"></gs-help-tooltip>
      `);
      const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('.help-trigger')!;
      const popover = el.shadowRoot!.querySelector<HTMLElement>('.help-popover')!;
      mockRect(btn, { top: 100, bottom: 118, left: 200, right: 218, width: 18, height: 18 });

      fireToggle(popover, 'open');

      expect(popover.style.top).not.toBe('');
    });

    it('placement=top positions popover above button', async () => {
      const el = await fixture<GsHelpTooltip>(html`
        <gs-help-tooltip content="Test" placement="top"></gs-help-tooltip>
      `);
      const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('.help-trigger')!;
      const popover = el.shadowRoot!.querySelector<HTMLElement>('.help-popover')!;
      mockRect(btn, { top: 100, bottom: 118, left: 200, right: 218, width: 18, height: 18 });

      fireToggle(popover, 'open');

      // top = rect.top - popover.offsetHeight - 6; offsetHeight is 0 in test → 100 - 0 - 6 = 94
      expect(popover.style.top).toBe('94px');
      // left = rect.left + rect.width / 2 → 200 + 9 = 209
      expect(popover.style.left).toBe('209px');
    });

    it('placement=bottom positions popover below button', async () => {
      const el = await fixture<GsHelpTooltip>(html`
        <gs-help-tooltip content="Test" placement="bottom"></gs-help-tooltip>
      `);
      const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('.help-trigger')!;
      const popover = el.shadowRoot!.querySelector<HTMLElement>('.help-popover')!;
      mockRect(btn, { top: 100, bottom: 118, left: 200, right: 218, width: 18, height: 18 });

      fireToggle(popover, 'open');

      // top = rect.bottom + 6 → 118 + 6 = 124
      expect(popover.style.top).toBe('124px');
      expect(popover.style.left).toBe('209px');
    });

    it('placement=left positions popover to the left of button', async () => {
      const el = await fixture<GsHelpTooltip>(html`
        <gs-help-tooltip content="Test" placement="left"></gs-help-tooltip>
      `);
      const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('.help-trigger')!;
      const popover = el.shadowRoot!.querySelector<HTMLElement>('.help-popover')!;
      mockRect(btn, { top: 100, bottom: 118, left: 200, right: 218, width: 18, height: 18 });

      fireToggle(popover, 'open');

      // top = rect.top + rect.height / 2 → 100 + 9 = 109
      expect(popover.style.top).toBe('109px');
      // left = rect.left - popover.offsetWidth - 6; offsetWidth is 0 → 200 - 0 - 6 = 194
      expect(popover.style.left).toBe('194px');
    });

    it('placement=right positions popover to the right of button', async () => {
      const el = await fixture<GsHelpTooltip>(html`
        <gs-help-tooltip content="Test" placement="right"></gs-help-tooltip>
      `);
      const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('.help-trigger')!;
      const popover = el.shadowRoot!.querySelector<HTMLElement>('.help-popover')!;
      mockRect(btn, { top: 100, bottom: 118, left: 200, right: 218, width: 18, height: 18 });

      fireToggle(popover, 'open');

      // top = rect.top + rect.height / 2 → 100 + 9 = 109
      expect(popover.style.top).toBe('109px');
      // left = rect.right + 6 → 218 + 6 = 224
      expect(popover.style.left).toBe('224px');
    });

    it('clears inline styles when popover closes', async () => {
      const el = await fixture<GsHelpTooltip>(html`
        <gs-help-tooltip content="Test"></gs-help-tooltip>
      `);
      const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('.help-trigger')!;
      const popover = el.shadowRoot!.querySelector<HTMLElement>('.help-popover')!;
      mockRect(btn, { top: 100, bottom: 118, left: 200, right: 218, width: 18, height: 18 });

      fireToggle(popover, 'open');
      fireToggle(popover, 'closed');

      expect(popover.style.top).toBe('');
      expect(popover.style.left).toBe('');
    });
  });
});
