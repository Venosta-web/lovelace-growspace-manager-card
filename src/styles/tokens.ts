/**
 * The single authored source for every design token in the card.
 *
 * Two artifacts are GENERATED from this file and must never be hand-edited:
 *   - `src/styles/variables.generated.ts` — the lit `css` custom-property block
 *     the components read at runtime, plus a typed `token` map for the JS layer.
 *   - the YAML frontmatter block in `DESIGN.md` — the documented palette.
 *
 * Run `npm run tokens:generate` after changing anything here. CI asserts that
 * regenerating produces no diff, so a forgotten regeneration fails the build
 * rather than shipping the DESIGN.md ↔ runtime drift that ADR 0035 exists to end.
 *
 * See docs/adr/0035-colour-tokens-sorted-by-binding-context.md.
 */

/** A value documented in DESIGN.md that is not a flat string (typography steps). */
export type DocValue = string | Record<string, string>;

export interface TokenDef {
  /**
   * CSS custom property name, without the leading `--` omitted — written in
   * full, e.g. `--stage-veg`. `null` means the value is documented in DESIGN.md
   * but deliberately not implemented as a runtime custom property.
   */
  css: string | null;
  /** CSS value. Required whenever `css` is set. */
  value?: string;
  /**
   * Dotted path into the DESIGN.md frontmatter, e.g. `colors.surface`.
   * `null` means the token is runtime-only and not part of the documented palette.
   */
  doc: string | null;
  /** Frontmatter value, when it differs from `value` or is structured. */
  docValue?: DocValue;
  /** Emitted as a comment above the token in both artifacts. */
  note?: string;
  /**
   * `card-only` withholds the token from `portalVariables`, the block the
   * portalled dialog host declares. Reserved for the two names Home Assistant
   * also defines: inside the card they shadow the HA theme deliberately, but
   * re-declaring them on the portal would take the dialogs' dividers and error
   * colour away from the user's theme. See ADR 0036.
   */
  scope?: 'card-only';
}

export interface TokenGroup {
  title: string;
  note?: string;
  tokens: TokenDef[];
}

export const groups: TokenGroup[] = [
  {
    title: 'MD3 Color System',
    tokens: [
      { css: '--primary-gradient', value: 'linear-gradient(135deg, #4caf50, #45a049)', doc: null },
      {
        css: '--secondary-gradient',
        value: 'linear-gradient(135deg, #2196f3, #1976d2)',
        doc: null,
      },
      { css: '--danger-gradient', value: 'linear-gradient(135deg, #f44336, #d32f2f)', doc: null },
    ],
  },
  {
    title: 'MD3 Elevation Levels',
    tokens: [
      { css: '--md3-elevation-level0', value: 'none', doc: 'elevation.level-0', docValue: 'none' },
      {
        css: '--md3-elevation-level1',
        value: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15)',
        doc: 'elevation.level-1',
        docValue: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15)',
      },
      {
        css: '--md3-elevation-level2',
        value: '0 1px 2px rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15)',
        doc: 'elevation.level-2',
        docValue: '0 1px 2px rgba(0,0,0,0.3), 0 2px 6px 2px rgba(0,0,0,0.15)',
      },
      {
        css: '--md3-elevation-level3',
        value: '0 4px 8px 3px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.3)',
        doc: 'elevation.level-3',
        docValue: '0 4px 8px 3px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.3)',
      },
      {
        css: '--md3-elevation-level4',
        value: '0 6px 10px 4px rgba(0, 0, 0, 0.15), 0 2px 3px rgba(0, 0, 0, 0.3)',
        doc: 'elevation.level-4',
        docValue: '0 6px 10px 4px rgba(0,0,0,0.15), 0 2px 3px rgba(0,0,0,0.3)',
      },
      {
        css: '--md3-elevation-level5',
        value: '0 8px 12px 6px rgba(0, 0, 0, 0.15), 0 4px 4px rgba(0, 0, 0, 0.3)',
        doc: 'elevation.level-5',
        docValue: '0 8px 12px 6px rgba(0,0,0,0.15), 0 4px 4px rgba(0,0,0,0.3)',
      },
      {
        css: null,
        doc: 'elevation.glass-dialog',
        docValue: '0 8px 32px rgba(0,0,0,0.37)',
        note: 'Named exception: broad, soft modal separation for glass dialogs',
      },
      { css: '--surface-elevation', value: 'var(--md3-elevation-level1)', doc: null },
      { css: '--surface-elevation-hover', value: 'var(--md3-elevation-level2)', doc: null },
    ],
  },
  {
    title: 'Spacing (MD3 spacing system)',
    tokens: [
      { css: null, doc: 'spacing.unit', docValue: '4px' },
      { css: '--spacing-xs', value: '4px', doc: 'spacing.xs' },
      { css: '--spacing-sm', value: '8px', doc: 'spacing.sm' },
      { css: '--spacing-md', value: '16px', doc: 'spacing.md' },
      { css: '--spacing-lg', value: '24px', doc: 'spacing.lg' },
      { css: '--spacing-xl', value: '32px', doc: 'spacing.xl' },
      { css: null, doc: 'spacing.gutter', docValue: '16px' },
      { css: null, doc: 'spacing.margin-mobile', docValue: '12px' },
      { css: null, doc: 'spacing.margin-desktop', docValue: '24px' },
    ],
  },
  {
    title: 'Border Radius (MD3 shape system)',
    tokens: [
      { css: '--border-radius-xs', value: '4px', doc: 'rounded.xs', docValue: '0.25rem' },
      { css: '--border-radius-sm', value: '8px', doc: 'rounded.sm', docValue: '0.5rem' },
      { css: null, doc: 'rounded.DEFAULT', docValue: '0.75rem' },
      { css: '--border-radius-md', value: '12px', doc: 'rounded.md', docValue: '0.75rem' },
      { css: '--border-radius-lg', value: '16px', doc: 'rounded.lg', docValue: '1rem' },
      { css: '--border-radius-xl', value: '28px', doc: 'rounded.xl', docValue: '1.75rem' },
      {
        css: '--border-radius-full',
        value: '9999px',
        doc: 'rounded.full',
        note: 'Pills and fully-round badges. Implemented by #564 after call sites had drifted to ad-hoc 20px/999px values.',
      },
      {
        css: null,
        doc: 'rounded.filled-field-bottom',
        docValue: '0.125rem',
        note: 'Named exception: filled fields retain a nearly flat lower edge',
      },
      { css: '--border-radius', value: '12px', doc: null, note: 'Default' },
    ],
  },
  {
    title: 'MD3 Typography Scale',
    tokens: [
      { css: '--font-size-xs', value: '0.6875rem', doc: null, note: '11px' },
      {
        css: '--font-size-supporting',
        value: '0.75rem',
        doc: null,
        note: '12px — Supporting Small. Implemented by #564 after call sites had drifted to ad-hoc 0.8rem/13px values.',
      },
      { css: '--font-size-sm', value: '0.875rem', doc: null, note: '14px — Body Small' },
      { css: '--font-size-md', value: '1rem', doc: null, note: '16px — Body Medium' },
      { css: '--font-size-lg', value: '1.25rem', doc: null, note: '20px — Title Large' },
      { css: '--font-size-xl', value: '1.5rem', doc: null, note: '24px — Headline Small' },
    ],
  },
  {
    title: 'Typography steps (documented only — composed at call sites)',
    tokens: [
      { css: null, doc: 'typography.display-lg', docValue: step('28px', '400', '1.1', '-0.01em') },
      { css: null, doc: 'typography.headline-md', docValue: step('24px', '400', '1.2', '0') },
      { css: null, doc: 'typography.title-lg', docValue: step('20px', '500', '1.3', '0') },
      { css: null, doc: 'typography.body-base', docValue: step('16px', '400', '1.5', '0') },
      { css: null, doc: 'typography.body-sm', docValue: step('14px', '400', '1.4', '0') },
      {
        css: null,
        doc: 'typography.plant-strain-name',
        docValue: step('17.6px', '700', '1.2', '0'),
        note: 'Named display exception for the primary identity on a plant tile',
      },
      { css: null, doc: 'typography.supporting-sm', docValue: step('12px', '400', '1.4', '0') },
      { css: null, doc: 'typography.label-caps', docValue: step('11px', '500', '1.4', '0.5px') },
      { css: null, doc: 'typography.caption', docValue: step('11px', '400', '1.4', '0') },
      { css: null, doc: 'typography.stat-tabular', docValue: step('12px', '500', '1.4', '0') },
    ],
  },
  {
    title: 'Font Weights',
    tokens: [
      { css: '--font-weight-regular', value: '400', doc: null },
      { css: '--font-weight-medium', value: '500', doc: null },
      { css: '--font-weight-bold', value: '700', doc: null },
    ],
  },
  {
    title: 'MD3 Motion Tokens',
    tokens: [
      {
        css: '--md3-motion-easing-standard',
        value: 'cubic-bezier(0.2, 0, 0, 1)',
        doc: 'motion.easing-standard',
      },
      {
        css: '--md3-motion-easing-emphasized',
        value: 'cubic-bezier(0.2, 0, 0, 1)',
        doc: 'motion.easing-emphasized',
        // Same value as standard on purpose: MD3's emphasized curve is a two-part
        // spline no single cubic-bezier() can express, so Material Web collapses it.
        note: "Equal to easing-standard by design — MD3's emphasized spline has no single-bezier form",
      },
      { css: '--md3-motion-duration-short1', value: '50ms', doc: 'motion.duration-short1' },
      { css: '--md3-motion-duration-short2', value: '100ms', doc: 'motion.duration-short2' },
      { css: '--md3-motion-duration-short3', value: '150ms', doc: 'motion.duration-short3' },
      { css: '--md3-motion-duration-short4', value: '200ms', doc: 'motion.duration-short4' },
      { css: '--md3-motion-duration-medium1', value: '250ms', doc: 'motion.duration-medium1' },
      { css: '--md3-motion-duration-medium2', value: '300ms', doc: 'motion.duration-medium2' },
      { css: '--md3-motion-duration-long1', value: '400ms', doc: 'motion.duration-long1' },
      { css: '--md3-motion-duration-long2', value: '500ms', doc: 'motion.duration-long2' },
    ],
  },
  {
    title: 'Surfaces — dark carbon shell',
    tokens: [
      { css: '--surface', value: '#1e1e1e', doc: 'colors.surface' },
      { css: '--surface-dim', value: '#141414', doc: 'colors.surface-dim' },
      { css: '--surface-bright', value: '#252525', doc: 'colors.surface-bright' },
      {
        css: '--surface-container-lowest',
        value: '#101010',
        doc: 'colors.surface-container-lowest',
      },
      { css: '--surface-container-low', value: '#1a1a1a', doc: 'colors.surface-container-low' },
      { css: '--surface-container', value: '#1e1e1e', doc: 'colors.surface-container' },
      { css: '--surface-container-high', value: '#2a2a2a', doc: 'colors.surface-container-high' },
      {
        css: '--surface-container-highest',
        value: '#3a3a3a',
        doc: 'colors.surface-container-highest',
      },
      { css: null, doc: 'colors.on-surface', docValue: '#ffffff' },
      { css: null, doc: 'colors.on-surface-variant', docValue: 'rgba(255,255,255,0.7)' },
      { css: null, doc: 'colors.inverse-surface', docValue: '#e8e8e8' },
      { css: null, doc: 'colors.inverse-on-surface', docValue: '#1e1e1e' },
      { css: null, doc: 'colors.outline', docValue: 'rgba(255,255,255,0.12)' },
      { css: null, doc: 'colors.outline-variant', docValue: 'rgba(255,255,255,0.05)' },
      { css: null, doc: 'colors.surface-tint', docValue: '#4caf50' },
      { css: null, doc: 'colors.surface-overlay-subtle', docValue: 'rgba(0,0,0,0.1)' },
      { css: null, doc: 'colors.surface-overlay-recessed', docValue: 'rgba(0,0,0,0.15)' },
      { css: null, doc: 'colors.surface-overlay-strong', docValue: 'rgba(0,0,0,0.2)' },
      { css: null, doc: 'colors.background', docValue: '#1e1e1e' },
      { css: null, doc: 'colors.on-background', docValue: '#ffffff' },
      { css: null, doc: 'colors.surface-variant', docValue: 'rgba(255,255,255,0.05)' },
    ],
  },
  {
    title: 'Primary — Vitality Green',
    tokens: [
      { css: null, doc: 'colors.primary', docValue: '#4caf50' },
      {
        css: '--on-primary',
        value: '#1e1e1e',
        doc: 'colors.on-primary',
        note: 'Foreground on the primary fill. White measures 2.78:1 against #4caf50; this dark foreground measures 6.00:1 and passes AA for normal text.',
      },
      { css: null, doc: 'colors.primary-container', docValue: 'rgba(76,175,80,0.15)' },
      { css: null, doc: 'colors.on-primary-container', docValue: '#4caf50' },
      {
        css: '--on-primary-container-bright',
        value: '#69f0ae',
        doc: 'colors.on-primary-container-bright',
        note: 'Foreground on translucent-green containers. `on-primary-container` (#4caf50) over rgba(76,175,80,0.2) on #1e1e1e is 4.26:1 — below AA for normal text; this is 8.36:1. Do not "correct" it back to #4caf50.',
      },
      { css: null, doc: 'colors.inverse-primary', docValue: '#45a049' },
    ],
  },
  {
    title: 'Secondary — Hydro Blue',
    tokens: [
      {
        css: '--secondary',
        value: '#2196f3',
        doc: 'colors.secondary',
        note: 'Documented since ADR 0035 and unreachable until now — the light stop of --secondary-gradient, and the half --info-dark pairs with. Bare on purpose, as the danger pair is, because a gradient whose two stops follow different theming runs between two unrelated hues. Sites meaning "informational" still take the theme-following --gm-info-color.',
      },
      {
        css: '--on-secondary',
        value: '#ffffff',
        doc: 'colors.on-secondary',
        note: 'Measured at 3.12:1 against #2196f3: suitable for large text and icons, not normal text. Keep white until a normal-text secondary fill is introduced.',
      },
      { css: null, doc: 'colors.secondary-container', docValue: 'rgba(33,150,243,0.12)' },
      { css: null, doc: 'colors.on-secondary-container', docValue: '#2196f3' },
      {
        css: '--info-dark',
        value: '#1976d2',
        doc: 'colors.info-dark',
        note: 'The dark stop of --secondary-gradient, mirroring --error-dark. Exists so a gradient that cannot run 135deg — a liquid column runs `to bottom` — can compose the same two stops without re-authoring them. Pairs with bare --secondary, not with --gm-info-color. See ADR 0042 §3.',
      },
    ],
  },
  {
    title: 'Light cycle — day and dark period',
    note: "One pair for the whole light cycle, wherever it is reported: timeline icons, logbook entries, the humidity tab's day/night columns and the lights-on/off equipment icon. Three different pairs across five call sites before this existed. Day carries the Tertiary value, so the cycle a report describes and the controller accent that drives it are one colour. See ADR 0042 §2.",
    tokens: [
      { css: '--cycle-day', value: '#ffeb3b', doc: 'colors.cycle-day' },
      {
        css: '--cycle-night',
        value: '#7986cb',
        doc: 'colors.cycle-night',
        note: 'Indigo 300, not the Indigo 500 (#3f51b5) three sites had drifted to: 500 measures 2.43:1 on --surface, below the 3:1 an icon or rule needs. This measures 4.83:1.',
      },
    ],
  },
  {
    title: 'Tertiary — Amber Light (light cycle indicator)',
    tokens: [
      { css: null, doc: 'colors.tertiary', docValue: '#ffeb3b' },
      { css: '--on-tertiary', value: '#1e1e1e', doc: 'colors.on-tertiary' },
      { css: null, doc: 'colors.tertiary-container', docValue: 'rgba(255,235,59,0.05)' },
      { css: null, doc: 'colors.on-tertiary-container', docValue: '#ffeb3b' },
    ],
  },
  {
    title: 'Text roles',
    note: 'The documented text hierarchy. Each defers to the Home Assistant theme first and falls back to the canonical dark-theme value — it is that FORM, not the alpha value, that survives a light theme, so these are safe to use bare. The alphas below are the values an ad-hoc fallback should normalise to; a flat grey like #666 is what they replace. Note --text-muted collapses onto --secondary-text-color under a custom HA theme: HA has no muted role, and correctness in both themes beats a third tier that only exists in the default one.',
    tokens: [
      {
        css: '--text-primary',
        value: 'var(--primary-text-color, #ffffff)',
        doc: 'colors.text-primary',
        docValue: 'var(--primary-text-color, #ffffff)',
        note: '--growspace-card-text is an older alias for this same role; consolidate during the #574 migration.',
      },
      {
        css: '--text-secondary',
        value: 'var(--secondary-text-color, rgba(255, 255, 255, 0.7))',
        doc: 'colors.text-secondary',
        docValue: 'rgba(255,255,255,0.7)',
      },
      {
        css: '--text-muted',
        value: 'var(--secondary-text-color, rgba(255, 255, 255, 0.55))',
        doc: 'colors.text-muted',
        docValue: 'rgba(255,255,255,0.55)',
      },
      {
        css: '--text-disabled',
        value: 'var(--disabled-text-color, rgba(255, 255, 255, 0.38))',
        doc: 'colors.text-disabled',
        docValue: 'rgba(255,255,255,0.38)',
      },
    ],
  },
  {
    title: 'Text roles on a fixed dark ground',
    note: 'The same hierarchy as the text roles above, minus the Home Assistant deferral. For text that sits on a ground the card paints dark REGARDLESS of theme: glass overlays, scrims, the WebGL canvas, a saturated status fill. A theme-deferring role inverts on those grounds — under a light theme --text-primary resolves to #212121, which is near-black on near-black. Use these only where the backdrop is a literal in the same stylesheet; anywhere the surface follows the theme, the text must follow it too. See ADR 0039.',
    tokens: [
      { css: '--on-overlay-primary', value: '#ffffff', doc: 'colors.on-overlay-primary' },
      {
        css: '--on-overlay-secondary',
        value: 'rgba(255, 255, 255, 0.7)',
        doc: 'colors.on-overlay-secondary',
        docValue: 'rgba(255,255,255,0.7)',
      },
      {
        css: '--on-overlay-muted',
        value: 'rgba(255, 255, 255, 0.55)',
        doc: 'colors.on-overlay-muted',
        docValue: 'rgba(255,255,255,0.55)',
      },
    ],
  },
  {
    title: 'Series — categorical chart and KPI accents',
    note: 'Ordinal, not semantic: call sites assign them positionally, not per metric. Use in order. Deliberately not derived from the primaries with color-mix — see ADR 0035.',
    tokens: [
      { css: '--series-1', value: '#4fc3f7', doc: 'colors.series-1' },
      { css: '--series-2', value: '#81c784', doc: 'colors.series-2' },
      { css: '--series-3', value: '#ce93d8', doc: 'colors.series-3' },
      { css: '--series-4', value: '#a5d6a7', doc: 'colors.series-4' },
    ],
  },
  {
    title: 'Growspace Theme Colors',
    tokens: [
      { css: '--growspace-card-bg', value: 'var(--card-background-color, #1e1e1e)', doc: null },
      { css: '--growspace-card-text', value: 'var(--primary-text-color, #fff)', doc: null },
      { css: '--growspace-card-accent', value: 'var(--primary-color, #4caf50)', doc: null },
      { css: '--growspace-empty-bg', value: 'rgba(255, 255, 255, 0.05)', doc: null },
      { css: '--growspace-empty-bg-hover', value: 'rgba(255, 255, 255, 0.1)', doc: null },
      { css: '--plant-border-color-default', value: '#2196f3', doc: null },
    ],
  },
  {
    title: 'Card Shadows (using MD3 elevation)',
    tokens: [
      { css: '--card-shadow', value: 'var(--md3-elevation-level1)', doc: null },
      { css: '--card-shadow-hover', value: 'var(--md3-elevation-level2)', doc: null },
    ],
  },
  {
    title: 'Transitions (using MD3 motion)',
    tokens: [
      {
        css: '--transition',
        value: 'all var(--md3-motion-duration-short4) var(--md3-motion-easing-standard)',
        doc: null,
      },
      {
        css: '--transition-fast',
        value: 'all var(--md3-motion-duration-short2) var(--md3-motion-easing-standard)',
        doc: null,
      },
      {
        css: '--transition-medium',
        value: 'all var(--md3-motion-duration-medium2) var(--md3-motion-easing-standard)',
        doc: null,
      },
    ],
  },
  {
    title: 'Divider',
    tokens: [
      {
        css: '--divider-color',
        value: 'rgba(255, 255, 255, 0.12)',
        doc: null,
        scope: 'card-only',
        note: "Home Assistant defines this name too, so declaring it here shadows the user's theme inside the card. Withheld from the portalled dialog host, where the HA value keeps winning. The shadowing itself is the open question — see ADR 0036 and #608.",
      },
      {
        css: '--outline-hover',
        value: 'rgba(255, 255, 255, 0.2)',
        doc: 'colors.outline-hover',
        docValue: 'rgba(255,255,255,0.2)',
        note: 'The one step UP from --divider-color, for an outline that brightens on hover. Four call sites had drifted to three different values (0.2 twice, 0.35, #666) before this existed. See ADR 0039.',
      },
    ],
  },
  {
    title: 'Plant Stage Colors',
    tokens: [
      { css: '--stage-veg', value: '#4caf50', doc: 'colors.stage-veg' },
      { css: '--stage-flower', value: '#ff9800', doc: 'colors.stage-flower' },
      { css: '--stage-dry', value: '#9c27b0', doc: 'colors.stage-dry', note: 'Also IPM activity' },
      { css: '--stage-cure', value: '#2196f3', doc: 'colors.stage-cure' },
      { css: '--stage-seedling', value: '#8bc34a', doc: 'colors.stage-seedling' },
      { css: '--stage-clone', value: '#26c6da', doc: 'colors.stage-clone' },
      { css: '--stage-mother', value: '#e91e63', doc: 'colors.stage-mother' },
      { css: '--stage-flower-early', value: '#ff9800', doc: 'colors.stage-flower-early' },
      { css: '--stage-flower-mid', value: '#fb8c00', doc: 'colors.stage-flower-mid' },
      { css: '--stage-flower-late', value: '#ef6c00', doc: 'colors.stage-flower-late' },
    ],
  },
  {
    title: 'Crop steering phases',
    note: "P1/P2/P3 are painted as chart bands, listed as phase chips and worn as the hero's phase badge, all from one family that lived as three literals in slices/irrigation/index.ts. Values unchanged. See ADR 0042 §1.",
    tokens: [
      { css: '--phase-p1', value: '#4caf50', doc: 'colors.phase-p1', note: 'Saturation' },
      { css: '--phase-p2', value: '#2196f3', doc: 'colors.phase-p2', note: 'Maintenance' },
      {
        css: '--phase-p3',
        value: '#ff9800',
        doc: 'colors.phase-p3',
        note: 'Dryback. Shares a value with --stage-flower and with the --gm-warning-color fallback; it is neither, and the three are free to diverge.',
      },
    ],
  },
  {
    title: 'Chart markers',
    tokens: [
      {
        css: '--marker-now',
        value: '#ffffff',
        doc: 'colors.marker-now',
        note: 'The current-time cursor on the day charts. Deliberately outside the data palette: the cursor crosses the P1–P3 bands, and the #ff9800 both charts used is exactly the P3 band it lands in. Neutral and the brightest thing on the chart, which is what a cursor should be. See ADR 0042 §1.',
      },
    ],
  },
  {
    title: 'Activity Colors',
    note: 'A dialog accent names the thing the dialog acts on. Stage dialogs pass a --stage-* colour; activity dialogs pass one of these or a semantic token (IPM and irrigation steering use --warning-color). See ADR 0038.',
    tokens: [
      {
        css: '--activity-training',
        value: '#9c27b0',
        doc: 'colors.activity-training',
        note: 'Shares a value with --stage-dry; training is an activity, not a stage, so the two are free to diverge.',
      },
    ],
  },
  {
    title: 'Genetics axis',
    note: 'The indica/sativa ratio bar splits one track between two opposed segments, so the pair is read against each other before either is read against the surface. Material equivalents of the violet/yellow the bar had imported from another palette. The violet it replaces measured 3.39:1 against the track, under the 3:1 a graphical object needs once the track lightens; this measures 3.90:1. (ADR 0042 quoted 2.98:1 and 3.43:1 against the #333 the track was authored as; #632 moved it onto --surface-container-high.) Separation between the two segments is unchanged at 2.2:1. See ADR 0042 §5.',
    tokens: [
      { css: '--genetics-indica', value: '#9575cd', doc: 'colors.genetics-indica' },
      { css: '--genetics-sativa', value: '#fbc02d', doc: 'colors.genetics-sativa' },
    ],
  },
  {
    title: 'Awards',
    tokens: [
      {
        css: '--award',
        value: '#ffc107',
        doc: 'colors.award',
        note: "Amber 500, on the award chips a strain carries from a cannabis cup. Promoted under ADR 0035 §5a rather than folded: #631 sent this site to #632 as ordinary migration work, but every amber the system already documents means something else — --cycle-day is the light cycle, --gm-status-warning is 'something is wrong', and Tertiary's value is now the cycle's. Value unchanged. See ADR 0042's first premise correction.",
      },
    ],
  },
  {
    title: 'Error/Warning Colors',
    tokens: [
      {
        css: '--error-color',
        value: '#f44336',
        doc: 'colors.error',
        scope: 'card-only',
        note: 'Home Assistant defines this name too — same shadowing as --divider-color, and withheld from the portal for the same reason. See ADR 0036.',
      },
      {
        css: '--error-bg',
        value: 'rgba(244, 67, 54, 0.1)',
        doc: 'colors.error-container',
        docValue: 'rgba(244,67,54,0.1)',
      },
      { css: '--error-border', value: 'rgba(244, 67, 54, 0.3)', doc: null },
      {
        css: '--error-dark',
        value: '#d32f2f',
        doc: 'colors.error-dark',
        note: 'The dark stop of the danger gradient, and the pressed/hover state of destructive buttons. Two call sites reach for `var(--error-color-dark, …)`, which is not in the HA theme set the card relies on — confirm against a live instance before dropping their fallback.',
      },
      {
        css: '--danger-chip',
        value: '#ef5350',
        doc: 'colors.danger-chip',
        note: 'Lighter danger for chip context, distinct from --error-color. #ff5252 folds into this — see ADR 0035.',
      },
      {
        css: '--on-error',
        value: '#1e1e1e',
        doc: 'colors.on-error',
        note: 'Foreground on the error fill. White measures 3.68:1 against #f44336; this dark foreground measures 4.53:1 and passes AA for normal text.',
      },
      { css: null, doc: 'colors.on-error-container', docValue: '#f44336' },
      {
        css: null,
        doc: 'colors.warning',
        docValue: '#ffa726',
        note: 'Functional state, distinct from the Flowering stage',
      },
      { css: null, doc: 'colors.on-warning', docValue: '#1e1e1e' },
      {
        css: null,
        doc: 'colors.mid-flower',
        docValue: '#ff7043',
        note: 'Mid-flower crop phase and Bulk EC trace',
      },
    ],
  },
  {
    title: 'Operational status',
    note: 'The three StatusLevel levels, as consumed by src/styles/status.styles.ts. Each level is hue + fill + outline; status text itself is never tinted, so it survives a light Home Assistant theme.',
    tokens: [
      { css: null, doc: 'colors.status-optimal', docValue: '#4caf50' },
      {
        css: null,
        doc: 'colors.status-optimal-fill',
        docValue: 'color-mix(in srgb, #4caf50 10%, transparent)',
      },
      {
        css: null,
        doc: 'colors.status-optimal-outline',
        docValue: 'color-mix(in srgb, #4caf50 45%, transparent)',
      },
      { css: null, doc: 'colors.status-warning', docValue: '#ffa726' },
      {
        css: null,
        doc: 'colors.status-warning-fill',
        docValue: 'color-mix(in srgb, #ffa726 14%, transparent)',
      },
      {
        css: null,
        doc: 'colors.status-warning-outline',
        docValue: 'color-mix(in srgb, #ffa726 60%, transparent)',
      },
      { css: null, doc: 'colors.status-danger', docValue: '#f44336' },
      {
        css: null,
        doc: 'colors.status-danger-fill',
        docValue: 'color-mix(in srgb, #f44336 14%, transparent)',
      },
      {
        css: null,
        doc: 'colors.status-danger-outline',
        docValue: 'color-mix(in srgb, #f44336 70%, transparent)',
      },
    ],
  },
  {
    title: 'Integration conflict',
    note: 'AC Infinity integration conflicts, pre-fill failures, and duplicate ports',
    tokens: [
      { css: null, doc: 'colors.integration-conflict', docValue: '#e6a700' },
      {
        css: null,
        doc: 'colors.integration-conflict-container',
        docValue: 'rgba(230,167,0,0.1)',
      },
      { css: null, doc: 'colors.integration-conflict-outline', docValue: 'rgba(230,167,0,0.35)' },
    ],
  },
  {
    title: 'Semantic color aliases',
    note: 'HASS-integrated, used by log/timeline/plant-card',
    tokens: [
      { css: '--gm-primary-color', value: 'var(--primary-color, #4caf50)', doc: null },
      {
        css: '--gm-warning-color',
        value: 'var(--warning-color, #ff9800)',
        doc: null,
        note: 'DEPRECATED. Conflates the status warning with the flowering stage: it defers to the same HA variable as --gm-status-warning but falls back to the stage orange. Each use resolves to --gm-status-warning or --stage-flower per site. See ADR 0039 §4.',
      },
      { css: '--gm-info-color', value: 'var(--info-color, #2196f3)', doc: null },
      {
        css: '--gm-info-deep',
        value: 'color-mix(in srgb, var(--gm-info-color) 62%, black)',
        doc: null,
        note: 'The far-low stop of the environment ramp (src/styles/environment-ramp.ts), darker than --gm-info-color so a five-stop scale keeps its direction. Derived rather than authored so it follows a themed --info-color; ADR 0035 §5 rejected derivation for the categorical series palette, and ADR 0040 §6 knowingly departs from that because a ramp has an internal relationship a categorical palette does not. `in srgb`, not `in oklab`: a non-sRGB color-mix serialises as oklab(), which THREE.Color.setStyle (pinned r184) does not parse, and the shader reads this stop through it.',
      },
      { css: '--gm-error-color', value: 'var(--error-color, #f44336)', doc: null },
      { css: '--gm-ipm-color', value: '#9c27b0', doc: null },
      { css: '--gm-phi-color', value: '#ff9800', doc: null },
    ],
  },
  {
    title: '3D View Accent',
    note: 'The accent of the 3D growspace view, shared by its DOM chrome and the three.js scene it controls. The scene consumes the 0x form (THREE.Color takes a resolved number, not a custom property), so both halves read the same authored value rather than repeating a literal — the canvas/DOM pairing ADR 0035 and #581 are about. See ADR 0039.',
    tokens: [
      { css: '--accent-3d', value: '#448aff', doc: 'colors.accent-3d' },
      {
        css: '--accent-3d-hover',
        value: '#64b5f6',
        doc: 'colors.accent-3d-hover',
        note: 'Hover step for controls in the 3D view',
      },
      {
        css: '--accent-3d-idle',
        value: '#607d8b',
        doc: 'colors.accent-3d-idle',
        note: 'Inactive control chrome in the 3D view — blue-grey, deliberately desaturated against the accent',
      },
    ],
  },
  {
    title: 'AI Assistant Panel Colors',
    tokens: [
      { css: '--ai-accent', value: '#4caf50', doc: null, note: 'Chat mode — Vitality Green' },
      { css: '--ai-violet', value: '#9c27b0', doc: null, note: 'Briefing mode' },
      { css: '--ai-amber', value: '#ff9800', doc: null, note: 'Inbox mode' },
    ],
  },
  {
    title: 'Strain Dialog',
    tokens: [
      { css: '--strain-dialog-bg', value: 'var(--ha-card-background, #1e1e1e)', doc: null },
      { css: '--strain-dialog-color', value: 'var(--primary-text-color, #fff)', doc: null },
      { css: '--strain-input-bg', value: '#2a2a2a', doc: null },
      { css: '--strain-input-border', value: '#3a3a3a', doc: null },
    ],
  },
  {
    title: 'Light Color',
    tokens: [
      { css: '--primary-light-color', value: '#ffeb3b', doc: null },
      { css: '--primary-light-color-hover', value: 'rgba(255, 255, 255, 0.1)', doc: null },
      { css: '--primary-light-color-active', value: 'rgba(255, 255, 255, 0.2)', doc: null },
    ],
  },
  {
    // A per-metric assignment, not the ordinal --series-* set: a chart legend names
    // the metric, so the reader learns "humidity is this blue" and expects it to hold
    // wherever humidity is plotted. Values are unchanged from the literals they replace.
    // Some repeat across metrics (#03a9f4 is soil moisture, irrigation and water) and
    // some coincide with a token meaning something else (drain's #ff9800 is also the
    // flowering stage); both are why these are named per metric rather than folded.
    // Temperature, substrate temp, pore EC and runoff EC are absent on purpose — they
    // already read --danger-chip. See ADR 0035 §5 for why this is not the series palette.
    title: 'Metric Palette — one hue per plotted metric',
    tokens: [
      { css: '--metric-humidity', value: '#2196f3', doc: 'colors.metric-humidity' },
      { css: '--metric-vpd', value: '#9c27b0', doc: 'colors.metric-vpd' },
      { css: '--metric-calculated-vpd', value: '#ab47bc', doc: 'colors.metric-calculated-vpd' },
      { css: '--metric-co2', value: '#e91e63', doc: 'colors.metric-co2' },
      { css: '--metric-air-exchange', value: '#8d6e63', doc: 'colors.metric-air-exchange' },
      { css: '--metric-tank-level', value: '#26a69a', doc: 'colors.metric-tank-level' },
      { css: '--metric-soil-moisture', value: '#03a9f4', doc: 'colors.metric-soil-moisture' },
      { css: '--metric-light', value: '#ffc107', doc: 'colors.metric-light' },
      { css: '--metric-irrigation', value: '#03a9f4', doc: 'colors.metric-irrigation' },
      { css: '--metric-drain', value: '#ff9800', doc: 'colors.metric-drain' },
      { css: '--metric-exhaust', value: '#795548', doc: 'colors.metric-exhaust' },
      { css: '--metric-circulation-fan', value: '#243491', doc: 'colors.metric-circulation-fan' },
      { css: '--metric-humidifier', value: '#00bcd4', doc: 'colors.metric-humidifier' },
      { css: '--metric-dehumidifier', value: '#009688', doc: 'colors.metric-dehumidifier' },
      { css: '--metric-optimal', value: '#4caf50', doc: 'colors.metric-optimal' },
      { css: '--metric-dli', value: '#ffb300', doc: 'colors.metric-dli' },
      { css: '--metric-crop-steering', value: '#4caf50', doc: 'colors.metric-crop-steering' },
      { css: '--metric-energy', value: '#fbc02d', doc: 'colors.metric-energy' },
      { css: '--metric-water', value: '#03a9f4', doc: 'colors.metric-water' },
      { css: '--metric-ph', value: '#ab47bc', doc: 'colors.metric-ph' },
      { css: '--metric-feed-ec', value: '#ffa726', doc: 'colors.metric-feed-ec' },
      { css: '--metric-bulk-ec', value: '#ff7043', doc: 'colors.metric-bulk-ec' },
      { css: '--metric-drain-volume', value: '#29b6f6', doc: 'colors.metric-drain-volume' },
      { css: '--metric-irrigation-flow', value: '#26c6da', doc: 'colors.metric-irrigation-flow' },
      { css: '--metric-power', value: '#ffee58', doc: 'colors.metric-power' },
      {
        css: '--metric-unknown',
        value: '#ffffff',
        doc: 'colors.metric-unknown',
        note: 'DEFAULT_METRIC_CONFIG, for a metric key the card does not recognise. White rather than a hue, so an unmapped series is visibly not one of the named ones.',
      },
    ],
  },
  {
    // A breeding generation is strain data the reader looks up, not decoration — the
    // same argument ADR 0042 §5 made for the indica/sativa axis. Five of the seven
    // values coincide with a stage-palette colour while meaning generation, which is
    // why #577 excluded them on intent and why they are named rather than folded.
    // Values are unchanged from the literals they replace. See ADR 0044 §1.
    title: 'Genetics Generation Palette — one hue per breeding generation',
    tokens: [
      { css: '--gen-p1', value: '#9e9e9e', doc: 'colors.gen-p1' },
      { css: '--gen-f1', value: '#4caf50', doc: 'colors.gen-f1' },
      { css: '--gen-f2', value: '#8bc34a', doc: 'colors.gen-f2' },
      { css: '--gen-bx1', value: '#ff9800', doc: 'colors.gen-bx1' },
      { css: '--gen-bx2', value: '#f57c00', doc: 'colors.gen-bx2' },
      { css: '--gen-s1', value: '#2196f3', doc: 'colors.gen-s1' },
      { css: '--gen-cl', value: '#e91e63', doc: 'colors.gen-cl' },
      {
        css: '--gen-unknown',
        value: '#555555',
        doc: 'colors.gen-unknown',
        note: 'For a generation label the card does not recognise. Grey rather than a hue, so an unmapped node is visibly not one of the named generations. Was the shorthand #555.',
      },
    ],
  },
  {
    // The genetics tree paints three relations to the focal node at once, so the triple
    // has to stay mutually distinguishable. Folding focal and descendant into the file's
    // theme-derived --gv-primary/--gv-secondary would let a user's theme collapse two of
    // the three arms onto one hue. Values unchanged. See ADR 0044 §2.
    title: 'Lineage Relation — the genetics tree relative to its focal node',
    tokens: [
      { css: '--lineage-focal', value: '#4caf50', doc: 'colors.lineage-focal' },
      { css: '--lineage-ancestor', value: '#ff9800', doc: 'colors.lineage-ancestor' },
      { css: '--lineage-descendant', value: '#2196f3', doc: 'colors.lineage-descendant' },
    ],
  },
  {
    // A fixed categorical set, one hue per product type, structurally identical to the
    // metric palette above. --nutrient-base is absent on purpose: base feed follows the
    // Primary, which is where the map already pointed it. See ADR 0044 §3.
    title: 'Nutrient Product Types — one hue per stock type',
    tokens: [
      { css: '--nutrient-bloom', value: '#e91e63', doc: 'colors.nutrient-bloom' },
      { css: '--nutrient-calmag', value: '#ff9800', doc: 'colors.nutrient-calmag' },
      { css: '--nutrient-root', value: '#795548', doc: 'colors.nutrient-root' },
      { css: '--nutrient-additive', value: '#9c27b0', doc: 'colors.nutrient-additive' },
      { css: '--nutrient-microbe', value: '#00bcd4', doc: 'colors.nutrient-microbe' },
    ],
  },
  {
    // Plant sex is recorded data the badge reports, not a status. Hermaphrodite's orange
    // is a fourth claimant on the flowering/P3 hue and is named rather than folded for
    // the same reason the generation palette is. Values unchanged. See ADR 0044 §4.
    title: 'Plant Sex — one hue per recorded sex',
    tokens: [
      { css: '--sex-female', value: '#4caf50', doc: 'colors.sex-female' },
      { css: '--sex-male', value: '#2196f3', doc: 'colors.sex-male' },
      { css: '--sex-hermaphrodite', value: '#ff9800', doc: 'colors.sex-hermaphrodite' },
    ],
  },
];

function step(
  fontSize: string,
  fontWeight: string,
  lineHeight: string,
  letterSpacing: string
): Record<string, string> {
  return { fontFamily: 'Roboto', fontSize, fontWeight, lineHeight, letterSpacing };
}
