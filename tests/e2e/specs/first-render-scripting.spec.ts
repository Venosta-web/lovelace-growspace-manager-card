import { appendFile } from 'node:fs/promises';

import { haTest as test, expect } from '../fixtures/ha-setup';
import { cardScripting, type CpuProfile } from '../fixtures/scripting-profile';

/**
 * #971: the main card's first render on the Demo Tent, from navigation until
 * the loaded card has settled, under a 4x CPU throttle — roughly a mid-range
 * phone, which is where a wall-mounted dashboard lives.
 *
 * This is a warning, not a gate. It reports through a test annotation, the
 * attached measurement and the job summary, and fails only when it measured no
 * card code at all, since a check that silently measures nothing is worse than
 * none. The managed harness serves the development build, so the figure
 * includes parsing unminified code and runs high against a release.
 */
const CPU_THROTTLE_RATE = 4;
const SCRIPTING_BUDGET_MS = 100;
/** Microseconds; the DevTools default is 1,000, too coarse for a 100 ms budget. */
const SAMPLING_INTERVAL_US = 100;

test.describe('Main card first render', () => {
  test('reports its scripting time against the budget on the Demo Tent', async ({
    page,
    testContext,
  }, testInfo) => {
    test.setTimeout(120_000);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE_RATE });
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: SAMPLING_INTERVAL_US });
    await cdp.send('Profiler.start');

    await page.goto(testContext.demoDashboardPath);
    const card = page.locator('growspace-manager-card').first();
    await card.locator('.unified-growspace-card').waitFor({ state: 'visible', timeout: 60_000 });
    // The loaded render has committed; let the nested elements it scheduled
    // finish their own updates before the window closes.
    await card.evaluate(async (element) => {
      await (element as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });

    const { profile } = (await cdp.send('Profiler.stop')) as { profile: CpuProfile };
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

    const measured = cardScripting(profile);
    const report = {
      dashboard: testContext.demoDashboardPath,
      cpuThrottleRate: CPU_THROTTLE_RATE,
      budgetMs: SCRIPTING_BUDGET_MS,
      cardScriptingMs: Math.round(measured.cardMs),
      pageScriptingMs: Math.round(measured.busyMs),
      cardSamples: measured.cardSamples,
    };
    await testInfo.attach('first-render-scripting.json', {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    });

    expect(measured.cardSamples, 'the profile holds samples from the card bundle').toBeGreaterThan(
      0
    );

    const within = measured.cardMs <= SCRIPTING_BUDGET_MS;
    const line =
      `Main-card first render on the Demo Tent: ${report.cardScriptingMs} ms of card scripting ` +
      `under ${CPU_THROTTLE_RATE}x CPU throttle (budget ${SCRIPTING_BUDGET_MS} ms; ` +
      `${report.pageScriptingMs} ms of page scripting in all).`;
    console.log(line);
    if (!within) {
      testInfo.annotations.push({ type: 'warning', description: line });
    }
    if (process.env.GITHUB_STEP_SUMMARY) {
      await appendFile(
        process.env.GITHUB_STEP_SUMMARY,
        `## First-render scripting\n\n${within ? '✅' : '⚠️ over budget (warning only):'} ${line}\n`
      );
    }
  });
});
