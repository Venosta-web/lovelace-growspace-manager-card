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
        Authorization: `Bearer ${authContext.token}`,
      };
    }

    const context = await browser.newContext(contextOptions);

    if (authContext.token) {
      // extraHTTPHeaders only covers direct API calls the specs make via
      // page.request/callHAService. The frontend SPA never reads that header —
      // it bootstraps its own session from `hassTokens` in localStorage, the
      // same mechanism HA's companion apps use to embed a logged-in session.
      // Without this, every dashboard navigation lands on the login screen and
      // `growspace-manager-card` never mounts, regardless of whether the
      // dashboard itself exists.
      await context.addInitScript((token: string) => {
        const hassTokens = {
          access_token: token,
          token_type: 'Bearer',
          // A long-lived access token has no real expiry; a far-future value
          // just keeps the frontend from attempting an OAuth refresh (which
          // would fail — there is no refresh_token for this kind of token).
          expires_in: 1900000000,
          refresh_token: '',
          hassUrl: window.location.origin,
          clientId: null,
          expires: Date.now() + 1900000000 * 1000,
        };
        window.localStorage.setItem('hassTokens', JSON.stringify(hassTokens));
      }, authContext.token);
    }

    await use(context);
    await context.close();
  },
});

export { expect } from '@playwright/test';
