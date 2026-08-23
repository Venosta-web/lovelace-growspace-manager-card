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
  };
}

interface CoverageManifest {
  version: number;
  profiles: CoverageSetupProfile[];
}

const coveragePath = path.join(__dirname, 'e2e-entity-coverage.generated.json');
if (!fs.existsSync(coveragePath)) {
  throw new Error(
    `Missing ${coveragePath}. Run growspace_manager_workspace/scripts/gen-e2e-sensors first.`
  );
}
const COVERAGE = JSON.parse(fs.readFileSync(coveragePath, 'utf-8')) as CoverageManifest;

// Load .env.test from the tests/e2e directory if present
const envPath = path.join(__dirname, '..', '.env.test');
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

interface VwcStrategyParams {
  target_vwc_percent: number;
  maintenance_dryback_percent: number;
  p0_duration_minutes: number;
  p2_stop_before_lights_off_minutes: number;
  shot_duration_seconds: number;
  shot_interval_minutes: number;
}

interface GrowspaceSpec {
  /** Slug used in entity IDs, e.g. "mother" → sensor.e2e_mother_overview */
  slug: string;
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

async function resolveGrowspaceId(slug: string): Promise<string | null> {
  const attrs = await getStateAttributes(`sensor.e2e_${slug}_overview`);
  if (!attrs) return null;
  // growspace_id is nested under attrs.identity in the current schema
  const identity = attrs['identity'] as Record<string, unknown> | undefined;
  return (identity?.['growspace_id'] as string) ?? null;
}

async function ensureGrowspace(spec: GrowspaceSpec): Promise<string> {
  const existing = await resolveGrowspaceId(spec.slug);
  if (existing) {
    console.log(`  already exists (${existing}) — skipping creation`);
    return existing;
  }

  console.log(`  creating growspace…`);
  await callService('growspace_manager', 'add_growspace', {
    name: spec.name,
    rows: 2,
    plants_per_row: 2,
  });

  // Wait for the coordinator to create the entity and overview sensor
  for (let i = 0; i < 10; i++) {
    await sleep(800);
    const id = await resolveGrowspaceId(spec.slug);
    if (id) {
      console.log(`  created (${id})`);
      return id;
    }
  }
  throw new Error(
    `Overview sensor sensor.e2e_${spec.slug}_overview never appeared after growspace creation`
  );
}

async function ensureStagePlant(growspaceId: string, spec: GrowspaceSpec): Promise<void> {
  // add_plant silently relocates to the next free position when row/col is occupied,
  // so a 400-based guard never fires. Check the plant count instead.
  const plantCount = await getStateValue(`sensor.e2e_${spec.slug}_overview`);
  if (plantCount !== null && parseInt(plantCount, 10) > 0) {
    console.log(`    anchor plant already present — skipping`);
    return;
  }

  console.log(`  placing anchor plant (${spec.plantStageField})…`);
  await callService('growspace_manager', 'add_plant', {
    growspace_id: growspaceId,
    strain: 'E2E Anchor',
    row: 1,
    col: 1,
    [spec.plantStageField]: stageDate(spec.stageDaysAgo),
  });
}

async function configureEnvironment(growspaceId: string, spec: GrowspaceSpec): Promise<void> {
  console.log(`  linking sensors…`);
  await callService('growspace_manager', 'configure_environment', {
    growspace_id: growspaceId,
    // Hardware profiles are exclusive. Explicit clears make reruns converge
    // even when an older fixture wired flow, drain, or tanks into every space.
    irrigation_tanks: [],
    irrigation_flow_sensors: [],
    drain_volume_sensors: [],
    ...spec.services.configure_environment,
  });

  console.log(`  wiring irrigation & drain pumps…`);
  await callService('growspace_manager', 'set_irrigation_settings', {
    growspace_id: growspaceId,
    irrigation_pump_entity: '',
    drain_pump_entity: '',
    ...spec.services.set_irrigation_settings,
  });
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

/**
 * Write resolved growspace IDs back into .env.test in-place.
 * Existing values are updated; unknown keys are appended.
 * Dashboard path keys are left untouched so the user can set them once.
 */
function writeIdsToEnvFile(results: Array<{ slug: string; id: string }>): void {
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

  const results: Array<{ slug: string; id: string }> = [];

  for (const spec of GROWSPACES) {
    console.log(`\n[e2e_${spec.slug}]`);
    const growspaceId = await ensureGrowspace(spec);
    await ensureStagePlant(growspaceId, spec);
    await configureEnvironment(growspaceId, spec);
    if (spec.vwcStrategy) {
      await setVwcStrategy(growspaceId, spec.slug, spec.vwcStrategy);
    } else {
      // A rerun must also remove strategy capability from non-VWC profiles.
      await callService('growspace_manager', 'set_irrigation_strategy', {
        growspace_id: growspaceId,
        enabled: false,
      });
    }
    results.push({ slug: spec.slug, id: growspaceId });
  }

  await ensureTestStrain();

  writeIdsToEnvFile(results);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
