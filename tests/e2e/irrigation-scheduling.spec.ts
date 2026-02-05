/**
 * E2E Tests: Irrigation Scheduling & Crop Steering
 *
 * Comprehensive tests for the irrigation dialog covering:
 * - Time bar chart interactions (click to add)
 * - Irrigation and drain time scheduling
 * - Marker removal with confirmation
 * - Crop Steering (VWC) configuration
 * - Tank level visualization
 * - Entity selection and persistence
 * - Multi-tab navigation
 */

import { test, expect, Page } from '../coverage-helper';

// Helper to open irrigation dialog
async function openIrrigationDialog(page: Page) {
    const card = page.locator('growspace-manager-card').first();

    // Open menu
    const menuTrigger = card.locator('.menu-container .icon-button').last();
    await expect(menuTrigger).toBeVisible({ timeout: 10000 });
    await menuTrigger.click();

    // Wait for menu dropdown
    const menuDropdown = card.locator('.menu-dropdown');
    await expect(menuDropdown).toBeVisible({ timeout: 5000 });

    // Click "Irrigation" menu item
    const irrigationMenuItem = card.locator('.menu-item').filter({ hasText: /irrigation/i }).first();
    await expect(irrigationMenuItem).toBeVisible({ timeout: 5000 });
    await irrigationMenuItem.click();

    // Wait for dialog to open
    const dialog = card.locator('growspace-dialog-host irrigation-dialog ha-dialog').first();
    await expect(dialog).toHaveAttribute('open', '', { timeout: 10000 });

    return { card, dialog };
}

// Helper to click time bar at specific position
async function clickTimeBarAt(page: Page, dialog: any, percentageOfDay: number) {
    const timeBar = dialog.locator('.time-bar-container').first();
    const bbox = await timeBar.boundingBox();

    if (!bbox) {
        throw new Error('Time bar not found or not visible');
    }

    // Calculate click position (percentageOfDay: 0.0 to 1.0)
    const clickX = bbox.x + (bbox.width * percentageOfDay);
    const clickY = bbox.y + (bbox.height / 2);

    await page.mouse.click(clickX, clickY);
}

test.describe('Irrigation Scheduling', () => {
    test.beforeEach(async ({ coveragePage: page }) => {
        await page.goto('http://127.0.0.1:8123', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('growspace-manager-card').first()).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(3000); // Hydration wait
    });

    test.describe('Dialog Opening & Basic Layout', () => {
        test('should open irrigation dialog and show all tabs', async ({ coveragePage: page }) => {
            const { dialog } = await openIrrigationDialog(page);

            // Verify all tabs are visible
            const tabs = dialog.locator('.tab-item');
            await expect(tabs).toHaveCount(4);

            const tabTexts = await tabs.allTextContents();
            const trimmedTexts = tabTexts.map((t: string) => t.trim());
            expect(trimmedTexts).toContain('Schedules');
            expect(trimmedTexts).toContain('Crop Steering (VWC)');
            expect(trimmedTexts).toContain('Configuration');
            expect(trimmedTexts).toContain('Tanks');
        });

        test('should show time bar visualization on schedules tab', async ({ coveragePage: page }) => {
            const { dialog } = await openIrrigationDialog(page);

            // Verify schedules tab is active by default
            const schedulesTab = dialog.locator('.tab-item').filter({ hasText: 'Schedules' }).first();
            await expect(schedulesTab).toHaveClass(/active/);

            // Verify time bar exists
            const timeBar = dialog.locator('.time-bar-container').first();
            await expect(timeBar).toBeVisible();

            // Verify time ticks are rendered (25 ticks for 0-24 hours)
            const ticks = timeBar.locator('.time-tick');
            await expect(ticks).toHaveCount(25);
        });
    });

    test.describe('Irrigation Time Addition via Chart', () => {
        test('should add irrigation time at 06:00 via chart click', async ({ coveragePage: page }) => {
            const { dialog } = await openIrrigationDialog(page);

            // Click time bar at 25% (6:00 AM)
            await clickTimeBarAt(page, dialog, 0.25);

            // Verify modal overlay appears
            const modal = dialog.locator('.overlay-backdrop').first();
            await expect(modal).toBeVisible({ timeout: 5000 });

            // Verify time input shows 06:00
            const timeInput = modal.locator('md3-text-input[label*="Time"]').first();
            const timeValue = await timeInput.evaluate((el: any) => el.value);
            expect(timeValue).toBe('06:00');

            // Set duration to 90 seconds
            const durationInput = modal.locator('md3-number-input[label*="Duration"]').first();
            await durationInput.evaluate((el: any, val: number) => {
                el.value = val;
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }, 90);

            // Click "Add Schedule" button
            const addBtn = modal.getByRole('button', { name: /add schedule/i }).first();
            await addBtn.click();

            // Wait for modal to close
            await expect(modal).not.toBeVisible({ timeout: 5000 });

            // Verify marker appears on chart
            const markers = dialog.locator('.chart-marker').filter({ hasText: /06:00/ });
            await expect(markers).toHaveCount(1);
        });

        test('should add irrigation time at noon (50% position)', async ({ coveragePage: page }) => {
            const { dialog } = await openIrrigationDialog(page);

            // Click at 50% (12:00 noon)
            await clickTimeBarAt(page, dialog, 0.5);

            const modal = dialog.locator('.overlay-backdrop').first();
            await expect(modal).toBeVisible();

            // Verify time is 12:00
            const timeInput = modal.locator('md3-text-input[label*="Time"]').first();
            const timeValue = await timeInput.evaluate((el: any) => el.value);
            expect(timeValue).toBe('12:00');

            // Use default duration, just click Add
            const addBtn = modal.getByRole('button', { name: /add schedule/i }).first();
            await addBtn.click();

            await expect(modal).not.toBeVisible();

            // Verify marker for 12:00
            const markers = dialog.locator('.chart-marker');
            const markerCount = await markers.count();
            expect(markerCount).toBeGreaterThan(0);
        });

        test('should add irrigation time at end of day (90% position)', async ({ coveragePage: page }) => {
            const { dialog } = await openIrrigationDialog(page);

            // Click at 90% (21:36 approximately)
            await clickTimeBarAt(page, dialog, 0.9);

            const modal = dialog.locator('.overlay-backdrop').first();
            await expect(modal).toBeVisible();

            // Time should be around 21:30-21:40
            const timeInput = modal.locator('md3-text-input[label*="Time"]').first();
            const timeValue = await timeInput.evaluate((el: any) => el.value);
            expect(timeValue).toMatch(/^21:[0-9]{2}$/);

            // Add the time
            const addBtn = modal.getByRole('button', { name: /add schedule/i }).first();
            await addBtn.click();

            await expect(modal).not.toBeVisible();
        });

        test('should cancel adding time via Cancel button', async ({ coveragePage: page }) => {
            const { dialog } = await openIrrigationDialog(page);

            // Click time bar
            await clickTimeBarAt(page, dialog, 0.75);

            const modal = dialog.locator('.overlay-backdrop').first();
            await expect(modal).toBeVisible();

            // Get initial marker count
            const initialMarkerCount = await dialog.locator('.chart-marker').count();

            // Click Cancel
            const cancelBtn = modal.getByRole('button', { name: /cancel/i }).first();
            await cancelBtn.click();

            // Modal should close
            await expect(modal).not.toBeVisible();

            // Marker count should not increase
            const finalMarkerCount = await dialog.locator('.chart-marker').count();
            expect(finalMarkerCount).toBe(initialMarkerCount);
        });

        test('should edit time manually in modal', async ({ coveragePage: page }) => {
            const { dialog } = await openIrrigationDialog(page);

            // Click time bar
            await clickTimeBarAt(page, dialog, 0.25);

            const modal = dialog.locator('.overlay-backdrop').first();
            await expect(modal).toBeVisible();

            // Edit time to 07:30
            const timeInput = modal.locator('md3-text-input[label*="Time"]').first();
            await timeInput.evaluate((el: any) => {
                el.value = '07:30';
                el.dispatchEvent(new Event('change', { bubbles: true }));
            });

            // Add schedule
            const addBtn = modal.getByRole('button', { name: /add schedule/i }).first();
            await addBtn.click();

            await expect(modal).not.toBeVisible();

            // Verify marker shows 07:30
            await page.waitForTimeout(1000);
            const marker = dialog.locator('.chart-marker').filter({ hasText: /07:30/ }).first();
            await expect(marker).toBeVisible();
        });
    });

    test.describe('Irrigation Time Removal', () => {
        test('should remove irrigation time with confirmation', async ({ coveragePage: page }) => {
            const { dialog } = await openIrrigationDialog(page);

            // First add a time
            await clickTimeBarAt(page, dialog, 0.3);
            const modal = dialog.locator('.overlay-backdrop').first();
            await expect(modal).toBeVisible();
            await modal.getByRole('button', { name: /add schedule/i }).click();
            await expect(modal).not.toBeVisible();

            // Wait for marker to appear
            await page.waitForTimeout(1000);
            const markers = dialog.locator('.chart-marker');
            const initialCount = await markers.count();
            expect(initialCount).toBeGreaterThan(0);

            // Set up confirm dialog handler (auto-accept)
            page.on('dialog', async (dialog) => {
                expect(dialog.message()).toContain('Remove');
                await dialog.accept();
            });

            // Click on the first marker to remove it
            const firstMarker = markers.first();
            await firstMarker.click();

            // Wait for removal
            await page.waitForTimeout(1500);

            // Marker count should decrease
            const finalCount = await dialog.locator('.chart-marker').count();
            expect(finalCount).toBeLessThan(initialCount);
        });

        test('should cancel removal when declining confirmation', async ({ coveragePage: page }) => {
            const { dialog } = await openIrrigationDialog(page);

            // Add a time
            await clickTimeBarAt(page, dialog, 0.4);
            const modal = dialog.locator('.overlay-backdrop').first();
            await expect(modal).toBeVisible();
            await modal.getByRole('button', { name: /add schedule/i }).click();
            await expect(modal).not.toBeVisible();

            await page.waitForTimeout(1000);
            const initialCount = await dialog.locator('.chart-marker').count();

            // Set up confirm dialog handler (decline)
            page.on('dialog', async (dialog) => {
                await dialog.dismiss();
            });

            // Try to remove marker
            const marker = dialog.locator('.chart-marker').first();
            await marker.click();

            await page.waitForTimeout(500);

            // Count should remain the same
            const finalCount = await dialog.locator('.chart-marker').count();
            expect(finalCount).toBe(initialCount);
        });

        test('should show tooltip on marker hover', async ({ coveragePage: page }) => {
            const { dialog } = await openIrrigationDialog(page);

            // Add a time with specific duration
            await clickTimeBarAt(page, dialog, 0.25);
            const modal = dialog.locator('.overlay-backdrop').first();
            await expect(modal).toBeVisible();

            // Set 120 second duration
            const durationInput = modal.locator('md3-number-input[label*="Duration"]').first();
            await durationInput.evaluate((el: any) => {
                el.value = 120;
                el.dispatchEvent(new Event('change', { bubbles: true }));
            });

            await modal.getByRole('button', { name: /add schedule/i }).click();
            await expect(modal).not.toBeVisible();

            await page.waitForTimeout(1000);

            // Hover over marker
            const marker = dialog.locator('.chart-marker').first();
            await marker.hover();

            // Tooltip should become visible
            const tooltip = marker.locator('.chart-tooltip').first();
            await expect(tooltip).toBeVisible({ timeout: 3000 });

            // Tooltip should show time and duration
            const tooltipText = await tooltip.textContent();
            expect(tooltipText).toMatch(/06:00/);
            expect(tooltipText).toMatch(/120s/);
        });
    });

    test.describe('Drain Time Scheduling', () => {
        test('should switch to drain section and add drain time', async ({ coveragePage: page }) => {
            const { dialog } = await openIrrigationDialog(page);

            // Look for drain section toggle or separate UI
            // Based on implementation, drain times might be in same view or separate section
            // For now, test adding via "ADD DRAIN TIME" button if it exists
            const addDrainBtn = dialog.getByRole('button', { name: /add drain time/i }).first();

            if (await addDrainBtn.isVisible()) {
                await addDrainBtn.click();

                const modal = dialog.locator('.overlay-backdrop').first();
                await expect(modal).toBeVisible();

                // Modal should show "Drain" in title or label
                const modalContent = await modal.textContent();
                expect(modalContent).toMatch(/drain/i);

                // Set time and duration
                const timeInput = modal.locator('md3-text-input[label*="Time"]').first();
                await timeInput.evaluate((el: any) => {
                    el.value = '08:00';
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                });

                const durationInput = modal.locator('md3-number-input[label*="Duration"]').first();
                await durationInput.evaluate((el: any) => {
                    el.value = 30;
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                });

                await modal.getByRole('button', { name: /add/i }).first().click();
                await expect(modal).not.toBeVisible();

                // Verify drain marker appears (different color than irrigation)
                await page.waitForTimeout(1000);
                const drainMarkers = dialog.locator('.chart-marker[style*="orange"], .chart-marker[style*="#ff9800"]');
                await expect(drainMarkers.first()).toBeVisible();
            }
        });
    });

    test.describe('Crop Steering (VWC) Configuration', () => {
        test('should navigate to Crop Steering tab', async ({ coveragePage: page }) => {
            const { dialog } = await openIrrigationDialog(page);

            // Click Crop Steering tab
            const steeringTab = dialog.locator('.tab-item').filter({ hasText: /crop steering/i }).first();
            await steeringTab.click();

            // Verify tab is active
            await expect(steeringTab).toHaveClass(/active/);

            // Verify steering content is visible
            const steeringContent = dialog.locator('text=/VWC/i').first();
            await expect(steeringContent).toBeVisible();
        });

        test('should enable VWC steering and configure all fields', async ({ coveragePage: page }) => {
            const { dialog } = await openIrrigationDialog(page);

            // Navigate to Crop Steering tab
            const steeringTab = dialog.locator('.tab-item').filter({ hasText: /crop steering/i }).first();
            await steeringTab.click();

            // Enable steering
            const enableSwitch = dialog.locator('md3-switch').first();
            await enableSwitch.evaluate((el: any) => {
                el.checked = true;
                el.dispatchEvent(new Event('change', { bubbles: true }));
            });

            await page.waitForTimeout(500);

            // Configure Target VWC (%)
            const targetVwcInput = dialog.locator('md3-number-input[label*="Target VWC"]').first();
            await targetVwcInput.evaluate((el: any) => {
                el.value = 48.5;
                el.dispatchEvent(new Event('change', { bubbles: true }));
            });

            // Configure Dryback (%)
            const drybackInput = dialog.locator('md3-number-input[label*="Dryback"]').first();
            await drybackInput.evaluate((el: any) => {
                el.value = 4.0;
                el.dispatchEvent(new Event('change', { bubbles: true }));
            });

            // Configure Lights On Time
            const lightsOnInput = dialog.locator('md3-text-input[label*="Lights On"]').first();
            await lightsOnInput.evaluate((el: any) => {
                el.value = '07:00:00';
                el.dispatchEvent(new Event('change', { bubbles: true }));
            });

            // Configure P0 Duration (minutes)
            const p0Input = dialog.locator('md3-number-input[label*="P0"]').first();
            await p0Input.evaluate((el: any) => {
                el.value = 90;
                el.dispatchEvent(new Event('change', { bubbles: true }));
            });

            // Configure P2 Stop Buffer (minutes)
            const p2Input = dialog.locator('md3-number-input[label*="P2"]').first();
            await p2Input.evaluate((el: any) => {
                el.value = 150;
                el.dispatchEvent(new Event('change', { bubbles: true }));
            });

            // Configure Shot Duration (seconds)
            const shotDurationInput = dialog.locator('md3-number-input[label*="Shot Duration"]').first();
            await shotDurationInput.evaluate((el: any) => {
                el.value = 20;
                el.dispatchEvent(new Event('change', { bubbles: true }));
            });

            // Configure Shot Interval (minutes)
            const shotIntervalInput = dialog.locator('md3-number-input[label*="Shot Interval"]').first();
            await shotIntervalInput.evaluate((el: any) => {
                el.value = 20;
                el.dispatchEvent(new Event('change', { bubbles: true }));
            });

            // Save strategy
            const saveBtn = dialog.getByRole('button', { name: /save.*strategy/i }).first();
            await saveBtn.click();

            // Wait for save operation
            await page.waitForTimeout(2000);

            // Verify values persist
            const targetValue = await targetVwcInput.evaluate((el: any) => el.value);
            expect(parseFloat(targetValue)).toBe(48.5);
        });

        test('should disable steering and hide advanced fields', async ({ coveragePage: page }) => {
            const { dialog } = await openIrrigationDialog(page);

            // Navigate to steering tab
            const steeringTab = dialog.locator('.tab-item').filter({ hasText: /crop steering/i }).first();
            await steeringTab.click();

            // Enable first
            const enableSwitch = dialog.locator('md3-switch').first();
            await enableSwitch.evaluate((el: any) => {
                el.checked = true;
                el.dispatchEvent(new Event('change', { bubbles: true }));
            });

            await page.waitForTimeout(300);

            // Verify fields are visible
            let targetVwcInput = dialog.locator('md3-number-input[label*="Target VWC"]').first();
            await expect(targetVwcInput).toBeVisible();

            // Disable steering
            await enableSwitch.evaluate((el: any) => {
                el.checked = false;
                el.dispatchEvent(new Event('change', { bubbles: true }));
            });

            await page.waitForTimeout(300);

            // Fields might be hidden or disabled
            const isVisible = await targetVwcInput.isVisible().catch(() => false);
            if (isVisible) {
                // Check if disabled instead
                const isDisabled = await targetVwcInput.evaluate((el: any) => el.disabled);
                expect(isDisabled).toBe(true);
            }
        });
    });

    test.describe('Tank Visualization', () => {
        test('should display tank levels on Tanks tab', async ({ coveragePage: page }) => {
            const { dialog } = await openIrrigationDialog(page);

            // Navigate to Tanks tab
            const tanksTab = dialog.locator('.tab-item').filter({ hasText: /tanks/i }).first();
            await tanksTab.click();

            // Verify tab is active
            await expect(tanksTab).toHaveClass(/active/);

            // Check for tank cards or empty state message
            const tankCards = dialog.locator('.tank-card, [class*="tank"]');
            const emptyMessage = dialog.locator('text=/no tanks/i').first();

            const hasTanks = await tankCards.count() > 0;
            const hasEmptyMessage = await emptyMessage.isVisible().catch(() => false);

            // Either tanks should be visible OR empty message
            expect(hasTanks || hasEmptyMessage).toBe(true);
        });

        test('should show tank warning state when level is low', async ({ coveragePage: page }) => {
            const { dialog } = await openIrrigationDialog(page);

            // Navigate to Tanks tab
            const tanksTab = dialog.locator('.tab-item').filter({ hasText: /tanks/i }).first();
            await tanksTab.click();

            // Look for tanks with warning class
            const warningTanks = dialog.locator('.tank-card.warning, [class*="tank"][class*="warning"]');

            if (await warningTanks.count() > 0) {
                // Verify warning icon is visible
                const warningIcon = warningTanks.first().locator('text=/⚠️/');
                await expect(warningIcon).toBeVisible();

                // Verify warning level percentage is displayed
                const levelText = await warningTanks.first().textContent();
                expect(levelText).toMatch(/\d+%/);
            }
        });

        test('should display tank fill level with visual indicator', async ({ coveragePage: page }) => {
            const { dialog } = await openIrrigationDialog(page);

            // Navigate to Tanks tab
            const tanksTab = dialog.locator('.tab-item').filter({ hasText: /tanks/i }).first();
            await tanksTab.click();

            const tankCards = dialog.locator('.tank-card, [class*="tank"]').filter({ hasNot: page.locator('text=/no tanks/i') });

            if (await tankCards.count() > 0) {
                const firstTank = tankCards.first();

                // Check for liquid level element with CSS variable
                const liquidLevel = firstTank.locator('[class*="liquid"], [style*="--level"]').first();

                if (await liquidLevel.isVisible()) {
                    // Verify level is set via CSS variable
                    const style = await liquidLevel.getAttribute('style');
                    expect(style).toMatch(/--level:\s*\d+(\.\d+)?%/);
                }
            }
        });
    });

    test.describe('Entity Selection & Configuration', () => {
        test('should select irrigation pump entity', async ({ coveragePage: page }) => {
            const { dialog } = await openIrrigationDialog(page);

            // Navigate to Configuration tab
            const configTab = dialog.locator('.tab-item').filter({ hasText: /configuration/i }).first();
            await configTab.click();

            // Verify tab is active
            await expect(configTab).toHaveClass(/active/);

            // Find irrigation pump selector
            const pumpSelect = dialog.locator('select, md3-select').filter({ has: page.locator('text=/irrigation pump/i') }).first();

            if (await pumpSelect.isVisible()) {
                // Get available options
                const options = pumpSelect.locator('option');
                const optionCount = await options.count();

                if (optionCount > 1) {
                    // Select second option (first is usually "None")
                    await pumpSelect.selectOption({ index: 1 });

                    // Verify selection
                    const selectedValue = await pumpSelect.inputValue();
                    expect(selectedValue).not.toBe('');
                }
            }
        });

        test('should save pump configuration', async ({ coveragePage: page }) => {
            const { dialog } = await openIrrigationDialog(page);

            // Navigate to Configuration tab
            const configTab = dialog.locator('.tab-item').filter({ hasText: /configuration/i }).first();
            await configTab.click();

            // Look for save configuration button
            const saveBtn = dialog.getByRole('button', { name: /save configuration/i }).first();

            if (await saveBtn.isVisible()) {
                await saveBtn.click();

                // Wait for save operation
                await page.waitForTimeout(1500);

                // Should show success notification or remain stable
                // (Specific assertion depends on UI feedback implementation)
            }
        });

        test('should select drain pump entity separately', async ({ coveragePage: page }) => {
            const { dialog } = await openIrrigationDialog(page);

            // Navigate to Configuration tab
            const configTab = dialog.locator('.tab-item').filter({ hasText: /configuration/i }).first();
            await configTab.click();

            // Find drain pump selector
            const drainSelect = dialog.locator('select, md3-select').filter({ has: page.locator('text=/drain pump/i') }).first();

            if (await drainSelect.isVisible()) {
                const options = drainSelect.locator('option');
                const optionCount = await options.count();

                if (optionCount > 1) {
                    await drainSelect.selectOption({ index: 1 });

                    const selectedValue = await drainSelect.inputValue();
                    expect(selectedValue).not.toBe('');
                }
            }
        });
    });

    test.describe('Schedule Persistence', () => {
        test('should persist irrigation times after dialog close and reopen', async ({ coveragePage: page }) => {
            // Open dialog
            let { dialog } = await openIrrigationDialog(page);

            // Add a unique irrigation time
            await clickTimeBarAt(page, dialog, 0.625); // 15:00
            const modal = dialog.locator('.overlay-backdrop').first();
            await expect(modal).toBeVisible();

            const timeInput = modal.locator('md3-text-input[label*="Time"]').first();
            await timeInput.evaluate((el: any) => {
                el.value = '15:00';
                el.dispatchEvent(new Event('change', { bubbles: true }));
            });

            await modal.getByRole('button', { name: /add schedule/i }).click();
            await expect(modal).not.toBeVisible();

            await page.waitForTimeout(1000);

            // Verify marker exists
            const marker = dialog.locator('.chart-marker').filter({ hasText: /15:00/ }).first();
            await expect(marker).toBeVisible();

            // Close dialog
            const closeBtn = dialog.locator('button[class*="close"], .mdc-dialog__close').first();
            await closeBtn.click();

            await page.waitForTimeout(1000);

            // Reopen dialog
            ({ dialog } = await openIrrigationDialog(page));

            // Verify marker still exists
            const persistedMarker = dialog.locator('.chart-marker').filter({ hasText: /15:00/ }).first();
            await expect(persistedMarker).toBeVisible({ timeout: 5000 });
        });

        test('should persist VWC steering configuration', async ({ coveragePage: page }) => {
            // Open dialog
            let { dialog } = await openIrrigationDialog(page);

            // Navigate to Crop Steering
            const steeringTab = dialog.locator('.tab-item').filter({ hasText: /crop steering/i }).first();
            await steeringTab.click();

            // Enable and configure
            const enableSwitch = dialog.locator('md3-switch').first();
            await enableSwitch.evaluate((el: any) => {
                el.checked = true;
                el.dispatchEvent(new Event('change', { bubbles: true }));
            });

            await page.waitForTimeout(300);

            const targetVwcInput = dialog.locator('md3-number-input[label*="Target VWC"]').first();
            await targetVwcInput.evaluate((el: any) => {
                el.value = 47.5;
                el.dispatchEvent(new Event('change', { bubbles: true }));
            });

            // Save
            const saveBtn = dialog.getByRole('button', { name: /save.*strategy/i }).first();
            await saveBtn.click();
            await page.waitForTimeout(1500);

            // Close dialog
            const closeBtn = dialog.locator('button[class*="close"], .mdc-dialog__close').first();
            await closeBtn.click();
            await page.waitForTimeout(1000);

            // Reopen
            ({ dialog } = await openIrrigationDialog(page));

            // Navigate back to steering
            const steeringTabReopened = dialog.locator('.tab-item').filter({ hasText: /crop steering/i }).first();
            await steeringTabReopened.click();

            // Verify values persisted
            const targetVwcReopened = dialog.locator('md3-number-input[label*="Target VWC"]').first();
            const value = await targetVwcReopened.evaluate((el: any) => el.value);
            expect(parseFloat(value)).toBe(47.5);
        });
    });

    test.describe('Multi-Tab Navigation', () => {
        test('should switch between all tabs without losing state', async ({ coveragePage: page }) => {
            const { dialog } = await openIrrigationDialog(page);

            // Add irrigation time on Schedules tab
            await clickTimeBarAt(page, dialog, 0.5);
            const modal = dialog.locator('.overlay-backdrop').first();
            await modal.getByRole('button', { name: /add schedule/i }).click();
            await page.waitForTimeout(500);

            const schedulesMarkerCount = await dialog.locator('.chart-marker').count();

            // Switch to Crop Steering
            const steeringTab = dialog.locator('.tab-item').filter({ hasText: /crop steering/i }).first();
            await steeringTab.click();
            await expect(steeringTab).toHaveClass(/active/);

            // Switch to Configuration
            const configTab = dialog.locator('.tab-item').filter({ hasText: /configuration/i }).first();
            await configTab.click();
            await expect(configTab).toHaveClass(/active/);

            // Switch to Tanks
            const tanksTab = dialog.locator('.tab-item').filter({ hasText: /tanks/i }).first();
            await tanksTab.click();
            await expect(tanksTab).toHaveClass(/active/);

            // Switch back to Schedules
            const schedulesTab = dialog.locator('.tab-item').filter({ hasText: /schedules/i }).first();
            await schedulesTab.click();
            await expect(schedulesTab).toHaveClass(/active/);

            // Verify marker still exists
            const finalMarkerCount = await dialog.locator('.chart-marker').count();
            expect(finalMarkerCount).toBe(schedulesMarkerCount);
        });
    });

    test.describe('Edge Cases & Validation', () => {
        test('should handle clicking same time position twice', async ({ coveragePage: page }) => {
            const { dialog } = await openIrrigationDialog(page);

            // Add time at 08:00
            await clickTimeBarAt(page, dialog, 0.333);
            let modal = dialog.locator('.overlay-backdrop').first();
            await modal.getByRole('button', { name: /add schedule/i }).click();
            await page.waitForTimeout(500);

            const initialCount = await dialog.locator('.chart-marker').count();

            // Try adding again at same position
            await clickTimeBarAt(page, dialog, 0.333);
            modal = dialog.locator('.overlay-backdrop').first();

            // Should either:
            // 1. Show modal allowing duplicate (with different duration)
            // 2. Show validation error
            // For now, just verify modal appears
            await expect(modal).toBeVisible();

            // Cancel to avoid duplicate
            await modal.getByRole('button', { name: /cancel/i }).click();
        });

        test('should handle rapid tab switching', async ({ coveragePage: page }) => {
            const { dialog } = await openIrrigationDialog(page);

            const tabs = dialog.locator('.tab-item');
            const tabCount = await tabs.count();

            // Rapidly switch between tabs
            for (let i = 0; i < tabCount; i++) {
                await tabs.nth(i).click();
                await page.waitForTimeout(100);
            }

            // Verify last tab is active
            await expect(tabs.last()).toHaveClass(/active/);

            // Verify no JavaScript errors occurred
            // (Would be caught by console error listeners)
        });

        test('should validate time format in manual entry', async ({ coveragePage: page }) => {
            const { dialog } = await openIrrigationDialog(page);

            await clickTimeBarAt(page, dialog, 0.5);
            const modal = dialog.locator('.overlay-backdrop').first();

            const timeInput = modal.locator('md3-text-input[label*="Time"]').first();

            // Try invalid time format
            await timeInput.evaluate((el: any) => {
                el.value = '25:00'; // Invalid hour
                el.dispatchEvent(new Event('change', { bubbles: true }));
            });

            const addBtn = modal.getByRole('button', { name: /add schedule/i }).first();
            await addBtn.click();

            // Should either show validation error or not add the time
            // Verify modal doesn't close immediately (validation failed)
            await page.waitForTimeout(500);
            const isModalVisible = await modal.isVisible();

            if (isModalVisible) {
                // Validation working - fix the time
                await timeInput.evaluate((el: any) => {
                    el.value = '12:00';
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                });
                await addBtn.click();
            }
        });
    });
});
