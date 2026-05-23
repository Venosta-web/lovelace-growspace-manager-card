import { Page } from '@playwright/test';
import { haTest as test, expect, callHAService } from '../fixtures/ha-setup';
import { GrowspaceCard } from '../pages/GrowspaceCard';
import { AddPlantDialog } from '../pages/Dialogs';

const TEST_STRAIN = 'E2E Anchor';
const TODAY = new Date().toISOString().split('T')[0];

/**
 * Remove every plant in `growspaceId` except the anchor at row 1, col 1.
 * Called in beforeEach so each test starts with exactly one anchor plant and
 * three free slots.
 */
async function cleanupNonAnchorPlants(page: Page, growspaceId: string): Promise<void> {
  const plantIds: string[] = await page.evaluate((gId) => {
    const states = (window as any).hass?.states ?? {};
    return Object.values(states)
      .filter((s: any) =>
        s.attributes.plant_id &&
        s.attributes.growspace_id === gId &&
        !(s.attributes.row === 1 && s.attributes.col === 1)
      )
      .map((s: any) => s.attributes.plant_id as string);
  }, growspaceId);

  for (const plantId of plantIds) {
    await callHAService(page, 'growspace_manager', 'remove_plant', { plant_id: plantId }).catch(() => {});
  }

  if (plantIds.length > 0) {
    // Allow the coordinator to refresh before the test interacts with the card
    await page.waitForTimeout(1000);
    await page.reload({ waitUntil: 'domcontentloaded' });
  }
}

test.describe('Add Plant Dialog', () => {
  let growspaceCard: GrowspaceCard;

  test.beforeEach(async ({ page, testContext }) => {
    if (!testContext.vegGrowspaceId || !testContext.vegDashboardPath) {
      throw new Error(
        'TEST_VEG_GROWSPACE_ID and TEST_VEG_DASHBOARD_PATH must be set in .env.test. ' +
        'Run fixtures/e2e-setup.ts to create the e2e growspaces.'
      );
    }

    growspaceCard = new GrowspaceCard(page);
    await growspaceCard.navigate(testContext.vegDashboardPath);
    await growspaceCard.waitForCardReady();
    await cleanupNonAnchorPlants(page, testContext.vegGrowspaceId);
    await growspaceCard.waitForCardReady();
  });

  // ── Helper: open the dialog by clicking the free slot at row 1, col 2 ────────
  async function openDialog(page: Page): Promise<AddPlantDialog> {
    await growspaceCard.emptyCell(1, 2).click();
    const dialog = new AddPlantDialog(page);
    await dialog.waitForOpen();
    return dialog;
  }

  // ── 1. Happy path — seed source ───────────────────────────────────────────────
  test('adds a plant via seed source (full wizard + persistence)', async ({ page }) => {
    const dialog = await openDialog(page);

    // Step 1 — Identity
    await dialog.typeStrain(TEST_STRAIN);
    await dialog.selectStrainFromDropdown(TEST_STRAIN);
    await dialog.clickContinue();

    // Step 2 — Source: leave on Seed (default), row/col pre-filled
    await dialog.clickContinue();

    // Step 3 — Schedule
    await dialog.fillDate('Seedling Start', TODAY);
    await dialog.clickAddPlant();

    await dialog.waitForClosed();

    // Anchor + new plant = 2 cards with TEST_STRAIN
    const plantCards = growspaceCard.card.locator('plant-card-container').filter({ hasText: TEST_STRAIN });
    await expect(plantCards).toHaveCount(2, { timeout: 8000 });

    // Reload — verify the backend persisted the plant
    await page.reload({ waitUntil: 'domcontentloaded' });
    await growspaceCard.waitForCardReady();
    await expect(
      growspaceCard.card.locator('plant-card-container').filter({ hasText: TEST_STRAIN })
    ).toHaveCount(2);
  });

  // ── 2. Validation guard — Continue disabled until strain is selected ──────────
  test('Continue is disabled until a strain is selected from the dropdown', async ({ page }) => {
    const dialog = await openDialog(page);

    // No input yet — Continue should be disabled
    expect(await dialog.isContinueDisabled()).toBe(true);

    // Typing without selecting keeps Continue disabled
    await dialog.typeStrain('E2E');
    expect(await dialog.isContinueDisabled()).toBe(true);

    // Selecting from dropdown enables Continue
    await dialog.selectStrainFromDropdown(TEST_STRAIN);
    expect(await dialog.isContinueDisabled()).toBe(false);
  });

  // ── 3. Cancel — dialog closes, no plant added ─────────────────────────────────
  test('Cancel on step 1 closes the dialog without adding a plant', async ({ page }) => {
    const allCards = growspaceCard.card.locator('plant-card-container');
    const plantCountBefore = await allCards.count();

    const dialog = await openDialog(page);
    await dialog.typeStrain(TEST_STRAIN);
    await dialog.selectStrainFromDropdown(TEST_STRAIN);
    await dialog.clickCancel();

    await dialog.waitForClosed();

    // Plant count must be unchanged
    await expect(allCards).toHaveCount(plantCountBefore);
  });

  // ── 4. Happy path — clone source (anchor plant is in veg stage, i.e. clonable) ─
  test('adds a plant via clone source (full wizard + persistence)', async ({ page }) => {
    const dialog = await openDialog(page);

    // Step 1 — Identity
    await dialog.typeStrain(TEST_STRAIN);
    await dialog.selectStrainFromDropdown(TEST_STRAIN);
    await dialog.clickContinue();

    // Step 2 — Switch to Clone, select the veg anchor as the sibling mother
    await dialog.selectCloneSource();
    await dialog.selectSiblingPlant(TEST_STRAIN);
    // clone_start is pre-filled to today by the sibling selection handler
    await dialog.clickContinue();

    // Step 3 — Schedule: clone_start already set, no extra date required
    await dialog.clickAddPlant();

    await dialog.waitForClosed();

    // Anchor + new plant = 2 cards with TEST_STRAIN
    await expect(
      growspaceCard.card.locator('plant-card-container').filter({ hasText: TEST_STRAIN })
    ).toHaveCount(2, { timeout: 8000 });

    // Reload — verify persistence
    await page.reload({ waitUntil: 'domcontentloaded' });
    await growspaceCard.waitForCardReady();
    await expect(
      growspaceCard.card.locator('plant-card-container').filter({ hasText: TEST_STRAIN })
    ).toHaveCount(2);
  });
});
