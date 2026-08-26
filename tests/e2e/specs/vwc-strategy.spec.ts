import { haTest as test, expect, callHAService } from '../fixtures/ha-setup';
import { GrowspaceCard } from '../pages/GrowspaceCard';
import { ConfigDialog, IrrigationDialog } from '../pages/Dialogs';

test.describe('VWC strategy — Schedules tab conditional display', () => {
  let growspaceCard: GrowspaceCard;

  test.beforeEach(async ({ page, testContext }) => {
    test.setTimeout(120000);
    growspaceCard = new GrowspaceCard(page);
    await growspaceCard.navigate(testContext.vwcVegDashboardPath);
    await growspaceCard.waitForCardReady();

    await callHAService(page, 'growspace_manager', 'set_irrigation_strategy', {
      growspace_id: testContext.vwcVegGrowspaceId,
      enabled: false,
    });
  });

  test('round-trip: all 8 strategy fields persist after save and reopen', async ({ page }) => {
    // Labels/fields as of ADR-0016 (Crop Steering Command Center relabel) and
    // ADR-0017 (per-phase P1/P2 shot params, default Seconds sizing mode).
    // Lights On Time is intentionally excluded here — ADR-0026 moved it to a
    // read-only display on this tab; the editable field now lives on
    // Config → Growlights and is covered by the dedicated test below.
    const SENTINEL = {
      saturationTargetPercent: 71,
      maintenanceDrybackPercent: 4,
      p0DurationMinutes: 30,
      p2StopBeforeLightsOffMinutes: 45,
      p1ShotDurationSeconds: 20,
      p1ShotIntervalMinutes: 8,
      p2ShotDurationSeconds: 15,
      p2ShotIntervalMinutes: 12,
    };

    await growspaceCard.clickMenuItem(/irrigation/i);
    const dialog = new IrrigationDialog(page);
    await dialog.waitForOpen();

    await dialog.clickTab('steering');
    const isEnabled = await dialog.isVwcEnabled();
    if (!isEnabled) {
      await dialog.toggleVwcSwitch();
    }
    const isP2AutoAdvanceEnabled = await dialog.isAutoAdvanceP2ToP3Enabled();
    if (!isP2AutoAdvanceEnabled) {
      await dialog.toggleAutoAdvanceP2ToP3();
    }

    await dialog.fillNumberField('Saturation Target (%)', SENTINEL.saturationTargetPercent);
    await dialog.fillNumberField('Maintenance Dryback (%)', SENTINEL.maintenanceDrybackPercent);
    await dialog.fillNumberField('P0 Duration (min)', SENTINEL.p0DurationMinutes);
    await dialog.fillNumberField('P2 Stop Buffer (min)', SENTINEL.p2StopBeforeLightsOffMinutes);
    await dialog.fillNumberField('P1 Shot Duration (sec)', SENTINEL.p1ShotDurationSeconds);
    await dialog.fillNumberField('P1 Shot Interval (min)', SENTINEL.p1ShotIntervalMinutes);
    await dialog.fillNumberField('P2 Shot Duration (sec)', SENTINEL.p2ShotDurationSeconds);
    await dialog.fillNumberField('P2 Shot Interval (min)', SENTINEL.p2ShotIntervalMinutes);

    await dialog.saveAll();
    await dialog.close();
    await growspaceCard.waitForCardReady();
    await growspaceCard.clickMenuItem(/irrigation/i);
    await dialog.waitForOpen();
    await dialog.clickTab('steering');

    await expect(dialog.getNumberField('Saturation Target (%)')).toHaveValue(
      String(SENTINEL.saturationTargetPercent)
    );
    await expect(dialog.getNumberField('Maintenance Dryback (%)')).toHaveValue(
      String(SENTINEL.maintenanceDrybackPercent)
    );
    await expect(dialog.getNumberField('P0 Duration (min)')).toHaveValue(
      String(SENTINEL.p0DurationMinutes)
    );
    await expect(dialog.getNumberField('P2 Stop Buffer (min)')).toHaveValue(
      String(SENTINEL.p2StopBeforeLightsOffMinutes)
    );
    await expect(dialog.getNumberField('P1 Shot Duration (sec)')).toHaveValue(
      String(SENTINEL.p1ShotDurationSeconds)
    );
    await expect(dialog.getNumberField('P1 Shot Interval (min)')).toHaveValue(
      String(SENTINEL.p1ShotIntervalMinutes)
    );
    await expect(dialog.getNumberField('P2 Shot Duration (sec)')).toHaveValue(
      String(SENTINEL.p2ShotDurationSeconds)
    );
    await expect(dialog.getNumberField('P2 Shot Interval (min)')).toHaveValue(
      String(SENTINEL.p2ShotIntervalMinutes)
    );

    await dialog.clickTab('schedules');
    await expect(dialog.schedulesTabHasSteeringSchedule()).toBeVisible();
    await expect(dialog.schedulesTabHasSteeringNudge()).not.toBeVisible();
  });

  test('Lights On Time persists via Config → Growlights and reflects on the read-only Steering display', async ({
    page,
  }) => {
    const SENTINEL_TIME = '07:15';

    await growspaceCard.card.locator('[aria-label="Settings"]').click();
    const configDialog = new ConfigDialog(page);
    await configDialog.waitForOpen();
    await configDialog.clickTab('growlight');
    await configDialog.fillTimeField('Lights On Time', SENTINEL_TIME);
    await expect(configDialog.getTimeField('Lights On Time')).toHaveValue(SENTINEL_TIME);
    // Lights-on saves immediately on change (ADR-0026) — cancel discards only the
    // rest of the growlight form, not this field.
    await configDialog.cancel();

    await page.reload();
    await growspaceCard.waitForCardReady();
    await growspaceCard.clickMenuItem(/irrigation/i);
    const dialog = new IrrigationDialog(page);
    await dialog.waitForOpen();
    await dialog.clickTab('steering');

    await expect(dialog.getLightsOnTimeReadout()).toHaveText(SENTINEL_TIME);
  });

  test('shows steering nudge when VWC disabled, shows schedule card after enabling', async ({
    page,
    testContext,
  }) => {
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
