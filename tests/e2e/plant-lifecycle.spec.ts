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

        // Wait for UI to stabilize after dialog close
        await page.waitForTimeout(500);

        // Config Dialog - Ensure menu is visible before clicking
        console.log('Opening menu for Config...');
        await menuButton.click();
        const menuDropdown = card.locator('.menu-dropdown');
        await expect(menuDropdown).toBeVisible({ timeout: 5000 });

        console.log('Clicking Config menu item...');
        const configMenuItem = card.locator('.menu-item').filter({ hasText: 'Config' });
        await expect(configMenuItem).toBeVisible();
        await configMenuItem.click();

        // Wait for config-dialog to appear
        console.log('Waiting for Config dialog...');
        const configDialog = card.locator('config-dialog');
        await expect(configDialog).toBeAttached({ timeout: 10000 });
        await expect(configDialog.locator('.glass-dialog-container')).toBeVisible({ timeout: 10000 });

        const growspaceName = `Grow Room ${Date.now()}`;

        // Wait for full render then click Add Growspace tab
        console.log('Waiting for tabs to render...');
        await page.waitForTimeout(1000);

        // Click on the Add Growspace tab using page-level text search
        const addGrowspaceTab = page.getByText('Add Growspace').first();
        await expect(addGrowspaceTab).toBeVisible({ timeout: 10000 });
        await addGrowspaceTab.click();

        // Wait for tab content to render
        await page.waitForTimeout(500);

        console.log('Waiting for Growspace Name input...');

        // Find the Growspace Name input
        const nameInput = page.locator('md3-text-input[label="Growspace Name"]').locator('input');
        await expect(nameInput).toBeVisible({ timeout: 10000 });
        await nameInput.fill(growspaceName);

        // Handle number inputs
        const rowsInput = page.locator('md3-number-input[label="Rows"]').locator('input');
        await rowsInput.fill('2');

        const plantsInput = page.locator('md3-number-input[label="Plants per Row"]').locator('input');
        await plantsInput.fill('3');

        // Submit - click the Add Growspace button in the button-group
        const submitButton = page.locator('.button-group').locator('button.md3-button.primary').filter({ hasText: 'Add Growspace' });
        await submitButton.click();

        console.log('Growspace submitted, waiting for backend update...');

        // Wait for dialog to close or cancel it
        await page.waitForTimeout(2000);
        try {
            const cancelButton = page.getByRole('button', { name: 'Cancel' });
            if (await cancelButton.isVisible({ timeout: 1000 })) {
                await cancelButton.click();
            }
        } catch (e) { }

        // Wait for backend to update sensor.growspaces_list and for UI to refresh
        // Poll the dropdown for up to 15 seconds
        console.log('Waiting for growspace to appear in dropdown...');
        const growspaceSelect = card.locator('.growspace-select-header');
        await expect(growspaceSelect).toBeVisible();

        // Poll until the option appears  
        await expect(async () => {
            const options = await growspaceSelect.locator('option').allTextContents();
            expect(options.some(opt => opt.includes(growspaceName))).toBe(true);
        }).toPass({ timeout: 20000 });

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
