import { Page } from '@playwright/test';
import { authenticatedTest } from './authentication';
import { createTestContext } from './test-context';
import type { TestContext } from './types';

export const haTest = authenticatedTest.extend<{ testContext: TestContext }>({
  testContext: async ({}, use) => {
    await use(createTestContext(process.env));
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
  const response = await page.request.post(`${baseURL}/api/services/${domain}/${service}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    data: serviceData,
  });
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
