import { css } from 'lit';

/** The card-wide keyboard focus treatment for native interactive controls. */
export const focusRingStyles = css`
  .focus-ring:focus-visible {
    outline: 2px solid var(--primary-color, #4caf50);
    outline-offset: 2px;
  }
`;
