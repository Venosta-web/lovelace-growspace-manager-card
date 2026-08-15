import { css } from 'lit';
import { sharedStyles } from './shared.styles';
import { uiStyles } from './ui.styles';

export const dialogStyles = [
  sharedStyles,
  uiStyles,
  css`
    ha-dialog {
      --dialog-surface-margin-top: 40px;
      --ha-dialog-min-height: auto;
      --dialog-content-padding: 0;
    }

    .glass-dialog-container {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      width: 100%;
      min-width: 0;
      min-height: 0;
      height: auto;
      max-height: 90vh;
      overflow: hidden;
      position: relative;
      color: var(--primary-text-color, #fff);
      font-family: 'Roboto', sans-serif; /* impeccable-disable-line overused-font -- DESIGN.md commits to Roboto to match the Home Assistant MD3 system stack */
    }

    .dialog-header {
      display: flex;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.2));
      flex-shrink: 0;
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
      flex-shrink: 0;
    }

    .dialog-content,
    .dialog-content-grid {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 24px;
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

    .config-reset-button {
      align-self: flex-start;
      height: 40px;
      min-width: 0;
      padding: 0 16px;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.2));
      color: var(--primary-text-color, #fff);
    }

    .vwc-targets-group {
      grid-column: span 2;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 16px;
      margin: 8px 0;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
    }
    .vwc-targets-group-title {
      grid-column: span 3;
      margin: 0 0 4px 0;
      font-size: 0.9rem;
      font-weight: 500;
      opacity: 0.9;
      letter-spacing: 0.1px;
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

      .dialog-content,
      .dialog-content-grid {
        padding: 16px;
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
