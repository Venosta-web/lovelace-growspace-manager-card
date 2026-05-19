import { css } from 'lit';

export const uiStyles = css`
  /* --- MD3 Buttons --- */
  .md3-button {
    height: 40px;
    padding: 0 24px;
    border-radius: 20px; /* Full-rounded MD3 style */
    border: none;
    font-family: 'Roboto', sans-serif;
    font-weight: 500;
    font-size: 0.875rem;
    letter-spacing: 0.1px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
    text-transform: none;
    position: relative;
    overflow: hidden;
    user-select: none;
    outline: none;
    background: transparent;
    color: var(--primary-text-color, #fff);
  }

  /* MD3 State Layer Effect */
  .md3-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: currentColor;
    opacity: 0;
    transition: opacity 0.2s cubic-bezier(0.2, 0, 0, 1);
    pointer-events: none;
  }

  .md3-button:hover::before {
    opacity: 0.08;
  }

  .md3-button:focus-visible::before {
    opacity: 0.12;
  }

  .md3-button:active::before {
    opacity: 0.12;
  }

  /* Focus visible state for accessibility */
  .md3-button:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  /* Primary Filled Button */
  .md3-button.primary {
    background: var(--primary-color, #4caf50);
    color: var(--text-primary-color, #fff);
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.3),
      0 1px 3px 1px rgba(0, 0, 0, 0.15);
  }

  .md3-button.primary:hover {
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.3),
      0 2px 6px 2px rgba(0, 0, 0, 0.15);
  }

  .md3-button.primary:active {
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.3),
      0 1px 3px 1px rgba(0, 0, 0, 0.15);
  }

  /* Tonal Button (MD3 Filled Tonal variant) */
  .md3-button.tonal {
    background: rgba(var(--rgb-primary-color, 76, 175, 80), 0.12);
    color: var(--primary-color, #4caf50);
  }

  .md3-button.tonal:hover {
    background: rgba(var(--rgb-primary-color, 76, 175, 80), 0.16);
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.3),
      0 1px 3px 1px rgba(0, 0, 0, 0.15);
  }

  .md3-button.tonal:active {
    background: rgba(var(--rgb-primary-color, 76, 175, 80), 0.12);
  }

  /* Text Button */
  .md3-button.text {
    background: transparent;
    color: var(--primary-color, #4caf50);
    padding: 0 12px;
  }

  .md3-button.text:hover {
    background: rgba(var(--rgb-primary-color, 76, 175, 80), 0.08);
  }

  .md3-button.text:active {
    background: rgba(var(--rgb-primary-color, 76, 175, 80), 0.12);
  }

  /* Danger/Error Button (Outlined variant with error color) */
  .md3-button.danger {
    background: transparent;
    color: var(--error-color, #f44336);
    border: 1px solid currentColor;
  }

  .md3-button.danger::before {
    background: var(--error-color, #f44336);
  }

  .md3-button.danger:hover {
    background: rgba(244, 67, 54, 0.08);
    border-color: var(--error-color, #f44336);
  }

  .md3-button.danger:active {
    background: rgba(244, 67, 54, 0.12);
  }

  .md3-button.danger:focus-visible {
    outline-color: var(--error-color, #f44336);
  }

  /* Disabled state */
  .md3-button:disabled {
    opacity: 0.38;
    cursor: not-allowed;
    box-shadow: none;
  }

  .md3-button:disabled::before {
    display: none;
  }

  .button-group {
    display: flex;
    gap: var(--spacing-sm);
    justify-content: flex-end;
    flex-wrap: wrap;
    margin-top: var(--spacing-lg);
  }

  /* --- MD3 Inputs --- */
  .md3-input-group {
    position: relative;
    margin-bottom: 20px;
    background: rgba(var(--card-background-color, 255, 255, 255), 0.05);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-radius: 4px 4px 0 0;
    border-bottom: 1px solid var(--primary-text-color, rgba(255, 255, 255, 0.4));
    transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
  }

  .md3-input-group:hover {
    background: rgba(var(--secondary-background-color, 255, 255, 255), 0.08);
    border-bottom-color: var(--primary-light-color-hover, rgba(255, 255, 255, 0.6));
  }

  .md3-input-group:focus-within {
    background: rgba(var(--secondary-background-color, 255, 255, 255), 0.12);
    border-bottom: 2px solid var(--primary-light-color-active, rgba(255, 255, 255, 0.6));
  }

  /* Error state for inputs */
  .md3-input-group.error {
    border-bottom-color: var(--error-color, #f44336);
  }

  .md3-input-group.error .md3-label {
    color: var(--error-color, #f44336);
  }

  .md3-label {
    position: absolute;
    left: 16px;
    top: 8px;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
    pointer-events: none;
    transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
    letter-spacing: 0.4px;
  }

  .md3-input-group:focus-within .md3-label {
    color: var(--primary-light-color-active, rgba(255, 255, 255, 0.6));
  }

  .md3-input {
    width: 100%;
    padding: 24px 16px 8px;
    border: none;
    color: var(--primary-text-color, #ffffff);
    font-size: 1rem;
    font-family: 'Roboto', sans-serif;
    box-sizing: border-box;
    outline: none;
  }

  .md3-input option {
    background-color: var(--card-background-color, #1e1e1e);
    color: var(--primary-text-color, #ffffff);
  }

  .md3-input::placeholder {
    color: var(--disabled-text-color, rgba(255, 255, 255, 0.38));
    opacity: 1;
  }

  .md3-input:focus {
    outline: none;
  }

  .md3-input:disabled {
    color: var(--disabled-text-color, rgba(255, 255, 255, 0.38));
    cursor: not-allowed;
  }

  .md3-input-group:has(.md3-input:disabled) {
    background: rgba(255, 255, 255, 0.02);
    border-bottom-style: dotted;
  }

  .md3-supporting-text {
    padding: 4px 16px 0;
    font-size: 0.75rem;
    color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
    letter-spacing: 0.4px;
  }

  .md3-supporting-text.error {
    color: var(--error-color, #f44336);
  }

  /* --- Toast Notification --- */
  .toast-notification {
    position: absolute;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: #323232;
    color: #fff;
    padding: 12px 24px;
    border-radius: 24px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 100;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: slideUpFade 0.3s ease-out;
    min-width: 200px;
    text-align: center;
  }

  .toast-notification.success {
    background: var(--success-color, #4caf50);
    color: #fff;
  }

  .toast-notification.error {
    background: var(--error-color, #f44336);
    color: #fff;
  }

  @keyframes slideUpFade {
    from {
      opacity: 0;
      transform: translate(-50%, 20px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }

  /* --- Loading --- */
  .loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
  }


  /* Respect user motion preferences (WCAG 2.3.3) */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;
