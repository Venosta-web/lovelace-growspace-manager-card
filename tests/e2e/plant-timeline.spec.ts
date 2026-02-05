import { test, expect } from '../coverage-helper';

test.describe('Plant Timeline', () => {
    test.beforeEach(async ({ coveragePage: page }) => {
        await page.goto('http://127.0.0.1:8123', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('growspace-manager-card').first()).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(3000); // Hydration wait
    });

    test.afterEach(async ({ coveragePage: page }) => {
        // Cleanup: Close any open dialogs
        const card = page.locator('growspace-manager-card').first();
        const openDialogs = card.locator('ha-dialog[open]');
        const count = await openDialogs.count();
        for (let i = 0; i < count; i++) {
            const dialog = openDialogs.nth(i);
            const closeBtn = dialog.locator('md-icon-button[dialog-dismiss]').first();
            if (await closeBtn.isVisible().catch(() => false)) {
                await closeBtn.click();
                await page.waitForTimeout(300);
            }
        }
    });

    test('Timeline Tab - Opens and Shows Events', async ({ coveragePage: page }) => {
        const card = page.locator('growspace-manager-card').first();

        // Click on a plant to open the overview dialog
        const plantCard = card.locator('growspace-plant-card').first();
        await plantCard.locator('.plant-card-rich').first().dispatchEvent('click', { bubbles: true, composed: true });

        // Wait for dialog to open
        const dialog = card.locator('growspace-dialog-host plant-overview-dialog ha-dialog').first();
        await expect(dialog).toHaveAttribute('open', '', { timeout: 10000 });

        // Click Timeline tab
        const timelineTab = dialog.locator('button, .tab').filter({ hasText: /timeline/i }).first();
        await timelineTab.dispatchEvent('click', { bubbles: true, composed: true });

        // Verify timeline component is visible
        const timeline = dialog.locator('plant-timeline').first();
        await expect(timeline).toBeVisible({ timeout: 5000 });
    });

    test('Timeline - Shows Milestone Events', async ({ coveragePage: page }) => {
        const card = page.locator('growspace-manager-card').first();

        // Find a plant with flowering or veg stage
        const plantCard = card.locator('growspace-plant-card').first();
        await plantCard.locator('.plant-card-rich').first().dispatchEvent('click', { bubbles: true, composed: true });

        const dialog = card.locator('growspace-dialog-host plant-overview-dialog ha-dialog').first();
        await expect(dialog).toHaveAttribute('open', '', { timeout: 10000 });

        // Switch to Timeline tab
        const timelineTab = dialog.locator('button, .tab').filter({ hasText: /timeline/i }).first();
        await timelineTab.dispatchEvent('click', { bubbles: true, composed: true });

        const timeline = dialog.locator('plant-timeline').first();

        // Check for milestone events (should show stage start milestones)
        const milestoneEvents = timeline.locator('.event').filter({ hasText: /started/i });
        // Plants typically have at least seedling or veg milestones
        await expect(milestoneEvents.first()).toBeVisible({ timeout: 5000 });
    });

    test('Timeline - Day Grouping', async ({ coveragePage: page }) => {
        const card = page.locator('growspace-manager-card').first();

        const plantCard = card.locator('growspace-plant-card').first();
        await plantCard.locator('.plant-card-rich').first().dispatchEvent('click', { bubbles: true, composed: true });

        const dialog = card.locator('growspace-dialog-host plant-overview-dialog ha-dialog').first();
        await expect(dialog).toHaveAttribute('open', '', { timeout: 10000 });

        const timelineTab = dialog.locator('button, .tab').filter({ hasText: /timeline/i }).first();
        await timelineTab.dispatchEvent('click', { bubbles: true, composed: true });

        const timeline = dialog.locator('plant-timeline').first();
        await expect(timeline).toBeVisible({ timeout: 5000 });

        // Check for day headers (Today, Yesterday, or date format)
        const dayHeaders = timeline.locator('.day-header');
        // If there are events, there should be day grouping headers
        const eventCount = await timeline.locator('.event').count();
        if (eventCount > 0) {
            await expect(dayHeaders.first()).toBeVisible();
        }
    });

    test('Timeline - Filters Events by Plant ID', async ({ coveragePage: page }) => {
        const card = page.locator('growspace-manager-card').first();

        // First, water the growspace to create events for all plants
        const menuBtn = card.locator('growspace-header .menu-container .icon-button').first();
        await menuBtn.dispatchEvent('click', { bubbles: true, composed: true });
        await card.locator('.menu-dropdown .menu-item').filter({ hasText: 'Water Growspace' }).click();

        const waterDialog = card.locator('growspace-dialog-host watering-dialog ha-dialog').first();
        await expect(waterDialog).toHaveAttribute('open', '', { timeout: 10000 });
        await waterDialog.getByRole('button', { name: /record/i }).click();
        await expect(waterDialog).not.toBeVisible({ timeout: 10000 });

        // Wait a moment for events to propagate
        await page.waitForTimeout(2000);

        // Now open a specific plant's timeline
        const plantCard = card.locator('growspace-plant-card').first();
        const plantIdentifier = await plantCard.locator('.pc-strain-name').first().textContent();

        await plantCard.locator('.plant-card-rich').first().dispatchEvent('click', { bubbles: true, composed: true });

        const dialog = card.locator('growspace-dialog-host plant-overview-dialog ha-dialog').first();
        await expect(dialog).toHaveAttribute('open', '', { timeout: 10000 });

        const timelineTab = dialog.locator('button, .tab').filter({ hasText: /timeline/i }).first();
        await timelineTab.dispatchEvent('click', { bubbles: true, composed: true });

        const timeline = dialog.locator('plant-timeline').first();
        await expect(timeline).toBeVisible({ timeout: 5000 });

        // If there are watering events shown, they should only be for THIS plant
        // (plant_id filtering) - events should NOT list multiple plants
        const events = timeline.locator('.event').filter({ hasText: /environmental|watering/i });
        const eventCount = await events.count();

        if (eventCount > 0) {
            // Check that the event details don't list multiple plants
            const firstEventDetails = await events.first().locator('.details').textContent();
            // The details should NOT contain "Plants:" (which would indicate multiple plants)
            // and should NOT contain plant_id: (internal field should be filtered)
            expect(firstEventDetails).not.toContain('plant_id:');
            // If it mentions plants, it should only mention one
            if (firstEventDetails?.includes('Plant:')) {
                const plantMentions = (firstEventDetails.match(/Plant:/gi) || []).length;
                expect(plantMentions).toBeLessThanOrEqual(1);
            }
        }
    });

    test('Timeline - Training Event Shows Only Technique', async ({ coveragePage: page }) => {
        const card = page.locator('growspace-manager-card').first();

        // Select a plant for training
        const plantCard = card.locator('growspace-plant-card').first();
        await plantCard.locator('.plant-card-rich').first().dispatchEvent('click', { bubbles: true, composed: true });

        const overviewDialog = card.locator('growspace-dialog-host plant-overview-dialog ha-dialog').first();
        await expect(overviewDialog).toHaveAttribute('open', '', { timeout: 10000 });

        // Close the dialog and use batch actions for training
        await overviewDialog.getByRole('button', { name: 'Close' }).first().click();
        await page.waitForTimeout(500);

        // Open menu and do training on growspace
        const menuBtn = card.locator('growspace-header .menu-container .icon-button').first();
        await menuBtn.dispatchEvent('click', { bubbles: true, composed: true });

        const trainingMenuItem = card.locator('.menu-dropdown .menu-item').filter({ hasText: /train/i }).first();
        if (await trainingMenuItem.isVisible()) {
            await trainingMenuItem.click();

            const trainingDialog = card.locator('growspace-dialog-host training-dialog ha-dialog, growspace-dialog-host ha-dialog').first();
            if (await trainingDialog.isVisible()) {
                // Select a technique and submit
                const techniqueSelect = trainingDialog.locator('select, md3-select').first();
                if (await techniqueSelect.isVisible()) {
                    await techniqueSelect.selectOption({ index: 0 });
                }
                await trainingDialog.getByRole('button', { name: /submit|log|record/i }).first().click();
                await page.waitForTimeout(2000);
            }
        }

        // Now check the timeline
        await plantCard.locator('.plant-card-rich').first().dispatchEvent('click', { bubbles: true, composed: true });

        const dialog = card.locator('growspace-dialog-host plant-overview-dialog ha-dialog').first();
        await expect(dialog).toHaveAttribute('open', '', { timeout: 10000 });

        const timelineTab = dialog.locator('button, .tab').filter({ hasText: /timeline/i }).first();
        await timelineTab.dispatchEvent('click', { bubbles: true, composed: true });

        const timeline = dialog.locator('plant-timeline').first();
        const trainingEvents = timeline.locator('.event').filter({ hasText: /training|technique/i });

        if (await trainingEvents.count() > 0) {
            const eventDetails = await trainingEvents.first().locator('.details').textContent();
            // Training events should show technique, not list of all plants
            expect(eventDetails).not.toContain('Plants:');
            expect(eventDetails).not.toContain('plant_id:');
        }
    });

    test('Timeline - Empty State', async ({ coveragePage: page }) => {
        const card = page.locator('growspace-manager-card').first();

        // Create a new plant (which won't have any events yet)
        if (await card.locator('.plant-card-empty').count() > 0) {
            await card.locator('.plant-card-empty').first().dispatchEvent('click', { bubbles: true, composed: true });

            const addDialog = card.locator('growspace-dialog-host ha-dialog').first();
            await expect(addDialog).toHaveAttribute('open', '', { timeout: 10000 });

            await addDialog.locator('md3-select[label="Strain *"] select').first().selectOption({ label: 'Blue Gem' });
            await addDialog.locator('md3-text-input[label="Phenotype"] input').first().fill('#TimelineTest');
            await addDialog.getByRole('button', { name: 'Add Plant' }).last().dispatchEvent('click', { bubbles: true, composed: true });
            await expect(card.locator('growspace-dialog-host ha-dialog')).toHaveCount(0, { timeout: 10000 });
            await page.waitForTimeout(1000);

            // Open the new plant's timeline
            const newPlant = card.locator('growspace-plant-card').filter({ hasText: '#TimelineTest' }).first();
            await newPlant.locator('.plant-card-rich').first().dispatchEvent('click', { bubbles: true, composed: true });

            const dialog = card.locator('growspace-dialog-host plant-overview-dialog ha-dialog').first();
            await expect(dialog).toHaveAttribute('open', '', { timeout: 10000 });

            const timelineTab = dialog.locator('button, .tab').filter({ hasText: /timeline/i }).first();
            await timelineTab.dispatchEvent('click', { bubbles: true, composed: true });

            const timeline = dialog.locator('plant-timeline').first();
            // New plant should still show milestones (seedling start at least)
            // or empty state message
            const hasEvents = await timeline.locator('.event').count() > 0;
            const hasEmptyMessage = await timeline.getByText(/no events/i).isVisible();
            expect(hasEvents || hasEmptyMessage).toBeTruthy();

            // Cleanup: delete the test plant
            await dialog.getByRole('button', { name: /delete/i }).first().dispatchEvent('click', { bubbles: true, composed: true });
            await page.locator('.dialog-overlay').getByRole('button', { name: 'Delete' }).dispatchEvent('click', { bubbles: true, composed: true });
            await expect(card.locator('growspace-dialog-host ha-dialog')).toHaveCount(0, { timeout: 10000 });
        }
    });
});
