import type { Page } from '@playwright/test';

import { haTest as test, expect } from '../fixtures/ha-setup';
import { GrowspaceCard } from '../pages/GrowspaceCard';
import { IPMDialog, TrainingDialog, WateringDialog } from '../pages/Dialogs';

/**
 * Opening one dialog downloads that dialog and nothing heavier (#969).
 *
 * The dialog host used to import every dialog statically, so logging a
 * training session fetched the irrigation editor, the strain editor, the
 * vision snapshots and the Grow Master chat — 1.34 MB before minification.
 * Each dialog is its own chunk now. The unit suite proves the host asks for
 * the right one; this proves what the browser actually fetches from a real
 * install, where one stray static import would put them all back.
 */

/** The chunks a quick care dialog must never pull in, by rollup chunk name. */
const HEAVY_CHUNKS = [
  'irrigation-dialog',
  'strain-library-dialog',
  'snapshots-dialog',
  'grow-master-dialog',
  'label-dialogs',
];

/** Every card chunk the page requests, by rollup chunk name, from now on. */
function recordChunkRequests(page: Page): string[] {
  const chunks: string[] = [];
  page.on('request', (request) => {
    const file = new URL(request.url()).pathname.split('/').pop() ?? '';
    const match = /^growspace-(.+)-[A-Za-z0-9_-]{8}\.js$/.exec(file);
    if (match) chunks.push(match[1]);
  });
  return chunks;
}

const DIALOGS = [
  {
    name: 'training',
    chunk: 'training-dialog',
    open: (card: GrowspaceCard) => card.clickMenuAction('training'),
    waitForOpen: (page: Page) => new TrainingDialog(page).waitForOpen(),
  },
  {
    name: 'IPM',
    chunk: 'growspace-ipm-dialog-ui',
    open: (card: GrowspaceCard) => card.clickMenuAction('ipm'),
    waitForOpen: (page: Page) => new IPMDialog(page).waitForOpen(),
  },
  {
    name: 'water',
    chunk: 'nutrient-dialogs',
    open: (card: GrowspaceCard) => card.clickMenuAction('water'),
    waitForOpen: (page: Page) => new WateringDialog(page).waitForOpen(),
  },
];

test.describe('Dialog chunks', () => {
  for (const dialog of DIALOGS) {
    test(`opening the ${dialog.name} dialog fetches its own chunk and none of the heavy ones`, async ({
      page,
      testContext,
    }) => {
      const requested = recordChunkRequests(page);
      const card = new GrowspaceCard(page);
      await card.navigate(testContext.dashboardPath);
      await card.waitForCardReady();

      await dialog.open(card);
      await dialog.waitForOpen(page);
      await page.waitForLoadState('networkidle');

      expect(requested).toContain('growspace-dialog-host.container');
      expect(requested).toContain(dialog.chunk);
      expect(requested.filter((chunk) => HEAVY_CHUNKS.includes(chunk))).toEqual([]);
    });
  }
});
