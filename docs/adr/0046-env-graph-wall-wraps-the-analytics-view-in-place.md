# ADR 0046 — The Env Graph Wall wraps the analytics view in place

**Status:** Accepted
**Relates to:** #756 (this decision), #757 / #758 / #759 (the deferred v1 scope),
ADR 0030 (the Metric Descriptor seam the charts derive through),
ADR 0032 (the card task states that gate the toggle),
ADR 0036 (the portal token rule this decision avoids needing)

## Context

The [[Env Graph Wall]] shows every [[Open Env Graph]] at once, full screen, so a
grower can dedicate a browser tab to their environment graphs. Every other modal
in this card reaches the screen the same way: `growspace-manager-card.ts` creates
`growspace-dialog-host` with `document.createElement` and portals it out of the
card subtree, and each dialog renders inside that host.

The Wall does not, and two independent facts forced that.

### The analytics container has hosts that never mount the dialog host

`growspace-analytics` is rendered by three cards — the main card, the subarea
card, and the standalone analytics card. Only the first two mount
`growspace-dialog-host`. Routing the Wall through the portal would therefore ship
it on two hosts out of three, and the state the Wall toggles
(`activeEnvGraphs`) lives in the container all three share. Wrapping in place
ships it wherever the container renders, which is the correct scope by
construction rather than by three separate wirings.

### One instance of every chart, not two

The obvious portal shape is "render a second `<growspace-analytics-ui>` inside the
dialog". That is not a duplicate view, it is a duplicate *data client*:
`crop-steering-day-chart.ts` runs a `PollingController`, and `tank-water-chart.ts`
fetches `growspace_manager/get_tank_water_history` on connect. Two mounted copies
poll twice and fetch twice, for the whole time the Wall is open.

So the Wall must present the charts that already exist. It does this literally:
`growspace-analytics-ui` renders `<ha-dialog>` and `.graphs-container` as two
**static** siblings in one template — no child part wraps either — and
`_syncWallPlacement()` moves the `.graphs-container` node between the inline slot
and the dialog. Lit holds parts for the bindings *inside* that div, whose marker
nodes travel with it, so every chart element survives the move by identity. The
time-range row travels with them and becomes the overlay's sticky toolbar, which
is why the row is inside `.graphs-container` rather than beside it.

`tests/components/env-graph-wall.test.ts` asserts element **identity** across the
toggle, not element count. The distinction is the whole point: the naive
conditional wrapper — `fullscreen ? html`<ha-dialog>${inner}</ha-dialog>` : inner`
— keeps the count at two and fails the identity assertion, because changing the
top-level template structure makes Lit tear the subtree down and rebuild it.

## The risk that decided this, and how it resolved

Nesting a dialog inside a card's shadow root is normally the thing the portal
exists to avoid. `growspace-analytics` sits under
`div.unified-growspace-card.glass-surface.glass-panel`, which carries
`backdrop-filter: blur(24px)` **and** `overflow: hidden` — a containing block for
`position: fixed` and a clip. A fixed overlay nested under it is confined to a
450 px column.

Measured at `:8123` on Home Assistant 2026.8.2 before any code was written: the
overlay is **not** confined. On this frontend `ha-dialog` no longer wraps
`mwc-dialog`; it wraps `<wa-dialog>`, which renders a native `<dialog>` opened
with `showModal()`. The panel reports `:modal`, which means the top layer — and
top-layer promotion escapes ancestor containing blocks, ancestor clipping, and
every ancestor stacking context by specification. Probe, 1920×1080 viewport:

| | Box |
| --- | --- |
| Glass ancestor (`overflow: hidden`, `backdrop-filter`) | x 863, w 450 |
| Dialog panel, `width="full"` | x 48, w 1824 |
| Dialog panel, default width | x 670, w 580 |

The panel starts 815 px to the left of the box that supposedly clips it.

This is why there is **no** ADR-0036 token declaration here, and no portal. Top
layer changes paint order, not the DOM tree: the Wall's charts stay descendants
of the card, keep inheriting `variables.ts` through the flattened tree, and never
face the problem ADR 0036 exists to solve. Portalling to `document.body` was the
prepared fallback and is not needed; the fallback was never "a hand-rolled
`position: fixed` overlay", which the glass ancestor *would* have contained.

### Two API facts the same measurement turned up

`ha-dialog`'s mwc-era attributes are gone. The card's older dialogs still pass
`scrimClickAction` and `escapeKeyAction`; on this frontend the observed attributes
are `open`, `type`, `width`, `prevent-scrim-close`, `without-header`,
`flexcontent` and the header/aria names. The Wall uses the current ones.

`prevent-scrim-close` disables **Escape as well as** the scrim click — the spec
asks for scrim-click off and Escape on, so Escape is handled here. It is a
**capture-phase** listener on `window`, because wa-dialog stops the bubbling
keydown inside its own shadow root and a bubble-phase listener never sees it.
Measured, not assumed.

## Decision

The Env Graph Wall is `<ha-dialog width="full" without-header prevent-scrim-close>`
rendered by `growspace-analytics-ui` inside the card's own shadow root, wrapping
the one `.graphs-container` it already renders. `growspace-dialog-host` is not
involved.

`_fullscreen` is a `@state` on `growspace-analytics.container`, passed down as a
property. It is ephemeral by design and dies on reload (#757 revisits that as a
card config option, not as remembered UI state). The container closes it when the
Open Env Graph set empties, and when the right to show the toggle is lost — a
resize down to mobile must not strand a grower in an overlay whose exit control
has just been removed from the DOM.

The toggle is withheld — absent from the DOM, not hidden — on mobile
(`ResizeController.isMobile`: `max-width: 768px` **or** `pointer: coarse`) and
while any card task state is non-idle, so a provisional Metric Comparison or
Arrangement Draft cannot be buried under a modal mid-transaction. Those two
conditions are ANDed inline in the container; a named predicate with its own pure
test would be ceremony over two booleans.

`--gs-env-chart-height` (default `180px`) is new on `env-chart`'s
`.gs-env-chart-container` and is a **prerequisite, not styling polish**:
`env-chart` stretches a fixed 800×200 viewBox with `preserveAspectRatio="none"`,
so height is the only dimension that responds. Without it a 1440p Wall is six
postage stamps in a field of background. No separate ADR — small, obvious,
reversible. The crop-steering and tank charts compute their own SVG heights and
so do not read it; sizing them to the Wall is #758.

## Consequences

- The Wall ships on all three analytics hosts at once, including the standalone
  analytics card, because the state lives in the container they share.
- The card now has two ways a modal reaches the screen. The portal remains
  correct for `src/dialogs/` — those are card-level dialogs with no single owning
  subtree — and ADR 0036 continues to govern it unchanged.
- The move in `_syncWallPlacement()` is only safe while `<ha-dialog>` and
  `.graphs-container` stay **static** siblings. Wrapping either in a conditional,
  or interposing a directive, reintroduces the child part and silently restores
  the remount. The identity tests fail if that happens, which is what they are for.
- Two more raw English strings join the untranslated set in this view; neither
  `growspace-analytics-ui` nor `env-chart` calls `localize` today, and #759 tracks
  the sweep.
- The `ha-dialog` API drift recorded above is not confined to this feature. The
  older `scrimClickAction` / `escapeKeyAction` call sites in `src/dialogs/` are
  passing attributes this frontend no longer observes; that is out of scope here
  and unexamined, but it is now written down.
