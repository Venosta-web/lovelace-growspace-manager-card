/*! growspace-e2e-build source=82b09c453df70fe4674c9a25eb4b7ea9186b6c1acb54c162fddcebfd930dd321 id=fa872d13dcd7c4c8fd2417d587429ef4 */
/**
 * The environment ramp: one five-stop scale, authored once as token NAMES.
 *
 * A painted surface — `ctx.fillStyle`, a GLSL `vec3` — takes a resolved colour, so
 * no `var()` reference survives into it. This descriptor is what lets a canvas and
 * the DOM legend that labels it name the same colours: both read it, one through
 * `resolveRamp` and one through `rampVar`.
 *
 * The generated `token` map cannot serve as the paint source. `token['--gm-info-color']`
 * is the string `'var(--info-color, #2196f3)'`; assigned to `fillStyle` that is invalid
 * and the canvas silently keeps its previous colour. So the descriptor carries a
 * terminal hex of its own, used only when a probe read comes back empty.
 *
 * See docs/adr/0040-canvas-and-shader-resolve-tokens-at-draw-time.md.
 */
const ENVIRONMENT_RAMP = [
    { role: 'farLow', css: '--gm-info-deep', fallback: '#145d97' },
    { role: 'low', css: '--gm-info-color', fallback: '#2196f3' },
    { role: 'optimal', css: '--gm-status-optimal', fallback: '#4caf50' },
    { role: 'high', css: '--gm-status-warning', fallback: '#ffa726' },
    { role: 'farHigh', css: '--gm-error-color', fallback: '#f44336' },
];
const STOPS_BY_ROLE = new Map(ENVIRONMENT_RAMP.map((stop) => [stop.role, stop]));
const stopFor = (role) => {
    const stop = STOPS_BY_ROLE.get(role);
    if (!stop)
        throw new Error(`Unknown ramp role: ${role}`);
    return stop;
};
/** The CSS reference a DOM twin binds to — the same token, the same terminal hex. */
const rampVar = (role) => {
    const stop = stopFor(role);
    return `var(${stop.css}, ${stop.fallback})`;
};
/**
 * Reads the ramp out of the DOM through `probe`, which must be attached inside the
 * scope that declares the tokens — its own shadow root, not `document.body`.
 *
 * `getComputedStyle(probe).color` rather than `getPropertyValue`: the latter returns
 * the token stream in whatever syntax the theme author wrote (`orange`, `#f80`), while
 * `color` computes it. Every stop then goes through `normalizeColor`, which is what puts
 * a `getImageData` byte triple and a legend swatch in the same space.
 *
 * Call once per draw. `_drawHeatmap` paints 7,500 cells; a read per cell is not viable.
 */
let normalizer;
/**
 * Forces any computed colour into `rgb(r, g, b)`.
 *
 * ADR 0040 §2 assumed `getComputedStyle(el).color` always serialises that way. It
 * does not: a `color-mix()` value keeps its mixing space — measured in Chromium,
 * `color-mix(in srgb, magenta 62%, black)` computes to `color(srgb 0.62 0 0.62)`
 * and the `in oklab` form to `oklab(…)`. Neither is parsed by `THREE.Color.setStyle`
 * (r184 handles only `rgb`/`rgba`/`hsl`/`hsla`, hex and names), and `fillStyle`
 * read-back returns the value unchanged, so painting is the only conversion there is.
 *
 * Four of the five stops resolve to `rgb()` already; only a derived stop pays for this.
 */
function normalizeColor(value) {
    if (/^rgba?\(/.test(value))
        return value;
    if (normalizer === undefined) {
        normalizer = document.createElement('canvas').getContext('2d');
    }
    if (!normalizer)
        return value;
    normalizer.clearRect(0, 0, 1, 1);
    normalizer.fillStyle = value;
    normalizer.fillRect(0, 0, 1, 1);
    const [r, g, b] = normalizer.getImageData(0, 0, 1, 1).data;
    return `rgb(${r}, ${g}, ${b})`;
}
function resolveRamp(probe) {
    const palette = {};
    for (const stop of ENVIRONMENT_RAMP) {
        if (!probe) {
            palette[stop.role] = normalizeColor(stop.fallback);
            continue;
        }
        probe.style.color = rampVar(stop.role);
        palette[stop.role] = normalizeColor(getComputedStyle(probe).color || stop.fallback);
    }
    return palette;
}
const rampPalettesEqual = (a, b) => a !== undefined && ENVIRONMENT_RAMP.every((stop) => a[stop.role] === b[stop.role]);

export { ENVIRONMENT_RAMP as E, resolveRamp as a, rampVar as b, rampPalettesEqual as r };
//# sourceMappingURL=growspace-environment-ramp-B3vVfp5W.js.map
