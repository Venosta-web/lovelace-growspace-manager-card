/**
 * Reduced-motion coverage is a *composition* property, not an import property.
 *
 * The `@media (prefers-reduced-motion: reduce)` block is declared once, in
 * `ui.styles.ts`. Shadow DOM does not inherit a document-level block, so a
 * component honours the preference only if its `static styles` composes a sheet
 * that carries it. `dialogStyles` composes `uiStyles`, which is why the dialogs
 * are covered despite `dialog.styles.ts` declaring no block of its own —
 * a distinction that has been misread before (#611).
 */
import { describe, it, expect } from 'vitest';
import { dialogStyles } from '../../src/styles/dialog.styles';
import { uiStyles } from '../../src/styles/ui.styles';
import { sharedStyles } from '../../src/styles/shared.styles';

const REDUCE = 'prefers-reduced-motion';

const cssTextOf = (styles: unknown): string =>
  (Array.isArray(styles) ? styles : [styles])
    .map((s) => (s as { cssText?: string }).cssText ?? '')
    .join('\n');

describe('reduced-motion coverage', () => {
  it('ui.styles declares the reduce block', () => {
    expect(cssTextOf(uiStyles)).toContain(REDUCE);
  });

  it('dialogStyles carries it by composing ui.styles', () => {
    expect(cssTextOf(dialogStyles)).toContain(REDUCE);
  });

  it('shared.styles alone does not carry it, so composing it is not sufficient', () => {
    expect(cssTextOf(sharedStyles)).not.toContain(REDUCE);
  });
});
