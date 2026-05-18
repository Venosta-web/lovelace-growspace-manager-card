import { haTest as test, expect, callHAService } from '../fixtures/ha-setup';
import { GrowspaceCard } from '../pages/GrowspaceCard';
import { IrrigationDialog } from '../pages/Dialogs';

const SENTINEL_TIME = '02:47';
const SENTINEL_DURATION = 45;

test.describe('Irrigation dialog', () => {
  let growspaceCard: GrowspaceCard;

  test.beforeEach(async ({ page, testContext }) => {
    growspaceCard = new GrowspaceCard(page);
    await growspaceCard.navigate(testContext.dashboardPath);
    await growspaceCard.waitForCardReady();
    await callHAService(page, 'growspace_manager', 'remove_irrigation_time', {
      growspace_id: testContext.growspaceId,
      time: SENTINEL_TIME,
    }).catch(() => {});
  });

  test.afterEach(async ({ page, testContext }) => {
    await callHAService(page, 'growspace_manager', 'remove_irrigation_time', {
      growspace_id: testContext.growspaceId,
      time: SENTINEL_TIME,
    }).catch(() => {});
  });

  test('adds and removes an irrigation time (round-trip)', async ({ page }) => {
    await growspaceCard.clickMenuItem(/irrigation/i);
    const dialog = new IrrigationDialog(page);
    await dialog.waitForOpen();

    await dialog.addIrrigationTime(SENTINEL_TIME, SENTINEL_DURATION);
    await expect(dialog.hasIrrigationTime(SENTINEL_TIME)).toBeVisible();

    await dialog.removeIrrigationTime(SENTINEL_TIME);
    await expect(dialog.hasIrrigationTime(SENTINEL_TIME)).not.toBeVisible();
  });
});
