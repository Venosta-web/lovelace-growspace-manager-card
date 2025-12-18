import { test, expect } from '@playwright/test';

test.describe('Growspace Configuration', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
        page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));
        console.log('Navigating to root...');
        await page.goto('/');
        await expect(page.locator('home-assistant-main')).toBeVisible();
    });

    test('should open environment config and show new fields', async ({ page }) => {
        const card = page.locator('growspace-manager-card');
        await expect(card).toBeVisible();

        const menuButton = card.locator('.menu-button'); // Uses class binding in source? 
        // update: growspace-header.ts render() shows: <div class="icon-button" @click=...>...</div> inside .menu-container
        // It does NOT have .menu-button class explicitly in the view_file snippet!
        // plant-lifecycle.spec.ts line 16 uses `.menu-button`.
        // Let's verify `growspace-header.ts` again.

        // In growspace-header.ts line 790:
        // <div class="menu-container"> <div class="icon-button" ...> ... </div> </div>
        // It does NOT seem to have .menu-button class.
        // But plant-lifecycle.spec.ts uses it. Maybe it was added in styles or I missed it?
        // Or maybe I should use `.menu-container .icon-button` to be safe.

        const menuTrigger = card.locator('.menu-container .icon-button').last(); // Menu is last, first might be link?
        // Actually, link is before menu-container.
        // So .menu-container .icon-button is safe.
        await expect(menuTrigger).toBeVisible();
        await menuTrigger.click();

        const menuDropdown = card.locator('.menu-dropdown');
        await expect(menuDropdown).toBeVisible();

        console.log('Clicking Config menu item...');
        const configMenuItem = card.locator('.menu-item').filter({ hasText: 'Config' });
        await expect(configMenuItem).toBeVisible();
        await configMenuItem.click();

        // 4. Verify Dialog Open
        console.log('Waiting for Config dialog...');
        const configDialog = card.locator('config-dialog');
        await expect(configDialog).toBeAttached();
        await expect(configDialog.locator('.glass-dialog-container')).toBeVisible();

        // 5. Switch to Environment Tab
        console.log('Switching to Environment tab...');
        const envTab = configDialog.locator('.config-tab').filter({ hasText: 'Environment' });
        await expect(envTab).toBeVisible();
        await envTab.click();

        // 6. Verify new sections/fields presence
        console.log('Verifying new fields...');
        await expect(configDialog.locator('h3').filter({ hasText: 'Climate Devices' })).toBeVisible();

        // Verify Labels
        await expect(configDialog.locator('label').filter({ hasText: 'Light Source / Sensor' })).toBeVisible();
        await expect(configDialog.locator('label').filter({ hasText: 'Exhaust Fan / Switch' })).toBeVisible();
        await expect(configDialog.locator('label').filter({ hasText: 'Humidifier' })).toBeVisible();
        await expect(configDialog.locator('label').filter({ hasText: 'Dehumidifier' })).toBeVisible();
        await expect(configDialog.locator('label').filter({ hasText: 'Control Dehumidifier' })).toBeVisible();

        // 7. Test Submission (without changing much, just save defaults/empty)
        console.log('Clicking Save Sensors...');
        const saveButton = configDialog.locator('button.md3-button.primary').filter({ hasText: 'Save Sensors' });
        await expect(saveButton).toBeVisible();
        await saveButton.click();

        // 8. Verify Success Toast or Dialog Close
        // GrowspaceStore.showToast sets notification state.
        // The toast rendering isn't shown in the snippets but `DialogHost` closes dialog on success.
        await expect(configDialog.locator('.glass-dialog-container')).toBeHidden({ timeout: 5000 });
        console.log('Environment config saved successfully.');
    });
});
