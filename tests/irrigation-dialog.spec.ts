import { test, expect } from './coverage-helper';
import { createMockHass } from './mocks/hass';
import { createMockDevice } from './mocks/device';

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

    // ─── Crop steering schedule display ───────────────────────────────────────

    async function openIrrigationDialogWithDevice(page: any, deviceOverrides: Record<string, unknown> = {}) {
        const card = page.locator('growspace-manager-card');
        const mockHass = createMockHass({ growspaceName: '4x4 Tent', rows: 2, cols: 2 });
        const hassData = JSON.parse(JSON.stringify(mockHass));

        // Build the full device in Node context so it can be serialized into the browser
        const device = Object.keys(deviceOverrides).length > 0
            ? createMockDevice(deviceOverrides as any)
            : null;

        await page.goto('/');

        await card.evaluate((node: any, { config, hassData }: any) => {
            node.setConfig(config);
            node.hass = {
                ...hassData,
                callService: async () => Promise.resolve(),
                callWS: async () => Promise.resolve([]),
                connection: { subscribeEvents: () => () => { }, sendMessagePromise: () => Promise.resolve() },
                localize: (key: string) => `[${key}]`,
                callApi: async () => Promise.resolve(),
            };
            node.store.handleDeviceChange('4x4_tent');
        }, { config: { type: 'custom:growspace-manager-card', entity: 'sensor.4x4_tent' }, hassData });

        const menuButton = card.locator('.menu-button');
        await menuButton.click();
        const item = card.locator('.menu-item', { hasText: 'Irrigation' });
        await item.click();

        const dialog = page.locator('irrigation-dialog');
        await expect(dialog.locator('ha-dialog[open]')).toBeVisible();

        if (device) {
            await dialog.evaluate((el: any, dev: any) => {
                el.device = dev;
                el.open = true;
            }, device);
            await page.waitForTimeout(100);
        }

        return dialog;
    }

    test('crop steering OFF — irrigation ADD TIME button is visible', async ({ coveragePage: page }) => {
        const dialog = await openIrrigationDialogWithDevice(page);
        const addBtn = dialog.locator('button', { hasText: 'ADD TIME' }).first();
        await expect(addBtn).toBeVisible();
    });

    test('crop steering ON — shows Crop Steering Schedule heading and hides irrigation ADD TIME', async ({ coveragePage: page }) => {
        const dialog = await openIrrigationDialogWithDevice(page, {
            irrigationStrategy: {
                enabled: true,
                lightsOnTime: '06:00:00',
                p0DurationMinutes: 60,
                p2StopBeforeLightsOffMinutes: 120,
                targetVwcPercent: 45,
                maintenanceDrybackPercent: 3,
                shotDurationSeconds: 15,
                shotIntervalMinutes: 30,
            },
            irrigationConfig: { irrigationTimes: [], drainTimes: [] },
        });

        await expect(dialog.locator('h3', { hasText: 'Crop Steering Schedule' })).toBeVisible();
        const irrigationAddBtn = dialog.locator('.crop-steering-schedule button', { hasText: 'ADD TIME' });
        await expect(irrigationAddBtn).toHaveCount(0);
    });

    test('crop steering ON — drain ADD TIME button still visible', async ({ coveragePage: page }) => {
        const dialog = await openIrrigationDialogWithDevice(page, {
            irrigationStrategy: {
                enabled: true,
                lightsOnTime: '06:00:00',
                p0DurationMinutes: 60,
                p2StopBeforeLightsOffMinutes: 120,
                targetVwcPercent: 45,
                maintenanceDrybackPercent: 3,
                shotDurationSeconds: 15,
                shotIntervalMinutes: 30,
            },
            irrigationConfig: { irrigationTimes: [], drainTimes: [] },
        });

        const drainAddBtn = dialog.locator('.detail-card', { hasText: 'Drain Schedule' }).locator('button', { hasText: 'ADD TIME' });
        await expect(drainAddBtn).toBeVisible();
    });

    test('crop steering ON + flower stage — last shot respects 12-hour light window', async ({ coveragePage: page }) => {
        const dialog = await openIrrigationDialogWithDevice(page, {
            irrigationStrategy: {
                enabled: true,
                lightsOnTime: '06:00:00',
                p0DurationMinutes: 0,
                p2StopBeforeLightsOffMinutes: 0,
                targetVwcPercent: 45,
                maintenanceDrybackPercent: 3,
                shotDurationSeconds: 15,
                shotIntervalMinutes: 60,
            },
            irrigationConfig: { irrigationTimes: [], drainTimes: [] },
            biologicalMetrics: {
                vpdStatus: 'ok',
                vpdTargetMin: 0, vpdTargetMax: 0,
                vpdDangerMin: 0, vpdDangerMax: 0,
                granularStage: 'flower',
                isDay: true,
                vegWeek: 0,
                flowerWeek: 4,
            },
        });

        const schedule = dialog.locator('.crop-steering-schedule');
        await expect(schedule).toBeVisible();

        // With lights on at 06:00 and 12h window, last shot should be at or before 18:00
        // Shot at 17:00 should appear, shot at 18:00 should NOT (lights off)
        const events = schedule.locator('.timeline-event');
        const count = await events.count();
        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThanOrEqual(12); // max 12 shots in a 12h window at 60min intervals
    });
});
