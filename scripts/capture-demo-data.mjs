#!/usr/bin/env node
/**
 * Re-record `demo/demo-data.json` from a running Home Assistant.
 *
 * The demo page is the real card driven by a frozen snapshot of a real
 * backend, so the snapshot has to be re-taken whenever the payload shape
 * changes — otherwise zod validation in src/services/hass-call.ts starts
 * rejecting the recorded responses and the demo degrades silently.
 *
 * Usage:
 *   HA_BASE_URL=http://localhost:8123 \
 *   HA_ACCESS_TOKEN=<long-lived token> \
 *   GROWSPACE_ID=<id of the growspace to record> \
 *     node scripts/capture-demo-data.mjs
 *
 * `tests/e2e/.env.test` is read for defaults when present, so in the usual
 * workspace setup this is just:
 *
 *   GROWSPACE_ID=<id> node scripts/capture-demo-data.mjs
 *
 * What it records:
 *   - every entity state the growspace references (the card reads growspace
 *     data out of the overview sensor's attributes, not from a WS fetch)
 *   - 24h of history for those entities
 *   - one response per read-only `growspace_manager/*` WebSocket command
 *
 * What it scrubs: the local user id, HA context blocks, and the e2e fixture
 * naming that the shared dev instance uses for its sensors.
 */

// Uses Node's built-in global WebSocket (stable since Node 22) rather than the
// `ws` package — `ws` is only present here as a transitive dependency of
// Playwright and must not be imported directly.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// -- config ------------------------------------------------------------------
const envFile = path.join(ROOT, 'tests', 'e2e', '.env.test');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!(key in process.env)) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}

const BASE_URL = process.env.HA_BASE_URL ?? 'http://localhost:8123';
const TOKEN = process.env.HA_ACCESS_TOKEN;
const GROWSPACE_ID = process.env.GROWSPACE_ID;

if (!TOKEN) {
  console.error('HA_ACCESS_TOKEN is required.');
  process.exit(1);
}
if (!GROWSPACE_ID) {
  console.error('GROWSPACE_ID is required — the growspace to record.');
  process.exit(1);
}

// -- websocket ---------------------------------------------------------------
function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(BASE_URL.replace(/^http/, 'ws') + '/api/websocket');
    const pending = new Map();
    let nextId = 1;

    const send = (msg) =>
      new Promise((res, rej) => {
        const id = nextId++;
        pending.set(id, { res, rej });
        ws.send(JSON.stringify({ id, ...msg }));
      });

    ws.addEventListener('error', () => reject(new Error(`Could not connect to ${BASE_URL}`)));
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'auth_required') {
        ws.send(JSON.stringify({ type: 'auth', access_token: TOKEN }));
        return;
      }
      if (msg.type === 'auth_ok') return resolve({ send, close: () => ws.close() });
      if (msg.type === 'auth_invalid') return reject(new Error('Home Assistant rejected the token'));
      if (msg.type === 'result') {
        const entry = pending.get(msg.id);
        if (!entry) return;
        pending.delete(msg.id);
        if (msg.success) entry.res(msg.result);
        else entry.rej(new Error(JSON.stringify(msg.error)));
      }
    });
  });
}

// Read-only commands the card issues while the user moves around the UI.
const READ_COMMANDS = [
  ['growspace_manager/get_data', {}],
  ['growspace_manager/get_log', { growspace_id: GROWSPACE_ID, limit: 50 }],
  ['growspace_manager/get_alerts', { growspace_id: GROWSPACE_ID, limit: 300 }],
  ['growspace_manager/get_nutrient_presets', {}],
  ['growspace_manager/get_ipm_presets', {}],
  ['growspace_manager/get_nutrient_inventory', {}],
  ['growspace_manager/get_ec_ramp_curves', {}],
  ['growspace_manager/get_subareas', { growspace_id: GROWSPACE_ID }],
  ['growspace_manager/get_snapshots', { growspace_id: GROWSPACE_ID }],
  ['growspace_manager/get_genetics_data', {}],
  ['growspace_manager/get_ai_status', {}],
  ['growspace_manager/get_strain_library', {}],
];

// Entities belonging to other growspaces on a shared dev instance.
const isRelevant = (entityId) =>
  /^(sensor|binary_sensor|switch|calendar)\.(demo_tent|e2e_flower|sim_e2e_flower)/.test(entityId);

const DROP = new Set([
  'sensor.e2e_flower_overview',
  'sensor.e2e_flower_e2e_anchor_11',
  'binary_sensor.e2e_flower_stress',
  'binary_sensor.e2e_flower_mold_risk',
  'binary_sensor.e2e_flower_optimal_conditions',
  'calendar.e2e_flower_tasks',
  'sensor.e2e_flower_tank_depletion_tank_1',
  'sensor.e2e_flower_tank_depletion_tank',
  'sensor.e2e_flower_energy_usage',
  'sensor.e2e_flower_power_usage',
  'sensor.e2e_flower_water_usage',
  'sensor.e2e_flower_ec_target',
  'sensor.e2e_flower_air_exchange',
]);

const scrub = (value) => {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, inner] of Object.entries(value)) {
      if (key === 'context' || key === 'user_id') continue;
      out[key] = scrub(inner);
    }
    return out;
  }
  return value;
};

const titleCase = (value) =>
  value
    .replace(/_/g, ' ')
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\bVpd\b/, 'VPD')
    .replace(/\bCo2\b/, 'CO2')
    .replace(/\bEc\b/, 'EC')
    .replace(/\bPh\b/, 'pH');

async function main() {
  const { send, close } = await connect();

  const allStates = await send({ type: 'get_states' });
  const states = allStates
    .filter((s) => isRelevant(s.entity_id) && !DROP.has(s.entity_id))
    .map(({ entity_id, state, attributes, last_changed, last_updated }) => ({
      entity_id,
      state,
      attributes,
      last_changed,
      last_updated,
    }));

  if (!states.some((s) => s.entity_id === 'sensor.demo_tent_overview')) {
    throw new Error('sensor.demo_tent_overview is not present — is the demo growspace set up?');
  }
  console.log(`states: ${states.length}`);

  const history = await send({
    type: 'growspace_manager/get_history_stats',
    entity_ids: states.map((s) => s.entity_id),
    start_time: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    end_time: new Date().toISOString(),
    significant_changes_only: false,
  });
  console.log(`history series: ${Object.keys(history).length}`);

  const responses = {};
  for (const [type, params] of READ_COMMANDS) {
    try {
      responses[type] = await send({ type, ...params });
      console.log(`  ok   ${type}`);
    } catch (err) {
      responses[type] = null;
      console.log(`  n/a  ${type} — ${String(err.message).slice(0, 90)}`);
    }
  }

  // Keep only the recorded growspace, and drop the e2e fixture strain.
  const data = responses['growspace_manager/get_data'];
  if (data) responses['growspace_manager/get_data'] = { [GROWSPACE_ID]: data[GROWSPACE_ID] };
  const library = responses['growspace_manager/get_strain_library'];
  if (library?.strains) delete library.strains['E2E Anchor'];
  if (Array.isArray(library?.strain_list)) {
    library.strain_list = library.strain_list.filter((s) => (s?.strain ?? s) !== 'E2E Anchor');
  }

  // Rename the borrowed e2e sensor set. Longest pattern first, so
  // `sim_e2e_flower` is not half-rewritten by the `e2e_flower` rule.
  const renamed = JSON.parse(
    JSON.stringify({ states, history, responses })
      .replaceAll('sim_e2e_flower', 'sim_demo_room')
      .replaceAll('e2e_flower', 'demo_room')
      .replaceAll('sim e2e flower ', 'Demo Room ')
      .replaceAll('e2e flower ', 'Demo Room ')
  );
  for (const state of renamed.states) {
    if (typeof state.attributes?.friendly_name === 'string') {
      state.attributes.friendly_name = titleCase(state.attributes.friendly_name);
    }
  }

  const payload = {
    capturedAt: new Date().toISOString(),
    growspaceId: GROWSPACE_ID,
    overviewEntity: 'sensor.demo_tent_overview',
    states: scrub(renamed.states),
    history: renamed.history,
    responses: scrub(renamed.responses),
  };

  const leftovers = (JSON.stringify(payload).match(/e2e/gi) ?? []).length;
  if (leftovers > 0) {
    console.warn(`warning: ${leftovers} "e2e" mentions remain in the snapshot`);
  }

  const dest = path.join(ROOT, 'demo', 'demo-data.json');
  fs.writeFileSync(dest, JSON.stringify(payload));
  console.log(`\nwrote ${path.relative(ROOT, dest)} (${(fs.statSync(dest).size / 1024).toFixed(0)}KB)`);
  close();
}

main().catch((err) => {
  console.error('capture failed:', err.message);
  process.exit(1);
});
