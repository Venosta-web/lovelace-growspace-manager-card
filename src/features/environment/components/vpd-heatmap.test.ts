import { describe, it, expect, vi, afterEach } from 'vitest';
import type { HomeAssistant } from 'custom-card-helpers';
import { VPDHeatmap } from './vpd-heatmap';
import { ENVIRONMENT_RAMP, resolveRamp } from '../../../styles/environment-ramp';

/**
 * The invariant of ADR 0040: the canvas paints the colours its legend names, and
 * both follow the Home Assistant theme.
 *
 * Agreement and freshness are two assertions. Overriding a custom property on the
 * host schedules no Lit update, so an agreement test has to nudge the element by
 * hand — which says nothing about the production trigger. The freshness test is the
 * one #581 called non-negotiable: a new `hass` object, no manual `requestUpdate`.
 */

/** Top-left of the plot: 15.4 °C at 88.4 % RH is ~0.2 kPa, below the veg band's 0.4. */
const WET_CELL = { x: 8, y: 8 };
/** Bottom-right: 34.8 °C at 30.8 % RH is ~3.8 kPa, above the veg band's 1.4. */
const DRY_CELL = { x: 396, y: 296 };

const MAGENTA = 'rgb(255, 0, 255)';
const CYAN = 'rgb(0, 255, 255)';
const BLUE = 'rgb(0, 0, 255)';

const hosts: HTMLElement[] = [];

function mount(
  infoColor: string,
  overrides: Record<string, string> = {}
): { host: HTMLElement; el: VPDHeatmap } {
  const host = document.createElement('div');
  host.style.setProperty('--info-color', infoColor);
  for (const [prop, value] of Object.entries(overrides)) host.style.setProperty(prop, value);
  document.body.appendChild(host);
  hosts.push(host);

  const el = document.createElement('vpd-heatmap') as VPDHeatmap;
  el.stage = 'vegetative';
  host.appendChild(el);
  return { host, el };
}

/** The painted byte triple, in the `rgb()` form `getComputedStyle` normalises to. */
function pixelAt(el: VPDHeatmap, cell: { x: number; y: number }): string {
  const canvas = el.shadowRoot!.getElementById('vpdCanvas') as HTMLCanvasElement;
  const [r, g, b] = canvas.getContext('2d')!.getImageData(cell.x + 2, cell.y + 2, 1, 1).data;
  return `rgb(${r}, ${g}, ${b})`;
}

/** Whether any painted cell carries this colour — the optimal band has no fixed cell. */
function canvasContains(el: VPDHeatmap, color: string): boolean {
  const canvas = el.shadowRoot!.getElementById('vpdCanvas') as HTMLCanvasElement;
  const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < data.length; i += 4) {
    if (`rgb(${data[i]}, ${data[i + 1]}, ${data[i + 2]})` === color) return true;
  }
  return false;
}

function swatchColor(el: VPDHeatmap, role: string): string {
  const swatch = el.shadowRoot!.querySelector(`.legend-color[data-role="${role}"]`)!;
  return getComputedStyle(swatch).backgroundColor;
}

const makeHass = (themeName: string) =>
  ({ themes: { theme: themeName } }) as unknown as HomeAssistant;

afterEach(() => {
  hosts.splice(0).forEach((host) => host.remove());
  vi.restoreAllMocks();
});

describe('vpd-heatmap ramp resolution', () => {
  it('composes both stylesheets that declare the ramp tokens', () => {
    const cssText = [VPDHeatmap.styles].flat(Infinity).map(String).join('\n');

    // The import list is not the check: a sheet can be imported and not composed.
    expect(cssText).toContain('--gm-status-optimal');
    expect(cssText).toContain('--gm-status-warning');
    expect(cssText).toContain('--gm-info-deep');
    expect(cssText).toContain('--gm-info-color');
  });

  it('resolves every stop to rgb(), including the derived one', async () => {
    const { el } = mount(MAGENTA);
    await el.updateComplete;

    const palette = resolveRamp(el.shadowRoot!.getElementById('rampProbe'));

    // --gm-info-deep is a color-mix, which computes to `color(srgb …)`. THREE r184's
    // setStyle parses only rgb/rgba/hsl/hsla, hex and names, so the shader #640 feeds
    // from this palette needs every stop already in that form.
    for (const stop of ENVIRONMENT_RAMP) {
      expect(palette[stop.role], stop.css).toMatch(/^rgba?\(/);
    }
  });

  it('paints each zone the colour its legend swatch shows, under a themed --info-color', async () => {
    const { el } = mount(MAGENTA);
    await el.updateComplete;

    expect(pixelAt(el, WET_CELL)).toBe(MAGENTA);
    expect(pixelAt(el, WET_CELL)).toBe(swatchColor(el, 'low'));
    expect(pixelAt(el, DRY_CELL)).toBe(swatchColor(el, 'farHigh'));
  });

  it('takes the optimal stop from the status green, not the theme accent', async () => {
    // A blue or purple --primary-color used to make the "Optimal" zone non-green while
    // its neighbours stayed warning orange and error red. ADR 0040 §6, stop 3.
    const { el } = mount(BLUE, { '--primary-color': MAGENTA, '--success-color': CYAN });
    await el.updateComplete;

    expect(swatchColor(el, 'optimal')).toBe(CYAN);
    expect(canvasContains(el, CYAN)).toBe(true);
    expect(canvasContains(el, MAGENTA)).toBe(false);
  });

  it('paints a different colour when the theme names a different --info-color', async () => {
    const magenta = mount(MAGENTA);
    const cyan = mount(CYAN);
    await Promise.all([magenta.el.updateComplete, cyan.el.updateComplete]);

    expect(pixelAt(magenta.el, WET_CELL)).toBe(MAGENTA);
    expect(pixelAt(cyan.el, WET_CELL)).toBe(CYAN);
  });

  it('repaints on a new hass object after a theme change, with no manual requestUpdate', async () => {
    const { host, el } = mount(MAGENTA);
    el.hass = makeHass('magenta-theme');
    await el.updateComplete;
    expect(pixelAt(el, WET_CELL)).toBe(MAGENTA);

    // What Home Assistant does on a theme switch: rewrite the custom properties,
    // then propagate a new hass object.
    host.style.setProperty('--info-color', CYAN);
    el.hass = makeHass('cyan-theme');
    await el.updateComplete;

    expect(pixelAt(el, WET_CELL)).toBe(CYAN);
  });

  it('does not repaint on a hass tick that leaves the palette unchanged', async () => {
    const { el } = mount(MAGENTA);
    el.hass = makeHass('magenta-theme');
    await el.updateComplete;

    const draw = vi.spyOn(el as unknown as { _drawHeatmap: () => void }, '_drawHeatmap');

    el.hass = makeHass('magenta-theme-renamed');
    await el.updateComplete;

    expect(draw).not.toHaveBeenCalled();
  });

  it('resolves the palette once per draw, not once per painted cell', async () => {
    const { el } = mount(MAGENTA);
    await el.updateComplete;

    const resolve = vi.spyOn(
      el as unknown as { _resolvePalette: () => unknown },
      '_resolvePalette'
    );

    el.temperature = 24;
    await el.updateComplete;

    // The loop paints 7,500 cells; one resolve per update is the whole point.
    expect(resolve).toHaveBeenCalledTimes(1);
  });
});
