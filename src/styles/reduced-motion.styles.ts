import { css, type CSSResult } from 'lit';

/**
 * WCAG 2.3.3 — honour the user's reduced-motion preference.
 *
 * Shadow DOM does not inherit a document-level `@media` block, so coverage is a
 * property of what a component's `static styles` **composes**, not what it
 * imports. Most of the card gets this through `dialogStyles`, which composes
 * `uiStyles`; components that build a bare `css` template reach it here instead.
 *
 * Authored once so the two paths cannot drift — `ui.styles.ts` interpolates this
 * same constant. See `tests/unit/reduced-motion-coverage.test.ts`.
 */
export const reducedMotion: CSSResult = css`
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;
