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
      { css: '--md3-motion-easing-standard', value: 'cubic-bezier(0.2, 0, 0, 1)', doc: null },
      { css: '--md3-motion-easing-emphasized', value: 'cubic-bezier(0.2, 0, 0, 1)', doc: null },
      { css: '--md3-motion-duration-short1', value: '50ms', doc: null },
      { css: '--md3-motion-duration-short2', value: '100ms', doc: null },
      { css: '--md3-motion-duration-short3', value: '150ms', doc: null },
      { css: '--md3-motion-duration-short4', value: '200ms', doc: null },
      { css: '--md3-motion-duration-medium1', value: '250ms', doc: null },
      { css: '--md3-motion-duration-medium2', value: '300ms', doc: null },
      { css: '--md3-motion-duration-long1', value: '400ms', doc: null },
      { css: '--md3-motion-duration-long2', value: '500ms', doc: null },
    ],
  },
  {
    title: 'Surfaces — dark carbon shell',
    tokens: [
      { css: null, doc: 'colors.surface', docValue: '#1e1e1e' },
      { css: null, doc: 'colors.surface-dim', docValue: '#141414' },
      { css: null, doc: 'colors.surface-bright', docValue: '#252525' },
      { css: null, doc: 'colors.surface-container-lowest', docValue: '#101010' },
      { css: null, doc: 'colors.surface-container-low', docValue: '#1a1a1a' },
      { css: null, doc: 'colors.surface-container', docValue: '#1e1e1e' },
      { css: null, doc: 'colors.surface-container-high', docValue: '#2a2a2a' },
      { css: null, doc: 'colors.surface-container-highest', docValue: '#3a3a3a' },
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
      { css: null, doc: 'colors.on-primary', docValue: '#ffffff' },
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
      { css: null, doc: 'colors.secondary', docValue: '#2196f3' },
      { css: null, doc: 'colors.on-secondary', docValue: '#ffffff' },
      { css: null, doc: 'colors.secondary-container', docValue: 'rgba(33,150,243,0.12)' },
      { css: null, doc: 'colors.on-secondary-container', docValue: '#2196f3' },
    ],
  },
  {
    title: 'Tertiary — Amber Light (light cycle indicator)',
    tokens: [
      { css: null, doc: 'colors.tertiary', docValue: '#ffeb3b' },
      { css: null, doc: 'colors.on-tertiary', docValue: '#1e1e1e' },
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
      { css: null, doc: 'colors.on-error', docValue: '#ffffff' },
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
      { css: '--gm-warning-color', value: 'var(--warning-color, #ff9800)', doc: null },
      { css: '--gm-info-color', value: 'var(--info-color, #2196f3)', doc: null },
      { css: '--gm-error-color', value: 'var(--error-color, #f44336)', doc: null },
      { css: '--gm-ipm-color', value: '#9c27b0', doc: null },
      { css: '--gm-phi-color', value: '#ff9800', doc: null },
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
];

function step(
  fontSize: string,
  fontWeight: string,
  lineHeight: string,
  letterSpacing: string
): Record<string, string> {
  return { fontFamily: 'Roboto', fontSize, fontWeight, lineHeight, letterSpacing };
}
