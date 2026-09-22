import { expect, test, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'lit';

import './growspace-dialog-host.container';
import { GrowspaceDialogHost } from './growspace-dialog-host.container';
import { mountedDialogPortals$ } from '../../../slices/ui/dialog-portals';
import { tcPresence$ } from '../../../slices/tc';
import { resetLazyChunks } from '../../../lib/lazy-chunk';

/**
 * A HACS install can serve a current entry bundle on top of a months-old chunk
 * set, and `loadLazyChunk` reports that by resolving to null. Only that one
 * export is replaced: `LAZY_CHUNKS` and `lazyChunkMessage` are the real ones,
 * so the message asserted is the message a user reads.
 *
 * Alone in its file, and separate from `growspace-dialog-host.tc-lazy.test.ts`
 * for the same reason in reverse: the file that mocks the loader must not also
 * be the file that claims nothing was loaded.
 */
vi.mock('../../../lib/lazy-chunk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/lazy-chunk')>()),
  loadLazyChunk: vi.fn().mockResolvedValue(null),
}));

const MANIFEST = {
  contract_version: 1,
  integration_version: '0.1.0',
  features: ['culture_lines', 'maintenance', 'culture_media', 'pairings'],
  collections: {},
};

let container: HTMLDivElement;

beforeEach(() => {
  resetLazyChunks();
  mountedDialogPortals$.set(['portal-a']);
  tcPresence$.set({ status: 'present', manifest: MANIFEST });
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  container.remove();
  mountedDialogPortals$.set([]);
  tcPresence$.set({ status: 'unknown' });
});

test('a TC install whose view chunk is missing still opens the dialog, and says why', async () => {
  const closed: string[] = [];
  // The store closes for real: `activeDialog` goes to NONE, so a second `close`
  // reaching the host is the no-op it is in production rather than a second count.
  let active: { type: string; payload?: unknown } = {
    type: 'TC',
    payload: { portalId: 'portal-a' },
  };
  const host = document.createElement('growspace-dialog-host') as GrowspaceDialogHost;
  (host as any).store = {
    instanceId: 'portal-a',
    $dialogHostState: {
      subscribe: vi.fn(() => () => {}),
      get: vi.fn(() => ({
        activeDialog: active,
        devices: [],
        selectedDevice: null,
        strainLibrary: [],
        nutrientPresets: {},
        ipmPresets: {},
        nutrientInventory: null,
      })),
    },
    ui: {
      closeDialog: () => {
        closed.push(active.type);
        active = { type: 'NONE' };
      },
    },
  };
  (host as any)._initControllers();

  render((host as any).render(), container);
  const dialog = container.querySelector('tc-dialog')!;
  await (dialog as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await vi.waitFor(() =>
    expect(dialog.shadowRoot?.querySelector('growspace-lazy-chunk-error')).not.toBeNull()
  );

  // The click always produces a dialog: the frame is there, with the failure
  // reported in its content pane rather than a menu item that opened nothing.
  const frame = dialog.shadowRoot?.querySelector('gs-dialog');
  expect(frame).not.toBeNull();
  expect(dialog.shadowRoot?.querySelector('growspace-tc-view')).toBeNull();
  const error = dialog.shadowRoot?.querySelector('growspace-lazy-chunk-error');
  expect(error?.shadowRoot?.textContent).toContain('growspace-tc-*.js');

  // And it still closes, in this state as in the other two: Escape through the
  // frame's own `escapeKeyAction`, and the close affordance through its event.
  const frameDialog = frame?.shadowRoot?.querySelector('ha-dialog') as unknown as {
    escapeKeyAction?: string;
  };
  expect(frameDialog.escapeKeyAction).toBe('close');
  frame?.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  expect(closed).toEqual(['TC']);
});
