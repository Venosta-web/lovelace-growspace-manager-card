import { test, expect } from '@playwright/test';

test.describe('Plant Lifecycle', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
        page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));
        console.log('Navigating to root...');
        await page.goto('/');
        await expect(page.locator('home-assistant-main')).toBeVisible();
    });

    test('Create new Strain and Add Plant', async ({ page }) => {
        const card = page.locator('growspace-manager-card');
        await expect(card).toBeVisible();

        const menuButton = card.locator('.menu-button');
        await menuButton.click();
        await expect(card.locator('.menu-dropdown')).toBeVisible();

        await card.locator('.menu-item').filter({ hasText: 'Strains' }).click();
        await expect(card.locator('strain-library-dialog .glass-dialog-container')).toBeVisible();

        // Add Strain
        await page.getByRole('button', { name: 'New Strain' }).click();
        const strainName = `Test Strain ${Date.now()}`;
        await page.locator('.sd-form-group').filter({ hasText: 'Strain Name' }).locator('input').fill(strainName);
        await page.locator('.sd-form-group').filter({ hasText: 'Breeder' }).locator('input').fill('Test Breeder');
        await page.locator('.sd-form-group').filter({ hasText: 'Flowering Time' }).locator('input[placeholder="Min"]').fill('60');
        await page.getByRole('button', { name: 'Save Strain' }).click();
        await card.locator('strain-library-dialog .dialog-header button').last().click();
        await expect(card.locator('.glass-dialog-container')).toBeHidden();


        // Config Dialog
        await menuButton.click();
        await expect(card.locator('.menu-dropdown')).toBeVisible();
        await card.locator('.menu-item').filter({ hasText: 'Config' }).click();

        // Wait for dialog content to be visible (like strain-library-dialog)
        const configDialog = card.locator('config-dialog');
        const container = configDialog.locator('.glass-dialog-container');
        await expect(container).toBeVisible({ timeout: 5000 });

        const growspaceName = `Grow Room ${Date.now()}`;

        // Switch to Add Growspace Tab (default is Environment)
        const tabs = configDialog.locator('.config-tab');
        await expect(tabs.first()).toBeVisible({ timeout: 5000 });
        await tabs.filter({ hasText: 'Add Growspace' }).click({ force: true });

        console.log('Waiting for Growspace Name input...');

        const nameInput = page.locator('md3-text-input[label="Growspace Name"] input');
        // Use global layout force just in case inputs are hidden
        await page.evaluate(() => document.body.offsetHeight);

        await expect(nameInput).toBeVisible({ timeout: 10000 });

        await nameInput.click({ force: true });
        await nameInput.fill(growspaceName, { force: true });
        await page.locator('md3-number-input[label="Rows"] input').fill('2', { force: true });
        await page.locator('md3-number-input[label="Plants per Row"] input').fill('3', { force: true });

        // Submit
        await page.locator('md3-button').filter({ hasText: 'Add Growspace' }).click({ force: true });

        // Select Growspace
        try {
            if (await card.locator('.glass-dialog-container').isVisible({ timeout: 2000 })) {
                await page.getByRole('button', { name: 'Cancel' }).click();
            }
        } catch (e) { }

        const growspaceSelect = card.locator('.growspace-select-header');
        await expect(growspaceSelect).toBeVisible();
        await expect(growspaceSelect).toContainText(growspaceName);
        await growspaceSelect.selectOption({ label: growspaceName });

        // Add Plant
        const emptySlot = card.locator('.plant-card-empty').first();
        await expect(emptySlot).toBeVisible();
        await emptySlot.click();
        await expect(page.getByText('Add New Plant')).toBeVisible({ timeout: 10000 });

        const strainSelect = page.locator('md3-select[label="Strain *"]').locator('select');
        await expect(strainSelect).toBeVisible();
        await strainSelect.selectOption({ label: strainName });
        await page.getByRole('button', { name: 'Add Plant' }).click();

        await expect(page.getByText('Add New Plant')).toBeHidden({ timeout: 10000 });
        const plantCard = card.locator('.plant-card, .plant-card-rich').filter({ hasText: strainName });
        await expect(plantCard).toBeVisible({ timeout: 10000 });

        // Edit Plant
        await plantCard.click();
        await expect(page.locator('.glass-dialog-container')).toBeVisible({ timeout: 10000 });
        const timelineCard = page.locator('.detail-card').filter({ hasText: 'Timeline' });
        await timelineCard.locator('button.md3-button.text').click();

        const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
        const formattedDate = fiveDaysAgo.toISOString().slice(0, 16);
        const flowerInput = page.locator('md3-date-input[label="Flower Start"]').locator('input');
        await expect(flowerInput).toBeVisible();
        await flowerInput.fill(formattedDate);
        await page.locator('.button-group button.md3-button.tonal').filter({ hasText: 'Save' }).click();

        await expect(page.locator('.glass-dialog-container')).toBeHidden({ timeout: 10000 });
        await expect(plantCard.locator('.pc-stage')).toContainText(/flower/i, { timeout: 10000 });
        await expect(plantCard.locator('.pc-stats')).toContainText(/[4-6]d/);

        // Delete Plant
        await plantCard.click();
        await expect(page.locator('.glass-dialog-container')).toBeVisible({ timeout: 10000 });
        await page.locator('.button-group button.md3-button.danger').filter({ hasText: 'Delete' }).first().click();
        await expect(page.getByText('Confirm Deletion')).toBeVisible({ timeout: 5000 });
        await page.locator('.dialog-overlay button.md3-button.danger').filter({ hasText: 'Delete' }).click();
        await expect(plantCard).toBeHidden({ timeout: 10000 });
    });
});
