import type { Page } from '@playwright/test';
import { haTest as test, expect, callHAService } from '../fixtures/ha-setup';

const MONITORED_SLUG = 'irrigation_monitored';
const TANKS_SLUG = 'irrigation_tanks';
const TANK_1 = `input_number.e2e_${TANKS_SLUG}_irrigation_tank_1`;
const TANK_2 = `input_number.e2e_${TANKS_SLUG}_irrigation_tank_2`;

type OverviewPayload = Record<string, any>;

function entityId(slug: string, suffix: string, domain = 'input_number'): string {
  return `${domain}.e2e_${slug}_${suffix}`;
}

async function getState(page: Page, id: string): Promise<Record<string, any>> {
  const baseURL = process.env.HA_BASE_URL || 'http://localhost:8123';
  const token = process.env.HA_ACCESS_TOKEN;
  const response = await page.request.get(`${baseURL}/api/states/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  expect(response.ok(), `Home Assistant state ${id} should exist`).toBe(true);
  return response.json();
}

async function getOverview(page: Page, slug: string): Promise<OverviewPayload> {
  const { GrowspaceAPIResponseSchema } = await import('../../../src/slices/growspace/schema');
  const state = await getState(page, `sensor.e2e_${slug}_overview`);
  return GrowspaceAPIResponseSchema.parse(state.attributes);
}

async function refreshOverview(page: Page, slug: string): Promise<void> {
  await callHAService(page, 'homeassistant', 'update_entity', {
    entity_id: `sensor.e2e_${slug}_overview`,
  });
}

async function setNumber(page: Page, id: string, value: number): Promise<void> {
  await callHAService(page, 'input_number', 'set_value', { entity_id: id, value });
}

async function primeTankTrackers(page: Page): Promise<void> {
  for (const value of [79, 81, 80]) {
    await Promise.all([setNumber(page, TANK_1, value), setNumber(page, TANK_2, value)]);
    await Promise.all([
      waitForState(page, TANK_1, (state) => Number(state.state) === value),
      waitForState(page, TANK_2, (state) => Number(state.state) === value),
    ]);
  }
  await page.waitForTimeout(250);
}

async function waitForState(
  page: Page,
  id: string,
  predicate: (state: Record<string, any>) => boolean,
  timeout = 15_000
): Promise<Record<string, any>> {
  const deadline = Date.now() + timeout;
  let state = await getState(page, id);
  while (!predicate(state) && Date.now() < deadline) {
    await page.waitForTimeout(250);
    state = await getState(page, id);
  }
  expect(predicate(state), `Timed out waiting for ${id}; last state was ${state.state}`).toBe(true);
  return state;
}

async function waitForOverview(
  page: Page,
  slug: string,
  predicate: (payload: OverviewPayload) => boolean,
  timeout = 20_000
): Promise<OverviewPayload> {
  const deadline = Date.now() + timeout;
  await refreshOverview(page, slug);
  let payload = await getOverview(page, slug);
  while (!predicate(payload) && Date.now() < deadline) {
    await page.waitForTimeout(500);
    await refreshOverview(page, slug);
    payload = await getOverview(page, slug);
  }
  expect(predicate(payload), `Timed out waiting for the ${slug} overview payload`).toBe(true);
  return payload;
}

async function cardCapabilities(payload: OverviewPayload) {
  const [{ atom }, { GrowspaceAdapter }, { createDialogCapabilities }] = await Promise.all([
    import('nanostores'),
    import('../../../src/adapters/growspace-adapter'),
    import('../../../src/features/irrigation/viewmodels/dialog-capabilities'),
  ]);
  const device = GrowspaceAdapter.transformGrowspace(null, payload as any);
  expect(device).not.toBeNull();
  return createDialogCapabilities(atom(device ?? undefined), atom(new Map())).get();
}

test.describe('Irrigation hardware capability profiles', () => {
  test.beforeEach(async ({ page, testContext }) => {
    expect(testContext.irrigationMonitoredGrowspaceId).not.toBe('');
    expect(testContext.irrigationTanksGrowspaceId).not.toBe('');

    await Promise.all([
      callHAService(page, 'switch', 'turn_off', {
        entity_id: `switch.sim_e2e_${MONITORED_SLUG}_irrigation_pump`,
      }),
      callHAService(page, 'switch', 'turn_off', {
        entity_id: `switch.sim_e2e_${MONITORED_SLUG}_drain_pump`,
      }),
      setNumber(page, entityId(MONITORED_SLUG, 'irrigation_flow'), 0),
      setNumber(page, entityId(MONITORED_SLUG, 'drain_volume'), 0),
      setNumber(page, TANK_1, 80),
      setNumber(page, TANK_2, 80),
    ]);
  });

  test('flow/drain readings and both monitored pumps remain independently controllable', async ({
    page,
  }) => {
    const irrigationPump = `switch.sim_e2e_${MONITORED_SLUG}_irrigation_pump`;
    const drainPump = `switch.sim_e2e_${MONITORED_SLUG}_drain_pump`;
    const flow = entityId(MONITORED_SLUG, 'irrigation_flow');
    const drain = entityId(MONITORED_SLUG, 'drain_volume');

    await callHAService(page, 'switch', 'turn_on', { entity_id: irrigationPump });
    await waitForState(page, irrigationPump, (state) => state.state === 'on');
    await expect.poll(async () => (await getState(page, drainPump)).state).toBe('off');

    await callHAService(page, 'switch', 'turn_on', { entity_id: drainPump });
    await waitForState(page, drainPump, (state) => state.state === 'on');

    await Promise.all([setNumber(page, flow, 1.75), setNumber(page, drain, 4.2)]);
    await waitForState(page, flow, (state) => Number(state.state) === 1.75);
    await waitForState(page, drain, (state) => Number(state.state) === 4.2);
    await page.waitForTimeout(1_000);
    expect(Number((await getState(page, flow)).state)).toBe(1.75);
    expect(Number((await getState(page, drain)).state)).toBe(4.2);
  });

  test('live payloads select measured and tank-derived hardware shapes', async ({ page }) => {
    const monitored = await getOverview(page, MONITORED_SLUG);
    expect(monitored.environment.irrigation_flow_sensors).toEqual([
      entityId(MONITORED_SLUG, 'irrigation_flow'),
    ]);
    expect(monitored.environment.drain_volume_sensors).toEqual([
      entityId(MONITORED_SLUG, 'drain_volume'),
    ]);
    expect(monitored.environment.irrigation_tanks).toEqual([]);

    const tankDerived = await getOverview(page, TANKS_SLUG);
    expect(tankDerived.environment.irrigation_flow_sensors).toEqual([]);
    expect(tankDerived.environment.drain_volume_sensors).toEqual([]);
    expect(tankDerived.environment.irrigation_tanks).toHaveLength(2);
    expect(tankDerived.environment.irrigation_tanks.map((tank: any) => tank.sensor_entity)).toEqual(
      [TANK_1, TANK_2]
    );
  });

  test('multi-tank consumption aggregates and low-level warnings are independent', async ({
    page,
  }) => {
    test.setTimeout(30_000);
    await primeTankTrackers(page);
    const ready = await waitForOverview(
      page,
      TANKS_SLUG,
      (payload) =>
        payload.environment.irrigation_tanks.length === 2 &&
        payload.environment.irrigation_tanks.every((tank: any) => tank.fill_level === 80)
    );
    const baseline = ready.irrigation.water_usage?.liters_today ?? 0;

    await Promise.all([setNumber(page, TANK_1, 20), setNumber(page, TANK_2, 60)]);
    const warned = await waitForOverview(
      page,
      TANKS_SLUG,
      (payload) =>
        (payload.irrigation.water_usage?.liters_today ?? 0) >= baseline + 40 &&
        payload.environment.irrigation_tanks.some(
          (tank: any) => tank.sensor_entity === TANK_1 && tank.is_warning === true
        )
    );
    expect(warned.irrigation.water_usage?.liters_today).toBeCloseTo(baseline + 40, 1);
    const tanks = warned.environment.irrigation_tanks as any[];
    expect(tanks.find((tank) => tank.sensor_entity === TANK_1)?.is_warning).toBe(true);
    expect(tanks.find((tank) => tank.sensor_entity === TANK_2)?.is_warning).toBe(false);
  });

  test('the card derives pump, tank, and Crop Steering capabilities from live payloads', async ({
    page,
    testContext,
  }) => {
    const monitored = await cardCapabilities(await getOverview(page, MONITORED_SLUG));
    expect(monitored).toMatchObject({
      hasPump: true,
      hasTank: false,
      hasStrategy: false,
      cropSteeringGroupVisible: false,
    });

    const tanks = await cardCapabilities(await getOverview(page, TANKS_SLUG));
    expect(tanks).toMatchObject({
      hasPump: true,
      hasTank: true,
      hasStrategy: false,
      cropSteeringGroupVisible: false,
    });

    await callHAService(page, 'growspace_manager', 'set_irrigation_strategy', {
      growspace_id: testContext.vwcVegGrowspaceId,
      enabled: true,
      lights_on_time: '06:00:00',
      target_vwc_percent: 65,
      maintenance_dryback_percent: 3,
      p0_duration_minutes: 60,
      p2_stop_before_lights_off_minutes: 120,
      shot_duration_seconds: 10,
      shot_interval_minutes: 15,
    });
    await setNumber(page, 'input_number.e2e_vwc_veg_irrigation_tank', 80);
    const vwcPayload = await waitForOverview(
      page,
      'vwc_veg',
      (payload) => payload.irrigation.irrigation_strategy?.enabled === true
    );
    const vwc = await cardCapabilities(vwcPayload);
    expect(vwc).toMatchObject({
      hasPump: true,
      hasTank: true,
      hasStrategy: true,
      cropSteeringGroupVisible: true,
    });
  });
});
