import { describe, it, expect, afterEach } from 'vitest';
import { GsBreederManager } from './gs-breeder-manager';
import './gs-breeder-manager';

const mockTags = ['ha-dialog', 'ha-svg-icon', 'gs-dialog', 'gs-help-tooltip'];
for (const tag of mockTags) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
}

function createElement(
  props: Partial<{ open: boolean; strains: unknown[] }> = {}
): GsBreederManager {
  const el = document.createElement('gs-breeder-manager') as GsBreederManager;
  Object.assign(el, { strains: [], open: false, ...props });
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('GsBreederManager – close event', () => {
  it('dispatches "close" (not "closed") when _close is called', () => {
    const el = createElement();
    const events: Event[] = [];
    el.addEventListener('close', (e) => events.push(e));

    (el as any)._close();

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('close');
  });

  it('does not dispatch "closed" when _close is called', () => {
    const el = createElement();
    const closedEvents: Event[] = [];
    el.addEventListener('closed', (e) => closedEvents.push(e));

    (el as any)._close();

    expect(closedEvents).toHaveLength(0);
  });

  it('close event has bubbles: true', () => {
    const el = createElement();
    const events: Event[] = [];
    el.addEventListener('close', (e) => events.push(e));

    (el as any)._close();

    expect((events[0] as CustomEvent).bubbles).toBe(true);
  });

  it('close event has composed: true', () => {
    const el = createElement();
    const events: Event[] = [];
    el.addEventListener('close', (e) => events.push(e));

    (el as any)._close();

    expect((events[0] as CustomEvent).composed).toBe(true);
  });
});

describe('GsBreederManager – render', () => {
  it('renders nothing when open is false', async () => {
    const el = createElement({ open: false });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('gs-dialog')).toBeNull();
    expect(el.shadowRoot?.querySelector('ha-dialog')).toBeNull();
  });

  it('renders gs-dialog (not ha-dialog) when open is true', async () => {
    const el = createElement({ open: true });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('gs-dialog')).not.toBeNull();
    expect(el.shadowRoot?.querySelector('ha-dialog')).toBeNull();
  });

  it('does not render a custom close-X button in shadow root', async () => {
    const el = createElement({ open: true });
    await el.updateComplete;
    const closeButtons = el.shadowRoot?.querySelectorAll('button');
    const closeXBtn = Array.from(closeButtons ?? []).find(
      (btn) => btn.classList.contains('close') || btn.getAttribute('aria-label') === 'Close'
    );
    expect(closeXBtn).toBeUndefined();
  });
});
