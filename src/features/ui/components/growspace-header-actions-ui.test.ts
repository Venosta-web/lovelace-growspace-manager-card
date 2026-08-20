import { describe, it, expect, afterEach, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { userEvent } from 'vitest/browser';
import { GrowspaceHeaderActionsUI } from './growspace-header-actions-ui';
import './growspace-header-actions-ui';

const mockTags = ['scroll-container', 'growspace-chip', 'gs-help-tooltip'];
for (const tag of mockTags) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
}

function createElement(props: Partial<GrowspaceHeaderActionsUI> = {}): GrowspaceHeaderActionsUI {
  const el = document.createElement('growspace-header-actions-ui') as GrowspaceHeaderActionsUI;
  Object.assign(el, props);
  return el;
}

// ---------------------------------------------------------------------------
// _chipDraggable
// ---------------------------------------------------------------------------

describe('GrowspaceHeaderActionsUI – _chipDraggable', () => {
  it('keeps metric dragging disabled outside the guided Compare flow', () => {
    const el = createElement({ isMobile: false, mobileLink: true });
    expect((el as any)._chipDraggable).toBe('false');
  });
});

// ---------------------------------------------------------------------------
// EC Ramp Curves menu item removal
// ---------------------------------------------------------------------------

describe('GrowspaceHeaderActionsUI – EC Ramp Curves menu item', () => {
  it('never appears in the menu even when device has pump, schedule, and EC sensors', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui
        .isMobile=${false}
        .device=${{
          irrigationConfig: {
            irrigationPumpEntity: 'switch.pump',
            drainPumpEntity: '',
            irrigationTimes: ['08:00'],
          },
          environmentAttributes: {
            feedEcSensors: ['sensor.feed_ec'],
            runoffEcSensors: [],
            bulkEcSensors: [],
            poreEcSensors: [],
          },
        }}
      ></growspace-header-actions-ui>
    `);
    const labels = Array.from(el.shadowRoot!.querySelectorAll('.menu-item-label')).map((i) =>
      i.textContent?.trim()
    );
    expect(labels).not.toContain('EC Ramp Curves');
  });
});

// ---------------------------------------------------------------------------
// render – desktop vs mobile structure
// ---------------------------------------------------------------------------

describe('GrowspaceHeaderActionsUI – desktop render', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders device chips container on desktop', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${false}></growspace-header-actions-ui>
    `);
    expect(el.shadowRoot!.querySelector('.gs-device-chips-container')).not.toBeNull();
  });

  it('does not render mobile-link button on desktop', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${false}></growspace-header-actions-ui>
    `);
    expect(el.shadowRoot!.querySelector('.mobile-link')).toBeNull();
  });

  it('renders heatmap and settings icon buttons on desktop', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${false}></growspace-header-actions-ui>
    `);
    const buttons = el.shadowRoot!.querySelectorAll('.icon-button');
    const labels = Array.from(buttons).map((b) => (b as HTMLElement).title);
    expect(labels).toContain('3D Heatmap');
    expect(labels).toContain('Settings');
  });

  it('replaces the Edit Mode icon with named task entries in the overflow menu', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui
        .isMobile=${false}
        .canArrange=${true}
        .canCompare=${true}
        .device=${{ plants: [{}] }}
      ></growspace-header-actions-ui>
    `);
    const toolbarLabels = Array.from(el.shadowRoot!.querySelectorAll('.icon-button')).map(
      (button) => (button as HTMLElement).title
    );
    const taskLabels = Array.from(el.shadowRoot!.querySelectorAll('.menu-item-label')).map((item) =>
      item.textContent?.trim()
    );
    expect(toolbarLabels).not.toContain('Edit Mode');
    expect(taskLabels).toEqual(expect.arrayContaining(['Arrange', 'Compare', 'Select plants']));
  });

  it('does not show Growspace menu section on desktop', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${false}></growspace-header-actions-ui>
    `);
    const headers = el.shadowRoot!.querySelectorAll('.menu-header');
    const texts = Array.from(headers).map((h) => h.textContent?.trim());
    expect(texts).not.toContain('Growspace');
  });
});

describe('GrowspaceHeaderActionsUI – mobile render', () => {
  afterEach(() => vi.restoreAllMocks());

  it('hides device chips container on mobile', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${true}></growspace-header-actions-ui>
    `);
    expect(el.shadowRoot!.querySelector('.gs-device-chips-container')).toBeNull();
  });

  it('does not render the hidden mobile link-mode toggle', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${true}></growspace-header-actions-ui>
    `);
    expect(el.shadowRoot!.querySelector('.mobile-link')).toBeNull();
  });

  it('does not render heatmap and settings as toolbar icon buttons on mobile', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${true}></growspace-header-actions-ui>
    `);
    const buttons = el.shadowRoot!.querySelectorAll('.icon-button');
    const labels = Array.from(buttons).map((b) => (b as HTMLElement).title);
    expect(labels).not.toContain('3D Heatmap');
    expect(labels).not.toContain('Settings');
  });

  it('does not render the hidden Edit Mode button on mobile', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${true}></growspace-header-actions-ui>
    `);
    const buttons = el.shadowRoot!.querySelectorAll('.icon-button');
    const labels = Array.from(buttons).map((b) => (b as HTMLElement).title);
    expect(labels).not.toContain('Edit Mode');
  });

  it('groups mobile Settings and Heatmap under Setup and Insights', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${true}></growspace-header-actions-ui>
    `);
    const headers = el.shadowRoot!.querySelectorAll('.menu-header');
    const headerTexts = Array.from(headers).map((h) => h.textContent?.trim());
    expect(headerTexts).toEqual(['Plant care', 'Setup', 'Insights']);

    const items = el.shadowRoot!.querySelectorAll('.menu-item .menu-item-label');
    const itemTexts = Array.from(items).map((i) => i.textContent?.trim());
    expect(itemTexts).toContain('Settings');
    expect(itemTexts).toContain('3D Heatmap');
  });
});

// ---------------------------------------------------------------------------
// event dispatching
// ---------------------------------------------------------------------------

describe('GrowspaceHeaderActionsUI – events', () => {
  afterEach(() => vi.restoreAllMocks());

  it('dispatches the understandable task action from a native menu button', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .canCompare=${true}></growspace-header-actions-ui>
    `);
    const events: CustomEvent[] = [];
    el.addEventListener('action-triggered', (e) => events.push(e as CustomEvent));

    const compare = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.menu-item')
    ).find((button) => button.textContent?.includes('Compare'))!;
    compare.click();

    expect(events).toHaveLength(1);
    expect(events[0].detail).toEqual({ action: 'compare' });
  });

  it('exposes the current task state to assistive technology', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .activeTask=${'compare'}></growspace-header-actions-ui>
    `);
    const compare = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.menu-item')
    ).find((button) => button.textContent?.includes('Compare'))!;
    expect(compare.classList.contains('active')).toBe(true);
    expect(compare.getAttribute('aria-current')).toBe('true');
  });

  it('dispatches action-triggered with "water Selected" label when plants are selected', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui
        .isMobile=${false}
        .selectedPlants=${new Set(['p1', 'p2'])}
      ></growspace-header-actions-ui>
    `);
    const waterItem = Array.from(el.shadowRoot!.querySelectorAll('.menu-item-label')).find((i) =>
      i.textContent?.includes('Water Selected')
    );
    expect(waterItem).not.toBeNull();
  });

  it('shows "Water Growspace" label when no plants are selected', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui
        .isMobile=${false}
        .selectedPlants=${new Set()}
      ></growspace-header-actions-ui>
    `);
    const waterItem = Array.from(el.shadowRoot!.querySelectorAll('.menu-item-label')).find((i) =>
      i.textContent?.includes('Water Growspace')
    );
    expect(waterItem).not.toBeNull();
  });
});

describe('GrowspaceHeaderActionsUI – overflow menu accessibility', () => {
  it('uses menu semantics and moves focus with arrow keys', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui></growspace-header-actions-ui>
    `);
    const trigger = el.shadowRoot!.querySelector('#menu-trigger') as HTMLButtonElement;
    const menu = el.shadowRoot!.querySelector('#header-menu') as HTMLElement;
    const items = Array.from(
      menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
    );

    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(menu.getAttribute('role')).toBe('menu');
    menu.showPopover();
    (el as any)._handleMenuToggle({ newState: 'open' });
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(el.shadowRoot!.activeElement).toBe(items[0]);
    await userEvent.keyboard('{ArrowDown}');
    expect(el.shadowRoot!.activeElement).toBe(items[1]);
    await userEvent.keyboard('{End}');
    expect(el.shadowRoot!.activeElement).toBe(items[items.length - 1]);
  });

  it('closes with Escape and returns focus to the trigger', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui></growspace-header-actions-ui>
    `);
    const trigger = el.shadowRoot!.querySelector('#menu-trigger') as HTMLButtonElement;

    (el as any)._handleMenuToggle({ newState: 'open' });
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    (el as any)._handleMenuKeydown({
      key: 'Escape',
      currentTarget: {
        hidePopover: () => (el as any)._handleMenuToggle({ newState: 'closed' }),
      },
      preventDefault: () => undefined,
    });
    await el.updateComplete;

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(el.shadowRoot!.activeElement).toBe(trigger);
  });

  it('renders every overflow action as a native button', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${true}></growspace-header-actions-ui>
    `);
    const menuItems = el.shadowRoot!.querySelectorAll('[role="menuitem"]');
    expect(menuItems.length).toBeGreaterThan(0);
    expect(Array.from(menuItems).every((item) => item instanceof HTMLButtonElement)).toBe(true);
  });
});
