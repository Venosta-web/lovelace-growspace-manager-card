import { haTest as test, expect, callHAService } from '../fixtures/ha-setup';
import { GrowspaceCard } from '../pages/GrowspaceCard';
import { IrrigationDialog } from '../pages/Dialogs';

test.describe('VWC strategy — Schedules tab conditional display', () => {
  let growspaceCard: GrowspaceCard;

  test.beforeEach(async ({ page, testContext }) => {
    test.setTimeout(120000);
    growspaceCard = new GrowspaceCard(page);
    await growspaceCard.navigate(testContext.vwcVegDashboardPath);
    await growspaceCard.waitForCardReady();
    await page.reload();
    await growspaceCard.waitForCardReady();

    await callHAService(page, 'growspace_manager', 'set_irrigation_strategy', {
      growspace_id: testContext.vwcVegGrowspaceId,
      enabled: false,
    });
  });

  test('shows steering nudge when VWC disabled, shows schedule card after enabling', async ({ page, testContext }) => {
    await growspaceCard.clickMenuItem(/irrigation/i);
    const dialog = new IrrigationDialog(page);
    await dialog.waitForOpen();

    await dialog.clickTab('schedules');
    await expect(dialog.schedulesTabHasSteeringNudge()).toBeVisible();
    await expect(dialog.schedulesTabHasSteeringSchedule()).not.toBeVisible();

    await dialog.clickTab('steering');
    const isEnabled = await dialog.isVwcEnabled();
    if (!isEnabled) {
      await dialog.toggleVwcSwitch();
    }
    await dialog.saveAll();

    await dialog.close();
    await growspaceCard.waitForCardReady();
    await growspaceCard.clickMenuItem(/irrigation/i);
    await dialog.waitForOpen();

    await dialog.clickTab('schedules');
    await expect(dialog.schedulesTabHasSteeringSchedule()).toBeVisible();
    await expect(dialog.schedulesTabHasSteeringNudge()).not.toBeVisible();
  });
});
