# `n/no-unpublished-import` is disabled because this card is a bundle, not an npm package

`eslint.config.js` extends `eslint-plugin-n`'s `flat/recommended` set. That plugin enforces **Node package-publishing hygiene** — its `no-unpublished-import` rule flags any import of a package listed in `devDependencies` (rather than `dependencies`), on the premise that a published package's consumers only install its `dependencies`, so a `devDependencies`-only import would be broken at the consumer's `npm install`.

That premise does not hold here. The card is a **rollup-bundled browser artifact** (`dist/growspace-manager-card.js`, shipped via HACS) that is **never published to npm**. Every import — `lit`, `@lit/context`, the rest — is statically bundled into one file at build time, so there is no consumer `npm install` and the `dependencies` / `devDependencies` split carries no runtime meaning. The rule fired **385 times**, including on `lit` (the card's core framework), drowning the ~111 genuine errors and the lint signal with them.

## Decision

Set `'n/no-unpublished-import': 'off'` in `eslint.config.js`, with an inline comment recording why.

**Keep `n/no-extraneous-import` on.** It is a different check: it flags imports of packages declared in *neither* `dependencies` nor `devDependencies` — i.e. relying on a transitive install that could vanish on any dependency bump. That is a real signal regardless of whether the project is published. It correctly caught `home-assistant-js-websocket` (imported for the `HassEntity` type across ~8 files, declared nowhere, resolving only transitively via `custom-card-helpers`); the fix was to declare it in `devDependencies`, not to silence the rule.

## Considered Options

- **Remove `eslint-plugin-n` entirely** — rejected. It would also drop `no-extraneous-import`, the one `n/*` rule that earns its place here, letting genuinely undeclared dependencies pass silently.
- **Move every `devDependencies`-only import (`lit`, …) into `dependencies` to satisfy the rule** — rejected as cargo-culting. It would mislabel the manifest to appease a check whose premise (npm consumers) does not apply, and buys nothing for a bundled artifact.
- **Run lint with `--max-warnings` tuning instead** — does not apply; these were *errors*, not warnings, and the issue is the rule's relevance, not its severity.

## Consequences

- Lint dropped from 504 errors to 111, all of which are now genuine code issues (unused vars, promise-handling, duplicate/misordered imports).
- `no-extraneous-import` remains a live guard; a future undeclared import will still fail lint.
- If this card is ever extracted into a *published* npm package, this decision must be revisited — `no-unpublished-import` would then be a real correctness check and should be re-enabled alongside a proper `dependencies` / `devDependencies` split.
