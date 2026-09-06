# ADR 0055 — Tissue Culture surfaces stay mounted, and are not Tab Components

**Status:** Accepted (an exception to [ADR 0019](0019-decompose-dialogs-into-per-tab-viewmodel-adapters.md), which is otherwise unchanged)

## Context

Growspace Manager TC's user interface is a lazy chunk in this card
([TC ADR 0003]). Today it has one host: `growspace-tc-card`, a standalone
Lovelace card that mounts `growspace-tc-view` and lets it render its four
surfaces — Worklist, Cultures, Media, Pairings — stacked.

It is gaining a second host: a "Tissue Culture" item in the manager card's
three-dot menu, opening a tabbed dialog through the [[Growspace Dialog Host]].
The four tabs are the four surfaces the view already composes, so the view stays
the one component both hosts mount and gains a `surface?: TcSurfaceId` property
that selects among them.

[ADR 0019](0019-decompose-dialogs-into-per-tab-viewmodel-adapters.md) is the
house shape for a tabbed dialog, and it collides with that head-on. It requires
a [[Tab Component]] to be dumb — `.vm` in, [[Tab Intent]]s out, **no `@state()`
of its own** — with every draft in the [[DialogStateMachine]], and it states the
licence that follows: "a Tab Component owns nothing, so the [[Dialog Shell]] may
lazily render only the active tab and unmounting on tab-switch loses no draft."

TC's surfaces own a great deal. `growspace-tc-cultures` holds the Worklist and
the Culture Board together deliberately: one fetch of the culture lines, one
strain-library join, one clock the worklist is judged against, and one action
state either pane can open. The Culture Medium library owns an edit draft, a
pending delete and a save state. Unmounting a surface on tab-switch would drop
an in-progress Replate, a half-typed Culture Medium and a Pairing edit — and
the view latches its media fetch, so the data does not come back on remount.

Hoisting that state into a `TcDialogSM` to satisfy ADR 0019 has only two
outcomes, and both are worse. Either the surfaces fork from the standalone card,
which is the one thing the surfacing effort will not trade; or a dialog state
machine is pushed into a card that has no dialog.

## Decision

**A rendered TC surface stays mounted.** Selecting a tab hides the others; it
does not unmount them. Implement `surface` with `hidden`, not with a conditional
template branch. Mounting a surface lazily on its *first* visit is a legitimate
optimization; unmounting it afterwards is not. Across dialog *opens* the view is
created fresh, matching the standalone card.

TC's surfaces are therefore **not** Tab Components in ADR 0019's sense, and the
TC dialog is not a Dialog Shell over per-tab ViewModel adapters. ADR 0019
governs the internal decomposition of a dialog that owns its content — it says
so in its own second paragraph. TC's surfaces are not internal to this dialog:
they predate it and have a second host with no dialog, no shell and no state
machine.

The TC dialog's own state machine holds tab selection and nothing else. Its
per-tab states are empty, and its `confirm-discard` status is unreachable — the
shared view exposes no dirty signal, and the drafts such a guard would protect
are not the shell's to see.

The seam between the two hosts stays at `growspace-tc-view`'s property
interface, and the host owns everything outside it: chrome, geometry, scrolling,
tab selection, and what a plant link means.

## Consequences

Switching tabs in the TC dialog re-fetches nothing and loses no draft. That is
the property to assert in review, on the Culture Medium form and an open
maintenance action — not only on the board.

The card carries one tabbed dialog whose tabs do not look like the other six.
That is the cost, and it is why this is written down: a contributor
decomposing the TC dialog by the ADR 0019 recipe would break the standalone
card without noticing, because ADR 0019 reads like permission and the second
host is not visible from inside the dialog.

The TC dialog holds no TC draft state, so nothing that lives in the chunk has to
be reachable from `activeDialog$`, which is page-global. Tab switches and
sub-views write no page-global state, and a second manager card's dialog is
unaffected by the first's.

ADR 0019 is otherwise untouched. This is an exception for one dialog with a
second host, not a general licence for stateful tabs.

[TC ADR 0003]: https://github.com/Venosta-web/growspace_manager_tc/blob/main/docs/adr/0003-ui-is-a-lazy-chunk-in-the-existing-card.md
