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
A normalized point-in-time view of a growspace's sensor values, exposed as an atom by the Environment slice. The single place that reads `hass.states` for environmental sensors. Covers the full sensor set from the config dialog: air metrics (temperature, humidity, VPD, CO₂, DLI, optimal conditions), substrate/medium metrics (soil moisture, substrate temperature), and irrigation monitoring metrics (pH, feed EC, substrate EC, runoff EC, drain volume, irrigation flow, power, energy). Multi-sensor fields carry a `SensorReadings` object (`avg`, `perSensor`, `entityIds`) to support the "Multiple + per-sensor" chip display pattern. Cards and derived modules subscribe to it instead of reaching into `hass`.

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

## AI / Growmaster

**Growmaster Dialog** (`grow-master-dialog`)
The full-screen AI assistant modal. Contains four panels — Chat, Briefing, Inbox, and Settings — navigated via a side rail. Opened by the Growmaster button in the card header. The Settings nav item sits at the bottom of the rail, visually separated from the three content panels, using a gear icon and no color accent.

**Conversation Agent**
A Home Assistant entity in the `conversation` domain (e.g. `conversation.claude`, `conversation.openai`) that the Growmaster uses to generate responses. Stored as `assistant_id` in the integration's `ai_settings` config entry options. When none is configured, the briefing reports `ai_available: false` and both the Chat and Briefing panels display an inline `ha-entity-picker` so the user can select and save an agent without leaving the dialog.

**AI Enabled State**
Component-level boolean (`ai_enabled`) stored in the integration's `ai_settings` config entry options. Applies to all growspaces equally — it is not per-growspace. Fetched once via `growspace_manager/get_ai_status` when the card first connects to hass and stored in the `aiEnabled$` atom (`atom<boolean | null>(null)`; `null` = not yet fetched). Updated to `true` immediately when the user saves a Conversation Agent via `save_ai_agent`. Chat and Inbox panels read from `aiEnabled$` directly to gate their content and show the agent selector — they do not derive this from the per-growspace briefing. The Briefing panel reads `ai_available` from the briefing response instead, since it only renders after a briefing is fetched.

**AI Available**
`ai_available` field embedded in every `AIBriefing` response. Mirrors [[AI Enabled State]] but is carried per-briefing so the Briefing panel can gate its own content without a separate atom read.

**AI Briefing**
A snapshot generated by the backend (via the configured [[Conversation Agent]] or Bayesian fallback) and cached per-growspace in `aiBriefing$`. Contains `summary_text`, `headline`, `kpis`, `recommendations`, `confidence`, `drawn_from`, `generated_at`, and `ai_available`. The Briefing panel fetches it lazily on open and on explicit Regenerate. When `ai_available` is `false` the backend produced the summary from Bayesian binary-sensor data only; recommendations will be empty.

**Recommendation**
A single actionable item inside an [[AI Briefing]]. Carries `title` (one concise action line), `description` (1–2 sentences of reasoning), `impact` (`high` | `medium` | `low`), and an optional `suggested_action`. Impact reflects genuine urgency — `high` is the most urgent risk, `low` is the strongest positive signal. Tabs in the Briefing panel use impact as a filter: Risk Watch shows `high`, What's Going Well shows `low`, Morning Briefing shows all. Empty filtered tabs ("No high-impact risks flagged") are correct when everything is genuinely medium.

**Briefing Tabs**
The left rail of the Briefing panel lists four views scoped to the current [[AI Briefing]]: **Morning Briefing** (full view — all [[Recommendation]]s), **Risk Watch** (filtered to `impact: high`), **What's Going Well** (filtered to `impact: low`), and **7-day Forecast** (placeholder — predictive forecast not yet implemented).

**Growmaster Settings Panel**
The fourth panel in the [[Growmaster Dialog]], reached via the gear icon at the bottom of the nav rail. Exposes the nine user-facing fields from the integration's global `ai_settings` config entry options — all except `vision_debug_enabled`, which is a diagnostic flag reserved for the HA options flow. Fields are grouped into five sections: **Core** (`ai_enabled`, `assistant_id`), **Responses** (`notification_personality`, `max_response_length`), **Alerts** (`ai_auto_alerts`), **Vision** (`vision_checkup_enabled`), and **Briefings** (`briefing_interval_minutes`, `briefing_trigger_entities`, `ai_task_entity_id`). Changes are persisted via an explicit Save button rendered in the dialog footer when the Settings panel is active. The settings are global — they apply to all growspaces, not just the one the dialog was opened from.

**AI Settings Draft**
The in-flight, unsaved state of the [[Growmaster Settings Panel]] form. Lives in local component or atom state scoped to the dialog's lifetime. Draft values survive rail-tab switches within the same dialog session — switching from Settings to Chat and back preserves edits. The draft is discarded when the dialog closes. Nothing is written to the backend until the user explicitly hits Save.

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

**EC Ramp Curves**
Named, reusable curves that define how the target EC value should ramp over time (e.g. across a grow week range). Each curve is a list of `ECRampPoint` entries (week + target EC). Curves are stored globally (not per-growspace) and managed in the EC Ramp tab of the Irrigation Dialog. The tab is only visible when the growspace has a pump, an irrigation schedule, and at least one EC sensor. Saves are per-curve and immediate — curves do not participate in the Irrigation Dialog's unified footer Save.

**Irrigation Dialog SM**
A single root state machine that owns the Irrigation Dialog's interaction state. Tab (`schedules | steering | logs | ...`) is the top-level state; each tab has substates for editing rows and pending confirmations (e.g. Phase Window changes). Tab switches are guarded by per-tab "dirty" predicates. The dialog component renders the SM; data writes go through the Irrigation slice's mutators. Replaces the 35 sibling `@state()` flags in `irrigation-dialog.ts`. The same shape applies to the Config, Strain Editor, and Strain Library dialogs. The Config SM is the second use and the right moment to extract the shared `DialogStateMachine<TTab, TTabs>` generic type (type-level only — no shared runtime); the Config + helper land in the same PR. Strain Library and Strain Editor SMs land together because the library hosts the editor and their dirty predicates are coupled.

## Light Cycle Tracking

An opt-in sub-feature of Crop Steering (`IrrigationStrategy.autoLightTracking`). When enabled, the backend listens for the light sensor's off→on transition and records the time as `detectedLightsOnTime` on the strategy. The VWC coordinator resolves lights-on time as `detectedLightsOnTime ?? lightsOnTime`. The user's manually configured `lightsOnTime` is never overwritten. The toggle and the `detectedLightsOnTime` read-out live in the Steering tab of the Irrigation Dialog.

## Photoperiod Flip

The event when a growspace's plants transition from veg (18h photoperiod) to flower (12h photoperiod), detected when `Plant.flower_start == today`. Triggers a HA notification and surfaces a **FlowerFlipChip** in the card header.

## FlowerFlipChip

A pulsing warning chip rendered to the left of the Optimal Conditions chip in the secondary chip strip. Visible from the day `flower_start` is reached for any plant in the growspace; persists until explicitly dismissed (dismiss keyed to `growspaceId + flowerStart`). Clicking it opens the Irrigation Dialog on the Steering tab with `lightsOnTime` scrolled into focus and pulsing with `var(--primary-color)`.

## Grow Master Dialog

The AI assistant dialog (`grow-master-dialog`). Uses the Design A shell (sidebar rail + sticky header/footer, same structure as Config Dialog and Irrigation Dialog) with three modes switchable via the rail:

All three panels are scoped to the **single growspace** the dialog was opened from. Data from other growspaces is never shown.

- **Chat** — threaded multi-turn conversation backed by a `Conversation Thread`. Left rail shows only threads belonging to this growspace. Composer supports context chips (growspace, time range, sensors) and photo attachment via the existing image pipeline.
- **Briefing** — AI-generated summary scoped to this growspace ([[AI Briefing]]). Left rail lists briefing types and scope filters. Fetched lazily — cached value is reused if present; "Regenerate" forces a fresh fetch.
- **Inbox** — filterable list of [[Triage Alert]]s scoped to this growspace. Alerts are bucketed by Severity: `"danger"` → Action filter, `"warning"` → Watch filter, `"info"` → All only. Detail pane shows AI reasoning (when available) or Bayesian reasons, KPI snapshot, and suggested actions.

## Triage Alert

A persistent record created by the backend [[Alert Monitor]] when a Bayesian binary sensor (`stress` or `mold`) transitions off→on. Always carries Bayesian reasons; optionally enriched with AI reasoning when an AI assistant is configured. Wire format fields (as consumed by `TriageAlertSchema`): `id`, `growspace_id`, `type`, `severity`, `bayesian_reasons`, `ai_reasoning`, `timestamp` (Unix epoch int), `resolved`, `resolution_note`, plus optional `title`, `description`, `kpis`, `suggested_actions`, `snapshot_entity_id`.

**Severity** — the urgency level of a Triage Alert, computed by the backend at serialization time:
- `"danger"` — immediate action required (maps to the **Action** Inbox filter)
- `"warning"` — monitor closely (maps to the **Watch** Inbox filter)
- `"info"` — informational only (visible in **All** only)

Current mapping: `stress → danger`, `mold → warning`.

## Conversation Thread

A persistent record of a multi-turn dialogue in Chat mode. Fields: `thread_id` (UUID), `growspace_id`, `messages` (array of `ConversationMessage`), `pinned` (boolean, default false), `updated_at` (Unix ms — set on create and each `sendMessage`). Stored in the `conversationThreads$` atom (keyed by `thread_id`) and persisted to the backend via `growspace_manager/save_conversation_threads`. The active thread per growspace is tracked separately in `activeThreadId$` (keyed by `growspace_id`). Threads are hydrated from the backend each time the [[Growmaster Dialog]] opens.

**Thread retention is per-growspace:** at most `MAX_PINNED_THREADS` (10) pinned threads and `MAX_RECENT_THREADS` (20) unpinned threads are kept per growspace. Eviction is enforced on the frontend before each backend save — oldest unpinned threads (by `updated_at`) are dropped first. Pinned threads are never evicted. Attempting to pin beyond the cap triggers a toast error.

**Thread rail layout:** the Chat panel left rail shows two labeled sections — "Pinned" (only when ≥1 pinned thread exists) and "Recent" (unpinned threads). Pinned threads are sorted by `updated_at` descending within their section.

## Suggested Action Card

A UI element rendered inside an AI chat bubble when the backend returns a [[Suggested Action]]. Shows the action description, target entity, and two buttons: **Dismiss** (removes the card) and **Apply** (calls the HA service via the slice mutator). Only rendered when `suggestedAction` is present in the message.

## Testing

**Fixture Builder**
Domain-keyed test helpers in `src/testing/fixtures.ts` that construct canonical instances of domain types with sensible defaults. Builders: `aPlant(overrides?)` → `PlantEntity`; `aGrowspace(overrides?)` → `{ growspaceId, name, rows, cols }` (a lightweight seed, not a HA entity); `anEnvSnapshot(overrides?)` → `EnvSnapshot`. All builders accept `Partial<T>` overrides merged into defaults — tests express only the delta that matters.

**Card Test Harness**
A setup-eliminator in `src/testing/render-card.ts`: `renderCard(tag, { hass, growspace, atoms })` → `{ element, query, click }`. Hides `customElements.define`, `vi.mock`, `fixture`, and atom pre-seeding boilerplate. Returns generic DOM helpers only — domain-named helpers (`clickChip`, `expectEnvGraph`) are defined locally in each card's test file. Includes `aHass(overrides?)` — a helper that builds a HA-shaped `hass` object (states, callService, callWS, etc.) with sensible defaults for card mounting. `aHass` is infrastructure, not a domain fixture — it does not belong in the [[Fixture Builder]] family.

**Co-location Convention**
Pure module tests (state machines, slices, utilities — anything that does not call `fixture()`) live next to their source file as `src/foo/foo.test.ts`. Tests that mount Lit components via `fixture()` live in `tests/`. The split is enforced by the rule: *if it touches the DOM, it goes in `tests/`*. Applies to new test files only — existing tests are not migrated.

## Build

**`__VERSION__`**
Build-time constant injected by the bundler. Holds the card's semver version string for startup logging and diagnostics.
