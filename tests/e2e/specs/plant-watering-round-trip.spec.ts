import { haTest as test, expect, callHAService } from '../fixtures/ha-setup';
import { GrowspaceCard } from '../pages/GrowspaceCard';
import { PlantOverviewDialog, WateringDialog } from '../pages/Dialogs';

test.describe('Plant watering round-trip', () => {
  let growspaceCard: GrowspaceCard;

  test.beforeEach(async ({ page, testContext }) => {
    growspaceCard = new GrowspaceCard(page);
    await growspaceCard.navigate(testContext.vegDashboardPath);
    await growspaceCard.waitForCardReady();
    // Auth redirect causes deferred re-render on first load → reload after auth settles
    await page.reload();
    await growspaceCard.waitForCardReady();

    // Reset plant state so the "Recently watered" icon is absent at test start
    await callHAService(page, 'growspace_manager', 'reset_plant_last_watered', {
      plant_id: testContext.vegPlantId,
    }).catch(() => {});
  });

  test.afterEach(async ({ page, testContext }) => {
    await callHAService(page, 'growspace_manager', 'reset_plant_last_watered', {
      plant_id: testContext.vegPlantId,
    }).catch(() => {});
  });

  test('clicking a plant cell opens the Plant Overview dialog', async ({ page }) => {
    test.setTimeout(45000);

    await growspaceCard.plantCardAt(1, 1).click();
    const overview = new PlantOverviewDialog(page);
    await overview.waitForOpen();
    await overview.close();
  });

  test('water quickbar button opens the Watering dialog', async ({ page }) => {
    test.setTimeout(45000);

    await growspaceCard.plantCardAt(1, 1).click();
    const overview = new PlantOverviewDialog(page);
    await overview.waitForOpen();

    await overview.clickWaterButton();
    const watering = new WateringDialog(page);
    await watering.waitForOpen();
  });

  test('watering a plant shows the Recently watered icon (round-trip)', async ({ page }) => {
    test.setTimeout(45000);

    // Verify the icon is absent before watering
    const wateredIcon = growspaceCard
      .plantCardAt(1, 1)
      .locator('[aria-label="Recently watered"]');
    await expect(wateredIcon).not.toBeVisible();

    // Open plant → water → submit
    await growspaceCard.plantCardAt(1, 1).click();
    const overview = new PlantOverviewDialog(page);
    await overview.waitForOpen();

    await overview.clickWaterButton();
    const watering = new WateringDialog(page);
    await watering.waitForOpen();
    await watering.fillAmount(500);
    await watering.submit();

    // Wait for HA to push the updated state and the card to re-render
    await expect(wateredIcon).toBeVisible({ timeout: 20000 });
  });
});
