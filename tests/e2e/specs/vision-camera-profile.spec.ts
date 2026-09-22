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

  /**
   * Capture writes one file per configured camera, and the rail is where the
   * dialog offers them back.
   *
   * A frame is tied to its camera by its filename — `<stamp>_<entity id with
   * dots as underscores>.jpg`, the join the capture writers and the Snapshots
   * ViewModel already share — so that is the handle used here rather than the
   * friendly name the thumbnail happens to print today.
   *
   * The two bodies differing is the whole point: one frame reused for both
   * cameras is the bug this guards, and it would satisfy every other assertion.
   */
  test('captures and presents one distinguishable snapshot per camera', async ({ page }) => {
    // Two real camera captures plus the reload of the rail behind them.
    test.setTimeout(45_000);
    await card.clickMenuAction('snapshots');
    const dialog = new SnapshotsDialog(page);
    await dialog.waitForOpen();

    const framesOf = (entityId: string) =>
      dialog.dialog.locator(`.thumb img[src*="_${entityId.replace('.', '_')}."]`);
    const before = await Promise.all(CAMERAS.map((entityId) => framesOf(entityId).count()));

    await dialog.dialog.locator('.header-actions .capture-btn').click();

    const captured: string[] = [];
    for (const [index, entityId] of CAMERAS.entries()) {
      const frames = framesOf(entityId);
      await expect
        .poll(() => frames.count(), {
          message: `capture should add one ${entityId} frame to the rail`,
          timeout: 20_000,
        })
        .toBe(before[index] + 1);
      // The rail lists newest first, so the first frame is the one just taken.
      captured.push((await frames.first().getAttribute('src'))!);
    }

    const [first, second] = await Promise.all(captured.map((src) => page.request.get(src)));
    expect(first.ok()).toBe(true);
    expect(second.ok()).toBe(true);
    expect(first.headers()['content-type']).toContain('image/jpeg');
    expect(second.headers()['content-type']).toContain('image/jpeg');
    expect(await first.body()).not.toEqual(await second.body());
  });
});

/**
 * The other half of the profile: a growspace a Vision Checkup cannot run for.
 *
 * Every E2E growspace except `E2E Vision` is declared without cameras, and the
 * checkup refuses on exactly that before it records anything — so this is the
 * one gate that fires identically on a managed runtime and on a live `ha-dev`
 * whose Vision App is up and configured. Pointing it at the Vision growspace
 * instead would assert a failure that a correctly provisioned dev runtime does
 * not produce: `./scripts/e2e vision` configures the manual endpoint and
 * checkups there succeed.
 *
 * Two things must hold, and a redesign can quietly drop either: an evidence
 * surface with nothing to show has to say so rather than render a blank frame,
 * and a checkup that cannot run has to reach the user instead of being
 * swallowed, leaving the history exactly as empty as it was.
 */
test.describe('Vision Checkup on a growspace with no camera to check', () => {
  test('announces the empty evidence history and surfaces the checkup gate', async ({
    page,
    testContext,
  }) => {
    expect(testContext.vegGrowspaceId).not.toBe('');
    expect(testContext.vegDashboardPath).not.toBe('');
    const card = new GrowspaceCard(page);
    await card.navigate(testContext.vegDashboardPath);
    await card.waitForCardReady();

    await card.clickMenuAction('snapshots');
    const dialog = new SnapshotsDialog(page);
    await dialog.waitForOpen();
    await dialog.dialog.locator('.view-tab', { hasText: 'Vision evidence' }).click();

    const evidence = dialog.dialog.locator('growspace-vision-evidence');
    const checkups = evidence.locator('section.checkup');
    await expect(evidence.locator('.state h4')).toHaveText(/No Vision evidence yet/i);
    await expect(checkups).toHaveCount(0);

    await dialog.dialog.locator('.header-actions .run-checkup-btn').click();

    await expect(card.card.locator('growspace-toast-ui .toast-message')).toContainText(
      'Failed to trigger checkup'
    );
    await expect(evidence.locator('.state h4')).toHaveText(/No Vision evidence yet/i);
    await expect(checkups).toHaveCount(0);
  });
});
