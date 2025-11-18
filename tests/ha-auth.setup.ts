import { test } from '@playwright/test';

test('authenticate to Home Assistant', async ({ page }) => {
    await page.goto('/');

    // Already logged in?
    if (await page.locator('home-assistant').isVisible({ timeout: 4000 }).catch(() => false)) {
        await page.context().storageState({ path: 'ha-auth.json' });
        return;
    }

    // Wait for login inputs
    await page.waitForSelector('input[name="username"]', { timeout: 15000 });

    await page.fill('input[name="username"]', process.env.HA_USER!);
    await page.fill('input[name="password"]', process.env.HA_PASS!);

    // Wait for mwc-button and click it
    await page.screenshot({ path: 'ha-login-debug.png', fullPage: true });
    await page.locator('body').evaluate((b) => b.innerHTML).then(html =>
        require('fs').writeFileSync('ha-login-debug.html', html)
    );
    // CLICK SHADOW DOM BUTTON
    await page.getByRole('button', { name: 'Log in' }).click();

    await page.waitForURL('**/lovelace/**', { timeout: 15000 });

    // Save login state
    await page.context().storageState({ path: 'ha-auth.json' });
});
