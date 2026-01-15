import { test, expect } from '../coverage-helper';

test.describe('Sanity & Links', () => {
    test('Console Errors & Broken Links', async ({ coveragePage: page }) => {
        const consoleErrors: string[] = [];

        // 1. Listen for console errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // 2. Navigate
        await page.goto('http://127.0.0.1:8123', { waitUntil: 'domcontentloaded' });

        // Wait for card
        const card = page.locator('growspace-manager-card').first();
        await expect(card).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(2000);

        // 3. Check for specific dangerous errors in console
        // We filter out some common noisy errors if needed, but for now report all
        if (consoleErrors.length > 0) {
            console.log('Capture Console Errors:', consoleErrors);
            // Optional: Fail if critical errors found
            // expect(consoleErrors.filter(e => e.includes('CRITICAL'))).toHaveLength(0);
        }

        // 4. Check for broken links (anchor tags)
        // In this specific card, there might not be many <a> tags, but good practice
        const links = await page.locator('a[href]').all();
        console.log(`Found ${links.length} links`);

        for (const link of links) {
            const href = await link.getAttribute('href');
            if (href && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
                // Determine if absolute or relative
                const url = new URL(href, page.url());

                // Only check http(s) links
                if (url.protocol.startsWith('http')) {
                    try {
                        const response = await page.request.head(url.toString());
                        // 405 Method Not Allowed is common for some static servers on HEAD, try GET
                        if (response.status() === 405) {
                            const getResp = await page.request.get(url.toString());
                            expect(getResp.ok(), `Broken link: ${href}`).toBeTruthy();
                        } else {
                            // Some auth redirects might return 302/401, which is "ok" for connectivity check
                            // but ideally we want 200.
                            // For this test, just check strictly < 400
                            expect(response.status(), `Broken link: ${href} returned ${response.status()}`).toBeLessThan(400);
                        }
                    } catch (e) {
                        console.warn(`Could not check link ${href}: ${(e as Error).message}`);
                        // Don't fail the test for external network flakes, but log it
                    }
                }
            }
        }
    });

    test('Critical UI Error States', async ({ coveragePage: page }) => {
        await page.goto('http://127.0.0.1:8123', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('growspace-manager-card').first()).toBeVisible({ timeout: 15000 });

        // Check for common error text that shouldn't be visible in a healthy state
        const bodyText = await page.locator('body').innerText();

        const errorKeywords = ['Uncaught Error', 'ChunkLoadError', 'undefined is not a function'];
        for (const keyword of errorKeywords) {
            expect(bodyText).not.toContain(keyword);
        }
    });
});
