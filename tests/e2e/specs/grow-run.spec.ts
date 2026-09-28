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

  /**
   * Completing it (GSM#671): the details offer Complete run, the Run
   * Completion Preview asks for every warning it holds to be acknowledged, and
   * the completed Run's metrics are marked Pending while the chip returns to
   * Start run.
   */
  test('a grower completes the run after acknowledging its warnings', async ({
    page,
    testContext,
  }) => {
    const card = new GrowspaceCard(page);
    await card.navigate(testContext.dashboardPath);
    await card.waitForCardReady();

    const chip = page.locator('growspace-run-chip button.chip');
    await expect(chip).toBeVisible();
    if ((await chip.getAttribute('data-state')) === 'none') {
      await chip.click();
      const start = page.locator('growspace-run-chip ha-dialog');
      await start.getByRole('button', { name: 'Start run' }).click();
    }
    await expect(chip).toHaveAttribute('data-state', 'active');

    await chip.click();
    await expect(page.getByTestId('run-metrics-state')).toContainText('Live metrics');
    await page.getByRole('button', { name: 'Complete run…' }).click();

    const completion = page.locator('growspace-run-completion-dialog');
    await expect(completion.getByTestId('completion-boundary')).toBeVisible();
    await expect(completion.getByTestId('completion-coverage')).toBeVisible();
    const complete = completion.getByRole('button', { name: 'Complete run', exact: true });
    for (const box of await completion.locator('input[data-ack]').all()) {
      await expect(complete).toBeDisabled();
      await box.check();
    }
    await completion.getByLabel('Retrospective note (optional)').fill('E2E retrospective');
    await complete.click();

    await expect(completion.getByTestId('metrics-state')).toHaveText('Metrics pending');
    await expect(completion.getByRole('status')).toHaveText(/Run #\d+ is completed\./);
    await expect(chip).toHaveAttribute('data-state', 'none');
    await expect(chip).toHaveText(/Start run/);
    await completion.getByRole('button', { name: 'Close' }).click();
    await expect(completion).toHaveCount(0);
  });
});
