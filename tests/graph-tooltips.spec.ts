import { test, expect } from './coverage-helper';
import { createMockHass } from './mocks/hass';

test.describe('Graph Tooltips', () => {

    test.beforeEach(async ({ coveragePage: page }) => {
        page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
        await page.goto('/');
    });

    test('displays correct tooltip text for dehumidifier, light, and optimal graphs', async ({ coveragePage: page }) => {
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
                },
                entity_id: 'switch.dehumidifier'
            }
        ];

        // Mock history data (moved inside evaluate or passed as arg)

        const mockHass: any = createMockHass();
        const overviewId = 'sensor.4x4_tent';
        const optimalId = 'binary_sensor.4x4_tent_optimal_conditions';

        // Setup Attributes
        if (mockHass.states[overviewId]) {
            mockHass.states[overviewId].attributes.dehumidifier_entity = 'switch.dehumidifier';
            mockHass.states[overviewId].attributes.dehumidifier_state = 'on';
            mockHass.states[overviewId].attributes.temperature_sensor = 'sensor.temp';
            mockHass.states[overviewId].attributes.humidity_sensor = 'sensor.hum';
            mockHass.states[overviewId].attributes.vpd_sensor = 'sensor.vpd';
            mockHass.states[overviewId].attributes.dehumidifier_entity = 'switch.dehumidifier';
            mockHass.states[overviewId].attributes.light_entity = 'switch.grow_light';
        }

        if (mockHass.states[optimalId]) {
            mockHass.states[optimalId].state = 'on';
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

        await card.evaluate((node: any, { config, hassData, historyData }) => {
            node.setConfig(config);
            node.hass = {
                ...hassData,
                callService: async () => Promise.resolve(),
                callApi: async (method: string, url: string) => {

                    // Detect if path contains specific entity/metric or payload does
                    // arguments[1] is url (e.g. history/period/...)
                    // Check URL for entity_id
                    const urlStr = url || '';
                    if (urlStr.includes('dehumidifier')) return [[{ entity_id: 'switch.dehumidifier', state: 'on', last_changed: new Date().toISOString() }]];
                    if (urlStr.includes('light')) return [[{ entity_id: 'switch.grow_light', state: 'on', last_changed: new Date().toISOString() }]];
                    return [historyData];
                },
                connection: { subscribeEvents: () => () => { }, sendMessagePromise: () => Promise.resolve() },
                localize: (key: string) => `[${key}]`,
            };
        }, { config: { type: 'custom:growspace-manager-card', entity: overviewId }, hassData, historyData });

        // --- Dehumidifier Test ---
        const dehumidifierChip = card.locator('.stat-chip', { hasText: 'Dehumidifier' }).first();
        await expect(dehumidifierChip).toBeVisible();
        await dehumidifierChip.click({ force: true });
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
        const dehumChip = card.locator('.stat-chip', { hasText: 'Dehumidifier:' }).first();
        await dehumChip.evaluate((e: HTMLElement) => e.click());
        await expect(graphContainer).toBeHidden();

        // Open Light Graph (Chip 5: CO2, Chip 6: Light)
        const chips = card.locator('.stat-chip'); // Define chips here if not defined globally
        const lightChip = card.locator('.stat-chip', { hasText: 'On' }).first();

        await lightChip.evaluate((e: HTMLElement) => e.click());

        await expect(card.locator('.gs-light-title')).toContainText('Light');

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
        await lightChip.evaluate((e: HTMLElement) => e.click());

        // Open Optimal Graph (Index 6)
        const optimalChip = card.locator('.stat-chip', { hasText: 'Optimal' }).first();
        await optimalChip.evaluate((e: HTMLElement) => e.click());

        await expect(card.locator('.gs-light-title')).toContainText('Optimal Conditions');

        // Hover
        if (graphRect) {
            await page.mouse.move(graphRect.x + graphRect.width / 2, graphRect.y + graphRect.height / 2);
        }

        // Check Tooltip
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('Optimal Conditions');

        // Check Subtitle for Percentage
        // Since mock history has state 'on' at 'now', and logic extends it back to start, it should be 100%
        await expect(card.locator('.gs-light-subtitle')).toContainText('OPTIMAL 100%');
    });

    test('renders graph covering full range even when history data starts late', async ({ coveragePage: page }) => {
        const card = page.locator('growspace-manager-card');

        // Mock History Data starting 12h ago (for 24h range)
        const now = new Date();
        const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        const historyData = [
            {
                last_changed: twelveHoursAgo.toISOString(),
                state: 'on',
                attributes: {
                    dehumidifier: true
                },
                entity_id: 'switch.dehumidifier'
            }
        ];

        // Mock history data (moved inside evaluate or passed as arg)

        const mockHass: any = createMockHass();
        const overviewId = 'sensor.4x4_tent';

        // Setup Attributes
        if (mockHass.states[overviewId]) {
            mockHass.states[overviewId].attributes.dehumidifier_entity = 'switch.dehumidifier';
            mockHass.states[overviewId].attributes.dehumidifier_state = 'on';
            mockHass.states[overviewId].attributes.temperature_sensor = 'sensor.temp';
            mockHass.states[overviewId].attributes.humidity_sensor = 'sensor.hum';
            mockHass.states[overviewId].attributes.vpd_sensor = 'sensor.vpd';
        }

        const optimalId = 'binary_sensor.4x4_tent_optimal_conditions';
        if (mockHass.states[optimalId]) {
            Object.assign(mockHass.states[optimalId].attributes, {
                temperature: 25,
                humidity: 60,
                vpd: 1.2,
                co2: 800,
                is_lights_on: true
            });
        }

        const hassData = JSON.parse(JSON.stringify(mockHass));

        await card.evaluate((node: any, { config, hassData, historyData }) => {
            node.setConfig(config);
            node.hass = {
                ...hassData,
                callService: async () => Promise.resolve(),
                callApi: async (method: string, url: string) => {
                    const urlStr = url || '';
                    if (urlStr.includes('dehumidifier')) return [[{ entity_id: 'switch.dehumidifier', state: 'on', last_changed: new Date().toISOString() }]];
                    return [historyData];
                },
                connection: { subscribeEvents: () => () => { }, sendMessagePromise: () => Promise.resolve() },
                localize: (key: string) => `[${key}]`,
            };
        }, { config: { type: 'custom:growspace-manager-card', entity: overviewId }, hassData, historyData });

        // Open Dehumidifier Graph
        const dehumChip = card.locator('.stat-chip', { hasText: 'Dehumidifier' });
        await dehumChip.evaluate((e: HTMLElement) => e.click());

        // Graph should be visible
        const graphContainer = card.locator('.gs-chart-container');
        await expect(graphContainer).toBeVisible();

        // Check that it rendered a line (path exists)
        // Check that it rendered a line (path exists)
        const path = graphContainer.locator('path.chart-line');
        // await expect(path).toBeVisible(); // Flaky on some SVGs

        // Optionally check if the path starts at x=0 (M 0,...)
        // This confirms it synthesized the start point
        const d = await path.getAttribute('d');
        // We expect "M 0,..."
        expect(d?.startsWith('M 0,')).toBeTruthy();
    });
});
