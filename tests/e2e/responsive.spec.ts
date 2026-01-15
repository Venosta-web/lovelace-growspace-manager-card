import { test, expect } from '../coverage-helper';

const VIEWPORTS = [
    { name: 'Desktop', width: 1920, height: 1080 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Mobile', width: 375, height: 667 },
];

test.describe('Responsive Design', () => {
    test.beforeEach(async ({ coveragePage: page }) => {
        // We'll set viewport in the test loop, or maybe here if provided?
        // Actually Playwright allows setViewportSize per test
    });

    for (const viewport of VIEWPORTS) {
        test(`Growspace Manager Card Layout - ${viewport.name}`, async ({ coveragePage: page }) => {
            // 1. Set Viewport
            await page.setViewportSize({ width: viewport.width, height: viewport.height });

            // 2. Navigate
            await page.goto('http://127.0.0.1:8123', { waitUntil: 'domcontentloaded' });

            // 3. Verify Card Presence
            const card = page.locator('growspace-manager-card').first();
            await expect(card).toBeVisible({ timeout: 15000 });

            // 4. Wait for hydration
            await page.waitForTimeout(2000);

            // 5. Check critical elements are visible
            // Header should be visible
            await expect(card.locator('growspace-header')).toBeVisible();

            // Menu button should be visible (on mobile it might be different, but typically it's always there)
            await expect(card.locator('.menu-container .icon-button').first()).toBeVisible();

            // Mobile-specific checks
            if (viewport.name === 'Mobile') {
                // Verify no horizontal scrolling on body? 
                // Or verify specific mobile layout adjustments if any 
                // For now, just ensure it renders without error
            }

            // Optional: Take screenshot for manual verification (commented out for CI speed unless needed)
            // await page.screenshot({ path: `test-results/responsive-${viewport.name.toLowerCase()}.png` });
        });
    }
});
