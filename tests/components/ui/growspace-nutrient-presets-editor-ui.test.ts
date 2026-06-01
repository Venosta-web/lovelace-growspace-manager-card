/**
 * Component tests for growspace-nutrient-presets-editor-ui.
 *
 * Stateless component — all state driven by properties, all interactions
 * reported as 'sm-event' CustomEvents carrying SMEvent payloads.
 */

import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import '../../../src/features/ui/components/growspace-nutrient-presets-editor-ui';
import { GrowspaceNutrientPresetsEditorUI } from '../../../src/features/ui/components/growspace-nutrient-presets-editor-ui';
import type { SMEvent } from '../../../src/dialogs/nutrient-dialog-sm';
import type { NutrientPresetsResponse, NutrientInventoryResponse } from '../../../src/slices/nutrient';

// ─── Stubs ────────────────────────────────────────────────────────────────────

const stubs = ['ha-svg-icon'];
for (const tag of stubs) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function aPresets(): NutrientPresetsResponse {
  return {
    p1: { id: 'p1', name: 'Veg Week 1', stage: 'veg', week: 1, ec_target: 1.2, ph_target: 6.0, nutrients: [{ nutrient_id: 'n1', dose_ml_l: 2 }] },
    p2: { id: 'p2', name: 'Bloom Week 4', stage: 'flower', week: 4, ec_target: 1.8, ph_target: 5.8, nutrients: [{ nutrient_id: 'n2', dose_ml_l: 3 }] },
  };
}

function aInventory(): NutrientInventoryResponse {
  return {
    stocks: {
      n1: { nutrient_id: 'n1', name: 'Cal-Mag', current_ml: 500, initial_ml: 1000, last_updated: '2026-01-01', brand: 'GH', type: 'calmag', npk: '', dose_ml_l: 2, notes: '' },
      n2: { nutrient_id: 'n2', name: 'Bloom A', current_ml: 200, initial_ml: 1000, last_updated: '2026-01-01', brand: 'GH', type: 'bloom', npk: '', dose_ml_l: 3, notes: '' },
    },
  };
}

function collectSmEvents(el: Element): SMEvent[] {
  const events: SMEvent[] = [];
  el.addEventListener('sm-event', (e) => events.push((e as CustomEvent<SMEvent>).detail));
  return events;
}

async function mountList(
  presets = aPresets(),
  inventory = aInventory(),
): Promise<GrowspaceNutrientPresetsEditorUI> {
  return fixture<GrowspaceNutrientPresetsEditorUI>(html`
    <growspace-nutrient-presets-editor-ui
      .presets=${presets}
      .inventory=${inventory}
      .selectedId=${null}
      .sub=${{ kind: 'idle' }}
    ></growspace-nutrient-presets-editor-ui>
  `);
}

async function mountDetail(id = 'p1'): Promise<GrowspaceNutrientPresetsEditorUI> {
  return fixture<GrowspaceNutrientPresetsEditorUI>(html`
    <growspace-nutrient-presets-editor-ui
      .presets=${aPresets()}
      .inventory=${aInventory()}
      .selectedId=${id}
      .sub=${{ kind: 'idle' }}
    ></growspace-nutrient-presets-editor-ui>
  `);
}

const editingDraft = {
  name: 'Veg Week 1',
  stage: 'veg',
  week: 1,
  ec_target: 1.2,
  ph_target: 6.0,
  nutrients: [{ nutrient_id: 'n1', dose_ml_l: 2 }],
};

async function mountEditing(id = 'p1'): Promise<GrowspaceNutrientPresetsEditorUI> {
  return fixture<GrowspaceNutrientPresetsEditorUI>(html`
    <growspace-nutrient-presets-editor-ui
      .presets=${aPresets()}
      .inventory=${aInventory()}
      .selectedId=${id}
      .sub=${{ kind: 'editing', draft: editingDraft }}
    ></growspace-nutrient-presets-editor-ui>
  `);
}

// ─── Master list ──────────────────────────────────────────────────────────────

describe('master list — renders', () => {
  it('renders a list item for each preset', async () => {
    const el = await mountList();
    expect(el.shadowRoot!.querySelectorAll('[data-preset-id]')).toHaveLength(2);
  });

  it('shows preset name in each list item', async () => {
    const el = await mountList();
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('Veg Week 1');
    expect(text).toContain('Bloom Week 4');
  });

  it('renders an Add button', async () => {
    const el = await mountList();
    expect(el.shadowRoot!.querySelector('[data-action="add"]')).toBeTruthy();
  });

  it('renders empty state when there are no presets', async () => {
    const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
      <growspace-nutrient-presets-editor-ui
        .presets=${{}}
        .inventory=${aInventory()}
        .selectedId=${null}
        .sub=${{ kind: 'idle' }}
      ></growspace-nutrient-presets-editor-ui>
    `);
    expect(el.shadowRoot!.textContent).toContain('No');
  });
});

describe('master list — interactions', () => {
  it('dispatches ItemSelected when a preset is clicked', async () => {
    const el = await mountList();
    const events = collectSmEvents(el);
    el.shadowRoot!.querySelector<HTMLElement>('[data-preset-id="p1"]')!.click();
    expect(events[0]).toEqual({ type: 'ItemSelected', id: 'p1' });
  });

  it('dispatches NewItemRequested when Add is clicked', async () => {
    const el = await mountList();
    const events = collectSmEvents(el);
    el.shadowRoot!.querySelector<HTMLElement>('[data-action="add"]')!.click();
    expect(events[0]).toEqual({ type: 'NewItemRequested' });
  });
});

// ─── Detail view ──────────────────────────────────────────────────────────────

describe('detail view — renders', () => {
  it('shows the preset name', async () => {
    const el = await mountDetail('p1');
    expect(el.shadowRoot!.textContent).toContain('Veg Week 1');
  });

  it('shows EC target and pH target', async () => {
    const el = await mountDetail('p1');
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('1.2');
    expect(text).toContain('6');
  });

  it('resolves nutrient_id to name from inventory in the mixing table', async () => {
    const el = await mountDetail('p1');
    expect(el.shadowRoot!.textContent).toContain('Cal-Mag');
  });

  it('shows Edit and Delete buttons', async () => {
    const el = await mountDetail('p1');
    expect(el.shadowRoot!.querySelector('[data-action="edit"]')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('[data-action="delete"]')).toBeTruthy();
  });

  it('shows a Back button', async () => {
    const el = await mountDetail('p1');
    expect(el.shadowRoot!.querySelector('[data-action="back"]')).toBeTruthy();
  });

  it('shows an orphan warning when nutrient_id has no match in inventory', async () => {
    const presetsWithOrphan: NutrientPresetsResponse = {
      p1: { id: 'p1', name: 'Test', stage: 'veg', week: 1, nutrients: [{ nutrient_id: 'missing-id', dose_ml_l: 1 }] },
    };
    const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
      <growspace-nutrient-presets-editor-ui
        .presets=${presetsWithOrphan}
        .inventory=${aInventory()}
        .selectedId=${'p1'}
        .sub=${{ kind: 'idle' }}
      ></growspace-nutrient-presets-editor-ui>
    `);
    expect(el.shadowRoot!.querySelector('[data-orphan]')).toBeTruthy();
  });
});

describe('detail view — interactions', () => {
  it('dispatches EditStarted seeded from the preset when Edit is clicked', async () => {
    const el = await mountDetail('p1');
    const events = collectSmEvents(el);
    el.shadowRoot!.querySelector<HTMLElement>('[data-action="edit"]')!.click();
    expect(events[0].type).toBe('EditStarted');
    if (events[0].type === 'EditStarted') {
      expect(events[0].draft).toMatchObject({ name: 'Veg Week 1', nutrients: [{ nutrient_id: 'n1', dose_ml_l: 2 }] });
    }
  });

  it('dispatches DeleteRequested when Delete is clicked', async () => {
    const el = await mountDetail('p1');
    const events = collectSmEvents(el);
    el.shadowRoot!.querySelector<HTMLElement>('[data-action="delete"]')!.click();
    expect(events[0]).toEqual({ type: 'DeleteRequested', id: 'p1', name: 'Veg Week 1' });
  });

  it('dispatches BackToList when Back is clicked', async () => {
    const el = await mountDetail('p1');
    const events = collectSmEvents(el);
    el.shadowRoot!.querySelector<HTMLElement>('[data-action="back"]')!.click();
    expect(events[0]).toEqual({ type: 'BackToList' });
  });
});

// ─── Editing view ─────────────────────────────────────────────────────────────

describe('editing view — renders', () => {
  it('shows the edit form when sub is editing', async () => {
    const el = await mountEditing();
    expect(el.shadowRoot!.querySelector('[data-form="preset"]')).toBeTruthy();
  });

  it('renders a row for each nutrient in the draft', async () => {
    const el = await mountEditing();
    expect(el.shadowRoot!.querySelectorAll('[data-nutrient-row]')).toHaveLength(1);
  });

  it('shows an Add Row button', async () => {
    const el = await mountEditing();
    expect(el.shadowRoot!.querySelector('[data-action="add-row"]')).toBeTruthy();
  });

  it('shows Save and Cancel buttons', async () => {
    const el = await mountEditing();
    expect(el.shadowRoot!.querySelector('[data-action="save"]')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('[data-action="cancel"]')).toBeTruthy();
  });

  it('disables Save when sub is applying', async () => {
    const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
      <growspace-nutrient-presets-editor-ui
        .presets=${aPresets()}
        .inventory=${aInventory()}
        .selectedId=${'p1'}
        .sub=${{ kind: 'applying', draft: editingDraft }}
      ></growspace-nutrient-presets-editor-ui>
    `);
    const save = el.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="save"]')!;
    expect(save.disabled).toBe(true);
  });
});

describe('editing view — interactions', () => {
  it('dispatches PresetNutrientRowAdded when Add Row is clicked', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    el.shadowRoot!.querySelector<HTMLElement>('[data-action="add-row"]')!.click();
    expect(events[0]).toEqual({ type: 'PresetNutrientRowAdded' });
  });

  it('dispatches PresetNutrientRowRemoved when a row remove button is clicked', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    el.shadowRoot!.querySelector<HTMLElement>('[data-action="remove-row"]')!.click();
    expect(events[0]).toEqual({ type: 'PresetNutrientRowRemoved', index: 0 });
  });

  it('dispatches SaveRequested when Save is clicked', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    el.shadowRoot!.querySelector<HTMLElement>('[data-action="save"]')!.click();
    expect(events[0]).toEqual({ type: 'SaveRequested' });
  });

  it('dispatches BackToList when Cancel is clicked', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    el.shadowRoot!.querySelector<HTMLElement>('[data-action="cancel"]')!.click();
    expect(events[0]).toEqual({ type: 'BackToList' });
  });
});

// ─── New preset (selectedId null, sub editing) ────────────────────────────────

describe('new preset form', () => {
  it('shows the edit form when selectedId is null and sub is editing', async () => {
    const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
      <growspace-nutrient-presets-editor-ui
        .presets=${aPresets()}
        .inventory=${aInventory()}
        .selectedId=${null}
        .sub=${{ kind: 'editing', draft: { name: '', nutrients: [] } }}
      ></growspace-nutrient-presets-editor-ui>
    `);
    expect(el.shadowRoot!.querySelector('[data-form="preset"]')).toBeTruthy();
  });
});

// ─── Confirm-delete view ──────────────────────────────────────────────────────

describe('confirm-delete view', () => {
  it('shows the preset name in the confirmation message', async () => {
    const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
      <growspace-nutrient-presets-editor-ui
        .presets=${aPresets()}
        .inventory=${aInventory()}
        .selectedId=${'p1'}
        .sub=${{ kind: 'confirm-delete', id: 'p1', name: 'Veg Week 1' }}
      ></growspace-nutrient-presets-editor-ui>
    `);
    expect(el.shadowRoot!.textContent).toContain('Veg Week 1');
    expect(el.shadowRoot!.querySelector('[data-action="confirm-delete"]')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('[data-action="cancel-delete"]')).toBeTruthy();
  });

  it('dispatches DeleteConfirmed when Confirm is clicked', async () => {
    const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
      <growspace-nutrient-presets-editor-ui
        .presets=${aPresets()}
        .inventory=${aInventory()}
        .selectedId=${'p1'}
        .sub=${{ kind: 'confirm-delete', id: 'p1', name: 'Veg Week 1' }}
      ></growspace-nutrient-presets-editor-ui>
    `);
    const events = collectSmEvents(el);
    el.shadowRoot!.querySelector<HTMLElement>('[data-action="confirm-delete"]')!.click();
    expect(events[0]).toEqual({ type: 'DeleteConfirmed' });
  });

  it('dispatches DeleteCancelled when Cancel is clicked', async () => {
    const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
      <growspace-nutrient-presets-editor-ui
        .presets=${aPresets()}
        .inventory=${aInventory()}
        .selectedId=${'p1'}
        .sub=${{ kind: 'confirm-delete', id: 'p1', name: 'Veg Week 1' }}
      ></growspace-nutrient-presets-editor-ui>
    `);
    const events = collectSmEvents(el);
    el.shadowRoot!.querySelector<HTMLElement>('[data-action="cancel-delete"]')!.click();
    expect(events[0]).toEqual({ type: 'DeleteCancelled' });
  });
});
