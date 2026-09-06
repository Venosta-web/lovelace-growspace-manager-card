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
    await growspaceCard.clickMenuAction('irrigation');
    const dialog = new IrrigationDialog(page);
    await dialog.waitForOpen();
  });

  test('nutrients dialog opens from menu', async ({ page }) => {
    await growspaceCard.clickMenuAction('nutrients');
    const dialog = new NutrientDialog(page);
    await dialog.waitForOpen();
  });

  test('strain library dialog opens from menu', async ({ page }) => {
    await growspaceCard.clickMenuAction('strains');
    const dialog = new StrainLibraryDialog(page);
    await dialog.waitForOpen();
  });
});

test.describe('Config dialog empty entity fields', () => {
  test('empty humidity device fields still render entity pickers', async ({
    page,
    testContext,
  }) => {
    const growspaceCard = new GrowspaceCard(page);
    await growspaceCard.navigate(testContext.dashboardPath);
    await growspaceCard.waitForCardReady();

    await growspaceCard.card.locator('[aria-label="Settings"]').click();
    const dialog = new ConfigDialog(page);
    await dialog.waitForOpen();
    await dialog.clickTab('humidity');

    const deviceFields = dialog.dialog.locator('config-humidity-tab config-entity-multi-select');
    await expect(deviceFields).toHaveCount(2);

    // Arrange the empty state here rather than pointing at a growspace that
    // happens to have none. The E2E entity coverage contract gives every
    // growspace it declares a humidifier and a dehumidifier — a simulated pair
    // on most profiles, faithful hardware on the plain-climate and AC Infinity
    // ones — so no fixture starts out empty, and one that did would only stay
    // empty until the contract grew another device (workspace#160).
    //
    // Removing the chips is a draft edit: the field emits
    // `entity-values-changed`, the Humidity tab forwards it as
    // `env-draft-changed`, and the Config Dialog merges it into its own state
    // machine. Nothing reaches the backend unless Save is pressed, and this
    // test never presses it — so the growspace is left exactly as the contract
    // configured it and no other spec inherits anything from this one.
    for (const field of await deviceFields.all()) {
      const chipRemovals = field.locator('button.chip-remove');
      for (let remaining = await chipRemovals.count(); remaining > 0; remaining--) {
        await chipRemovals.first().click();
      }
      await expect(chipRemovals).toHaveCount(0);
    }

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
    await expect(devicePickers.nth(1).getByText('Select an entity', { exact: true })).toBeVisible();
  });
});
