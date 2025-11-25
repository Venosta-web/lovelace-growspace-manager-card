import { test, expect } from '@playwright/test';

test.describe('Growspace Manager Card - Mockup Verification', () => {

    test.beforeEach(async ({ page }) => {
        // Navigate to the mockup page
        await page.goto('/verification_mockup.html');
        // Wait for the custom element to be defined and upgraded
        await page.waitForFunction(() => customElements.get('growspace-manager-card'));
        // Wait a bit for lit updates
        await page.waitForTimeout(500);
    });

    test('should render the mockup page title', async ({ page }) => {
        await expect(page).toHaveTitle('Growspace Verification');
        await expect(page.locator('h1')).toHaveText('Growspace Layout Verification');
    });

    test('should render both growspace cards (Grid and List)', async ({ page }) => {
        const cardGrid = page.locator('#card-grid-5');
        const cardList = page.locator('#card-list-6');

        await expect(cardGrid).toBeVisible();
        await expect(cardList).toBeVisible();
    });

    test('should render Shadow DOM content for 5 Column Grid', async ({ page }) => {
        const cardGrid = page.locator('#card-grid-5');
        await expect(cardGrid).toContainText('5 Column Grid');
        await expect(cardGrid).toContainText('Strain 1');
    });

    test('should render Shadow DOM content for 6 Column List', async ({ page }) => {
        const cardList = page.locator('#card-list-6');
        await expect(cardList).toContainText('6 Column List');
        await expect(cardList).toContainText('Strain 1');
    });

    test('should display environmental sensors when Compact mode is disabled', async ({ page }) => {
         const cardGrid = page.locator('#card-grid-5');

         // Force disable Compact Mode via internal state to verify rendering logic
         await cardGrid.evaluate((el: any) => {
             el._isCompactView = false;
             el.requestUpdate();
         });

         // Wait for update
         await page.waitForTimeout(500);

         // Check if "25°C" appears (Environmental stats)
         await expect(cardGrid).toContainText('25°C');

         // Check Humidity "60%"
         await expect(cardGrid).toContainText('60%');
    });
});
