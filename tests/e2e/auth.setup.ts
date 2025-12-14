import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const authFile = path.join(__dirname, '../../.auth/user.json');

setup('authenticate', async ({ page }) => {
    // 1. Navigate
    await page.goto('http://127.0.0.1:8123');

    // 2. Intelligent Wait: Race between Login and Onboarding
    console.log('Waiting for Login or Onboarding...');
    // We wait for EITHER the username input OR the onboarding header/buttons
    const loginInput = page.locator('input[name="username"]');
    const createHomeBtn = page.getByRole('button', { name: 'Create my smart home' });
    const onboardingStep = page.locator('onboarding-welcome-link, .onboarding-step');

    // Wait up to 10s for the app to settle on one of these states
    await expect(async () => {
        const isLogin = await loginInput.isVisible();
        const isOnboarding = await createHomeBtn.isVisible() || page.url().includes('onboarding');
        console.log(`Check state: Login = ${isLogin}, Onboarding = ${isOnboarding}, URL = ${page.url()} `);
        expect(isLogin || isOnboarding).toBeTruthy();
    }).toPass({ timeout: 15000 });

    if (page.url().includes('onboarding')) {
        console.log('Onboarding flow detected...');

        // Click Start if visible
        if (await createHomeBtn.isVisible()) {
            console.log('Clicking "Create my smart home"...');
            await createHomeBtn.click();
        }

        // Fill User Data
        // Playwright will auto-wait for this input to appear, no need for sleep
        console.log('Filling user data...');
        await page.fill('input[name="name"]', 'E2E User');
        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'password');
        await page.fill('input[name="password_confirm"]', 'password');
        await page.getByRole('button', { name: 'Create account' }).click();

        // Rapidly handle the "Next" wizard steps
        // We use a simpler loop that breaks immediately when we leave onboarding
        console.log('Handling wizard steps...');
        while (page.url().includes('onboarding')) {
            // Check for any of the progression buttons
            const buttons = page.getByRole('button').filter({ hasText: /Next|Finish|Open Home Assistant|Detect/ });

            const count = await buttons.count();
            if (count > 0 && await buttons.first().isVisible()) {
                const text = await buttons.first().innerText();
                console.log(`Clicking wizard button: ${text} `);
                await buttons.first().click();
                // specific wait for location detection if we clicked "Detect"
                // otherwise just a small tick to let the UI update
                await page.waitForTimeout(500);
            } else {
                // If no button is visible yet, wait briefly before checking again
                // to avoid slamming the CPU, but keep it tight.
                console.log('Waiting for wizard button...');
                await page.waitForTimeout(500);
            }
        }
    }

    // Login Flow (or re-login after onboarding)
    // Check if we are dropped back to login screen
    console.log('Checking for login screen...');
    if (await loginInput.isVisible()) {
        console.log('Logging in...');
        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'password');
        await page.keyboard.press('Enter');
    }

    // 3. Final Verification
    // Give HA plenty of time to load the dashboard (it can be slow on first boot)
    // Do NOT reload; just wait.
    await expect(page.locator('home-assistant-main')).toBeVisible({ timeout: 30000 });

    // 4. Save Storage
    const authDir = path.dirname(authFile);
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }
    await page.context().storageState({ path: authFile });
});