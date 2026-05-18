import { test as base } from '@playwright/test';
import { AuthContext } from './types';

export const authenticatedTest = base.extend<{ authContext: AuthContext }>({
  authContext: async ({}, use) => {
    const token = process.env.HA_ACCESS_TOKEN;
    const baseURL = process.env.HA_BASE_URL || 'http://localhost:8123';

    if (!token) {
      throw new Error('HA_ACCESS_TOKEN environment variable is required');
    }

    await use({ token, baseURL });
  },

  context: async ({ browser, authContext }, use) => {
    const context = await browser.newContext({
      baseURL: authContext.baseURL,
      extraHTTPHeaders: {
        'Authorization': `Bearer ${authContext.token}`,
      },
    });

    await use(context);
    await context.close();
  },
});

export { expect } from '@playwright/test';
