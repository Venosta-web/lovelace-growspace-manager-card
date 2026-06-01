# ADR-0007: Merge Watering and Nutrient Dialogs into Feed & Water Dialog

**Status:** Accepted

## Context

Cultivators follow a "plan then act" pattern when watering: they open the Nutrient Dialog to adjust or set up a feeding preset, close it, then open the Watering Dialog to record the event. This round-trip is a single cognitive task split across two dialogs. Additionally, the standalone `growspace-watering-dialog-ui` used ad-hoc styling (raw `md3-button`, bare `<h3>` section headers) inconsistent with the Design A shell used by the Nutrient Dialog, Growmaster Dialog, and Config Dialog. Nutrient preset management was also poorly discoverable — cultivators unfamiliar with the Nutrient Dialog entry point didn't know presets existed.

## Decision

Replace `growspace-watering-dialog-ui` and `nutrient-dialog` with a single **Feed & Water Dialog** using the Design A shell and a three-item left nav rail: **Watering | Inventory | Presets**.

Key design decisions within the combined dialog:

1. **Persistent "Record Watering" footer** — the submit action is visible on all three tabs, not buried on the Watering tab. The cultivator can adjust a preset and submit without switching back.

2. **Blocked footer while editing** — the "Record Watering" button is disabled when any tab has an active edit in progress (`sub.kind === 'editing'`). Silent auto-save would corrupt presets; silently ignoring the edit would lose work.

3. **Context-aware default tab** — the dialog is opened from two entry points: the watering action (plant grid / header) defaults to the Watering tab; the nutrient management entry point defaults to the Presets tab. This preserves each distinct workflow.

4. **Ad-hoc nutrients demoted, not removed** — the Watering tab retains the manual nutrient entry rows but collapses them behind an "Add custom nutrient" toggle. Presets are the primary path; ad-hoc entries are the escape hatch.

## Alternatives Considered

**Cross-linking (rejected):** Keep two separate dialogs but add "Manage Nutrients →" affordances in the Watering Dialog. This fixes discoverability but not the round-trip workflow friction for cultivators who need to adjust presets before recording a feed.

**Watering tab as non-rail default (rejected):** Open on the watering form without a rail item for it, with Inventory and Presets accessible from the rail. This makes Watering feel like a special case rather than a peer concern, and hides the tab structure from the cultivator.

**Remove ad-hoc nutrients (rejected):** Push all cultivators toward the preset system. This is a breaking workflow change for cultivators who improvise mid-session — a valid and common pattern.
