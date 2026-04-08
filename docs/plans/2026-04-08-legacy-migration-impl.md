# Legacy Component Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Empty `src/components/` of all fat components by migrating each to the v2 Container/UI pattern and deleting the legacy files.

**Architecture:** Each legacy fat component splits into a dumb UI component (`features/ui/components/`) that receives props and emits events, and a smart container (`features/ui/containers/`) that subscribes to the store and drives the UI. The custom element name stays on the container so call sites need no changes.

**Tech Stack:** Lit 3, Nanostores, `@nanostores/lit` StoreController, `@lit/context`, vitest, `@open-wc/testing-helpers`

**Worktree:** `/home/maxi/core/core/vendor/lovelace-growspace-manager-card/.worktrees/chore-legacyMigration`

**Run tests:** `npx vitest run` (baseline: 181 files, 4014 tests, 18 pre-existing lifecycle errors — those are fine)

---

## Task 1: Delete dead code (plant-card + growspace-grid)

Both feature flags are `true` and their old branches are dead.

**Files to delete:**
- `src/components/plant-card.ts`
- `src/components/growspace-grid.ts`

**Files to modify:**
- `src/features/shared/config/feature-flags.ts`
- `src/components/views/growspace-view-standard.ts`
- `src/components/views/growspace-view-compact.ts`
- `src/components/transplant-source-panel.ts`
- `src/growspace-manager-card.ts`
- `tests/unit/features/shared/feature-flags.spec.ts`
- `tests/unit/components/growspace-grid.spec.ts`
- `tests/unit/components/plant-card.spec.ts`
- `tests/unit/components/plant-card-coverage.spec.ts`

### Step 1: Update feature-flags.ts — remove the two dead flags

In `src/features/shared/config/feature-flags.ts`, remove `USE_NEW_PLANT_CARD` and `USE_NEW_GROWSPACE_GRID` entirely. Leave `USE_NEW_DIALOGS` and `USE_EVENT_BUS`.

```typescript
export const FEATURE_FLAGS = {
  USE_NEW_DIALOGS: true,
  USE_EVENT_BUS: true,
} as const;
```

### Step 2: Update growspace-view-standard.ts

Remove the feature flag import and dead branch. Replace the conditional grid block with the container directly:

```typescript
// Remove: import '../growspace-grid';
// Remove: import { FEATURE_FLAGS } from '../../features/shared/config/feature-flags';
// Remove the USE_NEW_GROWSPACE_GRID if/else block

// Keep only:
import '../../features/plants/containers/growspace-grid.container';
```

In `focusPlant`:
```typescript
public focusPlant(index: number) {
  const grid = this.shadowRoot?.querySelector('growspace-grid-container');
  if (grid) {
    (grid as unknown as { focusPlant: (index: number) => void }).focusPlant(index);
  }
}
```

In `render()`, replace the conditional grid block with:
```html
<growspace-grid-container
  .plants=${this.grid}
  .rows=${this.rows}
  .cols=${this.cols}
  @transplant-drop=${(e: CustomEvent) => this._handleTransplantDrop(e)}
></growspace-grid-container>
```

### Step 3: Update growspace-view-compact.ts

Same pattern as standard — remove the `import '../growspace-grid'`, remove the feature flag conditional, keep only `<growspace-grid-container>`.

### Step 4: Update transplant-source-panel.ts

`transplant-source-panel.ts` still renders `<growspace-plant-card>` (the old element). Replace:

```typescript
// Remove: import './plant-card';
import '../features/plants/containers/plant-card.container';
```

Replace the element tag from `<growspace-plant-card ...>` to `<plant-card-container ...>`. Check what props are passed — the container accepts `.plant`, `.row`, `.col`.

### Step 5: Remove dead import from growspace-manager-card.ts

```typescript
// Remove this line:
import './components/plant-card';
```

### Step 6: Update feature-flags.spec.ts

Remove the four tests for `USE_NEW_PLANT_CARD` and `USE_NEW_GROWSPACE_GRID`. Keep `USE_NEW_DIALOGS` and `USE_EVENT_BUS` tests.

### Step 7: Delete legacy spec files for the deleted components

Delete:
- `tests/unit/components/growspace-grid.spec.ts`
- `tests/unit/components/plant-card.spec.ts`
- `tests/unit/components/plant-card-coverage.spec.ts`

### Step 8: Run tests and verify

```bash
npx vitest run
```

Expected: all tests pass (count will drop slightly as the deleted specs are gone).

### Step 9: Commit

```bash
git add -A
git commit -m "chore: delete legacy plant-card and growspace-grid components"
```

---

## Task 2: growspace-toast-ui.ts (dumb UI component)

**Files to create:**
- `src/features/ui/components/growspace-toast-ui.ts`
- `tests/unit/features/ui/components/growspace-toast-ui.spec.ts`

### Step 1: Write the failing test

Create `tests/unit/features/ui/components/growspace-toast-ui.spec.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspaceToastUI } from '../../../../../src/features/ui/components/growspace-toast-ui';

if (!customElements.get('growspace-toast-ui')) {
  customElements.define('growspace-toast-ui', GrowspaceToastUI);
}

describe('growspace-toast-ui', () => {
  it('renders hidden when notification is null', async () => {
    const el = await fixture<GrowspaceToastUI>(html`
      <growspace-toast-ui .notification=${null}></growspace-toast-ui>
    `);
    const div = el.shadowRoot!.querySelector('.toast-notification');
    expect(div?.classList.contains('visible')).toBe(false);
  });

  it('renders visible with correct type class when notification is set', async () => {
    const el = await fixture<GrowspaceToastUI>(html`
      <growspace-toast-ui .notification=${{ message: 'Saved', type: 'success' }}></growspace-toast-ui>
    `);
    const div = el.shadowRoot!.querySelector('.toast-notification');
    expect(div?.classList.contains('visible')).toBe(true);
    expect(div?.classList.contains('success')).toBe(true);
    expect(div?.textContent).toContain('Saved');
  });

  it('renders action button when notification has action', async () => {
    const el = await fixture<GrowspaceToastUI>(html`
      <growspace-toast-ui
        .notification=${{ message: 'Deleted', type: 'info', action: { label: 'Undo', callback: () => {} } }}
      ></growspace-toast-ui>
    `);
    const btn = el.shadowRoot!.querySelector('.toast-action');
    expect(btn?.textContent?.trim()).toBe('Undo');
  });

  it('emits toast-action-clicked when action button is clicked', async () => {
    const handler = vi.fn();
    const el = await fixture<GrowspaceToastUI>(html`
      <growspace-toast-ui
        .notification=${{ message: 'Deleted', type: 'info', action: { label: 'Undo', callback: () => {} } }}
        @toast-action-clicked=${handler}
      ></growspace-toast-ui>
    `);
    (el.shadowRoot!.querySelector('.toast-action') as HTMLElement).click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('renders nothing for missing notification', async () => {
    const el = await fixture<GrowspaceToastUI>(html`<growspace-toast-ui></growspace-toast-ui>`);
    const div = el.shadowRoot!.querySelector('.toast-notification');
    expect(div?.classList.contains('visible')).toBe(false);
  });
});
```

### Step 2: Run test to verify it fails

```bash
npx vitest run tests/unit/features/ui/components/growspace-toast-ui.spec.ts
```

Expected: FAIL — `GrowspaceToastUI` not found.

### Step 3: Create the UI component

Create `src/features/ui/components/growspace-toast-ui.ts` — copy styles and render logic from `src/components/growspace-toast.ts`, but replace the `@consume` / StoreController with a single `@property`:

```typescript
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

export type ToastNotification = {
  message: string;
  type: 'success' | 'error' | 'info';
  action?: { label: string; callback: () => void };
} | null;

@customElement('growspace-toast-ui')
export class GrowspaceToastUI extends LitElement {
  @property({ attribute: false }) notification: ToastNotification = null;

  static styles = css`
    /* Copy all styles from growspace-toast.ts here verbatim */
  `;

  render() {
    const isVisible = !!this.notification;
    return html`
      <div
        class=${classMap({
          'toast-notification': true,
          visible: isVisible,
          [this.notification?.type || 'info']: true,
        })}
      >
        <span class="toast-message">${this.notification?.message || ''}</span>
        ${this.notification?.action
          ? html`
              <button
                class="toast-action"
                @click=${this._handleActionClick}
              >
                ${this.notification.action.label}
              </button>
            `
          : ''}
      </div>
    `;
  }

  private _handleActionClick() {
    this.dispatchEvent(new CustomEvent('toast-action-clicked', { bubbles: true, composed: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-toast-ui': GrowspaceToastUI;
  }
}
```

### Step 4: Run test to verify it passes

```bash
npx vitest run tests/unit/features/ui/components/growspace-toast-ui.spec.ts
```

Expected: 5 tests pass.

### Step 5: Commit

```bash
git add src/features/ui/components/growspace-toast-ui.ts tests/unit/features/ui/components/growspace-toast-ui.spec.ts
git commit -m "feat: add growspace-toast-ui dumb component"
```

---

## Task 3: growspace-toast.container.ts (smart container, replaces fat component)

**Files to create:**
- `src/features/ui/containers/growspace-toast.container.ts`

**Files to modify:**
- `tests/unit/components/growspace-toast.spec.ts` — update import path
- `src/growspace-manager-card.ts` — update import
- `src/cards/growspace-grid-card.ts` — update import

**Files to delete:**
- `src/components/growspace-toast.ts`

### Step 1: Create the container

`src/features/ui/containers/growspace-toast.container.ts`:

```typescript
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { StoreController } from '@nanostores/lit';
import { storeContext } from '../../../context';
import type { GrowspaceStore } from '../../../store/core/growspace-store';
import type { ToastNotification } from '../components/growspace-toast-ui';
import '../components/growspace-toast-ui';

@customElement('growspace-toast')
export class GrowspaceToastContainer extends LitElement {
  @consume({ context: storeContext })
  private store!: GrowspaceStore;

  private _controller!: StoreController<ToastNotification>;
  private _timeoutId: number | null = null;

  private _initControllers() {
    if (this.store && !this._controller) {
      this._controller = new StoreController(this, this.store.ui.$notification);
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._initControllers();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._clearTimeout();
  }

  protected updated() {
    const notification = this._controller?.value;
    if (notification) {
      this._clearTimeout();
      const duration = notification.action ? 6000 : 3000;
      this._timeoutId = window.setTimeout(() => {
        this.store?.ui?.clearToast();
      }, duration);
    }
  }

  private _clearTimeout() {
    if (this._timeoutId !== null) {
      window.clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
  }

  render() {
    if (!this._controller) return html``;
    return html`
      <growspace-toast-ui
        .notification=${this._controller.value}
        @toast-action-clicked=${this._handleActionClicked}
      ></growspace-toast-ui>
    `;
  }

  private _handleActionClicked() {
    this._controller.value?.action?.callback();
    this.store?.ui?.clearToast();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-toast': GrowspaceToastContainer;
  }
}
```

### Step 2: Update import sites

In `src/growspace-manager-card.ts`:
```typescript
// Replace:
import './components/growspace-toast';
// With:
import './features/ui/containers/growspace-toast.container';
```

In `src/cards/growspace-grid-card.ts`:
```typescript
// Replace:
import '../components/growspace-toast';
// With:
import '../features/ui/containers/growspace-toast.container';
```

### Step 3: Update the existing test

In `tests/unit/components/growspace-toast.spec.ts`, update the import:
```typescript
// Replace:
import { GrowspaceToast } from '../../../src/components/growspace-toast';
// With:
import { GrowspaceToastContainer as GrowspaceToast } from '../../../src/features/ui/containers/growspace-toast.container';
```

All existing test assertions remain valid — same element name, same behavior.

### Step 4: Delete the legacy file

```bash
rm src/components/growspace-toast.ts
```

### Step 5: Run tests

```bash
npx vitest run
```

Expected: all passing.

### Step 6: Commit

```bash
git add -A
git commit -m "refactor: migrate growspace-toast to container/ui pattern"
```

---

## Task 4: growspace-analytics-ui.ts (dumb UI component)

**Files to create:**
- `src/features/ui/components/growspace-analytics-ui.ts`
- `tests/unit/features/ui/components/growspace-analytics-ui.spec.ts`

### Step 1: Write the failing test

```typescript
import { describe, it, expect, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspaceAnalyticsUI } from '../../../../../src/features/ui/components/growspace-analytics-ui';

if (!customElements.get('growspace-analytics-ui')) {
  customElements.define('growspace-analytics-ui', GrowspaceAnalyticsUI);
}

describe('growspace-analytics-ui', () => {
  it('renders nothing when items list is empty', async () => {
    const el = await fixture<GrowspaceAnalyticsUI>(html`
      <growspace-analytics-ui .items=${[]} .isLoading=${false}></growspace-analytics-ui>
    `);
    expect(el.shadowRoot!.querySelector('.graphs-container')).toBeNull();
  });

  it('renders loading spinner when isLoading is true', async () => {
    const el = await fixture<GrowspaceAnalyticsUI>(html`
      <growspace-analytics-ui
        .items=${[{ type: 'single', metrics: ['temperature'] }]}
        .isLoading=${true}
        .range=${'24h'}
      ></growspace-analytics-ui>
    `);
    expect(el.shadowRoot!.querySelector('.loading-spinner')).not.toBeNull();
  });

  it('renders time-range buttons', async () => {
    const el = await fixture<GrowspaceAnalyticsUI>(html`
      <growspace-analytics-ui
        .items=${[{ type: 'single', metrics: ['temperature'] }]}
        .isLoading=${false}
        .range=${'24h'}
      ></growspace-analytics-ui>
    `);
    const buttons = el.shadowRoot!.querySelectorAll('.range-btn');
    expect(buttons.length).toBe(4);
  });

  it('emits set-range when a range button is clicked', async () => {
    const handler = vi.fn();
    const el = await fixture<GrowspaceAnalyticsUI>(html`
      <growspace-analytics-ui
        .items=${[{ type: 'single', metrics: ['temperature'] }]}
        .isLoading=${false}
        .range=${'24h'}
        @set-range=${handler}
      ></growspace-analytics-ui>
    `);
    (el.shadowRoot!.querySelector('.range-btn') as HTMLElement).click();
    expect(handler).toHaveBeenCalledOnce();
  });
});
```

### Step 2: Run test to verify it fails

```bash
npx vitest run tests/unit/features/ui/components/growspace-analytics-ui.spec.ts
```

### Step 3: Create the UI component

`src/features/ui/components/growspace-analytics-ui.ts`:

```typescript
import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import type { HomeAssistant } from 'custom-card-helpers';
import type { GrowspaceDevice, SensorHistories } from '../../../types';
import type { HistoryTimeRange } from '../../../types';
import { growspaceCardStyles } from '../../../styles/growspace-card.styles';
import { sharedStyles } from '../../../styles/shared.styles';
import '../../../growspace-env-chart';

export type AnalyticsItem = {
  type: 'group' | 'single';
  metrics: string[];
};

@customElement('growspace-analytics-ui')
export class GrowspaceAnalyticsUI extends LitElement {
  @property({ attribute: false }) items: AnalyticsItem[] = [];
  @property({ type: Boolean }) isLoading = false;
  @property({ attribute: false }) range: HistoryTimeRange = '24h';
  @property({ attribute: false }) hass: HomeAssistant | undefined;
  @property({ attribute: false }) device: GrowspaceDevice | undefined;
  @property({ attribute: false }) sensorHistory: SensorHistories = {};

  static styles = [
    growspaceCardStyles,
    sharedStyles,
    css`
      :host { display: block; }
      .graphs-container { display: flex; flex-direction: column; gap: 12px; }
      @keyframes spin { to { transform: rotate(360deg); } }
    `,
  ];

  render(): TemplateResult {
    if (this.items.length === 0) return html``;

    if (this.isLoading) {
      return html`
        <div class="graphs-container">
          ${this._renderTimeRangeSelector()}
          <div style="display:flex;align-items:center;justify-content:center;padding:40px;color:var(--secondary-text-color,#666);">
            <div class="loading-spinner" style="width:24px;height:24px;border:2px solid var(--primary-color,#03a9f4);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></div>
            <span style="margin-left:12px;">Loading history data...</span>
          </div>
        </div>
      `;
    }

    return html`
      <div class="graphs-container">
        ${this._renderTimeRangeSelector()}
        ${repeat(
          this.items,
          (item) => (item.type === 'group' ? `group-${item.metrics.join('-')}` : `single-${item.metrics[0]}`),
          (item) => this._renderItem(item)
        )}
      </div>
    `;
  }

  private _renderTimeRangeSelector(): TemplateResult {
    const ranges: HistoryTimeRange[] = ['1h', '6h', '24h', '7d'];
    return html`
      <div class="time-range-selector">
        ${ranges.map((r) => html`
          <button
            class="range-btn ${this.range === r ? 'active' : ''}"
            @click=${() => this._emitSetRange(r)}
          >${r}</button>
        `)}
      </div>
    `;
  }

  private _renderItem(item: AnalyticsItem): TemplateResult {
    if (item.type === 'group') {
      return html`
        <growspace-env-chart
          .hass=${this.hass}
          .device=${this.device}
          .sensorHistory=${this.sensorHistory}
          .metrics=${item.metrics}
          .isCombined=${true}
          .range=${this.range}
          @toggle-graph=${(e: CustomEvent) => this._redispatch('toggle-graph', e.detail)}
          @unlink-graphs=${(e: CustomEvent) => this._redispatch('unlink-graphs', e.detail)}
          @unlink-graph=${(e: CustomEvent) => this._redispatch('unlink-graph', e.detail)}
        ></growspace-env-chart>
      `;
    }
    return html`
      <growspace-env-chart
        .hass=${this.hass}
        .device=${this.device}
        .sensorHistory=${this.sensorHistory}
        .metricKey=${item.metrics[0]}
        .metrics=${item.metrics}
        .range=${this.range}
        @toggle-graph=${(e: CustomEvent) => this._redispatch('toggle-graph', e.detail)}
      ></growspace-env-chart>
    `;
  }

  private _emitSetRange(range: HistoryTimeRange) {
    this.dispatchEvent(new CustomEvent('set-range', { detail: range, bubbles: true, composed: true }));
  }

  private _redispatch(type: string, detail: unknown) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-analytics-ui': GrowspaceAnalyticsUI;
  }
}
```

### Step 4: Run test to verify it passes

```bash
npx vitest run tests/unit/features/ui/components/growspace-analytics-ui.spec.ts
```

### Step 5: Commit

```bash
git add src/features/ui/components/growspace-analytics-ui.ts tests/unit/features/ui/components/growspace-analytics-ui.spec.ts
git commit -m "feat: add growspace-analytics-ui dumb component"
```

---

## Task 5: growspace-analytics.container.ts

**Files to create:**
- `src/features/ui/containers/growspace-analytics.container.ts`

**Files to modify:**
- `tests/unit/components/growspace-analytics.spec.ts` — update import
- `src/components/views/growspace-view-standard.ts` — update import
- `src/cards/growspace-analytics-card.ts` — update import

**Files to delete:**
- `src/components/growspace-analytics.ts`

### Step 1: Create the container

`src/features/ui/containers/growspace-analytics.container.ts`:

```typescript
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { StoreController } from '@nanostores/lit';
import { hassContext, storeContext } from '../../../context';
import type { HomeAssistant } from 'custom-card-helpers';
import type { GrowspaceStore } from '../../../store/core/growspace-store';
import type { GrowspaceDevice } from '../../../types';
import { METRIC_CONFIG, METRIC_SORT_ORDER, type MetricKey } from '../../../constants';
import type { AnalyticsItem } from '../components/growspace-analytics-ui';
import '../components/growspace-analytics-ui';

@customElement('growspace-analytics')
export class GrowspaceAnalyticsContainer extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  hass!: HomeAssistant;

  @consume({ context: storeContext })
  private store!: GrowspaceStore;

  @property({ attribute: false }) device: GrowspaceDevice | undefined;

  private _controller!: StoreController<{
    historyLoading: boolean;
    historyLoaded: boolean;
    activeEnvGraphs: Set<string>;
    linkedGraphGroups: string[][];
    combinedHistory: import('../../../types').SensorHistories;
    graphRanges: Record<string, import('../../../types').HistoryTimeRange>;
  }>;

  private _initControllers() {
    if (this.store && !this._controller) {
      this._controller = new StoreController(this, this.store.history.$analyticsViewState);
      this.store.history.startAutoRefresh();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._initControllers();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.store?.history?.stopAutoRefresh();
  }

  firstUpdated() {
    if (this.store?.history && !this._controller?.value?.historyLoaded) {
      this.store.history.loadHistoryOnDemand();
    }
  }

  protected updated() {
    const state = this._controller?.value;
    if (this.store?.history && state && !state.historyLoaded && !state.historyLoading) {
      this.store.history.loadHistoryOnDemand();
    }
  }

  private get _items(): AnalyticsItem[] {
    if (!this._controller) return [];
    const { activeEnvGraphs = new Set<string>(), linkedGraphGroups = [] } =
      this._controller.value ?? {};

    const getSortIndex = (metric: string) => {
      const i = METRIC_SORT_ORDER.indexOf(metric as MetricKey);
      return i !== -1 ? i : 999;
    };

    const items: (AnalyticsItem & { sortIndex: number })[] = [];
    const processed = new Set<string>();

    linkedGraphGroups.forEach((group) => {
      const active = group.filter((m) => activeEnvGraphs.has(m));
      if (active.length > 0) {
        items.push({ type: 'group', metrics: active, sortIndex: Math.min(...active.map(getSortIndex)) });
        active.forEach((m) => processed.add(m));
      }
    });

    activeEnvGraphs.forEach((metric) => {
      if (!processed.has(metric)) {
        const base = metric.includes(':') ? metric.split(':')[0] : metric;
        items.push({ type: 'single', metrics: [metric], sortIndex: getSortIndex(base) });
      }
    });

    return items.sort((a, b) => a.sortIndex - b.sortIndex);
  }

  render() {
    const state = this._controller?.value;
    if (!state || state.activeEnvGraphs?.size === 0 || !this.device) return html``;

    return html`
      <growspace-analytics-ui
        .items=${this._items}
        .isLoading=${state.historyLoading}
        .range=${this.store.history.getRange()}
        .hass=${this.hass}
        .device=${this.device}
        .sensorHistory=${state.combinedHistory || {}}
        @set-range=${this._handleSetRange}
        @toggle-graph=${this._handleToggleGraph}
        @unlink-graphs=${this._handleUnlinkGraphs}
        @unlink-graph=${this._handleUnlinkGraphMetric}
      ></growspace-analytics-ui>
    `;
  }

  private _handleSetRange(e: CustomEvent) {
    if (this.device) {
      this.store.history.setGraphRange(this.device.deviceId, e.detail);
      this.store.history.loadHistoryOnDemand();
    }
  }

  private _handleToggleGraph(e: CustomEvent) {
    if (typeof e.detail === 'string') this.store.toggleEnvGraph(e.detail);
  }

  private _handleUnlinkGraphs(e: CustomEvent) {
    this.store.history.unlinkGraphGroup(e.detail);
  }

  private _handleUnlinkGraphMetric(e: CustomEvent) {
    this.store.history.unlinkGraphMetric(e.detail);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-analytics': GrowspaceAnalyticsContainer;
  }
}
```

### Step 2: Update import sites

`src/components/views/growspace-view-standard.ts`:
```typescript
// Replace: import '../growspace-analytics';
import '../../features/ui/containers/growspace-analytics.container';
```

`src/cards/growspace-analytics-card.ts`:
```typescript
// Replace: import '../components/growspace-analytics';
import '../features/ui/containers/growspace-analytics.container';
```

### Step 3: Update existing spec

In `tests/unit/components/growspace-analytics.spec.ts`, update the import to `GrowspaceAnalyticsContainer` from the new path.

### Step 4: Delete the legacy file

```bash
rm src/components/growspace-analytics.ts
```

### Step 5: Run tests

```bash
npx vitest run
```

### Step 6: Commit

```bash
git add -A
git commit -m "refactor: migrate growspace-analytics to container/ui pattern"
```

---

## Task 6: growspace-header-ui.ts (dumb UI component)

**Files to create:**
- `src/features/ui/components/growspace-header-ui.ts`
- `tests/unit/features/ui/components/growspace-header-ui.spec.ts`

### Step 1: Write the failing test

```typescript
import { describe, it, expect, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspaceHeaderUI } from '../../../../../src/features/ui/components/growspace-header-ui';

if (!customElements.get('growspace-header-ui')) {
  customElements.define('growspace-header-ui', GrowspaceHeaderUI);
}

describe('growspace-header-ui', () => {
  it('renders nothing when device is absent', async () => {
    const el = await fixture<GrowspaceHeaderUI>(html`<growspace-header-ui></growspace-header-ui>`);
    expect(el.shadowRoot!.querySelector('.gs-stats-container')).toBeNull();
  });

  it('renders the stats container when device is provided', async () => {
    const device = { deviceId: 'gs1', name: 'Tent 1', plants: [] } as any;
    const el = await fixture<GrowspaceHeaderUI>(html`
      <growspace-header-ui
        .device=${device}
        .heroChips=${[]}
        .secondaryChips=${[]}
        .deviceChips=${[]}
        .devices=${[device]}
        .deviceId=${'gs1'}
        .config=${null}
        .inventory=${null}
        .dominant=${undefined}
      ></growspace-header-ui>
    `);
    expect(el.shadowRoot!.querySelector('.gs-stats-container')).not.toBeNull();
  });

  it('emits toggle-graph when forwarded from sub-component', async () => {
    const handler = vi.fn();
    const device = { deviceId: 'gs1', name: 'Tent 1', plants: [] } as any;
    const el = await fixture<GrowspaceHeaderUI>(html`
      <growspace-header-ui
        .device=${device}
        .heroChips=${[]}
        .secondaryChips=${[]}
        .deviceChips=${[]}
        .devices=${[device]}
        .deviceId=${'gs1'}
        .config=${null}
        .inventory=${null}
        .dominant=${undefined}
        @toggle-graph=${handler}
      ></growspace-header-ui>
    `);
    el.dispatchEvent(new CustomEvent('toggle-graph', { detail: { metric: 'temperature' }, bubbles: true }));
    expect(handler).toHaveBeenCalledOnce();
  });
});
```

### Step 2: Run test to verify it fails

```bash
npx vitest run tests/unit/features/ui/components/growspace-header-ui.spec.ts
```

### Step 3: Create the UI component

`src/features/ui/components/growspace-header-ui.ts`:

- Copy the `render()` method and styles from `src/components/growspace-header.ts`
- Replace all `@consume` / `StoreController` with `@property()` declarations
- Move `ResizeController` here (it is DOM-only, no store)
- Keep `@state() _mobileLink`
- Remove `MetricsUtils`, `HeaderDragController`, and all store calls — those live in the container
- All event handlers in this file simply re-emit the event upward (`this.dispatchEvent(...)`)

Properties the UI receives:
```typescript
@property({ attribute: false }) heroChips: HeaderChip[] = [];
@property({ attribute: false }) secondaryChips: HeaderChip[] = [];
@property({ attribute: false }) deviceChips: HeaderChip[] = [];
@property({ attribute: false }) dominant: DominantStageInfo | undefined;
@property({ attribute: false }) inventory: NutrientInventory | null = null;
@property({ attribute: false }) devices: GrowspaceDevice[] = [];
@property() deviceId = '';
@property({ attribute: false }) device: GrowspaceDevice | undefined;
@property({ attribute: false }) config: GrowspaceManagerCardConfig | null = null;
@property({ type: Boolean }) compact = false;
@state() private _mobileLink = false;
private _resizeController = new ResizeController(this, () => {});
```

Events emitted (all bubbling/composed):
- `toggle-graph` `{ metric }`
- `chip-drag-start` `{ metric }`
- `chip-drop` `{ targetMetric }`
- `unlink-graphs` `{ groupIndex }`
- `open-nutrients`
- `device-changed` `{ value }` (from the select)

### Step 4: Run tests

```bash
npx vitest run tests/unit/features/ui/components/growspace-header-ui.spec.ts
```

### Step 5: Commit

```bash
git add src/features/ui/components/growspace-header-ui.ts tests/unit/features/ui/components/growspace-header-ui.spec.ts
git commit -m "feat: add growspace-header-ui dumb component"
```

---

## Task 7: growspace-header.container.ts

**Files to create:**
- `src/features/ui/containers/growspace-header.container.ts`

**Files to modify:**
- `src/growspace-manager-card.ts`
- `src/components/views/growspace-view-standard.ts`
- `src/components/views/growspace-view-heatmap.ts`
- `src/components/views/growspace-view-header.ts`
- `tests/unit/components/growspace-header.spec.ts`

**Files to delete:**
- `src/components/growspace-header.ts`

### Step 1: Create the container

`src/features/ui/containers/growspace-header.container.ts`:

- Consume all three contexts: `hassContext`, `storeContext`, `configContext`
- Subscribe to `store.$headerState`
- Call `loadHistoryOnDemand()` + `startAutoRefresh()` in `connectedCallback()`
- In `willUpdate()`: when `device` changes, re-run `MetricsUtils.computeHeaderMetrics(...)` to produce `heroChips`, `secondaryChips`, `deviceChips`, `dominant`
- Hold `HeaderDragController` and handle `chip-drag-start` / `chip-drop` events; call `store.history.linkGraphs`
- Handle `toggle-graph`, `device-changed`, `unlink-graphs`, `open-nutrients` events
- Render: `<growspace-header-ui ...all-computed-props @all-events=${handlers}>`

```typescript
@customElement('growspace-header')
export class GrowspaceHeaderContainer extends LitElement {
  @consume({ context: hassContext, subscribe: true }) hass!: HomeAssistant;
  @consume({ context: storeContext, subscribe: true }) store!: GrowspaceStore;
  @consume({ context: configContext, subscribe: true }) config!: GrowspaceManagerCardConfig;

  @property({ attribute: false }) device!: GrowspaceDevice;
  @property({ type: Boolean }) compact = false;
  @property({ attribute: false }) growspaceOptions: Record<string, string> = {};

  private _controller!: StoreController<...>;
  private _dragController = new HeaderDragController(this);
  private _heroChips: HeaderChip[] = [];
  private _secondaryChips: HeaderChip[] = [];
  private _deviceChips: HeaderChip[] = [];
  private _dominant: DominantStageInfo | undefined;

  // connectedCallback, willUpdate, _updateMetrics exactly as in legacy file
  // render() returns <growspace-header-ui> with all computed props
}
```

### Step 2: Update import sites

Four files need the import path updated from `../growspace-header` / `'./components/growspace-header'` to point to `features/ui/containers/growspace-header.container`.

### Step 3: Update the existing spec

`tests/unit/components/growspace-header.spec.ts` — update import to `GrowspaceHeaderContainer`.

### Step 4: Delete the legacy file

```bash
rm src/components/growspace-header.ts
```

### Step 5: Run full tests

```bash
npx vitest run
```

Expected: all passing.

### Step 6: Commit

```bash
git add -A
git commit -m "refactor: migrate growspace-header to container/ui pattern"
```

---

## Task 8: Final cleanup

### Step 1: Verify src/components/ contains no fat components

```bash
grep -rl '@consume\|StoreController' src/components/
```

Expected: empty output (no results).

### Step 2: Run full test suite one final time

```bash
npx vitest run
```

### Step 3: Final commit

```bash
git add -A
git commit -m "chore: legacy component migration complete — src/components/ is fat-free"
```

---

## Notes

- `heatmap-3d.ts` is deferred. It stays in `src/components/` for now; its migration is a separate task after this plan completes.
- The `@open-wc/testing-helpers` `fixture` helper registers custom elements in a real DOM — no jsdom quirks for Lit shadow roots.
- Pre-existing test errors (18 lifecycle `GrowspaceDataStore` cleanup messages) are not regressions — they exist on the baseline branch.
