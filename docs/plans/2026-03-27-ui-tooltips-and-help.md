# UI Tooltips & Help System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a reusable `<gs-help-tooltip>` component and deploy it across all dialogs (with real help text for the 4 most complex ones) and the main card header.

**Architecture:** Single `GsHelpTooltip` LitElement using the CSS anchor positioning + `popover` API pattern already used in `header-actions.ts`. Phase 1 adds the component + real help text to Crop Steering, EC Ramp, Irrigation, Nutrients. Phase 2 adds ⓘ structure with placeholder text to all remaining 12 dialogs. Phase 3 upgrades header chip/button `title=""` attrs to use the component.

**Tech Stack:** LitElement, CSS anchor positioning, `popover` API, `@mdi/js` (`mdiInformationOutline`), Vitest for unit tests.

---

### Task 1: Create `<gs-help-tooltip>` component

**Files:**
- Create: `src/components/ui/gs-help-tooltip.ts`
- Modify: `src/components/ui/index.ts`

**Step 1: Write the failing test**

Create `tests/components/ui/gs-help-tooltip.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import '../../src/components/ui/gs-help-tooltip';
import type { GsHelpTooltip } from '../../src/components/ui/gs-help-tooltip';

describe('GsHelpTooltip', () => {
  it('renders an info icon button', async () => {
    const el = await fixture<GsHelpTooltip>(html`
      <gs-help-tooltip content="Test help text"></gs-help-tooltip>
    `);
    const btn = el.shadowRoot!.querySelector('.help-trigger');
    expect(btn).toBeTruthy();
  });

  it('renders popover with content text', async () => {
    const el = await fixture<GsHelpTooltip>(html`
      <gs-help-tooltip content="Explains the feature"></gs-help-tooltip>
    `);
    const popover = el.shadowRoot!.querySelector('.help-popover');
    expect(popover?.textContent?.trim()).toContain('Explains the feature');
  });

  it('accepts placement prop without error', async () => {
    const el = await fixture<GsHelpTooltip>(html`
      <gs-help-tooltip content="Test" placement="bottom"></gs-help-tooltip>
    `);
    expect(el.placement).toBe('bottom');
  });

  it('renders nothing when content is empty', async () => {
    const el = await fixture<GsHelpTooltip>(html`
      <gs-help-tooltip content=""></gs-help-tooltip>
    `);
    const btn = el.shadowRoot!.querySelector('.help-trigger');
    expect(btn).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd /home/maxi/core/core/vendor/lovelace-growspace-manager-card/.worktrees/ui-tooltips
npx vitest run tests/components/ui/gs-help-tooltip.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement the component**

Create `src/components/ui/gs-help-tooltip.ts`:

```typescript
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiInformationOutline } from '@mdi/js';

@customElement('gs-help-tooltip')
export class GsHelpTooltip extends LitElement {
  @property({ type: String }) content = '';
  @property({ type: String }) placement: 'top' | 'bottom' | 'left' | 'right' = 'top';

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
    }

    .help-trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      color: var(--secondary-text-color, rgba(255, 255, 255, 0.5));
      border-radius: 50%;
      transition: color 0.2s;
      anchor-name: --help-anchor;
      flex-shrink: 0;
    }

    .help-trigger:hover,
    .help-trigger:focus-visible {
      color: var(--primary-color, #2196f3);
      outline: none;
    }

    .help-trigger svg {
      width: 16px;
      height: 16px;
      fill: currentColor;
      pointer-events: none;
    }

    .help-popover {
      position: fixed;
      inset: auto;
      position-anchor: --help-anchor;
      margin: 0;
      border: none;
      padding: 0;
      background: transparent;
    }

    .help-popover[popover]:popover-open {
      display: block;
    }

    .help-popover-inner {
      background: var(--card-background-color, #2a2a2a);
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.15));
      border-radius: 8px;
      padding: 8px 12px;
      max-width: 240px;
      font-size: 0.8rem;
      line-height: 1.5;
      color: var(--primary-text-color, rgba(255, 255, 255, 0.9));
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      animation: tooltip-fade-in 0.15s ease-out;
      white-space: normal;
    }

    @keyframes tooltip-fade-in {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Placement variants — CSS anchor positioning */
    :host([placement='top']) .help-popover {
      bottom: anchor(top);
      left: anchor(center);
      translate: -50% -6px;
    }

    :host([placement='bottom']) .help-popover {
      top: anchor(bottom);
      left: anchor(center);
      translate: -50% 6px;
    }

    :host([placement='left']) .help-popover {
      right: anchor(left);
      top: anchor(center);
      translate: -6px -50%;
    }

    :host([placement='right']) .help-popover {
      left: anchor(right);
      top: anchor(center);
      translate: 6px -50%;
    }
  `;

  private _popoverId = `gs-help-${Math.random().toString(36).slice(2)}`;

  render() {
    if (!this.content) return nothing;

    return html`
      <button
        class="help-trigger"
        popovertarget="${this._popoverId}"
        aria-label="Help"
        title="Help"
      >
        <svg viewBox="0 0 24 24"><path d="${mdiInformationOutline}"></path></svg>
      </button>
      <div
        id="${this._popoverId}"
        class="help-popover"
        popover="auto"
      >
        <div class="help-popover-inner">${this.content}</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gs-help-tooltip': GsHelpTooltip;
  }
}
```

**Step 4: Export from index**

Add to `src/components/ui/index.ts`:
```typescript
export * from './gs-help-tooltip';
```

Also add the import line:
```typescript
import './gs-help-tooltip';
```

**Step 5: Run test to verify it passes**

```bash
npx vitest run tests/components/ui/gs-help-tooltip.test.ts
```

Expected: 4 passing.

**Step 6: Commit**

```bash
git add src/components/ui/gs-help-tooltip.ts src/components/ui/index.ts tests/components/ui/gs-help-tooltip.test.ts
git commit -m "feat: add gs-help-tooltip reusable info tooltip component"
```

---

### Task 2: Crop Steering dialog — real help text

**Files:**
- Modify: `src/dialogs/crop-steering-dialog.ts`

The crop steering dialog shows a score, a mode badge (vegetative/generative/balanced), and 4 metric cards: Dry-back Event %, Peak VWC, Trough VWC, EC Trend.

**Step 1: Add import and field-label helper**

At the top of `crop-steering-dialog.ts`, add:
```typescript
import '../components/ui/gs-help-tooltip';
```

**Step 2: Add a `_labelWithHelp` helper method to the class**

```typescript
private _labelWithHelp(label: string, help: string) {
  return html`
    <div style="display:flex;align-items:center;gap:4px;">
      <span>${label}</span>
      <gs-help-tooltip .content=${help} placement="top"></gs-help-tooltip>
    </div>
  `;
}
```

**Step 3: Add help tooltip to the mode badge area**

Wrap the "VEGETATIVE / GENERATIVE / BALANCED MODE" badge. After `<div class="mode-badge ...">`, add inline next to the title:

Replace this block in `render()`:
```html
<div class="mode-badge mode-${mode}">
  ${mode.toUpperCase()} MODE
</div>
```

With:
```html
<div style="display:flex;align-items:center;justify-content:center;gap:8px;">
  <div class="mode-badge mode-${mode}">
    ${mode.toUpperCase()} MODE
  </div>
  <gs-help-tooltip
    content="Vegetative mode drives leafy growth with smaller, more frequent irrigations. Generative mode promotes flowering and resin by allowing larger dry-backs between irrigations. Balanced is transitional."
    placement="right"
  ></gs-help-tooltip>
</div>
```

**Step 4: Add ⓘ icons to each metric card**

Update `_renderMetricCard` to accept an optional `help` string:

```typescript
private _renderMetricCard(title: string, value: string, icon: string, color: string, help = '') {
  return html`
    <div class="metric-card">
      <ha-svg-icon .path=${icon} style="color: ${color}; margin-bottom: 8px;"></ha-svg-icon>
      <div class="metric-value">${value}</div>
      <div class="metric-label" style="display:flex;align-items:center;gap:4px;justify-content:center;">
        ${title}
        ${help ? html`<gs-help-tooltip .content=${help} placement="bottom"></gs-help-tooltip>` : ''}
      </div>
    </div>
  `;
}
```

**Step 5: Pass help text to each metric card call**

Replace the 4 `_renderMetricCard` calls:

```typescript
this._renderMetricCard(
  'Dry-back Event', `${attrs.dryback_percent || 0}%`, mdiWaterPercent, 'var(--primary-color)',
  'The % of substrate water content lost between the last irrigation and the trough (driest point). Higher dry-back = more generative stress. Veg: 3–5%. Flower: 5–10%.'
)
this._renderMetricCard(
  'Peak VWC', `${attrs.peak_vwc || 0}%`, mdiWaterPercent, 'var(--success-color, #4CAF50)',
  'Volumetric Water Content (VWC) at the highest point after irrigation. Higher peak = more vegetative. Typical range: 50–70% depending on substrate.'
)
this._renderMetricCard(
  'Trough VWC', `${attrs.trough_vwc || 0}%`, mdiWaterPercent, 'var(--warning-color, #FF9800)',
  'VWC at the driest point before the next irrigation fires. Lower trough = more generative stress. Typical range: 30–50%.'
)
this._renderMetricCard(
  'EC Trend', (attrs.ec_trend || 'stable').toUpperCase(), trendIcon, trendColor,
  'Whether the electrical conductivity (nutrient strength) in the substrate is rising, falling, or stable. Rising EC may indicate under-irrigation or salt build-up.'
)
```

**Step 6: Add help to the score itself**

Wrap the score header:
```html
<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;">
  <div style="font-size: 36px; font-weight: bold;">
    ${score > 0 ? '+' : ''}${score.toFixed(2)}
  </div>
  <gs-help-tooltip
    content="Crop steering score: positive values indicate generative conditions (promoting flowering), negative values indicate vegetative conditions (promoting growth). Aim for +0.5–+2.0 in late flower."
    placement="right"
  ></gs-help-tooltip>
</div>
```

**Step 7: Run full tests**

```bash
npx vitest run
```

Expected: all passing.

**Step 8: Commit**

```bash
git add src/dialogs/crop-steering-dialog.ts
git commit -m "feat(tooltip): add help tooltips to crop steering dialog"
```

---

### Task 3: EC Ramp Editor dialog — real help text

**Files:**
- Modify: `src/dialogs/ec-ramp-editor-dialog.ts`

The EC ramp editor has: Curve Name, Growth Stage selector, and a list of Day/Target EC (mS/cm) points.

**Step 1: Add import**

```typescript
import '../components/ui/gs-help-tooltip';
```

**Step 2: Add help to the subtitle**

The subtitle reads "Define daily EC targets". Add a tooltip next to the dialog title:

In `render()`, find the `<h2 class="dialog-title">` line for the EDIT view and replace the title group:

```html
<div class="dialog-title-group" style="display:flex;align-items:center;gap:6px;">
  <h2 class="dialog-title">${title}</h2>
  ${this._view === 'EDIT' ? html`
    <gs-help-tooltip
      content="An EC Ramp Curve defines target nutrient strength (EC in mS/cm) day-by-day throughout a growth stage. Plants need progressively stronger nutrients as they mature. Start low (0.8–1.2 in seedling), ramp up through veg (1.5–2.0), peak in flower (2.0–2.8), then flush low at harvest."
      placement="bottom"
    ></gs-help-tooltip>
  ` : ''}
</div>
```

**Step 3: Add help to the Growth Stage field**

Find the `label="Growth Stage"` select element. Wrap it in a labeled row:

Before the `<md3-select label="Growth Stage" ...>`, add a label row:

```html
<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;font-size:0.875rem;color:var(--secondary-text-color);">
  Growth Stage
  <gs-help-tooltip
    content="Which growth phase this curve applies to. The correct curve is automatically applied when a plant enters that stage."
    placement="right"
  ></gs-help-tooltip>
</div>
```

**Step 4: Add help to the EC points section header**

Find `.points-header` / `<h3>` for the ramp points. After that heading text, add:

```html
<gs-help-tooltip
  content="Each point sets a target EC (mS/cm) for a specific day of the stage. The system interpolates between points. Add at least 2 points — a start and an end."
  placement="top"
></gs-help-tooltip>
```

**Step 5: Add help to the Target EC column label**

Find the `label="Target EC (mS/cm)"` input. Inline a tooltip in its label area using the same labeled-row pattern as Step 3.

```html
<div style="display:flex;align-items:center;gap:4px;font-size:0.875rem;color:var(--secondary-text-color);margin-bottom:4px;">
  Target EC (mS/cm)
  <gs-help-tooltip
    content="Electrical Conductivity measures total dissolved nutrients. 1 mS/cm ≈ 700 ppm. Too high causes nutrient burn; too low causes deficiency. Adjust based on plant response."
    placement="top"
  ></gs-help-tooltip>
</div>
```

**Step 6: Run full tests and commit**

```bash
npx vitest run
git add src/dialogs/ec-ramp-editor-dialog.ts
git commit -m "feat(tooltip): add help tooltips to EC ramp editor dialog"
```

---

### Task 4: Irrigation dialog — real help text

**Files:**
- Modify: `src/dialogs/irrigation-dialog.ts`

The irrigation dialog has tabs for irrigation schedule (pump entity, times, duration) and drain schedule plus a tank visualization.

**Step 1: Add import**

```typescript
import '../components/ui/gs-help-tooltip';
```

**Step 2: Add help to irrigation duration field**

Find where `_irrigationDuration` is rendered as an input. Add a label row:

```html
<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;font-size:0.875rem;color:var(--secondary-text-color);">
  Shot Duration (seconds)
  <gs-help-tooltip
    content="How long the irrigation pump runs per shot. Shorter shots = smaller volume delivered. Adjust until your substrate reaches your target VWC peak. Typical: 15–120 seconds per shot."
    placement="right"
  ></gs-help-tooltip>
</div>
```

**Step 3: Add help to drain duration field**

Same pattern for `_drainDuration`:

```html
<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;font-size:0.875rem;color:var(--secondary-text-color);">
  Drain Duration (seconds)
  <gs-help-tooltip
    content="How long the drain pump runs after irrigation. Ensures excess runoff is removed from the tray/slab. Too short = waterlogging. Too long = excessive runoff."
    placement="right"
  ></gs-help-tooltip>
</div>
```

**Step 4: Add help to the time bar visualization header**

Locate the `.time-bar-container` section header (the label or section above it). Add:

```html
<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
  <span>Schedule</span>
  <gs-help-tooltip
    content="Each marker is a scheduled irrigation event. The first irrigation of the day (P1) is timed to 'wake up' the substrate. Subsequent shots (P2) maintain moisture. The last shot (P3) ends 1–2 hours before lights off to allow a night dry-back."
    placement="top"
  ></gs-help-tooltip>
</div>
```

**Step 5: Run full tests and commit**

```bash
npx vitest run
git add src/dialogs/irrigation-dialog.ts
git commit -m "feat(tooltip): add help tooltips to irrigation dialog"
```

---

### Task 5: Nutrients dialog — real help text

**Files:**
- Modify: `src/dialogs/nutrient-dialog.ts`
- Read first: `src/components/manager/nutrient-presets-editor.ts` (where preset fields live)
- Modify: `src/components/manager/nutrient-presets-editor.ts`

**Step 1: Add import to nutrient-dialog.ts**

```typescript
import '../components/ui/gs-help-tooltip';
```

**Step 2: Add help to Inventory tab label**

In the tab bar, after the "Inventory" tab text:

```html
<div class="tab ${this._activeTab === 'inventory' ? 'active' : ''}" @click=${() => this._setTab('inventory')}>
  <!-- existing icon -->
  Inventory
  <gs-help-tooltip
    content="Track your nutrient bottles — name, brand, and stock level. Add all nutrients you own so they appear in your feeding presets."
    placement="bottom"
  ></gs-help-tooltip>
</div>
```

**Step 3: Add help to Presets tab label**

```html
<div class="tab ${this._activeTab === 'presets' ? 'active' : ''}" @click=${() => this._setTab('presets')}>
  <!-- existing icon -->
  Presets
  <gs-help-tooltip
    content="Feeding recipes that define how much of each nutrient to add per litre. Create one preset per growth stage (e.g. 'Week 3 Veg', 'Week 5 Flower'). The watering dialog uses these to calculate your mix."
    placement="bottom"
  ></gs-help-tooltip>
</div>
```

**Step 4: Add import + help to nutrient-presets-editor.ts**

Read the file first to find EC target and feed-rate fields, then add:

```typescript
import '../components/ui/gs-help-tooltip';
```

Find the EC target input and wrap with:
```html
<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;font-size:0.875rem;color:var(--secondary-text-color);">
  Target EC (mS/cm)
  <gs-help-tooltip
    content="The total electrical conductivity your final mixed solution should reach. The system calculates how much to add based on each nutrient's EC contribution per ml/L."
    placement="right"
  ></gs-help-tooltip>
</div>
```

**Step 5: Run full tests and commit**

```bash
npx vitest run
git add src/dialogs/nutrient-dialog.ts src/components/manager/nutrient-presets-editor.ts
git commit -m "feat(tooltip): add help tooltips to nutrients dialog"
```

---

### Task 6: Phase 2 — ⓘ structure for all remaining dialogs

**Files to modify (add import + one ⓘ per dialog title area):**
- `src/dialogs/watering-dialog.ts`
- `src/dialogs/ipm-dialog.ts` (or `src/components/manager/ipm-dialog.ts`)
- `src/dialogs/training-dialog.ts`
- `src/dialogs/harvest-scoring-dialog.ts`
- `src/dialogs/logbook-dialog.ts`
- `src/dialogs/strain-library-dialog.ts`
- `src/dialogs/config-dialog.ts`
- `src/dialogs/sensor-group-dialog.ts`
- `src/dialogs/grow-report-dialog.ts`
- `src/dialogs/snapshots-dialog.ts`
- `src/dialogs/add-plant-dialog.ts`
- `src/dialogs/clone-dialog.ts`

For each file:

**Step 1: Add import**

```typescript
import '../components/ui/gs-help-tooltip';
```

**Step 2: Add one ⓘ next to the dialog title**

Pattern — find `<h2 class="dialog-title">` and wrap:

```html
<div style="display:flex;align-items:center;gap:6px;">
  <h2 class="dialog-title">Watering</h2>
  <gs-help-tooltip
    content="Log a watering event — record volume, EC, pH, and runoff data for one or more plants."
    placement="bottom"
  ></gs-help-tooltip>
</div>
```

Use these placeholder help texts:

| Dialog | Placeholder text |
|--------|-----------------|
| watering | Log a watering event — record volume, EC, pH, and runoff data for one or more plants. |
| ipm | Integrated Pest Management — log pest/disease treatments, track application dates and products used. |
| training | Record plant training events such as LST, topping, defoliation, or SCROG weaving. |
| harvest-scoring | Score your harvest for quality attributes like aroma, density, trichome coverage, and overall yield. |
| logbook | Free-form grow log — add notes, observations, or reminders tied to today's date. |
| strain-library | Browse and manage your strain database. Assign genetics to plants for tracking lineage and expected traits. |
| config | Configure this growspace — sensor assignments, name, and integration settings. |
| sensor-group | Group sensors together so their readings are averaged or compared as a unit. |
| grow-report | Generate a summary report of this grow cycle including environment averages, yield, and key events. |
| snapshots | View and compare time-lapse camera snapshots from your grow space. |
| add-plant | Add a new plant to this growspace — enter strain, breeder, and start date. |
| clone | Clone an existing plant entry to quickly duplicate its strain and metadata. |

**Step 3: Run full tests**

```bash
npx vitest run
```

Expected: all passing (no logic changed, only template additions).

**Step 4: Commit all Phase 2 dialogs in one commit**

```bash
git add src/dialogs/
git commit -m "feat(tooltip): add help tooltip structure to all remaining dialogs"
```

---

### Task 7: Upgrade header buttons to use `<gs-help-tooltip>`

**Files:**
- Modify: `src/components/growspace-header/header-actions.ts`

The header currently uses bare `title="..."` on `.icon-button` divs. Replace with `<gs-help-tooltip>` positioned absolutely over each button.

**Step 1: Add import**

```typescript
import '../components/ui/gs-help-tooltip';
```

**Step 2: Wrap each icon button**

The pattern — replace each bare button div with a wrapper that positions the tooltip:

```typescript
// Helper method
private _iconButton(icon: string, action: string, label: string, help: string, active = false) {
  return html`
    <div style="position:relative;display:inline-flex;align-items:center;">
      <div
        class="icon-button ${active ? 'active' : ''}"
        @click=${() => this._triggerAction(action)}
        title="${label}"
      >
        <svg viewBox="0 0 24 24"><path d="${icon}"></path></svg>
      </div>
      <gs-help-tooltip
        .content=${help}
        placement="bottom"
        style="position:absolute;top:-4px;right:-4px;"
      ></gs-help-tooltip>
    </div>
  `;
}
```

**Step 3: Replace the 3 bare icon buttons in render()**

Replace the Edit Mode, Heatmap, and Settings buttons using the helper:

```typescript
${this._iconButton(
  mdiPencil, 'edit', 'Edit Mode',
  'Edit mode lets you reorder plants, remove them from the growspace, or drag metric chips to rearrange the header.',
  this._isEditModeController?.value
)}
${this._iconButton(
  mdiCube, 'heatmap', '3D Heatmap',
  'Switch to 3D VPD heatmap view — visualizes temperature and humidity distribution across your canopy as a 3D surface.',
  this._viewModeController?.value === ViewMode.HEATMAP
)}
${this._iconButton(
  mdiCog, 'config', 'Settings',
  'Open growspace settings — configure sensor assignments, irrigation strategy, and integration options.',
)}
```

**Step 4: Add help text to metric chips**

The chips already pass through a `tooltip` prop from `metrics-utils.ts`. Check `src/utils/metrics-utils.ts` to see where chips are built and add `tooltip` strings for common sensor types (temperature, humidity, VPD, CO₂, DLI, crop steering score).

Read `src/utils/metrics-utils.ts` first, then add tooltip strings to the `HeaderChip` objects for each metric key.

**Step 5: Run full tests**

```bash
npx vitest run
```

Expected: all passing.

**Step 6: Commit**

```bash
git add src/components/growspace-header/header-actions.ts src/utils/metrics-utils.ts
git commit -m "feat(tooltip): upgrade header buttons and chips to use gs-help-tooltip"
```

---

### Task 8: Final verification

**Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: all 3708+ tests passing.

**Step 2: Build to verify no TypeScript errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: clean build, no errors.

**Step 3: Request code review**

Use `superpowers:requesting-code-review` skill.

**Step 4: Use finishing-a-development-branch skill**

Use `superpowers:finishing-a-development-branch` to merge or PR.
