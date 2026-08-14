import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StrainLibraryDialog } from '../../../src/dialogs/strain-library-dialog';
import { StrainEntry } from '../../../src/types';

vi.mock('../../../src/utils/plant-utils', () => ({
  PlantUtils: {
    compressImage: vi.fn().mockResolvedValue('base64string'),
    encodeLocalPath: vi.fn().mockImplementation((p: string) => p),
  },
}));

const STRAIN_NAME = 'Blue Dream';

const mockStrains: StrainEntry[] = [
  {
    key: '1',
    strain: STRAIN_NAME,
    phenotype: 'Original',
    type: 'Sativa',
    breeder: 'HSO',
    flowering_days_min: 60,
    flowering_days_max: 70,
    image: 'img1.jpg',
  },
  {
    key: '2',
    strain: 'OG Kush',
    phenotype: '#18',
    type: 'Indica',
    breeder: 'Dinafem',
    flowering_days_min: 50,
    flowering_days_max: 60,
  },
];

/** Presses a key on an element the way a keyboard user would reach it. */
function press(el: Element, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }));
}

describe('Strain Library accessibility', () => {
  let element: StrainLibraryDialog;
  let browseRoot: ShadowRoot;

  beforeEach(async () => {
    element = new StrainLibraryDialog();
    element.strains = [...mockStrains];
    element.open = true;
    document.body.appendChild(element);
    await element.updateComplete;

    const browseView = element.shadowRoot?.querySelector('strain-browse-view');
    await (browseView as unknown as { updateComplete: Promise<unknown> })?.updateComplete;
    browseRoot = browseView!.shadowRoot!;
  });

  afterEach(() => {
    if (element.isConnected) document.body.removeChild(element);
    vi.clearAllMocks();
  });

  describe('workspace switch (AC 2)', () => {
    it('exposes tab-list, tab and selected-state semantics', async () => {
      const tablist = element.shadowRoot?.querySelector('.main-tab-bar');
      expect(tablist?.getAttribute('role')).toBe('tablist');
      expect(tablist?.getAttribute('aria-label')).toBeTruthy();

      const tabs = Array.from(element.shadowRoot?.querySelectorAll('.tab-btn') ?? []);
      expect(tabs).toHaveLength(3);
      expect(tabs.every((t) => t.getAttribute('role') === 'tab')).toBe(true);
      expect(tabs.every((t) => t.tagName)).toBeTruthy();

      const selected = tabs.filter((t) => t.getAttribute('aria-selected') === 'true');
      expect(selected).toHaveLength(1);
      expect(selected[0].textContent?.trim()).toBe('Strains');
    });

    it('associates the selected tab with the rendered panel, and only that tab', async () => {
      const panel = element.shadowRoot?.querySelector('[role="tabpanel"]');
      expect(panel).toBeTruthy();

      const tabs = Array.from(element.shadowRoot?.querySelectorAll('.tab-btn') ?? []);
      const selected = tabs.find((t) => t.getAttribute('aria-selected') === 'true')!;
      const unselected = tabs.filter((t) => t.getAttribute('aria-selected') === 'false');

      expect(selected.getAttribute('aria-controls')).toBe(panel!.id);
      expect(panel!.getAttribute('aria-labelledby')).toBe(selected.id);
      // Panels render conditionally — inactive tabs must not dangle.
      expect(unselected.every((t) => !t.hasAttribute('aria-controls'))).toBe(true);
    });

    it('moves the selected state when another tab is activated', async () => {
      const tabs = Array.from(
        element.shadowRoot?.querySelectorAll('.tab-btn') ?? []
      ) as HTMLElement[];
      const treeTab = tabs.find((t) => t.textContent?.includes('Tree View'))!;
      treeTab.click();
      await element.updateComplete;

      expect(treeTab.getAttribute('aria-selected')).toBe('true');
      expect(element.shadowRoot?.querySelectorAll('.tab-btn[aria-selected="true"]')).toHaveLength(
        1
      );
    });

    it('names the maximize control and exposes its pressed state', async () => {
      const tabs = Array.from(
        element.shadowRoot?.querySelectorAll('.tab-btn') ?? []
      ) as HTMLElement[];
      tabs.find((t) => t.textContent?.includes('Tree View'))!.click();
      await element.updateComplete;

      const maximize = element.shadowRoot?.querySelector('.tab-maximize-btn');
      expect(maximize?.getAttribute('aria-label')).toBe('Maximize tree view');
      expect(maximize?.getAttribute('aria-pressed')).toBe('false');

      (maximize as HTMLElement).click();
      await element.updateComplete;

      const after = element.shadowRoot?.querySelector('.tab-maximize-btn');
      expect(after?.getAttribute('aria-pressed')).toBe('true');
      expect(after?.getAttribute('aria-label')).toBe('Restore tree view');
    });
  });

  describe('strain cards (AC 1, 4)', () => {
    it('activates a strain through a native button rather than a click-only div', async () => {
      const openBtn = browseRoot.querySelector('.strain-card .sc-open-btn');
      expect(openBtn?.tagName).toBe('BUTTON');
      expect(openBtn?.textContent).toContain(STRAIN_NAME);
    });

    it('keeps the card container non-interactive so targets do not nest', async () => {
      const card = browseRoot.querySelector('.strain-card')!;
      // Exactly two activation targets per card: open and delete.
      const controls = card.querySelectorAll('button');
      expect(controls).toHaveLength(2);
      expect(Array.from(controls).some((c) => c.closest('button') !== c)).toBe(false);
    });

    it('gives the hover-revealed delete action a specific accessible name', async () => {
      const del = browseRoot.querySelector('.sc-action-btn');
      expect(del?.tagName).toBe('BUTTON');
      expect(del?.getAttribute('aria-label')).toBe(`Delete ${STRAIN_NAME}`);
    });

    it('reveals hover-only actions when a card control takes focus', async () => {
      const openBtn = browseRoot.querySelector('.sc-open-btn') as HTMLElement;
      const actions = browseRoot.querySelector('.sc-actions')!;
      expect(getComputedStyle(actions).opacity).toBe('0');

      openBtn.focus();
      expect(browseRoot.activeElement).toBe(openBtn);

      // opacity is transitioned, so settle before reading the final value.
      await vi.waitFor(() => expect(getComputedStyle(actions).opacity).toBe('1'));
    });

    it('selects the strain on keyboard activation of the title button', async () => {
      const selected = vi.fn();
      browseRoot.host.addEventListener('strain-selected', selected);

      // A native button fires click for both Enter and Space.
      (browseRoot.querySelector('.sc-open-btn') as HTMLElement).click();

      expect(selected).toHaveBeenCalledTimes(1);
      expect(selected.mock.calls[0][0].detail.strain.strain).toBe(STRAIN_NAME);
    });
  });

  describe('icon-only controls (AC 3)', () => {
    it('names every icon-only control in the browse header and footer', async () => {
      const iconOnly = Array.from(browseRoot.querySelectorAll('button')).filter(
        (b) => b.querySelector('svg') && !b.textContent?.trim()
      );
      expect(iconOnly.length).toBeGreaterThan(0);
      for (const btn of iconOnly) {
        expect(btn.getAttribute('aria-label'), btn.className).toBeTruthy();
      }
    });

    it('hides decorative icons from assistive technology', async () => {
      const labelled = browseRoot.querySelector('.fab-btn')!;
      expect(labelled.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('overflow menu (AC 1)', () => {
    it('exposes menu semantics and native buttons for each action', async () => {
      const trigger = browseRoot.querySelector('button[aria-haspopup="menu"]') as HTMLElement;
      expect(trigger.getAttribute('aria-expanded')).toBe('false');

      trigger.click();
      await (browseRoot.host as unknown as { updateComplete: Promise<unknown> }).updateComplete;

      expect(
        browseRoot.querySelector('button[aria-haspopup="menu"]')?.getAttribute('aria-expanded')
      ).toBe('true');

      const menu = browseRoot.querySelector('.mobile-menu')!;
      expect(menu.getAttribute('role')).toBe('menu');

      const items = Array.from(menu.querySelectorAll('.mobile-menu-item'));
      expect(items).toHaveLength(5);
      expect(items.every((i) => i.tagName === 'BUTTON')).toBe(true);
      expect(items.every((i) => i.getAttribute('role') === 'menuitem')).toBe(true);
    });

    it('emits the action when a menu item is activated', async () => {
      const onNew = vi.fn();
      browseRoot.host.addEventListener('new-strain', onNew);

      (browseRoot.querySelector('button[aria-haspopup="menu"]') as HTMLElement).click();
      await (browseRoot.host as unknown as { updateComplete: Promise<unknown> }).updateComplete;

      (browseRoot.querySelector('.mobile-menu-item') as HTMLElement).click();
      expect(onNew).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete confirmation focus behaviour (AC 5)', () => {
    it('marks the prompt as a modal dialog named by its heading', async () => {
      (browseRoot.querySelector('.sc-action-btn') as HTMLElement).click();
      await (browseRoot.host as unknown as { updateComplete: Promise<unknown> }).updateComplete;

      const dialog = browseRoot.querySelector('[role="dialog"]')!;
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      const label = browseRoot.getElementById(dialog.getAttribute('aria-labelledby')!);
      expect(label?.textContent).toContain('Delete Strain?');
    });

    it('moves focus into the prompt and returns it to the trigger on cancel', async () => {
      const trigger = browseRoot.querySelector('.sc-action-btn') as HTMLElement;
      trigger.click();
      await (browseRoot.host as unknown as { updateComplete: Promise<unknown> }).updateComplete;

      const cancel = browseRoot.querySelector('.delete-cancel-btn') as HTMLElement;
      expect(browseRoot.activeElement).toBe(cancel);

      cancel.click();
      await (browseRoot.host as unknown as { updateComplete: Promise<unknown> }).updateComplete;

      expect(browseRoot.querySelector('[role="dialog"]')).toBeNull();
      expect(browseRoot.activeElement).toBe(browseRoot.querySelector('.sc-action-btn'));
    });

    it('dismisses the prompt on Escape without deleting', async () => {
      const onDelete = vi.fn();
      browseRoot.host.addEventListener('strain-delete-confirmed', onDelete);

      (browseRoot.querySelector('.sc-action-btn') as HTMLElement).click();
      await (browseRoot.host as unknown as { updateComplete: Promise<unknown> }).updateComplete;

      press(browseRoot.querySelector('.delete-cancel-btn')!, 'Escape');
      await (browseRoot.host as unknown as { updateComplete: Promise<unknown> }).updateComplete;

      expect(browseRoot.querySelector('[role="dialog"]')).toBeNull();
      expect(onDelete).not.toHaveBeenCalled();
    });
  });
});
