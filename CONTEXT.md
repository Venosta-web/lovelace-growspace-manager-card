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

**Device Graph**
Variant of the Env Graph for device-type metrics (e.g. irrigation device state). Same toggle mechanism.

## Interaction Model

**Store-Driven Interaction**
Clicks on Plant Grid Cells dispatch actions through the nanostores-based UI store. The store manages selection, watering confirmation, and transplant mode as a state machine. No generic Lovelace `tap_action` is used here.

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

## Localization

**Translation Key**
A dot-separated string in the format `section.key`, resolved by the `localize()` function in `src/localize/localize.ts`. Language data lives in `src/localize/languages/`.

## Store

**GrowspaceDataStore**
Nanostores-based reactive store holding plant data, nutrient inventory, and irrigation config for a growspace. Uses lazy initialization — only activates when it has subscribers.

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

## Build

**`__VERSION__`**
Build-time constant injected by the bundler. Holds the card's semver version string for startup logging and diagnostics.
