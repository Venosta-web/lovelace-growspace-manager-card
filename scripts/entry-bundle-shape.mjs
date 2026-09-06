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

/**
 * Chunk names `src/lib/lazy-chunk.ts` promises the user, from its `LAZY_CHUNKS`
 * registry. A failed chunk names the file to reinstall, so a name that matches
 * nothing in `dist/` sends the reader looking for a file that was never built.
 */
export function declaredLazyChunkNames(registrySource) {
  const names = [...registrySource.matchAll(/^\s{4}name:\s*'([\w.-]+)',$/gm)].map(
    ([, name]) => name
  );
  if (names.length === 0) {
    throw new Error('No LAZY_CHUNKS entries found in src/lib/lazy-chunk.ts');
  }
  return names;
}

/**
 * Chunk names that declare `onDemandOnly: true` in `LAZY_CHUNKS`.
 *
 * Read out of the registry source the way {@link declaredLazyChunkNames} reads
 * the names, because these checks assert on what ships rather than on what the
 * build config claims. An empty result is legal: the flag is opt-in per chunk
 * (ADR 0056), and only a chunk whose absence is the point declares it.
 */
export function declaredOnDemandOnlyChunkNames(registrySource) {
  const entries = registrySource.matchAll(/^ {2}[A-Za-z0-9_$]+: \{$([\s\S]*?)^ {2}\},$/gm);
  const names = [];
  for (const [, body] of entries) {
    if (!/^ {4}onDemandOnly: true,$/m.test(body)) continue;
    const declared = body.match(/^ {4}name: '([\w.-]+)',$/m);
    if (!declared) {
      throw new Error('A LAZY_CHUNKS entry declares onDemandOnly without a name');
    }
    names.push(declared[1]);
  }
  return names;
}

/** The last segment of a path or an import specifier. */
const fileNameOf = (specifier) => specifier.slice(specifier.lastIndexOf('/') + 1);

/**
 * Fails when another emitted chunk statically imports an on-demand-only chunk.
 *
 * The house pattern for a dialog is a static import — all 23 of them in
 * `growspace-dialog-host.container.ts` are written that way — and written that
 * way the tissue-culture view becomes a static dependency of the dialog-host
 * chunk, fetched by the first dialog every dashboard opens, with every other
 * check in this repository still green. Chunk-to-chunk static imports are not
 * themselves a smell: the dialog-host chunk legitimately imports
 * `growspace-config-dialog-*.js`. So the rule is opt-in, per chunk, and this
 * is what the opt-in means. See ADR 0056.
 *
 * @param {{ chunks: Array<{ fileName: string, source: string }>, onDemandFileNames: string[] }} args
 *   every emitted bundle, and the emitted file names of the declared chunks.
 */
export function assertOnDemandChunksAreNotImported({ chunks, onDemandFileNames }) {
  const guarded = new Set(onDemandFileNames);
  const violations = [];

  for (const chunk of chunks) {
    const importer = fileNameOf(chunk.fileName);
    for (const specifier of staticDependencies(chunk.source)) {
      const imported = fileNameOf(specifier);
      if (imported !== importer && guarded.has(imported)) {
        violations.push(`${chunk.fileName} statically imports ${imported}`);
      }
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `${violations.join('; ')}. That chunk declares onDemandOnly in src/lib/lazy-chunk.ts: ` +
        'nothing may pull it in eagerly, because a dashboard without the feature ' +
        'must not download it. Reach it with a dynamic import() instead.'
    );
  }
}
