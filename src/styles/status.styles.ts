import { css } from 'lit';

/**
 * Semantic tokens for the three operational status levels (`StatusLevel`).
 *
 * Status is never carried by hue alone — every level that tints an element also
 * renders a `STATUS_CUES` icon (and, for warning/danger, a word). These tokens
 * exist so the tint is the *second* signal, not the only one.
 *
 * Readable text is deliberately NOT one of the tokens: status text stays at
 * `--primary-text-color` so it keeps its contrast when a Home Assistant theme
 * flips the surface to light. The status color rides on the icon, the outline,
 * and a low-alpha fill — roles that only need the 3:1 non-text ratio.
 */
export const statusTokens = css`
  :host {
    --gm-status-optimal: var(--success-color, #4caf50);
    --gm-status-optimal-fill: color-mix(in srgb, var(--gm-status-optimal) 10%, transparent);
    --gm-status-optimal-outline: color-mix(in srgb, var(--gm-status-optimal) 45%, transparent);

    --gm-status-warning: var(--warning-color, #ffa726);
    --gm-status-warning-fill: color-mix(in srgb, var(--gm-status-warning) 14%, transparent);
    --gm-status-warning-outline: color-mix(in srgb, var(--gm-status-warning) 60%, transparent);

    --gm-status-danger: var(--error-color, #f44336);
    --gm-status-danger-fill: color-mix(in srgb, var(--gm-status-danger) 14%, transparent);
    --gm-status-danger-outline: color-mix(in srgb, var(--gm-status-danger) 70%, transparent);
  }

  /* The non-color cue itself: an icon, plus a word for warning and danger. */
  .status-cue {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    color: var(--primary-text-color, #fff);
    /* label-caps */
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .status-cue svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    fill: currentColor;
  }

  .status-cue.status-optimal svg {
    fill: var(--gm-status-optimal);
  }

  .status-cue.status-warning svg {
    fill: var(--gm-status-warning);
  }

  .status-cue.status-danger svg {
    fill: var(--gm-status-danger);
  }
`;
