import { Page } from '@playwright/test';
import { authenticatedTest } from './authentication';
import { TestContext } from './types';

export const haTest = authenticatedTest.extend<{ testContext: TestContext }>({
  testContext: async ({}, use) => {
    const growspaceId = process.env.TEST_GROWSPACE_ID;
    const dashboardPath = process.env.TEST_DASHBOARD_PATH || '/dashboard-tesat/0';

    if (!growspaceId) {
      throw new Error('TEST_GROWSPACE_ID environment variable is required');
    }

    await use({
      growspaceId,
      dashboardPath,
      vegGrowspaceId: process.env.TEST_VEG_GROWSPACE_ID || '',
      vegDashboardPath: process.env.TEST_VEG_DASHBOARD_PATH || '',
      cloneGrowspaceId: process.env.TEST_CLONE_GROWSPACE_ID || '',
      cloneDashboardPath: process.env.TEST_CLONE_DASHBOARD_PATH || '',
      motherGrowspaceId: process.env.TEST_MOTHER_GROWSPACE_ID || '',
      motherDashboardPath: process.env.TEST_MOTHER_DASHBOARD_PATH || '',
      flowerGrowspaceId: process.env.TEST_FLOWER_GROWSPACE_ID || '',
      flowerDashboardPath: process.env.TEST_FLOWER_DASHBOARD_PATH || '',
      dryGrowspaceId: process.env.TEST_DRY_GROWSPACE_ID || '',
      dryDashboardPath: process.env.TEST_DRY_DASHBOARD_PATH || '',
      cureGrowspaceId: process.env.TEST_CURE_GROWSPACE_ID || '',
      cureDashboardPath: process.env.TEST_CURE_DASHBOARD_PATH || '',
      vwcVegGrowspaceId: process.env.TEST_VWC_VEG_GROWSPACE_ID || '',
      vwcVegDashboardPath: process.env.TEST_VWC_VEG_DASHBOARD_PATH || '',
      vwcFlowerGrowspaceId: process.env.TEST_VWC_FLOWER_GROWSPACE_ID || '',
      vwcFlowerDashboardPath: process.env.TEST_VWC_FLOWER_DASHBOARD_PATH || '',
      vegPlantId: process.env.TEST_VEG_PLANT_ID || '',
    });
  },
});

/**
 * Call Home Assistant service
 * Uses real service names from growspace_manager integration
 */
export async function callHAService(
  page: Page,
  domain: string,
  service: string,
  serviceData: Record<string, any>
): Promise<any> {
  const baseURL = process.env.HA_BASE_URL || 'http://localhost:8123';
  const token = process.env.HA_ACCESS_TOKEN;
  const response = await page.request.post(
    `${baseURL}/api/services/${domain}/${service}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      data: serviceData,
    }
  );
  if (!response.ok()) {
    throw new Error(`callHAService failed: ${response.status()} ${await response.text()}`);
  }
  return response.json().catch(() => null);
}

/**
 * Wait for element to appear/disappear with timeout
 */
export async function waitForElement(
  page: Page,
  selector: string,
  options: { state?: 'visible' | 'hidden'; timeout?: number } = {}
): Promise<void> {
  const { state = 'visible', timeout = 10000 } = options;
  await page.locator(selector).waitFor({ state, timeout });
}

/**
 * Wait for card to be fully loaded
 */
export async function waitForCardReady(page: Page): Promise<void> {
  await page.locator('growspace-manager-card').first().waitFor({ state: 'visible' });
  await page.waitForLoadState('networkidle');
  // Give the card time to initialize
  await page.waitForTimeout(1000);
}

export { expect } from '@playwright/test';
