import { css } from 'lit';

export const dialogStyles = css`
  .glass-dialog-container {
    background: rgba(20, 20, 20, 0.6);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: 85vh;
    color: #fff;
    font-family: 'Roboto', sans-serif;
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  }

  /* Restored from 1.0.24.3.0 */
  .dialog-content-grid {
    padding: 24px;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 16px;
  }

  .dialog-header {
    display: flex;
    align-items: center;
    padding: 16px 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.2);
  }

  .dialog-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16px;
    color: var(--stage-color, #4CAF50);
  }

  .dialog-title-group {
    flex: 1;
  }

  .dialog-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 500;
  }

  .dialog-subtitle {
    font-size: 0.85rem;
    opacity: 0.7;
    margin-top: 2px;
  }

  .detail-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 16px;
    max-width: 100%;
    box-sizing: border-box;
  }

  .detail-card h3 {
    margin-top: 0;
    margin-bottom: 16px;
    font-size: 1rem;
    font-weight: 500;
    opacity: 0.9;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 8px;
  }

  .button-group {
    padding: 16px 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.2);
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    flex-wrap: wrap;
  }

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
    transition: all 0.2s;
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
    background: var(--primary-color, #4CAF50);
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

  .row-col-grid {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }
  .row-col-grid > * {
    flex: 1;
    min-width: 0;
  }

  /* MD3 Input Styles */
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
  }
  .md3-input:focus {
    outline: none;
    border-color: #4CAF50;
    background: rgba(255, 255, 255, 0.08);
  }

  @media (max-width: 450px) {
    .glass-dialog-container {
      width: 100vw;
      max-width: 100%;
      height: 100vh;
      border-radius: 0;
    }
    .button-group {
      justify-content: center;
    }
    .md3-button {
      flex: 1 1 auto;
      min-width: 100px;
    }
    .dialog-header {
      padding: 12px 16px;
    }
    
    /* Restored responsive rules */
    .dialog-content-grid {
      flex: 1;
      min-height: 0;
      padding: 8px;
    }
    .dialog-header .md3-button.text {
      flex: 0;
    }
    .detail-card .md3-button {
      flex: 1 1 1;
    }
  }
`;
