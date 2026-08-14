import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { page } from 'vitest/browser';
import { StrainBrowseView } from '../../../src/dialogs/strain-browse-view';
import { StrainEntry } from '../../../src/types';
import '../../../src/dialogs/strain-browse-view';

vi.mock('../../../src/utils/plant-utils', () => ({
  PlantUtils: {
    compressImage: vi.fn().mockResolvedValue('base64string'),
    encodeLocalPath: vi.fn().mockImplementation((p: string) => p),
  },
}));

const DESKTOP = { width: 1280, height: 720 };
const MOBILE = { width: 390, height: 844 };

const MANAGED_ACTIONS = [
  ['Import Strains', 'import-requested'],
  ['Export Strains', 'export-library'],
  ['Manage Breeders', 'manage-breeders-requested'],
] as const;

const mockStrains: StrainEntry[] = [
  { key: '1', strain: 'Blue Dream', type: 'Sativa', breeder: 'HSO' },
  { key: '2', strain: 'OG Kush', type: 'Indica', breeder: 'Dinafem' },
];

describe.each([
  ['desktop', DESKTOP],
  ['mobile', MOBILE],
])('Strain Library action hierarchy (%s)', (_label, viewport) => {
  let element: StrainBrowseView;
  let root: ShadowRoot;

  const query = <T extends Element>(selector: string): T => root.querySelector<T>(selector) as T;

  const buttonsIn = (selector: string): HTMLButtonElement[] =>
    Array.from(root.querySelectorAll<HTMLButtonElement>(`${selector} button`));

  const openManageMenu = async (): Promise<HTMLButtonElement[]> => {
    query<HTMLButtonElement>('.manage-menu-trigger').click();
    await element.updateComplete;
    return Array.from(root.querySelectorAll<HTMLButtonElement>('.manage-menu-item'));
  };

  beforeEach(async () => {
    await page.viewport(viewport.width, viewport.height);
    element = new StrainBrowseView();
    element.strains = [...mockStrains];
    document.body.appendChild(element);
    await element.updateComplete;
    root = element.shadowRoot!;
  });

  afterEach(async () => {
    if (element.isConnected) document.body.removeChild(element);
    vi.clearAllMocks();
    // Viewport is context-global; leaving it narrow would shift other files'
    // screenshot comparisons.
    await page.viewport(DESKTOP.width, DESKTOP.height);
  });

  describe('placement', () => {
    it('exposes New Strain as the only primary action', () => {
      const primaries = Array.from(root.querySelectorAll('.md3-button.primary'));
      expect(primaries).toHaveLength(1);
      expect(primaries[0].textContent).toContain('New Strain');

      // No second New Strain affordance anywhere (the old FAB duplicated it).
      const newStrainControls = Array.from(root.querySelectorAll('button')).filter(
        (b) =>
          b.textContent?.includes('New Strain') || b.getAttribute('aria-label') === 'New Strain'
      );
      expect(newStrainControls).toHaveLength(1);
    });

    it('keeps the footer and both of its actions visible', () => {
      const footer = query<HTMLElement>('.sd-footer');
      expect(getComputedStyle(footer).display).not.toBe('none');

      const labels = buttonsIn('.sd-footer').map((b) => b.textContent?.trim());
      expect(labels).toEqual(['Get Recommendation', 'New Strain']);
    });

    it('renders Get Recommendation as a secondary action next to the primary', () => {
      const rec = buttonsIn('.sd-footer').find((b) =>
        b.textContent?.includes('Get Recommendation')
      );
      expect(rec?.classList.contains('tonal')).toBe(true);
      expect(rec?.classList.contains('primary')).toBe(false);
    });

    it('keeps the managed actions out of the footer until the menu is opened', async () => {
      const footerText = query<HTMLElement>('.sd-footer').textContent ?? '';
      for (const [label] of MANAGED_ACTIONS) expect(footerText).not.toContain(label);
      expect(root.querySelector('.manage-menu')).toBeNull();
    });

    it('lists each managed action exactly once, under the Manage menu', async () => {
      const items = await openManageMenu();
      expect(items.map((i) => i.textContent?.trim())).toEqual(
        MANAGED_ACTIONS.map(([label]) => label)
      );

      // Each label appears once in the whole view — no footer/menu duplication.
      for (const [label] of MANAGED_ACTIONS) {
        const matches = Array.from(root.querySelectorAll('button')).filter((b) =>
          b.textContent?.includes(label)
        );
        expect(matches, label).toHaveLength(1);
      }
    });
  });

  describe('emitted intents', () => {
    it('emits new-strain from the primary action', async () => {
      const spy = vi.fn();
      element.addEventListener('new-strain', spy);

      buttonsIn('.sd-footer')
        .find((b) => b.textContent?.includes('New Strain'))!
        .click();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('emits get-recommendation from the secondary action', async () => {
      const spy = vi.fn();
      element.addEventListener('get-recommendation', spy);

      buttonsIn('.sd-footer')
        .find((b) => b.textContent?.includes('Get Recommendation'))!
        .click();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it.each(MANAGED_ACTIONS)('emits %s as %s from the Manage menu', async (label, event) => {
      const spy = vi.fn();
      element.addEventListener(event, spy);

      const items = await openManageMenu();
      items.find((i) => i.textContent?.includes(label))!.click();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('closes the menu once an action is chosen', async () => {
      const items = await openManageMenu();
      items[0].click();
      await element.updateComplete;

      expect(root.querySelector('.manage-menu')).toBeNull();
    });
  });

  describe('Manage menu semantics', () => {
    it('names the trigger and reports its collapsed state', () => {
      const trigger = query<HTMLElement>('.manage-menu-trigger');
      expect(trigger.textContent?.trim()).toBe('Manage');
      expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      // aria-controls must not point at a menu that is not rendered yet.
      expect(trigger.hasAttribute('aria-controls')).toBe(false);
    });

    it('reports the expanded state and points at the open menu', async () => {
      await openManageMenu();

      const trigger = query<HTMLElement>('.manage-menu-trigger');
      const menu = query<HTMLElement>('.manage-menu');
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(trigger.getAttribute('aria-controls')).toBe(menu.id);
      expect(menu.getAttribute('role')).toBe('menu');
      expect(menu.getAttribute('aria-label')).toBe('Manage library');
    });

    it('gives every entry menu-item semantics on a native button', async () => {
      const items = await openManageMenu();
      expect(items.every((i) => i.tagName === 'BUTTON')).toBe(true);
      expect(items.every((i) => i.getAttribute('role') === 'menuitem')).toBe(true);
    });

    it('moves focus into the menu on open', async () => {
      const items = await openManageMenu();
      expect(root.activeElement).toBe(items[0]);
    });

    it('dismisses on Escape and returns focus to the trigger', async () => {
      const items = await openManageMenu();
      items[0].dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true })
      );
      await element.updateComplete;

      expect(root.querySelector('.manage-menu')).toBeNull();
      expect(root.activeElement).toBe(query('.manage-menu-trigger'));
    });

    it('returns focus to the trigger when the menu is toggled shut', async () => {
      await openManageMenu();
      query<HTMLButtonElement>('.manage-menu-trigger').click();
      await element.updateComplete;

      expect(root.querySelector('.manage-menu')).toBeNull();
      expect(root.activeElement).toBe(query('.manage-menu-trigger'));
    });

    it('does not grab focus back into the menu on an unrelated re-render', async () => {
      const items = await openManageMenu();
      items[2].focus();

      element.requestUpdate();
      await element.updateComplete;

      expect(root.activeElement).toBe(root.querySelectorAll('.manage-menu-item')[2]);
    });
  });
});
