# Code Review Findings — Lovelace Growspace Manager Card

Reviewed against `CODE_REVIEW.md`, `DESIGN.md`, and Lit 3.0 / TypeScript best practices.

---

## What's Working Well

The move toward feature-based architecture in `src/features/` is the right direction — each feature owns its own ViewModel, container, and UI component, which is clean. The `variables.ts` design token system aligns well with DESIGN.md's MD3 spec and is the correct single source of truth for styling. The ViewModel pattern in the plants feature is consistent and worth preserving.

---

## Findings

### High — Correctness / Runtime Risk

#### H1 — Conflicting Style Token Values

Two token files define the same semantic concepts with different values:

| Token | `src/styles/variables.ts` | `src/styles/theme-variables.ts` | Delta |
|-------|--------------------------|--------------------------------|-------|
| `font-size-xs` | `0.6875rem` (~11px) — line 37 | `10px` — line 66 | **1px off** |
| `font-size-sm` | `0.875rem` (~14px) — line 38 | `12px` — line 67 | **2px off** |
| `font-size-md` | `1rem` (16px) — line 39 | `14px` — line 68 | **2px off** |
| `border-radius-md` | `12px` — line 31 | `8px` — line 55 | **4px off** |
| `spacing-xs` | `--spacing-xs: 4px` — line 22 | `--gm-spacing-xs: 4px` — line 58 | naming mismatch |
| `spacing-sm` | `--spacing-sm: 8px` — line 23 | `--gm-spacing-sm: 8px` — line 59 | naming mismatch |

Any component importing `theme-variables.ts` instead of `variables.ts` renders with subtly wrong font sizes and border radii. This is an invisible visual regression — no runtime error, just pixel drift.

**Fix:** Deprecate `theme-variables.ts`. Grep for its import path and migrate all consumers to `variables.ts`. The `--gm-spacing-*` / `--gm-font-size-*` prefixed properties in `theme-variables.ts` have no equivalent in `variables.ts` — add them there before deleting.

---

#### H2 — Two Error Boundaries with Incompatible Behavior

`src/components/error-boundary.ts` (318 lines) and `src/components/ui/error-boundary.ts` (171 lines) catch different events and expose different interfaces:

| | `components/error-boundary.ts` | `components/ui/error-boundary.ts` |
|--|-------------------------------|----------------------------------|
| Event caught | `'recoverable-error'` (custom) — line 133 | Native `ErrorEvent` — line 97 |
| State model | `_errorCount` + `MAX_ERROR_COUNT = 5` — lines 29, 32-33 | Boolean `_hasError` only |
| Reset mechanism | Time-based (`ERROR_RESET_INTERVAL = 5000ms`) — line 33 | Manual `clearError()` only |
| Events emitted | `'error-caught'`, `'error-reset'` — lines 186-191 | None |
| Dev mode | Detects `localhost`/`127.0.0.1`, shows stack trace — line 247 | Not implemented |

The ui version also contains an unsafe type cast at line 97–98:
```typescript
this.addEventListener('error', this._handleError as EventListener);
```

The two implementations are not interchangeable. Whichever one a developer picks changes whether errors are counted, reported upstream, or reset automatically.

**Fix:** Consolidate into one component. Keep `components/error-boundary.ts` as the canonical implementation (it's richer and correct). Remove `components/ui/error-boundary.ts` and update all imports. Fix the unsafe cast by properly typing the handler.

---

### Medium — Type Safety / Maintainability

#### M1 — `any` in the Core Data Pipeline

The rendering pipeline and data adapter — the most load-bearing code in the project — accept `any` parameters, meaning the compiler cannot catch type errors across their call sites:

```typescript
// src/utils/three/scene-manager.ts:35
constructor(container: HTMLElement, device: any, hass: any, config: any = {})

// src/utils/three/scene-manager.ts:127
public update(device: any, hass: any, selectedMetric: string, historyData: any, timelineIndex: number, strainLibrary: any[], visibility: any)

// src/adapters/growspace-adapter.ts:55
wsData.sensor_groups?.forEach((g: any) => {

// src/adapters/growspace-adapter.ts:125
irrigationTanks: wsData.irrigation_tanks?.map((t: any) => ({

// src/features/ui/components/growspace-header-ui.ts:27
@property({ attribute: false }) historyCache: any = {};
```

**Fix:** Define `SensorGroup`, `IrrigationTank`, and `HistoryCache` interfaces in `src/types/`. Type the `HomeAssistant` object using the existing type from `@types/custom-cards` or `custom-card-helpers`. These are the five highest-leverage `any` replacements in the codebase.

---

#### M2 — `any` in ViewModels

```typescript
// src/features/plants/viewmodels/plant-card.viewmodel.ts:66
devices: any[]

// src/features/plants/viewmodels/plant-card.viewmodel.ts:76
(preset: any) =>

// src/store/core/growspace-store.ts:572
async addNutrientPreset(preset: any)
```

ViewModels are the boundary between raw WebSocket data and the UI. Untyped inputs here mean preset shape changes silently break the UI without compiler warnings.

**Fix:** Import and use existing model types from `src/types/` or the growspace_manager backend types. The `NutrientPreset` type already exists somewhere in the codebase — find and reuse it rather than creating a new one.

---

#### M3 — Manual Shadow DOM Queries Instead of `@query`

```typescript
// src/features/plants/containers/growspace-grid.container.ts:183-187
const gridUI = this.shadowRoot?.querySelector('growspace-grid-ui');
if (gridUI) {
  const cards = gridUI.shadowRoot?.querySelectorAll('plant-card-container');
  if (cards && cards[index]) {
    (cards[index] as HTMLElement).focus();

// src/features/plants/components/plant-card-ui.ts:56
const card = this.shadowRoot?.querySelector('.plant-card-rich') as HTMLElement;

// src/features/plants/containers/plant-card.container.ts:69
const cardUI = this.shadowRoot?.querySelector('plant-card-ui') as any;  // ← also an any hit
```

The double-nested query in `growspace-grid.container.ts` is especially risky — it reaches into another component's shadow root, which breaks encapsulation and will silently return `null` if either component hasn't rendered yet.

**Fix:** Replace with `@query` / `@queryAll` decorators from `lit/decorators.js`. For the cross-component query in `growspace-grid.container.ts`, use a Lit `@query` on the host and trigger focus via a method call or custom event instead of piercing the shadow DOM.

---

#### M4 — Incomplete Directory Migration

14 UI components live in `src/components/ui/` (legacy), and 12 live in `src/features/ui/components/` (new feature-based layout). There is no documented rule for which location new components should target, so new contributors will continue adding to `components/ui/`.

**Fix:** Pick a direction. If the migration to `features/` is intentional, document it in `CONTRIBUTING.md` and stop adding to `components/ui/`. If both locations are intentional (shared primitives vs. feature-specific), document the distinction explicitly.

---

### Low — Style / Token Hygiene

#### L1 — Hardcoded CSS Values

Newer components use hardcoded pixel values instead of the design token variables. Selected examples:

```css
/* src/components/ui/quick-note-input.ts:22,26,27,46,60,72,107,123 */
margin-bottom: 24px;     /* → var(--spacing-lg) */
padding: 12px;           /* → var(--spacing-md) */
border-radius: 12px;     /* → var(--border-radius-md) */
padding: 4px;            /* → var(--spacing-xs) */

/* src/components/ui/confirm-delete-dialog.ts:38,40,46,52,68,69 */
padding: 24px;           /* → var(--spacing-lg) */
border-radius: 16px;     /* → var(--border-radius-lg) */

/* src/components/ui/growspace-timeline.ts:42,50,163 */
border-radius: 12px;     /* → var(--border-radius-md) */
padding: 12px;           /* → var(--spacing-md) */
```

Same pattern in `src/components/ui/error-boundary.ts:26,30,31,38,60,61,72,74`.

**Fix:** Batch find-replace after H1 is resolved (so you're replacing with tokens from the correct file). `border-radius: 50%` for circular elements is intentional and fine to leave.

---

## Prioritized Action Plan

| # | Action | Severity | Why first |
|---|--------|----------|-----------|
| 1 | Merge `theme-variables.ts` into `variables.ts` | H1 | Font/radius discrepancies are active rendering bugs in consuming components |
| 2 | Consolidate error boundaries | H2 | Unsafe cast + divergent event handling means errors go unreported in some cases |
| 3 | Type the core data pipeline (`scene-manager`, `growspace-adapter`) | M1 | Load-bearing code; `any` here makes refactors invisible to the compiler |
| 4 | Type ViewModels and store | M2 | Contained scope, low risk, high payoff for future contributors |
| 5 | Replace manual DOM queries with `@query` | M3 | Cross-shadow-root query on line 183 is a latent null-pointer failure |
| 6 | CSS token audit | L1 | Batch after H1 — use the now-canonical `variables.ts` tokens |
| 7 | Document or complete the directory migration | M4 | Process fix; prevents the problem from growing while the code work is happening |
