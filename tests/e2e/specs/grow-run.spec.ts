import { haTest as test, expect, callHAWebSocket } from '../fixtures/ha-setup';
import { GrowspaceCard } from '../pages/GrowspaceCard';

interface StartResult {
  outcome: 'started' | 'refused';
  run_revision?: number;
  refusal?: {
    code: string;
    current_revision: number | null;
    active_run: { sequence_number: number } | null;
  };
}

/**
 * Starting an Active Grow Run from the header (GSM#668), against the real
 * backend: the chip offers Start run, the dialog starts one, the chip then
 * shows it from the Active Run Sensor, and a start decided on the old Run
 * Revision is refused with the current one.
 */
test.describe('Grow Run', () => {
  test('a grower starts a run from the header and sees it at once', async ({
    page,
    testContext,
  }) => {
    const card = new GrowspaceCard(page);
    await card.navigate(testContext.dashboardPath);
    await card.waitForCardReady();

    const chip = page.locator('growspace-run-chip button.chip');
    await expect(chip).toBeVisible();

    // A retry lands on a growspace whose run the first attempt already started.
    if ((await chip.getAttribute('data-state')) === 'none') {
      await expect(chip).toHaveText(/Start run/);
      await chip.click();
      const dialog = page.locator('growspace-run-chip ha-dialog');
      await expect(dialog.getByText(/in this growspace now|No plants are in/)).toBeVisible();
      await dialog.getByLabel('Name (optional)').fill('E2E run');
      await dialog.getByRole('button', { name: 'Start run' }).click();
    }

    await expect(chip).toHaveAttribute('data-state', 'active');
    await expect(chip).toHaveText(/Run #\d+ · .*\d+ days? · \d+ plants?/);

    const stale = await callHAWebSocket<StartResult>('growspace_manager/start_grow_run', {
      growspace_id: testContext.growspaceId,
      expected_run_revision: 0,
    });
    expect(stale.outcome).toBe('refused');
    expect(stale.refusal?.code).toBe('grow_run.revision_conflict');
    expect(stale.refusal?.current_revision).toBeGreaterThanOrEqual(1);
    expect(stale.refusal?.active_run?.sequence_number).toBeGreaterThanOrEqual(1);
  });
});
