import type { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { haTest as test, expect, callHAService } from '../fixtures/ha-setup';

type HAState = {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
};

interface CoverageManifest {
  global_settings: {
    lung_room_temp_sensor: string;
    lung_room_humidity_sensor: string;
    weather_entity: string;
  };
  profiles: Array<{
    profile: string;
    services: { configure_environment?: Record<string, unknown> };
  }>;
}

const COVERAGE = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '..', 'fixtures', 'e2e-entity-coverage.generated.json'),
    'utf-8'
  )
) as CoverageManifest;
const CLIMATE = COVERAGE.profiles.find((profile) => profile.profile === 'climate_plain')!.services
  .configure_environment!;
const TEMPERATURE = (CLIMATE.temperature_sensors as string[])[0];
const HUMIDITY = (CLIMATE.humidity_sensors as string[])[0];
const VPD = (CLIMATE.vpd_sensors as string[])[0];
const EXHAUST = CLIMATE.exhaust_fan_entities as string[];
const LUNG_TEMPERATURE = COVERAGE.global_settings.lung_room_temp_sensor;
const LUNG_HUMIDITY = COVERAGE.global_settings.lung_room_humidity_sensor;
const WEATHER = COVERAGE.global_settings.weather_entity;
const AIR_EXCHANGE = 'sensor.e2e_climate_plain_air_exchange';
const STRESS = 'binary_sensor.e2e_climate_plain_stress';

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

async function setConditions(
  page: Page,
  values: {
    tentTemperature: number;
    tentHumidity: number;
    tentVpd: number;
    lungTemperature: number;
    lungHumidity: number;
  }
): Promise<void> {
  await Promise.all([
    setNumber(page, TEMPERATURE, values.tentTemperature),
    setNumber(page, HUMIDITY, values.tentHumidity),
    setNumber(page, VPD, values.tentVpd),
    setNumber(page, LUNG_TEMPERATURE, values.lungTemperature),
    setNumber(page, LUNG_HUMIDITY, values.lungHumidity),
  ]);
}

async function waitForState(
  page: Page,
  entityId: string,
  predicate: (state: HAState) => boolean,
  timeout = 90_000
): Promise<HAState> {
  await expect
    .poll(async () => predicate(await getState(page, entityId)), {
      timeout,
      message: `Timed out waiting for ${entityId}`,
    })
    .toBe(true);
  return getState(page, entityId);
}

async function refreshRecommendations(page: Page, growspaceId: string): Promise<void> {
  await waitForState(page, STRESS, (state) => state.state === 'on');
  // Recommendations are coordinator-derived. Restating the already-owned
  // temperature sensor requests a deterministic refresh without changing config.
  await callHAService(page, 'growspace_manager', 'configure_environment', {
    growspace_id: growspaceId,
    temperature_sensors: [TEMPERATURE],
  });
}

async function expectExhaust(page: Page, expected: 'min' | 'max'): Promise<void> {
  const predicates =
    expected === 'max'
      ? [
          (state: HAState) => state.state === 'on' && state.attributes.percentage === 80,
          (state: HAState) => Number(state.state) === 8,
          (state: HAState) => state.state === 'on',
        ]
      : [
          (state: HAState) => state.state === 'on' && state.attributes.percentage === 20,
          (state: HAState) => Number(state.state) === 2,
          (state: HAState) => state.state === 'off',
        ];
  await Promise.all(
    EXHAUST.map((entityId, index) => waitForState(page, entityId, predicates[index]))
  );
}

test.describe('Source-air and outdoor-condition simulation', () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page, testContext }) => {
    expect(testContext.climatePlainGrowspaceId).not.toBe('');
    await callHAService(page, 'script', 'e2e_reset_source_air', {});
    await Promise.all([
      setNumber(page, TEMPERATURE, 24),
      setNumber(page, HUMIDITY, 55),
      setNumber(page, VPD, 1.1),
    ]);
  });

  test.afterEach(async ({ page }) => {
    await callHAService(page, 'script', 'e2e_reset_source_air', {});
    await Promise.all([
      setNumber(page, TEMPERATURE, 24),
      setNumber(page, HUMIDITY, 55),
      setNumber(page, VPD, 1.1),
    ]);
  });

  test('exposes writable lung-room inputs and fixed offline weather attributes', async ({
    page,
  }) => {
    const [temperature, humidity, weather] = await Promise.all([
      getState(page, LUNG_TEMPERATURE),
      getState(page, LUNG_HUMIDITY),
      getState(page, WEATHER),
    ]);

    expect(Number(temperature.state)).toBe(24);
    expect(Number(humidity.state)).toBe(60);
    expect(weather.state).toBe('cloudy');
    expect(weather.attributes.temperature).toBe(12);
    expect(weather.attributes.humidity).toBe(85);
  });

  test('helpful source air drives exhaust and becomes the recommendation', async ({
    page,
    testContext,
  }) => {
    await setConditions(page, {
      tentTemperature: 30,
      tentHumidity: 30,
      tentVpd: 2,
      lungTemperature: 22,
      lungHumidity: 55,
    });

    await refreshRecommendations(page, testContext.climatePlainGrowspaceId);
    await expectExhaust(page, 'max');
    await waitForState(page, AIR_EXCHANGE, (state) => state.state === 'Ventilate Lung Room');
  });

  test('unhelpful source air gates exhaust and leaves the recommendation idle', async ({
    page,
    testContext,
  }) => {
    await setConditions(page, {
      tentTemperature: 30,
      tentHumidity: 30,
      tentVpd: 2,
      lungTemperature: 30,
      lungHumidity: 30,
    });

    await refreshRecommendations(page, testContext.climatePlainGrowspaceId);
    await expectExhaust(page, 'min');
    await waitForState(page, AIR_EXCHANGE, (state) => state.state === 'Idle');
  });

  test('source air below the minimum is rejected by demand and recommendations', async ({
    page,
    testContext,
  }) => {
    await setConditions(page, {
      tentTemperature: 30,
      tentHumidity: 30,
      tentVpd: 2,
      lungTemperature: 15,
      lungHumidity: 55,
    });

    await refreshRecommendations(page, testContext.climatePlainGrowspaceId);
    await expectExhaust(page, 'min');
    await waitForState(page, AIR_EXCHANGE, (state) => state.state === 'Idle');
  });

  test('critical high temperature bypasses an unhelpful source-air gate', async ({ page }) => {
    await setConditions(page, {
      tentTemperature: 35,
      tentHumidity: 50,
      tentVpd: 2,
      lungTemperature: 35,
      lungHumidity: 95,
    });

    await expectExhaust(page, 'max');
  });
});
