# ADR 0056 — A lazy chunk may declare that no other chunk statically imports it

**Status:** Accepted

## Context

`scripts/entry-bundle-shape.mjs` asserts two properties of the emitted bundles:
the entry imports nothing statically, so a stale chunk set cannot unregister
every card; and no chunk statically imports the entry, so the entry cannot run
twice under two URLs. **Chunk-to-chunk edges are never examined.**

That is usually right. They are ordinary and load-bearing — the current build's
graph has the dialog-host chunk statically importing `growspace-config-dialog-*.js`
and `growspace-environment-ramp-*.js`, `growspace-heatmap-3d-*.js` importing the
latter, and seven card-editor chunks importing two shared ones. A rule banning
them would fail the build it was written against.

`config-dialog` is the instructive one. It has a `LAZY_CHUNKS` entry, it is
emitted as its own file, the release validator requires that file to exist — and
`growspace-dialog-host.container.ts` statically imports it, so opening *any*
dialog fetches it. `growspace-subarea-card.ts` is the dynamic caller that keeps
it a separate file at all. Nothing about this is wrong, and it is the proof that
**a `LAZY_CHUNKS` name says nothing about whether some other chunk pulls the
file in eagerly.**

Nor does the post-publish update check of [ADR
0053](0053-post-publish-hacs-update-check.md) see it: it walks the entry's
module graph over HTTP and follows `import()`, so `growspace-tc-*.js` is
already reachable through the standalone card and an extra static edge changes
nothing it reports.

For one chunk that distinction is the whole point. `growspace-tc-*.js` carries
the Tissue Culture view, and [TC ADR 0003]'s stated consequence is that "users
without TC download nothing eagerly". The TC dialog is reached from the dialog
host, where the house pattern for all 23 existing dialogs is a static import.
Written that way, TC becomes a static dependency of the dialog-host chunk,
fetched on the first dialog every dashboard opens — and every check in this
repository stays green.

## Decision

A chunk may declare in `src/lib/lazy-chunk.ts` that nothing else may statically
import it:

```ts
tcView: {
  name: 'tc',
  feature: 'The tissue culture view',
  onDemandOnly: true,
},
```

`scripts/entry-bundle-shape.mjs` reads that flag out of the registry source the
way it already reads the chunk names, resolves each declared name to the emitted
file, and fails when any other emitted chunk lists it among its static
dependencies. `scripts/validate-hacs-release.mjs` calls it beside the two
existing assertions, so it runs wherever they do: `Lint & Build`, on every push
and pull request to `main` and `dev`. The failure names the importing chunk, the
imported one, and the fix — make it a dynamic `import()`.

The declaration is **opt-in per chunk**, not a policy over all of them. Only a
chunk whose absence is the point declares it.

**One source-level test carries the rest of the guarantee.** A vitest file whose
module graph is only the dialog host asserts that importing the host defines no
TC element. This is not redundant with the bundle rule: it covers the case the
bundle rule cannot see. A static import of a TC *sub*-module, rather than the
chunk entry, makes that module reachable from two entry points, and rollup
hoists it into a third shared chunk that both the dialog host and
`growspace-tc-*.js` import — no edge to `growspace-tc-*.js` exists, the bundle
rule passes, and the view is eager. At source level the import defines the
element and the test fails. The two guards are complements; neither is optional.

The exhaustive alternative — asserting over `chunk.moduleIds` in a rollup
`generateBundle` hook, which sees module provenance directly — is rejected. It
would have to live in `rollup.config.js`, and the bundle-shape checks exist
precisely because that file is not trusted: the regression they were written for
is a one-character config change the build reports as success.

## Consequences

`growspace-tc-*.js` is imported by nothing today, so the rule passes the day it
is written. It is installed as a guard, not as a fix, and it lands before the
work it protects.

A contributor who writes the TC dialog the way the other 23 are written gets a
failed pull request naming the two chunks, instead of a silently eager chunk for
every dashboard on earth.

Deleting the last dynamic import of a declared chunk does not defeat the rule.
The chunk would then be folded into its importer and emitted under no name at
all, which the release validator's existing required-chunk check already fails
with `Missing required lazy chunk`.

One residual gap is accepted: a TC module that registers no custom element,
statically imported and hoisted into a shared chunk, escapes both guards. Its
cost is kilobytes rather than behaviour, and neither guard is worth
complicating for it.

[TC ADR 0003]: https://github.com/Venosta-web/growspace_manager_tc/blob/main/docs/adr/0003-ui-is-a-lazy-chunk-in-the-existing-card.md
