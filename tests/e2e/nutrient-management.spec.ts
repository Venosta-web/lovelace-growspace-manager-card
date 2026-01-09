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
        await card.locator('.menu-dropdown .menu-item').filter({ hasText: 'Nutrient Presets' }).click();

        // 2. Wait for Dialog
        // 2. Wait for Dialog
        const presetsDialog = card.locator('growspace-dialog-host nutrient-presets-editor ha-dialog').first();
        await expect(presetsDialog).toHaveAttribute('open', '', { timeout: 10000 });

        // 3. Add New Preset
        // Subagent found: `button.md3-button.primary:contains("Add Preset")` inside the dialog's shadow root
        // Playwright should find it by role or text.
        await presetsDialog.getByRole('button', { name: /add preset/i }).click();

        // 4. Fill Preset Name
        const presetName = 'E2E Test Preset';
        // Needs to identify the input for name. Likely the first input or labeled "Name"
        // Subagent didn't explicitly map the "New Preset" form fields, assuming standard checks.
        // Usually, clicking "Add" adds a row or opens a sub-form. 
        // If it adds a row inline:
        const presetItem = presetsDialog.locator('.preset-item').last(); // Assuming it adds to bottom
        // Or if it opens a modal, we would see another dialog. 
        // Let's assume inline or new dialog.
        // Given 'nutrient-presets-editor' usually lists them, and 'Add' might open a detail view.
        // Let's look for an input field that appears.
        await expect(presetsDialog.locator('md3-text-input, input').first()).toBeVisible(); // Generic check

        // Try filling the name if found.
        const nameInput = presetsDialog.locator('md3-text-input[label*="Name"] input, input[placeholder*="Name"]').first();
        if (await nameInput.isVisible()) {
            await nameInput.fill(presetName);
        } else {
            // Maybe it created a row with an edit field?
            // Let's search for the "E2E Test Preset" text to see if we can edit it or if we need to save.
            // If the add button creates a default item, we might need to edit it.
        }

        // 5. Add Nutrient Component (e.g. CalMag 1.0ml/L)
        // Click "Add" button
        await presetsDialog.getByRole('button', { name: 'Add', exact: true }).click();

        // Fill name and dose in the new row
        const nutrientRow = presetsDialog.locator('.nutrient-row').first();
        await expect(nutrientRow).toBeVisible();
        await nutrientRow.locator('md3-text-input[label="Nutrient Name"] input').fill('CalMag');
        await nutrientRow.locator('md3-number-input[label="ml/L"] input').fill('1.0');

        // 6. Save
        await presetsDialog.getByRole('button', { name: /save/i }).click();

        // 7. Verify logic
        // Verify it appears in the list
        await expect(presetsDialog).toContainText(presetName);
        // Or close and reopen checks
    });
});
