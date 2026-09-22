import { haTest as test, expect } from '../fixtures/ha-setup';
import { GrowspaceCard } from '../pages/GrowspaceCard';
import {
  LogbookDialog,
  SnapshotsDialog,
  GrowReportDialog,
  GrowMasterDialog,
} from '../pages/Dialogs';

test.describe('Insights dialogs', () => {
  let growspaceCard: GrowspaceCard;

  test.beforeEach(async ({ page, testContext }) => {
    growspaceCard = new GrowspaceCard(page);
    await growspaceCard.navigate(testContext.dashboardPath);
    await growspaceCard.waitForCardReady();
  });

  test('logbook dialog opens from menu', async ({ page }) => {
    await growspaceCard.clickMenuAction('logbook');
    const dialog = new LogbookDialog(page);
    await dialog.waitForOpen();
  });

  test('camera snapshots dialog opens from menu', async ({ page }) => {
    await growspaceCard.clickMenuAction('snapshots');
    const dialog = new SnapshotsDialog(page);
    await dialog.waitForOpen();
  });

  test('ask AI dialog opens from menu', async ({ page }) => {
    await growspaceCard.clickMenuAction('ai');
    const dialog = new GrowMasterDialog(page);
    await dialog.waitForOpen();
  });
});
