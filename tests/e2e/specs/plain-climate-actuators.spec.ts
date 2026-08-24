import type { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { haTest as test, expect, callHAService } from '../fixtures/ha-setup';

interface CoverageManifest {
  profiles: Array<{
    profile: string;
    services: { configure_environment?: Record<string, unknown> };
  }>;
}

type HAState = {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
};

const SLUG = 'climate_plain';
const OVERVIEW = `sensor.e2e_${SLUG}_overview`;
const COVERAGE = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '..', 'fixtures', 'e2e-entity-coverage.generated.json'),
    'utf-8'
  )
) as CoverageManifest;
const ENVIRONMENT = COVERAGE.profiles.find((profile) => profile.profile === SLUG)!.services
  .configure_environment!;

function configured(field: string): string[] {
  return ENVIRONMENT[field] as string[];
}

const CIRCULATION = configured('circulation_fan_entities');
const EXHAUST = configured('exhaust_fan_entities');
const HUMIDIFIERS = configured('humidifier_entities');
const DEHUMIDIFIERS = configured('dehumidifier_entities');
const TEMPERATURE = configured('temperature_sensors')[0];
const HUMIDITY = configured('humidity_sensors')[0];
const VPD = configured('vpd_sensors')[0];

async function getState(page: Page, entityId: string): Promise<HAState> {
  const baseURL = process.env.HA_BASE_URL || 'http://localhost:8123';
  const token = process.env.HA_ACCESS_TOKEN;
  const response = await page.request.get(`${baseURL}/api/states/${entityId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  expect(response.ok(), `Home Assistant state ${entityId} should exist`).toBe(true);
  return response.json();
}

async function setNumber(page: Page, entityId: string, value: number): Promise<void> {
  await callHAService(page, 'input_number', 'set_value', { entity_id: entityId, value });
}

async function waitForState(
  page: Page,
  entityId: string,
  predicate: (state: HAState) => boolean,
  timeout = 30_000
): Promise<HAState> {
  await expect
    .poll(async () => predicate(await getState(page, entityId)), {
      timeout,
      message: `Timed out waiting for ${entityId}`,
    })
    .toBe(true);
  return getState(page, entityId);
}

async function turnOff(page: Page, entityId: string): Promise<void> {
  const domain = entityId.split('.')[0];
  if (domain === 'input_number') {
    await setNumber(page, entityId, 0);
    return;
  }
  await callHAService(page, domain, 'turn_off', { entity_id: entityId });
}

async function getOverview(page: Page): Promise<Record<string, any>> {
  const { GrowspaceAPIResponseSchema } = await import('../../../src/slices/growspace/schema');
  await callHAService(page, 'homeassistant', 'update_entity', { entity_id: OVERVIEW });
  return GrowspaceAPIResponseSchema.parse((await getState(page, OVERVIEW)).attributes);
}

async function cardProjection(page: Page): Promise<{
  snapshot: Record<string, any>;
  fanModes: Array<{
    display: string | undefined;
    axis: { min: number; max: number };
    value?: number;
  }>;
}> {
  const [{ GrowspaceAdapter }, deviceState] = await Promise.all([
    import('../../../src/adapters/growspace-adapter'),
    import('../../../src/slices/device-state'),
  ]);
  const payload = await getOverview(page);
  const device = GrowspaceAdapter.transformGrowspace(null, payload as any);
  expect(device).not.toBeNull();

  const states = await Promise.all(
    [...CIRCULATION, ...EXHAUST, ...HUMIDIFIERS, ...DEHUMIDIFIERS].map((entityId) =>
      getState(page, entityId)
    )
  );
  const hassStates = Object.fromEntries(states.map((state) => [state.entity_id, state]));
  const snapshot = deviceState.computeDeviceSnapshot(device!, hassStates as any);
  const fanModes = CIRCULATION.map((entityId) => {
    const reading = deviceState.classifyFanEntity(entityId, hassStates[entityId]);
    return {
      display: deviceState.fanReadingToChipDisplay(reading),
      axis: deviceState.fanReadingToAxisScale(reading.kind),
      value: deviceState.fanReadingToNormalizedValue(reading),
    };
  });
  return { snapshot: snapshot as unknown as Record<string, any>, fanModes };
}

test.describe('Plain Home Assistant climate actuators', () => {
  test.beforeEach(async ({ page, testContext }) => {
    expect(testContext.climatePlainGrowspaceId).not.toBe('');
    await Promise.all([
      setNumber(page, TEMPERATURE, 24),
      setNumber(page, HUMIDITY, 55),
      setNumber(page, VPD, 1.1),
      ...[...CIRCULATION, ...EXHAUST, ...HUMIDIFIERS, ...DEHUMIDIFIERS].map((entityId) =>
        turnOff(page, entityId)
      ),
    ]);
  });

  test('the live payload uses canonical plural arrays with profile-owned entities', async ({
    page,
  }) => {
    const environment = (await getOverview(page)).environment;
    expect(environment.circulation_fan_entities).toEqual(CIRCULATION);
    expect(environment.exhaust_fan_entities).toEqual(EXHAUST);
    expect(environment.humidifier_entities).toEqual(HUMIDIFIERS);
    expect(environment.dehumidifier_entities).toEqual(DEHUMIDIFIERS);

    const allActuators = [...CIRCULATION, ...EXHAUST, ...HUMIDIFIERS, ...DEHUMIDIFIERS];
    expect(new Set(allActuators).size).toBe(allActuators.length);
    expect(allActuators.every((entityId) => entityId.includes('.e2e_climate_plain_'))).toBe(true);
  });

  test('fan controllers drive percentage, numeric, and binary entities and the card scales each mode', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await Promise.all([
      setNumber(page, TEMPERATURE, 35),
      setNumber(page, HUMIDITY, 80),
      setNumber(page, VPD, 2),
    ]);

    for (const entities of [CIRCULATION, EXHAUST]) {
      const percentage = await waitForState(
        page,
        entities[0],
        (state) => state.state === 'on' && Number(state.attributes.percentage) === 80
      );
      expect(percentage.attributes.percentage).toBe(80);
      await waitForState(page, entities[1], (state) => Number(state.state) === 8);
      await waitForState(page, entities[2], (state) => state.state === 'on');
    }

    const projection = await cardProjection(page);
    expect(projection.snapshot.circulationFans.multiValues).toEqual(['80%', '8', 'On']);
    expect(projection.snapshot.exhaustFans.multiValues).toEqual(['80%', '8', 'On']);
    expect(projection.fanModes).toEqual([
      { display: '80%', axis: { min: 0, max: 100 }, value: 80 },
      { display: '8', axis: { min: 0, max: 10 }, value: 8 },
      { display: 'On', axis: { min: 0, max: 10 }, value: 1 },
    ]);
  });

  test('high VPD turns on both plain humidifier domains with stable card state', async ({
    page,
  }) => {
    await setNumber(page, VPD, 1.6);
    for (const entityId of HUMIDIFIERS) {
      await waitForState(page, entityId, (state) => state.state === 'on');
    }
    const projection = await cardProjection(page);
    expect(projection.snapshot.humidifiers.multiValues).toEqual(['On', 'On']);
  });

  test('low VPD turns on both plain dehumidifier domains with stable card state', async ({
    page,
  }) => {
    await setNumber(page, VPD, 0.5);
    for (const entityId of DEHUMIDIFIERS) {
      await waitForState(page, entityId, (state) => state.state === 'on');
    }
    const projection = await cardProjection(page);
    expect(projection.snapshot.dehumidifiers.multiValues).toEqual(['On', 'On']);
  });
});
