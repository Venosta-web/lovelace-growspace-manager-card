/**
 * Shape checks for the emitted entry bundle.
 *
 * HACS treats a frontend plugin as a single file and rewrites only that file on
 * update, so an entry that defers its eager path to a hashed chunk turns a
 * stale chunk set into a dashboard that renders nothing at all — silently, with
 * no card registered. Rollup emits exactly that facade whenever the entry
 * module has exports and `preserveEntrySignatures` is left at its default,
 * which is a one-character regression the build itself reports as success.
 * So it is asserted on the emitted bytes rather than trusted to the config.
 */
import { parseAst } from 'rollup/parseAst';

const RE_EXPORT_TYPES = new Set([
  'ImportDeclaration',
  'ExportAllDeclaration',
  'ExportNamedDeclaration',
]);

/** Card types the source entry registers in `window.customCards`. */
export function declaredCardTypes(entrySource) {
  const types = [...entrySource.matchAll(/type:\s*'([\w-]+)'/g)].map(([, type]) => type);
  if (types.length === 0) {
    throw new Error('No window.customCards registrations found in the source entry');
  }
  return types;
}

/** Modules an emitted bundle loads before it runs. Dynamic imports are excluded. */
export function staticDependencies(bundleSource) {
  return parseAst(bundleSource)
    .body.filter((node) => RE_EXPORT_TYPES.has(node.type) && node.source)
    .map((node) => node.source.value);
}

/**
 * Fails when the entry cannot register and render the cards on its own.
 *
 * @param {{ entryBundle: string, entrySource: string, entryPath: string }} args
 *   the emitted entry, the `src/index.ts` it was built from, and the emitted path.
 */
export function assertSelfContainedEntry({ entryBundle, entrySource, entryPath }) {
  const eagerChunks = staticDependencies(entryBundle);
  if (eagerChunks.length > 0) {
    throw new Error(
      `${entryPath} is a re-export facade: it statically imports ${eagerChunks.join(', ')}. ` +
        'The entry must carry the eager path itself so a stale chunk set cannot ' +
        'unregister every card. Check `preserveEntrySignatures: false` in rollup.config.js.'
    );
  }

  const unregistered = declaredCardTypes(entrySource).filter((type) => !entryBundle.includes(type));
  if (unregistered.length > 0) {
    throw new Error(
      `${entryPath} does not register ${unregistered.join(', ')}; ` +
        'the registration moved into a lazy chunk'
    );
  }
}

/**
 * Fails when a lazy chunk would load the entry a second time.
 *
 * A chunk that statically imports the entry resolves it without the
 * cache-busting query Home Assistant loads it with, so the browser treats the
 * two URLs as two modules and executes the eager bundle twice. See
 * `scripts/lazy-chunk-entry-binding.mjs`.
 *
 * @param {{ chunks: Array<{ fileName: string, source: string }>, entryFileName: string }} args
 */
export function assertChunksBindToLoadedEntry({ chunks, entryFileName }) {
  const specifier = `./${entryFileName}`;
  const rebinding = chunks.filter((chunk) => staticDependencies(chunk.source).includes(specifier));

  if (rebinding.length > 0) {
    throw new Error(
      `${rebinding.map((chunk) => chunk.fileName).join(', ')} statically imports ${specifier}, ` +
        'which loads and runs the entry a second time under its unstamped URL. ' +
        'The lazy chunks must bind to the loaded entry instance instead.'
    );
  }
}
