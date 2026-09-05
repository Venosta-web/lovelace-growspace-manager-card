import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';
import { GrowspaceTcPairings } from '../../src/features/tc/containers/growspace-tc-pairings.container';
import { hassCall } from '../../src/services/hass-call';
import { fetchStrainLibrary } from '../../src/slices/strain';
import { pairings$, resetTcPresence } from '../../src/slices/tc';
import recorded from '../fixtures/contract/tc_pairings_response.json';

vi.mock('../../src/services/hass-call', () => ({ hassCall: vi.fn() }));
vi.mock('../../src/slices/strain', async () => {
  const { atom } = await import('nanostores');
  return { fetchStrainLibrary: vi.fn(), strainLibrary$: atom([]) };
});
if (!customElements.get('growspace-tc-pairings'))
  customElements.define('growspace-tc-pairings', GrowspaceTcPairings);
beforeEach(() => {
  vi.clearAllMocks();
  resetTcPresence();
  vi.mocked(fetchStrainLibrary).mockResolvedValue([]);
  vi.mocked(hassCall).mockResolvedValue(recorded);
});
async function render() {
  const el = await fixture<GrowspaceTcPairings>('<growspace-tc-pairings></growspace-tc-pairings>');
  await vi.waitFor(() => expect(el.shadowRoot!.querySelector('[role=status]')).toBeNull());
  return el;
}
describe('pairing container', () => {
  it('loads the single pairing set and keeps edits when saving fails', async () => {
    const el = await render();
    const editor = el.shadowRoot!.querySelector('growspace-tc-pairing-editor')!;
    expect(editor.pairings).toEqual(recorded.pairings);
    const finish = vi.spyOn(editor, 'finishEditing');
    vi.mocked(hassCall).mockRejectedValueOnce(new Error('Conflict'));
    editor.dispatchEvent(
      new CustomEvent('pairing-save-requested', {
        detail: {
          id: 'pairing-1',
          draft: { phenotype_id: 'p', phenotype_name: 'P', medium_id: 'medium-1', notes: 'Draft' },
        },
      })
    );
    await vi.waitFor(() => expect(editor.error).toBe('Conflict'));
    expect(finish).not.toHaveBeenCalled();
    expect(pairings$.get()).toEqual(recorded.pairings);
    vi.mocked(hassCall).mockResolvedValueOnce({ pairing_id: 'pairing-1' });
    editor.dispatchEvent(
      new CustomEvent('pairing-delete-requested', { detail: { id: 'pairing-1' } })
    );
    await vi.waitFor(() => expect(finish).toHaveBeenCalledOnce());
    expect(editor.pairings.map((p) => p.id)).toEqual(['pairing-2']);
  });
  it('offers retry and does not mark references missing when library loading fails', async () => {
    vi.mocked(fetchStrainLibrary).mockRejectedValueOnce(new Error('Offline'));
    const el = await render();
    expect(el.shadowRoot!.querySelector('[role=alert]')!.textContent).toContain('Offline');
    expect(el.shadowRoot!.querySelector('growspace-tc-pairing-editor')!.libraryLoaded).toBe(false);
    el.shadowRoot!.querySelector('button')!.click();
    await vi.waitFor(() =>
      expect(el.shadowRoot!.querySelector('growspace-tc-pairing-editor')!.libraryLoaded).toBe(true)
    );
  });
});
