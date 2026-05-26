# Card Editor Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Standardize all card editors onto `ha-form`, extract shared growspace loading into a Reactive Controller, and add theme picker to the main card editor.

**Architecture:** A new `GrowspaceOptionsController` handles growspace state loading and `state_changed` subscription for all editors. A shared `computeEditorLabel` utility replaces inline label functions. The main card editor is rewritten from raw HTML to `ha-form` schema.

**Tech Stack:** TypeScript, Lit 3, Vitest, `@open-wc/testing-helpers`

**Design doc:** `docs/plans/2026-04-29-card-editor-improvements-design.md`

---

## Task 1: `GrowspaceOptionsController`

**Files:**
- Create: `src/controllers/growspace-options-controller.ts`
- Create: `src/controllers/growspace-options-controller.test.ts`

**Step 1: Write the failing test**

```typescript
// src/controllers/growspace-options-controller.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReactiveControllerHost } from 'lit';
import { GrowspaceOptionsController } from './growspace-options-controller';

const makeHass = (growspaces: Record<string, string> | null) => ({
  states: {
    'sensor.growspaces_list': growspaces
      ? { attributes: { growspaces } }
      : undefined,
  },
  connection: {
    subscribeEvents: vi.fn().mockResolvedValue(() => {}),
  },
});

const makeHost = (): ReactiveControllerHost & { requestUpdate: ReturnType<typeof vi.fn> } => {
  const controllers: any[] = [];
  return {
    addController: (c: any) => controllers.push(c),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  };
};

describe('GrowspaceOptionsController', () => {
  let host: ReturnType<typeof makeHost>;
  let controller: GrowspaceOptionsController;

  beforeEach(() => {
    host = makeHost();
    controller = new GrowspaceOptionsController(host);
  });

  it('starts with empty options', () => {
    expect(controller.options).toEqual([]);
  });

  it('loads options from hass state on update()', () => {
    const hass = makeHass({ 'gs-1': 'Tent A', 'gs-2': 'Tent B' }) as any;
    controller.update(hass);
    expect(controller.options).toEqual([
      { id: 'gs-1', name: 'Tent A' },
      { id: 'gs-2', name: 'Tent B' },
    ]);
  });

  it('sets options to [] when sensor is absent', () => {
    const hass = makeHass(null) as any;
    controller.update(hass);
    expect(controller.options).toEqual([]);
  });

  it('calls host.requestUpdate() after loading options', () => {
    const hass = makeHass({ 'gs-1': 'Tent A' }) as any;
    controller.update(hass);
    expect(host.requestUpdate).toHaveBeenCalled();
  });

  it('subscribes to state_changed only once across multiple update() calls', () => {
    const hass = makeHass({ 'gs-1': 'Tent A' }) as any;
    controller.update(hass);
    controller.update(hass);
    controller.update(hass);
    expect(hass.connection.subscribeEvents).toHaveBeenCalledTimes(1);
  });

  it('resets subscribed flag on hostDisconnected()', () => {
    const hass = makeHass({ 'gs-1': 'Tent A' }) as any;
    controller.update(hass);
    controller.hostDisconnected();
    controller.update(hass);
    expect(hass.connection.subscribeEvents).toHaveBeenCalledTimes(2);
  });
});
```

**Step 2: Run to verify it fails**

```bash
cd /home/maxi/core/core/vendor/lovelace-growspace-manager-card
npm run test:unit -- growspace-options-controller
```
Expected: FAIL — "Cannot find module './growspace-options-controller'"

**Step 3: Write the implementation**

```typescript
// src/controllers/growspace-options-controller.ts
import { ReactiveController, ReactiveControllerHost } from 'lit';
import { HomeAssistant } from 'custom-card-helpers';
import { HassSubscriptionController } from './hass-subscription-controller';

export class GrowspaceOptionsController implements ReactiveController {
  private _host: ReactiveControllerHost;
  private _subscriptionController: HassSubscriptionController;
  private _subscribed = false;

  options: { id: string; name: string }[] = [];

  constructor(host: ReactiveControllerHost) {
    this._host = host;
    this._subscriptionController = new HassSubscriptionController(host);
    host.addController(this);
  }

  hostConnected() {}

  hostDisconnected() {
    this._subscribed = false;
  }

  update(hass: HomeAssistant): void {
    this._loadFromState(hass);
    this._subscribe(hass);
  }

  private _loadFromState(hass: HomeAssistant): void {
    const entity = hass.states['sensor.growspaces_list'];
    const raw = entity?.attributes?.growspaces;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      this.options = Object.entries(raw as Record<string, string>).map(([id, name]) => ({
        id,
        name: String(name),
      }));
    } else {
      this.options = [];
    }
    this._host.requestUpdate();
  }

  private async _subscribe(hass: HomeAssistant): Promise<void> {
    if (this._subscribed) return;
    this._subscribed = true;

    await this._subscriptionController.subscribeEvents(
      hass,
      (event: unknown) => {
        const e = event as { data?: { new_state?: { entity_id?: string; attributes?: { growspaces?: Record<string, string> } } } };
        if (e.data?.new_state?.entity_id !== 'sensor.growspaces_list') return;
        const raw = e.data.new_state.attributes?.growspaces;
        if (raw) {
          this.options = Object.entries(raw).map(([id, name]) => ({ id, name: String(name) }));
        } else {
          this.options = [];
        }
        this._host.requestUpdate();
      },
      'state_changed'
    );
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npm run test:unit -- growspace-options-controller
```
Expected: All 6 tests PASS

**Step 5: Commit**

```bash
git add src/controllers/growspace-options-controller.ts src/controllers/growspace-options-controller.test.ts
git commit -m "feat: add GrowspaceOptionsController reactive controller"
```

---

## Task 2: Shared `computeEditorLabel`

**Files:**
- Create: `src/lib/editor-utils.ts`
- Create: `src/lib/editor-utils.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/editor-utils.test.ts
import { describe, it, expect } from 'vitest';
import { computeEditorLabel } from './editor-utils';

describe('computeEditorLabel', () => {
  it('returns human label for known field names', () => {
    expect(computeEditorLabel({ name: 'default_growspace' })).toBe('Default Growspace');
    expect(computeEditorLabel({ name: 'growspace_id' })).toBe('Parent Growspace');
    expect(computeEditorLabel({ name: 'subarea_id' })).toBe('Subarea');
    expect(computeEditorLabel({ name: 'theme' })).toBe('Theme');
    expect(computeEditorLabel({ name: 'initial_view_mode' })).toBe('Initial View Mode');
    expect(computeEditorLabel({ name: 'keyboard_rotate_enabled' })).toBe('Keyboard Rotation (3D View)');
    expect(computeEditorLabel({ name: 'keyboard_rotate_speed' })).toBe('Rotation Speed');
  });

  it('returns the field name itself for unknown fields', () => {
    expect(computeEditorLabel({ name: 'some_unknown_field' })).toBe('some_unknown_field');
  });
});
```

**Step 2: Run to verify it fails**

```bash
npm run test:unit -- editor-utils
```
Expected: FAIL — "Cannot find module './editor-utils'"

**Step 3: Write the implementation**

```typescript
// src/lib/editor-utils.ts
const FIELD_LABELS: Record<string, string> = {
  default_growspace:       'Default Growspace',
  growspace_id:            'Parent Growspace',
  subarea_id:              'Subarea',
  theme:                   'Theme',
  initial_view_mode:       'Initial View Mode',
  keyboard_rotate_enabled: 'Keyboard Rotation (3D View)',
  keyboard_rotate_speed:   'Rotation Speed',
};

export const computeEditorLabel = (schema: { name: string }): string =>
  FIELD_LABELS[schema.name] ?? schema.name;
```

**Step 4: Run tests to verify they pass**

```bash
npm run test:unit -- editor-utils
```
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/editor-utils.ts src/lib/editor-utils.test.ts
git commit -m "feat: add shared computeEditorLabel utility for card editors"
```

---

## Task 3: Rewrite main card editor

**Files:**
- Modify: `src/growspace-manager-card-editor.ts`

**Step 1: Replace the file contents**

```typescript
// src/growspace-manager-card-editor.ts
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { LovelaceCardEditor, HomeAssistant } from 'custom-card-helpers';
import type { GrowspaceManagerCardConfig } from './lib/types/config';
import { GrowspaceOptionsController } from './controllers/growspace-options-controller';
import { computeEditorLabel } from './lib/editor-utils';

@customElement('growspace-manager-card-editor')
export class GrowspaceManagerCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) private _config: GrowspaceManagerCardConfig | undefined;

  private _gsController = new GrowspaceOptionsController(this);

  public setConfig(config: GrowspaceManagerCardConfig): void {
    this._config = config;
  }

  updated(changedProps: Map<string, unknown>) {
    if (changedProps.has('hass') && this.hass) {
      this._gsController.update(this.hass);
    }
  }

  private _computeSchema() {
    return [
      {
        name: 'default_growspace',
        selector: {
          select: {
            options: [
              { label: 'Select a growspace...', value: '' },
              ...this._gsController.options.map(gs => ({ label: gs.name, value: gs.id })),
            ],
          },
        },
      },
      {
        name: 'theme',
        selector: {
          select: {
            options: [
              { label: 'Default', value: 'default' },
              { label: 'Dark', value: 'dark' },
              { label: 'Green', value: 'green' },
            ],
          },
        },
      },
      {
        name: 'initial_view_mode',
        selector: {
          select: {
            options: [
              { label: 'Standard', value: 'standard' },
              { label: 'Compact (Grid Only)', value: 'compact' },
              { label: 'Header Only', value: 'header' },
            ],
          },
        },
      },
      { name: 'keyboard_rotate_enabled', selector: { boolean: {} } },
      { name: 'keyboard_rotate_speed', selector: { number: { min: 0.1, max: 5.0, step: 0.1 } } },
    ];
  }

  render() {
    if (!this._config) return html``;

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this._computeSchema()}
        .computeLabel=${computeEditorLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    if (!this._config) return;
    this._config = ev.detail.value;
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }
}
```

**Step 2: Build to verify no TypeScript errors**

```bash
npm run build
```
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/growspace-manager-card-editor.ts
git commit -m "refactor: rewrite main card editor to use ha-form and GrowspaceOptionsController"
```

---

## Task 4: Update `growspace-grid-card-editor.ts`

**Files:**
- Modify: `src/cards/editors/growspace-grid-card-editor.ts`

**Step 1: Replace with updated version**

```typescript
// src/cards/editors/growspace-grid-card-editor.ts
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { LovelaceCardEditor, HomeAssistant } from 'custom-card-helpers';
import type { GrowspaceManagerCardConfig } from '../../lib/types/config';
import { GrowspaceOptionsController } from '../../controllers/growspace-options-controller';
import { computeEditorLabel } from '../../lib/editor-utils';

@customElement('growspace-grid-card-editor')
export class GrowspaceGridCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) private _config: GrowspaceManagerCardConfig | undefined;

  private _gsController = new GrowspaceOptionsController(this);

  public setConfig(config: GrowspaceManagerCardConfig): void {
    this._config = config;
  }

  updated(changedProps: Map<string, unknown>) {
    if (changedProps.has('hass') && this.hass) {
      this._gsController.update(this.hass);
    }
  }

  static styles = css`
    .card-config { display: flex; flex-direction: column; gap: 16px; }
    .info-box {
      background: rgba(var(--rgb-primary-color), 0.1);
      color: var(--primary-text-color);
      padding: 12px;
      border-radius: 8px;
      font-size: 0.9rem;
      border-left: 4px solid var(--primary-color);
    }
  `;

  private _computeSchema() {
    return [
      {
        name: 'default_growspace',
        selector: {
          select: {
            options: [
              { label: 'Select a growspace...', value: '' },
              ...this._gsController.options.map(gs => ({ label: gs.name, value: gs.id })),
            ],
          },
        },
      },
    ];
  }

  render() {
    if (!this._config) return html``;

    return html`
      <div class="card-config">
        <div class="info-box">
          The Grid Card is a localized view locked to the Standard tracking interface.
          Environment headers and charts are removed.
        </div>
        <ha-form
          .hass=${this.hass}
          .data=${this._config}
          .schema=${this._computeSchema()}
          .computeLabel=${computeEditorLabel}
          @value-changed=${this._valueChanged}
        ></ha-form>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    if (!this._config) return;
    this._config = ev.detail.value;
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-grid-card-editor': GrowspaceGridCardEditor;
  }
}
```

**Step 2: Build to verify no errors**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/cards/editors/growspace-grid-card-editor.ts
git commit -m "refactor: migrate grid card editor to GrowspaceOptionsController"
```

---

## Task 5: Update `growspace-analytics-card-editor.ts`

**Files:**
- Modify: `src/cards/editors/growspace-analytics-card-editor.ts`

**Step 1: Replace with updated version**

```typescript
// src/cards/editors/growspace-analytics-card-editor.ts
import { LitElement, html, css, CSSResultGroup, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import type { GrowspaceManagerCardConfig } from '../../lib/types/config';
import { GrowspaceOptionsController } from '../../controllers/growspace-options-controller';
import { computeEditorLabel } from '../../lib/editor-utils';
import { sharedStyles } from '../../styles/shared.styles';

@customElement('growspace-analytics-card-editor')
export class GrowspaceAnalyticsCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) private _config!: GrowspaceManagerCardConfig;

  private _gsController = new GrowspaceOptionsController(this);

  public setConfig(config: GrowspaceManagerCardConfig): void {
    this._config = config;
  }

  protected updated(changedProps: Map<string, unknown>): void {
    if (changedProps.has('hass') && this.hass) {
      this._gsController.update(this.hass);
    }
  }

  private _computeSchema() {
    return [
      {
        name: 'default_growspace',
        selector: {
          select: {
            options: [
              { label: 'Select a growspace...', value: '' },
              ...this._gsController.options.map(gs => ({ label: gs.name, value: gs.id })),
            ],
          },
        },
      },
    ];
  }

  private _valueChanged(ev: CustomEvent): void {
    if (!this._config || !this.hass) return;
    this._config = ev.detail.value;
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }

  static styles: CSSResultGroup = [
    sharedStyles,
    css`
      .card-config { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
      .info-text { font-size: 0.9em; color: var(--secondary-text-color); margin-top: 8px; }
    `,
  ];

  protected render(): TemplateResult {
    if (!this.hass || !this._config) return html``;

    return html`
      <div class="card-config">
        <ha-form
          .hass=${this.hass}
          .data=${this._config}
          .schema=${this._computeSchema()}
          .computeLabel=${computeEditorLabel}
          @value-changed=${this._valueChanged}
        ></ha-form>
        <div class="info-text">
          This card will permanently display the analytics charts and history for the selected growspace.
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-analytics-card-editor': GrowspaceAnalyticsCardEditor;
  }
}
```

**Step 2: Build to verify no errors**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/cards/editors/growspace-analytics-card-editor.ts
git commit -m "refactor: migrate analytics card editor to GrowspaceOptionsController"
```

---

## Task 6: Update `growspace-subarea-card-editor.ts`

**Files:**
- Modify: `src/cards/editors/growspace-subarea-card-editor.ts`

**Step 1: Replace growspace loading only — keep subarea async loading as-is**

The subarea editor has unique logic: it also loads subareas dynamically based on the selected growspace. Only replace the growspace loading portion.

```typescript
// src/cards/editors/growspace-subarea-card-editor.ts
import { LitElement, html, css, CSSResultGroup, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import { DataService } from '../../services/data-service';
import type { Subarea } from '../../services/types';
import { GrowspaceOptionsController } from '../../controllers/growspace-options-controller';
import { computeEditorLabel } from '../../lib/editor-utils';
import { sharedStyles } from '../../styles/shared.styles';
import type { GrowspaceSubareaCardConfig } from '../growspace-subarea-card';

@customElement('growspace-subarea-card-editor')
export class GrowspaceSubareaCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: GrowspaceSubareaCardConfig;
  @state() private _subareas: Subarea[] = [];
  @state() private _loadingSubareas = false;

  private _gsController = new GrowspaceOptionsController(this);
  private _dataService: DataService | null = null;

  public setConfig(config: GrowspaceSubareaCardConfig): void {
    this._config = config;
    if (config.growspace_id) {
      this._loadSubareas(config.growspace_id);
    }
  }

  protected updated(changedProps: Map<string, unknown>): void {
    if (changedProps.has('hass') && this.hass) {
      this._gsController.update(this.hass);
      if (this._config?.growspace_id) {
        this._loadSubareas(this._config.growspace_id);
      }
    }
  }

  private async _loadSubareas(growspaceId: string): Promise<void> {
    if (!growspaceId || !this.hass) return;

    if (!this._dataService) {
      this._dataService = new DataService(this.hass);
    } else {
      this._dataService.updateHass(this.hass);
    }

    this._loadingSubareas = true;
    this._subareas = [];

    try {
      this._subareas = await this._dataService.getSubareas(growspaceId);
    } catch (err) {
      console.error('[GrowspaceSubareaCardEditor] Failed to load subareas:', err);
      this._subareas = [];
    } finally {
      this._loadingSubareas = false;
    }
  }

  private _computeSchema() {
    const subareaOptions = [
      {
        label: this._config?.growspace_id
          ? (this._subareas.length ? 'Select a subarea...' : 'No subareas found')
          : 'Select a growspace first',
        value: '',
      },
      ...this._subareas.map(sa => ({ label: sa.name, value: sa.id })),
    ];

    return [
      {
        name: 'growspace_id',
        selector: {
          select: {
            options: [
              { label: 'Select a growspace...', value: '' },
              ...this._gsController.options.map(gs => ({ label: gs.name, value: gs.id })),
            ],
          },
        },
      },
      { name: 'subarea_id', selector: { select: { options: subareaOptions } } },
    ];
  }

  private _valueChanged(ev: CustomEvent): void {
    if (!this._config || !this.hass) return;

    const newConfig = ev.detail.value;
    if (newConfig.growspace_id !== this._config.growspace_id) {
      newConfig.subarea_id = '';
      this._loadSubareas(newConfig.growspace_id);
    }

    this._config = newConfig;
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }

  static styles: CSSResultGroup = [
    sharedStyles,
    css`
      .card-config { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
      .info-text { font-size: 0.85rem; color: var(--secondary-text-color); line-height: 1.4; }
      .loading-text { font-size: 0.85rem; color: var(--secondary-text-color); font-style: italic; }
    `,
  ];

  protected render(): TemplateResult {
    if (!this.hass || !this._config) return html``;

    return html`
      <div class="card-config">
        ${this._loadingSubareas ? html`<span class="loading-text">Loading subareas...</span>` : ''}
        <ha-form
          .hass=${this.hass}
          .data=${this._config}
          .schema=${this._computeSchema()}
          .computeLabel=${computeEditorLabel}
          @value-changed=${this._valueChanged}
        ></ha-form>
        <div class="info-text">
          Displays environment sensors and device status for the selected subarea within a growspace.
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-subarea-card-editor': GrowspaceSubareaCardEditor;
  }
}
```

**Step 2: Build to verify no errors**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/cards/editors/growspace-subarea-card-editor.ts
git commit -m "refactor: migrate subarea card editor to GrowspaceOptionsController"
```

---

## Task 7: Final verification

**Step 1: Run full test suite**

```bash
npm run test:unit
```
Expected: All tests pass

**Step 2: Build production bundle**

```bash
npm run build
```
Expected: No errors or warnings

**Step 3: Check for leftover duplication**

```bash
grep -r "_loadGrowspaces\|_growspaceOptions\|_sensorGrowspaces\|_hasSubscription" src/
```
Expected: No results — all old patterns gone

**Step 4: Verify new files exist**

```bash
ls src/controllers/growspace-options-controller.ts src/lib/editor-utils.ts
```
Expected: Both files present
