import { test, expect } from './coverage-helper';
import { createMockHass } from './mocks/hass';

test.describe('Config Dialog - Comprehensive E2E Tests', () => {
    let serviceCalls: any[] = [];

    test.beforeEach(async ({ coveragePage: page }) => {
        serviceCalls = [];
        await page.goto('/');

        // Enable console logging for debugging
        page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));

        // Expose function to track service calls
        await page.exposeFunction('trackServiceCall', (domain: string, service: string, data: any) => {
            serviceCalls.push({ domain, service, data });
        });
    });

    test.describe('Dialog Opening and Tab Navigation', () => {
        test('should open config dialog from menu', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card');
            const mockHass = createMockHass({ growspaceName: 'Test Tent', rows: 4, cols: 4 });

            await card.evaluate((node: any, { config, hassData }) => {
                node.setConfig(config);
                node.hass = {
                    ...hassData,
                    callService: async (d: string, s: string, data: any) => {
                        await (window as any).trackServiceCall(d, s, data);
                        return Promise.resolve();
                    },
                    callWS: async () => Promise.resolve([]),
                    connection: { subscribeEvents: () => () => {}, sendMessagePromise: () => Promise.resolve() },
                    localize: (key: string) => `[${key}]`,
                    callApi: async () => Promise.resolve(),
                };
                node.store.handleDeviceChange('test_tent');
            }, {
                config: { type: 'custom:growspace-manager-card', entity: 'sensor.test_tent' },
                hassData: JSON.parse(JSON.stringify(mockHass))
            });

            // Open Menu
            await card.locator('.menu-button').click();
            await card.locator('.menu-item', { hasText: 'Config' }).click();

            // Verify dialog is open
            const dialog = page.locator('ha-dialog[open]');
            await expect(dialog).toBeVisible();
            await expect(dialog).toContainText('Configuration');
        });

        test('should switch between all tabs', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card');
            const mockHass = createMockHass({ growspaceName: 'Test Tent', rows: 4, cols: 4 });

            await card.evaluate((node: any, { config, hassData }) => {
                node.setConfig(config);
                node.hass = {
                    ...hassData,
                    callService: async () => Promise.resolve(),
                    callWS: async () => Promise.resolve([]),
                    connection: { subscribeEvents: () => () => {}, sendMessagePromise: () => Promise.resolve() },
                    localize: (key: string) => `[${key}]`,
                };
                node.store.handleDeviceChange('test_tent');
            }, {
                config: { type: 'custom:growspace-manager-card', entity: 'sensor.test_tent' },
                hassData: JSON.parse(JSON.stringify(mockHass))
            });

            // Open dialog
            await card.locator('.menu-button').click();
            await card.locator('.menu-item', { hasText: 'Config' }).click();

            const dialog = page.locator('ha-dialog[open]');
            await expect(dialog).toBeVisible();

            // Test Environment tab (default)
            const envTab = dialog.locator('.config-tab', { hasText: 'Environment' });
            await expect(envTab).toBeVisible();
            await expect(envTab).toHaveClass(/active/);

            // Switch to Add Growspace tab
            const addTab = dialog.locator('.config-tab', { hasText: 'Add Growspace' });
            await addTab.click();
            await expect(addTab).toHaveClass(/active/);
            await expect(dialog.locator('md3-text-input[label="Growspace Name"]')).toBeVisible();

            // Switch to Edit Growspace tab
            const editTab = dialog.locator('.config-tab', { hasText: 'Edit Growspace' });
            await editTab.click();
            await expect(editTab).toHaveClass(/active/);
            await expect(dialog.locator('select.md3-input')).toBeVisible();

            // Switch to Dehumidifier tab
            const dehumTab = dialog.locator('.config-tab', { hasText: 'Dehumidifier' });
            await dehumTab.click();
            await expect(dehumTab).toHaveClass(/active/);
            await expect(dialog.locator('.sub-tabs')).toBeVisible();

            // Switch back to Environment tab
            await envTab.click();
            await expect(envTab).toHaveClass(/active/);
        });
    });

    test.describe('Add Growspace Tab', () => {
        test('should add a new growspace with all fields', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card');
            const mockHass = createMockHass({ growspaceName: 'Existing', rows: 4, cols: 4 });

            await card.evaluate((node: any, { config, hassData }) => {
                node.setConfig(config);
                node.hass = {
                    ...hassData,
                    callService: async (d: string, s: string, data: any) => {
                        await (window as any).trackServiceCall(d, s, data);
                        return Promise.resolve();
                    },
                    services: {
                        notify: {
                            'mobile_app_phone': {},
                            'mobile_app_tablet': {}
                        }
                    },
                    callWS: async () => Promise.resolve([]),
                    connection: { subscribeEvents: () => () => {}, sendMessagePromise: () => Promise.resolve() },
                    localize: (key: string) => `[${key}]`,
                };
                node.store.handleDeviceChange('existing');
            }, {
                config: { type: 'custom:growspace-manager-card', entity: 'sensor.existing' },
                hassData: JSON.parse(JSON.stringify(mockHass))
            });

            // Open dialog and navigate to Add Growspace tab
            await card.locator('.menu-button').click();
            await card.locator('.menu-item', { hasText: 'Config' }).click();

            const dialog = page.locator('ha-dialog[open]');
            await dialog.locator('.config-tab', { hasText: 'Add Growspace' }).click();

            // Fill in all fields
            await dialog.locator('md3-text-input[label="Growspace Name"] input').fill('New Tent 5x5');
            await dialog.locator('md3-number-input[label="Rows"] input').fill('5');
            await dialog.locator('md3-number-input[label="Plants per Row"] input').fill('5');

            // Select notification service
            const notifySelect = dialog.locator('select').last();
            await notifySelect.selectOption('mobile_app_phone');

            // Submit
            const saveBtn = dialog.locator('button.md3-button.primary', { hasText: 'Add Growspace' });
            await saveBtn.click();

            // Verify service call
            await page.waitForTimeout(500);
            const addCall = serviceCalls.find(c =>
                c.domain === 'growspace_manager' && c.service === 'add_growspace'
            );
            expect(addCall).toBeTruthy();
            expect(addCall?.data.name).toBe('New Tent 5x5');
            expect(addCall?.data.rows).toBe(5);
            expect(addCall?.data.plantsPerRow).toBe(5);
            expect(addCall?.data.notificationService).toBe('mobile_app_phone');
        });

        test('should validate required fields', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card');
            const mockHass = createMockHass({ growspaceName: 'Test', rows: 4, cols: 4 });

            await card.evaluate((node: any, { config, hassData }) => {
                node.setConfig(config);
                node.hass = {
                    ...hassData,
                    callService: async (d: string, s: string, data: any) => {
                        await (window as any).trackServiceCall(d, s, data);
                        return Promise.resolve();
                    },
                    callWS: async () => Promise.resolve([]),
                    connection: { subscribeEvents: () => () => {}, sendMessagePromise: () => Promise.resolve() },
                    localize: (key: string) => `[${key}]`,
                };
                node.store.handleDeviceChange('test');
            }, {
                config: { type: 'custom:growspace-manager-card', entity: 'sensor.test' },
                hassData: JSON.parse(JSON.stringify(mockHass))
            });

            // Open dialog
            await card.locator('.menu-button').click();
            await card.locator('.menu-item', { hasText: 'Config' }).click();

            const dialog = page.locator('ha-dialog[open]');
            await dialog.locator('.config-tab', { hasText: 'Add Growspace' }).click();

            // Try to save without filling required fields
            const saveBtn = dialog.locator('button.md3-button.primary', { hasText: 'Add Growspace' });
            await saveBtn.click();

            // Should not create service call with empty name
            await page.waitForTimeout(300);
            const addCalls = serviceCalls.filter(c =>
                c.domain === 'growspace_manager' && c.service === 'add_growspace'
            );
            expect(addCalls.length).toBe(0);
        });
    });

    test.describe('Edit Growspace Tab', () => {
        test('should edit existing growspace', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card');
            const mockHass = createMockHass({ growspaceName: 'Old Name', rows: 4, cols: 4 });

            await card.evaluate((node: any, { config, hassData }) => {
                node.setConfig(config);
                node.hass = {
                    ...hassData,
                    callService: async (d: string, s: string, data: any) => {
                        await (window as any).trackServiceCall(d, s, data);
                        return Promise.resolve();
                    },
                    callWS: async () => Promise.resolve([]),
                    connection: { subscribeEvents: () => () => {}, sendMessagePromise: () => Promise.resolve() },
                    localize: (key: string) => `[${key}]`,
                };
                node.store.handleDeviceChange('old_name');
            }, {
                config: { type: 'custom:growspace-manager-card', entity: 'sensor.old_name' },
                hassData: JSON.parse(JSON.stringify(mockHass))
            });

            // Open dialog
            await card.locator('.menu-button').click();
            await card.locator('.menu-item', { hasText: 'Config' }).click();

            const dialog = page.locator('ha-dialog[open]');
            await dialog.locator('.config-tab', { hasText: 'Edit Growspace' }).click();

            // Select growspace
            const growspaceSelect = dialog.locator('select.md3-input').first();
            await growspaceSelect.selectOption('old_name');

            // Wait for fields to populate
            await page.waitForTimeout(300);

            // Verify fields are populated
            const nameInput = dialog.locator('md3-text-input[label="Growspace Name"] input');
            await expect(nameInput).toHaveValue('Old Name');

            // Edit fields
            await nameInput.fill('Updated Name');
            await dialog.locator('md3-number-input[label="Rows"] input').fill('6');
            await dialog.locator('md3-number-input[label="Plants per Row"] input').fill('6');

            // Save changes
            const saveBtn = dialog.locator('button.md3-button.primary', { hasText: 'Save Changes' });
            await saveBtn.click();

            // Verify service call
            await page.waitForTimeout(500);
            const editCall = serviceCalls.find(c =>
                c.domain === 'growspace_manager' && c.service === 'update_growspace'
            );
            expect(editCall).toBeTruthy();
            expect(editCall?.data.name).toBe('Updated Name');
            expect(editCall?.data.rows).toBe(6);
            expect(editCall?.data.plantsPerRow).toBe(6);
        });

        test('should handle delete with confirmation', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card');
            const mockHass = createMockHass({ growspaceName: 'To Delete', rows: 4, cols: 4 });

            await card.evaluate((node: any, { config, hassData }) => {
                node.setConfig(config);
                node.hass = {
                    ...hassData,
                    callService: async (d: string, s: string, data: any) => {
                        await (window as any).trackServiceCall(d, s, data);
                        return Promise.resolve();
                    },
                    callWS: async () => Promise.resolve([]),
                    connection: { subscribeEvents: () => () => {}, sendMessagePromise: () => Promise.resolve() },
                    localize: (key: string) => `[${key}]`,
                };
                node.store.handleDeviceChange('to_delete');
            }, {
                config: { type: 'custom:growspace-manager-card', entity: 'sensor.to_delete' },
                hassData: JSON.parse(JSON.stringify(mockHass))
            });

            // Open dialog
            await card.locator('.menu-button').click();
            await card.locator('.menu-item', { hasText: 'Config' }).click();

            const dialog = page.locator('ha-dialog[open]');
            await dialog.locator('.config-tab', { hasText: 'Edit Growspace' }).click();

            // Select growspace
            await dialog.locator('select.md3-input').first().selectOption('to_delete');
            await page.waitForTimeout(300);

            // Click delete button
            const deleteBtn = dialog.locator('button', { hasText: 'Delete' });
            await deleteBtn.click();

            // Verify confirmation dialog appears
            await expect(dialog).toContainText('Delete Growspace?');

            // Confirm delete
            const confirmBtn = dialog.locator('button', { hasText: 'Confirm Delete' });
            await confirmBtn.click();

            // Verify service call
            await page.waitForTimeout(500);
            const deleteCall = serviceCalls.find(c =>
                c.domain === 'growspace_manager' && c.service === 'delete_growspace'
            );
            expect(deleteCall).toBeTruthy();
            expect(deleteCall?.data.growspace_id).toBe('to_delete');
        });
    });

    test.describe('Environment Tab - Complete Field Testing', () => {
        test('should configure all environment sensors', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card');
            const mockHass = createMockHass({ growspaceName: '4x4 Tent', rows: 4, cols: 4 });

            await card.evaluate((node: any, { config, hassData }) => {
                node.setConfig(config);
                node.hass = {
                    ...hassData,
                    callService: async (d: string, s: string, data: any) => {
                        await (window as any).trackServiceCall(d, s, data);
                        return Promise.resolve();
                    },
                    callWS: async () => Promise.resolve([]),
                    connection: { subscribeEvents: () => () => {}, sendMessagePromise: () => Promise.resolve() },
                    localize: (key: string) => `[${key}]`,
                    callApi: async () => Promise.resolve(),
                };
                node.store.handleDeviceChange('4x4_tent');
            }, {
                config: { type: 'custom:growspace-manager-card', entity: 'sensor.4x4_tent' },
                hassData: JSON.parse(JSON.stringify(mockHass))
            });

            // Open dialog
            await card.locator('.menu-button').click();
            await card.locator('.menu-item', { hasText: 'Config' }).click();

            const dialog = page.locator('ha-dialog[open]');

            // Ensure we're on Environment tab
            const envTab = dialog.locator('.config-tab', { hasText: 'Environment' });
            await envTab.click();

            // Select growspace if needed
            const gsSelect = dialog.locator('select.md3-input').first();
            if (await gsSelect.isVisible()) {
                await gsSelect.selectOption('4x4_tent');
            }

            // Fill single-value sensor fields
            await dialog.locator('md3-text-input[label="Temperature Sensor ID"] input').fill('sensor.temp');
            await dialog.locator('md3-text-input[label="Humidity Sensor ID"] input').fill('sensor.humidity');
            await dialog.locator('md3-text-input[label="VPD Sensor ID"] input').fill('sensor.vpd');
            await dialog.locator('md3-text-input[label="CO2 Sensor"] input').fill('sensor.co2');
            await dialog.locator('md3-text-input[label="Soil Moisture Sensor"] input').fill('sensor.soil');

            // Fill threshold fields
            await dialog.locator('md3-number-input[label*="Stress"] input').fill('1.5');
            await dialog.locator('md3-number-input[label*="Mold"] input').fill('2.0');

            // Save
            const saveBtn = dialog.locator('button.md3-button.primary', { hasText: 'Save Sensors' });
            await saveBtn.click();

            // Verify service call
            await page.waitForTimeout(500);
            const configCall = serviceCalls.find(c =>
                c.domain === 'growspace_manager' && c.service === 'configure_environment'
            );
            expect(configCall).toBeTruthy();
            expect(configCall?.data.temperatureSensor).toBe('sensor.temp');
            expect(configCall?.data.humiditySensor).toBe('sensor.humidity');
            expect(configCall?.data.vpdSensor).toBe('sensor.vpd');
            expect(configCall?.data.co2Sensor).toBe('sensor.co2');
            expect(configCall?.data.soilMoistureSensor).toBe('sensor.soil');
            expect(configCall?.data.stressThreshold).toBe(1.5);
            expect(configCall?.data.moldThreshold).toBe(2.0);
        });

        test('should configure multi-select entities', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card');
            const mockHass = createMockHass({ growspaceName: 'Test', rows: 4, cols: 4 });

            await card.evaluate((node: any, { config, hassData }) => {
                node.setConfig(config);
                node.hass = {
                    ...hassData,
                    callService: async (d: string, s: string, data: any) => {
                        await (window as any).trackServiceCall(d, s, data);
                        return Promise.resolve();
                    },
                    callWS: async () => Promise.resolve([]),
                    connection: { subscribeEvents: () => () => {}, sendMessagePromise: () => Promise.resolve() },
                    localize: (key: string) => `[${key}]`,
                };
                node.store.handleDeviceChange('test');
            }, {
                config: { type: 'custom:growspace-manager-card', entity: 'sensor.test' },
                hassData: JSON.parse(JSON.stringify(mockHass))
            });

            // Open dialog
            await card.locator('.menu-button').click();
            await card.locator('.menu-item', { hasText: 'Config' }).click();

            const dialog = page.locator('ha-dialog[open]');
            const envTab = dialog.locator('.config-tab', { hasText: 'Environment' });
            await envTab.click();

            // Fill multi-select fields using the search input
            const lightInput = dialog.locator('.multi-select-container', { hasText: 'Light Source' })
                .locator('.search-input-inner');
            await lightInput.fill('light.grow_light_1');
            await lightInput.press('Enter');

            await page.waitForTimeout(200);

            // Add another light
            await lightInput.fill('light.grow_light_2');
            await lightInput.press('Enter');

            // Verify chips are added
            const lightChips = dialog.locator('.multi-select-container', { hasText: 'Light Source' })
                .locator('.chip');
            await expect(lightChips).toHaveCount(2);

            // Fill exhaust fans
            const exhaustInput = dialog.locator('.multi-select-container', { hasText: 'Exhaust Fan' })
                .locator('.search-input-inner');
            await exhaustInput.fill('switch.exhaust_fan');
            await exhaustInput.press('Enter');

            // Save
            await dialog.locator('button.md3-button.primary', { hasText: 'Save Sensors' }).click();

            // Verify service call
            await page.waitForTimeout(500);
            const configCall = serviceCalls.find(c =>
                c.domain === 'growspace_manager' && c.service === 'configure_environment'
            );
            expect(configCall).toBeTruthy();
            expect(configCall?.data.lightSensors).toContain('light.grow_light_1');
            expect(configCall?.data.lightSensors).toContain('light.grow_light_2');
            expect(configCall?.data.exhaustFanEntities).toContain('switch.exhaust_fan');
        });

        test('should remove multi-select entities via chip', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card');
            const mockHass = createMockHass({ growspaceName: 'Test', rows: 4, cols: 4 });

            await card.evaluate((node: any, { config, hassData }) => {
                node.setConfig(config);
                node.hass = {
                    ...hassData,
                    callService: async () => Promise.resolve(),
                    callWS: async () => Promise.resolve([]),
                    connection: { subscribeEvents: () => () => {}, sendMessagePromise: () => Promise.resolve() },
                    localize: (key: string) => `[${key}]`,
                };
                node.store.handleDeviceChange('test');
            }, {
                config: { type: 'custom:growspace-manager-card', entity: 'sensor.test' },
                hassData: JSON.parse(JSON.stringify(mockHass))
            });

            // Open dialog
            await card.locator('.menu-button').click();
            await card.locator('.menu-item', { hasText: 'Config' }).click();

            const dialog = page.locator('ha-dialog[open]');
            await dialog.locator('.config-tab', { hasText: 'Environment' }).click();

            // Add two items
            const lightInput = dialog.locator('.multi-select-container', { hasText: 'Light Source' })
                .locator('.search-input-inner');
            await lightInput.fill('light.test1');
            await lightInput.press('Enter');
            await lightInput.fill('light.test2');
            await lightInput.press('Enter');

            await page.waitForTimeout(200);

            // Verify 2 chips exist
            let chips = dialog.locator('.multi-select-container', { hasText: 'Light Source' })
                .locator('.chip');
            await expect(chips).toHaveCount(2);

            // Click remove on first chip
            const removeBtn = chips.first().locator('.chip-remove');
            await removeBtn.click();

            await page.waitForTimeout(200);

            // Verify only 1 chip remains
            chips = dialog.locator('.multi-select-container', { hasText: 'Light Source' })
                .locator('.chip');
            await expect(chips).toHaveCount(1);
        });

        test('should toggle dehumidifier control checkbox', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card');
            const mockHass = createMockHass({ growspaceName: 'Test', rows: 4, cols: 4 });

            await card.evaluate((node: any, { config, hassData }) => {
                node.setConfig(config);
                node.hass = {
                    ...hassData,
                    callService: async (d: string, s: string, data: any) => {
                        await (window as any).trackServiceCall(d, s, data);
                        return Promise.resolve();
                    },
                    callWS: async () => Promise.resolve([]),
                    connection: { subscribeEvents: () => () => {}, sendMessagePromise: () => Promise.resolve() },
                    localize: (key: string) => `[${key}]`,
                };
                node.store.handleDeviceChange('test');
            }, {
                config: { type: 'custom:growspace-manager-card', entity: 'sensor.test' },
                hassData: JSON.parse(JSON.stringify(mockHass))
            });

            // Open dialog
            await card.locator('.menu-button').click();
            await card.locator('.menu-item', { hasText: 'Config' }).click();

            const dialog = page.locator('ha-dialog[open]');
            await dialog.locator('.config-tab', { hasText: 'Environment' }).click();

            // Find and toggle checkbox
            const checkbox = dialog.locator('input[type="checkbox"]');
            const isChecked = await checkbox.isChecked();

            await checkbox.click();
            await page.waitForTimeout(200);

            // Verify state changed
            const newState = await checkbox.isChecked();
            expect(newState).toBe(!isChecked);

            // Save and verify
            await dialog.locator('button.md3-button.primary', { hasText: 'Save Sensors' }).click();
            await page.waitForTimeout(500);

            const configCall = serviceCalls.find(c =>
                c.domain === 'growspace_manager' && c.service === 'configure_environment'
            );
            expect(configCall?.data.dehumidifierControlEnabled).toBe(newState);
        });
    });

    test.describe('Dehumidifier Tab', () => {
        test('should switch between dehumidifier stages', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card');
            const mockHass = createMockHass({ growspaceName: 'Test', rows: 4, cols: 4 });

            await card.evaluate((node: any, { config, hassData }) => {
                node.setConfig(config);
                node.hass = {
                    ...hassData,
                    callService: async () => Promise.resolve(),
                    callWS: async () => Promise.resolve([]),
                    connection: { subscribeEvents: () => () => {}, sendMessagePromise: () => Promise.resolve() },
                    localize: (key: string) => `[${key}]`,
                };
                node.store.handleDeviceChange('test');
            }, {
                config: { type: 'custom:growspace-manager-card', entity: 'sensor.test' },
                hassData: JSON.parse(JSON.stringify(mockHass))
            });

            // Open dialog
            await card.locator('.menu-button').click();
            await card.locator('.menu-item', { hasText: 'Config' }).click();

            const dialog = page.locator('ha-dialog[open]');
            const dehumTab = dialog.locator('.config-tab', { hasText: 'Dehumidifier' });
            await dehumTab.click();

            // Verify sub-tabs exist
            const subTabs = dialog.locator('.sub-tabs .config-tab');
            await expect(subTabs).toHaveCount(5); // seedling, veg, flower, drying, curing

            // Click on Vegetative stage
            const vegTab = subTabs.filter({ hasText: 'Vegetative' });
            await vegTab.click();

            // Verify the content updated (check for threshold inputs)
            await expect(dialog.locator('md3-number-input')).toHaveCount(4); // Day On/Off, Night On/Off
        });

        test('should update dehumidifier thresholds', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card');
            const mockHass = createMockHass({ growspaceName: 'Test', rows: 4, cols: 4 });

            await card.evaluate((node: any, { config, hassData }) => {
                node.setConfig(config);
                node.hass = {
                    ...hassData,
                    callService: async (d: string, s: string, data: any) => {
                        await (window as any).trackServiceCall(d, s, data);
                        return Promise.resolve();
                    },
                    callWS: async () => Promise.resolve([]),
                    connection: { subscribeEvents: () => () => {}, sendMessagePromise: () => Promise.resolve() },
                    localize: (key: string) => `[${key}]`,
                };
                node.store.handleDeviceChange('test');
            }, {
                config: { type: 'custom:growspace-manager-card', entity: 'sensor.test' },
                hassData: JSON.parse(JSON.stringify(mockHass))
            });

            // Open dialog
            await card.locator('.menu-button').click();
            await card.locator('.menu-item', { hasText: 'Config' }).click();

            const dialog = page.locator('ha-dialog[open]');
            await dialog.locator('.config-tab', { hasText: 'Dehumidifier' }).click();

            // Stay on Seedling stage (default)
            const thresholdInputs = dialog.locator('md3-number-input input');

            // Update Day On threshold (index 0)
            await thresholdInputs.nth(0).fill('0.7');

            // Update Day Off threshold (index 1)
            await thresholdInputs.nth(1).fill('0.9');

            // Update Night On threshold (index 2)
            await thresholdInputs.nth(2).fill('0.75');

            // Update Night Off threshold (index 3)
            await thresholdInputs.nth(3).fill('0.95');

            // Save
            const saveBtn = dialog.locator('button.md3-button.primary');
            await saveBtn.click();

            // Verify service call
            await page.waitForTimeout(500);
            const configCall = serviceCalls.find(c =>
                c.domain === 'growspace_manager' && c.service === 'configure_environment'
            );
            expect(configCall).toBeTruthy();
            expect(configCall?.data.dehumidifierThresholds).toBeTruthy();
            expect(configCall?.data.dehumidifierThresholds.seedling?.day?.on).toBe(0.7);
            expect(configCall?.data.dehumidifierThresholds.seedling?.day?.off).toBe(0.9);
            expect(configCall?.data.dehumidifierThresholds.seedling?.night?.on).toBe(0.75);
            expect(configCall?.data.dehumidifierThresholds.seedling?.night?.off).toBe(0.95);
        });

        test('should update thresholds for all stages', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card');
            const mockHass = createMockHass({ growspaceName: 'Test', rows: 4, cols: 4 });

            await card.evaluate((node: any, { config, hassData }) => {
                node.setConfig(config);
                node.hass = {
                    ...hassData,
                    callService: async (d: string, s: string, data: any) => {
                        await (window as any).trackServiceCall(d, s, data);
                        return Promise.resolve();
                    },
                    callWS: async () => Promise.resolve([]),
                    connection: { subscribeEvents: () => () => {}, sendMessagePromise: () => Promise.resolve() },
                    localize: (key: string) => `[${key}]`,
                };
                node.store.handleDeviceChange('test');
            }, {
                config: { type: 'custom:growspace-manager-card', entity: 'sensor.test' },
                hassData: JSON.parse(JSON.stringify(mockHass))
            });

            // Open dialog
            await card.locator('.menu-button').click();
            await card.locator('.menu-item', { hasText: 'Config' }).click();

            const dialog = page.locator('ha-dialog[open]');
            await dialog.locator('.config-tab', { hasText: 'Dehumidifier' }).click();

            const stages = ['Seedling', 'Vegetative', 'Flowering', 'Drying', 'Curing'];

            for (const stageName of stages) {
                // Click stage tab
                const stageTab = dialog.locator('.sub-tabs .config-tab', { hasText: stageName });
                await stageTab.click();
                await page.waitForTimeout(200);

                // Update first threshold input
                const firstInput = dialog.locator('md3-number-input input').first();
                await firstInput.fill('1.0');
                await page.waitForTimeout(100);
            }

            // Save
            await dialog.locator('button.md3-button.primary').click();
            await page.waitForTimeout(500);

            // Verify all stages were updated
            const configCall = serviceCalls.find(c =>
                c.domain === 'growspace_manager' && c.service === 'configure_environment'
            );
            expect(configCall?.data.dehumidifierThresholds).toBeTruthy();
            expect(configCall?.data.dehumidifierThresholds.seedling).toBeTruthy();
            expect(configCall?.data.dehumidifierThresholds.veg).toBeTruthy();
            expect(configCall?.data.dehumidifierThresholds.flower).toBeTruthy();
            expect(configCall?.data.dehumidifierThresholds.drying).toBeTruthy();
            expect(configCall?.data.dehumidifierThresholds.curing).toBeTruthy();
        });
    });

    test.describe('Dialog Closing', () => {
        test('should close dialog via close button', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card');
            const mockHass = createMockHass({ growspaceName: 'Test', rows: 4, cols: 4 });

            await card.evaluate((node: any, { config, hassData }) => {
                node.setConfig(config);
                node.hass = {
                    ...hassData,
                    callService: async () => Promise.resolve(),
                    callWS: async () => Promise.resolve([]),
                    connection: { subscribeEvents: () => () => {}, sendMessagePromise: () => Promise.resolve() },
                    localize: (key: string) => `[${key}]`,
                };
                node.store.handleDeviceChange('test');
            }, {
                config: { type: 'custom:growspace-manager-card', entity: 'sensor.test' },
                hassData: JSON.parse(JSON.stringify(mockHass))
            });

            // Open dialog
            await card.locator('.menu-button').click();
            await card.locator('.menu-item', { hasText: 'Config' }).click();

            const dialog = page.locator('ha-dialog[open]');
            await expect(dialog).toBeVisible();

            // Close via header button
            const closeBtn = dialog.locator('.dialog-header button.text');
            await closeBtn.click();

            // Verify dialog is closed
            await expect(dialog).not.toBeVisible();
        });

        test('should preserve data when switching tabs', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card');
            const mockHass = createMockHass({ growspaceName: 'Test', rows: 4, cols: 4 });

            await card.evaluate((node: any, { config, hassData }) => {
                node.setConfig(config);
                node.hass = {
                    ...hassData,
                    callService: async () => Promise.resolve(),
                    callWS: async () => Promise.resolve([]),
                    connection: { subscribeEvents: () => () => {}, sendMessagePromise: () => Promise.resolve() },
                    localize: (key: string) => `[${key}]`,
                };
                node.store.handleDeviceChange('test');
            }, {
                config: { type: 'custom:growspace-manager-card', entity: 'sensor.test' },
                hassData: JSON.parse(JSON.stringify(mockHass))
            });

            // Open dialog
            await card.locator('.menu-button').click();
            await card.locator('.menu-item', { hasText: 'Config' }).click();

            const dialog = page.locator('ha-dialog[open]');

            // Fill some data in Environment tab
            await dialog.locator('.config-tab', { hasText: 'Environment' }).click();
            await dialog.locator('md3-text-input[label="Temperature Sensor ID"] input')
                .fill('sensor.temp_test');

            // Switch to Add Growspace tab
            await dialog.locator('.config-tab', { hasText: 'Add Growspace' }).click();
            await dialog.locator('md3-text-input[label="Growspace Name"] input')
                .fill('Test Growspace');

            // Switch back to Environment tab
            await dialog.locator('.config-tab', { hasText: 'Environment' }).click();

            // Verify data is preserved
            const tempInput = dialog.locator('md3-text-input[label="Temperature Sensor ID"] input');
            await expect(tempInput).toHaveValue('sensor.temp_test');

            // Switch back to Add Growspace
            await dialog.locator('.config-tab', { hasText: 'Add Growspace' }).click();
            const nameInput = dialog.locator('md3-text-input[label="Growspace Name"] input');
            await expect(nameInput).toHaveValue('Test Growspace');
        });
    });
});
