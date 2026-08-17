import { describe, it, expect } from 'vitest';
import { Heatmap3D, LEGEND_GRADIENT } from './heatmap-3d';
import { ENVIRONMENT_RAMP, rampVar } from '../../../styles/environment-ramp';

/**
 * The half of ADR 0040's shader pair that lives in the DOM. Mounting this component
 * builds a WebGL context, which buys no assertion here — the composed stylesheet and
 * the gradient string are both static.
 */

const cssText = () => [Heatmap3D.styles].flat(Infinity).map(String).join('\n');

describe('heatmap-3d ramp scope', () => {
  it('composes every stylesheet that declares a ramp stop', () => {
    const css = cssText();

    // The import list is not the check: statusTokens alone leaves three stops
    // resolving to nothing, and the legend would match the shader on the fallbacks.
    for (const stop of ENVIRONMENT_RAMP) {
      expect(css, stop.css).toContain(`${stop.css}:`);
    }
  });

  it('builds the legend gradient from the descriptor, not literals', () => {
    for (const stop of ENVIRONMENT_RAMP) {
      expect(LEGEND_GRADIENT).toContain(rampVar(stop.role));
    }
    expect(LEGEND_GRADIENT.startsWith('linear-gradient(to right, ')).toBe(true);
  });

  it('orders the gradient stops low to high, matching the shader', () => {
    const positions = ENVIRONMENT_RAMP.map((stop) => LEGEND_GRADIENT.indexOf(rampVar(stop.role)));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(positions.every((p) => p >= 0)).toBe(true);
  });

  it('holds no bare ramp hex in its own stylesheet', () => {
    // The five stops the gradient used to hardcode. Fallbacks inside var() are fine;
    // these are the values that used to sit in `background: linear-gradient(...)`.
    const css = cssText();
    expect(css).not.toContain('linear-gradient(to right, #');
  });
});
