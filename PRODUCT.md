# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Home growers who already run Home Assistant and want their tent managed from the
dashboard rather than from a spreadsheet or a separate grow app.

The card is published through HACS for other growers, so the primary user is a
**stranger installing it into their own dashboard** — their own theme, their own
sensor hardware, their own growspace layout, their own device mix. Design decisions must
survive installs whose configuration the author has never seen.

Two recurring situations shape the work:

- **At the tent, on a phone**, mid-task — logging a watering, moving a plant,
  checking whether the lights are still on. Short, interrupted, one-handed.
- **At a desk, on the dashboard**, reviewing — reading environment history,
  planning irrigation, comparing growspaces, adjusting configuration.

## Product Purpose

Give a grower a single, dashboard-native surface for the full plant lifecycle
(`seedling` → `veg` → `flower` → `dry` → `cure`), the environment around it, and
the equipment driving it — without leaving Home Assistant.

Success is that a grower can run the whole grow from the card: place and move
plants, log feed/water and IPM treatments, watch temperature, humidity, VPD and
CO2, manage irrigation and crop steering, and keep the strain/genetics record —
and that a fresh HACS install of it looks and behaves correctly on a dashboard
the author has never seen.

## Positioning

It is a **Lovelace card, not an app that happens to embed in Home Assistant.**
It renders inside the user's existing dashboard, alongside their other cards, and
inherits their environment rather than replacing it.

Its mechanism is the paired backend: the card is the frontend half of the
[Growspace Manager integration](https://github.com/Venosta-web/growspace_manager),
which owns persistence, the strain library, and the derived sensor logic. That
pairing is what lets the card show computed cultivation state (VPD status per
stage and day/night cycle, crop-steering phase, tank depletion, DLI) rather than
just re-plotting raw sensor entities — which is the ceiling for a generic
dashboard card.

## Operating Context

- Runs inside a Home Assistant dashboard, in whatever theme the user has set.
- **The Home Assistant companion app is a first-class target.** The card must
  work in the mobile webview, not only in a desktop browser. Layout adapts to a
  list view on narrow screens.
- Multiple growspaces are normal. Several cards from this repo can appear on one
  dashboard at once (main card, grid, subarea, tank, analytics, AI insight,
  logbook, carousel), and a carousel can cycle through growspaces.
- The card ships as a family of cards, each independently placeable:
  `growspace-manager-card` (header + grid + chart), plus grid, subarea, tank,
  analytics, AI insight, logbook, and carousel cards. **This is the permanent
  shape of the product** — there is no dedicated Home Assistant panel or
  dashboard view, and none is planned. Every surface must work as a card the user
  places themselves.
- Interaction model already established and not to be broken casually: click an
  empty grid slot to add a plant, click a plant to manage it, drag to move
  (desktop) or use the Move action (mobile), `Shift`+click for multi-select,
  arrow keys to navigate the grid, `Enter`/`Space` to select, `Delete` to remove.
  Chips and hero metrics are clickable and open an inline graph.
- Some work happens in an explicit **task mode** rather than in direct
  manipulation: `arrange`, `compare`, and `select_plants` take over the card with
  a task bar and a draft state that is committed or discarded as a unit
  (`src/features/tasks/`, ADR 0032). A task mode constrains what the rest of the
  card can do while it is active.
- Strain import reaches an **external strain database over the network**
  (`query_external_strain`, `get_external_strain_details`,
  `download_strain_image`, all via the integration). That path can be slow,
  rate-limited, or unavailable in a way the rest of the card is not.

## Capabilities and Constraints

Confirmed capabilities (see `README.md` for the user-facing list and `CONTEXT.md`
for the domain glossary, which is the authority on terminology):

- Plant grid with drag-and-drop placement, batch actions, and an undo/redo stack.
- Task modes (`arrange`, `compare`, `select_plants`) that hold a draft layout or
  selection and commit or discard it as a unit.
- Lifecycle tracking, cloning, harvest scoring, breeder/genetics records, plus
  strain import from an external strain database.
- Environment monitoring — temperature, humidity, VPD, CO2, light-cycle history,
  inline historical charts per metric.
- Irrigation, tank levels, and crop steering, including a steering-phase chip
  that is promoted into the hero deck when VWC steering is active.
- IPM treatment tracking with presets.
- An AI assistant ("Grow Master") for stress diagnosis and cultivation advice.
  It requires the user to configure their own AI provider in the integration, so
  **"AI not configured" is an ordinary state**, not an error — the AI insight card
  and chat panel must both read sensibly before a provider exists.
- Configuration through an in-card config dialog, plus the Lovelace card editor.

Binding constraints future design work must preserve:

- **The backend is the source of truth.** The card renders WebSocket view models
  supplied by the integration. A field that exists only on a Home Assistant
  sensor entity is invisible to the card — new data must be threaded through the
  integration payload before any UI can show it.
- **The live bundle is the HACS-installed one**, not `config/www`. Design and
  visual QA must target the artifact users actually run.
- **The card runs in an insecure context.** A typical Home Assistant instance is
  served over plain HTTP, so `crypto.randomUUID`, the async clipboard API, and
  `SubtleCrypto` are `undefined` at runtime even though they resolve fine in
  localhost tests. Never introduce a UI affordance that depends on them without
  a guarded fallback.
- The card must degrade sanely when the integration is missing, an entity is
  unavailable, or a growspace has not been selected — these are ordinary states
  in other people's installs, not edge cases.
- Terminology is fixed by `CONTEXT.md` (Hero Card, Chip, Env Graph, Plant Grid
  Cell, Steering Phase Chip, and so on). Use those names; do not coin synonyms.

## Brand Commitments

- Name: **Lovelace Growspace Manager Card**.
- Brand assets exist in `brand/` — `logo.png`, `icon.png`, and dark-mode and @2x
  variants. Use these rather than generating new marks.
- An incumbent visual world is already recorded in `DESIGN.md` (dark carbon
  surfaces, Vitality Green primary, Hydro Blue secondary, amber light-cycle
  accent, Roboto). `SITE.md` names the aesthetic "Glass & Garden" — glassmorphism
  over a dark shell. Treat this as the existing identity; it is documented in
  `DESIGN.md`, not here.

## Evidence on Hand

- `README.md` — feature inventory, requirements, interaction guide, and a link to
  a hosted mockup demo.
- `CONTEXT.md` — domain glossary; the authority on card and concept names.
- `SITE.md` — original vision statement and audience note.
- `DESIGN.md` — the incumbent design system.
- `docs/adr/` — architecture decision records; `docs/plans/` — feature plans.
- `brand/`, `assets/screenshots/` — logos, icons, and captured screenshots.

Absences future work must not paper over: there are **no testimonials, no user
or install counts, no case studies, no press, no pricing, and no benchmarks.**
Do not invent them. The project is MIT-licensed and free; any "trusted by" or
adoption claim would be fabricated.

## Product Principles

1. **Dashboard citizen, not a takeover.** The card sits among other Lovelace
   cards in someone else's dashboard. It earns its space; it does not assume it.
   The card frame is the permanent container — a feature that only works given a
   full-screen panel is a feature this product cannot have.
2. **Design for the install you have never seen.** Unknown themes, unknown
   sensors, missing entities, and unconfigured growspaces are the normal case.
3. **Phone at the tent is the hard case.** If an action is awkward one-handed on
   the companion app, it is not finished.
4. **Show cultivation state, not sensor readings.** The value is derived,
   stage-aware meaning (VPD status, steering phase, time-to-empty), which is what
   the paired backend exists to provide.
5. **Backend first, UI second.** Any new field is a round trip: integration
   payload, then view model, then card. Skipping a leg produces an invisible
   feature.

## Accessibility & Inclusion

**WCAG 2.1 AA is the project target** — 4.5:1 for body text, 3:1 for large text
and non-text UI (icons, outlines, focus rings). The card inherits the user's Home
Assistant theme, which may flip the shell to a light surface, so passing only
against the card's own dark ground does not satisfy the target. `DESIGN.md` holds
the measured ratios and the documented exceptions.

Product-specific needs already reflected in the code, to be preserved:

- Full keyboard operation of the plant grid (arrow keys, `Enter`/`Space`,
  `Delete`), so the grid is not mouse-only.
- `prefers-reduced-motion` is honoured (`DESIGN.md` records how coverage is
  achieved across the shadow-DOM boundary).
- Touch targets meet WCAG 2.5.8.

Localization goes through `src/localize/`; English (`en.json`) is the only shipped
language today, but **multi-language support is a commitment, not a maybe** —
English is simply first, so string lengths and copy constructions cannot be
treated as fixed. New user-facing strings belong in `src/localize/`, never
inline. RTL is not supported today.
