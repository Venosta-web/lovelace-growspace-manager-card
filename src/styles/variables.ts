import { css, CSSResult } from 'lit';

export const variables: CSSResult = css`
  :host {
    --primary-gradient: linear-gradient(135deg, #4CAF50, #45a049);
    --secondary-gradient: linear-gradient(135deg, #2196F3, #1976D2);
    --danger-gradient: linear-gradient(135deg, #f44336, #d32f2f);
    
    /* MD3 Elevation Levels */
    /* HA Theme variable mapping */
    --growspace-primary: var(--primary-color, #4CAF50);
    --growspace-accent: var(--accent-color, #2196F3);
    --growspace-error: var(--error-color, #f44336);
    
    /* Text */
    --growspace-text-primary: var(--primary-text-color, #212121);
    --growspace-text-secondary: var(--secondary-text-color, #727272);
    --growspace-text-inverse: #ffffff; /* For typical dark gradients */
    
    /* Backgrounds - Using color-mix for glassmorphism */
    /* 80% opacity of card background */
    --growspace-glass-bg: color-mix(in srgb, var(--ha-card-background, #1e1e1e) 80%, transparent);
    --growspace-glass-bg-hover: color-mix(in srgb, var(--ha-card-background, #1e1e1e) 90%, transparent);
    
    /* Borders */
    --growspace-border: var(--divider-color, rgba(255, 255, 255, 0.12));
    
    /* MD3 Elevation Levels (Approximate using shadows) */
    --md3-elevation-level0: none;
    --md3-elevation-level1: 0 1px 2px rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15);
    --md3-elevation-level2: 0 1px 2px rgba(0,0,0,0.3), 0 2px 6px 2px rgba(0,0,0,0.15);
    --md3-elevation-level3: 0 4px 8px 3px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.3);
    --md3-elevation-level4: 0 6px 10px 4px rgba(0,0,0,0.15), 0 2px 3px rgba(0,0,0,0.3);
    --md3-elevation-level5: 0 8px 12px 6px rgba(0,0,0,0.15), 0 4px 4px rgba(0,0,0,0.3);
    
    --surface-elevation: var(--md3-elevation-level1);
    --surface-elevation-hover: var(--md3-elevation-level2);
    
    /* Spacing (MD3 spacing system) */
    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 16px;
    --spacing-lg: 24px;
    --spacing-xl: 32px;
    
    /* Radius */
    --border-radius: 12px;
    
    /* Plant Stages */
    --stage-veg: #4caf50;
    --stage-flower: #ff9800;
    --stage-dry: #9c27b0;
    --stage-cure: #2196f3;
    
    /* Gradients (Optional - keep friendly names but use vars?) */
    --primary-gradient: linear-gradient(135deg, var(--growspace-primary) 0%, color-mix(in srgb, var(--growspace-primary) 80%, black) 100%);
    
    /* Dialog Specific */
    --growspace-dialog-bg: var(--ha-card-background, #1e1e1e);
    --growspace-backdrop: rgba(0, 0, 0, 0.6);
  }
`;
