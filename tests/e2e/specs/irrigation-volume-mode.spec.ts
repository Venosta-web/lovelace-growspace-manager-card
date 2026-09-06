import type { Page } from '@playwright/test';
import { haTest as test, expect, callHAService } from '../fixtures/ha-setup';
import { GrowspaceCard } from '../pages/GrowspaceCard';
import { IrrigationDialog } from '../pages/Dialogs';

/**
 * Volume Mode, end to end — the one card scenario for the [[Irrigation Command]]
 * compiler (card ADR-0054).
 *
 * It is here because Volume Mode is the only change whose domain shape and wire
 * shape differ: the card holds a **nested** Substrate Profile, the action takes
 * the two flat keys `substrate_media_type` / `substrate_liters_per_pot`, and the
 * backend folds them back into the nested profile it returns. A unit test can
 * assert the payload the compiler produces; only this can show that the payload
 * is the one the released backend validates, persists, and reads back nested.
 *
 * Volume Mode is also a **post-change** invariant on the backend (its ADR-0046):
 * it is refused unless the growspace ends up with both a positive pump flow rate
 * and a positive liters-per-pot, which is why the trace establishes the stored
 * flow rate first and why the Volume control stays locked until the profile
 * lands.
 *
 * The Pore EC Target Band — the other pair with clearing semantics worth
 * proving — is covered at the backend's own change interface. Its card path is
 * the ordinary buffered footer save with nothing shape-shifting about it, and a
 * second browser scenario would cost minutes to re-assert what the compiler
 * tests already state.
 */

const SLUG = 'vwc_veg';
const PUMP_FLOW_ML_PER_SEC = 12.5;
const LITERS_PER_POT = 6.5;

async function getOverview(page: Page): Promise<Record<string, any>> {
  const baseURL = process.env.HA_BASE_URL || 'http://localhost:8123';
  const token = process.env.HA_ACCESS_TOKEN;
  const response = await page.request.get(`${baseURL}/api/states/sensor.e2e_${SLUG}_overview`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  expect(response.ok(), `the ${SLUG} overview sensor should exist`).toBe(true);
  return (await response.json()).attributes.irrigation;
}

test.describe('Volume Mode — nested profile in, flat fields on the wire, nested profile back', () => {
  let growspaceCard: GrowspaceCard;

  test.beforeEach(async ({ page, testContext }) => {
    test.setTimeout(120000);

    // The trace starts from a growspace that already stores a positive pump flow
    // rate: it is one half of Volume Mode's prerequisite, and it is a settings
    // field rather than the strategy field this scenario is about.
    await callHAService(page, 'growspace_manager', 'set_irrigation_settings', {
      growspace_id: testContext.vwcVegGrowspaceId,
      pump_flow_rate_ml_per_sec: PUMP_FLOW_ML_PER_SEC,
    });
    await callHAService(page, 'growspace_manager', 'set_irrigation_strategy', {
      growspace_id: testContext.vwcVegGrowspaceId,
      shot_sizing_mode: 'seconds',
      substrate_media_type: 'coco',
      substrate_liters_per_pot: 0,
    });

    growspaceCard = new GrowspaceCard(page);
    await growspaceCard.navigate(testContext.vwcVegDashboardPath);
    await growspaceCard.waitForCardReady();
  });

  test('a nested Substrate Profile unlocks and persists Volume Mode', async ({ page }) => {
    await expect
      .poll(async () => (await getOverview(page)).volume_mode_capable, { timeout: 20_000 })
      .toBe(false);

    // Exact: this growspace also carries the Irrigation Recipes and Irrigation
    // Programs entries, which a loose /irrigation/i matches too.
    await growspaceCard.clickMenuItem(/^\s*Irrigation\s*$/);
    const dialog = new IrrigationDialog(page);
    await dialog.waitForOpen();
    await dialog.clickTab('substrate_ec');

    // Locked: the growspace has the flow rate but no substrate volume yet.
    await expect(dialog.sizingModeButton('volume')).toBeDisabled();

    // One nested profile change; the compiler sends the two flat keys.
    await dialog.selectSubstrateMedia('rockwool');
    await dialog.fillLitersPerPot(LITERS_PER_POT);

    await expect
      .poll(async () => (await getOverview(page)).irrigation_strategy.substrate_profile, {
        timeout: 20_000,
      })
      .toEqual({ media_type: 'rockwool', liters_per_pot: LITERS_PER_POT });

    // Both prerequisites now hold, so the backend reports the capability and the
    // card reads it rather than re-deriving it (ADR-0017).
    await expect
      .poll(async () => (await getOverview(page)).volume_mode_capable, { timeout: 20_000 })
      .toBe(true);

    await page.reload();
    await growspaceCard.waitForCardReady();
    await growspaceCard.clickMenuItem(/^\s*Irrigation\s*$/);
    await dialog.waitForOpen();
    await dialog.clickTab('substrate_ec');
    await expect(dialog.sizingModeButton('volume')).toBeEnabled();

    await dialog.clickSizingMode('volume');

    // Accepted by the post-change validation rather than rejected for a
    // prerequisite the change itself never mentioned.
    await expect
      .poll(async () => (await getOverview(page)).irrigation_strategy.shot_sizing_mode, {
        timeout: 20_000,
      })
      .toBe('volume');

    // And the profile the card sent flat comes back nested, unchanged.
    const irrigation = await getOverview(page);
    expect(irrigation.irrigation_strategy.substrate_profile).toEqual({
      media_type: 'rockwool',
      liters_per_pot: LITERS_PER_POT,
    });
    expect(irrigation.irrigation_config.pump_flow_rate_ml_per_sec).toBe(PUMP_FLOW_ML_PER_SEC);
  });
});
