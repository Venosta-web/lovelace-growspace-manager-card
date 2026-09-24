import { callHAService, callHAWebSocket, expect, haTest as test } from '../fixtures/ha-setup';
import { ConfigDialog } from '../pages/Dialogs';
import { GrowspaceCard } from '../pages/GrowspaceCard';

interface GrowspaceConfig {
  identity: { growspace_id: string };
  environment: {
    growlight_config: Record<string, unknown>;
    light_leak_config: {
      enabled: boolean;
      illuminance_sensor: string | null;
      threshold_lux: number;
      debounce_seconds: number;
      switch_off_lights: boolean;
      all_stages: boolean;
    };
    temperature_sensors: string[];
  };
}

async function configFor(id: string): Promise<GrowspaceConfig> {
  const data = await callHAWebSocket<Record<string, GrowspaceConfig>>('growspace_manager/get_data');
  const growspace = Object.values(data).find((item) => item.identity.growspace_id === id);
  if (!growspace) throw new Error(`Growspace ${id} was absent from get_data`);
  return growspace;
}

test('Growlights saves the whole light leak guard without resetting the controller', async ({
  page,
  testContext,
}) => {
  const id = testContext.vwcFlowerGrowspaceId;
  const path = testContext.vwcFlowerDashboardPath;
  test.skip(!id || !path, 'A flower growspace dashboard is required');

  const original = (await configFor(id)).environment;
  const sensor = original.temperature_sensors[0];
  expect(sensor, 'the e2e growspace needs one sensor for the clear action').toBeTruthy();
  await callHAService(page, 'growspace_manager', 'configure_environment', {
    growspace_id: id,
    light_leak_config: { ...original.light_leak_config, illuminance_sensor: sensor },
  });

  try {
    const card = new GrowspaceCard(page);
    await card.navigate(path);
    await card.waitForCardReady();
    await card.card.locator('[aria-label="Settings"]').click();
    const dialog = new ConfigDialog(page);
    await dialog.waitForOpen();
    await dialog.clickTab('growlight');
    const tab = dialog.dialog.locator('config-growlight-tab');

    await expect(tab.getByRole('button', { name: 'Clear illuminance sensor' })).toBeVisible();
    await tab.getByRole('button', { name: 'Clear illuminance sensor' }).click();
    await tab.locator('md3-number-input[label="Threshold (lux)"] input').fill('2.5');
    await tab.locator('md3-number-input[label="Debounce (seconds)"] input').fill('45');
    await tab.getByLabel('Switch off lights when a leak is detected').check();
    await tab.getByLabel('Also watch the veg dark period').check();
    await dialog.save();

    const saved = (await configFor(id)).environment;
    expect(saved.light_leak_config).toEqual({
      enabled: true,
      illuminance_sensor: null,
      threshold_lux: 2.5,
      debounce_seconds: 45,
      switch_off_lights: true,
      all_stages: true,
    });
    expect(saved.growlight_config).toEqual(original.growlight_config);

    await page.reload();
    await card.waitForCardReady();
    await card.card.locator('[aria-label="Settings"]').click();
    await dialog.waitForOpen();
    await dialog.clickTab('growlight');
    await expect(tab.locator('md3-number-input[label="Threshold (lux)"] input')).toHaveValue('2.5');
    await expect(tab.locator('md3-number-input[label="Debounce (seconds)"] input')).toHaveValue(
      '45'
    );
    await expect(tab.getByLabel('Switch off lights when a leak is detected')).toBeChecked();
  } finally {
    await callHAService(page, 'growspace_manager', 'configure_environment', {
      growspace_id: id,
      light_leak_config: original.light_leak_config,
    });
  }
});
