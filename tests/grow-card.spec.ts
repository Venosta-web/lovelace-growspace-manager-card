import { test, expect, Locator } from '@playwright/test';
import { createMockHass } from './mocks/hass';

test.describe('Growspace Manager Card Tests', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        const card = page.locator('growspace-manager-card');
        await expect(card).toBeAttached();

        const mockHass = createMockHass({ growspaceName: '4x4 Tent', rows: 4, cols: 4 });
        const hassData = JSON.parse(JSON.stringify(mockHass));

        await card.evaluate((node: any, { config, hassData }) => {
            node.setConfig(config);
            node.hass = {
                ...hassData,
                callService: async (d: string, s: string, data: any) => {
                    console.log(`Service called: ${d}.${s}`, data);
                    return Promise.resolve();
                },
                connection: { subscribeEvents: () => () => { }, sendMessagePromise: () => Promise.resolve() },
                localize: (key: string) => `[${key}]`,
            };
        }, { config: { type: 'custom:growspace-manager-card', entity: 'sensor.4x4_tent' }, hassData });
    });

    test('Growspace Manager Card renders and Strains button is visible', async ({ page }) => {
        const growspaceCard = page.locator('growspace-manager-card').first();
        await expect(growspaceCard).toBeVisible();

        // Open menu to find Strains button
        const menuBtn = growspaceCard.locator('.menu-button');
        await expect(menuBtn).toBeVisible();
        await menuBtn.click();

        const strainsButton = growspaceCard.locator('.menu-item', { hasText: 'Strains' });
        await expect(strainsButton).toBeVisible();
    });

    test('Plant Overview Dialog opens on plant click', async ({ page }) => {
        const growspaceCard = page.locator('growspace-manager-card').first();

        // Find a plant slot that is not empty
        const plantSlot = growspaceCard.locator('.plant-card-rich:not(.empty)').first();
        await expect(plantSlot).toBeVisible();

        // Click on the plant slot to open the dialog
        await plantSlot.click();

        // Wait for the ha-dialog element to be attached to the DOM
        const dialog = page.locator('ha-dialog[open]');
        await expect(dialog).toBeVisible();

        // Close the dialog
        const closeBtn = dialog.locator('button.md3-button').first();
        await expect(closeBtn).toBeVisible();
        await closeBtn.click();

        // Assert that the dialog is no longer visible
        await expect(dialog).not.toBeVisible();
    });

    test('Strain Library Dialog opens', async ({ page }) => {
        const growspaceCard = page.locator('growspace-manager-card').first();

        // Open menu
        const menuBtn = growspaceCard.locator('.menu-button');
        await menuBtn.click();

        const strainsButton = growspaceCard.locator('.menu-item', { hasText: 'Strains' });
        await expect(strainsButton).toBeVisible();
        await strainsButton.click();

        // Wait for the ha-dialog element for the strain library to be attached
        const strainDialog = page.locator('ha-dialog[open]');
        await expect(strainDialog).toBeVisible();

        // Close it
        const closeBtn = strainDialog.locator('.sd-close-btn');
        if (await closeBtn.isVisible()) {
            await closeBtn.click();
        } else {
            const genericClose = strainDialog.locator('button.md3-button').first();
            await genericClose.click();
        }

        await expect(strainDialog).not.toBeVisible();
    });

    test('Drag and drop plant to empty slot', async ({ page }) => {
        const growspaceCard = page.locator('growspace-manager-card').first();

        // Find an existing plant to drag
        const sourcePlant = growspaceCard.locator('.plant-card-rich:not(.empty)').first();
        await expect(sourcePlant).toBeVisible();

        // Find an empty slot to drop the plant into
        const targetEmptySlot = growspaceCard.locator('.plant-card-empty').first();
        await expect(targetEmptySlot).toBeVisible();

        // Perform the drag and drop operation
        await sourcePlant.dragTo(targetEmptySlot);

        // Wait for network requests to complete and the UI to update
        await page.waitForTimeout(1000);
    });

    test('Drag and drop plant to occupied slot (switching plants)', async ({ page }) => {
        const growspaceCard = page.locator('growspace-manager-card').first();
        const serviceCalls: any[] = [];

        await page.exposeFunction('trackServiceCall', (domain: string, service: string, data: any) => {
            serviceCalls.push({ domain, service, data });
        });

        const mockHass = createMockHass();
        const hassData = JSON.parse(JSON.stringify(mockHass));

        await growspaceCard.evaluate((node: any, { config, hassData }) => {
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

        // Find two distinct non-empty plant slots
        const occupiedPlantSlots = growspaceCard.locator('.plant-card-rich:not(.empty)');
        const occupiedPlantCount = await occupiedPlantSlots.count();

        // Skip test if there aren't enough plants
        if (occupiedPlantCount < 2) {
            console.log('Skipping test: Not enough plants to test swapping');
            return;
        }

        const sourcePlant = occupiedPlantSlots.nth(0);
        const targetPlant = occupiedPlantSlots.nth(1);

        await expect(sourcePlant).toBeVisible();
        await expect(targetPlant).toBeVisible();

        // Perform the drag and drop operation (source to target)
        await sourcePlant.dragTo(targetPlant);

        // Wait for network requests to complete and the UI to update
        await page.waitForTimeout(1000);

        // Verify service call
        const switchCall = serviceCalls.find((c: any) => c.domain === 'growspace_manager' && c.service === 'switch_plants');
        expect(switchCall).toBeTruthy();
        expect(switchCall.data).toHaveProperty('plant1_id');
        expect(switchCall.data).toHaveProperty('plant2_id');
    });

    test('fires "harvest_plant" service call when harvesting a flowering plant', async ({ page }) => {
        const growspaceCard = page.locator('growspace-manager-card').first();
        const serviceCalls: any[] = [];

        // Setup service call tracking
        await page.exposeFunction('trackServiceCall', (domain: string, service: string, data: any) => {
            serviceCalls.push({ domain, service, data });
        });

        const mockHass = createMockHass();
        const hassData = JSON.parse(JSON.stringify(mockHass));

        await growspaceCard.evaluate((node: any, { config, hassData }) => {
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

        // Find a flowering plant (Blue Dream is flowering in the mock)
        // We can look for the plant card that contains "Blue Dream"
        const plantCard = growspaceCard.locator('.plant-card-rich', { hasText: 'Blue Dream' }).first();
        await expect(plantCard).toBeVisible();
        await plantCard.click();

        // Wait for dialog
        const dialog = page.locator('ha-dialog[open]');
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText('Blue Dream');

        // Verify Harvest button is visible (only for flowering plants)
        const harvestBtn = dialog.locator('button.md3-button.primary', { hasText: 'Harvest' });
        await expect(harvestBtn).toBeVisible();

        // Click Harvest
        await harvestBtn.click();

        // Wait for service call
        await page.waitForTimeout(500);

        // Verify service call
        const harvestCall = serviceCalls.find((c: any) => c.domain === 'growspace_manager' && c.service === 'harvest_plant');
        expect(harvestCall).toBeTruthy();
        expect(harvestCall.data).toHaveProperty('plant_id');
        // Default behavior is usually moving to 'dry' stage/growspace
        expect(harvestCall.data).toHaveProperty('target_growspace_id', 'dry_overview');
    });
});
