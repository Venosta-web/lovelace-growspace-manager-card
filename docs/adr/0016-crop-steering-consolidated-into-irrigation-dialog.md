# ADR-0016: Consolidate the Crop Steering Command Center into the Irrigation Dialog

**Status:** Accepted

## Context

Crop-steering interaction was split across two dialogs. The standalone
`crop-steering-dialog` (opened by clicking the crop-steering metric chip) rendered only a
read-only **diagnostics** view (score, mode badge, dry-back, peak/trough VWC, EC trend). Its
state machine *modelled* a `settings` tab (phase draft + EC target ranges) but the component
never rendered it — `render()` was hardcoded to the diagnostics tab and the `_switchTab` /
`_requestTabSwitch` / `_confirmDiscard` helpers were dead code. Meanwhile the **working**
phase-override and per-stage feed-EC UI already lived in the Irrigation Dialog as its
`steering` and `ec_targets` tabs.

The originating issue (#277) proposed restructuring the *standalone* dialog into three tabs
(Overview / Steering / Substrate & EC) and explicitly leaving the Irrigation Dialog
untouched. Taken literally, that would have duplicated the phase + EC UI into a second
dialog — exactly the fragmentation [[ADR-0005]] (slice consolidation over fragmentation) and
[[ADR-0007]] (combined Feed & Water dialog) argue against.

## Decision

Invert the issue: build the **Crop Steering Command Center** as the top NAV group of the
**Irrigation Dialog** and retire the standalone `crop-steering-dialog` entirely.

1. New **"Crop Steering"** rail group at the top, containing `overview`, `steering`,
   `substrate_ec`. The `steering` tab is relabelled `"Crop Steering"` → `"Steering"` to avoid
   clashing with the group name. `drain_ec` / `ec_ramp` stay in the Telemetry group.
2. **Overview** is a new read-only tab carrying the migrated diagnostics metric grid. Its SM
   state is trivial (`sub: idle`, never dirty). The [[Crop Steering Day Chart]] is *not*
   moved — it stays in the Schedules/Steering content.
3. The former `ec_targets` tab id is renamed `substrate_ec` (label "Substrate & EC"); its
   draft + explicit-Save semantics are unchanged.
4. The three tabs share one visibility gate — `(hasSoilMoisture || hasStrategy) && hasPump` —
   so they appear and disappear together.
5. `crop-steering-dialog` and its SM, tests, and screenshots are deleted; the `CROP_STEERING`
   dialog type, `CropSteeringDialogState`, `openCropSteeringDialog` action, and host render
   case are removed. The crop-steering metric chip now calls
   `openIrrigationDialog({ growspaceId, initialTab: 'overview' })`.

The Irrigation Dialog SM already satisfies [[DialogStateMachine]]; adding the read-only
`overview` tab and renaming `ec_targets` keeps that contract intact. The standalone
`crop-steering-dialog-sm` tests are dropped because the Irrigation SM already covers
steering-confirm and EC-draft/dirty behaviour.

## Alternatives Considered

**Restructure the standalone dialog as the issue described (rejected):** Build fresh phase +
EC UI inside `crop-steering-dialog` and leave the Irrigation Dialog's `steering`/`ec_targets`
tabs in place. Produces two homes for the same controls and a second SM to keep in sync until
a later slice retires it — the duplication ADR-0005/0007 exist to prevent.

**Keep `openCropSteeringDialog` as a thin redirect alias (rejected):** Lower test churn, but
leaves a vestigial indirection and a second name for "open the Irrigation Dialog on Overview"
in a single codebase where every caller is under our control.
