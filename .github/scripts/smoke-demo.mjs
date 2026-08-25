#!/usr/bin/env node
/**
 * Boot the assembled demo site in a real browser and assert it actually works.
 *
 * The static file checks in demo.yaml prove the right files were staged. They
 * cannot prove the page renders — the failure mode this demo has already had
 * twice is a page that loads its own files happily and then shows nothing,
 * because the card bundle 404'd or a Home Assistant component the card expects
 * was never defined.
 *
 * Usage: node .github/scripts/smoke-demo.mjs http://127.0.0.1:8080
 */

import { chromium } from 'playwright';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:8080';

const failures = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } });

page.on('response', (res) => {
  if (res.status() >= 400) failures.push(`HTTP ${res.status()} ${res.url()}`);
});
page.on('pageerror', (err) => failures.push(`page error: ${err}`));

const fail = async (message) => {
  console.error(`::error::${message}`);
  await browser.close();
  process.exit(1);
};

// Enter through the site root so the redirect is covered too.
await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
try {
  await page.waitForURL('**/demo/', { timeout: 15000 });
} catch {
  await fail(`the site root did not redirect to /demo/ (landed on ${page.url()})`);
}

const card = page.locator('growspace-manager-card');
try {
  await card.waitFor({ state: 'visible', timeout: 30000 });
} catch {
  await fail('<growspace-manager-card> never became visible — the demo renders nothing');
}

await page.waitForTimeout(6000);

// The card mounting is not enough: it renders an empty shell without data.
const plants = await card.locator('plant-card-container').count();
if (plants === 0) {
  await fail('the card mounted but rendered no plants — the recorded snapshot is not driving it');
}
console.log(`plants rendered: ${plants}`);

// Dialogs are the part that silently breaks when the ha-* stand-ins regress.
//
// Checking for `ha-dialog[open]` alone is not enough: an *undefined* custom
// element still carries the attribute and still has a bounding box, so it looks
// visible to Playwright while painting nothing. That is precisely the broken
// state this guards against, so assert the element is actually upgraded and
// that its content really renders.
const missingComponents = await page.evaluate(() =>
  ['ha-dialog', 'ha-svg-icon', 'ha-card'].filter((tag) => !customElements.get(tag))
);
if (missingComponents.length > 0) {
  await fail(
    `Home Assistant stand-ins are not registered: ${missingComponents.join(', ')} — ` +
      'every dialog would open into nothing'
  );
}

await card.locator('plant-card-container').first().click();

const dialog = page.locator('ha-dialog[open]').last();
try {
  await dialog.waitFor({ state: 'visible', timeout: 15000 });
} catch {
  await fail('clicking a plant did not open a dialog');
}

// The dialog must paint text, not just occupy space.
const dialogText = ((await dialog.textContent({ timeout: 10000 })) ?? '').trim();
if (dialogText.length < 40) {
  await fail(`the plant dialog opened but rendered almost no content (${dialogText.length} chars)`);
}
console.log(`plant dialog opened (${dialogText.length} chars of content)`);

if (failures.length > 0) {
  console.error('::error::the demo loaded with failed requests or page errors:');
  for (const entry of failures) console.error(`  ${entry}`);
  await browser.close();
  process.exit(1);
}

console.log('demo smoke test passed');
await browser.close();
