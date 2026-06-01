/**
 * Component tests for growspace-nutrient-inventory-dialog-ui.
 *
 * The component is stateless — all state is driven by properties, all
 * interactions are reported upward as 'sm-event' CustomEvents carrying
 * SMEvent payloads. Tests verify that the right view renders in each sub-state
 * and that user interactions dispatch the correct SM events.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import '../../../src/features/ui/components/growspace-nutrient-inventory-dialog-ui';
import { GrowspaceNutrientInventoryDialogUI } from '../../../src/features/ui/components/growspace-nutrient-inventory-dialog-ui';
import type { SMEvent } from '../../../src/dialogs/feed-and-water-dialog-sm';
import type { NutrientInventoryResponse } from '../../../src/slices/nutrient';

// ─── Stubs ────────────────────────────────────────────────────────────────────

const stubs = ['ha-svg-icon', 'ha-circular-progress'];
for (const tag of stubs) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function aInventory(overrides: Partial<NutrientInventoryResponse['stocks']> = {}): NutrientInventoryResponse {
  return {
    stocks: {
      n1: {
        nutrient_id: 'n1',
        name: 'Cal-Mag',
        current_ml: 500,
        initial_ml: 1000,
        last_updated: '2026-01-01',
        brand: 'GH',
        type: 'calmag',
        npk: '0-0-0',
        dose_ml_l: 2,
        notes: '',
      },
      n2: {
        nutrient_id: 'n2',
        name: 'Bloom A',
        current_ml: 200,
        initial_ml: 1000,
        last_updated: '2026-01-01',
        brand: 'GH',
        type: 'bloom',
        npk: '2-1-6',
        dose_ml_l: 3,
        notes: '',
      },
      ...overrides,
    },
  };
}

function collectSmEvents(el: Element): SMEvent[] {
  const events: SMEvent[] = [];
  el.addEventListener('sm-event', (e) => events.push((e as CustomEvent<SMEvent>).detail));
  return events;
}

async function mountList(inventory = aInventory()): Promise<GrowspaceNutrientInventoryDialogUI> {
  return fixture<GrowspaceNutrientInventoryDialogUI>(html`
    <growspace-nutrient-inventory-dialog-ui
      .inventory=${inventory}
      .selectedId=${null}
      .sub=${{ kind: 'idle' }}
    ></growspace-nutrient-inventory-dialog-ui>
  `);
}

async function mountDetail(id = 'n1', inventory = aInventory()): Promise<GrowspaceNutrientInventoryDialogUI> {
  return fixture<GrowspaceNutrientInventoryDialogUI>(html`
    <growspace-nutrient-inventory-dialog-ui
      .inventory=${inventory}
      .selectedId=${id}
      .sub=${{ kind: 'idle' }}
    ></growspace-nutrient-inventory-dialog-ui>
  `);
}

// ─── Master list view ─────────────────────────────────────────────────────────

describe('master list — renders', () => {
  it('renders a list item for each stock entry', async () => {
    const el = await mountList();
    const items = el.shadowRoot!.querySelectorAll('[data-stock-id]');
    expect(items).toHaveLength(2);
  });

  it('shows stock name in each list item', async () => {
    const el = await mountList();
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('Cal-Mag');
    expect(text).toContain('Bloom A');
  });

  it('renders an Add button', async () => {
    const el = await mountList();
    const btn = el.shadowRoot!.querySelector('[data-action="add"]');
    expect(btn).toBeTruthy();
  });

  it('renders empty state when inventory has no stocks', async () => {
    const el = await fixture<GrowspaceNutrientInventoryDialogUI>(html`
      <growspace-nutrient-inventory-dialog-ui
        .inventory=${{ stocks: {} }}
        .selectedId=${null}
        .sub=${{ kind: 'idle' }}
      ></growspace-nutrient-inventory-dialog-ui>
    `);
    expect(el.shadowRoot!.textContent).toContain('No');
  });
});

describe('master list — interactions', () => {
  it('dispatches ItemSelected with the stock id when a list item is clicked', async () => {
    const el = await mountList();
    const events = collectSmEvents(el);
    const item = el.shadowRoot!.querySelector<HTMLElement>('[data-stock-id="n1"]')!;
    item.click();
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'ItemSelected', id: 'n1' });
  });

  it('dispatches NewItemRequested when Add button is clicked', async () => {
    const el = await mountList();
    const events = collectSmEvents(el);
    const btn = el.shadowRoot!.querySelector<HTMLElement>('[data-action="add"]')!;
    btn.click();
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'NewItemRequested' });
  });
});

// ─── Detail view (selectedId set, sub idle) ────────────────────────────────────

describe('detail view — renders', () => {
  it('shows the selected stock name', async () => {
    const el = await mountDetail('n1');
    expect(el.shadowRoot!.textContent).toContain('Cal-Mag');
  });

  it('shows a fill bar', async () => {
    const el = await mountDetail('n1');
    expect(el.shadowRoot!.querySelector('[data-fill-bar]')).toBeTruthy();
  });

  it('shows Edit and Delete buttons', async () => {
    const el = await mountDetail('n1');
    expect(el.shadowRoot!.querySelector('[data-action="edit"]')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('[data-action="delete"]')).toBeTruthy();
  });

  it('shows a Back button', async () => {
    const el = await mountDetail('n1');
    expect(el.shadowRoot!.querySelector('[data-action="back"]')).toBeTruthy();
  });
});

describe('detail view — interactions', () => {
  it('dispatches EditStarted seeded from the stock when Edit is clicked', async () => {
    const el = await mountDetail('n1');
    const events = collectSmEvents(el);
    el.shadowRoot!.querySelector<HTMLElement>('[data-action="edit"]')!.click();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('EditStarted');
    if (events[0].type === 'EditStarted') {
      expect(events[0].draft).toMatchObject({ name: 'Cal-Mag', current_ml: 500, initial_ml: 1000 });
    }
  });

  it('dispatches DeleteRequested with id and name when Delete is clicked', async () => {
    const el = await mountDetail('n1');
    const events = collectSmEvents(el);
    el.shadowRoot!.querySelector<HTMLElement>('[data-action="delete"]')!.click();
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'DeleteRequested', id: 'n1', name: 'Cal-Mag' });
  });

  it('dispatches BackToList when Back is clicked', async () => {
    const el = await mountDetail('n1');
    const events = collectSmEvents(el);
    el.shadowRoot!.querySelector<HTMLElement>('[data-action="back"]')!.click();
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'BackToList' });
  });
});

// ─── Editing sub ──────────────────────────────────────────────────────────────

describe('editing view — renders', () => {
  it('shows the edit form when sub is editing', async () => {
    const el = await fixture<GrowspaceNutrientInventoryDialogUI>(html`
      <growspace-nutrient-inventory-dialog-ui
        .inventory=${aInventory()}
        .selectedId=${'n1'}
        .sub=${{
          kind: 'editing',
          draft: { name: 'Cal-Mag', current_ml: 500, initial_ml: 1000, brand: 'GH', stockType: 'calmag', npk: '', dose_ml_l: 2, notes: '' },
        }}
      ></growspace-nutrient-inventory-dialog-ui>
    `);
    expect(el.shadowRoot!.querySelector('[data-form="stock"]')).toBeTruthy();
  });

  it('shows Save and Cancel buttons in the edit form', async () => {
    const el = await fixture<GrowspaceNutrientInventoryDialogUI>(html`
      <growspace-nutrient-inventory-dialog-ui
        .inventory=${aInventory()}
        .selectedId=${'n1'}
        .sub=${{
          kind: 'editing',
          draft: { name: 'Cal-Mag', current_ml: 500, initial_ml: 1000, brand: 'GH', stockType: 'calmag', npk: '', dose_ml_l: 2, notes: '' },
        }}
      ></growspace-nutrient-inventory-dialog-ui>
    `);
    expect(el.shadowRoot!.querySelector('[data-action="save"]')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('[data-action="cancel"]')).toBeTruthy();
  });

  it('disables Save button when sub is applying', async () => {
    const el = await fixture<GrowspaceNutrientInventoryDialogUI>(html`
      <growspace-nutrient-inventory-dialog-ui
        .inventory=${aInventory()}
        .selectedId=${'n1'}
        .sub=${{
          kind: 'applying',
          draft: { name: 'Cal-Mag', current_ml: 500, initial_ml: 1000, brand: 'GH', stockType: 'calmag', npk: '', dose_ml_l: 2, notes: '' },
        }}
      ></growspace-nutrient-inventory-dialog-ui>
    `);
    const saveBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="save"]')!;
    expect(saveBtn.disabled).toBe(true);
  });
});

describe('editing view — interactions', () => {
  it('dispatches SaveRequested when Save is clicked', async () => {
    const el = await fixture<GrowspaceNutrientInventoryDialogUI>(html`
      <growspace-nutrient-inventory-dialog-ui
        .inventory=${aInventory()}
        .selectedId=${'n1'}
        .sub=${{
          kind: 'editing',
          draft: { name: 'Cal-Mag', current_ml: 500, initial_ml: 1000, brand: 'GH', stockType: 'calmag', npk: '', dose_ml_l: 2, notes: '' },
        }}
      ></growspace-nutrient-inventory-dialog-ui>
    `);
    const events = collectSmEvents(el);
    el.shadowRoot!.querySelector<HTMLElement>('[data-action="save"]')!.click();
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'SaveRequested' });
  });

  it('dispatches BackToList when Cancel is clicked in edit form', async () => {
    const el = await fixture<GrowspaceNutrientInventoryDialogUI>(html`
      <growspace-nutrient-inventory-dialog-ui
        .inventory=${aInventory()}
        .selectedId=${'n1'}
        .sub=${{
          kind: 'editing',
          draft: { name: 'Cal-Mag', current_ml: 500, initial_ml: 1000, brand: 'GH', stockType: 'calmag', npk: '', dose_ml_l: 2, notes: '' },
        }}
      ></growspace-nutrient-inventory-dialog-ui>
    `);
    const events = collectSmEvents(el);
    el.shadowRoot!.querySelector<HTMLElement>('[data-action="cancel"]')!.click();
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'BackToList' });
  });
});

// ─── New item (selectedId null, sub editing) ──────────────────────────────────

describe('new item form', () => {
  it('shows the edit form when selectedId is null and sub is editing', async () => {
    const el = await fixture<GrowspaceNutrientInventoryDialogUI>(html`
      <growspace-nutrient-inventory-dialog-ui
        .inventory=${aInventory()}
        .selectedId=${null}
        .sub=${{
          kind: 'editing',
          draft: { name: '', current_ml: 0, initial_ml: 0, brand: '', stockType: 'base', npk: '', dose_ml_l: 0, notes: '' },
        }}
      ></growspace-nutrient-inventory-dialog-ui>
    `);
    expect(el.shadowRoot!.querySelector('[data-form="stock"]')).toBeTruthy();
  });
});

// ─── Confirm-delete sub ───────────────────────────────────────────────────────

describe('confirm-delete view', () => {
  it('shows a confirmation message with the item name', async () => {
    const el = await fixture<GrowspaceNutrientInventoryDialogUI>(html`
      <growspace-nutrient-inventory-dialog-ui
        .inventory=${aInventory()}
        .selectedId=${'n1'}
        .sub=${{ kind: 'confirm-delete', id: 'n1', name: 'Cal-Mag' }}
      ></growspace-nutrient-inventory-dialog-ui>
    `);
    expect(el.shadowRoot!.textContent).toContain('Cal-Mag');
    expect(el.shadowRoot!.querySelector('[data-action="confirm-delete"]')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('[data-action="cancel-delete"]')).toBeTruthy();
  });

  it('dispatches DeleteConfirmed when Confirm is clicked', async () => {
    const el = await fixture<GrowspaceNutrientInventoryDialogUI>(html`
      <growspace-nutrient-inventory-dialog-ui
        .inventory=${aInventory()}
        .selectedId=${'n1'}
        .sub=${{ kind: 'confirm-delete', id: 'n1', name: 'Cal-Mag' }}
      ></growspace-nutrient-inventory-dialog-ui>
    `);
    const events = collectSmEvents(el);
    el.shadowRoot!.querySelector<HTMLElement>('[data-action="confirm-delete"]')!.click();
    expect(events[0]).toEqual({ type: 'DeleteConfirmed' });
  });

  it('dispatches DeleteCancelled when Cancel is clicked', async () => {
    const el = await fixture<GrowspaceNutrientInventoryDialogUI>(html`
      <growspace-nutrient-inventory-dialog-ui
        .inventory=${aInventory()}
        .selectedId=${'n1'}
        .sub=${{ kind: 'confirm-delete', id: 'n1', name: 'Cal-Mag' }}
      ></growspace-nutrient-inventory-dialog-ui>
    `);
    const events = collectSmEvents(el);
    el.shadowRoot!.querySelector<HTMLElement>('[data-action="cancel-delete"]')!.click();
    expect(events[0]).toEqual({ type: 'DeleteCancelled' });
  });
});
