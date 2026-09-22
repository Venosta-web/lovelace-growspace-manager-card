import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { GrowspaceTcPairings } from '../../src/features/tc/containers/growspace-tc-pairings.container';
import { hassCall } from '../../src/services/hass-call';
import { fetchStrainLibrary, strainLibrary$ } from '../../src/slices/strain';
import {
  cultureMedia$,
  pairings$,
  resetTcPresence,
  CultureMediumSchema,
} from '../../src/slices/tc';
import recorded from '../fixtures/contract/tc_pairings_response.json';

vi.mock('../../src/services/hass-call', () => ({ hassCall: vi.fn() }));
vi.mock('../../src/slices/strain', async () => {
  const { atom } = await import('nanostores');
  return { fetchStrainLibrary: vi.fn(), strainLibrary$: atom([]) };
});
if (!customElements.get('growspace-tc-pairings'))
  customElements.define('growspace-tc-pairings', GrowspaceTcPairings);

const library = [
  { key: recorded.pairings[0].phenotype.id, strain: 'Current keeper', phenotype: 'default' },
  { key: 'another', strain: 'Another', phenotype: 'default' },
];
const medium = CultureMediumSchema.parse({
  id: 'medium-1',
  name: 'MS multiplication',
  created_at: '',
  updated_at: '',
  current_version: 2,
  versions: [],
});
const saved = { pairing: { ...recorded.pairings[0], notes: 'My notes' } };
function pending<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
beforeEach(() => {
  vi.resetAllMocks();
  resetTcPresence();
  cultureMedia$.set([medium]);
  strainLibrary$.set(library);
  vi.mocked(fetchStrainLibrary).mockResolvedValue(library);
  vi.mocked(hassCall).mockResolvedValue(recorded);
});
afterEach(() => {
  fixtureCleanup();
});
async function render() {
  const el = await fixture<GrowspaceTcPairings>('<growspace-tc-pairings></growspace-tc-pairings>');
  await vi.waitFor(() => expect(el.shadowRoot!.querySelector('[role=status]')).toBeNull());
  return el;
}
const button = (el: GrowspaceTcPairings, label: string) =>
  [...el.shadowRoot!.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;
const editButton = (el: GrowspaceTcPairings, id = 'pairing-1') =>
  el.shadowRoot!.querySelector<HTMLButtonElement>(
    `[data-pairing-id="${id}"] [data-action="edit"]`
  )!;
async function edit(el: GrowspaceTcPairings) {
  editButton(el).click();
  await el.updateComplete;
  const picker = el.shadowRoot!.querySelector('growspace-tc-phenotype-picker')!;
  await picker.updateComplete;
  const notes = el.shadowRoot!.querySelector('textarea')!;
  notes.value = 'My notes';
  notes.dispatchEvent(new Event('input'));
  await el.updateComplete;
}
function submit(el: GrowspaceTcPairings) {
  el.shadowRoot!.querySelector('form')!.requestSubmit();
}
async function choose(el: GrowspaceTcPairings, name: string) {
  const picker = el.shadowRoot!.querySelector('growspace-tc-phenotype-picker')!;
  await picker.updateComplete;
  [...picker.shadowRoot!.querySelectorAll('button')]
    .find((b) => b.textContent?.trim() === name)!
    .click();
  await el.updateComplete;
}

describe('Pairing surface', () => {
  it('retains a real draft after rejection, retries it, and completes through the slice', async () => {
    const el = await render();
    await edit(el);
    const write = pending<typeof saved>();
    vi.mocked(hassCall).mockReturnValueOnce(write.promise);
    submit(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('fieldset')!.disabled).toBe(true);
    expect(button(el, 'Cancel').matches(':disabled')).toBe(true);
    expect(button(el, 'Add pairing').disabled).toBe(true);
    expect(editButton(el).disabled).toBe(true);
    expect(button(el, 'Remove pairing').disabled).toBe(true);
    button(el, 'Cancel').click();
    editButton(el).click();
    submit(el);
    expect(
      vi.mocked(hassCall).mock.calls.filter(([command]) => command.endsWith('/update'))
    ).toHaveLength(1);
    write.reject(new Error('Conflict'));
    await vi.waitFor(() => expect(el.shadowRoot!.textContent).toContain('Conflict'));
    expect(el.shadowRoot!.querySelector('textarea')!.value).toBe('My notes');
    expect(pairings$.get()).toEqual(recorded.pairings);
    vi.mocked(hassCall).mockResolvedValueOnce(saved);
    submit(el);
    await vi.waitFor(() => expect(el.shadowRoot!.querySelector('form')).toBeNull());
    expect(pairings$.get().find((row) => row.id === 'pairing-1')?.notes).toBe('My notes');
    expect(el.shadowRoot!.querySelector('[data-pairing-id="pairing-1"] .notes')!.textContent).toBe(
      'My notes'
    );
    expect(hassCall).toHaveBeenLastCalledWith(
      'growspace_manager_tc/pairings/update',
      {
        pairing_id: 'pairing-1',
        phenotype_id: library[0].key,
        phenotype_name: 'Current keeper',
        medium_id: 'medium-1',
        notes: 'My notes',
      },
      expect.anything()
    );
  });

  it('renders the same Pairings and notes in both orientations', async () => {
    const el = await render();
    expect(el.shadowRoot!.querySelector('h4')!.textContent).toBe('MS multiplication');
    expect(el.shadowRoot!.textContent).toContain('Current keeper');
    expect(el.shadowRoot!.textContent).toContain('Missing phenotype');
    const ids = () =>
      [...el.shadowRoot!.querySelectorAll('[data-pairing-id]')]
        .map((row) => row.getAttribute('data-pairing-id'))
        .sort();
    expect(ids()).toEqual(['pairing-1', 'pairing-2']);
    const select = el.shadowRoot!.querySelector('select')!;
    select.value = 'phenotype';
    select.dispatchEvent(new Event('change'));
    await el.updateComplete;
    expect(ids()).toEqual(['pairing-1', 'pairing-2']);
    expect(el.shadowRoot!.querySelectorAll('h4')).toHaveLength(2);
    expect(el.shadowRoot!.querySelectorAll('.notes')).toHaveLength(2);
  });

  it('blocks a duplicate and creates a different Pairing through the picker', async () => {
    const el = await render();
    button(el, 'Add pairing').click();
    await el.updateComplete;
    await choose(el, 'Current keeper');
    expect(el.shadowRoot!.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(
      true
    );
    await choose(el, 'Another');
    expect(el.shadowRoot!.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(
      false
    );
    const pairing = {
      ...recorded.pairings[0],
      id: 'new-pairing',
      phenotype: { ...recorded.pairings[0].phenotype, id: 'another' },
    };
    vi.mocked(hassCall).mockResolvedValueOnce({ pairing });
    submit(el);
    await vi.waitFor(() => expect(el.shadowRoot!.querySelector('form')).toBeNull());
    expect(hassCall).toHaveBeenLastCalledWith(
      'growspace_manager_tc/pairings/create',
      {
        phenotype_id: 'another',
        phenotype_name: 'Another',
        medium_id: 'medium-1',
        notes: '',
      },
      expect.anything()
    );
    expect(el.shadowRoot!.querySelector('[data-pairing-id="new-pairing"]')).not.toBeNull();
  });

  it('offers library retry without declaring missing references before it succeeds', async () => {
    strainLibrary$.set([]);
    vi.mocked(fetchStrainLibrary).mockRejectedValueOnce(new Error('Offline'));
    const el = await render();
    expect(el.shadowRoot!.textContent).toContain('Offline');
    expect(el.shadowRoot!.textContent).not.toContain('Missing phenotype');
    expect(el.shadowRoot!.textContent).toContain('Preserved name');
    expect(button(el, 'Add pairing').disabled).toBe(true);
    button(el, 'Retry loading pairings').click();
    await vi.waitFor(() => expect(button(el, 'Add pairing').disabled).toBe(false));
    expect(el.shadowRoot!.textContent).toContain('Missing phenotype');
  });

  it('cancels an unsaved edit without writing and returns focus to its action', async () => {
    const el = await render();
    await edit(el);
    const cancel = button(el, 'Cancel');
    cancel.focus();
    cancel.click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('form')).toBeNull();
    expect(el.shadowRoot!.activeElement).toBe(editButton(el));
    expect(hassCall).toHaveBeenCalledTimes(1);
  });

  it('restores the edited Pairing action after regrouping during a save', async () => {
    const el = await render();
    await edit(el);
    const write = pending<typeof saved>();
    vi.mocked(hassCall).mockReturnValueOnce(write.promise);
    submit(el);
    await el.updateComplete;
    const grouping = el.shadowRoot!.querySelector<HTMLSelectElement>('.toolbar select')!;
    grouping.focus();
    grouping.value = 'phenotype';
    grouping.dispatchEvent(new Event('change'));
    await el.updateComplete;
    write.resolve(saved);
    await vi.waitFor(() => expect(el.shadowRoot!.querySelector('form')).toBeNull());
    expect(el.shadowRoot!.activeElement).toBe(editButton(el));
  });

  it('retains a failed removal for retry and falls back to Add after removing the row', async () => {
    const el = await render();
    button(el, 'Remove pairing').click();
    await el.updateComplete;
    vi.mocked(hassCall).mockRejectedValueOnce(new Error('Cannot remove'));
    button(el, 'Remove pairing').click();
    await vi.waitFor(() => expect(el.shadowRoot!.textContent).toContain('Cannot remove'));
    expect(el.shadowRoot!.querySelector('[data-pairing-id="pairing-1"]')).not.toBeNull();
    const write = pending<{ pairing_id: string }>();
    vi.mocked(hassCall).mockReturnValueOnce(write.promise);
    button(el, 'Remove pairing').click();
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLSelectElement>('.toolbar select')!.focus();
    write.resolve({ pairing_id: 'pairing-1' });
    await vi.waitFor(() =>
      expect(el.shadowRoot!.querySelector('[data-pairing-id="pairing-1"]')).toBeNull()
    );
    expect(el.shadowRoot!.activeElement).toBe(button(el, 'Add pairing'));
    expect(hassCall).toHaveBeenLastCalledWith(
      'growspace_manager_tc/pairings/delete',
      { pairing_id: 'pairing-1' },
      expect.anything()
    );
  });

  it('does not steal focus moved outside the Pairing surface during save', async () => {
    const outside = await fixture<HTMLButtonElement>('<button>Elsewhere</button>');
    const el = await render();
    await edit(el);
    const write = pending<typeof saved>();
    vi.mocked(hassCall).mockReturnValueOnce(write.promise);
    submit(el);
    await el.updateComplete;
    outside.focus();
    write.resolve(saved);
    await vi.waitFor(() => expect(el.shadowRoot!.querySelector('form')).toBeNull());
    expect(document.activeElement).toBe(outside);
  });

  it('does not restore focus when an ancestor hides the surface during save', async () => {
    const el = await render();
    await edit(el);
    const write = pending<typeof saved>();
    vi.mocked(hassCall).mockReturnValueOnce(write.promise);
    submit(el);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLSelectElement>('.toolbar select')!.focus();
    const focus = vi.spyOn(button(el, 'Add pairing'), 'focus');
    const rowFocus = vi.spyOn(editButton(el), 'focus');
    el.parentElement!.hidden = true;
    write.resolve(saved);
    await vi.waitFor(() => expect(el.shadowRoot!.querySelector('form')).toBeNull());
    expect(focus).not.toHaveBeenCalled();
    expect(rowFocus).not.toHaveBeenCalled();
    el.parentElement!.hidden = false;
  });

  it.each(['resolve', 'reject'] as const)(
    'isolates a reopened surface when the dismissed save later %ss',
    async (outcome) => {
      const el = await render();
      await edit(el);
      const write = pending<typeof saved>();
      vi.mocked(hassCall).mockReturnValueOnce(write.promise);
      submit(el);
      await el.updateComplete;
      const parent = el.parentElement!;
      el.remove();
      // Even reconnecting the same element starts a fresh editing session.
      parent.append(el);
      await vi.waitFor(() => expect(el.shadowRoot!.querySelector('[role=status]')).toBeNull());
      expect(el.shadowRoot!.querySelector('form')).toBeNull();
      await edit(el);
      const notes = el.shadowRoot!.querySelector('textarea')!;
      notes.value = 'New session';
      notes.dispatchEvent(new Event('input'));
      await el.updateComplete;
      const nextWrite = pending<typeof saved>();
      vi.mocked(hassCall).mockReturnValueOnce(nextWrite.promise);
      submit(el);
      await el.updateComplete;
      if (outcome === 'resolve') write.resolve(saved);
      else write.reject(new Error('Old failure'));
      await write.promise.catch(() => undefined);
      await el.updateComplete;
      expect(el.shadowRoot!.querySelector('textarea')!.value).toBe('New session');
      expect(el.shadowRoot!.querySelector('fieldset')!.disabled).toBe(true);
      expect(el.shadowRoot!.textContent).not.toContain('Old failure');
      if (outcome === 'resolve')
        expect(pairings$.get().find((p) => p.id === 'pairing-1')?.notes).toBe('My notes');
      nextWrite.reject(new Error('New failure'));
      await vi.waitFor(() => expect(el.shadowRoot!.textContent).toContain('New failure'));
      expect(el.shadowRoot!.querySelector('textarea')!.value).toBe('New session');
    }
  );
});
