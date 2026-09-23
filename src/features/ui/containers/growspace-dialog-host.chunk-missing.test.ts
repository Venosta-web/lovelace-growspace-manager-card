import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { atom } from 'nanostores';

import './growspace-dialog-host.container';
import type { GrowspaceDialogHost } from './growspace-dialog-host.container';
import { DIALOG_CHUNKS, DialogType } from './growspace-dialog-chunks';
import { resetLazyChunks } from '../../../lib/lazy-chunk';
import type { GrowspaceStore } from '../../../store/core/growspace-store';

/**
 * A HACS install can serve a current entry and dialog host on top of a
 * months-old chunk set (#969 made every dialog a chunk of its own, so every
 * dialog can be the one that is missing). `loadLazyChunk` reports that by
 * resolving to null; only that export is replaced, so the message asserted is
 * the message a user reads.
 *
 * Alone in its file, because the file that mocks the loader must not also be
 * the file that loads real chunks.
 */
vi.mock('../../../lib/lazy-chunk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/lazy-chunk')>()),
  loadLazyChunk: vi.fn().mockResolvedValue(null),
}));

let host: GrowspaceDialogHost | undefined;

beforeEach(() => resetLazyChunks());

afterEach(() => {
  host?.remove();
  host = undefined;
});

describe('a dialog whose chunk is missing still opens, says which file, and closes', () => {
  test.each(Object.keys(DIALOG_CHUNKS) as DialogType[])('%s', async (type) => {
    const { chunk, tag } = DIALOG_CHUNKS[type];
    const closed: string[] = [];
    const state = atom<
      Record<string, unknown> & { activeDialog: { type: string; payload: unknown } }
    >({
      activeDialog: { type, payload: {} },
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
      ui: {
        closeDialog: () => {
          closed.push(state.get().activeDialog.type);
          state.set({ ...state.get(), activeDialog: { type: 'NONE', payload: {} } });
        },
      },
    } as unknown as GrowspaceStore;
    document.body.appendChild(host);

    const root = host.shadowRoot!;
    await expect.poll(() => root.querySelector('growspace-lazy-chunk-error')).not.toBeNull();
    const error = root.querySelector('growspace-lazy-chunk-error')!;
    await error.updateComplete;
    expect(error.chunk).toBe(chunk);
    expect(error.shadowRoot?.textContent).toContain(`growspace-${chunk.name}-*.js`);
    expect(root.querySelector(tag)).toBeNull();

    // The frame closes this dialog, through the same event as every other.
    root
      .querySelector('gs-dialog')!
      .dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    expect(closed).toEqual([type]);
    await host.updateComplete;
    expect(root.querySelector('gs-dialog')).toBeNull();
  });
});
