import { Page, Locator, expect } from '@playwright/test';
import { PlantData, Position } from './types';

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
    await this.card.waitFor({ state: 'visible', timeout: 10000 });
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
   * Click a menu item by text
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
