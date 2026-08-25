import type { Locator, Page } from '@playwright/test';
import { haTest as test, expect } from '../fixtures/ha-setup';
import { GrowspaceCard } from '../pages/GrowspaceCard';

// Two questions no jsdom test can answer, and the reason this spec exists:
// whether the overlay actually escapes the card's glass column (which is a
// containing block *and* clips overflow), and whether the graphs tile.
//
// Everything about *when* the toggle appears, and about the charts surviving
// the move, is covered far more cheaply in tests/components/env-graph-wall.

const WIDE = { width: 1600, height: 1000 };

/** The `.graphs-container`, wherever it currently lives. */
const wall = (page: Page): Locator =>
  page.locator('growspace-manager-card growspace-analytics-ui .graphs-container').first();

const toggle = (page: Page): Locator =>
  page.locator('growspace-manager-card growspace-analytics-ui .fullscreen-toggle').first();

async function openTwoGraphs(page: Page, card: GrowspaceCard) {
  const heroes = page.locator('growspace-manager-card button.hero-card');
  await expect(heroes.first()).toBeVisible();
  const count = await heroes.count();
  expect(count).toBeGreaterThanOrEqual(2);

  for (let i = 0; i < 2; i++) {
    await heroes.nth(i).click();
    await page.waitForTimeout(400);
  }
  await expect(
    page.locator('growspace-manager-card growspace-analytics-ui growspace-env-chart').first()
  ).toBeVisible();
}

test.describe('Env Graph Wall', () => {
  test.use({ viewport: WIDE });

  let card: GrowspaceCard;

  test.beforeEach(async ({ page, testContext }) => {
    card = new GrowspaceCard(page);
    await card.navigate(testContext.dashboardPath);
    await card.waitForCardReady();
    await openTwoGraphs(page, card);
  });

  test('the overlay escapes the card column it is nested inside', async ({ page }) => {
    const glass = page.locator('growspace-manager-card .unified-growspace-card').first();
    const glassBox = (await glass.boundingBox())!;
    expect(glassBox.width).toBeLessThan(WIDE.width * 0.7);

    await toggle(page).click();
    await page.waitForTimeout(700);

    const wallBox = (await wall(page).boundingBox())!;
    // Wider than the column that clips it, and starting to the left of it.
    expect(wallBox.width).toBeGreaterThan(glassBox.width * 1.5);
    expect(wallBox.x).toBeLessThan(glassBox.x);

    // Nothing from the dashboard is painted over the middle of the overlay.
    const onTop = await page.evaluate(
      ([x, y]) => {
        const stack: string[] = [];
        let hit = document.elementFromPoint(x, y) as Element | null;
        let guard = 0;
        while (hit && guard++ < 20) {
          stack.push(hit.tagName.toLowerCase());
          const sr = (hit as HTMLElement).shadowRoot;
          const next = sr ? (sr.elementFromPoint(x, y) as Element | null) : null;
          if (!next || next === hit) break;
          hit = next;
        }
        return stack;
      },
      [Math.round(wallBox.x + wallBox.width / 2), Math.round(wallBox.y + wallBox.height / 2)]
    );
    expect(onTop).toContain('growspace-analytics-ui');
  });

  test('graphs tile into a responsive grid and grow past the inline height', async ({ page }) => {
    const chartBoxBefore = (await page
      .locator('growspace-manager-card growspace-analytics-ui .gs-env-chart-container')
      .first()
      .boundingBox())!;
    expect(Math.round(chartBoxBefore.height)).toBe(180);

    await toggle(page).click();
    await page.waitForTimeout(700);

    const charts = page.locator(
      'growspace-manager-card growspace-analytics-ui .gs-env-chart-container'
    );
    const first = (await charts.nth(0).boundingBox())!;
    const second = (await charts.nth(1).boundingBox())!;

    // --gs-env-chart-height reached the charts through the move.
    expect(first.height).toBeGreaterThan(180);

    // Two graphs share a row: same top, different left.
    expect(Math.abs(first.y - second.y)).toBeLessThan(4);
    expect(second.x).toBeGreaterThan(first.x + first.width - 4);
  });

  test('Escape closes the wall but a scrim click does not', async ({ page }) => {
    await toggle(page).click();
    await page.waitForTimeout(700);
    const dialog = page.locator('growspace-manager-card growspace-analytics-ui ha-dialog').first();
    await expect(dialog).toHaveAttribute('open', '');

    // The 1600px viewport leaves a thin scrim margin; clicking it must not close.
    await page.mouse.click(4, 4);
    await page.waitForTimeout(500);
    await expect(dialog).toHaveAttribute('open', '');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    await expect(dialog).not.toHaveAttribute('open', '');

    // The charts came back to the inline slot rather than disappearing.
    await expect(
      page.locator('growspace-manager-card growspace-analytics-ui growspace-env-chart').first()
    ).toBeVisible();
  });
});
