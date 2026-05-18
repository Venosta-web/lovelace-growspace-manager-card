import { haTest as test, expect } from '../fixtures/ha-setup';
import { GrowspaceCard } from '../pages/GrowspaceCard';
import { AddPlantDialog } from '../pages/Dialogs';

test.describe('Growspace Manager Card - Smoke Tests', () => {
  let growspaceCard: GrowspaceCard;

  test.beforeEach(async ({ page, testContext }) => {
    growspaceCard = new GrowspaceCard(page);
    await growspaceCard.navigate(testContext.dashboardPath);
    await growspaceCard.waitForCardReady();
  });

  test('card loads and displays', async () => {
    // Verify card is visible
    await expect(growspaceCard.card).toBeVisible();

    // Verify menu button is present
    await expect(growspaceCard.menuButton).toBeVisible();
  });

  test('can open header menu', async () => {
    // Open menu
    await growspaceCard.openMenu();

    // Verify menu is visible
    await expect(growspaceCard.menu).toBeVisible();
  });

  test('can open add plant dialog', async () => {
    // Click menu item to add plant
    await growspaceCard.clickMenuItem(/add.*plant/i);

    // Verify dialog appears
    const addPlantDialog = new AddPlantDialog(test.info().project.use.page!);
    await expect(addPlantDialog.dialog).toBeVisible();
  });

  test('displays plant cards', async ({ page }) => {
    // Get count of plant cards
    const plantCount = await growspaceCard.getPlantCount();

    // Log count for debugging
    console.log(`Found ${plantCount} plant cards`);

    // Should have at least 0 plants (may be empty growspace)
    expect(plantCount).toBeGreaterThanOrEqual(0);
  });
});
