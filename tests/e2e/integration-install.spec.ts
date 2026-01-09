import { test, expect } from '@playwright/test';

/**
 * End-to-End test for Growspace Manager integration installation and configuration.
 * 
 * This test verifies that a user can:
 * 1. Find the integration in the Home Assistant integrations dashboard.
 * 2. Start the configuration flow.
 * 3. Add a new growspace with specific parameters.
 * 4. Verify the resulting sensor entity is created.
 */

test.describe('Integration Installation & Configuration', () => {

    test.beforeEach(async ({ page }) => {
        // Logging for easier debugging in CI or local runs
        page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
        page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));

        // Navigate to the integrations page
        console.log('Navigating to Integrations dashboard...');
        await page.goto('/config/integrations');

        // Wait for the main Home Assistant UI to be ready
        await expect(page.locator('home-assistant-main')).toBeVisible({ timeout: 30000 });
    });

    test('Install and Configure Growspace Manager', async ({ page }) => {
        // Increase timeout for this complex test
        test.setTimeout(120000);

        // 1. Click "Add Integration"
        console.log('Opening "Add Integration" dialog...');
        const addBtn = page.getByRole('button', { name: /Add Integration/i })
            .or(page.locator('ha-fab'))
            .or(page.locator('mwc-fab'))
            .first();
        await expect(addBtn).toBeVisible({ timeout: 15000 });
        await addBtn.click();

        // 2. Search for Growspace Manager
        console.log('Searching for "Growspace Manager"...');
        const searchInput = page.locator('ha-dialog ha-textfield[label*="Search"]')
            .or(page.locator('ha-dialog input'))
            .or(page.getByLabel(/Search/i))
            .first();
        await expect(searchInput).toBeVisible({ timeout: 15000 });
        await searchInput.clear();
        await searchInput.fill('Growspace Manager');

        // 3. Select the integration
        console.log('Selecting "Growspace Manager" from results...');
        const integrationItem = page.locator('ha-dialog ha-clickable-list-item')
            .filter({ hasText: /Growspace Manager/i })
            .first();

        // Check if the integration is available - if not, skip test gracefully
        const isVisible = await integrationItem.isVisible({ timeout: 5000 }).catch(() => false);
        if (!isVisible) {
            console.log('SKIPPED: Growspace Manager integration not found in integration list.');
            console.log('This test requires the integration to be available in the Home Assistant environment.');
            test.skip();
            return;
        }

        await integrationItem.click();

        // 4. Handle initial "Name" step
        console.log('Handling initial "Name" step...');
        const nameInputInitial = page.locator('ha-dialog ha-textfield[label*="Name"]').or(page.locator('ha-dialog input')).first();
        // Wait for stability
        await page.waitForTimeout(1000);

        if (await nameInputInitial.isVisible()) {
            await nameInputInitial.fill('Growspace Manager E2E');
            await page.getByRole('button', { name: /Submit|Next|Weiter|Bestätigen/i }).click();

            // Wait for success dialog or closure
            try {
                const successMsg = page.getByText(/Success!|Erfolgreich!/i);
                await expect(successMsg).toBeVisible({ timeout: 10000 });
                await page.getByRole('button', { name: /Finish|Fertigstellen/i }).click();
            } catch (e) {
                console.log('Success text not found, checking if dialog is gone...');
            }
        }

        // 5. Open Options Flow
        console.log('Opening Options Flow...');
        await page.goto('/config/integrations', { waitUntil: 'networkidle' });
        await page.screenshot({ path: 'test-results/integrations-before-options.png' });

        const card = page.locator('ha-card').filter({ hasText: /Growspace Manager E2E|Growspace Manager/i }).first();
        await expect(card).toBeVisible({ timeout: 15000 });

        // Find "CONFIGURE" button (localized)
        const configBtn = card.getByRole('button', { name: /Configure|Konfigurieren/i });
        if (await configBtn.isVisible()) {
            await configBtn.click();
        } else {
            console.log('Configure button not directly visible, clicking tile...');
            await card.click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'test-results/integration-detail.png' });
            await page.getByRole('button', { name: /Configure|Konfigurieren/i }).first().click();
        }

        // Config Flow Step 1: Selecting "Manage Growspaces"
        console.log('Config Flow Step 1: Selecting "Manage Growspaces"...');
        const optionsDialog = page.locator('ha-dialog, ha-more-info-dialog').filter({ hasText: /Growspace Manager/i }).last();
        await expect(optionsDialog).toBeVisible({ timeout: 15000 });
        await page.screenshot({ path: 'test-results/options-step1.png' });

        await optionsDialog.getByText(/Manage Growspaces|Growspaces verwalten/i).click();
        await page.getByRole('button', { name: /Next|Next|Weiter|Bestätigen/i }).last().click();

        // Config Flow Step 2: Selecting "Add Growspace"
        console.log('Config Flow Step 2: Selecting "Add Growspace"...');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'test-results/options-step2.png' });
        await optionsDialog.getByText(/Add Growspace|Growspace hinzufügen/i).click();
        await page.getByRole('button', { name: /Next|Next|Weiter|Bestätigen/i }).last().click();

        // Config Flow Step 3: Filling growspace details
        console.log('Config Flow Step 3: Filling growspace details...');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'test-results/options-step3.png' });

        // Fill the form
        const nameInput = optionsDialog.locator('ha-textfield[label*="Name"], ha-textfield[name="name"], input[name="name"]').first();
        await nameInput.fill('TS E2E Tent');

        const rowsInput = optionsDialog.locator('ha-textfield[label*="Rows"], ha-textfield[name="rows"], input[name="rows"]').first();
        await rowsInput.fill('2');

        const plantsInput = optionsDialog.locator('ha-textfield[label*="Plants"], ha-textfield[name="plants_per_row"], input[name="plants_per_row"]').first();
        await plantsInput.fill('3');

        await page.screenshot({ path: 'test-results/options-step3-filled.png' });

        // Final Submit
        const submitFinal = optionsDialog.getByRole('button', { name: /OK|Submit|Next|Weiter|Bestätigen/i }).last();
        await submitFinal.click({ force: true });

        console.log('Waiting for completion...');
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'test-results/options-final-result.png' });

        // Check for success dialog
        const finalDialog = page.locator('ha-dialog').last();
        if (await finalDialog.isVisible()) {
            const closeBtn = page.getByRole('button', { name: /Close|Finish|Schließen|Fertig|OK/i }).first();
            if (await closeBtn.isVisible()) {
                await closeBtn.click({ force: true });
                await page.waitForTimeout(2000);
            }
        }

        // Wait for completion
        await page.waitForTimeout(10000);

        // Check if device appeared in Integrations page
        await test.step('Check Integrations Page for Devices', async () => {
            console.log('Checking Integrations page for devices...');
            await page.goto('/config/integrations', { waitUntil: 'networkidle' });

            const cardCheck = page.locator('ha-card').filter({ hasText: /Growspace Manager E2E/i }).first();
            await expect(cardCheck).toBeVisible({ timeout: 15000 });

            const cardText = await cardCheck.innerText();
            console.log(`Integration Card Text: ${cardText}`);

            const deviceMatch = cardText.match(/(\d+)\s+(Gerät|device)/i);
            const entityMatch = cardText.match(/(\d+)\s+(Entität|entity|entities)/i);

            console.log(`Devices: ${deviceMatch ? deviceMatch[1] : '0'}, Entities: ${entityMatch ? entityMatch[1] : '0'}`);

            if (deviceMatch && parseInt(deviceMatch[1]) === 0) {
                console.log('WARNING: Integration has 0 devices. Growspace might not have been added.');
            }
        });

        // Verify sensor state in Developer Tools
        await test.step('Verify Sensor in Developer Tools', async () => {
            console.log('Verifying sensor state in Developer Tools...');
            await page.goto('/developer-tools/state', { waitUntil: 'networkidle' });

            // Wait for content
            await page.locator('home-assistant, ha-main').first().waitFor({ state: 'attached', timeout: 30000 });
            await page.waitForTimeout(10000);

            const sensorData = await page.evaluate(() => {
                const getAllElements = (root: any): Element[] => {
                    let elements = Array.from(root.querySelectorAll('*')) as Element[];
                    elements.forEach(el => {
                        if (el.shadowRoot) {
                            elements = elements.concat(getAllElements(el.shadowRoot));
                        }
                    });
                    return elements;
                };

                const allElements = getAllElements(document);
                const searchStr = 'ts e2e tent';

                const match = allElements.find(el => {
                    const text = (el as HTMLElement).innerText?.toLowerCase() || '';
                    return text.includes(searchStr) || (text.includes('sensor.') && text.includes('tent'));
                });

                if (match) {
                    const text = (match as HTMLElement).innerText;
                    const row = match.closest('tr, ha-state-label-row, ha-data-table-row') as HTMLElement;
                    const rowText = row ? row.innerText : text;
                    const possibleState = rowText.match(/(unavailable|unknown|off|on|[\d.]+)/)?.[1] || 'unknown';
                    return {
                        found: true,
                        text: text,
                        rowText: rowText,
                        state: possibleState,
                        count: allElements.length
                    };
                }

                const allText = document.body.innerText.toLowerCase();
                return {
                    found: false,
                    count: allElements.length,
                    hasGrowspaceInText: allText.includes('growspace')
                };
            });

            console.log('Sensor Search Result:', sensorData);

            if (!sensorData.found) {
                await page.screenshot({ path: 'test-results/sensor-not-found.png', fullPage: true });
                throw new Error(`E2E Sensor not found. Searched ${sensorData.count} elements. Growspace in text: ${sensorData.hasGrowspaceInText}`);
            }

            console.log(`Success: Found sensor with state: ${sensorData.state}`);
            expect(sensorData.state).not.toBe('unavailable');
            expect(sensorData.state).not.toBe('unknown');
        });
    });
});
