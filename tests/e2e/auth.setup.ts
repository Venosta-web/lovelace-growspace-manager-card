import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const authFile = path.join(__dirname, '../../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
    // 1. Navigate to Home Assistant
    await page.goto('http://localhost:8123');

    // 2. Check if we are on the onboarding page
    // Wait for redirects and load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give HA time to redirect to onboarding if needed

    const isOnboarding = page.url().includes('onboarding');

    if (isOnboarding) {
        console.log('Onboarding detected. Creating admin user...');

        // Step 1: Create Account
        // We are on /onboarding.html
        // Check if we need to click "Create my smart home" first
        const createHomeBtn = page.getByRole('button', { name: 'Create my smart home' });
        if (await createHomeBtn.isVisible()) {
            console.log('Clicking "Create my smart home"...');
            await createHomeBtn.click();
        }

        // Wait for the form
        await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 10000 });

        await page.fill('input[name="name"]', 'E2E User');
        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'password');
        await page.fill('input[name="password_confirm"]', 'password');

        await page.getByRole('button', { name: 'Create account' }).click();

        // Step 2+: Handle variable steps (Location, Analytics, Integrations)
        // We loop until we leave the onboarding page
        let attempts = 0;
        while (page.url().includes('onboarding') && attempts < 10) {
            attempts++;
            console.log(`Onboarding step ${attempts}, checking for buttons...`);
            await page.waitForTimeout(1000); // Wait for animations/transitions

            const nextBtn = page.getByRole('button', { name: 'Next' });
            const finishBtn = page.getByRole('button', { name: 'Finish' });
            const openBtn = page.getByRole('button', { name: 'Open Home Assistant' }); // Sometimes this
            const detectBtn = page.getByRole('button', { name: 'Detect' }); // Location step

            if (await finishBtn.isVisible()) {
                console.log('Clicking "Finish"...');
                await finishBtn.click();
            } else if (await openBtn.isVisible()) {
                console.log('Clicking "Open Home Assistant"...');
                await openBtn.click();
            } else if (await nextBtn.isVisible()) {
                console.log('Clicking "Next"...');
                await nextBtn.click();
            } else if (await detectBtn.isVisible()) {
                // Location detection specific
                console.log('Clicking "Detect"...');
                await detectBtn.click();
                await page.waitForTimeout(2000); // Wait for location detection
            } else {
                console.log('No obvious button found, waiting...');
                await page.waitForTimeout(2000);
            }
        }

        console.log('Onboarding complete (loop finished).');
    } else {
        console.log('No onboarding detected (URL does not contain "onboarding"). checking for login...');

        const isLogin = await page.locator('input[name="username"]').isVisible();
        if (isLogin) {
            console.log('Login screen detected. Logging in...');
            await page.fill('input[name="username"]', 'admin');
            await page.fill('input[name="password"]', 'password');
            await page.keyboard.press('Enter');

            // Wait for login to complete OR error
            console.log('Waiting for login response...');

            // Check for error message
            try {
                const errorMsg = page.locator('text=Invalid username or password');
                if (await errorMsg.isVisible({ timeout: 2000 })) {
                    throw new Error('Login failed: Invalid username or password');
                }
            } catch (e) {
                // Ignore timeout, just means no error visible
            }

            // Wait for main app element instead of specific URL which might change (e.g. loace/0 vs lovelace/default_view)
            try {
                await expect(page.locator('home-assistant-main')).toBeVisible({ timeout: 60000 });
                console.log('Login successful: home-assistant-main is visible');
            } catch (e) {
                console.error(`Login timed out. Current URL: ${page.url()}`);
                throw e;
            }
        }
    }
    console.log(`Onboarding complete using URL: ${page.url()}`);

    // Checks for login form in case we were logged out or redirect happened
    try {
        const isLogin = await page.locator('input[name="username"]').isVisible({ timeout: 5000 });
        if (isLogin) {
            console.log('Login screen detected after onboarding/initial check. Logging in...');
            await page.fill('input[name="username"]', 'admin');
            await page.fill('input[name="password"]', 'password');
            await page.keyboard.press('Enter');

            // Wait for login to complete
            try {
                await expect(page.locator('home-assistant-main')).toBeVisible({ timeout: 30000 });
                console.log('Login successful: home-assistant-main is visible');
            } catch (e) {
                console.log('Login might have failed or timed out waiting for main element');
            }
        }
    } catch (e) {
        // Ignore checks if timeout etc
    }

    try {
        await expect(page.locator('home-assistant-main')).toBeVisible({ timeout: 10000 });
    } catch (e) {
        console.log('Main element not found immediately. Navigating to home...');
        console.log(`Current URL: ${page.url()}`);
        await page.waitForTimeout(5000);
        if (page.url().startsWith('chrome-error://')) {
            console.log('Chrome error page detected. Forcing navigation to /');
            await page.goto('/', { timeout: 60000 });
        } else {
            try {
                await page.goto('/', { timeout: 60000 });
            } catch (e) {
                console.log('Retry navigation...');
                await page.waitForTimeout(5000);
                await page.goto('/', { timeout: 60000 });
            }
        }

        // Check for login again after recovery navigation
        const isLogin = await page.locator('input[name="username"]').isVisible({ timeout: 5000 });
        if (isLogin) {
            console.log('Login screen detected after recovery. Logging in...');
            await page.fill('input[name="username"]', 'admin');
            await page.fill('input[name="password"]', 'password');
            await page.keyboard.press('Enter');
        }

        await expect(page.locator('home-assistant-main')).toBeVisible({ timeout: 30000 });
    }

    // 3. Save storage state
    const authDir = path.dirname(authFile);
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }

    await page.context().storageState({ path: authFile });
});
