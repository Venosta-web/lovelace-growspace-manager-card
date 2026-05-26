import { test as base } from '@playwright/test';
import { AuthContext } from './types';

export const authenticatedTest = base.extend<{ authContext: AuthContext }>({
  authContext: async ({}, use) => {
    const token = process.env.HA_ACCESS_TOKEN;
    const baseURL = process.env.HA_BASE_URL || 'http://localhost:8123';

    // No longer throwing an error if token is missing
    await use({ token, baseURL });
  },

  context: async ({ browser, authContext }, use) => {
    const contextOptions: any = {
      baseURL: authContext.baseURL,
    };

    if (authContext.token) {
      contextOptions.extraHTTPHeaders = {
        'Authorization': `Bearer ${authContext.token}`,
      };
    }

    const context = await browser.newContext(contextOptions);

    await use(context);
    await context.close();
  },
});

export { expect } from '@playwright/test';
