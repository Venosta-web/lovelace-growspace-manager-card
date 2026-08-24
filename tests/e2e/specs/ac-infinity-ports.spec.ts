import type { Locator, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { haTest as test, expect, callHAService } from '../fixtures/ha-setup';
import { ConfigDialog } from '../pages/Dialogs';
import { GrowspaceCard } from '../pages/GrowspaceCard';

interface CoverageManifest {
  profiles: Array<{
    profile: string;
    slug: string;
    services: { configure_environment?: Record<string, unknown> };
  }>;
  entities: Array<{
    entity_id: string;
    profile: string;
    platform?: string;
    translation_key?: string;
    device_key?: string;
    device_name?: string;
  }>;
}

type HAState = {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
};

const SLUG = 'ac_infinity';
const COVERAGE = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '..', 'fixtures', 'e2e-entity-coverage.generated.json'),
    'utf-8'
  )
) as CoverageManifest;
const PROFILE = COVERAGE.profiles.find((profile) => profile.profile === SLUG)!;
const ENVIRONMENT = PROFILE.services.configure_environment!;

function bundle(field: string): Record<string, string> {
  return (ENVIRONMENT[field] as Array<Record<string, string>>)[0];
}

const CIRCULATION = bundle('circulation_fan_ac_infinity_devices');
const EXHAUST = bundle('exhaust_fan_ac_infinity_devices');
const HUMIDIFIER = bundle('humidifier_ac_infinity_devices');
const DEHUMIDIFIER = bundle('dehumidifier_ac_infinity_devices');
const GROWLIGHT = bundle('growlight_ac_infinity_devices');

function configured(field: string): string {
  return (ENVIRONMENT[field] as string[])[0];
}

const TEMPERATURE = configured('temperature_sensors');
const HUMIDITY = configured('humidity_sensors');
const VPD = configured('vpd_sensors');

async function getState(page: Page, entityId: string): Promise<HAState> {
  const baseURL = process.env.HA_BASE_URL || 'http://localhost:8123';
  const token = process.env.HA_ACCESS_TOKEN;
  const response = await page.request.get(`${baseURL}/api/states/${entityId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  expect(response.ok(), `Home Assistant state ${entityId} should exist`).toBe(true);
  return response.json();
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

async function setNumber(page: Page, entityId: string, value: number): Promise<void> {
  const domain = entityId.split('.')[0];
  await callHAService(page, domain, 'set_value', { entity_id: entityId, value });
}

async function selectMode(page: Page, entityId: string, option: string): Promise<void> {
  await callHAService(page, 'select', 'select_option', { entity_id: entityId, option });
}

async function openConfig(page: Page, dashboardPath: string): Promise<ConfigDialog> {
  const card = new GrowspaceCard(page);
  await card.navigate(dashboardPath);
  await card.waitForCardReady();
  await card.card.locator('[aria-label="Settings"]').click();
  const dialog = new ConfigDialog(page);
  await dialog.waitForOpen();
  return dialog;
}

async function portDeviceId(port: Locator, label: string): Promise<string> {
  const picker = port.locator('md3-select[label="AC Infinity device"]');
  return picker.evaluate((element, wantedLabel) => {
    const options = (
      element as HTMLElement & {
        options: Array<{ label: string; value: string }>;
      }
    ).options;
    const option = options.find((candidate) => candidate.label === wantedLabel);
    if (!option) throw new Error(`No AC Infinity device option named ${wantedLabel}`);
    return option.value;
  }, label);
}

async function pickPort(port: Locator, label: string): Promise<string> {
  const picker = port.locator('md3-select[label="AC Infinity device"]');
  const deviceId = await portDeviceId(port, label);
  await picker.evaluate((element, value) => {
    element.dispatchEvent(
      new CustomEvent('change', { detail: value, bubbles: true, composed: true })
    );
  }, deviceId);
  return deviceId;
}

test.describe('Faithful AC Infinity port simulators', () => {
  test.describe.configure({ retries: 0 });

  test.beforeEach(async ({ page, testContext }) => {
    expect(testContext.acInfinityGrowspaceId).not.toBe('');
    expect(testContext.acInfinityDashboardPath).not.toBe('');
    await Promise.all([
      callHAService(page, 'growspace_manager', 'set_humidifier_control', {
        growspace_id: testContext.acInfinityGrowspaceId,
        enabled: true,
      }),
      callHAService(page, 'growspace_manager', 'set_dehumidifier_control', {
        growspace_id: testContext.acInfinityGrowspaceId,
        enabled: true,
      }),
    ]);
  });

  test('live registry metadata drives successful six-role Port Pre-fill', async ({
    page,
    testContext,
  }) => {
    const dialog = await openConfig(page, testContext.acInfinityDashboardPath);
    await dialog.clickTab('growlight');

    await dialog.dialog.getByText('+ Add AC Infinity grow light', { exact: true }).click();
    const port = dialog.dialog.locator('config-growlight-tab .ac-infinity-device').last();
    const deviceId = await pickPort(port, 'E2E AC Infinity Grow Light Port');

    const expected = [
      GROWLIGHT.mode_entity,
      GROWLIGHT.on_time_entity,
      GROWLIGHT.off_time_entity,
      GROWLIGHT.power_entity,
      GROWLIGHT.sunrise_switch_entity,
      GROWLIGHT.sunrise_duration_entity,
    ];
    await expect
      .poll(() =>
        port
          .locator('gm-entity-picker')
          .evaluateAll((pickers) => pickers.map((picker) => (picker as any).value))
      )
      .toEqual(expected);

    const registryRows = await dialog.dialog.evaluate((element, entityIds) => {
      const root = element.getRootNode() as ShadowRoot;
      const hass = (root.host as any).hass;
      return entityIds.map((entityId: string) => hass?.entities?.[entityId]);
    }, expected);
    expect(registryRows).toHaveLength(6);
    expect(registryRows.every((entry: any) => entry.platform === 'ac_infinity')).toBe(true);
    expect(new Set(registryRows.map((entry: any) => entry.device_id))).toEqual(new Set([deviceId]));
    expect(registryRows.map((entry: any) => entry.translation_key)).toEqual([
      'active_mode',
      'schedule_mode_on_time',
      'schedule_mode_off_time',
      'on_power',
      'sunrise_timer_enabled',
      'sunrise_timer_minutes',
    ]);
  });

  test('Automated Mode Conflict clears reactively when the real mode entity changes', async ({
    page,
    testContext,
  }) => {
    await callHAService(page, 'growspace_manager', 'set_humidifier_control', {
      growspace_id: testContext.acInfinityGrowspaceId,
      enabled: false,
    });
    await selectMode(page, HUMIDIFIER.mode_entity, 'Auto');

    const dialog = await openConfig(page, testContext.acInfinityDashboardPath);
    await dialog.clickTab('humidity');
    const editor = dialog.dialog.locator('.ac-infinity-editor', {
      hasText: 'Humidifier AC Infinity Devices',
    });
    const warning = editor.locator('.ac-infinity-mode-conflict');
    await expect(warning).toContainText('E2E AC Infinity Humidifier Port');
    await expect(warning).toContainText('Auto');

    await selectMode(page, HUMIDIFIER.mode_entity, 'On');
    await expect(warning).toBeHidden();
  });

  test('Duplicate Port Warning derives from a real device pick in the shared draft', async ({
    page,
    testContext,
  }) => {
    const dialog = await openConfig(page, testContext.acInfinityDashboardPath);
    await dialog.clickTab('climate');
    const exhaust = dialog.dialog.locator('.ac-infinity-editor', {
      hasText: 'Exhaust Fan AC Infinity Devices',
    });
    const circulation = dialog.dialog.locator('.ac-infinity-editor', {
      hasText: 'Circulation Fan AC Infinity Devices',
    });

    await pickPort(
      circulation.locator('.ac-infinity-device').first(),
      'E2E AC Infinity Exhaust Port'
    );

    await expect(circulation.locator('.ac-infinity-duplicate-warning')).toContainText(
      'also configured as Exhaust Fan'
    );
    await expect(exhaust.locator('.ac-infinity-duplicate-warning')).toContainText(
      'also configured as Circulation Fan'
    );
  });

  test('bundled backend drivers write on/off, speed, schedule, power, and sunrise locally', async ({
    page,
    testContext,
  }) => {
    test.setTimeout(90_000);
    await Promise.all([
      setNumber(page, TEMPERATURE, 25),
      setNumber(page, HUMIDITY, 60),
      setNumber(page, VPD, 1.2),
    ]);
    for (const port of [CIRCULATION, EXHAUST, HUMIDIFIER, DEHUMIDIFIER]) {
      await selectMode(page, port.mode_entity, 'Off');
      await setNumber(page, port.speed_entity, 0);
    }

    await Promise.all([setNumber(page, TEMPERATURE, 35), setNumber(page, HUMIDITY, 80)]);
    await setNumber(page, VPD, 1.6);

    for (const [port, expectedSpeed] of [
      [CIRCULATION, 8],
      [EXHAUST, 8],
      [HUMIDIFIER, 10],
    ] as const) {
      await waitForState(page, port.mode_entity, (state) => state.state === 'On');
      await waitForState(page, port.speed_entity, (state) => Number(state.state) === expectedSpeed);
    }
    await waitForState(page, DEHUMIDIFIER.mode_entity, (state) => state.state === 'Off');

    // A reload reconstructs the VPD coordinators and clears their five-minute
    // equipment protection timers. This keeps the acceptance test fast while
    // still driving both transitions exclusively through public HA seams.
    await callHAService(page, 'homeassistant', 'reload_config_entry', {
      entity_id: 'sensor.e2e_ac_infinity_overview',
    });
    await waitForState(
      page,
      'sensor.e2e_ac_infinity_overview',
      (state) => state.state !== 'unavailable'
    );
    await setNumber(page, VPD, 0.5);
    await waitForState(page, HUMIDIFIER.mode_entity, (state) => state.state === 'Off');
    await waitForState(page, DEHUMIDIFIER.mode_entity, (state) => state.state === 'On');
    await waitForState(page, DEHUMIDIFIER.speed_entity, (state) => Number(state.state) === 10);

    await callHAService(page, 'growspace_manager', 'configure_environment', {
      growspace_id: testContext.acInfinityGrowspaceId,
      growlight_config: {
        enabled: true,
        power: 80,
        sunrise_enabled: true,
        sunrise_minutes: 30,
      },
    });
    await waitForState(page, GROWLIGHT.mode_entity, (state) => state.state === 'Schedule');
    await waitForState(page, GROWLIGHT.on_time_entity, (state) => state.state === '06:00:00');
    await waitForState(page, GROWLIGHT.off_time_entity, (state) => state.state === '00:00:00');
    await waitForState(page, GROWLIGHT.power_entity, (state) => Number(state.state) === 8);
    await waitForState(page, GROWLIGHT.sunrise_switch_entity, (state) => state.state === 'on');
    await waitForState(
      page,
      GROWLIGHT.sunrise_duration_entity,
      (state) => Number(state.state) === 30
    );
  });
});
