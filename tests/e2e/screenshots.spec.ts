import { test, expect } from '../coverage-helper';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.join(process.cwd(), 'assets', 'screenshots');

test.describe('Screenshots for README', () => {
    test.beforeAll(async () => {
        if (!fs.existsSync(SCREENSHOT_DIR)) {
            fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
        }
    });

    test.beforeEach(async ({ coveragePage: page }) => {
        await page.goto('http://127.0.0.1:8123', { waitUntil: 'networkidle' });
        await expect(page.locator('growspace-manager-card').first()).toBeVisible({ timeout: 20000 });
        await page.waitForTimeout(5000);
    });

    test('Capture Main Card View', async ({ coveragePage: page }) => {
        const card = page.locator('growspace-manager-card').first();
        await card.screenshot({ path: path.join(SCREENSHOT_DIR, 'main-card.png') });
    });

    test('Capture Plant Overview Dialog', async ({ coveragePage: page }) => {
        const card = page.locator('growspace-manager-card').first();

        let plantCard = card.locator('growspace-plant-card').filter({ hasNotText: /Empty/i }).first();
        if (await plantCard.count() === 0) {
            await card.locator('.plant-card-empty').first().dispatchEvent('click', { bubbles: true, composed: true });
            const addDialog = page.locator('ha-dialog[open]').first();
            await addDialog.locator('md3-select[label="Strain *"] select').first().selectOption({ index: 1 });
            await addDialog.locator('md3-text-input[label="Phenotype"] input').first().fill('SCREENSHOT-PHENO');
            await addDialog.getByRole('button', { name: /Add Plant/i }).dispatchEvent('click', { bubbles: true, composed: true });
            await page.waitForTimeout(3000);
            plantCard = card.locator('growspace-plant-card').filter({ hasNotText: /Empty/i }).first();
        }

        await plantCard.scrollIntoViewIfNeeded();
        await plantCard.locator('.plant-card-rich').first().dispatchEvent('click', { bubbles: true, composed: true });

        // Be extremely specific to avoid strict mode violation with other open dialogs
        const dialog = page.locator('plant-overview-dialog ha-dialog[open]').first();
        await expect(dialog).toBeVisible({ timeout: 20000 });
        await page.waitForTimeout(2000);

        await dialog.screenshot({ path: path.join(SCREENSHOT_DIR, 'plant-overview-tab.png') });

        const timelineTab = dialog.locator('.tab').filter({ hasText: /timeline/i }).first();
        await timelineTab.dispatchEvent('click', { bubbles: true, composed: true });
        await page.waitForTimeout(2000);

        await dialog.screenshot({ path: path.join(SCREENSHOT_DIR, 'plant-timeline-tab.png') });
    });

    test('Capture Strain Library', async ({ coveragePage: page }) => {
        const card = page.locator('growspace-manager-card').first();

        await card.locator('growspace-header .menu-container .icon-button').first().dispatchEvent('click', { bubbles: true, composed: true });
        await page.waitForTimeout(2000);

        // Use visible filter and first() to avoid strict mode
        const strainsMenuItem = page.locator('.menu-item:visible').filter({ hasText: /^Strains$/ }).first();
        await strainsMenuItem.dispatchEvent('click', { bubbles: true, composed: true });

        const strainLibrary = page.locator('strain-library-dialog').first();
        await expect(strainLibrary).toBeVisible({ timeout: 20000 });
        await page.waitForTimeout(3000);

        await strainLibrary.screenshot({ path: path.join(SCREENSHOT_DIR, 'strain-library.png') });
    });

    test('Capture Mobile View', async ({ coveragePage: page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(2000);

        const card = page.locator('growspace-manager-card').first();
        await card.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile-view.png') });
    });
});
