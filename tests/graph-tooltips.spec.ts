import { test, expect } from '@playwright/test';
import { createMockHass } from './mocks/hass';

test.describe('Graph Tooltips', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('displays correct tooltip text for dehumidifier, light, and optimal graphs', async ({ page }) => {
        const card = page.locator('growspace-manager-card');

        // Mock History Data
        const now = new Date();
        const historyData = [
            {
                last_changed: now.toISOString(),
                state: 'on',
                attributes: {
                    dehumidifier: true,
                    is_lights_on: true,
                    temperature: 25,
                    humidity: 60,
                    vpd: 1.2,
                    co2: 800
                }
            }
        ];

        await page.exposeFunction('mockGetHistory', () => [historyData]);

        const mockHass = createMockHass();
        const overviewId = 'sensor.4x4_tent';
        const optimalId = 'binary_sensor.4x4_tent_optimal_conditions';

        // Setup Attributes
        if (mockHass.states[overviewId]) {
            mockHass.states[overviewId].attributes.dehumidifier_entity = 'switch.dehumidifier';
            mockHass.states[overviewId].attributes.dehumidifier_state = 'on';
        }

        if (mockHass.states[optimalId]) {
            Object.assign(mockHass.states[optimalId].attributes, {
                dehumidifier: true,
                is_lights_on: true,
                temperature: 25,
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
                    const result = await (window as any).mockGetHistory(url);
                    return result;
                },
                connection: { subscribeEvents: () => () => { }, sendMessagePromise: () => Promise.resolve() },
                localize: (key: string) => `[${key}]`,
            };
        }, { config: { type: 'custom:growspace-manager-card', entity: overviewId }, hassData });

        // --- Dehumidifier Test ---
        const chips = card.locator('.stat-chip');
        const dehumChip = chips.nth(3); // 0: Temp, 1: Hum, 2: VPD, 3: Dehum
        await dehumChip.click();

        // Use .gs-chart-container for step graphs
        const graphContainer = card.locator('.gs-chart-container');
        await expect(graphContainer).toBeVisible();
        // Use .gs-light-title for step graphs
        await expect(card.locator('.gs-light-title')).toContainText('Dehumidifier');

        // Hover over graph
        const graphRect = await graphContainer.boundingBox();
        if (graphRect) {
            await page.mouse.move(graphRect.x + graphRect.width / 2, graphRect.y + graphRect.height / 2);
        }

        // Check Tooltip
        const tooltip = card.locator('.gs-tooltip');
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('ON');
        await expect(tooltip).not.toContainText('Optimal Conditions');

        // --- Light Test ---
        // Close Dehum graph
        await dehumChip.click();

        // Open Light Graph (Chip 5: CO2, Chip 6: Light)
        const lightChip = chips.nth(5);
        await lightChip.click();

        await expect(card.locator('.gs-light-title')).toContainText('Light Cycle');

        // Hover
        if (graphRect) {
            await page.mouse.move(graphRect.x + graphRect.width / 2, graphRect.y + graphRect.height / 2);
        }

        // Check Tooltip
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('ON');
        await expect(tooltip).not.toContainText('Optimal Conditions');

        // --- Optimal Conditions Test ---
        // Close Light graph
        await lightChip.click();

        // Open Optimal Graph (Index 6)
        const optimalChip = chips.nth(6);
        await optimalChip.click();

        await expect(card.locator('.gs-light-title')).toContainText('Optimal Conditions');

        // Hover
        if (graphRect) {
            await page.mouse.move(graphRect.x + graphRect.width / 2, graphRect.y + graphRect.height / 2);
        }

        // Check Tooltip
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('Optimal Conditions');
    });
});
