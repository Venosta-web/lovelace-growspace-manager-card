import type { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { haTest as test, expect, callHAService } from '../fixtures/ha-setup';
import { GrowspaceCard } from '../pages/GrowspaceCard';

/**
 * The multi-sensor environmental telemetry profile.
 *
 * The entities, their Home Assistant metadata and the backing input each
 * mirrored sensor reads all come from the generated coverage manifest, so this
 * spec asserts against the contract rather than restating it. Regenerate with
 * growspace_manager_workspace/scripts/gen-e2e-sensors.
 */
interface CoverageEntity {
  entity_id: string;
  role: string;
  profile: string;
  slug: string;
  domain: string;
  behavior: string;
  unit_of_measurement?: string;
  device_class?: string | null;
  state_class?: string;
  backing_entity_id?: string;
}

interface CoverageManifest {
  profiles: Array<{
    profile: string;
    slug: string;
    services: { configure_environment?: Record<string, unknown> };
  }>;
  entities: CoverageEntity[];
}

const SLUG = 'telemetry_multi';
const COVERAGE = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '..', 'fixtures', 'e2e-entity-coverage.generated.json'),
    'utf-8'
  )
) as CoverageManifest;

const CONFIGURED = COVERAGE.profiles.find((p) => p.profile === SLUG)!.services
  .configure_environment!;
const ENTITIES = COVERAGE.entities.filter((e) => e.profile === SLUG);
const MIRRORS = ENTITIES.filter((e) => e.backing_entity_id !== undefined);
const GATE = ENTITIES.find((e) => e.role === 'simulation.manual_telemetry')!.entity_id;

/** Entity IDs configured for one `configure_environment` field. */
function configured(field: string): string[] {
  const value = CONFIGURED[field];
  return Array.isArray(value) ? (value as string[]) : [value as string];
}

/** The writable input behind a mirrored sensor. */
function backing(sensorEntityId: string): string {
  return MIRRORS.find((e) => e.entity_id === sensorEntityId)!.backing_entity_id!;
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

/** Drive a mirrored sensor by writing the input it reads, and wait for it. */
async function drive(page: Page, sensorEntityId: string, value: number): Promise<void> {
  await callHAService(page, 'input_number', 'set_value', {
    entity_id: backing(sensorEntityId),
    value,
  });
  await expect
    .poll(async () => Number((await getState(page, sensorEntityId)).state), { timeout: 15_000 })
    .toBe(value);
}

async function getObservations(page: Page): Promise<Record<string, any>> {
  await callHAService(page, 'homeassistant', 'update_entity', {
    entity_id: `binary_sensor.e2e_${SLUG}_optimal_conditions`,
  });
  const state = await getState(page, `binary_sensor.e2e_${SLUG}_optimal_conditions`);
  return state.attributes.observations;
}

async function getEnvironment(page: Page): Promise<Record<string, any>> {
  const { GrowspaceAPIResponseSchema } = await import('../../../src/slices/growspace/schema');
  await callHAService(page, 'homeassistant', 'update_entity', {
    entity_id: `sensor.e2e_${SLUG}_overview`,
  });
  const state = await getState(page, `sensor.e2e_${SLUG}_overview`);
  return GrowspaceAPIResponseSchema.parse(state.attributes).environment;
}

/**
 * Run the card's own aggregation core over the live payload and live states,
 * exactly as the card does when Home Assistant pushes an update.
 */
async function cardEnvSnapshot(page: Page): Promise<Record<string, any>> {
  const [{ GrowspaceAdapter }, { computeEnvSnapshot }] = await Promise.all([
    import('../../../src/adapters/growspace-adapter'),
    import('../../../src/slices/environment'),
  ]);
  const baseURL = process.env.HA_BASE_URL || 'http://localhost:8123';
  const token = process.env.HA_ACCESS_TOKEN;
  const response = await page.request.get(`${baseURL}/api/states`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const states = (await response.json()) as Array<{ entity_id: string }>;
  const hassStates = Object.fromEntries(states.map((s) => [s.entity_id, s]));

  const overview = hassStates[`sensor.e2e_${SLUG}_overview`] as any;
  const device = GrowspaceAdapter.transformGrowspace(
    `sensor.e2e_${SLUG}_overview`,
    overview.attributes
  );
  expect(device).not.toBeNull();
  return computeEnvSnapshot(device as any, hassStates as any) as unknown as Record<string, any>;
}

test.describe('Multi-sensor environmental telemetry', () => {
  test.beforeEach(async ({ page, testContext }) => {
    expect(testContext.telemetryMultiGrowspaceId).not.toBe('');
    // Pin every mirrored sensor to its backing input. Left alone the profile
    // free-runs so the dashboard keeps moving; a test that wants a known
    // reading has to stop the waveform first.
    await callHAService(page, 'input_boolean', 'turn_on', { entity_id: GATE });
  });

  test.afterEach(async ({ page }) => {
    await callHAService(page, 'input_boolean', 'turn_off', { entity_id: GATE });
  });

  test('every configured sensor is a recordable entity with the contract metadata', async ({
    page,
  }) => {
    const declared = new Map(MIRRORS.map((entity) => [entity.entity_id, entity]));

    for (const field of Object.keys(CONFIGURED)) {
      for (const entityId of configured(field)) {
        const entity = declared.get(entityId);
        expect(
          entity,
          `${field} references ${entityId}, which the contract does not declare`
        ).toBeDefined();

        const live = await getState(page, entityId);
        expect(live.entity_id.split('.')[0]).toBe('sensor');
        expect(live.attributes.unit_of_measurement).toBe(entity!.unit_of_measurement);
        expect(live.attributes.device_class ?? null).toBe(entity!.device_class ?? null);
        expect(live.attributes.state_class).toBe(entity!.state_class);
        expect(Number.isNaN(Number(live.state))).toBe(false);
      }
    }
  });

  test('the free-running profile keeps moving until a test pins it', async ({ page }) => {
    test.setTimeout(120_000); // deliberately outlasts the 30 s simulation tick
    const sensor = configured('temperature_sensors')[0];

    await drive(page, sensor, 21.5);
    await page.waitForTimeout(31_000); // one full time_pattern tick
    expect(Number((await getState(page, sensor)).state)).toBe(21.5);

    await callHAService(page, 'input_boolean', 'turn_off', { entity_id: GATE });
    await expect
      .poll(async () => Number((await getState(page, sensor)).state), { timeout: 45_000 })
      .not.toBe(21.5);
  });

  test.describe('an aggregated category', () => {
    test('is averaged across every sensor in the backend payload', async ({ page }) => {
      const [first, second] = configured('temperature_sensors');
      expect(second).toBeDefined();

      await drive(page, first, 20);
      await drive(page, second, 30);

      const environment = await getEnvironment(page);
      expect(environment.temperature_sensors).toEqual([first, second]);

      await expect
        .poll(async () => (await getObservations(page)).temperature, { timeout: 30_000 })
        .toBeCloseTo(25, 5);

      // Moving one sensor moves the aggregate by half as much: the whole
      // category is read, not just the sensor the singular shadow points at.
      await drive(page, second, 40);
      await expect
        .poll(async () => (await getObservations(page)).temperature, { timeout: 30_000 })
        .toBeCloseTo(30, 5);
    });

    test('is averaged across every sensor by the card', async ({ page }) => {
      const [first, second] = configured('substrate_temperature_sensors');
      expect(second).toBeDefined();

      await drive(page, first, 18);
      await drive(page, second, 22);

      const snapshot = await cardEnvSnapshot(page);
      expect(snapshot.substrateTemperature.entityIds).toEqual([first, second]);
      expect(snapshot.substrateTemperature.perSensor).toEqual([18, 22]);
      expect(snapshot.substrateTemperature.avg).toBeCloseTo(20, 5);
    });

    test('shows every reading on the rendered card, and follows a change', async ({
      page,
      testContext,
    }) => {
      test.setTimeout(120_000);
      const [first, second] = configured('substrate_temperature_sensors');
      await drive(page, first, 18);
      await drive(page, second, 22);

      const card = new GrowspaceCard(page);
      await card.navigate(testContext.telemetryMultiDashboardPath);
      await card.waitForCardReady();

      // Several chips describe the substrate; the accessible label is the one
      // thing unique to this metric's chip.
      const subTemp = page.getByRole('button', { name: 'Toggle Sub Temp graph' });

      await expect
        .poll(async () => (await subTemp.innerText()).replace(/\s+/g, ' '), { timeout: 30_000 })
        .toBe('Sub Temp: 18.0°C 22.0°C');

      await drive(page, second, 26);
      await expect
        .poll(async () => (await subTemp.innerText()).replace(/\s+/g, ' '), { timeout: 30_000 })
        .toBe('Sub Temp: 18.0°C 26.0°C');
    });
  });

  test('a rerun of setup replaces the sensor lists instead of growing them', async ({
    page,
    testContext,
  }) => {
    const before = await getEnvironment(page);

    // Exactly what fixtures/e2e-setup.ts sends, twice more.
    for (let run = 0; run < 2; run++) {
      await callHAService(page, 'growspace_manager', 'configure_environment', {
        growspace_id: testContext.telemetryMultiGrowspaceId,
        ...CONFIGURED,
      });
    }

    const after = await getEnvironment(page);
    for (const field of Object.keys(CONFIGURED)) {
      expect(after[field], field).toEqual(before[field]);
      expect(after[field], field).toEqual(CONFIGURED[field]);
    }

    // The singular shadows are re-derived from the head of their list, so a
    // value left over from an earlier configuration can never come back and
    // contribute a phantom reading to the aggregate.
    for (const [shadow, list] of [
      ['temperature_sensor', 'temperature_sensors'],
      ['humidity_sensor', 'humidity_sensors'],
      ['vpd_sensor', 'vpd_sensors'],
    ]) {
      expect(after[shadow], shadow).toBe(configured(list)[0]);
    }
  });
});
