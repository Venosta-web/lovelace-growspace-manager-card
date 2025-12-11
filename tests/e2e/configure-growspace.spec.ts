import { test, expect } from '@playwright/test';

test.describe('Configure Growspace', () => {
    test.beforeEach(async ({ page }) => {
        // Ensure we are logged in before each test
        await page.goto('/');
        await expect(page.locator('home-assistant-main')).toBeVisible();
    });

    test('Add a new growspace named "test" via options flow', async ({ page }) => {
        // 1. Navigate to Integrations Dashboard
        await page.goto('/config/integrations/dashboard');

        // Logic provided by user recording
        await page.getByRole('link', { name: 'Growspace Manager' }).click();

        // This selector is fragile but comes from user recording. 
        // Ensuring we wait for it to be actionable.
        const configureIcon = page.locator('ha-icon-button:nth-child(4) > mwc-icon-button > ha-svg-icon');
        await expect(configureIcon).toBeVisible();
        await configureIcon.click();

        // Interaction with Main Menu (Select Manage Growspaces)
        await page.getByRole('combobox', { name: 'action*' }).click();
        await page.getByRole('option', { name: 'Manage Growspaces' }).click();
        await page.getByRole('button', { name: 'Submit' }).click();

        // Interaction with Manage Growspaces (Default: Add Growspace)
        await page.getByRole('button', { name: 'Submit' }).click();

        // Form Filling
        await page.getByRole('textbox', { name: 'name*' }).click();
        await page.getByRole('textbox', { name: 'name*' }).fill('test');
        await page.getByRole('button', { name: 'Submit' }).click();

        // Finish
        await page.getByRole('button', { name: 'Finish' }).click();
    });

    test('Remove the "test" growspace via options flow', async ({ page }) => {
        // 1. Navigate to Integrations Dashboard
        await page.goto('/config/integrations/dashboard');

        // Logic provided by user recording (same entry point)
        await page.getByRole('link', { name: 'Growspace Manager' }).click();
        await page.locator('ha-icon-button:nth-child(4) > mwc-icon-button > ha-svg-icon').click();

        // Interaction with Main Menu (Select Manage Growspaces)
        await page.getByRole('combobox', { name: 'action*' }).click();
        await page.getByRole('option', { name: 'Manage Growspaces' }).click();
        await page.getByRole('button', { name: 'Submit' }).click();

        // Interaction with Manage Growspaces (Default: Add Growspace is selected)
        // usage: Select "Remove Growspace" from the radio button list
        await page.getByRole('radio', { name: 'Remove Growspace' }).click();

        // Select the growspace to remove
        // Clicking the first combobox (index 0) which is for growspace_id
        const growspaceSelect = page.getByRole('combobox').first();
        await expect(growspaceSelect).toBeVisible();
        await growspaceSelect.click({ force: true });

        await expect(page.getByRole('option', { name: 'test' }).first()).toBeVisible();
        await page.getByRole('option', { name: 'test' }).first().click();

        // Submit removal
        await page.getByRole('button', { name: 'Submit' }).click();

        // The flow loops back to "Manage Growspaces". Verify we are back by checking for the "Add Growspace" radio.
        await expect(page.getByRole('radio', { name: 'Add Growspace' })).toBeVisible();
    });

    test('Re-add "test" growspace and verify dashboard card', async ({ page }) => {
        // 1. Navigate to Integrations Dashboard
        await page.goto('/config/integrations/dashboard');

        // Logic provided by user recording (same entry point)
        await page.getByRole('link', { name: 'Growspace Manager' }).click();
        await page.locator('ha-icon-button:nth-child(4) > mwc-icon-button > ha-svg-icon').click();

        // Interaction with Main Menu (Select Manage Growspaces)
        // Note: Action might default to Add if no growspaces exist. 
        // We handle this by checking if the "action" radio exists first, or just assuming default if previously removed.
        // After removal, default state is "Add Growspace".

        // However, we start from dashboard, so we likely need to select Manage Growspaces from the main menu again.
        // Main menu uses a combobox (as verified in Test 1), not radio buttons.
        await page.getByRole('combobox', { name: 'action*' }).click();
        await page.getByRole('option', { name: 'Manage Growspaces' }).click();
        await page.getByRole('button', { name: 'Submit' }).click();

        // Interaction with Manage Growspaces (Default: Add Growspace)
        // Ensure "Add Growspace" is selected (Default).
        await expect(page.getByText('Add Growspace')).toBeVisible();
        await page.getByRole('button', { name: 'Submit' }).click();

        // Form Filling
        await page.getByRole('textbox', { name: 'name*' }).click();
        await page.getByRole('textbox', { name: 'name*' }).fill('test');
        await page.getByRole('button', { name: 'Submit' }).click();

        // Finish
        await page.getByRole('button', { name: 'Finish' }).click();

        // 2. Verify Dashboard
        await page.goto('/lovelace/default_view');

        // Check for the growspace card title
        // Selector provided by user: .gs-title containing text "test"
        // We need to wait for the custom card to load.
        const cardTitle = page.locator('.gs-title');
        await expect(cardTitle).toBeVisible();
        await expect(cardTitle).toHaveText('test');
    });
});

