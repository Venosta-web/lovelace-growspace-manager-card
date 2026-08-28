import type { Locator, Page } from '@playwright/test';
import { expect, haTest as test } from '../fixtures/ha-setup';
import { ConfigDialog } from '../pages/Dialogs';
import { GrowspaceCard } from '../pages/GrowspaceCard';

const HEALTHY_MINIMUM = '33.7';
const HEALTHY_MAXIMUM = '57.3';

function moistureBound(dialog: ConfigDialog, label: string): Locator {
  return dialog.dialog
    .locator(`config-sensors-tab md3-number-input[label="${label}"]`)
    .locator('input');
}

async function openSensorsTab(card: GrowspaceCard, page: Page): Promise<ConfigDialog> {
  await card.card.locator('[aria-label="Settings"]').click();
  const dialog = new ConfigDialog(page);
  await dialog.waitForOpen();
  await dialog.clickTab('sensors');
  await expect(moistureBound(dialog, 'Healthy minimum')).toBeVisible();
  return dialog;
}

async function saveWithServiceDiagnostics(
  dialog: ConfigDialog,
  page: Page,
  browserErrors: string[]
): Promise<void> {
  const cardErrorToast = page.locator('growspace-toast-ui .toast-notification.error');
  const serviceErrorToast = page
    .getByText(/Failed to perform the action growspace_manager\/configure_environment/i)
    .first();
  const successToast = page.locator('growspace-toast-ui .toast-notification.success');

  await dialog.dialog.locator('button.md3-button.primary').click();

  try {
    const outcome = await Promise.race([
      successToast
        .waitFor({ state: 'visible', timeout: 10_000 })
        .then(() => ({ type: 'saved' as const })),
      serviceErrorToast.waitFor({ state: 'visible', timeout: 10_000 }).then(async () => ({
        type: 'service-error' as const,
        message: (await serviceErrorToast.textContent())?.trim() || 'unknown error',
      })),
      cardErrorToast.waitFor({ state: 'visible', timeout: 10_000 }).then(async () => ({
        type: 'service-error' as const,
        message:
          (await cardErrorToast.locator('.toast-message').textContent())?.trim() || 'unknown error',
      })),
    ]);

    if (outcome.type === 'service-error') {
      throw new Error(
        [
          `Home Assistant rejected configure_environment: ${outcome.message}`,
          ...browserErrors.map((message) => `browser console: ${message}`),
        ].join('\n')
      );
    }
  } catch (cause) {
    if (cause instanceof Error && cause.message.startsWith('Home Assistant rejected')) throw cause;
    throw new Error(
      [
        'Moisture-band save neither completed nor surfaced an error toast.',
        ...browserErrors.map((message) => `browser console: ${message}`),
      ].join('\n'),
      { cause }
    );
  }

  await expect(
    serviceErrorToast,
    'configure_environment must not surface Home Assistant service validation errors'
  ).toBeHidden();
  await expect(
    cardErrorToast,
    'configure_environment must not surface a service-error toast'
  ).toBeHidden();
  await expect(successToast).toContainText('Environment configured successfully!');
  await dialog.dialog.waitFor({ state: 'hidden', timeout: 10_000 });
}

test('persists both moisture bounds through the live configure_environment service', async ({
  page,
  testContext,
}) => {
  test.skip(!testContext.vwcFlowerDashboardPath, 'TEST_VWC_FLOWER_DASHBOARD_PATH is required');

  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  const card = new GrowspaceCard(page);
  await card.navigate(testContext.vwcFlowerDashboardPath);
  await card.waitForCardReady();

  const dialog = await openSensorsTab(card, page);
  const minimum = moistureBound(dialog, 'Healthy minimum');
  const maximum = moistureBound(dialog, 'Healthy maximum');

  await minimum.fill(HEALTHY_MINIMUM);
  await maximum.fill(HEALTHY_MAXIMUM);
  await expect(minimum).toHaveValue(HEALTHY_MINIMUM);
  await expect(maximum).toHaveValue(HEALTHY_MAXIMUM);

  await saveWithServiceDiagnostics(dialog, page, browserErrors);

  await page.reload();
  await card.waitForCardReady();
  const reopened = await openSensorsTab(card, page);

  await expect(moistureBound(reopened, 'Healthy minimum')).toHaveValue(HEALTHY_MINIMUM);
  await expect(moistureBound(reopened, 'Healthy maximum')).toHaveValue(HEALTHY_MAXIMUM);
});
