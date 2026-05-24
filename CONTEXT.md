# Lovelace Growspace Manager Card — Domain Glossary

## Cards

**Growspace Manager Card** (`growspace-manager-card`)
The root dashboard card. Hosts the header, plant grid, and environment chart for a single growspace.

**Growspace Grid Card** (`growspace-grid-card`)
A standalone card showing only the plant grid for a growspace, without the header or chart.

**Growspace Subarea Card** (`growspace-subarea-card`)
A standalone card for a specific subarea within a growspace. Has its own hero section, chips, and env/device graph.

**Growspace Tank Card** (`growspace-tank-card`)
Displays live irrigation tank levels, fill visualization, depletion status, and time-to-empty.

**Growspace Analytics Card** (`growspace-analytics-card`)
Historical environment charts for a growspace.

**Growspace AI Insight Card** (`growspace-ai-insight-card`)
AI-powered cultivation insights and recommendations.

**Growspace Logbook Card** (`growspace-logbook-card`)
Event logbook with list and timeline views.

**Growspace Carousel Card** (`growspace-carousel-card`)
Cycles automatically through multiple selected growspaces.

## UI Structure

**Hero Card**
The large metric display at the top of the main card and subarea card. Shows an aggregated sensor value (e.g. temperature, VPD). Clicking a hero card opens the Env Graph for that metric. Implemented in `growspace-header-hero-ui.ts`.

**Chip** (also: Badge)
A small metric indicator rendered below the hero section. Each chip maps to a `HeaderChip` (defined in `metrics-utils.ts`) and carries a `MetricKey`. Clicking a chip opens the Env Graph for that metric. Chips support drag-and-drop reordering.

**Plant Grid Cell**
A single plant slot in the grid. Interactions (watering, selecting, transplanting) are driven by the store state machine — not generic Lovelace actions.

**Env Graph**
An inline historical chart that appears when a Hero Card or Chip is clicked, showing sensor data over time for that metric. Toggled via `_toggleEnvGraph` / `_toggleMetricGraph`.

**EnvSnapshot**
A normalized point-in-time view of a growspace's sensor values (temperature, humidity, vpd, light, etc.), exposed as an atom by the Environment slice. The single place that reads `hass.states` for environmental sensors. Cards and derived modules subscribe to it instead of reaching into `hass`.

**HeaderMetrics module**
Pure derived module that, given a `(growspaceId, viewContext)`, returns `{ hero, chips }` for rendering. `viewContext` is `'main' | 'subarea' | 'analytics'` — the main and subarea cards get both hero and chips; the analytics card gets chips only. Inputs are `EnvSnapshot`, plant state, and irrigation state — all atom-sourced. Replaces `MetricsUtils.computeHeaderMetrics()` and the per-card header wiring.

**Device Graph**
Variant of the Env Graph for device-type metrics (e.g. irrigation device state). Same toggle mechanism.

## Interaction Model

**Store-Driven Interaction**
Clicks on Plant Grid Cells dispatch actions through the nanostores-based UI store. The store manages selection, watering confirmation, and transplant mode as a state machine — owned by the [[GridInteraction slice]]. No generic Lovelace `tap_action` is used here.

**Graph Toggle Interaction**
Clicks on Hero Cards and Chips call `_toggleEnvGraph` / `_toggleMetricGraph`, which open or close the Env Graph inline. This interaction is internal to each card — not exposed as a Lovelace action.

## View Modes

**ViewMode** (`src/features/environment/constants.ts`)
Enum controlling the layout of the main card:
- `standard` — full dashboard (header + grid + chart)
- `compact` — grid only
- `header` — header only
- `heatmap` — grid with metric overlay

**GridOverlayMode**
When `ViewMode.HEATMAP` is active, overlays the grid cells with a colour gradient for a chosen metric (`temperature`, `humidity`, `vpd`, `bio_status`).

**LayoutSpec**
Declarative description of a ViewMode: `{ slots: ('header' | 'grid' | 'chart')[], overlay?: GridOverlayMode }`. A single `<growspace-view>` component reads the spec for the current ViewMode and renders the slots. HEATMAP is `{ slots: ['grid'], overlay: 'temperature' }` — a composition, not a sibling file. Adding a view mode is a config entry. Lives in the UI slice alongside ViewMode.

## Localization

**Translation Key**
A dot-separated string in the format `section.key`, resolved by the `localize()` function in `src/localize/localize.ts`. Language data lives in `src/localize/languages/`.

## Store

**GrowspaceDataStore**
Nanostores-based reactive store holding plant data, nutrient inventory, and irrigation config for a growspace. Uses lazy initialization — only activates when it has subscribers.

## Architecture

**Slice**
A vertical module keyed to a domain concept (Plant, Grid, Irrigation, Environment, Logbook, Strain, Camera, Subarea, AIInsight, GridInteraction, UI). A slice owns its nanostore atoms, its [[Mutator]]s, its zod schemas, and its hassCall sites. Cards import atoms (read) and mutators (write) from slices; they never reach into the HA `hass` object directly. Slices replace the older `store/{actions,atoms,dispatcher}` + `services/api/*API` split.

**Mutator**
An exported async function on a slice that wraps a single call to [[mutate]]. Example: `waterPlant(id, ml)` in the Plant slice. The mutator is the public write API of the slice; the [[Action]] it builds is private.

**Action**
The value passed to [[mutate]]: `{ type, payload, optimistic, inverse, apply }`. Slice provides what changes; the primitive owns when. Actions are not exported.

**`mutate` primitive**
Shared orchestrator that runs the action's optimistic update, calls `apply` (which goes through [[hassCall seam]]), records the `inverse` on the undo stack, and triggers sync. Replaces `undo-redo-manager.ts` + `sync-service.ts` as standalone services.

**hassCall seam**
The single transport seam to Home Assistant: `hassCall(command, params, schema)`. Lives in `services/`. Replaces the per-domain `*API extends BaseAPI` classes. Every backend call in the codebase goes through this one function; the schema is the contract.

**Cross-slice mutation**
A mutator that affects more than one slice's atoms (e.g. transplant touches Plant + Grid; harvest touches Plant + Logbook). Lives in the slice that owns the primary write and updates sibling atoms via small exported setters on those slices. The mutate primitive does *not* understand multi-slice atomicity — that's the slice author's responsibility.

**GridInteraction slice**
Owns the [[Store-Driven Interaction]] state machine for Plant Grid Cells as a discriminated-union atom: `idle | selected | confirming-water | transplanting`. Peer to Plant and Grid slices, not a subset of either. Cards subscribe to it for selection highlighting and confirmation UI.

## Irrigation

**Irrigation Mode**
The two mutually exclusive ways a growspace can receive water. Switched via a toggle in the Schedules tab of the Irrigation Dialog, saved immediately on toggle.

**Manual Schedule**
User-defined list of timed irrigation and drain events (`irrigationTimes`, `drainTimes`). Each entry has a time-of-day and a duration in seconds. Editable in the Schedules tab when Irrigation Mode is Manual.

**Crop Steering (VWC)**
Automated irrigation mode driven by volumetric water content (VWC) targets rather than a fixed schedule. When active, the backend fires shots dynamically based on soil moisture readings and phase logic; the frontend shows a read-only Phase Window bar instead of the editable schedule.

**Phase Windows** (P0 / P1 / P2 / P3)
The four daily phases that structure a Crop Steering day, all derived from the growspace's `IrrigationStrategy` settings:
- P0 — Activation: first shot(s) at lights-on, lasting `p0DurationMinutes`
- P1 — Ramp-up: shots fire until substrate reaches `targetVwcPercent`
- P2 — Maintenance: shots fire when VWC drops below `targetVwcPercent − maintenanceDrybackPercent`
- P3 — Dry-back: no irrigation; runs from `p2StopBeforeLightsOffMinutes` before lights-off until next lights-on

**Drain Schedule**
Time-based drain events that run regardless of Irrigation Mode. Always editable in the Schedules tab.

**Irrigation Dialog SM**
A single root state machine that owns the Irrigation Dialog's interaction state. Tab (`schedules | steering | logs | ...`) is the top-level state; each tab has substates for editing rows and pending confirmations (e.g. Phase Window changes). Tab switches are guarded by per-tab "dirty" predicates. The dialog component renders the SM; data writes go through the Irrigation slice's mutators. Replaces the 35 sibling `@state()` flags in `irrigation-dialog.ts`. The same shape applies to the Config, Strain Editor, and Strain Library dialogs — a `DialogStateMachine` helper is to be extracted on the second use, not the first.

## Light Cycle Tracking

An opt-in sub-feature of Crop Steering (`IrrigationStrategy.autoLightTracking`). When enabled, the backend listens for the light sensor's off→on transition and records the time as `detectedLightsOnTime` on the strategy. The VWC coordinator resolves lights-on time as `detectedLightsOnTime ?? lightsOnTime`. The user's manually configured `lightsOnTime` is never overwritten. The toggle and the `detectedLightsOnTime` read-out live in the Steering tab of the Irrigation Dialog.

## Photoperiod Flip

The event when a growspace's plants transition from veg (18h photoperiod) to flower (12h photoperiod), detected when `Plant.flower_start == today`. Triggers a HA notification and surfaces a **FlowerFlipChip** in the card header.

## FlowerFlipChip

A pulsing warning chip rendered to the left of the Optimal Conditions chip in the secondary chip strip. Visible from the day `flower_start` is reached for any plant in the growspace; persists until explicitly dismissed (dismiss keyed to `growspaceId + flowerStart`). Clicking it opens the Irrigation Dialog on the Steering tab with `lightsOnTime` scrolled into focus and pulsing with `var(--primary-color)`.

## Build

**`__VERSION__`**
Build-time constant injected by the bundler. Holds the card's semver version string for startup logging and diagnostics.
