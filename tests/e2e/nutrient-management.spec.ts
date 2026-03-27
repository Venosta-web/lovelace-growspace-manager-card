import { test, expect } from '../coverage-helper';

test.describe('Nutrient Management', () => {
    test.beforeEach(async ({ coveragePage: page }) => {
        await page.goto('http://127.0.0.1:8123', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('growspace-manager-card').first()).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(3000); // Hydration wait
    });

    test('Create and Verify Nutrient Preset', async ({ coveragePage: page }) => {
        const card = page.locator('growspace-manager-card').first();

        // 1. Open Menu -> Nutrient Presets
        await card.locator('growspace-header .menu-container .icon-button').first().dispatchEvent('click', { bubbles: true, composed: true });
        await card.locator('.menu-dropdown .menu-item').filter({ hasText: 'Nutrients' }).click();

        // 2. Wait for Dialog
        // 2. Wait for Dialog
        // 2. Wait for Dialog
        const nutDialog = card.locator('growspace-dialog-host nutrient-dialog ha-dialog').first();
        await expect(nutDialog).toHaveAttribute('open', '', { timeout: 10000 });

        // Switch to Presets tab
        await nutDialog.locator('.tab').filter({ hasText: 'Presets' }).click();

        // 3. Add New Preset
        const presetsEditor = nutDialog.locator('nutrient-presets-editor');
        await expect(presetsEditor).toBeVisible();
        await presetsEditor.getByRole('button', { name: /add preset/i }).click();

        // 4. Fill Preset Name
        const presetName = 'E2E Test Preset';
        await expect(presetsEditor.locator('md3-text-input, input').first()).toBeVisible();

        const nameInput = presetsEditor.locator('md3-text-input[label*="Name"] input, input[placeholder*="Name"]').first();
        if (await nameInput.isVisible()) {
            await nameInput.fill(presetName);
        }

        // 5. Add Nutrient Component
        await presetsEditor.getByRole('button', { name: 'Add', exact: true }).click();

        // Fill name and dose in the new row
        const nutrientRow = presetsEditor.locator('.nutrient-row').first();
        await expect(nutrientRow).toBeVisible();
        await nutrientRow.locator('md3-text-input[label="Nutrient Name"] input').fill('CalMag');
        await nutrientRow.locator('md3-number-input[label="ml/L"] input').fill('1.0');

        // 6. Save
        await presetsEditor.getByRole('button', { name: /save/i }).click();

        // Wait for view to switch back to list (Save button gone, Add Preset button back)
        await expect(presetsEditor.getByRole('button', { name: /save/i })).toBeHidden({ timeout: 5000 });
        await expect(presetsEditor.getByRole('button', { name: /add preset/i })).toBeVisible();

        // 7. Verify logic
        // Verify it appears in the list
        await expect(presetsEditor).toContainText(presetName);
        // Or close and reopen checks
    });
});
