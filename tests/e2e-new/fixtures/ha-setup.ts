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

    await use({ growspaceId, dashboardPath });
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
  return await page.evaluate(
    ({ domain, service, data }) => {
      return (window as any).hass.callService(domain, service, data);
    },
    { domain, service, data: serviceData }
  );
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
  await page.locator('growspace-manager-card').waitFor({ state: 'visible' });
  await page.waitForLoadState('networkidle');
  // Give the card time to initialize
  await page.waitForTimeout(1000);
}

export { expect } from '@playwright/test';
