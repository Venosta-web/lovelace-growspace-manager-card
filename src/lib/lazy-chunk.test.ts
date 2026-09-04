import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  LAZY_CHUNKS,
  LazyChunk,
  lazyChunkMessage,
  loadLazyChunk,
  resetLazyChunks,
} from './lazy-chunk';

const chunk: LazyChunk = { name: 'test-chunk', feature: 'The test feature' };

/** What a browser throws when the chunk's file is not there any more. */
const missing = () => Promise.reject(new TypeError('Failed to fetch dynamically imported module'));

describe('loadLazyChunk', () => {
  let errors: unknown[][];

  beforeEach(() => {
    resetLazyChunks();
    errors = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetLazyChunks();
  });

  it('resolves to the module when the chunk loads', async () => {
    const module = { thing: 1 };
    await expect(loadLazyChunk(chunk, () => Promise.resolve(module))).resolves.toBe(module);
    expect(errors).toHaveLength(0);
  });

  it('resolves to null instead of rejecting when the chunk is missing', async () => {
    await expect(loadLazyChunk(chunk, missing)).resolves.toBeNull();
  });

  it('logs one error naming the chunk file and the HACS remedy', async () => {
    await loadLazyChunk(chunk, missing);

    expect(errors).toHaveLength(1);
    const [message, cause] = errors[0];
    expect(message).toContain('growspace-test-chunk-*.js');
    expect(message).toContain('The test feature');
    expect(message).toContain('Redownload the Growspace Manager card in HACS');
    expect(cause).toBeInstanceOf(TypeError);
  });

  it('reports a failed chunk once however often a surface retries', async () => {
    await loadLazyChunk(chunk, missing);
    await loadLazyChunk(chunk, missing);
    await expect(loadLazyChunk(chunk, missing)).resolves.toBeNull();

    expect(errors).toHaveLength(1);
  });

  it('does not re-attempt the import once the chunk has failed', async () => {
    const load = vi.fn(missing);
    await loadLazyChunk(chunk, load);
    await loadLazyChunk(chunk, load);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reports each failing chunk separately', async () => {
    await loadLazyChunk(chunk, missing);
    await loadLazyChunk({ name: 'other-chunk', feature: 'Another feature' }, missing);

    expect(errors).toHaveLength(2);
    expect(errors[1][0]).toContain('growspace-other-chunk-*.js');
  });
});

describe('lazyChunkMessage', () => {
  it('names the dist file for each registered chunk', () => {
    for (const registered of Object.values(LAZY_CHUNKS)) {
      expect(lazyChunkMessage(registered)).toContain(`growspace-${registered.name}-*.js`);
    }
  });
});
