import { test, expect } from '../coverage-helper';

test.describe('Maintenance Logbook', () => {
    test.beforeEach(async ({ coveragePage: page }) => {
        await page.goto('http://127.0.0.1:8123', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('growspace-manager-card').first()).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(3000); // Hydration wait
    });

    test('Log Manual Watering', async ({ coveragePage: page }) => {
        const card = page.locator('growspace-manager-card').first();

        // Open Menu
        const menuBtn = card.locator('growspace-header .menu-container .icon-button').first();
        // Use dispatchEvent for robust custom element clicking, or target internal logic
        await menuBtn.dispatchEvent('click', { bubbles: true, composed: true });

        // Click Water Growspace
        await card.locator('.menu-dropdown .menu-item').filter({ hasText: 'Water Growspace' }).click();

        // Wait for Dialog
        // The host element doesn't reflect 'open' attribute, but it renders ha-dialog when open.
        const waterDialog = card.locator('growspace-dialog-host watering-dialog ha-dialog').first();
        await expect(waterDialog).toHaveAttribute('open', '');

        // Fill details (assuming "Growspace" mode or specific plant selection)
        // If "Growspace" mode (default if opened from menu?), it waters all or asks?
        // Let's assume we just click "Record" for now to test the flow, or fill a required field.
        // Discovery showed: `button` with text "Record Watering".

        // Check for an input if present (e.g. pH or volume)
        // For now, try to just submit to verify connectivity.
        await waterDialog.getByRole('button', { name: /record/i }).click();

        // Verify toast or closing
        await expect(waterDialog).not.toBeVisible();
        await expect(card.locator('growspace-toast').getByText(/Watered|success/i)).toBeVisible();
    });
    // Skipping Training test for now as UI element was not definitively found and requires further exploration/mocking.
    // Ideally we would add it here once the trigger is confirmed.
});
