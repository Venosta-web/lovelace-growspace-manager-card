import { test, expect } from './coverage-helper';
import { createMockHass } from './mocks/hass';

test.describe('Irrigation Dialog', () => {

    test('opens irrigation dialog and adds schedule', async ({ coveragePage: page }) => {
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

        await page.goto('/');

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
            // Force selected device
            node.store.handleDeviceChange('4x4_tent');
        }, { config: { type: 'custom:growspace-manager-card', entity: entityId }, hassData });

        // Open Menu
        const menuButton = card.locator('.menu-button');
        await expect(menuButton).toBeVisible();
        await menuButton.click();

        // Click Irrigation Item
        const item = card.locator('.menu-item', { hasText: 'Irrigation' });
        await expect(item).toBeVisible();
        await item.click();

        // Verify Dialog
        const dialog = page.locator('irrigation-dialog ha-dialog[open]');
        await expect(dialog).toBeVisible();

        // Wait for dialog content
        await expect(dialog.locator('h2.dialog-title')).toContainText('Irrigation Management');

        // Locate Add Time button (for Irrigation Schedule)
        // There are two "ADD TIME" buttons. First one is usually Irrigation.
        // Or better, scope to the section.
        const irrigationSection = dialog.locator('.irrigation-time-bar').locator('xpath=..');
        const addButton = irrigationSection.locator('button', { hasText: 'ADD TIME' });
        await expect(addButton).toBeVisible();
        await addButton.click();

        // Verify Overlay
        const overlay = dialog.locator('.overlay-backdrop');
        await expect(overlay).toBeVisible();

        // Fill Time
        // Input type=time inside md3-text-input
        const timeInput = overlay.locator('md3-text-input[label="Time"] input');
        await expect(timeInput).toBeVisible();
        await timeInput.fill('08:00');

        // Fill Duration
        const durationInput = overlay.locator('md3-number-input[label="Duration (seconds)"] input');
        await durationInput.fill('120');

        // Click Add Schedule
        const submitBtn = overlay.locator('button.primary', { hasText: 'Add Schedule' });
        await submitBtn.click();

        // Verify service call
        const call = serviceCalls.find(c => c.domain === 'growspace_manager' && c.service === 'add_irrigation_time');
        expect(call).toBeTruthy();
        expect(call.data.growspace_id).toBe('4x4_tent');
        expect(call.data.time).toBe('08:00');
        expect(call.data.duration).toBe(120);
    });
});
