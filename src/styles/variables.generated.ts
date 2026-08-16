// AUTO-GENERATED — DO NOT EDIT.
// Source: src/styles/tokens.ts.  Regenerate: npm run tokens:generate
// CI fails if this file differs from what the generator produces.

import { css, CSSResult } from 'lit';

export const variables: CSSResult = css`
  :host {
    /* MD3 Color System */
    --primary-gradient: linear-gradient(135deg, #4caf50, #45a049);
    --secondary-gradient: linear-gradient(135deg, #2196f3, #1976d2);
    --danger-gradient: linear-gradient(135deg, #f44336, #d32f2f);

    /* MD3 Elevation Levels */
    --md3-elevation-level0: none;
    --md3-elevation-level1: 0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15);
    --md3-elevation-level2: 0 1px 2px rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15);
    --md3-elevation-level3: 0 4px 8px 3px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.3);
    --md3-elevation-level4: 0 6px 10px 4px rgba(0, 0, 0, 0.15), 0 2px 3px rgba(0, 0, 0, 0.3);
    --md3-elevation-level5: 0 8px 12px 6px rgba(0, 0, 0, 0.15), 0 4px 4px rgba(0, 0, 0, 0.3);
    --surface-elevation: var(--md3-elevation-level1);
    --surface-elevation-hover: var(--md3-elevation-level2);

    /* Spacing (MD3 spacing system) */
    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 16px;
    --spacing-lg: 24px;
    --spacing-xl: 32px;

    /* Border Radius (MD3 shape system) */
    --border-radius-xs: 4px;
    --border-radius-sm: 8px;
    --border-radius-md: 12px;
    --border-radius-lg: 16px;
    --border-radius-xl: 28px;
    /* Pills and fully-round badges. Implemented by #564 after call sites had drifted to ad-hoc
       20px/999px values.
    */
    --border-radius-full: 9999px;
    /* Default */
    --border-radius: 12px;

    /* MD3 Typography Scale */
    /* 11px */
    --font-size-xs: 0.6875rem;
    /* 12px — Supporting Small. Implemented by #564 after call sites had drifted to ad-hoc
       0.8rem/13px values.
    */
    --font-size-supporting: 0.75rem;
    /* 14px — Body Small */
    --font-size-sm: 0.875rem;
    /* 16px — Body Medium */
    --font-size-md: 1rem;
    /* 20px — Title Large */
    --font-size-lg: 1.25rem;
    /* 24px — Headline Small */
    --font-size-xl: 1.5rem;

    /* Font Weights */
    --font-weight-regular: 400;
    --font-weight-medium: 500;
    --font-weight-bold: 700;

    /* MD3 Motion Tokens */
    --md3-motion-easing-standard: cubic-bezier(0.2, 0, 0, 1);
    /* Equal to easing-standard by design — MD3's emphasized spline has no single-bezier form */
    --md3-motion-easing-emphasized: cubic-bezier(0.2, 0, 0, 1);
    --md3-motion-duration-short1: 50ms;
    --md3-motion-duration-short2: 100ms;
    --md3-motion-duration-short3: 150ms;
    --md3-motion-duration-short4: 200ms;
    --md3-motion-duration-medium1: 250ms;
    --md3-motion-duration-medium2: 300ms;
    --md3-motion-duration-long1: 400ms;
    --md3-motion-duration-long2: 500ms;

    /* Surfaces — dark carbon shell */
    --surface: #1e1e1e;
    --surface-dim: #141414;
    --surface-bright: #252525;
    --surface-container-lowest: #101010;
    --surface-container-low: #1a1a1a;
    --surface-container: #1e1e1e;
    --surface-container-high: #2a2a2a;
    --surface-container-highest: #3a3a3a;

    /* Primary — Vitality Green */
    /* Foreground on the primary fill. White measures 2.78:1 against #4caf50; this dark
       foreground measures 6.00:1 and passes AA for normal text.
    */
    --on-primary: #1e1e1e;
    /* Foreground on translucent-green containers. \`on-primary-container\` (#4caf50) over
       rgba(76,175,80,0.2) on #1e1e1e is 4.26:1 — below AA for normal text; this is 8.36:1. Do
       not "correct" it back to #4caf50.
    */
    --on-primary-container-bright: #69f0ae;

    /* Secondary — Hydro Blue */
    /* Documented since ADR 0035 and unreachable until now — the light stop of
       --secondary-gradient, and the half --info-dark pairs with. Bare on purpose, as the
       danger pair is, because a gradient whose two stops follow different theming runs between
       two unrelated hues. Sites meaning "informational" still take the theme-following
       --gm-info-color.
    */
    --secondary: #2196f3;
    /* Measured at 3.12:1 against #2196f3: suitable for large text and icons, not normal text.
       Keep white until a normal-text secondary fill is introduced.
    */
    --on-secondary: #ffffff;
    /* The dark stop of --secondary-gradient, mirroring --error-dark. Exists so a gradient that
       cannot run 135deg — a liquid column runs \`to bottom\` — can compose the same two stops
       without re-authoring them. Pairs with bare --secondary, not with --gm-info-color. See
       ADR 0042 §3.
    */
    --info-dark: #1976d2;

    /* Light cycle — day and dark period */
    /* One pair for the whole light cycle, wherever it is reported: timeline icons, logbook
       entries, the humidity tab's day/night columns and the lights-on/off equipment icon.
       Three different pairs across five call sites before this existed. Day carries the
       Tertiary value, so the cycle a report describes and the controller accent that drives it
       are one colour. See ADR 0042 §2.
    */
    --cycle-day: #ffeb3b;
    /* Indigo 300, not the Indigo 500 (#3f51b5) three sites had drifted to: 500 measures 2.43:1
       on --surface, below the 3:1 an icon or rule needs. This measures 4.83:1.
    */
    --cycle-night: #7986cb;

    /* Tertiary — Amber Light (light cycle indicator) */
    --on-tertiary: #1e1e1e;

    /* Text roles */
    /* The documented text hierarchy. Each defers to the Home Assistant theme first and falls
       back to the canonical dark-theme value — it is that FORM, not the alpha value, that
       survives a light theme, so these are safe to use bare. The alphas below are the values
       an ad-hoc fallback should normalise to; a flat grey like #666 is what they replace. Note
       --text-muted collapses onto --secondary-text-color under a custom HA theme: HA has no
       muted role, and correctness in both themes beats a third tier that only exists in the
       default one.
    */
    /* --growspace-card-text is an older alias for this same role; consolidate during the #574
       migration.
    */
    --text-primary: var(--primary-text-color, #ffffff);
    --text-secondary: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
    --text-muted: var(--secondary-text-color, rgba(255, 255, 255, 0.55));
    --text-disabled: var(--disabled-text-color, rgba(255, 255, 255, 0.38));

    /* Text roles on a fixed dark ground */
    /* The same hierarchy as the text roles above, minus the Home Assistant deferral. For text
       that sits on a ground the card paints dark REGARDLESS of theme: glass overlays, scrims,
       the WebGL canvas, a saturated status fill. A theme-deferring role inverts on those
       grounds — under a light theme --text-primary resolves to #212121, which is near-black on
       near-black. Use these only where the backdrop is a literal in the same stylesheet;
       anywhere the surface follows the theme, the text must follow it too. See ADR 0039.
    */
    --on-overlay-primary: #ffffff;
    --on-overlay-secondary: rgba(255, 255, 255, 0.7);
    --on-overlay-muted: rgba(255, 255, 255, 0.55);

    /* Series — categorical chart and KPI accents */
    /* Ordinal, not semantic: call sites assign them positionally, not per metric. Use in
       order. Deliberately not derived from the primaries with color-mix — see ADR 0035.
    */
    --series-1: #4fc3f7;
    --series-2: #81c784;
    --series-3: #ce93d8;
    --series-4: #a5d6a7;

    /* Growspace Theme Colors */
    --growspace-card-bg: var(--card-background-color, #1e1e1e);
    --growspace-card-text: var(--primary-text-color, #fff);
    --growspace-card-accent: var(--primary-color, #4caf50);
    --growspace-empty-bg: rgba(255, 255, 255, 0.05);
    --growspace-empty-bg-hover: rgba(255, 255, 255, 0.1);
    --plant-border-color-default: #2196f3;

    /* Card Shadows (using MD3 elevation) */
    --card-shadow: var(--md3-elevation-level1);
    --card-shadow-hover: var(--md3-elevation-level2);

    /* Transitions (using MD3 motion) */
    --transition: all var(--md3-motion-duration-short4) var(--md3-motion-easing-standard);
    --transition-fast: all var(--md3-motion-duration-short2) var(--md3-motion-easing-standard);
    --transition-medium: all var(--md3-motion-duration-medium2) var(--md3-motion-easing-standard);

    /* Divider */
    /* Home Assistant defines this name too, so declaring it here shadows the user's theme
       inside the card. Withheld from the portalled dialog host, where the HA value keeps
       winning. The shadowing itself is the open question — see ADR 0036 and #608.
    */
    --divider-color: rgba(255, 255, 255, 0.12);
    /* The one step UP from --divider-color, for an outline that brightens on hover. Four call
       sites had drifted to three different values (0.2 twice, 0.35, #666) before this existed.
       See ADR 0039.
    */
    --outline-hover: rgba(255, 255, 255, 0.2);

    /* Plant Stage Colors */
    --stage-veg: #4caf50;
    --stage-flower: #ff9800;
    /* Also IPM activity */
    --stage-dry: #9c27b0;
    --stage-cure: #2196f3;
    --stage-seedling: #8bc34a;
    --stage-clone: #26c6da;
    --stage-mother: #e91e63;
    --stage-flower-early: #ff9800;
    --stage-flower-mid: #fb8c00;
    --stage-flower-late: #ef6c00;

    /* Crop steering phases */
    /* P1/P2/P3 are painted as chart bands, listed as phase chips and worn as the hero's phase
       badge, all from one family that lived as three literals in slices/irrigation/index.ts.
       Values unchanged. See ADR 0042 §1.
    */
    /* Saturation */
    --phase-p1: #4caf50;
    /* Maintenance */
    --phase-p2: #2196f3;
    /* Dryback. Shares a value with --stage-flower and with the --gm-warning-color fallback; it
       is neither, and the three are free to diverge.
    */
    --phase-p3: #ff9800;

    /* Chart markers */
    /* The current-time cursor on the day charts. Deliberately outside the data palette: the
       cursor crosses the P1–P3 bands, and the #ff9800 both charts used is exactly the P3 band
       it lands in. Neutral and the brightest thing on the chart, which is what a cursor should
       be. See ADR 0042 §1.
    */
    --marker-now: #ffffff;

    /* Activity Colors */
    /* A dialog accent names the thing the dialog acts on. Stage dialogs pass a --stage-*
       colour; activity dialogs pass one of these or a semantic token (IPM and irrigation
       steering use --warning-color). See ADR 0038.
    */
    /* Shares a value with --stage-dry; training is an activity, not a stage, so the two are
       free to diverge.
    */
    --activity-training: #9c27b0;

    /* Genetics axis */
    /* The indica/sativa ratio bar splits one track between two opposed segments, so the pair
       is read against each other before either is read against the surface. Material
       equivalents of the violet/yellow the bar had imported from another palette. The violet
       it replaces measured 3.39:1 against the track, under the 3:1 a graphical object needs
       once the track lightens; this measures 3.90:1. (ADR 0042 quoted 2.98:1 and 3.43:1
       against the #333 the track was authored as; #632 moved it onto
       --surface-container-high.) Separation between the two segments is unchanged at 2.2:1.
       See ADR 0042 §5.
    */
    --genetics-indica: #9575cd;
    --genetics-sativa: #fbc02d;

    /* Awards */
    /* Amber 500, on the award chips a strain carries from a cannabis cup. Promoted under ADR
       0035 §5a rather than folded: #631 sent this site to #632 as ordinary migration work, but
       every amber the system already documents means something else — --cycle-day is the light
       cycle, --gm-status-warning is 'something is wrong', and Tertiary's value is now the
       cycle's. Value unchanged. See ADR 0042's first premise correction.
    */
    --award: #ffc107;

    /* Error/Warning Colors */
    /* Home Assistant defines this name too — same shadowing as --divider-color, and withheld
       from the portal for the same reason. See ADR 0036.
    */
    --error-color: #f44336;
    --error-bg: rgba(244, 67, 54, 0.1);
    --error-border: rgba(244, 67, 54, 0.3);
    /* The dark stop of the danger gradient, and the pressed/hover state of destructive
       buttons. Two call sites reach for \`var(--error-color-dark, …)\`, which is not in the HA
       theme set the card relies on — confirm against a live instance before dropping their
       fallback.
    */
    --error-dark: #d32f2f;
    /* Lighter danger for chip context, distinct from --error-color. #ff5252 folds into this —
       see ADR 0035.
    */
    --danger-chip: #ef5350;
    /* Foreground on the error fill. White measures 3.68:1 against #f44336; this dark
       foreground measures 4.53:1 and passes AA for normal text.
    */
    --on-error: #1e1e1e;

    /* Semantic color aliases */
    /* HASS-integrated, used by log/timeline/plant-card */
    --gm-primary-color: var(--primary-color, #4caf50);
    /* DEPRECATED. Conflates the status warning with the flowering stage: it defers to the same
       HA variable as --gm-status-warning but falls back to the stage orange. Each use resolves
       to --gm-status-warning or --stage-flower per site. See ADR 0039 §4.
    */
    --gm-warning-color: var(--warning-color, #ff9800);
    --gm-info-color: var(--info-color, #2196f3);
    /* The far-low stop of the environment ramp (src/styles/environment-ramp.ts), darker than
       --gm-info-color so a five-stop scale keeps its direction. Derived rather than authored
       so it follows a themed --info-color; ADR 0035 §5 rejected derivation for the categorical
       series palette, and ADR 0040 §6 knowingly departs from that because a ramp has an
       internal relationship a categorical palette does not. \`in srgb\`, not \`in oklab\`: a
       non-sRGB color-mix serialises as oklab(), which THREE.Color.setStyle (pinned r184) does
       not parse, and the shader reads this stop through it.
    */
    --gm-info-deep: color-mix(in srgb, var(--gm-info-color) 62%, black);
    --gm-error-color: var(--error-color, #f44336);
    --gm-ipm-color: #9c27b0;
    --gm-phi-color: #ff9800;

    /* 3D View Accent */
    /* The accent of the 3D growspace view, shared by its DOM chrome and the three.js scene it
       controls. The scene consumes the 0x form (THREE.Color takes a resolved number, not a
       custom property), so both halves read the same authored value rather than repeating a
       literal — the canvas/DOM pairing ADR 0035 and #581 are about. See ADR 0039.
    */
    --accent-3d: #448aff;
    /* Hover step for controls in the 3D view */
    --accent-3d-hover: #64b5f6;
    /* Inactive control chrome in the 3D view — blue-grey, deliberately desaturated against the
       accent
    */
    --accent-3d-idle: #607d8b;

    /* AI Assistant Panel Colors */
    /* Chat mode — Vitality Green */
    --ai-accent: #4caf50;
    /* Briefing mode */
    --ai-violet: #9c27b0;
    /* Inbox mode */
    --ai-amber: #ff9800;

    /* Strain Dialog */
    --strain-dialog-bg: var(--ha-card-background, #1e1e1e);
    --strain-dialog-color: var(--primary-text-color, #fff);
    --strain-input-bg: #2a2a2a;
    --strain-input-border: #3a3a3a;

    /* Light Color */
    --primary-light-color: #ffeb3b;
    --primary-light-color-hover: rgba(255, 255, 255, 0.1);
    --primary-light-color-active: rgba(255, 255, 255, 0.2);

    /* Metric Palette — one hue per plotted metric */
    --metric-humidity: #2196f3;
    --metric-vpd: #9c27b0;
    --metric-calculated-vpd: #ab47bc;
    --metric-co2: #e91e63;
    --metric-air-exchange: #8d6e63;
    --metric-tank-level: #26a69a;
    --metric-soil-moisture: #03a9f4;
    --metric-light: #ffc107;
    --metric-irrigation: #03a9f4;
    --metric-drain: #ff9800;
    --metric-exhaust: #795548;
    --metric-circulation-fan: #243491;
    --metric-humidifier: #00bcd4;
    --metric-dehumidifier: #009688;
    --metric-optimal: #4caf50;
    --metric-dli: #ffb300;
    --metric-crop-steering: #4caf50;
    --metric-energy: #fbc02d;
    --metric-water: #03a9f4;
    --metric-ph: #ab47bc;
    --metric-feed-ec: #ffa726;
    --metric-bulk-ec: #ff7043;
    --metric-drain-volume: #29b6f6;
    --metric-irrigation-flow: #26c6da;
    --metric-power: #ffee58;
    /* DEFAULT_METRIC_CONFIG, for a metric key the card does not recognise. White rather than a
       hue, so an unmapped series is visibly not one of the named ones.
    */
    --metric-unknown: #ffffff;
  }
`;

/**
 * The subset the portalled dialog host declares. `growspace-dialog-host` is
 * appended to `document.body`, so it is a sibling of the card rather than a
 * descendant and inherits nothing from the block above — a bare `var(--font-size-sm)`
 * under `src/dialogs/` resolves to nothing without this. Withholds only the names
 * Home Assistant also defines, so the dialogs keep taking those from the user's
 * theme. See ADR 0036.
 */
export const portalVariables: CSSResult = css`
  :host {
    /* MD3 Color System */
    --primary-gradient: linear-gradient(135deg, #4caf50, #45a049);
    --secondary-gradient: linear-gradient(135deg, #2196f3, #1976d2);
    --danger-gradient: linear-gradient(135deg, #f44336, #d32f2f);

    /* MD3 Elevation Levels */
    --md3-elevation-level0: none;
    --md3-elevation-level1: 0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15);
    --md3-elevation-level2: 0 1px 2px rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15);
    --md3-elevation-level3: 0 4px 8px 3px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.3);
    --md3-elevation-level4: 0 6px 10px 4px rgba(0, 0, 0, 0.15), 0 2px 3px rgba(0, 0, 0, 0.3);
    --md3-elevation-level5: 0 8px 12px 6px rgba(0, 0, 0, 0.15), 0 4px 4px rgba(0, 0, 0, 0.3);
    --surface-elevation: var(--md3-elevation-level1);
    --surface-elevation-hover: var(--md3-elevation-level2);

    /* Spacing (MD3 spacing system) */
    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 16px;
    --spacing-lg: 24px;
    --spacing-xl: 32px;

    /* Border Radius (MD3 shape system) */
    --border-radius-xs: 4px;
    --border-radius-sm: 8px;
    --border-radius-md: 12px;
    --border-radius-lg: 16px;
    --border-radius-xl: 28px;
    /* Pills and fully-round badges. Implemented by #564 after call sites had drifted to ad-hoc
       20px/999px values.
    */
    --border-radius-full: 9999px;
    /* Default */
    --border-radius: 12px;

    /* MD3 Typography Scale */
    /* 11px */
    --font-size-xs: 0.6875rem;
    /* 12px — Supporting Small. Implemented by #564 after call sites had drifted to ad-hoc
       0.8rem/13px values.
    */
    --font-size-supporting: 0.75rem;
    /* 14px — Body Small */
    --font-size-sm: 0.875rem;
    /* 16px — Body Medium */
    --font-size-md: 1rem;
    /* 20px — Title Large */
    --font-size-lg: 1.25rem;
    /* 24px — Headline Small */
    --font-size-xl: 1.5rem;

    /* Font Weights */
    --font-weight-regular: 400;
    --font-weight-medium: 500;
    --font-weight-bold: 700;

    /* MD3 Motion Tokens */
    --md3-motion-easing-standard: cubic-bezier(0.2, 0, 0, 1);
    /* Equal to easing-standard by design — MD3's emphasized spline has no single-bezier form */
    --md3-motion-easing-emphasized: cubic-bezier(0.2, 0, 0, 1);
    --md3-motion-duration-short1: 50ms;
    --md3-motion-duration-short2: 100ms;
    --md3-motion-duration-short3: 150ms;
    --md3-motion-duration-short4: 200ms;
    --md3-motion-duration-medium1: 250ms;
    --md3-motion-duration-medium2: 300ms;
    --md3-motion-duration-long1: 400ms;
    --md3-motion-duration-long2: 500ms;

    /* Surfaces — dark carbon shell */
    --surface: #1e1e1e;
    --surface-dim: #141414;
    --surface-bright: #252525;
    --surface-container-lowest: #101010;
    --surface-container-low: #1a1a1a;
    --surface-container: #1e1e1e;
    --surface-container-high: #2a2a2a;
    --surface-container-highest: #3a3a3a;

    /* Primary — Vitality Green */
    /* Foreground on the primary fill. White measures 2.78:1 against #4caf50; this dark
       foreground measures 6.00:1 and passes AA for normal text.
    */
    --on-primary: #1e1e1e;
    /* Foreground on translucent-green containers. \`on-primary-container\` (#4caf50) over
       rgba(76,175,80,0.2) on #1e1e1e is 4.26:1 — below AA for normal text; this is 8.36:1. Do
       not "correct" it back to #4caf50.
    */
    --on-primary-container-bright: #69f0ae;

    /* Secondary — Hydro Blue */
    /* Documented since ADR 0035 and unreachable until now — the light stop of
       --secondary-gradient, and the half --info-dark pairs with. Bare on purpose, as the
       danger pair is, because a gradient whose two stops follow different theming runs between
       two unrelated hues. Sites meaning "informational" still take the theme-following
       --gm-info-color.
    */
    --secondary: #2196f3;
    /* Measured at 3.12:1 against #2196f3: suitable for large text and icons, not normal text.
       Keep white until a normal-text secondary fill is introduced.
    */
    --on-secondary: #ffffff;
    /* The dark stop of --secondary-gradient, mirroring --error-dark. Exists so a gradient that
       cannot run 135deg — a liquid column runs \`to bottom\` — can compose the same two stops
       without re-authoring them. Pairs with bare --secondary, not with --gm-info-color. See
       ADR 0042 §3.
    */
    --info-dark: #1976d2;

    /* Light cycle — day and dark period */
    /* One pair for the whole light cycle, wherever it is reported: timeline icons, logbook
       entries, the humidity tab's day/night columns and the lights-on/off equipment icon.
       Three different pairs across five call sites before this existed. Day carries the
       Tertiary value, so the cycle a report describes and the controller accent that drives it
       are one colour. See ADR 0042 §2.
    */
    --cycle-day: #ffeb3b;
    /* Indigo 300, not the Indigo 500 (#3f51b5) three sites had drifted to: 500 measures 2.43:1
       on --surface, below the 3:1 an icon or rule needs. This measures 4.83:1.
    */
    --cycle-night: #7986cb;

    /* Tertiary — Amber Light (light cycle indicator) */
    --on-tertiary: #1e1e1e;

    /* Text roles */
    /* The documented text hierarchy. Each defers to the Home Assistant theme first and falls
       back to the canonical dark-theme value — it is that FORM, not the alpha value, that
       survives a light theme, so these are safe to use bare. The alphas below are the values
       an ad-hoc fallback should normalise to; a flat grey like #666 is what they replace. Note
       --text-muted collapses onto --secondary-text-color under a custom HA theme: HA has no
       muted role, and correctness in both themes beats a third tier that only exists in the
       default one.
    */
    /* --growspace-card-text is an older alias for this same role; consolidate during the #574
       migration.
    */
    --text-primary: var(--primary-text-color, #ffffff);
    --text-secondary: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
    --text-muted: var(--secondary-text-color, rgba(255, 255, 255, 0.55));
    --text-disabled: var(--disabled-text-color, rgba(255, 255, 255, 0.38));

    /* Text roles on a fixed dark ground */
    /* The same hierarchy as the text roles above, minus the Home Assistant deferral. For text
       that sits on a ground the card paints dark REGARDLESS of theme: glass overlays, scrims,
       the WebGL canvas, a saturated status fill. A theme-deferring role inverts on those
       grounds — under a light theme --text-primary resolves to #212121, which is near-black on
       near-black. Use these only where the backdrop is a literal in the same stylesheet;
       anywhere the surface follows the theme, the text must follow it too. See ADR 0039.
    */
    --on-overlay-primary: #ffffff;
    --on-overlay-secondary: rgba(255, 255, 255, 0.7);
    --on-overlay-muted: rgba(255, 255, 255, 0.55);

    /* Series — categorical chart and KPI accents */
    /* Ordinal, not semantic: call sites assign them positionally, not per metric. Use in
       order. Deliberately not derived from the primaries with color-mix — see ADR 0035.
    */
    --series-1: #4fc3f7;
    --series-2: #81c784;
    --series-3: #ce93d8;
    --series-4: #a5d6a7;

    /* Growspace Theme Colors */
    --growspace-card-bg: var(--card-background-color, #1e1e1e);
    --growspace-card-text: var(--primary-text-color, #fff);
    --growspace-card-accent: var(--primary-color, #4caf50);
    --growspace-empty-bg: rgba(255, 255, 255, 0.05);
    --growspace-empty-bg-hover: rgba(255, 255, 255, 0.1);
    --plant-border-color-default: #2196f3;

    /* Card Shadows (using MD3 elevation) */
    --card-shadow: var(--md3-elevation-level1);
    --card-shadow-hover: var(--md3-elevation-level2);

    /* Transitions (using MD3 motion) */
    --transition: all var(--md3-motion-duration-short4) var(--md3-motion-easing-standard);
    --transition-fast: all var(--md3-motion-duration-short2) var(--md3-motion-easing-standard);
    --transition-medium: all var(--md3-motion-duration-medium2) var(--md3-motion-easing-standard);

    /* Divider */
    /* The one step UP from --divider-color, for an outline that brightens on hover. Four call
       sites had drifted to three different values (0.2 twice, 0.35, #666) before this existed.
       See ADR 0039.
    */
    --outline-hover: rgba(255, 255, 255, 0.2);

    /* Plant Stage Colors */
    --stage-veg: #4caf50;
    --stage-flower: #ff9800;
    /* Also IPM activity */
    --stage-dry: #9c27b0;
    --stage-cure: #2196f3;
    --stage-seedling: #8bc34a;
    --stage-clone: #26c6da;
    --stage-mother: #e91e63;
    --stage-flower-early: #ff9800;
    --stage-flower-mid: #fb8c00;
    --stage-flower-late: #ef6c00;

    /* Crop steering phases */
    /* P1/P2/P3 are painted as chart bands, listed as phase chips and worn as the hero's phase
       badge, all from one family that lived as three literals in slices/irrigation/index.ts.
       Values unchanged. See ADR 0042 §1.
    */
    /* Saturation */
    --phase-p1: #4caf50;
    /* Maintenance */
    --phase-p2: #2196f3;
    /* Dryback. Shares a value with --stage-flower and with the --gm-warning-color fallback; it
       is neither, and the three are free to diverge.
    */
    --phase-p3: #ff9800;

    /* Chart markers */
    /* The current-time cursor on the day charts. Deliberately outside the data palette: the
       cursor crosses the P1–P3 bands, and the #ff9800 both charts used is exactly the P3 band
       it lands in. Neutral and the brightest thing on the chart, which is what a cursor should
       be. See ADR 0042 §1.
    */
    --marker-now: #ffffff;

    /* Activity Colors */
    /* A dialog accent names the thing the dialog acts on. Stage dialogs pass a --stage-*
       colour; activity dialogs pass one of these or a semantic token (IPM and irrigation
       steering use --warning-color). See ADR 0038.
    */
    /* Shares a value with --stage-dry; training is an activity, not a stage, so the two are
       free to diverge.
    */
    --activity-training: #9c27b0;

    /* Genetics axis */
    /* The indica/sativa ratio bar splits one track between two opposed segments, so the pair
       is read against each other before either is read against the surface. Material
       equivalents of the violet/yellow the bar had imported from another palette. The violet
       it replaces measured 3.39:1 against the track, under the 3:1 a graphical object needs
       once the track lightens; this measures 3.90:1. (ADR 0042 quoted 2.98:1 and 3.43:1
       against the #333 the track was authored as; #632 moved it onto
       --surface-container-high.) Separation between the two segments is unchanged at 2.2:1.
       See ADR 0042 §5.
    */
    --genetics-indica: #9575cd;
    --genetics-sativa: #fbc02d;

    /* Awards */
    /* Amber 500, on the award chips a strain carries from a cannabis cup. Promoted under ADR
       0035 §5a rather than folded: #631 sent this site to #632 as ordinary migration work, but
       every amber the system already documents means something else — --cycle-day is the light
       cycle, --gm-status-warning is 'something is wrong', and Tertiary's value is now the
       cycle's. Value unchanged. See ADR 0042's first premise correction.
    */
    --award: #ffc107;

    /* Error/Warning Colors */
    --error-bg: rgba(244, 67, 54, 0.1);
    --error-border: rgba(244, 67, 54, 0.3);
    /* The dark stop of the danger gradient, and the pressed/hover state of destructive
       buttons. Two call sites reach for \`var(--error-color-dark, …)\`, which is not in the HA
       theme set the card relies on — confirm against a live instance before dropping their
       fallback.
    */
    --error-dark: #d32f2f;
    /* Lighter danger for chip context, distinct from --error-color. #ff5252 folds into this —
       see ADR 0035.
    */
    --danger-chip: #ef5350;
    /* Foreground on the error fill. White measures 3.68:1 against #f44336; this dark
       foreground measures 4.53:1 and passes AA for normal text.
    */
    --on-error: #1e1e1e;

    /* Semantic color aliases */
    /* HASS-integrated, used by log/timeline/plant-card */
    --gm-primary-color: var(--primary-color, #4caf50);
    /* DEPRECATED. Conflates the status warning with the flowering stage: it defers to the same
       HA variable as --gm-status-warning but falls back to the stage orange. Each use resolves
       to --gm-status-warning or --stage-flower per site. See ADR 0039 §4.
    */
    --gm-warning-color: var(--warning-color, #ff9800);
    --gm-info-color: var(--info-color, #2196f3);
    /* The far-low stop of the environment ramp (src/styles/environment-ramp.ts), darker than
       --gm-info-color so a five-stop scale keeps its direction. Derived rather than authored
       so it follows a themed --info-color; ADR 0035 §5 rejected derivation for the categorical
       series palette, and ADR 0040 §6 knowingly departs from that because a ramp has an
       internal relationship a categorical palette does not. \`in srgb\`, not \`in oklab\`: a
       non-sRGB color-mix serialises as oklab(), which THREE.Color.setStyle (pinned r184) does
       not parse, and the shader reads this stop through it.
    */
    --gm-info-deep: color-mix(in srgb, var(--gm-info-color) 62%, black);
    /* Resolved from var(--error-color, #f44336) — the referenced token is card-only, and the
       portal must not depend on a name this block does not declare.
    */
    --gm-error-color: #f44336;
    --gm-ipm-color: #9c27b0;
    --gm-phi-color: #ff9800;

    /* 3D View Accent */
    /* The accent of the 3D growspace view, shared by its DOM chrome and the three.js scene it
       controls. The scene consumes the 0x form (THREE.Color takes a resolved number, not a
       custom property), so both halves read the same authored value rather than repeating a
       literal — the canvas/DOM pairing ADR 0035 and #581 are about. See ADR 0039.
    */
    --accent-3d: #448aff;
    /* Hover step for controls in the 3D view */
    --accent-3d-hover: #64b5f6;
    /* Inactive control chrome in the 3D view — blue-grey, deliberately desaturated against the
       accent
    */
    --accent-3d-idle: #607d8b;

    /* AI Assistant Panel Colors */
    /* Chat mode — Vitality Green */
    --ai-accent: #4caf50;
    /* Briefing mode */
    --ai-violet: #9c27b0;
    /* Inbox mode */
    --ai-amber: #ff9800;

    /* Strain Dialog */
    --strain-dialog-bg: var(--ha-card-background, #1e1e1e);
    --strain-dialog-color: var(--primary-text-color, #fff);
    --strain-input-bg: #2a2a2a;
    --strain-input-border: #3a3a3a;

    /* Light Color */
    --primary-light-color: #ffeb3b;
    --primary-light-color-hover: rgba(255, 255, 255, 0.1);
    --primary-light-color-active: rgba(255, 255, 255, 0.2);

    /* Metric Palette — one hue per plotted metric */
    --metric-humidity: #2196f3;
    --metric-vpd: #9c27b0;
    --metric-calculated-vpd: #ab47bc;
    --metric-co2: #e91e63;
    --metric-air-exchange: #8d6e63;
    --metric-tank-level: #26a69a;
    --metric-soil-moisture: #03a9f4;
    --metric-light: #ffc107;
    --metric-irrigation: #03a9f4;
    --metric-drain: #ff9800;
    --metric-exhaust: #795548;
    --metric-circulation-fan: #243491;
    --metric-humidifier: #00bcd4;
    --metric-dehumidifier: #009688;
    --metric-optimal: #4caf50;
    --metric-dli: #ffb300;
    --metric-crop-steering: #4caf50;
    --metric-energy: #fbc02d;
    --metric-water: #03a9f4;
    --metric-ph: #ab47bc;
    --metric-feed-ec: #ffa726;
    --metric-bulk-ec: #ff7043;
    --metric-drain-volume: #29b6f6;
    --metric-irrigation-flow: #26c6da;
    --metric-power: #ffee58;
    /* DEFAULT_METRIC_CONFIG, for a metric key the card does not recognise. White rather than a
       hue, so an unmapped series is visibly not one of the named ones.
    */
    --metric-unknown: #ffffff;
  }
`;

/** Tokens deliberately withheld from `portalVariables`, for the guard test. */
export const cardOnlyTokens = ['--divider-color', '--error-color'] as const;

/**
 * Every CSS custom property as a plain value, for the call sites where `var()`
 * is inert — viewmodels, constants files and models. Importing from here is how
 * the JS layer participates in the token system at all (ADR 0035, decision 4).
 */
export const token = {
  '--primary-gradient': 'linear-gradient(135deg, #4caf50, #45a049)',
  '--secondary-gradient': 'linear-gradient(135deg, #2196f3, #1976d2)',
  '--danger-gradient': 'linear-gradient(135deg, #f44336, #d32f2f)',
  '--md3-elevation-level0': 'none',
  '--md3-elevation-level1': '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15)',
  '--md3-elevation-level2': '0 1px 2px rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15)',
  '--md3-elevation-level3': '0 4px 8px 3px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.3)',
  '--md3-elevation-level4': '0 6px 10px 4px rgba(0, 0, 0, 0.15), 0 2px 3px rgba(0, 0, 0, 0.3)',
  '--md3-elevation-level5': '0 8px 12px 6px rgba(0, 0, 0, 0.15), 0 4px 4px rgba(0, 0, 0, 0.3)',
  '--surface-elevation': 'var(--md3-elevation-level1)',
  '--surface-elevation-hover': 'var(--md3-elevation-level2)',
  '--spacing-xs': '4px',
  '--spacing-sm': '8px',
  '--spacing-md': '16px',
  '--spacing-lg': '24px',
  '--spacing-xl': '32px',
  '--border-radius-xs': '4px',
  '--border-radius-sm': '8px',
  '--border-radius-md': '12px',
  '--border-radius-lg': '16px',
  '--border-radius-xl': '28px',
  '--border-radius-full': '9999px',
  '--border-radius': '12px',
  '--font-size-xs': '0.6875rem',
  '--font-size-supporting': '0.75rem',
  '--font-size-sm': '0.875rem',
  '--font-size-md': '1rem',
  '--font-size-lg': '1.25rem',
  '--font-size-xl': '1.5rem',
  '--font-weight-regular': '400',
  '--font-weight-medium': '500',
  '--font-weight-bold': '700',
  '--md3-motion-easing-standard': 'cubic-bezier(0.2, 0, 0, 1)',
  '--md3-motion-easing-emphasized': 'cubic-bezier(0.2, 0, 0, 1)',
  '--md3-motion-duration-short1': '50ms',
  '--md3-motion-duration-short2': '100ms',
  '--md3-motion-duration-short3': '150ms',
  '--md3-motion-duration-short4': '200ms',
  '--md3-motion-duration-medium1': '250ms',
  '--md3-motion-duration-medium2': '300ms',
  '--md3-motion-duration-long1': '400ms',
  '--md3-motion-duration-long2': '500ms',
  '--surface': '#1e1e1e',
  '--surface-dim': '#141414',
  '--surface-bright': '#252525',
  '--surface-container-lowest': '#101010',
  '--surface-container-low': '#1a1a1a',
  '--surface-container': '#1e1e1e',
  '--surface-container-high': '#2a2a2a',
  '--surface-container-highest': '#3a3a3a',
  '--on-primary': '#1e1e1e',
  '--on-primary-container-bright': '#69f0ae',
  '--secondary': '#2196f3',
  '--on-secondary': '#ffffff',
  '--info-dark': '#1976d2',
  '--cycle-day': '#ffeb3b',
  '--cycle-night': '#7986cb',
  '--on-tertiary': '#1e1e1e',
  '--text-primary': 'var(--primary-text-color, #ffffff)',
  '--text-secondary': 'var(--secondary-text-color, rgba(255, 255, 255, 0.7))',
  '--text-muted': 'var(--secondary-text-color, rgba(255, 255, 255, 0.55))',
  '--text-disabled': 'var(--disabled-text-color, rgba(255, 255, 255, 0.38))',
  '--on-overlay-primary': '#ffffff',
  '--on-overlay-secondary': 'rgba(255, 255, 255, 0.7)',
  '--on-overlay-muted': 'rgba(255, 255, 255, 0.55)',
  '--series-1': '#4fc3f7',
  '--series-2': '#81c784',
  '--series-3': '#ce93d8',
  '--series-4': '#a5d6a7',
  '--growspace-card-bg': 'var(--card-background-color, #1e1e1e)',
  '--growspace-card-text': 'var(--primary-text-color, #fff)',
  '--growspace-card-accent': 'var(--primary-color, #4caf50)',
  '--growspace-empty-bg': 'rgba(255, 255, 255, 0.05)',
  '--growspace-empty-bg-hover': 'rgba(255, 255, 255, 0.1)',
  '--plant-border-color-default': '#2196f3',
  '--card-shadow': 'var(--md3-elevation-level1)',
  '--card-shadow-hover': 'var(--md3-elevation-level2)',
  '--transition': 'all var(--md3-motion-duration-short4) var(--md3-motion-easing-standard)',
  '--transition-fast': 'all var(--md3-motion-duration-short2) var(--md3-motion-easing-standard)',
  '--transition-medium': 'all var(--md3-motion-duration-medium2) var(--md3-motion-easing-standard)',
  '--divider-color': 'rgba(255, 255, 255, 0.12)',
  '--outline-hover': 'rgba(255, 255, 255, 0.2)',
  '--stage-veg': '#4caf50',
  '--stage-flower': '#ff9800',
  '--stage-dry': '#9c27b0',
  '--stage-cure': '#2196f3',
  '--stage-seedling': '#8bc34a',
  '--stage-clone': '#26c6da',
  '--stage-mother': '#e91e63',
  '--stage-flower-early': '#ff9800',
  '--stage-flower-mid': '#fb8c00',
  '--stage-flower-late': '#ef6c00',
  '--phase-p1': '#4caf50',
  '--phase-p2': '#2196f3',
  '--phase-p3': '#ff9800',
  '--marker-now': '#ffffff',
  '--activity-training': '#9c27b0',
  '--genetics-indica': '#9575cd',
  '--genetics-sativa': '#fbc02d',
  '--award': '#ffc107',
  '--error-color': '#f44336',
  '--error-bg': 'rgba(244, 67, 54, 0.1)',
  '--error-border': 'rgba(244, 67, 54, 0.3)',
  '--error-dark': '#d32f2f',
  '--danger-chip': '#ef5350',
  '--on-error': '#1e1e1e',
  '--gm-primary-color': 'var(--primary-color, #4caf50)',
  '--gm-warning-color': 'var(--warning-color, #ff9800)',
  '--gm-info-color': 'var(--info-color, #2196f3)',
  '--gm-info-deep': 'color-mix(in srgb, var(--gm-info-color) 62%, black)',
  '--gm-error-color': 'var(--error-color, #f44336)',
  '--gm-ipm-color': '#9c27b0',
  '--gm-phi-color': '#ff9800',
  '--accent-3d': '#448aff',
  '--accent-3d-hover': '#64b5f6',
  '--accent-3d-idle': '#607d8b',
  '--ai-accent': '#4caf50',
  '--ai-violet': '#9c27b0',
  '--ai-amber': '#ff9800',
  '--strain-dialog-bg': 'var(--ha-card-background, #1e1e1e)',
  '--strain-dialog-color': 'var(--primary-text-color, #fff)',
  '--strain-input-bg': '#2a2a2a',
  '--strain-input-border': '#3a3a3a',
  '--primary-light-color': '#ffeb3b',
  '--primary-light-color-hover': 'rgba(255, 255, 255, 0.1)',
  '--primary-light-color-active': 'rgba(255, 255, 255, 0.2)',
  '--metric-humidity': '#2196f3',
  '--metric-vpd': '#9c27b0',
  '--metric-calculated-vpd': '#ab47bc',
  '--metric-co2': '#e91e63',
  '--metric-air-exchange': '#8d6e63',
  '--metric-tank-level': '#26a69a',
  '--metric-soil-moisture': '#03a9f4',
  '--metric-light': '#ffc107',
  '--metric-irrigation': '#03a9f4',
  '--metric-drain': '#ff9800',
  '--metric-exhaust': '#795548',
  '--metric-circulation-fan': '#243491',
  '--metric-humidifier': '#00bcd4',
  '--metric-dehumidifier': '#009688',
  '--metric-optimal': '#4caf50',
  '--metric-dli': '#ffb300',
  '--metric-crop-steering': '#4caf50',
  '--metric-energy': '#fbc02d',
  '--metric-water': '#03a9f4',
  '--metric-ph': '#ab47bc',
  '--metric-feed-ec': '#ffa726',
  '--metric-bulk-ec': '#ff7043',
  '--metric-drain-volume': '#29b6f6',
  '--metric-irrigation-flow': '#26c6da',
  '--metric-power': '#ffee58',
  '--metric-unknown': '#ffffff',
} as const;

export type TokenName = keyof typeof token;
