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
            await addDialog.getByRole('button', { name: /Add Plant/i }).last().dispatchEvent('click', { bubbles: true, composed: true });
            await page.waitForTimeout(3000);
            plantCard = card.locator('growspace-plant-card').filter({ hasNotText: /Empty/i }).first();
        }

        await plantCard.scrollIntoViewIfNeeded();
        await plantCard.locator('.plant-card-rich').first().dispatchEvent('click', { bubbles: true, composed: true });

        // Be extremely specific to avoid strict mode violation with other open dialogs
        const dialogHost = page.locator('plant-overview-dialog').first();
        await expect(dialogHost).toBeAttached({ timeout: 5000 });
        await page.waitForTimeout(1000); // Allow dialog animation to complete
        const dialog = dialogHost.locator('ha-dialog').first();
        await expect(dialog).toHaveAttribute('open', '', { timeout: 10000 });

        // Wait for dialog content to be visible before screenshot
        await expect(dialog.locator('md3-text-input, .detail-card').first()).toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(1000);

        // Take full page screenshot instead of element screenshot due to Shadow DOM visibility issues
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'plant-overview-tab.png'), fullPage: false });

        // Wait for timeline tab to be visible and clickable
        const timelineTab = dialog.locator('button, .tab').filter({ hasText: /timeline/i }).first();
        await expect(timelineTab).toBeVisible({ timeout: 5000 });
        await timelineTab.scrollIntoViewIfNeeded();
        await timelineTab.dispatchEvent('click', { bubbles: true, composed: true });
        await page.waitForTimeout(2000);

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'plant-timeline-tab.png'), fullPage: false });
    });

    test('Capture Strain Library', async ({ coveragePage: page }) => {
        const card = page.locator('growspace-manager-card').first();

        await card.locator('growspace-header .menu-container .icon-button').first().dispatchEvent('click', { bubbles: true, composed: true });
        await page.waitForTimeout(1000); // Wait for menu animation

        // Wait for menu to be visible and use card-scoped selector
        await expect(card.locator('.menu-dropdown')).toBeVisible({ timeout: 5000 });
        const strainsMenuItem = card.locator('.menu-dropdown .menu-item').filter({ hasText: /Strains/i }).first();
        await expect(strainsMenuItem).toBeVisible({ timeout: 5000 });
        await strainsMenuItem.scrollIntoViewIfNeeded();
        await strainsMenuItem.dispatchEvent('click', { bubbles: true, composed: true });

        const strainLibrary = page.locator('strain-library-dialog').first();
        await expect(strainLibrary).toBeAttached({ timeout: 5000 });
        const libraryDialog = strainLibrary.locator('ha-dialog').first();
        await expect(libraryDialog).toHaveAttribute('open', '', { timeout: 10000 });

        // Wait for dialog content to be visible
        await expect(libraryDialog.locator('.strain-card, input[placeholder*="Search"]').first()).toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(1000);

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'strain-library.png'), fullPage: false });
    });

    test('Capture Mobile View', async ({ coveragePage: page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(2000);

        const card = page.locator('growspace-manager-card').first();
        await card.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile-view.png') });
    });
});
