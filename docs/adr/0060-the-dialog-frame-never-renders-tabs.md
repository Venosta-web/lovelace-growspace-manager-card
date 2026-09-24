# ADR 0060 — The Dialog Frame never renders tabs

**Status:** Accepted

## Context

Five dialogs each built their own horizontal tab bar inside the Dialog Frame
(`gs-dialog`) or their own `ha-dialog` chrome: add plant, logbook, harvest
scoring, strain library and Tissue Culture. Three were plain buttons with no
ARIA, so a screen reader could not tell they were tabs. Two declared
`tablist`/`tab`/`aria-selected`. None of the five handled the arrow keys.
Each also had its own look (#991).

The obvious fix is to give the Frame a `tabs` property. The card has already
tried that and deleted it. `base-dialog-layout` was a complete dialog shell
with a tab strip rendered from a `TabConfig[]`, `role="tablist"`,
`aria-selected` and a `tab-changed` event. In eight months it never had a call
site. `gs-dialog` replaced it because it wraps Home Assistant's own `ha-dialog`
and inherits its scrim, stacking, Escape and focus handling. The unused shell
was deleted in #915.

That shell could not have hosted the Tissue Culture dialog anyway. Its content
area was one slot, and a Frame that owns the tabs also decides what happens to
the panels below them. ADR-0055 requires TC's surfaces to stay mounted when a
tab is switched. Four of the other dialogs render only the active panel. A Frame
that owned tabs would have to pick one of those two panel models, or grow a
switch to support both.

## Decision

**The Dialog Frame never renders tabs.** `gs-dialog` keeps its header,
`header-extra` slot and a single content slot. Adding a `tabs` property or a tab
slot to it is out of bounds.

**A tabbed dialog places a Tab Strip (`gs-tab-strip`) at the top of its content
slot.** The strip is a standalone element. It owns the `tablist` and its tabs
and nothing below them:

- It renders `tabs` and `selected`, and it dispatches a plain, non-bubbling
  `tab-selected` event with `{ value }` when the user picks a different tab.
  Selection stays with the dialog's state machine, and the dialog may ignore
  the event.
- It holds no panels and has no panel slot. The dialog decides whether its
  panels render only while active or stay mounted, so both panel models work
  with the same strip.
- It is one Tab stop with a roving tabindex. ←/→ move between tabs and wrap,
  Home/End jump to the ends, and activation is automatic: moving to a tab
  selects it. This matches the config dialog's nav rail. Panels are cheap to
  show here, so selecting on focus costs nothing.
- It renders into its own light DOM and adopts its scoped stylesheet into the
  root it is connected in. ARIA ID references do not cross shadow boundaries,
  and the strain library's `aria-controls` on a tab and `aria-labelledby` on
  the panel must resolve in the dialog's tree. A tab's optional `controls` is
  set only while that tab is selected, because the strip cannot know whether
  an unselected tab's panel is in the DOM.

The strip covers horizontal tab bars only. The config and irrigation **nav
rails** and the **view switches** (snapshots' Captures / Vision Checkup,
genetics tree mode) are different patterns and do not use it.

## Consequences

All five dialogs expose real tabs, reachable and operable from the keyboard,
and they share one look and one implementation. No dialog keeps `.tab-bar` or
`.main-tab-bar` styles. A dialog styles only where the strip sits, such as its
inset or margin.

The strain library's maximize toggle was inside its tablist, where only tabs
belong. It now sits beside the strip in a row the dialog owns.

A dialog that later needs manual activation (arrow moves focus, Enter selects),
for example because a panel is expensive to render, needs a new option on the
strip. It must not get its own tab bar.
