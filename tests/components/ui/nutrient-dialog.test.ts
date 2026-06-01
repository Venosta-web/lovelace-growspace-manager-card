/**
 * Component tests for nutrient-dialog.
 *
 * Verifies: left-rail nav renders, tab switching, badge counts, stock
 * indicator, sm-event wiring, fetch-on-open, and async mutator dispatch
 * when the SM sub reaches 'applying'.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import '../../../src/dialogs/nutrient-dialog';
import { NutrientDialog } from '../../../src/dialogs/nutrient-dialog';
import { nutrientInventory$, nutrientPresets$ } from '../../../src/slices/nutrient';
import type { NutrientInventoryResponse, NutrientPresetsResponse } from '../../../src/slices/nutrient';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../../src/slices/nutrient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/slices/nutrient')>();
  return {
    ...actual,
    fetchNutrientInventory: vi.fn().mockResolvedValue(undefined),
    fetchNutrientPresets: vi.fn().mockResolvedValue(undefined),
    updateNutrientStock: vi.fn().mockResolvedValue(undefined),
    removeNutrientStock: vi.fn().mockResolvedValue(undefined),
    saveNutrientPreset: vi.fn().mockResolvedValue(undefined),
    removeNutrientPreset: vi.fn().mockResolvedValue(undefined),
  };
});

// import mocked functions for assertions
import {
  fetchNutrientInventory,
  fetchNutrientPresets,
  updateNutrientStock,
  removeNutrientStock,
  saveNutrientPreset,
  removeNutrientPreset,
} from '../../../src/slices/nutrient';

// ─── Stubs ────────────────────────────────────────────────────────────────────

const stubs = ['ha-dialog', 'ha-svg-icon', 'growspace-nutrient-inventory-dialog-ui', 'growspace-nutrient-presets-editor-ui'];
for (const tag of stubs) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {
      connectedCallback() { this.style.display = 'block'; }
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function aInventory(lowStock = false): NutrientInventoryResponse {
  return {
    stocks: {
      n1: { nutrient_id: 'n1', name: 'Cal-Mag', current_ml: lowStock ? 100 : 800, initial_ml: 1000, last_updated: '', brand: '', type: 'calmag', npk: '', dose_ml_l: 2, notes: '' },
      n2: { nutrient_id: 'n2', name: 'Bloom A', current_ml: 500, initial_ml: 1000, last_updated: '', brand: '', type: 'bloom', npk: '', dose_ml_l: 3, notes: '' },
    },
  };
}

function aPresets(): NutrientPresetsResponse {
  return {
    p1: { id: 'p1', name: 'Veg Week 1', stage: 'veg', week: 1, nutrients: [{ nutrient_id: 'n1', dose_ml_l: 2 }] },
    p2: { id: 'p2', name: 'Bloom Week 4', stage: 'flower', week: 4, nutrients: [] },
  };
}

async function mountOpen(): Promise<NutrientDialog> {
  return fixture<NutrientDialog>(html`<nutrient-dialog .open=${true}></nutrient-dialog>`);
}

function dispatchSmEvent(el: NutrientDialog, event: object) {
  el.shadowRoot!.querySelector('[data-content]')!
    .dispatchEvent(new CustomEvent('sm-event', { detail: event, bubbles: true, composed: true }));
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  nutrientInventory$.set(null);
  nutrientPresets$.set(null);
  vi.clearAllMocks();
});

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('shell — nav rail', () => {
  it('renders an Inventory nav item', async () => {
    const el = await mountOpen();
    expect(el.shadowRoot!.querySelector('[data-nav="inventory"]')).toBeTruthy();
  });

  it('renders a Presets nav item', async () => {
    const el = await mountOpen();
    expect(el.shadowRoot!.querySelector('[data-nav="presets"]')).toBeTruthy();
  });

  it('marks inventory as active by default', async () => {
    const el = await mountOpen();
    const item = el.shadowRoot!.querySelector('[data-nav="inventory"]')!;
    expect(item.getAttribute('aria-pressed')).toBe('true');
  });

  it('shows inventory item count badge when inventory is loaded', async () => {
    nutrientInventory$.set(aInventory());
    const el = await mountOpen();
    const badge = el.shadowRoot!.querySelector('[data-badge="inventory"]');
    expect(badge?.textContent?.trim()).toBe('2');
  });

  it('shows presets item count badge when presets are loaded', async () => {
    nutrientPresets$.set(aPresets());
    const el = await mountOpen();
    const badge = el.shadowRoot!.querySelector('[data-badge="presets"]');
    expect(badge?.textContent?.trim()).toBe('2');
  });

  it('shows a stock indicator when any item is low stock (≤25%)', async () => {
    nutrientInventory$.set(aInventory(true));
    const el = await mountOpen();
    expect(el.shadowRoot!.querySelector('[data-low-stock]')).toBeTruthy();
  });

  it('does not show stock indicator when all items are above 25%', async () => {
    nutrientInventory$.set(aInventory(false));
    const el = await mountOpen();
    expect(el.shadowRoot!.querySelector('[data-low-stock]')).toBeFalsy();
  });
});

describe('shell — content area', () => {
  it('renders inventory UI when on inventory tab', async () => {
    const el = await mountOpen();
    expect(el.shadowRoot!.querySelector('growspace-nutrient-inventory-dialog-ui')).toBeTruthy();
  });

  it('renders presets UI when on presets tab', async () => {
    const el = await mountOpen();
    el.shadowRoot!.querySelector<HTMLElement>('[data-nav="presets"]')!.click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('growspace-nutrient-presets-editor-ui')).toBeTruthy();
  });
});

// ─── Fetch on open ────────────────────────────────────────────────────────────

describe('fetch on open', () => {
  it('calls fetchNutrientInventory when opened', async () => {
    await mountOpen();
    expect(fetchNutrientInventory).toHaveBeenCalledOnce();
  });

  it('calls fetchNutrientPresets when opened', async () => {
    await mountOpen();
    expect(fetchNutrientPresets).toHaveBeenCalledOnce();
  });

  it('does not fetch when closed', async () => {
    await fixture<NutrientDialog>(html`<nutrient-dialog .open=${false}></nutrient-dialog>`);
    expect(fetchNutrientInventory).not.toHaveBeenCalled();
  });
});

// ─── sm-event wiring ──────────────────────────────────────────────────────────

describe('sm-event wiring', () => {
  it('switches to presets tab when TabSelected presets fires from content', async () => {
    const el = await mountOpen();
    dispatchSmEvent(el, { type: 'TabSelected', tab: 'presets' });
    await el.updateComplete;
    const item = el.shadowRoot!.querySelector('[data-nav="presets"]')!;
    expect(item.getAttribute('aria-pressed')).toBe('true');
  });

  it('nav item click dispatches TabSelected through SM', async () => {
    const el = await mountOpen();
    el.shadowRoot!.querySelector<HTMLElement>('[data-nav="presets"]')!.click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('[data-nav="presets"]')!.getAttribute('aria-pressed')).toBe('true');
  });
});

// ─── Async mutators ───────────────────────────────────────────────────────────

describe('async mutators — inventory save', () => {
  it('calls updateNutrientStock when inventory sub reaches applying via save', async () => {
    nutrientInventory$.set(aInventory());
    const el = await mountOpen();

    dispatchSmEvent(el, { type: 'ItemSelected', id: 'n1' });
    await el.updateComplete;
    dispatchSmEvent(el, {
      type: 'EditStarted',
      draft: { name: 'Cal-Mag', current_ml: 500, initial_ml: 1000, brand: 'GH', stockType: 'calmag', npk: '', dose_ml_l: 2, notes: '' },
    });
    await el.updateComplete;
    dispatchSmEvent(el, { type: 'SaveRequested' });
    await el.updateComplete;

    expect(updateNutrientStock).toHaveBeenCalledOnce();
  });

  it('calls removeNutrientStock when inventory sub reaches applying via delete', async () => {
    nutrientInventory$.set(aInventory());
    const el = await mountOpen();

    dispatchSmEvent(el, { type: 'ItemSelected', id: 'n1' });
    await el.updateComplete;
    dispatchSmEvent(el, { type: 'DeleteRequested', id: 'n1', name: 'Cal-Mag' });
    await el.updateComplete;
    dispatchSmEvent(el, { type: 'DeleteConfirmed' });
    await el.updateComplete;

    expect(removeNutrientStock).toHaveBeenCalledWith('n1');
  });
});

describe('async mutators — presets save', () => {
  it('calls saveNutrientPreset when presets sub reaches applying via save', async () => {
    nutrientPresets$.set(aPresets());
    const el = await mountOpen();

    dispatchSmEvent(el, { type: 'TabSelected', tab: 'presets' });
    await el.updateComplete;
    dispatchSmEvent(el, { type: 'ItemSelected', id: 'p1' });
    await el.updateComplete;
    dispatchSmEvent(el, {
      type: 'EditStarted',
      draft: { name: 'Veg Week 1', stage: 'veg', week: 1, ec_target: 1.2, ph_target: 6.0, nutrients: [{ nutrient_id: 'n1', dose_ml_l: 2 }] },
    });
    await el.updateComplete;
    dispatchSmEvent(el, { type: 'SaveRequested' });
    await el.updateComplete;

    expect(saveNutrientPreset).toHaveBeenCalledOnce();
  });

  it('calls removeNutrientPreset when presets sub reaches applying via delete', async () => {
    nutrientPresets$.set(aPresets());
    const el = await mountOpen();

    dispatchSmEvent(el, { type: 'TabSelected', tab: 'presets' });
    await el.updateComplete;
    dispatchSmEvent(el, { type: 'ItemSelected', id: 'p1' });
    await el.updateComplete;
    dispatchSmEvent(el, { type: 'DeleteRequested', id: 'p1', name: 'Veg Week 1' });
    await el.updateComplete;
    dispatchSmEvent(el, { type: 'DeleteConfirmed' });
    await el.updateComplete;

    expect(removeNutrientPreset).toHaveBeenCalledWith('p1');
  });
});
