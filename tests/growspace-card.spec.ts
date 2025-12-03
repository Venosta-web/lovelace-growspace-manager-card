// tests/growspace-card.spec.ts
import { test, expect } from '@playwright/test';
import { createMockHass } from './mocks/hass';

test.describe('Growspace Manager Card', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('renders grid layout and plant details correctly', async ({ page }) => {
        page.on('console', msg => console.log(`[Browser] ${msg.text()}`));
        const card = page.locator('growspace-manager-card');
        const mockHass = createMockHass({ growspaceName: '4x4 Tent', rows: 4, cols: 4 });
        const entityId = 'sensor.4x4_tent';
        const hassData = JSON.parse(JSON.stringify(mockHass));

        await card.evaluate((node: any, { config, hassData }) => {
            node.setConfig(config);
            node.hass = {
                ...hassData,
                callService: async () => Promise.resolve(),
                connection: { subscribeEvents: () => () => { }, sendMessagePromise: () => Promise.resolve() },
                localize: (key: string) => `[${key}]`,
            };
        }, { config: { type: 'custom:growspace-manager-card', entity: entityId }, hassData });

        // Check for growspace name in the select dropdown
        const select = card.locator('select.growspace-select-header');
        await expect(select).toBeVisible();

        await expect(select).toHaveValue('4x4_tent'); // ID is lowercased and underscored in mock
        await expect(card).toContainText('Gorilla Glue');
        await expect(card).toContainText('#4');
        await expect(card).toContainText('Blue Dream');

        // Check if the growth stage summary is displayed
        // Mock has a flowering plant (12 days), so dominant stage is Flower.
        await expect(card).toContainText('Flower');
        await expect(card).toContainText('12');
    });

    test('displays warning indicators for binary sensors', async ({ page }) => {
        const card = page.locator('growspace-manager-card');
        const mockHass = createMockHass();
        const entityId = 'sensor.4x4_tent';
        const hassData = JSON.parse(JSON.stringify(mockHass));

        await card.evaluate((node: any, { config, hassData }) => {
            node.setConfig(config);
            node.hass = {
                ...hassData,
                callService: async () => Promise.resolve(),
                connection: { subscribeEvents: () => () => { }, sendMessagePromise: () => Promise.resolve() },
                localize: (key: string) => `[${key}]`,
            };
        }, { config: { type: 'custom:growspace-manager-card', entity: entityId }, hassData });

        await expect(card).toContainText('High Mold Risk');
        await expect(card).toContainText('Humidity High (65%)');
    });

    test('fires "add_plant" service call when clicking empty slot', async ({ page }) => {
        const card = page.locator('growspace-manager-card');

        await page.exposeFunction('trackServiceCall', (domain: string, service: string, data: any) => {
            (window as any).__serviceCalls = (window as any).__serviceCalls || [];
            (window as any).__serviceCalls.push({ domain, service, data });
        });

        const mockHass = createMockHass();
        const hassData = JSON.parse(JSON.stringify(mockHass));

        await card.evaluate((node: any, { config, hassData }) => {
            node.setConfig(config);
            node.hass = {
                ...hassData,
                callService: async (d: string, s: string, data: any) => {
                    (window as any).trackServiceCall(d, s, data);
                    return Promise.resolve();
                },
                connection: { subscribeEvents: () => () => { }, sendMessagePromise: () => Promise.resolve() },
                localize: (key: string) => `[${key}]`,
            };
        }, { config: { type: 'custom:growspace-manager-card', entity: 'sensor.4x4_tent' }, hassData });

        const emptySlot = card.locator('.plant-card-empty').first();
        await expect(emptySlot).toBeVisible();
        await emptySlot.click();

        // Wait for dialog
        const dialog = page.locator('ha-dialog[open]');
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText('Add New Plant');
    });
    test('fires "remove_plant" service call when deleting a plant', async ({ page }) => {
        const card = page.locator('growspace-manager-card');
        const serviceCalls: any[] = [];

        await page.exposeFunction('trackServiceCall', (domain: string, service: string, data: any) => {
            serviceCalls.push({ domain, service, data });
        });

        const mockHass = createMockHass();
        const hassData = JSON.parse(JSON.stringify(mockHass));

        await card.evaluate((node: any, { config, hassData }) => {
            node.setConfig(config);
            node.hass = {
                ...hassData,
                callService: async (d: string, s: string, data: any) => {
                    await (window as any).trackServiceCall(d, s, data);
                    return Promise.resolve();
                },
                connection: { subscribeEvents: () => () => { }, sendMessagePromise: () => Promise.resolve() },
                localize: (key: string) => `[${key}]`,
            };
        }, { config: { type: 'custom:growspace-manager-card', entity: 'sensor.4x4_tent' }, hassData });

        // Click on an existing plant (e.g., Gorilla Glue at 1,1)
        const plantCard = card.locator('.plant-card-rich').first();
        await expect(plantCard).toBeVisible();
        await plantCard.click();

        // Wait for dialog
        const dialog = page.locator('ha-dialog[open]');
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText('Gorilla Glue');

        // Handle confirm dialog
        page.on('dialog', dialog => dialog.accept());

        // Click Delete button
        const deleteBtn = dialog.locator('button.md3-button.danger');
        await expect(deleteBtn).toBeVisible();
        await deleteBtn.click();

        // Verify service call
        const removeCall = serviceCalls.find((c: any) => c.domain === 'growspace_manager' && c.service === 'remove_plant');
        expect(removeCall).toBeTruthy();
        expect(removeCall.data).toHaveProperty('plant_id');
    });

    test('fires "update_plant" service call when dragging a plant to an empty slot', async ({ page }) => {
        const card = page.locator('growspace-manager-card');
        const serviceCalls: any[] = [];

        await page.exposeFunction('trackServiceCall', (domain: string, service: string, data: any) => {
            serviceCalls.push({ domain, service, data });
        });

        const mockHass = createMockHass();
        const hassData = JSON.parse(JSON.stringify(mockHass));

        await card.evaluate((node: any, { config, hassData }) => {
            node.setConfig(config);
            node.hass = {
                ...hassData,
                callService: async (d: string, s: string, data: any) => {
                    await (window as any).trackServiceCall(d, s, data);
                    return Promise.resolve();
                },
                connection: { subscribeEvents: () => () => { }, sendMessagePromise: () => Promise.resolve() },
                localize: (key: string) => `[${key}]`,
            };
        }, { config: { type: 'custom:growspace-manager-card', entity: 'sensor.4x4_tent' }, hassData });

        // Source: Gorilla Glue at 1,1
        const sourcePlant = card.locator('.plant-card-rich').first();
        await expect(sourcePlant).toBeVisible();

        // Target: Empty slot at 1,2 (index 1)
        // Note: .plant-card-empty elements are rendered for empty slots.
        // Grid is 4x4. 1,1 is plant. 1,2 is empty.
        const targetSlot = card.locator('.plant-card-empty').nth(0);
        await expect(targetSlot).toBeVisible();

        // Perform drag and drop
        await sourcePlant.dragTo(targetSlot);

        // Verify service call
        const updateCall = serviceCalls.find((c: any) => c.domain === 'growspace_manager' && c.service === 'update_plant');
        expect(updateCall).toBeTruthy();
        expect(updateCall.data).toHaveProperty('plant_id');
        expect(updateCall.data).toHaveProperty('row');
        expect(updateCall.data).toHaveProperty('col');
    });

    test('fires "update_plant" service call when editing plant details', async ({ page }) => {
        const card = page.locator('growspace-manager-card');
        const serviceCalls: any[] = [];

        await page.exposeFunction('trackServiceCall', (domain: string, service: string, data: any) => {
            serviceCalls.push({ domain, service, data });
        });

        const mockHass = createMockHass();
        const hassData = JSON.parse(JSON.stringify(mockHass));

        await card.evaluate((node: any, { config, hassData }) => {
            node.setConfig(config);
            node.hass = {
                ...hassData,
                callService: async (d: string, s: string, data: any) => {
                    await (window as any).trackServiceCall(d, s, data);
                    return Promise.resolve();
                },
                connection: { subscribeEvents: () => () => { }, sendMessagePromise: () => Promise.resolve() },
                localize: (key: string) => `[${key}]`,
            };
        }, { config: { type: 'custom:growspace-manager-card', entity: 'sensor.4x4_tent' }, hassData });

        // Click on an existing plant (e.g., Gorilla Glue at 1,1)
        const plantCard = card.locator('.plant-card-rich').first();
        await expect(plantCard).toBeVisible();
        await plantCard.click();

        // Wait for dialog
        const dialog = page.locator('ha-dialog[open]');
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText('Gorilla Glue');

        // Locate Strain Name input
        const strainInput = dialog.locator('.md3-input-group', { hasText: 'Strain Name' }).locator('input');
        await expect(strainInput).toBeVisible();

        // Change Strain Name
        await strainInput.fill('Updated Strain');

        // Click Save Changes button
        const saveBtn = dialog.locator('button.md3-button.tonal');
        await expect(saveBtn).toBeVisible();
        await saveBtn.click();

        // Verify service call
        const updateCall = serviceCalls.find((c: any) => c.domain === 'growspace_manager' && c.service === 'update_plant');
        expect(updateCall).toBeTruthy();
        expect(updateCall.data).toHaveProperty('plant_id');
        expect(updateCall.data).toHaveProperty('strain', 'Updated Strain');
    });
});
