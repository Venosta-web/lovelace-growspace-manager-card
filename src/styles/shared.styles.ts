import { css } from 'lit';

export const sharedStyles = css`
  /* --- Glassmorphism Surfaces --- */
  :host {
    --glass-bg: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
    --glass-border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
    --glass-blur: blur(12px);
  }

  .glass-surface {
    background: var(--card-background-color, rgba(20, 20, 24, 0.6));
    background-image: linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.03) 0%,
      rgba(255, 255, 255, 0.01) 100%
    );
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
    box-shadow:
      0 4px 24px -1px rgba(0, 0, 0, 0.2),
      0 0 0 1px rgba(255, 255, 255, 0.02) inset;
    color: var(--primary-text-color, #fff);
  }

  .glass-panel {
    border-radius: var(--border-radius-xl, 28px);
    padding: var(--spacing-lg, 24px);
  }

  .glass-dialog-container {
    border-radius: var(--border-radius-lg, 16px);
    overflow: hidden;
    background: var(--card-background-color, rgba(20, 20, 20, 0.85));
    backdrop-filter: blur(16px);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  }

  /* --- Cards --- */
  .detail-card {
    background: var(--secondary-background-color, rgba(255, 255, 255, 0.03));
    border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.05);
    border-radius: var(--border-radius-md, 12px);
    padding: var(--spacing-md, 16px);
  }


`;
