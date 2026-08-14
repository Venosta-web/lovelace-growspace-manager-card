import { fixture, html } from '@open-wc/testing-helpers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchStrainLibrary, showToast, updateStrainMeta } = vi.hoisted(() => ({
  fetchStrainLibrary: vi.fn(),
  showToast: vi.fn(),
  updateStrainMeta: vi.fn(),
}));

vi.mock('../../src/slices/strain', () => ({
  fetchStrainLibrary,
  updateStrainMeta,
}));

vi.mock('../../src/slices/ui', () => ({
  showError: vi.fn(),
  showToast,
}));

import '../../src/dialogs/strain-library-dialog';
import type { StrainLibraryDialog } from '../../src/dialogs/strain-library-dialog';
import type { StrainEditorView } from '../../src/dialogs/strain-editor-view';

describe('Strain Library save boundary', () => {
  beforeEach(() => {
    fetchStrainLibrary.mockReset().mockResolvedValue(undefined);
    showToast.mockReset();
    updateStrainMeta.mockReset();
  });

  it('propagates rejection, then resolves one successful retry', async () => {
    updateStrainMeta
      .mockRejectedValueOnce(new Error('Persistence rejected'))
      .mockResolvedValueOnce(undefined);
    const element = await fixture<StrainLibraryDialog>(html`
      <strain-library-dialog .open=${true}></strain-library-dialog>
    `);
    (element as unknown as { _view: string })._view = 'editor';
    element.requestUpdate();
    await element.updateComplete;
    const editor = element.shadowRoot!.querySelector<StrainEditorView>('strain-editor-view')!;
    const changed = vi.fn();
    element.addEventListener('data-changed', changed);
    const draft = { strain: 'Retry Kush', description: 'Complete draft' };

    await expect(editor.onSave!(draft)).rejects.toThrow('Persistence rejected');
    expect((element as unknown as { _view: string })._view).toBe('editor');
    expect(fetchStrainLibrary).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
    expect(changed).not.toHaveBeenCalled();

    await editor.onSave!(draft);
    expect(updateStrainMeta).toHaveBeenCalledTimes(2);
    expect(fetchStrainLibrary).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledTimes(1);
    expect((element as unknown as { _view: string })._view).toBe('browse');
  });
});
