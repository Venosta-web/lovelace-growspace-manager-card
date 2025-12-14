import { css } from 'lit';

export const sharedStyles = css`
  /* --- Glassmorphism Surfaces --- */
  .glass-surface {
    background: rgba(20, 20, 24, 0.6);
    background-image: linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.03) 0%,
      rgba(255, 255, 255, 0.01) 100%
    );
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.08);
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
    background: rgba(20, 20, 20, 0.85); /* Slightly darker for dialogs */
    backdrop-filter: blur(16px);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  }

  /* --- Cards --- */
  .detail-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: var(--border-radius-md, 12px);
    padding: var(--spacing-md, 16px);
  }

  /* --- MD3 Buttons --- */
  .md3-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 0 24px;
    height: 40px;
    border-radius: 20px;
    border: none;
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
  }
  .md3-button.text {
    background: transparent;
    color: rgba(255, 255, 255, 0.7);
    padding: 0 12px;
  }
  .md3-button.text:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
  }
  .md3-button.tonal {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
  .md3-button.tonal:hover {
    background: rgba(255, 255, 255, 0.15);
  }
  .md3-button.primary {
    background: var(--primary-color, #4caf50);
    color: #fff;
  }
  .md3-button.primary:hover {
    filter: brightness(1.1);
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
  }
  .md3-button.danger {
    background: rgba(244, 67, 54, 0.1);
    color: #f44336;
  }
  .md3-button.danger:hover {
    background: rgba(244, 67, 54, 0.2);
  }

  /* --- Inputs --- */
  .md3-input-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    margin-bottom: 12px;
  }
  .md3-label {
    font-size: 12px;
    font-weight: 500;
    color: #9ca3af;
    margin-left: 4px;
  }
  .md3-input {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    border-radius: 8px;
    padding: 10px 12px;
    width: 100%;
    box-sizing: border-box;
    font-family: inherit;
    transition: all 0.2s ease;
  }
  .md3-input:focus {
    outline: none;
    border-color: var(--primary-color, #4caf50);
    background: rgba(255, 255, 255, 0.08);
  }
`;
