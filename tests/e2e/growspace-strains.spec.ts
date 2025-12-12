import { test, expect } from '@playwright/test';

test.describe('Growspace Strains View', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
        page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));
        // Ensure we are logged in before each test
        await page.goto('/');
        await expect(page.locator('home-assistant-main')).toBeVisible();
    });

    test('Verify "No strains found" message with Lit artifact', async ({ page }) => {
        // 1. Navigate to default view
        await page.goto('/lovelace/default_view');

        // 2. Wait for the card to be visible
        const card = page.locator('growspace-manager-card');
        await expect(card).toBeVisible();

        // 3. Click the menu button in the card header
        await card.locator('.menu-button').click();

        // 4. Click 'Strains' in the opened menu
        await page.getByText('Strains').click();

        // 5. Wait for strain library dialog to be visible
        await expect(card.locator('strain-library-dialog .glass-dialog-container')).toBeVisible();

        // 6. Type a search query that guarantees no results
        await page.locator('input[placeholder="Search Strains by Name, Breeder..."]').fill('NonExistentStrainXYZ');

        // 7. Verify the message
        const messageParagraph = page.locator('.sd-content p').filter({ hasText: 'No strains found matching' });
        await expect(messageParagraph).toBeVisible();

        const textContent = await messageParagraph.textContent();
        console.log('Message textContent:', textContent);

        expect(textContent).toContain('No strains found matching');
        expect(textContent?.toLowerCase()).toContain('nonexistentstrainxyz');
    });

    test('Create new Strain', async ({ page }) => {
        // 1. Navigate to default view
        await page.goto('/lovelace/default_view');

        // 2. Wait for the card to be visible
        const card = page.locator('growspace-manager-card');
        await expect(card).toBeVisible();

        // 3. Click the menu button in the card header
        await card.locator('.menu-button').click();

        // 4. Click 'Strains' in the opened menu
        await page.getByText('Strains').click();

        // 5. Wait for strain library dialog
        await expect(card.locator('strain-library-dialog .glass-dialog-container')).toBeVisible();

        // 6. Click 'New Strain'
        await page.getByRole('button', { name: 'New Strain' }).click();

        // 7. Fill out the form with unique name
        const uniqueName = `Test Strain ${Date.now()}`;
        const nameGroup = page.locator('.sd-form-group').filter({ hasText: 'Strain Name' });
        await expect(nameGroup).toBeVisible();
        await nameGroup.locator('input').fill(uniqueName);

        const breederGroup = page.locator('.sd-form-group').filter({ hasText: 'Breeder' });
        await breederGroup.locator('input').fill('Test Breeder');

        await page.locator('.type-option').filter({ hasText: 'Hybrid' }).click();
        await page.getByLabel('Feminized').check();

        // 8. Submit
        await page.getByRole('button', { name: 'Save Strain' }).click();

        // 9. Wait for form to close and list to refresh
        await page.waitForTimeout(1000);

        // 10. Verify it appears in the list by searching for the unique name
        const strainCard = page.locator('.strain-card').filter({ hasText: uniqueName });
        await expect(strainCard).toBeVisible({ timeout: 10000 });
    });

    test('Delete Strain', async ({ page }) => {
        // 1. Navigate and open library
        await page.goto('/lovelace/default_view');
        const card = page.locator('growspace-manager-card');
        await expect(card).toBeVisible();
        await card.locator('.menu-button').click();
        await page.getByText('Strains').click();

        // 2. Wait for dialog
        await expect(card.locator('strain-library-dialog .glass-dialog-container')).toBeVisible();

        // 3. Add a unique strain to delete
        const uniqueName = `Delete Me ${Date.now()}`;
        await page.getByRole('button', { name: 'New Strain' }).click();
        await page.locator('.sd-form-group').filter({ hasText: 'Strain Name' }).locator('input').fill(uniqueName);
        await page.getByRole('button', { name: 'Save Strain' }).click();

        // 4. Wait for form to close and strain to appear
        await page.waitForTimeout(1000);

        // 5. Find the strain card
        const strainCard = page.locator('.strain-card').filter({ hasText: uniqueName }).first();
        await expect(strainCard).toBeVisible({ timeout: 10000 });

        // 6. Click the delete action button (visible on hover)
        await strainCard.hover();
        const actionBtn = strainCard.locator('.sc-action-btn');
        await expect(actionBtn).toBeVisible();
        await actionBtn.click();

        // 7. Confirm deletion in the confirmation overlay
        const confirmDeleteBtn = page.locator('.crop-overlay button.md3-button.text').filter({ hasText: 'Delete' });
        await expect(confirmDeleteBtn).toBeVisible({ timeout: 5000 });
        await confirmDeleteBtn.click();

        // 8. Verify removal
        await expect(strainCard).toBeHidden({ timeout: 10000 });
    });

    test('Delete Strain via Editor', async ({ page }) => {
        // 1. Navigate and open library
        await page.goto('/lovelace/default_view');
        const card = page.locator('growspace-manager-card');
        await expect(card).toBeVisible();
        await card.locator('.menu-button').click();
        await page.getByText('Strains').click();

        // 2. Wait for dialog
        await expect(card.locator('strain-library-dialog .glass-dialog-container')).toBeVisible();

        // 3. Add a unique strain
        const uniqueName = `Editor Delete ${Date.now()}`;
        await page.getByRole('button', { name: 'New Strain' }).click();
        await page.locator('.sd-form-group').filter({ hasText: 'Strain Name' }).locator('input').fill(uniqueName);
        await page.getByRole('button', { name: 'Save Strain' }).click();

        // 4. Wait for form to close and strain to appear
        await page.waitForTimeout(1000);

        // 5. Find and click the strain card to open edit mode
        const strainCard = page.locator('.strain-card').filter({ hasText: uniqueName }).first();
        await expect(strainCard).toBeVisible({ timeout: 10000 });
        await strainCard.click();

        // 6. Click Delete in the Editor Footer
        const deleteBtn = page.locator('.sd-footer button').filter({ hasText: 'Delete' });
        await expect(deleteBtn).toBeVisible();
        await deleteBtn.click();

        // 7. Confirm deletion in the confirmation overlay
        const confirmDeleteBtn = page.locator('.crop-overlay button.md3-button.text').filter({ hasText: 'Delete' });
        await expect(confirmDeleteBtn).toBeVisible({ timeout: 5000 });
        await confirmDeleteBtn.click();

        // 8. Verify removal
        await expect(strainCard).toBeHidden({ timeout: 10000 });
    });
});
