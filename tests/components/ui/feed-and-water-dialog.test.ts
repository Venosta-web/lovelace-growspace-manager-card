/**
 * Component tests for feed-and-water-dialog.
 *
 * Verifies: inventory and presets tabs render their UI components (not
 * placeholders), props are passed from SM state, and sm-event from the
 * presets section is translated to Preset* event names.
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import '../../../src/dialogs/feed-and-water-dialog';
import { FeedAndWaterDialog } from '../../../src/dialogs/feed-and-water-dialog';
import type { NutrientInventoryResponse, NutrientPresetsResponse } from '../../../src/slices/nutrient';
import type { SMEvent } from '../../../src/dialogs/feed-and-water-dialog-sm';

vi.mock('../../../src/slices/nutrient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/slices/nutrient')>();
  return {
    ...actual,
    updateNutrientStock: vi.fn().mockResolvedValue(undefined),
    removeNutrientStock: vi.fn().mockResolvedValue(undefined),
    saveNutrientPreset: vi.fn().mockResolvedValue(undefined),
    removeNutrientPreset: vi.fn().mockResolvedValue(undefined),
    fetchNutrientInventory: vi.fn().mockResolvedValue(undefined),
    fetchNutrientPresets: vi.fn().mockResolvedValue(undefined),
  };
});

// ─── Stubs ────────────────────────────────────────────────────────────────────

const stubs = ['ha-dialog', 'ha-svg-icon', 'gs-dialog', 'md3-number-input', 'md3-select'];
for (const tag of stubs) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {
      connectedCallback() { this.style.display = 'block'; }
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function aInventory(): NutrientInventoryResponse {
  return {
    stocks: {
      n1: { nutrient_id: 'n1', name: 'Cal-Mag', current_ml: 500, initial_ml: 1000, last_updated: '', brand: '', type: 'calmag', npk: '', dose_ml_l: 2, notes: '' },
    },
  };
}

function aPresets(): NutrientPresetsResponse {
  return {
    p1: { id: 'p1', name: 'Veg Week 1', stage: 'veg', week: 1, nutrients: [{ nutrient_id: 'n1', dose_ml_l: 2 }] },
  };
}

async function mountOpen(overrides: Partial<{ inventory: NutrientInventoryResponse; presets: NutrientPresetsResponse; presetOptions: { label: string; value: string }[] }> = {}): Promise<FeedAndWaterDialog> {
  return fixture<FeedAndWaterDialog>(html`
    <feed-and-water-dialog
      .open=${true}
      .inventory=${overrides.inventory ?? null}
      .presets=${overrides.presets ?? null}
      .presetOptions=${overrides.presetOptions ?? []}
    ></feed-and-water-dialog>
  `);
}

function clickNav(el: FeedAndWaterDialog, tab: 'watering' | 'inventory' | 'presets') {
  el.shadowRoot!.querySelector<HTMLElement>(`[data-nav="${tab}"]`)!.click();
}

function dispatchSmEventFromContent(el: FeedAndWaterDialog, event: object) {
  const content = el.shadowRoot!.querySelector('.content')!;
  content.dispatchEvent(new CustomEvent('sm-event', { detail: event, bubbles: true, composed: true }));
}

// ─── Tab rendering ────────────────────────────────────────────────────────────

describe('tab rendering', () => {
  it('renders growspace-nutrient-inventory-dialog-ui on inventory tab', async () => {
    const el = await mountOpen({ inventory: aInventory() });
    clickNav(el, 'inventory');
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('growspace-nutrient-inventory-dialog-ui')).toBeTruthy();
  });

  it('does not show placeholder text on inventory tab', async () => {
    const el = await mountOpen({ inventory: aInventory() });
    clickNav(el, 'inventory');
    await el.updateComplete;
    const placeholder = el.shadowRoot!.querySelector('.tab-placeholder');
    expect(placeholder).toBeFalsy();
  });

  it('renders growspace-nutrient-presets-editor-ui on presets tab', async () => {
    const el = await mountOpen({ presets: aPresets() });
    clickNav(el, 'presets');
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('growspace-nutrient-presets-editor-ui')).toBeTruthy();
  });

  it('does not show placeholder text on presets tab', async () => {
    const el = await mountOpen({ presets: aPresets() });
    clickNav(el, 'presets');
    await el.updateComplete;
    const placeholder = el.shadowRoot!.querySelector('.tab-placeholder');
    expect(placeholder).toBeFalsy();
  });
});

// ─── Inventory props ──────────────────────────────────────────────────────────

describe('inventory tab — props passed from SM', () => {
  it('passes inventory data to the component', async () => {
    const inventory = aInventory();
    const el = await mountOpen({ inventory });
    clickNav(el, 'inventory');
    await el.updateComplete;
    const ui = el.shadowRoot!.querySelector('growspace-nutrient-inventory-dialog-ui') as any;
    expect(ui.inventory).toBe(inventory);
  });

  it('passes selectedId from SM to the component', async () => {
    const el = await mountOpen({ inventory: aInventory() });
    clickNav(el, 'inventory');
    await el.updateComplete;

    dispatchSmEventFromContent(el, { type: 'ItemSelected', id: 'n1' });
    await el.updateComplete;

    const ui = el.shadowRoot!.querySelector('growspace-nutrient-inventory-dialog-ui') as any;
    expect(ui.selectedId).toBe('n1');
  });

  it('passes inventory sub state from SM to the component', async () => {
    const el = await mountOpen({ inventory: aInventory() });
    clickNav(el, 'inventory');
    await el.updateComplete;

    const ui = el.shadowRoot!.querySelector('growspace-nutrient-inventory-dialog-ui') as any;
    expect(ui.sub.kind).toBe('idle');
  });
});

// ─── Presets props ────────────────────────────────────────────────────────────

describe('presets tab — props passed from SM', () => {
  it('passes presets data to the component', async () => {
    const presets = aPresets();
    const el = await mountOpen({ presets });
    clickNav(el, 'presets');
    await el.updateComplete;
    const ui = el.shadowRoot!.querySelector('growspace-nutrient-presets-editor-ui') as any;
    expect(ui.presets).toBe(presets);
  });

  it('passes inventory to the presets component for nutrient resolution', async () => {
    const inventory = aInventory();
    const el = await mountOpen({ inventory, presets: aPresets() });
    clickNav(el, 'presets');
    await el.updateComplete;
    const ui = el.shadowRoot!.querySelector('growspace-nutrient-presets-editor-ui') as any;
    expect(ui.inventory).toBe(inventory);
  });
});

// ─── Presets event translation ────────────────────────────────────────────────

describe('presets tab — event translation', () => {
  async function mountOnPresets() {
    const el = await mountOpen({ presets: aPresets(), inventory: aInventory() });
    clickNav(el, 'presets');
    await el.updateComplete;
    return el;
  }

  function dispatchFromPresetsUi(el: FeedAndWaterDialog, event: object) {
    const ui = el.shadowRoot!.querySelector('growspace-nutrient-presets-editor-ui')!;
    ui.dispatchEvent(new CustomEvent('sm-event', { detail: event, bubbles: true, composed: true }));
  }

  it('translates ItemSelected → PresetItemSelected so presets tab selectedId is set', async () => {
    const el = await mountOnPresets();
    dispatchFromPresetsUi(el, { type: 'ItemSelected', id: 'p1' });
    await el.updateComplete;
    const ui = el.shadowRoot!.querySelector('growspace-nutrient-presets-editor-ui') as any;
    expect(ui.selectedId).toBe('p1');
  });

  it('translates BackToList → PresetBackToList so presets selectedId is cleared', async () => {
    const el = await mountOnPresets();
    dispatchFromPresetsUi(el, { type: 'ItemSelected', id: 'p1' });
    await el.updateComplete;
    dispatchFromPresetsUi(el, { type: 'BackToList' });
    await el.updateComplete;
    const ui = el.shadowRoot!.querySelector('growspace-nutrient-presets-editor-ui') as any;
    expect(ui.selectedId).toBeNull();
  });

  it('translates NewItemRequested → PresetNewItemRequested so presets sub becomes editing', async () => {
    const el = await mountOnPresets();
    dispatchFromPresetsUi(el, { type: 'NewItemRequested' });
    await el.updateComplete;
    const ui = el.shadowRoot!.querySelector('growspace-nutrient-presets-editor-ui') as any;
    expect(ui.sub.kind).toBe('editing');
  });

  it('does not translate inventory-only events (ItemSelected stays in inventory when fired from inventory section)', async () => {
    const el = await mountOpen({ inventory: aInventory() });
    clickNav(el, 'inventory');
    await el.updateComplete;
    dispatchSmEventFromContent(el, { type: 'ItemSelected', id: 'n1' });
    await el.updateComplete;
    const ui = el.shadowRoot!.querySelector('growspace-nutrient-inventory-dialog-ui') as any;
    expect(ui.selectedId).toBe('n1');
  });
});

// ─── Service calls — inventory ────────────────────────────────────────────────

describe('service calls — inventory', () => {
  let updateNutrientStock: ReturnType<typeof vi.fn>;
  let removeNutrientStock: ReturnType<typeof vi.fn>;
  let fetchNutrientInventory: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const mod = await import('../../../src/slices/nutrient');
    updateNutrientStock = mod.updateNutrientStock as ReturnType<typeof vi.fn>;
    removeNutrientStock = mod.removeNutrientStock as ReturnType<typeof vi.fn>;
    fetchNutrientInventory = mod.fetchNutrientInventory as ReturnType<typeof vi.fn>;
    vi.clearAllMocks();
  });

  it('SaveRequested on an existing stock calls updateNutrientStock with draft values', async () => {
    const el = await mountOpen({ inventory: aInventory() });
    clickNav(el, 'inventory');
    await el.updateComplete;

    dispatchSmEventFromContent(el, { type: 'ItemSelected', id: 'n1' });
    await el.updateComplete;
    dispatchSmEventFromContent(el, {
      type: 'EditStarted',
      draft: { name: 'Cal-Mag', current_ml: 400, initial_ml: 1000, brand: 'GH', stockType: 'calmag', npk: '', dose_ml_l: 2, notes: '' },
    });
    await el.updateComplete;
    dispatchSmEventFromContent(el, { type: 'SaveRequested' });
    await el.updateComplete;

    await vi.waitFor(() => expect(updateNutrientStock).toHaveBeenCalled());
    expect(updateNutrientStock).toHaveBeenCalledWith('n1', 'Cal-Mag', 400, 1000, 'GH', 'calmag', '', 2, '');
  });

  it('SaveRequested on a new stock uses a generated ID', async () => {
    const el = await mountOpen({ inventory: aInventory() });
    clickNav(el, 'inventory');
    await el.updateComplete;

    dispatchSmEventFromContent(el, { type: 'NewItemRequested' });
    await el.updateComplete;
    dispatchSmEventFromContent(el, { type: 'SaveRequested' });
    await el.updateComplete;

    await vi.waitFor(() => expect(updateNutrientStock).toHaveBeenCalled());
    const [id] = updateNutrientStock.mock.calls[0];
    expect(id).toMatch(/^nutrient_\d+$/);
  });

  it('DeleteConfirmed calls removeNutrientStock with the confirmed id', async () => {
    const el = await mountOpen({ inventory: aInventory() });
    clickNav(el, 'inventory');
    await el.updateComplete;

    dispatchSmEventFromContent(el, { type: 'ItemSelected', id: 'n1' });
    await el.updateComplete;
    dispatchSmEventFromContent(el, { type: 'DeleteRequested', id: 'n1', name: 'Cal-Mag' });
    await el.updateComplete;
    dispatchSmEventFromContent(el, { type: 'DeleteConfirmed' });
    await el.updateComplete;

    await vi.waitFor(() => expect(removeNutrientStock).toHaveBeenCalledWith('n1'));
  });

  it('SaveRequested failure fires SaveFailed and shows error sub', async () => {
    updateNutrientStock.mockRejectedValueOnce(new Error('network'));
    const el = await mountOpen({ inventory: aInventory() });
    clickNav(el, 'inventory');
    await el.updateComplete;

    dispatchSmEventFromContent(el, { type: 'NewItemRequested' });
    await el.updateComplete;
    dispatchSmEventFromContent(el, { type: 'SaveRequested' });
    await el.updateComplete;

    await vi.waitFor(() => {
      const ui = el.shadowRoot!.querySelector('growspace-nutrient-inventory-dialog-ui') as any;
      expect(ui.sub.kind).toBe('error');
    });
  });
});

// ─── Service calls — presets ──────────────────────────────────────────────────

describe('service calls — presets', () => {
  let saveNutrientPreset: ReturnType<typeof vi.fn>;
  let removeNutrientPreset: ReturnType<typeof vi.fn>;
  let fetchNutrientPresets: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const mod = await import('../../../src/slices/nutrient');
    saveNutrientPreset = mod.saveNutrientPreset as ReturnType<typeof vi.fn>;
    removeNutrientPreset = mod.removeNutrientPreset as ReturnType<typeof vi.fn>;
    fetchNutrientPresets = mod.fetchNutrientPresets as ReturnType<typeof vi.fn>;
    vi.clearAllMocks();
  });

  async function mountOnPresets() {
    const el = await mountOpen({ presets: aPresets(), inventory: aInventory() });
    clickNav(el, 'presets');
    await el.updateComplete;
    return el;
  }

  function dispatchFromPresetsUi(el: FeedAndWaterDialog, event: object) {
    const ui = el.shadowRoot!.querySelector('growspace-nutrient-presets-editor-ui')!;
    ui.dispatchEvent(new CustomEvent('sm-event', { detail: event, bubbles: true, composed: true }));
  }

  it('PresetSaveRequested on an existing preset calls saveNutrientPreset with correct args', async () => {
    const el = await mountOnPresets();

    dispatchFromPresetsUi(el, { type: 'ItemSelected', id: 'p1' });
    await el.updateComplete;
    dispatchFromPresetsUi(el, {
      type: 'EditStarted',
      draft: { name: 'Veg Week 1', stage: 'veg', week: 1, ec_target: 1.2, ph_target: 6.0, nutrients: [{ nutrient_id: 'n1', dose_ml_l: 2 }] },
    });
    await el.updateComplete;
    dispatchFromPresetsUi(el, { type: 'SaveRequested' });
    await el.updateComplete;

    await vi.waitFor(() => expect(saveNutrientPreset).toHaveBeenCalled());
    expect(saveNutrientPreset).toHaveBeenCalledWith(expect.objectContaining({
      preset_id: 'p1',
      name: 'Veg Week 1',
      stage: 'veg',
    }));
  });

  it('PresetSaveRequested on a new preset omits preset_id', async () => {
    const el = await mountOnPresets();

    dispatchFromPresetsUi(el, { type: 'NewItemRequested' });
    await el.updateComplete;
    dispatchFromPresetsUi(el, { type: 'SaveRequested' });
    await el.updateComplete;

    await vi.waitFor(() => expect(saveNutrientPreset).toHaveBeenCalled());
    expect(saveNutrientPreset).toHaveBeenCalledWith(expect.objectContaining({ preset_id: undefined }));
  });

  it('PresetDeleteConfirmed calls removeNutrientPreset with the confirmed id', async () => {
    const el = await mountOnPresets();

    dispatchFromPresetsUi(el, { type: 'ItemSelected', id: 'p1' });
    await el.updateComplete;
    dispatchFromPresetsUi(el, { type: 'DeleteRequested', id: 'p1', name: 'Veg Week 1' });
    await el.updateComplete;
    dispatchFromPresetsUi(el, { type: 'DeleteConfirmed' });
    await el.updateComplete;

    await vi.waitFor(() => expect(removeNutrientPreset).toHaveBeenCalledWith('p1'));
  });

  it('PresetSaveRequested failure fires SaveFailed and shows error sub', async () => {
    saveNutrientPreset.mockRejectedValueOnce(new Error('network'));
    const el = await mountOnPresets();

    dispatchFromPresetsUi(el, { type: 'NewItemRequested' });
    await el.updateComplete;
    dispatchFromPresetsUi(el, { type: 'SaveRequested' });
    await el.updateComplete;

    await vi.waitFor(() => {
      const ui = el.shadowRoot!.querySelector('growspace-nutrient-presets-editor-ui') as any;
      expect(ui.sub.kind).toBe('error');
    });
  });
});

// ─── Close event ──────────────────────────────────────────────────────────────

describe('close event', () => {
  it('dispatches a close CustomEvent when gs-dialog emits close', async () => {
    const el = await mountOpen();
    let fired = false;
    el.addEventListener('close', () => { fired = true; });

    const gsDialog = el.shadowRoot!.querySelector('gs-dialog')!;
    gsDialog.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));

    expect(fired).toBe(true);
  });
});

// ─── Watering tab — interactions ──────────────────────────────────────────────

describe('watering tab — record watering button', () => {
  it('dispatches submit-watering with current draft when Record Watering is clicked', async () => {
    const el = await mountOpen();
    let detail: unknown;
    el.addEventListener('submit-watering', (e: Event) => { detail = (e as CustomEvent).detail; });

    el.shadowRoot!.querySelector<HTMLElement>('[data-action="record-watering"]')!.click();

    expect(detail).toMatchObject({ volume: 1.0, presetId: '' });
  });
});

describe('watering tab — volume change handler', () => {
  it('updates SM draft volume when a valid value is dispatched', async () => {
    const el = await mountOpen();
    const input = el.shadowRoot!.querySelector('md3-number-input')!;
    input.dispatchEvent(new CustomEvent('change', { detail: '2.5', bubbles: true, composed: true }));
    await el.updateComplete;

    let detail: unknown;
    el.addEventListener('submit-watering', (e: Event) => { detail = (e as CustomEvent).detail; });
    el.shadowRoot!.querySelector<HTMLElement>('[data-action="record-watering"]')!.click();

    expect((detail as any).volume).toBe(2.5);
  });

  it('does not update SM draft when value is NaN', async () => {
    const el = await mountOpen();
    const input = el.shadowRoot!.querySelector('md3-number-input')!;
    input.dispatchEvent(new CustomEvent('change', { detail: 'not-a-number', bubbles: true, composed: true }));
    await el.updateComplete;

    let detail: unknown;
    el.addEventListener('submit-watering', (e: Event) => { detail = (e as CustomEvent).detail; });
    el.shadowRoot!.querySelector<HTMLElement>('[data-action="record-watering"]')!.click();

    expect((detail as any).volume).toBe(1.0);
  });

  it('does not update SM draft when value is zero or negative', async () => {
    const el = await mountOpen();
    const input = el.shadowRoot!.querySelector('md3-number-input')!;
    input.dispatchEvent(new CustomEvent('change', { detail: '0', bubbles: true, composed: true }));
    await el.updateComplete;

    let detail: unknown;
    el.addEventListener('submit-watering', (e: Event) => { detail = (e as CustomEvent).detail; });
    el.shadowRoot!.querySelector<HTMLElement>('[data-action="record-watering"]')!.click();

    expect((detail as any).volume).toBe(1.0);
  });

  it('updates SM draft presetId when md3-select dispatches change', async () => {
    const el = await mountOpen({
      presets: aPresets(),
      presetOptions: [{ label: 'Veg Week 1', value: 'p1' }],
    });
    const select = el.shadowRoot!.querySelector('md3-select')!;
    select.dispatchEvent(new CustomEvent('change', { detail: 'p1', bubbles: true, composed: true }));
    await el.updateComplete;

    let detail: unknown;
    el.addEventListener('submit-watering', (e: Event) => { detail = (e as CustomEvent).detail; });
    el.shadowRoot!.querySelector<HTMLElement>('[data-action="record-watering"]')!.click();

    expect((detail as any).presetId).toBe('p1');
  });
});

// ─── Confirm-discard overlay ───────────────────────────────────────────────────

describe('confirm-discard overlay', () => {
  async function mountWithDirtyInventory() {
    const el = await mountOpen({ inventory: aInventory() });
    clickNav(el, 'inventory');
    await el.updateComplete;
    dispatchSmEventFromContent(el, { type: 'NewItemRequested' });
    await el.updateComplete;
    return el;
  }

  it('renders the overlay when switching away from a dirty tab', async () => {
    const el = await mountWithDirtyInventory();
    clickNav(el, 'presets');
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.confirm-discard-overlay')).toBeTruthy();
  });

  it('"Keep editing" button dismisses the overlay without switching tabs', async () => {
    const el = await mountWithDirtyInventory();
    clickNav(el, 'presets');
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.btn-text')!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.confirm-discard-overlay')).toBeFalsy();
    expect(el.shadowRoot!.querySelector('growspace-nutrient-inventory-dialog-ui')).toBeTruthy();
  });

  it('"Discard" button dismisses the overlay and switches to the pending tab', async () => {
    const el = await mountWithDirtyInventory();
    clickNav(el, 'presets');
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.btn-danger')!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.confirm-discard-overlay')).toBeFalsy();
    expect(el.shadowRoot!.querySelector('growspace-nutrient-presets-editor-ui')).toBeTruthy();
  });
});
