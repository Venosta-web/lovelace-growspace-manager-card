import { haTest as test } from '../fixtures/ha-setup';
import { GrowspaceCard } from '../pages/GrowspaceCard';
import { ConfigDialog, IrrigationDialog, NutrientDialog, StrainLibraryDialog } from '../pages/Dialogs';

test.describe('Setup dialogs', () => {
  let growspaceCard: GrowspaceCard;

  test.beforeEach(async ({ page, testContext }) => {
    growspaceCard = new GrowspaceCard(page);
    await growspaceCard.navigate(testContext.dashboardPath);
    await growspaceCard.waitForCardReady();
  });

  test('config dialog opens from Settings icon button', async ({ page }) => {
    // Settings is a standalone icon button in the header, not a menu item
    await page.locator('[aria-label="Settings"]').click();
    const dialog = new ConfigDialog(page);
    await dialog.waitForOpen();
  });

  test('irrigation dialog opens from menu', async ({ page }) => {
    await growspaceCard.clickMenuItem(/irrigation/i);
    const dialog = new IrrigationDialog(page);
    await dialog.waitForOpen();
  });

  test('nutrients dialog opens from menu', async ({ page }) => {
    await growspaceCard.clickMenuItem(/nutrients/i);
    const dialog = new NutrientDialog(page);
    await dialog.waitForOpen();
  });

  test('strain library dialog opens from menu', async ({ page }) => {
    await growspaceCard.clickMenuItem(/strains/i);
    const dialog = new StrainLibraryDialog(page);
    await dialog.waitForOpen();
  });
});
