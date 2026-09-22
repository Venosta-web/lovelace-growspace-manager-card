# ADR 0057 — TC presence is one probe per page, answered for the page's lifetime

**Status:** Accepted

## Context

Home Assistant tells a Lovelace card nothing about which custom integrations are
installed. To know whether Growspace Manager TC is there, the card asks TC's own
WebSocket namespace for a manifest and reads the answer: a manifest means
installed, loaded and ready; `unknown_command` means not installed; `not_loaded`
means installed with its entry unloaded; anything else means unreachable. Every
failure collapses to `absent`.

`detectTc()` in `src/slices/tc` already does this once per page and caches the
promise, because several cards on one dashboard must not each open the same
round trip. Until now the only consumer was `growspace-tc-card`, which hides
itself when the answer is `absent` — a card the user placed on a dashboard
themselves, so a wrong answer is visible to exactly one person who was already
looking for it.

The Tissue Culture menu item changes the stakes. It appears in the manager
card's three-dot menu on every dashboard, for every user, and its absence is the
normal state for almost all of them. "I installed TC and the menu item is not
there" is now a plausible bug report, and the obvious fixes — poll, re-probe on
reconnect, invalidate on a config-entry event — are all wrong.

## Decision

**One probe per page load, shared by every host, and the answer stands for the
lifetime of the loaded page.** Browser reload is the only recheck.

- The TC slice owns `tcPresence$`, the cached promise and `detectTc()`, and
  remains the sole production writer. No second probe, no per-card presence
  store, no new bootstrap controller.
- The manager card initiates detection from `BootstrapController.updateHass`
  immediately after `setHass`. It does not wait for growspace hydration, does
  not block card loading, and does not repeat on entity updates. The standalone
  card calls the same operation.
- The header subscribes through a typed nanostores `StoreController`. A bare
  `.get()` at render time is insufficient: the item must appear when the probe
  resolves on an otherwise idle dashboard.
- The menu item is visible exactly when `status === 'present'`, and absent while
  the status is `unknown`.
- **A transient failure is cached too.** So is a stale positive; a cached
  `present` is not a promise that later requests succeed, and those requests use
  their own error handling rather than rewriting presence.
- `resetTcPresence()` stays test-only.

A valid manifest with no features this card supports still shows the item, and
opens an explanatory compatibility state inside the shared TC view. Presence is
"can we talk to TC at all", not "does TC offer anything"; the view owns the
feature knowledge, and each surface keeps its own feature gate.

Presence is **not** dialog payload. ADR 0027 isolates growspace selection and
dialog targeting; presence is installation state shared by every card on the
page, selects no growspace and opens no dialog.

Say "available at the last probe" when explaining this. "Installed" alone is
inaccurate — an installed but unloaded entry cannot serve the view.

## Consequences

Installing or removing TC needs a browser reload before the menu item follows.
That is deliberate, and it is the sentence to quote when the bug report arrives.
It is also nearly free: adding or removing an integration is already a
Home Assistant restart away from the browser.

A dashboard that probed during a WebSocket hiccup shows no TC until reload, and
we accept it. The alternative is a probe that can fire repeatedly on every
dashboard that will never have TC, which is the cost this contract exists to
avoid.

Two hosts and one answer: a dashboard carrying both a manager card and a
standalone TC card opens one round trip, and the two surfaces cannot disagree
about whether TC is there.
