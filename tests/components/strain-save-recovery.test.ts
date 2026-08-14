import { fixture, html } from '@open-wc/testing-helpers';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../src/dialogs/strain-editor-view';
import type { StrainEditorView } from '../../src/dialogs/strain-editor-view';

describe('Strain save recovery', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports and focuses a whitespace-only required name', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const element = await fixture<StrainEditorView>(html`
      <strain-editor-view .onSave=${onSave}></strain-editor-view>
    `);
    const input = element.shadowRoot!.querySelector<HTMLInputElement>('#strain-name')!;

    input.value = '   ';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="save-strain"]')!.click();
    await element.updateComplete;

    const error = element.shadowRoot!.querySelector<HTMLElement>('#strain-name-error')!;
    expect(onSave).not.toHaveBeenCalled();
    expect(error.textContent).toContain('Strain name is required.');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(error.id);
    expect(element.shadowRoot!.activeElement).toBe(input);
  });

  it('keeps a rejected draft visible and supports a successful retry', async () => {
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error('Backend rejected the strain'))
      .mockResolvedValueOnce(undefined);
    const element = await fixture<StrainEditorView>(html`
      <strain-editor-view .onSave=${onSave}></strain-editor-view>
    `);
    const backListener = vi.fn();
    element.addEventListener('editor-back', backListener);
    const name = element.shadowRoot!.querySelector<HTMLInputElement>('#strain-name')!;
    const description = element.shadowRoot!.querySelector<HTMLTextAreaElement>(
      '[data-field="description"]'
    )!;

    name.value = 'Retry Kush';
    name.dispatchEvent(new InputEvent('input', { bubbles: true }));
    description.value = 'Draft details survive';
    description.dispatchEvent(new InputEvent('input', { bubbles: true }));
    const save = element.shadowRoot!.querySelector<HTMLButtonElement>(
      '[data-action="save-strain"]'
    )!;
    save.click();

    await vi.waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(save.disabled).toBe(false);
    });
    await element.updateComplete;

    const status = element.shadowRoot!.querySelector<HTMLElement>('.sd-footer [role="status"]')!;
    expect(status.textContent).toContain('Backend rejected the strain');
    expect(name.value).toBe('Retry Kush');
    expect(description.value).toBe('Draft details survive');
    expect(backListener).not.toHaveBeenCalled();

    save.click();
    await vi.waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    expect(onSave).toHaveBeenLastCalledWith(
      expect.objectContaining({ strain: 'Retry Kush', description: 'Draft details survive' })
    );
    expect(backListener).toHaveBeenCalledTimes(1);
  });
});
