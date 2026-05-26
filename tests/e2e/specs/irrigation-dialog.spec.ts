import { haTest as test, expect, callHAService } from '../fixtures/ha-setup';
import { GrowspaceCard } from '../pages/GrowspaceCard';
import { IrrigationDialog } from '../pages/Dialogs';

const SENTINEL_TIME = '02:47';
const SENTINEL_DURATION = 45;

test.describe('Irrigation dialog', () => {
  let growspaceCard: GrowspaceCard;

  test.beforeEach(async ({ page, testContext }) => {
    growspaceCard = new GrowspaceCard(page);
    await growspaceCard.navigate(testContext.vegDashboardPath);
    await growspaceCard.waitForCardReady();
    // The first navigate may go through HA's OAuth redirect, which causes Lovelace to
    // fire a deferred re-render after auth completes, remounting all cards. Reloading
    // here hits the page post-auth (token now in localStorage) so the card loads clean.
    await page.reload();
    await growspaceCard.waitForCardReady();
    await callHAService(page, 'growspace_manager', 'remove_irrigation_time', {
      growspace_id: testContext.vegGrowspaceId,
      time: SENTINEL_TIME,
    }).catch(() => {});
  });

  test.afterEach(async ({ page, testContext }) => {
    await callHAService(page, 'growspace_manager', 'remove_irrigation_time', {
      growspace_id: testContext.vegGrowspaceId,
      time: SENTINEL_TIME,
    }).catch(() => {});
  });

  test('adds and removes an irrigation time (round-trip)', async ({ page }) => {
    test.setTimeout(45000);

    await growspaceCard.clickMenuItem(/irrigation/i);
    const dialog = new IrrigationDialog(page);
    await dialog.waitForOpen();

    await dialog.addIrrigationTime(SENTINEL_TIME, SENTINEL_DURATION);

    // Close and re-open the dialog to confirm the time persisted through a round-trip.
    // Closing explicitly avoids depending on whether a card remount (due to HA state push)
    // closed the dialog for us.
    await dialog.close();
    await growspaceCard.waitForCardReady();
    await growspaceCard.clickMenuItem(/irrigation/i);
    await dialog.waitForOpen();

    await expect(dialog.hasIrrigationTime(SENTINEL_TIME)).toBeVisible();

    await dialog.removeIrrigationTime(SENTINEL_TIME);
    await expect(dialog.hasIrrigationTime(SENTINEL_TIME)).not.toBeVisible();
  });
});
