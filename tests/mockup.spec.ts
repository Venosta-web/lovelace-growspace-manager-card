import { test, expect } from '@playwright/test';

test.describe('Growspace Manager Card - Mockup Verification', () => {

    test.beforeEach(async ({ page }) => {
        // Navigate to the mockup page
        await page.goto('/verification_mockup.html');
        // Wait for the custom element to be defined and upgraded
        await page.waitForFunction(() => customElements.get('growspace-manager-card'));
        // Wait a bit for lit updates
        await page.waitForTimeout(500);
    });

    test('should render the mockup page title', async ({ page }) => {
        await expect(page).toHaveTitle('Growspace Verification');
        await expect(page.locator('h1')).toHaveText('Growspace Layout Verification');
    });

    test('should render both growspace cards (Grid and List)', async ({ page }) => {
        const cardGrid = page.locator('#card-grid-5');
        const cardList = page.locator('#card-list-6');

        await expect(cardGrid).toBeVisible();
        await expect(cardList).toBeVisible();
    });

    test('should render Shadow DOM content for 5 Column Grid', async ({ page }) => {
        const cardGrid = page.locator('#card-grid-5');
        await expect(cardGrid).toContainText('5 Column Grid');
        await expect(cardGrid).toContainText('Strain 1');
    });

    test('should render Shadow DOM content for 6 Column List', async ({ page }) => {
        const cardList = page.locator('#card-list-6');
        await expect(cardList).toContainText('6 Column List');
        await expect(cardList).toContainText('Strain 1');
    });

    test('should display environmental sensors in non-compact mode', async ({ page }) => {
        const cardGrid = page.locator('#card-grid-5');

        const tempChip = cardGrid.locator('.stat-chip:has-text("20°C")');
        const humidityChip = cardGrid.locator('.stat-chip:has-text("63%")');
        const vpdChip = cardGrid.locator('.stat-chip:has-text("0.9 kPa")');
        const co2Chip = cardGrid.locator('.stat-chip:has-text("800 ppm")');

        await expect(tempChip).toBeVisible();
        await expect(humidityChip).toBeVisible();
        await expect(vpdChip).toBeVisible();
        await expect(co2Chip).toBeVisible();
    });

    test('should toggle environmental graph on chip click', async ({ page }) => {
        const cardGrid = page.locator('#card-grid-5');

        const mockHistory = [
            { last_changed: new Date(Date.now() - 20 * 3600 * 1000).toISOString(), attributes: { temperature: 20, humidity: 65 } },
            { last_changed: new Date(Date.now() - 10 * 3600 * 1000).toISOString(), attributes: { temperature: 25, humidity: 60 } },
            { last_changed: new Date(Date.now() - 5 * 3600 * 1000).toISOString(), attributes: { temperature: 22, humidity: 58 } },
        ];

        await cardGrid.evaluate((el: any, history) => {
            el._historyData = history;
            el.requestUpdate();
        }, mockHistory);

        await page.waitForTimeout(300);

        const tempChip = cardGrid.locator('.stat-chip:has-text("20°C")');
        await expect(tempChip).toBeVisible();

        let tempGraph = cardGrid.locator('.gs-light-cycle-card:has-text("Temperature")');
        await expect(tempGraph).not.toBeVisible();

        await tempChip.click();
        await page.waitForTimeout(300);
        tempGraph = cardGrid.locator('.gs-light-cycle-card:has-text("Temperature")');
        await expect(tempGraph).toBeVisible();
        await expect(tempGraph).toContainText('24H HISTORY');

        await cardGrid.screenshot({ path: 'test-results/environmental-graph-visible.png' });

        await tempChip.click();
        await page.waitForTimeout(300);
        tempGraph = cardGrid.locator('.gs-light-cycle-card:has-text("Temperature")');
        await expect(tempGraph).not.toBeVisible();
    });

    test('should expand and collapse the light cycle card', async ({ page }) => {
        const cardGrid = page.locator('#card-grid-5');

        const lightCycleCard = cardGrid.locator('.gs-light-cycle-card:has-text("Light Cycle")');
        await expect(lightCycleCard).toBeVisible();

        let graphContainer = lightCycleCard.locator('.gs-chart-container');
        await expect(graphContainer).not.toBeVisible();

        await lightCycleCard.locator('.gs-light-header-row').click();
        await page.waitForTimeout(300);
        graphContainer = lightCycleCard.locator('.gs-chart-container');
        await expect(graphContainer).toBeVisible();

        await expect(lightCycleCard.locator('.gs-chart-svg')).toBeVisible();
        await expect(lightCycleCard.locator('.action-card:has-text("LIGHT ON")')).toBeVisible();
        await expect(lightCycleCard.locator('.action-card:has-text("LIGHT OFF")')).toBeVisible();

        await cardGrid.screenshot({ path: 'test-results/light-cycle-expanded.png' });

        await lightCycleCard.locator('.gs-light-header-row').click();
        await page.waitForTimeout(300);
        graphContainer = lightCycleCard.locator('.gs-chart-container');
        await expect(graphContainer).not.toBeVisible();
    });

    test('should open and close Configuration dialog', async ({ page }) => {
        const cardGrid = page.locator('#card-grid-5');

        const configButton = cardGrid.locator('.stat-chip:has-text("Config")');
        await expect(configButton).toBeVisible();

        await configButton.click();
        await page.waitForTimeout(300);

        const dialog = page.locator('ha-dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText('Configuration');

        // Close the dialog
        await dialog.locator('button:has-text("Cancel")').click();
        await page.waitForTimeout(300);
        await expect(dialog).not.toBeVisible();
    });

    test('should open and close Ask AI dialog', async ({ page }) => {
        const cardGrid = page.locator('#card-grid-5');

        const askAiButton = cardGrid.locator('.stat-chip:has-text("Ask AI")');
        await expect(askAiButton).toBeVisible();

        await askAiButton.click();
        await page.waitForTimeout(300);

        const dialog = page.locator('ha-dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText('Ask the Grow Master');

        // Close the dialog
        await dialog.locator('button.md3-button.text').click();
        await page.waitForTimeout(300);
        await expect(dialog).not.toBeVisible();
    });

    test('should display compact header correctly', async ({ page }) => {
        const cardGrid = page.locator('#card-grid-5');

        await cardGrid.evaluate((el: any) => {
            el.setConfig({ compact: true });
        });
        await page.waitForTimeout(500);

        const tempChip = cardGrid.locator('.stat-chip:has-text("20°C")');
        await expect(tempChip).not.toBeVisible();

        const compactToggle = cardGrid.locator('.view-toggle:has-text("Compact")');
        const strainsButton = cardGrid.locator('button.action-button:has-text("Strains")');

        await expect(compactToggle).toBeVisible();
        await expect(strainsButton).toBeVisible();
    });
});