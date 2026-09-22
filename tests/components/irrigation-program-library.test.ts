/**
 * `<irrigation-program-library>` — component tests.
 *
 * The grid is the thing under test. A plan is legible only if the positions it
 * says nothing about are on screen as empty positions, so most of these assert
 * that a gap is rendered rather than skipped.
 */

import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import { IrrigationProgramLibrary } from '../../src/features/irrigation/components/irrigation-program-library';
import type {
  ProgramGridVM,
  ProgramLibraryViewModel,
  ProgramRowVM,
} from '../../src/features/irrigation/viewmodels/program-library.viewmodel';
import type { IrrigationProgram } from '../../src/services/types';

if (!customElements.get('irrigation-program-library')) {
  customElements.define('irrigation-program-library', IrrigationProgramLibrary);
}

function row(over: Partial<ProgramRowVM> = {}): ProgramRowVM {
  return {
    id: 'p1',
    name: 'Full run',
    spanLabel: 'Veg 1 · Flower 1–3',
    slotCount: 3,
    createdAtLabel: '6 Aug 2026, 09:00',
    selected: false,
    ...over,
  };
}

/** A two-stage, two-week grid whose flower week 2 is deliberately empty. */
function grid(): ProgramGridVM {
  return {
    columns: [
      { stage: 'veg', label: 'Veg', closable: false },
      { stage: 'flower', label: 'Flower', closable: true },
    ],
    weeks: [1, 2],
    rows: [
      [
        { stage: 'veg', week: 1, recipeId: 'r-veg', recipeName: 'Veg feed', missing: false },
        { stage: 'flower', week: 1, recipeId: 'r-f', recipeName: 'Flower', missing: false },
      ],
      [
        { stage: 'veg', week: 2, recipeId: null, recipeName: null, missing: false },
        { stage: 'flower', week: 2, recipeId: null, recipeName: null, missing: false },
      ],
    ],
  };
}

const PROGRAM = { id: 'p1', name: 'Full run' } as unknown as IrrigationProgram;

function makeVm(over: Partial<ProgramLibraryViewModel> = {}): ProgramLibraryViewModel {
  return {
    rows: [row()],
    selected: null,
    editing: false,
    creating: false,
    nameDraft: 'Full run',
    grid: null,
    recipeOptions: [
      { id: 'r-veg', name: 'Veg feed', kindLabel: 'Crop steering' },
      { id: 'r-f', name: 'Flower', kindLabel: 'Crop steering' },
    ],
    openableStages: [{ stage: 'seedling', label: 'Seedling', closable: true }],
    canSave: false,
    errorMessage: null,
    deleteConfirm: null,
    busy: false,
    toast: undefined,
    ...over,
  };
}

async function render(vm: ProgramLibraryViewModel): Promise<IrrigationProgramLibrary> {
  const el = await fixture<IrrigationProgramLibrary>(
    html`<irrigation-program-library .vm=${vm}></irrigation-program-library>`
  );
  await el.updateComplete;
  return el;
}

describe('irrigation-program-library — the list', () => {
  it('reports each plan as the run it covers', async () => {
    const el = await render(makeVm());

    const item = el.shadowRoot!.querySelector('.list-item');
    expect(item?.textContent).toContain('Full run');
    expect(item?.textContent).toContain('Veg 1 · Flower 1–3');
    expect(item?.textContent).toContain('3 weeks planned');
  });

  it('explains what a program is when there are none', async () => {
    const el = await render(makeVm({ rows: [] }));

    expect(el.shadowRoot!.querySelector('[data-empty]')).not.toBeNull();
  });

  it('always offers a way to start one', async () => {
    const el = await render(makeVm({ rows: [] }));

    expect(el.shadowRoot!.querySelector('.btn-new-program')).not.toBeNull();
  });
});

describe('irrigation-program-library — the grid', () => {
  it('renders a cell for every position, including the empty ones', async () => {
    const el = await render(makeVm({ selected: PROGRAM, grid: grid() }));

    expect(el.shadowRoot!.querySelectorAll('td.slot')).toHaveLength(4);
  });

  it('draws an empty position as visibly empty rather than omitting it', async () => {
    const el = await render(makeVm({ selected: PROGRAM, grid: grid() }));

    const cell = el.shadowRoot!.querySelector('td.slot[data-stage="flower"][data-week="2"]');
    expect(cell).not.toBeNull();
    const value = cell!.querySelector('.slot-static');
    expect(value?.classList.contains('empty')).toBe(true);
    expect(value?.textContent?.trim()).toBe('—');
  });

  it('says out loud that an empty cell is deliberate', async () => {
    const el = await render(makeVm({ selected: PROGRAM, grid: grid() }));

    expect(el.shadowRoot!.querySelector('.legend')?.textContent).toContain('not an oversight');
  });

  it('names the recipe a filled cell points at', async () => {
    const el = await render(makeVm({ selected: PROGRAM, grid: grid() }));

    const cell = el.shadowRoot!.querySelector('td.slot[data-stage="veg"][data-week="1"]');
    expect(cell?.textContent).toContain('Veg feed');
  });

  it('marks a cell whose recipe was deleted, distinctly from an empty one', async () => {
    const withMissing = grid();
    withMissing.rows[1][0] = {
      stage: 'veg',
      week: 2,
      recipeId: 'r-gone',
      recipeName: null,
      missing: true,
    };
    const el = await render(makeVm({ selected: PROGRAM, grid: withMissing }));

    const cell = el.shadowRoot!.querySelector('td.slot[data-stage="veg"][data-week="2"]');
    const value = cell!.querySelector('.slot-static');
    expect(value?.classList.contains('missing')).toBe(true);
    expect(value?.classList.contains('empty')).toBe(false);
    expect(value?.textContent?.trim()).toBe('Recipe deleted');
  });

  it('renders a week row per week, labelled', async () => {
    const el = await render(makeVm({ selected: PROGRAM, grid: grid() }));

    const labels = [...el.shadowRoot!.querySelectorAll('td.week-cell')].map((c) =>
      c.textContent?.trim()
    );
    expect(labels).toEqual(['Wk 1', 'Wk 2']);
  });
});

describe('irrigation-program-library — editing', () => {
  it('turns each cell into a picker with an empty option', async () => {
    const el = await render(makeVm({ selected: PROGRAM, grid: grid(), editing: true }));

    const select = el.shadowRoot!.querySelector<HTMLSelectElement>(
      'td.slot[data-stage="flower"][data-week="2"] select'
    );
    expect(select).not.toBeNull();
    expect(select!.options[0].value).toBe('');
    expect(select!.classList.contains('empty')).toBe(true);
  });

  it('opens each picker on the recipe its cell already holds', async () => {
    const el = await render(makeVm({ selected: PROGRAM, grid: grid(), editing: true }));

    const filled = el.shadowRoot!.querySelector<HTMLSelectElement>(
      'td.slot[data-stage="veg"][data-week="1"] select'
    )!;
    const empty = el.shadowRoot!.querySelector<HTMLSelectElement>(
      'td.slot[data-stage="veg"][data-week="2"] select'
    )!;

    expect(filled.value).toBe('r-veg');
    expect(empty.value).toBe('');
  });

  it('emits the position and the recipe when a cell changes', async () => {
    const el = await render(makeVm({ selected: PROGRAM, grid: grid(), editing: true }));
    let detail: unknown;
    el.addEventListener('program-slot-changed', (e) => {
      detail = (e as CustomEvent).detail;
    });

    const select = el.shadowRoot!.querySelector<HTMLSelectElement>(
      'td.slot[data-stage="flower"][data-week="2"] select'
    )!;
    select.value = 'r-f';
    select.dispatchEvent(new Event('change'));

    expect(detail).toEqual({ stage: 'flower', week: 2, recipeId: 'r-f' });
  });

  it('emits a null recipe when a cell is emptied — a gap is an instruction', async () => {
    const el = await render(makeVm({ selected: PROGRAM, grid: grid(), editing: true }));
    let detail: unknown;
    el.addEventListener('program-slot-changed', (e) => {
      detail = (e as CustomEvent).detail;
    });

    const select = el.shadowRoot!.querySelector<HTMLSelectElement>(
      'td.slot[data-stage="veg"][data-week="1"] select'
    )!;
    select.value = '';
    select.dispatchEvent(new Event('change'));

    expect(detail).toEqual({ stage: 'veg', week: 1, recipeId: null });
  });

  it('offers to close only the columns that hold nothing', async () => {
    const el = await render(makeVm({ selected: PROGRAM, grid: grid(), editing: true }));

    const heads = el.shadowRoot!.querySelectorAll('th[data-stage]');
    expect(heads[0].querySelector('.close-stage')).toBeNull();
    expect(heads[1].querySelector('.close-stage')).not.toBeNull();
  });

  it('offers the stages the plan has no column for', async () => {
    const el = await render(makeVm({ selected: PROGRAM, grid: grid(), editing: true }));

    expect(el.shadowRoot!.querySelector('[data-open-stage="seedling"]')).not.toBeNull();
  });

  it('shows the backend refusal without discarding the plan', async () => {
    const el = await render(
      makeVm({
        selected: PROGRAM,
        grid: grid(),
        editing: true,
        errorMessage: 'Slot 1 names dry, which is not a live stage.',
      })
    );

    expect(el.shadowRoot!.querySelector('[data-save-error]')?.textContent).toContain('not a live');
    expect(el.shadowRoot!.querySelectorAll('td.slot')).toHaveLength(4);
  });

  it('renders the form for a plan being created, which has nothing selected', async () => {
    const el = await render(makeVm({ creating: true, editing: true, grid: grid(), nameDraft: '' }));

    expect(el.shadowRoot!.querySelector('.program-name-input')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('[data-program-grid]')).not.toBeNull();
  });
});

describe('irrigation-program-library — deleting', () => {
  it('says what deleting leaves behind before it happens', async () => {
    const el = await render(makeVm({ deleteConfirm: { id: 'p1', name: 'Full run' } }));

    const confirm = el.shadowRoot!.querySelector('[data-delete-confirm]');
    expect(confirm?.textContent).toContain('Full run');
    expect(confirm?.textContent).toContain('keep the settings it already gave them');
    expect(confirm?.textContent).toContain('recipes it used stay in the library');
  });
});
