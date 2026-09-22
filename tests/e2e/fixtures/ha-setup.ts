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
 * Call a Home Assistant WebSocket command through its public `/api/websocket`
 * boundary. This is for E2E fixture setup and assertions whose integration
 * contracts are WebSocket-only; card interactions still go through the UI.
 */
export async function callHAWebSocket<T = Record<string, unknown>>(
  type: string,
  data: Record<string, unknown> = {}
): Promise<T> {
  const baseURL = process.env.HA_BASE_URL || 'http://localhost:8123';
  const token = process.env.HA_ACCESS_TOKEN;
  if (!token) throw new Error('HA_ACCESS_TOKEN is required for WebSocket commands');

  const url = new URL('/api/websocket', baseURL);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const commandId = 1;
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error(`WebSocket command ${type} timed out`));
    }, 10_000);
    const finish = (callback: () => void) => {
      clearTimeout(timeout);
      socket.close();
      callback();
    };

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as Record<string, any>;
      if (message.type === 'auth_required') {
        socket.send(JSON.stringify({ type: 'auth', access_token: token }));
        return;
      }
      if (message.type === 'auth_invalid') {
        finish(() => reject(new Error('Home Assistant WebSocket authentication failed')));
        return;
      }
      if (message.type === 'auth_ok') {
        socket.send(JSON.stringify({ id: commandId, type, ...data }));
        return;
      }
      if (message.id !== commandId) return;
      if (!message.success) {
        finish(() =>
          reject(new Error(`WebSocket command ${type} failed: ${JSON.stringify(message.error)}`))
        );
        return;
      }
      finish(() => resolve((message.result ?? {}) as T));
    });
    socket.addEventListener('error', () =>
      finish(() => reject(new Error(`WebSocket command ${type} could not connect`)))
    );
  });
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
