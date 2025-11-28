import { test, expect } from '@playwright/test';
import { createMockHass } from './mocks/hass';

test.describe('Graph Time Ranges', () => {

    test.beforeEach(async ({ page }) => {
        // Capture browser console logs for debugging
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
        await page.goto('/');
    });

    test('time range selector visibility and functionality', async ({ page }) => {
        const card = page.locator('growspace-manager-card');

        // Setup mock history data control
        // renderEnvGraph expects history of optimal_conditions sensor, which should have attributes for temp/hum etc.
        let historyData: any[] = [
            {
                last_changed: new Date().toISOString(),
                state: 'on',
                attributes: { temperature: 25.0, humidity: 60, vpd: 1.2, co2: 800 }
            }
        ];

        await page.exposeFunction('mockGetHistory', (url: string) => {
            // Parse URL to verify range if needed, for now just return current mock data
            return [historyData]; // API returns array of arrays
        });

        const mockHass = createMockHass();

        // Add environmental attributes to optimal conditions sensor to ensure chips render
        const optimalId = 'binary_sensor.4x4_tent_optimal_conditions';
        if (mockHass.states[optimalId]) {
            Object.assign(mockHass.states[optimalId].attributes, {
                temperature: 25.0,
                humidity: 60,
                vpd: 1.2,
                co2: 800
            });
        }

        const hassData = JSON.parse(JSON.stringify(mockHass));

        await card.evaluate((node: any, { config, hassData }) => {
            node.setConfig(config);
            node.hass = {
                ...hassData,
                callService: async () => Promise.resolve(),
                callApi: async (method: string, url: string) => {
                    return (window as any).mockGetHistory(url);
                },
                connection: { subscribeEvents: () => () => { }, sendMessagePromise: () => Promise.resolve() },
                localize: (key: string) => `[${key}]`,
            };
        }, { config: { type: 'custom:growspace-manager-card', entity: 'sensor.4x4_tent' }, hassData });

        // 1. Verify selector is initially hidden
        const selector = card.locator('.time-range-selector');
        await expect(selector).toBeHidden();

        // 2. Open Temperature Graph
        const tempChip = card.locator('.stat-chip').nth(0); // Assuming first chip is temp
        await tempChip.click();

        // 3. Verify selector becomes visible
        await expect(selector).toBeVisible();

        // 4. Verify default range is 24h
        const btn24h = selector.locator('button', { hasText: '24h' });
        await expect(btn24h).toHaveClass(/active/);

        // 5. Switch to 1h range
        // Update mock data for 1h (single point to test flat line logic)
        historyData = [
            {
                last_changed: new Date().toISOString(),
                state: 'on',
                attributes: { temperature: 25.5 }
            }
        ];

        const btn1h = selector.locator('button', { hasText: '1h' });
        await btn1h.click();
        await expect(btn1h).toHaveClass(/active/);
        await expect(btn24h).not.toHaveClass(/active/);

        // Verify graph is still visible (flat line logic)
        const graphContainer = card.locator('.gs-env-chart-container');
        await expect(graphContainer).toBeVisible();

        // Verify X-axis markers for 1h
        await expect(card.locator('.chart-markers span').first()).toHaveText('60m');

        // 6. Switch to 6h range
        const btn6h = selector.locator('button', { hasText: '6h' });
        await btn6h.click();
        await expect(btn6h).toHaveClass(/active/);

        // Verify X-axis markers for 6h
        await expect(card.locator('.chart-markers span').first()).toHaveText('6h');

        // 7. Close graph
        await tempChip.click();
        await expect(selector).toBeHidden();
    });

    test('square graph (step) scaling', async ({ page }) => {
        const card = page.locator('growspace-manager-card');

        // Provide history with light data
        const lightHistory = [
            {
                last_changed: new Date().toISOString(),
                state: 'on',
                attributes: { is_lights_on: true }
            }
        ];

        await page.exposeFunction('mockGetHistory', () => [lightHistory]);

        const mockHass = createMockHass();

        // Add is_lights_on to optimal conditions sensor attributes
        const optimalId = 'binary_sensor.4x4_tent_optimal_conditions';
        if (mockHass.states[optimalId]) {
            mockHass.states[optimalId].attributes.is_lights_on = true;
        }

        // Add light_sensor to attributes to ensure light chip is rendered (if needed by other logic)
        const overviewId = 'sensor.4x4_tent';
        if (mockHass.states[overviewId]) {
            mockHass.states[overviewId].attributes.light_sensor = 'binary_sensor.light';
        }
        // Add the light sensor state
        mockHass.states['binary_sensor.light'] = {
            entity_id: 'binary_sensor.light',
            state: 'on',
            attributes: { friendly_name: 'Grow Light' }
        };

        const hassData = JSON.parse(JSON.stringify(mockHass));

        await card.evaluate((node: any, { config, hassData }) => {
            node.setConfig(config);
            node.hass = {
                ...hassData,
                callService: async () => Promise.resolve(),
                callApi: async (method: string, url: string) => {
                    return (window as any).mockGetHistory(url);
                },
                connection: { subscribeEvents: () => () => { }, sendMessagePromise: () => Promise.resolve() },
                localize: (key: string) => `[${key}]`,
            };
        }, { config: { type: 'custom:growspace-manager-card', entity: 'sensor.4x4_tent' }, hassData });

        // Open Light Cycle graph (step graph) - usually the 5th chip or so, but we can find by icon or text
        // Or we can just click the chip that corresponds to 'light'
        // In mockHass, we don't explicitly set up the light sensor in the chips list in a way that guarantees order easily without checking implementation.
        // But the card renders chips based on what's available.
        // Let's assume we can find it by the light icon or just toggle it via method if needed, but clicking is better.
        // The light chip has 'On' or 'Off' text usually.

        // Let's try to find the chip with the light icon path or text 'On' (from mock)
        const lightChip = card.locator('.stat-chip', { hasText: 'On' }).first();
        await lightChip.click();

        const selector = card.locator('.time-range-selector');
        await expect(selector).toBeVisible();

        // Switch to 6h
        const btn6h = selector.locator('button', { hasText: '6h' });
        await btn6h.click();

        // Verify X-axis markers for 6h on step graph
        // Step graph markers are in .gs-light-cycle-card .chart-markers
        const markers = card.locator('.gs-light-cycle-card .chart-markers span');
        await expect(markers.first()).toHaveText('-6h');
    });
});
