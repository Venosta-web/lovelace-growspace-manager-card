import { haTest as test, expect } from '../fixtures/ha-setup';
import { GrowspaceCard } from '../pages/GrowspaceCard';
import { LogbookDialog, SnapshotsDialog, GrowReportDialog, GrowMasterDialog } from '../pages/Dialogs';

test.describe('Insights dialogs', () => {
  let growspaceCard: GrowspaceCard;

  test.beforeEach(async ({ page, testContext }) => {
    growspaceCard = new GrowspaceCard(page);
    await growspaceCard.navigate(testContext.dashboardPath);
    await growspaceCard.waitForCardReady();
  });

  test('logbook dialog opens from menu', async ({ page }) => {
    await growspaceCard.clickMenuItem(/logbook/i);
    const dialog = new LogbookDialog(page);
    await dialog.waitForOpen();
  });

  test('camera snapshots dialog opens from menu', async ({ page }) => {
    await growspaceCard.clickMenuItem(/camera snapshots/i);
    const dialog = new SnapshotsDialog(page);
    await dialog.waitForOpen();
  });

  test('grow report dialog opens from menu', async ({ page }) => {
    await growspaceCard.clickMenuItem(/generate report/i);
    const dialog = new GrowReportDialog(page);
    await dialog.waitForOpen();
  });

  test('ask AI dialog opens from menu', async ({ page }) => {
    await growspaceCard.clickMenuItem(/ask ai/i);
    const dialog = new GrowMasterDialog(page);
    await dialog.waitForOpen();
  });
});
