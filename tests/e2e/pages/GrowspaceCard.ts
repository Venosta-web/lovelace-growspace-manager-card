import type { Page, Locator } from '@playwright/test';
import { PlantData, Position } from './types';

/**
 * The `data-action` of every entry in the card's header menu, as rendered by
 * `growspace-header-actions-ui`. Keeping the union here means a renamed or
 * removed action fails to typecheck at the call site instead of timing out.
 */
export type MenuAction =
  | 'select_plants'
  | 'add_plant'
  | 'water'
  | 'ipm'
  | 'training'
  | 'arrange'
  | 'config'
  | 'irrigation'
  | 'irrigation-recipes'
  | 'irrigation-programs'
  | 'nutrients'
  | 'strains'
  // Rendered only when Growspace Manager TC answered the presence probe,
  // which the managed E2E runtime cannot install — the union claims to be
  // exhaustive, so it lists this anyway.
  | 'tc'
  | 'compare'
  | 'heatmap'
  | 'logbook'
  | 'snapshots'
  | 'ai';

export class GrowspaceCard {
  readonly page: Page;
  readonly card: Locator;
  readonly menuButton: Locator;
  readonly menu: Locator;

  constructor(page: Page) {
    this.page = page;
    // Main card element - use first() to prevent strict mode violation with multiple cards
    this.card = page.locator('growspace-manager-card').first();
    // Header menu button (scoped within this.card)
    this.menuButton = this.card.locator('button#menu-trigger');
    // Menu dropdown (scoped within this.card)
    this.menu = this.card.locator('#header-menu');
  }

  /**
   * Navigate to the dashboard with the Growspace Manager card
   */
  async navigate(dashboardPath: string) {
    await this.page.goto(dashboardPath);
    try {
      await this.card.waitFor({ state: 'visible', timeout: 10000 });
    } catch (error) {
      throw new Error(
        `No Growspace Manager card found at dashboard "${dashboardPath}". ` +
          'The dashboard may not exist or may not contain the card.',
        { cause: error }
      );
    }
    await this.page.waitForLoadState('networkidle');
    // Give card time to initialize
    await this.page.waitForTimeout(1000);
  }

  /**
   * Open the header menu
   */
  async openMenu() {
    await this.menuButton.click();
    await this.menu.waitFor({ state: 'visible', timeout: 6000 });
  }

  /**
   * Click a menu item by its `data-action`.
   *
   * Prefer this over `clickMenuItem`. Menu labels are prose and the menu keeps
   * growing: adding "Irrigation Recipes" and "Irrigation Programs" beside
   * "Irrigation" made a `/irrigation/i` label match resolve to three elements
   * and every spec that used it died on a strict-mode violation before the
   * dialog opened. `data-action` is the stable identity the component already
   * renders, so a new entry cannot silently capture an existing call site.
   */
  async clickMenuAction(action: MenuAction) {
    await this.openMenu();
    const menuItem = this.menu.locator(`.menu-item[data-action="${action}"]`);
    // dispatchEvent bypasses all Playwright viewport and visibility guards,
    // needed for menu items that overflow the dropdown container off-screen.
    await menuItem.dispatchEvent('click');
  }

  /**
   * Click a menu item by text.
   *
   * Only for labels that are themselves the assertion (a menu entry that
   * changes wording with selection state). Anything else should use
   * `clickMenuAction` — see the note there. Pass an anchored regex when the
   * label is a prefix of another entry's.
   */
  async clickMenuItem(itemText: string | RegExp) {
    await this.openMenu();
    const menuItem = this.menu.locator('.menu-item', { hasText: itemText });
    // dispatchEvent bypasses all Playwright viewport and visibility guards,
    // needed for menu items that overflow the dropdown container off-screen.
    await menuItem.dispatchEvent('click');
  }

  /**
   * Get all plant card containers
   */
  allPlantCards(): Locator {
    return this.card.locator('plant-card-container');
  }

  /**
   * Get plant card at specific position
   */
  plantCardAt(row: number, col: number): Locator {
    // Plant cards don't have data attributes, need to find by position
    // This is tricky - we may need to use nth() based on grid layout
    return this.allPlantCards().nth((row - 1) * 3 + (col - 1)); // Assumes 3 columns
  }

  /**
   * Get empty cell at specific position
   */
  emptyCell(row: number, col: number): Locator {
    return this.card.locator(`.plant-card-empty[data-row="${row}"][data-col="${col}"]`);
  }

  /**
   * Wait for card to be ready
   */
  async waitForCardReady() {
    await this.card.waitFor({ state: 'visible' });
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if card is in compact mode
   */
  async isCompactMode(): Promise<boolean> {
    const grid = this.card.locator('.grid.compact');
    return await grid.isVisible();
  }

  /**
   * Get count of plant cards
   */
  async getPlantCount(): Promise<number> {
    return await this.allPlantCards().count();
  }
}
