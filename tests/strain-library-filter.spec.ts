import { test, expect } from './coverage-helper';
import { createMockHass } from './mocks/hass';

test.describe('Strain Library Filter', () => {
  test('defaults to Library filter and hides stubs', async ({ coveragePage: page }) => {
    const card = page.locator('growspace-manager-card');

    const strains: Record<string, any> = {
      'OG Kush': {
        meta: { breeder: 'TGA Seeds', type: 'Hybrid', is_stub: false },
        phenotypes: { default: {} },
      },
      Haze: {
        meta: { is_stub: true },
        phenotypes: { default: {} },
      },
    };

    // Minimal WS response for growspace_manager/get_data — satisfies required schema fields
    const mockGrowspaceData = {
      '4x4_tent': {
        growspace_id: '4x4_tent',
        name: '4x4 Tent',
        type: 'normal',
        rows: 4,
        plants_per_row: 4,
        total_plants: 0,
        grid: {},
      },
    };

    const mockHass = createMockHass({ growspaceName: '4x4 Tent', rows: 4, cols: 4 });
    const hassData = JSON.parse(JSON.stringify(mockHass));

    await page.goto('/');

    // Clear localStorage to prevent cached strain data from interfering
    await page.evaluate(() => localStorage.clear());

    await card.evaluate(
      (node: any, { config, hassData, strains, growspaceData }) => {
        node.setConfig(config);
        node.hass = {
          ...hassData,
          callService: async () => Promise.resolve(),
          connection: {
            subscribeEvents: () => () => {},
            sendMessagePromise: (msg: any) => {
              if (msg.type === 'growspace_manager/get_data') {
                return Promise.resolve(growspaceData);
              }
              if (msg.type === 'growspace_manager/get_strain_library') {
                return Promise.resolve({ strains });
              }
              return Promise.resolve();
            },
          },
          localize: (key: string) => `[${key}]`,
          callApi: async () => Promise.resolve(),
        };
        node.store.handleDeviceChange('4x4_tent');
        // Propagate new hass (with custom sendMessagePromise) to the store and all APIs
        node.store.updateHass(node.hass);
        // Re-fetch strain library now that the custom sendMessagePromise is in place
        node.store.fetchStrainLibrary(true);
      },
      {
        config: { type: 'custom:growspace-manager-card', entity: 'sensor.4x4_tent' },
        hassData,
        strains,
        growspaceData: mockGrowspaceData,
      }
    );

    // Open strain library
    const menuButton = card.locator('#menu-trigger');
    await menuButton.click();
    const item = card.locator('.menu-item', { hasText: 'Strains' });
    await item.click();

    const dialog = page.locator('strain-library-dialog ha-dialog');
    await expect(dialog).toBeVisible();

    // Default filter is "Library" — stub "Haze" should NOT appear
    await expect(dialog.locator('.filter-chip.active')).toContainText('Library');
    await expect(dialog.locator('.strain-card', { hasText: 'OG Kush' })).toBeVisible();
    await expect(dialog.locator('.strain-card', { hasText: 'Haze' })).not.toBeVisible();

    // Switch to "All" — stub appears
    await dialog.locator('.filter-chip', { hasText: 'All' }).click();
    await expect(dialog.locator('.strain-card', { hasText: 'Haze' })).toBeVisible();

    // Switch to "Library" again — stub hidden
    await dialog.locator('.filter-chip', { hasText: 'Library' }).click();
    await expect(dialog.locator('.strain-card', { hasText: 'Haze' })).not.toBeVisible();
  });
});
