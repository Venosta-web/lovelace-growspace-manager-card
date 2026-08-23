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
import type { SMEvent } from '../../../src/dialogs/feed-and-water-dialog-sm';
import type {
  NutrientPresetsResponse,
  NutrientInventoryResponse,
} from '../../../src/slices/nutrient';

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
    p1: {
      id: 'p1',
      name: 'Veg Week 1',
      stage: 'veg',
      week: 1,
      ec_target: 1.2,
      ph_target: 6.0,
      nutrients: [{ nutrient_id: 'n1', dose_ml_l: 2 }],
    },
    p2: {
      id: 'p2',
      name: 'Bloom Week 4',
      stage: 'flower',
      week: 4,
      ec_target: 1.8,
      ph_target: 5.8,
      nutrients: [{ nutrient_id: 'n2', dose_ml_l: 3 }],
    },
  };
}

function aInventory(): NutrientInventoryResponse {
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
        npk: '',
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
        npk: '',
        dose_ml_l: 3,
        notes: '',
      },
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
  inventory = aInventory()
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
      p1: {
        id: 'p1',
        name: 'Test',
        stage: 'veg',
        week: 1,
        nutrients: [{ nutrient_id: 'missing-id', dose_ml_l: 1 }],
      },
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
      expect(events[0].draft).toMatchObject({
        name: 'Veg Week 1',
        nutrients: [{ nutrient_id: 'n1', dose_ml_l: 2 }],
      });
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

// ─── Nutrient select pre-selection ───────────────────────────────────────────

describe('nutrient select — pre-selection', () => {
  it('has the correct option selected in the nutrient select when opening edit', async () => {
    const el = await mountEditing('p1'); // draft has nutrient_id: 'n1'
    const select = el.shadowRoot!.querySelector<HTMLSelectElement>('[data-nutrient-row] select')!;
    expect(select.value).toBe('n1');
  });

  it('shows the nutrient name in the selected option when opening edit', async () => {
    const el = await mountEditing('p1');
    const select = el.shadowRoot!.querySelector<HTMLSelectElement>('[data-nutrient-row] select')!;
    const selected = select.options[select.selectedIndex];
    expect(selected?.text).toBe('Cal-Mag');
  });
});

// ─── Edit form — field interactions ──────────────────────────────────────────

describe('editing view — field interactions', () => {
  it('dispatches PresetDraftChanged for name when name input fires input event', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('input[type="text"]')!;
    input.value = 'New Name';
    input.dispatchEvent(new Event('input'));
    expect(events[0]).toEqual({ type: 'PresetDraftChanged', field: 'name', value: 'New Name' });
  });

  it('dispatches PresetDraftChanged for stage when stage select changes', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    const selects = el.shadowRoot!.querySelectorAll<HTMLSelectElement>('select');
    const stageSelect = selects[0];
    stageSelect.value = 'flower';
    stageSelect.dispatchEvent(new Event('change'));
    expect(events[0]).toEqual({ type: 'PresetDraftChanged', field: 'stage', value: 'flower' });
  });

  it('dispatches PresetDraftChanged with undefined stage when stage select is cleared', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    const stageSelect = el.shadowRoot!.querySelectorAll<HTMLSelectElement>('select')[0];
    stageSelect.value = '';
    stageSelect.dispatchEvent(new Event('change'));
    expect(events[0]).toEqual({ type: 'PresetDraftChanged', field: 'stage', value: undefined });
  });

  it('dispatches PresetDraftChanged for week when week input changes', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    const weekInput = el.shadowRoot!.querySelectorAll<HTMLInputElement>('input[type="number"]')[0];
    weekInput.value = '3';
    weekInput.dispatchEvent(new Event('input'));
    expect(events[0]).toEqual({ type: 'PresetDraftChanged', field: 'week', value: 3 });
  });

  it('dispatches PresetDraftChanged with undefined week when week input is cleared', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    const weekInput = el.shadowRoot!.querySelectorAll<HTMLInputElement>('input[type="number"]')[0];
    weekInput.value = '';
    weekInput.dispatchEvent(new Event('input'));
    expect(events[0]).toEqual({ type: 'PresetDraftChanged', field: 'week', value: undefined });
  });

  it('dispatches PresetDraftChanged for ec_target when EC input changes', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    const ecInput = el.shadowRoot!.querySelectorAll<HTMLInputElement>('input[type="number"]')[1];
    ecInput.value = '1.5';
    ecInput.dispatchEvent(new Event('input'));
    expect(events[0]).toEqual({ type: 'PresetDraftChanged', field: 'ec_target', value: 1.5 });
  });

  it('dispatches PresetDraftChanged with null ec_target when EC input is cleared', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    const ecInput = el.shadowRoot!.querySelectorAll<HTMLInputElement>('input[type="number"]')[1];
    ecInput.value = '';
    ecInput.dispatchEvent(new Event('input'));
    expect(events[0]).toEqual({ type: 'PresetDraftChanged', field: 'ec_target', value: null });
  });

  it('dispatches PresetDraftChanged for ph_target when pH input changes', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    const phInput = el.shadowRoot!.querySelectorAll<HTMLInputElement>('input[type="number"]')[2];
    phInput.value = '6.5';
    phInput.dispatchEvent(new Event('input'));
    expect(events[0]).toEqual({ type: 'PresetDraftChanged', field: 'ph_target', value: 6.5 });
  });

  it('dispatches PresetDraftChanged with null ph_target when pH input is cleared', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    const phInput = el.shadowRoot!.querySelectorAll<HTMLInputElement>('input[type="number"]')[2];
    phInput.value = '';
    phInput.dispatchEvent(new Event('input'));
    expect(events[0]).toEqual({ type: 'PresetDraftChanged', field: 'ph_target', value: null });
  });
});

// ─── Nutrient row — field interactions ───────────────────────────────────────

describe('nutrient row — field interactions', () => {
  it('dispatches PresetNutrientRowUpdated with nutrient_id when nutrient select changes', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    const nutrientSelect = el.shadowRoot!.querySelector<HTMLSelectElement>(
      '[data-nutrient-row] select'
    )!;
    nutrientSelect.value = 'n2';
    nutrientSelect.dispatchEvent(new Event('change'));
    expect(events[0]).toEqual({
      type: 'PresetNutrientRowUpdated',
      index: 0,
      patch: { nutrient_id: 'n2', name: 'Bloom A' },
    });
  });

  it('dispatches PresetNutrientRowUpdated with empty name when blank option is selected', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    const nutrientSelect = el.shadowRoot!.querySelector<HTMLSelectElement>(
      '[data-nutrient-row] select'
    )!;
    nutrientSelect.value = '';
    nutrientSelect.dispatchEvent(new Event('change'));
    expect(events[0]).toEqual({
      type: 'PresetNutrientRowUpdated',
      index: 0,
      patch: { nutrient_id: '', name: '' },
    });
  });

  it('dispatches PresetNutrientRowUpdated with dose_ml_l when dose input changes', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    const doseInput = el.shadowRoot!.querySelector<HTMLInputElement>(
      '[data-nutrient-row] input[type="number"]'
    )!;
    doseInput.value = '5';
    doseInput.dispatchEvent(new Event('input'));
    expect(events[0]).toEqual({
      type: 'PresetNutrientRowUpdated',
      index: 0,
      patch: { dose_ml_l: 5 },
    });
  });

  it('dispatches PresetNutrientRowUpdated with dose_ml_l 0 when dose input is cleared', async () => {
    const el = await mountEditing();
    const events = collectSmEvents(el);
    const doseInput = el.shadowRoot!.querySelector<HTMLInputElement>(
      '[data-nutrient-row] input[type="number"]'
    )!;
    doseInput.value = '';
    doseInput.dispatchEvent(new Event('input'));
    expect(events[0]).toEqual({
      type: 'PresetNutrientRowUpdated',
      index: 0,
      patch: { dose_ml_l: 0 },
    });
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

// ─── Orphaned nutrient rows (issue #227) ─────────────────────────────────────

describe('orphaned nutrient rows', () => {
  const orphanPresets: NutrientPresetsResponse = {
    p1: {
      id: 'p1',
      name: 'Veg Week 1',
      stage: 'veg',
      week: 1,
      ec_target: 1.2,
      ph_target: 6.0,
      nutrients: [{ nutrient_id: 'deleted_n', dose_ml_l: 2, name: 'Old Cal-Mag' }],
    },
  };

  async function mountOrphanEditing(): Promise<GrowspaceNutrientPresetsEditorUI> {
    return fixture<GrowspaceNutrientPresetsEditorUI>(html`
      <growspace-nutrient-presets-editor-ui
        .presets=${orphanPresets}
        .inventory=${aInventory()}
        .selectedId=${'p1'}
        .sub=${{
          kind: 'editing',
          draft: {
            name: 'Veg Week 1',
            stage: 'veg',
            week: 1,
            ec_target: 1.2,
            ph_target: 6.0,
            nutrients: [{ nutrient_id: 'deleted_n', dose_ml_l: 2, name: 'Old Cal-Mag' }],
          },
        }}
      ></growspace-nutrient-presets-editor-ui>
    `);
  }

  it('shows snapshot name + (missing) as the selected option for an orphaned row', async () => {
    const el = await mountOrphanEditing();
    const select = el.shadowRoot!.querySelector<HTMLSelectElement>('[data-nutrient-row] select')!;
    const selected = select.options[select.selectedIndex];
    expect(selected?.text).toContain('Old Cal-Mag');
    expect(selected?.text).toContain('missing');
  });

  it('shows snapshot name + (missing) in the detail summary view', async () => {
    const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
      <growspace-nutrient-presets-editor-ui
        .presets=${orphanPresets}
        .inventory=${aInventory()}
        .selectedId=${'p1'}
        .sub=${{ kind: 'idle' }}
      ></growspace-nutrient-presets-editor-ui>
    `);
    expect(el.shadowRoot!.textContent).toContain('Old Cal-Mag');
    expect(el.shadowRoot!.textContent).toContain('missing');
  });

  it('orphan badge has flex:1 style for layout alignment', async () => {
    const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
      <growspace-nutrient-presets-editor-ui
        .presets=${orphanPresets}
        .inventory=${aInventory()}
        .selectedId=${'p1'}
        .sub=${{ kind: 'idle' }}
      ></growspace-nutrient-presets-editor-ui>
    `);
    const badge = el.shadowRoot!.querySelector<HTMLElement>('[data-orphan]')!;
    expect(badge.getAttribute('style')).toContain('flex:1');
  });
});

// ─── Branch coverage gaps ─────────────────────────────────────────────────────

describe('stageColor — unknown stage fallback', () => {
  it('uses secondary-text-color for a stage not in STAGE_COLOR', async () => {
    const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
      <growspace-nutrient-presets-editor-ui
        .presets=${{
          p1: { id: 'p1', name: 'Custom', stage: 'unknown-stage', week: 1, nutrients: [] },
        }}
        .inventory=${aInventory()}
        .selectedId=${null}
        .sub=${{ kind: 'idle' }}
      ></growspace-nutrient-presets-editor-ui>
    `);
    const dot = el.shadowRoot!.querySelector<HTMLElement>('.stage-dot')!;
    expect(dot.getAttribute('style')).toContain('var(--secondary-text-color)');
  });
});

describe('draftFromPreset — optional fields absent', () => {
  it('seeds ec_target as null when preset has no ec_target', async () => {
    const presets: NutrientPresetsResponse = {
      p1: {
        id: 'p1',
        name: 'No Targets',
        stage: 'veg',
        week: 1,
        nutrients: [{ nutrient_id: 'n1', dose_ml_l: 1 }],
      },
    };
    const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
      <growspace-nutrient-presets-editor-ui
        .presets=${presets}
        .inventory=${aInventory()}
        .selectedId=${'p1'}
        .sub=${{ kind: 'idle' }}
      ></growspace-nutrient-presets-editor-ui>
    `);
    const events: SMEvent[] = [];
    el.addEventListener('sm-event', (e) => events.push((e as CustomEvent<SMEvent>).detail));
    el.shadowRoot!.querySelector<HTMLElement>('[data-action="edit"]')!.click();
    expect(events[0].type).toBe('EditStarted');
    if (events[0].type === 'EditStarted') {
      expect(events[0].draft.ec_target).toBeNull();
      expect(events[0].draft.ph_target).toBeNull();
    }
  });

  it('seeds nutrients as empty array when preset has no nutrients field', async () => {
    const presets: NutrientPresetsResponse = {
      p1: { id: 'p1', name: 'No Nutrients', stage: 'veg', week: 1 },
    };
    const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
      <growspace-nutrient-presets-editor-ui
        .presets=${presets}
        .inventory=${aInventory()}
        .selectedId=${'p1'}
        .sub=${{ kind: 'idle' }}
      ></growspace-nutrient-presets-editor-ui>
    `);
    const events: SMEvent[] = [];
    el.addEventListener('sm-event', (e) => events.push((e as CustomEvent<SMEvent>).detail));
    el.shadowRoot!.querySelector<HTMLElement>('[data-action="edit"]')!.click();
    expect(events[0].type).toBe('EditStarted');
    if (events[0].type === 'EditStarted') {
      expect(events[0].draft.nutrients).toEqual([]);
    }
  });
});

describe('render — selectedId with no matching preset', () => {
  it('renders nothing when selectedId does not exist in presets', async () => {
    const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
      <growspace-nutrient-presets-editor-ui
        .presets=${aPresets()}
        .inventory=${aInventory()}
        .selectedId=${'does-not-exist'}
        .sub=${{ kind: 'idle' }}
      ></growspace-nutrient-presets-editor-ui>
    `);
    expect(el.shadowRoot!.querySelector('[data-action="back"]')).toBeNull();
    expect(el.shadowRoot!.querySelector('[data-action="add"]')).toBeNull();
  });
});

describe('list item — optional stage and week', () => {
  it('omits stage and week text when both are absent', async () => {
    const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
      <growspace-nutrient-presets-editor-ui
        .presets=${{ p1: { id: 'p1', name: 'Bare Preset', nutrients: [] } }}
        .inventory=${aInventory()}
        .selectedId=${null}
        .sub=${{ kind: 'idle' }}
      ></growspace-nutrient-presets-editor-ui>
    `);
    const meta = el.shadowRoot!.querySelector('.item-meta')!;
    expect(meta.textContent).not.toContain('Week');
    expect(meta.textContent!.replace(/\s+/g, ' ')).toContain('0 nutrients');
  });
});

describe('detail view — targets section absent', () => {
  it('hides the Targets section when ec_target and ph_target are both null', async () => {
    const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
      <growspace-nutrient-presets-editor-ui
        .presets=${{ p1: { id: 'p1', name: 'No Targets', stage: 'veg', nutrients: [] } }}
        .inventory=${aInventory()}
        .selectedId=${'p1'}
        .sub=${{ kind: 'idle' }}
      ></growspace-nutrient-presets-editor-ui>
    `);
    const text = el.shadowRoot!.textContent!;
    expect(text).not.toContain('EC target');
    expect(text).not.toContain('pH target');
  });

  it('renders an empty nutrient mix when nutrients field is absent', async () => {
    const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
      <growspace-nutrient-presets-editor-ui
        .presets=${{ p1: { id: 'p1', name: 'No Nutrients', stage: 'veg' } }}
        .inventory=${aInventory()}
        .selectedId=${'p1'}
        .sub=${{ kind: 'idle' }}
      ></growspace-nutrient-presets-editor-ui>
    `);
    expect(el.shadowRoot!.querySelectorAll('.mix-row')).toHaveLength(0);
  });
});

describe('nutrient row — null inventory', () => {
  it('treats all rows as orphans when inventory is null', async () => {
    const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
      <growspace-nutrient-presets-editor-ui
        .presets=${aPresets()}
        .inventory=${null}
        .selectedId=${'p1'}
        .sub=${{
          kind: 'editing',
          draft: {
            name: 'Veg Week 1',
            stage: 'veg',
            week: 1,
            ec_target: 1.2,
            ph_target: 6.0,
            nutrients: [{ nutrient_id: 'n1', dose_ml_l: 2 }],
          },
        }}
      ></growspace-nutrient-presets-editor-ui>
    `);
    const select = el.shadowRoot!.querySelector<HTMLSelectElement>('[data-nutrient-row] select')!;
    expect(select.style.borderColor).toBeTruthy(); // browser normalises #ff9800 → rgb(…)
  });
});

describe('nutrient row — orphan without stored name', () => {
  it('falls back to nutrient_id when orphaned row has no name', async () => {
    const el = await fixture<GrowspaceNutrientPresetsEditorUI>(html`
      <growspace-nutrient-presets-editor-ui
        .presets=${aPresets()}
        .inventory=${aInventory()}
        .selectedId=${'p1'}
        .sub=${{
          kind: 'editing',
          draft: {
            name: 'Veg Week 1',
            stage: 'veg',
            week: 1,
            ec_target: 1.2,
            ph_target: 6.0,
            nutrients: [{ nutrient_id: 'deleted_n', dose_ml_l: 2 }],
          },
        }}
      ></growspace-nutrient-presets-editor-ui>
    `);
    const select = el.shadowRoot!.querySelector<HTMLSelectElement>('[data-nutrient-row] select')!;
    const selected = select.options[select.selectedIndex];
    expect(selected?.text).toContain('deleted_n');
    expect(selected?.text).toContain('missing');
  });
});
