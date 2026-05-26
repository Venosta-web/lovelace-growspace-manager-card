---
name: Growspace Manager Card
colors:
  # Primary surfaces — dark carbon shell
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
  # Primary — Vitality Green
  primary: '#4caf50'
  on-primary: '#ffffff'
  primary-container: 'rgba(76,175,80,0.15)'
  on-primary-container: '#4caf50'
  inverse-primary: '#45a049'
  # Secondary — Hydro Blue
  secondary: '#2196f3'
  on-secondary: '#ffffff'
  secondary-container: 'rgba(33,150,243,0.12)'
  on-secondary-container: '#2196f3'
  # Tertiary — Amber Light (light cycle indicator)
  tertiary: '#ffeb3b'
  on-tertiary: '#1e1e1e'
  tertiary-container: 'rgba(255,235,59,0.05)'
  on-tertiary-container: '#ffeb3b'
  # Error
  error: '#f44336'
  on-error: '#ffffff'
  error-container: 'rgba(244,67,54,0.1)'
  on-error-container: '#f44336'
  # Background / global
  background: '#1e1e1e'
  on-background: '#ffffff'
  surface-variant: 'rgba(255,255,255,0.05)'
typography:
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
  xs: 0.25rem
  sm: 0.5rem
  DEFAULT: 0.75rem
  md: 0.75rem
  lg: 1rem
  xl: 1.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 12px
  margin-desktop: 24px
---

# Design System: Growspace Manager Card

**Project ID:** lovelace-growspace-manager-card

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
- **Warning Amber** `#ffa726` / `#ff9800` — PHI countdown warnings, training icons, Flowering stage, stat-chip warning state.

### Plant Stage Indicators

These colors are rendered as 3px accent bars at the top of plant tiles and as text overlays on card info sections:

- **Vegetative Green** `#4caf50` (same as primary — stages reinforce the brand).
- **Flowering Orange** `#ff9800`
- **Drying Purple** `#9c27b0` — Also used for IPM (Integrated Pest Management) activity icons.
- **Curing Blue** `#2196f3` (same as secondary — curing reinforces water/processing).
- **Seedling / Clone Lime** `#8bc34a`
- **Mother Plant Pink** `#e91e63`

### Typography & Text Hierarchy

- **Primary Text** `var(--primary-text-color, #ffffff)` — Headlines, values, prominent content. Pure white in dark mode.
- **Secondary Text** `rgba(255,255,255,0.7)` — Supporting labels, subtitles, pheno names.
- **Muted Text** `rgba(255,255,255,0.55)` — Meta-row stats, header secondary context.
- **Disabled Text** `rgba(255,255,255,0.38)` — Input placeholders, disabled controls.

### Functional States

- **Success** `#4caf50` — Toast notification success, health indicators.
- **Warning** `#ffa726` — Alert stat chips, PHI/IPM icons on plant tiles. Warning variant of amber.
- **Danger** `#ef5350` — Pulsing stat-chip danger state (distinct from alert red — slightly lighter for chip context).
- **Info** `#2196f3` — Watering icons, informational context.
- **Error Surface** `rgba(244,67,54,0.1)` / border `rgba(244,67,54,0.3)` — Error message containers.
- **Divider** `rgba(255,255,255,0.12)` — Section dividers, dialog header/footer borders.

## 3. Typography Rules

### Family & Character

The entire system uses **Roboto** (declared as `font-family: 'Roboto', sans-serif`), deferring to Home Assistant's Material Design 3 system font stack. Roboto's geometric neutrality prevents the dashboard from feeling "branded" at the expense of readability — it renders clean at 11px and remains authoritative at 28px. No display or serif typefaces.

Numeric data — sensor readings, plant age, timestamps — uses `font-variant-numeric: tabular-nums` to prevent layout jitter as values update in real time.

### Hierarchy & Weights

| Role | Size | Weight | Usage |
|:---|:---|:---|:---|
| `--font-size-xl` Display | 1.75rem / 28px | 400 | Growspace name in card header (`gs-title`, `select-sizer`) |
| `--font-size-xl` Headline | 1.5rem / 24px | 400/600 | Dialog titles, light cycle card titles |
| `--font-size-lg` Title | 1.25rem / 20px | 500 | Dialog header titles (`.dialog-title`) |
| `--font-size-md` Body | 1rem / 16px | 400 | Standard content, form inputs, plant stage labels |
| Plant Strain Name | 1.1rem | 700 | Full-bleed tile primary identity (text-shadow enhanced) |
| `--font-size-sm` Body Small | 0.875rem / 14px | 400/500 | Secondary labels, button text, dialog subtitles |
| Header Meta | 0.78rem | 400/500 | Stat counts in header meta row (tabular nums) |
| `--font-size-xs` Caption | 0.6875rem / 11px | 400/500 | Age pills on plant tiles, chart markers |
| Label Caps | 0.7rem | 600 | Mobile stage context, uppercase tracking labels |

### Spacing Principles

- Letter-spacing on display headings: `-0.01em` (tight, editorial).
- Letter-spacing on uppercase caps labels: `0.06em` (open, legible at small size).
- Letter-spacing on button text: `0.1px` (near-zero — MD3 convention).
- Letter-spacing on supporting text / labels: `0.4–0.5px` (slight optical expansion for de-emphasized hierarchy).
- Line-height on dense header elements: `1.1` (display); body: `1.4–1.5` (readable).

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

On hover: `translateY(-4px)` lift + shadow from `0 4px 6px` to `0 8px 16px`. Transition: `0.3s cubic-bezier(0.4, 0, 0.2, 1)`. Status icons (training, watering, IPM, PHI badges) fade in on hover at `opacity: 1`.

**Age pill** (top-left): frosted glass pill (`rgba(0,0,0,0.55)`, `backdrop-filter: blur(6px)`), hairline border, pill-radius 999px, 0.65rem tabular-nums.

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

Mobile (≤600px): Header collapses to flex row — title area takes remaining space, secondary strip and stage area are hidden. A `mobile-stage-context` label (0.7rem uppercase, 0.06em tracking) appears above the title to provide stage context that the strip would have shown.

### Inputs & Forms (MD3 `.md3-input-group`)

Bottom-border-only filled style (top-rounded corners 4px, flat bottom except for border). The bottom border is `1px solid rgba(255,255,255,0.4)` at rest, `2px solid rgba(255,255,255,0.6)` on focus (border weight increase instead of color swap signals focus state). Floating label (0.75rem, 0.4px tracking) is always visible above the field — no placeholder-as-label pattern.

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

`@media (prefers-reduced-motion: reduce)` is applied globally: all animation-duration collapsed to `0.01ms`, transforms on hover disabled. Every interactive component respects this.

## 6. Design System Notes for Stitch Generation

### Language to Use

When prompting Stitch for screens in this system, use vocabulary like:
- "dark operations dashboard", "carbon-shell background", "near-black surface"
- "stage-color accent bar", "glassmorphic floating panel", "hairline border"
- "full-bleed plant photo tile with gradient scrim", "MD3 pill button"
- "tabular sensor readout", "pulsing alert indicator"
- "amber light-cycle glow", "vitality green primary action"

### Color References

| Name | Hex | Role |
|:---|:---|:---|
| Deep Carbon | `#1e1e1e` | Card background |
| Vitality Green | `#4caf50` | Primary action, Veg stage |
| Hydro Blue | `#2196f3` | Secondary / irrigation / Cure stage |
| Alert Red | `#f44336` | Error, destructive, sick plant |
| Amber Light | `#ffeb3b` | Light cycle, chart data line |
| Flowering Orange | `#ff9800` | Bloom stage, PHI warning |
| Drying Purple | `#9c27b0` | Dry stage, IPM activity |
| Mother Pink | `#e91e63` | Mother plant stage |
| Divider | `rgba(255,255,255,0.12)` | Section borders |
| Glass Film | `rgba(20,20,24,0.6)` | Floating glass surface |

### Component Prompts

**Plant tile grid:**
> "A 3-column grid of square plant monitoring tiles. Each tile is a full-bleed dark photograph with a black gradient scrim fading upward from the bottom. At the bottom: a bold white plant name (1.1rem), smaller grey phenotype label, and the current growth stage in the stage accent color. A thin 3px accent bar across the top edge is colored by stage (green=veg, orange=flower, purple=dry, blue=cure). Top-left has a frosted-glass age pill showing days. Background is near-black (#1e1e1e)."

**Dashboard header:**
> "A two-column dashboard header on dark background. Left: a large 1.75rem white gradient-clipped grow-room name selector. Below it a row of small muted meta stats. Right: a horizontal scrollable row of compact stat chips showing plant counts, alert counts, and environmental readings. Chips turn amber-orange on warning, red with a pulse animation on danger."

**Plant detail dialog:**
> "A floating glass dialog (rgba(20,20,20,0.85) background, 16px backdrop blur) with a header bar containing a stage-colored icon box and two-line title. Below: scrollable detail content in rounded dark cards (rgba(255,255,255,0.05) fill, hairline borders). Footer has right-aligned MD3 pill buttons: tonal Cancel and primary green Save."

### Incremental Iteration

- Start each screen with the dark carbon surface and let stage colors do the work — avoid adding decorative colors.
- Glassmorphism surfaces should be subtle (0.05–0.12 opacity fills, not heavy frosted panels).
- Typography hierarchy relies on weight contrast (400 vs 700) and size steps, not on color changes — keep most text near-white and use opacity to reduce emphasis.
- Stage color bars and dots should be the brightest, most saturated elements on any screen — they're the primary navigation signal.
