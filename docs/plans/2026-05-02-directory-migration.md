# Directory Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move all files out of `src/components/` into the `src/features/` tree, leaving `src/components/` empty and deleted.

**Architecture:** Files move in bottom-up groups (primitives first, layouts last) so each task leaves the codebase in a valid state. Each task moves a group of files, fixes their internal imports, updates all external importers, then runs typecheck and commits.

**Tech Stack:** TypeScript, Lit, no path aliases (all imports are relative)

**Pre-existing TS errors (ignore these throughout):**
- `src/components/heatmap-3d.ts(499)` — `GrowspaceDevice | undefined` not assignable
- `src/utils/three/renderers/sensor-renderer.ts(154)` — property 's' not found

**Typecheck command:** `./node_modules/.bin/tsc --noEmit 2>&1 | grep "error TS" | grep -v "heatmap-3d.ts(499\|sensor-renderer.ts(154"`

---

## Task 1: Move MD3 primitives and simple shared UI to `features/shared/ui/`

Files to move: `md3-text-input.ts`, `md3-number-input.ts`, `md3-select.ts`, `md3-date-input.ts`, `md3-switch.ts`, `scroll-container.ts`, `gs-help-tooltip.ts`

**Files:**
- Move: `src/components/ui/md3-*.ts` → `src/features/shared/ui/`
- Move: `src/components/ui/scroll-container.ts` → `src/features/shared/ui/`
- Move: `src/components/ui/gs-help-tooltip.ts` → `src/features/shared/ui/`
- Create: `src/features/shared/ui/index.ts` (barrel)
- Delete: `src/components/ui/index.ts`
- Modify: 9 external importers (see steps)

**Step 1: Move the 7 files**

```bash
cd src/features/shared/ui
git mv ../../../components/ui/md3-text-input.ts .
git mv ../../../components/ui/md3-number-input.ts .
git mv ../../../components/ui/md3-select.ts .
git mv ../../../components/ui/md3-date-input.ts .
git mv ../../../components/ui/md3-switch.ts .
git mv ../../../components/ui/scroll-container.ts .
git mv ../../../components/ui/gs-help-tooltip.ts .
```

**Step 2: Check internal imports of moved files**

All 7 files only import from `lit`, `lit/decorators.js`, `@mdi/js` — no relative imports to fix.

**Step 3: Create barrel at `src/features/shared/ui/index.ts`**

```typescript
import './nutrient-stock-chip';
export * from './md3-text-input';
export * from './md3-number-input';
export * from './md3-select';
export * from './md3-date-input';
export * from './growspace-logbook';
import './gs-help-tooltip';
export * from './gs-help-tooltip';
```

Note: `nutrient-stock-chip` and `growspace-logbook` are not moved yet but will be in Tasks 3 and 4 — the barrel will be valid only after those tasks complete. For now, leave those two lines commented out.

Actual content for now:
```typescript
export * from './md3-text-input';
export * from './md3-number-input';
export * from './md3-select';
export * from './md3-date-input';
export * from './gs-help-tooltip';
```

**Step 4: Delete old barrel**

```bash
git rm src/components/ui/index.ts
```

**Step 5: Update barrel importers** — these used `import '../components/ui'` or `import './components/ui'`:

| File | Old import | New import |
|---|---|---|
| `src/dialogs/training-dialog.ts` | `'../components/ui'` | `'../features/shared/ui'` |
| `src/dialogs/crop-steering-dialog.ts` | `'../components/ui'` | `'../features/shared/ui'` |
| `src/dialogs/snapshots-dialog.ts` | `'../components/ui'` | `'../features/shared/ui'` |
| `src/dialogs/clone-dialog.ts` | `'../components/ui'` | `'../features/shared/ui'` |
| `src/dialogs/ec-ramp-editor-dialog.ts` | `'../components/ui'` | `'../features/shared/ui'` |
| `src/growspace-manager-card.ts` | `'./components/ui'` | `'./features/shared/ui'` |
| `src/features/ui/components/growspace-ipm-dialog-ui.ts` | `'../../../components/ui'` | `'../../shared/ui'` |
| `src/features/ui/components/growspace-nutrient-inventory-dialog-ui.ts` | `'../../../components/ui'` | `'../../shared/ui'` |
| `src/features/ui/components/growspace-nutrient-presets-editor-ui.ts` | `'../../../components/ui'` | `'../../shared/ui'` |
| `src/features/ui/components/growspace-watering-dialog-ui.ts` | `'../../../components/ui'` | `'../../shared/ui'` |

**Step 6: Update individual file importers** — these imported specific files:

| File | Old import | New import |
|---|---|---|
| `src/dialogs/add-plant-dialog.ts` | `'../components/ui/gs-help-tooltip'` | `'../features/shared/ui/gs-help-tooltip'` |
| `src/dialogs/add-plant-dialog.ts` | `'../components/ui/md3-date-input'` | `'../features/shared/ui/md3-date-input'` |
| `src/dialogs/add-plant-dialog.ts` | `'../components/ui/md3-number-input'` | `'../features/shared/ui/md3-number-input'` |
| `src/dialogs/add-plant-dialog.ts` | `'../components/ui/md3-select'` | `'../features/shared/ui/md3-select'` |
| `src/dialogs/add-plant-dialog.ts` | `'../components/ui/md3-switch'` | `'../features/shared/ui/md3-switch'` |
| `src/dialogs/add-plant-dialog.ts` | `'../components/ui/md3-text-input'` | `'../features/shared/ui/md3-text-input'` |
| `src/dialogs/add-plants-dialog.ts` | (same 5 md3 imports) | (same pattern) |
| `src/dialogs/config-dialog.ts` | `'../components/ui/gs-help-tooltip'` | `'../features/shared/ui/gs-help-tooltip'` |
| `src/dialogs/config-dialog.ts` | `'../components/ui/md3-number-input'` | `'../features/shared/ui/md3-number-input'` |
| `src/dialogs/config-dialog.ts` | `'../components/ui/md3-select'` | `'../features/shared/ui/md3-select'` |
| `src/dialogs/config-dialog.ts` | `'../components/ui/md3-text-input'` | `'../features/shared/ui/md3-text-input'` |
| `src/dialogs/crop-steering-dialog.ts` | `'../components/ui/gs-help-tooltip'` | `'../features/shared/ui/gs-help-tooltip'` |
| `src/dialogs/ec-ramp-editor-dialog.ts` | `'../components/ui/gs-help-tooltip'` | `'../features/shared/ui/gs-help-tooltip'` |
| `src/dialogs/grow-report-dialog.ts` | `'../components/ui/gs-help-tooltip'` | `'../features/shared/ui/gs-help-tooltip'` |
| `src/dialogs/harvest-scoring-dialog.ts` | `'../components/ui/gs-help-tooltip'` | `'../features/shared/ui/gs-help-tooltip'` |
| `src/dialogs/irrigation-dialog.ts` | `'../components/ui/gs-help-tooltip'` | `'../features/shared/ui/gs-help-tooltip'` |
| `src/dialogs/irrigation-dialog.ts` | `'../components/ui/md3-number-input'` | `'../features/shared/ui/md3-number-input'` |
| `src/dialogs/irrigation-dialog.ts` | `'../components/ui/md3-switch'` | `'../features/shared/ui/md3-switch'` |
| `src/dialogs/irrigation-dialog.ts` | `'../components/ui/md3-text-input'` | `'../features/shared/ui/md3-text-input'` |
| `src/dialogs/nutrient-dialog.ts` | `'../components/ui/gs-help-tooltip'` | `'../features/shared/ui/gs-help-tooltip'` |
| `src/dialogs/sensor-group-dialog.ts` | `'../components/ui/gs-help-tooltip'` | `'../features/shared/ui/gs-help-tooltip'` |
| `src/dialogs/strain-library-dialog.ts` | `'../components/ui/gs-help-tooltip'` | `'../features/shared/ui/gs-help-tooltip'` |
| `src/dialogs/strain-library-dialog.ts` | `'../components/ui/md3-number-input'` | `'../features/shared/ui/md3-number-input'` |
| `src/dialogs/strain-library-dialog.ts` | `'../components/ui/md3-text-input'` | `'../features/shared/ui/md3-text-input'` |
| `src/dialogs/subarea-config-dialog.ts` | `'../components/ui/gs-help-tooltip'` | `'../features/shared/ui/gs-help-tooltip'` |
| `src/features/plants/components/plant-identity-card.ts` | `'../../../components/ui/md3-number-input'` | `'../../shared/ui/md3-number-input'` |
| `src/features/plants/components/plant-identity-card.ts` | `'../../../components/ui/md3-text-input'` | `'../../shared/ui/md3-text-input'` |
| `src/features/plants/components/plant-lifecycle-dates-card.ts` | `'../../../components/ui/md3-date-input'` | `'../../shared/ui/md3-date-input'` |
| `src/features/plants/containers/plant-overview.container.ts` | `'../../../components/ui/md3-number-input'` | `'../../shared/ui/md3-number-input'` |
| `src/features/plants/containers/plant-overview.container.ts` | `'../../../components/ui/md3-select'` | `'../../shared/ui/md3-select'` |
| `src/features/ui/components/growspace-header-actions-ui.ts` | `'../../../components/ui/gs-help-tooltip'` | `'../../shared/ui/gs-help-tooltip'` |
| `src/features/ui/components/growspace-header-actions-ui.ts` | `'../../../components/ui/scroll-container'` | `'../../shared/ui/scroll-container'` |
| `src/features/ui/components/growspace-header-secondary-ui.ts` | `'../../../components/ui/scroll-container'` | `'../../shared/ui/scroll-container'` |
| `src/features/ui/components/growspace-header-stages-ui.ts` | `'../../../components/ui/scroll-container'` | `'../../shared/ui/scroll-container'` |

**Step 7: Run typecheck**

```bash
./node_modules/.bin/tsc --noEmit 2>&1 | grep "error TS" | grep -v "heatmap-3d.ts(499\|sensor-renderer.ts(154"
```

Expected: no output (no new errors).

**Step 8: Commit**

```bash
git add -A
git commit -m "refactor: move MD3 primitives and simple shared UI to features/shared/ui"
```

---

## Task 2: Move `error-boundary` and `growspace-chip` to `features/shared/ui/`

**Files:**
- Move: `src/components/error-boundary.ts` → `src/features/shared/ui/`
- Move: `src/components/growspace-chip.ts` → `src/features/shared/ui/`
- Modify: 10 external importers

**Step 1: Move the files**

```bash
cd src/features/shared/ui
git mv ../../../components/error-boundary.ts .
git mv ../../../components/growspace-chip.ts .
```

**Step 2: Fix internal imports in moved files**

`growspace-chip.ts` imports `'../styles/shared.styles'` → change to `'../../../styles/shared.styles'`

`error-boundary.ts` has no relative imports.

**Step 3: Update external importers**

| File | Old import | New import |
|---|---|---|
| `src/cards/growspace-ai-insight-card.ts` | `'../components/error-boundary'` | `'../features/shared/ui/error-boundary'` |
| `src/cards/growspace-analytics-card.ts` | `'../components/error-boundary'` | `'../features/shared/ui/error-boundary'` |
| `src/cards/growspace-grid-card.ts` | `'../components/error-boundary'` | `'../features/shared/ui/error-boundary'` |
| `src/cards/growspace-logbook-card.ts` | `'../components/error-boundary'` | `'../features/shared/ui/error-boundary'` |
| `src/cards/growspace-subarea-card.ts` | `'../components/error-boundary'` | `'../features/shared/ui/error-boundary'` |
| `src/cards/growspace-subarea-card.ts` | `'../components/growspace-chip'` | `'../features/shared/ui/growspace-chip'` |
| `src/cards/growspace-tank-card.ts` | `'../components/error-boundary'` | `'../features/shared/ui/error-boundary'` |
| `src/features/environment/components/env-chart.ts` | `'../../../components/error-boundary'` | `'../../shared/ui/error-boundary'` |
| `src/features/ui/components/growspace-header-actions-ui.ts` | `'../../../components/growspace-chip'` | `'../../shared/ui/growspace-chip'` |
| `src/features/ui/components/growspace-header-secondary-ui.ts` | `'../../../components/growspace-chip'` | `'../../shared/ui/growspace-chip'` |
| `src/features/ui/containers/growspace-dialog-host.container.ts` | `'../../../components/error-boundary'` | `'../../shared/ui/error-boundary'` |
| `src/growspace-manager-card.ts` | `'./components/error-boundary'` | `'./features/shared/ui/error-boundary'` |

**Step 4: Run typecheck**

```bash
./node_modules/.bin/tsc --noEmit 2>&1 | grep "error TS" | grep -v "heatmap-3d.ts(499\|sensor-renderer.ts(154"
```

Expected: no output.

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: move error-boundary and growspace-chip to features/shared/ui"
```

---

## Task 3: Move `nutrient-stock-chip`, `confirm-delete-dialog`, `quick-note-input` to `features/shared/ui/`

**Files:**
- Move: `src/components/ui/nutrient-stock-chip.ts` → `src/features/shared/ui/`
- Move: `src/components/ui/confirm-delete-dialog.ts` → `src/features/shared/ui/`
- Move: `src/components/ui/quick-note-input.ts` → `src/features/shared/ui/`

**Step 1: Move the files**

```bash
cd src/features/shared/ui
git mv ../../../components/ui/nutrient-stock-chip.ts .
git mv ../../../components/ui/confirm-delete-dialog.ts .
git mv ../../../components/ui/quick-note-input.ts .
```

**Step 2: Fix internal imports in moved files**

`nutrient-stock-chip.ts`:
- `'../../types'` → `'../../../types'`
- `'../growspace-chip'` → `'./growspace-chip'`

`confirm-delete-dialog.ts` — no relative imports.

`quick-note-input.ts` — no relative imports.

**Step 3: Update `src/features/ui/components/growspace-header-secondary-ui.ts`**

```
'../../../components/ui/nutrient-stock-chip' → '../../shared/ui/nutrient-stock-chip'
```

**Step 4: Add `nutrient-stock-chip` back to the barrel `src/features/shared/ui/index.ts`**

```typescript
import './nutrient-stock-chip';
export * from './md3-text-input';
export * from './md3-number-input';
export * from './md3-select';
export * from './md3-date-input';
export * from './gs-help-tooltip';
```

**Step 5: Run typecheck**

```bash
./node_modules/.bin/tsc --noEmit 2>&1 | grep "error TS" | grep -v "heatmap-3d.ts(499\|sensor-renderer.ts(154"
```

Expected: no output.

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: move nutrient-stock-chip, confirm-delete-dialog, quick-note-input to features/shared/ui"
```

---

## Task 4: Move `growspace-logbook`, `growspace-timeline`, `vpd-heatmap`

`growspace-logbook` and `growspace-timeline` go to `features/shared/ui/`. `vpd-heatmap` goes to `features/environment/components/`.

**Files:**
- Move: `src/components/ui/growspace-logbook.ts` → `src/features/shared/ui/`
- Move: `src/components/ui/growspace-timeline.ts` → `src/features/shared/ui/`
- Move: `src/components/ui/vpd-heatmap.ts` → `src/features/environment/components/`

**Step 1: Move the files**

```bash
git mv src/components/ui/growspace-logbook.ts src/features/shared/ui/
git mv src/components/ui/growspace-timeline.ts src/features/shared/ui/
git mv src/components/ui/vpd-heatmap.ts src/features/environment/components/
```

**Step 2: Fix internal imports in moved files**

`growspace-logbook.ts`:
- `'../../types'` → `'../../../types'`
- `'../../services/timeline-service'` → `'../../../services/timeline-service'`
- `'../../styles/dialog.styles'` → `'../../../styles/dialog.styles'`
- Any other `../../...` → `../../../...`

`growspace-timeline.ts`:
- `'../../types'` → `'../../../types'`
- `'../../services/timeline-service'` → `'../../../services/timeline-service'`
- `'../../utils/date-utils'` → `'../../../utils/date-utils'`
- `'../../styles/shared.styles'` → `'../../../styles/shared.styles'`
- `'../error-boundary'` → `'./error-boundary'`

`vpd-heatmap.ts`:
- `'../../styles/shared.styles'` → `'../../../styles/shared.styles'`

**Step 3: Update external importers**

| File | Old import | New import |
|---|---|---|
| `src/cards/growspace-logbook-card.ts` | `'../components/ui/growspace-logbook'` | `'../features/shared/ui/growspace-logbook'` |
| `src/cards/growspace-logbook-card.ts` | `'../components/ui/growspace-timeline'` | `'../features/shared/ui/growspace-timeline'` |
| `src/dialogs/logbook-dialog.ts` | `'../components/ui/growspace-logbook'` | `'../features/shared/ui/growspace-logbook'` |
| `src/dialogs/logbook-dialog.ts` | `'../components/ui/growspace-timeline'` | `'../features/shared/ui/growspace-timeline'` |
| `src/dialogs/logbook-dialog.ts` | `'../components/ui/vpd-heatmap'` | `'../features/environment/components/vpd-heatmap'` |

**Step 4: Add `growspace-logbook` to the barrel `src/features/shared/ui/index.ts`**

```typescript
import './nutrient-stock-chip';
export * from './md3-text-input';
export * from './md3-number-input';
export * from './md3-select';
export * from './md3-date-input';
export * from './growspace-logbook';
import './gs-help-tooltip';
export * from './gs-help-tooltip';
```

**Step 5: Run typecheck**

```bash
./node_modules/.bin/tsc --noEmit 2>&1 | grep "error TS" | grep -v "heatmap-3d.ts(499\|sensor-renderer.ts(154"
```

Expected: no output.

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: move growspace-logbook, growspace-timeline, vpd-heatmap to features"
```

At this point `src/components/ui/` should be empty. Delete it:

```bash
git rm -r src/components/ui/
```

---

## Task 5: Move plant components to `features/plants/components/`

Files: `plant-stats.ts`, `plant-timeline.ts` (from `src/components/plant/`) and `transplant-source-panel.ts` (from `src/components/`).

**Step 1: Move the files**

```bash
git mv src/components/plant/plant-stats.ts src/features/plants/components/
git mv src/components/plant/plant-timeline.ts src/features/plants/components/
git mv src/components/transplant-source-panel.ts src/features/plants/components/
```

**Step 2: Fix internal imports in moved files**

`plant-stats.ts`:
- `'../../types'` → `'../../../types'`
- `'../../styles/plant-stats.styles'` → `'../../../styles/plant-stats.styles'`

`plant-timeline.ts`:
- `'../../types'` → `'../../../types'`
- `'../../services/timeline-service'` → `'../../../services/timeline-service'`
- `'../../utils/date-utils'` → `'../../../utils/date-utils'`
- `'../../styles/shared.styles'` → `'../../../styles/shared.styles'`
- `'../ui/quick-note-input'` → `'../../shared/ui/quick-note-input'`
- `'../ui/vpd-heatmap'` → `'../../environment/components/vpd-heatmap'`
- `'../ui/confirm-delete-dialog'` → `'../../shared/ui/confirm-delete-dialog'`

`transplant-source-panel.ts`:
- `'../types'` → `'../../../types'`
- `'../styles/shared.styles'` → `'../../../styles/shared.styles'`
- `'../styles/variables'` → `'../../../styles/variables'`
- `'../features/plants/containers/plant-card.container'` → `'../containers/plant-card.container'`

**Step 3: Update external importers**

| File | Old import | New import |
|---|---|---|
| `src/features/plants/components/plant-card-ui.ts` | `'../../../components/plant/plant-stats'` | `'./plant-stats'` |
| `src/features/plants/components/plant-timeline-tab.ts` | `'../../../components/plant/plant-timeline'` | `'./plant-timeline'` |

`growspace-view-standard.ts` also imports `transplant-source-panel` but that file is moving in Task 7 — handle that import update there.

**Step 4: Delete empty `src/components/plant/`**

```bash
git rm -r src/components/plant/
```

**Step 5: Run typecheck**

```bash
./node_modules/.bin/tsc --noEmit 2>&1 | grep "error TS" | grep -v "heatmap-3d.ts(499\|sensor-renderer.ts(154"
```

Expected: no output.

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: move plant-stats, plant-timeline, transplant-source-panel to features/plants/components"
```

---

## Task 6: Move `heatmap-3d` to `features/environment/components/`

**Step 1: Move the file**

```bash
git mv src/components/heatmap-3d.ts src/features/environment/components/
```

**Step 2: Fix internal imports in `heatmap-3d.ts`**

Check all `'../'`-prefixed imports and update depth from 1 to 3:
- `'../types'` → `'../../../types'`
- `'../utils/...'` → `'../../../utils/...'`
- `'../context'` → `'../../../context'`
- `'../store/...'` → `'../../../store/...'`

**Step 3: No external importers yet** — `growspace-view-heatmap.ts` imports it, but that file moves in Task 7. Leave it until then.

**Step 4: Run typecheck**

```bash
./node_modules/.bin/tsc --noEmit 2>&1 | grep "error TS" | grep -v "heatmap-3d.ts(499\|sensor-renderer.ts(154"
```

Expected: no output (the pre-existing error in heatmap-3d.ts is filtered out).

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: move heatmap-3d to features/environment/components"
```

---

## Task 7: Move views and `growspace-view-switcher` to `features/shared/layouts/`

**Files:**
- Move: `src/components/views/growspace-view-compact.ts` → `src/features/shared/layouts/`
- Move: `src/components/views/growspace-view-standard.ts` → `src/features/shared/layouts/`
- Move: `src/components/views/growspace-view-header.ts` → `src/features/shared/layouts/`
- Move: `src/components/views/growspace-view-heatmap.ts` → `src/features/shared/layouts/`
- Move: `src/components/growspace-view-switcher.ts` → `src/features/shared/layouts/`

**Step 1: Move the files**

```bash
git mv src/components/views/growspace-view-compact.ts src/features/shared/layouts/
git mv src/components/views/growspace-view-standard.ts src/features/shared/layouts/
git mv src/components/views/growspace-view-header.ts src/features/shared/layouts/
git mv src/components/views/growspace-view-heatmap.ts src/features/shared/layouts/
git mv src/components/growspace-view-switcher.ts src/features/shared/layouts/
```

**Step 2: Fix internal imports in moved files**

`growspace-view-compact.ts` (was depth 2, now depth 3):
- `'../../types'` → `'../../../types'`
- `'../../features/plants/containers/growspace-grid.container'` → `'../../plants/containers/growspace-grid.container'`
- `'../../styles/growspace-card.styles'` → `'../../../styles/growspace-card.styles'`
- `'../../styles/shared.styles'` → `'../../../styles/shared.styles'`
- `'../../styles/ui.styles'` → `'../../../styles/ui.styles'`
- `'../../styles/variables'` → `'../../../styles/variables'`

`growspace-view-standard.ts` (was depth 2, now depth 3):
- `'../../types'` → `'../../../types'`
- `'../../context'` → `'../../../context'`
- `'../../store/core/growspace-store'` → `'../../../store/core/growspace-store'`
- `'../../features/ui/containers/growspace-header.container'` → `'../../ui/containers/growspace-header.container'`
- `'../../features/ui/containers/growspace-analytics.container'` → `'../../ui/containers/growspace-analytics.container'`
- `'../../features/ui/components/growspace-edit-mode-banner-ui'` → `'../../ui/components/growspace-edit-mode-banner-ui'`
- `'../transplant-source-panel'` → `'../../plants/components/transplant-source-panel'`
- `'../../features/plants/containers/growspace-grid.container'` → `'../../plants/containers/growspace-grid.container'`
- All `'../../styles/...'` → `'../../../styles/...'`

`growspace-view-header.ts` (was depth 2, now depth 3):
- `'../../types'` → `'../../../types'`
- `'../../features/ui/containers/growspace-header.container'` → `'../../ui/containers/growspace-header.container'`
- All `'../../styles/...'` → `'../../../styles/...'`

`growspace-view-heatmap.ts` (was depth 2, now depth 3):
- `'../../types'` → `'../../../types'`
- `'../../features/ui/containers/growspace-header.container'` → `'../../ui/containers/growspace-header.container'`
- `'../heatmap-3d'` → `'../../environment/components/heatmap-3d'`

`growspace-view-switcher.ts` (was depth 1, now depth 3):
- `'../types'` → `'../../../types'`
- `'../constants'` → `'../../../constants'`
- `'./views/growspace-view-compact'` → `'./growspace-view-compact'`
- `'./views/growspace-view-header'` → `'./growspace-view-header'`
- `'./views/growspace-view-standard'` → `'./growspace-view-standard'`
- `'./views/growspace-view-heatmap'` → `'./growspace-view-heatmap'`
- `'./error-boundary'` → `'../ui/error-boundary'`

**Step 3: Update external importers of `growspace-view-switcher`**

| File | Old import | New import |
|---|---|---|
| `src/growspace-manager-card.ts` | `'./components/growspace-view-switcher'` | `'./features/shared/layouts/growspace-view-switcher'` |
| `src/cards/growspace-grid-card.ts` | `'../components/growspace-view-switcher'` | `'../features/shared/layouts/growspace-view-switcher'` |

**Step 4: Delete empty view directory**

```bash
git rm -r src/components/views/
```

**Step 5: Run typecheck**

```bash
./node_modules/.bin/tsc --noEmit 2>&1 | grep "error TS" | grep -v "heatmap-3d.ts(499\|sensor-renderer.ts(154"
```

Expected: no output.

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: move views and growspace-view-switcher to features/shared/layouts"
```

---

## Task 8: Delete `src/components/` entirely

By now only one thing should remain in `src/components/`: check with `find src/components -type f`.

**Step 1: Verify nothing is left**

```bash
find src/components -type f
```

Expected: no output (directory empty or nonexistent).

If any files remain, investigate — do not delete without understanding them.

**Step 2: Delete the directory**

```bash
git rm -r src/components/
```

**Step 3: Run full test suite**

```bash
npm test 2>&1 | tail -5
```

Expected: `4174 passed | 1 skipped` (same as baseline).

**Step 4: Final typecheck**

```bash
./node_modules/.bin/tsc --noEmit 2>&1 | grep "error TS" | grep -v "heatmap-3d.ts(499\|sensor-renderer.ts(154"
```

Expected: no output.

**Step 5: Final commit**

```bash
git add -A
git commit -m "refactor: delete legacy src/components directory, migration complete"
```
