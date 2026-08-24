import type { Page } from '@playwright/test';
import { haTest as test, expect } from '../fixtures/ha-setup';
import { ConfigDialog, SnapshotsDialog } from '../pages/Dialogs';
import { GrowspaceCard } from '../pages/GrowspaceCard';

const OVERVIEW = 'sensor.e2e_vision_overview';
const CAMERAS = ['camera.e2e_vision_1', 'camera.e2e_vision_2'];

type HAState = {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
};

async function getState(page: Page, entityId: string): Promise<HAState> {
  const baseURL = process.env.HA_BASE_URL || 'http://localhost:8123';
  const token = process.env.HA_ACCESS_TOKEN;
  const response = await page.request.get(`${baseURL}/api/states/${entityId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  expect(response.ok(), `Home Assistant state ${entityId} should exist`).toBe(true);
  return response.json();
}

async function getOverview(page: Page): Promise<Record<string, any>> {
  const { GrowspaceAPIResponseSchema } = await import('../../../src/slices/growspace/schema');
  return GrowspaceAPIResponseSchema.parse((await getState(page, OVERVIEW)).attributes);
}

test.describe('Camera and Vision Checkup capability profile', () => {
  let card: GrowspaceCard;

  test.beforeEach(async ({ page, testContext }) => {
    expect(testContext.visionGrowspaceId).not.toBe('');
    expect(testContext.visionDashboardPath).not.toBe('');
    card = new GrowspaceCard(page);
    await card.navigate(testContext.visionDashboardPath);
    await card.waitForCardReady();
  });

  test('discovers both cameras and projects the persisted Vision Checkup schedule', async ({
    page,
  }) => {
    for (const entityId of CAMERAS) {
      const camera = await getState(page, entityId);
      expect(camera.state).not.toBe('unavailable');
      expect(camera.attributes.file_path).toBe(
        `/config/www/e2e-camera-assets/${entityId.split('.')[1]}.jpg`
      );
    }

    const overview = await getOverview(page);
    expect(overview.environment.camera_entities).toEqual(CAMERAS);
    expect(overview.environment.vision_checkup_config).toMatchObject({
      enabled: true,
      early_check_offset_minutes: 45,
      mid_check_hours: 6,
      late_check_offset_minutes: 45,
    });

    await card.card.locator('[aria-label="Settings"]').click();
    const dialog = new ConfigDialog(page);
    await dialog.waitForOpen();
    await dialog.clickTab('vision');

    const cameraField = dialog.dialog.locator(
      'config-vision-tab config-entity-multi-select[label="Camera Entities"]'
    );
    await expect
      .poll(() =>
        cameraField.evaluate((element) => {
          const field = element as HTMLElement & { values: string[]; options: string[] };
          return { values: field.values, options: field.options };
        })
      )
      .toEqual({ values: CAMERAS, options: expect.arrayContaining(CAMERAS) });
    await expect(cameraField.locator('.chip')).toHaveCount(2);
    await expect(cameraField.locator('.chip').first()).toContainText('E2E Vision 1');
    await expect(cameraField.locator('.chip').nth(1)).toContainText('E2E Vision 2');
    await expect(dialog.dialog.getByText('Enable automatic vision checkups')).toBeVisible();
    await expect(dialog.dialog.locator('config-vision-tab input[type="checkbox"]')).toBeChecked();
    await expect
      .poll(() =>
        dialog.dialog
          .locator('config-vision-tab md3-number-input')
          .evaluateAll((inputs) => inputs.map((input) => (input as any).value))
      )
      .toEqual([45, 6, 45]);
  });

  test('captures and presents one distinguishable snapshot per camera', async ({ page }) => {
    await card.clickMenuItem(/camera snapshots/i);
    const dialog = new SnapshotsDialog(page);
    await dialog.waitForOpen();

    await dialog.dialog.getByText('Capture Now', { exact: true }).click();
    await expect(dialog.dialog.getByText('Capture Now', { exact: true })).toBeVisible();

    const first = dialog.dialog.locator('img.snapshot-image[src*="camera_e2e_vision_1.jpg"]');
    const second = dialog.dialog.locator('img.snapshot-image[src*="camera_e2e_vision_2.jpg"]');
    await expect(first.first()).toBeVisible();
    await expect(second.first()).toBeVisible();

    const [firstResponse, secondResponse] = await Promise.all([
      page.request.get((await first.first().getAttribute('src'))!),
      page.request.get((await second.first().getAttribute('src'))!),
    ]);
    expect(firstResponse.ok()).toBe(true);
    expect(secondResponse.ok()).toBe(true);
    expect(firstResponse.headers()['content-type']).toContain('image/jpeg');
    expect(secondResponse.headers()['content-type']).toContain('image/jpeg');
    expect(await firstResponse.body()).not.toEqual(await secondResponse.body());
  });

  test('keeps history empty and reports the existing AI availability gate locally', async ({
    page,
  }) => {
    await card.clickMenuItem(/camera snapshots/i);
    const dialog = new SnapshotsDialog(page);
    await dialog.waitForOpen();
    await dialog.dialog.getByText('Vision Checkup', { exact: true }).click();

    await expect(dialog.dialog.getByText(/No vision checkups yet/i)).toBeVisible();
    await dialog.dialog.getByText('Run Checkup Now', { exact: true }).click();
    await expect(card.card.locator('growspace-toast-ui .toast-message')).toContainText(
      'Failed to trigger checkup'
    );
    await expect(dialog.dialog.getByText(/No vision checkups yet/i)).toBeVisible();
  });
});
