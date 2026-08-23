import { Page } from '@playwright/test';
import { haTest as test, expect, callHAService } from '../fixtures/ha-setup';
import { TestContext } from '../fixtures/types';

// ---------------------------------------------------------------------------
// Strategy constants — kept short for E2E reliability
// ---------------------------------------------------------------------------
const P0_DURATION_MIN = 5;
const SHOT_DURATION_SEC = 15; // short shot → detectable by 3s poller, clears before next test
const SHOT_INTERVAL_MIN = 1;
const P2_STOP_MIN = 30;
const DAY_HOURS = 12;
const VWC_TARGET_VEG = 65;
const VWC_TARGET_FLOWER = 55;
const MAINTENANCE_DRYBACK = 3;

// Tank levels, in percent of the 50 L reservoir the fixtures register.
// `IrrigationTank.warning_level` defaults to 30 and the fixtures do not override
// it, so the coordinator skips every shot while the level is below that — which
// is what the tank guard test at the bottom of each suite exercises.
const TANK_WARNING_PERCENT = 30;
const TANK_READY_PERCENT = 80; // comfortably clear of the cutoff
const TANK_LOW_PERCENT = 15; // unambiguously under it

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

/** Returns the current wall-clock time as HH:MM:SS. */
function nowHHMMSS(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Adds `deltaMinutes` to an HH:MM:SS string, wrapping midnight safely.
 * Negative deltas are supported.
 */
function addMinutes(t: string, deltaMinutes: number): string {
  const [hh, mm, ss] = t.split(':').map(Number);
  let totalSeconds = hh * 3600 + mm * 60 + ss + deltaMinutes * 60;
  totalSeconds = ((totalSeconds % 86400) + 86400) % 86400;
  const rh = Math.floor(totalSeconds / 3600);
  const rm = Math.floor((totalSeconds % 3600) / 60);
  const rs = totalSeconds % 60;
  return `${String(rh).padStart(2, '0')}:${String(rm).padStart(2, '0')}:${String(rs).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// HA entity helpers
// ---------------------------------------------------------------------------

async function getEntityState(page: Page, entityId: string): Promise<string> {
  const baseURL = process.env.HA_BASE_URL || 'http://localhost:8123';
  const token = process.env.HA_ACCESS_TOKEN;
  const response = await page.request.get(`${baseURL}/api/states/${entityId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok()) {
    throw new Error(`getEntityState failed for ${entityId}: ${response.status()}`);
  }
  const data = await response.json();
  return (data as { state: string }).state;
}

function tankEntity(slug: string): string {
  return `input_number.e2e_${slug}_irrigation_tank`;
}

async function getTankLevel(page: Page, slug: string): Promise<number> {
  return Number(await getEntityState(page, tankEntity(slug)));
}

/**
 * Throws with the cause when the tank sits under the coordinator's cutoff.
 *
 * `beforeEach` fills the tank, so a low reading here means either that fill did
 * not land or something drained it mid-test. Both are worth naming, and neither
 * is something more waiting can fix.
 */
async function assertTankAboveCutoff(page: Page, slug: string, when: string): Promise<void> {
  const level = await getTankLevel(page, slug);
  if (Number.isFinite(level) && level >= TANK_WARNING_PERCENT) return;
  throw new Error(
    `Tank ${tankEntity(slug)} is at ${level}% ${when}, under the coordinator's ` +
      `${TANK_WARNING_PERCENT}% cutoff. Every shot is skipped while it is ` +
      `("Irrigation skipped — tank 'Tank' is low"), so the pump can never turn on. ` +
      `beforeEach sets it to ${TANK_READY_PERCENT}% — check that the ` +
      `input_number.set_value call landed.`,
  );
}

/**
 * Polls until the pump switches on, or throws after `timeoutMs`.
 *
 * Checks the tank up front and on every poll: a low tank makes the coordinator
 * refuse to irrigate at all, and waiting out the window only turns a cause we
 * already know into an opaque timeout.
 */
async function waitForPumpOn(
  page: Page,
  slug: string,
  pumpEntity: string,
  timeoutMs = 90_000,
): Promise<void> {
  await assertTankAboveCutoff(page, slug, 'before waiting for a shot');
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await getEntityState(page, pumpEntity)) === 'on') return;
    await assertTankAboveCutoff(page, slug, 'while waiting for a shot');
    await page.waitForTimeout(3_000);
  }
  const final = await getEntityState(page, pumpEntity);
  if (final !== 'on') {
    const level = await getTankLevel(page, slug);
    throw new Error(
      `Entity ${pumpEntity} expected "on" but got "${final}" after ${timeoutMs}ms ` +
        `(tank at ${level}%, cutoff ${TANK_WARNING_PERCENT}%)`,
    );
  }
}

/**
 * Asserts that the entity remains in `expected` state for the full `durationMs`.
 * Throws immediately if the state deviates.
 */
async function assertEntityStaysInState(
  page: Page,
  entityId: string,
  expected: string,
  durationMs = 70_000,
): Promise<void> {
  const deadline = Date.now() + durationMs;
  while (Date.now() < deadline) {
    const state = await getEntityState(page, entityId);
    if (state !== expected) {
      throw new Error(`Entity ${entityId} left expected state "${expected}" — got "${state}"`);
    }
    await page.waitForTimeout(5_000);
  }
}

async function setVwcSensor(page: Page, slug: string, value: number): Promise<void> {
  await callHAService(page, 'input_number', 'set_value', {
    entity_id: `input_number.e2e_${slug}_substrate_moisture`,
    value,
  });
}

async function setTankLevel(page: Page, slug: string, value: number): Promise<void> {
  await callHAService(page, 'input_number', 'set_value', {
    entity_id: `input_number.e2e_${slug}_irrigation_tank`,
    value,
  });
}

// ---------------------------------------------------------------------------
// Shared strategy payload builder (keeps per-test calls DRY)
// ---------------------------------------------------------------------------

function strategyPayload(
  growspaceId: string,
  lightsOnTime: string,
  target: number,
): Record<string, unknown> {
  return {
    growspace_id: growspaceId,
    enabled: true,
    lights_on_time: lightsOnTime,
    target_vwc_percent: target,
    maintenance_dryback_percent: MAINTENANCE_DRYBACK,
    p0_duration_minutes: P0_DURATION_MIN,
    p2_stop_before_lights_off_minutes: P2_STOP_MIN,
    shot_duration_seconds: SHOT_DURATION_SEC,
    shot_interval_minutes: SHOT_INTERVAL_MIN,
  };
}

// ---------------------------------------------------------------------------
// Growspace configs
// ---------------------------------------------------------------------------

interface GsConfig {
  label: string;
  slug: string;
  idKey: keyof TestContext;
  target: number;
}

const gsConfigs: GsConfig[] = [
  { label: 'veg', slug: 'vwc_veg', idKey: 'vwcVegGrowspaceId', target: VWC_TARGET_VEG },
  {
    label: 'flower',
    slug: 'vwc_flower',
    idKey: 'vwcFlowerGrowspaceId',
    target: VWC_TARGET_FLOWER,
  },
];

// ---------------------------------------------------------------------------
// Test suites — one describe block per growspace config (12 tests total)
// ---------------------------------------------------------------------------

for (const gs of gsConfigs) {
  test.describe(`VWC day cycle — ${gs.label}`, () => {
    test.beforeEach(async ({ page, testContext }) => {
      test.setTimeout(300_000);
      const growspaceId = testContext[gs.idKey];

      // Disable first → resets volatile coordinator state (e.g. target_reached_today)
      await callHAService(page, 'growspace_manager', 'set_irrigation_strategy', {
        growspace_id: growspaceId,
        enabled: false,
      });
      await page.waitForTimeout(2_000);

      // Re-enable with known-good sentinel values; lights_on_time overridden per-test
      await callHAService(
        page,
        'growspace_manager',
        'set_irrigation_strategy',
        strategyPayload(growspaceId, '06:00:00', gs.target),
      );

      // Reset irrigation settings — clear flags like pause_on_low_tank / auto_advance_p2_to_p3
      await callHAService(page, 'growspace_manager', 'set_irrigation_settings', {
        growspace_id: growspaceId,
        irrigation_pump_entity: `switch.sim_e2e_${gs.slug}_irrigation_pump`,
        drain_pump_entity: `switch.sim_e2e_${gs.slug}_drain_pump`,
        pause_on_low_tank: false,
        auto_advance_p2_to_p3: false,
      });

      // Ensure pump starts off
      await callHAService(page, 'switch', 'turn_off', {
        entity_id: `switch.sim_e2e_${gs.slug}_irrigation_pump`,
      }).catch(() => {});

      // Fill the tank. The guard test below drains it and nothing puts it back,
      // and an input_number keeps its value across runs — so a suite that
      // inherited whatever level the instance had irrigated only until the first
      // low-tank test had run, and skipped every shot from there on.
      await setTankLevel(page, gs.slug, TANK_READY_PERCENT);
      await assertTankAboveCutoff(page, gs.slug, 'after the beforeEach fill');

      // Neutral VWC — at target so no immediate irrigation trigger
      await setVwcSensor(page, gs.slug, gs.target);
    });

    // -----------------------------------------------------------------------
    // P3 — pre-lights phase: pump must remain silent regardless of VWC
    // -----------------------------------------------------------------------
    test('P3 — pump silent before lights on', async ({ page, testContext }) => {
      test.setTimeout(300_000);
      const growspaceId = testContext[gs.idKey];
      const pumpEntity = `switch.sim_e2e_${gs.slug}_irrigation_pump`;

      // lights_on_time = now + 120 min → we are well before lights-on (P3)
      const lightsOn = addMinutes(nowHHMMSS(), 120);
      await callHAService(
        page,
        'growspace_manager',
        'set_irrigation_strategy',
        strategyPayload(growspaceId, lightsOn, gs.target),
      );

      // VWC well below target — should still not trigger in P3
      await setVwcSensor(page, gs.slug, gs.target - 20);

      await assertEntityStaysInState(page, pumpEntity, 'off', 70_000);
    });

    // -----------------------------------------------------------------------
    // P0 — activation window: pump must remain silent
    // -----------------------------------------------------------------------
    test('P0 — pump silent during activation window', async ({ page, testContext }) => {
      test.setTimeout(300_000);
      const growspaceId = testContext[gs.idKey];
      const pumpEntity = `switch.sim_e2e_${gs.slug}_irrigation_pump`;

      // lights_on_time = now − (P0 / 2) → we are in the middle of the P0 window
      const lightsOn = addMinutes(nowHHMMSS(), -(P0_DURATION_MIN / 2));
      await callHAService(
        page,
        'growspace_manager',
        'set_irrigation_strategy',
        strategyPayload(growspaceId, lightsOn, gs.target),
      );

      // VWC well below target — should still not trigger during P0
      await setVwcSensor(page, gs.slug, gs.target - 20);

      await assertEntityStaysInState(page, pumpEntity, 'off', 70_000);
    });

    // -----------------------------------------------------------------------
    // P1 — ramp-up phase: pump fires when VWC drops below target
    // -----------------------------------------------------------------------
    test('P1 — pump fires on low VWC', async ({ page, testContext }) => {
      test.setTimeout(300_000);
      const growspaceId = testContext[gs.idKey];
      const pumpEntity = `switch.sim_e2e_${gs.slug}_irrigation_pump`;

      // lights_on_time = now − (P0 + 5) → past P0, in ramp-up window
      const lightsOn = addMinutes(nowHHMMSS(), -(P0_DURATION_MIN + 5));
      await callHAService(
        page,
        'growspace_manager',
        'set_irrigation_strategy',
        strategyPayload(growspaceId, lightsOn, gs.target),
      );

      // Drop VWC well below target to trigger an irrigation shot
      await setVwcSensor(page, gs.slug, gs.target - 20);

      await waitForPumpOn(page, gs.slug, pumpEntity);
      expect(await getEntityState(page, pumpEntity)).toBe('on');
    });

    // -----------------------------------------------------------------------
    // P2 — maintenance: shot fires once target_reached_today is established
    //
    // Two-tick setup:
    //   Tick 1 — VWC at target → coordinator sets target_reached_today = True
    //   Tick 2 — VWC drops below dryback threshold → coordinator fires maintenance shot
    // -----------------------------------------------------------------------
    test('P2 — maintenance shot fires after target reached', async ({ page, testContext }) => {
      test.setTimeout(300_000);
      const growspaceId = testContext[gs.idKey];
      const pumpEntity = `switch.sim_e2e_${gs.slug}_irrigation_pump`;

      // Phase window: past P0, within maintenance range
      const lightsOn = addMinutes(nowHHMMSS(), -(P0_DURATION_MIN + 5));
      await callHAService(
        page,
        'growspace_manager',
        'set_irrigation_strategy',
        strategyPayload(growspaceId, lightsOn, gs.target),
      );

      // Tick 1: VWC at target → coordinator marks target_reached_today = True
      await setVwcSensor(page, gs.slug, gs.target);
      await page.waitForTimeout(70_000);

      // Tick 2: drop VWC below dryback threshold → maintenance shot fires
      await setVwcSensor(page, gs.slug, gs.target - MAINTENANCE_DRYBACK - 1);

      await waitForPumpOn(page, gs.slug, pumpEntity);
      expect(await getEntityState(page, pumpEntity)).toBe('on');
    });

    // -----------------------------------------------------------------------
    // P2-stop — pre-lights-off suppression window: pump must stay silent
    //
    // Two-tick setup to establish target_reached_today before entering stop window:
    //   Tick 1 — P1 window, VWC at target → target_reached_today = True
    //   Then shift lights_on_time so now is inside the P2-stop window
    //   Tick 2 — VWC below dryback → coordinator suppresses shot (P2-stop guard)
    // -----------------------------------------------------------------------
    test('P2-stop — pump silent in pre-lights-off window with auto-advance', async ({
      page,
      testContext,
    }) => {
      test.setTimeout(300_000);
      const growspaceId = testContext[gs.idKey];
      const pumpEntity = `switch.sim_e2e_${gs.slug}_irrigation_pump`;

      // Step 1: Enter P1 window and enable auto_advance_p2_to_p3
      const p1LightsOn = addMinutes(nowHHMMSS(), -(P0_DURATION_MIN + 5));
      await callHAService(
        page,
        'growspace_manager',
        'set_irrigation_strategy',
        strategyPayload(growspaceId, p1LightsOn, gs.target),
      );
      await callHAService(page, 'growspace_manager', 'set_irrigation_settings', {
        growspace_id: growspaceId,
        irrigation_pump_entity: `switch.sim_e2e_${gs.slug}_irrigation_pump`,
        drain_pump_entity: `switch.sim_e2e_${gs.slug}_drain_pump`,
        pause_on_low_tank: false,
        auto_advance_p2_to_p3: true,
      });

      // Tick 1: VWC at target → coordinator marks target_reached_today = True
      await setVwcSensor(page, gs.slug, gs.target);
      await page.waitForTimeout(70_000);

      // Step 2: Shift lights_on_time to place now inside the P2-stop window.
      // lights_off = lights_on + DAY_HOURS * 60.  We want lights_off = now + 5 min,
      // so lights_on = now − (DAY_HOURS * 60 − 5).
      const p2StopLightsOn = addMinutes(nowHHMMSS(), -(DAY_HOURS * 60 - 5));
      await callHAService(
        page,
        'growspace_manager',
        'set_irrigation_strategy',
        strategyPayload(growspaceId, p2StopLightsOn, gs.target),
      );

      // VWC below dryback — would trigger in P2, but P2-stop guard must suppress it
      await setVwcSensor(page, gs.slug, gs.target - MAINTENANCE_DRYBACK - 1);

      await assertEntityStaysInState(page, pumpEntity, 'off', 70_000);
    });

    // -----------------------------------------------------------------------
    // Tank guard — pump stays off in P1 when tank level is below warning threshold
    // -----------------------------------------------------------------------
    test('tank low water — pump silent in P1 when tank is below warning', async ({
      page,
      testContext,
    }) => {
      test.setTimeout(300_000);
      const growspaceId = testContext[gs.idKey];
      const pumpEntity = `switch.sim_e2e_${gs.slug}_irrigation_pump`;

      // Enable the low-tank guard
      await callHAService(page, 'growspace_manager', 'set_irrigation_settings', {
        growspace_id: growspaceId,
        irrigation_pump_entity: `switch.sim_e2e_${gs.slug}_irrigation_pump`,
        drain_pump_entity: `switch.sim_e2e_${gs.slug}_drain_pump`,
        pause_on_low_tank: true,
        auto_advance_p2_to_p3: false,
      });

      // Phase = P1: past P0, in ramp-up window
      const lightsOn = addMinutes(nowHHMMSS(), -(P0_DURATION_MIN + 5));
      await callHAService(
        page,
        'growspace_manager',
        'set_irrigation_strategy',
        strategyPayload(growspaceId, lightsOn, gs.target),
      );

      // VWC well below target — would normally trigger an irrigation shot
      await setVwcSensor(page, gs.slug, gs.target - 20);

      // Drain the tank under the warning threshold. beforeEach refills it, so
      // this does not leak into the tests that follow.
      await setTankLevel(page, gs.slug, TANK_LOW_PERCENT);

      await assertEntityStaysInState(page, pumpEntity, 'off', 70_000);
    });
  });
}
