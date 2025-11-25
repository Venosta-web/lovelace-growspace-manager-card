import { css, CSSResult } from 'lit';

export const variables: CSSResult = css`
  :host {
    --primary-gradient: linear-gradient(135deg, #4CAF50, #45a049);
    --secondary-gradient: linear-gradient(135deg, #2196F3, #1976D2);
    --danger-gradient: linear-gradient(135deg, #f44336, #d32f2f);
    --surface-elevation: 0 4px 8px rgba(0,0,0,0.12);
    --surface-elevation-hover: 0 8px 16px rgba(0,0,0,0.16);
    --border-radius: 12px;
    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 16px;
    --spacing-lg: 24px;
    --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 2rem;

    --border-radius-sm: 4px;
    --border-radius-md: 8px;
    --border-radius-lg: 12px;

    --font-size-xs: 0.75rem;
    --font-size-sm: 0.875rem;
    --font-size-md: 1rem;
    --font-size-lg: 1.25rem;
    --font-size-xl: 1.5rem;

    --font-weight-regular: 400;
    --font-weight-medium: 500;
    --font-weight-bold: 700;

    --growspace-card-bg: var(--card-background-color, #1e1e1e);
    --growspace-card-text: var(--primary-text-color, #fff);
    --growspace-card-accent: var(--primary-color, #4caf50);
    --growspace-empty-bg: rgba(255, 255, 255, 0.05);
    --growspace-empty-bg-hover: rgba(255, 255, 255, 0.1);
    --plant-border-color-default:  #2196f3; 

    --card-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
    --card-shadow-hover: 0 4px 12px rgba(0, 0, 0, 0.35);

    --transition-fast: 0.15s ease-in-out;
    --transition-medium: 0.3s ease-in-out;

    --divider-color: rgba(255, 255, 255, 0.12);

    --stage-veg: #4caf50;
    --stage-flower: #ff9800;
    --stage-dry: #9c27b0;
    --stage-cure: #2196f3;

    --error-color: #f44336;
    --error-bg: rgba(244, 67, 54, 0.1);
    --error-border: rgba(244, 67, 54, 0.3);
    --strain-dialog-bg: var(--ha-card-background, #1e1e1e);
    --strain-dialog-color: var(--primary-text-color, #fff);
    --strain-border-color: #4caf50;
    --strain-input-bg: #2a2a2a;
    --strain-input-border: #3a3a3a;
    --primary-light-color: #FFEB3B;

    /* MD3 System Tokens Mappings */
    --md-sys-color-primary: var(--primary-color, #4caf50);
    --md-sys-color-on-primary: #ffffff;
    --md-sys-color-primary-container: rgba(76, 175, 80, 0.12);
    --md-sys-color-on-primary-container: #1b5e20;
    
    --md-sys-color-secondary: var(--accent-color, #2196f3);
    --md-sys-color-on-secondary: #ffffff;
    --md-sys-color-secondary-container: rgba(33, 150, 243, 0.12);
    --md-sys-color-on-secondary-container: #0d47a1;

    --md-sys-color-surface: var(--growspace-card-bg, #1e1e1e);
    --md-sys-color-on-surface: var(--growspace-card-text, #ffffff);
    --md-sys-color-surface-variant: #424242;
    --md-sys-color-on-surface-variant: #e0e0e0;
    
    --md-sys-color-outline: rgba(255, 255, 255, 0.12);
    --md-sys-color-outline-variant: rgba(255, 255, 255, 0.08);

    --md-sys-color-error: var(--error-color, #f44336);
    --md-sys-color-on-error: #ffffff;
    --md-sys-color-error-container: var(--error-bg, rgba(244, 67, 54, 0.1));
    --md-sys-color-on-error-container: #ffb4ab;

    /* Component specific overrides for Dark Mode */
    --md-outlined-text-field-container-shape: 8px;
    --md-outlined-text-field-outline-color: var(--md-sys-color-outline);
    --md-outlined-text-field-focus-outline-color: var(--md-sys-color-primary);
    --md-outlined-text-field-label-text-color: var(--md-sys-color-on-surface-variant);
    --md-outlined-text-field-focus-label-text-color: var(--md-sys-color-primary);
    --md-outlined-text-field-input-text-color: var(--md-sys-color-on-surface);

    --md-outlined-select-text-field-container-shape: 8px;
    --md-outlined-select-text-field-outline-color: var(--md-sys-color-outline);
    --md-outlined-select-text-field-focus-outline-color: var(--md-sys-color-primary);
    --md-outlined-select-text-field-label-text-color: var(--md-sys-color-on-surface-variant);
    --md-outlined-select-text-field-focus-label-text-color: var(--md-sys-color-primary);
    --md-outlined-select-text-field-input-text-color: var(--md-sys-color-on-surface);
    --md-menu-container-color: var(--md-sys-color-surface);
    --md-menu-item-label-text-color: var(--md-sys-color-on-surface);
    --md-menu-item-selected-container-color: var(--md-sys-color-primary-container);
    --md-menu-item-selected-label-text-color: var(--md-sys-color-on-primary-container);
  }
`;
