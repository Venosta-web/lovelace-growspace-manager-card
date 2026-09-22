import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';

import '../../src/features/shared/ui/lazy-chunk-error';
import type { GrowspaceLazyChunkError } from '../../src/features/shared/ui/lazy-chunk-error';
import { LAZY_CHUNKS, LazyChunk, loadLazyChunk, resetLazyChunks } from '../../src/lib/lazy-chunk';
import { GrowspaceLogbookCard } from '../../src/cards/growspace-logbook-card';

async function renderError(chunk: LazyChunk | null): Promise<GrowspaceLazyChunkError> {
  return fixture<GrowspaceLazyChunkError>(
    html`<growspace-lazy-chunk-error .chunk=${chunk}></growspace-lazy-chunk-error>`
  );
}

function textOf(el: Element): string {
  return el.shadowRoot!.textContent!.replace(/\s+/g, ' ').trim();
}

/**
 * Reject the chunk before the card reaches for it, the way the browser rejects
 * an `import()` whose file HACS left behind. The loader remembers the attempt,
 * so the card's own call takes the failed path without hitting the network.
 */
async function failChunk(chunk: LazyChunk): Promise<void> {
  await loadLazyChunk(chunk, () =>
    Promise.reject(new TypeError('Failed to fetch dynamically imported module'))
  );
}

describe('<growspace-lazy-chunk-error>', () => {
  it('names the missing chunk file and the remedy', async () => {
    const el = await renderError(LAZY_CHUNKS.heatmap3d);

    expect(textOf(el)).toContain('The 3D heatmap could not be loaded');
    expect(textOf(el)).toContain('growspace-heatmap-3d-*.js');
    expect(textOf(el)).toContain('Redownload the Growspace Manager card in HACS');
  });

  it('announces itself to assistive technology', async () => {
    const el = await renderError(LAZY_CHUNKS.dialogHost);
    expect(el.shadowRoot!.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('renders nothing until a chunk has failed', async () => {
    const el = await renderError(null);
    expect(textOf(el)).toBe('');
  });
});

describe('a card whose editor chunk is missing', () => {
  const editorChunk = LAZY_CHUNKS.logbookCardEditor;
  let rejections: PromiseRejectionEvent[];
  const collect = (event: PromiseRejectionEvent) => rejections.push(event);

  beforeEach(async () => {
    resetLazyChunks();
    rejections = [];
    window.addEventListener('unhandledrejection', collect);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await failChunk(editorChunk);
  });

  afterEach(() => {
    window.removeEventListener('unhandledrejection', collect);
    vi.restoreAllMocks();
    resetLazyChunks();
  });

  it('hands Lovelace an editor that says which chunk to reinstall', async () => {
    const editor = (await GrowspaceLogbookCard.getConfigElement()) as unknown as HTMLElement;
    expect(editor.tagName.toLowerCase()).toBe('growspace-lazy-chunk-error');
    // Lovelace configures the element it is handed; ours has nothing to configure.
    expect(() => (editor as GrowspaceLazyChunkError).setConfig()).not.toThrow();

    // Lit renders on connect, so the message exists once Lovelace mounts it.
    document.body.appendChild(editor);
    try {
      await (editor as GrowspaceLazyChunkError).updateComplete;
      expect(textOf(editor)).toContain('growspace-growspace-logbook-card-editor-*.js');
      expect(textOf(editor)).toContain('Redownload the Growspace Manager card in HACS');
    } finally {
      editor.remove();
    }
  });

  it('leaves no unhandled rejection behind', async () => {
    await GrowspaceLogbookCard.getConfigElement();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(rejections).toEqual([]);
  });

  it('reports the failure once, not on every reopening of the editor', async () => {
    const logged = vi.mocked(console.error);
    await GrowspaceLogbookCard.getConfigElement();
    await GrowspaceLogbookCard.getConfigElement();
    await GrowspaceLogbookCard.getConfigElement();

    expect(logged).toHaveBeenCalledTimes(1);
    expect(String(logged.mock.calls[0][0])).toContain(
      'growspace-growspace-logbook-card-editor-*.js'
    );
  });
});
