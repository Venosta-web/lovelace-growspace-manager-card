import { css } from 'lit';

/**
 * The placement every chart's [[Guide Mark]] labels share.
 *
 * HTML positioned by percentage rather than SVG text, because a chart pane is a
 * fixed viewBox stretched with `preserveAspectRatio="none"` — SVG text in it
 * would be squashed or blown up with the geometry, while these keep one type size
 * at any chart height.
 *
 * A label sits inboard of the value-axis caps at the left edge, clear of the tick
 * column it reads off, and at the height of its own mark: a guide mark is unioned
 * into the value domain (ADR 0048) and so can never reach the frame edge, which is
 * why no chart needs a clamp of its own here. A chart with a second value axis
 * anchors that axis's labels on the right with the `right` modifier; a setpoint's
 * name uses `setpoint` for the same reason, so it cannot collide with the band
 * values on the left.
 *
 * The halo behind the text is the pane's own ground rather than a fixed black, so
 * it separates the label from the traces under it on a light theme as well as a
 * dark one — the same binding the current-value dot halos use.
 */
export const guideLabelStyles = css`
  .gs-guide-label {
    position: absolute;
    left: 44px;
    z-index: 2;
    transform: translateY(-50%);
    font-size: var(--font-size-xs);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
    white-space: nowrap;
    opacity: 0.95;
    text-shadow:
      0 1px 4px var(--secondary-background-color, #0d0d0d),
      0 0 4px var(--secondary-background-color, #0d0d0d);
    pointer-events: none;
  }

  /*
   * A setpoint's name sits on the right so it cannot collide with the band value
   * labels on the left, and lighter than them because it names a mark rather than
   * reporting a reading.
   */
  .gs-guide-label.setpoint {
    left: auto;
    right: 8px;
    font-weight: 500;
    opacity: 0.8;
  }
`;
