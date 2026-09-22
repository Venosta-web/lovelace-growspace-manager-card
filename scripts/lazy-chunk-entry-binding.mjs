/**
 * Binds every lazy chunk to the entry instance the browser already loaded.
 *
 * The entry is self-contained, so the chunks import their shared runtime — the
 * store, the shared components, Lit itself — back out of it. Rollup writes that
 * as `import { … } from './growspace-manager-card.js'`, and a relative
 * specifier drops the query of the URL it resolves against. Home Assistant
 * always loads the entry *with* a query (`?hacstag=` from HACS, `?v=` from the
 * dev runtime's cache-busting stamp), so those are two module URLs for one
 * file: the eager bundle would execute twice, every custom element would be
 * defined twice, and the second definition throws — taking the dialog, editor
 * or 3D view that triggered the chunk down with it.
 *
 * The entry publishes the URL it was loaded from as `window.__growspaceEntryUrl`
 * (see `src/index.ts`); this rewrites each chunk's static import of the entry
 * into a dynamic one against that URL, which the browser answers from its module
 * map. One fetch, one instance, one store — whatever query the entry carries.
 */

const ENTRY_URL_GLOBAL = 'window.__growspaceEntryUrl';

const escapeForRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** `{ a as b, c }` as written by an import, rewritten for a destructuring. */
function toDestructuringPattern(importClause) {
  const bindings = importClause
    .slice(1, -1)
    .split(',')
    .map((binding) => binding.trim())
    .filter(Boolean)
    .map((binding) => binding.replace(/^(\S+)\s+as\s+(\S+)$/, '$1: $2'));

  return bindings.length > 0 ? `{ ${bindings.join(', ')} }` : '{}';
}

/**
 * Rewrites a chunk's static import of the entry into a dynamic one. Kept to a
 * single line so the chunk's source map stays valid.
 */
export function bindChunkToEntryInstance(code, entryFileName, chunkName = 'chunk') {
  const specifier = `./${entryFileName}`;
  const staticImport = new RegExp(
    `import\\s*(\\{[^{}]*\\})\\s*from\\s*(['"])${escapeForRegExp(specifier)}\\2;?`,
    'g'
  );

  // Counted on the way in: the rewrite reintroduces the specifier as a fallback,
  // so an unsupported import form has to be caught before it is indistinguishable.
  const references = code.split(specifier).length - 1;
  const rewritten = code.match(staticImport)?.length ?? 0;
  if (references !== rewritten) {
    throw new Error(
      `${chunkName} imports ${specifier} in a form this plugin cannot bind to the ` +
        'loaded entry instance; only `import { … } from` is supported'
    );
  }

  return code.replace(
    staticImport,
    (_match, importClause) =>
      `const ${toDestructuringPattern(importClause)} = await import(${ENTRY_URL_GLOBAL} ?? '${specifier}');`
  );
}

/** @param {{ entryFileName: string }} options */
export function bindLazyChunksToEntry({ entryFileName }) {
  return {
    name: 'bind-lazy-chunks-to-entry',
    // generateBundle, not renderChunk: the rewrite is a same-line substitution
    // applied after the source maps are rendered, so it never shifts them.
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter((emitted) => emitted.type === 'chunk');
      const entry = chunks.find((chunk) => chunk.fileName === entryFileName);

      if (!entry) {
        throw new Error(`The build emitted no ${entryFileName} to bind the lazy chunks to`);
      }
      if (!entry.code.includes(ENTRY_URL_GLOBAL)) {
        throw new Error(
          `${entryFileName} does not publish ${ENTRY_URL_GLOBAL}; the lazy chunks ` +
            'have no way to reach the entry instance the browser loaded'
        );
      }

      for (const chunk of chunks) {
        if (chunk.fileName === entryFileName) continue;
        chunk.code = bindChunkToEntryInstance(chunk.code, entryFileName, chunk.fileName);
      }
    },
  };
}
