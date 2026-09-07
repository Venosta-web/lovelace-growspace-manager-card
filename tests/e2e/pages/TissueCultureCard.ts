import type { Locator, Page } from '@playwright/test';

export class TissueCultureCard {
  readonly page: Page;
  readonly card: Locator;

  constructor(page: Page) {
    this.page = page;
    this.card = page.locator('growspace-tc-card');
  }

  async navigate(dashboardPath: string): Promise<void> {
    await this.page.goto(dashboardPath);
    await this.card.waitFor({ state: 'visible', timeout: 15_000 });
    await this.card.locator('growspace-tc-view').waitFor({ state: 'visible', timeout: 15_000 });
  }

  line(name: string): Locator {
    return this.card.locator('growspace-tc-culture-board li.line', { hasText: name });
  }

  async openVessels(name: string): Promise<Locator> {
    const line = this.line(name);
    await line.getByRole('button', { name: /show vessels/i }).click();
    await line.locator('table.cultures').waitFor({ state: 'visible' });
    return line;
  }

  async openGraduation(name: string): Promise<Locator> {
    const line = await this.openVessels(name);
    await line.getByRole('button', { name: /^graduate$/i }).click();
    const dialog = this.card.getByRole('dialog', { name: /graduate/i });
    await dialog.waitFor({ state: 'visible' });
    return dialog;
  }

  async showHistory(name: string): Promise<Locator> {
    const line = await this.openVessels(name);
    await line.getByRole('button', { name: /show this vessel's history/i }).click();
    const dialog = this.card.getByRole('dialog', { name: /show this vessel's history/i });
    await dialog.waitFor({ state: 'visible' });
    return dialog;
  }
}
