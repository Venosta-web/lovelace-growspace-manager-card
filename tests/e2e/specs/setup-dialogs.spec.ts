import { expect, haTest as test } from '../fixtures/ha-setup';
import { GrowspaceCard } from '../pages/GrowspaceCard';
import {
  ConfigDialog,
  IrrigationDialog,
  NutrientDialog,
  StrainLibraryDialog,
} from '../pages/Dialogs';

test.describe('Setup dialogs', () => {
  let growspaceCard: GrowspaceCard;

  test.beforeEach(async ({ page, testContext }) => {
    growspaceCard = new GrowspaceCard(page);
    await growspaceCard.navigate(testContext.dashboardPath);
    await growspaceCard.waitForCardReady();
  });

  test('config dialog opens from Settings icon button', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));

    // Settings is a standalone icon button in the header, not a menu item
    await growspaceCard.card.locator('[aria-label="Settings"]').click();
    const dialog = new ConfigDialog(page);
    await dialog.waitForOpen();

    const nativePickers = dialog.dialog.locator('ha-entity-picker');
    await expect(nativePickers).toHaveCount(2);
    await expect(
      nativePickers.first().getByText('Select an entity', { exact: true })
    ).toBeVisible();
    await expect(nativePickers.nth(1).getByText('Select an entity', { exact: true })).toBeVisible();
    expect(pageErrors.filter((error) => error.message.includes("reading 'localize'"))).toEqual([]);
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

test.describe('Config dialog empty entity fields', () => {
  test('empty humidity device fields still render entity pickers', async ({
    page,
    testContext,
  }) => {
    test.skip(
      !testContext.vwcFlowerDashboardPath,
      'TEST_VWC_FLOWER_DASHBOARD_PATH is required'
    );
    const growspaceCard = new GrowspaceCard(page);
    await growspaceCard.navigate(testContext.vwcFlowerDashboardPath);
    await growspaceCard.waitForCardReady();

    await growspaceCard.card.locator('[aria-label="Settings"]').click();
    const dialog = new ConfigDialog(page);
    await dialog.waitForOpen();
    await dialog.clickTab('humidity');

    const deviceFields = dialog.dialog.locator(
      'config-humidity-tab config-entity-multi-select'
    );
    await expect
      .poll(() =>
        deviceFields.evaluateAll((fields) =>
          fields.map((field) => (field as HTMLElement & { values: string[] }).values)
        )
      )
      .toEqual([[], []]);

    const devicePickers = deviceFields.locator('ha-entity-picker');
    await expect(devicePickers).toHaveCount(2);
    await expect(
      devicePickers.first().getByText('Select an entity', { exact: true })
    ).toBeVisible();
    await expect(
      devicePickers.nth(1).getByText('Select an entity', { exact: true })
    ).toBeVisible();
  });
});
