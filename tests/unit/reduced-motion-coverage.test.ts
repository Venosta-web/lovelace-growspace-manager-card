/**
 * Reduced-motion coverage is a *composition* property, not an import property.
 *
 * The `@media (prefers-reduced-motion: reduce)` block is authored once, in
 * `reduced-motion.styles.ts`. Shadow DOM does not inherit a document-level
 * block, so a component honours the preference only if its `static styles`
 * composes something carrying it. Most of the card gets it through
 * `dialogStyles`, which composes `uiStyles` — a distinction that has been
 * misread before by grepping `dialog.styles.ts` and finding no declaration
 * (#611).
 *
 * The per-component cases below assert the composed `cssText` directly, so
 * adding an animation to a component that composes nothing fails here rather
 * than shipping a WCAG 2.3.3 gap.
 */
import { describe, it, expect } from 'vitest';
import { reducedMotion } from '../../src/styles/reduced-motion.styles';
import { dialogStyles } from '../../src/styles/dialog.styles';
import { uiStyles } from '../../src/styles/ui.styles';
import { sharedStyles } from '../../src/styles/shared.styles';

import { GmChatPanel } from '../../src/dialogs/chat-panel';
import { GmBriefingPanel } from '../../src/dialogs/briefing-panel';
import { GmInboxPanel } from '../../src/dialogs/inbox-panel';
import { GsFilterChips } from '../../src/dialogs/gs-filter-chips';
import { GrowspaceCarouselCard } from '../../src/cards/growspace-carousel-card';

const REDUCE = 'prefers-reduced-motion';

const cssTextOf = (styles: unknown): string =>
  (Array.isArray(styles) ? styles : [styles])
    .map((s) => (s as { cssText?: string }).cssText ?? '')
    .join('\n');

describe('reduced-motion coverage', () => {
  describe('the shared sheets', () => {
    it('reduced-motion.styles is the single authored source', () => {
      expect(cssTextOf(reducedMotion)).toContain(REDUCE);
    });

    it('ui.styles carries it by interpolating that constant', () => {
      expect(cssTextOf(uiStyles)).toContain(REDUCE);
    });

    it('dialogStyles carries it by composing ui.styles', () => {
      expect(cssTextOf(dialogStyles)).toContain(REDUCE);
    });

    it('shared.styles alone does not, so composing only that is insufficient', () => {
      expect(cssTextOf(sharedStyles)).not.toContain(REDUCE);
    });
  });

  // Components that build a bare `css` template and animate something, so they
  // reach the block directly rather than through dialogStyles.
  describe.each([
    ['chat-panel', GmChatPanel],
    ['briefing-panel', GmBriefingPanel],
    ['inbox-panel', GmInboxPanel],
    ['gs-filter-chips', GsFilterChips],
    ['growspace-carousel-card', GrowspaceCarouselCard],
  ])('%s', (_name, ctor) => {
    it('composes the reduce block', () => {
      expect(cssTextOf((ctor as unknown as { styles: unknown }).styles)).toContain(REDUCE);
    });
  });
});
