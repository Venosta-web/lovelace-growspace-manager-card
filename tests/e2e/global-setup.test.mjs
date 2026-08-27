import assert from 'node:assert/strict';
import test from 'node:test';

import {
  E2E_PREFLIGHT_COMPLETE,
  E2E_PREFLIGHT_ENVIRONMENT_VARIABLE,
} from '../../scripts/e2e-runtime-harness.mjs';
import verifyE2EBundle, { shouldBypassE2EBundlePreflight } from './global-setup.ts';

test('Playwright global setup only bypasses a completed runtime-harness preflight', () => {
  assert.equal(shouldBypassE2EBundlePreflight({}), false);
  assert.equal(
    shouldBypassE2EBundlePreflight({
      [E2E_PREFLIGHT_ENVIRONMENT_VARIABLE]: 'unverified',
    }),
    false
  );
  assert.equal(
    shouldBypassE2EBundlePreflight({
      [E2E_PREFLIGHT_ENVIRONMENT_VARIABLE]: E2E_PREFLIGHT_COMPLETE,
    }),
    true
  );
});

test('Playwright global setup accepts the completed runtime-harness handoff', () => {
  const previousValue = process.env[E2E_PREFLIGHT_ENVIRONMENT_VARIABLE];
  process.env[E2E_PREFLIGHT_ENVIRONMENT_VARIABLE] = E2E_PREFLIGHT_COMPLETE;

  try {
    assert.doesNotThrow(() => verifyE2EBundle());
  } finally {
    if (previousValue === undefined) {
      delete process.env[E2E_PREFLIGHT_ENVIRONMENT_VARIABLE];
    } else {
      process.env[E2E_PREFLIGHT_ENVIRONMENT_VARIABLE] = previousValue;
    }
  }
});
