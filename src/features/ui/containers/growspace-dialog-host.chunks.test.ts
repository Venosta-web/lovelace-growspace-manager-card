import { afterEach, expect, test } from 'vitest';
import { atom } from 'nanostores';

import './growspace-dialog-host.container';
import type { GrowspaceDialogHost } from './growspace-dialog-host.container';
import { DIALOG_CHUNKS } from './growspace-dialog-chunks';
import type { GrowspaceStore } from '../../../store/core/growspace-store';
import type { ActiveDialogState } from '../../../ui-state';

/**
 * Each dialog is its own lazy chunk, fetched the first time it opens (#969).
 *
 * The tests run in order and share one module graph: the first needs a dialog
 * nobody has loaded yet, the last loads them all. The failure path, for every
 * chunk, is growspace-dialog-host.chunk-missing.test.ts.
 */

let host: GrowspaceDialogHost | undefined;

afterEach(() => {
  host?.remove();
  host = undefined;
});

function openHost(activeDialog: ActiveDialogState): GrowspaceDialogHost {
  const state = atom({
    activeDialog,
    devices: [],
    selectedDevice: null,
    strainLibrary: [],
    nutrientPresets: {},
    ipmPresets: {},
    nutrientInventory: null,
  });
  host = document.createElement('growspace-dialog-host') as GrowspaceDialogHost;
  host.store = {
    instanceId: 'portal-a',
    $dialogHostState: state,
    ui: { closeDialog: () => state.set({ ...state.get(), activeDialog: { type: 'NONE' } }) },
  } as unknown as GrowspaceStore;
  document.body.appendChild(host);
  return host;
}

test('a dialog renders once its chunk has arrived, and nothing before', async () => {
  expect(customElements.get('strain-recommendation-dialog')).toBeUndefined();

  const el = openHost({
    type: 'STRAIN_RECOMMENDATION',
    payload: { isLoading: false, response: null },
  });
  await el.updateComplete;
  // Not an unknown element waiting to upgrade: nothing at all.
  expect(el.shadowRoot?.querySelector('strain-recommendation-dialog')).toBeNull();
  expect(el.shadowRoot?.querySelector('gs-dialog')).toBeNull();

  await expect
    .poll(() => el.shadowRoot?.querySelector('strain-recommendation-dialog'))
    .not.toBeNull();
  expect(customElements.get('strain-recommendation-dialog')).toBeDefined();
});

test('opening one dialog loads no other', () => {
  // The previous test opened STRAIN_RECOMMENDATION and nothing else.
  const defined = Object.values(DIALOG_CHUNKS)
    .map(({ tag }) => tag)
    .filter((tag) => customElements.get(tag) !== undefined);
  expect(defined).toEqual(['strain-recommendation-dialog']);
});

test("every dialog's chunk defines the element the host renders for it", async () => {
  for (const [type, { tag, load }] of Object.entries(DIALOG_CHUNKS)) {
    await load();
    expect(customElements.get(tag), `${type} renders <${tag}>`).toBeDefined();
  }
});
