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
      color: var(--primary-text-color, #fff);
      font-family: 'Roboto', sans-serif;
      /* Background/Shadow handled by sharedStyles, but specific flex layout kept here */
    }

    ha-dialog {
      --dialog-surface-margin-top: 40px !important;
      --ha-dialog-max-width: 98vw !important;
      --ha-dialog-width-full: 98vw !important;
      --ha-dialog-min-height: 85vh !important;
      --dialog-surface-width: 98vw !important;
      --dialog-surface-max-width: 98vw !important;
      --dialog-content-width: 98vw !important;
      --width: 98vw !important;
      --dialog-content-padding: 0 !important;
    }
    .glass-dialog-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      min-width: 0;
      min-height: 0;
      max-height: 85vh;
      overflow: hidden;
      position: relative;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.2));
    }

    .dialog-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
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
      color: var(--secondary-text-color);
    }

    .detail-card h3 {
      margin-top: 0;
      margin-bottom: 16px;
      font-size: 1rem;
      font-weight: 500;
      opacity: 0.9;
      color: var(--primary-text-color, #fff);
      border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      padding-bottom: 8px;
    }

    .button-group {
      padding: 16px 24px;
      border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.2));
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      flex-wrap: wrap;
    }

    .row-col-grid {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      align-items: flex-start;
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
      .dialog-header .md3-button.text,
      .dialog-header .md3-button.text.close {
        flex: unset;
      }
      .detail-card .md3-button {
        flex: 1 1 1;
      }
    }
  `,
];
