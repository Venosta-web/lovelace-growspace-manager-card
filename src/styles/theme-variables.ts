import { css } from 'lit';

/**
 * Centralized theme variables for Growspace Manager card.
 * Maps to Home Assistant theme variables with semantic fallbacks.
 * 
 * Usage: Import and include in component styles:
 * ```typescript
 * import { themeVariables } from '../styles/theme-variables';
 * 
 * static styles = [themeVariables, css`...`];
 * ```
 */
export const themeVariables = css`
  :host {
    /* Core HASS theme integration */
    --gm-primary-color: var(--primary-color, #03a9f4);
    --gm-accent-color: var(--accent-color, #ff9800);
    --gm-success-color: var(--success-color, #4caf50);
    --gm-warning-color: var(--warning-color, #ff9800);
    --gm-error-color: var(--error-color, #f44336);
    --gm-info-color: var(--info-color, #2196f3);
    
    /* Text colors */
    --gm-text-primary: var(--primary-text-color, #212121);
    --gm-text-secondary: var(--secondary-text-color, #727272);
    --gm-text-disabled: var(--disabled-text-color, #9e9e9e);
    
    /* Background colors */
    --gm-background: var(--card-background-color, #ffffff);
    --gm-background-surface: var(--ha-card-background, var(--card-background-color, #ffffff));
    --gm-divider-color: var(--divider-color, rgba(0, 0, 0, 0.12));
    
    /* Plant stage colors - semantic mapping */
    --stage-seedling-color: var(--gm-stage-seedling, #8bc34a);
    --stage-clone-color: var(--gm-stage-clone, #00bcd4);
    --stage-mother-color: var(--gm-stage-mother, #9c27b0);
    --stage-veg-color: var(--gm-stage-veg, #4caf50);
    --stage-flower-color: var(--gm-stage-flower, #e91e63);
    --stage-dry-color: var(--gm-stage-dry, #ff9800);
    --stage-cure-color: var(--gm-stage-cure, #795548);
    
    /* VPD status colors */
    --vpd-optimal: var(--gm-vpd-optimal, #4caf50);
    --vpd-acceptable: var(--gm-vpd-acceptable, #8bc34a);
    --vpd-warning: var(--gm-vpd-warning, #ff9800);
    --vpd-danger: var(--gm-vpd-danger, #f44336);
    
    /* Component-specific colors */
    --gm-card-shadow: var(--ha-card-box-shadow, 0 2px 2px 0 rgba(0, 0, 0, 0.14));
    --gm-border-radius: var(--ha-card-border-radius, 8px);
    
    
    /* Spacing tokens */
    --gm-spacing-xs: 4px;
    --gm-spacing-sm: 8px;
    --gm-spacing-md: 16px;
    --gm-spacing-lg: 24px;
    --gm-spacing-xl: 32px;
    
    /* Typography */
    --gm-font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
    --gm-font-size-xs: 10px;
    --gm-font-size-sm: 12px;
    --gm-font-size-md: 14px;
    --gm-font-size-lg: 16px;
    --gm-font-size-xl: 20px;
    
    /* Z-index layers */
    --gm-z-dropdown: 1000;
    --gm-z-sticky: 1020;
    --gm-z-modal: 1030;
    --gm-z-popover: 1040;
    --gm-z-tooltip: 1050;
  }
`;
