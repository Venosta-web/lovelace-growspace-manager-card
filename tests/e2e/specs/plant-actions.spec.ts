import { haTest as test, expect } from '../fixtures/ha-setup';
import { GrowspaceCard } from '../pages/GrowspaceCard';
import { WateringDialog, IPMDialog, TrainingDialog } from '../pages/Dialogs';

test.describe('Plant Actions - menu dialogs', () => {
  let growspaceCard: GrowspaceCard;

  test.beforeEach(async ({ page, testContext }) => {
    growspaceCard = new GrowspaceCard(page);
    await growspaceCard.navigate(testContext.dashboardPath);
    await growspaceCard.waitForCardReady();
  });

  test('watering dialog opens from menu', async ({ page }) => {
    // No plants selected → label is "Water Growspace"
    await growspaceCard.clickMenuItem(/water growspace/i);
    const dialog = new WateringDialog(page);
    await dialog.waitForOpen();
  });

  test('IPM dialog opens from menu', async ({ page }) => {
    await growspaceCard.clickMenuItem(/log \/ manage ipm/i);
    const dialog = new IPMDialog(page);
    await dialog.waitForOpen();
  });

  test('training dialog opens from menu', async ({ page }) => {
    await growspaceCard.clickMenuItem(/log training/i);
    const dialog = new TrainingDialog(page);
    await dialog.waitForOpen();
  });
});
