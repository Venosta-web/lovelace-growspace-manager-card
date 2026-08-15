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
    --md3-motion-easing-emphasized: cubic-bezier(0.2, 0, 0, 1);
    --md3-motion-duration-short1: 50ms;
    --md3-motion-duration-short2: 100ms;
    --md3-motion-duration-short3: 150ms;
    --md3-motion-duration-short4: 200ms;
    --md3-motion-duration-medium1: 250ms;
    --md3-motion-duration-medium2: 300ms;
    --md3-motion-duration-long1: 400ms;
    --md3-motion-duration-long2: 500ms;

    /* Primary — Vitality Green */
    /* Foreground on translucent-green containers. \`on-primary-container\` (#4caf50) over
       rgba(76,175,80,0.2) on #1e1e1e is 4.26:1 — below AA for normal text; this is 8.36:1. Do
       not "correct" it back to #4caf50.
    */
    --on-primary-container-bright: #69f0ae;

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
    --divider-color: rgba(255, 255, 255, 0.12);

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

    /* Error/Warning Colors */
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

    /* Semantic color aliases */
    /* HASS-integrated, used by log/timeline/plant-card */
    --gm-primary-color: var(--primary-color, #4caf50);
    --gm-warning-color: var(--warning-color, #ff9800);
    --gm-info-color: var(--info-color, #2196f3);
    --gm-error-color: var(--error-color, #f44336);
    --gm-ipm-color: #9c27b0;
    --gm-phi-color: #ff9800;

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
  }
`;

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
  '--on-primary-container-bright': '#69f0ae',
  '--text-primary': 'var(--primary-text-color, #ffffff)',
  '--text-secondary': 'var(--secondary-text-color, rgba(255, 255, 255, 0.7))',
  '--text-muted': 'var(--secondary-text-color, rgba(255, 255, 255, 0.55))',
  '--text-disabled': 'var(--disabled-text-color, rgba(255, 255, 255, 0.38))',
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
  '--error-color': '#f44336',
  '--error-bg': 'rgba(244, 67, 54, 0.1)',
  '--error-border': 'rgba(244, 67, 54, 0.3)',
  '--error-dark': '#d32f2f',
  '--danger-chip': '#ef5350',
  '--gm-primary-color': 'var(--primary-color, #4caf50)',
  '--gm-warning-color': 'var(--warning-color, #ff9800)',
  '--gm-info-color': 'var(--info-color, #2196f3)',
  '--gm-error-color': 'var(--error-color, #f44336)',
  '--gm-ipm-color': '#9c27b0',
  '--gm-phi-color': '#ff9800',
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
} as const;

export type TokenName = keyof typeof token;
