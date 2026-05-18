/**
 * One-time setup script: creates the 6 e2e growspaces in a running HA instance,
 * links all sim_e2e_* sensors to them, and writes the resolved growspace IDs
 * back into tests/e2e/.env.test automatically.
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

async function callService(domain: string, service: string, data: Record<string, unknown>): Promise<void> {
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
  const data = await res.json() as { attributes: Record<string, unknown> };
  return data.attributes;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

interface GrowspaceSpec {
  /** Slug used in entity IDs, e.g. "mother" → sensor.e2e_mother_overview */
  slug: string;
  name: string;
  /** Date field that makes the anchor plant adopt the right stage */
  plantStageField: string;
}

const TODAY = new Date().toISOString().split('T')[0];

const GROWSPACES: GrowspaceSpec[] = [
  { slug: 'mother', name: 'E2E Mother', plantStageField: 'mother_start' },
  { slug: 'clone',  name: 'E2E Clone',  plantStageField: 'clone_start'  },
  { slug: 'veg',    name: 'E2E Veg',    plantStageField: 'veg_start'    },
  { slug: 'flower', name: 'E2E Flower', plantStageField: 'flower_start' },
  { slug: 'dry',    name: 'E2E Dry',    plantStageField: 'dry_start'    },
  { slug: 'cure',   name: 'E2E Cure',   plantStageField: 'cure_start'   },
];

function buildSensors(slug: string) {
  const s = (suffix: string) => `sensor.e2e_${slug}_${suffix}`;
  return {
    temperature_sensor:      s('temperature'),
    humidity_sensor:         s('humidity'),
    vpd_sensor:              s('vpd'),
    co2_sensor:              s('co2'),
    feed_ec_sensors:         [s('feed_ec')],
    substrate_ec_sensors:    [s('substrate_ec')],
    runoff_ec_sensors:       [s('runoff_ec')],
    ph_sensors:              [s('ph')],
    substrate_temperature_sensors: [s('substrate_temperature')],
    soil_moisture_sensor:    s('substrate_moisture'),
    power_sensors:           [s('power')],
    energy_sensors:          [s('energy')],
    drain_volume_sensors:    [s('drain_volume')],
    irrigation_flow_sensors: [s('irrigation_flow')],
    irrigation_tanks:        [{ sensor_entity: s('irrigation_tank'), volume_liters: 50 }],
  };
}

async function resolveGrowspaceId(slug: string): Promise<string | null> {
  const attrs = await getStateAttributes(`sensor.e2e_${slug}_overview`);
  if (!attrs) return null;
  return (attrs['growspace_id'] as string) ?? null;
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
  throw new Error(`Overview sensor sensor.e2e_${spec.slug}_overview never appeared after growspace creation`);
}

async function ensureStagePlant(growspaceId: string, spec: GrowspaceSpec): Promise<void> {
  console.log(`  placing anchor plant (${spec.plantStageField})…`);
  try {
    await callService('growspace_manager', 'add_plant', {
      growspace_id: growspaceId,
      strain: 'E2E Anchor',
      row: 1,
      col: 1,
      [spec.plantStageField]: TODAY,
    });
  } catch (err: any) {
    if (err.message.includes('400')) {
      console.log(`    position occupied — anchor plant already present`);
    } else {
      throw err;
    }
  }
}

async function configureEnvironment(growspaceId: string, slug: string): Promise<void> {
  console.log(`  linking sensors…`);
  await callService('growspace_manager', 'configure_environment', {
    growspace_id: growspaceId,
    ...buildSensors(slug),
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
    await configureEnvironment(growspaceId, spec.slug);
    results.push({ slug: spec.slug, id: growspaceId });
  }

  await ensureTestStrain();

  writeIdsToEnvFile(results);
}

main().catch(err => {
  console.error(err.message ?? err);
  process.exit(1);
});
