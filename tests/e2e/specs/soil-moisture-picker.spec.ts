import type { Page } from '@playwright/test';
import { expect, haTest as test } from '../fixtures/ha-setup';
import { GrowspaceCard } from '../pages/GrowspaceCard';
import { ConfigDialog } from '../pages/Dialogs';

/**
 * Issue #37 — a configured soil-moisture probe with no `device_class` rendered
 * in the Config Dialog's own picker as "Unknown entity selected".
 *
 * Both halves of the fix need Home Assistant's real `ha-entity-picker`, because
 * the failure lives entirely inside it: `includeEntities` is a hard set filter
 * with no keep-the-current-value escape hatch, unlike the `includeDeviceClasses`
 * / `entityFilter` paths HA applies with an `id === value` exemption. The
 * "unknown" affordance is then decided purely by item-list membership.
 *
 * `sensor.issue37_classless_vwc` (hub: ha-dev/packages/issue_37_classless_vwc.yaml)
 * mirrors the reporter's sensor: `%`, `state_class: measurement`, no class.
 */

const CLASSLESS_VWC = 'sensor.issue37_classless_vwc';
const FIELD_LABEL = 'Soil Moisture Sensor';

/**
 * The Soil Moisture field's picker, resolved by its label rather than by
 * position — the tab also renders one `gm-entity-picker` per multi-select as
 * its "Add entity" affordance, so DOM order is not a stable handle.
 */
async function soilMoisturePicker(page: Page) {
  const pickers = page.locator('config-sensors-tab gm-entity-picker');
  await expect(pickers.first()).toBeVisible();

  const index = await pickers.evaluateAll(
    (elements, label) =>
      elements.findIndex((el) => (el as HTMLElement & { label: string }).label === label),
    FIELD_LABEL
  );
  expect(index, `no gm-entity-picker labelled "${FIELD_LABEL}"`).toBeGreaterThanOrEqual(0);
  return pickers.nth(index);
}

test.describe('Soil Moisture Sensor picker', () => {
  test.beforeEach(async ({ page, testContext }) => {
    test.skip(!testContext.vwcFlowerDashboardPath, 'TEST_VWC_FLOWER_DASHBOARD_PATH is required');
    const growspaceCard = new GrowspaceCard(page);
    await growspaceCard.navigate(testContext.vwcFlowerDashboardPath);
    await growspaceCard.waitForCardReady();

    await growspaceCard.card.locator('[aria-label="Settings"]').click();
    const dialog = new ConfigDialog(page);
    await dialog.waitForOpen();
    await dialog.clickTab('sensors');
  });

  test('offers a probe that reports % with no device_class', async ({ page }) => {
    const picker = await soilMoisturePicker(page);

    // The field filtered on `device_class: 'moisture'` alone, which the
    // overwhelming majority of ESPHome and template probes never set.
    await expect
      .poll(() =>
        picker.evaluate((element) => (element as HTMLElement & { options: string[] }).options)
      )
      .toContain(CLASSLESS_VWC);
  });

  test('renders a configured entity its own option list omits, rather than "unknown"', async ({
    page,
  }) => {
    const picker = await soilMoisturePicker(page);

    // The shape of the bug: a live, saved entity the field's filter does not
    // offer. Driven directly so the assertion does not depend on which filter
    // happens to miss it. Without the guard HA marks the field `unknown`.
    await picker.evaluate((element, entityId) => {
      const field = element as HTMLElement & { options: string[]; value: string };
      field.options = field.options.filter((id) => id !== entityId);
      field.value = entityId;
    }, CLASSLESS_VWC);

    const field = picker.locator('ha-picker-field');
    await expect(field).toBeVisible();
    await expect(field).toHaveAttribute('aria-label', FIELD_LABEL);
    await expect(field).not.toHaveAttribute('unknown', '');
    await expect(field).toContainText('issue37 classless vwc');
  });
});
