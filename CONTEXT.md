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
The large metric display at the top of the main card and subarea card. Shows an aggregated sensor value (e.g. temperature, VPD). Clicking a hero card opens the Env Graph for that metric. Implemented in `growspace-header-hero-ui.ts`. Each hero item is itself a [[Chip]] (carries a `MetricKey`), so it can be hidden via `hidden_chips` the same way a regular chip can — there is no separate hero-specific visibility setting. When every hero metric is hidden, the hero deck collapses entirely rather than rendering empty.

**Chip** (also: Badge)
A small metric indicator rendered below the hero section. Each chip maps to a `HeaderChip` (defined in `metrics-utils.ts`) and carries a `MetricKey`. Clicking a chip opens the Env Graph for that metric. Chips support drag-and-drop reordering.

**Steering Phase Chip**
A [[Chip]] that appears in place of the regular irrigation next-time chip when [[Crop Steering]] is active. Carries `MetricKey.STEERING_PHASE` (`'steering_phase'`) — distinct from `MetricKey.IRRIGATION` — so it can be hidden independently via `hidden_chips`. Displays the active phase label and next phase-transition time (e.g. `P3 · 07:30`). Built by `_steeringChipValue()` in the [[HeaderMetrics module]].

When [[Crop Steering (VWC)]] is active, this chip moves out of the secondary strip and is *promoted to the hero deck* — it does not appear in both places (rendered alongside the env-metric hero chips, not in the secondary strip). It is a "special" hero item: clicking it follows [[Custom Graph Routing]] — instead of toggling the standard inline [[Env Graph]], it opens the [[Crop Steering Day Chart]] inline, in the same graph slot.

**Context Chip**
A tag attached to a composed message that provides contextual scope — growspace, time range, or sensor — so the [[Conversation Agent]] can ground its response. Displayed in the Composer bar of the [[Growmaster Dialog]] Chat panel; removable individually. Distinct from the environment metric Chip in the header.

**Plant Grid Cell**
A single plant slot in the grid. Interactions (watering, selecting, transplanting) are driven by the store state machine — not generic Lovelace actions.

**Env Graph**
An inline historical chart that appears when a Hero Card or Chip is clicked, showing sensor data over time for that metric. Toggled via `_toggleEnvGraph` / `_toggleMetricGraph`.

**EnvSnapshot**
A normalized point-in-time view of a growspace's sensor values, exposed as an atom by the Environment slice. The single place that reads `hass.states` for environmental sensors. Covers the full sensor set from the config dialog: air metrics (temperature, humidity, VPD, CO₂, DLI, optimal conditions), substrate/medium metrics (soil moisture, substrate temperature), and irrigation monitoring metrics (pH, feed EC, bulk EC, pore EC, runoff EC, drain volume, irrigation flow, power, energy). Multi-sensor fields carry a `SensorReadings` object (`avg`, `perSensor`, `entityIds`) to support the "Multiple + per-sensor" chip display pattern. Cards and derived modules subscribe to it instead of reaching into `hass`.

**HeaderMetrics module**
Pure derived module that, given a `(growspaceId, viewContext)`, returns `{ hero, chips }` for rendering. `viewContext` is `'main' | 'subarea' | 'analytics'` — the main and subarea cards get both hero and chips; the analytics card gets chips only. Inputs are `EnvSnapshot`, plant state, and irrigation state — all atom-sourced. Replaces `MetricsUtils.computeHeaderMetrics()` and the per-card header wiring.

**Device Graph**
Variant of the Env Graph for device-type metrics (e.g. irrigation device state). Same toggle mechanism.

## Interaction Model

**Store-Driven Interaction**
Clicks on Plant Grid Cells dispatch actions through the nanostores-based UI store. The store manages selection, watering confirmation, and transplant mode as a state machine — owned by the [[GridInteraction slice]]. No generic Lovelace `tap_action` is used here.

**Graph Toggle Interaction**
Clicks on Hero Cards and Chips call `_toggleEnvGraph` / `_toggleMetricGraph`, which open or close the Env Graph inline. This interaction is internal to each card — not exposed as a Lovelace action.

**Chip Graph Linking**
Dragging one Chip onto another calls `store.history.linkGraphs(source, target)`, which groups the two metrics so their Env Graphs open together. This is not a visual chip reorder — no chip position state exists. In the test harness `CardHandle`, this interaction is exposed as `linkChips(from, to)` (not `dragChip`) to accurately reflect the domain behavior rather than the DOM gesture.

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
The fourth panel in the [[Growmaster Dialog]], reached via the gear icon at the bottom of the nav rail. Exposes the user-facing fields from the integration's global `ai_settings` config entry options — all except `vision_debug_enabled` (diagnostic, reserved for the HA options flow) and `ai_auto_alerts` (moved to the [[Notifications Tab]]). Fields are grouped into four sections: **Core** (`ai_enabled`, `assistant_id`), **Responses** (`notification_personality`, `max_response_length`), **Vision** (`vision_checkup_enabled`), and **Briefings** (`briefing_interval_minutes`, `briefing_trigger_entities`, `ai_task_entity_id`). Changes are persisted via an explicit Save button rendered in the dialog footer when the Settings panel is active. The settings are global — they apply to all growspaces, not just the one the dialog was opened from.

**AI Settings Draft**
The in-flight, unsaved state of the [[Growmaster Settings Panel]] form. Lives in local component or atom state scoped to the dialog's lifetime. Draft values survive rail-tab switches within the same dialog session — switching from Settings to Chat and back preserves edits. The draft is discarded when the dialog closes. Nothing is written to the backend until the user explicitly hits Save.

## Localization

**Translation Key**
A dot-separated string in the format `section.key`, resolved by the `localize()` function in `src/localize/localize.ts`. Language data lives in `src/localize/languages/`.

## Store

**GrowspaceDataStore**
Nanostores-based reactive store holding plant data (devices, strain library, config) for a growspace. Uses lazy initialization — only activates when it has subscribers. Nutrient domain data (presets, IPM presets, inventory, EC ramp curves) has been migrated to the [[Nutrient Slice]] and is no longer stored here.

## Environment Control

**Circulation Fan Controller**
The backend closed-loop controller (`CirculationFanCoordinator`) that automatically regulates circulation fan speed to a target value. Configured via `CirculationFanConfig` (a sub-object of `EnvironmentConfig`). The controller polls every 10 seconds, reads the active sensor, linearly maps the error to a fan speed between `min_speed` and `max_speed`, and optionally overlays a sinusoidal wind effect. Enabled/disabled independently of the circulation fan entity list — the entities may be assigned without the controller being active. Distinct from exhaust fan control, which is not closed-loop.

**Fan Regulation Mode**
The control variable the [[Circulation Fan Controller]] targets: `vpd`, `humidity`, or `temperature`. Exactly one mode is active at a time; switching mode changes which target+tolerance pair is used. In VPD mode, a temperature override (critical_temp_low / critical_temp_high) can override the computed speed to min or max when the measured temperature leaves a safe band. The override fields are only evaluated in VPD mode.

**Fan Controller Panel**
The config dialog panel (inside the Climate tab, between the Climate Control panel and the Humidity Control panel) that exposes all `CirculationFanConfig` fields: enabled toggle, regulation mode selector, active-mode target+tolerance pair, VPD-mode-only temperature override sub-section (collapsed by default), min/max speed, dynamic wind settings (period + amplitude revealed when wind_enabled is toggled on), and — when Stage-Aware VPD is on — the [[Stage VPD Overrides Table]]. Disabled fields are greyed out when `enabled` is false, not hidden. Submitted as part of the existing `configure-environment-submit` event; the dialog host dispatches the `configure_circulation_fan` HA service call separately from `configure_environment`.

**Fan VPD Stage**
The nine stage keys used exclusively by the [[Stage VPD Overrides Table]] and the backend's `FAN_VPD_STAGE_DEFAULTS`: `seedling`, `clone`, `mother`, `veg`, `flower_early`, `flower_mid`, `flower_late`, `dry`, `cure`. Distinct from `PlantStage` (the 7-value plant lifecycle enum used on `PlantEntity.stage`): `PlantStage` has a single `flower` value, whereas Fan VPD Stage splits flower into three sub-stages. Do not use `PlantStage` for VPD override keys — the string values don't match.

**VPD Optimal Overrides Table**
A standalone component (`<vpd-optimal-overrides-table>`) for editing per-stage VPD optimal windows. Has four values per stage: `day.low`, `day.high`, `night.low`, `night.high`. Works with `VpdOptimalOverrides` (`Record<string, { day: { low, high }, night: { low, high } }>`). Unoverridden stages display values from `VPD_OPTIMAL_STAGE_DEFAULTS` (mirroring the backend's primary `VPD_OPTIMAL_THRESHOLDS` ranges keyed through `_OVERRIDE_STAGE_MAP`). Emits `overrides-change` on any edit or reset. Distinct from [[Stage VPD Overrides Table]], which holds a single `{day, night}` target per stage for the fan controller.

**Stage VPD Overrides Table**
A sub-component (`<stage-vpd-overrides-table>`) rendered inside the [[Fan Controller Panel]] only when `stage_vpd_enabled` is true. Displays one row per [[Fan VPD Stage]] (9 rows total), each with a Day and Night number input (min 0.1, max 3.0, step 0.01). Inputs are pre-populated from `stage_vpd_overrides` when an override exists, or from the local `FAN_VPD_STAGE_DEFAULTS` const otherwise. Every input change writes the full `{ day, night }` pair for that stage into the local overrides draft (sparse — only edited stages are present). Clearing an input snaps that slot back to the `FAN_VPD_STAGE_DEFAULTS` value for that stage while preserving the other slot's override. A "Reset all to defaults" button clears the entire overrides draft and re-renders from defaults; it does not persist until the user saves the dialog. Toggling Stage-Aware VPD off hides the table but preserves the draft — re-enabling it restores the edited state. Emits a single `overrides-change` custom event carrying the new sparse dict.

**Fan Entity Mode**
The display and graph scale behaviour for a fan chip, determined by the entity domain at runtime (not a static config flag). Three modes:
- **HA fan entity** (`fan.*` domain): chip shows `percentage` attribute as `"70%"` (or `"Off"` when state is `off`); graph Y-axis is 0–100, unit `%`.
- **Speed sensor** (numeric state, domain not `fan.*`): chip shows raw integer (e.g. `"5"`); graph Y-axis is 0–10, no unit suffix.
- **Binary fan** (switch / input_boolean / other non-numeric): chip shows `"On"` / `"Off"`; graph is binary 0/1.
Detection runs in `computeDeviceSnapshot` (chip) and `env-chart.ts` series builder (graph) by inspecting `hass.states[entityId].domain` and `attributes.percentage`. See ADR-0008.

## Architecture

**Slice**
A vertical module keyed to a domain concept (Plant, Grid, Irrigation, Environment, Logbook, Strain, Camera, Subarea, AIInsight, GridInteraction, UI, Growspace, Genetics, Nutrient). A slice owns its nanostore atoms, its [[Mutator]]s, its zod schemas, and its hassCall sites. Cards import atoms (read) and mutators (write) from slices; they never reach into the HA `hass` object directly. Slices replace the older `store/{actions,atoms,dispatcher}` + `services/api/*API` split.

Small domains (≤3 mutators, no atoms of their own) are absorbed into a semantically related slice rather than given a standalone one. UI dialog placement does not determine domain ownership. Specifically: vision checkup operations live in the Camera slice; grow report operations live in the Growspace slice; history transport tests live in the existing `history-store` (see [[hassCall seam]]). See ADR-0005.

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

**Custom Graph Routing**
The general rule, of which [[Tank Water Chart]] and [[Crop Steering Day Chart]] are the two known instances: certain `MetricKey`s always render a dedicated chart component in place of the generic [[Env Graph]] when their chip/hero item is clicked, rather than the standard sensor-history view. The routing check lives at the render site (e.g. `_renderItem` keyed on `item.metrics[0]`, or the hero's click handler keyed on the chip's `MetricKey`) and swaps in the dedicated component instead of `<growspace-env-chart>`. New cases should follow this same shape: a standalone chart component + a `MetricKey`-keyed routing check, not a one-off conditional buried in the generic Env Graph.

**Tank-Derived Water Chip**
A [[Chip]] in the secondary header strip that shows calendar-day water consumption (liters since midnight local time) when a growspace is in [[Tank-Derived Water Mode]]. Condition is inferred client-side: `irrigationTanks.length > 0` AND no `irrigation_flow_sensors` AND no `drain_volume_sensors`. Value comes from `waterUsage.litersToday` in the growspace payload. Clicking it opens a [[Tank Water Chart]].

**Tank Water Chart** (`tank-water-chart`)
A separate chart component rendered in place of [[Env Graph]] when `MetricKey.WATER` is the active metric and the growspace is in [[Tank-Derived Water Mode]]. Fetches pre-bucketed consumption data from the backend via `growspace_manager/get_tank_water_history` (aggregated across all qualifying tanks). Supports the same 1h / 6h / 24h / 7d range selector as the standard [[Env Graph]]. Renders as a bar/area chart of liters consumed per time bucket. Routing ([[Custom Graph Routing]]): `_renderItem` in `growspace-analytics-ui.ts` checks `item.metrics[0] === MetricKey.WATER` and renders `<tank-water-chart>` instead of `<growspace-env-chart>`.

**`growspace_manager/get_tank_water_history`**
New WebSocket command that returns pre-bucketed consumption data for all qualifying tanks of a growspace, aggregated into a single series. Accepts `growspace_id` and `range` (`'1h' | '6h' | '24h' | '7d'`). For 1h/6h/24h returns 15-minute buckets (sliced from `TankWaterTracker.get_history_24h()`); for 7d returns hourly buckets from `TankWaterTracker.get_history_7d()`. Aggregates across all tanks whose `volume_liters` is configured and no flow/drain sensors are set (same predicate as [[Tank-Derived Water Mode]]).

**Irrigation Mode**
The two mutually exclusive ways a growspace can receive water. Switched via a toggle in the Schedules tab of the Irrigation Dialog, saved immediately on toggle.

**Manual Schedule**
User-defined list of timed irrigation and drain events (`irrigationTimes`, `drainTimes`). Each entry has a time-of-day and a duration in seconds. Editable in the Schedules tab when Irrigation Mode is Manual.

**Crop Steering (VWC)**
Automated irrigation mode driven by volumetric water content (VWC) targets rather than a fixed schedule. When active, the backend fires shots dynamically based on soil moisture readings and phase logic; the frontend shows a read-only Phase Window bar instead of the editable schedule.

**Phase Windows** (P0 / P1 / P2 / P3)
The four daily phases that structure a Crop Steering day, all derived from the growspace's `IrrigationStrategy` settings:
- P0 — Activation: first shot(s) at lights-on, lasting `p0DurationMinutes`
- P1 — Ramp-up: shots fire until substrate reaches the **Saturation Target** (`targetVwcPercent`)
- P2 — Maintenance: shots fire when VWC drops below the **P2 trigger threshold** — either the **P2 Direct Trigger** (`soilTriggerPercent`) if set, or `targetVwcPercent − maintenanceDrybackPercent` (the **Maintenance Dryback**) otherwise
- P3 — Dry-back: no irrigation; nominally starts `p2StopBeforeLightsOffMinutes` before lights-off (**Scheduled P3 Boundary**), but may start earlier when **Auto-Advance P2→P3** fires (**Actual P3 Boundary**). The authoritative start time is `phase_changed_at` on `IrrigationConfig`; fall back to the scheduled boundary when absent.

**Projected Shot Window** (`projected_shot_window`)
The crop-steering counterpart to the manual-mode `next_scheduled_cycle` value, surfaced as "Next" in the Irrigation Dialog's `.dlg-footer`. Where manual mode shows a single point-in-time read off a configured schedule, Crop Steering has no fixed schedule to read — so this is a `{ start, end }` range (e.g. "Next 14:15–14:50") representing the backend's best estimate of when the next shot will fire. Bounded by operational guardrails rather than statistical confidence intervals, with phase-specific anchors for both ends of the range:
- **Earliest**: `now + shotIntervalMinutes` cooldown in P0/P1/P2 (or tomorrow's window start, whichever is later, when close to day's end); tomorrow's P0/P1 start when currently in P3
- **Latest**: end of the *current* phase's relevant boundary — P0 end for P0, the (single, shared) P2-stop time for both P1 and P2, and tomorrow's P2-stop when currently in P3

This produces a meaningful, verifiable-against-the-chart range from day one — no sensor-history training period required — and leaves room for a future VWC-depletion-rate model to narrow the range within these same bounds. When the current phase is P3 (Dry-back, no shots fire), the whole window rolls forward to anchor on tomorrow's P0/P1/P2 windows rather than collapsing to "now". Named "projected" — not "scheduled" — deliberately: it signals an estimate bounded by guardrails, not a guarantee read off a configured schedule, echoing the "live + projected" hedging language already established by the [[Crop Steering Day Chart]] (see its note on history vs. projection).

**Crop Steering Day Chart** (`.cs-model`, titled "Substrate model · live + projected")
A standalone component (e.g. `<crop-steering-day-chart>`, extracted from its original embedded home in `irrigation-dialog.ts` so it can be shared) rendered in two places: the **Crop Steering Schedule** panel of the Schedules tab (Irrigation Dialog), and — in place of the standard [[Env Graph]] — when the promoted [[Steering Phase Chip]] is clicked from the hero. One component, one source of truth for both contexts; mirrors the [[Tank Water Chart]] extraction pattern.

The combined live-history-plus-projection visualization plotted by this component: Plots measured **Substrate VWC**, **Pore EC**, and **Bulk EC** as solid line traces — colored per the canonical `METRIC_CONFIGS` palette (`#03a9f4` / `#ef5350` / `#ff7043` respectively) — across a single photoperiod-anchored day — sharing the same `lightsOnMin − 120` axis anchor as the **Phase Strip** above it, so traces, phase bands, shot markers, and the now-line all line up on one timeline. Each line uses an independently auto-scaled axis (VWC % vs EC mS/cm have incomparable ranges). The live **Readout** (`.cm-readout`, top-right of the chart) shows the current value of each configured trace next to a color dot — this is the chart's color-to-trace legend; the [[Crop Steering Legend]] below the chart does not duplicate it. Pore EC and Bulk EC traces (and their `.cm-readout` entries) are omitted when the growspace has no sensors of that category — Soil Moisture (VWC) is always present because it's mandatory to enable [[Crop Steering (VWC)]] at all. Multi-sensor categories plot the aggregated average, not per-sensor breakouts. Faint dashed guide lines mark the **Saturation Target** (`targetVwcPercent`) and the calculated P2 trigger threshold so the user can read actual-vs-intended at a glance. Sourced via the dedicated `growspace_manager/get_crop_steering_history` WebSocket command (see ADR-0010 — mirrors the `get_tank_water_history` pattern of bucketing on the backend rather than reusing the rolling-window `history-store`, since this view needs a fixed calendar-day axis anchored to lights-on rather than a rolling 1h/6h/24h/7d range). Returns 5-minute buckets; the dialog polls it every 5 minutes while the Schedules tab is active so the trace's tail extends as the day progresses.

**Note on history vs. projection (drift, settled — projection stays):** This chart originally replaced a **Modeled VWC Sparkline** (a synthetic sine-wave with no sensor connection) specifically because "real data is strictly more informative... a fabricated trace next to real ones would mislead." That principle was never formally walked back, but `_generateSubstrateProjection` (a synthetic dashed/faded forecast line, seeded from the latest live reading or the configured target when no live data exists) was added back in later — drift, not a deliberate reversal. Decided to keep the projection as-is; it's clearly distinguished from history (dashed/faded vs. solid) and only covers the *forward* portion of the day, so it doesn't reintroduce the original "fabricated trace mixed with real data" concern.

**History line continuity:** The live trace connects straight across buckets with no reading (`value: null` from `crop_steering_history.py`'s 5-minute bucketing — happens whenever the sensor didn't report a significant state in that window) rather than breaking into disconnected fragments at each gap. This matches the original design intent (`generateSubstrateModel` in the Stitch design prototype produced one continuous path because its synthetic data had no gaps) — a real sensor's reporting cadence is sparser, and rendering a broken-up trace looked like missing/non-rendering data rather than a legitimate, if imperfectly sampled, history.

**Crop Steering Legend** (`.cs-legend` / `.cs-leg-chip`)
The chip row beneath the [[Crop Steering Day Chart]]. Distinct purpose from the chart's `.cm-readout`: the readout already supplies the color-to-trace mapping for whatever is configured, so the legend's only job is to flag what's *missing*. A `.cs-leg-chip` therefore renders **only** for a metric that has no configured sensors — muted (`opacity: 0.4`), with copy like "Pore EC not configured — add it in Environment Settings". A configured metric (including Substrate VWC, which is always configured) gets no legend chip at all. The Phase Window legend chips (phase color + label + shot count) are a separate row and unaffected by this rule.

**Auto-Advance P2→P3** (`autoAdvanceP2ToP3` / `auto_advance_p2_to_p3`)
An optional flag on `IrrigationStrategy`. When enabled, the backend transitions `active_steering_phase` from `"p2"` to `"p3"` as soon as it determines P2 irrigation should stop — which may be before the clock-based Scheduled P3 Boundary. The exact moment of transition is recorded in `IrrigationConfig.phase_changed_at`.

**`phase_changed_at`** (`IrrigationConfig`)
ISO-8601 timestamp recording the wall-clock time when `active_steering_phase` last changed to `"p3"`. `null` until the first P3 transition in the current day. The Schedules tab uses this as the **Actual P3 Boundary** when drawing the crop steering timeline, falling back to the Scheduled P3 Boundary when absent.

**P2 Thresholds** (Steering tab)
The three controls that govern when P2 fires, all grouped together in the Steering tab:
- **Saturation Target P1 (%)** (`targetVwcPercent`) — the VWC ceiling P1 ramps toward; P2 begins the moment this is reached
- **Maintenance Dryback (%)** (`maintenanceDrybackPercent`) — how far VWC may fall in P2 before a shot fires; the calculated P2 trigger is `Saturation Target − Maintenance Dryback`
- **P2 Direct Trigger (%)** (`soilTriggerPercent`, optional) — if set, replaces the calculated trigger with a fixed threshold; useful when you prefer an absolute floor rather than a relative dryback

**Safety Caps** (Config tab, visible only when Crop Steering is enabled)
Hard limits applied on top of the steering logic: **Daily Volume Cap (L)** and **Max Cycles / Day**. Neither initiates watering — they only stop the steering logic from exceeding the configured bounds. Leave blank to disable.

**Drain Schedule**
Time-based drain events that run regardless of Irrigation Mode. Always editable in the Schedules tab.

**EC Ramp Curves**
Named, reusable curves that define how the target EC value should ramp over time (e.g. across a grow week range). Each curve is a list of `ECRampPoint` entries (week + target EC). Curves are stored globally (not per-growspace) and managed in the EC Ramp tab of the Irrigation Dialog. The tab is only visible when the growspace has a pump, an irrigation schedule, and at least one EC sensor. Saves are per-curve and immediate — curves do not participate in the Irrigation Dialog's unified footer Save.

**Irrigation Dialog SM**
A single root state machine that owns the Irrigation Dialog's interaction state. Tab (`schedules | steering | logs | ...`) is the top-level state; each tab has substates for editing rows and pending confirmations (e.g. Phase Window changes). Tab switches are guarded by per-tab "dirty" predicates. The dialog component renders the SM; data writes go through the Irrigation slice's mutators. Replaces the 35 sibling `@state()` flags in `irrigation-dialog.ts`. The same tab-keyed shape applies to the Config and Strain Library dialogs; both satisfy [[DialogStateMachine]]. The [[Strain Editor SM]] follows a different (tab-free) shape and does not satisfy `DialogStateMachine`. Strain Library and Strain Editor SMs land together because the library hosts the editor and their dirty predicates are coupled.

**Strain Editor SM**
The state machine for `strain-editor-view.ts`, extracted into `strain-editor-view-sm.ts`. Unlike the tabbed dialog SMs, this SM has no `activeTab` — the editor is a single-scroll form. Shape: `{ draft: Partial<StrainEntry>; history: Partial<StrainEntry>[]; status: Status; toast?: string; sub: SubState }`. `history` is the lineage drill-down stack — entries are pushed when the user navigates to a related strain and popped on Back. `status` is `idle | applying | done | error` (no `confirming` — there is no pre-save confirm step). `sub` is a single mutually-exclusive discriminated union covering all overlay states: `idle | cropping | lineage-editing | importing { replace: boolean } | seedfinder | breeder-list | breeder-editing { draft: BreederDraft } | breeder-confirm-delete { name } | photo-menu`. `BreederDraft` is imported from `gs-breeder-manager-sm.ts` — the Strain Editor SM does not define its own breeder draft type. Async-fetched data (`_lineageTree`) stays outside the SM — the component passes it as a render-time argument. Does not satisfy [[DialogStateMachine]].

**Breeder Manager SM**
The state machine for `gs-breeder-manager.ts`, extracted into `gs-breeder-manager-sm.ts`. Canonical owner of `BreederDraft` — the type is exported from here and imported by the [[Strain Editor SM]]. No `activeTab`; uses `activeView: 'list' | 'editor'` instead. Shape: `{ activeView: 'list' | 'editor'; views: { list: ListViewState; editor: EditorViewState }; status: Status; toast?: string }`. `ListViewState` is `{ sub: { kind: 'idle' } | { kind: 'confirm-delete'; name: string } }`. `EditorViewState` is `{ draft: BreederDraft; sub: { kind: 'idle' } | { kind: 'uploading' } }`. `BreederDraft` is `{ name: string; logo: string; originalName: string | null }` — `originalName: null` means a new breeder is being created; a non-null string is the original name being edited (used to route the save to `update-breeder` vs `save-breeder`). `status` is `idle | applying | done | error` (no `confirming` — the delete confirmation lives in `views.list.sub`). Logo upload is a two-step event: `LOGO_UPLOAD_STARTED` sets `views.editor.sub` to `uploading` (disabling Save); `LOGO_UPLOAD_RESOLVED { base64 }` sets the draft logo and returns sub to `idle`. After `SAVE_RESOLVED`, SM returns to `activeView: 'list'` and sets a toast — the dialog stays open. Events are SCREAMING_SNAKE_CASE. Does not satisfy [[DialogStateMachine]] (no tab-guard, no `confirm-discard`).

**Config Dialog SM**
The state machine for `config-dialog.ts`, extracted into `config-dialog-sm.ts`. Seeded from a `GrowspaceDevice`. Tabs: `growspaces | notifications | sensors | climate | humidity | irrigation | tanks | vision | heatmap | subareas`. Key design decisions: (1) Sensors/Climate/Humidity/Irrigation/Vision all share a single flat `EnvironmentDraft` — they save together in one event. Exception: device control-enable flags (`control_humidifier`, `control_dehumidifier`) are excluded from `EnvironmentDraft` — they are written immediately via dedicated services (`set_humidifier_control`, `set_dehumidifier_control`) on toggle, not bundled with the environment save. The component holds these as private `@state()` fields initialized from entity attributes. (2) Tab-switch dirty guards apply only to the Growspaces tab, because it is the only tab with an independent save event that can be silently lost. (3) Root `status` is minimal: `idle | confirm-discard { pendingTab }`. (4) Growspaces tab `sub` is a four-way discriminated union with draft fields inlined: `idle | adding { name; rows; plantsPerRow; notificationService } | editing { growspaceId; name; … } | confirm-delete { growspaceId; name }`. (5) Tanks inline form, sub-dialog open/close state (sensor-group-dialog, subarea-config-dialog), and the subareas add/delete-confirm overlays all live in per-tab `sub` state. Async state (`_subareas`, `_subareasLoading`) stays outside the SM. Satisfies [[DialogStateMachine]].

**Notifications Tab**
The second tab in the [[Config Dialog SM]] (`notifications`), immediately after `growspaces`. Owns all global notification delivery configuration: cooldown durations (critical, warning, recovery), escalation delay, min stress duration before a critical fires, warning persistence threshold, the `ai_auto_alerts` toggle (moved here from the [[Growmaster Settings Panel]]), and the [[Timed Notification]] list. Has its own Save button and dirty guard — it does not share the environment tabs' unified save. Reads initial values from the `notification_settings` dict and `timed_notifications` list embedded in the `GrowspaceDevice` payload on dialog open. Saves via a single `growspace_manager/save_notification_settings` WebSocket command that atomically updates `notification_settings` and `ai_settings.ai_auto_alerts` in config entry options.

**Notification Settings**
The global dict (`notification_settings`) stored in config entry options. Holds the user-configured values for cooldown durations, escalation delay, min stress duration, and warning persistence. The hardcoded values in `const.py` serve as fallbacks when a key is absent.

**Timed Notification**
A day-count-triggered push alert configured by the user. Fields: `id` (UUID), `message`, `trigger_type` (plant lifecycle stage: `clone_start | veg_start | flower_start | dry_start`), `day` (integer), `growspace_ids` (multi-select). Stored as a list under `timed_notifications` in config entry options. CRUD is inline in the [[Notifications Tab]] — no sub-dialog. Distinct from Bayesian-triggered alerts ([[Triage Alert]]) which fire automatically on sensor state changes.

**Add Plant Dialog SM**
The state machine for `add-plant-dialog.ts`, extracted into `add-plant-dialog-sm.ts`. Tabs: `add | clone | seedling`. The `add` tab owns a 3-step wizard modeled as its `sub` discriminated union: `step-identity | step-source | step-schedule`. The `clone` and `seedling` tabs share a single `TransplantTabState` type (identical draft shape: `selectedPlantId`, `row`, `col`; sub is always `idle`). Root `status` is `idle | applying | done | error` — `confirming` is present in the type for SM consistency but the component transitions through it immediately (no confirm overlay). Draft on the `add` tab carries a `stage` field (one of the 7 `PlantStage` values: seedling, clone, mother, veg, flower, dry, cure) plus all date fields. The Schedule step shows a stage selector at the top; below it, a single date field — the start date for the selected stage, defaulting to today. Changing the stage clears all date fields and resets the newly selected stage's date to today. The submit payload populates only the selected stage's date field (all others are sent as empty); the backend infers the final stage from that date via `calculate_plant_stage`. The default stage is seeded from `growspaceName` in `setInitialState` via a pure `deriveDefaultStage(growspaceName)` helper — the SM itself is growspace-ignorant. `strainQuery` lives in the add-tab draft (not local component state) because it drives wizard validation. `SiblingPlantSelected` carries derived fields only (`strain`, `phenotype`, `cloneStart`) — not a full `PlantEntity`. Save submits via `CustomEvent` dispatch upward to the parent card; the SM owns `applying → done/error` transitions but not the transport. Does not satisfy [[DialogStateMachine]] (no `confirm-discard` tab-guard — the dialog is opened fresh each time from a specific grid cell).

**Crop Steering Dialog SM**
The state machine for `crop-steering-dialog.ts`, extracted into `crop-steering-dialog-sm.ts`. Seeded from a `GrowspaceDevice`. Tabs: `diagnostics | settings`. `diagnostics` is read-only — no draft, sub always `idle`; sensor entity values are passed as render-time arguments (same pattern as `_lineageTree` in [[Strain Editor SM]]). `settings` owns `{ phase: Phase; ecTargetRanges: ECTargetRange[] }` as its draft and a `SettingsSubState` discriminated union: `idle | confirm-phase { pending: Phase } | phase-applying | ec-applying | error { source: 'phase' | 'ec'; message: string }`. Phase changes are critical and write to the backend immediately on confirm (`confirm-phase → phase-applying → idle + toast`) — they are not bundled with the EC save. EC target range changes are buffered in the draft and committed via an explicit Save (`ec-applying → idle + toast`). Success for both resolves to `idle` with a `SET_TOAST` event; no `done` sub-state. Root `status` is `idle | confirm-discard { pendingTab }` — the dirty guard fires only when leaving `settings` with unsaved EC target range changes. Satisfies [[DialogStateMachine]].

**Inbox Panel SM**
The state machine for `inbox-panel.ts`, extracted into `inbox-panel-sm.ts`. Owns the Inbox panel's interaction state: `activeFilter` (the active filter chip — `all | action | watch`), `selectedId` (the currently-selected [[Triage Alert]] id, or `null`), `readIds` (set of alert ids the user has opened — purely local, never persisted), `status`, and `toast`. Does not satisfy [[DialogStateMachine]] — the inbox has no navigation tabs with per-tab draft state, so the tabs wrapper adds no value. `status` is a flat discriminated union: `idle | adding-note { text } | confirming { action: SuggestedAction } | applying | error { message }`. `confirming` is entered only when the user clicks Apply on a `suggested_action` — Resolve (with or without a note) goes straight through `applying`. No `done` status — success resolves to `idle` with `SET_TOAST`. `selectedId` resets to `null` on filter switch and on `SaveResolved`. `readIds` grows on `AlertSelected` and `MarkAllRead`; it never shrinks (resolved alerts just disappear from the list via the slice). Events are intent-shaped: `FilterSelected`, `AlertSelected`, `MarkAllRead`, `AddNoteOpened`, `NoteChanged`, `ResolveRequested`, `ActionApplyRequested`, `ActionApplyConfirmed`, `ActionApplyCancelled`, `SaveResolved`, `SaveFailed`, `SET_TOAST`, `ErrorDismissed`. Alert data itself (`TriageAlert[]`) is not owned by the SM — it comes from atoms and is passed as a render-time argument. Does not satisfy [[DialogStateMachine]].

**DialogStateMachine**
A shared TypeScript interface (type-level only — no runtime import) satisfied by [[Irrigation Dialog SM]], [[Config Dialog SM]], and [[Crop Steering Dialog SM]]. Shape: `{ activeTab: TTabId; tabs: TTabStates; status: { kind: 'idle' } | { kind: 'confirm-discard'; pendingTab: TTabId }; toast: string | undefined }`. Lives in `src/dialogs/dialog-sm.ts`. Extracted when the Config SM became the second use.

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

## Logbook Event

A wire-format record (`LogbookEntrySchema`, a.k.a. `GrowspaceEvent` in legacy code) shown in the [[Growspace Logbook Card]]. Fields: `growspace_id`, `category`, `sensor_type`, `start_time`/`end_time`/`duration_sec`, `severity`, `reasons`, `timestamp`, plus optional `notes`/`images`/`tags`/`plant_id`/`metadata`/`event_id`.

**Logbook Event `severity` is unrelated to Triage Alert `Severity`** (above) — different field, different shape, different meaning. It's a raw number in `[0, 1]` whose meaning depends on the event's `sensor_type`:
- For most sensor types it's a magnitude-of-concern: higher means worse (colored success → warning → error as it falls).
- For **positive-direction metrics** — `sensor_type` values matching `optimal`, `watering`/`water`/`irrigation`, `drain`, or `nutrient` — higher means better (e.g. irrigation severity of 0.95 means "reached 95% of saturation target", a good outcome). These are colored on an inverted scale: `>= 0.9` → success, `>= 0.75` → warning, else → error.

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

## Seeds & Genetics

**Seed Batch**
A recorded inventory entry for a batch of cannabis seeds. Fields: `batch_id`, `strain_name`, `breeder`, `quantity`, `acquisition_date`, `generation` (e.g. F1, S1, BX1), optional parent strains (`parent_1_strain`, `parent_1_phenotype`, `parent_2_strain`, `parent_2_phenotype`), optional `lineage` string, optional `notes`. Can be sown into a growspace to create plants. Linked to a [[Pollination Event]] via `result_seed_batch_id` when seeds are harvested from that event.

**Pollination Event**
A recorded cross-pollination between a donor plant (male / pollen donor) and a receiver plant (female / seed bearer). Fields: `event_id`, `date`, `donor_plant_id`, `receiver_plant_id`, optional `notes`, optional `result_seed_batch_id` (set when seeds are harvested from this event). The donor is either a [[Live Donor]] or a [[Library Donor]].

**Live Donor**
A pollination donor identified by a live plant's UUID (`plant_id`). The plant is currently tracked in a growspace and appears in the plants list. Distinguished from a [[Library Donor]] by the absence of `||` in the `donor_plant_id`.

**Library Donor**
A pollination donor identified by a strain library entry using the `"strain||phenotype"` key format. Used to record genetic lineage from a pollen source that is not tracked as a live plant. Distinguished from a [[Live Donor]] by the presence of `||` in the `donor_plant_id`.

**Sowing**
The act of linking an existing plant to its origin [[Seed Batch]] (`sow_seed` service). Records which batch a plant was grown from: sets `plant.seed_batch_id`, copies the batch's `generation` into `plant.genetics.generation`, and decrements `batch.quantity` by one. Rejected if `batch.quantity` is already zero. Distinct from physically germinating seeds — sowing is a retroactive provenance annotation on an already-existing plant record. Overwriting an existing link is allowed (e.g. to correct a labelling mistake).

**Unlinking (Seed Batch)**
Clearing a plant's origin [[Seed Batch]] association (`unlink_seed_batch` service). Sets `plant.seed_batch_id` to null. Does not restore batch quantity (the physical seed was used regardless). Does not alter `plant.genetics.generation` (generation may have been set independently or remain as a historical record).

**Plant Sex**
The biological sex of an individual plant: `"male"`, `"female"`, or `"hermaphrodite"`. Stored as `plant.sex` — a per-plant field, distinct from the strain-library `sex` column which records the typical sex of a strain. Determined by observation during the grow and set via the `set_plant_sex` service.

**Seeds-Genetics Tab SM**
The state machine for `seeds-genetics-tab.ts`, extracted into `seeds-genetics-tab-sm.ts`. Owns the tab's interaction state: `activeView` (the active sub-view), `views` (one typed state object per sub-view), `status` (`{ kind: 'idle' }` — no discard guard), and `toast`. Sub-views: `list | add-batch | log-pollination | harvest`. `add-batch` handles both creating and editing a [[Seed Batch]], discriminated by `editingBatchId: string | null` in the view state. `log-pollination` handles both creating and editing a [[Pollination Event]], discriminated by `editingEventId: string | null`. Delete confirmations and the inline Sow form live in the list view's `sub` discriminated union. Async lifecycle (`applying | error`) lives in each sub-view's `sub` — not at root. Validation logic lives in exported pure helpers (`validateBatchDraft`, `validatePollinationDraft`, `validateHarvestDraft`) — not in `transition()`. Does not satisfy [[DialogStateMachine]].

## Print Label

**Label Field**
One of nine configurable data rows that can appear on a printed thermal label: strain name (always shown), phenotype, breeder, lineage, start date, stage & age, plant ID, logo, QR code. Each field is independently toggled on/off in the Print Label Dialog. Note: the approved design mockup labels these "Breeder" (= phenotype) and "Genetics" (= breeder) — the canonical names in this codebase are phenotype and breeder respectively.

**Label Size**
The physical roll dimensions selected for printing: 50×30, 40×30, 50×50, 50×80, or 50×15 mm. Affects both the frontend preview layout and the `width`/`height` values sent to the Niimbot `print` service.

**Print Density**
User-selectable ink darkness: Light, Normal, or Dark. Mapped to a numeric `density` value for the Niimbot service call.

**QR Target**
The URL encoded in the label's QR code. Options: HA deep link to the plant, or raw plant UUID.

## Nutrients

**Feed & Water Dialog** (`feed-and-water-dialog`)
The combined modal for recording a watering event and managing nutrient inventory and feeding presets. Replaces the standalone `growspace-watering-dialog-ui` and the previous two-tab [[Nutrient Dialog]]. Uses the Design A shell with a three-item left nav rail: **Watering**, **Inventory**, **Presets**. A persistent "Record Watering" footer button is visible on all three tabs. Opened from two entry points with context-aware default tabs: the watering action (plant grid / header) opens on the Watering tab; the nutrient management entry point opens on the Presets tab. Interaction state is owned by [[Feed & Water Dialog SM]].

**Feed & Water Dialog SM**
The state machine for `feed-and-water-dialog.ts`. Extends [[DialogStateMachine]] with `activeTab: 'watering' | 'inventory' | 'presets'`. The Watering tab owns `{ draft: WateringDraft; sub: WateringSubState }` where `WateringDraft` holds `volume`, `selectedPresetId`, and `customNutrients` (ad-hoc entries, hidden behind a toggle by default). The Inventory and Presets tabs carry the same `NutrientTabState` shape as the previous [[Nutrient Dialog SM]]. A `confirm-discard` guard fires when switching tabs while `sub.kind === 'editing'` and the draft is dirty. The "Record Watering" footer button is disabled (blocked) while any tab has `sub.kind === 'editing'` — the cultivator must save or discard the edit first.

**Nutrient Dialog** (`nutrient-dialog`)
Superseded by [[Feed & Water Dialog]]. Previously the standalone modal for managing nutrient inventory and feeding presets.

**Nutrient Dialog SM**
Superseded by [[Feed & Water Dialog SM]]. The state machine for the retired `nutrient-dialog.ts`.

**NutrientStock Type Color**
Each [[NutrientStock]] `type` value maps to a fixed accent color used for the bottle icon in the Inventory master list: `base` → `--primary-color`; `bloom` → `#e91e63`; `calmag` → `#ff9800`; `root` → `#795548`; `additive` → `#9c27b0`; `microbe` → `#00bcd4`. Derived at render time — no user-configurable color field.

**Low Stock**
A [[NutrientStock]] whose fill level (`current_ml / initial_ml`) is ≤ 0.25 (25%). Surfaces as a Stock Indicator in the Nutrient Dialog nav rail. No separate threshold field — computed from existing `current_ml` and `initial_ml`.

**Nutrient Orphan**
A preset item whose `nutrient_id` no longer matches any entry in the current [[NutrientInventory]]. Displayed in the preset's nutrient-mixing table with a warning indicator (amber icon + strikethrough name). The preset is not blocked from saving; the orphan is not silently hidden. The user must manually remove or replace the orphaned item.

**Nutrient Dialog Navigation**
The Inventory and Presets sections each use **drill-down** navigation: selecting an item in the master list replaces the list with a detail view (no side-by-side split). `selectedId !== null` + `sub.kind === 'idle'` = read-only detail; `sub.kind === 'editing'` = edit form. `selectedId === null` + `sub.kind === 'editing'` = new-item form. The dialog's max-width (600px) minus the 72px nav rail leaves insufficient room for a side-by-side split at typical viewport sizes.

**Nutrient Presets Container** (`growspace-nutrient-presets-editor.container`)
Pure pass-through container that subscribes to `nutrientInventory$` and threads the live inventory value into `growspace-nutrient-presets-editor-ui` for dropdown population and [[Nutrient Orphan]] detection. Does not fetch — the [[Nutrient Dialog]] shell owns all fetching (`fetchNutrientInventory`, `fetchNutrientPresets`) on open.

## Build

**`__VERSION__`**
Build-time constant injected by the bundler. Holds the card's semver version string for startup logging and diagnostics.
