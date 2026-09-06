# Dialogs Carry the Portal That Opened Them

**Status:** Accepted

## Context

`activeDialog$` is one page-global atom. Every `growspace-manager-card` and every
`growspace-grid-card` mounts its own `growspace-dialog-host` portal against it
(`growspace-manager-card.ts:192-197`, `cards/growspace-grid-card.ts:281-285`), so
two of those cards on one dashboard — two carousel cards, or a manager card
beside a grid card — render the same dialog twice, stacked.

The host has carried a test since #440 that was believed to prevent this:

```ts
// activeDialog$ is a global singleton shared by every growspace-manager-card
// instance, each of which mounts its own dialog-host portal. …
if (active.type === 'IRRIGATION' && payloadGrowspaceId &&
    !devices.some((d) => d.deviceId === payloadGrowspaceId)) {
  return html``;
}
```

It cannot separate two portals. `devices` is `store.grid.$activeDevices`, and
`makePerCardGridSlice()` computes that from the page-global `devices$`, filtering
only optimistically deleted plants (`slices/grid/index.ts:304-322`); only
`$selectedDevice` is per-card. Every portal's `devices` therefore contains every
growspace, every portal passes the test, and nothing is suppressed. It is a
**device-ownership** test — genuinely useful before hydration, or for a portal
whose collection lacks the growspace — not an **instance** test, and its comment
claimed a guarantee the code never provided. The unit tests passed because they
constructed a portal owning `gs-1` against a payload naming `other-growspace`, a
state a real dashboard does not reach (#913).

The Tissue Culture dialog specified in the workspace hub's map
(`Venosta-web/growspace_manager_workspace#149`, #155) hit the same wall from the
other side: it is not growspace-scoped, so it has no growspace to discriminate on
even in principle.

## Decision

**A dialog that must appear once captures the opening card's portal identity in
its open payload, and only that portal renders it.**

This is [ADR-0027](0027-dialogs-carry-target-growspace.md)'s
own principle — bind at open time, never re-derive from ambient page state —
applied to portal identity instead of growspace identity.

1. `GrowspaceStore` gains a `readonly instanceId`, minted per instance. One store
   is created per card and handed to both that card's subtree (through the store
   context) and that card's portal, so the store instance *is* the portal
   identity.
2. Openers take an optional `portalId` and callers pass `store.instanceId`.
   Adopted here by the irrigation dialog: `openIrrigationDialog` and
   `toggleEnvGraph`'s `crop_steering` branch, called from the header and
   analytics containers.
3. The host's guard is **generic over dialog type** — it reads `portalId` off
   whatever payload is active, so a dialog adopts portal identity by having its
   opener set the field, with no new branch in the host.

### Absent, or naming a portal nobody has, renders everywhere

A dialog that opens nowhere is worse than one that opens twice, so both of those
fail open to the pre-identity behaviour.

The second case is not hypothetical. Seven cards provide the store context
(`growspace-manager-card`, grid, analytics, subarea, tank, logbook, AI-insight)
and only the first two mount a portal, so an opener reached from an analytics or
subarea card — the crop-steering chip is exactly that — names a portal that does
not exist. Suppressing on a bare id mismatch would make that click do nothing.

Deciding this needs one page-global fact the host cannot get from its own store:
which portals are mounted. `slices/ui/dialog-portals.ts` holds it, hosts register
themselves in `connectedCallback`, and `portalOwnsDialog(hostId, payloadId,
mounted)` is the whole rule. The registry is a nanostores atom and the host
subscribes to it, because portals mount **lazily on the first dialog open**: a
click in a card whose portal does not exist yet is first rendered by the sibling
portal, and only the subscription makes that sibling stand down when the named
portal arrives a tick later.

## Considered Options

- **Have each portal-mounting card mark its own store as a portal owner**, and
  let openers pass `portalId` only from such a store. Rejected: it moves the
  page-global fact into a flag every future portal-mounting card must remember to
  set, and a card that forgets is a portal no sibling ever stands down for —
  silent, and indistinguishable from the bug this ADR fixes.
- **Elect one portal** (say, the first mounted) to render every dialog, with no
  token at all. Rejected: it renders a card's dialog inside another card's
  portal, which quietly re-introduces the ambient-state coupling ADR-0027 removed
  — the rendering host's own store supplies fallbacks the opener never chose.
- **Make `$activeDevices` per-card so the existing guard starts working.**
  Rejected: it is the wrong seam. Growspace collections are page-global on
  purpose, the guard would still say nothing about dialogs that are not
  growspace-scoped, and two cards showing the same growspace would still stack.

## Consequences

- **Adoption is per dialog.** Only the irrigation dialog names its portal today;
  the other twenty-three still render in every portal, exactly as before. Each is
  a one-line opener change when it is wanted, and the TC dialog will land already
  carrying the field.
- The device-ownership test stays, with a comment that says what it does.
- `PortalScopedDialogState` in `lib/types/dialog.ts` is the field's one
  declaration; a payload adopts it by extending that interface.
