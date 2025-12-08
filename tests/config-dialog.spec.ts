import { test, expect } from './coverage-helper';
import { createMockHass } from './mocks/hass';

test.describe('Config Dialog', () => {

    test.beforeEach(async ({ coveragePage: page }) => {
        await page.goto('/');
    });

    test('opens config dialog and saves environment settings', async ({ coveragePage: page }) => {
        // Enable console logging for debugging
        page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));

        const card = page.locator('growspace-manager-card');
        const serviceCalls: any[] = [];

        // Expose function to track service calls from browser context
        await page.exposeFunction('trackServiceCall', (domain: string, service: string, data: any) => {
            serviceCalls.push({ domain, service, data });
        });

        // Create Mock Data
        const mockHass = createMockHass({ growspaceName: '4x4 Tent', rows: 4, cols: 4 });
        const entityId = 'sensor.4x4_tent';
        const hassData = JSON.parse(JSON.stringify(mockHass));

        // Inject Config and Hass into the component
        await card.evaluate((node: any, { config, hassData }) => {
            node.setConfig(config);
            node.hass = {
                ...hassData,
                callService: async (d: string, s: string, data: any) => {
                    await (window as any).trackServiceCall(d, s, data);
                    return Promise.resolve();
                },
                callWS: async () => Promise.resolve([]),
                connection: { subscribeEvents: () => () => { }, sendMessagePromise: () => Promise.resolve() },
                localize: (key: string) => `[${key}]`,
                callApi: async () => Promise.resolve(),
            };
            // Force selected device to ensure dialog has context
            node.store.handleDeviceChange('4x4_tent');
        }, { config: { type: 'custom:growspace-manager-card', entity: entityId }, hassData });

        // Open Menu
        const menuButton = card.locator('.menu-button');
        await expect(menuButton).toBeVisible();
        await menuButton.click();

        // Click Config Item
        const configItem = card.locator('.menu-item', { hasText: 'Config' });
        await expect(configItem).toBeVisible();
        await configItem.click();

        // Verify Dialog
        const dialog = page.locator('ha-dialog[open]');
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText('Configuration');

        // Verify we are on the Environment tab
        const envTab = dialog.locator('.config-tab', { hasText: 'Environment' });
        if (await envTab.isVisible()) {
            await envTab.click();
        }

        // Verify Growspace Selection
        const growspaceSelect = dialog.locator('select.md3-input');
        await expect(growspaceSelect).toBeVisible();
        const selectedValue = await growspaceSelect.inputValue();
        if (!selectedValue) {
            console.log('BROWSER: Growspace ID was empty, selecting manually.');
            await growspaceSelect.selectOption({ label: '4x4 Tent' }); // Assuming label matches mock
            // Alternatively select by value if known, mock id is '4x4_tent'
            // await growspaceSelect.selectOption('4x4_tent');
        }

        // Locate inputs
        const tempInput = dialog.locator('md3-text-input[label="Temperature Sensor ID"] input');
        await expect(tempInput).toBeVisible();

        // Fill data
        await tempInput.fill('sensor.temp_sensor');
        await dialog.locator('md3-text-input[label="Humidity Sensor ID"] input').fill('sensor.hum_sensor');
        await dialog.locator('md3-text-input[label="VPD Sensor ID"] input').fill('sensor.vpd_sensor');

        // Click Save
        const saveBtn = dialog.locator('button.md3-button.primary', { hasText: 'Save Sensors' });
        await saveBtn.click();

        // Verify service call
        // Need to wait regarding async nature of service call tracking? usually Playwright awaits steps enough.
        // But evaluate/trackServiceCall is immediate.

        const configCall = serviceCalls.find(c => c.domain === 'growspace_manager' && c.service === 'configure_environment');
        expect(configCall).toBeTruthy();
        expect(configCall.data.temperature_sensor).toBe('sensor.temp_sensor');
        expect(configCall.data.humidity_sensor).toBe('sensor.hum_sensor');
    });
});
