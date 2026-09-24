import { describe, it, expect, afterEach, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { page, userEvent } from 'vitest/browser';
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
// Label Templates menu item (workspace #224)
// ---------------------------------------------------------------------------

describe('GrowspaceHeaderActionsUI – Label Templates menu item', () => {
  const menu = (labelTemplatesAvailable: boolean) =>
    fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui
        .isMobile=${false}
        .labelTemplatesAvailable=${labelTemplatesAvailable}
      ></growspace-header-actions-ui>
    `);

  const actions = (el: GrowspaceHeaderActionsUI): string[] =>
    Array.from(el.shadowRoot!.querySelectorAll('[data-action]')).map(
      (item) => item.getAttribute('data-action') ?? ''
    );

  it('is absent against a backend with no published capability', async () => {
    const el = await menu(false);

    // Absent, not disabled. An old backend is not withholding a feature from
    // this user; it has none, and the Classic print dialogs are unaffected.
    expect(actions(el)).not.toContain('label-templates');
    const labels = Array.from(el.shadowRoot!.querySelectorAll('.menu-item-label')).map((i) =>
      i.textContent?.trim()
    );
    expect(labels).not.toContain('Label Templates');
  });

  it('appears once the complete capability has been negotiated', async () => {
    const el = await menu(true);

    expect(actions(el)).toContain('label-templates');
  });
});

// ---------------------------------------------------------------------------
// Tissue Culture menu item (workspace #152 / ADR 0057)
// ---------------------------------------------------------------------------

describe('GrowspaceHeaderActionsUI – Tissue Culture menu item', () => {
  const menu = async (tcAvailable: boolean) => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui
        .isMobile=${false}
        .tcAvailable=${tcAvailable}
      ></growspace-header-actions-ui>
    `);
    return el;
  };

  const actions = (el: GrowspaceHeaderActionsUI): string[] =>
    Array.from(el.shadowRoot!.querySelectorAll('[data-action]')).map(
      (item) => item.getAttribute('data-action') ?? ''
    );

  it('is absent while presence is unknown or absent', async () => {
    const el = await menu(false);

    // Absent, not disabled: an installation the card never found is not a
    // feature the user is being denied.
    expect(actions(el)).not.toContain('tc');
    const labels = Array.from(el.shadowRoot!.querySelectorAll('.menu-item-label')).map((i) =>
      i.textContent?.trim()
    );
    expect(labels).not.toContain('Tissue Culture');
  });

  it('appears in Manage, immediately after Strains, once TC has answered', async () => {
    const el = await menu(true);
    const order = actions(el);

    expect(order).toContain('tc');
    expect(order.indexOf('tc')).toBe(order.indexOf('strains') + 1);
  });

  it('is labelled Tissue Culture', async () => {
    const el = await menu(true);
    const item = el.shadowRoot!.querySelector('[data-action="tc"]');

    expect(item?.textContent?.trim()).toContain('Tissue Culture');
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

  it('groups mobile Heatmap under Review and Settings under Manage', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${true}></growspace-header-actions-ui>
    `);
    const headers = el.shadowRoot!.querySelectorAll('.menu-header');
    const headerTexts = Array.from(headers).map((h) => h.textContent?.trim());
    expect(headerTexts).toEqual(['Do', 'Review', 'Manage']);

    const inGroup = (group: string) =>
      Array.from(
        el.shadowRoot!.querySelectorAll(`[data-group="${group}"] .menu-item[data-action]`)
      ).map((item) => item.getAttribute('data-action'));
    expect(inGroup('review')).toContain('heatmap');
    expect(inGroup('manage')[0]).toBe('config');
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

  it('labels the direct water action with the selection count when plants are selected', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui
        .isMobile=${false}
        .selectedPlants=${new Set(['p1', 'p2'])}
      ></growspace-header-actions-ui>
    `);
    const waterItem = Array.from(el.shadowRoot!.querySelectorAll('.menu-item-label')).find((i) =>
      i.textContent?.includes('Water selected (2)')
    );
    expect(waterItem).toBeDefined();
  });

  it('shows "Water now" when no plants are selected', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui
        .isMobile=${false}
        .selectedPlants=${new Set()}
      ></growspace-header-actions-ui>
    `);
    const waterItem = Array.from(el.shadowRoot!.querySelectorAll('.menu-item-label')).find(
      (i) => i.textContent?.trim() === 'Water now'
    );
    expect(waterItem).toBeDefined();
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

// ---------------------------------------------------------------------------
// Layered menu (card#972): direct actions, then Do / Review / Manage, then AI
// ---------------------------------------------------------------------------

describe('GrowspaceHeaderActionsUI – layered menu', () => {
  const layered = async (props: { isMobile?: boolean; selected?: string[] } = {}) => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui
        .isMobile=${props.isMobile ?? false}
        .canArrange=${true}
        .canCompare=${true}
        .tcAvailable=${true}
        .labelTemplatesAvailable=${true}
        .selectedPlants=${new Set(props.selected ?? [])}
        .device=${{ plants: [{}] }}
      ></growspace-header-actions-ui>
    `);
    return el;
  };

  const menuOf = (el: GrowspaceHeaderActionsUI) =>
    el.shadowRoot!.querySelector<HTMLElement>('#header-menu')!;

  /** The menu's direct children, in order, as "item:<action>" / "group:<id>" / "separator". */
  const outline = (el: GrowspaceHeaderActionsUI) =>
    Array.from(menuOf(el).children)
      .map((node) => {
        if (node.getAttribute('role') === 'menuitem')
          return `item:${node.getAttribute('data-action')}`;
        if (node.getAttribute('role') === 'group')
          return `group:${node.getAttribute('data-group')}`;
        if (node.getAttribute('role') === 'separator') return 'separator';
        return null;
      })
      .filter((entry): entry is string => entry !== null);

  const groupActions = (el: GrowspaceHeaderActionsUI, group: string) =>
    Array.from(
      menuOf(el).querySelectorAll(`[role="group"][data-group="${group}"] [role="menuitem"]`)
    ).map((item) => item.getAttribute('data-action'));

  afterEach(() => {
    document.querySelectorAll('growspace-header-actions-ui').forEach((el) => {
      const menu = el.shadowRoot?.querySelector<HTMLElement>('#header-menu');
      if (menu?.matches(':popover-open')) menu.hidePopover();
    });
  });

  it('puts Water now and Add plant first, outside any group, and Ask AI last on its own', async () => {
    const el = await layered();

    expect(outline(el)).toEqual([
      'item:water',
      'item:add_plant',
      'separator',
      'group:do',
      'separator',
      'group:review',
      'separator',
      'group:manage',
      'separator',
      'item:ai',
    ]);
    expect(
      el.shadowRoot!.querySelector('[data-action="water"] .menu-item-label')!.textContent
    ).toBe('Water now');
    expect(
      el.shadowRoot!.querySelector('[data-action="add_plant"] .menu-item-label')!.textContent
    ).toBe('Add plant');
  });

  it('files every destination under the group for its intent', async () => {
    const el = await layered();

    expect(groupActions(el, 'do')).toEqual(['ipm', 'training', 'arrange', 'select_plants']);
    expect(groupActions(el, 'review')).toEqual(['compare', 'logbook', 'snapshots']);
    expect(groupActions(el, 'manage')).toEqual([
      'irrigation',
      'irrigation-recipes',
      'irrigation-programs',
      'nutrients',
      'strains',
      'tc',
      'label-templates',
    ]);
  });

  it('keeps the mobile-only destinations in their groups', async () => {
    const el = await layered({ isMobile: true });

    expect(groupActions(el, 'review')).toEqual(['compare', 'logbook', 'snapshots', 'heatmap']);
    expect(groupActions(el, 'manage')[0]).toBe('config');
  });

  it('gives each group an accessible name', async () => {
    const el = await layered();
    menuOf(el).showPopover();
    const menu = page.elementLocator(menuOf(el));

    for (const [name, first] of [
      ['Do', 'Log / Manage IPM'],
      ['Review', 'Compare'],
      ['Manage', 'Irrigation'],
    ]) {
      const group = menu.getByRole('group', { name, exact: true });
      await expect.element(group).toBeVisible();
      await expect.element(group.getByRole('menuitem').first()).toHaveAccessibleName(first);
    }
    expect(menu.getByRole('group').all()).toHaveLength(3);
  });

  it('names the selection on the direct water action', async () => {
    const el = await layered({ selected: ['p1', 'p2', 'p3'] });

    expect(
      el.shadowRoot!.querySelector('[data-action="water"] .menu-item-label')!.textContent
    ).toBe('Water selected (3)');
  });

  it('moves focus across group boundaries with the arrow keys', async () => {
    const el = await layered();
    menuOf(el).showPopover();
    (el as any)._handleMenuToggle({ newState: 'open' });
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const focused = () => (el.shadowRoot!.activeElement as HTMLElement | null)?.dataset.action;
    expect(focused()).toBe('water');
    await userEvent.keyboard('{ArrowDown}');
    expect(focused()).toBe('add_plant');
    await userEvent.keyboard('{ArrowDown}');
    expect(focused()).toBe('ipm');
    await userEvent.keyboard('{End}');
    expect(focused()).toBe('ai');
  });
});
