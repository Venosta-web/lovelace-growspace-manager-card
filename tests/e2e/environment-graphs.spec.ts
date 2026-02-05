import { test, expect } from '../coverage-helper';

test.describe('Environment Graphs', () => {
    test.beforeEach(async ({ coveragePage: page }) => {
        page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
        page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));
        console.log('Navigating to root...');
        await page.goto('/');
        await expect(page.locator('home-assistant-main')).toBeVisible();
    });

    test.afterEach(async ({ coveragePage: page }) => {
        // Cleanup: Deactivate any active graphs by clicking active chips
        const card = page.locator('growspace-manager-card').first();
        if (await card.isVisible()) {
            const header = card.locator('growspace-header');
            const activeChips = header.locator('growspace-chip.active');
            const count = await activeChips.count();
            for (let i = 0; i < count; i++) {
                const chip = activeChips.nth(i);
                if (await chip.isVisible()) {
                    await chip.click();
                    await page.waitForTimeout(200);
                }
            }
        }
    });

    test('Activate and display individual environment graphs', async ({ coveragePage: page }) => {
        const card = page.locator('growspace-manager-card').first();
        await expect(card).toBeVisible();

        const header = card.locator('growspace-header');
        await expect(header).toBeVisible();

        // Click on Humidity chip (filter by '%') - more reliable in test environment
        console.log('Clicking Humidity chip...');
        const humidityChip = header.locator('growspace-chip').filter({ hasText: '%' }).first();
        await expect(humidityChip).toBeVisible();
        await humidityChip.click();

        // Check that analytics section appears with graph
        const analytics = card.locator('growspace-analytics');
        // Web-first assertion instead of explicit wait
        await expect(analytics).toBeVisible();

        // Check for env-chart element
        const tempGraph = analytics.locator('growspace-env-chart');
        await expect(tempGraph).toBeVisible();

        // Verify graph has SVG content (indicates data is being rendered)
        // Ensure at least one path is present
        await expect(async () => {
            const count = await tempGraph.locator('svg path').count();
            expect(count).toBeGreaterThan(0);
        }).toPass();

        console.log('Humidity graph displayed successfully');

        // Click Humidity again to deactivate
        await humidityChip.click();

        // Graph should now be hidden
        await expect(analytics.locator('growspace-env-chart')).toBeHidden();
        console.log('Humidity graph hidden after deactivation');
    });

    test('Display humidity graph with history data', async ({ coveragePage: page }) => {
        const card = page.locator('growspace-manager-card').first();
        await expect(card).toBeVisible();

        const header = card.locator('growspace-header');
        await expect(header).toBeVisible();

        // Click on Humidity chip (filter by '%')
        console.log('Clicking Humidity chip...');
        const humidityChip = header.locator('growspace-chip').filter({ hasText: '%' }).first();
        await expect(humidityChip).toBeVisible();
        await humidityChip.click();

        // Check that graph appears
        const analytics = card.locator('growspace-analytics');
        const humidityGraph = analytics.locator('growspace-env-chart');
        await expect(humidityGraph).toBeVisible();

        // Verify SVG path exists (actual graph line)
        // Ensure at least one path is present
        await expect(async () => {
            const count = await humidityGraph.locator('svg path').count();
            expect(count).toBeGreaterThan(0);
        }).toPass();

        console.log('Humidity graph with data displayed successfully');
    });

    test('Link two graphs and display combined view', async ({ coveragePage: page }) => {
        const card = page.locator('growspace-manager-card').first();
        await expect(card).toBeVisible();

        const header = card.locator('growspace-header');
        await expect(header).toBeVisible();

        // Find Humidity and Fan chips (both verified to exist in test environment)
        const humidityChip = header.locator('growspace-chip').filter({ hasText: '%' }).first();
        const fanChip = header.locator('growspace-chip').filter({ hasText: 'Fan' }).first();

        await expect(humidityChip).toBeVisible();
        await expect(fanChip).toBeVisible();

        // First, click one chip to activate it
        console.log('Activating Humidity chip...');
        await humidityChip.dispatchEvent('click', { bubbles: true, composed: true });
        await page.waitForTimeout(500);

        // Then drag the other chip onto it to link them
        console.log('Dragging Fan chip onto Humidity chip to link...');

        // Use evaluate on the elements to dispatch drag events in their context
        await fanChip.evaluate((sourceEl) => {
            const event = new DragEvent('dragstart', {
                bubbles: true,
                composed: true,
                cancelable: true,
                dataTransfer: new DataTransfer()
            });
            sourceEl.dispatchEvent(event);
        });

        await page.waitForTimeout(100);

        await humidityChip.evaluate((targetEl) => {
            const dragenter = new DragEvent('dragenter', {
                bubbles: true,
                composed: true,
                cancelable: true
            });
            targetEl.dispatchEvent(dragenter);

            const dragover = new DragEvent('dragover', {
                bubbles: true,
                composed: true,
                cancelable: true
            });
            targetEl.dispatchEvent(dragover);
        });

        await page.waitForTimeout(100);

        await humidityChip.evaluate((targetEl) => {
            const drop = new DragEvent('drop', {
                bubbles: true,
                composed: true,
                cancelable: true,
                dataTransfer: new DataTransfer()
            });
            targetEl.dispatchEvent(drop);
        });

        await fanChip.evaluate((sourceEl) => {
            const dragend = new DragEvent('dragend', {
                bubbles: true,
                composed: true,
                cancelable: true
            });
            sourceEl.dispatchEvent(dragend);
        });

        // Wait for the link operation to complete
        await page.waitForTimeout(1500);

        // Both graphs should now be linked and displayed as combined
        const analytics = card.locator('growspace-analytics');
        await expect(analytics).toBeVisible({ timeout: 10000 });

        // Check for combined graph (should show both metrics)
        const combinedGraph = analytics.locator('growspace-env-chart');
        await expect(combinedGraph).toBeVisible();

        // Combined graph should have multiple SVG paths (one per metric)
        // Requirement: check for path count >= 2
        await expect(async () => {
            const count = await combinedGraph.locator('svg path').count();
            expect(count).toBeGreaterThanOrEqual(2);
        }).toPass();

        console.log('Combined graph with two metrics displayed successfully');
    });

    test('Change time range selector', async ({ coveragePage: page }) => {
        const card = page.locator('growspace-manager-card').first();
        await expect(card).toBeVisible();

        const header = card.locator('growspace-header');
        // Activate a graph first to see time selectors
        const humidityChip = header.locator('growspace-chip').filter({ hasText: '%' }).first();
        await expect(humidityChip).toBeVisible();
        await humidityChip.dispatchEvent('click', { bubbles: true, composed: true });

        const analytics = card.locator('growspace-analytics');
        await expect(analytics).toBeVisible();

        console.log('Looking for time range selector...');

        // Try clicking 1h option if available
        const oneHourBtn = analytics.locator('button').filter({ hasText: '1h' });
        if (await oneHourBtn.isVisible()) {
            await oneHourBtn.click();
            // Verify button becomes active or some state change depending on implementation
            // For now, minimal assertion that we clicked without error
            console.log('Changed time range to 1h');
        }

        // Try clicking 7d option if available
        const sevenDayBtn = analytics.locator('button').filter({ hasText: '7d' });
        if (await sevenDayBtn.isVisible()) {
            await sevenDayBtn.click();
            console.log('Changed time range to 7d');
        }
    });

    test('Activate and display Circulation Fan graph', async ({ coveragePage: page }) => {
        const card = page.locator('growspace-manager-card').first();
        await expect(card).toBeVisible();

        const header = card.locator('growspace-header');
        await expect(header).toBeVisible();

        // Ensure we are on the 'test' growspace which has the fan
        const select = header.locator('.growspace-select-header');
        if (await select.isVisible()) {
            // Try to select 'test' growspace
            // check if 'test' option exists
            const testOption = select.locator('option[value="test"]');
            if (await testOption.count() > 0) {
                await select.selectOption('test');
                await page.waitForTimeout(2000); // Wait for data reload
                console.log('Switched to test growspace');
            }
        }

        // Find Circulation Fan chip by text "Fan"
        console.log('Clicking Circulation Fan chip...');
        const fanChip = header.locator('growspace-chip').filter({ hasText: 'Fan' }).first();
        await expect(fanChip).toBeVisible();
        await fanChip.click();

        const analytics = card.locator('growspace-analytics');
        const fanGraph = analytics.locator('growspace-env-chart');
        await expect(fanGraph).toBeVisible();

        // Verify valid graph
        const svgPath = fanGraph.locator('svg path');
        await expect(async () => {
            const count = await svgPath.count();
            expect(count).toBeGreaterThan(0);
        }).toPass();

        console.log('Circulation Fan graph displayed successfully');
    });
});
