/**
 * One-time setup script: creates every covered capability profile in a running
 * HA instance, applies the contract-derived entity payloads, and writes the
 * resolved growspace IDs back into tests/e2e/.env.test automatically.
 *
 * Run once before your first Playwright session:
 *   HA_ACCESS_TOKEN=<token> HA_BASE_URL=http://localhost:8123 npx ts-node tests/e2e/fixtures/e2e-setup.ts
 *
 * Safe to re-run — growspaces and plants that already exist are skipped,
 * and .env.test IDs are updated in-place without touching other variables.
 * An existing growspace is matched by the name its capability profile
 * declares, so a profile may name its growspace whatever the demo needs.
 *
 * After running, set TEST_*_DASHBOARD_PATH in .env.test to match your HA dashboard URLs.
 */

import * as fs from 'fs';
import * as path from 'path';

interface CoverageSetupProfile {
  profile: string;
  slug: string;
  name: string;
  plant_stage_field: string;
  stage_days_ago: number;
  vwc_strategy?: VwcStrategyParams;
  services: {
    configure_environment?: Record<string, unknown>;
    set_irrigation_settings?: Record<string, unknown>;
    set_irrigation_strategy?: Record<string, unknown>;
    configure_circulation_fan?: Record<string, unknown>;
    configure_exhaust_fan?: Record<string, unknown>;
    set_humidifier_control?: Record<string, unknown>;
    set_dehumidifier_control?: Record<string, unknown>;
    update_vision_checkup_config?: Record<string, unknown>;
  };
}

interface CoverageFixtureEntity {
  entity_id: string;
  fixture?: {
    handler: 'local_file';
    name: string;
    file_path: string;
  };
}

interface CoverageManifest {
  version: number;
  global_settings: Record<string, string>;
  profiles: CoverageSetupProfile[];
  entities: CoverageFixtureEntity[];
}

const coveragePath =
  process.env.GROWSPACE_E2E_COVERAGE_PATH ??
  path.join(__dirname, 'e2e-entity-coverage.generated.json');
if (!fs.existsSync(coveragePath)) {
  throw new Error(
    `Missing ${coveragePath}. Run growspace_manager_workspace/scripts/gen-e2e-sensors first.`
  );
}
const COVERAGE = JSON.parse(fs.readFileSync(coveragePath, 'utf-8')) as CoverageManifest;

// Load .env.test from the tests/e2e directory if present
const envPath = process.env.GROWSPACE_E2E_ENV_PATH ?? path.join(__dirname, '..', '.env.test');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

const BASE_URL = process.env.HA_BASE_URL ?? 'http://localhost:8123';
const TOKEN = process.env.HA_ACCESS_TOKEN;

if (!TOKEN) {
  console.error('HA_ACCESS_TOKEN is required');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

async function callService(
  domain: string,
  service: string,
  data: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/services/${domain}/${service}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Service ${domain}.${service} failed (${res.status}): ${body}`);
  }
}

async function postApi(pathname: string, data: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${BASE_URL}${pathname}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`POST ${pathname} failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

async function callWebSocket<T = Record<string, unknown>>(
  type: string,
  data: Record<string, unknown>
): Promise<T> {
  const url = new URL('/api/websocket', BASE_URL);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const commandId = 1;
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error(`WebSocket command ${type} timed out`));
    }, 10_000);
    const finish = (callback: () => void) => {
      clearTimeout(timeout);
      socket.close();
      callback();
    };

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as Record<string, any>;
      if (message.type === 'auth_required') {
        socket.send(JSON.stringify({ type: 'auth', access_token: TOKEN }));
        return;
      }
      if (message.type === 'auth_invalid') {
        finish(() => reject(new Error('Home Assistant WebSocket authentication failed')));
        return;
      }
      if (message.type === 'auth_ok') {
        socket.send(JSON.stringify({ id: commandId, type, ...data }));
        return;
      }
      if (message.id !== commandId) return;
      if (!message.success) {
        finish(() =>
          reject(new Error(`WebSocket command ${type} failed: ${JSON.stringify(message.error)}`))
        );
        return;
      }
      finish(() => resolve((message.result ?? {}) as T));
    });
    socket.addEventListener('error', () =>
      finish(() => reject(new Error(`WebSocket command ${type} could not connect`)))
    );
  });
}

async function getStateAttributes(entityId: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${BASE_URL}/api/states/${entityId}`, { headers });
  if (!res.ok) return null;
  const data = (await res.json()) as { attributes: Record<string, unknown> };
  return data.attributes;
}

async function getStateValue(entityId: string): Promise<string | null> {
  const res = await fetch(`${BASE_URL}/api/states/${entityId}`, { headers });
  if (!res.ok) return null;
  const data = (await res.json()) as { state: string };
  return data.state;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function ensureCameraFixtures(): Promise<void> {
  const fixtures = COVERAGE.entities.filter((entity) => entity.fixture);
  if (fixtures.length === 0) return;

  console.log('\n[cameras] provisioning deterministic local-file fixtures…');
  for (const entity of fixtures) {
    const fixture = entity.fixture!;
    const existing = await getStateAttributes(entity.entity_id);
    if (existing) {
      if (existing.file_path !== fixture.file_path) {
        await callService('local_file', 'update_file_path', {
          entity_id: entity.entity_id,
          file_path: fixture.file_path,
        });
      }
      console.log(`  ${entity.entity_id} already available`);
      continue;
    }

    const started = await postApi('/api/config/config_entries/flow', {
      handler: fixture.handler,
    });
    if (started.type !== 'form' || !started.flow_id) {
      throw new Error(`Could not start ${fixture.handler} flow: ${JSON.stringify(started)}`);
    }
    const completed = await postApi(`/api/config/config_entries/flow/${started.flow_id}`, {
      name: fixture.name,
      file_path: fixture.file_path,
    });
    if (completed.type !== 'create_entry' && completed.type !== 'abort') {
      throw new Error(`Could not create ${entity.entity_id}: ${JSON.stringify(completed)}`);
    }

    for (let attempt = 0; attempt < 20; attempt++) {
      await sleep(250);
      const attributes = await getStateAttributes(entity.entity_id);
      if (attributes?.file_path === fixture.file_path) {
        console.log(`  created ${entity.entity_id}`);
        break;
      }
      if (attempt === 19) {
        throw new Error(`${entity.entity_id} did not become available at ${fixture.file_path}`);
      }
    }
  }
}

async function ensureGlobalSettings(readinessProbeName: string): Promise<void> {
  const entries = await callWebSocket<Array<{ entry_id: string }>>('config_entries/get', {
    domain: 'growspace_manager',
  });
  if (entries.length !== 1) {
    throw new Error(`Expected one Growspace Manager config entry, found ${entries.length}`);
  }

  console.log('\n[global-settings] linking deterministic source-air fixtures…');
  const started = await postApi('/api/config/config_entries/options/flow', {
    handler: entries[0].entry_id,
  });
  if (started.type !== 'form' || started.step_id !== 'init' || !started.flow_id) {
    throw new Error(`Could not start Growspace Manager options flow: ${JSON.stringify(started)}`);
  }

  const globalForm = await postApi(`/api/config/config_entries/options/flow/${started.flow_id}`, {
    action: 'configure_global',
  });
  if (globalForm.type !== 'form' || globalForm.step_id !== 'configure_global') {
    throw new Error(`Could not open global settings: ${JSON.stringify(globalForm)}`);
  }

  // Preserve every existing/future global field exposed by the options flow,
  // then overwrite only the three keys owned by this fixture. The integration's
  // flow itself copies all unrelated top-level options before saving.
  const currentGlobal = Object.fromEntries(
    (globalForm.data_schema ?? [])
      .filter(
        (field: { default?: unknown }) => field.default !== null && field.default !== undefined
      )
      .map((field: { name: string; default: unknown }) => [field.name, field.default])
  );
  const completed = await postApi(`/api/config/config_entries/options/flow/${started.flow_id}`, {
    ...currentGlobal,
    ...COVERAGE.global_settings,
  });
  if (completed.type !== 'create_entry') {
    throw new Error(`Could not save global settings: ${JSON.stringify(completed)}`);
  }

  // Saving options reloads the config entry. The flow response can arrive while
  // the integration is still unloaded, so wait for a growspace that setup has
  // already provisioned before issuing another GSM service call.
  for (let attempt = 0; attempt < 20; attempt++) {
    await sleep(500);
    if (await resolveGrowspace(readinessProbeName)) {
      console.log('  configured weather and lung-room sensors');
      return;
    }
  }
  throw new Error('Growspace Manager did not return after saving global settings');
}

interface VwcStrategyParams {
  target_vwc_percent: number;
  maintenance_dryback_percent: number;
  p0_duration_minutes: number;
  p2_stop_before_lights_off_minutes: number;
  shot_duration_seconds: number;
  shot_interval_minutes: number;
}

interface GrowspaceSpec {
  /** Key for the .env.test variable and the coverage declaration, e.g. "mother" */
  slug: string;
  /** Declared growspace name — the only thing setup matches an existing one on */
  name: string;
  /** Date field that makes the anchor plant adopt the right stage */
  plantStageField: string;
  /**
   * How many days before today to backdate the anchor plant's stage date.
   * Defaults to 0 (today).
   */
  stageDaysAgo?: number;
  /**
   * If present, call set_irrigation_strategy after configureEnvironment using
   * these parameters. Only set for VWC-enabled growspaces.
   */
  vwcStrategy?: VwcStrategyParams;
  /** Contract-derived service payloads for this capability profile. */
  services: CoverageSetupProfile['services'];
}

const TODAY = new Date().toISOString().split('T')[0];

/** Returns an ISO date string for `daysAgo` days before today. */
function stageDate(daysAgo = 0): string {
  if (daysAgo === 0) return TODAY;
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

const GROWSPACES: GrowspaceSpec[] = COVERAGE.profiles.map((profile) => ({
  slug: profile.slug,
  name: profile.name,
  plantStageField: profile.plant_stage_field,
  stageDaysAgo: profile.stage_days_ago,
  vwcStrategy: profile.vwc_strategy,
  services: profile.services,
}));

/** A growspace as the integration reports it, not as a slug predicts it. */
interface ResolvedGrowspace {
  id: string;
  /**
   * The overview sensor the integration registered for it — null for roughly
   * twenty seconds after creation, while the entity registry catches up.
   */
  overviewEntityId: string | null;
}

/** A resolved growspace whose overview sensor is registered and readable. */
interface ReadyGrowspace extends ResolvedGrowspace {
  overviewEntityId: string;
}

function isReady(growspace: ResolvedGrowspace | null): growspace is ReadyGrowspace {
  return growspace?.overviewEntityId != null;
}

interface GrowspaceIdentityPayload {
  identity?: {
    growspace_id?: string;
    overview_entity_id?: string;
    name?: string;
  };
}

/**
 * Find an existing growspace by the name its capability profile declares.
 *
 * Home Assistant derives an overview sensor's entity ID from the growspace
 * name, so guessing `sensor.e2e_<slug>_overview` only works while every
 * instance happens to be named `E2E <Slug>`. The get_data payload states both
 * the name and the registered overview entity ID, so ask it instead.
 */
async function resolveGrowspace(name: string): Promise<ResolvedGrowspace | null> {
  let payload: Record<string, GrowspaceIdentityPayload>;
  try {
    payload = await callWebSocket<Record<string, GrowspaceIdentityPayload>>(
      'growspace_manager/get_data',
      {}
    );
  } catch {
    // The integration is reloading (or not loaded yet) — indistinguishable
    // here from "no such growspace", and every caller polls.
    return null;
  }

  for (const growspace of Object.values(payload)) {
    const identity = growspace?.identity;
    if (!identity?.growspace_id || identity.name !== name) continue;
    return {
      id: identity.growspace_id,
      overviewEntityId: identity.overview_entity_id ?? null,
    };
  }
  return null;
}

async function ensureGrowspace(spec: GrowspaceSpec): Promise<ReadyGrowspace> {
  const existing = await resolveGrowspace(spec.name);
  if (isReady(existing)) {
    console.log(`  already exists (${existing.id}) — skipping creation`);
    return existing;
  }

  if (existing) {
    // Created by an earlier run that gave up before the sensor registered.
    // Adopt it — creating a second one is what this resolver exists to avoid.
    console.log(`  exists (${existing.id}) without an overview sensor yet — waiting`);
  } else {
    console.log(`  creating growspace…`);
    await callService('growspace_manager', 'add_growspace', {
      name: spec.name,
      rows: 2,
      plants_per_row: 2,
    });
  }

  // The growspace appears in the payload at once, but Home Assistant takes
  // roughly twenty seconds to register its overview sensor. Setup needs that
  // sensor for the plant-count check, so wait for the entity ID, not the row.
  for (let i = 0; i < 60; i++) {
    await sleep(1000);
    const created = await resolveGrowspace(spec.name);
    if (isReady(created)) {
      console.log(`  ready (${created.id} → ${created.overviewEntityId})`);
      return created;
    }
  }
  throw new Error(`Growspace "${spec.name}" never registered an overview sensor`);
}

async function ensureStagePlant(growspace: ReadyGrowspace, spec: GrowspaceSpec): Promise<void> {
  // add_plant silently relocates to the next free position when row/col is occupied,
  // so a 400-based guard never fires. Check the plant count instead.
  const plantCount = await getStateValue(growspace.overviewEntityId);
  if (plantCount !== null && parseInt(plantCount, 10) > 0) {
    console.log(`    anchor plant already present — skipping`);
    return;
  }

  console.log(`  placing anchor plant (${spec.plantStageField})…`);
  await callService('growspace_manager', 'add_plant', {
    growspace_id: growspace.id,
    strain: 'E2E Anchor',
    row: 1,
    col: 1,
    [spec.plantStageField]: stageDate(spec.stageDaysAgo),
  });
}

async function configureProfileServices(growspaceId: string, spec: GrowspaceSpec): Promise<void> {
  const orderedServices = [
    'configure_environment',
    'set_irrigation_settings',
    'configure_circulation_fan',
    'configure_exhaust_fan',
    'set_humidifier_control',
    'set_dehumidifier_control',
  ] as const;

  for (const service of orderedServices) {
    const payload = spec.services[service];
    if (!payload) continue;
    console.log(`  applying ${service}…`);
    // Every service has patch semantics. Send only fields owned by this
    // capability profile so a setup rerun cannot erase unrelated hardware.
    await callService('growspace_manager', service, {
      growspace_id: growspaceId,
      ...payload,
    });
  }
}

async function setVwcStrategy(
  growspaceId: string,
  slug: string,
  params: VwcStrategyParams
): Promise<void> {
  console.log(`  enabling VWC steering strategy…`);
  await callService('growspace_manager', 'set_irrigation_strategy', {
    growspace_id: growspaceId,
    enabled: true,
    lights_on_time: '06:00:00',
    ...params,
  });
}

async function ensureTestStrain(): Promise<void> {
  console.log('\n[strain-library] seeding E2E Anchor strain…');
  try {
    await callService('growspace_manager', 'add_strain', {
      strain: 'E2E Anchor',
      breeder: 'E2E Seeds',
      type: 'hybrid',
    });
    console.log('  seeded');
  } catch (err: any) {
    // add_strain is idempotent — duplicate errors are expected on re-runs
    console.log('  already exists or non-fatal error:', err.message);
  }
}

interface SetupResult extends ReadyGrowspace {
  slug: string;
  name: string;
}

async function reloadGrowspaceManager(results: SetupResult[]): Promise<void> {
  const lighting = results.find((result) => result.slug === 'lighting');
  if (!lighting) return;

  // Growspace sub-coordinators are selected when the config entry loads. A
  // single reload after all profile writes activates the light-cycle tracker
  // (and the VWC coordinator profiles) against their final configuration.
  console.log('\n[integration] reloading Growspace Manager with final profile configuration…');
  await callService('homeassistant', 'reload_config_entry', {
    entity_id: lighting.overviewEntityId,
  });
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    if (await resolveGrowspace(lighting.name)) {
      console.log('  reloaded');
      return;
    }
  }
  throw new Error('Growspace Manager did not return after config-entry reload');
}

/**
 * Write resolved growspace IDs back into .env.test in-place.
 * Existing values are updated; unknown keys are appended.
 * Dashboard path keys are left untouched so the user can set them once.
 */
function writeIdsToEnvFile(results: SetupResult[]): void {
  const envPath = path.join(__dirname, '..', '.env.test');

  if (!fs.existsSync(envPath)) {
    console.log('\n.env.test not found — skipping auto-update.');
    console.log('Copy .env.test.example to .env.test, then re-run this script.');
    return;
  }

  let content = fs.readFileSync(envPath, 'utf-8');

  for (const { slug, id } of results) {
    const key = `TEST_${slug.toUpperCase()}_GROWSPACE_ID`;
    const line = `${key}=${id}`;
    const regex = new RegExp(`^${key}=.*$`, 'm');

    if (regex.test(content)) {
      content = content.replace(regex, line);
    } else {
      content += `\n${line}`;
    }
  }

  fs.writeFileSync(envPath, content, 'utf-8');
  console.log('\n.env.test updated with growspace IDs.');
  console.log('Remaining step: set TEST_*_DASHBOARD_PATH for each stage if not already done.');
}

async function main(): Promise<void> {
  console.log(`Connecting to Home Assistant at ${BASE_URL}…`);
  const ping = await fetch(`${BASE_URL}/api/`, { headers });
  if (!ping.ok) {
    console.error('Could not reach HA — is it running?');
    process.exit(1);
  }

  const results: SetupResult[] = [];

  await ensureCameraFixtures();

  for (const spec of GROWSPACES) {
    console.log(`\n[e2e_${spec.slug}]`);
    const growspace = await ensureGrowspace(spec);
    const growspaceId = growspace.id;
    await ensureStagePlant(growspace, spec);
    await configureProfileServices(growspaceId, spec);
    if (spec.services.update_vision_checkup_config) {
      console.log(`  configuring Vision Checkup schedule…`);
      await callWebSocket('growspace_manager/update_vision_checkup_config', {
        growspace_id: growspaceId,
        ...spec.services.update_vision_checkup_config,
      });
    }
    if (spec.services.set_irrigation_strategy) {
      console.log(`  configuring light-cycle tracking…`);
      await callService('growspace_manager', 'set_irrigation_strategy', {
        growspace_id: growspaceId,
        ...spec.services.set_irrigation_strategy,
      });
    } else if (spec.vwcStrategy) {
      await setVwcStrategy(growspaceId, spec.slug, spec.vwcStrategy);
    } else {
      // A rerun must also remove strategy capability from non-VWC profiles.
      await callService('growspace_manager', 'set_irrigation_strategy', {
        growspace_id: growspaceId,
        enabled: false,
      });
    }
    results.push({ ...growspace, slug: spec.slug, name: spec.name });
  }

  // Any provisioned growspace answers "is the integration back yet?"; the
  // lighting profile is the one the reload above targets.
  const readinessProbe = results.find((result) => result.slug === 'lighting') ?? results[0];

  await ensureTestStrain();
  await reloadGrowspaceManager(results);
  await ensureGlobalSettings(readinessProbe.name);

  writeIdsToEnvFile(results);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
