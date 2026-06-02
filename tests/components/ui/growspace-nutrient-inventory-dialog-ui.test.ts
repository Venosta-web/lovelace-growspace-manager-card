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

function fieldInput(root: ShadowRoot, labelText: string): HTMLInputElement | HTMLSelectElement {
  const labels = Array.from(root.querySelectorAll<HTMLLabelElement>('label.form-label'));
  const label = labels.find((l) => l.textContent?.includes(labelText));
  if (!label) throw new Error(`No label matching "${labelText}"`);
  return label.nextElementSibling as HTMLInputElement | HTMLSelectElement;
}

function simulateInput(el: HTMLInputElement | HTMLSelectElement, value: string): void {
  (el as HTMLInputElement).value = value;
  el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
}

function simulateChange(el: HTMLSelectElement, value: string): void {
  el.value = value;
  el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
}

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

// ─── Editing view — form field inputs ─────────────────────────────────────────

async function mountEditing(): Promise<GrowspaceNutrientInventoryDialogUI> {
  return fixture<GrowspaceNutrientInventoryDialogUI>(html`
    <growspace-nutrient-inventory-dialog-ui
      .inventory=${aInventory()}
      .selectedId=${'n1'}
      .sub=${{
        kind: 'editing',
        draft: { name: 'Cal-Mag', current_ml: 500, initial_ml: 1000, brand: 'GH', stockType: 'calmag', npk: '0-0-0', dose_ml_l: 2, notes: '' },
      }}
    ></growspace-nutrient-inventory-dialog-ui>
  `);
}

describe('editing view — form field inputs', () => {
  it('dispatches StockDraftChanged for name field', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    simulateInput(fieldInput(el.shadowRoot!, 'Name') as HTMLInputElement, 'New Name');
    expect(events[0]).toEqual({ type: 'StockDraftChanged', field: 'name', value: 'New Name' });
  });

  it('dispatches StockDraftChanged for brand field', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    simulateInput(fieldInput(el.shadowRoot!, 'Brand') as HTMLInputElement, 'Canna');
    expect(events[0]).toEqual({ type: 'StockDraftChanged', field: 'brand', value: 'Canna' });
  });

  it('dispatches StockDraftChanged for stockType via select change', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    simulateChange(fieldInput(el.shadowRoot!, 'Type') as HTMLSelectElement, 'bloom');
    expect(events[0]).toEqual({ type: 'StockDraftChanged', field: 'stockType', value: 'bloom' });
  });

  it('dispatches StockDraftChanged for current_ml as parsed float', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    simulateInput(fieldInput(el.shadowRoot!, 'Current') as HTMLInputElement, '750');
    expect(events[0]).toEqual({ type: 'StockDraftChanged', field: 'current_ml', value: 750 });
  });

  it('dispatches StockDraftChanged for current_ml as 0 when input is empty', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    simulateInput(fieldInput(el.shadowRoot!, 'Current') as HTMLInputElement, '');
    expect(events[0]).toEqual({ type: 'StockDraftChanged', field: 'current_ml', value: 0 });
  });

  it('dispatches StockDraftChanged for initial_ml (capacity) as parsed float', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    simulateInput(fieldInput(el.shadowRoot!, 'Capacity') as HTMLInputElement, '2000');
    expect(events[0]).toEqual({ type: 'StockDraftChanged', field: 'initial_ml', value: 2000 });
  });

  it('dispatches StockDraftChanged for npk field', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    simulateInput(fieldInput(el.shadowRoot!, 'NPK') as HTMLInputElement, '3-1-2');
    expect(events[0]).toEqual({ type: 'StockDraftChanged', field: 'npk', value: '3-1-2' });
  });

  it('dispatches StockDraftChanged for dose_ml_l as parsed float', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    simulateInput(fieldInput(el.shadowRoot!, 'Default dose') as HTMLInputElement, '1.5');
    expect(events[0]).toEqual({ type: 'StockDraftChanged', field: 'dose_ml_l', value: 1.5 });
  });

  it('dispatches StockDraftChanged for dose_ml_l as 0 when input is empty', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    simulateInput(fieldInput(el.shadowRoot!, 'Default dose') as HTMLInputElement, '');
    expect(events[0]).toEqual({ type: 'StockDraftChanged', field: 'dose_ml_l', value: 0 });
  });

  it('dispatches StockDraftChanged for notes field', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    simulateInput(fieldInput(el.shadowRoot!, 'Notes') as HTMLInputElement, 'keep refrigerated');
    expect(events[0]).toEqual({ type: 'StockDraftChanged', field: 'notes', value: 'keep refrigerated' });
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

// ─── Edge cases and fallback logic ──────────────────────────────────────────

describe('edge cases and fallback logic', () => {
  it('uses fallback color and icon for unknown stock type in list item', async () => {
    const unknownStock = {
      nutrient_id: 'n3',
      name: 'Mystery Mix',
      current_ml: 100,
      initial_ml: 1000,
      last_updated: '2026-01-01',
      brand: 'GH',
      type: 'unknown' as any,
      npk: '',
      dose_ml_l: 0,
      notes: '',
    };
    const el = await mountList(aInventory({ n3: unknownStock }));
    const item = el.shadowRoot!.querySelector('[data-stock-id="n3"]')!;
    const iconContainer = item.querySelector('.type-icon') as HTMLElement;
    expect(iconContainer.style.background).toContain('var(--primary-color, #4caf50)22');
  });

  it('handles fillPercent boundary cases', async () => {
    const zeroCapStock = {
      ...aInventory().stocks.n1,
      nutrient_id: 'n1',
      current_ml: 0,
      initial_ml: 0,
    };
    const dangerStock = {
      ...aInventory().stocks.n1,
      nutrient_id: 'n2',
      current_ml: 50,
      initial_ml: 1000,
    };
    const overfilledStock = {
      ...aInventory().stocks.n1,
      nutrient_id: 'n3',
      current_ml: 1200,
      initial_ml: 1000,
    };
    const negativeStock = {
      ...aInventory().stocks.n1,
      nutrient_id: 'n4',
      current_ml: -10,
      initial_ml: 1000,
    };

    const el = await mountList(aInventory({
      n1: zeroCapStock,
      n2: dangerStock,
      n3: overfilledStock,
      n4: negativeStock,
    }));

    const item1 = el.shadowRoot!.querySelector('[data-stock-id="n1"]')!;
    const bar1 = item1.querySelector('.fill-bar') as HTMLElement;
    expect(bar1.style.width).toBe('0%');

    const item2 = el.shadowRoot!.querySelector('[data-stock-id="n2"]')!;
    const bar2 = item2.querySelector('.fill-bar') as HTMLElement;
    expect(bar2.classList.contains('danger')).toBe(true);

    const item3 = el.shadowRoot!.querySelector('[data-stock-id="n3"]')!;
    const bar3 = item3.querySelector('.fill-bar') as HTMLElement;
    expect(bar3.style.width).toBe('100%');

    const item4 = el.shadowRoot!.querySelector('[data-stock-id="n4"]')!;
    const bar4 = item4.querySelector('.fill-bar') as HTMLElement;
    expect(bar4.style.width).toBe('0%');
  });

  it('handles draftFromStock fallbacks when optional fields are missing', async () => {
    const sparseStock = {
      nutrient_id: 'n1',
      name: 'Sparse Nutrient',
      current_ml: 500,
      initial_ml: 1000,
      last_updated: '2026-01-01',
    } as any;

    const el = await mountDetail('n1', aInventory({ n1: sparseStock }));
    const events = collectSmEvents(el);
    el.shadowRoot!.querySelector<HTMLElement>('[data-action="edit"]')!.click();

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('EditStarted');
    if (events[0].type === 'EditStarted') {
      expect(events[0].draft).toEqual({
        name: 'Sparse Nutrient',
        current_ml: 500,
        initial_ml: 1000,
        brand: '',
        stockType: 'base',
        npk: '',
        dose_ml_l: 0,
        notes: '',
      });
    }
  });

  it('renders nothing when selected stock is not found or inventory is null', async () => {
    const el1 = await fixture<GrowspaceNutrientInventoryDialogUI>(html`
      <growspace-nutrient-inventory-dialog-ui
        .inventory=${aInventory()}
        .selectedId=${'nonexistent'}
        .sub=${{ kind: 'idle' }}
      ></growspace-nutrient-inventory-dialog-ui>
    `);
    expect(el1.shadowRoot!.children).toHaveLength(0);

    const el2 = await fixture<GrowspaceNutrientInventoryDialogUI>(html`
      <growspace-nutrient-inventory-dialog-ui
        .inventory=${null}
        .selectedId=${'n1'}
        .sub=${{ kind: 'idle' }}
      ></growspace-nutrient-inventory-dialog-ui>
    `);
    expect(el2.shadowRoot!.children).toHaveLength(0);
  });

  it('renders master list with empty stocks when inventory is null', async () => {
    const el = await fixture<GrowspaceNutrientInventoryDialogUI>(html`
      <growspace-nutrient-inventory-dialog-ui
        .inventory=${null}
        .selectedId=${null}
        .sub=${{ kind: 'idle' }}
      ></growspace-nutrient-inventory-dialog-ui>
    `);
    expect(el.shadowRoot!.querySelector('[data-action="add"]')).toBeTruthy();
    expect(el.shadowRoot!.querySelectorAll('[data-stock-id]')).toHaveLength(0);
  });
});

// ─── Detail view — conditional sections ───────────────────────────────────────

describe('detail view — conditional sections', () => {
  it('renders detail view sections conditionally based on dose and notes', async () => {
    const stock1 = {
      ...aInventory().stocks.n1,
      dose_ml_l: 0,
      notes: 'Contains calcium and magnesium.',
    };

    const el = await mountDetail('n1', aInventory({ n1: stock1 }));
    const text = el.shadowRoot!.textContent!;
    expect(text).not.toContain('Composition');
    expect(text).toContain('Notes');
    expect(text).toContain('Contains calcium and magnesium.');
  });
});

// ─── Editing view — additional inputs ─────────────────────────────────────────

describe('editing view — additional inputs', () => {
  it('dispatches StockDraftChanged for initial_ml as 0 when input is empty', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    simulateInput(fieldInput(el.shadowRoot!, 'Capacity') as HTMLInputElement, '');
    expect(events[0]).toEqual({ type: 'StockDraftChanged', field: 'initial_ml', value: 0 });
  });
});

// ─── Error state view ─────────────────────────────────────────────────────────

describe('error state view', () => {
  it('renders error banner and edit form when sub.kind is error', async () => {
    const draft = { name: 'Cal-Mag', current_ml: 500, initial_ml: 1000, brand: 'GH', stockType: 'calmag', npk: '0-0-0', dose_ml_l: 2, notes: '' };
    const el = await fixture<GrowspaceNutrientInventoryDialogUI>(html`
      <growspace-nutrient-inventory-dialog-ui
        .inventory=${aInventory()}
        .selectedId=${'n1'}
        .sub=${{
          kind: 'error',
          message: 'Failed to save: name is required',
          draft,
        }}
      ></growspace-nutrient-inventory-dialog-ui>
    `);

    const banner = el.shadowRoot!.querySelector('.error-banner')!;
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('Failed to save: name is required');

    expect(el.shadowRoot!.querySelector('[data-form="stock"]')).toBeTruthy();
  });
});
