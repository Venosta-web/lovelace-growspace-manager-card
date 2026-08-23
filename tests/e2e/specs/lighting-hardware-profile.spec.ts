import type { Page } from '@playwright/test';
import { haTest as test, expect, callHAService } from '../fixtures/ha-setup';

const SLUG = 'lighting';
const OVERVIEW = `sensor.e2e_${SLUG}_overview`;
const LIGHT_SENSOR = `binary_sensor.e2e_${SLUG}_light_state`;
const SWITCH = `switch.e2e_${SLUG}_growlight_switch`;
const DIMMABLE = `light.e2e_${SLUG}_growlight_dimmable`;
const MANUAL_ANCHOR = '04:15:00';
const CONTROLLER_POWER = 65;

type HAState = {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
};
type OverviewPayload = Record<string, any>;

async function getState(page: Page, entityId: string): Promise<HAState> {
  const baseURL = process.env.HA_BASE_URL || 'http://localhost:8123';
  const token = process.env.HA_ACCESS_TOKEN;
  const response = await page.request.get(`${baseURL}/api/states/${entityId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  expect(response.ok(), `Home Assistant state ${entityId} should exist`).toBe(true);
  return response.json();
}

async function getOverview(page: Page): Promise<OverviewPayload> {
  const { GrowspaceAPIResponseSchema } = await import('../../../src/slices/growspace/schema');
  return GrowspaceAPIResponseSchema.parse((await getState(page, OVERVIEW)).attributes);
}

async function refreshOverview(page: Page): Promise<void> {
  await callHAService(page, 'homeassistant', 'update_entity', { entity_id: OVERVIEW });
}

async function waitForState(
  page: Page,
  entityId: string,
  predicate: (state: HAState) => boolean,
  timeout = 20_000
): Promise<HAState> {
  const deadline = Date.now() + timeout;
  let state = await getState(page, entityId);
  while (!predicate(state) && Date.now() < deadline) {
    await page.waitForTimeout(250);
    state = await getState(page, entityId);
  }
  expect(predicate(state), `Timed out waiting for ${entityId}; last state was ${state.state}`).toBe(
    true
  );
  return state;
}

async function waitForOverview(
  page: Page,
  predicate: (payload: OverviewPayload) => boolean,
  timeout = 20_000
): Promise<OverviewPayload> {
  const deadline = Date.now() + timeout;
  await refreshOverview(page);
  let payload = await getOverview(page);
  while (!predicate(payload) && Date.now() < deadline) {
    await page.waitForTimeout(500);
    await refreshOverview(page);
    payload = await getOverview(page);
  }
  expect(predicate(payload), 'Timed out waiting for the lighting overview payload').toBe(true);
  return payload;
}

async function configureController(
  page: Page,
  growspaceId: string,
  enabled: boolean
): Promise<void> {
  await callHAService(page, 'growspace_manager', 'configure_environment', {
    growspace_id: growspaceId,
    light_sensors: [LIGHT_SENSOR],
    growlight_entities: [SWITCH, DIMMABLE],
    growlight_config: {
      enabled,
      power: CONTROLLER_POWER,
      sunrise_enabled: false,
      sunrise_minutes: 0,
    },
  });
}

async function configureTracking(
  page: Page,
  growspaceId: string,
  lightsOnTime: string
): Promise<void> {
  await callHAService(page, 'growspace_manager', 'set_irrigation_strategy', {
    growspace_id: growspaceId,
    enabled: true,
    auto_light_tracking: true,
    lights_on_time: lightsOnTime,
  });
}

async function localHAClock(page: Page, offsetHours: number): Promise<string> {
  const baseURL = process.env.HA_BASE_URL || 'http://localhost:8123';
  const token = process.env.HA_ACCESS_TOKEN;
  const response = await page.request.get(`${baseURL}/api/config`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  expect(response.ok(), 'Home Assistant config should expose its time zone').toBe(true);
  const config = (await response.json()) as { time_zone: string };
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: config.time_zone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(Date.now() + offsetHours * 60 * 60 * 1000));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? '00';
  return `${part('hour')}:${part('minute')}:${part('second')}`;
}

async function cardLightingProjection(page: Page, payload: OverviewPayload) {
  const [{ GrowspaceAdapter }, { computeDeviceSnapshot }, { computeEnvSnapshot }, header] =
    await Promise.all([
      import('../../../src/adapters/growspace-adapter'),
      import('../../../src/slices/device-state'),
      import('../../../src/slices/environment'),
      import('../../../src/slices/header-metrics'),
    ]);
  const device = GrowspaceAdapter.transformGrowspace(null, payload as any);
  expect(device).not.toBeNull();

  const states = await Promise.all(
    [OVERVIEW, LIGHT_SENSOR, SWITCH, DIMMABLE].map((id) => getState(page, id))
  );
  const hassStates = Object.fromEntries(states.map((state) => [state.entity_id, state]));
  const snapshot = computeDeviceSnapshot(device!, hassStates as any);
  const environment = computeEnvSnapshot(device!, hassStates as any);
  const metrics = header.computeHeaderMetrics(
    environment,
    [],
    null,
    [],
    'main',
    new Set(),
    [],
    null,
    snapshot
  );
  return {
    snapshot,
    chip: metrics.deviceChips.find((chip) => chip.key === 'light'),
  };
}

test.describe('Lighting hardware capability profile', () => {
  test.beforeEach(async ({ page, testContext }) => {
    expect(testContext.lightingGrowspaceId).not.toBe('');
    await configureController(page, testContext.lightingGrowspaceId, false);
    await configureTracking(page, testContext.lightingGrowspaceId, MANUAL_ANCHOR);
    await Promise.all([
      callHAService(page, 'switch', 'turn_off', { entity_id: SWITCH }),
      callHAService(page, 'light', 'turn_off', { entity_id: DIMMABLE }),
    ]);
    await waitForState(page, LIGHT_SENSOR, (state) => state.state === 'off');
  });

  test('an off-to-on sensor transition records detection without replacing the grower anchor', async ({
    page,
  }) => {
    const previousDetected = (await getOverview(page)).irrigation.irrigation_strategy
      ?.detected_lights_on_time;
    if (previousDetected) await page.waitForTimeout(1_100);
    await callHAService(page, 'switch', 'turn_on', { entity_id: SWITCH });
    await waitForState(page, LIGHT_SENSOR, (state) => state.state === 'on');

    const payload = await waitForOverview(page, (overview) => {
      const detected = overview.irrigation.irrigation_strategy?.detected_lights_on_time;
      return detected != null && detected !== previousDetected;
    });
    expect(payload.irrigation.irrigation_strategy.lights_on_time).toBe(MANUAL_ANCHOR);
    expect(payload.irrigation.irrigation_strategy.detected_lights_on_time).toMatch(
      /^\d{2}:\d{2}:\d{2}$/
    );
    expect((await getState(page, DIMMABLE)).state).toBe('off');
  });

  test('the controller drives switch state, dimmable power, and card status consistently', async ({
    page,
    testContext,
  }) => {
    test.setTimeout(60_000);
    const insidePhotoperiod = await localHAClock(page, -1);
    await configureTracking(page, testContext.lightingGrowspaceId, insidePhotoperiod);
    await configureController(page, testContext.lightingGrowspaceId, true);

    await waitForState(page, SWITCH, (state) => state.state === 'on');
    const lit = await waitForState(
      page,
      DIMMABLE,
      (state) =>
        state.state === 'on' &&
        Math.round((Number(state.attributes.brightness) / 255) * 100) === CONTROLLER_POWER
    );
    expect(Math.round((Number(lit.attributes.brightness) / 255) * 100)).toBe(CONTROLLER_POWER);
    await waitForState(page, LIGHT_SENSOR, (state) => state.state === 'on');

    await refreshOverview(page);
    const onPayload = await getOverview(page);
    const onCard = await cardLightingProjection(page, onPayload);
    expect(onCard.snapshot.lightSensors?.multiValues).toEqual(['On', 'On', '65%']);
    expect(onCard.chip?.value).toBe('On');

    const outsidePhotoperiod = await localHAClock(page, 6);
    await configureTracking(page, testContext.lightingGrowspaceId, outsidePhotoperiod);
    await waitForState(page, SWITCH, (state) => state.state === 'off');
    await waitForState(page, DIMMABLE, (state) => state.state === 'off');
    await waitForState(page, LIGHT_SENSOR, (state) => state.state === 'off');

    await refreshOverview(page);
    const offPayload = await getOverview(page);
    const offCard = await cardLightingProjection(page, offPayload);
    expect(offCard.snapshot.lightSensors?.multiValues).toEqual(['Off', 'Off', '0%']);
    expect(offCard.chip?.value).toBe('Off');
  });
});
