/**
 * The Tab Strip, pressed rather than dispatched.
 *
 * `userEvent` drives the browser's own keyboard, so Tab here is the real
 * sequential-focus order and the arrows reach the strip the way a user's do.
 * The strip is mounted the way every dialog mounts it — inside a shadow root,
 * next to the panel it names — because rendering into that root is the whole
 * reason it has no shadow root of its own.
 */

import { afterEach, describe, expect, test, vi } from 'vitest';
import { html, render } from 'lit';
import { userEvent } from 'vitest/browser';
import { mdiSprout } from '@mdi/js';

import '../../src/features/shared/ui/gs-tab-strip';
import type { GsTabStrip, TabStripTab } from '../../src/features/shared/ui/gs-tab-strip';

const TABS: TabStripTab[] = [
  { value: 'strains', label: 'Strains', id: 'tab-strains', controls: 'panel-strains' },
  { value: 'seeds', label: 'Seeds & Genetics', id: 'tab-seeds', controls: 'panel-seeds' },
  { value: 'tree', label: 'Tree View', id: 'tab-tree', controls: 'panel-tree' },
];

interface Mounted {
  strip: GsTabStrip;
  root: ShadowRoot;
  /** Every `tab-selected` value, in order. */
  chosen: string[];
}

/**
 * A stand-in dialog: a shadow root holding a button before the strip, the
 * strip, the selected tab's panel, and a button after it. Selection is
 * controlled the way the dialogs control it — the strip's event sets
 * `selected`, and nothing else does.
 */
async function mount(
  options: { selected?: string; tabs?: TabStripTab[]; disabled?: boolean } = {}
): Promise<Mounted> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });
  const tabs = options.tabs ?? TABS;
  const chosen: string[] = [];
  let selected = options.selected ?? tabs[0].value;

  const draw = (): void =>
    render(
      html`
        <button id="before">before</button>
        <gs-tab-strip
          .tabs=${tabs}
          .selected=${selected}
          label="Workspace"
          ?disabled=${options.disabled ?? false}
          @tab-selected=${(event: CustomEvent<{ value: string }>) => {
            chosen.push(event.detail.value);
            selected = event.detail.value;
            draw();
          }}
        ></gs-tab-strip>
        <div role="tabpanel" id="panel-${selected}" aria-labelledby="tab-${selected}">
          ${selected}
        </div>
        <button id="after">after</button>
      `,
      root
    );
  draw();

  const strip = root.querySelector('gs-tab-strip')!;
  await strip.updateComplete;
  return { strip, root, chosen };
}

function tabs(strip: GsTabStrip): HTMLButtonElement[] {
  return [...strip.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
}

/** The tabs a Tab can land on. */
function stops(strip: GsTabStrip): HTMLButtonElement[] {
  return tabs(strip).filter((tab) => tab.tabIndex === 0);
}

function selectedTab(strip: GsTabStrip): string | null {
  return strip.querySelector('[aria-selected="true"]')?.getAttribute('data-tab') ?? null;
}

async function settle(strip: GsTabStrip): Promise<void> {
  await strip.updateComplete;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('gs-tab-strip', () => {
  describe('semantics', () => {
    test('is a named tablist of tabs, one of them selected', async () => {
      const { strip } = await mount({ selected: 'seeds' });

      const tablist = strip.querySelector('[role="tablist"]')!;
      expect(tablist.getAttribute('aria-label')).toBe('Workspace');
      expect(tabs(strip).map((tab) => tab.textContent!.trim())).toEqual([
        'Strains',
        'Seeds & Genetics',
        'Tree View',
      ]);
      expect(tabs(strip).map((tab) => tab.getAttribute('aria-selected'))).toEqual([
        'false',
        'true',
        'false',
      ]);
    });

    test('lives in the dialog’s own tree, so its ID references resolve there', async () => {
      const { strip, root } = await mount({ selected: 'seeds' });

      expect(strip.shadowRoot).toBeNull();
      const selected = strip.querySelector<HTMLButtonElement>('[aria-selected="true"]')!;
      const panel = root.getElementById(selected.getAttribute('aria-controls')!);
      expect(panel?.getAttribute('role')).toBe('tabpanel');
      expect(root.getElementById(panel!.getAttribute('aria-labelledby')!)).toBe(selected);
    });

    test('carries aria-controls on the selected tab only', async () => {
      const { strip } = await mount({ selected: 'tree' });

      expect(tabs(strip).map((tab) => tab.getAttribute('aria-controls'))).toEqual([
        null,
        null,
        'panel-tree',
      ]);
    });

    test('renders no id or aria-controls for tabs that declare none', async () => {
      const { strip } = await mount({
        tabs: [
          { value: 'list', label: 'List View', iconPath: mdiSprout },
          { value: 'timeline', label: 'Timeline' },
        ],
      });

      for (const tab of tabs(strip)) {
        expect(tab.hasAttribute('id')).toBe(false);
        expect(tab.hasAttribute('aria-controls')).toBe(false);
      }
    });

    test('keeps an icon out of the accessible name', async () => {
      const { strip } = await mount({
        tabs: [{ value: 'list', label: 'List View', iconPath: mdiSprout }],
      });

      const icon = tabs(strip)[0].querySelector('svg')!;
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      expect(tabs(strip)[0].textContent!.trim()).toBe('List View');
    });

    test('styles the tabs it renders, and nothing else in the root', async () => {
      const { strip, root } = await mount();

      expect(getComputedStyle(tabs(strip)[0]).minHeight).toBe('44px');
      expect(getComputedStyle(root.getElementById('before')!).minHeight).not.toBe('44px');
    });

    test('adopts its sheets into a root once, however many strips it holds', async () => {
      const { root } = await mount();
      const before = root.adoptedStyleSheets.length;

      const second = document.createElement('gs-tab-strip');
      root.appendChild(second);
      await second.updateComplete;

      expect(root.adoptedStyleSheets.length).toBe(before);
    });
  });

  describe('keyboard', () => {
    test('is a single Tab stop, on the selected tab', async () => {
      const { strip } = await mount({ selected: 'seeds' });

      expect(stops(strip).map((tab) => tab.dataset.tab)).toEqual(['seeds']);
    });

    test('is crossed with one Tab, entering and leaving on the selected tab', async () => {
      const { strip, root } = await mount({ selected: 'seeds' });

      root.getElementById('before')!.focus();
      await userEvent.keyboard('{Tab}');
      expect(root.activeElement?.getAttribute('data-tab')).toBe('seeds');
      await userEvent.keyboard('{Tab}');
      expect(root.activeElement?.id).toBe('after');
      await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
      expect(root.activeElement?.getAttribute('data-tab')).toBe('seeds');
      expect(strip.contains(root.activeElement)).toBe(true);
    });

    test('moves with the arrows, selecting each tab it lands on and wrapping', async () => {
      const { strip, root, chosen } = await mount({ selected: 'strains' });

      tabs(strip)[0].focus();
      await userEvent.keyboard('{ArrowRight}');
      await settle(strip);
      expect(root.activeElement?.getAttribute('data-tab')).toBe('seeds');
      expect(selectedTab(strip)).toBe('seeds');

      await userEvent.keyboard('{ArrowRight}{ArrowRight}');
      await settle(strip);
      expect(root.activeElement?.getAttribute('data-tab')).toBe('strains');
      expect(selectedTab(strip)).toBe('strains');

      await userEvent.keyboard('{ArrowLeft}');
      await settle(strip);
      expect(root.activeElement?.getAttribute('data-tab')).toBe('tree');
      expect(selectedTab(strip)).toBe('tree');

      expect(chosen).toEqual(['seeds', 'tree', 'strains', 'tree']);
    });

    test('jumps to the ends with Home and End', async () => {
      const { strip, root } = await mount({ selected: 'seeds' });

      tabs(strip)[1].focus();
      await userEvent.keyboard('{End}');
      await settle(strip);
      expect(root.activeElement?.getAttribute('data-tab')).toBe('tree');
      expect(selectedTab(strip)).toBe('tree');

      await userEvent.keyboard('{Home}');
      await settle(strip);
      expect(root.activeElement?.getAttribute('data-tab')).toBe('strains');
      expect(selectedTab(strip)).toBe('strains');
    });

    test('moves the Tab stop with the selection', async () => {
      const { strip, root } = await mount({ selected: 'strains' });

      tabs(strip)[0].focus();
      await userEvent.keyboard('{End}');
      await settle(strip);
      await userEvent.keyboard('{Tab}');
      await userEvent.keyboard('{Shift>}{Tab}{/Shift}');

      expect(root.activeElement?.getAttribute('data-tab')).toBe('tree');
      expect(stops(strip).map((tab) => tab.dataset.tab)).toEqual(['tree']);
    });

    test('keeps the keys it uses from reaching the dialog', async () => {
      const { strip } = await mount();
      const heard = vi.fn();
      strip.parentNode!.addEventListener('keydown', heard as EventListener);

      tabs(strip)[0].focus();
      await userEvent.keyboard('{ArrowRight}{Home}{End}{ArrowLeft}');

      expect(heard).not.toHaveBeenCalled();
    });

    test('leaves Up, Down and modified arrows alone', async () => {
      const { strip, chosen } = await mount();
      const heard = vi.fn();
      strip.parentNode!.addEventListener('keydown', heard as EventListener);

      tabs(strip)[0].focus();
      await userEvent.keyboard('{ArrowDown}{ArrowUp}{Shift>}{ArrowRight}{/Shift}');

      expect(chosen).toEqual([]);
      expect(heard).toHaveBeenCalled();
    });
  });

  describe('selection', () => {
    test('reports a click on another tab', async () => {
      const { strip, chosen } = await mount({ selected: 'strains' });

      await userEvent.click(tabs(strip)[2]);
      await settle(strip);

      expect(chosen).toEqual(['tree']);
      expect(selectedTab(strip)).toBe('tree');
    });

    test('reports nothing for the tab already selected', async () => {
      const { strip, chosen } = await mount({ selected: 'seeds' });

      await userEvent.click(tabs(strip)[1]);

      expect(chosen).toEqual([]);
    });

    test('is the dialog’s to refuse: an unanswered event selects nothing', async () => {
      const strip = document.createElement('gs-tab-strip');
      strip.tabs = TABS;
      strip.selected = 'strains';
      document.body.appendChild(strip);
      await strip.updateComplete;

      tabs(strip)[0].focus();
      await userEvent.keyboard('{ArrowRight}');
      await settle(strip);

      expect(selectedTab(strip)).toBe('strains');
      expect(stops(strip).map((tab) => tab.dataset.tab)).toEqual(['strains']);
    });

    test('still activates the focused tab with Enter and Space', async () => {
      const strip = document.createElement('gs-tab-strip');
      strip.tabs = TABS;
      strip.selected = 'strains';
      const chosen: string[] = [];
      strip.addEventListener('tab-selected', (event) =>
        chosen.push((event as CustomEvent<{ value: string }>).detail.value)
      );
      document.body.appendChild(strip);
      await strip.updateComplete;

      tabs(strip)[1].focus();
      await userEvent.keyboard('{Enter}');
      tabs(strip)[2].focus();
      await userEvent.keyboard(' ');

      expect(chosen).toEqual(['seeds', 'tree']);
    });

    test('puts the Tab stop on the first tab when nothing matches the selection', async () => {
      const { strip } = await mount({ selected: 'nonexistent' });

      expect(stops(strip).map((tab) => tab.dataset.tab)).toEqual(['strains']);
      expect(selectedTab(strip)).toBeNull();
    });

    test('disables every tab while disabled', async () => {
      const { strip, chosen } = await mount({ disabled: true });

      expect(tabs(strip).every((tab) => tab.disabled)).toBe(true);
      tabs(strip)[1].click();
      expect(chosen).toEqual([]);
    });
  });
});
