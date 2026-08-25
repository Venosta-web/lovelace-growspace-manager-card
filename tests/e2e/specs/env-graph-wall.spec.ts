import type { Locator, Page } from '@playwright/test';
import { haTest as test, expect } from '../fixtures/ha-setup';
import { GrowspaceCard } from '../pages/GrowspaceCard';

// The questions no jsdom test can answer, and the reason this spec exists:
// whether the overlay actually escapes the card's glass column (which is a
// containing block *and* clips overflow), whether it then covers the whole
// viewport, and how the graphs stack into it — every graph the full width of
// the wall, sharing the height the surface now has.
//
// Everything about *when* the toggle appears, and about the charts surviving
// the move, is covered far more cheaply in tests/components/env-graph-wall.

const WIDE = { width: 1600, height: 1000 };

/** The `.graphs-container`, wherever it currently lives. */
const wall = (page: Page): Locator =>
  page.locator('growspace-manager-card growspace-analytics-ui .graphs-container').first();

const toggle = (page: Page): Locator =>
  page.locator('growspace-manager-card growspace-analytics-ui .fullscreen-toggle').first();

async function openGraphs(page: Page, howMany: number) {
  const heroes = page.locator('growspace-manager-card button.hero-card');
  await expect(heroes.first()).toBeVisible();
  const count = await heroes.count();
  expect(count).toBeGreaterThanOrEqual(howMany);

  for (let i = 0; i < howMany; i++) {
    await heroes.nth(i).click();
    await page.waitForTimeout(400);
  }
  await expect(
    page.locator('growspace-manager-card growspace-analytics-ui growspace-env-chart').first()
  ).toBeVisible();
}

const chartBodies = (page: Page): Locator =>
  page.locator('growspace-manager-card growspace-analytics-ui .gs-env-chart-container');

test.describe('Env Graph Wall', () => {
  test.use({ viewport: WIDE });

  let card: GrowspaceCard;

  test.beforeEach(async ({ page, testContext }) => {
    card = new GrowspaceCard(page);
    await card.navigate(testContext.dashboardPath);
    await card.waitForCardReady();
  });

  test('the overlay escapes the card column it is nested inside', async ({ page }) => {
    await openGraphs(page, 2);
    const glass = page.locator('growspace-manager-card .unified-growspace-card').first();
    const glassBox = (await glass.boundingBox())!;
    expect(glassBox.width).toBeLessThan(WIDE.width * 0.7);

    await toggle(page).click();
    await page.waitForTimeout(700);

    const wallBox = (await wall(page).boundingBox())!;
    // Not merely wider than the column that clips it: the whole viewport, with
    // no scrim margin on any side. --safe-width / --safe-height are 100vw/100vh
    // minus the safe-area insets, which are zero on a desktop browser.
    expect(wallBox.x).toBe(0);
    expect(wallBox.y).toBe(0);
    expect(Math.round(wallBox.width)).toBe(WIDE.width);
    expect(Math.round(wallBox.height)).toBe(WIDE.height);
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

  test('graphs stack full width and grow past the inline height', async ({ page }) => {
    await openGraphs(page, 2);
    const chartBoxBefore = (await chartBodies(page).first().boundingBox())!;
    expect(Math.round(chartBoxBefore.height)).toBe(180);

    await toggle(page).click();
    await page.waitForTimeout(700);

    const first = (await chartBodies(page).nth(0).boundingBox())!;
    const second = (await chartBodies(page).nth(1).boundingBox())!;

    // Each graph spans the wall, and the two stack rather than sharing a row.
    expect(first.width).toBeGreaterThan(WIDE.width - 80);
    expect(second.width).toBeGreaterThan(WIDE.width - 80);
    expect(Math.abs(first.x - second.x)).toBeLessThan(2);
    expect(second.y).toBeGreaterThan(first.y + first.height - 4);

    // Between them they spend the height the full-bleed surface now has,
    // instead of stopping at the inline 180px.
    expect(first.height + second.height).toBeGreaterThan(WIDE.height * 0.6);
  });

  test('a single open graph takes the whole wall', async ({ page }) => {
    await openGraphs(page, 1);
    await toggle(page).click();
    await page.waitForTimeout(700);

    const only = (await chartBodies(page).first().boundingBox())!;
    expect(only.width).toBeGreaterThan(WIDE.width - 80);
    expect(only.height).toBeGreaterThan(WIDE.height * 0.7);
  });

  test('Escape closes the wall', async ({ page }) => {
    await openGraphs(page, 2);
    await toggle(page).click();
    await page.waitForTimeout(700);
    const dialog = page.locator('growspace-manager-card growspace-analytics-ui ha-dialog').first();
    await expect(dialog).toHaveAttribute('open', '');

    // `prevent-scrim-close` is still set, but full bleed leaves no scrim to
    // click, so Escape is the only dismissal there is — and it is handled here
    // rather than by the dialog, which that attribute also silences.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    await expect(dialog).not.toHaveAttribute('open', '');

    // The charts came back to the inline slot rather than disappearing.
    await expect(
      page.locator('growspace-manager-card growspace-analytics-ui growspace-env-chart').first()
    ).toBeVisible();
  });
});
