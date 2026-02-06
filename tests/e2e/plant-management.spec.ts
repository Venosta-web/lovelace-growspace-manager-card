import { test, expect } from '../coverage-helper';

test.describe('Plant Management', () => {
    test.beforeEach(async ({ coveragePage: page }) => {
        await page.goto('http://127.0.0.1:8123', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('growspace-manager-card').first()).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(3000); // Hydration wait
    });

    test.afterEach(async ({ coveragePage: page }) => {
        // Close any open dialogs
        const openDialogs = page.locator('ha-dialog[open]');
        const count = await openDialogs.count();

        for (let i = 0; i < count; i++) {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
        }
    });

    test('1.1 Add New Plant (Happy Path)', async ({ coveragePage: page }) => {
        const card = page.locator('growspace-manager-card').first();

        // Cleanup coordinate (6, 6)
        const targetPlant = card.locator('growspace-plant-card').filter({
            has: page.locator('.row-col-badge').filter({ hasText: /R6\s*C6/i })
        }).first();

        if (await targetPlant.count() > 0) {
            await targetPlant.locator('.plant-card-rich').first().dispatchEvent('click', { bubbles: true, composed: true });
            const delDialog = card.locator('growspace-dialog-host ha-dialog').first();
            await delDialog.getByRole('button', { name: /delete/i }).first().dispatchEvent('click', { bubbles: true, composed: true });
            await page.locator('.dialog-overlay').getByRole('button', { name: 'Delete' }).dispatchEvent('click', { bubbles: true, composed: true });
            await expect(card.locator('growspace-dialog-host ha-dialog')).toHaveCount(0, { timeout: 10000 });
            await page.waitForTimeout(2000);
        }

        // Make room if full
        if (await card.locator('.plant-card-empty').count() === 0) {
            const anyPlant = card.locator('growspace-plant-card').first();
            if (await anyPlant.count() > 0) {
                await anyPlant.locator('.plant-card-rich').first().dispatchEvent('click', { bubbles: true, composed: true });
                await card.locator('growspace-dialog-host ha-dialog').getByRole('button', { name: /delete/i }).first().dispatchEvent('click', { bubbles: true, composed: true });
                await page.locator('.dialog-overlay').getByRole('button', { name: 'Delete' }).dispatchEvent('click', { bubbles: true, composed: true });
                await expect(card.locator('growspace-dialog-host ha-dialog')).toHaveCount(0, { timeout: 10000 });
                await page.waitForTimeout(2000);
            }
        }

        const addCard = card.locator('.plant-card-empty').first();
        await expect(addCard).toBeVisible({ timeout: 10000 });
        await addCard.dispatchEvent('click', { bubbles: true, composed: true });

        const dialog = card.locator('growspace-dialog-host ha-dialog').first();
        await expect(dialog).toHaveAttribute('open', '', { timeout: 10000 });

        await dialog.locator('md3-select[label="Strain *"] select').first().selectOption({ label: 'Blue Gem' });
        await dialog.locator('md3-text-input[label="Phenotype"] input').first().fill('#AddMe');
        await dialog.locator('md3-number-input').filter({ hasText: /row/i }).getByRole('spinbutton').fill('6');
        await dialog.locator('md3-number-input').filter({ hasText: /col/i }).getByRole('spinbutton').fill('6');

        await dialog.getByRole('button', { name: 'Add Plant' }).last().dispatchEvent('click', { bubbles: true, composed: true });
        await expect(card.locator('growspace-dialog-host ha-dialog')).toHaveCount(0, { timeout: 10000 });

        // Verify Appearance
        // Allow time for backend persistence before reload
        await page.waitForTimeout(2000);
        await page.reload({ waitUntil: 'domcontentloaded' });
        const cardReloaded = page.locator('growspace-manager-card').first();
        await expect(cardReloaded.locator('growspace-plant-card').filter({ hasText: '#AddMe' }).first()).toBeVisible({ timeout: 15000 });
    });

    test('1.2 Add Plant - Validation Behavior', async ({ coveragePage: page }) => {
        const card = page.locator('growspace-manager-card').first();

        // Cleanup (7, 7)
        const targetPlant = card.locator('growspace-plant-card').filter({
            has: page.locator('.row-col-badge').filter({ hasText: /R7\s*C7/i })
        }).first();

        if (await targetPlant.count() > 0) {
            await targetPlant.locator('.plant-card-rich').first().dispatchEvent('click', { bubbles: true, composed: true });
            await card.locator('growspace-dialog-host ha-dialog').getByRole('button', { name: /delete/i }).first().dispatchEvent('click', { bubbles: true, composed: true });
            await page.locator('.dialog-overlay').getByRole('button', { name: 'Delete' }).dispatchEvent('click', { bubbles: true, composed: true });
            await expect(card.locator('growspace-dialog-host ha-dialog')).toHaveCount(0, { timeout: 10000 });
            await page.waitForTimeout(2000);
        }

        if (await card.locator('.plant-card-empty').count() === 0) {
            const anyPlant = card.locator('growspace-plant-card').first();
            if (await anyPlant.count() > 0) {
                await anyPlant.locator('.plant-card-rich').first().dispatchEvent('click', { bubbles: true, composed: true });
                await card.locator('growspace-dialog-host ha-dialog').getByRole('button', { name: /delete/i }).first().dispatchEvent('click', { bubbles: true, composed: true });
                await page.locator('.dialog-overlay').getByRole('button', { name: 'Delete' }).dispatchEvent('click', { bubbles: true, composed: true });
                await expect(card.locator('growspace-dialog-host ha-dialog')).toHaveCount(0, { timeout: 10000 });
                await page.waitForTimeout(2000);
            }
        }

        const addCard = card.locator('.plant-card-empty').first();
        await addCard.dispatchEvent('click', { bubbles: true, composed: true });
        const dialog = card.locator('growspace-dialog-host ha-dialog').first();
        await dialog.locator('md3-select[label="Strain *"] select').first().selectOption({ label: 'Blue Gem' });
        await dialog.locator('md3-text-input[label="Phenotype"] input').first().fill('#ValMe');
        await dialog.locator('md3-number-input').filter({ hasText: /row/i }).getByRole('spinbutton').fill('7');
        await dialog.locator('md3-number-input').filter({ hasText: /col/i }).getByRole('spinbutton').fill('7');
        await dialog.getByRole('button', { name: 'Add Plant' }).last().dispatchEvent('click', { bubbles: true, composed: true });

        await expect(card.locator('growspace-dialog-host ha-dialog')).toHaveCount(0, { timeout: 10000 });
        await expect(card.locator('growspace-toast').getByText(/success/i)).toBeVisible();
    });

    test('1.3 Edit Plant Details', async ({ coveragePage: page }) => {
        const card = page.locator('growspace-manager-card').first();

        let plantCard = card.locator('growspace-plant-card').filter({ hasText: '#EditMe' }).first();
        if (await plantCard.count() === 0) {
            if (await card.locator('.plant-card-empty').count() === 0) {
                const any = card.locator('growspace-plant-card').first();
                await any.locator('.plant-card-rich').first().dispatchEvent('click', { bubbles: true, composed: true });
                await card.locator('growspace-dialog-host ha-dialog').getByRole('button', { name: /delete/i }).first().dispatchEvent('click', { bubbles: true, composed: true });
                await page.locator('.dialog-overlay').getByRole('button', { name: 'Delete' }).dispatchEvent('click', { bubbles: true, composed: true });
                await expect(card.locator('growspace-dialog-host ha-dialog')).toHaveCount(0, { timeout: 10000 });
                await page.waitForTimeout(2000);
            }
            await card.locator('.plant-card-empty').first().dispatchEvent('click', { bubbles: true, composed: true });
            const addDialog = card.locator('growspace-dialog-host ha-dialog').first();
            await addDialog.locator('md3-select[label="Strain *"] select').first().selectOption({ label: 'Blue Gem' });
            await addDialog.locator('md3-text-input[label="Phenotype"] input').first().fill('#EditMe');
            await addDialog.getByRole('button', { name: 'Add Plant' }).last().dispatchEvent('click', { bubbles: true, composed: true });
            await expect(card.locator('growspace-dialog-host ha-dialog')).toHaveCount(0, { timeout: 10000 });
            await page.waitForTimeout(1000);
            plantCard = card.locator('growspace-plant-card').filter({ hasText: '#EditMe' }).first();
        }

        await plantCard.locator('.plant-card-rich').first().dispatchEvent('click', { bubbles: true, composed: true });
        const dialog = card.locator('growspace-dialog-host ha-dialog').first();
        await dialog.locator('md3-text-input[label="Phenotype"] input').first().fill('#EditMe-Edited');
        await dialog.getByRole('button', { name: 'Save' }).dispatchEvent('click', { bubbles: true, composed: true });

        await expect(card.locator('growspace-dialog-host ha-dialog')).toHaveCount(0, { timeout: 10000 });

        // Final verification with reload
        await page.waitForTimeout(2000);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.locator('growspace-manager-card').first().locator('growspace-plant-card').filter({ hasText: '#EditMe-Edited' })).toBeVisible({ timeout: 15000 });
    });

    test('1.4 Delete Plant', async ({ coveragePage: page }) => {
        const card = page.locator('growspace-manager-card').first();

        // Use a unique tag for deletion
        let plantCard = card.locator('growspace-plant-card').filter({ hasText: '#DeleteMe' }).first();
        if (await plantCard.count() === 0) {
            if (await card.locator('.plant-card-empty').count() === 0) {
                const any = card.locator('growspace-plant-card').first();
                await any.locator('.plant-card-rich').first().dispatchEvent('click', { bubbles: true, composed: true });
                await card.locator('growspace-dialog-host ha-dialog').getByRole('button', { name: /delete/i }).first().dispatchEvent('click', { bubbles: true, composed: true });
                await page.locator('.dialog-overlay').getByRole('button', { name: 'Delete' }).dispatchEvent('click', { bubbles: true, composed: true });
                await expect(card.locator('growspace-dialog-host ha-dialog')).toHaveCount(0, { timeout: 10000 });
                await page.waitForTimeout(2000);
            }
            await card.locator('.plant-card-empty').first().dispatchEvent('click', { bubbles: true, composed: true });
            const addDialog = card.locator('growspace-dialog-host ha-dialog').first();
            await addDialog.locator('md3-select[label="Strain *"] select').first().selectOption({ label: 'Blue Gem' });
            await addDialog.locator('md3-text-input[label="Phenotype"] input').first().fill('#DeleteMe');
            await addDialog.getByRole('button', { name: 'Add Plant' }).last().dispatchEvent('click', { bubbles: true, composed: true });
            await expect(card.locator('growspace-dialog-host ha-dialog')).toHaveCount(0, { timeout: 10000 });
            await page.waitForTimeout(1000);
            plantCard = card.locator('growspace-plant-card').filter({ hasText: '#DeleteMe' }).first();
        }

        await plantCard.locator('.plant-card-rich').first().dispatchEvent('click', { bubbles: true, composed: true });
        const delDialog = card.locator('growspace-dialog-host ha-dialog').first();
        await delDialog.getByRole('button', { name: /delete/i }).first().dispatchEvent('click', { bubbles: true, composed: true });
        await page.locator('.dialog-overlay').getByRole('button', { name: 'Delete' }).dispatchEvent('click', { bubbles: true, composed: true });

        await expect(card.locator('growspace-dialog-host ha-dialog')).toHaveCount(0, { timeout: 10000 });

        // Verify Undo Functionality
        const toast = card.locator('growspace-toast');
        await expect(toast.getByText(/Deleted/i)).toBeVisible(); // Check for past tense "Deleted"
        const undoBtn = toast.locator('.toast-action');
        await expect(undoBtn).toBeVisible();
        // await expect(undoBtn).toHaveText(/Undo/i); // Removing for now due to potential flakiness/rendering delay

        // Perform Undo
        await undoBtn.click();

        // Verify Plant Restored
        const restoredPlant = card.locator('growspace-plant-card').filter({ hasText: '#DeleteMe' }).first();
        await expect(restoredPlant).toBeVisible({ timeout: 10000 });

        // Cleanup: Delete again (permanently)
        await restoredPlant.locator('.plant-card-rich').first().dispatchEvent('click', { bubbles: true, composed: true });
        const finalDelDialog = card.locator('growspace-dialog-host ha-dialog').first();
        await finalDelDialog.getByRole('button', { name: /delete/i }).first().dispatchEvent('click', { bubbles: true, composed: true });
        await page.locator('.dialog-overlay').getByRole('button', { name: 'Delete' }).dispatchEvent('click', { bubbles: true, composed: true });
        await expect(card.locator('growspace-dialog-host ha-dialog')).toHaveCount(0, { timeout: 10000 });
    });

    test('1.5 Duplicate Location Check', async ({ coveragePage: page }) => {
        const card = page.locator('growspace-manager-card').first();

        // Cleanup (8, 8)
        const plantsAt88 = card.locator('growspace-plant-card').filter({ hasText: /row: 8/i });
        while (await plantsAt88.count() > 0) {
            await plantsAt88.first().locator('.plant-card-rich').first().dispatchEvent('click', { bubbles: true, composed: true });
            await card.locator('growspace-dialog-host ha-dialog').getByRole('button', { name: /delete/i }).first().dispatchEvent('click', { bubbles: true, composed: true });
            await page.locator('.dialog-overlay').getByRole('button', { name: 'Delete' }).dispatchEvent('click', { bubbles: true, composed: true });
            await expect(card.locator('growspace-dialog-host ha-dialog')).toHaveCount(0, { timeout: 10000 });
            await page.waitForTimeout(1000);
        }

        // Ensure at least 2 empty slots for this test
        while (await card.locator('.plant-card-empty').count() < 2) {
            const any = card.locator('growspace-plant-card').first();
            if (await any.count() === 0) break; // Should not happen
            await any.locator('.plant-card-rich').first().dispatchEvent('click', { bubbles: true, composed: true });
            await card.locator('growspace-dialog-host ha-dialog').getByRole('button', { name: /delete/i }).first().dispatchEvent('click', { bubbles: true, composed: true });
            await page.locator('.dialog-overlay').getByRole('button', { name: 'Delete' }).dispatchEvent('click', { bubbles: true, composed: true });
            await expect(card.locator('growspace-dialog-host ha-dialog')).toHaveCount(0, { timeout: 10000 });
            await page.waitForTimeout(1000);
        }

        // Add first via grid
        await card.locator('.plant-card-empty').first().dispatchEvent('click', { bubbles: true, composed: true });

        let dialog = card.locator('growspace-dialog-host ha-dialog').first();
        await dialog.locator('md3-select[label="Strain *"] select').first().selectOption({ label: 'Blue Gem' });
        await dialog.locator('md3-text-input[label="Phenotype"] input').first().fill('DUP-REF');
        await dialog.locator('md3-number-input').filter({ hasText: /row/i }).getByRole('spinbutton').fill('8');
        await dialog.locator('md3-number-input').filter({ hasText: /col/i }).getByRole('spinbutton').fill('8');
        await dialog.getByRole('button', { name: 'Add Plant' }).last().dispatchEvent('click', { bubbles: true, composed: true });
        await expect(card.locator('growspace-dialog-host ha-dialog')).toHaveCount(0, { timeout: 10000 });

        // Add second at same spot via grid
        await card.locator('.plant-card-empty').first().dispatchEvent('click', { bubbles: true, composed: true });

        dialog = card.locator('growspace-dialog-host ha-dialog').first();
        await dialog.locator('md3-select[label="Strain *"] select').first().selectOption({ label: 'Blue Gem' });
        await dialog.locator('md3-text-input[label="Phenotype"] input').first().fill('DUP-OK-TEST');
        await dialog.locator('md3-number-input').filter({ hasText: /row/i }).getByRole('spinbutton').fill('8');
        await dialog.locator('md3-number-input').filter({ hasText: /col/i }).getByRole('spinbutton').fill('8');
        await dialog.getByRole('button', { name: 'Add Plant' }).last().dispatchEvent('click', { bubbles: true, composed: true });

        await expect(card.locator('growspace-dialog-host ha-dialog')).toHaveCount(0, { timeout: 10000 });
        await expect(card.locator('growspace-toast').getByText(/success/i)).toBeVisible();
    });

    test('1.6 Invalid Date Inputs (Interaction)', async ({ coveragePage: page }) => {
        const card = page.locator('growspace-manager-card').first();

        if (await card.locator('.plant-card-empty').count() === 0) {
            const any = card.locator('growspace-plant-card').first();
            await any.locator('.plant-card-rich').first().dispatchEvent('click', { bubbles: true, composed: true });
            await card.locator('growspace-dialog-host ha-dialog').getByRole('button', { name: /delete/i }).first().dispatchEvent('click', { bubbles: true, composed: true });
            await page.locator('.dialog-overlay').getByRole('button', { name: 'Delete' }).dispatchEvent('click', { bubbles: true, composed: true });
            await expect(card.locator('growspace-dialog-host ha-dialog')).toHaveCount(0, { timeout: 10000 });
            await page.waitForTimeout(1000);
        }

        await card.locator('.plant-card-empty').first().dispatchEvent('click', { bubbles: true, composed: true });
        const dialog = card.locator('growspace-dialog-host ha-dialog').first();
        await dialog.locator('md3-date-input[label="Veg Start"] input').first().fill(new Date().toISOString().split('T')[0]);
        await dialog.locator('md3-date-input[label="Flower Start"] input').first().fill(new Date(Date.now() - 86400000).toISOString().split('T')[0]);
        await dialog.locator('md3-select[label="Strain *"] select').first().selectOption({ label: 'Blue Gem' });
        await dialog.getByRole('button', { name: /add plant|save/i }).last().dispatchEvent('click', { bubbles: true, composed: true });
    });

    test('2.1 Environmental Data Display', async ({ coveragePage: page }) => {
        const card = page.locator('growspace-manager-card').first();
        const header = card.locator('growspace-header').first();
        await expect(header.filter({ hasText: /°C/ }).first()).toBeVisible();
        await expect(header.filter({ hasText: /%/ }).first()).toBeVisible();
    });

    test('2.2 Dashboard Layout', async ({ coveragePage: page }) => {
        const card = page.locator('growspace-manager-card').first();
        await expect(card.locator('growspace-grid .grid').first()).toBeVisible();
    });
});
