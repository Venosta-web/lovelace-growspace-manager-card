import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import '../../src/features/shared/ui/md3-number-input';
import type { Md3NumberInput } from '../../src/features/shared/ui/md3-number-input';

describe('Md3NumberInput', () => {
  it('associates its visible label and optional accessible name with the native input', async () => {
    const element = await fixture<Md3NumberInput>(html`
      <md3-number-input
        label="Day"
        input-aria-label="Vegetative Fan day VPD in kilopascals"
        unit="kPa"
      ></md3-number-input>
    `);
    const label = element.shadowRoot!.querySelector('label')!;
    const input = element.shadowRoot!.querySelector('input')!;

    expect(label.htmlFor).toBe(input.id);
    expect(input.getAttribute('aria-label')).toBe('Vegetative Fan day VPD in kilopascals');
    expect(element.shadowRoot!.textContent).toContain('kPa');
  });

  it('attaches an inline error to the native input', async () => {
    const element = await fixture<Md3NumberInput>(html`
      <md3-number-input label="High cutoff" error="High must be above low."></md3-number-input>
    `);
    const input = element.shadowRoot!.querySelector('input')!;
    const error = element.shadowRoot!.querySelector('.md3-error')!;

    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(error.id);
    expect(error.textContent).toContain('High must be above low.');
  });
});
