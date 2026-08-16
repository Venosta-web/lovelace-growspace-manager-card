---
name: Growspace Manager Card
colors:
  # Surfaces — dark carbon shell
  surface: '#1e1e1e'
  surface-dim: '#141414'
  surface-bright: '#252525'
  surface-container-lowest: '#101010'
  surface-container-low: '#1a1a1a'
  surface-container: '#1e1e1e'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#3a3a3a'
  on-surface: '#ffffff'
  on-surface-variant: 'rgba(255,255,255,0.7)'
  inverse-surface: '#e8e8e8'
  inverse-on-surface: '#1e1e1e'
  outline: 'rgba(255,255,255,0.12)'
  outline-variant: 'rgba(255,255,255,0.05)'
  surface-tint: '#4caf50'
  surface-overlay-subtle: 'rgba(0,0,0,0.1)'
  surface-overlay-recessed: 'rgba(0,0,0,0.15)'
  surface-overlay-strong: 'rgba(0,0,0,0.2)'
  background: '#1e1e1e'
  on-background: '#ffffff'
  surface-variant: 'rgba(255,255,255,0.05)'
  # Primary — Vitality Green
  primary: '#4caf50'
  # Foreground on a saturated primary FILL, not on the dark shell. Fixed white on purpose:
  # the fill does not follow the Home Assistant theme, so a theme-deferring text role
  # would invert on top of it. NOT yet safe for normal text — #ffffff on the documented
  # primary #4caf50 is 2.78:1, below AA, which is why the toast fills still use
  # --text-primary. See ADR 0039 §1 and #636.
  on-primary: '#ffffff'
  primary-container: 'rgba(76,175,80,0.15)'
  on-primary-container: '#4caf50'
  # Foreground on translucent-green containers. `on-primary-container` (#4caf50) over
  # rgba(76,175,80,0.2) on #1e1e1e is 4.26:1 — below AA for normal text; this is 8.36:1.
  # Do not "correct" it back to #4caf50.
  on-primary-container-bright: '#69f0ae'
  inverse-primary: '#45a049'
  # Secondary — Hydro Blue
  # Documented since ADR 0035 and unreachable until now — the light stop of
  # --secondary-gradient, and the half --info-dark pairs with. Bare on purpose, as the
  # danger pair is, because a gradient whose two stops follow different theming runs
  # between two unrelated hues. Sites meaning "informational" still take the
  # theme-following --gm-info-color.
  secondary: '#2196f3'
  on-secondary: '#ffffff'
  secondary-container: 'rgba(33,150,243,0.12)'
  on-secondary-container: '#2196f3'
  # The dark stop of --secondary-gradient, mirroring --error-dark. Exists so a gradient
  # that cannot run 135deg — a liquid column runs `to bottom` — can compose the same two
  # stops without re-authoring them. Pairs with bare --secondary, not with
  # --gm-info-color. See ADR 0042 §3.
  info-dark: '#1976d2'
  # Light cycle — day and dark period — One pair for the whole light cycle, wherever it is
  # reported: timeline icons, logbook entries, the humidity tab's day/night columns and
  # the lights-on/off equipment icon. Three different pairs across five call sites before
  # this existed. Day carries the Tertiary value, so the cycle a report describes and the
  # controller accent that drives it are one colour. See ADR 0042 §2.
  cycle-day: '#ffeb3b'
  # Indigo 300, not the Indigo 500 (#3f51b5) three sites had drifted to: 500 measures
  # 2.43:1 on --surface, below the 3:1 an icon or rule needs. This measures 4.83:1.
  cycle-night: '#7986cb'
  # Tertiary — Amber Light (light cycle indicator)
  tertiary: '#ffeb3b'
  on-tertiary: '#1e1e1e'
  tertiary-container: 'rgba(255,235,59,0.05)'
  on-tertiary-container: '#ffeb3b'
  # Text roles — The documented text hierarchy. Each defers to the Home Assistant theme
  # first and falls back to the canonical dark-theme value — it is that FORM, not the
  # alpha value, that survives a light theme, so these are safe to use bare. The alphas
  # below are the values an ad-hoc fallback should normalise to; a flat grey like #666 is
  # what they replace. Note --text-muted collapses onto --secondary-text-color under a
  # custom HA theme: HA has no muted role, and correctness in both themes beats a third
  # tier that only exists in the default one.
  # --growspace-card-text is an older alias for this same role; consolidate during the
  # #574 migration.
  text-primary: 'var(--primary-text-color, #ffffff)'
  text-secondary: 'rgba(255,255,255,0.7)'
  text-muted: 'rgba(255,255,255,0.55)'
  text-disabled: 'rgba(255,255,255,0.38)'
  # Text roles on a fixed dark ground — The same hierarchy as the text roles above, minus
  # the Home Assistant deferral. For text that sits on a ground the card paints dark
  # REGARDLESS of theme: glass overlays, scrims, the WebGL canvas, a saturated status
  # fill. A theme-deferring role inverts on those grounds — under a light theme
  # --text-primary resolves to #212121, which is near-black on near-black. Use these only
  # where the backdrop is a literal in the same stylesheet; anywhere the surface follows
  # the theme, the text must follow it too. See ADR 0039.
  on-overlay-primary: '#ffffff'
  on-overlay-secondary: 'rgba(255,255,255,0.7)'
  on-overlay-muted: 'rgba(255,255,255,0.55)'
  # Series — categorical chart and KPI accents — Ordinal, not semantic: call sites assign
  # them positionally, not per metric. Use in order. Deliberately not derived from the
  # primaries with color-mix — see ADR 0035.
  series-1: '#4fc3f7'
  series-2: '#81c784'
  series-3: '#ce93d8'
  series-4: '#a5d6a7'
  # Divider
  # The one step UP from --divider-color, for an outline that brightens on hover. Four
  # call sites had drifted to three different values (0.2 twice, 0.35, #666) before this
  # existed. See ADR 0039.
  outline-hover: 'rgba(255,255,255,0.2)'
  # Plant Stage Colors
  stage-veg: '#4caf50'
  stage-flower: '#ff9800'
  # Also IPM activity
  stage-dry: '#9c27b0'
  stage-cure: '#2196f3'
  stage-seedling: '#8bc34a'
  stage-clone: '#26c6da'
  stage-mother: '#e91e63'
  stage-flower-early: '#ff9800'
  stage-flower-mid: '#fb8c00'
  stage-flower-late: '#ef6c00'
  # Crop steering phases — P1/P2/P3 are painted as chart bands, listed as phase chips and
  # worn as the hero's phase badge, all from one family that lived as three literals in
  # slices/irrigation/index.ts. Values unchanged. See ADR 0042 §1.
  # Saturation
  phase-p1: '#4caf50'
  # Maintenance
  phase-p2: '#2196f3'
  # Dryback. Shares a value with --stage-flower and with the --gm-warning-color fallback;
  # it is neither, and the three are free to diverge.
  phase-p3: '#ff9800'
  # Chart markers
  # The current-time cursor on the day charts. Deliberately outside the data palette: the
  # cursor crosses the P1–P3 bands, and the #ff9800 both charts used is exactly the P3
  # band it lands in. Neutral and the brightest thing on the chart, which is what a cursor
  # should be. See ADR 0042 §1.
  marker-now: '#ffffff'
  # Activity Colors — A dialog accent names the thing the dialog acts on. Stage dialogs
  # pass a --stage-* colour; activity dialogs pass one of these or a semantic token (IPM
  # and irrigation steering use --warning-color). See ADR 0038.
  # Shares a value with --stage-dry; training is an activity, not a stage, so the two are
  # free to diverge.
  activity-training: '#9c27b0'
  # Genetics axis — The indica/sativa ratio bar splits one track between two opposed
  # segments, so the pair is read against each other before either is read against the
  # surface. Material equivalents of the violet/yellow the bar had imported from another
  # palette. The violet it replaces measured 2.98:1 against the #333 track, under the 3:1
  # a graphical object needs; this measures 3.43:1. Separation between the two segments is
  # unchanged at 2.2:1. See ADR 0042 §5.
  genetics-indica: '#9575cd'
  genetics-sativa: '#fbc02d'
  # Error/Warning Colors
  # Home Assistant defines this name too — same shadowing as --divider-color, and withheld
  # from the portal for the same reason. See ADR 0036.
  error: '#f44336'
  error-container: 'rgba(244,67,54,0.1)'
  # The dark stop of the danger gradient, and the pressed/hover state of destructive
  # buttons. Two call sites reach for `var(--error-color-dark, …)`, which is not in the HA
  # theme set the card relies on — confirm against a live instance before dropping their
  # fallback.
  error-dark: '#d32f2f'
  # Lighter danger for chip context, distinct from --error-color. #ff5252 folds into this
  # — see ADR 0035.
  danger-chip: '#ef5350'
  # #ffffff on the documented error #f44336 is 3.68:1, below AA for normal text — same
  # open question as --on-primary. See ADR 0039 §1 and #636.
  on-error: '#ffffff'
  on-error-container: '#f44336'
  # Functional state, distinct from the Flowering stage
  warning: '#ffa726'
  on-warning: '#1e1e1e'
  # Mid-flower crop phase and Bulk EC trace
  mid-flower: '#ff7043'
  # Operational status — The three StatusLevel levels, as consumed by
  # src/styles/status.styles.ts. Each level is hue + fill + outline; status text itself is
  # never tinted, so it survives a light Home Assistant theme.
  status-optimal: '#4caf50'
  status-optimal-fill: 'color-mix(in srgb, #4caf50 10%, transparent)'
  status-optimal-outline: 'color-mix(in srgb, #4caf50 45%, transparent)'
  status-warning: '#ffa726'
  status-warning-fill: 'color-mix(in srgb, #ffa726 14%, transparent)'
  status-warning-outline: 'color-mix(in srgb, #ffa726 60%, transparent)'
  status-danger: '#f44336'
  status-danger-fill: 'color-mix(in srgb, #f44336 14%, transparent)'
  status-danger-outline: 'color-mix(in srgb, #f44336 70%, transparent)'
  # Integration conflict — AC Infinity integration conflicts, pre-fill failures, and
  # duplicate ports
  integration-conflict: '#e6a700'
  integration-conflict-container: 'rgba(230,167,0,0.1)'
  integration-conflict-outline: 'rgba(230,167,0,0.35)'
  # 3D View Accent — The accent of the 3D growspace view, shared by its DOM chrome and the
  # three.js scene it controls. The scene consumes the 0x form (THREE.Color takes a
  # resolved number, not a custom property), so both halves read the same authored value
  # rather than repeating a literal — the canvas/DOM pairing ADR 0035 and #581 are about.
  # See ADR 0039.
  accent-3d: '#448aff'
  # Hover step for controls in the 3D view
  accent-3d-hover: '#64b5f6'
  # Inactive control chrome in the 3D view — blue-grey, deliberately desaturated against
  # the accent
  accent-3d-idle: '#607d8b'
typography:
  # Typography steps (documented only — composed at call sites)
  display-lg:
    fontFamily: Roboto
    fontSize: 28px
    fontWeight: '400'
    lineHeight: '1.1'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Roboto
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.2'
    letterSpacing: '0'
  title-lg:
    fontFamily: Roboto
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.3'
    letterSpacing: '0'
  body-base:
    fontFamily: Roboto
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  body-sm:
    fontFamily: Roboto
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
    letterSpacing: '0'
  # Named display exception for the primary identity on a plant tile
  plant-strain-name:
    fontFamily: Roboto
    fontSize: 17.6px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: '0'
  supporting-sm:
    fontFamily: Roboto
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
    letterSpacing: '0'
  label-caps:
    fontFamily: Roboto
    fontSize: 11px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.5px
  caption:
    fontFamily: Roboto
    fontSize: 11px
    fontWeight: '400'
    lineHeight: '1.4'
    letterSpacing: '0'
  stat-tabular:
    fontFamily: Roboto
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: '0'
rounded:
  # Border Radius (MD3 shape system)
  xs: 0.25rem
  sm: 0.5rem
  DEFAULT: 0.75rem
  md: 0.75rem
  lg: 1rem
  xl: 1.75rem
  # Pills and fully-round badges. Implemented by #564 after call sites had drifted to
  # ad-hoc 20px/999px values.
  full: 9999px
  # Named exception: filled fields retain a nearly flat lower edge
  filled-field-bottom: 0.125rem
elevation:
  # MD3 Elevation Levels
  level-0: none
  level-1: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15)'
  level-2: '0 1px 2px rgba(0,0,0,0.3), 0 2px 6px 2px rgba(0,0,0,0.15)'
  level-3: '0 4px 8px 3px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.3)'
  level-4: '0 6px 10px 4px rgba(0,0,0,0.15), 0 2px 3px rgba(0,0,0,0.3)'
  level-5: '0 8px 12px 6px rgba(0,0,0,0.15), 0 4px 4px rgba(0,0,0,0.3)'
  # Named exception: broad, soft modal separation for glass dialogs
  glass-dialog: '0 8px 32px rgba(0,0,0,0.37)'
spacing:
  # Spacing (MD3 spacing system)
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 12px
  margin-desktop: 24px
motion:
  # MD3 Motion Tokens
  easing-standard: 'cubic-bezier(0.2, 0, 0, 1)'
  # Equal to easing-standard by design — MD3's emphasized spline has no single-bezier form
  easing-emphasized: 'cubic-bezier(0.2, 0, 0, 1)'
  duration-short1: 50ms
  duration-short2: 100ms
  duration-short3: 150ms
  duration-short4: 200ms
  duration-medium1: 250ms
  duration-medium2: 300ms
  duration-long1: 400ms
  duration-long2: 500ms
---

# Design System: Growspace Manager Card

**Project ID:** lovelace-growspace-manager-card

The structured token tables in the frontmatter are canonical. The prose below explains
their roles but does not introduce alternative token values. Color tokens are canonical
fallbacks inside Home Assistant theme variables: themes may override them without changing
the semantic role.

## 1. Visual Theme & Atmosphere

The Growspace Manager Card is a **Dark Operations Dashboard** — a professional monitoring station built for cannabis cultivators who need at-a-glance situational awareness across an entire grow operation. The visual philosophy is dense-but-calm: a near-black carbon shell (#1e1e1e) absorbs ambient light in the grow room environment while high-saturation stage-color accents cut through immediately. Every element exists to surface data, not to decorate.

The depth model is a layered **Glassmorphism 2.0** — not the heavy frosted-glass of the mid-2020s trend, but a restrained system of semi-transparent surfaces, 12–24px backdrop blurs, and whisper-thin hairline borders at `rgba(255,255,255,0.08–0.12)`. Cards feel solid and opaque; dialogs float as glass sheets above them; plant tiles are cinematic full-bleed photo panels with gradient overlays. The overall atmosphere is a high-tech greenhouse control room: purposeful, precise, alive with color only where life-stage data demands it.

## 2. Color Palette & Roles

### Primary Foundation

- **Deep Carbon Background** `#1e1e1e` — Root card surface and default element background. Gives maximum contrast headroom for text and stage colors.
- **Charcoal Panel** `#2a2a2a` — Secondary input backgrounds (`--strain-input-bg`), inner nested surfaces.
- **Slate Input Border** `#3a3a3a` — Subtle border for form elements to separate from charcoal panels.
- **Void Surface** `rgba(20,20,24,0.6)` — Glassmorphic floating containers (`.glass-surface`); the base film beneath backdrop-blur.
- **Glass Overlay** `rgba(255,255,255,0.05)` — Empty plant card slots, chip hover states, action card backgrounds.

### Accent & Interactive

- **Vitality Green** `#4caf50` (gradient: `linear-gradient(135deg, #4caf50, #45a049)`) — Primary brand accent. Used for primary CTA buttons, active tonal chips, the `--primary-color` alias, and the Vegetative growth stage. The life-force color of the system.
- **Hydro Blue** `#2196f3` (gradient: `linear-gradient(135deg, #2196f3, #1976d2)`) — Water, irrigation, and secondary interactive surfaces. Default plant tile border color. Cure stage indicator.
- **Alert Red** `#f44336` (gradient: `linear-gradient(135deg, #f44336, #d32f2f)`) — Destructive actions, error states, pulsing alert dots on sick plants.
- **Amber Light** `#ffeb3b` — Light cycle controller, `--primary-light-color`. SVG chart lines for sensor data. Creates visual warmth in an otherwise cool palette.
- **Warning Amber** `#ffa726` — Functional warnings such as unknown notification triggers, PHI countdown warnings, training icons, and stat-chip warning states. It is deliberately distinct from Flowering Orange.
- **Mid Flower** `#ff7043` — Mid-flower crop-phase guidance and the Bulk EC trace. It is distinct from both general Warning Amber and the broader Flowering Orange stage color.
- **Integration Conflict Amber** `#e6a700` — A passive AC Infinity notice for an automated-mode conflict, a failed port pre-fill, or a duplicate port assignment. Its container is `rgba(230,167,0,0.1)` and outline is `rgba(230,167,0,0.35)`; this integration-specific state must not be represented as a plant stage or a general urgency warning.

### Plant Stage Indicators

These colors are rendered as 3px accent bars at the top of plant tiles and as text overlays on card info sections:

- **Vegetative Green** `#4caf50` (same as primary — stages reinforce the brand).
- **Flowering Orange** `#ff9800`
- **Drying Purple** `#9c27b0` — Also used for IPM (Integrated Pest Management) activity icons.
- **Curing Blue** `#2196f3` (same as secondary — curing reinforces water/processing).
- **Seedling Lime** `#8bc34a`
- **Clone Cyan** `#26c6da` — clone is its own identity, not a shade of seedling. See ADR 0038; several call sites still render the pre-#551 lime.
- **Mother Plant Pink** `#e91e63`

A dialog accent names the thing the dialog acts on: a stage dialog passes its
stage colour, an activity dialog passes an activity or semantic colour
(`--warning-color` for IPM; ADR 0038 introduces `--activity-training` for
training, landing with that migration). Reaching for a stage colour to accent a
non-stage activity is what ADR 0038 exists to stop.

### Typography & Text Hierarchy

- **Primary Text** `var(--primary-text-color, #ffffff)` — Headlines, values, prominent content. Pure white in dark mode.
- **Secondary Text** `rgba(255,255,255,0.7)` — Supporting labels, subtitles, pheno names.
- **Muted Text** `rgba(255,255,255,0.55)` — Meta-row stats, header secondary context.
- **Disabled Text** `rgba(255,255,255,0.38)` — Input placeholders, disabled controls.

Each role is implemented as `--text-primary` / `--text-secondary` / `--text-muted` / `--text-disabled`, and each is itself `var(--ha-text-variable, <value above>)`. It is that **form** that survives a light Home Assistant theme, not the alpha value — `rgba(255,255,255,0.7)` is unreadable on a light background, so a call site must never hardcode one. Because the deferral is baked into the token, these are safe to use bare: `color: var(--text-secondary)`. The values above are what an ad-hoc fallback should normalise to, replacing opaque greys like `#666`.

`--text-muted` resolves to the same HA variable as `--text-secondary`, so the two collapse under a custom theme — Home Assistant has no muted role to map onto. Correctness in both themes is worth more than a third tier that only exists in the default one.

### Functional States

- **Success** `#4caf50` — Toast notification success, health indicators.
- **Warning** `#ffa726` — Alert stat chips, PHI/IPM icons on plant tiles. Warning variant of amber.
- **Danger** `#ef5350` (`--danger-chip`) — Pulsing stat-chip danger state (distinct from alert red — slightly lighter for chip context). `#ff5252` is not a separate red; it folds into this one.
- **Error Dark** `#d32f2f` (`--error-dark`) — The dark stop of the danger gradient, and the pressed/hover state of destructive buttons.
- **Info** `#2196f3` — Watering icons, informational context.
- **Info Dark** `#1976d2` (`--info-dark`) — The dark stop of the secondary gradient, mirroring Error Dark. Exists so a gradient bound to another direction can compose the same two stops; see Gradients below.
- **Error Surface** `rgba(244,67,54,0.1)` / border `rgba(244,67,54,0.3)` — Error message containers.
- **Divider** `rgba(255,255,255,0.12)` — Section dividers, dialog header/footer borders.

### Light Cycle

- **Day** `#ffeb3b` (`--cycle-day`) — Carries the Tertiary "Amber Light" value, so the grow-light controller accent and every report describing the cycle it drives are one colour.
- **Night** `#7986cb` (`--cycle-night`) — Indigo 300. Indigo 500 (`#3f51b5`) measures 2.43:1 on `--surface`, under the 3:1 an icon or 1px rule needs; this measures 4.83:1.

One pair everywhere the light cycle is reported — timeline icons, logbook entries, the humidity tab's day/night columns, the lights-on/off equipment icon. Three different pairs across five call sites before ADR 0042 §2. `--primary-light-color` keeps this value for the controller accent; `--primary-light-color-hover` and `-active` are unrelated white tints, despite the name.

### Crop Steering Phases

- **P1 Saturation** `#4caf50` (`--phase-p1`), **P2 Maintenance** `#2196f3` (`--phase-p2`), **P3 Dryback** `#ff9800` (`--phase-p3`) — chart bands, phase chips, and the hero's dryback badge, from one family. P3 shares a value with Flowering Orange and is not it.

### Gradients

`--primary-gradient`, `--secondary-gradient` and `--danger-gradient` run `135deg`, and **the direction is part of the token** — it is the card's fill direction for buttons and surfaces. A gradient bound to another direction (a liquid column runs `to bottom`) composes the same stops from the colour tokens instead of re-authoring them: `linear-gradient(to bottom, var(--secondary), var(--info-dark))`. **Both stops must theme alike** — pairing the theme-following `--gm-info-color` with a literal `--info-dark` runs the gradient between two unrelated hues under a theme that sets `--info-color`. `--secondary` and `--info-dark`, like `--error-color` and `--error-dark`, move together. Re-declaring the stops as literals is what ADR 0042 §3 stops. `--primary-gradient` is the filled-button treatment; a filled button must not carry its own gradient.

### Data Series

- **Series ramp** `--series-1` … `--series-4` (`#4fc3f7`, `#81c784`, `#ce93d8`, `#a5d6a7`) — Chart series and KPI tile accents. **Categorical, used in order** — the slots carry no per-metric meaning, because call sites assign them positionally. A fifth series needs a fifth slot added here, not an ad-hoc literal. Empty/no-data states use Disabled Text, not a series colour.
- **Now marker** `#ffffff` (`--marker-now`) — The current-time cursor on the day charts. Deliberately outside the data palette: the cursor crosses every phase band, so any data hue reads as a band where it overlaps one. Neutral, and the brightest thing on a dark chart.
- **Genetics axis** `#9575cd` (`--genetics-indica`) / `#fbc02d` (`--genetics-sativa`) — The two segments of the indica/sativa ratio bar, read against each other. Deep Purple 300 and Yellow 700; the violet they replace measured 2.98:1 on the bar's track, under the 3:1 a graphical object needs.

### Contrast Exceptions

- **Bright on-primary-container** `#69f0ae` (`--on-primary-container-bright`) — Foreground text on translucent-green containers (`rgba(76,175,80,0.06–0.2)`), such as completed wizard steps and selected list rows. The documented `on-primary-container` (`#4caf50`) composited over `rgba(76,175,80,0.2)` on `#1e1e1e` measures **4.26:1**, below AA for normal text; this measures **8.36:1**. Do not "normalise" it back to `#4caf50`.

### Where Tokens Reach

Two `:host` blocks are generated from `src/styles/tokens.ts`. The card adopts all of it; `growspace-dialog-host` is portalled to `document.body`, so it inherits nothing from the card and adopts its own copy — without which a bare token reference under `src/dialogs/` resolves to nothing.

- **Reference tokens bare** anywhere, dialogs included.
- **Two exceptions**, `--divider-color` and `--error-color`: Home Assistant defines these names too, so the portal deliberately leaves them to the user's theme. A dialog that wants them writes `var(--divider-color, rgba(255,255,255,0.12))`.
- **Adding a token** means editing `tokens.ts` and running `npm run tokens:generate`; both blocks and the palette above regenerate together. See ADR 0036.

### Where Tokens Cannot Reach

`ctx.fillStyle` and a GLSL `vec3` take a resolved colour, so no `var()` reference survives into a canvas or a shader. The generated `token` map covers this for bare-valued tokens (ADR 0039 §2) but not for the `var(--ha-token, #hex)` ones — `token['--gm-info-color']` is the string `'var(--info-color, #2196f3)'`, which is an invalid `fillStyle`.

The standing rule, from ADR 0040:

- **A painted surface and the DOM legend describing it must resolve to the same colour.** This is the invariant; everything below is how it is kept.
- **Painted surfaces resolve at draw time**, through a hidden probe element read as `getComputedStyle(probe).color` — never `getPropertyValue`, whose output is whatever syntax the theme author wrote. Resolve once per draw, outside the pixel loop.
- **Repaint when the resolved palette changes**, not when `hass` changes. Re-resolve on every update, compare against the cached strings, repaint only on a difference.
- **Ramps are authored once** as role descriptors holding token _names_ plus a terminal fallback hex, read by the canvas, the legend, and the shader's uniform feed alike.
- **Shaders take colour as a uniform**, converted with `new THREE.Color().setStyle()` — three.js renders linear, and a hand-normalised `vec3` comes out wrong. `setStyle` parses hex, named colours, `rgb`/`rgba` and `hsl`/`hsla` only, so any token a painted surface reads must resolve to one of those — derive with `color-mix(in srgb, …)`, never `in oklab`, whose computed value serialises as `oklab()`.
- **Check that the token is in the component's scope**, against the composed `cssText` rather than the import list. The status tokens live in `status.styles.ts`, so a component that does not compose it sees `--gm-status-warning` as undefined — and both halves of a pair then fall back together, which looks like agreement.

**Accepted exceptions** are permanent literals excluded from the migration's zero. They come in two kinds, and ADR 0042 §6 separates them because the earlier wording ran them together:

- **Allowlisted** in `ACCEPTED_EXCEPTIONS` in `scripts/audit-design-tokens.mjs`, keyed by file plus the hexes carrying the accepted role, each with a reason — run `node scripts/audit-design-tokens.mjs --exceptions` to list them. Today: the printed ink and rules in `label-preview.ts`, the `<video>` letterbox in `camera-capture.ts`, and the tank illustration's shell material in `growspace-tank-card.ts`. A listed file is still audited for every other value, so a role-carrying literal added beside one still counts.
- **Out of the matcher's reach**, and so never in the count to begin with: three.js scene furniture (grid, floor, housings, soil and pot) and `vpd-heatmap`'s current-point marker, which are `0x` numbers and CSS colour keywords rather than `#` hex.

**Deferred, not exempt**: `plant-renderer.ts`'s three role-carrying literals (`0x4caf50`, `0x2e7d32`, `0x81c784`), and `plant-utils.ts:59` — its canvas is an image resizer that paints no colour, so the file's one literal is a stage-map fallback grey and belongs to #634, not to the exception list it was previously named in.

## 3. Typography Rules

### Family & Character

The entire system uses **Roboto** (declared as `font-family: 'Roboto', sans-serif`), deferring to Home Assistant's Material Design 3 system font stack. Roboto's geometric neutrality prevents the dashboard from feeling "branded" at the expense of readability — it renders clean at 11px and remains authoritative at 28px. No display or serif typefaces.

Numeric data — sensor readings, plant age, timestamps — uses `font-variant-numeric: tabular-nums` to prevent layout jitter as values update in real time.

### Hierarchy & Weights

| Role                        | Size             | Weight  | Usage                                                      |
| :-------------------------- | :--------------- | :------ | :--------------------------------------------------------- |
| `--font-size-xl` Display    | 1.75rem / 28px   | 400     | Growspace name in card header (`gs-title`, `select-sizer`) |
| `--font-size-xl` Headline   | 1.5rem / 24px    | 400/600 | Dialog titles, light cycle card titles                     |
| `--font-size-lg` Title      | 1.25rem / 20px   | 500     | Dialog header titles (`.dialog-title`)                     |
| `--font-size-md` Body       | 1rem / 16px      | 400     | Standard content, form inputs, plant stage labels          |
| Plant Strain Name           | 1.1rem / 17.6px  | 700     | Full-bleed tile primary identity (text-shadow enhanced)    |
| `--font-size-sm` Body Small | 0.875rem / 14px  | 400/500 | Secondary labels, button text, dialog subtitles            |
| Compact Supporting          | 0.75rem / 12px   | 400/500 | Dense hints, field support, compact status text            |
| Header Meta                 | 0.75rem / 12px   | 400/500 | Stat counts in header meta row (tabular nums)              |
| `--font-size-xs` Caption    | 0.6875rem / 11px | 400/500 | Age pills on plant tiles, chart markers                    |
| Label Caps                  | 0.6875rem / 11px | 600     | Mobile stage context, uppercase tracking labels            |

### Config Dialog Token Contract

#### Font-size basis decision

The Config Dialog preserves Home Assistant's inherited font-size instead of pinning its host
to 16px. Measurements show a 14px root on this surface. Preserving inheritance keeps the
dialog aligned with the host and with user-selected typography; pinning would make this one
surface opt out of that contract.

The canonical typography table records intended rendered pixel sizes. Config Dialog rem
values are therefore calibrated against its measured 14px root rather than the conventional
16px root used by the rem equivalents in the general hierarchy table. If Home Assistant's
root changes, this calibration must be revisited; the rendered pixel targets and the 11px
legibility floor do not change.

The Config Dialog uses only four body-scale steps. Nearby literals map to the nearest role
rather than extending the ramp:

| Existing literal                | Config Dialog step | Rendered target | Role                             |
| :------------------------------ | :----------------- | :-------------- | :------------------------------- |
| `0.65rem`, `0.7rem`             | `0.785714rem`      | 11px            | Caption or uppercase micro-label |
| `0.75rem`, `0.775rem`, `0.8rem` | `0.857143rem`      | 12px            | Compact supporting text          |
| `0.85rem`, `0.875rem`, `0.9rem` | `1rem`             | 14px            | Navigation or body-small         |
| `1rem`                          | `1.142857rem`      | 16px            | Standard body or compact heading |

At the measured 14px root, these values compute to 11px, 12px, 14px, and 16px
respectively; no committed Config Dialog step renders below 11px. Weight, case, spacing,
and color distinguish roles within a step. A fractional size between these steps is not a
new token.

The Config Dialog also applies these literal-to-token rules:

| Finding                                                                      | Resolution                                                                                                            |
| :--------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------- |
| `#e6a700`, `rgba(230,167,0,0.1)`, `rgba(230,167,0,0.35)`                     | Integration Conflict Amber, container, and outline                                                                    |
| `#ff5252`                                                                    | Alert Red `#f44336`                                                                                                   |
| `#ffa726`                                                                    | Warning Amber; never Flowering Orange `#ff9800`                                                                       |
| `#1e2127`                                                                    | Deep Carbon Surface `#1e1e1e`; native options do not introduce another surface                                        |
| `rgba(0,0,0,0.1)`, `rgba(0,0,0,0.15)`, `rgba(0,0,0,0.2)` used as backgrounds | Subtle, recessed, and strong surface overlays                                                                         |
| A `box-shadow` containing those alpha values                                 | The nearest complete MD3 elevation token; shadow geometry and color travel together                                   |
| `6px`, `10px` radii                                                          | `rounded.sm` (`8px`) and `rounded.DEFAULT` (`12px`)                                                                   |
| `2px` lower corners on filled fields                                         | Explicit exception: the nearly flat bottom edge distinguishes the filled-field shape; it is not a general radius step |

These mappings are exhaustive for the 47 advisory findings reported for `config-dialog.ts` and `src/features/config/`. A surviving literal after token application must carry an inline exception explaining why its role cannot use this contract.

The scan originally described the 10–20% black values as shadows. In the current Config
Dialog they are surface backgrounds, so they map to overlay tokens. Actual shadows use a
complete elevation token: MD3 levels 0–5 for ordinary components, or the named Glass Dialog
Elevation exception for the modal's broader `0 8px 32px rgba(0,0,0,0.37)` shadow.

### Spacing Principles

- Letter-spacing on display headings: `-0.01em` (tight, editorial).
- Letter-spacing on uppercase caps labels: `0.06em` (open, legible at small size).
- Letter-spacing on button text: `0.1px` (near-zero — MD3 convention).
- Letter-spacing on supporting text / labels: `0.4–0.5px` (slight optical expansion for de-emphasized hierarchy).
- Line-height on dense header elements: `1.1` (display); body: `1.4–1.5` (readable).

### Motion

Motion is on the **MD3 scale**, generated into the `motion:` frontmatter above from `tokens.ts` like every other token group. Durations run `short1`–`short4` (50/100/150/200ms), `medium1`–`medium2` (250/300ms), `long1`–`long2` (400/500ms). Reach for a step, not a literal — a bare `0.3s` in a transition is drift, the same way a bare `13px` font-size is.

The two easings, `--md3-motion-easing-standard` and `--md3-motion-easing-emphasized`, hold the **same value** — `cubic-bezier(0.2, 0, 0, 1)`. That is deliberate, not a copy-paste: MD3's emphasized curve is a two-part spline that a single CSS `cubic-bezier()` cannot express, so Material Web collapses it to the standard curve. Do not "fix" it.

Three composites exist for whole-element transitions — `--transition` (short4), `--transition-fast` (short2), `--transition-medium` (medium2), each already carrying the standard easing.

**Fill bars.** Any proportional readout — progress bars, tank levels, inventory fills — is a fixed **track** with a scaled **fill**. The track owns the geometry (height, `overflow: hidden`, radius); the fill is `transform: scaleX(<fraction>)` from `transform-origin: left` at `--md3-motion-duration-medium2`, and carries **no radius of its own** — the track already clips to shape, and `scaleX` distorts a corner radius horizontally. Never animate the fill's `width`: it forces layout on every frame, and on a readout that re-renders per sensor tick it restarts the transition each time.

Two sites deviate deliberately and say why at the call site: the tank card's liquid, whose meniscus and wave children are pinned to the animated edge and would flatten under `scaleY`; and the strain hue-genetics bar, where two flex segments split one track so there is no fixed track to scale against. See ADR 0037.

## 4. Component Stylings

### Buttons (MD3 `.md3-button` system)

All buttons are 40px tall, fully rounded (`border-radius: 20px`), Roboto Medium 14px. The state-layer interaction model uses a `::before` pseudo-element at `currentColor` that transitions opacity on hover (8%), focus-visible (12%), and active (12%) — no background-color swap, just translucent wash. This produces the MD3 "ripple through opacity" feel without JavaScript.

- **Primary Filled** — `background: var(--primary-color, #4caf50)`, white text. MD3 Level 1 shadow that lifts to Level 2 on hover.
- **Tonal** — `background: rgba(76,175,80,0.12)`, green text. Hover lifts to 16% opacity + Level 1 shadow.
- **Text** — Transparent background, green text, 12px horizontal padding (less than filled). Used for Cancel/Close.
- **Danger (Outlined)** — Transparent background with red `border: 1px solid currentColor`. Red text. Error-tinted state layers.
- **Disabled** — `opacity: 0.38`, `cursor: not-allowed`, shadow removed.
- **FAB (Floating Action)** — 56×56px circle, `background: var(--plant-border-color-default, #2196f3)`. Scales 1.05× on hover, 0.95× on active.

### Plant Tile Cards (`.plant-card-rich`)

The hero component. Square aspect-ratio tiles arranged in a CSS grid. Each tile is a full-bleed photograph with a three-layer depth stack:

1. **Background layer** (z-index 0): `background-size: cover` image.
2. **Gradient overlay** (z-index 1): `linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 100%)` — cinematic scrim that makes bottom text always legible regardless of photo content.
3. **Content layer** (z-index 2): plant name (1.1rem bold, text-shadow), pheno (0.9rem 500), stage text in `var(--stage-color)`.

The tile's `::before` pseudo-element renders a **3px stage-color accent bar** across the full top edge (rounded top corners matching the card). This is the fastest visual signal for stage — visible at any zoom level.

On hover: `translateY(-4px)` lift + shadow from `0 4px 6px` to `0 8px 16px`. Transition: `--md3-motion-duration-medium2` (300ms) at `--md3-motion-easing-standard`, `cubic-bezier(0.2, 0, 0, 1)`. Status icons (training, watering, IPM, PHI badges) fade in on hover at `opacity: 1`.

**Age pill** (top-left): frosted glass pill (`rgba(0,0,0,0.55)`, `backdrop-filter: blur(6px)`), hairline border, pill-radius 999px, 0.6875rem tabular-nums.

**Alert dot**: 8px pulsing red circle with `@keyframes pulse-alert` radiating ring (0→6px at 70% keyframe). Draws the eye to plants with active problems without requiring the user to enter the tile.

**Mobile** (≤600px): tiles reflow to horizontal list rows — 64×64px thumbnail (left), name/pheno/stage stack (flex), stats (right). The overlay and full-bleed effect are removed entirely.

### Glass Containers & Dialog Surfaces

Two surface variants based on context:

- **`.glass-surface`**: `background: rgba(20,20,24,0.6)` + `linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))` + `backdrop-filter: blur(24px)` + `border: 1px solid rgba(255,255,255,0.08)` + inset `rgba(255,255,255,0.02)` glow. Used for primary card panels.
- **`.glass-dialog-container`**: `background: rgba(20,20,20,0.85)` + `backdrop-filter: blur(16px)` + `box-shadow: 0 8px 32px rgba(0,0,0,0.37)` + same hairline border. Higher opacity for modal layering.

Dialog anatomy:

- **Header**: 16/24px padding, `border-bottom: 1px solid rgba(255,255,255,0.1)`, `background: rgba(0,0,0,0.2)`. Contains 40×40px icon box (12px border-radius, stage-colored icon) + title group (Title Large 20px/500 + subtitle 0.85rem at 70% opacity).
- **Content**: `padding: 24px`, scrollable `overflow-y: auto`.
- **Footer button group**: mirrored header treatment, `border-top`, right-aligned flex row with 12px gap.

### Navigation / Header

The card header uses a two-column asymmetric grid: `minmax(280px, 25%) | minmax(0, 1fr)`. Left column: growspace name selector (gradient text clip: white-to-80%-white, 1.75rem/400) with an invisible `<select>` overlay for interaction. Right column: scrollable secondary strip of stat chips.

Stat chips pulse to warning amber or danger red when thresholds are breached, with `@keyframes pulse-red` box-shadow animation on danger chips.

Mobile (≤600px): Header collapses to flex row — title area takes remaining space, secondary strip and stage area are hidden. A `mobile-stage-context` label (0.6875rem uppercase, 0.06em tracking) appears above the title to provide stage context that the strip would have shown.

### Inputs & Forms (MD3 `.md3-input-group`)

Bottom-border-only filled style (8px top corners and the named 2px Filled Field Bottom exception). The bottom border is `1px solid rgba(255,255,255,0.4)` at rest, `2px solid rgba(255,255,255,0.6)` on focus (border weight increase instead of color swap signals focus state). Floating label (0.75rem, 0.4px tracking) is always visible above the field — no placeholder-as-label pattern.

Error state: `border-bottom-color: #f44336` + label turns red. Supporting text below the input carries the error message (0.75rem red).

### Domain-Specific: Light Cycle Card (`.gs-light-cycle-card`)

Nested card within the main card surface. `background: rgba(0,0,0,0.2)`, `border: 1px solid rgba(255,255,255,0.05)`, `border-radius: 16px`. Contains a prominent status text (`1.5rem / 700`) with a pulsing glow dot (`box-shadow: 0 0 8px currentColor`). Time-range selector chips at top-right use `0.75rem / 500`, `border-radius: 8px`, active state in primary tonal green.

### Domain-Specific: Environment Chart (`.gs-chart-container`)

150px tall SVG chart with amber (`#ffeb3b`) stroke line, `drop-shadow(0 0 4px rgba(255,235,59,0.2))` glow filter, and gradient fill at 20% opacity. A tooltip on hover renders as a frosted glass card: `background: rgba(30,30,35,0.9)`, `backdrop-filter: blur(12px)`, 8px border-radius.

## 5. Layout Principles

### Grid & Structure

The plant grid is a CSS Grid with `--spacing-md` (16px) gaps, columns defined by the card editor config (1–5 cols). On desktop wide layouts, a `force-list-view` class switches to single-column flex list. Plant tiles are square (`aspect-ratio: 1`) and `contain: layout paint style` for rendering isolation.

The main card uses 24px (`--spacing-lg`) internal padding on desktop. The `.unified-growspace-card` flex container arranges: header → grid → footer with 24px vertical gaps.

Dialog max-width: `90vw`; min-width: `400px`. At ≤450px, dialogs go full-screen (`100vw × 100vh`, border-radius 0).

### Whitespace Strategy

4px base unit with a strict 4-step scale: 4 / 8 / 16 / 24 / 32px. Card internal padding is consistently `--spacing-lg` (24px). Between detail-cards inside dialogs: `--spacing-md` (16px). Within chips and compact elements: `--spacing-sm` (8px) and `--spacing-xs` (4px).

Dense areas (plant tile info overlays, age pills, chart markers) compress to 2–4px gaps — information density is intentional, not accidental.

### Alignment & Visual Balance

- Header: left-aligned title, right-aligned chip strip — deliberate horizontal tension.
- Dialog buttons: `justify-content: flex-end` (mobile: `center`, full-width flex).
- Plant tile text: centered horizontally (`.pc-info` is `align-items: center`), gravity-pulled to bottom.
- Detail-card section headers: uppercase, 0.875rem, `--secondary-text-color` + bottom hairline border — creates scannable section anchors.

### Responsive Behavior & Touch

Breakpoints: 600px (mobile reflow), 450px (dialog full-screen). The system is **desktop-first** in layout complexity but mobile-reflow is a first-class concern — every grid converts to flex-column list at 600px.

Touch targets: checkbox overlays use 44×44px touch area (24px icon + 10px padding all sides). Status icons use `::before { inset: -10px }` to achieve 44px tap area without visual size change — WCAG 2.5.8 compliant. FAB is 56×56px. All interactive buttons 40px height minimum.

`@media (prefers-reduced-motion: reduce)` collapses animation-duration and transition-duration to `0.01ms` and disables hover transforms. Shadow DOM does not inherit a document-level block, so coverage is per-stylesheet.

The block is authored once, in `src/styles/reduced-motion.styles.ts`, and coverage follows composition rather than import. `dialogStyles` is `[sharedStyles, uiStyles, …]`, so **every component composing `dialogStyles` inherits it** — that is the large majority of the card, dialogs included. Also covered: anything composing `reduced-motion.styles.ts` or `ui.styles.ts`, `plant-card.styles.ts` or `growspace-card.styles.ts` directly, plus components carrying their own `reduce` block (`growspace-chip`, `growspace-header-hero-ui`, `growspace-header-actions-ui`, `base-dialog`, `growspace-task-bar`, `config-stage-accordion`).

**Coverage is now complete for anything that moves.** The 20 components that build a bare `css` template _and_ declare an animation, transition or hover transform compose `reducedMotion` directly. Ten more build a bare template but declare no motion at all — `camera-capture`, `label-preview`, `nutrient-stock-chip`, `flower-flip-chip`, `growspace-view-heatmap`, `growspace-header-secondary-ui`, `config-section-header`, `gm-settings-panel` and the two carousel/grid card editors — and are deliberately left alone; there is nothing to reduce.

The rule when adding motion to a component: if its `static styles` composes `dialogStyles`, `uiStyles`, `plant-card.styles` or `growspace-card.styles`, it is already covered. If it builds a bare `css` template, interpolate `${reducedMotion}`. `tests/unit/reduced-motion-coverage.test.ts` asserts the composed `cssText`, not the import list — coverage is a property of what a sheet composes, and reading it off imports is what produced a wrong claim here once already.

### Contrast Target

**WCAG 2.1 AA** is the project target: 4.5:1 for body text, 3:1 for large text and non-text UI (icons, outlines, focus rings). Home Assistant themes may flip the shell to a light surface, so a color that passes only against `#1e1e1e` does not pass.

The rule that makes this survivable: **never tint the text**. Status text stays at `--primary-text-color`, which the active theme guarantees against its own surface. The status hue rides on the outline, a low-alpha fill, and the cue icon — roles that only need the 3:1 non-text ratio.

### Status Perception

`StatusLevel` (optimal / warning / danger) is never carried by hue or animation alone. Any surface that tints itself by status also renders its `STATUS_CUES` entry:

| Level   | Icon                    | Word       |
| :------ | :---------------------- | :--------- |
| optimal | `mdiCheckCircleOutline` | — (quiet)  |
| warning | `mdiAlert`              | "Warning"  |
| danger  | `mdiAlertOctagon`       | "Critical" |

Warning and danger differ by icon _and_ word, so the pair a reader must tell apart stays distinct with color removed and with the danger pulse stopped. Optimal is icon-only so a healthy chip does not shout. Crop-stage and phase colors are a separate, intentional language and are unaffected — where a stage color meets text (the mobile stage context), the color stays on the dot and the label reads at full contrast.

## 6. Design System Notes for Stitch Generation

### Language to Use

When prompting Stitch for screens in this system, use vocabulary like:

- "dark operations dashboard", "carbon-shell background", "near-black surface"
- "stage-color accent bar", "glassmorphic floating panel", "hairline border"
- "full-bleed plant photo tile with gradient scrim", "MD3 pill button"
- "tabular sensor readout", "pulsing alert indicator"
- "amber light-cycle glow", "vitality green primary action"

### Color References

| Name                       | Hex                      | Role                                |
| :------------------------- | :----------------------- | :---------------------------------- |
| Deep Carbon                | `#1e1e1e`                | Card background                     |
| Vitality Green             | `#4caf50`                | Primary action, Veg stage           |
| Hydro Blue                 | `#2196f3`                | Secondary / irrigation / Cure stage |
| Alert Red                  | `#f44336`                | Error, destructive, sick plant      |
| Amber Light                | `#ffeb3b`                | Light cycle, chart data line        |
| Warning Amber              | `#ffa726`                | Functional warning                  |
| Mid Flower                 | `#ff7043`                | Mid-flower phase / Bulk EC trace    |
| Integration Conflict Amber | `#e6a700`                | AC Infinity integration notice      |
| Flowering Orange           | `#ff9800`                | Flowering stage                     |
| Drying Purple              | `#9c27b0`                | Dry stage, IPM activity             |
| Mother Pink                | `#e91e63`                | Mother plant stage                  |
| Divider                    | `rgba(255,255,255,0.12)` | Section borders                     |
| Glass Film                 | `rgba(20,20,24,0.6)`     | Floating glass surface              |

### Component Prompts

**Plant tile grid:**

> "A 3-column grid of square plant monitoring tiles. Each tile is a full-bleed dark photograph with a black gradient scrim fading upward from the bottom. At the bottom: a bold white plant name (1.1rem), smaller grey phenotype label, and the current growth stage in the stage accent color. A thin 3px accent bar across the top edge is colored by stage (green=veg, orange=flower, purple=dry, blue=cure). Top-left has a frosted-glass age pill showing days. Background is near-black (#1e1e1e)."

**Dashboard header:**

> "A two-column dashboard header on dark background. Left: a large 1.75rem white gradient-clipped grow-room name selector. Below it a row of small muted meta stats. Right: a horizontal scrollable row of compact stat chips showing plant counts, alert counts, and environmental readings. A chip in warning gets an amber outline, an amber triangle icon, and the word WARNING; a chip in danger gets a heavier red outline, a red octagon icon, and the word CRITICAL. Chip text stays white in every state."

**Plant detail dialog:**

> "A floating glass dialog (rgba(20,20,20,0.85) background, 16px backdrop blur) with a header bar containing a stage-colored icon box and two-line title. Below: scrollable detail content in rounded dark cards (rgba(255,255,255,0.05) fill, hairline borders). Footer has right-aligned MD3 pill buttons: tonal Cancel and primary green Save."

### Incremental Iteration

- Start each screen with the dark carbon surface and let stage colors do the work — avoid adding decorative colors.
- Glassmorphism surfaces should be subtle (0.05–0.12 opacity fills, not heavy frosted panels).
- Typography hierarchy relies on weight contrast (400 vs 700) and size steps, not on color changes — keep most text near-white and use opacity to reduce emphasis.
- Stage color bars and dots should be the brightest, most saturated elements on any screen — they're the primary navigation signal.
