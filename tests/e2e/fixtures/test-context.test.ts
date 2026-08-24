import { describe, expect, it } from 'vitest';

import { createTestContext } from './test-context';

describe('legacy E2E dashboard configuration', () => {
  it('defaults the legacy specs to the generated veg dashboard', () => {
    const context = createTestContext({ TEST_GROWSPACE_ID: 'growspace-1' });

    expect(context.dashboardPath).toBe('/e2e-veg/0');
  });

  it('honours an explicitly configured dashboard path', () => {
    const context = createTestContext({
      TEST_GROWSPACE_ID: 'growspace-1',
      TEST_DASHBOARD_PATH: '/custom-dashboard/0',
    });

    expect(context.dashboardPath).toBe('/custom-dashboard/0');
  });
});
