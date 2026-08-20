# Route dialog gesture→mutation through a MutationRunController so failure-handling cannot be forgotten

A user gesture in a dialog becomes a [[mutate]] / `_dataService` call through a bespoke `async` event handler. Lit never awaits a handler's returned promise, so the seam between "click" and "mutation" has no adapter: each handler individually owns (a) catching the rejection, (b) routing the error to a toast, and (c) flipping an in-flight flag. The interface — an `@click` binding — gives no signal that the body is async and can reject. When a handler omits the `try/catch`, the rejection escapes as an unhandled promise rejection (in tests, and in production as a failed save with no user feedback), and any `applying` flag is left stuck.

This was not hypothetical. Four `irrigation-dialog.ts` handlers (`_saveSettings`, `_handleRunNow`, `_saveEditedIrrigationTime`, `_saveEditedDrainTime`) awaited slice mutators with no `catch` while their siblings (`_saveStrategy`, `_saveDrainConfig`) had one — surfacing five unhandled rejections and two false-positive tests (which only passed because the rejection vanished silently). The newer dialog SMs (`inbox-panel-sm.ts`, `crop-steering-dialog-sm.ts`) route through `Requested → applying → SaveResolved/SaveFailed` events, but the `await` and `try/catch` still live **in the handler** — so they buy consistency, not enforcement; a new handler can still forget the `catch`.

Applying the deletion test to the per-handler `try/catch`: deleting it does not concentrate complexity, it makes it **reappear** across ~18 irrigation handlers (and every future one), each re-deriving the same catch-and-toast policy. That is the signal the policy belongs behind one deep module.

## Decision

Introduce **`MutationRunController`** (`src/dialogs/mutation-run-controller.ts`), a Lit `ReactiveController` that owns the gesture→mutation seam:

- Handlers become **synchronous** and contain no `await`: they only dispatch an intent, e.g. `this.dispatch({ type: 'SaveRequested', action: 'save-settings', params })`.
- The shared [[DialogStateMachine]] `status` is extended to carry the in-flight mutation:
  `{ kind: 'idle' } | { kind: 'confirm-discard'; pendingTab } | { kind: 'applying'; action; params }`.
- On `hostUpdated`, the controller reads `host.sm.status`; when it is `applying` and no effect is in flight, it runs `host.effects[status.action](status.params)`, then dispatches `SaveResolved` (→ `idle` + `SET_TOAST` success) or `SaveFailed` (→ `idle` + `SET_TOAST` error). An in-flight guard prevents re-render from double-firing.
- **Effect params travel in the status**, not in component closures. Several handlers (the irrigation inline-edit ones) read sub-state and then `CANCEL_INLINE` *before* the mutation would run; a post-render closure would read cleared state. Carrying params in `applying { action, params }` removes that race and keeps the SM + controller runnable — and testable — from state alone. Effects are a `Record<Action, (params) => Promise<void>>` exposed by the host; the `transition` function stays pure (no side effects).

Because handlers contain no `await`, it is **structurally impossible** to leak a rejection or strand an `applying` flag — the controller is the only place the mutation runs and the only place failure is handled.

Failure surfaces as a **transient toast** (`SaveFailed → idle + SET_TOAST`), matching the existing `_showErrorToast` UX. No persistent `error` status / retry affordance in this iteration.

Scope of the first build: the controller + the `status` contract extension, plus migrating **`irrigation-dialog.ts`** (the worst offender, ~18 sites) as the reference implementation. `config-dialog`, `crop-steering`, `inbox`, and `breeder` adopt the pattern incrementally afterward.

## Considered alternatives

- **Disciplined-imperative everywhere (B1)** — generalise what Inbox/Crop-Steering already do via a `runSaving(action, fn)` helper called *from* the handler. Smaller, but the `await` still lives in the handler, so a bare uncaught `await` remains writable; enforcement would rely on a lint rule. Rejected: it standardises the shape without removing the forgettable seam.
- **Thin handler wrapper `runDialogAction(fn, {errorToast})`** — one wrapper each handler is wrapped in. Same flaw as B1: a convention you must remember to apply; the interface still doesn't force it.
- **`withToast` + ESLint ban on bare `await <mutator>` in `@event` bindings** — enforcement via tooling against the global `notification$` surface. Rejected: abandons the SM-owned `toast`/`status` surface several dialogs rely on (which can disable Save while applying and render inline state), and a lint rule is weaker than a structural seam.
- **Elm-style `transition` returning `[sm, Cmd[]]`** — pure effects-as-data. Rejected for now: changes the signature of the `transition` function shared by every dialog SM; the `ReactiveController` reading `applying` from `status` achieves the same un-forgettability with a far smaller blast radius.

## Consequences

- The shared `DialogStateMachine` interface gains an `applying { action; params }` `status` variant; the three current implementers (`Irrigation`, `Config`, `Crop Steering` SMs) must widen their `status` union. Dialogs render `applying` by disabling their primary action.
- `irrigation-dialog.ts` handlers lose their `async`/`await`/`try-catch` bodies and become one-line `dispatch` calls; the actual mutators move into the host's `effects` map keyed by action.
- The seam becomes the test surface: assert once that a rejecting effect produces `SaveFailed` + an error toast, instead of re-testing that each handler doesn't leak (the false-positive trap from the irrigation diagnosis).
- One adapter (irrigation) makes this a hypothetical seam until a second dialog migrates; the second migration (likely `config-dialog`) validates the abstraction.
