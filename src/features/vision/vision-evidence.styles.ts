import { css } from 'lit';

/**
 * Tone tokens for Vision evidence.
 *
 * `calm | watch | alert` alias the three operational status levels, so the
 * evidence ledger stays on the same ramp as every other surface in the card.
 * Two names sit deliberately **off** that ramp:
 *
 *  - `quiet` — the absence of evidence. It must never be styled as calm: an
 *    unavailable channel is not a reassuring one, and colouring it green would
 *    be the exact "unavailable reads as fine" failure #92 was built to test.
 *  - `equipment` — a Capture Continuity Break. It takes the informational blue
 *    precisely because that hue carries no severity, so a camera that stopped
 *    producing comparable frames cannot be read as a verdict about the plant.
 *
 * Colour is never the only signal: every toned element also renders its
 * `ToneCue` icon and word, following `status.styles.ts`.
 */
export const visionToneTokens = css`
  :host {
    --gm-vision-calm: var(--gm-status-optimal, var(--success-color, #4caf50));
    --gm-vision-watch: var(--gm-status-warning, var(--warning-color, #ffa726));
    --gm-vision-alert: var(--gm-status-danger, var(--error-color, #f44336));
    --gm-vision-quiet: var(--text-disabled, rgba(255, 255, 255, 0.38));
    --gm-vision-equipment: var(--gm-info-color, var(--info-color, #2196f3));
  }

  .tone-calm {
    --tone: var(--gm-vision-calm);
  }
  .tone-watch {
    --tone: var(--gm-vision-watch);
  }
  .tone-alert {
    --tone: var(--gm-vision-alert);
  }
  .tone-quiet {
    --tone: var(--gm-vision-quiet);
  }
  .tone-equipment {
    --tone: var(--gm-vision-equipment);
  }

  /* The non-colour half of every tone. */
  .cue {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: var(--primary-text-color, #fff);
  }

  .cue svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    fill: var(--tone);
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--tone);
    flex-shrink: 0;
  }
`;

/** Type scale and small furniture shared by the panel and the ledger. */
export const visionTextStyles = css`
  .supporting {
    font-size: 0.875rem;
    line-height: 1.45;
    color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
    margin: 0;
  }

  .xs {
    font-size: 0.75rem;
    line-height: 1.45;
    color: var(--text-disabled, rgba(255, 255, 255, 0.55));
    margin: 0;
  }

  .caveat {
    font-style: italic;
  }

  .eyebrow {
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 10px;
    border-radius: 999px;
    border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
    font-size: 0.75rem;
    white-space: nowrap;
  }

  details > summary {
    cursor: pointer;
    font-size: 0.75rem;
    color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
    padding: 4px 0;
    border-radius: 4px;
  }

  details > summary:focus-visible {
    outline: 2px solid var(--gm-primary-color, #4caf50);
    outline-offset: 2px;
  }

  table.measures {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.75rem;
    margin-top: 6px;
  }

  table.measures th {
    text-align: start;
    font-weight: 600;
    color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
  }

  table.measures td,
  table.measures th {
    padding: 3px 0;
    border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
  }

  table.measures td:last-child {
    text-align: end;
    font-variant-numeric: tabular-nums;
    font-family: var(--code-font-family, ui-monospace, monospace);
  }

  ul.reasons {
    margin: 8px 0 0;
    padding-inline-start: 18px;
  }
`;
