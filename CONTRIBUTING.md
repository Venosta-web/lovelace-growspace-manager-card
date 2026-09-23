# Contributing to the Growspace Manager card

Thanks for helping. Where to start depends on what you have:

| You have… | Go to |
|---|---|
| A bug in the card | [New issue → Bug report](https://github.com/Venosta-web/lovelace-growspace-manager-card/issues/new/choose). Include the browser console output; the form explains how. |
| A bug in sensors, services or stored data | The [integration's issues](https://github.com/Venosta-web/growspace_manager/issues/new/choose) |
| A question | [Discussions → Q&A](https://github.com/Venosta-web/lovelace-growspace-manager-card/discussions/categories/q-a) |
| An idea to talk through | [Discussions → Ideas](https://github.com/Venosta-web/lovelace-growspace-manager-card/discussions/categories/ideas) |
| A concrete feature request | [New issue → Feature request](https://github.com/Venosta-web/lovelace-growspace-manager-card/issues/new/choose) |
| Code | Read on. |

The [roadmap](https://github.com/Venosta-web/growspace_manager_workspace/issues/245)
shows what is planned. Please open or comment on an issue before starting a large
change, so that two people do not build the same thing.

## Development happens in the workspace hub

This card is the frontend for the
[Growspace Manager integration](https://github.com/Venosta-web/growspace_manager), and
most features change both. The
[workspace hub](https://github.com/Venosta-web/growspace_manager_workspace) clones the
repositories side by side. It also runs a real Home Assistant on
`http://localhost:8123` that serves this card's `dist/` straight from your checkout.

1. Clone the hub next to this repository. Its
   [README](https://github.com/Venosta-web/growspace_manager_workspace#readme) covers
   setup and the dev loop (`npm run watch` here, then reload the browser).
2. Read the hub's [`AGENTS.md`](https://github.com/Venosta-web/growspace_manager_workspace/blob/main/AGENTS.md)
   for the runtime commands, validation levels and cross-repository rules.
3. Read this repository's [`AGENTS.md`](AGENTS.md). It is the authority for this
   repository: base branch, merge gates, E2E tests and landing order. The domain
   vocabulary lives in [`CONTEXT.md`](CONTEXT.md), and design decisions in
   [`docs/adr/`](docs/adr).

## Work in a worktree

Every change goes on its own branch in its own worktree, never in the main
checkout. A pre-commit guard rejects commits there.

```bash
git fetch origin
git worktree add .worktrees/<branch-name> -b <branch-name> origin/dev
cd .worktrees/<branch-name>
npm ci
```

Card work targets **`dev`**. Every merge to `dev` publishes a prerelease, so
branch from a fresh `dev` and open your pull request against it.

For a change that also touches the integration, run `./scripts/feature new <name>`
from the hub instead. It creates a matched pair of worktrees with the same branch
in both repositories, and shares this checkout's `node_modules` with the new one.

## Check before you push

From the hub:

```bash
./scripts/check card fast   # eslint, types, formatting, design tokens and unit tests
./scripts/check card full   # the same with coverage, plus the build and release layout
```

`check` prints which checkout it is validating before it starts. From a worktree,
set `GROWSPACE_CARD` to your worktree path so it checks your branch instead of
the main checkout.

The unit tests run in a real Chromium. The end-to-end tests drive the hub's Home
Assistant; [`AGENTS.md`](AGENTS.md) explains how to run them.

## Pull requests

- PR titles must be [Conventional Commits](https://www.conventionalcommits.org/), for
  example `fix(grid): …` or `feat(labels): …`. CI checks the title against
  [`pr-title.yml`](.github/workflows/pr-title.yml), and `feat` and `fix` decide the
  next release number.
- Say which issue the PR closes, and include a screenshot for any visible change.
- A change to a service or WebSocket payload is one feature across two repositories.
  The integration lands first, then the card. See the hub's
  [`docs/CONTRACT.md`](https://github.com/Venosta-web/growspace_manager_workspace/blob/main/docs/CONTRACT.md).

By contributing you agree that your work is licensed under this repository's
[MIT License](LICENSE).
