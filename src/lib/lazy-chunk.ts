/**
 * Lazy chunks that name themselves when they fail to load.
 *
 * HACS ships a frontend plugin as a single file and rewrites only that file on
 * update, so an install can serve a current entry bundle on top of a months-old
 * chunk set. The entry survives that — it carries the registration and render
 * path for every card (see `scripts/entry-bundle-shape.mjs`) — but each
 * `import()` behind it then rejects, and a bare rejection is invisible: the
 * dialog simply never opens and nothing anywhere says why.
 *
 * Every dynamic import in this card therefore goes through `loadLazyChunk`. It
 * resolves to `null` rather than rejecting, so no unhandled rejection reaches
 * the console and the caller is left with a value it has to render an error
 * for; and it remembers the attempt, so a chunk that cannot load is diagnosed
 * exactly once however often the surface retries.
 */

export interface LazyChunk {
  /**
   * Rollup's `[name]` for the chunk — the build emits it as
   * `growspace-<name>-<hash>.js`, which is the file the user has to get back.
   * `npm run validate:hacs-release` fails if a name here matches no emitted
   * chunk, because a message naming the wrong file is worse than none.
   */
  readonly name: string;
  /** What the user was reaching for, as the subject of the message. */
  readonly feature: string;
}

/**
 * Every chunk this card loads lazily. Keeping them in one place is what lets
 * the release validator check the names against the build output.
 */
export const LAZY_CHUNKS = {
  dialogHost: {
    name: 'growspace-dialog-host.container',
    feature: 'Growspace Manager dialogs',
  },
  configDialog: {
    name: 'config-dialog',
    feature: 'The growspace configuration dialog',
  },
  heatmap3d: {
    name: 'heatmap-3d',
    feature: 'The 3D heatmap',
  },
  managerCardEditor: {
    name: 'growspace-manager-card-editor',
    feature: 'The Growspace Manager card editor',
  },
  gridCardEditor: {
    name: 'growspace-grid-card-editor',
    feature: 'The Growspace Grid card editor',
  },
  analyticsCardEditor: {
    name: 'growspace-analytics-card-editor',
    feature: 'The Growspace Analytics card editor',
  },
  aiInsightCardEditor: {
    name: 'growspace-ai-insight-card-editor',
    feature: 'The Growspace AI Insight card editor',
  },
  tankCardEditor: {
    name: 'growspace-tank-card-editor',
    feature: 'The Growspace Tank card editor',
  },
  subareaCardEditor: {
    name: 'growspace-subarea-card-editor',
    feature: 'The Growspace Subarea card editor',
  },
  logbookCardEditor: {
    name: 'growspace-logbook-card-editor',
    feature: 'The Growspace Logbook card editor',
  },
  carouselCardEditor: {
    name: 'growspace-carousel-card-editor',
    feature: 'The Growspace Carousel card editor',
  },
} as const satisfies Record<string, LazyChunk>;

/** The dist file the chunk is emitted as, with its content hash left open. */
export function lazyChunkFile(chunk: LazyChunk): string {
  return `growspace-${chunk.name}-*.js`;
}

/** The one sentence shown on the surface and logged to the console. */
export function lazyChunkMessage(chunk: LazyChunk): string {
  return (
    `${chunk.feature} could not be loaded: this install is missing ${lazyChunkFile(chunk)}. ` +
    `Redownload the Growspace Manager card in HACS, then reload the page.`
  );
}

const attempts = new Map<string, Promise<unknown>>();

/**
 * Load a lazy chunk, reporting a failure instead of rejecting.
 *
 * Resolves to the module, or to `null` once the chunk has failed — the caller
 * must render {@link lazyChunkMessage} in place of the feature when it does.
 * The attempt is remembered by chunk name, so a second surface reaching for the
 * same missing chunk gets the same `null` without a second `console.error`.
 */
export function loadLazyChunk<T>(chunk: LazyChunk, load: () => Promise<T>): Promise<T | null> {
  const pending = attempts.get(chunk.name) as Promise<T | null> | undefined;
  if (pending) return pending;

  const attempt = load().catch((error: unknown) => {
    console.error(`[growspace-manager-card] ${lazyChunkMessage(chunk)}`, error);
    return null;
  });
  attempts.set(chunk.name, attempt);
  return attempt;
}

/** Forget every load attempt. Tests only — a real install recovers on reload. */
export function resetLazyChunks(): void {
  attempts.clear();
}
