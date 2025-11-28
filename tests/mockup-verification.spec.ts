import { test, expect } from '@playwright/test';

test.describe('Verification Mockup', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/verification_mockup.html');
    });

    test('renders all growspace types correctly', async ({ page }) => {
        // Wait for custom element to be defined and cards to render

        // Check Standard Card
        const standardCard = page.locator('#card-standard');
        await expect(standardCard).toBeVisible();
        await expect(standardCard).toContainText('Strain 1');

        // Check Mother Card
        const motherCard = page.locator('#card-mother');
        await expect(motherCard).toBeVisible();
        await expect(motherCard).toContainText('Mother 1');

        // Check Clone Card
        const cloneCard = page.locator('#card-clone');
        await expect(cloneCard).toBeVisible();
        await expect(cloneCard).toContainText('Clone 1');

        // Check Dry Card
        const dryCard = page.locator('#card-dry');
        await expect(dryCard).toBeVisible();
        await expect(dryCard).toContainText('Dry 1');

        // Check Cure Card
        const cureCard = page.locator('#card-cure');
        await expect(cureCard).toBeVisible();
        await expect(cureCard).toContainText('Cure 1');
    });
});
