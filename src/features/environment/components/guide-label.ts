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
 * The token-backed chip behind the text is the same treatment the normalised-axis
 * label uses. The muted Home Assistant text role passes AA on the card surface in
 * both default themes, while it does not pass on the light theme's darker chart
 * pane; keeping the chip opaque makes that contrast pair deterministic even when
 * a trace runs beneath the label.
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
    color: var(--text-muted, var(--secondary-text-color, rgba(255, 255, 255, 0.55)));
    padding: 2px 4px;
    border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
    border-radius: var(--border-radius-sm, 8px);
    background: var(--card-background-color, var(--surface, #1e1e1e));
    pointer-events: none;
  }

  .gs-guide-label::before {
    display: inline-block;
    width: 5px;
    height: 5px;
    margin-inline-end: 4px;
    border-radius: 50%;
    background: var(--guide-color);
    content: '';
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
  }
`;
