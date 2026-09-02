/**
 * `<irrigation-program-tab>` — component tests.
 *
 * The tab's job on a bad day is to say why nothing happened, so the tests lean
 * on the holds: each cause carries its own heading and the backend's own
 * sentence, and the three a grower meets — a gap, a finished run, a hand-tuned
 * growspace — are told apart without reading either.
 */

import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import { IrrigationProgramTab } from '../../src/features/irrigation/components/irrigation-program-tab';
import type { ProgramTabViewModel } from '../../src/features/irrigation/viewmodels/program-tab.viewmodel';

if (!customElements.get('irrigation-program-tab')) {
  customElements.define('irrigation-program-tab', IrrigationProgramTab);
}

function makeVm(over: Partial<ProgramTabViewModel> = {}): ProgramTabViewModel {
  return {
    options: [{ id: 'p1', name: 'Full run', spanLabel: 'Veg 1 · Flower 1–3' }],
    assignedName: 'Full run',
    assignedProgramId: 'p1',
    selectedProgramId: 'p1',
    canAssign: false,
    position: {
      stageLabel: 'Flower',
      week: 3,
      recipeName: 'Flower generative',
      missing: false,
    },
    next: { stageLabel: 'Flower', week: 4, recipeName: 'Flower ripen', isNextWeek: true },
    autoAdvance: false,
    progression: {
      state: 'up_to_date',
      hold: null,
      title: 'Following the program',
      detail: 'the backend sentence',
    },
    available: null,
    drift: null,
    confirm: null,
    busy: false,
    ...over,
  };
}

async function render(vm: ProgramTabViewModel): Promise<IrrigationProgramTab> {
  const el = await fixture<IrrigationProgramTab>(
    html`<irrigation-program-tab .vm=${vm}></irrigation-program-tab>`
  );
  await el.updateComplete;
  return el;
}

describe('irrigation-program-tab — the growspace surface', () => {
  it('names the assigned program', async () => {
    const el = await render(makeVm());

    expect(el.shadowRoot!.textContent).toContain('Full run');
  });

  it('reports the current slot and what next week holds', async () => {
    const el = await render(makeVm());

    expect(el.shadowRoot!.querySelector('[data-current-week]')?.textContent).toContain(
      'Flower week 3'
    );
    expect(el.shadowRoot!.querySelector('[data-current-recipe]')?.textContent).toContain(
      'Flower generative'
    );
    expect(el.shadowRoot!.querySelector('[data-next-slot]')?.textContent).toContain(
      'Flower week 4'
    );
  });

  it('says a week with no recipe leaves the growspace alone', async () => {
    const el = await render(
      makeVm({
        position: { stageLabel: 'Flower', week: 4, recipeName: null, missing: false },
      })
    );

    expect(el.shadowRoot!.querySelector('[data-current-recipe]')?.textContent).toContain(
      'leaves this week alone'
    );
  });

  it('says when the plan has nothing left rather than showing a blank', async () => {
    const el = await render(makeVm({ next: null }));

    expect(el.shadowRoot!.querySelector('[data-next-slot]')?.textContent).toContain(
      'end of the plan'
    );
  });

  it('offers the auto-advance toggle, reflecting what is persisted', async () => {
    const el = await render(makeVm({ autoAdvance: true }));

    const toggle = el.shadowRoot!.querySelector<HTMLInputElement>('.program-auto-advance');
    expect(toggle?.checked).toBe(true);
  });

  it('explains itself when nothing is assigned', async () => {
    const el = await render(
      makeVm({ assignedProgramId: null, assignedName: null, position: null, progression: null })
    );

    expect(el.shadowRoot!.querySelector('[data-unassigned]')).not.toBeNull();
  });
});

describe('irrigation-program-tab — the holds', () => {
  const HOLDS: [string, string][] = [
    ['no_position', 'Holding — no live plants'],
    ['no_slot', 'Holding — this week has no recipe'],
    ['program_complete', 'Program complete'],
    ['recipe_missing', 'Holding — the recipe was deleted'],
    ['drifted', 'Holding — settings were changed'],
    ['not_applicable', 'Holding — this recipe cannot be applied here'],
  ];

  it.each(HOLDS)('renders %s with its own heading and cause attribute', async (hold, title) => {
    const el = await render(
      makeVm({
        progression: {
          state: 'held',
          hold: hold as never,
          title,
          detail: 'the backend sentence',
        },
        drift: hold === 'drifted' ? { fields: [], appliedRecipeName: null } : null,
      })
    );

    expect(el.shadowRoot!.querySelector('[data-progression-title]')?.textContent?.trim()).toBe(
      title
    );
    expect(el.shadowRoot!.querySelector(`[data-progression-hold="${hold}"]`)).not.toBeNull();
  });

  it('always renders the backend sentence, whatever the cause', async () => {
    const el = await render(
      makeVm({
        progression: {
          state: 'held',
          hold: 'no_slot',
          title: 'Holding — this week has no recipe',
          detail: "Irrigation program 'Full run' defines no slot for flower week 4.",
        },
      })
    );

    expect(el.shadowRoot!.querySelector('[data-progression-detail]')?.textContent).toContain(
      'defines no slot'
    );
  });
});

describe('irrigation-program-tab — drift', () => {
  it('names the fields that changed since the recipe was applied', async () => {
    const el = await render(
      makeVm({
        progression: {
          state: 'held',
          hold: 'drifted',
          title: 'Holding — settings were changed',
          detail: 'no longer match',
        },
        drift: { fields: ['Target VWC', 'P1 interval'], appliedRecipeName: 'Flower generative' },
      })
    );

    const text = el.shadowRoot!.querySelector('[data-drift-fields]')?.textContent;
    expect(text).toContain('Target VWC, P1 interval');
    expect(text).toContain('Flower generative');
  });

  it('states the difference without naming fields it cannot see', async () => {
    const el = await render(
      makeVm({
        progression: {
          state: 'held',
          hold: 'drifted',
          title: 'Holding — settings were changed',
          detail: 'no longer match',
        },
        drift: { fields: [], appliedRecipeName: 'Flower generative' },
      })
    );

    const text = el.shadowRoot!.querySelector('[data-drift-fields]')?.textContent;
    expect(text).toContain('no longer match');
    expect(text).not.toContain('Changed since');
  });

  it('says nothing about drift on any other hold', async () => {
    const el = await render(
      makeVm({
        progression: {
          state: 'held',
          hold: 'no_slot',
          title: 'Holding — this week has no recipe',
          detail: 'no slot',
        },
      })
    );

    expect(el.shadowRoot!.querySelector('[data-drift-fields]')).toBeNull();
  });
});

describe('irrigation-program-tab — the available prompt', () => {
  it('offers the week’s recipe by name', async () => {
    const el = await render(
      makeVm({
        progression: {
          state: 'available',
          hold: null,
          title: "This week's recipe is ready",
          detail: 'Auto-advance is off, so nothing has been changed.',
        },
        available: {
          recipeId: 'r-flower',
          name: 'Flower generative',
          stageLabel: 'Flower',
          week: 3,
        },
      })
    );

    const button = el.shadowRoot!.querySelector('.btn-apply-program-recipe');
    expect(button?.textContent).toContain('Flower generative');
  });

  it('applies that recipe, and only that recipe', async () => {
    const el = await render(
      makeVm({
        available: {
          recipeId: 'r-flower',
          name: 'Flower generative',
          stageLabel: 'Flower',
          week: 3,
        },
      })
    );
    let detail: unknown;
    el.addEventListener('program-recipe-apply-requested', (e) => {
      detail = (e as CustomEvent).detail;
    });

    el.shadowRoot!.querySelector<HTMLButtonElement>('.btn-apply-program-recipe')!.click();

    expect(detail).toEqual({ recipeId: 'r-flower' });
  });

  it('offers nothing when nothing is waiting', async () => {
    const el = await render(makeVm());

    expect(el.shadowRoot!.querySelector('.btn-apply-program-recipe')).toBeNull();
  });
});

describe('irrigation-program-tab — assigning', () => {
  it('emits the picked program', async () => {
    const el = await render(
      makeVm({ options: [{ id: 'p2', name: 'Short run', spanLabel: null }] })
    );
    let detail: unknown;
    el.addEventListener('program-selected', (e) => {
      detail = (e as CustomEvent).detail;
    });

    const select = el.shadowRoot!.querySelector<HTMLSelectElement>('.program-select')!;
    select.value = 'p2';
    select.dispatchEvent(new Event('change'));

    expect(detail).toEqual({ programId: 'p2' });
  });

  it('emits null for the unbind option, which is a real choice', async () => {
    const el = await render(makeVm());
    let detail: unknown;
    el.addEventListener('program-selected', (e) => {
      detail = (e as CustomEvent).detail;
    });

    const select = el.shadowRoot!.querySelector<HTMLSelectElement>('.program-select')!;
    select.value = '';
    select.dispatchEvent(new Event('change'));

    expect(detail).toEqual({ programId: null });
  });

  it('labels the button for what it will do', async () => {
    const unbind = await render(makeVm({ selectedProgramId: null, canAssign: true }));
    expect(unbind.shadowRoot!.querySelector('.btn-assign-program')?.textContent).toContain(
      'Stop following'
    );

    const assign = await render(makeVm({ selectedProgramId: 'p1', canAssign: true }));
    expect(assign.shadowRoot!.querySelector('.btn-assign-program')?.textContent).toContain(
      'Assign'
    );
  });

  it('cannot assign what is already assigned', async () => {
    const el = await render(makeVm());

    const button = el.shadowRoot!.querySelector<HTMLButtonElement>('.btn-assign-program');
    expect(button?.disabled).toBe(true);
  });

  it('points at the editor when there are no programs to assign', async () => {
    const el = await render(makeVm({ options: [] }));

    expect(el.shadowRoot!.querySelector('[data-no-programs]')?.textContent).toContain(
      'Irrigation Programs'
    );
  });
});

describe('irrigation-program-tab — the auto-advance confirmation', () => {
  it('says what turning it on will do before the grower confirms', async () => {
    const el = await render(
      makeVm({
        confirm: {
          kind: 'enable-auto-advance',
          title: 'Turn on auto-advance?',
          message: 'applies “Flower generative” to it shortly',
          confirmLabel: 'Turn on and apply',
        },
      })
    );

    expect(el.shadowRoot!.querySelector('[data-confirm-message]')?.textContent).toContain(
      'Flower generative'
    );
    expect(el.shadowRoot!.querySelector('.btn-confirm-accept')?.textContent).toContain(
      'Turn on and apply'
    );
  });

  it('replaces the tab until it is answered, so it cannot be walked past', async () => {
    const el = await render(
      makeVm({
        confirm: {
          kind: 'enable-auto-advance',
          title: 'Turn on auto-advance?',
          message: 'applies it shortly',
          confirmLabel: 'Turn on and apply',
        },
      })
    );

    expect(el.shadowRoot!.querySelector('.program-auto-advance')).toBeNull();
  });

  it('emits accept and cancel separately', async () => {
    const el = await render(
      makeVm({
        confirm: {
          kind: 'enable-auto-advance',
          title: 'Turn on auto-advance?',
          message: 'applies it shortly',
          confirmLabel: 'Turn on and apply',
        },
      })
    );
    const seen: string[] = [];
    el.addEventListener('program-confirm-accepted', () => seen.push('accepted'));
    el.addEventListener('program-confirm-cancelled', () => seen.push('cancelled'));

    el.shadowRoot!.querySelector<HTMLButtonElement>('.btn-confirm-cancel')!.click();
    el.shadowRoot!.querySelector<HTMLButtonElement>('.btn-confirm-accept')!.click();

    expect(seen).toEqual(['cancelled', 'accepted']);
  });
});
