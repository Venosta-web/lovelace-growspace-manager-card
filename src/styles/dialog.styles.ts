import { css } from 'lit';
import { sharedStyles } from './shared.styles';
import { uiStyles } from './ui.styles';

export const dialogStyles = [
  sharedStyles,
  uiStyles,
  css`
  .glass-dialog-container {
    display: flex;
    flex-direction: column;
    max-height: 85vh;
    color: #fff;
    font-family: 'Roboto', sans-serif;
    /* Background/Shadow handled by sharedStyles, but specific flex layout kept here */
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
    color: var(--stage-color, #4caf50);
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

  .row-col-grid {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }
  .row-col-grid > * {
    flex: 1;
    min-width: 0;
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
`];

