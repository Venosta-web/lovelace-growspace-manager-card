#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath =
  process.env.GROWSPACE_E2E_ENV_PATH ?? path.join(rootDirectory, 'tests', 'e2e', '.env.test');
const manifestPath = path.join(
  rootDirectory,
  'tests',
  'e2e',
  'fixtures',
  'e2e-entity-coverage.generated.json'
);
const baseUrl = process.env.HA_BASE_URL || 'http://localhost:8123';
const clientId = `${baseUrl.replace(/\/$/, '')}/`;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function responseJson(response, description) {
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${description} failed (${response.status}): ${body}`);
  }
  return body ? JSON.parse(body) : {};
}

async function api(pathname, { token, method = 'GET', data, form } = {}) {
  const headers = {};
  let body;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (data !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(data);
  } else if (form !== undefined) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(form);
  }
  return fetch(new URL(pathname, baseUrl), { method, headers, body });
}

async function waitForHomeAssistant() {
  const deadline = Date.now() + 180_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await api('/api/onboarding');
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(2_000);
  }
  throw new Error(`Home Assistant did not become ready: ${lastError?.message ?? 'timeout'}`);
}

async function websocketCommand(token, type, payload = {}) {
  const url = new URL('/api/websocket', baseUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const commandId = 1;
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error(`WebSocket command ${type} timed out`));
    }, 20_000);
    const finish = (callback) => {
      clearTimeout(timeout);
      socket.close();
      callback();
    };

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.type === 'auth_required') {
        socket.send(JSON.stringify({ type: 'auth', access_token: token }));
        return;
      }
      if (message.type === 'auth_invalid') {
        finish(() => reject(new Error('Home Assistant WebSocket authentication failed')));
        return;
      }
      if (message.type === 'auth_ok') {
        socket.send(JSON.stringify({ id: commandId, type, ...payload }));
        return;
      }
      if (message.id !== commandId) return;
      if (!message.success) {
        finish(() => reject(new Error(`${type} failed: ${JSON.stringify(message.error)}`)));
        return;
      }
      finish(() => resolve(message.result));
    });
    socket.addEventListener('error', () =>
      finish(() => reject(new Error(`WebSocket command ${type} could not connect`)))
    );
  });
}

function parseEnv(content) {
  return Object.fromEntries(
    content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1)];
      })
  );
}

function serializeEnv(values) {
  return `${Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')}\n`;
}

async function readManifest() {
  return JSON.parse(await readFile(manifestPath, 'utf8'));
}

function dashboardPath(slug) {
  return `/e2e-${slug.replaceAll('_', '-')}/0`;
}

async function writeInitialEnv(token) {
  const manifest = await readManifest();
  const values = {
    HA_BASE_URL: baseUrl,
    HA_ACCESS_TOKEN: token,
    TEST_GROWSPACE_ID: '',
    TEST_DASHBOARD_PATH: '/e2e-veg/0',
  };
  for (const profile of manifest.profiles) {
    values[`TEST_${profile.slug.toUpperCase()}_GROWSPACE_ID`] = '';
    values[`TEST_${profile.slug.toUpperCase()}_DASHBOARD_PATH`] = dashboardPath(profile.slug);
  }
  values.TEST_VEG_PLANT_ID = '';
  await writeFile(envPath, serializeEnv(values), { mode: 0o600 });
}

async function bootstrap() {
  await waitForHomeAssistant();

  const user = await responseJson(
    await api('/api/onboarding/users', {
      method: 'POST',
      data: {
        name: 'Growspace E2E',
        username: 'growspace-e2e',
        password: 'growspace-e2e',
        client_id: clientId,
        language: 'en',
      },
    }),
    'Home Assistant user onboarding'
  );
  const tokenResponse = await responseJson(
    await api('/auth/token', {
      method: 'POST',
      form: {
        grant_type: 'authorization_code',
        client_id: clientId,
        code: user.auth_code,
      },
    }),
    'Home Assistant token exchange'
  );
  const sessionToken = tokenResponse.access_token;
  const longLivedToken = await websocketCommand(sessionToken, 'auth/long_lived_access_token', {
    client_name: 'Growspace CI E2E',
    lifespan: 1,
  });

  for (const [pathname, data] of [
    ['/api/onboarding/core_config', undefined],
    ['/api/onboarding/analytics', undefined],
    ['/api/onboarding/integration', { client_id: clientId, redirect_uri: clientId }],
  ]) {
    await responseJson(
      await api(pathname, { method: 'POST', token: sessionToken, data }),
      pathname
    );
  }

  const deadline = Date.now() + 120_000;
  let flow;
  while (Date.now() < deadline) {
    const response = await api('/api/config/config_entries/flow', {
      method: 'POST',
      token: longLivedToken,
      data: { handler: 'growspace_manager' },
    });
    if (response.ok) {
      flow = await response.json();
      break;
    }
    await sleep(2_000);
  }
  if (!flow) throw new Error('Growspace Manager config flow did not become available');
  if (flow.type !== 'create_entry') {
    await responseJson(
      await api(`/api/config/config_entries/flow/${flow.flow_id}`, {
        method: 'POST',
        token: longLivedToken,
        data: { name: 'Growspace Manager' },
      }),
      'Growspace Manager config entry creation'
    );
  }

  await responseJson(
    await api('/api/states/weather.e2e_outdoor_conditions', {
      method: 'POST',
      token: longLivedToken,
      data: {
        state: 'cloudy',
        attributes: { temperature: 12, humidity: 85, friendly_name: 'E2E outdoor conditions' },
      },
    }),
    'E2E weather fixture creation'
  );

  await writeInitialEnv(longLivedToken);
  console.log('Home Assistant onboarding and Growspace Manager setup completed.');
}

async function ensureLovelaceResource(token) {
  const url = '/local/community/lovelace-growspace-manager-card/growspace-manager-card.js';
  const resources = (await websocketCommand(token, 'lovelace/resources')) ?? [];
  if (resources.some((resource) => resource.url === url)) return;
  await websocketCommand(token, 'lovelace/resources/create', { res_type: 'module', url });
}

async function dashboards() {
  const manifest = await readManifest();
  const values = parseEnv(await readFile(envPath, 'utf8'));
  const token = values.HA_ACCESS_TOKEN;
  if (!token) throw new Error('HA_ACCESS_TOKEN is missing from tests/e2e/.env.test');

  await ensureLovelaceResource(token);
  const existing = (await websocketCommand(token, 'lovelace/dashboards/list')) ?? [];
  const existingPaths = new Set(existing.map((dashboard) => dashboard.url_path));

  for (const profile of manifest.profiles) {
    const envPrefix = `TEST_${profile.slug.toUpperCase()}`;
    const growspaceId = values[`${envPrefix}_GROWSPACE_ID`];
    if (!growspaceId) throw new Error(`${envPrefix}_GROWSPACE_ID was not written by E2E setup`);
    const urlPath = dashboardPath(profile.slug).split('/')[1];
    if (!existingPaths.has(urlPath)) {
      await websocketCommand(token, 'lovelace/dashboards/create', {
        url_path: urlPath,
        title: profile.name,
        show_in_sidebar: false,
        require_admin: false,
      });
    }
    await websocketCommand(token, 'lovelace/config/save', {
      url_path: urlPath,
      config: {
        views: [
          {
            title: profile.name,
            type: 'sections',
            max_columns: 4,
            sections: [
              {
                type: 'grid',
                cards: [
                  {
                    type: 'custom:growspace-manager-card',
                    default_growspace: growspaceId,
                    grid_options: { rows: 4 },
                  },
                ],
              },
            ],
          },
        ],
      },
    });
  }

  values.TEST_GROWSPACE_ID = values.TEST_VEG_GROWSPACE_ID;
  values.TEST_DASHBOARD_PATH = '/e2e-veg/0';
  const states = await responseJson(
    await api('/api/states', { token }),
    'Home Assistant state lookup'
  );
  const vegPlant = states.find(
    (state) =>
      state.attributes?.plant_id &&
      state.attributes?.growspace_id === values.TEST_VEG_GROWSPACE_ID &&
      state.attributes?.row === 1 &&
      state.attributes?.col === 1
  );
  if (!vegPlant) throw new Error('The E2E veg anchor plant was not found');
  values.TEST_VEG_PLANT_ID = vegPlant.attributes.plant_id;
  await writeFile(envPath, serializeEnv(values), { mode: 0o600 });
  console.log(`Created ${manifest.profiles.length} E2E dashboards.`);
}

const command = process.argv[2];
if (command === 'bootstrap') await bootstrap();
else if (command === 'dashboards') await dashboards();
else {
  console.error('usage: node scripts/ci-e2e-environment.mjs {bootstrap|dashboards}');
  process.exitCode = 2;
}
