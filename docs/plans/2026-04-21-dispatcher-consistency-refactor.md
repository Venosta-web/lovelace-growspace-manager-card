# Dispatcher Consistency Refactor (Scope B)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate every UI-layer bypass of the `ActionDispatcher`, collapse the redundant `GrowspaceStore` convenience surface, extract the harvest/scoring UI out of `plant-overview.container.ts`, and delete the orphaned legacy `plant-overview-dialog.ts`.

**Architecture:** Every write-side data operation must go through `store.actions.<group>.<verb>(...)`. Action files in `src/store/**/` own `dataService.*` calls, `showToast`, and `refreshData`. UI layer (containers, dialogs, cards, views) is read-only against `dataService` — they only call actions. `GrowspaceStore` stops exposing action methods directly; consumers use `store.actions.*`.

**Tech Stack:** Lit 3, nanostores, `@nanostores/lit`, `@lit/context`, vitest, playwright.

**Test strategy:** TDD for new actions (vitest unit tests under `tests/unit/`). Screenshot-diff smoke for migrated UI (existing `__screenshots__` coverage — regenerate and eyeball). Delete coverage-driven tests that target removed code, don't adapt them.

**Commit cadence:** One commit per task unless noted.

---

## Phase 1 — Add missing actions

Every action added here follows the same pattern: `export async function <verb>(ctx: ActionContext, ...args) { try { await ctx.dataService.<call>(...); ctx.showToast('...', 'success'); await ctx.refreshData(); } catch (error) { ctx.showToast(\`...: ${error}\`, 'error'); throw error; } }`. Tests use the fake-ctx pattern already established in `tests/unit/store/plant/plant-actions.spec.ts` (or equivalent).

### Task 1: `plant.saveHarvestMetrics` + `plant.scorePhenotype` actions

**Why first:** Unblocks the main target of Scope A (plant-overview.container.ts).

**Files:**
- Modify: `src/store/plant/plant-actions.ts` (append two functions)
- Modify: `src/store/core/action-dispatcher.ts:22-50` (add `saveHarvestMetrics`, `scorePhenotype` to `plant` group)
- Test (create): `tests/unit/store/plant/harvest-and-score-actions.spec.ts`

**Step 1 — Write the failing tests**

```ts
// tests/unit/store/plant/harvest-and-score-actions.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { saveHarvestMetrics, scorePhenotype } from '../../../../src/store/plant/plant-actions';
import { makeFakeCtx } from '../../helpers/fake-ctx'; // use existing helper

describe('saveHarvestMetrics', () => {
  it('calls dataService, shows success toast, and refreshes', async () => {
    const ctx = makeFakeCtx();
    await saveHarvestMetrics(ctx, 'plant-1', { wet_weight: 120, dry_weight: 28 });
    expect(ctx.dataService.updateHarvestMetrics).toHaveBeenCalledWith({
      plant_id: 'plant-1', wet_weight: 120, dry_weight: 28,
    });
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining('Harvest metrics saved'), 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    const ctx = makeFakeCtx();
    ctx.dataService.updateHarvestMetrics.mockRejectedValue(new Error('boom'));
    await expect(saveHarvestMetrics(ctx, 'p', {})).rejects.toThrow('boom');
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining('boom'), 'error');
    expect(ctx.refreshData).not.toHaveBeenCalled();
  });

  it('skips dataService call when metrics object is empty', async () => {
    const ctx = makeFakeCtx();
    await saveHarvestMetrics(ctx, 'p', {});
    expect(ctx.dataService.updateHarvestMetrics).not.toHaveBeenCalled();
  });
});

describe('scorePhenotype', () => {
  it('calls dataService, toasts, refreshes', async () => {
    const ctx = makeFakeCtx();
    await scorePhenotype(ctx, 'p', { vigor: 4, aroma: 5 });
    expect(ctx.dataService.scorePlant).toHaveBeenCalledWith({ plant_id: 'p', vigor: 4, aroma: 5 });
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('no-ops when all scores are null', async () => {
    const ctx = makeFakeCtx();
    await scorePhenotype(ctx, 'p', { vigor: null, aroma: null });
    expect(ctx.dataService.scorePlant).not.toHaveBeenCalled();
  });
});
```

If `tests/unit/helpers/fake-ctx.ts` does not yet exist, extract one from an existing action test before writing these.

**Step 2 — Run to see failure**

`npx vitest run tests/unit/store/plant/harvest-and-score-actions.spec.ts`

Expected: imports fail (`saveHarvestMetrics is not a function`).

**Step 3 — Minimal implementation in `plant-actions.ts`**

```ts
export async function saveHarvestMetrics(
  ctx: ActionContext,
  plantId: string,
  metrics: Record<string, unknown>,
): Promise<void> {
  if (Object.keys(metrics).length === 0) return;
  try {
    await ctx.dataService.updateHarvestMetrics({ plant_id: plantId, ...metrics });
    ctx.showToast('Harvest metrics saved', 'success');
    await ctx.refreshData();
  } catch (error) {
    ctx.showToast(`Failed to save harvest metrics: ${error}`, 'error');
    throw error;
  }
}

export async function scorePhenotype(
  ctx: ActionContext,
  plantId: string,
  scores: Record<string, number | null>,
): Promise<void> {
  const hasValue = Object.values(scores).some((v) => v !== null && v !== undefined);
  if (!hasValue) return;
  try {
    await ctx.dataService.scorePlant({ plant_id: plantId, ...scores });
    ctx.showToast('Scores saved', 'success');
    await ctx.refreshData();
  } catch (error) {
    ctx.showToast(`Failed to save scores: ${error}`, 'error');
    throw error;
  }
}
```

**Step 4 — Expose on the dispatcher**

Modify `action-dispatcher.ts` `plant` group:

```ts
saveHarvestMetrics: (plantId: string, metrics: Record<string, unknown>) =>
  plantActions.saveHarvestMetrics(this.ctx, plantId, metrics),
scorePhenotype: (plantId: string, scores: Record<string, number | null>) =>
  plantActions.scorePhenotype(this.ctx, plantId, scores),
```

**Step 5 — Run tests**

`npx vitest run tests/unit/store/plant/`

Expected: all pass.

**Step 6 — Commit**

```bash
git add src/store/plant/plant-actions.ts src/store/core/action-dispatcher.ts tests/unit/store/plant/harvest-and-score-actions.spec.ts
git commit -m "feat(actions): add plant.saveHarvestMetrics and plant.scorePhenotype"
```

---

### Task 2: Expose existing library actions on the dispatcher

**Why:** `saveECRampCurve`, `removeECRampCurve`, `updateNutrientStock`, `removeNutrientStock`, `saveNutrientPreset`, `removeNutrientPreset` already exist as actions but are not reachable via `store.actions.*`. Callers bypass them and hit `dataService` directly.

**Files:**
- Modify: `src/store/core/action-dispatcher.ts`
- Check: `src/store/plant/library-actions.ts` for any missing `saveNutrientPreset` / `removeNutrientPreset`; add if missing following the same pattern as `saveECRampCurve`.

**Step 1 — Add `library` group to the dispatcher**

```ts
public readonly library = {
  fetchStrains: (force = false) => libraryActions.fetchStrainLibrary(this.ctx, force),
  fetchNutrientPresets: (force = false) => libraryActions.fetchNutrientPresets(this.ctx, force),
  fetchIPMPresets: (force = false) => libraryActions.fetchIPMPresets(this.ctx, force),
  fetchNutrientInventory: (force = false) => libraryActions.fetchNutrientInventory(this.ctx, force),
  updateNutrientStock: (id: string, name: string, currentMl: number, initialMl: number) =>
    libraryActions.updateNutrientStock(this.ctx, id, name, currentMl, initialMl),
  removeNutrientStock: (id: string) => libraryActions.removeNutrientStock(this.ctx, id),
  fetchECRampCurves: (force = false) => libraryActions.fetchECRampCurves(this.ctx, force),
  saveECRampCurve: (data: Parameters<typeof libraryActions.saveECRampCurve>[1]) =>
    libraryActions.saveECRampCurve(this.ctx, data),
  removeECRampCurve: (id: string) => libraryActions.removeECRampCurve(this.ctx, id),
};

public readonly nutrient = {
  savePreset: (preset: NutrientPreset) => libraryActions.saveNutrientPreset(this.ctx, preset),
  removePreset: (id: string) => libraryActions.removeNutrientPreset(this.ctx, id),
};
```

**Step 2 — If `saveNutrientPreset` / `removeNutrientPreset` are missing from library-actions,** add them with the standard wrap-and-toast pattern. Write unit tests first (TDD); model after Task 1.

**Step 3 — Run tests:** `npx vitest run tests/unit/store/`

**Step 4 — Commit**

```bash
git commit -m "feat(actions): expose library and nutrient groups on dispatcher"
```

---

### Task 3: Snapshot + vision actions group

**Files:**
- Create: `src/store/plant/snapshot-actions.ts`
- Modify: `src/store/core/action-dispatcher.ts`
- Test: `tests/unit/store/plant/snapshot-actions.spec.ts`

Wrap `getSnapshots`, `captureSnapshot`, `getVisionHistory`, `triggerVisionCheckup`, `updateVisionCheckupConfig`. Non-write fetchers (`getSnapshots`, `getVisionHistory`) should NOT toast/refresh — they only propagate errors. Write TDD unit tests for each; pattern mirrors Task 1.

Dispatcher:
```ts
public readonly snapshots = {
  list: (growspaceId: string) => snapshotActions.getSnapshots(this.ctx, growspaceId),
  capture: (growspaceId: string) => snapshotActions.captureSnapshot(this.ctx, growspaceId),
  visionHistory: (growspaceId: string) => snapshotActions.getVisionHistory(this.ctx, growspaceId),
  triggerCheckup: (growspaceId: string) => snapshotActions.triggerVisionCheckup(this.ctx, growspaceId),
  updateCheckupConfig: (growspaceId: string, config: unknown) =>
    snapshotActions.updateVisionCheckupConfig(this.ctx, growspaceId, config),
};
```

Commit per task.

---

### Task 4: Grow report actions group

**Files:**
- Create: `src/store/plant/report-actions.ts`
- Modify: `src/store/core/action-dispatcher.ts`
- Test: `tests/unit/store/plant/report-actions.spec.ts`

Wrap `fetchGrowReport` (read) and `exportGrowReport` (write, toasts). Dispatcher:

```ts
public readonly report = {
  fetch: (growspaceId: string) => reportActions.fetchGrowReport(this.ctx, growspaceId),
  export: (growspaceId: string, format: string) => reportActions.exportGrowReport(this.ctx, growspaceId, format),
};
```

Commit.

---

### Task 5: AI dispatcher group

**Files:**
- Modify: `src/store/core/action-dispatcher.ts`
- No new action file — reuse `src/store/system/ai-actions.ts`.

```ts
public readonly ai = {
  analyzeAll: () => aiActions.analyzeGrowspace(this.ctx, '', true),
  askAdvice: (deviceId: string, query: string) => aiActions.analyzeGrowspace(this.ctx, query, false),
  strainRecommendation: (query: string) => aiActions.getStrainRecommendation(this.ctx, query),
};
```

Verify `ai-actions.analyzeGrowspace` signature supports both `all` and single-device paths; if not, split into two functions first (TDD).

Commit.

---

### Task 6: Environment, breeder, seed-batch, pollination, transplant actions

`growspace-dialog-host.container.ts` has 14 bypass sites. Group them:

**6a — Environment:**
- Create: `src/store/plant/environment-actions.ts` with `configureEnvironment`, `removeEnvironment`, `resetWaterTracking` (move the last two off dispatcher passthroughs at `action-dispatcher.ts:80-81` into proper wrapped actions).
- Dispatcher: `store.actions.environment.*`.
- Tests.

**6b — Breeder:**
- Create: `src/store/plant/breeder-actions.ts` with `updateBreeder`, `deleteBreeder`.
- Dispatcher: `store.actions.breeder.*`.
- Tests.

**6c — Seed batch / pollination:**
- Create: `src/store/plant/seed-batch-actions.ts` with `addSeedBatch`, `updateSeedBatch`, `logPollination`, `harvestSeeds`, `updatePollination`, `deletePollination`.
- Dispatcher: `store.actions.seedBatch.*` and `store.actions.pollination.*` (split by noun).
- Tests.

**6d — Strain API (breeder extension):**
- The `dataService.strainAPI.updateBreeder` / `deleteBreeder` calls exist. Fold into `breeder-actions.ts` from 6b.

Commit each sub-task (6a, 6b, 6c) separately.

---

## Phase 2 — Extract UI components from `plant-overview.container.ts`

### Task 7: Extract `<plant-harvest-tab>` presentational component

**Files:**
- Create: `src/features/plants/components/plant-harvest-tab.ts`
- Create: `src/features/plants/components/plant-harvest-tab.test.ts`
- Modify: `src/features/plants/containers/plant-overview.container.ts` (remove `_renderHarvestTab`, `_initHarvestState` logic moved down, state moved down)

**Contract:** props-in / events-out only. No `@consume` context, no `store` access.

**Props:**
```ts
@property({ attribute: false }) metrics: HarvestMetrics = {};
@property({ attribute: false }) scores: PlantScores = {};
@property({ type: String }) stage: string = '';
@property({ type: Boolean }) saving = false;
```

**Events emitted:**
- `save-harvest` → `CustomEvent<{ metrics: HarvestMetrics; scores: PlantScores }>`
- `skip-advance` → no detail

**Step 1 — Write `plant-harvest-tab.test.ts`** (render with props, simulate input, assert emitted events). Use `@open-wc/testing-helpers` `fixture` pattern (find an existing component test for shape).

**Step 2 — Extract render logic** from `plant-overview.container.ts:953-1083`. Keep all inline styles as-is for now (separate cleanup task). Remove `_harvestMetricsEdit`, `_scoresEdit`, `_starPreview`, `_savingHarvest`, `_setScore`, `_renderScoreRow` from container — they move into the new component (or are shared via Task 8's scoring form).

**Step 3 — Re-wire the container** to render:
```html
<plant-harvest-tab
  .metrics=${this._harvestMetricsEdit}
  .scores=${this._scoresEdit}
  .stage=${this.plant?.state ?? ''}
  .saving=${this._savingHarvest}
  @save-harvest=${this._handleHarvestSave}
  @skip-advance=${this._skipAndAdvance}
></plant-harvest-tab>
```

Container keeps `_handleHarvestSave` as the action dispatcher call (Task 9).

**Step 4 — Run tests, commit.**

---

### Task 8: Extract `<plant-scoring-form>` presentational component

**Files:**
- Create: `src/features/plants/components/plant-scoring-form.ts`
- Create: `src/features/plants/components/plant-scoring-form.test.ts`
- Modify: `src/features/plants/containers/plant-overview.container.ts` (remove `_renderScorePhenotypeSection`, `_renderScoreRow`)

**Contract:** props-in / events-out. Shared `_renderScoreRow` star-rating logic lives here and `<plant-harvest-tab>` imports it as a child.

**Props:** `scores: PlantScores`, `saving: boolean`, `showForm: boolean`.
**Events:** `toggle-form` (void), `save-scores` (`{ scores }`).

Container renders:
```html
<plant-scoring-form
  .scores=${this._scoresEdit}
  .saving=${this._savingScore}
  .showForm=${this._showScoringForm}
  @toggle-form=${() => this._showScoringForm = !this._showScoringForm}
  @save-scores=${this._handleScoreSave}
></plant-scoring-form>
```

Container keeps `_handleScoreSave` (becomes an actions call in Task 9).

Commit.

---

### Task 9: Rewrite `plant-overview.container.ts` handlers to use the dispatcher

**Files:**
- Modify: `src/features/plants/containers/plant-overview.container.ts:1095-1182`
- Modify: `src/features/plants/containers/plant-overview.container.test.ts` — update mocks to match new dispatcher calls.

Replace `_saveHarvestMetrics` and `_savePhenotypeScore`:

```ts
private async _handleHarvestSave(e: CustomEvent<{ metrics: HarvestMetrics; scores: PlantScores }>): Promise<void> {
  const plantId = this.plant?.attributes?.plant_id;
  if (!plantId) return;
  this._savingHarvest = true;
  try {
    await this.store.actions.plant.saveHarvestMetrics(plantId, e.detail.metrics);
    await this.store.actions.plant.scorePhenotype(plantId, e.detail.scores);
    this._activeTab = 'dashboard';
  } finally {
    this._savingHarvest = false;
  }
}

private async _handleScoreSave(e: CustomEvent<{ scores: PlantScores }>): Promise<void> {
  const plantId = this.plant?.attributes?.plant_id;
  if (!plantId) return;
  this._savingScore = true;
  try {
    await this.store.actions.plant.scorePhenotype(plantId, e.detail.scores);
    this._showScoringForm = false;
  } finally {
    this._savingScore = false;
  }
}
```

**Delete** the 500ms `setTimeout` hack — the action itself awaits `refreshData()`. **Delete** the `showToast` call — the action toasts on error.

**Update** `plant-overview.container.test.ts` assertions: they currently check `store.dataService.updateHarvestMetrics` and `store.ui.showToast`. Change to `store.actions.plant.saveHarvestMetrics`.

Run full test suite. Commit.

---

## Phase 3 — Migrate bypass sites

Each task follows the same pattern: replace direct `dataService.*` + `showToast` + `refreshData` with one `store.actions.*` call; update the file's own tests.

### Task 10: `ec-ramp-editor-dialog.ts`

Replace lines 191 and 239:

```ts
// before
await this.store.dataService.removeECRampCurve(curveId);
// after
await this.store.actions.library.removeECRampCurve(curveId);
```

Delete any adjacent toast calls — the action does it. Run unit tests for this dialog; if none exist, that's OK (the action is tested). Commit.

### Task 11: `ai-insight-card.ts` — lines 222, 229

Replace with `store.actions.ai.analyzeAll()` / `store.actions.ai.askAdvice(deviceId, query)`. Commit.

### Task 12: `snapshots-dialog.ts` — lines 123, 140, 161, 178 + 7 toast calls

Replace all four dataService calls with `store.actions.snapshots.*`. Remove adjacent `showToast` calls (actions toast errors; successful-fetch read actions don't toast — that's a UX decision: keep success toasts inline here since only the dialog knows what "success" means for the user). Commit.

### Task 13: `grow-report-dialog.ts` — lines 97, 110

Replace with `store.actions.report.fetch(...)` / `.export(...)`. Drop adjacent toasts. Commit.

### Task 14: `harvest-scoring-dialog.ts` — lines 293, 335

Replace with `store.actions.plant.scorePhenotype(...)` / `store.actions.plant.harvest(...)` (harvest action already exists: `plant-actions.ts:harvestPlant` — wire it up in dispatcher as `plant.harvest` if not already). Commit.

### Task 15: `growspace-nutrient-presets-editor.container.ts` — lines 34, 47

Replace with `store.actions.nutrient.savePreset(...)` / `.removePreset(...)`. Commit.

### Task 16: `growspace-dialog-host.container.ts` sweep (14 sites)

Group into 3 commits for reviewability:

**16a — Seed batch / pollination block** (lines 556-561): replace 6 inline lambdas with `store.actions.seedBatch.*` / `store.actions.pollination.*`.

**16b — Breeder block** (lines 627, 652): replace with `store.actions.breeder.*`.

**16c — Environment + vision + transplant** (lines 212, 300, 735, 772, 1208 + tied toasts/refreshData/500ms hack): replace with `store.actions.environment.configure(...)`, `store.actions.snapshots.updateCheckupConfig(...)`, `store.actions.plant.transplant(...)` (create if missing — see Phase 1 Task 6a's scope or split into new task if out of scope).

Each sub-task: commit.

---

## Phase 4 — Delete the legacy dialog

### Task 17: Verify `plant-overview-dialog.ts` is truly unreachable

**Step 1:** `USE_NEW_DIALOGS` is hardcoded `true` in `feature-flags.ts:13`. Search for any runtime override (localStorage, URL param, feature-flag admin UI): `Grep("USE_NEW_DIALOGS")`. If any override path exists, **stop and escalate to user** — this task becomes "add a migration flag and a removal date."

**Step 2:** Search for other imports of `plant-overview-dialog`:
```
Grep("plant-overview-dialog", type=ts)
```
Only references should be in `growspace-dialog-host.container.ts` (the else branch we're about to delete).

If confirmed orphan, proceed.

### Task 18: Remove the else branch and delete the legacy file

**Files:**
- Modify: `src/features/ui/containers/growspace-dialog-host.container.ts:403-528` — drop the `if (useNewDialog)` check, keep only the new-dialog branch.
- Modify: `src/features/shared/config/feature-flags.ts` — remove `USE_NEW_DIALOGS` flag entirely (keep file + `USE_EVENT_BUS` pending separate dead-code cleanup).
- Delete: `src/dialogs/plant-overview-dialog.ts`
- Delete: any `tests/**/plant-overview-dialog*.spec.ts` that target the deleted class.

Run full test suite + e2e smoke. Commit:

```bash
git rm src/dialogs/plant-overview-dialog.ts tests/<matching specs>
git commit -m "refactor: delete legacy plant-overview-dialog, container is the only path"
```

---

## Phase 5 — Collapse `GrowspaceStore` convenience surface

### Task 19: Identify and inline the redundant methods

**Files:**
- Modify: `src/store/core/growspace-store.ts`

Methods to remove (each currently just delegates to an action):
- `harvestPlant(plant)` → callers use `store.actions.plant.harvest(...)`
- `finishDryingPlant(plant)` → `store.actions.plant.finishDrying(...)` (add to dispatcher if missing)
- `handleDeletePlant(...)` → `store.actions.plant.delete(...)` (already exists)
- `handleTakeClone(...)` → `store.actions.plant.takeClone(...)`
- `movePlantToGrowspace(...)` → `store.actions.plant.move(...)`
- `updatePlantFromDialog(...)` → `store.actions.plant.updateFromDialog(...)`
- `openTrainingDialog(...)` → `store.actions.ui.openTrainingDialog(...)` (add to dispatcher)
- `openPlantOverviewDialog(...)` → `store.actions.ui.openPlantOverviewDialog(...)`

**Process for each method:**
1. Add the equivalent dispatcher entry if missing.
2. `Grep` for every caller of the store method.
3. Rewrite caller to use `store.actions.*`.
4. Delete the method from `growspace-store.ts`.
5. TypeScript will flag any misses; fix them.

Keep `refreshData()` and `showToast()` ONLY on `ActionContext`, not on `GrowspaceStore`. Any remaining callers are migrated or removed in Task 20.

Commit in batches (one commit per collapsed method).

### Task 20: `refreshData` and `showToast` — UI layer must stop calling them

After Task 19, the only remaining UI callers of `store.refreshData()` / `store.showToast()` exist because they bypass an action that doesn't exist yet. For each:

1. If the surrounding logic belongs in an action, move it (possibly reopen a Phase 1 task).
2. If the call is truly UI-local (e.g. a "copied to clipboard" toast that has no data op), expose a thin `store.actions.ui.toast(...)` helper.
3. Delete `refreshData` / `showToast` from the store's public type surface (make them `private` or access via `ctx` only).

Commit.

---

## Phase 6 — Verify

### Task 21: Full test run + manual smoke

```bash
cd vendor/lovelace-growspace-manager-card
npx vitest run                           # unit
npm run build                            # type check + bundle
npx playwright test --config=playwright.e2e.config.ts tests/e2e/plants/  # e2e smoke on plants feature
```

Golden-path manual checks in the dev dashboard:
- Open plant overview → edit attribute → save → toast appears, data refreshes
- Harvest tab → enter yield + stars → save → data persists, dashboard returns
- Score Phenotype form in actions tab → submit → success toast
- EC ramp editor: save and remove a curve
- Snapshots dialog: capture, list, vision checkup
- Grow report: fetch and export
- Add/remove breeder in strain library
- Seed batch + pollination CRUD

If any step breaks: **do not** patch by reintroducing a store convenience method. Fix the underlying action.

### Task 22: Delete coverage-driven tests that target removed/migrated code

**Files to inspect:**
- `tests/unit/coverage-top-off.spec.ts`
- `tests/unit/coverage-gap-fillers.spec.ts`
- `tests/unit/*-coverage.spec.ts`

For each test case:
- If it targets a method that still exists and tests real behavior, keep it (fix up mocks).
- If it targets a deleted method or asserts on private line-number branches, delete it.
- Don't rewrite these to chase coverage — the new unit tests on action files already provide it.

Commit:
```bash
git commit -m "test: drop coverage-driven specs that targeted removed shims"
```

---

## Out of scope (tracked, deferred)

- **Dead EventBus infrastructure** (`src/features/shared/events/event-bus.ts` + controller) — zero production call sites, but removing requires a separate decision. Leave with a TODO at the top of `event-bus.ts`.
- **500ms `setTimeout` inside `plant-actions.ts:187, 225`** — likely a HA state-sync workaround. Investigate and consolidate in a follow-up; touching it here risks destabilizing harvest flow.
- **1,221-line `growspace-dialog-host.container.ts`** — splitting into per-dialog containers is a next refactor after this one lands.
- **Inline style attributes throughout extracted components** — migrate to `static styles` blocks in a styling-only pass.

---

## Handoff

Plan saved to `docs/plans/2026-04-21-dispatcher-consistency-refactor.md`. Two execution options:

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best when you want to stay in the loop and correct direction early.

**2. Parallel Session (separate)** — Open a new Claude Code session with `superpowers:executing-plans`, batch execution with checkpoints. Best if you want to run this unattended and review the whole thing at the end.

Which approach?
