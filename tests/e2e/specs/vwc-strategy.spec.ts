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

  test('round-trip: all 7 strategy fields persist after save and reopen', async ({ page, testContext }) => {
    const SENTINEL = {
      targetVwcPercent: 71,
      maintenanceDrybackPercent: 4,
      lightsOnTime: '07:15',
      p0DurationMinutes: 30,
      p2StopBeforeLightsOffMinutes: 45,
      shotDurationSeconds: 20,
      shotIntervalMinutes: 8,
    };

    await growspaceCard.clickMenuItem(/irrigation/i);
    const dialog = new IrrigationDialog(page);
    await dialog.waitForOpen();

    await dialog.clickTab('steering');
    const isEnabled = await dialog.isVwcEnabled();
    if (!isEnabled) {
      await dialog.toggleVwcSwitch();
    }

    await dialog.fillNumberField('Target VWC (%)', SENTINEL.targetVwcPercent);
    await dialog.fillNumberField('Dryback (%)', SENTINEL.maintenanceDrybackPercent);
    await dialog.fillTimeField('Lights On Time', SENTINEL.lightsOnTime);
    await dialog.fillNumberField('P0 Duration (min)', SENTINEL.p0DurationMinutes);
    await dialog.fillNumberField('P2 Stop Buffer (min)', SENTINEL.p2StopBeforeLightsOffMinutes);
    await dialog.fillNumberField('Shot Duration (sec)', SENTINEL.shotDurationSeconds);
    await dialog.fillNumberField('Shot Interval (min)', SENTINEL.shotIntervalMinutes);

    await dialog.saveAll();
    await dialog.close();
    await growspaceCard.waitForCardReady();
    await growspaceCard.clickMenuItem(/irrigation/i);
    await dialog.waitForOpen();
    await dialog.clickTab('steering');

    await expect(dialog.getNumberField('Target VWC (%)')).toHaveValue(String(SENTINEL.targetVwcPercent));
    await expect(dialog.getNumberField('Dryback (%)')).toHaveValue(String(SENTINEL.maintenanceDrybackPercent));
    await expect(dialog.getTimeField('Lights On Time')).toHaveValue(SENTINEL.lightsOnTime);
    await expect(dialog.getNumberField('P0 Duration (min)')).toHaveValue(String(SENTINEL.p0DurationMinutes));
    await expect(dialog.getNumberField('P2 Stop Buffer (min)')).toHaveValue(String(SENTINEL.p2StopBeforeLightsOffMinutes));
    await expect(dialog.getNumberField('Shot Duration (sec)')).toHaveValue(String(SENTINEL.shotDurationSeconds));
    await expect(dialog.getNumberField('Shot Interval (min)')).toHaveValue(String(SENTINEL.shotIntervalMinutes));

    await dialog.clickTab('schedules');
    await expect(dialog.schedulesTabHasSteeringSchedule()).toBeVisible();
    await expect(dialog.schedulesTabHasSteeringNudge()).not.toBeVisible();
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
