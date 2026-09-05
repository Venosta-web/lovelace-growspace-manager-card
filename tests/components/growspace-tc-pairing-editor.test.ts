import { describe, it, expect, vi } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';
import { html } from 'lit';
import { GrowspaceTcPairingEditor } from '../../src/features/tc/components/growspace-tc-pairing-editor';
import { PairingsResponseSchema, CultureMediumSchema } from '../../src/slices/tc/schema';
import recorded from '../fixtures/contract/tc_pairings_response.json';

if (!customElements.get('growspace-tc-pairing-editor'))
  customElements.define('growspace-tc-pairing-editor', GrowspaceTcPairingEditor);

const rows = PairingsResponseSchema.parse(recorded).pairings;
const medium = CultureMediumSchema.parse({
  id: 'medium-1',
  name: 'MS multiplication',
  created_at: '',
  updated_at: '',
  current_version: 2,
  versions: [],
});
async function render(): Promise<GrowspaceTcPairingEditor> {
  return fixture<GrowspaceTcPairingEditor>(
    html`<growspace-tc-pairing-editor
      .pairings=${rows}
      .media=${[medium]}
      .phenotypes=${[{ id: rows[0].phenotype.id, name: 'Current keeper' }]}
      .libraryLoaded=${true}
    ></growspace-tc-pairing-editor>`
  );
}
const button = (el: GrowspaceTcPairingEditor, label: string) =>
  [...el.shadowRoot!.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;

describe('curated pairing editor', () => {
  it('renders the same records and notes in both orientations, including missing phenotypes', async () => {
    const el = await render();
    expect(el.shadowRoot!.querySelector('h4')!.textContent).toBe('MS multiplication');
    expect(el.shadowRoot!.textContent).toContain('Current keeper');
    expect(el.shadowRoot!.textContent).toContain('Missing phenotype');
    const ids = () =>
      [...el.shadowRoot!.querySelectorAll('li')]
        .map((row) => row.getAttribute('data-pairing-id'))
        .sort();
    expect(ids()).toEqual(['pairing-1', 'pairing-2']);
    const select = el.shadowRoot!.querySelector('select')!;
    select.value = 'phenotype';
    select.dispatchEvent(new Event('change'));
    await el.updateComplete;
    expect(ids()).toEqual(['pairing-1', 'pairing-2']);
    expect(el.shadowRoot!.querySelectorAll('h4').length).toBe(2);
    expect(el.shadowRoot!.querySelectorAll('.notes').length).toBe(2);
  });
  it('edits notes with no version field, retains failed drafts, and removes by pairing ID', async () => {
    const el = await render();
    const save = vi.fn();
    const remove = vi.fn();
    el.addEventListener('pairing-save-requested', save);
    el.addEventListener('pairing-delete-requested', remove);
    button(el, 'Edit pairing').click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('form select')!.value).toBe('medium-1');
    const notes = el.shadowRoot!.querySelector('textarea')!;
    notes.value = 'My notes';
    notes.dispatchEvent(new Event('input'));
    await el.updateComplete;
    el.shadowRoot!.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(save.mock.calls[0][0].detail).toEqual({
      id: 'pairing-1',
      draft: {
        phenotype_id: rows[0].phenotype.id,
        phenotype_name: 'Current keeper',
        medium_id: 'medium-1',
        notes: 'My notes',
      },
    });
    el.error = 'Conflict';
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('textarea')!.value).toBe('My notes');
    el.finishEditing();
    await el.updateComplete;
    button(el, 'Remove pairing').click();
    await el.updateComplete;
    button(el, 'Remove pairing').click();
    expect(remove.mock.calls[0][0].detail).toEqual({ id: 'pairing-1' });
  });
  it('blocks a duplicate combination and allows creating a different one', async () => {
    const el = await render();
    button(el, 'Add pairing').click();
    await el.updateComplete;
    const picker = el.shadowRoot!.querySelector('growspace-tc-phenotype-picker')!;
    picker.dispatchEvent(
      new CustomEvent('phenotype-selected', {
        detail: { id: rows[0].phenotype.id, name: 'Keeper' },
      })
    );
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(
      true
    );
    picker.dispatchEvent(
      new CustomEvent('phenotype-selected', { detail: { id: 'another', name: 'Another' } })
    );
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(
      false
    );
  });
  it('does not declare a missing phenotype until the library loads', async () => {
    const el = await render();
    el.libraryLoaded = false;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).not.toContain('Missing phenotype');
    expect(el.shadowRoot!.textContent).toContain('Preserved name');
  });
});
