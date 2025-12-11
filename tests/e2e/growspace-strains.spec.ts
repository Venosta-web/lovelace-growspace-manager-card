import { test, expect } from '@playwright/test';

test.describe('Growspace Strains View', () => {
    test.beforeEach(async ({ page }) => {
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

        // 5. Type a search query that guarantees no results
        // Source code uses md3-text-input. We can fill it.
        // Locator based on placeholder found in source: "Search Strains by Name, Breeder..."
        await page.locator('input[placeholder="Search Strains by Name, Breeder..."]').fill('NonExistentStrainXYZ');

        // 6. Verify the message
        // Using the refined selector to avoid strict mode violations and target the content
        const messageParagraph = page.locator('.sd-content p').filter({ hasText: 'No strains found matching' });
        await expect(messageParagraph).toBeVisible();

        const textContent = await messageParagraph.textContent();
        console.log('Message textContent:', textContent);

        // Verify content includes the query
        expect(textContent).toContain('No strains found matching');
        // The app might be lowercasing the input for search/display
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

        // 5. Click 'New Strain'
        // User provided: <button class="md3-button primary">...New Strain</button>
        // We'll target it by text first as it's robust, or by class if needed.
        await page.getByRole('button', { name: 'New Strain' }).click();

        // 6. Fill out the form
        // Source code inspection reveals:
        // - Inputs are native <input class="sd-input"> inside .sd-form-group
        // - Type selector is a custom div grid .type-selector-grid > .type-option
        // - Sex is radio buttons wrapped in labels

        // Name Field (Label: "Strain Name *")
        const nameGroup = page.locator('.sd-form-group').filter({ hasText: 'Strain Name' });
        await expect(nameGroup).toBeVisible();
        await nameGroup.locator('input').fill('Test Strain');

        // Breeder Field (Label: "Breeder/Seedbank")
        const breederGroup = page.locator('.sd-form-group').filter({ hasText: 'Breeder' });
        await breederGroup.locator('input').fill('Test Breeder');

        // Strain Type: Custom Div Selector
        // We want to select 'Hybrid'. It might be selected by default, but let's click it to be sure.
        await page.locator('.type-option').filter({ hasText: 'Hybrid' }).click();

        // Sex: Radio buttons (Label: "Sex")
        // The radio buttons are wrapped in labels with text "Feminized" / "Regular"
        // playwright's getByLabel should work for wrapped inputs
        await page.getByLabel('Feminized').check();

        // 7. Submit
        // Button text is "Save Strain"
        await page.getByRole('button', { name: 'Save Strain' }).click();

        // Wait for dialog to close (element with dialog role should be hidden)
        await expect(page.locator('ha-dialog')).toBeHidden();

        // 8. Verify it appears in the list 
        await expect(page.getByText('Test Strain')).toBeVisible({ timeout: 10000 });
    });

    test('Delete Strain', async ({ page }) => {
        // 1. Navigate and open library (Setup)
        await page.goto('/lovelace/default_view');
        const card = page.locator('growspace-manager-card');
        await expect(card).toBeVisible();
        await card.locator('.menu-button').click();
        await page.getByText('Strains').click();

        // 2. Add a unique strain to delete
        const uniqueName = `Delete Me ${Date.now()}`;
        await page.getByRole('button', { name: 'New Strain' }).click();
        await page.locator('.sd-form-group').filter({ hasText: 'Strain Name' }).locator('input').fill(uniqueName);
        await page.getByRole('button', { name: 'Save Strain' }).click();
        await expect(page.locator('ha-dialog')).toBeHidden();

        // 3. Find the strain card
        // Note: Using filter to find the specific card
        const strainCard = page.locator('.strain-card').filter({ hasText: uniqueName }).first();
        await expect(strainCard).toBeVisible();

        // 4. Setup dialog handler BEFORE clicking
        page.on('dialog', async dialog => {
            console.log(`Dialog message: ${dialog.message()}`);
            await dialog.accept();
        });

        // 5. Click Delete
        // The delete button is in the .sc-actions which appears on hover, but Playwright can force click or hover first
        await strainCard.hover();
        const deleteBtn = strainCard.locator('.sc-action-btn').filter({ has: page.locator('path[d^="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"]') });
        // Or simpler, just the button inside .sc-actions
        const actionBtn = strainCard.locator('.sc-action-btn');
        await actionBtn.click();

        // 6. Verify removal
        await expect(strainCard).toBeHidden({ timeout: 10000 });
    });

    test('Delete Strain via Editor', async ({ page }) => {
        // 1. Navigate and open library
        await page.goto('/lovelace/default_view');
        const card = page.locator('growspace-manager-card');
        await expect(card).toBeVisible();
        await card.locator('.menu-button').click();
        await page.getByText('Strains').click();

        // 2. Add a unique strain
        const uniqueName = `Editor Delete ${Date.now()}`;
        await page.getByRole('button', { name: 'New Strain' }).click();
        await page.locator('.sd-form-group').filter({ hasText: 'Strain Name' }).locator('input').fill(uniqueName);
        await page.getByRole('button', { name: 'Save Strain' }).click();
        await expect(page.locator('ha-dialog')).toBeHidden();

        // 3. Open the strain card (Edit Mode)
        const strainCard = page.locator('.strain-card').filter({ hasText: uniqueName }).first();
        await strainCard.click();

        // 4. Setup dialog handler
        page.on('dialog', async dialog => {
            console.log(`Dialog message: ${dialog.message()}`);
            await dialog.accept();
        });

        // 5. Click Delete in the Editor Footer
        // It's a button with text "Delete" in the footer
        const deleteBtn = page.locator('.sd-footer button').filter({ hasText: 'Delete' });
        await expect(deleteBtn).toBeVisible();
        await deleteBtn.click();

        // 6. Verify removal
        await expect(strainCard).toBeHidden({ timeout: 10000 });
    });
});
