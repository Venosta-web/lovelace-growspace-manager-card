/**
 * md3-number-input — the optional help trigger and its layout contract.
 *
 * The crux is the no-help path staying byte-identical. `.md3-label` is shared by
 * every dialog's inputs, so the help layout re-parents the label into a flex row
 * ONLY when help is present; a field without help must render the bare label it
 * always did. That is the promise this file pins down.
 */
import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { Md3NumberInput } from '../../../../../src/features/shared/ui/md3-number-input';
import type { HelpCopy } from '../../../../../src/features/shared/ui/gs-help-tooltip';

if (!customElements.get('md3-number-input')) {
  customElements.define('md3-number-input', Md3NumberInput);
}

const COPY: HelpCopy = { label: 'Shot Interval', content: 'A cooldown, not a schedule.' };

async function mount(help?: HelpCopy): Promise<Md3NumberInput> {
  const el = await fixture<Md3NumberInput>(
    html`<md3-number-input label="P1 Shot Interval (min)" .value=${15} .help=${help}></md3-number-input>`
  );
  await el.updateComplete;
  return el;
}

describe('md3-number-input help trigger', () => {
  it('renders no trigger and no label row when help is absent', async () => {
    const el = await mount();
    const root = el.shadowRoot!;
    expect(root.querySelector('gs-help-tooltip')).toBeNull();
    expect(root.querySelector('.md3-label-row')).toBeNull();
    // The label stays a direct child of the input group — the shared absolute
    // positioning is untouched for every field that has no help.
    const label = root.querySelector('.md3-label')!;
    expect(label.parentElement?.classList.contains('md3-input-group')).toBe(true);
  });

  it('places the trigger beside the label, not at the field edge', async () => {
    const el = await mount(COPY);
    const row = el.shadowRoot!.querySelector('.md3-label-row');
    expect(row).not.toBeNull();
    // Both in one row is what keeps the icon next to the words it explains;
    // a ~700px-wide field put a corner-anchored icon a field-width away.
    expect(row!.querySelector('.md3-label')?.textContent?.trim()).toBe('P1 Shot Interval (min)');
    expect(row!.querySelector('gs-help-tooltip')).not.toBeNull();
  });

  it('passes the copy pair through to the trigger', async () => {
    const el = await mount(COPY);
    const tip = el.shadowRoot!.querySelector('gs-help-tooltip') as unknown as {
      content?: string;
      getAttribute(n: string): string | null;
    };
    expect(tip.content).toBe(COPY.content);
    expect(tip.getAttribute('label')).toBe(COPY.label);
  });

  it('keeps the label bound to the input so clicking it still focuses the field', async () => {
    const el = await mount(COPY);
    const root = el.shadowRoot!;
    const label = root.querySelector('label.md3-label') as HTMLLabelElement;
    const input = root.querySelector('input') as HTMLInputElement;
    expect(label.htmlFor).toBe(input.id);
    expect(label.htmlFor).not.toBe('');
  });
});
