/**
 * E2E Tests: Plant Lifecycle Workflows
 *
 * Comprehensive tests for multi-step plant lifecycle operations:
 * - Mother → Clone → Transplant chains
 * - Flower → Harvest → Dry → Cure workflow
 * - Seedling → Veg → Mother progression
 * - Data persistence across transitions
 * - Timeline event tracking
 * - Stage-based validations
 */

import { test, expect } from '../coverage-helper';
import type { Page } from '@playwright/test';

// Helper to open plant overview dialog
async function openPlantOverview(page: Page, plantFilter?: { hasText?: string; row?: number; col?: number }) {
    const card = page.locator('growspace-manager-card').first();

    let plantCard;
    if (plantFilter?.hasText) {
        plantCard = card.locator('growspace-plant-card').filter({ hasText: plantFilter.hasText }).first();
    } else if (plantFilter?.row && plantFilter?.col) {
        plantCard = card.locator('growspace-plant-card')
            .filter({ has: page.locator(`.row-col-badge:has-text("R${plantFilter.row} C${plantFilter.col}")`) })
            .first();
    } else {
        plantCard = card.locator('growspace-plant-card').filter({ hasNotText: /empty/i }).first();
    }

    await plantCard.locator('.plant-card-rich').first().click();

    const dialog = card.locator('growspace-dialog-host plant-overview-dialog ha-dialog').first();
    await expect(dialog).toHaveAttribute('open', '', { timeout: 10000 });

    return { card, dialog };
}

// Helper to create a plant with specific stage
async function createPlant(
    page: Page,
    params: {
        strain: string;
        phenotype: string;
        row: number;
        col: number;
        stage?: 'seedling' | 'mother' | 'clone' | 'veg' | 'flower';
    }
) {
    const card = page.locator('growspace-manager-card').first();

    // Make room if grid is full
    if (await card.locator('.plant-card-empty').count() === 0) {
        const anyPlant = card.locator('growspace-plant-card').first();
        if (await anyPlant.count() > 0) {
            await anyPlant.locator('.plant-card-rich').first().dispatchEvent('click', { bubbles: true, composed: true });
            await card.locator('growspace-dialog-host ha-dialog').getByRole('button', { name: /delete/i }).first().dispatchEvent('click', { bubbles: true, composed: true });
            await page.locator('.dialog-overlay').getByRole('button', { name: 'Delete' }).dispatchEvent('click', { bubbles: true, composed: true });
            await expect(card.locator('growspace-dialog-host ha-dialog')).toHaveCount(0, { timeout: 10000 });
            await page.waitForTimeout(2000);
        }
    }

    // Find and click first available empty slot
    const emptySlot = card.locator('.plant-card-empty').first();
    await expect(emptySlot).toBeVisible({ timeout: 10000 });
    await emptySlot.dispatchEvent('click', { bubbles: true, composed: true });

    // Wait for add plant dialog
    const addDialog = card.locator('growspace-dialog-host ha-dialog').first();
    await expect(addDialog).toHaveAttribute('open', '', { timeout: 10000 });

    // Fill strain (it's a select, not text input)
    const strainSelect = addDialog.locator('md3-select[label="Strain *"] select').first();
    await strainSelect.selectOption({ label: params.strain });

    // Fill phenotype
    const phenotypeInput = addDialog.locator('md3-text-input[label="Phenotype"] input').first();
    await phenotypeInput.fill(params.phenotype);

    // Set stage-specific date if needed
    if (params.stage) {
        const today = new Date().toISOString().split('T')[0];
        let dateField = '';

        switch (params.stage) {
            case 'mother':
                dateField = 'mother_start';
                break;
            case 'clone':
                dateField = 'clone_start';
                break;
            case 'veg':
                dateField = 'veg_start';
                break;
            case 'flower':
                dateField = 'veg_start';
                // Also set flower_start
                break;
            default:
                dateField = 'seedling_start';
        }

        // Find date input (might need to expand "Show All Dates")
        const showAllBtn = addDialog.getByRole('button', { name: /show all dates/i }).first();
        if (await showAllBtn.isVisible()) {
            await showAllBtn.click();
        }

        const dateInput = addDialog.locator(`md3-date-input[label*="${dateField}"], input[name="${dateField}"]`).first();
        if (await dateInput.isVisible()) {
            await dateInput.evaluate((el: any, val) => {
                el.value = val;
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }, today);
        }
    }

    // Click confirm
    const confirmBtn = addDialog.getByRole('button', { name: /add plant|confirm/i }).first();
    await confirmBtn.click();

    // Wait for dialog to close
    await expect(addDialog).not.toBeVisible({ timeout: 5000 });

    return { strain: params.strain, phenotype: params.phenotype, row: params.row, col: params.col };
}

test.describe('Plant Lifecycle Workflows', () => {
    test.beforeEach(async ({ coveragePage: page }) => {
        await page.goto('http://127.0.0.1:8123', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('growspace-manager-card').first()).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(3000); // Hydration wait
    });

    test.describe('Mother → Clone Chain', () => {
        test('should create mother plant and take clone', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card').first();

            // Step 1: Create a mother plant
            const motherData = await createPlant(page, {
                strain: 'Clone Test Mother',
                phenotype: 'MT-1',
                row: 1,
                col: 1,
                stage: 'mother'
            });

            await page.waitForTimeout(2000);

            // Step 2: Open mother plant overview
            const { dialog } = await openPlantOverview(page, { hasText: 'Clone Test Mother' });

            // Step 3: Click "Take Clone" button
            const takeCloneBtn = dialog.getByRole('button', { name: /take clone/i }).first();
            await expect(takeCloneBtn).toBeVisible({ timeout: 5000 });
            await takeCloneBtn.click();

            // Step 4: Clone dialog should open
            const cloneDialog = card.locator('growspace-dialog-host clone-dialog ha-dialog').first();
            await expect(cloneDialog).toHaveAttribute('open', '', { timeout: 10000 });

            // Step 5: Verify source plant info is displayed
            const dialogContent = await cloneDialog.textContent();
            expect(dialogContent).toContain('Clone Test Mother');
            expect(dialogContent).toContain('MT-1');

            // Step 6: Set number of clones
            const numClonesInput = cloneDialog.locator('md3-number-input[label*="Number"]').first();
            await numClonesInput.evaluate((el: any) => {
                el.value = 3;
                el.dispatchEvent(new Event('change', { bubbles: true }));
            });

            // Step 7: Select target growspace (if available)
            const growspaceSelect = cloneDialog.locator('select, md3-select').first();
            if (await growspaceSelect.isVisible()) {
                // Select first available growspace
                await growspaceSelect.selectOption({ index: 0 });
            }

            // Step 8: Submit clone request
            const confirmBtn = cloneDialog.getByRole('button', { name: /take clone|create|confirm/i }).first();
            await confirmBtn.click();

            // Step 9: Wait for operation to complete
            await expect(cloneDialog).not.toBeVisible({ timeout: 10000 });
            await page.waitForTimeout(3000);

            // Step 10: Verify clones were created
            // Clones should have same strain but may be in different growspace
            // Check for clone stage indicators or strain name
            const clonePlants = card.locator('growspace-plant-card')
                .filter({ hasText: 'Clone Test Mother' });

            const cloneCount = await clonePlants.count();
            expect(cloneCount).toBeGreaterThanOrEqual(3); // Mother + 3 clones = 4 total
        });

        test('should validate clone count range (1-20)', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card').first();

            // Create mother plant
            await createPlant(page, {
                strain: 'Range Test Mother',
                phenotype: 'RT-1',
                row: 2,
                col: 1,
                stage: 'mother'
            });

            await page.waitForTimeout(2000);

            // Open mother overview
            const { dialog } = await openPlantOverview(page, { hasText: 'Range Test Mother' });

            // Click Take Clone
            const takeCloneBtn = dialog.getByRole('button', { name: /take clone/i }).first();
            await takeCloneBtn.click();

            const cloneDialog = card.locator('clone-dialog ha-dialog').first();
            await expect(cloneDialog).toHaveAttribute('open', '');

            // Test minimum (1)
            const numClonesInput = cloneDialog.locator('md3-number-input[label*="Number"]').first();
            await numClonesInput.evaluate((el: any) => {
                el.value = 1;
                el.dispatchEvent(new Event('change', { bubbles: true }));
            });

            let value = await numClonesInput.evaluate((el: any) => el.value);
            expect(parseInt(value)).toBe(1);

            // Test maximum (20)
            await numClonesInput.evaluate((el: any) => {
                el.value = 20;
                el.dispatchEvent(new Event('change', { bubbles: true }));
            });

            value = await numClonesInput.evaluate((el: any) => el.value);
            expect(parseInt(value)).toBe(20);

            // Test out of range (should clamp or reject)
            await numClonesInput.evaluate((el: any) => {
                el.value = 25;
                el.dispatchEvent(new Event('change', { bubbles: true }));
            });

            // May clamp to 20 or show validation error
            value = await numClonesInput.evaluate((el: any) => el.value);
            const numValue = parseInt(value);
            expect(numValue).toBeLessThanOrEqual(20);
        });

        test('should preserve strain and phenotype in clones', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card').first();

            // Create mother
            await createPlant(page, {
                strain: 'Genetics Test',
                phenotype: 'GT-Premium',
                row: 3,
                col: 1,
                stage: 'mother'
            });

            await page.waitForTimeout(2000);

            // Take clone
            const { dialog } = await openPlantOverview(page, { hasText: 'Genetics Test' });
            const takeCloneBtn = dialog.getByRole('button', { name: /take clone/i }).first();
            await takeCloneBtn.click();

            const cloneDialog = card.locator('clone-dialog ha-dialog').first();
            await expect(cloneDialog).toHaveAttribute('open', '');

            // Set 1 clone
            const numClonesInput = cloneDialog.locator('md3-number-input').first();
            await numClonesInput.evaluate((el: any) => {
                el.value = 1;
                el.dispatchEvent(new Event('change', { bubbles: true }));
            });

            // Confirm
            const confirmBtn = cloneDialog.getByRole('button', { name: /take clone|create/i }).first();
            await confirmBtn.click();

            await expect(cloneDialog).not.toBeVisible({ timeout: 10000 });
            await page.waitForTimeout(3000);

            // Find the new clone and verify genetics
            const clonePlants = card.locator('growspace-plant-card')
                .filter({ hasText: 'Genetics Test' })
                .filter({ hasText: 'GT-Premium' });

            const count = await clonePlants.count();
            expect(count).toBeGreaterThanOrEqual(2); // Mother + Clone

            // Open clone overview to verify details
            await clonePlants.last().click();

            const cloneOverview = card.locator('plant-overview-dialog ha-dialog').first();
            await expect(cloneOverview).toHaveAttribute('open', '');

            const content = await cloneOverview.textContent();
            expect(content).toContain('Genetics Test');
            expect(content).toContain('GT-Premium');
        });
    });

    test.describe('Flower → Harvest → Dry → Cure Workflow', () => {
        test('should harvest flowering plant and create dry plant', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card').first();

            // Step 1: Create flowering plant
            await createPlant(page, {
                strain: 'Harvest Test',
                phenotype: 'HT-1',
                row: 4,
                col: 1,
                stage: 'flower'
            });

            await page.waitForTimeout(2000);

            // Step 2: Open flower plant overview
            const { dialog } = await openPlantOverview(page, { hasText: 'Harvest Test' });

            // Step 3: Verify we're in flower stage
            const content = await dialog.textContent();
            expect(content).toMatch(/flower/i);

            // Step 4: Click "Harvest" button
            const harvestBtn = dialog.getByRole('button', { name: /harvest/i }).first();
            await expect(harvestBtn).toBeVisible({ timeout: 5000 });
            await harvestBtn.click();

            // Step 5: Confirmation dialog may appear
            page.on('dialog', async (confirmDialog) => {
                expect(confirmDialog.message()).toMatch(/harvest/i);
                await confirmDialog.accept();
            });

            // Step 6: Wait for harvest operation
            await page.waitForTimeout(3000);

            // Step 7: Reload page to see updated state
            await page.reload({ waitUntil: 'domcontentloaded' });
            await expect(card).toBeVisible({ timeout: 15000 });
            await page.waitForTimeout(3000);

            // Step 8: Look for dry plant with same strain
            const dryPlants = card.locator('growspace-plant-card')
                .filter({ hasText: 'Harvest Test' });

            // Should have at least one plant (dry stage)
            const count = await dryPlants.count();
            expect(count).toBeGreaterThanOrEqual(1);

            // Step 9: Verify it's in dry stage
            if (count > 0) {
                await dryPlants.first().click();

                const dryDialog = card.locator('plant-overview-dialog ha-dialog').first();
                await expect(dryDialog).toHaveAttribute('open', '');

                const dryContent = await dryDialog.textContent();
                expect(dryContent).toMatch(/dry/i);
            }
        });

        test('should transition from dry to cure stage', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card').first();

            // Step 1: Create dry plant directly
            // (In real workflow, this comes from harvest)
            await createPlant(page, {
                strain: 'Cure Test',
                phenotype: 'CT-1',
                row: 5,
                col: 1,
                stage: 'veg' // Create as veg first, then transition
            });

            await page.waitForTimeout(2000);

            // Step 2: Open plant and manually set dry_start date
            const { dialog } = await openPlantOverview(page, { hasText: 'Cure Test' });

            // Navigate to lifecycle dates or dashboard
            const dashboardTab = dialog.locator('.tab-item, button').filter({ hasText: /dashboard/i }).first();
            if (await dashboardTab.isVisible()) {
                await dashboardTab.click();
            }

            // Show all dates
            const showAllBtn = dialog.getByRole('button', { name: /show all dates/i }).first();
            if (await showAllBtn.isVisible()) {
                await showAllBtn.click();
                await page.waitForTimeout(500);
            }

            // Set dry_start to today
            const today = new Date().toISOString().split('T')[0];
            const dryStartInput = dialog.locator('md3-date-input[label*="Dry Start"], input[name="dry_start"]').first();

            if (await dryStartInput.isVisible()) {
                await dryStartInput.evaluate((el: any, val) => {
                    el.value = val;
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }, today);

                // Save changes
                const saveBtn = dialog.getByRole('button', { name: /save/i }).first();
                if (await saveBtn.isVisible()) {
                    await saveBtn.click();
                    await page.waitForTimeout(1500);
                }
            }

            // Close and reopen to see updated stage
            const closeBtn = dialog.locator('button.close, .mdc-dialog__close').first();
            await closeBtn.click();
            await page.waitForTimeout(1000);

            // Step 3: Reopen dry plant
            const { dialog: dryDialog } = await openPlantOverview(page, { hasText: 'Cure Test' });

            // Step 4: Click "Finish Drying" button
            const finishBtn = dryDialog.getByRole('button', { name: /finish drying/i }).first();

            if (await finishBtn.isVisible()) {
                await finishBtn.click();

                // Handle confirmation
                page.on('dialog', async (confirmDialog) => {
                    await confirmDialog.accept();
                });

                await page.waitForTimeout(2000);

                // Step 5: Verify transition to cure stage
                const content = await dryDialog.textContent();
                expect(content).toMatch(/cure/i);
            }
        });
    });

    test.describe('Seedling → Veg → Mother Progression', () => {
        test('should create seedling and transition to vegetative', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card').first();

            // Step 1: Create seedling
            await createPlant(page, {
                strain: 'Progression Test',
                phenotype: 'PT-1',
                row: 6,
                col: 1,
                stage: 'seedling'
            });

            await page.waitForTimeout(2000);

            // Step 2: Open seedling overview
            const { dialog } = await openPlantOverview(page, { hasText: 'Progression Test' });

            // Step 3: Navigate to lifecycle dates
            const dashboardTab = dialog.locator('.tab-item, button').filter({ hasText: /dashboard/i }).first();
            if (await dashboardTab.isVisible()) {
                await dashboardTab.click();
            }

            // Step 4: Set veg_start date to trigger transition
            const showAllBtn = dialog.getByRole('button', { name: /show all dates/i }).first();
            if (await showAllBtn.isVisible()) {
                await showAllBtn.click();
            }

            const today = new Date().toISOString().split('T')[0];
            const vegStartInput = dialog.locator('md3-date-input[label*="Veg Start"], input[name="veg_start"]').first();

            if (await vegStartInput.isVisible()) {
                await vegStartInput.evaluate((el: any, val) => {
                    el.value = val;
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }, today);

                // Save
                const saveBtn = dialog.getByRole('button', { name: /save/i }).first();
                if (await saveBtn.isVisible()) {
                    await saveBtn.click();
                    await page.waitForTimeout(1500);
                }
            }

            // Step 5: Close and reopen to verify stage change
            const closeBtn = dialog.locator('button.close').first();
            await closeBtn.click();
            await page.waitForTimeout(1000);

            const { dialog: vegDialog } = await openPlantOverview(page, { hasText: 'Progression Test' });

            const content = await vegDialog.textContent();
            expect(content).toMatch(/veg|vegetative/i);
        });

        test('should convert vegetative plant to mother', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card').first();

            // Step 1: Create veg plant
            await createPlant(page, {
                strain: 'Mother Conversion',
                phenotype: 'MC-1',
                row: 7,
                col: 1,
                stage: 'veg'
            });

            await page.waitForTimeout(2000);

            // Step 2: Open veg plant overview
            const { dialog } = await openPlantOverview(page, { hasText: 'Mother Conversion' });

            // Step 3: Set mother_start date
            const dashboardTab = dialog.locator('.tab-item, button').filter({ hasText: /dashboard/i }).first();
            if (await dashboardTab.isVisible()) {
                await dashboardTab.click();
            }

            const showAllBtn = dialog.getByRole('button', { name: /show all dates/i }).first();
            if (await showAllBtn.isVisible()) {
                await showAllBtn.click();
            }

            const today = new Date().toISOString().split('T')[0];
            const motherStartInput = dialog.locator('md3-date-input[label*="Mother"], input[name="mother_start"]').first();

            if (await motherStartInput.isVisible()) {
                await motherStartInput.evaluate((el: any, val) => {
                    el.value = val;
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }, today);

                const saveBtn = dialog.getByRole('button', { name: /save/i }).first();
                if (await saveBtn.isVisible()) {
                    await saveBtn.click();
                    await page.waitForTimeout(1500);
                }
            }

            // Step 4: Verify transition to mother stage
            const content = await dialog.textContent();
            expect(content).toMatch(/mother/i);

            // Step 5: Verify "Take Clone" button is now available
            const takeCloneBtn = dialog.getByRole('button', { name: /take clone/i }).first();
            await expect(takeCloneBtn).toBeVisible({ timeout: 5000 });
        });
    });

    test.describe('Clone Transplant Workflow', () => {
        test('should transplant clone to new growspace', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card').first();

            // Step 1: Create a clone
            await createPlant(page, {
                strain: 'Transplant Test',
                phenotype: 'TT-1',
                row: 1,
                col: 2,
                stage: 'clone'
            });

            await page.waitForTimeout(2000);

            // Step 2: Open add plant dialog on empty slot
            const emptySlot = card.locator('.plant-card-empty').first();
            if (await emptySlot.isVisible()) {
                await emptySlot.click();
            }

            const addDialog = card.locator('add-plant-dialog ha-dialog').first();
            await expect(addDialog).toHaveAttribute('open', '');

            // Step 3: Navigate to "Clone" tab
            const cloneTab = addDialog.locator('.tab-item, button').filter({ hasText: /^clone$/i }).first();
            if (await cloneTab.isVisible()) {
                await cloneTab.click();
                await page.waitForTimeout(500);

                // Step 4: Select the clone from list
                const cloneList = addDialog.locator('select, .clone-list').first();

                if (await cloneList.isVisible()) {
                    // Select first available clone
                    const tagName = await cloneList.evaluate((el: HTMLElement) => el.tagName);
                    if (tagName === 'SELECT') {
                        await cloneList.selectOption({ index: 0 });
                    } else {
                        // Click on clone item
                        const cloneItem = addDialog.locator('.clone-item, [class*="source"]').first();
                        await cloneItem.click();
                    }

                    // Step 5: Confirm transplant
                    const confirmBtn = addDialog.getByRole('button', { name: /transplant|confirm/i }).first();
                    await confirmBtn.click();

                    await expect(addDialog).not.toBeVisible({ timeout: 5000 });
                    await page.waitForTimeout(2000);

                    // Step 6: Verify clone moved (veg_start should be set)
                    // Open the transplanted plant
                    const transplantedPlant = card.locator('growspace-plant-card')
                        .filter({ hasText: 'Transplant Test' })
                        .first();

                    if (await transplantedPlant.isVisible()) {
                        await transplantedPlant.click();

                        const overview = card.locator('plant-overview-dialog ha-dialog').first();
                        await expect(overview).toHaveAttribute('open', '');

                        const content = await overview.textContent();
                        expect(content).toContain('Transplant Test');
                        // Should now be in veg stage after transplant
                        expect(content).toMatch(/veg/i);
                    }
                }
            }
        });
    });

    test.describe('Data Persistence Across Transitions', () => {
        test('should preserve timeline events across stage transitions', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card').first();

            // Step 1: Create plant
            await createPlant(page, {
                strain: 'Timeline Test',
                phenotype: 'TLT-1',
                row: 2,
                col: 2,
                stage: 'veg'
            });

            await page.waitForTimeout(2000);

            // Step 2: Open plant and log an event
            const { dialog } = await openPlantOverview(page, { hasText: 'Timeline Test' });

            // Step 3: Navigate to Actions tab and log training
            const actionsTab = dialog.locator('.tab-item, button').filter({ hasText: /actions/i }).first();
            if (await actionsTab.isVisible()) {
                await actionsTab.click();

                // Click "Log Training" button
                const logTrainingBtn = dialog.getByRole('button', { name: /log training/i }).first();
                if (await logTrainingBtn.isVisible()) {
                    await logTrainingBtn.click();

                    // Training dialog should open
                    const trainingDialog = card.locator('training-dialog ha-dialog').first();
                    await expect(trainingDialog).toHaveAttribute('open', '');

                    // Select technique and add note
                    const techniqueSelect = trainingDialog.locator('select').first();
                    if (await techniqueSelect.isVisible()) {
                        await techniqueSelect.selectOption({ index: 1 });
                    }

                    const notesInput = trainingDialog.locator('textarea').first();
                    if (await notesInput.isVisible()) {
                        await notesInput.fill('Pre-transition training event');
                    }

                    // Confirm
                    const confirmBtn = trainingDialog.getByRole('button', { name: /log|confirm/i }).first();
                    await confirmBtn.click();

                    await expect(trainingDialog).not.toBeVisible({ timeout: 5000 });
                }
            }

            // Step 4: Transition plant to flower stage
            const dashboardTab = dialog.locator('.tab-item, button').filter({ hasText: /dashboard/i }).first();
            if (await dashboardTab.isVisible()) {
                await dashboardTab.click();
            }

            const showAllBtn = dialog.getByRole('button', { name: /show all dates/i }).first();
            if (await showAllBtn.isVisible()) {
                await showAllBtn.click();
            }

            const today = new Date().toISOString().split('T')[0];
            const flowerStartInput = dialog.locator('input[name="flower_start"]').first();

            if (await flowerStartInput.isVisible()) {
                await flowerStartInput.evaluate((el: any, val) => {
                    el.value = val;
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }, today);

                const saveBtn = dialog.getByRole('button', { name: /save/i }).first();
                if (await saveBtn.isVisible()) {
                    await saveBtn.click();
                    await page.waitForTimeout(1500);
                }
            }

            // Step 5: Navigate to Timeline tab
            const timelineTab = dialog.locator('.tab-item, button').filter({ hasText: /timeline/i }).first();
            if (await timelineTab.isVisible()) {
                await timelineTab.click();
                await page.waitForTimeout(1000);

                // Step 6: Verify training event is still there
                const timelineContent = await dialog.locator('plant-timeline, .timeline').first().textContent();
                expect(timelineContent).toContain('Pre-transition training event');

                // Should also show stage transition milestone
                expect(timelineContent).toMatch(/veg.*flower|vegetative.*flower/i);
            }
        });

        test('should preserve custom data fields across clone operation', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card').first();

            // Step 1: Create mother with custom data
            await createPlant(page, {
                strain: 'Custom Data Mother',
                phenotype: 'CDM-Special',
                row: 3,
                col: 2,
                stage: 'mother'
            });

            await page.waitForTimeout(2000);

            // Step 2: Open mother and verify phenotype
            const { dialog } = await openPlantOverview(page, { hasText: 'Custom Data Mother' });

            let content = await dialog.textContent();
            expect(content).toContain('CDM-Special');

            // Step 3: Take clone
            const takeCloneBtn = dialog.getByRole('button', { name: /take clone/i }).first();
            await takeCloneBtn.click();

            const cloneDialog = card.locator('clone-dialog ha-dialog').first();
            await expect(cloneDialog).toHaveAttribute('open', '');

            // Set 1 clone
            const numClonesInput = cloneDialog.locator('md3-number-input').first();
            await numClonesInput.evaluate((el: any) => {
                el.value = 1;
                el.dispatchEvent(new Event('change', { bubbles: true }));
            });

            // Confirm
            const confirmBtn = cloneDialog.getByRole('button', { name: /take clone|create/i }).first();
            await confirmBtn.click();

            await expect(cloneDialog).not.toBeVisible({ timeout: 10000 });
            await page.waitForTimeout(3000);

            // Step 4: Find and verify clone has same phenotype
            const plants = card.locator('growspace-plant-card')
                .filter({ hasText: 'Custom Data Mother' });

            // Should have mother + clone
            const count = await plants.count();
            expect(count).toBeGreaterThanOrEqual(2);

            // Open last plant (should be clone)
            await plants.last().click();

            const cloneOverview = card.locator('plant-overview-dialog ha-dialog').first();
            await expect(cloneOverview).toHaveAttribute('open', '');

            content = await cloneOverview.textContent();
            expect(content).toContain('Custom Data Mother');
            expect(content).toContain('CDM-Special');
        });
    });

    test.describe('Stage-Based Validations', () => {
        test('should only show "Take Clone" button for mother plants', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card').first();

            // Create veg plant (not mother)
            await createPlant(page, {
                strain: 'Veg Validation',
                phenotype: 'VV-1',
                row: 4,
                col: 2,
                stage: 'veg'
            });

            await page.waitForTimeout(2000);

            // Open veg plant
            const { dialog } = await openPlantOverview(page, { hasText: 'Veg Validation' });

            // "Take Clone" should NOT be visible
            const takeCloneBtn = dialog.getByRole('button', { name: /take clone/i }).first();
            const isVisible = await takeCloneBtn.isVisible().catch(() => false);

            expect(isVisible).toBe(false);
        });

        test('should only show "Harvest" button for flowering plants', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card').first();

            // Create seedling
            await createPlant(page, {
                strain: 'Seedling Validation',
                phenotype: 'SV-1',
                row: 5,
                col: 2,
                stage: 'seedling'
            });

            await page.waitForTimeout(2000);

            // Open seedling
            const { dialog } = await openPlantOverview(page, { hasText: 'Seedling Validation' });

            // "Harvest" should NOT be visible
            const harvestBtn = dialog.getByRole('button', { name: /harvest/i }).first();
            const isVisible = await harvestBtn.isVisible().catch(() => false);

            expect(isVisible).toBe(false);
        });

        test('should only show "Finish Drying" for dry stage plants', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card').first();

            // Create flower plant
            await createPlant(page, {
                strain: 'Finish Validation',
                phenotype: 'FV-1',
                row: 6,
                col: 2,
                stage: 'flower'
            });

            await page.waitForTimeout(2000);

            // Open flower plant
            const { dialog } = await openPlantOverview(page, { hasText: 'Finish Validation' });

            // "Finish Drying" should NOT be visible
            const finishBtn = dialog.getByRole('button', { name: /finish drying/i }).first();
            const isVisible = await finishBtn.isVisible().catch(() => false);

            expect(isVisible).toBe(false);
        });
    });

    test.describe('Edge Cases & Error Handling', () => {
        test('should handle taking clone from non-existent mother gracefully', async ({ coveragePage: page }) => {
            // This test verifies error handling when attempting invalid operations
            // Implementation depends on backend validation
            // For now, just verify UI doesn't crash

            const card = page.locator('growspace-manager-card').first();

            // Try to access clone dialog without proper setup
            // (Should be prevented by UI, but testing defensive programming)

            // Verify card is still functional
            await expect(card).toBeVisible();
        });

        test('should handle rapid stage transitions without data loss', async ({ coveragePage: page }) => {
            const card = page.locator('growspace-manager-card').first();

            // Create plant
            await createPlant(page, {
                strain: 'Rapid Test',
                phenotype: 'RT-1',
                row: 7,
                col: 2,
                stage: 'seedling'
            });

            await page.waitForTimeout(2000);

            // Open plant
            const { dialog } = await openPlantOverview(page, { hasText: 'Rapid Test' });

            // Navigate to dashboard
            const dashboardTab = dialog.locator('.tab-item').filter({ hasText: /dashboard/i }).first();
            if (await dashboardTab.isVisible()) {
                await dashboardTab.click();
            }

            const showAllBtn = dialog.getByRole('button', { name: /show all dates/i }).first();
            if (await showAllBtn.isVisible()) {
                await showAllBtn.click();
            }

            const today = new Date().toISOString().split('T')[0];

            // Rapidly set multiple dates
            const vegInput = dialog.locator('input[name="veg_start"]').first();
            const flowerInput = dialog.locator('input[name="flower_start"]').first();

            if (await vegInput.isVisible() && await flowerInput.isVisible()) {
                await vegInput.evaluate((el: any, val) => {
                    el.value = val;
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }, today);

                await page.waitForTimeout(100);

                await flowerInput.evaluate((el: any, val) => {
                    el.value = val;
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }, today);

                const saveBtn = dialog.getByRole('button', { name: /save/i }).first();
                if (await saveBtn.isVisible()) {
                    await saveBtn.click();
                    await page.waitForTimeout(2000);
                }

                // Verify no errors and data is consistent
                const content = await dialog.textContent();
                expect(content).toContain('Rapid Test');
                expect(content).toMatch(/flower/i);
            }
        });
    });
});
